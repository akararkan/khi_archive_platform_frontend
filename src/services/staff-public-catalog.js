import { getItemsPage } from '@/services/items'
import { getAudio } from '@/services/audio'
import { getVideo } from '@/services/video'
import { getImage } from '@/services/image'
import { getText } from '@/services/text'
import { getProject, getProjectsPage } from '@/services/project'
import { getCategory, getCategoriesPage } from '@/services/category'
import { getPerson, getPersonsPage } from '@/services/person'

const MEDIA_KINDS = ['image', 'audio', 'video', 'text']
const ENTITY_KINDS = ['project', 'person', 'category']
const BULK_PAGE_SIZE = 500

const MEDIA_GETTERS = {
  audio: getAudio,
  video: getVideo,
  image: getImage,
  text: getText,
}

function canceledError() {
  const error = new Error('Request canceled')
  error.code = 'ERR_CANCELED'
  return error
}

function assertActive(signal) {
  if (signal?.aborted) throw canceledError()
}

function asArray(value) {
  if (Array.isArray(value)) return value.filter((entry) => entry != null && entry !== '')
  if (value == null || value === '') return []
  return [value]
}

function mediaKindOf(item) {
  const raw = item?.kind || item?.type
  const kind = typeof raw === 'string' ? raw.trim().toLowerCase() : ''
  if (MEDIA_KINDS.includes(kind)) return kind
  return MEDIA_KINDS.find((candidate) => item?.[candidate]) || ''
}

// `/items` is the protected staff catalogue. Its row contains a compact
// cross-type summary plus the complete original DTO under item.audio/video/
// image/text. Public cards and detail views expect the flat guest DTO shape,
// so merge both without dropping relationship, visibility, file, or audit data.
export function unwrapStaffItem(item) {
  if (!item || typeof item !== 'object') return item
  const kind = mediaKindOf(item)
  const payload = kind && item[kind] && typeof item[kind] === 'object' ? item[kind] : {}
  const merged = { ...item, ...payload, kind }
  const code = merged.code || merged[`${kind}Code`]
  const fileUrl =
    merged.fileUrl ||
    merged[`${kind}FileUrl`] ||
    (kind === 'image' ? merged.imageFileUrl : null) ||
    null

  return {
    ...merged,
    code,
    fileUrl,
    projectCode: merged.projectCode || merged.project?.projectCode || null,
    projectName: merged.projectName || merged.project?.projectName || null,
    personCode: merged.personCode || merged.person?.personCode || null,
    personName: merged.personName || merged.person?.fullName || merged.person?.name || null,
    categories: merged.categories || item.categories || [],
  }
}

function springPage(content, page, size, totalElements = content.length) {
  const totalPages = totalElements > 0 ? Math.ceil(totalElements / size) : 0
  return {
    content,
    totalElements,
    totalPages,
    number: page,
    size,
    first: page === 0,
    last: totalPages === 0 || page >= totalPages - 1,
    empty: content.length === 0,
  }
}

function dateStart(value) {
  if (!value) return undefined
  return String(value).length === 10 ? `${value}T00:00:00Z` : value
}

function dateEnd(value) {
  if (!value) return undefined
  return String(value).length === 10 ? `${value}T23:59:59Z` : value
}

function staffSort(sortBy) {
  if (sortBy === 'title') return 'title'
  if (sortBy === 'datePublished') return 'createdAt'
  if (sortBy === 'date' || sortBy === 'relevance') return 'createdAt'
  return sortBy || 'createdAt'
}

function itemRequest(kinds, params = {}, page = params.page || 0, size = params.size || 50) {
  return {
    q: params.q,
    types: asArray(kinds).map((kind) => String(kind).toUpperCase()),
    projectCodes: asArray(params.projectCode),
    personCodes: asArray(params.personCode),
    categoryCodes: asArray(params.categoryCode),
    languages: asArray(params.language),
    createdFrom: dateStart(params.dateFrom),
    createdTo: dateEnd(params.dateTo),
    sortBy: staffSort(params.sortBy),
    sortDirection: params.sortDirection || 'desc',
    page,
    size,
    signal: params.signal,
  }
}

const SERVER_ITEM_FILTERS = new Set([
  'page', 'size', 'q', 'sortBy', 'sortDirection', 'signal',
  'projectCode', 'personCode', 'categoryCode', 'language',
])

function needsClientMediaFiltering(params) {
  return Object.entries(params || {}).some(([key, value]) => {
    if (SERVER_ITEM_FILTERS.has(key) || value == null || value === '') return false
    return asArray(value).length > 0
  })
}

