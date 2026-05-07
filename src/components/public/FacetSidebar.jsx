import { useEffect, useMemo, useState } from 'react'
import {
  CalendarDays,
  ChevronDown,
  Filter,
  RotateCcw,
  Search,
  SlidersHorizontal,
  X,
} from 'lucide-react'

import { Skeleton } from '@/components/ui/skeleton'
import { cn } from '@/lib/utils'
import { readFacet } from '@/components/public/public-helpers'
import { guestFacets } from '@/services/guest'

// ── FacetChip ───────────────────────────────────────────────────────────
//
// KCAC-style chip button: count box on the left, label on the right.
// Selected chips swap to the primary token; unselected keep a subtle
// surface inside the dark sidebar so the count always stays scannable.

function FacetChip({ entry, selected, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={entry.value}
      aria-pressed={selected}
      className={cn(
        'group flex h-8 w-full items-center gap-2 overflow-hidden rounded-md text-left text-xs font-medium transition-colors',
        selected
          ? 'bg-primary text-primary-foreground'
          : 'bg-card-foreground/[0.06] text-foreground hover:bg-card-foreground/10',
      )}
    >
      <span
        className={cn(
          'flex h-full min-w-9 items-center justify-center px-1.5 font-mono text-[11px] tabular-nums',
          selected
            ? 'bg-primary-foreground/15 text-primary-foreground'
            : 'bg-card-foreground/[0.08] text-muted-foreground group-hover:bg-card-foreground/15',
        )}
      >
        {entry.count.toLocaleString()}
      </span>
      <span className="min-w-0 flex-1 truncate pr-2">{entry.value}</span>
    </button>
  )
}

// ── FacetGroup ──────────────────────────────────────────────────────────

function FacetGroup({
  title,
  entries,
  selected,
  onToggle,
  initiallyOpen = true,
  initialMaxVisible = 6,
  searchable = true,
}) {
  const [open, setOpen] = useState(initiallyOpen)
  const [showAll, setShowAll] = useState(false)
  const [filter, setFilter] = useState('')

  const filtered = useMemo(() => {
    if (!filter.trim()) return entries
    const needle = filter.trim().toLowerCase()
    return entries.filter((e) => e.value.toLowerCase().includes(needle))
  }, [entries, filter])

  const visible = showAll ? filtered : filtered.slice(0, initialMaxVisible)
  const hiddenCount = Math.max(0, filtered.length - initialMaxVisible)
  const selectedCount = entries.filter((e) =>
    selected.has(e.code || e.value),
  ).length

  if (entries.length === 0) return null

  return (
    <section className="border-t border-border/30 first:border-t-0">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="flex w-full items-center justify-between gap-2 px-4 py-3 text-left"
      >
        <span className="flex items-center gap-2 text-[13px] font-semibold tracking-tight text-foreground">
          {title}
          {selectedCount > 0 ? (
            <span className="inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[10px] font-semibold text-primary-foreground">
              {selectedCount}
            </span>
          ) : null}
        </span>
        <ChevronDown
          className={cn(
            'size-3.5 shrink-0 text-muted-foreground transition-transform',
            open ? 'rotate-180' : '',
          )}
        />
      </button>

      {open ? (
        <div className="space-y-2 px-4 pb-4">
          {searchable && entries.length > 6 ? (
            <div className="relative">
              <Search className="pointer-events-none absolute left-2 top-1/2 size-3 -translate-y-1/2 text-muted-foreground" />
              <input
                type="search"
                value={filter}
                onChange={(e) => setFilter(e.target.value)}
                placeholder={`Filter ${title.toLowerCase()}…`}
                className="h-7 w-full rounded-md border border-border/40 bg-card-foreground/[0.04] pl-7 pr-2 text-[11px] outline-none placeholder:text-muted-foreground/70 focus-visible:border-primary/40 focus-visible:ring-2 focus-visible:ring-primary/20"
              />
            </div>
          ) : null}

          <div className="grid grid-cols-2 gap-1.5">
            {visible.map((entry) => {
              const key = entry.code || entry.value
              return (
                <FacetChip
                  key={key}
                  entry={entry}
                  selected={selected.has(key)}
                  onClick={() => onToggle(key)}
                />
              )
            })}
          </div>

          {hiddenCount > 0 ? (
            <button
              type="button"
              onClick={() => setShowAll((v) => !v)}
              className="mt-1 inline-flex items-center gap-1 text-[11px] font-medium text-primary hover:underline"
            >
              <ChevronDown className={cn('size-3', showAll ? 'rotate-180' : '')} />
              {showAll ? 'Show fewer' : `Show ${hiddenCount} more`}
            </button>
          ) : null}
        </div>
      ) : null}
    </section>
  )
}

