// Filter + sort logic for the video table inside a project's detail
// page. Mirrors the backend's VideoFilterParams shape one-for-one so
// that the UI's filter atoms map directly onto what the server
// understands; the actual matching here runs client-side against the
// already-loaded project videos (no extra round-trip needed since
// the project's media is already in memory).
//
// Matching rules — kept identical to VideoFilterSupport on the
// backend so that turning this into a server-side filter later is a
// drop-in swap:
//   - categorical: case-insensitive equals
//   - long-text:   case-insensitive substring (contains)
//   - collection:  any/all match against tokens
//   - numeric:     min/max inclusive
//   - date:        ISO range, snapped to start/end of day, inclusive
//   - boolean:     true/false/any
//
// Order of evaluation matches VideoFilterSupport's "fastest algorithm"
// short-circuit: cheap booleans → numeric → date → equals → contains
// → collections. Each false return ejects the row before the more
// expensive checks run.

// ─────────────────────────────────────────────────────────────────
// Sort options
// ─────────────────────────────────────────────────────────────────

// Curated subset of what the backend accepts. Each entry's `sortBy`
// string matches what the server would expect if this ever gets
// pushed back to the API.
export const VIDEO_SORT_OPTIONS = [
  { key: 'videoCode-asc',          label: 'Code (A → Z)',                sortBy: 'videoCode',       sortDirection: 'asc'  },
  { key: 'videoCode-desc',         label: 'Code (Z → A)',                sortBy: 'videoCode',       sortDirection: 'desc' },
  { key: 'originalTitle-asc',      label: 'Title (A → Z)',               sortBy: 'originalTitle',   sortDirection: 'asc'  },
  { key: 'originalTitle-desc',     label: 'Title (Z → A)',               sortBy: 'originalTitle',   sortDirection: 'desc' },
  { key: 'language-asc',           label: 'Language (A → Z)',            sortBy: 'language',        sortDirection: 'asc'  },
  { key: 'createdAt-desc',         label: 'Newest first',                sortBy: 'createdAt',       sortDirection: 'desc' },
  { key: 'createdAt-asc',          label: 'Oldest first',                sortBy: 'createdAt',       sortDirection: 'asc'  },
  { key: 'updatedAt-desc',         label: 'Recently updated',            sortBy: 'updatedAt',       sortDirection: 'desc' },
  { key: 'updatedAt-asc',          label: 'Least recently updated',      sortBy: 'updatedAt',       sortDirection: 'asc'  },
  { key: 'dateCreated-desc',       label: 'Recording date (newest)',     sortBy: 'dateCreated',     sortDirection: 'desc' },
  { key: 'dateCreated-asc',        label: 'Recording date (oldest)',     sortBy: 'dateCreated',     sortDirection: 'asc'  },
  { key: 'datePublished-desc',     label: 'Published (newest)',          sortBy: 'datePublished',   sortDirection: 'desc' },
  { key: 'datePublished-asc',      label: 'Published (oldest)',          sortBy: 'datePublished',   sortDirection: 'asc'  },
  { key: 'dateCopyrighted-desc',   label: 'Copyrighted (newest)',        sortBy: 'dateCopyrighted', sortDirection: 'desc' },
  { key: 'versionNumber-asc',      label: 'Version (low → high)',        sortBy: 'versionNumber',   sortDirection: 'asc'  },
  { key: 'versionNumber-desc',     label: 'Version (high → low)',        sortBy: 'versionNumber',   sortDirection: 'desc' },
  { key: 'copyNumber-asc',         label: 'Copy # (low → high)',         sortBy: 'copyNumber',      sortDirection: 'asc'  },
]
export const DEFAULT_VIDEO_SORT_KEY = 'videoCode-asc'

// ─────────────────────────────────────────────────────────────────
// Initial state + introspection
// ─────────────────────────────────────────────────────────────────

