// Filter + sort logic for the Maqam list, shared by the employee and admin
// pages (unlike Physical Media, Maqam has two separate page implementations).
// The panel that renders these atoms lives in
// components/maqam/MaqamFilterPanel.jsx — kept apart so this stays a pure
// module (mixing component and non-component exports breaks fast refresh).
//
// Every atom here maps one-for-one onto MaqamFilterParams on the backend, which
// applies them in-memory over the active set. Maqam has NO ReadCache — an empty
// filter keeps the original DB-paged query, so `buildMaqamFilterParams` drops
// blanks to stay on that fast path until the user actually filters.

// ─────────────────────────────────────────────────────────────────
// Sort options — `sortBy` strings match the backend whitelist.
//
// Ordering rides on sortBy/sortDirection alone (see SORT_AND_FILTER_REFERENCE):
// every key here maps to a real column, so a sort-only request takes the DB
// fast path and lands one page; the same comparator runs in memory as soon as a
// filter is present, so a row keeps its position on either path.
// ─────────────────────────────────────────────────────────────────
export const MAQAM_SORT_OPTIONS = [
  { key: 'createdAt-desc', label: 'Newest first',           sortBy: 'createdAt', sortDirection: 'desc' },
  { key: 'createdAt-asc',  label: 'Oldest first',           sortBy: 'createdAt', sortDirection: 'asc'  },
  { key: 'maqamCode-asc',  label: 'Code (A → Z)',           sortBy: 'maqamCode', sortDirection: 'asc'  },
  { key: 'maqamCode-desc', label: 'Code (Z → A)',           sortBy: 'maqamCode', sortDirection: 'desc' },
  { key: 'songName-asc',   label: 'Song (A → Z)',           sortBy: 'songName',  sortDirection: 'asc'  },
  { key: 'songName-desc',  label: 'Song (Z → A)',           sortBy: 'songName',  sortDirection: 'desc' },
  { key: 'producer-asc',   label: 'Singer (A → Z)',         sortBy: 'producer',  sortDirection: 'asc'  },
  { key: 'producer-desc',  label: 'Singer (Z → A)',         sortBy: 'producer',  sortDirection: 'desc' },
  { key: 'duration-desc',  label: 'Longest first',          sortBy: 'duration',  sortDirection: 'desc' },
  { key: 'duration-asc',   label: 'Shortest first',         sortBy: 'duration',  sortDirection: 'asc'  },
  { key: 'updatedAt-desc', label: 'Recently updated',       sortBy: 'updatedAt', sortDirection: 'desc' },
  { key: 'updatedAt-asc',  label: 'Least recently updated', sortBy: 'updatedAt', sortDirection: 'asc'  },
]

// Sort state → query params. Pairs with buildMaqamFilterParams at call sites.
export function buildMaqamSortParams(option) {
  if (!option?.sortBy) return {}
  return { sortBy: option.sortBy, sortDirection: option.sortDirection }
}

// Matches the ordering both pages used before this toolbar existed, so the
// default view is unchanged.
export const DEFAULT_MAQAM_SORT_KEY = 'createdAt-desc'

// Trash keeps the backend's id-ASC default until the admin picks a sort, so its
// list gets a leading "send nothing" entry rather than createdAt-desc.
export const MAQAM_TRASH_SORT_OPTIONS = [
  { key: 'default', label: 'Default order', sortBy: '', sortDirection: '' },
  ...MAQAM_SORT_OPTIONS,
]
export const DEFAULT_MAQAM_TRASH_SORT_KEY = 'default'

export const ASSIGNMENT_OPTIONS = [
  { value: '', label: 'Any' },
  { value: 'assigned', label: 'Assigned' },
  { value: 'unassigned', label: 'Unassigned' },
]
export const VOTE_STATUS_OPTIONS = [
  { value: '', label: 'Any' },
  { value: 'none', label: 'No votes' },
  { value: 'partial', label: 'Partial' },
  { value: 'full', label: 'Complete' },
]

export function createInitialMaqamFilters() {
  return {
    songName: '',
    producer: '',
    maqamCode: '',
    archiveNote: '',
    audioFileName: '',
    maqamType: '',
    teacherUsername: '',
    assignmentStatus: '',
    voteStatus: '',
    durationSecondsMin: '',
    durationSecondsMax: '',
    createdFrom: '',
    createdTo: '',
    updatedFrom: '',
    updatedTo: '',
    // trash-only; stays blank (and unsent) on the active list
    removedBy: '',
  }
}

const TEXT_KEYS = [
  'songName',
  'producer',
  'maqamCode',
  'archiveNote',
  'audioFileName',
  'maqamType',
  'teacherUsername',
  'removedBy',
]

