// Filter + sort logic for the Physical-media inventory list. Mirrors
// PhysicalMediaFilterParams on the backend, which applies these in-memory over
// the active set. The panel that renders these atoms lives in
// components/physical-media/PhysicalMediaFilterPanel.jsx — kept apart so this
// stays a pure module (mixing component and non-component exports breaks fast
// refresh).
//
// Physical Media has NO ReadCache: with an EMPTY filter the backend keeps its
// original DB-paged query, and only a non-empty filter triggers the load-all +
// filter/sort path. `buildPhysicalMediaFilterParams` therefore drops blanks —
// an untouched panel must leave the fast path untouched too.
//
// The backend exposes ~50 params; this surfaces the ones staff actually reach
// for. Anything omitted here is still accepted by services/physical-media.js,
// so adding a control later is a one-line change on both sides.

// ─────────────────────────────────────────────────────────────────
// Sort options
//
// Ordering rides on sortBy/sortDirection alone (see SORT_AND_FILTER_REFERENCE);
// Spring's `sort=field,dir` is never sent — it can 500 on a key with no column.
// Every key below is honoured on both the DB fast path and the in-memory one,
// except `digitization`, which the backend always sorts in memory because it
// orders by a derived 0/1/2 code.
//
// The default entry sends NOTHING, so the untouched list keeps the backend's
// own @PageableDefault order (id ASC) — exactly what this page showed before
// the toolbar existed.
// ─────────────────────────────────────────────────────────────────
export const PHYSICAL_MEDIA_SORT_OPTIONS = [
  { key: 'default',              label: 'Default order',            sortBy: '',                  sortDirection: ''     },
  { key: 'pmCode-asc',           label: 'Code (A → Z)',             sortBy: 'pmCode',            sortDirection: 'asc'  },
  { key: 'pmCode-desc',          label: 'Code (Z → A)',             sortBy: 'pmCode',            sortDirection: 'desc' },
  { key: 'inventoryNumber-asc',  label: 'Inventory № (low → high)', sortBy: 'inventoryNumber',   sortDirection: 'asc'  },
  { key: 'inventoryNumber-desc', label: 'Inventory № (high → low)', sortBy: 'inventoryNumber',   sortDirection: 'desc' },
  { key: 'rowNumber-asc',        label: 'Row № (low → high)',       sortBy: 'rowNumber',         sortDirection: 'asc'  },
  { key: 'rowNumber-desc',       label: 'Row № (high → low)',       sortBy: 'rowNumber',         sortDirection: 'desc' },
  { key: 'title-asc',            label: 'Title (A → Z)',            sortBy: 'title',             sortDirection: 'asc'  },
  { key: 'title-desc',           label: 'Title (Z → A)',            sortBy: 'title',             sortDirection: 'desc' },
  { key: 'physicalMediaType-asc', label: 'Type (A → Z)',            sortBy: 'physicalMediaType', sortDirection: 'asc'  },
  { key: 'mediaCategory-asc',    label: 'Category (A → Z)',         sortBy: 'mediaCategory',     sortDirection: 'asc'  },
  // The one key with no backing column: it orders by the derived 0/1/2 code, so
  // picking it drops the request onto the in-memory path (a full-set scan) even
  // with no filters set — every other key here stays a single DB page. Worth it,
  // since "what's left to digitise" is the actual workflow question.
  { key: 'digitization-asc',     label: 'Digitisation (least first)', sortBy: 'digitization',    sortDirection: 'asc'  },
  { key: 'digitization-desc',    label: 'Digitisation (most first)',  sortBy: 'digitization',    sortDirection: 'desc' },
  { key: 'year-desc',            label: 'Year (newest)',            sortBy: 'year',              sortDirection: 'desc' },
  { key: 'year-asc',             label: 'Year (oldest)',            sortBy: 'year',              sortDirection: 'asc'  },
  { key: 'duration-desc',        label: 'Longest first',            sortBy: 'duration',          sortDirection: 'desc' },
  { key: 'duration-asc',         label: 'Shortest first',           sortBy: 'duration',          sortDirection: 'asc'  },
  { key: 'digitizeDate-desc',    label: 'Digitised (newest)',       sortBy: 'digitizeDate',      sortDirection: 'desc' },
  { key: 'digitizeDate-asc',     label: 'Digitised (oldest)',       sortBy: 'digitizeDate',      sortDirection: 'asc'  },
  { key: 'createdAt-desc',       label: 'Newest first',             sortBy: 'createdAt',         sortDirection: 'desc' },
  { key: 'createdAt-asc',        label: 'Oldest first',             sortBy: 'createdAt',         sortDirection: 'asc'  },
  { key: 'updatedAt-desc',       label: 'Recently updated',         sortBy: 'updatedAt',         sortDirection: 'desc' },
  { key: 'updatedAt-asc',        label: 'Least recently updated',   sortBy: 'updatedAt',         sortDirection: 'asc'  },
]
export const DEFAULT_PHYSICAL_MEDIA_SORT_KEY = 'default'

