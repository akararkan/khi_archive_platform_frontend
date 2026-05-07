import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  ArrowDownAZ,
  ArrowUpAZ,
  CalendarClock,
  Loader2,
  Pencil,
  Plus,
  RefreshCw,
  Tag,
  Tags,
  Trash2,
} from 'lucide-react'

import { EmployeeEntityPage } from '@/components/employee/EmployeeEntityPage'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { CodeBadge } from '@/components/ui/code-badge'
import { Highlight } from '@/components/ui/highlight'
import { DataPagination } from '@/components/ui/pagination'
import { TypedConfirmDialog } from '@/components/ui/typed-confirm-dialog'
import { EmptyState } from '@/components/ui/empty-state'
import { EntityToolbar } from '@/components/ui/entity-toolbar'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  DateRangeField,
  FilterChips,
  FilterPanel,
  FilterSection,
  FilterTriggerButton,
  MultiValueFilter,
  SortSelect,
} from '@/components/ui/list-filters'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { TagsInput } from '@/components/ui/tags-input'
import { useToast } from '@/hooks/use-toast'
import { FormErrorBox } from '@/components/ui/form-error'
import { formatApiError, getErrorMessage, isStaleVersionError } from '@/lib/get-error-message'
import {
  createCategory,
  deleteCategory,
  getCategoriesPage,
  searchCategories,
  updateCategory,
} from '@/services/category'

const CATEGORIES_PAGE_SIZE = 100

// Sort options exposed to the user. The labels are user-facing; the
// `sortBy` / `sortDirection` values match what the backend's
// CategoryFilterParams expects (it accepts `name`, `createdAt`,
// `updatedAt` plus a few synonyms). Default is name-asc, which is
// what the cached list returned before this toolbar existed — so
// adding the dropdown doesn't change the default ordering.
const CATEGORY_SORT_OPTIONS = [
  { key: 'name-asc',        label: 'Name (A → Z)',     sortBy: 'name',      sortDirection: 'asc'  },
  { key: 'name-desc',       label: 'Name (Z → A)',     sortBy: 'name',      sortDirection: 'desc' },
  { key: 'createdAt-desc',  label: 'Newest first',          sortBy: 'createdAt', sortDirection: 'desc' },
  { key: 'createdAt-asc',   label: 'Oldest first',          sortBy: 'createdAt', sortDirection: 'asc'  },
  { key: 'updatedAt-desc',  label: 'Recently updated',      sortBy: 'updatedAt', sortDirection: 'desc' },
  { key: 'updatedAt-asc',   label: 'Least recently updated', sortBy: 'updatedAt', sortDirection: 'asc' },
]
const DEFAULT_SORT_KEY = 'name-asc'

function createInitialFilters() {
  return {
    tags: [],
    tagMatch: 'any',
    createdFrom: '',
    createdTo: '',
    updatedFrom: '',
    updatedTo: '',
  }
}

// Translate the filter form state into the params the service expects.
// Empty strings / empty arrays are dropped so the resulting query is a
// pure cache pass-through when no filter is set.
function buildFilterParams(filters) {
  const params = {}
  if (Array.isArray(filters.tags) && filters.tags.length > 0) {
    params.tags = filters.tags
    if (filters.tagMatch === 'all') params.tagMatch = 'all'
  }
  // Date inputs emit YYYY-MM-DD. Backend expects ISO-8601, so we snap
  // `from` to start-of-day and `to` to end-of-day to make the range
  // inclusive of the selected calendar day.
  if (filters.createdFrom) params.createdFrom = `${filters.createdFrom}T00:00:00Z`
  if (filters.createdTo)   params.createdTo   = `${filters.createdTo}T23:59:59.999Z`
  if (filters.updatedFrom) params.updatedFrom = `${filters.updatedFrom}T00:00:00Z`
  if (filters.updatedTo)   params.updatedTo   = `${filters.updatedTo}T23:59:59.999Z`
  return params
}

function isFilterEmpty(filters) {
  return (
    (!filters.tags || filters.tags.length === 0) &&
    !filters.createdFrom &&
    !filters.createdTo &&
    !filters.updatedFrom &&
    !filters.updatedTo
  )
}

