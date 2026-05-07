import { useEffect, useMemo, useState } from 'react'
import {
  CalendarDays,
  ChevronDown,
  RotateCcw,
  Search as SearchIcon,
  X,
} from 'lucide-react'

import { MorphSearch } from '@/components/public/MorphSearch'
import { Skeleton } from '@/components/ui/skeleton'
import { cn } from '@/lib/utils'
import {
  personImageSrc,
  personInitials,
  readFacet,
} from '@/components/public/public-helpers'
import { guestFacets } from '@/services/guest'

// ── BrowseSidebar ───────────────────────────────────────────────────────
//
// The left command rail of the browse page. Distinct from the page's
// surface — its own dark glass-morphism panel — so it reads as a separate
// "control room". Top-down stack:
//
//   1. MorphSearch — animated, gradient-bordered search bar with cycling
//      placeholder, popular-query chips, and a Lucky button. The page's
//      ONLY search input lives here.
//   2. Active filters — coloured stones for every applied facet, with a
//      one-click "Reset everything" link. Hidden when nothing is active.
//   3. Type rail — vertical list of entity types (Audios / Videos / …)
//      each row showing icon + label + count, the active row marked with
//      a side stripe. Replaces the tabs the user explicitly asked us not
//      to use.
//   4. Date range — From / To pickers (when the active type accepts them).
//   5. Facet groups — collapsible chip-button groups for Categories,
//      Persons, Languages, Dialects, Genres, Tags, Keywords. Person chips
//      render with the person's circular avatar so a face is always
//      attached to a name.

function BrowseSidebar({
  // search
  searchValue,
  onSearchChange,
  onSearchSubmit,
  popularSearches,
  // type picker
  types,
  activeType,
  onTypeChange,
  // facets
  facetMap,
  selected,
  onChange,
  onReset,
  // date range
  showDateRange = false,
  dateFrom = '',
  dateTo = '',
  onDateChange,
}) {
  const [facets, setFacets] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)

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

  const totalActive =
    (searchValue ? 1 : 0) +
    (dateFrom || dateTo ? 1 : 0) +
    Object.values(selected).reduce(
      (acc, list) => acc + (Array.isArray(list) ? list.length : 0),
      0,
    )

  const removeFacetValue = (paramKey, value) => {
    const list = selected[paramKey] || []
    const next = list.filter((v) => v !== value)
    onChange({ [paramKey]: next.length === 0 ? null : next.join(',') })
  }

  return (
    <aside className="flex flex-col gap-4 rounded-3xl bg-[oklch(0.16_0_0)] p-4 text-white shadow-2xl shadow-black/20 ring-1 ring-white/5 sm:p-5">
      {/* ── Search ─────────────────────────────────────────────── */}
      <MorphSearch
        value={searchValue}
        onChange={onSearchChange}
        onSubmit={onSearchSubmit}
        suggestions={popularSearches}
      />

      {/* ── Active filter stones ──────────────────────────────── */}
      {totalActive > 0 ? (
        <ActiveStones
          searchValue={searchValue}
          onClearSearch={() => {
            onSearchChange('')
            onSearchSubmit?.('')
          }}
          dateFrom={dateFrom}
          dateTo={dateTo}
          onClearDate={() => onDateChange?.({ dateFrom: null, dateTo: null })}
          selected={selected}
          facetMap={facetMap}
          onRemoveFacet={removeFacetValue}
          onResetAll={onReset}
        />
      ) : null}

      {/* ── Type rail ─────────────────────────────────────────── */}
      <Block label="Showing">
        <ul className="space-y-0.5">
          {types.map((t) => {
            const Icon = t.icon
            const active = t.key === activeType
            return (
              <li key={t.key}>
                <button
                  type="button"
                  onClick={() => onTypeChange(t.key)}
                  className={cn(
                    'group/type relative flex w-full items-center gap-2.5 rounded-xl px-2.5 py-2 text-left text-[13px] font-medium transition-colors',
                    active
                      ? 'bg-white/10 text-white'
                      : 'text-white/70 hover:bg-white/5 hover:text-white',
                  )}
                >
                  {active ? (
                    <span
                      aria-hidden="true"
                      className="absolute inset-y-1 left-0 w-0.5 rounded-r-full bg-primary"
                    />
                  ) : null}
                  <span
                    className={cn(
                      'flex size-7 shrink-0 items-center justify-center rounded-lg transition-colors',
                      active
                        ? 'bg-primary/25 text-primary'
                        : 'bg-white/[0.06] text-white/60 group-hover/type:bg-white/10 group-hover/type:text-white',
                    )}
                  >
                    <Icon className="size-3.5" />
                  </span>
                  <span className="min-w-0 flex-1 truncate">{t.label}</span>
                </button>
              </li>
            )
          })}
        </ul>
      </Block>

      {/* ── Date range ────────────────────────────────────────── */}
      {showDateRange ? (
        <DateRangeBlock
          dateFrom={dateFrom}
          dateTo={dateTo}
          onApply={(payload) => onDateChange?.(payload)}
        />
      ) : null}

      {/* ── Facet groups ──────────────────────────────────────── */}
      {loading ? (
        <Block label="Filters">
          <div className="space-y-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="space-y-1.5">
                <Skeleton className="h-3 w-24 bg-white/15" />
                <div className="grid grid-cols-2 gap-1.5">
                  <Skeleton className="h-7 bg-white/10" />
                  <Skeleton className="h-7 bg-white/10" />
                  <Skeleton className="h-7 bg-white/10" />
                  <Skeleton className="h-7 bg-white/10" />
                </div>
              </div>
            ))}
          </div>
        </Block>
      ) : error ? (
        <Block label="Filters">
          <p className="px-1 text-xs text-white/50">Couldn’t load filters.</p>
        </Block>
      ) : (
        <div className="space-y-2">
          {facetMap.map((group) => {
            const entries = readFacet(facets, group.facetKey)
            if (entries.length === 0) return null
            const sel = new Set(selected[group.paramKey] || [])
            return (
              <FacetBlock
                key={group.paramKey}
                title={group.title}
                kind={group.facetKey}
                entries={entries}
                selected={sel}
                onToggle={(value) => {
                  const current = new Set(sel)
                  if (current.has(value)) current.delete(value)
                  else current.add(value)
                  const next = Array.from(current)
                  onChange({ [group.paramKey]: next.length === 0 ? null : next.join(',') })
                }}
              />
            )
          })}
        </div>
      )}
    </aside>
  )
}

