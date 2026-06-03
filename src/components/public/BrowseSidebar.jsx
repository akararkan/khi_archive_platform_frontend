import { useEffect, useMemo, useState } from 'react'
import {
  AudioLines,
  CalendarClock,
  CalendarRange,
  ChevronDown,
  FileText,
  Filter,
  Image as ImageIcon,
  Layers,
  Printer,
  RotateCcw,
  Search as SearchIcon,
  SlidersHorizontal,
  Video as VideoIcon,
  X,
} from 'lucide-react'

import { Highlight } from '@/components/ui/highlight'
import { Skeleton } from '@/components/ui/skeleton'
import { Slider } from '@/components/ui/slider'
import { cn } from '@/lib/utils'
import {
  personImageSrc,
  personInitials,
  readFacet,
} from '@/components/public/public-helpers'
import { guestFacets } from '@/services/guest'

const YEAR_MIN = 1960
const YEAR_MAX = new Date().getFullYear()
const DECADE_PRESETS = [
  { label: '60s', from: 1960, to: 1969 },
  { label: '70s', from: 1970, to: 1979 },
  { label: '80s', from: 1980, to: 1989 },
  { label: '90s', from: 1990, to: 1999 },
  { label: '00s', from: 2000, to: 2009 },
  { label: '10s', from: 2010, to: 2019 },
  { label: '20s', from: 2020, to: YEAR_MAX },
]

const MEDIA_KIND_ICONS = {
  audio: AudioLines,
  video: VideoIcon,
  text:  FileText,
  image: ImageIcon,
}
const MEDIA_KIND_LABELS = {
  audio: 'Audios',
  video: 'Videos',
  text:  'Texts',
  image: 'Images',
}