export function buildPhysicalMediaSortParams(option) {
  if (!option?.sortBy) return {}
  return { sortBy: option.sortBy, sortDirection: option.sortDirection }
}

export const DIGITIZATION_OPTIONS = [
  { value: '', label: 'Any' },
  { value: 'NOT_DIGITIZED', label: 'Not digitised' },
  { value: 'DIGITIZED', label: 'Digitised' },
  { value: 'DUPLICATED', label: 'Duplicated' },
]
export const NEED_TO_CLEAR_OPTIONS = [
  { value: '', label: 'Any' },
  { value: 'true', label: 'Needs clearing' },
  { value: 'false', label: 'Cleared' },
]
// How the row entered the archive — the post-import QA filter
// ("everything that came from the last spreadsheet").
export const SOURCE_OPTIONS = [
  { value: '', label: 'Any' },
  { value: 'MANUAL', label: 'Added by hand' },
  { value: 'IMPORT', label: 'Imported' },
]

export function createInitialPhysicalMediaFilters() {
  return {
    // exact (case-insensitive equals)
    physicalMediaType: '',
    mediaCategory: '',
    physicalSize: '',
    extension: '',
    formatCodec: '',
    // enum / boolean
    digitization: '',
    needToClear: '',
    source: '',
    // contains
    pmCode: '',
    title: '',
    physicalLabel: '',
    owner: '',
    tags: '',
    content: '',
    // numeric ranges
    yearMin: '',
    yearMax: '',
    durationMinutesMin: '',
    durationMinutesMax: '',
    inventoryNumberMin: '',
    inventoryNumberMax: '',
    // date ranges
    digitizeDateFrom: '',
    digitizeDateTo: '',
    createdFrom: '',
    createdTo: '',
    updatedFrom: '',
    updatedTo: '',
    // trash-only; stay blank (and unsent) on the active list
    removedBy: '',
    removedFrom: '',
    removedTo: '',
  }
}

const TEXT_KEYS = [
  'physicalMediaType',
  'mediaCategory',
  'physicalSize',
  'extension',
  'formatCodec',
  'pmCode',
  'title',
  'physicalLabel',
  'owner',
  'tags',
  'content',
  'removedBy',
]
// Audit ranges — plain calendar dates, resolved server-side in the archive zone.
const DATE_RANGE_KEYS = ['createdFrom', 'createdTo', 'updatedFrom', 'updatedTo', 'removedFrom', 'removedTo']

const NUMBER_RANGES = [
  ['yearMin', 'yearMax'],
  ['durationMinutesMin', 'durationMinutesMax'],
  ['inventoryNumberMin', 'inventoryNumberMax'],
]

export function buildPhysicalMediaFilterParams(filters) {
  const params = {}
  for (const key of TEXT_KEYS) {
    const value = (filters[key] ?? '').trim()
    if (value) params[key] = value
  }
  if (filters.digitization) params.digitization = filters.digitization
  if (filters.needToClear) params.needToClear = filters.needToClear
  if (filters.source) params.source = filters.source
  for (const [minKey, maxKey] of NUMBER_RANGES) {
    if (filters[minKey] !== '') params[minKey] = filters[minKey]
    if (filters[maxKey] !== '') params[maxKey] = filters[maxKey]
  }
  // Every date param on this entity is now a BARE DATE (YYYY-MM-DD).
  // digitizeDate is a plain date column; the audit ranges are Instants that the
  // backend resolves to Asia/Baghdad day bounds itself — so no client-side zone
  // math, and no UTC-midnight edge dropping records made before 03:00 local.
  if (filters.digitizeDateFrom) params.digitizeDateFrom = filters.digitizeDateFrom
  if (filters.digitizeDateTo) params.digitizeDateTo = filters.digitizeDateTo
  for (const key of DATE_RANGE_KEYS) {
    if (filters[key]) params[key] = filters[key]
  }
  return params
}

export function isPhysicalMediaFilterEmpty(filters) {
  return Object.keys(buildPhysicalMediaFilterParams(filters)).length === 0
}

