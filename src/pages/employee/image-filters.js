// Filter + sort logic for the image table inside a project's detail
// page. Mirrors the backend's ImageFilterParams shape one-for-one so
// that the UI's filter atoms map directly onto what the server
// understands; the actual matching here runs client-side against the
// already-loaded project images (no extra round-trip needed since
// the project's media is already in memory).
//
// Matching rules — kept identical to ImageFilterSupport on the
// backend so that turning this into a server-side filter later is a
// drop-in swap:
//   - categorical: case-insensitive equals
//   - long-text:   case-insensitive substring (contains)
//   - collection:  any/all match against tokens
//   - numeric:     min/max inclusive
//   - date:        ISO range, snapped to start/end of day, inclusive
//   - boolean:     true/false/any
//
// Order of evaluation matches ImageFilterSupport's "fastest algorithm"
// short-circuit: cheap booleans → numeric → date → equals → contains
// → collections. Each false return ejects the row before the more
// expensive checks run.

// ─────────────────────────────────────────────────────────────────
// Sort options
// ─────────────────────────────────────────────────────────────────

// Curated subset of what the backend accepts. Each entry's `sortBy`
// string matches what the server would expect if this ever gets
// pushed back to the API.
export const IMAGE_SORT_OPTIONS = [
  { key: 'imageCode-asc',          label: 'Code (A → Z)',                sortBy: 'imageCode',       sortDirection: 'asc'  },
  { key: 'imageCode-desc',         label: 'Code (Z → A)',                sortBy: 'imageCode',       sortDirection: 'desc' },
  { key: 'originalTitle-asc',      label: 'Title (A → Z)',               sortBy: 'originalTitle',   sortDirection: 'asc'  },
  { key: 'originalTitle-desc',     label: 'Title (Z → A)',               sortBy: 'originalTitle',   sortDirection: 'desc' },
  { key: 'createdAt-desc',         label: 'Newest first',                sortBy: 'createdAt',       sortDirection: 'desc' },
  { key: 'createdAt-asc',          label: 'Oldest first',                sortBy: 'createdAt',       sortDirection: 'asc'  },
  { key: 'updatedAt-desc',         label: 'Recently updated',            sortBy: 'updatedAt',       sortDirection: 'desc' },
  { key: 'updatedAt-asc',          label: 'Least recently updated',      sortBy: 'updatedAt',       sortDirection: 'asc'  },
  { key: 'dateCreated-desc',       label: 'Capture date (newest)',       sortBy: 'dateCreated',     sortDirection: 'desc' },
  { key: 'dateCreated-asc',        label: 'Capture date (oldest)',       sortBy: 'dateCreated',     sortDirection: 'asc'  },
  { key: 'datePublished-desc',     label: 'Published (newest)',          sortBy: 'datePublished',   sortDirection: 'desc' },
  { key: 'datePublished-asc',      label: 'Published (oldest)',          sortBy: 'datePublished',   sortDirection: 'asc'  },
  { key: 'dateCopyrighted-desc',   label: 'Copyrighted (newest)',        sortBy: 'dateCopyrighted', sortDirection: 'desc' },
  { key: 'versionNumber-asc',      label: 'Version (low → high)',        sortBy: 'versionNumber',   sortDirection: 'asc'  },
  { key: 'versionNumber-desc',     label: 'Version (high → low)',        sortBy: 'versionNumber',   sortDirection: 'desc' },
  { key: 'copyNumber-asc',         label: 'Copy # (low → high)',         sortBy: 'copyNumber',      sortDirection: 'asc'  },
]
export const DEFAULT_IMAGE_SORT_KEY = 'imageCode-asc'

// ─────────────────────────────────────────────────────────────────
// Initial state + introspection
// ─────────────────────────────────────────────────────────────────

