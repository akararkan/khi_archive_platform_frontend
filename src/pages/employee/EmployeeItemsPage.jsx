import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import {
  ArrowDownUp,
  Eye,
  Globe,
  Languages,
  Layers,
  Library,
  Pencil,
  RefreshCw,
  Tags,
  X,
} from 'lucide-react'

import { EmployeeEntityPage } from '@/components/employee/EmployeeEntityPage'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { CodeBadge } from '@/components/ui/code-badge'
import { EmptyState } from '@/components/ui/empty-state'
import { Highlight } from '@/components/ui/highlight'
import { DataPagination } from '@/components/ui/pagination'
import { SearchSelect } from '@/components/ui/search-select'
import { Skeleton } from '@/components/ui/skeleton'
import { TagsInput } from '@/components/ui/tags-input'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import {
  DateRangeField,
  FilterChips,
  FilterField,
  FilterPanel,
  FilterSection,
  FilterTriggerButton,
  SegmentedControl,
  SortSelect,
  TextFilter,
} from '@/components/ui/list-filters'
import { ItemDetailDialog } from '@/components/items/ItemDetailDialog'
import { ItemEditForm } from '@/components/items/ItemEditForm'
import { TypeBadge } from '@/components/items/item-badges'
import { VisibilityToggle } from '@/components/ui/visibility-toggle'
import { getTypeMeta } from '@/components/items/item-helpers'
import { usePersistentState } from '@/hooks/use-persistent-state'
import { useToast } from '@/hooks/use-toast'
import { getErrorMessage, isStaleVersionError } from '@/lib/get-error-message'
import { cn } from '@/lib/utils'
import { formatDateTime } from '@/components/maqam/maqam-helpers'
import { getCategories, searchCategories } from '@/services/category'
import { getPersons, searchPersons } from '@/services/person'
import { getProjects } from '@/services/project'
import { ITEM_TYPES, getItemsPage, setItemVisibility } from '@/services/items'

const PAGE_SIZE = 50
const UNTITLED = 'UNTITLED'

// Sort presets → the backend's sortBy/sortDirection pair.
const SORT_OPTIONS = [
  { key: 'newest', label: 'Newest added', sortBy: 'createdAt', sortDirection: 'desc', icon: ArrowDownUp },
  { key: 'oldest', label: 'Oldest added', sortBy: 'createdAt', sortDirection: 'asc', icon: ArrowDownUp },
  { key: 'updated', label: 'Recently updated', sortBy: 'updatedAt', sortDirection: 'desc', icon: ArrowDownUp },
  { key: 'title-asc', label: 'Title A→Z', sortBy: 'title', sortDirection: 'asc', icon: ArrowDownUp },
  { key: 'title-desc', label: 'Title Z→A', sortBy: 'title', sortDirection: 'desc', icon: ArrowDownUp },
  { key: 'code-asc', label: 'Code A→Z', sortBy: 'code', sortDirection: 'asc', icon: ArrowDownUp },
  { key: 'collection', label: 'Collection A→Z', sortBy: 'projectName', sortDirection: 'asc', icon: ArrowDownUp },
  { key: 'person', label: 'Person A→Z', sortBy: 'personName', sortDirection: 'asc', icon: ArrowDownUp },
  { key: 'type', label: 'Type', sortBy: 'type', sortDirection: 'asc', icon: ArrowDownUp },
]

const INITIAL_FILTER = {
  q: '',
  types: [],
  projectCodes: [],
  personCodes: [],
  categoryCodes: [],
  languages: [],
  isPublic: undefined, // undefined = any, true = public, false = hidden
  projectVisibleToPublic: undefined,
  createdFrom: '',
  createdTo: '',
  updatedFrom: '',
  updatedTo: '',
}

// `type="date"` gives YYYY-MM-DD; the API wants an ISO-8601 instant.
const startInstant = (d) => (d ? `${d}T00:00:00Z` : undefined)
const endInstant = (d) => (d ? `${d}T23:59:59Z` : undefined)

const boolToSeg = (v) => (v === true ? 'yes' : v === false ? 'no' : 'any')
const segToBool = (s) => (s === 'yes' ? true : s === 'no' ? false : undefined)