// ── ActiveStones ────────────────────────────────────────────────────────
function ActiveStones({
  searchValue,
  onClearSearch,
  dateFrom,
  dateTo,
  onClearDate,
  selected,
  facetMap,
  onRemoveFacet,
  onResetAll,
}) {
  const flat = []
  if (searchValue) {
    flat.push({ key: 'q', label: 'Search', value: `"${searchValue}"`, onClear: onClearSearch })
  }
  if (dateFrom || dateTo) {
    flat.push({
      key: 'date',
      label: 'Date',
      value: `${dateFrom || '…'} → ${dateTo || '…'}`,
      onClear: onClearDate,
    })
  }
  for (const group of facetMap) {
    for (const value of selected[group.paramKey] || []) {
      flat.push({
        key: `${group.paramKey}-${value}`,
        label: group.title,
        value,
        onClear: () => onRemoveFacet(group.paramKey, value),
      })
    }
  }
  return (
    <div className="rounded-2xl bg-white/5 p-3 ring-1 ring-white/5">
      <div className="mb-2 flex items-center justify-between gap-2">
        <span className="text-[11px] font-semibold uppercase tracking-[0.18em] text-white/60">
          Active filters
        </span>
        <button
          type="button"
          onClick={onResetAll}
          className="inline-flex items-center gap-1 text-[11px] font-medium text-white/60 hover:text-white"
        >
          <RotateCcw className="size-3" />
          Reset
        </button>
      </div>
      <div className="flex flex-wrap gap-1.5">
        {flat.map((stone) => (
          <button
            key={stone.key}
            type="button"
            onClick={stone.onClear}
            className="group/stone inline-flex items-center gap-1.5 overflow-hidden rounded-lg bg-primary/20 py-1 pl-2 pr-1.5 text-[11px] font-medium text-primary-foreground ring-1 ring-primary/40 transition hover:bg-primary/30"
          >
            <span className="text-primary-foreground/70">{stone.label}:</span>
            <span className="max-w-[140px] truncate">{stone.value}</span>
            <X className="size-2.5 opacity-70 group-hover/stone:opacity-100" />
          </button>
        ))}
      </div>
    </div>
  )
}

