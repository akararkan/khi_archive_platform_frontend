// Filter + sort logic for the audio table inside a project's detail
// page. Mirrors the backend's AudioFilterParams shape one-for-one so
// that the UI's filter atoms map directly onto what the server
// understands; the actual matching here runs client-side against the
// already-loaded project audios (no extra round-trip needed since
// the project's media is already in memory).
//
// Matching rules — kept identical to AudioFilterSupport on the
// backend so that turning this into a server-side filter later is a
// drop-in swap:
//   - categorical: case-insensitive equals
//   - long-text:   case-insensitive substring (contains)
//   - collection:  any/all match against tokens
//   - numeric:     min/max inclusive
//   - date:        ISO range, snapped to start/end of day, inclusive
//   - boolean:     true/false/any
//
// Order of evaluation matches AudioFilterSupport's "fastest algorithm"
// short-circuit: cheap booleans → numeric → date → equals → contains
// → collections. Each false return ejects the row before the more
// expensive checks run.

// ─────────────────────────────────────────────────────────────────
// Sort options
// ─────────────────────────────────────────────────────────────────

// Curated subset of what the backend accepts. The full list is large
// (every entity-side date plus three audit-style sorts plus quality
// and version/copy numbers) — these are the slices users actually
// reach for. Each entry's `sortBy` string matches what the server
// would expect if this ever gets pushed back to the API.
export const AUDIO_SORT_OPTIONS = [
  { key: 'audioCode-asc',          label: 'Code (A → Z)',                sortBy: 'audioCode',          sortDirection: 'asc'  },
  { key: 'audioCode-desc',         label: 'Code (Z → A)',                sortBy: 'audioCode',          sortDirection: 'desc' },
  { key: 'originTitle-asc',        label: 'Title (A → Z)',               sortBy: 'originTitle',        sortDirection: 'asc'  },
  { key: 'originTitle-desc',       label: 'Title (Z → A)',               sortBy: 'originTitle',        sortDirection: 'desc' },
  { key: 'createdAt-desc',         label: 'Newest first',                sortBy: 'createdAt',          sortDirection: 'desc' },
  { key: 'createdAt-asc',          label: 'Oldest first',                sortBy: 'createdAt',          sortDirection: 'asc'  },
  { key: 'updatedAt-desc',         label: 'Recently updated',            sortBy: 'updatedAt',          sortDirection: 'desc' },
  { key: 'updatedAt-asc',          label: 'Least recently updated',      sortBy: 'updatedAt',          sortDirection: 'asc'  },
  { key: 'dateCreated-desc',       label: 'Recording date (newest)',     sortBy: 'dateCreated',        sortDirection: 'desc' },
  { key: 'dateCreated-asc',        label: 'Recording date (oldest)',     sortBy: 'dateCreated',        sortDirection: 'asc'  },
  { key: 'datePublished-desc',     label: 'Published (newest)',          sortBy: 'datePublished',      sortDirection: 'desc' },
  { key: 'datePublished-asc',      label: 'Published (oldest)',          sortBy: 'datePublished',      sortDirection: 'asc'  },
  { key: 'dateCopyrighted-desc',   label: 'Copyrighted (newest)',        sortBy: 'dateCopyrighted',    sortDirection: 'desc' },
  { key: 'audioQualityOutOf10-desc', label: 'Quality (high → low)',       sortBy: 'audioQualityOutOf10', sortDirection: 'desc' },
  { key: 'audioQualityOutOf10-asc',  label: 'Quality (low → high)',       sortBy: 'audioQualityOutOf10', sortDirection: 'asc'  },
  { key: 'versionNumber-asc',      label: 'Version (low → high)',        sortBy: 'versionNumber',      sortDirection: 'asc'  },
  { key: 'versionNumber-desc',     label: 'Version (high → low)',        sortBy: 'versionNumber',      sortDirection: 'desc' },
  { key: 'copyNumber-asc',         label: 'Copy # (low → high)',         sortBy: 'copyNumber',         sortDirection: 'asc'  },
]
export const DEFAULT_AUDIO_SORT_KEY = 'audioCode-asc'

// ─────────────────────────────────────────────────────────────────
// Initial state + introspection
// ─────────────────────────────────────────────────────────────────