// ── ActiveFiltersPanel ──────────────────────────────────────────────────
//
// KCAC's "فلتره چالاکهکان" — a collapsible block at the top of the sidebar
// that lists the currently-applied filters as removable chips, plus a
// "Clear all" link. Hidden when nothing is active.

function ActiveFiltersPanel({ selected, facetMap, onRemove, onClear, dateFrom, dateTo, onClearDate }) {
  const flat = []
  for (const group of facetMap) {
    for (const value of selected[group.paramKey] || []) {
      flat.push({ paramKey: group.paramKey, title: group.title, value })
    }
  }
  const hasDate = Boolean(dateFrom || dateTo)
  if (flat.length === 0 && !hasDate) return null

  return (
    <section className="border-t border-border/30 bg-card-foreground/[0.03]">
      <div className="flex items-center justify-between gap-2 px-4 py-3">
        <span className="text-[13px] font-semibold tracking-tight text-foreground">
          Active filters
        </span>
        <button
          type="button"
          onClick={onClear}
          className="inline-flex items-center gap-1 text-[11px] font-medium text-muted-foreground hover:text-foreground"
        >
          <RotateCcw className="size-3" />
          Clear all
        </button>
      </div>
      <div className="flex flex-wrap gap-1.5 px-4 pb-4">
        {flat.map((chip) => (
          <button
            key={`${chip.paramKey}-${chip.value}`}
            type="button"
            onClick={() => onRemove(chip.paramKey, chip.value)}
            className="inline-flex items-center gap-1 rounded-md border border-primary/30 bg-primary/15 px-2 py-1 text-[11px] font-medium text-primary hover:bg-primary/25"
          >
            <span className="font-normal opacity-70">{chip.title}:</span>
            {chip.value}
            <X className="size-2.5" />
          </button>
        ))}
        {hasDate ? (
          <button
            type="button"
            onClick={onClearDate}
            className="inline-flex items-center gap-1 rounded-md border border-primary/30 bg-primary/15 px-2 py-1 text-[11px] font-medium text-primary hover:bg-primary/25"
          >
            <CalendarDays className="size-3" />
            {dateFrom || '…'} → {dateTo || '…'}
            <X className="size-2.5" />
          </button>
        ) : null}
      </div>
    </section>
  )
}

// ── FacetSidebar ────────────────────────────────────────────────────────
//
// Right rail rendered next to a media list. KCAC-styled — dark surface,
// chip buttons with leading count cell, collapsible sections.

