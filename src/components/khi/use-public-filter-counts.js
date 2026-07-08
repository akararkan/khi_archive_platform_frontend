import { useEffect, useMemo, useState } from 'react'

import {
  guestAudios,
  guestCategories,
  guestImages,
  guestPersons,
  guestProjects,
  guestTexts,
  guestVideos,
} from '@/services/guest'
import { extractPersonFromItem, personImageSrc } from '@/components/public/public-helpers'

const MEDIA_KINDS = ['image', 'audio', 'video', 'text']
const ENTITY_KINDS = ['person', 'project', 'category']
const FETCH_SIZE = 500
const MAX_PAGES = 200

const MEDIA_APIS = {
  audio: (params) => guestAudios.list(params),
  video: (params) => guestVideos.list(params),
  text: (params) => guestTexts.list(params),
  image: (params) => guestImages.list(params),
}

const ENTITY_APIS = {
  person: (params) => guestPersons(params),
  project: (params) => guestProjects(params),
  category: (params) => guestCategories(params),
}

function pageContent(res) {
  if (Array.isArray(res)) return res
  if (Array.isArray(res?.content)) return res.content
  if (Array.isArray(res?.items)) return res.items
  return []
}

function pageTotal(res, fallback = 0) {
  const n = Number(res?.totalElements ?? res?.total ?? res?.count)
  return Number.isFinite(n) ? n : fallback
}

async function fetchTotal(fetcher, signal) {
  const res = await fetcher({ page: 0, size: 1, signal })
  return pageTotal(res, pageContent(res).length)
}

async function fetchAll(fetcher, signal) {
  const items = []
  let page = 0
  let totalPages = 1

  while (!signal.aborted && page < totalPages && page < MAX_PAGES) {
    const res = await fetcher({
      page,
      size: FETCH_SIZE,
      signal,
    })
    const content = pageContent(res)
    items.push(...content)

    const explicitPages = Number(res?.totalPages)
    if (Number.isFinite(explicitPages) && explicitPages > 0) {
      totalPages = explicitPages
    } else {
      const total = pageTotal(res, items.length)
      totalPages = total > content.length && content.length > 0
        ? Math.ceil(total / content.length)
        : 1
    }
    page += 1
  }

  return items
}

function splitValues(raw) {
  if (raw == null) return []
  if (Array.isArray(raw)) return raw.flatMap(splitValues)
  if (typeof raw === 'object') {
    return splitValues(
      raw.value ??
      raw.label ??
      raw.name ??
      raw.subject ??
      raw.tag ??
      raw.code,
    )
  }
  return String(raw)
    .split(/[,،;]/)
    .map((value) => value.trim())
    .filter(Boolean)
}

function addFacet(maps, facetKey, value, { code, image } = {}) {
  if (value == null || value === '') return
  const label = String(value).trim()
  if (!label) return
  const normalizedCode = code != null && code !== '' ? String(code) : label
  const map = maps[facetKey]
  if (!map) return
  const id = normalizedCode || label
  const current = map.get(id)
  if (current) {
    current.count += 1
    if (!current.image && image) current.image = image
  } else {
    map.set(id, {
      value: label,
      code: normalizedCode,
      count: 1,
      image: image || null,
    })
  }
}

function addCategory(maps, item) {
  const categories = Array.isArray(item?.categories) ? item.categories : []
  if (categories.length > 0) {
    for (const category of categories) {
      if (typeof category === 'string') {
        addFacet(maps, 'categories', category, { code: category })
      } else {
        addFacet(
          maps,
          'categories',
          category?.categoryName || category?.name || category?.label || category?.value || category?.categoryCode || category?.code,
          { code: category?.categoryCode || category?.code || category?.value },
        )
      }
    }
    return
  }

  addFacet(
    maps,
    'categories',
    item?.categoryName || item?.category?.categoryName || item?.category?.name || item?.categoryCode,
    { code: item?.categoryCode || item?.category?.categoryCode || item?.category?.code },
  )
}

function addPerson(maps, item) {
  const person = extractPersonFromItem(item)
  if (!person) return
  const label = person.fullName || person.name || person.personName || person.personCode
  addFacet(maps, 'persons', label, {
    code: person.personCode,
    image: personImageSrc(person),
  })
}