export function createInitialAudioFilters() {
  return {
    // categorical (case-insensitive equals)
    form: '',
    typeOfBasta: '',
    typeOfMaqam: '',
    language: '',
    dialect: '',
    typeOfComposition: '',
    typeOfPerformance: '',
    city: '',
    region: '',
    audience: '',
    audioChannel: '',
    fileExtension: '',
    bitRate: '',
    bitDepth: '',
    sampleRate: '',
    lccClassification: '',
    accrualMethod: '',
    availability: '',
    licenseType: '',

    // long-text (case-insensitive contains)
    speaker: '',
    producer: '',
    composer: '',
    poet: '',
    lyrics: '',
    recordingVenue: '',
    locationArchive: '',
    degitizedBy: '',
    degitizationEquipment: '',
    provenance: '',
    copyright: '',
    rightOwner: '',
    usageRights: '',
    owner: '',
    publisher: '',

    // collections (any/all)
    genre: [],
    genreMatch: 'any',
    contributors: [],
    contributorMatch: 'any',
    tags: [],
    tagMatch: 'any',
    keywords: [],
    keywordMatch: 'any',

    // boolean — '' = any, 'true' / 'false' = filter
    physicalAvailability: '',

    // numeric ranges (strings so empty = unset)
    audioQualityMin: '',
    audioQualityMax: '',
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
  'form', 'typeOfBasta', 'typeOfMaqam', 'language', 'dialect',
  'typeOfComposition', 'typeOfPerformance', 'city', 'region', 'audience',
  'audioChannel', 'fileExtension', 'bitRate', 'bitDepth', 'sampleRate',
  'lccClassification', 'accrualMethod', 'availability', 'licenseType',
]
const CONTAINS_FIELDS = [
  'speaker', 'producer', 'composer', 'poet', 'lyrics',
  'recordingVenue', 'locationArchive', 'degitizedBy',
  'degitizationEquipment', 'provenance', 'copyright', 'rightOwner',
  'usageRights', 'owner', 'publisher',
]
const COLLECTION_FIELDS = ['genre', 'contributors', 'tags', 'keywords']
const NUMERIC_RANGES = [
  ['audioQualityMin', 'audioQualityMax', 'audioQualityOutOf10'],
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

export function isAudioFilterEmpty(filters) {
  for (const f of CATEGORICAL_FIELDS) if (filters[f]?.trim?.()) return false
  for (const f of CONTAINS_FIELDS) if (filters[f]?.trim?.()) return false
  for (const f of COLLECTION_FIELDS) if (filters[f]?.length > 0) return false
  if (filters.physicalAvailability) return false
  for (const [from, to] of NUMERIC_RANGES) if (filters[from] || filters[to]) return false
  for (const [from, to] of DATE_RANGES) if (filters[from] || filters[to]) return false
  return true
}

// Counts "filter atoms" the way the trigger button shows — one per
// distinct active filter, not per token. Used for the badge.
export function countAudioFilters(filters) {
  let n = 0
  for (const f of CATEGORICAL_FIELDS) if (filters[f]?.trim?.()) n += 1
  for (const f of CONTAINS_FIELDS) if (filters[f]?.trim?.()) n += 1
  for (const f of COLLECTION_FIELDS) if (filters[f]?.length > 0) n += 1
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

function getAudioCollection(audio, field) {
  const raw = audio[field]
  if (Array.isArray(raw)) return raw
  if (typeof raw === 'string' && raw.trim()) {
    return raw.split(/[,،;]/).map((s) => s.trim()).filter(Boolean)
  }
  return []
}

function matchCollection(audio, field, wanted, mode) {
  if (wanted.size === 0) return true
  const list = getAudioCollection(audio, field)
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

// Date inputs emit YYYY-MM-DD; the audio entity dates may be stored
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
export function applyAudioFilters(audios, filters) {
  if (!Array.isArray(audios) || audios.length === 0) return []
  if (isAudioFilterEmpty(filters)) return audios

  const wantedGenre = buildWantedSet(filters.genre)
  const wantedContributors = buildWantedSet(filters.contributors)
  const wantedTags = buildWantedSet(filters.tags)
  const wantedKeywords = buildWantedSet(filters.keywords)

  const out = []
  outer: for (const audio of audios) {
    // boolean (cheapest)
    if (filters.physicalAvailability) {
      const want = filters.physicalAvailability === 'true'
      if (Boolean(audio.physicalAvailability) !== want) continue
    }

    // numeric ranges
    for (const [fromKey, toKey, field] of NUMERIC_RANGES) {
      const fromVal = filters[fromKey]
      const toVal = filters[toKey]
      if (fromVal === '' && toVal === '') continue
      if (!inNumericRange(audio[field], fromVal, toVal)) continue outer
    }

    // date ranges
    for (const [fromKey, toKey, field] of DATE_RANGES) {
      const fromVal = filters[fromKey]
      const toVal = filters[toKey]
      if (!fromVal && !toVal) continue
      if (!inDateRange(audio[field], fromVal, toVal)) continue outer
    }

    // categorical equals (case-insensitive)
    for (const field of CATEGORICAL_FIELDS) {
      const wanted = norm(filters[field])
      if (!wanted) continue
      if (norm(audio[field]) !== wanted) continue outer
    }

    // long-text contains (case-insensitive substring)
    for (const field of CONTAINS_FIELDS) {
      const wanted = norm(filters[field])
      if (!wanted) continue
      if (!norm(audio[field]).includes(wanted)) continue outer
    }

    // collections (any/all)
    if (!matchCollection(audio, 'genre', wantedGenre, filters.genreMatch)) continue
    if (!matchCollection(audio, 'contributors', wantedContributors, filters.contributorMatch)) continue
    if (!matchCollection(audio, 'tags', wantedTags, filters.tagMatch)) continue
    if (!matchCollection(audio, 'keywords', wantedKeywords, filters.keywordMatch)) continue

    out.push(audio)
  }
  return out
}

// String / numeric / date sort. Returns a new sorted array. Nulls
// always sort last regardless of asc/desc so missing values don't
// crowd the top of the list.
export function applyAudioSort(audios, sortKey) {
  if (!Array.isArray(audios) || audios.length === 0) return audios
  const opt =
    AUDIO_SORT_OPTIONS.find((o) => o.key === sortKey) ??
    AUDIO_SORT_OPTIONS.find((o) => o.key === DEFAULT_AUDIO_SORT_KEY)
  if (!opt) return audios

  const dir = opt.sortDirection === 'desc' ? -1 : 1
  const field = opt.sortBy

  const isNumericField =
    field === 'audioQualityOutOf10' ||
    field === 'versionNumber' ||
    field === 'copyNumber'
  const isDateField =
    field === 'createdAt' ||
    field === 'updatedAt' ||
    field === 'dateCreated' ||
    field === 'datePublished' ||
    field === 'dateModified' ||
    field === 'dateCopyrighted'

  const sorted = [...audios]
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
  form: 'Form', typeOfBasta: 'Basta', typeOfMaqam: 'Maqam',
  language: 'Language', dialect: 'Dialect',
  typeOfComposition: 'Composition', typeOfPerformance: 'Performance',
  city: 'City', region: 'Region', audience: 'Audience',
  audioChannel: 'Channel', fileExtension: 'File ext',
  bitRate: 'Bit rate', bitDepth: 'Bit depth', sampleRate: 'Sample rate',
  lccClassification: 'LCC class', accrualMethod: 'Accrual',
  availability: 'Availability', licenseType: 'License',
}
const CONTAINS_LABELS = {
  speaker: 'Speaker', producer: 'Producer', composer: 'Composer', poet: 'Poet',
  lyrics: 'Lyrics', recordingVenue: 'Venue', locationArchive: 'Archive',
  degitizedBy: 'Digitized by', degitizationEquipment: 'Equipment',
  provenance: 'Provenance', copyright: 'Copyright', rightOwner: 'Right owner',
  usageRights: 'Usage', owner: 'Owner', publisher: 'Publisher',
}
const NUMERIC_LABELS = {
  audioQualityMin: 'Quality',
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

export function buildAudioChips({ filters, sortKey, sortLabel, onClearSort, updateFilter }) {
  const chips = []

  if (sortKey && sortKey !== DEFAULT_AUDIO_SORT_KEY && sortLabel) {
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

  for (const field of COLLECTION_FIELDS) {
    const list = filters[field]
    if (!list || list.length === 0) continue
    const matchKey = `${field === 'genre' ? 'genre' : field === 'contributors' ? 'contributor' : field === 'tags' ? 'tag' : 'keyword'}Match`
    if (filters[matchKey] === 'all') {
      chips.push({
        key: `match-${field}`,
        tone: 'choice',
        label: 'Match',
        value: `all ${field}`,
        onRemove: () => updateFilter(matchKey, 'any'),
      })
    }
    const labelOne = field === 'genre' ? 'Genre' : field === 'contributors' ? 'Contributor' : field === 'tags' ? 'Tag' : 'Keyword'
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