async function fetchAllItemRows(kinds, params = {}) {
  const rows = []
  // Public date facets describe the archival/content date. `/items` exposes
  // only createdAt filtering, so do not pre-filter there and accidentally drop
  // a record whose archival date matches but whose database creation date does
  // not. The exact content-date check runs below in `matchesMediaFilters`.
  const requestParams = { ...params, dateFrom: undefined, dateTo: undefined }
  let page = 0
  let totalPages = 1
  do {
    assertActive(params.signal)
    const data = await getItemsPage(itemRequest(kinds, requestParams, page, BULK_PAGE_SIZE))
    const content = Array.isArray(data?.content) ? data.content : []
    rows.push(...content.map(unwrapStaffItem))
    const reported = Number(data?.totalPages)
    totalPages = Number.isFinite(reported) && reported >= 0
      ? reported
      : (content.length < BULK_PAGE_SIZE ? page + 1 : page + 2)
    page += 1
  } while (page < totalPages)
  return rows
}

function normalizedStrings(value) {
  if (value == null) return []
  if (Array.isArray(value)) return value.flatMap(normalizedStrings)
  if (typeof value === 'object') {
    return Object.values(value).flatMap(normalizedStrings)
  }
  return [String(value).trim().toLocaleLowerCase()].filter(Boolean)
}

function valuesFor(row, key) {
  const aliases = {
    categoryCode: ['categories', 'categoryCodes', 'categoryCode'],
    personCode: ['personCode', 'person'],
    projectCode: ['projectCode', 'project'],
    subject: ['subject', 'subjects'],
    tag: ['tags', 'tag'],
    keyword: ['keywords', 'keyword'],
    contributor: ['contributor', 'contributors'],
    color: ['colorOfImage', 'colorOfVideo', 'color'],
    whereUsed: ['whereThisImageUsed', 'whereThisVideoUsed', 'whereUsed'],
  }[key] || [key]
  return aliases.flatMap((candidate) => normalizedStrings(row?.[candidate]))
}

function rowDate(row) {
  return row?.dateCreated || row?.datePublished || row?.printDate || row?.createdAt || null
}

function matchesMediaFilters(row, params) {
  const from = params.dateFrom ? new Date(dateStart(params.dateFrom)).getTime() : null
  const to = params.dateTo ? new Date(dateEnd(params.dateTo)).getTime() : null
  if (from || to) {
    const time = new Date(rowDate(row)).getTime()
    if (!Number.isFinite(time)) return false
    if (from && time < from) return false
    if (to && time > to) return false
  }

  for (const [key, rawWanted] of Object.entries(params || {})) {
    if (SERVER_ITEM_FILTERS.has(key) || key === 'dateFrom' || key === 'dateTo') continue
    const wanted = normalizedStrings(rawWanted)
    if (!wanted.length) continue
    const actual = valuesFor(row, key)
    if (!wanted.some((needle) => actual.some((value) => value === needle || value.includes(needle)))) {
      return false
    }
  }
  return true
}

function titleOf(row) {
  return (
    row?.title || row?.centralKurdishTitle || row?.titleInCentralKurdish ||
    row?.originalTitle || row?.originTitle || row?.fileName || row?.code || ''
  )
}

function sortRows(rows, sortBy, direction) {
  const sign = direction === 'asc' ? 1 : -1
  const copy = [...rows]
  copy.sort((a, b) => {
    if (sortBy === 'title') {
      return String(titleOf(a)).localeCompare(String(titleOf(b)), undefined, { sensitivity: 'base' }) * sign
    }
    const aTime = new Date(sortBy === 'datePublished' ? (a.datePublished || rowDate(a)) : rowDate(a)).getTime()
    const bTime = new Date(sortBy === 'datePublished' ? (b.datePublished || rowDate(b)) : rowDate(b)).getTime()
    return ((Number.isFinite(aTime) ? aTime : 0) - (Number.isFinite(bTime) ? bTime : 0)) * sign
  })
  return copy
}

export async function getStaffMediaPage(kinds, params = {}) {
  const page = Number(params.page) || 0
  const size = Number(params.size) || 50
  if (!needsClientMediaFiltering(params)) {
    const data = await getItemsPage(itemRequest(kinds, params, page, size))
    return {
      ...data,
      content: (data?.content || []).map(unwrapStaffItem),
    }
  }

  const allRows = await fetchAllItemRows(kinds, params)
  const filtered = sortRows(
    allRows.filter((row) => matchesMediaFilters(row, params)),
    params.sortBy,
    params.sortDirection,
  )
  const start = page * size
  return springPage(filtered.slice(start, start + size), page, size, filtered.length)
}