export function createInitialImageFilters() {
  return {
    // categorical (case-insensitive equals)
    form: '',
    imageStatus: '',
    imageVersion: '',
    audience: '',
    extension: '',
    orientation: '',
    dimension: '',
    bitDepth: '',
    dpi: '',
    manufacturer: '',
    model: '',
    lens: '',
    accrualMethod: '',
    lccClassification: '',
    availability: '',
    licenseType: '',

    // long-text (case-insensitive contains)
    event: '',
    location: '',
    description: '',
    personShownInImage: '',
    creatorArtistPhotographer: '',
    contributor: '',
    provenance: '',
    photostory: '',
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
    colorOfImage: [],
    colorMatch: 'any',
    whereThisImageUsed: [],
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

// Each constant keeps the categorical/contains field lists in one
// place so the introspection helpers below stay consistent with the
// matcher.
const CATEGORICAL_FIELDS = [
  'form', 'imageStatus', 'imageVersion', 'audience', 'extension',
  'orientation', 'dimension', 'bitDepth', 'dpi', 'manufacturer',
  'model', 'lens', 'accrualMethod', 'lccClassification', 'availability',
  'licenseType',
]
const CONTAINS_FIELDS = [
  'event', 'location', 'description', 'personShownInImage',
  'creatorArtistPhotographer', 'contributor', 'provenance', 'photostory',
  'archiveCataloging', 'physicalLabel', 'locationInArchiveRoom', 'note',
  'copyright', 'rightOwner', 'usageRights', 'owner', 'publisher',
]
// [filterField, matchField] — matchField is the any/all key on filters.
const COLLECTION_FIELDS = [
  ['subject', 'subjectMatch'],
  ['genre', 'genreMatch'],
  ['colorOfImage', 'colorMatch'],
  ['whereThisImageUsed', 'usageMatch'],
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

export function isImageFilterEmpty(filters) {
  for (const f of CATEGORICAL_FIELDS) if (filters[f]?.trim?.()) return false
  for (const f of CONTAINS_FIELDS) if (filters[f]?.trim?.()) return false
  for (const [field] of COLLECTION_FIELDS) if (filters[field]?.length > 0) return false
  if (filters.physicalAvailability) return false
  for (const [from, to] of NUMERIC_RANGES) if (filters[from] || filters[to]) return false
  for (const [from, to] of DATE_RANGES) if (filters[from] || filters[to]) return false
  return true
}

// Counts "filter atoms" the way the trigger button shows — one per
// distinct active filter, not per token. Used for the badge.
export function countImageFilters(filters) {
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

function getImageCollection(image, field) {
  const raw = image[field]
  if (Array.isArray(raw)) return raw
  if (typeof raw === 'string' && raw.trim()) {
    return raw.split(/[,،;]/).map((s) => s.trim()).filter(Boolean)
  }
  return []
}

function matchCollection(image, field, wanted, mode) {
  if (wanted.size === 0) return true
  const list = getImageCollection(image, field)
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

// Date inputs emit YYYY-MM-DD; the image entity dates may be stored
// as either an ISO instant ("2010-04-23T00:00:00Z") or a partial
// date string. We compare by extracting the YYYY-MM-DD prefix from
// both sides — that's enough resolution for an inclusive range
// filter and avoids dealing with timezone shifts on the frontend.
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

// Returns a new array. Order of checks matches the backend's
// fastest-first policy so the cheap rejections happen first. Wanted
// sets are built once outside the loop so per-row matching is O(1)
// per token rather than O(L).
export function applyImageFilters(images, filters) {
  if (!Array.isArray(images) || images.length === 0) return []
  if (isImageFilterEmpty(filters)) return images

  const wantedByField = {}
  for (const [field] of COLLECTION_FIELDS) {
    wantedByField[field] = buildWantedSet(filters[field])
  }

  const out = []
  outer: for (const image of images) {
    // boolean (cheapest)
    if (filters.physicalAvailability) {
      const want = filters.physicalAvailability === 'true'
      if (Boolean(image.physicalAvailability) !== want) continue
    }

    // numeric ranges
    for (const [fromKey, toKey, field] of NUMERIC_RANGES) {
      const fromVal = filters[fromKey]
      const toVal = filters[toKey]
      if (fromVal === '' && toVal === '') continue
      if (!inNumericRange(image[field], fromVal, toVal)) continue outer
    }

    // date ranges
    for (const [fromKey, toKey, field] of DATE_RANGES) {
      const fromVal = filters[fromKey]
      const toVal = filters[toKey]
      if (!fromVal && !toVal) continue
      if (!inDateRange(image[field], fromVal, toVal)) continue outer
    }

    // categorical equals (case-insensitive)
    for (const field of CATEGORICAL_FIELDS) {
      const wanted = norm(filters[field])
      if (!wanted) continue
      if (norm(image[field]) !== wanted) continue outer
    }

    // long-text contains (case-insensitive substring)
    for (const field of CONTAINS_FIELDS) {
      const wanted = norm(filters[field])
      if (!wanted) continue
      if (!norm(image[field]).includes(wanted)) continue outer
    }

    // collections (any/all)
    let rejected = false
    for (const [field, matchKey] of COLLECTION_FIELDS) {
      if (!matchCollection(image, field, wantedByField[field], filters[matchKey])) {
        rejected = true
        break
      }
    }
    if (rejected) continue

    out.push(image)
  }
  return out
}

// String / numeric / date sort. Returns a new sorted array. Nulls
// always sort last regardless of asc/desc so missing values don't
// crowd the top of the list.
export function applyImageSort(images, sortKey) {
  if (!Array.isArray(images) || images.length === 0) return images
  const opt =
    IMAGE_SORT_OPTIONS.find((o) => o.key === sortKey) ??
    IMAGE_SORT_OPTIONS.find((o) => o.key === DEFAULT_IMAGE_SORT_KEY)
  if (!opt) return images

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

  const sorted = [...images]
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

// Tone hints colour the chip by category (sort/date/text/tag/choice)
// so users can group active filters at a glance.
const CATEGORICAL_LABELS = {
  form: 'Form', imageStatus: 'Status', imageVersion: 'Version',
  audience: 'Audience', extension: 'File ext', orientation: 'Orientation',
  dimension: 'Dimension', bitDepth: 'Bit depth', dpi: 'DPI',
  manufacturer: 'Manufacturer', model: 'Model', lens: 'Lens',
  accrualMethod: 'Accrual', lccClassification: 'LCC class',
  availability: 'Availability', licenseType: 'License',
}
const CONTAINS_LABELS = {
  event: 'Event', location: 'Location', description: 'Description',
  personShownInImage: 'Person shown',
  creatorArtistPhotographer: 'Creator', contributor: 'Contributor',
  provenance: 'Provenance', photostory: 'Photostory',
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
  dateCreatedFrom: 'Captured',
  datePublishedFrom: 'Published',
  dateModifiedFrom: 'Modified',
  dateCopyrightedFrom: 'Copyrighted',
  createdFrom: 'Created',
  updatedFrom: 'Updated',
}
const COLLECTION_SINGULAR = {
  subject: 'Subject',
  genre: 'Genre',
  colorOfImage: 'Color',
  whereThisImageUsed: 'Used in',
  tags: 'Tag',
  keywords: 'Keyword',
}

export function buildImageChips({ filters, sortKey, sortLabel, onClearSort, updateFilter }) {
  const chips = []

  if (sortKey && sortKey !== DEFAULT_IMAGE_SORT_KEY && sortLabel) {
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
