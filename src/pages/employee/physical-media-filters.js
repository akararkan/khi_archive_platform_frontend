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
// `pageable` marks a sortBy that is also a real entity property, so the page
// can send Spring's `sort=field,dir` alongside it — the unfiltered DB-paged
// path orders by the Pageable, the filtered in-memory path by sortBy. The
// duration options omit it (`duration` is a synonym for `durationMin`, and an
// unknown Pageable property would blow up the JPA query).
//
// The default entry sends NOTHING, so the untouched list is byte-for-byte the
// order this page showed before the toolbar existed.
// ─────────────────────────────────────────────────────────────────
export const PHYSICAL_MEDIA_SORT_OPTIONS = [
  { key: 'default',              label: 'Default order',          sortBy: '',                sortDirection: ''     },
  { key: 'pmCode-asc',           label: 'Code (A → Z)',           sortBy: 'pmCode',          sortDirection: 'asc',  pageable: true },
  { key: 'pmCode-desc',          label: 'Code (Z → A)',           sortBy: 'pmCode',          sortDirection: 'desc', pageable: true },
  { key: 'inventoryNumber-asc',  label: 'Inventory № (low → high)', sortBy: 'inventoryNumber', sortDirection: 'asc',  pageable: true },
  { key: 'inventoryNumber-desc', label: 'Inventory № (high → low)', sortBy: 'inventoryNumber', sortDirection: 'desc', pageable: true },
  { key: 'title-asc',            label: 'Title (A → Z)',          sortBy: 'title',           sortDirection: 'asc',  pageable: true },
  { key: 'title-desc',           label: 'Title (Z → A)',          sortBy: 'title',           sortDirection: 'desc', pageable: true },
  { key: 'year-desc',            label: 'Year (newest)',          sortBy: 'year',            sortDirection: 'desc', pageable: true },
  { key: 'year-asc',             label: 'Year (oldest)',          sortBy: 'year',            sortDirection: 'asc',  pageable: true },
  { key: 'duration-desc',        label: 'Longest first',          sortBy: 'duration',        sortDirection: 'desc' },
  { key: 'duration-asc',         label: 'Shortest first',         sortBy: 'duration',        sortDirection: 'asc'  },
  { key: 'digitizeDate-desc',    label: 'Digitised (newest)',     sortBy: 'digitizeDate',    sortDirection: 'desc', pageable: true },
  { key: 'digitizeDate-asc',     label: 'Digitised (oldest)',     sortBy: 'digitizeDate',    sortDirection: 'asc',  pageable: true },
  { key: 'createdAt-desc',       label: 'Newest first',           sortBy: 'createdAt',       sortDirection: 'desc', pageable: true },
  { key: 'createdAt-asc',        label: 'Oldest first',           sortBy: 'createdAt',       sortDirection: 'asc',  pageable: true },
  { key: 'updatedAt-desc',       label: 'Recently updated',       sortBy: 'updatedAt',       sortDirection: 'desc', pageable: true },
]
export const DEFAULT_PHYSICAL_MEDIA_SORT_KEY = 'default'

export function buildPhysicalMediaSortParams(option) {
  if (!option?.sortBy) return {}
  const params = { sortBy: option.sortBy, sortDirection: option.sortDirection }
  if (option.pageable) params.sort = `${option.sortBy},${option.sortDirection}`
  return params
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
    // trash-only; stays blank (and unsent) on the active list
    removedBy: '',
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
  for (const [minKey, maxKey] of NUMBER_RANGES) {
    if (filters[minKey] !== '') params[minKey] = filters[minKey]
    if (filters[maxKey] !== '') params[maxKey] = filters[maxKey]
  }
  // digitizeDate is a plain calendar date on the entity; created/updated are
  // Instants, so their day bounds are snapped to UTC.
  if (filters.digitizeDateFrom) params.digitizeDateFrom = filters.digitizeDateFrom
  if (filters.digitizeDateTo) params.digitizeDateTo = filters.digitizeDateTo
  if (filters.createdFrom) params.createdFrom = `${filters.createdFrom}T00:00:00Z`
  if (filters.createdTo) params.createdTo = `${filters.createdTo}T23:59:59.999Z`
  if (filters.updatedFrom) params.updatedFrom = `${filters.updatedFrom}T00:00:00Z`
  if (filters.updatedTo) params.updatedTo = `${filters.updatedTo}T23:59:59.999Z`
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
  const dates = [
    ['digitizeDate', 'Digitised', 'digitizeDateFrom', 'digitizeDateTo'],
    ['created', 'Created', 'createdFrom', 'createdTo'],
    ['updated', 'Updated', 'updatedFrom', 'updatedTo'],
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