async function fetchAllPages(fetchPage, signal) {
  const rows = []
  let page = 0
  let totalPages = 1
  do {
    assertActive(signal)
    const data = await fetchPage(page, BULK_PAGE_SIZE)
    const content = Array.isArray(data?.content) ? data.content : (Array.isArray(data) ? data : [])
    rows.push(...content)
    const reported = Number(data?.totalPages)
    totalPages = Number.isFinite(reported) && reported >= 0
      ? reported
      : (content.length < BULK_PAGE_SIZE ? page + 1 : page + 2)
    page += 1
  } while (page < totalPages)
  return rows
}

function projectCategories(project) {
  return normalizedStrings(project?.categories || project?.categoryCodes)
}

function projectMatches(project, params = {}) {
  const q = String(params.q || '').trim().toLocaleLowerCase()
  if (q && !normalizedStrings(project).some((value) => value.includes(q))) return false

  const persons = normalizedStrings(params.personCode)
  if (persons.length && !persons.includes(String(project?.personCode || '').toLocaleLowerCase())) return false

  const categories = normalizedStrings(params.categoryCode)
  if (categories.length && !categories.some((category) => projectCategories(project).some((value) => value.includes(category)))) return false

  const tags = normalizedStrings(params.tag)
  if (tags.length) {
    const actual = normalizedStrings(project?.tags)
    if (!tags.some((tag) => actual.includes(tag))) return false
  }
  return true
}

async function addProjectCounts(projects, signal) {
  const codes = projects.map((project) => project?.projectCode).filter(Boolean)
  if (!codes.length) return projects
  const counts = new Map(codes.map((code) => [code, { audioCount: 0, videoCount: 0, imageCount: 0, textCount: 0 }]))
  let page = 0
  let totalPages = 1
  do {
    assertActive(signal)
    const data = await getItemsPage({ projectCodes: codes, page, size: BULK_PAGE_SIZE, signal })
    for (const item of data?.content || []) {
      const code = item.projectCode || item.project?.projectCode
      const kind = mediaKindOf(item)
      const entry = counts.get(code)
      const key = `${kind}Count`
      if (entry && key in entry) entry[key] += 1
    }
    const reported = Number(data?.totalPages)
    totalPages = Number.isFinite(reported) && reported >= 0
      ? reported
      : ((data?.content || []).length < BULK_PAGE_SIZE ? page + 1 : page + 2)
    page += 1
  } while (page < totalPages)
  return projects.map((project) => ({ ...project, ...(counts.get(project.projectCode) || {}) }))
}

function entityNeedsClientFiltering(params = {}) {
  return Boolean(
    String(params.q || '').trim() ||
    asArray(params.personCode).length ||
    asArray(params.categoryCode).length ||
    asArray(params.tag).length ||
    (params.sortBy && !['createdAt', 'date'].includes(params.sortBy)),
  )
}

async function getStaffProjectPage(params = {}) {
  const page = Number(params.page) || 0
  const size = Number(params.size) || 50
  if (!entityNeedsClientFiltering(params)) {
    const data = await getProjectsPage({ page, size, signal: params.signal })
    const content = await addProjectCounts(data?.content || [], params.signal)
    return { ...data, content }
  }
  const rows = await fetchAllPages(
    (nextPage, nextSize) => getProjectsPage({ page: nextPage, size: nextSize, signal: params.signal }),
    params.signal,
  )
  const filtered = sortRows(rows.filter((row) => projectMatches(row, params)), params.sortBy, params.sortDirection)
  const start = page * size
  const content = await addProjectCounts(filtered.slice(start, start + size), params.signal)
  return springPage(content, page, size, filtered.length)
}

function entityMatches(row, params = {}) {
  const q = String(params.q || '').trim().toLocaleLowerCase()
  if (q && !normalizedStrings(row).some((value) => value.includes(q))) return false
  const regions = normalizedStrings(params.region)
  if (regions.length) {
    const actual = normalizedStrings(row?.region)
    if (!regions.some((region) => actual.some((value) => value.includes(region)))) return false
  }
  return true
}