// ── Block (section frame) ──────────────────────────────────────────────
function Block({ label, action, children }) {
  return (
    <section className="rounded-2xl bg-white/[0.04] p-3 ring-1 ring-white/5">
      <div className="mb-2 flex items-center justify-between gap-2 px-1">
        <span className="text-[11px] font-semibold uppercase tracking-[0.18em] text-white/60">
          {label}
        </span>
        {action}
      </div>
      {children}
    </section>
  )
}

// ── FacetBlock ─────────────────────────────────────────────────────────
function FacetBlock({ title, kind, entries, selected, onToggle }) {
  const [open, setOpen] = useState(true)
  const [showAll, setShowAll] = useState(false)
  const [filter, setFilter] = useState('')
  const isPersonsFacet = kind === 'persons'

  const filtered = useMemo(() => {
    if (!filter.trim()) return entries
    const needle = filter.trim().toLowerCase()
    return entries.filter((e) => e.value.toLowerCase().includes(needle))
  }, [entries, filter])

  const max = isPersonsFacet ? 8 : 6
  const visible = showAll ? filtered : filtered.slice(0, max)
  const hidden = Math.max(0, filtered.length - max)
  const selectedCount = entries.filter((e) =>
    selected.has(e.code || e.value),
  ).length

  return (
    <section className="rounded-2xl bg-white/[0.04] ring-1 ring-white/5">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="flex w-full items-center justify-between gap-2 px-3 py-2.5"
      >
        <span className="flex items-center gap-2">
          <span className="text-[12px] font-semibold tracking-tight text-white">
            {title}
          </span>
          {selectedCount > 0 ? (
            <span className="inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[10px] font-bold text-primary-foreground">
              {selectedCount}
            </span>
          ) : (
            <span className="text-[10px] font-mono text-white/40">{entries.length}</span>
          )}
        </span>
        <ChevronDown
          className={cn(
            'size-3.5 shrink-0 text-white/50 transition-transform',
            open ? 'rotate-180' : '',
          )}
        />
      </button>

      {open ? (
        <div className="space-y-2 px-3 pb-3">
          {entries.length > 6 ? (
            <div className="relative">
              <SearchIcon className="pointer-events-none absolute left-2 top-1/2 size-3 -translate-y-1/2 text-white/40" />
              <input
                type="search"
                value={filter}
                onChange={(e) => setFilter(e.target.value)}
                placeholder={`Filter ${title.toLowerCase()}…`}
                className="h-7 w-full rounded-lg bg-white/[0.06] pl-7 pr-2 text-[11px] text-white outline-none placeholder:text-white/40 focus-visible:ring-2 focus-visible:ring-primary/40"
              />
            </div>
          ) : null}

          {isPersonsFacet ? (
            <ul className="space-y-0.5">
              {visible.map((entry) => {
                const key = entry.code || entry.value
                return (
                  <PersonRow
                    key={key}
                    entry={entry}
                    selected={selected.has(key)}
                    onClick={() => onToggle(key)}
                  />
                )
              })}
            </ul>
          ) : (
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
          )}

          {hidden > 0 ? (
            <button
              type="button"
              onClick={() => setShowAll((v) => !v)}
              className="inline-flex items-center gap-1 text-[11px] font-medium text-primary hover:underline"
            >
              <ChevronDown className={cn('size-3', showAll ? 'rotate-180' : '')} />
              {showAll ? 'Show fewer' : `Show ${hidden} more`}
            </button>
          ) : null}
        </div>
      ) : null}
    </section>
  )
}

// Generic chip — count cell on the left, label on the right.
function FacetChip({ entry, selected, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={entry.value}
      aria-pressed={selected}
      className={cn(
        'group/chip flex h-8 w-full items-center gap-2 overflow-hidden rounded-lg text-left text-[11px] font-medium transition-colors',
        selected
          ? 'bg-primary text-primary-foreground'
          : 'bg-white/[0.06] text-white/85 hover:bg-white/10 hover:text-white',
      )}
    >
      <span
        className={cn(
          'flex h-full min-w-9 items-center justify-center px-1.5 font-mono text-[10px] tabular-nums',
          selected
            ? 'bg-primary-foreground/15 text-primary-foreground'
            : 'bg-white/[0.06] text-white/60 group-hover/chip:bg-white/[0.12]',
        )}
      >
        {entry.count.toLocaleString()}
      </span>
      <span className="min-w-0 flex-1 truncate pr-2">{entry.value}</span>
    </button>
  )
}