// ── A reusable "pick several codes" control (project / category pickers) ──────
function CodeMultiSelect({ items, selected, onChange, getKey, getLabel, getSubtitle, asyncSearch, placeholder, emptyHint, loading }) {
  const remaining = useMemo(() => {
    const set = new Set(selected)
    return items.filter((it) => !set.has(getKey(it)))
  }, [items, selected, getKey])

  const labelByCode = useMemo(() => {
    const map = new Map()
    for (const it of items) map.set(getKey(it), getLabel(it))
    return map
  }, [items, getKey, getLabel])

  // Wrap async search so already-picked codes never re-appear in the menu.
  // Memoised so SearchSelect's debounce effect isn't re-armed every render.
  const wrappedAsync = useMemo(() => {
    if (!asyncSearch) return undefined
    return async (q, opts) => {
      const res = await asyncSearch(q, opts)
      const set = new Set(selected)
      return (res || []).filter((it) => !set.has(getKey(it)))
    }
  }, [asyncSearch, selected, getKey])

  return (
    <div className="space-y-2">
      <SearchSelect
        items={remaining}
        value=""
        onChange={(next) => {
          if (!next || selected.includes(next)) return
          onChange([...selected, next])
        }}
        getKey={getKey}
        getLabel={getLabel}
        getSubtitle={getSubtitle}
        placeholder={placeholder}
        emptyHint={emptyHint}
        loading={loading}
        asyncSearch={wrappedAsync}
      />
      {selected.length > 0 ? (
        <div className="flex flex-wrap gap-1.5">
          {selected.map((code) => (
            <span
              key={code}
              className="inline-flex items-center gap-1.5 rounded-full border bg-muted/40 px-2.5 py-1 text-xs font-medium text-foreground"
            >
              {labelByCode.get(code) || code}
              <span className="font-mono text-[10px] text-muted-foreground">{code}</span>
              <button
                type="button"
                onClick={() => onChange(selected.filter((c) => c !== code))}
                className="text-muted-foreground transition hover:text-foreground"
                aria-label={`Remove ${code}`}
              >
                <X className="size-3" />
              </button>
            </span>
          ))}
        </div>
      ) : null}
    </div>
  )
}