function FacetSidebar({
  facetMap,
  selected,
  onChange,
  onReset,
  searchValue,
  onSearchChange,
  onSearchSubmit,
  searchPlaceholder = 'Search by title…',
  showDateRange = false,
  dateFrom = '',
  dateTo = '',
  onDateChange,
  preface,
}) {
  const [facets, setFacets] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)
  const [draftFrom, setDraftFrom] = useState(dateFrom)
  const [draftTo, setDraftTo] = useState(dateTo)

  useEffect(() => {
    const ctrl = new AbortController()
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setLoading(true)
    setError(false)
    guestFacets({ signal: ctrl.signal })
      .then((data) => setFacets(data || null))
      .catch((err) => {
        if (err?.code === 'ERR_CANCELED') return
        setError(true)
      })
      .finally(() => setLoading(false))
    return () => ctrl.abort()
  }, [])

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setDraftFrom(dateFrom)
    setDraftTo(dateTo)
  }, [dateFrom, dateTo])

  const handleToggle = (paramKey, value) => {
    const current = new Set(selected[paramKey] || [])
    if (current.has(value)) current.delete(value)
    else current.add(value)
    const next = Array.from(current)
    onChange({ [paramKey]: next.length === 0 ? null : next.join(',') })
  }

  const submitDateRange = (e) => {
    e.preventDefault()
    onDateChange?.({
      dateFrom: draftFrom || null,
      dateTo: draftTo || null,
    })
  }

  const clearDateRange = () => {
    setDraftFrom('')
    setDraftTo('')
    onDateChange?.({ dateFrom: null, dateTo: null })
  }

  return (
    <aside className="overflow-hidden rounded-2xl border border-border bg-card text-card-foreground shadow-sm shadow-black/5">
      {/* ── Search input ─────────────────────────────────────────── */}
      {onSearchChange ? (
        <form
          onSubmit={(e) => {
            e.preventDefault()
            onSearchSubmit?.()
          }}
          className="border-b border-border/40 bg-card-foreground/[0.03] px-4 py-3"
        >
          <div className="flex h-9 items-center gap-2 rounded-md border border-border/40 bg-card-foreground/[0.04] px-2.5 focus-within:border-primary/40 focus-within:ring-2 focus-within:ring-primary/20">
            <Search className="size-3.5 shrink-0 text-muted-foreground" />
            <input
              type="search"
              value={searchValue || ''}
              onChange={(e) => onSearchChange(e.target.value)}
              placeholder={searchPlaceholder}
              className="h-full w-full min-w-0 bg-transparent text-xs outline-none placeholder:text-muted-foreground/70"
            />
            {searchValue ? (
              <button
                type="button"
                onClick={() => onSearchChange('')}
                className="text-muted-foreground hover:text-foreground"
                aria-label="Clear"
              >
                <X className="size-3" />
              </button>
            ) : null}
          </div>
        </form>
      ) : null}

      {/* ── Preface (e.g. TypePicker) ───────────────────────────── */}
      {preface}

      {/* ── Active filters ──────────────────────────────────────── */}
      <ActiveFiltersPanel
        selected={selected}
        facetMap={facetMap}
        onRemove={(paramKey, value) => {
          const list = selected[paramKey] || []
          const next = list.filter((v) => v !== value)
          onChange({ [paramKey]: next.length === 0 ? null : next.join(',') })
        }}
        onClear={onReset}
        dateFrom={dateFrom}
        dateTo={dateTo}
        onClearDate={clearDateRange}
      />

      {/* ── Date range ──────────────────────────────────────────── */}
      {showDateRange ? (
        <section className="border-t border-border/30">
          <div className="flex items-center gap-2 px-4 py-3">
            <CalendarDays className="size-3.5 text-muted-foreground" />
            <span className="text-[13px] font-semibold tracking-tight text-foreground">
              Date range
            </span>
          </div>
          <form onSubmit={submitDateRange} className="space-y-2 px-4 pb-4">
            <label className="flex items-center gap-2">
              <span className="w-10 shrink-0 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                From
              </span>
              <input
                type="date"
                value={draftFrom}
                onChange={(e) => setDraftFrom(e.target.value)}
                className="h-7 w-full rounded-md border border-border/40 bg-card-foreground/[0.04] px-2 text-[11px] outline-none focus-visible:border-primary/40 focus-visible:ring-2 focus-visible:ring-primary/20"
              />
            </label>
            <label className="flex items-center gap-2">
              <span className="w-10 shrink-0 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                To
              </span>
              <input
                type="date"
                value={draftTo}
                onChange={(e) => setDraftTo(e.target.value)}
                className="h-7 w-full rounded-md border border-border/40 bg-card-foreground/[0.04] px-2 text-[11px] outline-none focus-visible:border-primary/40 focus-visible:ring-2 focus-visible:ring-primary/20"
              />
            </label>
            <button
              type="submit"
              disabled={draftFrom === dateFrom && draftTo === dateTo}
              className="h-7 w-full rounded-md bg-primary text-[11px] font-semibold text-primary-foreground transition-colors hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-40"
            >
              Apply date range
            </button>
          </form>
        </section>
      ) : null}

      {/* ── Facet groups ────────────────────────────────────────── */}
      {loading ? (
        <div className="space-y-3 px-4 py-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="space-y-1.5">
              <Skeleton className="h-3 w-24" />
              <div className="grid grid-cols-2 gap-1.5">
                <Skeleton className="h-7" />
                <Skeleton className="h-7" />
                <Skeleton className="h-7" />
                <Skeleton className="h-7" />
              </div>
            </div>
          ))}
        </div>
      ) : error ? (
        <p className="px-4 py-4 text-xs text-muted-foreground">Couldn’t load filters.</p>
      ) : (
        <div>
          {facetMap.map((group) => {
            const entries = readFacet(facets, group.facetKey)
            if (entries.length === 0) return null
            const sel = new Set(selected[group.paramKey] || [])
            return (
              <FacetGroup
                key={group.paramKey}
                title={group.title}
                entries={entries}
                selected={sel}
                onToggle={(value) => handleToggle(group.paramKey, value)}
                initiallyOpen={group.initiallyOpen ?? sel.size > 0 ? true : true}
                initialMaxVisible={group.maxVisible ?? 6}
              />
            )
          })}
        </div>
      )}
    </aside>
  )
}