// Person row — circular avatar (real photo when available, initials
// otherwise) + name + count. Uses our real image resolver so an
// uploaded portrait of e.g. Hesen Zirek shows up here.
function PersonRow({ entry, selected, onClick }) {
  // Facet entries don't carry the full person object, so we synthesize a
  // stub for the resolver. When the backend later inlines a `profileImage`
  // on facet rows, it'll be picked up automatically.
  const stub = {
    profileImage: entry.image,
    profileImageUrl: entry.image,
  }
  const src = personImageSrc(stub)
  const initials = personInitials(entry.value)
  return (
    <li>
      <button
        type="button"
        onClick={onClick}
        aria-pressed={selected}
        className={cn(
          'group/row flex w-full items-center gap-2.5 overflow-hidden rounded-lg px-2 py-1.5 text-left transition-colors',
          selected ? 'bg-primary/30 text-white' : 'hover:bg-white/[0.06]',
        )}
      >
        <span
          className={cn(
            'flex size-7 shrink-0 items-center justify-center overflow-hidden rounded-full text-[10px] font-bold ring-1 ring-white/15',
            selected
              ? 'bg-primary-foreground/20 text-primary-foreground'
              : 'bg-white/[0.07] text-white/80',
          )}
        >
          {src ? (
            <img src={src} alt="" className="size-full object-cover" />
          ) : (
            initials
          )}
        </span>
        <span className="min-w-0 flex-1 truncate text-[12px] font-medium text-white/90">
          {entry.value}
        </span>
        <span
          className={cn(
            'shrink-0 font-mono text-[10px] tabular-nums',
            selected ? 'text-white/90' : 'text-white/50',
          )}
        >
          {entry.count.toLocaleString()}
        </span>
      </button>
    </li>
  )
}

// ── DateRangeBlock ─────────────────────────────────────────────────────
function DateRangeBlock({ dateFrom, dateTo, onApply }) {
  const [draftFrom, setDraftFrom] = useState(dateFrom)
  const [draftTo, setDraftTo] = useState(dateTo)

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setDraftFrom(dateFrom)
    setDraftTo(dateTo)
  }, [dateFrom, dateTo])

  const dirty = draftFrom !== dateFrom || draftTo !== dateTo

  return (
    <Block
      label="Date range"
      action={<CalendarDays className="size-3.5 text-white/40" />}
    >
      <form
        onSubmit={(e) => {
          e.preventDefault()
          onApply({ dateFrom: draftFrom || null, dateTo: draftTo || null })
        }}
        className="space-y-1.5"
      >
        <label className="flex items-center gap-2">
          <span className="w-9 shrink-0 text-[10px] font-semibold uppercase tracking-wider text-white/50">
            From
          </span>
          <input
            type="date"
            value={draftFrom}
            onChange={(e) => setDraftFrom(e.target.value)}
            className="h-7 w-full rounded-lg bg-white/[0.06] px-2 text-[11px] text-white outline-none focus-visible:ring-2 focus-visible:ring-primary/40 [color-scheme:dark]"
          />
        </label>
        <label className="flex items-center gap-2">
          <span className="w-9 shrink-0 text-[10px] font-semibold uppercase tracking-wider text-white/50">
            To
          </span>
          <input
            type="date"
            value={draftTo}
            onChange={(e) => setDraftTo(e.target.value)}
            className="h-7 w-full rounded-lg bg-white/[0.06] px-2 text-[11px] text-white outline-none focus-visible:ring-2 focus-visible:ring-primary/40 [color-scheme:dark]"
          />
        </label>
        <button
          type="submit"
          disabled={!dirty}
          className="h-7 w-full rounded-lg bg-primary text-[11px] font-semibold text-primary-foreground transition-colors hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-40"
        >
          Apply
        </button>
      </form>
    </Block>
  )
}

export { BrowseSidebar }