function BrowseSidebar({
  types,
  activeType,
  onTypeChange,
  facetMap,
  selected,
  onChange,
  onReset,
  searchValue,
  onClearSearch,
  showDateRange = false,
  dateFrom = '',
  dateTo = '',
  onDateChange,
  showPublishedRange = false,
  publishedFrom = '',
  publishedTo = '',
  onPublishedDateChange,
  showPrintRange = false,
  printDateFrom = '',
  printDateTo = '',
  onPrintDateChange,
  yearBuckets = null,
  textFilters = [],
  textFilterValues = {},
  onTextFilterChange,
  showMediaTypes = false,
  mediaKinds = [],
  mediaTypeCounts = {},
  selectedMediaTypes = [],
  onMediaTypesChange,
}) {
  const [facets,  setFacets]  = useState(null)
  const [loading, setLoading] = useState(true)
  const [error,   setError]   = useState(false)

  useEffect(() => {
    const ctrl = new AbortController()
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setLoading(true)
    setError(false)
    guestFacets({ signal: ctrl.signal })
      .then((data) => setFacets(data || null))
      .catch((err) => { if (err?.code !== 'ERR_CANCELED') setError(true) })
      .finally(() => setLoading(false))
    return () => ctrl.abort()
  }, [])

  const mediaTypesActive =
    showMediaTypes &&
    selectedMediaTypes.length > 0 &&
    selectedMediaTypes.length < (mediaKinds.length || 4)

  const activeTextFilters = textFilters.filter(
    (f) => (textFilterValues[f.paramKey] || '').trim().length > 0,
  )

  const totalActive =
    (searchValue ? 1 : 0) +
    (dateFrom || dateTo ? 1 : 0) +
    (publishedFrom || publishedTo ? 1 : 0) +
    (printDateFrom || printDateTo ? 1 : 0) +
    (mediaTypesActive ? 1 : 0) +
    activeTextFilters.length +
    Object.values(selected).reduce(
      (acc, list) => acc + (Array.isArray(list) ? list.length : 0),
      0,
    )

  const toggleMediaKind = (kind) => {
    if (typeof onMediaTypesChange !== 'function') return
    const set = new Set(selectedMediaTypes)
    if (set.has(kind)) set.delete(kind)
    else set.add(kind)
    onMediaTypesChange(Array.from(set))
  }

  const removeFacetValue = (paramKey, value) => {
    const list = selected[paramKey] || []
    const next = list.filter((v) => v !== value)
    onChange({ [paramKey]: next.length === 0 ? null : next.join(',') })
  }

  return (
    <div className="browse-sidebar flex h-full min-h-full flex-col">

      {/* ── Masthead ─────────────────────────────────────────────── */}
      <div className="flex items-center justify-between gap-3 border-b border-sidebar-border bg-sidebar/95 px-5 py-4">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="grid size-7 shrink-0 place-items-center rounded-lg bg-sidebar-accent text-sidebar-foreground">
            <Filter className="size-3.5" />
          </div>
          <div>
            <p className="text-[9px] font-bold uppercase tracking-[0.2em] text-muted-foreground/50">
              The archive
            </p>
            <h2 className="flex items-center gap-1.5 text-[13px] font-semibold tracking-tight text-foreground">
              Filters
              {totalActive > 0 ? (
                <span className="inline-grid h-5 min-w-5 place-items-center rounded-full bg-primary px-1 text-[10px] font-bold text-primary-foreground">
                  {totalActive}
                </span>
              ) : null}
            </h2>
          </div>
        </div>

        {totalActive > 0 ? (
          <button
            type="button"
            onClick={onReset}
            className="flex shrink-0 items-center gap-1 rounded-md px-2 py-1 text-[11px] font-medium text-muted-foreground transition hover:bg-sidebar-accent hover:text-foreground"
          >
            <RotateCcw className="size-3" />
            Clear all
          </button>
        ) : null}
      </div>

      {/* ── Type rail ─────────────────────────────────────────────── */}
      <div className="border-b border-sidebar-border px-3 py-3">
        <p className="mb-2 px-1 text-[9px] font-bold uppercase tracking-[0.2em] text-muted-foreground/50">
          Showing
        </p>
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
                    'group/type relative flex w-full items-center gap-2.5 rounded-md px-2.5 py-2 text-left text-[13px] font-medium transition-colors',
                    active
                      ? 'bg-sidebar-accent text-sidebar-accent-foreground'
                      : 'text-muted-foreground hover:bg-sidebar-accent/60 hover:text-foreground',
                  )}
                >
                  {active ? (
                    <span
                      aria-hidden
                      className="absolute inset-y-1.5 left-0 w-[3px] rounded-r-full bg-primary"
                    />
                  ) : null}
                  <Icon
                    className={cn(
                      'size-4 shrink-0 transition-colors',
                      active
                        ? 'text-primary'
                        : 'text-muted-foreground/70 group-hover/type:text-foreground',
                    )}
                  />
                  <span className="min-w-0 flex-1 truncate">{t.label}</span>
                  <span
                    className={cn(
                      'shrink-0 font-mono text-[11px] tabular-nums',
                      active ? 'font-semibold text-foreground' : 'text-muted-foreground/60',
                    )}
                  >
                    {Number.isFinite(t.count) ? t.count.toLocaleString() : ''}
                  </span>
                </button>
              </li>
            )
          })}
        </ul>
      </div>

      {/* ── Active stones ─────────────────────────────────────────── */}
      {totalActive > 0 ? (
        <div className="border-b border-sidebar-border bg-sidebar-accent/30 px-4 py-3">
          <p className="mb-2 text-[9px] font-bold uppercase tracking-[0.2em] text-muted-foreground/50">
            Active filters
          </p>
          <div className="flex flex-wrap gap-1.5">
            {searchValue ? (
              <Stone label="Search" value={`"${searchValue}"`} onClear={onClearSearch} />
            ) : null}
            {dateFrom || dateTo ? (
              <Stone
                label="Created"
                value={`${shortDate(dateFrom) || '…'} – ${shortDate(dateTo) || '…'}`}
                onClear={() => onDateChange?.({ dateFrom: null, dateTo: null })}
              />
            ) : null}
            {publishedFrom || publishedTo ? (
              <Stone
                label="Published"
                value={`${shortDate(publishedFrom) || '…'} – ${shortDate(publishedTo) || '…'}`}
                onClear={() => onPublishedDateChange?.({ publishedFrom: null, publishedTo: null })}
              />
            ) : null}
            {printDateFrom || printDateTo ? (
              <Stone
                label="Printed"
                value={`${shortDate(printDateFrom) || '…'} – ${shortDate(printDateTo) || '…'}`}
                onClear={() => onPrintDateChange?.({ printDateFrom: null, printDateTo: null })}
              />
            ) : null}
            {facetMap.flatMap((g) =>
              (selected[g.paramKey] || []).map((v) => (
                <Stone
                  key={`${g.paramKey}-${v}`}
                  label={g.title}
                  value={v}
                  onClear={() => removeFacetValue(g.paramKey, v)}
                />
              )),
            )}
            {activeTextFilters.map((f) => (
              <Stone
                key={`tf-${f.paramKey}`}
                label={f.label}
                value={textFilterValues[f.paramKey]}
                onClear={() => onTextFilterChange?.(f.paramKey, '')}
              />
            ))}
            {mediaTypesActive
              ? selectedMediaTypes.map((k) => (
                  <Stone
                    key={`mt-${k}`}
                    label="Type"
                    value={MEDIA_KIND_LABELS[k] || k}
                    onClear={() => toggleMediaKind(k)}
                  />
                ))
              : null}
          </div>
        </div>
      ) : null}

      {/* ── Media types ───────────────────────────────────────────── */}
      {showMediaTypes ? (
        <MediaTypesFacet
          kinds={mediaKinds}
          counts={mediaTypeCounts}
          selected={selectedMediaTypes}
          onToggle={toggleMediaKind}
          onClear={() => onMediaTypesChange?.([])}
        />
      ) : null}

      {/* ── Date created ──────────────────────────────────────────── */}
      {showDateRange ? (
        <YearRangeFacet
          title="Date created"
          HeaderIcon={CalendarRange}
          fromKey="dateFrom"
          toKey="dateTo"
          fromValue={dateFrom}
          toValue={dateTo}
          buckets={yearBuckets}
          onApply={(payload) => onDateChange?.(payload)}
        />
      ) : null}

      {/* ── Date published ────────────────────────────────────────── */}
      {showPublishedRange ? (
        <YearRangeFacet
          title="Date published"
          HeaderIcon={CalendarClock}
          fromKey="publishedFrom"
          toKey="publishedTo"
          fromValue={publishedFrom}
          toValue={publishedTo}
          onApply={(payload) => onPublishedDateChange?.(payload)}
        />
      ) : null}

      {/* ── Print date ────────────────────────────────────────────── */}
      {showPrintRange ? (
        <YearRangeFacet
          title="Print date"
          HeaderIcon={Printer}
          fromKey="printDateFrom"
          toKey="printDateTo"
          fromValue={printDateFrom}
          toValue={printDateTo}
          onApply={(payload) => onPrintDateChange?.(payload)}
        />
      ) : null}

      {/* ── Search within ─────────────────────────────────────────── */}
      {textFilters.length > 0 ? (
        <TextFiltersGroup
          filters={textFilters}
          values={textFilterValues}
          onChange={onTextFilterChange}
        />
      ) : null}

      {/* ── Facet groups ──────────────────────────────────────────── */}
      {loading ? (
        <div className="space-y-4 px-5 py-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="space-y-1.5">
              <Skeleton className="h-3 w-20 rounded" />
              <Skeleton className="h-8 rounded-md" />
              <Skeleton className="h-8 w-2/3 rounded-md" />
            </div>
          ))}
        </div>
      ) : error ? (
        <p className="px-5 py-4 text-xs text-muted-foreground">Couldn't load filters.</p>
      ) : (
        <div className="flex-1">
          {facetMap.map((group) => {
            const entries = readFacet(facets, group.facetKey)
            if (entries.length === 0) return null
            const sel = new Set(selected[group.paramKey] || [])
            return (
              <FacetGroup
                key={group.paramKey}
                title={group.title}
                kind={group.facetKey}
                entries={entries}
                selected={sel}
                defaultOpen={group.defaultOpen ?? sel.size > 0 ? true : group.defaultOpen ?? false}
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

      <div className="h-4 shrink-0" />

      <style>{`
        .browse-sidebar { scrollbar-width: thin; scrollbar-color: var(--sidebar-border) transparent; }
      `}</style>
    </div>
  )
}

// ── Stone ──────────────────────────────────────────────────────────────
function Stone({ label, value, onClear }) {
  return (
    <button
      type="button"
      onClick={onClear}
      className="group/stone inline-flex max-w-full items-center gap-1.5 overflow-hidden rounded-md border border-border bg-background py-1 pl-2 pr-1 text-[11px] font-medium transition-colors hover:border-foreground/20"
    >
      <span className="font-normal text-muted-foreground">{label}:</span>
      <span className="max-w-[140px] truncate text-foreground">{value}</span>
      <span className="grid size-4 place-items-center rounded-sm text-muted-foreground transition group-hover/stone:bg-muted group-hover/stone:text-foreground">
        <X className="size-2.5" strokeWidth={2.5} />
      </span>
    </button>
  )
}

// ── MediaTypesFacet ────────────────────────────────────────────────────
function MediaTypesFacet({ kinds, counts, selected, onToggle, onClear }) {
  const [open, setOpen] = useState(true)
  const selectedSet = new Set(selected)
  const allSelected = selectedSet.size === 0 || selectedSet.size === kinds.length

  return (
    <section className="border-b border-border last:border-b-0">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="flex w-full items-center justify-between gap-2 px-4 py-3 text-left transition-colors hover:bg-accent"
      >
        <span className="inline-flex items-center gap-2 text-[13px] font-semibold text-foreground">
          <Layers className="size-3.5 text-muted-foreground" />
          Media types
          {!allSelected ? (
            <span className="inline-grid h-[18px] min-w-[18px] place-items-center rounded-full bg-primary px-1.5 text-[10px] font-bold text-primary-foreground">
              {selectedSet.size}
            </span>
          ) : null}
        </span>
        <ChevronDown
          className={cn(
            'size-3.5 text-muted-foreground transition-transform duration-200',
            open ? 'rotate-180' : '',
          )}
        />
      </button>

      {open ? (
        <div className="space-y-px px-2 pb-3">
          {kinds.map((kind) => {
            const Icon = MEDIA_KIND_ICONS[kind]
            const isSelected = allSelected || selectedSet.has(kind)
            const count = counts?.[kind]
            return (
              <button
                key={kind}
                type="button"
                onClick={() => onToggle(kind)}
                aria-pressed={isSelected}
                className={cn(
                  'group/row flex w-full items-center gap-2.5 rounded-md px-2 py-2 text-left transition-colors',
                  isSelected ? 'bg-primary/10' : 'hover:bg-accent',
                )}
              >
                <Checkbox checked={isSelected} />
                {Icon ? <Icon className="size-3.5 text-muted-foreground" /> : null}
                <span className="min-w-0 flex-1 truncate text-[13px] text-foreground">
                  {MEDIA_KIND_LABELS[kind] || kind}
                </span>
                {Number.isFinite(count) ? (
                  <span
                    className={cn(
                      'shrink-0 font-mono text-[11px] tabular-nums',
                      isSelected ? 'font-semibold text-foreground' : 'text-muted-foreground',
                    )}
                  >
                    {count.toLocaleString()}
                  </span>
                ) : null}
              </button>
            )
          })}

          {!allSelected ? (
            <button
              type="button"
              onClick={() => onClear?.()}
              className="mt-1 inline-flex items-center gap-1 rounded-md px-2 py-1 text-[11px] font-medium text-muted-foreground hover:bg-accent hover:text-foreground"
            >
              <RotateCcw className="size-3" />
              Show all
            </button>
          ) : null}
        </div>
      ) : null}
    </section>
  )
}

// ── YearRangeFacet ─────────────────────────────────────────────────────
function YearRangeFacet({
  title,
  HeaderIcon = CalendarRange,
  fromKey,
  toKey,
  fromValue,
  toValue,
  buckets,
  onApply,
}) {
  const initialFromYear = parseYear(fromValue)
  const initialToYear   = parseYear(toValue)
  const hasActive       = Boolean(fromValue || toValue)

  const [open,  setOpen]  = useState(hasActive)
  const [range, setRange] = useState([
    initialFromYear ?? YEAR_MIN,
    initialToYear   ?? YEAR_MAX,
  ])

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setRange([parseYear(fromValue) ?? YEAR_MIN, parseYear(toValue) ?? YEAR_MAX])
  }, [fromValue, toValue])

  const fromYear   = range[0]
  const toYear     = range[1]
  const isFullSpan = fromYear === YEAR_MIN && toYear === YEAR_MAX

  const histogram = useMemo(
    () => buildHistogram(buckets, YEAR_MIN, YEAR_MAX),
    [buckets],
  )

  const commit = (next) => {
    const [lo, hi] = next
    if (lo === YEAR_MIN && hi === YEAR_MAX) {
      onApply?.({ [fromKey]: null, [toKey]: null })
    } else {
      onApply?.({ [fromKey]: `${lo}-01-01`, [toKey]: `${hi}-12-31` })
    }
  }

  const isPresetActive = (p) => fromYear === p.from && toYear === p.to

  return (
    <section className="border-b border-border last:border-b-0">
      {/* Section header */}
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="flex w-full items-center justify-between gap-2 px-4 py-3 text-left transition-colors hover:bg-accent"
      >
        <span className="inline-flex items-center gap-2 text-[13px] font-semibold text-foreground">
          {HeaderIcon ? <HeaderIcon className="size-3.5 text-muted-foreground" /> : null}
          {title}
          {/* Live year range pill — shows exactly what is selected */}
          {hasActive ? (
            <span className="inline-flex items-center rounded-md bg-primary/10 px-1.5 py-0.5 font-mono text-[10px] font-semibold tabular-nums text-primary ring-1 ring-primary/15">
              {fromYear} – {toYear}
            </span>
          ) : null}
        </span>
        <ChevronDown
          className={cn(
            'size-3.5 text-muted-foreground transition-transform duration-200',
            open ? 'rotate-180' : '',
          )}
        />
      </button>

      {open ? (
        <div className="space-y-3 px-4 pb-5">

          {/* Histogram + slider — stacked so bars sit directly above track */}
          <div className="pt-1">
            <YearHistogram
              bars={histogram}
              fromYear={fromYear}
              toYear={toYear}
              minYear={YEAR_MIN}
              maxYear={YEAR_MAX}
            />
            <Slider
              className="mt-1"
              min={YEAR_MIN}
              max={YEAR_MAX}
              step={1}
              value={range}
              onValueChange={(next) => setRange(Array.isArray(next) ? next : [next, next])}
              onValueCommitted={(next) => commit(Array.isArray(next) ? next : [next, next])}
              ariaLabel={title}
            />
            {/* Axis min/max labels */}
            <div className="mt-1.5 flex justify-between font-mono text-[10px] tabular-nums text-muted-foreground/50">
              <span>{YEAR_MIN}</span>
              <span>{YEAR_MAX}</span>
            </div>
          </div>

          {/* Decade quick-pick chips */}
          <div className="flex flex-wrap gap-1">
            {DECADE_PRESETS.map((p) => {
              const active = isPresetActive(p)
              return (
                <button
                  key={p.label}
                  type="button"
                  onClick={() => {
                    const next = active ? [YEAR_MIN, YEAR_MAX] : [p.from, p.to]
                    setRange(next)
                    commit(next)
                  }}
                  className={cn(
                    'h-6 rounded-md border px-2 text-[11px] font-medium transition-colors',
                    active
                      ? 'border-primary bg-primary text-primary-foreground'
                      : 'border-border bg-background text-foreground hover:bg-accent',
                  )}
                >
                  {p.label}
                </button>
              )
            })}
            {!isFullSpan ? (
              <button
                type="button"
                onClick={() => {
                  const next = [YEAR_MIN, YEAR_MAX]
                  setRange(next)
                  commit(next)
                }}
                className="ml-auto inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[11px] font-medium text-muted-foreground hover:bg-accent hover:text-foreground"
              >
                <RotateCcw className="size-3" />
                All years
              </button>
            ) : null}
          </div>
        </div>
      ) : null}
    </section>
  )
}

// ── YearHistogram ──────────────────────────────────────────────────────
// Taller bars (h-12) so the density shape is much easier to read at a glance.
// In-range bars lit in primary; out-of-range bars fade to muted.
function YearHistogram({ bars, fromYear, toYear, minYear, maxYear }) {
  const span = Math.max(1, maxYear - minYear)
  return (
    <div className="pointer-events-none relative h-12 w-full">
      {bars.map((bar) => {
        const inRange   = bar.year >= fromYear && bar.year <= toYear
        const heightPct = Math.max(6, Math.round(bar.heightPct))
        const leftPct   = ((bar.year - minYear) / span) * 100
        return (
          <span
            key={bar.year}
            aria-hidden
            className={cn(
              'absolute bottom-0 w-[2px] rounded-t-[1px] transition-colors duration-150',
              inRange ? 'bg-primary/75' : 'bg-foreground/10',
            )}
            style={{ left: `calc(${leftPct}%)`, height: `${heightPct}%` }}
          />
        )
      })}
    </div>
  )
}

function parseYear(value) {
  if (!value) return null
  const m = String(value).match(/^(\d{4})/)
  return m ? Number(m[1]) : null
}

function buildHistogram(buckets, minYear, maxYear) {
  const years = []
  for (let y = minYear; y <= maxYear; y += 1) years.push(y)
  if (!buckets || Object.keys(buckets).length === 0) {
    return years.map((year) => ({ year, heightPct: 18 }))
  }
  let peak = 0
  for (const y of years) {
    const v = Number(buckets[y]) || 0
    if (v > peak) peak = v
  }
  if (peak === 0) {
    return years.map((year) => ({ year, heightPct: 18 }))
  }
  return years.map((year) => {
    const v = Number(buckets[year]) || 0
    return { year, heightPct: v === 0 ? 6 : Math.round((v / peak) * 100) }
  })
}

// ── TextFiltersGroup ───────────────────────────────────────────────────
function TextFiltersGroup({ filters, values, onChange }) {
  const activeCount = filters.reduce(
    (acc, f) => acc + ((values[f.paramKey] || '').trim() ? 1 : 0),
    0,
  )
  const [open, setOpen] = useState(activeCount > 0)

  const [drafts, setDrafts] = useState(() => ({ ...values }))
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setDrafts({ ...values })
  }, [values])

  return (
    <section className="border-b border-border last:border-b-0">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="flex w-full items-center justify-between gap-2 px-4 py-3 text-left transition-colors hover:bg-accent"
      >
        <span className="inline-flex items-center gap-2 text-[13px] font-semibold text-foreground">
          <SlidersHorizontal className="size-3.5 text-muted-foreground" />
          Search within
          {activeCount > 0 ? (
            <span className="inline-grid h-[18px] min-w-[18px] place-items-center rounded-full bg-primary px-1.5 text-[10px] font-bold text-primary-foreground">
              {activeCount}
            </span>
          ) : null}
        </span>
        <ChevronDown
          className={cn(
            'size-3.5 text-muted-foreground transition-transform duration-200',
            open ? 'rotate-180' : '',
          )}
        />
      </button>

      {open ? (
        <div className="space-y-2 px-4 pb-4">
          <p className="text-[10.5px] leading-relaxed text-muted-foreground/70">
            Narrow on a single attribute. Partial words are fine.
          </p>
          <ul className="space-y-1.5">
            {filters.map((f) => (
              <li key={f.paramKey}>
                <DebouncedTextInput
                  label={f.label}
                  placeholder={f.placeholder}
                  value={drafts[f.paramKey] || ''}
                  onLocalChange={(v) => setDrafts((d) => ({ ...d, [f.paramKey]: v }))}
                  onCommit={(v) => onChange?.(f.paramKey, v)}
                />
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </section>
  )
}

// ── DebouncedTextInput ─────────────────────────────────────────────────
function DebouncedTextInput({ label, placeholder, value, onLocalChange, onCommit }) {
  const [touched, setTouched] = useState(false)

  useEffect(() => {
    if (!touched) return undefined
    const t = setTimeout(() => { onCommit?.(value) }, 350)
    return () => clearTimeout(t)
  }, [value, touched, onCommit])

  const hasValue = (value || '').length > 0

  return (
    <label
      className={cn(
        'group/text flex items-center gap-2 rounded-md border bg-background px-2.5 py-1.5 transition-all',
        'border-border focus-within:border-ring focus-within:ring-2 focus-within:ring-ring/20',
        hasValue ? 'border-primary/40 bg-primary/[0.04]' : '',
      )}
    >
      <span
        className={cn(
          'shrink-0 text-[10px] font-semibold uppercase tracking-[0.1em]',
          hasValue ? 'text-primary' : 'text-muted-foreground',
        )}
        style={{ width: 78 }}
      >
        {label}
      </span>
      <input
        type="text"
        value={value || ''}
        placeholder={placeholder || ''}
        onChange={(e) => {
          setTouched(true)
          onLocalChange(e.target.value)
        }}
        onBlur={() => onCommit?.(value)}
        className="min-w-0 flex-1 bg-transparent text-[12px] font-medium text-foreground outline-none placeholder:text-muted-foreground/50"
      />
      {hasValue ? (
        <button
          type="button"
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => {
            setTouched(true)
            onLocalChange('')
            onCommit?.('')
          }}
          aria-label={`Clear ${label}`}
          className="grid size-5 shrink-0 place-items-center rounded text-muted-foreground transition hover:bg-accent hover:text-foreground"
        >
          <X className="size-3" />
        </button>
      ) : null}
    </label>
  )
}

// ── FacetGroup ─────────────────────────────────────────────────────────
function FacetGroup({ title, kind, entries, selected, defaultOpen, onToggle }) {
  const [open,    setOpen]    = useState(Boolean(defaultOpen))
  const [showAll, setShowAll] = useState(false)
  const [filter,  setFilter]  = useState('')

  const filtered = useMemo(() => {
    if (!filter.trim()) return entries
    const needle = filter.trim().toLowerCase()
    return entries.filter((e) => e.value.toLowerCase().includes(needle))
  }, [entries, filter])

  const isPersonsFacet = kind === 'persons'
  const max     = isPersonsFacet ? 7 : 6
  const visible = showAll ? filtered : filtered.slice(0, max)
  const hidden  = Math.max(0, filtered.length - max)
  const selectedCount = entries.filter((e) => selected.has(e.code || e.value)).length

  return (
    <section className="border-b border-border last:border-b-0">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="flex w-full items-center justify-between gap-2 px-4 py-3 text-left transition-colors hover:bg-accent"
      >
        <span className="inline-flex items-center gap-2 text-[13px] font-semibold text-foreground">
          {title}
          {selectedCount > 0 ? (
            <span className="inline-grid h-[18px] min-w-[18px] place-items-center rounded-full bg-primary px-1.5 text-[10px] font-bold text-primary-foreground">
              {selectedCount}
            </span>
          ) : null}
        </span>
        <ChevronDown
          className={cn(
            'size-3.5 text-muted-foreground transition-transform duration-200',
            open ? 'rotate-180' : '',
          )}
        />
      </button>

      {open ? (
        <div className="space-y-2 px-4 pb-4">
          {entries.length > 6 ? (
            <div className="relative">
              <SearchIcon className="pointer-events-none absolute left-2.5 top-1/2 size-3 -translate-y-1/2 text-muted-foreground/60" />
              <input
                type="search"
                value={filter}
                onChange={(e) => setFilter(e.target.value)}
                placeholder={`Filter ${title.toLowerCase()}…`}
                className="h-8 w-full rounded-md border border-border bg-background pl-7 pr-2 text-[11px] outline-none transition placeholder:text-muted-foreground/50 focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/20"
              />
            </div>
          ) : null}

          <ul className="space-y-px">
            {visible.map((entry) => {
              const key = entry.code || entry.value
              return (
                <li key={key}>
                  <FacetRow
                    entry={entry}
                    selected={selected.has(key)}
                    onClick={() => onToggle(key)}
                    showAvatar={isPersonsFacet}
                    matchQuery={filter}
                  />
                </li>
              )
            })}
          </ul>

          {hidden > 0 ? (
            <button
              type="button"
              onClick={() => setShowAll((v) => !v)}
              className="inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-[11px] font-medium text-muted-foreground transition hover:bg-accent hover:text-foreground"
            >
              <ChevronDown
                className={cn(
                  'size-3 transition-transform duration-200',
                  showAll ? 'rotate-180' : '',
                )}
              />
              {showAll ? 'Show fewer' : `Show ${hidden} more`}
            </button>
          ) : null}
        </div>
      ) : null}
    </section>
  )
}

// ── Checkbox ───────────────────────────────────────────────────────────
// Shared checkbox indicator used by FacetRow and MediaTypesFacet.
// Slightly larger (size-[18px]) and with a cleaner check mark than before.
function Checkbox({ checked }) {
  return (
    <span
      aria-hidden
      className={cn(
        'grid size-[18px] shrink-0 place-items-center rounded-[4px] border-[1.5px] bg-background transition-all',
        checked
          ? 'border-primary bg-primary text-primary-foreground shadow-sm'
          : 'border-border group-hover/row:border-foreground/30',
      )}
    >
      {checked ? (
        <svg viewBox="0 0 24 24" className="size-[10px]">
          <polyline
            points="20 6 9 17 4 12"
            fill="none"
            stroke="currentColor"
            strokeWidth="3.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      ) : null}
    </span>
  )
}

// ── FacetRow ───────────────────────────────────────────────────────────
function FacetRow({ entry, selected, onClick, showAvatar, matchQuery }) {
  const initials  = personInitials(entry.value)
  const avatarSrc = showAvatar
    ? personImageSrc({ profileImage: entry.image, profileImageUrl: entry.image })
    : null

  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={selected}
      title={entry.value}
      className={cn(
        'group/row flex w-full items-center gap-2.5 rounded-md px-2 py-2 text-left transition-colors',
        selected ? 'bg-primary/10' : 'hover:bg-accent',
      )}
    >
      <Checkbox checked={selected} />

      {showAvatar ? (
        <span className="grid size-[22px] shrink-0 place-items-center overflow-hidden rounded-full border border-border bg-muted text-[10px] font-bold text-muted-foreground">
          {avatarSrc ? (
            <img src={avatarSrc} alt="" className="size-full object-cover" />
          ) : (
            initials
          )}
        </span>
      ) : null}

      <span className="min-w-0 flex-1 truncate text-[13px] text-foreground">
        <Highlight text={entry.value} query={matchQuery} />
      </span>

      <span
        className={cn(
          'shrink-0 font-mono text-[11px] tabular-nums',
          selected ? 'font-semibold text-foreground' : 'text-muted-foreground',
        )}
      >
        {entry.count.toLocaleString()}
      </span>
    </button>
  )
}

function shortDate(iso) {
  if (!iso) return ''
  const m = String(iso).match(/^(\d{4})/)
  return m ? m[1] : iso
}

export { BrowseSidebar }