function addSimpleList(maps, facetKey, raw) {
  for (const value of splitValues(raw)) addFacet(maps, facetKey, value)
}

function emptyFacetMaps() {
  return {
    categories: new Map(),
    persons: new Map(),
    languages: new Map(),
    dialects: new Map(),
    regions: new Map(),
    subjects: new Map(),
    genres: new Map(),
    tags: new Map(),
  }
}

function mapsToFacets(maps) {
  const out = {}
  for (const [key, map] of Object.entries(maps)) {
    if (map.size === 0) continue
    out[key] = [...map.values()].sort(
      (a, b) => b.count - a.count || a.value.localeCompare(b.value),
    )
  }
  return out
}

function tallyMediaFacets(items) {
  const maps = emptyFacetMaps()
  for (const item of items) {
    addCategory(maps, item)
    addPerson(maps, item)
    addSimpleList(maps, 'languages', item?.language)
    addSimpleList(maps, 'dialects', item?.dialect)
    addSimpleList(maps, 'regions', item?.region)
    addSimpleList(maps, 'subjects', [item?.subject, item?.subjects])
    addSimpleList(maps, 'genres', [item?.genre, item?.genres])
    addSimpleList(maps, 'tags', [item?.tag, item?.tags])
  }
  return mapsToFacets(maps)
}

function tallyProjectFacets(items) {
  const maps = emptyFacetMaps()
  for (const item of items) {
    addCategory(maps, item)
    addPerson(maps, item)
  }
  return mapsToFacets(maps)
}

function tallyPersonFacets(items) {
  const maps = emptyFacetMaps()
  for (const item of items) addSimpleList(maps, 'regions', item?.region)
  return mapsToFacets(maps)
}

function activeMediaKinds(typeKey, selectedMediaTypes) {
  if (MEDIA_KINDS.includes(typeKey)) return [typeKey]
  if (typeKey === 'all') {
    return selectedMediaTypes.length > 0 ? selectedMediaTypes : MEDIA_KINDS
  }
  return []
}

export function usePublicFilterCounts(typeKey, selectedMediaTypes = []) {
  const mediaKey = selectedMediaTypes.join(',')
  const [state, setState] = useState({ counts: {}, facets: {} })

  useEffect(() => {
    const ctrl = new AbortController()
    let alive = true

    async function run() {
      const countEntries = [
        ...MEDIA_KINDS.map((kind) => [kind, MEDIA_APIS[kind]]),
        ...ENTITY_KINDS.map((kind) => [kind, ENTITY_APIS[kind]]),
      ]

      const settledCounts = await Promise.allSettled(
        countEntries.map(async ([kind, fetcher]) => [kind, await fetchTotal(fetcher, ctrl.signal)]),
      )
      if (!alive || ctrl.signal.aborted) return

      const counts = {}
      for (const result of settledCounts) {
        if (result.status !== 'fulfilled') continue
        const [kind, total] = result.value
        counts[kind] = total
      }

      let facets = {}
      const selectedKinds = mediaKey ? mediaKey.split(',').filter(Boolean) : []
      const mediaKinds = activeMediaKinds(typeKey, selectedKinds)
      if (mediaKinds.length > 0) {
        const settledItems = await Promise.allSettled(
          mediaKinds.map((kind) => fetchAll(MEDIA_APIS[kind], ctrl.signal)),
        )
        if (!alive || ctrl.signal.aborted) return
        facets = tallyMediaFacets(
          settledItems.flatMap((result) => (result.status === 'fulfilled' ? result.value : [])),
        )
      } else if (typeKey === 'project') {
        facets = tallyProjectFacets(await fetchAll(ENTITY_APIS.project, ctrl.signal))
      } else if (typeKey === 'person') {
        facets = tallyPersonFacets(await fetchAll(ENTITY_APIS.person, ctrl.signal))
      }

      if (alive && !ctrl.signal.aborted) setState({ counts, facets })
    }

    run().catch(() => {
      if (alive && !ctrl.signal.aborted) setState({ counts: {}, facets: {} })
    })

    return () => {
      alive = false
      ctrl.abort()
    }
  }, [typeKey, mediaKey])

  return useMemo(() => state, [state])
}

export default usePublicFilterCounts