export function createInitialVideoFilters() {
  return {
    // categorical (case-insensitive equals)
    videoVersion: '',
    videoStatus: '',
    audience: '',
    language: '',
    dialect: '',
    extension: '',
    orientation: '',
    dimension: '',
    resolution: '',
    duration: '',
    bitDepth: '',
    frameRate: '',
    overallBitRate: '',
    videoCodec: '',
    audioCodec: '',
    audioChannels: '',
    accrualMethod: '',
    lccClassification: '',
    availability: '',
    licenseType: '',

    // long-text (case-insensitive contains)
    description: '',
    event: '',
    location: '',
    subtitle: '',
    personShownInVideo: '',
    creatorArtistDirector: '',
    producer: '',
    contributor: '',
    provenance: '',
    archiveCataloging: '',
    physicalLabel: '',
    locationInArchiveRoom: '',
    note: '',
    copyright: '',
    rightOwner: '',
    usageRights: '',
    owner: '',
    publisher: '',

    // collections (any/all)
    subject: [],
    subjectMatch: 'any',
    genre: [],
    genreMatch: 'any',
    colorOfVideo: [],
    colorMatch: 'any',
    whereThisVideoUsed: [],
    usageMatch: 'any',
    tags: [],
    tagMatch: 'any',
    keywords: [],
    keywordMatch: 'any',

    // boolean — '' = any, 'true' / 'false' = filter
    physicalAvailability: '',

    // numeric ranges (strings so empty = unset)
    versionNumberMin: '',
    versionNumberMax: '',
    copyNumberMin: '',
    copyNumberMax: '',

    // date ranges (YYYY-MM-DD; entity-side dates and audit dates)
    dateCreatedFrom: '',
    dateCreatedTo: '',
    datePublishedFrom: '',
    datePublishedTo: '',
    dateModifiedFrom: '',
    dateModifiedTo: '',
    dateCopyrightedFrom: '',
    dateCopyrightedTo: '',
    createdFrom: '',
    createdTo: '',
    updatedFrom: '',
    updatedTo: '',
  }
}

const CATEGORICAL_FIELDS = [
  'videoVersion', 'videoStatus', 'audience', 'language', 'dialect',
  'extension', 'orientation', 'dimension', 'resolution', 'duration',
  'bitDepth', 'frameRate', 'overallBitRate', 'videoCodec', 'audioCodec',
  'audioChannels', 'accrualMethod', 'lccClassification', 'availability',
  'licenseType',
]
const CONTAINS_FIELDS = [
  'description', 'event', 'location', 'subtitle', 'personShownInVideo',
  'creatorArtistDirector', 'producer', 'contributor', 'provenance',
  'archiveCataloging', 'physicalLabel', 'locationInArchiveRoom', 'note',
  'copyright', 'rightOwner', 'usageRights', 'owner', 'publisher',
]
const COLLECTION_FIELDS = [
  ['subject', 'subjectMatch'],
  ['genre', 'genreMatch'],
  ['colorOfVideo', 'colorMatch'],
  ['whereThisVideoUsed', 'usageMatch'],
  ['tags', 'tagMatch'],
  ['keywords', 'keywordMatch'],
]
const NUMERIC_RANGES = [
  ['versionNumberMin', 'versionNumberMax', 'versionNumber'],
  ['copyNumberMin', 'copyNumberMax', 'copyNumber'],
]
const DATE_RANGES = [
  ['dateCreatedFrom', 'dateCreatedTo', 'dateCreated'],
  ['datePublishedFrom', 'datePublishedTo', 'datePublished'],
  ['dateModifiedFrom', 'dateModifiedTo', 'dateModified'],
  ['dateCopyrightedFrom', 'dateCopyrightedTo', 'dateCopyrighted'],
  ['createdFrom', 'createdTo', 'createdAt'],
  ['updatedFrom', 'updatedTo', 'updatedAt'],
]

export function isVideoFilterEmpty(filters) {
  for (const f of CATEGORICAL_FIELDS) if (filters[f]?.trim?.()) return false
  for (const f of CONTAINS_FIELDS) if (filters[f]?.trim?.()) return false
  for (const [field] of COLLECTION_FIELDS) if (filters[field]?.length > 0) return false
  if (filters.physicalAvailability) return false
  for (const [from, to] of NUMERIC_RANGES) if (filters[from] || filters[to]) return false
  for (const [from, to] of DATE_RANGES) if (filters[from] || filters[to]) return false
  return true
}

export function countVideoFilters(filters) {
  let n = 0
  for (const f of CATEGORICAL_FIELDS) if (filters[f]?.trim?.()) n += 1
  for (const f of CONTAINS_FIELDS) if (filters[f]?.trim?.()) n += 1
  for (const [field] of COLLECTION_FIELDS) if (filters[field]?.length > 0) n += 1
  if (filters.physicalAvailability) n += 1
  for (const [from, to] of NUMERIC_RANGES) if (filters[from] || filters[to]) n += 1
  for (const [from, to] of DATE_RANGES) if (filters[from] || filters[to]) n += 1
  return n
}

// ─────────────────────────────────────────────────────────────────
// Matching primitives
// ─────────────────────────────────────────────────────────────────

const norm = (v) => (v == null ? '' : String(v).trim().toLowerCase())

function buildWantedSet(values) {
  const out = new Set()
  for (const v of values) {
    const n = norm(v)
    if (n) out.add(n)
  }
  return out
}

function getVideoCollection(video, field) {
  const raw = video[field]
  if (Array.isArray(raw)) return raw
  if (typeof raw === 'string' && raw.trim()) {
    return raw.split(/[,،;]/).map((s) => s.trim()).filter(Boolean)
  }
  return []
}