export function countPhysicalMediaFilters(filters) {
  let n = 0
  for (const key of TEXT_KEYS) if ((filters[key] ?? '').trim()) n += 1
  if (filters.digitization) n += 1
  if (filters.needToClear) n += 1
  if (filters.source) n += 1
  for (const [minKey, maxKey] of NUMBER_RANGES) {
    if (filters[minKey] !== '' || filters[maxKey] !== '') n += 1
  }
  if (filters.digitizeDateFrom || filters.digitizeDateTo) n += 1
  if (filters.createdFrom || filters.createdTo) n += 1
  if (filters.updatedFrom || filters.updatedTo) n += 1
  return n
}

const TEXT_CHIP_LABELS = {
  physicalMediaType: 'Type',
  mediaCategory: 'Category',
  physicalSize: 'Size',
  extension: 'Extension',
  formatCodec: 'Codec',
  pmCode: 'Code',
  title: 'Title',
  physicalLabel: 'Label',
  owner: 'Owner',
  tags: 'Tags',
  content: 'Content',
  removedBy: 'Removed by',
}
const EXACT_KEYS = new Set(['physicalMediaType', 'mediaCategory', 'physicalSize', 'extension', 'formatCodec'])

function rangeChipValue(min, max, suffix = '') {
  if (min !== '' && max !== '') return `${min}–${max}${suffix}`
  if (min !== '') return `≥ ${min}${suffix}`
  return `≤ ${max}${suffix}`
}

function dateChipValue(from, to) {
  if (from && to) return `${from} → ${to}`
  return from ? `from ${from}` : `until ${to}`
}

export function buildPhysicalMediaChips({ sortLabel, onClearSort, filters, updateFilter }) {
  const chips = []
  if (sortLabel) {
    chips.push({ key: 'sort', tone: 'sort', label: 'Sort', value: sortLabel, onRemove: onClearSort })
  }
  for (const key of TEXT_KEYS) {
    const value = (filters[key] ?? '').trim()
    if (!value) continue
    chips.push({
      key,
      tone: key === 'tags' ? 'tag' : EXACT_KEYS.has(key) ? 'choice' : 'text',
      label: TEXT_CHIP_LABELS[key],
      value,
      onRemove: () => updateFilter(key, ''),
    })
  }
  if (filters.digitization) {
    chips.push({
      key: 'digitization',
      tone: 'choice',
      label: 'Digitisation',
      value: DIGITIZATION_OPTIONS.find((o) => o.value === filters.digitization)?.label ?? filters.digitization,
      onRemove: () => updateFilter('digitization', ''),
    })
  }
  if (filters.needToClear) {
    chips.push({
      key: 'needToClear',
      tone: 'choice',
      label: 'Clearing',
      value: NEED_TO_CLEAR_OPTIONS.find((o) => o.value === filters.needToClear)?.label ?? filters.needToClear,
      onRemove: () => updateFilter('needToClear', ''),
    })
  }
  const ranges = [
    ['year', 'Year', 'yearMin', 'yearMax', ''],
    ['duration', 'Duration', 'durationMinutesMin', 'durationMinutesMax', ' min'],
    ['inventoryNumber', 'Inventory №', 'inventoryNumberMin', 'inventoryNumberMax', ''],
  ]
  for (const [key, label, minKey, maxKey, suffix] of ranges) {
    if (filters[minKey] === '' && filters[maxKey] === '') continue
    chips.push({
      key,
      tone: 'text',
      label,
      value: rangeChipValue(filters[minKey], filters[maxKey], suffix),
      onRemove: () => {
        updateFilter(minKey, '')
        updateFilter(maxKey, '')
      },
    })
  }
  if (filters.source) {
    chips.push({
      key: 'source',
      tone: 'choice',
      label: 'Source',
      value: SOURCE_OPTIONS.find((o) => o.value === filters.source)?.label ?? filters.source,
      onRemove: () => updateFilter('source', ''),
    })
  }
  const dates = [
    ['digitizeDate', 'Digitised', 'digitizeDateFrom', 'digitizeDateTo'],
    ['created', 'Created', 'createdFrom', 'createdTo'],
    ['updated', 'Updated', 'updatedFrom', 'updatedTo'],
    ['removed', 'Trashed', 'removedFrom', 'removedTo'],
  ]
  for (const [key, label, fromKey, toKey] of dates) {
    if (!filters[fromKey] && !filters[toKey]) continue
    chips.push({
      key,
      tone: 'date',
      label,
      value: dateChipValue(filters[fromKey], filters[toKey]),
      onRemove: () => {
        updateFilter(fromKey, '')
        updateFilter(toKey, '')
      },
    })
  }
  return chips
}