async function getStaffSimpleEntityPage(kind, params = {}) {
  const page = Number(params.page) || 0
  const size = Number(params.size) || 50
  const fetcher = kind === 'person' ? getPersonsPage : getCategoriesPage
  const needsClient = Boolean(String(params.q || '').trim() || asArray(params.region).length)
  if (!needsClient) {
    return fetcher({ page, size, sortBy: params.sortBy, sortDirection: params.sortDirection, signal: params.signal })
  }
  const rows = await fetchAllPages(
    (nextPage, nextSize) => fetcher({ page: nextPage, size: nextSize, signal: params.signal }),
    params.signal,
  )
  const filtered = sortRows(rows.filter((row) => entityMatches(row, params)), params.sortBy, params.sortDirection)
  const start = page * size
  return springPage(filtered.slice(start, start + size), page, size, filtered.length)
}

export async function getStaffBrowsePage(typeKey, params = {}) {
  if (MEDIA_KINDS.includes(typeKey)) return getStaffMediaPage([typeKey], params)
  if (typeKey === 'project') return getStaffProjectPage(params)
  if (ENTITY_KINDS.includes(typeKey)) return getStaffSimpleEntityPage(typeKey, params)
  return getStaffMediaPage(MEDIA_KINDS, params)
}

function suggestionValue(row, kind) {
  if (kind === 'project') return row?.projectName || row?.name || row?.title || row?.projectCode
  if (kind === 'person') return row?.fullName || row?.name || row?.personCode
  if (kind === 'category') return row?.categoryName || row?.name || row?.categoryCode
  return titleOf(row)
}

function suggestionCode(row, kind) {
  return row?.code || row?.[`${kind}Code`] || null
}

export async function getStaffSuggestions({ q, limit = 8, signal } = {}) {
  const kinds = ['person', 'project', 'audio', 'video', 'text', 'image', 'category']
  const perKind = Math.max(2, Math.ceil(limit / 2))
  const settled = await Promise.allSettled(
    kinds.map(async (kind) => {
      const page = await getStaffBrowsePage(kind, { q, page: 0, size: perKind, signal })
      return (page?.content || []).map((row) => ({
        kind,
        code: suggestionCode(row, kind),
        value: suggestionValue(row, kind),
      }))
    }),
  )
  const groups = settled.map((result) => (
    result.status === 'fulfilled'
      ? result.value.filter((entry) => entry.code && entry.value)
      : []
  ))
  const suggestions = []
  for (let index = 0; index < perKind && suggestions.length < limit; index += 1) {
    for (const group of groups) {
      if (group[index]) suggestions.push(group[index])
      if (suggestions.length >= limit) break
    }
  }
  return suggestions
}

export async function getStaffMediaOne(kind, code, { signal } = {}) {
  const getter = MEDIA_GETTERS[kind]
  if (!getter) throw new Error(`Unknown media kind: ${kind}`)
  const data = await getter(code, { signal })
  return { ...data, kind, code: data?.[`${kind}Code`] || data?.code || code }
}

export async function getStaffProject(code, { signal } = {}) {
  const project = await getProject(code, { signal })
  const [withCounts] = await addProjectCounts(project ? [project] : [], signal)
  return withCounts || project
}

export async function getStaffProjectMedia(code, { type = 'all', signal } = {}) {
  const kinds = MEDIA_KINDS.includes(type) ? [type] : MEDIA_KINDS
  const rows = await fetchAllItemRows(kinds, { projectCode: code, signal })
  const grouped = { audios: [], videos: [], images: [], texts: [] }
  for (const row of rows) {
    const key = `${row.kind}s`
    if (key in grouped) grouped[key].push(row)
  }
  return grouped
}

export async function getStaffPerson(code, { signal } = {}) {
  return getPerson(code, { signal })
}

export async function getStaffCategory(code, { signal } = {}) {
  return getCategory(code, { signal })
}

async function relatedProjects(predicate, params = {}) {
  const all = await fetchAllPages(
    (page, size) => getProjectsPage({ page, size, signal: params.signal }),
    params.signal,
  )
  const filtered = all.filter(predicate)
  const page = Number(params.page) || 0
  const size = Number(params.size) || 24
  const start = page * size
  const content = await addProjectCounts(filtered.slice(start, start + size), params.signal)
  return springPage(content, page, size, filtered.length)
}

export async function getStaffPersonProjects(personCode, params = {}) {
  const normalized = String(personCode || '').toLocaleLowerCase()
  return relatedProjects(
    (project) => String(project?.personCode || project?.person?.personCode || '').toLocaleLowerCase() === normalized,
    params,
  )
}

export async function getStaffCategoryProjects(categoryCode, params = {}) {
  const normalized = String(categoryCode || '').toLocaleLowerCase()
  return relatedProjects(
    (project) => projectCategories(project).some((value) => value === normalized || value.includes(normalized)),
    params,
  )
}