function matchCollection(video, field, wanted, mode) {
  if (wanted.size === 0) return true
  const list = getVideoCollection(video, field)
  if (list.length === 0) return false
  if (mode === 'all') {
    let remaining = wanted.size
    const seen = new Set()
    for (const item of list) {
      const n = norm(item)
      if (wanted.has(n) && !seen.has(n)) {
        seen.add(n)
        remaining -= 1
        if (remaining === 0) return true
      }
    }
    return false
  }
  for (const item of list) {
    if (wanted.has(norm(item))) return true
  }
  return false
}

function inNumericRange(value, min, max) {
  if (value == null || value === '') return min === '' && max === ''
  const num = Number(value)
  if (Number.isNaN(num)) return min === '' && max === ''
  if (min !== '' && num < Number(min)) return false
  if (max !== '' && num > Number(max)) return false
  return true
}

function isoDay(value) {
  if (!value) return ''
  const s = String(value)
  return s.length >= 10 ? s.slice(0, 10) : s
}

function inDateRange(value, from, to) {
  const day = isoDay(value)
  if (!day) return !from && !to
  if (from && day < from) return false
  if (to && day > to) return false
  return true
}

// ─────────────────────────────────────────────────────────────────
// Apply filters + sort
// ─────────────────────────────────────────────────────────────────

export function applyVideoFilters(videos, filters) {
  if (!Array.isArray(videos) || videos.length === 0) return []
  if (isVideoFilterEmpty(filters)) return videos

  const wantedByField = {}
  for (const [field] of COLLECTION_FIELDS) {
    wantedByField[field] = buildWantedSet(filters[field])
  }

  const out = []
  outer: for (const video of videos) {
    if (filters.physicalAvailability) {
      const want = filters.physicalAvailability === 'true'
      if (Boolean(video.physicalAvailability) !== want) continue
    }

    for (const [fromKey, toKey, field] of NUMERIC_RANGES) {
      const fromVal = filters[fromKey]
      const toVal = filters[toKey]
      if (fromVal === '' && toVal === '') continue
      if (!inNumericRange(video[field], fromVal, toVal)) continue outer
    }

    for (const [fromKey, toKey, field] of DATE_RANGES) {
      const fromVal = filters[fromKey]
      const toVal = filters[toKey]
      if (!fromVal && !toVal) continue
      if (!inDateRange(video[field], fromVal, toVal)) continue outer
    }

    for (const field of CATEGORICAL_FIELDS) {
      const wanted = norm(filters[field])
      if (!wanted) continue
      if (norm(video[field]) !== wanted) continue outer
    }

    for (const field of CONTAINS_FIELDS) {
      const wanted = norm(filters[field])
      if (!wanted) continue
      if (!norm(video[field]).includes(wanted)) continue outer
    }

    let rejected = false
    for (const [field, matchKey] of COLLECTION_FIELDS) {
      if (!matchCollection(video, field, wantedByField[field], filters[matchKey])) {
        rejected = true
        break
      }
    }
    if (rejected) continue

    out.push(video)
  }
  return out
}

export function applyVideoSort(videos, sortKey) {
  if (!Array.isArray(videos) || videos.length === 0) return videos
  const opt =
    VIDEO_SORT_OPTIONS.find((o) => o.key === sortKey) ??
    VIDEO_SORT_OPTIONS.find((o) => o.key === DEFAULT_VIDEO_SORT_KEY)
  if (!opt) return videos

  const dir = opt.sortDirection === 'desc' ? -1 : 1
  const field = opt.sortBy

  const isNumericField =
    field === 'versionNumber' ||
    field === 'copyNumber'
  const isDateField =
    field === 'createdAt' ||
    field === 'updatedAt' ||
    field === 'dateCreated' ||
    field === 'datePublished' ||
    field === 'dateModified' ||
    field === 'dateCopyrighted'

  const sorted = [...videos]
  sorted.sort((a, b) => {
    const va = a[field]
    const vb = b[field]
    const aMissing = va == null || va === ''
    const bMissing = vb == null || vb === ''
    if (aMissing && bMissing) return 0
    if (aMissing) return 1
    if (bMissing) return -1
    if (isNumericField) {
      return (Number(va) - Number(vb)) * dir
    }
    if (isDateField) {
      return (isoDay(va) < isoDay(vb) ? -1 : isoDay(va) > isoDay(vb) ? 1 : 0) * dir
    }
    return String(va).localeCompare(String(vb), undefined, { sensitivity: 'base' }) * dir
  })
  return sorted
}

// ─────────────────────────────────────────────────────────────────
// FilterChips builder
// ─────────────────────────────────────────────────────────────────

