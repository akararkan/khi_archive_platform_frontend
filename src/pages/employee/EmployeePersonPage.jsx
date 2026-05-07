import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  ArrowDownAZ,
  ArrowUpAZ,
  CalendarClock,
  Camera,
  Eye,
  Heart,
  IdCard,
  Loader2,
  MapPin,
  Pencil,
  Plus,
  RefreshCw,
  Tag,
  Trash2,
  Users,
  X,
} from 'lucide-react'

import { EmployeeEntityPage } from '@/components/employee/EmployeeEntityPage'
import { PersonDetailsModal } from '@/components/person/PersonDetailsModal'
import { PersonFieldHelpButton } from '@/components/person/PersonFieldHelpButton'
import { PersonPortrait } from '@/components/person/PersonPortrait'
import { TypedConfirmDialog } from '@/components/ui/typed-confirm-dialog'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card'
import { CodeBadge } from '@/components/ui/code-badge'
import { Highlight } from '@/components/ui/highlight'
import { DataPagination } from '@/components/ui/pagination'
import { EmptyState } from '@/components/ui/empty-state'
import { EntityToolbar } from '@/components/ui/entity-toolbar'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  DateRangeField,
  FilterChips,
  FilterField,
  FilterPanel,
  FilterSection,
  FilterTriggerButton,
  MultiValueFilter,
  SegmentedControl,
  SortSelect,
  TextFilter,
} from '@/components/ui/list-filters'
import { Skeleton } from '@/components/ui/skeleton'
import { TagsInput } from '@/components/ui/tags-input'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { useToast } from '@/hooks/use-toast'
import { FormErrorBox } from '@/components/ui/form-error'
import { formatApiError, getErrorMessage, isStaleVersionError } from '@/lib/get-error-message'
import {
  createPerson,
  deletePerson,
  getPersonsPage,
  searchPersons,
  updatePerson,
} from '@/services/person'

const PERSONS_PAGE_SIZE = 100

// Sort options exposed to the user. Labels are user-facing; the
// `sortBy` / `sortDirection` values match what the backend's
// PersonFilterParams expects (it accepts `fullName`, `createdAt`,
// `updatedAt`, `dateOfBirth`, `dateOfDeath`, plus a few synonyms).
// Default mirrors what the cached list returned before this toolbar
// existed so the introduction is invisible until the user opts in.
const PERSON_SORT_OPTIONS = [
  { key: 'fullName-asc',     label: 'Name (A → Z)',           sortBy: 'fullName',    sortDirection: 'asc'  },
  { key: 'fullName-desc',    label: 'Name (Z → A)',           sortBy: 'fullName',    sortDirection: 'desc' },
  { key: 'createdAt-desc',   label: 'Newest first',           sortBy: 'createdAt',   sortDirection: 'desc' },
  { key: 'createdAt-asc',    label: 'Oldest first',           sortBy: 'createdAt',   sortDirection: 'asc'  },
  { key: 'updatedAt-desc',   label: 'Recently updated',       sortBy: 'updatedAt',   sortDirection: 'desc' },
  { key: 'updatedAt-asc',    label: 'Least recently updated', sortBy: 'updatedAt',   sortDirection: 'asc'  },
  { key: 'dateOfBirth-asc',  label: 'Born (oldest first)',    sortBy: 'dateOfBirth', sortDirection: 'asc'  },
  { key: 'dateOfBirth-desc', label: 'Born (most recent)',     sortBy: 'dateOfBirth', sortDirection: 'desc' },
  { key: 'dateOfDeath-asc',  label: 'Died (oldest first)',    sortBy: 'dateOfDeath', sortDirection: 'asc'  },
  { key: 'dateOfDeath-desc', label: 'Died (most recent)',     sortBy: 'dateOfDeath', sortDirection: 'desc' },
]
const DEFAULT_SORT_KEY = 'fullName-asc'

function createInitialFilters() {
  return {
    gender: '',
    region: '',
    placeOfBirth: '',
    placeOfDeath: '',
    dobFrom: '',
    dobTo: '',
    dodFrom: '',
    dodTo: '',
    createdFrom: '',
    createdTo: '',
    updatedFrom: '',
    updatedTo: '',
    tags: [],
    tagMatch: 'any',
    keywords: [],
    keywordMatch: 'any',
    personType: [],
    personTypeMatch: 'any',
  }
}

// Translate the filter form state into the params the service
// expects. Empty strings / empty arrays are dropped so the resulting
// query is a pure cache pass-through when no filter is set.
function buildPersonFilterParams(filters) {
  const params = {}
  if (filters.gender) params.gender = filters.gender
  if (filters.region.trim()) params.region = filters.region.trim()
  if (filters.placeOfBirth.trim()) params.placeOfBirth = filters.placeOfBirth.trim()
  if (filters.placeOfDeath.trim()) params.placeOfDeath = filters.placeOfDeath.trim()
  // Date-of-* are LocalDate on the backend (no time component).
  // Created/Updated are Instant (snap to start/end of day in UTC).
  if (filters.dobFrom) params.dobFrom = filters.dobFrom
  if (filters.dobTo) params.dobTo = filters.dobTo
  if (filters.dodFrom) params.dodFrom = filters.dodFrom
  if (filters.dodTo) params.dodTo = filters.dodTo
  if (filters.createdFrom) params.createdFrom = `${filters.createdFrom}T00:00:00Z`
  if (filters.createdTo)   params.createdTo   = `${filters.createdTo}T23:59:59.999Z`
  if (filters.updatedFrom) params.updatedFrom = `${filters.updatedFrom}T00:00:00Z`
  if (filters.updatedTo)   params.updatedTo   = `${filters.updatedTo}T23:59:59.999Z`
  if (filters.tags.length > 0) {
    params.tags = filters.tags
    if (filters.tagMatch === 'all') params.tagMatch = 'all'
  }
  if (filters.keywords.length > 0) {
    params.keywords = filters.keywords
    if (filters.keywordMatch === 'all') params.keywordMatch = 'all'
  }
  if (filters.personType.length > 0) {
    params.personType = filters.personType
    if (filters.personTypeMatch === 'all') params.personTypeMatch = 'all'
  }
  return params
}

function isPersonFilterEmpty(filters) {
  return (
    !filters.gender &&
    !filters.region.trim() &&
    !filters.placeOfBirth.trim() &&
    !filters.placeOfDeath.trim() &&
    !filters.dobFrom &&
    !filters.dobTo &&
    !filters.dodFrom &&
    !filters.dodTo &&
    !filters.createdFrom &&
    !filters.createdTo &&
    !filters.updatedFrom &&
    !filters.updatedTo &&
    filters.tags.length === 0 &&
    filters.keywords.length === 0 &&
    filters.personType.length === 0
  )
}