// ── ToolbarBar (the olive band above the result grid) ──────────────────

function ResultsToolbar({
  totalElements,
  loaded,
  sortValue,
  sorts,
  onSortChange,
  onToggleFilters,
  filtersOpen,
}) {
  return (
    <div className="mb-4 flex items-center gap-3 rounded-xl border border-border bg-gradient-to-r from-primary/15 via-primary/10 to-primary/5 px-3 py-2 shadow-sm shadow-black/5 sm:px-4">
      <button
        type="button"
        onClick={onToggleFilters}
        aria-pressed={filtersOpen}
        title="Toggle filters"
        className="flex size-8 items-center justify-center rounded-lg bg-background/70 text-foreground/80 ring-1 ring-foreground/10 transition hover:bg-background hover:text-foreground lg:hidden"
      >
        <SlidersHorizontal className="size-4" />
      </button>

      <div className="flex flex-1 items-baseline gap-2 font-mono tabular-nums text-foreground">
        <span className="text-base font-bold">
          {Number.isFinite(loaded) ? loaded.toLocaleString() : '—'}
        </span>
        <span className="text-xs text-muted-foreground">/</span>
        <span className="text-sm">
          {Number.isFinite(totalElements) ? totalElements.toLocaleString() : '—'}
        </span>
        <span className="hidden text-[11px] font-sans uppercase tracking-[0.16em] text-muted-foreground sm:inline">
          results
        </span>
      </div>

      <div className="hidden items-center gap-2 sm:flex">
        <span className="text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
          Sort by
        </span>
        <SortMenu value={sortValue} sorts={sorts} onChange={onSortChange} />
      </div>
      <div className="sm:hidden">
        <SortMenu value={sortValue} sorts={sorts} onChange={onSortChange} compact />
      </div>
    </div>
  )
}

function SortMenu({ value, sorts, onChange, compact = false }) {
  return (
    <div className="flex items-center gap-0.5 rounded-lg bg-background/70 p-0.5 ring-1 ring-foreground/10">
      {sorts.map((s) => {
        const Icon = s.icon
        const v = `${s.key}:${s.dir}`
        const active = value === v
        return (
          <button
            key={v}
            type="button"
            onClick={() => onChange(v)}
            title={s.label}
            className={cn(
              'flex items-center gap-1 rounded-md px-2 py-1 text-xs font-medium transition-colors',
              active
                ? 'bg-primary text-primary-foreground shadow-sm'
                : 'text-muted-foreground hover:bg-muted hover:text-foreground',
            )}
          >
            <Icon className="size-3" />
            {compact ? null : <span className="hidden sm:inline">{s.label}</span>}
          </button>
        )
      })}
    </div>
  )
}

function FilterToggleBadge({ count, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="relative flex size-9 items-center justify-center rounded-lg border border-border bg-background text-foreground/80 shadow-sm hover:bg-muted hover:text-foreground"
    >
      <Filter className="size-4" />
      {count > 0 ? (
        <span className="absolute -right-1 -top-1 inline-flex size-4 min-w-4 items-center justify-center rounded-full bg-primary text-[9px] font-bold text-primary-foreground">
          {count}
        </span>
      ) : null}
    </button>
  )
}

export { FacetSidebar, ResultsToolbar, FilterToggleBadge }