const CATEGORICAL_LABELS = {
  videoVersion: 'Version', videoStatus: 'Status', audience: 'Audience',
  language: 'Language', dialect: 'Dialect',
  extension: 'File ext', orientation: 'Orientation', dimension: 'Dimension',
  resolution: 'Resolution', duration: 'Duration',
  bitDepth: 'Bit depth', frameRate: 'Frame rate',
  overallBitRate: 'Bit rate',
  videoCodec: 'Video codec', audioCodec: 'Audio codec',
  audioChannels: 'Audio ch.',
  accrualMethod: 'Accrual', lccClassification: 'LCC class',
  availability: 'Availability', licenseType: 'License',
}
const CONTAINS_LABELS = {
  description: 'Description', event: 'Event', location: 'Location',
  subtitle: 'Subtitle',
  personShownInVideo: 'Person shown',
  creatorArtistDirector: 'Director', producer: 'Producer',
  contributor: 'Contributor', provenance: 'Provenance',
  archiveCataloging: 'Cataloging', physicalLabel: 'Physical label',
  locationInArchiveRoom: 'Archive room', note: 'Note',
  copyright: 'Copyright', rightOwner: 'Right owner',
  usageRights: 'Usage', owner: 'Owner', publisher: 'Publisher',
}
const NUMERIC_LABELS = {
  versionNumberMin: 'Version',
  copyNumberMin: 'Copy #',
}
const DATE_LABELS = {
  dateCreatedFrom: 'Recorded',
  datePublishedFrom: 'Published',
  dateModifiedFrom: 'Modified',
  dateCopyrightedFrom: 'Copyrighted',
  createdFrom: 'Created',
  updatedFrom: 'Updated',
}
const COLLECTION_SINGULAR = {
  subject: 'Subject',
  genre: 'Genre',
  colorOfVideo: 'Color',
  whereThisVideoUsed: 'Used in',
  tags: 'Tag',
  keywords: 'Keyword',
}

export function buildVideoChips({ filters, sortKey, sortLabel, onClearSort, updateFilter }) {
  const chips = []

  if (sortKey && sortKey !== DEFAULT_VIDEO_SORT_KEY && sortLabel) {
    chips.push({ key: 'sort', tone: 'sort', label: 'Sort', value: sortLabel, onRemove: onClearSort })
  }

  if (filters.physicalAvailability) {
    chips.push({
      key: 'physicalAvailability',
      tone: 'choice',
      label: 'Physical',
      value: filters.physicalAvailability === 'true' ? 'Available' : 'Not available',
      onRemove: () => updateFilter('physicalAvailability', ''),
    })
  }

  for (const field of CATEGORICAL_FIELDS) {
    const v = filters[field]?.trim?.()
    if (!v) continue
    chips.push({
      key: `cat-${field}`,
      tone: 'text',
      label: CATEGORICAL_LABELS[field] ?? field,
      value: v,
      onRemove: () => updateFilter(field, ''),
    })
  }

  for (const field of CONTAINS_FIELDS) {
    const v = filters[field]?.trim?.()
    if (!v) continue
    chips.push({
      key: `con-${field}`,
      tone: 'text',
      label: CONTAINS_LABELS[field] ?? field,
      value: v,
      onRemove: () => updateFilter(field, ''),
    })
  }

  for (const [fromKey, toKey] of NUMERIC_RANGES) {
    const from = filters[fromKey]
    const to = filters[toKey]
    if (!from && !to) continue
    chips.push({
      key: `num-${fromKey}`,
      tone: 'choice',
      label: NUMERIC_LABELS[fromKey] ?? fromKey,
      value: `${from || '…'} – ${to || '…'}`,
      onRemove: () => {
        updateFilter(fromKey, '')
        updateFilter(toKey, '')
      },
    })
  }

  for (const [fromKey, toKey] of DATE_RANGES) {
    const from = filters[fromKey]
    const to = filters[toKey]
    if (!from && !to) continue
    chips.push({
      key: `date-${fromKey}`,
      tone: 'date',
      label: DATE_LABELS[fromKey] ?? fromKey,
      value: `${from || '…'} → ${to || '…'}`,
      onRemove: () => {
        updateFilter(fromKey, '')
        updateFilter(toKey, '')
      },
    })
  }

  for (const [field, matchKey] of COLLECTION_FIELDS) {
    const list = filters[field]
    if (!list || list.length === 0) continue
    const labelOne = COLLECTION_SINGULAR[field] ?? field
    if (filters[matchKey] === 'all') {
      chips.push({
        key: `match-${field}`,
        tone: 'choice',
        label: 'Match',
        value: `all ${labelOne.toLowerCase()}s`,
        onRemove: () => updateFilter(matchKey, 'any'),
      })
    }
    for (const v of list) {
      chips.push({
        key: `${field}-${v}`,
        tone: 'tag',
        label: labelOne,
        value: v,
        onRemove: () => updateFilter(field, list.filter((x) => x !== v)),
      })
    }
  }

  return chips
}