// Build the chip array for the FilterChips strip. One chip per
// active filter atom — clicking the × clears just that filter.
// Tone hints colour the chip by category (sort/date/text/tag/choice)
// so users can visually group active filters at a glance.
function buildPersonChips({ sortLabel, onClearSort, filters, updateFilter }) {
  const chips = []
  if (sortLabel) {
    chips.push({ key: 'sort', tone: 'sort', label: 'Sort', value: sortLabel, onRemove: onClearSort })
  }
  if (filters.gender) {
    chips.push({
      key: 'gender',
      tone: 'choice',
      label: 'Gender',
      value: filters.gender === 'MALE' ? 'Male' : 'Female',
      onRemove: () => updateFilter('gender', ''),
    })
  }
  if (filters.region.trim()) {
    chips.push({
      key: 'region',
      tone: 'text',
      label: 'Region',
      value: filters.region.trim(),
      onRemove: () => updateFilter('region', ''),
    })
  }
  if (filters.placeOfBirth.trim()) {
    chips.push({
      key: 'placeOfBirth',
      tone: 'text',
      label: 'Born in',
      value: filters.placeOfBirth.trim(),
      onRemove: () => updateFilter('placeOfBirth', ''),
    })
  }
  if (filters.placeOfDeath.trim()) {
    chips.push({
      key: 'placeOfDeath',
      tone: 'text',
      label: 'Died in',
      value: filters.placeOfDeath.trim(),
      onRemove: () => updateFilter('placeOfDeath', ''),
    })
  }
  if (filters.dobFrom || filters.dobTo) {
    chips.push({
      key: 'dob',
      tone: 'date',
      label: 'Born',
      value: `${filters.dobFrom || '…'} → ${filters.dobTo || '…'}`,
      onRemove: () => {
        updateFilter('dobFrom', '')
        updateFilter('dobTo', '')
      },
    })
  }
  if (filters.dodFrom || filters.dodTo) {
    chips.push({
      key: 'dod',
      tone: 'date',
      label: 'Died',
      value: `${filters.dodFrom || '…'} → ${filters.dodTo || '…'}`,
      onRemove: () => {
        updateFilter('dodFrom', '')
        updateFilter('dodTo', '')
      },
    })
  }
  if (filters.createdFrom || filters.createdTo) {
    chips.push({
      key: 'created',
      tone: 'date',
      label: 'Created',
      value: `${filters.createdFrom || '…'} → ${filters.createdTo || '…'}`,
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
      value: `${filters.updatedFrom || '…'} → ${filters.updatedTo || '…'}`,
      onRemove: () => {
        updateFilter('updatedFrom', '')
        updateFilter('updatedTo', '')
      },
    })
  }
  if (filters.tags.length > 0 && filters.tagMatch === 'all') {
    chips.push({
      key: 'tagMatch',
      tone: 'choice',
      label: 'Match',
      value: 'all tags',
      onRemove: () => updateFilter('tagMatch', 'any'),
    })
  }
  for (const tag of filters.tags) {
    chips.push({
      key: `tag-${tag}`,
      tone: 'tag',
      label: 'Tag',
      value: tag,
      onRemove: () => updateFilter('tags', filters.tags.filter((t) => t !== tag)),
    })
  }
  if (filters.keywords.length > 0 && filters.keywordMatch === 'all') {
    chips.push({
      key: 'keywordMatch',
      tone: 'choice',
      label: 'Match',
      value: 'all keywords',
      onRemove: () => updateFilter('keywordMatch', 'any'),
    })
  }
  for (const kw of filters.keywords) {
    chips.push({
      key: `kw-${kw}`,
      tone: 'tag',
      label: 'Keyword',
      value: kw,
      onRemove: () => updateFilter('keywords', filters.keywords.filter((k) => k !== kw)),
    })
  }
  if (filters.personType.length > 0 && filters.personTypeMatch === 'all') {
    chips.push({
      key: 'personTypeMatch',
      tone: 'choice',
      label: 'Match',
      value: 'all types',
      onRemove: () => updateFilter('personTypeMatch', 'any'),
    })
  }
  for (const t of filters.personType) {
    chips.push({
      key: `type-${t}`,
      tone: 'tag',
      label: 'Type',
      value: t,
      onRemove: () => updateFilter('personType', filters.personType.filter((x) => x !== t)),
    })
  }
  return chips
}

function createInitialForm() {
  return {
    personCode: '',
    fullName: '',
    nickname: '',
    romanizedName: '',
    gender: '',
    personType: [],
    region: '',
    dateOfBirthYear: '',
    dateOfBirthMonth: '',
    dateOfBirthDay: '',
    placeOfBirth: '',
    dateOfDeathYear: '',
    dateOfDeathMonth: '',
    dateOfDeathDay: '',
    placeOfDeath: '',
    description: '',
    tag: [],
    keywords: [],
    note: '',
    removeMediaPortrait: false,
  }
}

function toArray(value) {
  if (Array.isArray(value)) return value.filter(Boolean)
  if (!value) return []
  return String(value)
    .split(/[,،;]/)
    .map((entry) => entry.trim())
    .filter(Boolean)
}

function parseInteger(value) {
  if (value === '' || value == null) {
    return null
  }

  const parsed = Number.parseInt(value, 10)
  return Number.isNaN(parsed) ? null : parsed
}

function getDatePart(dateValue, part) {
  if (!dateValue) {
    return ''
  }

  const parsedDate = new Date(dateValue)
  if (Number.isNaN(parsedDate.getTime())) {
    return ''
  }

  if (part === 'year') {
    return parsedDate.getFullYear()
  }

  if (part === 'month') {
    return parsedDate.getMonth() + 1
  }

  return parsedDate.getDate()
}

function getLifespan(person) {
  const birthYear = person.dateOfBirthYear ?? getDatePart(person.dateOfBirth, 'year')
  const deathYear = person.dateOfDeathYear ?? getDatePart(person.dateOfDeath, 'year')

  if (!birthYear && !deathYear) {
    return '—'
  }

  if (birthYear && !deathYear) {
    return `${birthYear} -`
  }

  if (!birthYear && deathYear) {
    return `- ${deathYear}`
  }

  return `${birthYear} - ${deathYear}`
}

function FieldLabel({ htmlFor, fieldKey, children }) {
  return (
    <div className="flex items-center justify-between gap-2">
      <Label htmlFor={htmlFor} className="text-sm font-medium text-foreground">
        {children}
      </Label>
      <PersonFieldHelpButton fieldKey={fieldKey} />
    </div>
  )
}