function EmployeeItemsPage() {
  const location = useLocation()
  const toast = useToast()
  // Same component is mounted under /employee/items and /admin/items; derive the
  // section so collection links stay inside the area the user is working in.
  const sectionBase = location.pathname.startsWith('/admin') ? '/admin' : '/employee'

  const [filter, setFilter] = usePersistentState('employee.items.filter', INITIAL_FILTER)
  const [sortKey, setSortKey] = usePersistentState('employee.items.sort', 'newest')
  const [page, setPage] = usePersistentState('employee.items.page', 0)
  const [filtersOpen, setFiltersOpen] = usePersistentState('employee.items.filtersOpen', false)

  const [rows, setRows] = useState(null)
  const [meta, setMeta] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [nonce, setNonce] = useState(0) // bump to force a refetch (Refresh button)

  const [detailItem, setDetailItem] = useState(null)
  const [editItem, setEditItem] = useState(null) // when set, the full-page edit view is shown
  const [savingVis, setSavingVis] = useState({}) // `${type}-${code}` -> true while a toggle saves

  // Seed lists for the filter pickers.
  const [projects, setProjects] = useState([])
  const [persons, setPersons] = useState([])
  const [categories, setCategories] = useState([])
  const [seedLoading, setSeedLoading] = useState(true)

  const sortOpt = useMemo(() => SORT_OPTIONS.find((o) => o.key === sortKey) || SORT_OPTIONS[0], [sortKey])

  // Any filter or sort change resets to the first page so we never land past
  // the end of a smaller result set.
  const updateFilter = useCallback((patch) => {
    setFilter((f) => ({ ...f, ...patch }))
    setPage(0)
  }, [setFilter, setPage])

  const handleSortChange = useCallback((key) => {
    setSortKey(key)
    setPage(0)
  }, [setSortKey, setPage])

  const clearAll = useCallback(() => {
    setFilter(INITIAL_FILTER)
    setPage(0)
  }, [setFilter, setPage])

  // ── Load the filter seed lists once ─────────────────────────────────────────
  useEffect(() => {
    let cancelled = false
    Promise.all([
      getProjects().catch(() => []),
      getPersons().catch(() => []),
      getCategories().catch(() => []),
    ])
      .then(([proj, pers, cats]) => {
        if (cancelled) return
        setProjects((proj || []).filter((p) => !p.removedAt))
        setPersons((pers || []).filter((p) => !p.removedAt))
        setCategories((cats || []).filter((c) => !c.removedAt))
      })
      .finally(() => {
        if (!cancelled) setSeedLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [])

  // ── The request: memoised so the fetch effect only re-runs on real change ──
  const request = useMemo(
    () => ({
      q: filter.q || undefined,
      types: filter.types,
      projectCodes: filter.projectCodes,
      personCodes: filter.personCodes,
      categoryCodes: filter.categoryCodes,
      languages: filter.languages,
      isPublic: filter.isPublic,
      projectVisibleToPublic: filter.projectVisibleToPublic,
      createdFrom: startInstant(filter.createdFrom),
      createdTo: endInstant(filter.createdTo),
      updatedFrom: startInstant(filter.updatedFrom),
      updatedTo: endInstant(filter.updatedTo),
      sortBy: sortOpt.sortBy,
      sortDirection: sortOpt.sortDirection,
      page,
      size: PAGE_SIZE,
    }),
    [filter, sortOpt, page],
  )
  const requestKey = useMemo(() => JSON.stringify(request), [request])

  // ── Fetch (debounced + abortable) ───────────────────────────────────────────
  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    const ctrl = new AbortController()
    setLoading(true)
    setError('')
    const timer = setTimeout(async () => {
      try {
        const data = await getItemsPage({ ...request, signal: ctrl.signal })
        if (ctrl.signal.aborted) return
        const content = Array.isArray(data?.content) ? data.content : Array.isArray(data) ? data : []
        setRows(content)
        setMeta({
          page: data?.number ?? page,
          totalPages: data?.totalPages ?? 0,
          totalElements: data?.totalElements ?? content.length,
          size: data?.size ?? PAGE_SIZE,
        })
      } catch (err) {
        if (err?.code === 'ERR_CANCELED') return
        setError(getErrorMessage(err, 'Could not load items.'))
        setRows([])
      } finally {
        if (!ctrl.signal.aborted) setLoading(false)
      }
    }, 220)
    return () => {
      clearTimeout(timer)
      ctrl.abort()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [requestKey, nonce])
  /* eslint-enable react-hooks/set-state-in-effect */

  // Backend search seeds for the async pickers.
  const personAsync = useCallback(async (q, { signal }) => searchPersons(q, { limit: 50, signal }), [])
  const categoryAsync = useCallback(async (q, { signal }) => searchCategories(q, { limit: 50, signal }), [])

  // Person picker manages real persons; the UNTITLED sentinel is a separate toggle.
  const personSelected = useMemo(() => filter.personCodes.filter((c) => c !== UNTITLED), [filter.personCodes])
  const includeUntitled = filter.personCodes.includes(UNTITLED)

  // ── Active-filter accounting (count for the trigger + chips strip) ───────────
  const dateActive = Boolean(filter.createdFrom || filter.createdTo)
  const updatedActive = Boolean(filter.updatedFrom || filter.updatedTo)
  const filterCount =
    (filter.projectCodes.length ? 1 : 0) +
    (filter.personCodes.length ? 1 : 0) +
    (filter.categoryCodes.length ? 1 : 0) +
    (filter.languages.length ? 1 : 0) +
    (filter.isPublic !== undefined ? 1 : 0) +
    (filter.projectVisibleToPublic !== undefined ? 1 : 0) +
    (dateActive ? 1 : 0) +
    (updatedActive ? 1 : 0)

  const anyActive = filterCount > 0 || filter.types.length > 0 || Boolean(filter.q)

  const chips = useMemo(() => {
    const out = []
    for (const code of filter.projectCodes) {
      out.push({ key: `proj-${code}`, label: 'Collection', value: code, tone: 'default', onRemove: () => updateFilter({ projectCodes: filter.projectCodes.filter((c) => c !== code) }) })
    }
    for (const code of filter.personCodes) {
      out.push({ key: `pers-${code}`, label: 'Person', value: code === UNTITLED ? 'Untitled' : code, tone: 'default', onRemove: () => updateFilter({ personCodes: filter.personCodes.filter((c) => c !== code) }) })
    }
    for (const code of filter.categoryCodes) {
      out.push({ key: `cat-${code}`, label: 'Category', value: code, tone: 'tag', onRemove: () => updateFilter({ categoryCodes: filter.categoryCodes.filter((c) => c !== code) }) })
    }
    for (const lang of filter.languages) {
      out.push({ key: `lang-${lang}`, label: 'Language', value: lang, tone: 'choice', onRemove: () => updateFilter({ languages: filter.languages.filter((l) => l !== lang) }) })
    }
    if (filter.isPublic !== undefined) {
      out.push({ key: 'pub', label: 'Item', value: filter.isPublic ? 'Public' : 'Hidden', tone: 'choice', onRemove: () => updateFilter({ isPublic: undefined }) })
    }
    if (filter.projectVisibleToPublic !== undefined) {
      out.push({ key: 'pvp', label: 'Collection', value: filter.projectVisibleToPublic ? 'Visible' : 'Hidden', tone: 'choice', onRemove: () => updateFilter({ projectVisibleToPublic: undefined }) })
    }
    if (dateActive) {
      out.push({ key: 'created', label: 'Added', value: `${filter.createdFrom || '…'} → ${filter.createdTo || '…'}`, tone: 'date', onRemove: () => updateFilter({ createdFrom: '', createdTo: '' }) })
    }
    if (updatedActive) {
      out.push({ key: 'updated', label: 'Updated', value: `${filter.updatedFrom || '…'} → ${filter.updatedTo || '…'}`, tone: 'date', onRemove: () => updateFilter({ updatedFrom: '', updatedTo: '' }) })
    }
    return out
  }, [filter, dateActive, updatedActive, updateFilter])

  const total = meta?.totalElements
  const showingEmpty = !loading && rows && rows.length === 0

  // After a successful edit, return to the list and refetch so the row reflects
  // the saved values (and any visibility/title change).
  const handleEditSaved = useCallback(() => {
    setEditItem(null)
    setNonce((n) => n + 1)
  }, [])

  // Flip a single item's own `isPublic` right from the row — optimistic, with
  // a rollback + toast on failure. A stale-version conflict forces a refetch so
  // the row picks up whoever won.
  const handleToggleItemVisibility = useCallback(
    async (item, next) => {
      const key = `${item.type}-${item.code}`
      setSavingVis((s) => ({ ...s, [key]: true }))
      setRows((rs) =>
        (rs || []).map((r) => (r.type === item.type && r.code === item.code ? { ...r, isPublic: next } : r)),
      )
      try {
        await setItemVisibility(item, next)
        toast.success(
          next ? 'Item is now public' : 'Item hidden',
          next
            ? `${item.code} — guests can see it (when its collection is visible too).`
            : `${item.code} — no longer shown to guests.`,
        )
      } catch (err) {
        // Roll the row back to its previous state.
        setRows((rs) =>
          (rs || []).map((r) => (r.type === item.type && r.code === item.code ? { ...r, isPublic: !next } : r)),
        )
        toast.apiError(err, 'Could not change visibility')
        if (isStaleVersionError(err)) setNonce((n) => n + 1)
      } finally {
        setSavingVis((s) => {
          const copy = { ...s }
          delete copy[key]
          return copy
        })
      }
    },
    [toast],
  )

  // ── Full-page edit view ─────────────────────────────────────────────────────
  if (editItem) {
    return <ItemEditForm item={editItem} onCancel={() => setEditItem(null)} onSaved={handleEditSaved} />
  }

  return (
    <EmployeeEntityPage
      eyebrow="Archive"
      title="List of Items"
      badge={total != null ? `${total.toLocaleString()} items` : undefined}
      description="Every audio, video, image and text record across all collections in one searchable list. Filter by type, collection, person, category, language, or visibility."
      action={
        <Button type="button" variant="outline" className="gap-2 shrink-0" onClick={() => setNonce((n) => n + 1)} disabled={loading}>
          <RefreshCw className={cn('size-4', loading && 'animate-spin')} />
          Refresh
        </Button>
      }
    >
      {/* Type chips — quick toggles for the four media types */}
      <div className="flex flex-wrap items-center gap-2">
        {ITEM_TYPES.map((type) => {
          const meta2 = getTypeMeta(type)
          const Icon = meta2.icon
          const active = filter.types.includes(type)
          return (
            <button
              key={type}
              type="button"
              onClick={() =>
                updateFilter({
                  types: active ? filter.types.filter((t) => t !== type) : [...filter.types, type],
                })
              }
              className={cn(
                'inline-flex items-center gap-1.5 rounded-xl border px-3 py-1.5 text-sm font-medium transition-colors',
                active
                  ? 'border-primary/40 bg-primary/10 text-primary'
                  : 'border-border bg-background text-muted-foreground hover:bg-muted/60',
              )}
            >
              <Icon className="size-4" />
              {meta2.label}
            </button>
          )
        })}
        {filter.types.length > 0 ? (
          <button
            type="button"
            onClick={() => updateFilter({ types: [] })}
            className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-xs text-muted-foreground transition-colors hover:text-foreground"
          >
            <X className="size-3" />
            All types
          </button>
        ) : null}
      </div>

      {/* Toolbar: search + sort + filters */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div className="w-full sm:max-w-md">
          <TextFilter
            value={filter.q}
            onCommit={(v) => updateFilter({ q: v })}
            placeholder="Search titles, codes, people, places, tags…"
          />
        </div>
        <div className="flex items-center gap-2">
          <SortSelect value={sortKey} onChange={handleSortChange} options={SORT_OPTIONS} title="Sort items" />
          <FilterTriggerButton
            active={filterCount > 0}
            count={filterCount}
            open={filtersOpen}
            onClick={() => setFiltersOpen((o) => !o)}
          />
        </div>
      </div>

      {/* Filter panel */}
      <FilterPanel
        open={filtersOpen}
        title="Filter items"
        description="Narrow the list by collection, person, category, language and visibility."
        count={filterCount}
        onClear={clearAll}
        onClose={() => setFiltersOpen(false)}
      >
        <FilterSection icon={Layers} label="Collections & people" columns={2}>
          <FilterField label="Collections">
            <CodeMultiSelect
              items={projects}
              selected={filter.projectCodes}
              onChange={(next) => updateFilter({ projectCodes: next })}
              getKey={(p) => p.projectCode}
              getLabel={(p) => p.projectName || p.projectCode}
              getSubtitle={(p) => p.projectCode}
              placeholder="Search collections…"
              emptyHint="No matching collections"
              loading={seedLoading && projects.length === 0}
            />
          </FilterField>
          <FilterField label="People">
            <CodeMultiSelect
              items={persons}
              selected={personSelected}
              onChange={(next) => updateFilter({ personCodes: includeUntitled ? [...next, UNTITLED] : next })}
              getKey={(p) => p.personCode}
              getLabel={(p) => p.fullName || p.personCode}
              getSubtitle={(p) => p.personCode}
              asyncSearch={personAsync}
              placeholder="Search people…"
              emptyHint="No matching people"
              loading={seedLoading && persons.length === 0}
            />
            <label className="mt-2 flex cursor-pointer items-center gap-2 text-xs text-muted-foreground">
              <input
                type="checkbox"
                checked={includeUntitled}
                onChange={(e) => {
                  const base = filter.personCodes.filter((c) => c !== UNTITLED)
                  updateFilter({ personCodes: e.target.checked ? [...base, UNTITLED] : base })
                }}
                className="size-3.5 rounded border-input"
              />
              Include untitled-project items
            </label>
          </FilterField>
        </FilterSection>

        <FilterSection icon={Tags} label="Classification" columns={2}>
          <FilterField label="Categories">
            <CodeMultiSelect
              items={categories}
              selected={filter.categoryCodes}
              onChange={(next) => updateFilter({ categoryCodes: next })}
              getKey={(c) => c.categoryCode}
              getLabel={(c) => c.name || c.categoryCode}
              getSubtitle={(c) => c.categoryCode}
              asyncSearch={categoryAsync}
              placeholder="Search categories…"
              emptyHint="No matching categories"
              loading={seedLoading && categories.length === 0}
            />
          </FilterField>
          <FilterField label="Languages" hint="case-insensitive">
            <TagsInput
              value={filter.languages}
              onChange={(next) => updateFilter({ languages: next })}
              placeholder="KURDISH, ARABIC…"
            />
          </FilterField>
        </FilterSection>

        <FilterSection icon={Globe} label="Visibility" columns={2}>
          <FilterField label="Item visibility">
            <SegmentedControl
              value={boolToSeg(filter.isPublic)}
              onChange={(v) => updateFilter({ isPublic: segToBool(v) })}
              options={[
                { value: 'any', label: 'Any' },
                { value: 'yes', label: 'Public' },
                { value: 'no', label: 'Hidden' },
              ]}
              ariaLabel="Item visibility"
              fullWidth
            />
          </FilterField>
          <FilterField label="Collection visibility">
            <SegmentedControl
              value={boolToSeg(filter.projectVisibleToPublic)}
              onChange={(v) => updateFilter({ projectVisibleToPublic: segToBool(v) })}
              options={[
                { value: 'any', label: 'Any' },
                { value: 'yes', label: 'Visible' },
                { value: 'no', label: 'Hidden' },
              ]}
              ariaLabel="Collection visibility"
              fullWidth
            />
          </FilterField>
        </FilterSection>

        <FilterSection icon={Languages} label="Dates" columns={2}>
          <DateRangeField
            label="Added between"
            from={filter.createdFrom}
            to={filter.createdTo}
            onFromChange={(v) => updateFilter({ createdFrom: v })}
            onToChange={(v) => updateFilter({ createdTo: v })}
          />
          <DateRangeField
            label="Updated between"
            from={filter.updatedFrom}
            to={filter.updatedTo}
            onFromChange={(v) => updateFilter({ updatedFrom: v })}
            onToChange={(v) => updateFilter({ updatedTo: v })}
          />
        </FilterSection>
      </FilterPanel>

      {chips.length > 0 ? <FilterChips chips={chips} onClearAll={clearAll} /> : null}

      {/* Results */}
      {error ? (
        <Card className="border-destructive/40 bg-destructive/5">
          <CardContent className="flex items-center gap-3 px-4 py-3">
            <p className="flex-1 text-sm text-destructive">{error}</p>
            <Button type="button" variant="outline" size="sm" onClick={() => setNonce((n) => n + 1)}>
              Retry
            </Button>
          </CardContent>
        </Card>
      ) : null}

      <div className="overflow-hidden rounded-xl border border-border bg-card shadow-sm shadow-black/5">
        {loading && !rows ? (
          <div className="space-y-2 p-4">
            {Array.from({ length: 8 }).map((_, i) => (
              <Skeleton key={i} className="h-10 w-full" />
            ))}
          </div>
        ) : showingEmpty ? (
          <div className="py-10">
            <EmptyState
              icon={Library}
              title={anyActive ? 'No items match these filters' : 'No items yet'}
              description={
                anyActive
                  ? 'Try clearing a filter or widening your search.'
                  : 'Add audio, video, image or text records from inside a project to see them here.'
              }
              action={
                anyActive ? (
                  <Button type="button" variant="outline" className="gap-2" onClick={clearAll}>
                    <X className="size-4" />
                    Clear filters
                  </Button>
                ) : null
              }
            />
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/40 hover:bg-muted/40">
                <TableHead className="w-[52px] text-center">#</TableHead>
                <TableHead className="w-[88px]">Type</TableHead>
                <TableHead className="w-[240px]">Code</TableHead>
                <TableHead>Title</TableHead>
                <TableHead className="hidden lg:table-cell">Collection</TableHead>
                <TableHead className="hidden xl:table-cell">Person</TableHead>
                <TableHead className="hidden md:table-cell">Visibility</TableHead>
                <TableHead className="hidden lg:table-cell">Updated</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {(rows || []).map((item, index) => (
                <TableRow key={`${item.type}-${item.code}`} className="group transition-colors">
                  <TableCell className="text-center text-xs tabular-nums text-muted-foreground">
                    {page * PAGE_SIZE + index + 1}
                  </TableCell>
                  <TableCell>
                    <TypeBadge type={item.type} />
                  </TableCell>
                  <TableCell>
                    <CodeBadge code={item.code} variant="subtle" size="sm" highlightQuery={filter.q} />
                  </TableCell>
                  <TableCell className="max-w-[280px]">
                    <button
                      type="button"
                      onClick={() => setDetailItem(item)}
                      className="block max-w-full truncate text-left font-semibold leading-tight text-foreground hover:text-primary focus-visible:underline focus-visible:outline-none"
                      title={item.title}
                    >
                      <Highlight text={item.title || item.code} query={filter.q} />
                    </button>
                    {/* Compact context line shown when the wider columns are hidden */}
                    <p className="mt-0.5 truncate text-[11px] text-muted-foreground lg:hidden">
                      {item.projectName || '—'}
                      {item.personName ? ` · ${item.personName}` : ''}
                    </p>
                  </TableCell>
                  <TableCell className="hidden max-w-[200px] lg:table-cell">
                    {item.projectCode ? (
                      <Link
                        to={`${sectionBase}/project/${item.projectCode}`}
                        className="block truncate text-sm text-foreground hover:text-primary hover:underline"
                        title={item.projectName}
                      >
                        <Highlight text={item.projectName || item.projectCode} query={filter.q} />
                      </Link>
                    ) : (
                      <span className="text-sm text-muted-foreground">—</span>
                    )}
                  </TableCell>
                  <TableCell className="hidden max-w-[160px] xl:table-cell">
                    {item.personName || item.personCode ? (
                      <span className="block truncate text-sm text-foreground">
                        <Highlight text={item.personName || item.personCode} query={filter.q} />
                      </span>
                    ) : (
                      <span className="text-sm italic text-muted-foreground">Untitled</span>
                    )}
                  </TableCell>
                  <TableCell className="hidden md:table-cell">
                    <div className="flex flex-col items-start gap-1">
                      <VisibilityToggle
                        checked={item.isPublic !== false}
                        pending={Boolean(savingVis[`${item.type}-${item.code}`])}
                        onToggle={(next) => handleToggleItemVisibility(item, next)}
                        title={
                          item.isPublic !== false
                            ? 'Visible to public — click to hide'
                            : 'Hidden from public — click to show'
                        }
                      />
                      {item.projectVisibleToPublic === false ? (
                        <span className="inline-flex items-center rounded-full bg-amber-500/15 px-2 py-0.5 text-[10px] font-medium text-amber-600 dark:text-amber-400">
                          Collection hidden
                        </span>
                      ) : null}
                    </div>
                  </TableCell>
                  <TableCell className="hidden whitespace-nowrap text-xs text-muted-foreground lg:table-cell">
                    {formatDateTime(item.updatedAt)}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-1.5">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="h-7 gap-1 px-2 text-xs"
                        onClick={() => setDetailItem(item)}
                      >
                        <Eye className="size-3.5" />
                        View
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="h-7 gap-1 px-2 text-xs"
                        onClick={() => setEditItem(item)}
                      >
                        <Pencil className="size-3.5" />
                        Edit
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </div>

      {meta && meta.totalPages > 1 ? (
        <DataPagination
          page={meta.page}
          totalPages={meta.totalPages}
          totalElements={meta.totalElements}
          pageSize={meta.size}
          onPageChange={setPage}
          className="mt-4"
        />
      ) : null}

      <ItemDetailDialog
        item={detailItem}
        onClose={() => setDetailItem(null)}
        onEdit={(it) => {
          setDetailItem(null)
          setEditItem(it)
        }}
      />
    </EmployeeEntityPage>
  )
}

export { EmployeeItemsPage }