// Build the chip array for the FilterChips strip. Each chip is one
// removable atom (a tag, a date range, the sort, …). Kept out of the
// render block so the JSX stays scannable.
//
// Tone hints (`sort`, `date`, `tag`, `choice`) drive the chip color
// so users can group active filters at a glance.
function buildCategoryChips({ sortLabel, onClearSort, filters, updateFilter }) {
  const chips = []
  if (sortLabel) {
    chips.push({ key: 'sort', tone: 'sort', label: 'Sort', value: sortLabel, onRemove: onClearSort })
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
  return chips
}

function toArray(value) {
  if (Array.isArray(value)) return value.filter(Boolean)
  if (!value) return []
  return String(value)
    .split(/[,،;]/)
    .map((entry) => entry.trim())
    .filter(Boolean)
}

function createInitialForm() {
  return { categoryCode: '', name: '', description: '', keywords: [] }
}

function EmployeeCategoryPage() {
  const toast = useToast()

  const [categories, setCategories] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')

  const [view, setView] = useState('list')
  const [currentCategory, setCurrentCategory] = useState(null)

  const [form, setForm] = useState(createInitialForm)
  const [isSaving, setIsSaving] = useState(false)
  const [formError, setFormError] = useState('')
  const [searchTerm, setSearchTerm] = useState('')
  // Backend search results — populated by /api/category/search (across name,
  // description, code, and keywords) after a short debounce. `null` means
  // "no active search; fall back to full list".
  const [searchResults, setSearchResults] = useState(null)
  const [isSearching, setIsSearching] = useState(false)

  const [deleteTarget, setDeleteTarget] = useState(null)
  const [isDeleting, setIsDeleting] = useState(false)

  // Server-side pagination for the browse view. Search uses /category/search
  // (already wired below) and bypasses pagination.
  const [page, setPage] = useState(0)
  const [totalPages, setTotalPages] = useState(0)
  const [totalElements, setTotalElements] = useState(0)

  // Sort + filter state. These flow through to GET /api/category as
  // query params; backend applies them in-memory against its Redis
  // cache so toggling them is cheap. Search bypasses both — the
  // /category/search endpoint has its own ranking and no params.
  const [sortKey, setSortKey] = useState(DEFAULT_SORT_KEY)
  const [filters, setFilters] = useState(createInitialFilters)
  const [isFilterPanelOpen, setIsFilterPanelOpen] = useState(false)
  const filtersActive = !isFilterEmpty(filters)
  const sortActive = sortKey !== DEFAULT_SORT_KEY
  const activeSort = useMemo(
    () => CATEGORY_SORT_OPTIONS.find((opt) => opt.key === sortKey) ?? CATEGORY_SORT_OPTIONS[0],
    [sortKey],
  )

  const trimmedSearch = searchTerm.trim()
  const isSearchActive = trimmedSearch.length > 0

  // Combined highlight query — feeds every <Highlight> in the table.
  // The component tokenises on whitespace, so concatenating the
  // search box value with the active tag filters lights up every
  // matched substring (search hits AND tags) wherever it appears in
  // a row's name / description / keywords. Filter date ranges aren't
  // included because they don't correspond to substrings users would
  // recognise.
  const highlightQuery = useMemo(() => {
    const parts = []
    if (trimmedSearch) parts.push(trimmedSearch)
    if (filters.tags.length > 0) parts.push(filters.tags.join(' '))
    return parts.join(' ')
  }, [trimmedSearch, filters.tags])

  // V3 trash model: backend's GET /category returns active records only;
  // trashed records live at /category/trash and are managed from the
  // admin Trash page. So no more "show removed" toggle here — the list
  // is always the active set.
  const baseCategories = useMemo(
    () => (isSearchActive ? (searchResults ?? []) : categories),
    [isSearchActive, searchResults, categories],
  )

  const visibleCategories = baseCategories
  const filteredCategories = visibleCategories

  const loadCategories = useCallback(
    async (options = {}) => {
      const { notifyError = false } = options
      setIsLoading(true)
      setError('')
      try {
        const pageData = await getCategoriesPage({
          page,
          size: CATEGORIES_PAGE_SIZE,
          sortBy: activeSort.sortBy,
          sortDirection: activeSort.sortDirection,
          ...buildFilterParams(filters),
        })
        setCategories(pageData?.content || [])
        setTotalPages(pageData?.totalPages || 0)
        setTotalElements(pageData?.totalElements || 0)
      } catch (err) {
        setError(getErrorMessage(err, 'Failed to load categories'))
        if (notifyError) toast.apiError(err, 'Could not refresh categories')
      } finally {
        setIsLoading(false)
      }
    },
    [page, toast, activeSort, filters],
  )

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadCategories()
  }, [loadCategories])

  // When sort or filter changes, jump back to page 0 — otherwise the
  // user could be stranded on page 5 of a window that no longer has
  // 5 pages after applying a tag filter.
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setPage(0)
  }, [sortKey, filters])

  const clearFilters = () => setFilters(createInitialFilters())
  const updateFilter = (key, value) =>
    setFilters((prev) => ({ ...prev, [key]: value }))

  // Debounced backend search across name, description, code, and keywords.
  // Cancels in-flight requests when the user keeps typing or clears the box.
  // Errors here are intentionally silent — we just show no results rather
  // than spamming a toast on every keystroke that races with a refresh.
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
        const data = await searchCategories(trimmedSearch, {
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

  const handleOpenCreate = () => {
    setForm(createInitialForm())
    setFormError('')
    setView('create')
  }

  const handleOpenEdit = (cat) => {
    setCurrentCategory(cat)
    setForm({
      categoryCode: cat.categoryCode || '',
      name: cat.name || '',
      description: cat.description || '',
      keywords: toArray(cat.keywords),
    })
    setFormError('')
    setView('edit')
  }

  const handleCloseForm = () => {
    setView('list')
    setCurrentCategory(null)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setFormError('')

    if (!form.name.trim()) {
      setFormError('Name is required.')
      return
    }
    if (view === 'create' && !form.categoryCode.trim()) {
      setFormError('Category code is required.')
      return
    }

    setIsSaving(true)
    try {
      if (view === 'create') {
        await createCategory({
          categoryCode: form.categoryCode.trim(),
          name: form.name.trim(),
          description: form.description.trim() || null,
          keywords: toArray(form.keywords),
        })
        toast.success('Category created', `${form.name} is now available.`)
      } else {
        await updateCategory(currentCategory.categoryCode, {
          name: form.name.trim(),
          description: form.description.trim() || null,
          keywords: toArray(form.keywords),
        })
        toast.success('Category updated', `${form.name} changes were saved.`)
      }
      await loadCategories()
      handleCloseForm()
    } catch (err) {
      // Optimistic-locking conflict (V3 concurrency model): another user
      // edited this category since we loaded it. Backend's message is
      // already friendly ("…modified by someone else… Reload…"), so we
      // surface it via toast and bounce back to the list — re-opening
      // the row will re-fetch and let the user re-apply their changes.
      if (isStaleVersionError(err)) {
        toast.apiError(err, 'Reload required')
        await loadCategories()
        handleCloseForm()
        return
      }
      setFormError(formatApiError(err, 'Failed to save category'))
      toast.apiError(err, 'Unable to save category')
    } finally {
      setIsSaving(false)
    }
  }

  // Soft-trash. The DELETE call sends the record to trash; an admin can
  // restore it from the Trash page. The backend keeps the existing
  // "in-use by active project" guard (only soft-trashing is blocked while
  // any active project still references this category).
  const handleDeleteConfirm = async () => {
    if (!deleteTarget) return
    setIsDeleting(true)
    try {
      await deleteCategory(deleteTarget.categoryCode)
      toast.success(
        'Sent to trash',
        `${deleteTarget.name} can be restored by an admin from Trash.`,
      )
      setDeleteTarget(null)
      await loadCategories()
    } catch (err) {
      toast.apiError(err, 'Unable to send category to trash')
    } finally {
      setIsDeleting(false)
    }
  }

  if (view === 'create' || view === 'edit') {
    return (
      <EmployeeEntityPage
        eyebrow={view === 'create' ? 'New record' : 'Editing'}
        title={view === 'create' ? 'Add Category' : 'Edit Category'}
        description="Categories classify projects. Add keywords / alternative names so similar categories are not created twice."
      >
        <Card className="max-w-2xl border-border bg-card shadow-sm shadow-black/5">
          <CardHeader className="border-b border-border pb-4">
            <CardTitle className="text-base font-semibold">Category details</CardTitle>
            <CardDescription>Fields marked with * are required.</CardDescription>
          </CardHeader>
          <CardContent className="pt-5">
            <form id="category-form" onSubmit={handleSubmit} className="space-y-5">
              {view === 'create' ? (
                <div className="space-y-1.5">
                  <Label htmlFor="categoryCode">
                    Category code <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="categoryCode"
                    value={form.categoryCode}
                    onChange={(e) => setForm({ ...form, categoryCode: e.target.value })}
                    placeholder="e.g. MUSIC"
                    required
                    className="font-mono tracking-wide"
                  />
                  <p className="text-xs text-muted-foreground">
                    Unique identifier. Cannot be changed after creation.
                  </p>
                </div>
              ) : (
                <div className="space-y-1.5">
                  <Label htmlFor="categoryCodeReadonly">Category code</Label>
                  <Input
                    id="categoryCodeReadonly"
                    value={form.categoryCode}
                    disabled
                    className="font-mono tracking-wide"
                  />
                </div>
              )}

              <div className="space-y-1.5">
                <Label htmlFor="name">
                  Name <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="name"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  placeholder="e.g. Music"
                  required
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="description">Description</Label>
                <textarea
                  id="description"
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  placeholder="What does this category cover?"
                  className="min-h-[96px] w-full resize-y rounded-lg border border-input bg-background px-3 py-2 text-sm shadow-sm transition-colors placeholder:text-muted-foreground/70 focus-visible:border-ring focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/30"
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="keywords">
                  Keywords / alternative names{' '}
                  <span className="font-normal text-muted-foreground">(press Enter to add)</span>
                </Label>
                <TagsInput
                  id="keywords"
                  value={form.keywords}
                  onChange={(next) => setForm({ ...form, keywords: next })}
                  placeholder="e.g. song, melody, music piece…"
                />
                <p className="text-xs text-muted-foreground">
                  Used to detect similar categories — adding "song" under "Music" prevents a duplicate "Songs" category.
                </p>
              </div>

              <FormErrorBox error={formError} />
            </form>
          </CardContent>
          <CardFooter className="flex items-center justify-end gap-2 border-t border-border bg-muted/20 px-6 py-4">
            <Button type="button" variant="outline" onClick={handleCloseForm} disabled={isSaving}>
              Cancel
            </Button>
            <Button type="submit" form="category-form" disabled={isSaving} className="gap-2">
              {isSaving && <Loader2 className="size-4 animate-spin" />}
              {isSaving ? 'Saving…' : 'Save Category'}
            </Button>
          </CardFooter>
        </Card>
      </EmployeeEntityPage>
    )
  }

  return (
    <EmployeeEntityPage
      eyebrow="Taxonomy"
      title="Categories"
      badge={!isLoading && !error
        ? `${(isSearchActive ? visibleCategories.length : totalElements).toLocaleString()} total`
        : null}
      description="Classify projects. Each category lists its alternative names so similar ones don't get created twice."
      action={
        <Button onClick={handleOpenCreate} className="gap-2 shrink-0">
          <Plus className="size-4" />
          Add Category
        </Button>
      }
    >
      <EntityToolbar
        filteredCount={filteredCategories.length}
        totalCount={isSearchActive ? visibleCategories.length : totalElements}
        searchValue={searchTerm}
        onSearchChange={setSearchTerm}
        searchPlaceholder="Search across name, description, code, or keywords…"
        onRefresh={() => loadCategories({ notifyError: true })}
        isRefreshing={isLoading || isSearching}
        trailing={
          // Sort + filter live in the trailing slot so they sit
          // alongside the refresh button. Both are disabled while a
          // text search is active because /category/search bypasses
          // them server-side anyway — letting the user toggle them
          // would set state that doesn't apply until they clear the
          // search box.
          <div className="flex flex-wrap items-center gap-2">
            <SortSelect
              value={sortKey}
              onChange={setSortKey}
              options={CATEGORY_SORT_OPTIONS}
              ascIcon={ArrowUpAZ}
              descIcon={ArrowDownAZ}
              disabled={isSearchActive}
              title="Sort categories"
            />
            <FilterTriggerButton
              active={filtersActive}
              count={[
                filters.tags.length > 0 ? 1 : 0,
                filters.createdFrom || filters.createdTo ? 1 : 0,
                filters.updatedFrom || filters.updatedTo ? 1 : 0,
              ].reduce((a, b) => a + b, 0)}
              open={isFilterPanelOpen}
              onClick={() => setIsFilterPanelOpen((v) => !v)}
              disabled={isSearchActive}
              disabledReason="Clear search to use filters"
            />
          </div>
        }
      />

      {!isSearchActive ? (
        <CategoryFilterPanel
          open={isFilterPanelOpen}
          filters={filters}
          onChange={updateFilter}
          onClear={clearFilters}
          onClose={() => setIsFilterPanelOpen(false)}
          isAnyActive={filtersActive}
          activeCount={[
            filters.tags.length > 0 ? 1 : 0,
            filters.createdFrom || filters.createdTo ? 1 : 0,
            filters.updatedFrom || filters.updatedTo ? 1 : 0,
          ].reduce((a, b) => a + b, 0)}
        />
      ) : null}

      <FilterChips
        chips={buildCategoryChips({
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

      {isLoading ? (
        <Card className="border-border bg-card shadow-sm shadow-black/5">
          <div className="divide-y divide-border">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="flex items-center gap-4 px-4 py-3">
                <Skeleton className="h-4 w-6" />
                <Skeleton className="h-6 w-28 rounded-md" />
                <Skeleton className="h-4 w-40" />
                <Skeleton className="h-4 flex-1 max-w-[420px]" />
                <Skeleton className="ml-auto h-7 w-20" />
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
              onClick={() => loadCategories({ notifyError: true })}
            >
              <RefreshCw className="size-4" />
              Retry
            </Button>
          </CardContent>
        </Card>
      ) : categories.length === 0 ? (
        <EmptyState
          icon={Tags}
          title="No categories yet"
          description="Create your first category to begin organizing projects."
          action={
            <Button onClick={handleOpenCreate} className="gap-2">
              <Plus className="size-4" />
              Add Category
            </Button>
          }
        />
      ) : (
        <div className="overflow-hidden rounded-xl border border-border bg-card shadow-sm shadow-black/5">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/40 hover:bg-muted/40">
                <TableHead className="w-[52px] text-center">#</TableHead>
                <TableHead className="w-[180px]">Code</TableHead>
                <TableHead className="w-[220px]">Name</TableHead>
                <TableHead>Description</TableHead>
                <TableHead className="w-[260px]">Keywords</TableHead>
                <TableHead className="w-[160px] text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredCategories.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="h-24 text-center text-muted-foreground">
                    {isSearching ? (
                      <span className="inline-flex items-center gap-2">
                        <Loader2 className="size-3.5 animate-spin" />
                        Searching for &ldquo;{trimmedSearch}&rdquo;…
                      </span>
                    ) : isSearchActive ? (
                      <>No matches for &ldquo;{trimmedSearch}&rdquo; in name, description, code, or keywords.</>
                    ) : (
                      <>No categories to show.</>
                    )}
                  </TableCell>
                </TableRow>
              ) : (
                filteredCategories.map((cat, index) => {
                  const kws = Array.isArray(cat.keywords) ? cat.keywords : []
                  const visibleKws = kws.slice(0, 3)
                  const extraKws = kws.length - visibleKws.length
                  return (
                    <TableRow
                      key={cat.categoryCode}
                      className={`group transition-colors ${cat.removedAt ? 'opacity-60' : ''}`}
                    >
                      <TableCell className="text-center text-xs tabular-nums text-muted-foreground">
                        {/* Absolute index across all pages. Search mode
                            shows in-list rank since there's no global
                            position for ranked results. */}
                        {(isSearchActive ? 0 : page * CATEGORIES_PAGE_SIZE) + index + 1}
                      </TableCell>
                      <TableCell>
                        <CodeBadge code={cat.categoryCode} variant="subtle" highlightQuery={highlightQuery} />
                      </TableCell>
                      <TableCell>
                        <div className="font-semibold leading-tight text-foreground">
                          <Highlight text={cat.name || ''} query={highlightQuery} />
                        </div>
                        {cat.removedAt && (
                          <span className="inline-flex items-center rounded-full border border-amber-500/30 bg-amber-500/10 px-2 py-0.5 text-[10px] font-medium text-amber-700 dark:text-amber-300">
                            Removed
                          </span>
                        )}
                      </TableCell>
                      <TableCell className="max-w-[440px]">
                        <p className="truncate text-sm text-muted-foreground" title={cat.description || '—'}>
                          {cat.description ? (
                            <Highlight text={cat.description} query={highlightQuery} />
                          ) : (
                            '—'
                          )}
                        </p>
                      </TableCell>
                      <TableCell>
                        {kws.length === 0 ? (
                          <span className="text-sm text-muted-foreground">—</span>
                        ) : (
                          <div className="flex flex-wrap gap-1">
                            {visibleKws.map((kw) => (
                              <span
                                key={kw}
                                className="inline-flex items-center rounded-full border bg-background px-2 py-0.5 text-[11px] text-foreground/80"
                              >
                                <Highlight text={String(kw)} query={highlightQuery} />
                              </span>
                            ))}
                            {extraKws > 0 ? (
                              <span className="text-[11px] font-medium text-muted-foreground">
                                +{extraKws}
                              </span>
                            ) : null}
                          </div>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="icon-xs"
                            className="text-muted-foreground hover:text-foreground"
                            onClick={() => handleOpenEdit(cat)}
                            title="Edit"
                          >
                            <Pencil className="size-3.5" />
                            <span className="sr-only">Edit</span>
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon-xs"
                            className="text-destructive/70 hover:bg-destructive/10 hover:text-destructive"
                            onClick={() => setDeleteTarget(cat)}
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
          pageSize={CATEGORIES_PAGE_SIZE}
          onPageChange={setPage}
          className="mt-4"
        />
      )}

      <TypedConfirmDialog
        open={Boolean(deleteTarget)}
        title="Send category to trash"
        description={
          deleteTarget
            ? `"${deleteTarget.name}" will be moved to trash. An admin can restore it from the Trash page.`
            : ''
        }
        codeToConfirm={deleteTarget?.categoryCode}
        promptLabel="To confirm, type the category code"
        confirmLabel="Send to Trash"
        cancelLabel="Cancel"
        confirmVariant="destructive"
        isProcessing={isDeleting}
        onConfirm={handleDeleteConfirm}
        onOpenChange={(nextOpen) => {
          if (!nextOpen) setDeleteTarget(null)
        }}
      />
    </EmployeeEntityPage>
  )
}

// Inline expandable panel: tag filter + match toggle + two date
// ranges. Composed from the shared FilterPanel scaffolding so it
// matches every other list page's filter layout (sectioned, grouped,
// uniform label style).
function CategoryFilterPanel({
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
      title="Filter categories"
      description="Refine the list by tags or by when the record was added or last updated."
      count={activeCount}
      onClear={isAnyActive ? onClear : null}
      onClose={onClose}
    >
      <FilterSection icon={Tag} label="Discovery" columns={1}>
        <MultiValueFilter
          label="Tags / keywords"
          placeholder="Type a tag or keyword and press Enter…"
          values={filters.tags}
          matchMode={filters.tagMatch}
          onValuesChange={(next) => onChange('tags', next)}
          onMatchChange={(value) => onChange('tagMatch', value)}
          helpText={
            <>
              <span className="font-mono">any</span> matches categories with at least one of the tags;{' '}
              <span className="font-mono">all</span> requires every tag.
            </>
          }
        />
      </FilterSection>

      <FilterSection icon={CalendarClock} label="Activity" columns={2}>
        <DateRangeField
          label="Created"
          from={filters.createdFrom}
          to={filters.createdTo}
          onFromChange={(value) => onChange('createdFrom', value)}
          onToChange={(value) => onChange('createdTo', value)}
        />
        <DateRangeField
          label="Last updated"
          from={filters.updatedFrom}
          to={filters.updatedTo}
          onFromChange={(value) => onChange('updatedFrom', value)}
          onToChange={(value) => onChange('updatedTo', value)}
        />
      </FilterSection>
    </FilterPanel>
  )
}

export { EmployeeCategoryPage }