function EmployeePersonPage() {
  const toast = useToast()

  const [persons, setPersons] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')

  const [view, setView] = useState('list') // 'list', 'create', 'edit'
  const [currentPerson, setCurrentPerson] = useState(null)

  const [form, setForm] = useState(createInitialForm)
  const [isSaving, setIsSaving] = useState(false)
  const [formError, setFormError] = useState('')

  const [mediaPortrait, setMediaPortrait] = useState(null)
  const [previewImage, setPreviewImage] = useState(null)

  const [searchTerm, setSearchTerm] = useState('')
  // Backend search results — populated by /api/person/search (across name,
  // nickname, romanized name, description, tags, keywords, region, places,
  // code, and person type) after a short debounce. `null` means "no active
  // search; fall back to full list".
  const [searchResults, setSearchResults] = useState(null)
  const [isSearching, setIsSearching] = useState(false)

  const [deleteTarget, setDeleteTarget] = useState(null)
  const [isDeleting, setIsDeleting] = useState(false)
  const [detailsTarget, setDetailsTarget] = useState(null)

  // Server-side pagination for the browse view. Search uses /person/search
  // and returns top-ranked matches, so it bypasses pagination.
  const [page, setPage] = useState(0)
  const [totalPages, setTotalPages] = useState(0)
  const [totalElements, setTotalElements] = useState(0)

  // Sort + filter state. These flow through to GET /api/person as
  // query params; backend applies them in-memory against its Redis
  // cache. Search bypasses both — /person/search has its own ranking.
  const [sortKey, setSortKey] = useState(DEFAULT_SORT_KEY)
  const [filters, setFilters] = useState(createInitialFilters)
  const [isFilterPanelOpen, setIsFilterPanelOpen] = useState(false)
  const filtersActive = !isPersonFilterEmpty(filters)
  const sortActive = sortKey !== DEFAULT_SORT_KEY
  const activeSort = useMemo(
    () => PERSON_SORT_OPTIONS.find((opt) => opt.key === sortKey) ?? PERSON_SORT_OPTIONS[0],
    [sortKey],
  )
  const filterCount = useMemo(() => {
    let n = 0
    if (filters.gender) n += 1
    if (filters.region.trim()) n += 1
    if (filters.placeOfBirth.trim()) n += 1
    if (filters.placeOfDeath.trim()) n += 1
    if (filters.dobFrom || filters.dobTo) n += 1
    if (filters.dodFrom || filters.dodTo) n += 1
    if (filters.createdFrom || filters.createdTo) n += 1
    if (filters.updatedFrom || filters.updatedTo) n += 1
    if (filters.tags.length > 0) n += 1
    if (filters.keywords.length > 0) n += 1
    if (filters.personType.length > 0) n += 1
    return n
  }, [filters])

  const trimmedSearch = searchTerm.trim()
  const isSearchActive = trimmedSearch.length > 0

  // Combined highlight query — feeds every <Highlight> in the table
  // so search hits AND text-shaped filter values (tags, keywords,
  // region, places, types) light up wherever they appear in a row.
  // Highlight tokenises on whitespace, so concatenating these into a
  // single string yields the right per-token match behaviour.
  const highlightQuery = useMemo(() => {
    const parts = []
    if (trimmedSearch) parts.push(trimmedSearch)
    if (filters.tags.length > 0) parts.push(filters.tags.join(' '))
    if (filters.keywords.length > 0) parts.push(filters.keywords.join(' '))
    if (filters.personType.length > 0) parts.push(filters.personType.join(' '))
    if (filters.region.trim()) parts.push(filters.region.trim())
    if (filters.placeOfBirth.trim()) parts.push(filters.placeOfBirth.trim())
    if (filters.placeOfDeath.trim()) parts.push(filters.placeOfDeath.trim())
    return parts.join(' ')
  }, [
    trimmedSearch,
    filters.tags,
    filters.keywords,
    filters.personType,
    filters.region,
    filters.placeOfBirth,
    filters.placeOfDeath,
  ])

  // V3 trash model: backend's GET /person returns active records only;
  // trashed records live at /person/trash and are managed from the admin
  // Trash page.
  const basePersons = useMemo(
    () => (isSearchActive ? (searchResults ?? []) : persons),
    [isSearchActive, searchResults, persons],
  )

  const visiblePersons = basePersons
  const filteredPersons = visiblePersons

  const loadPersons = useCallback(async (options = {}) => {
    const { notifyError = false } = options

    setIsLoading(true)
    setError('')

    try {
      const pageData = await getPersonsPage({
        page,
        size: PERSONS_PAGE_SIZE,
        sortBy: activeSort.sortBy,
        sortDirection: activeSort.sortDirection,
        ...buildPersonFilterParams(filters),
      })
      setPersons(pageData?.content || [])
      setTotalPages(pageData?.totalPages || 0)
      setTotalElements(pageData?.totalElements || 0)
    } catch (err) {
      setError(getErrorMessage(err, 'Failed to load persons'))

      if (notifyError) {
        toast.apiError(err, 'Could not refresh persons')
      }
    } finally {
      setIsLoading(false)
    }
  }, [page, toast, activeSort, filters])

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadPersons()
  }, [loadPersons])

  // Sort/filter changes invalidate the current page index — bounce
  // back to page 0 so the user isn't stranded on a page that no
  // longer exists in the new result set.
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setPage(0)
  }, [sortKey, filters])

  const clearFilters = () => setFilters(createInitialFilters())
  const updateFilter = (key, value) =>
    setFilters((prev) => ({ ...prev, [key]: value }))

  // Debounced backend search across name, nickname, romanized name, description,
  // tags, keywords, region, places, code, and person type. Cancels in-flight
  // requests when the user keeps typing or clears the box. Errors are silent
  // — we just show no results rather than spamming a toast on every keystroke.
  useEffect(() => {
    if (!trimmedSearch) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setSearchResults(null)
      setIsSearching(false)
      return undefined
    }

    const controller = new AbortController()
    const timer = setTimeout(async () => {
      setIsSearching(true)
      try {
        const data = await searchPersons(trimmedSearch, {
          limit: 50,
          signal: controller.signal,
        })
        if (!controller.signal.aborted) setSearchResults(data || [])
      } catch {
        if (!controller.signal.aborted) setSearchResults([])
      } finally {
        if (!controller.signal.aborted) setIsSearching(false)
      }
    }, 220)

    return () => {
      clearTimeout(timer)
      controller.abort()
    }
  }, [trimmedSearch])

  useEffect(() => {
    return () => {
      if (previewImage && previewImage.startsWith('blob:')) {
        URL.revokeObjectURL(previewImage)
      }
    }
  }, [previewImage])

  const handleOpenCreate = () => {
    setForm(createInitialForm())
    setMediaPortrait(null)
    setPreviewImage(null)
    setFormError('')
    setCurrentPerson(null)
    setView('create')
  }

  const handleOpenEdit = (person) => {
    setCurrentPerson(person)
    setForm({
      personCode: person.personCode || '',
      fullName: person.fullName || '',
      nickname: person.nickname || '',
      romanizedName: person.romanizedName || '',
      gender: person.gender || '',
      personType: toArray(person.personType),
      region: person.region || '',
      dateOfBirthYear: person.dateOfBirthYear ?? getDatePart(person.dateOfBirth, 'year'),
      dateOfBirthMonth: person.dateOfBirthMonth ?? getDatePart(person.dateOfBirth, 'month'),
      dateOfBirthDay: person.dateOfBirthDay ?? getDatePart(person.dateOfBirth, 'day'),
      placeOfBirth: person.placeOfBirth || '',
      dateOfDeathYear: person.dateOfDeathYear ?? getDatePart(person.dateOfDeath, 'year'),
      dateOfDeathMonth: person.dateOfDeathMonth ?? getDatePart(person.dateOfDeath, 'month'),
      dateOfDeathDay: person.dateOfDeathDay ?? getDatePart(person.dateOfDeath, 'day'),
      placeOfDeath: person.placeOfDeath || '',
      description: person.description || '',
      tag: toArray(person.tag),
      keywords: toArray(person.keywords),
      note: person.note || '',
      removeMediaPortrait: false,
    })
    setMediaPortrait(null)
    setPreviewImage(person.mediaPortrait || null)
    setFormError('')
    setView('edit')
  }

  const handleCloseForm = () => {
    setView('list')
    setCurrentPerson(null)
    setMediaPortrait(null)
    setPreviewImage(null)
    setFormError('')
  }

  const handleFileChange = (event) => {
    const file = event.target.files?.[0]
    if (!file) {
      return
    }

    if (previewImage && previewImage.startsWith('blob:')) {
      URL.revokeObjectURL(previewImage)
    }

    setMediaPortrait(file)
    setPreviewImage(URL.createObjectURL(file))
    setForm((currentForm) => ({ ...currentForm, removeMediaPortrait: false }))
  }

  const removeSelectedImage = () => {
    if (previewImage && previewImage.startsWith('blob:')) {
      URL.revokeObjectURL(previewImage)
    }

    setMediaPortrait(null)
    setPreviewImage(null)

    if (view === 'edit') {
      setForm((currentForm) => ({ ...currentForm, removeMediaPortrait: true }))
    }
  }

  const handleSubmit = async (event) => {
    event.preventDefault()
    setFormError('')
    setIsSaving(true)

    const normalizedPersonCode = form.personCode.trim()

    if (view === 'create' && !normalizedPersonCode) {
      const message = 'Person code is required.'
      setFormError(message)
      toast.error('Unable to save person', message)
      setIsSaving(false)
      return
    }


    try {
      const payload = {
        fullName: form.fullName,
        nickname: form.nickname,
        romanizedName: form.romanizedName,
        gender: form.gender || null,
        personType: toArray(form.personType),
        region: form.region,
        dateOfBirthYear: parseInteger(form.dateOfBirthYear),
        dateOfBirthMonth: parseInteger(form.dateOfBirthMonth),
        dateOfBirthDay: parseInteger(form.dateOfBirthDay),
        placeOfBirth: form.placeOfBirth,
        dateOfDeathYear: parseInteger(form.dateOfDeathYear),
        dateOfDeathMonth: parseInteger(form.dateOfDeathMonth),
        dateOfDeathDay: parseInteger(form.dateOfDeathDay),
        placeOfDeath: form.placeOfDeath,
        description: form.description,
        tag: toArray(form.tag),
        keywords: toArray(form.keywords),
        note: form.note,
        ...(view === 'edit' && form.removeMediaPortrait ? { removeMediaPortrait: true } : {}),
      }

      if (view === 'create') {
        payload.personCode = normalizedPersonCode
        await createPerson(payload, mediaPortrait)
        toast.success('Person created', `${form.fullName} was added to records.`)
      } else if (view === 'edit') {
        await updatePerson(currentPerson.personCode, payload, mediaPortrait)
        toast.success('Person updated', `${form.fullName} changes were saved.`)
      }

      await loadPersons()
      handleCloseForm()
    } catch (err) {
      // Optimistic-locking conflict — bounce back to list so the user
      // can re-open the row and see the latest values.
      if (isStaleVersionError(err)) {
        toast.apiError(err, 'Reload required')
        await loadPersons()
        handleCloseForm()
        return
      }
      setFormError(formatApiError(err, 'Failed to save person record'))
      toast.apiError(err, 'Unable to save person')
    } finally {
      setIsSaving(false)
    }
  }

  const handleOpenDetails = (person) => {
    setDetailsTarget({
      ...person,
      personCode: person.personCode || '',
    })
  }

  // Soft-trash with project cascade (V3). Backend trashes the person AND
  // every project they own (each project itself cascades to its media).
  // The response tells us how many projects were trashed and their codes
  // — surfacing that in the toast so the user sees exactly what happened
  // instead of being surprised when projects vanish from their list.
  const handleDeleteConfirm = async () => {
    if (!deleteTarget) return
    setIsDeleting(true)
    try {
      const result = await deletePerson(deleteTarget.personCode)
      const trashedCount = result?.trashedProjectsCount ?? 0
      const trashedCodes = Array.isArray(result?.trashedProjectCodes)
        ? result.trashedProjectCodes
        : []

      let detail
      if (trashedCount === 0) {
        detail = `${deleteTarget.fullName} can be restored by an admin from Trash.`
      } else {
        // Show up to three project codes inline; collapse the rest into
        // a "+N more" tail so a person with many projects doesn't make
        // the toast unreadable.
        const visible = trashedCodes.slice(0, 3).join(', ')
        const extra = trashedCodes.length - 3
        const codesPart = visible
          ? ` ${visible}${extra > 0 ? ` +${extra} more` : ''}`
          : ''
        detail =
          `${deleteTarget.fullName} and ${trashedCount} project${trashedCount === 1 ? '' : 's'}` +
          ` were sent to trash:${codesPart}. An admin can restore from Trash.`
      }
      toast.success('Sent to trash', detail)
      setDeleteTarget(null)
      await loadPersons()
    } catch (err) {
      setError(getErrorMessage(err, 'Failed to send person to trash'))
      toast.apiError(err, 'Unable to send person to trash')
    } finally {
      setIsDeleting(false)
    }
  }

  if (view === 'create' || view === 'edit') {
    return (
      <EmployeeEntityPage
        eyebrow={view === 'create' ? 'New record' : 'Editing'}
        title={view === 'create' ? 'Add New Person' : 'Edit Person Record'}
        description="Provide comprehensive details about the person below."
      >
        <form id="person-form" onSubmit={handleSubmit} className="mx-auto block w-full">
          <div className="grid gap-6 xl:grid-cols-[1fr_360px]">
            <div className="space-y-6">

              {/* ── Identity Information ── */}
              <Card className="border-border bg-card shadow-sm shadow-black/5">
                <CardHeader className="border-b border-border pb-4">
                  <CardTitle className="text-base font-semibold">Identity Information</CardTitle>
                  <CardDescription className="text-xs">Primary metadata for this archive person.</CardDescription>
                </CardHeader>
                <CardContent className="grid gap-5 pt-5 sm:grid-cols-2">

                  {view === 'create' ? (
                    <div className="space-y-2 sm:col-span-2">
                      <FieldLabel htmlFor="personCode" fieldKey="personCode">
                        Person Code <span className="text-destructive">*</span>
                      </FieldLabel>
                      <Input
                        id="personCode"
                        value={form.personCode}
                        onChange={(event) =>
                          setForm({
                            ...form,
                            personCode: event.target.value.toUpperCase(),
                          })
                        }
                        required
                        placeholder="e.g. HZI"
                        className="font-mono tracking-wide"
                      />
                      <p className="text-xs text-muted-foreground">
                        Unique identifier. Cannot be changed after creation.
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-2 sm:col-span-2">
                      <FieldLabel htmlFor="personCodeReadonly" fieldKey="personCode">
                        Person Code
                      </FieldLabel>
                      <Input
                        id="personCodeReadonly"
                        value={form.personCode}
                        disabled
                        className="font-mono tracking-wide"
                      />
                    </div>
                  )}

                  <div className="space-y-2 sm:col-span-2">
                    <FieldLabel htmlFor="fullName" fieldKey="fullName">
                      Full Name <span className="text-destructive">*</span>
                    </FieldLabel>
                    <Input
                      id="fullName"
                      value={form.fullName}
                      onChange={(event) => setForm({ ...form, fullName: event.target.value })}
                      required
                      placeholder="e.g. Hesen Zirek"
                      className="text-base font-medium"
                    />
                  </div>

                  <div className="space-y-2">
                    <FieldLabel htmlFor="nickname" fieldKey="nickname">Nickname</FieldLabel>
                    <Input
                      id="nickname"
                      value={form.nickname}
                      onChange={(event) => setForm({ ...form, nickname: event.target.value })}
                      placeholder="Known as…"
                    />
                  </div>

                  <div className="space-y-2">
                    <FieldLabel htmlFor="romanizedName" fieldKey="romanizedName">Romanized Name</FieldLabel>
                    <Input
                      id="romanizedName"
                      value={form.romanizedName}
                      onChange={(event) => setForm({ ...form, romanizedName: event.target.value })}
                      placeholder="Latin script"
                    />
                  </div>

                  <div className="space-y-2">
                    <FieldLabel htmlFor="gender" fieldKey="gender">Gender (MALE / FEMALE / UNKNOWN)</FieldLabel>
                    <Input
                      id="gender"
                      value={form.gender}
                      onChange={(event) => setForm({ ...form, gender: event.target.value })}
                      placeholder="MALE"
                    />
                  </div>

                  <div className="space-y-2">
                    <FieldLabel htmlFor="region" fieldKey="region">Region</FieldLabel>
                    <Input
                      id="region"
                      value={form.region}
                      onChange={(event) => setForm({ ...form, region: event.target.value })}
                      placeholder="e.g. Kurdistan"
                    />
                  </div>

                  <div className="space-y-2 sm:col-span-2">
                    <FieldLabel htmlFor="personType" fieldKey="personType">
                      Roles / Types{' '}
                      <span className="font-normal text-muted-foreground">(press Enter to add)</span>
                    </FieldLabel>
                    <TagsInput
                      id="personType"
                      value={form.personType}
                      onChange={(next) => setForm({ ...form, personType: next })}
                      placeholder="Singer, Poet, Artist…"
                    />
                  </div>
                </CardContent>
              </Card>

              {/* ── Life Events ── */}
              <Card className="border-border bg-card shadow-sm shadow-black/5">
                <CardHeader className="border-b border-border pb-4">
                  <CardTitle className="text-base font-semibold">Life Events</CardTitle>
                  <CardDescription className="text-xs">
                    Birth and death details — partial dates are fully supported.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-5 pt-5">

                  {/* Birth */}
                  <div className="space-y-4 rounded-lg border border-border/60 bg-muted/20 p-4">
                    <p className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">
                      Birth
                    </p>
                    <div className="space-y-2">
                      <FieldLabel htmlFor="placeOfBirth" fieldKey="placeOfBirth">Place of Birth</FieldLabel>
                      <Input
                        id="placeOfBirth"
                        value={form.placeOfBirth}
                        onChange={(event) => setForm({ ...form, placeOfBirth: event.target.value })}
                        placeholder="City, Country"
                      />
                    </div>
                    <div className="grid grid-cols-3 gap-3">
                      <div className="space-y-2">
                        <FieldLabel htmlFor="dateOfBirthYear" fieldKey="dateOfBirthYear">Year</FieldLabel>
                        <Input
                          id="dateOfBirthYear"
                          type="number"
                          placeholder="YYYY"
                          value={form.dateOfBirthYear}
                          onChange={(event) => setForm({ ...form, dateOfBirthYear: event.target.value })}
                        />
                      </div>
                      <div className="space-y-2">
                        <FieldLabel htmlFor="dateOfBirthMonth" fieldKey="dateOfBirthMonth">Month</FieldLabel>
                        <Input
                          id="dateOfBirthMonth"
                          type="number"
                          placeholder="MM"
                          min="1"
                          max="12"
                          value={form.dateOfBirthMonth}
                          onChange={(event) => setForm({ ...form, dateOfBirthMonth: event.target.value })}
                        />
                      </div>
                      <div className="space-y-2">
                        <FieldLabel htmlFor="dateOfBirthDay" fieldKey="dateOfBirthDay">Day</FieldLabel>
                        <Input
                          id="dateOfBirthDay"
                          type="number"
                          placeholder="DD"
                          min="1"
                          max="31"
                          value={form.dateOfBirthDay}
                          onChange={(event) => setForm({ ...form, dateOfBirthDay: event.target.value })}
                        />
                      </div>
                    </div>
                  </div>

                  {/* Death */}
                  <div className="space-y-4 rounded-lg border border-border/60 bg-muted/20 p-4">
                    <p className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">
                      Death
                    </p>
                    <div className="space-y-2">
                      <FieldLabel htmlFor="placeOfDeath" fieldKey="placeOfDeath">Place of Death</FieldLabel>
                      <Input
                        id="placeOfDeath"
                        value={form.placeOfDeath}
                        onChange={(event) => setForm({ ...form, placeOfDeath: event.target.value })}
                        placeholder="City, Country"
                      />
                    </div>
                    <div className="grid grid-cols-3 gap-3">
                      <div className="space-y-2">
                        <FieldLabel htmlFor="dateOfDeathYear" fieldKey="dateOfDeathYear">Year</FieldLabel>
                        <Input
                          id="dateOfDeathYear"
                          type="number"
                          placeholder="YYYY"
                          value={form.dateOfDeathYear}
                          onChange={(event) => setForm({ ...form, dateOfDeathYear: event.target.value })}
                        />
                      </div>
                      <div className="space-y-2">
                        <FieldLabel htmlFor="dateOfDeathMonth" fieldKey="dateOfDeathMonth">Month</FieldLabel>
                        <Input
                          id="dateOfDeathMonth"
                          type="number"
                          placeholder="MM"
                          min="1"
                          max="12"
                          value={form.dateOfDeathMonth}
                          onChange={(event) => setForm({ ...form, dateOfDeathMonth: event.target.value })}
                        />
                      </div>
                      <div className="space-y-2">
                        <FieldLabel htmlFor="dateOfDeathDay" fieldKey="dateOfDeathDay">Day</FieldLabel>
                        <Input
                          id="dateOfDeathDay"
                          type="number"
                          placeholder="DD"
                          min="1"
                          max="31"
                          value={form.dateOfDeathDay}
                          onChange={(event) => setForm({ ...form, dateOfDeathDay: event.target.value })}
                        />
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* ── Classification & Notes ── */}
              <Card className="border-border bg-card shadow-sm shadow-black/5">
                <CardHeader className="border-b border-border pb-4">
                  <CardTitle className="text-base font-semibold">Classification & Notes</CardTitle>
                  <CardDescription className="text-xs">Discovery tags and internal notes for researchers.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-5 pt-5">

                  <div className="space-y-2">
                    <FieldLabel htmlFor="description" fieldKey="description">Description / Biography</FieldLabel>
                    <textarea
                      id="description"
                      className="min-h-[120px] w-full resize-y rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                      value={form.description}
                      onChange={(event) => setForm({ ...form, description: event.target.value })}
                      placeholder="Write a short biography or notable facts…"
                    />
                  </div>

                  <div className="grid gap-5 sm:grid-cols-2">
                    <div className="space-y-2">
                      <FieldLabel htmlFor="tag" fieldKey="tag">
                        Tags{' '}
                        <span className="font-normal text-muted-foreground">(press Enter to add)</span>
                      </FieldLabel>
                      <TagsInput
                        id="tag"
                        value={form.tag}
                        onChange={(next) => setForm({ ...form, tag: next })}
                        placeholder="poet, revolutionary…"
                      />
                    </div>

                    <div className="space-y-2">
                      <FieldLabel htmlFor="keywords" fieldKey="keywords">
                        Keywords{' '}
                        <span className="font-normal text-muted-foreground">(press Enter to add)</span>
                      </FieldLabel>
                      <TagsInput
                        id="keywords"
                        value={form.keywords}
                        onChange={(next) => setForm({ ...form, keywords: next })}
                        placeholder="music, folklore…"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <FieldLabel htmlFor="note" fieldKey="note">Internal Notes</FieldLabel>
                    <Input
                      id="note"
                      value={form.note}
                      onChange={(event) => setForm({ ...form, note: event.target.value })}
                      placeholder="Private notes for archive staff…"
                    />
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* ── Sticky Sidebar ── */}
            <div className="space-y-5">
              <div className="sticky top-[5rem] space-y-5">

                <Card className="border-border bg-card shadow-sm shadow-black/5">
                  <CardHeader className="border-b border-border pb-4">
                    <CardTitle className="text-base font-semibold">Portrait Image</CardTitle>
                    <CardDescription className="text-xs">Attach or replace the person portrait.</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4 pt-5">

                    {/* Preview */}
                    {previewImage ? (
                      <div className="group relative aspect-[3/4] w-full overflow-hidden rounded-xl border-2 border-border shadow-sm">
                        <img
                          src={previewImage}
                          alt="Portrait preview"
                          className="size-full object-cover object-top transition-transform duration-300 group-hover:scale-[1.02]"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/30 via-transparent to-transparent opacity-0 transition-opacity group-hover:opacity-100" />
                        <Button
                          type="button"
                          variant="destructive"
                          size="icon"
                          className="absolute right-2 top-2 size-7 rounded-full opacity-0 shadow-md transition-opacity group-hover:opacity-100"
                          onClick={removeSelectedImage}
                        >
                          <X className="size-3.5" />
                          <span className="sr-only">Remove portrait</span>
                        </Button>
                      </div>
                    ) : (
                      /* Styled drop-zone label — hides native file input text entirely */
                      <label
                        htmlFor="portraitFile"
                        className="flex aspect-[3/4] w-full cursor-pointer flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed border-border bg-muted/20 text-center transition-colors hover:border-primary/50 hover:bg-muted/40"
                      >
                        <div className="flex size-12 items-center justify-center rounded-full bg-muted text-muted-foreground transition-colors group-hover:bg-primary/10 group-hover:text-primary">
                          <Camera className="size-5" />
                        </div>
                        <div>
                          <p className="text-sm font-medium text-foreground">Upload Image</p>
                          <p className="mt-0.5 text-xs text-muted-foreground">Click to browse files</p>
                        </div>
                      </label>
                    )}

                    {/* Hidden native input — avoids browser-locale text rendering */}
                    <input
                      id="portraitFile"
                      type="file"
                      accept="image/*"
                      onChange={handleFileChange}
                      className="sr-only"
                    />

                    {/* Show "Change Image" button only when a preview exists */}
                    {previewImage && (
                      <Label
                        htmlFor="portraitFile"
                        className="flex w-full cursor-pointer items-center justify-center gap-2 rounded-md border border-input bg-background px-3 py-2 text-sm font-medium shadow-sm transition-colors hover:bg-accent hover:text-accent-foreground"
                      >
                        <Camera className="size-4 shrink-0" />
                        Change Image
                      </Label>
                    )}

                    <FormErrorBox error={formError} />
                  </CardContent>
                  <CardFooter className="flex flex-col gap-2.5 border-t border-border pt-4">
                    <Button type="submit" className="w-full gap-2" disabled={isSaving}>
                      {isSaving ? <Loader2 className="size-4 animate-spin" /> : null}
                      {isSaving ? 'Saving…' : 'Save Record'}
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      className="w-full"
                      onClick={handleCloseForm}
                      disabled={isSaving}
                    >
                      Cancel
                    </Button>
                  </CardFooter>
                </Card>

              </div>
            </div>
          </div>
        </form>
      </EmployeeEntityPage>
    )
  }

  /* ── List view ── */

  return (
    <EmployeeEntityPage
      eyebrow="Directory"
      title="Persons"
      badge={!isLoading && !error
        ? `${(isSearchActive ? visiblePersons.length : totalElements).toLocaleString()} total`
        : null}
      description="Manage all person records with clear, searchable metadata and fast actions."
      action={
        <Button onClick={handleOpenCreate} className="gap-2 shrink-0">
          <Plus className="size-4" />
          Add Person
        </Button>
      }
    >
      <EntityToolbar
        filteredCount={filteredPersons.length}
        totalCount={isSearchActive ? visiblePersons.length : totalElements}
        searchValue={searchTerm}
        onSearchChange={setSearchTerm}
        searchPlaceholder="Search across name, nickname, description, code, region, places, type, tags, or keywords…"
        searchWidthClassName="sm:w-96"
        onRefresh={() => loadPersons({ notifyError: true })}
        isRefreshing={isLoading || isSearching}
        trailing={
          // Sort + filter live in the trailing slot. Both are
          // disabled while a text search is active because
          // /person/search bypasses them server-side.
          <div className="flex flex-wrap items-center gap-2">
            <SortSelect
              value={sortKey}
              onChange={setSortKey}
              options={PERSON_SORT_OPTIONS}
              ascIcon={ArrowUpAZ}
              descIcon={ArrowDownAZ}
              disabled={isSearchActive}
              title="Sort persons"
              width="sm:w-[15rem]"
            />
            <FilterTriggerButton
              active={filtersActive}
              count={filterCount}
              open={isFilterPanelOpen}
              onClick={() => setIsFilterPanelOpen((v) => !v)}
              disabled={isSearchActive}
              disabledReason="Clear search to use filters"
            />
          </div>
        }
      />

      {!isSearchActive ? (
        <PersonFilterPanel
          open={isFilterPanelOpen}
          filters={filters}
          onChange={updateFilter}
          onClear={clearFilters}
          onClose={() => setIsFilterPanelOpen(false)}
          isAnyActive={filtersActive}
          activeCount={filterCount}
        />
      ) : null}

      <FilterChips
        chips={buildPersonChips({
          sortLabel: sortActive ? activeSort.label : null,
          onClearSort: () => setSortKey(DEFAULT_SORT_KEY),
          filters,
          updateFilter,
        })}
        onClearAll={
          filtersActive || sortActive
            ? () => {
                clearFilters()
                setSortKey(DEFAULT_SORT_KEY)
              }
            : null
        }
      />

      {/* States */}
      {isLoading ? (
        <Card className="border-border bg-card shadow-sm shadow-black/5">
          <div className="divide-y divide-border">
            {[1, 2, 3, 4, 5].map((index) => (
              <div key={index} className="flex items-center gap-4 px-4 py-3">
                <Skeleton className="h-14 w-11 shrink-0 rounded-lg" />
                <Skeleton className="h-6 w-28 rounded-md" />
                <Skeleton className="h-4 w-36" />
                <Skeleton className="h-4 w-28" />
                <Skeleton className="h-4 w-20" />
                <Skeleton className="ml-auto h-4 w-24" />
              </div>
            ))}
          </div>
        </Card>
      ) : error ? (
        <Card className="border-border bg-card shadow-sm shadow-black/5">
          <CardContent className="flex flex-col items-start gap-4 px-6 py-8">
            <p className="text-sm text-destructive">{error}</p>
            <Button
              type="button"
              variant="outline"
              className="gap-2"
              onClick={() => loadPersons({ notifyError: true })}
            >
              <RefreshCw className="size-4" />
              Retry
            </Button>
          </CardContent>
        </Card>
      ) : persons.length === 0 ? (
        <EmptyState
          icon={Users}
          title="No persons registered"
          description="Add a new prominent figure or contributor to begin building the person records."
          action={
            <Button onClick={handleOpenCreate} className="gap-2">
              <Plus className="size-4" />
              Create Record
            </Button>
          }
        />
      ) : (
        <div className="overflow-hidden rounded-xl border border-border bg-card shadow-sm shadow-black/5">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/40 hover:bg-muted/40">
                <TableHead className="w-[52px] text-center">#</TableHead>
                <TableHead className="w-[68px]"></TableHead>
                <TableHead className="w-[160px]">Code</TableHead>
                <TableHead className="w-[220px]">Full Name</TableHead>
                <TableHead className="w-[220px]">Type</TableHead>
                <TableHead className="w-[180px]">Region</TableHead>
                <TableHead className="w-[140px]">Lifespan</TableHead>
                <TableHead className="w-[360px]">Description</TableHead>
                <TableHead className="w-[220px] text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredPersons.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={9} className="h-24 text-center text-muted-foreground">
                    {isSearching ? (
                      <span className="inline-flex items-center gap-2">
                        <Loader2 className="size-3.5 animate-spin" />
                        Searching for &ldquo;{trimmedSearch}&rdquo;…
                      </span>
                    ) : isSearchActive ? (
                      <>No matches for &ldquo;{trimmedSearch}&rdquo; in name, nickname, description, code, region, places, type, tags, or keywords.</>
                    ) : (
                      <>No people to show.</>
                    )}
                  </TableCell>
                </TableRow>
              ) : (
                filteredPersons.map((person, index) => {
                  const typeLabel = Array.isArray(person.personType)
                    ? person.personType.join(', ')
                    : person.personType || person.gender || '—'

                  return (
                    <TableRow
                      key={person.personCode}
                      className={`group transition-colors ${person.removedAt ? 'opacity-60' : ''}`}
                    >
                      <TableCell className="text-center text-xs tabular-nums text-muted-foreground">
                        {/* Absolute index across all pages. Search mode
                            shows in-list rank since there's no global
                            position for ranked results. */}
                        {(isSearchActive ? 0 : page * PERSONS_PAGE_SIZE) + index + 1}
                      </TableCell>
                      <TableCell>
                        <button
                          type="button"
                          onClick={() => handleOpenDetails(person)}
                          className="block overflow-hidden rounded-lg ring-1 ring-border shadow-sm transition-all hover:ring-2 hover:ring-primary/50 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                          aria-label={`View ${person.fullName}`}
                        >
                          <PersonPortrait
                            src={person.mediaPortrait}
                            name={person.fullName}
                            rounded="rounded-lg"
                            className="h-14 w-11 text-lg"
                          />
                        </button>
                      </TableCell>
                      <TableCell>
                        <CodeBadge code={person.personCode} variant="subtle" highlightQuery={highlightQuery} />
                      </TableCell>
                      <TableCell>
                        <div className="font-semibold leading-tight text-foreground">
                          <Highlight text={person.fullName || ''} query={highlightQuery} />
                        </div>
                        {person.nickname && (
                          <div className="mt-0.5 text-xs text-muted-foreground">
                            <Highlight text={person.nickname} query={highlightQuery} />
                          </div>
                        )}
                        {person.removedAt && (
                          <span className="mt-1 inline-flex items-center rounded-full border border-amber-500/30 bg-amber-500/10 px-2 py-0.5 text-[10px] font-medium text-amber-700 dark:text-amber-300">
                            Removed
                          </span>
                        )}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        <Highlight text={String(typeLabel)} query={highlightQuery} />
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {person.region ? <Highlight text={person.region} query={highlightQuery} /> : '—'}
                      </TableCell>
                      <TableCell className="tabular-nums text-sm text-muted-foreground">
                        {getLifespan(person)}
                      </TableCell>
                      <TableCell className="max-w-[360px]">
                        <p
                          className="truncate text-sm text-muted-foreground"
                          title={person.description || '—'}
                        >
                          {person.description ? (
                            <Highlight text={person.description} query={highlightQuery} />
                          ) : (
                            '—'
                          )}
                        </p>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            className="h-7 gap-1 px-2 text-xs"
                            onClick={() => handleOpenDetails(person)}
                          >
                            <Eye className="size-3.5" />
                            Details
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon-xs"
                            className="text-muted-foreground hover:text-foreground"
                            onClick={() => handleOpenEdit(person)}
                            title="Edit"
                          >
                            <Pencil className="size-3.5" />
                            <span className="sr-only">Edit</span>
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon-xs"
                            className="text-destructive/70 hover:bg-destructive/10 hover:text-destructive"
                            onClick={() => setDeleteTarget(person)}
                            title="Send to trash"
                          >
                            <Trash2 className="size-3.5" />
                            <span className="sr-only">Send to trash</span>
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  )
                })
              )}
            </TableBody>
          </Table>
        </div>
      )}

      {/* Server-side pagination — hidden during search; the search endpoint
          returns the top ranked matches, no pagination needed. */}
      {!isSearchActive && totalPages > 1 && (
        <DataPagination
          page={page}
          totalPages={totalPages}
          totalElements={totalElements}
          pageSize={PERSONS_PAGE_SIZE}
          onPageChange={setPage}
          className="mt-4"
        />
      )}

      <TypedConfirmDialog
        open={Boolean(deleteTarget)}
        title="Send person to trash"
        description={
          deleteTarget
            ? `"${deleteTarget.fullName}" will be moved to trash. CASCADE: every project linked to this person will also be sent to trash, along with each project's audio, video, image and text records. Categories and other people are not affected. An admin can restore from the Trash page.`
            : ''
        }
        codeToConfirm={deleteTarget?.personCode}
        promptLabel="To confirm, type the person code"
        confirmLabel="Send to Trash"
        cancelLabel="Cancel"
        confirmVariant="destructive"
        isProcessing={isDeleting}
        onConfirm={handleDeleteConfirm}
        onOpenChange={(nextOpen) => {
          if (!nextOpen) setDeleteTarget(null)
        }}
      />

      <PersonDetailsModal
        open={Boolean(detailsTarget)}
        person={detailsTarget}
        onOpenChange={(nextOpen) => {
          if (!nextOpen) {
            setDetailsTarget(null)
          }
        }}
      />
    </EmployeeEntityPage>
  )
}