// Filter state → query params. Blanks are dropped so an untouched panel
// leaves the backend on its unfiltered DB-paged fast path.
export function buildMaqamFilterParams(filters) {
  const params = {}
  for (const key of TEXT_KEYS) {
    const value = (filters[key] ?? '').trim()
    if (value) params[key] = value
  }
  if (filters.assignmentStatus) params.assignmentStatus = filters.assignmentStatus
  if (filters.voteStatus) params.voteStatus = filters.voteStatus
  if (filters.durationSecondsMin !== '') params.durationSecondsMin = filters.durationSecondsMin
  if (filters.durationSecondsMax !== '') params.durationSecondsMax = filters.durationSecondsMax
  // createdAt/updatedAt are Instants server-side — snap the day to UTC bounds.
  if (filters.createdFrom) params.createdFrom = `${filters.createdFrom}T00:00:00Z`
  if (filters.createdTo) params.createdTo = `${filters.createdTo}T23:59:59.999Z`
  if (filters.updatedFrom) params.updatedFrom = `${filters.updatedFrom}T00:00:00Z`
  if (filters.updatedTo) params.updatedTo = `${filters.updatedTo}T23:59:59.999Z`
  return params
}

export function isMaqamFilterEmpty(filters) {
  return Object.keys(buildMaqamFilterParams(filters)).length === 0
}

// One count per *concept* (a from/to pair counts once), so the badge on the
// trigger button reads the way users think about their filters.
export function countMaqamFilters(filters) {
  let n = 0
  for (const key of TEXT_KEYS) if ((filters[key] ?? '').trim()) n += 1
  if (filters.assignmentStatus) n += 1
  if (filters.voteStatus) n += 1
  if (filters.durationSecondsMin !== '' || filters.durationSecondsMax !== '') n += 1
  if (filters.createdFrom || filters.createdTo) n += 1
  if (filters.updatedFrom || filters.updatedTo) n += 1
  return n
}

const TEXT_CHIP_LABELS = {
  songName: 'Song',
  producer: 'Singer',
  maqamCode: 'Code',
  archiveNote: 'Archive note',
  audioFileName: 'Audio file',
  maqamType: 'Maqam type',
  teacherUsername: 'Teacher',
  removedBy: 'Removed by',
}

function rangeChipValue(min, max, suffix = '') {
  if (min !== '' && max !== '') return `${min}–${max}${suffix}`
  if (min !== '') return `≥ ${min}${suffix}`
  return `≤ ${max}${suffix}`
}

function dateChipValue(from, to) {
  if (from && to) return `${from} → ${to}`
  return from ? `from ${from}` : `until ${to}`
}

export function buildMaqamChips({ sortLabel, onClearSort, filters, updateFilter }) {
  const chips = []
  if (sortLabel) {
    chips.push({ key: 'sort', tone: 'sort', label: 'Sort', value: sortLabel, onRemove: onClearSort })
  }
  for (const key of TEXT_KEYS) {
    const value = (filters[key] ?? '').trim()
    if (!value) continue
    chips.push({
      key,
      tone: key === 'maqamType' ? 'choice' : 'text',
      label: TEXT_CHIP_LABELS[key],
      value,
      onRemove: () => updateFilter(key, ''),
    })
  }
  if (filters.assignmentStatus) {
    chips.push({
      key: 'assignmentStatus',
      tone: 'choice',
      label: 'Panel',
      value: ASSIGNMENT_OPTIONS.find((o) => o.value === filters.assignmentStatus)?.label ?? filters.assignmentStatus,
      onRemove: () => updateFilter('assignmentStatus', ''),
    })
  }
  if (filters.voteStatus) {
    chips.push({
      key: 'voteStatus',
      tone: 'choice',
      label: 'Votes',
      value: VOTE_STATUS_OPTIONS.find((o) => o.value === filters.voteStatus)?.label ?? filters.voteStatus,
      onRemove: () => updateFilter('voteStatus', ''),
    })
  }
  if (filters.durationSecondsMin !== '' || filters.durationSecondsMax !== '') {
    chips.push({
      key: 'duration',
      tone: 'text',
      label: 'Duration',
      value: rangeChipValue(filters.durationSecondsMin, filters.durationSecondsMax, 's'),
      onRemove: () => {
        updateFilter('durationSecondsMin', '')
        updateFilter('durationSecondsMax', '')
      },
    })
  }
  if (filters.createdFrom || filters.createdTo) {
    chips.push({
      key: 'created',
      tone: 'date',
      label: 'Created',
      value: dateChipValue(filters.createdFrom, filters.createdTo),
      onRemove: () => {
        updateFilter('createdFrom', '')
        updateFilter('createdTo', '')
      },
    })
  }
  if (filters.updatedFrom || filters.updatedTo) {
    chips.push({
      key: 'updated',
      tone: 'date',
      label: 'Updated',
      value: dateChipValue(filters.updatedFrom, filters.updatedTo),
      onRemove: () => {
        updateFilter('updatedFrom', '')
        updateFilter('updatedTo', '')
      },
    })
  }
  return chips
}