// Inline expandable panel: every filter the backend supports for
// `GET /api/person`, grouped so the panel reads top-down (Identity →
// Locations → Lifespan → Activity → Discovery). Composed from the
// shared FilterPanel scaffolding so it matches every other list
// page's filter layout.
function PersonFilterPanel({
  open,
  filters,
  onChange,
  onClear,
  onClose,
  isAnyActive,
  activeCount,
}) {
  return (
    <FilterPanel
      open={open}
      title="Filter persons"
      description="Narrow the list by identity, place, life dates, activity, or discovery tags."
      count={activeCount}
      onClear={isAnyActive ? onClear : null}
      onClose={onClose}
    >
      {/* Identity */}
      <FilterSection icon={IdCard} label="Identity" columns={2}>
        <FilterField label="Gender">
          <SegmentedControl
            value={filters.gender}
            onChange={(value) => onChange('gender', value)}
            ariaLabel="Gender filter"
            fullWidth
            options={[
              { value: '', label: 'Any' },
              { value: 'MALE', label: 'Male' },
              { value: 'FEMALE', label: 'Female' },
            ]}
          />
        </FilterField>
        <FilterField label="Region" htmlFor="filter-region">
          <TextFilter
            id="filter-region"
            value={filters.region}
            onCommit={(value) => onChange('region', value)}
            placeholder="e.g. Kurdistan"
          />
        </FilterField>
      </FilterSection>

      {/* Locations */}
      <FilterSection icon={MapPin} label="Locations" columns={2}>
        <FilterField label="Place of birth" htmlFor="filter-pob">
          <TextFilter
            id="filter-pob"
            value={filters.placeOfBirth}
            onCommit={(value) => onChange('placeOfBirth', value)}
            placeholder="e.g. Sulaimani"
          />
        </FilterField>
        <FilterField label="Place of death" htmlFor="filter-pod">
          <TextFilter
            id="filter-pod"
            value={filters.placeOfDeath}
            onCommit={(value) => onChange('placeOfDeath', value)}
            placeholder="e.g. Erbil"
          />
        </FilterField>
      </FilterSection>

      {/* Lifespan */}
      <FilterSection icon={Heart} label="Lifespan" columns={2}>
        <DateRangeField
          label="Date of birth"
          from={filters.dobFrom}
          to={filters.dobTo}
          onFromChange={(v) => onChange('dobFrom', v)}
          onToChange={(v) => onChange('dobTo', v)}
        />
        <DateRangeField
          label="Date of death"
          from={filters.dodFrom}
          to={filters.dodTo}
          onFromChange={(v) => onChange('dodFrom', v)}
          onToChange={(v) => onChange('dodTo', v)}
        />
      </FilterSection>

      {/* Activity (audit dates) */}
      <FilterSection icon={CalendarClock} label="Activity" columns={2}>
        <DateRangeField
          label="Created"
          from={filters.createdFrom}
          to={filters.createdTo}
          onFromChange={(v) => onChange('createdFrom', v)}
          onToChange={(v) => onChange('createdTo', v)}
        />
        <DateRangeField
          label="Last updated"
          from={filters.updatedFrom}
          to={filters.updatedTo}
          onFromChange={(v) => onChange('updatedFrom', v)}
          onToChange={(v) => onChange('updatedTo', v)}
        />
      </FilterSection>

      {/* Discovery — multi-value tag filters */}
      <FilterSection icon={Tag} label="Discovery" columns={1}>
        <MultiValueFilter
          label="Tags"
          placeholder="Type a tag and press Enter…"
          values={filters.tags}
          matchMode={filters.tagMatch}
          onValuesChange={(next) => onChange('tags', next)}
          onMatchChange={(next) => onChange('tagMatch', next)}
          helpText={
            <>
              <span className="font-mono">any</span> matches persons with at least one of the tags;{' '}
              <span className="font-mono">all</span> requires every tag.
            </>
          }
        />
        <MultiValueFilter
          label="Keywords"
          placeholder="Type a keyword and press Enter…"
          values={filters.keywords}
          matchMode={filters.keywordMatch}
          onValuesChange={(next) => onChange('keywords', next)}
          onMatchChange={(next) => onChange('keywordMatch', next)}
          helpText={
            <>
              Searches the person's keywords list. Use{' '}
              <span className="font-mono">all</span> to require every keyword to be present.
            </>
          }
        />
        <MultiValueFilter
          label="Person type"
          placeholder="e.g. poet, writer…"
          values={filters.personType}
          matchMode={filters.personTypeMatch}
          onValuesChange={(next) => onChange('personType', next)}
          onMatchChange={(next) => onChange('personTypeMatch', next)}
          helpText={
            <>
              A person can carry several types (e.g. poet + writer). Use{' '}
              <span className="font-mono">all</span> to require every type.
            </>
          }
        />
      </FilterSection>
    </FilterPanel>
  )
}

export { EmployeePersonPage }
