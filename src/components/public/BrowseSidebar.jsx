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
import { cn } from '@/lib/utils'
import {
  personImageSrc,
  personInitials,
  readFacet,
} from '@/components/public/public-helpers'
import { guestFacets } from '@/services/guest'

// ── BrowseSidebar ───────────────────────────────────────────────────────
//
// Light shadcn-style card on the page surface (no more dark "command
// center"). The search experience moved up to the hero — this rail is
// strictly for filtering. Top-down stack:
//
//   1. Header bar        Filter glyph + "Filters" + Clear
//   2. Type list         vertical rows (icon + name + count); active row
//                        gets the primary fill
//   3. Active stones     compact removable chips, only when something is on
//   4. Facet groups      collapsible Category / Date / Person / Language …
//                        with checkbox-style rows and a per-group filter
//                        text input when there are >6 entries
//
// The Persons facet is special-cased: rows render with the person's
// circular avatar (real photo via `personImageSrc`, initials otherwise)
// so a face is always paired with a name — same identity all the way
// down to the result cards.

const DECADE_PRESETS = [
  { label: '1960s', from: '1960-01-01', to: '1969-12-31' },
  { label: '1970s', from: '1970-01-01', to: '1979-12-31' },
  { label: '1980s', from: '1980-01-01', to: '1989-12-31' },
  { label: '1990s', from: '1990-01-01', to: '1999-12-31' },
  { label: '2000s', from: '2000-01-01', to: '2009-12-31' },
]

// Media-kind → icon for the synthetic "Media types" group on `all`.
const MEDIA_KIND_ICONS = {
  audio: AudioLines,
  video: VideoIcon,
  text: FileText,
  image: ImageIcon,
}

const MEDIA_KIND_LABELS = {
  audio: 'Audios',
  video: 'Videos',
  text: 'Texts',
  image: 'Images',
}

function BrowseSidebar({
  // type rail
  types,
  activeType,
  onTypeChange,
  // facets
  facetMap,
  selected,
  onChange,
  onReset,
  // active state for chips
  searchValue,
  onClearSearch,
  // date range
  showDateRange = false,
  dateFrom = '',
  dateTo = '',
  onDateChange,
  // published date range (per-type)
  showPublishedRange = false,
  publishedFrom = '',
  publishedTo = '',
  onPublishedDateChange,
  // print date range (text only)
  showPrintRange = false,
  printDateFrom = '',
  printDateTo = '',
  onPrintDateChange,
  // per-type substring text filters (composer / lyrics / publisher / …)
  textFilters = [],
  textFilterValues = {},
  onTextFilterChange,
  // media-type checkboxes (only the unified `all` type opts in)
  showMediaTypes = false,
  mediaKinds = [],
  mediaTypeCounts = {},
  selectedMediaTypes = [],
  onMediaTypesChange,
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
      {/* ── Masthead ────────────────────────────────────────────── */}
      <div className="flex items-center justify-between gap-2 border-b border-sidebar-border bg-sidebar/95 px-5 py-4">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
            The archive
          </p>
          <h2 className="mt-0.5 inline-flex items-center gap-1.5 font-heading text-[13px] font-semibold tracking-tight text-foreground">
            <Filter className="size-3.5 text-muted-foreground" />
            Filters
            {totalActive > 0 ? (
              <span className="ml-0.5 inline-grid h-4 min-w-4 place-items-center rounded-full bg-primary px-1 text-[10px] font-bold text-primary-foreground">
                {totalActive}
              </span>
            ) : null}
          </h2>
        </div>
        {totalActive > 0 ? (
          <button
            type="button"
            onClick={onReset}
            className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs font-medium text-muted-foreground hover:bg-sidebar-accent hover:text-foreground"
          >
            <RotateCcw className="size-3" />
            Clear
          </button>
        ) : null}
      </div>

      {/* ── Type rail ───────────────────────────────────────────── */}
      <div className="border-b border-sidebar-border px-3 py-3">
        <p className="mb-2 px-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
          Showing
        </p>
        <ul className="space-y-px">
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
                      aria-hidden="true"
                      className="absolute inset-y-1.5 left-0 w-0.5 rounded-r-full bg-primary"
                    />
                  ) : null}
                  <Icon
                    className={cn(
                      'size-4 shrink-0 transition-colors',
                      active ? 'text-primary' : 'text-muted-foreground/80 group-hover/type:text-foreground',
                    )}
                  />
                  <span className="min-w-0 flex-1 truncate">{t.label}</span>
                  <span
                    className={cn(
                      'shrink-0 font-mono text-[11px] tabular-nums',
                      active ? 'text-foreground' : 'text-muted-foreground/80',
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

      {/* ── Active stones ───────────────────────────────────────── */}
      {totalActive > 0 ? (
        <div className="border-b border-sidebar-border bg-sidebar-accent/40 px-5 py-3">
          <p className="mb-2 text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
            Active filters
          </p>
          <div className="flex flex-wrap gap-1.5">
            {searchValue ? (
              <Stone label="Search" value={`“${searchValue}”`} onClear={onClearSearch} />
            ) : null}
            {dateFrom || dateTo ? (
              <Stone
                label="Created"
                value={`${shortDate(dateFrom) || '…'} → ${shortDate(dateTo) || '…'}`}
                onClear={() => onDateChange?.({ dateFrom: null, dateTo: null })}
              />
            ) : null}
            {publishedFrom || publishedTo ? (
              <Stone
                label="Published"
                value={`${shortDate(publishedFrom) || '…'} → ${shortDate(publishedTo) || '…'}`}
                onClear={() =>
                  onPublishedDateChange?.({ publishedFrom: null, publishedTo: null })
                }
              />
            ) : null}
            {printDateFrom || printDateTo ? (
              <Stone
                label="Printed"
                value={`${shortDate(printDateFrom) || '…'} → ${shortDate(printDateTo) || '…'}`}
                onClear={() =>
                  onPrintDateChange?.({ printDateFrom: null, printDateTo: null })
                }
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

      {/* ── Media types (unified `all` only) ─────────────────────── */}
      {showMediaTypes ? (
        <MediaTypesFacet
          kinds={mediaKinds}
          counts={mediaTypeCounts}
          selected={selectedMediaTypes}
          onToggle={toggleMediaKind}
          onClear={() => onMediaTypesChange?.([])}
        />
      ) : null}

      {/* ── Date range (content dateCreated) ───────────────────── */}
      {showDateRange ? (
        <DateRangeFacet
          title="Date created"
          HeaderIcon={CalendarRange}
          fromKey="dateFrom"
          toKey="dateTo"
          fromValue={dateFrom}
          toValue={dateTo}
          presets={DECADE_PRESETS}
          onApply={(payload) => onDateChange?.(payload)}
        />
      ) : null}

      {/* ── Date published ──────────────────────────────────────── */}
      {showPublishedRange ? (
        <DateRangeFacet
          title="Date published"
          HeaderIcon={CalendarClock}
          fromKey="publishedFrom"
          toKey="publishedTo"
          fromValue={publishedFrom}
          toValue={publishedTo}
          onApply={(payload) => onPublishedDateChange?.(payload)}
        />
      ) : null}

      {/* ── Print date (text only) ──────────────────────────────── */}
      {showPrintRange ? (
        <DateRangeFacet
          title="Print date"
          HeaderIcon={Printer}
          fromKey="printDateFrom"
          toKey="printDateTo"
          fromValue={printDateFrom}
          toValue={printDateTo}
          onApply={(payload) => onPrintDateChange?.(payload)}
        />
      ) : null}

      {/* ── Search within (per-type substring filters) ─────────── */}
      {textFilters.length > 0 ? (
        <TextFiltersGroup
          filters={textFilters}
          values={textFilterValues}
          onChange={onTextFilterChange}
        />
      ) : null}

      {/* ── Facet groups ────────────────────────────────────────── */}
      {loading ? (
        <div className="space-y-3 px-5 py-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="space-y-1.5">
              <Skeleton className="h-3 w-20" />
              <Skeleton className="h-7" />
              <Skeleton className="h-7 w-2/3" />
            </div>
          ))}
        </div>
      ) : error ? (
        <p className="px-5 py-4 text-xs text-muted-foreground">Couldn’t load filters.</p>
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
                  onChange({
                    [group.paramKey]: next.length === 0 ? null : next.join(','),
                  })
                }}
              />
            )
          })}
        </div>
      )}

      {/* Bottom breathing room so the last section doesn't bump the
          sidebar's scroll edge when the content is shorter than the rail. */}
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
      className="group/stone inline-flex max-w-full items-center gap-1.5 overflow-hidden rounded-md border border-border bg-background py-1 pl-2 pr-1 text-[11px] font-medium hover:border-foreground/20"
    >
      <span className="font-normal text-muted-foreground">{label}:</span>
      <span className="max-w-[140px] truncate">{value}</span>
      <span className="grid size-4 place-items-center rounded-sm text-muted-foreground group-hover/stone:bg-muted group-hover/stone:text-foreground">
        <X className="size-2.5" strokeWidth={2.5} />
      </span>
    </button>
  )
}

// ── MediaTypesFacet ────────────────────────────────────────────────────
// Synthetic facet for the unified results endpoint's `types[]` filter.
// Lives outside `facetMap` because the values come from the static
// MEDIA_KINDS list, not from `/guest/facets`. Empty selection means
// "all four" — same semantics as the backend default — so we never
// surface a "0 selected" state.
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
            <span className="grid h-[18px] min-w-[18px] place-items-center rounded-full bg-primary px-1.5 text-[10px] font-bold text-primary-foreground">
              {selectedSet.size}
            </span>
          ) : null}
        </span>
        <ChevronDown
          className={cn(
            'size-3.5 text-muted-foreground transition-transform',
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
                  'group/row flex w-full items-center gap-2.5 rounded-md px-2 py-1.5 text-left transition-colors',
                  isSelected ? 'bg-primary/10' : 'hover:bg-accent',
                )}
              >
                <span
                  aria-hidden="true"
                  className={cn(
                    'grid size-4 shrink-0 place-items-center rounded-[4px] border-[1.5px] bg-background transition-all',
                    isSelected
                      ? 'border-primary bg-primary text-primary-foreground'
                      : 'border-border group-hover/row:border-foreground/30',
                  )}
                >
                  {isSelected ? (
                    <svg viewBox="0 0 24 24" className="size-2.5">
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
                {Icon ? <Icon className="size-3.5 text-muted-foreground" /> : null}
                <span className="min-w-0 flex-1 truncate text-[13px] text-foreground">
                  {MEDIA_KIND_LABELS[kind] || kind}
                </span>
                {Number.isFinite(count) ? (
                  <span
                    className={cn(
                      'shrink-0 font-mono text-[11px] tabular-nums',
                      isSelected ? 'font-medium text-foreground' : 'text-muted-foreground',
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

// ── DateRangeFacet ─────────────────────────────────────────────────────
//
// One generic facet rendered three different ways: created-date,
// published-date, and (for texts) print-date. The keys are passed in by
// the parent so each instance writes to its own URL param pair without
// the component needing to know the semantics.
function DateRangeFacet({
  title,
  HeaderIcon = CalendarRange,
  fromKey,
  toKey,
  fromValue,
  toValue,
  presets,
  onApply,
}) {
  const [open, setOpen] = useState(Boolean(fromValue || toValue))
  const [draftFrom, setDraftFrom] = useState(fromValue)
  const [draftTo, setDraftTo] = useState(toValue)

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setDraftFrom(fromValue)
    setDraftTo(toValue)
  }, [fromValue, toValue])

  const dirty = draftFrom !== fromValue || draftTo !== toValue
  const isPresetActive = (p) => fromValue === p.from && toValue === p.to
  const hasActive = Boolean(fromValue || toValue)

  const buildPayload = (from, to) => ({ [fromKey]: from || null, [toKey]: to || null })

  return (
    <section className="border-b border-border last:border-b-0">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="flex w-full items-center justify-between gap-2 px-4 py-3 text-left transition-colors hover:bg-accent"
      >
        <span className="inline-flex items-center gap-2 text-[13px] font-semibold text-foreground">
          {HeaderIcon ? <HeaderIcon className="size-3.5 text-muted-foreground" /> : null}
          {title}
          {hasActive ? (
            <span className="grid h-[18px] min-w-[18px] place-items-center rounded-full bg-primary px-1.5 text-[10px] font-bold text-primary-foreground">
              ●
            </span>
          ) : null}
        </span>
        <ChevronDown
          className={cn(
            'size-3.5 text-muted-foreground transition-transform',
            open ? 'rotate-180' : '',
          )}
        />
      </button>
      {open ? (
        <div className="space-y-2 px-4 pb-4">
          <form
            onSubmit={(e) => {
              e.preventDefault()
              onApply(buildPayload(draftFrom, draftTo))
            }}
            className="space-y-2"
          >
            <div className="grid grid-cols-2 gap-2">
              <DateField
                label="From"
                value={draftFrom}
                onChange={setDraftFrom}
              />
              <DateField label="To" value={draftTo} onChange={setDraftTo} />
            </div>
            {Array.isArray(presets) && presets.length > 0 ? (
              <div className="flex flex-wrap gap-1">
                {presets.map((p) => {
                  const active = isPresetActive(p)
                  return (
                    <button
                      key={p.label}
                      type="button"
                      onClick={() => {
                        setDraftFrom(p.from)
                        setDraftTo(p.to)
                        onApply(buildPayload(p.from, p.to))
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
              </div>
            ) : null}
            {dirty ? (
              <button
                type="submit"
                className="h-7 w-full rounded-md bg-primary text-[11px] font-semibold text-primary-foreground transition-colors hover:bg-primary/90"
              >
                Apply
              </button>
            ) : null}
          </form>
        </div>
      ) : null}
    </section>
  )
}

// ── TextFiltersGroup ───────────────────────────────────────────────────
//
// The "Search within …" section: a per-type list of debounced text
// inputs that map straight to substring backend filters (composer,
// lyrics, producer, contributor, …). Each row commits 350ms after the
// user stops typing so we don't fire a request per keystroke. Defaults
// to closed when nothing is set; opens automatically when any value is
// already in the URL so the user sees what's narrowing their results.
function TextFiltersGroup({ filters, values, onChange }) {
  const activeCount = filters.reduce(
    (acc, f) => acc + ((values[f.paramKey] || '').trim() ? 1 : 0),
    0,
  )
  const [open, setOpen] = useState(activeCount > 0)

  // Local drafts so each input stays responsive while the debounce
  // window settles. Sync back from props whenever the URL changes
  // externally (e.g. browser back / clear all).
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
            <span className="grid h-[18px] min-w-[18px] place-items-center rounded-full bg-primary px-1.5 text-[10px] font-bold text-primary-foreground">
              {activeCount}
            </span>
          ) : null}
        </span>
        <ChevronDown
          className={cn(
            'size-3.5 text-muted-foreground transition-transform',
            open ? 'rotate-180' : '',
          )}
        />
      </button>
      {open ? (
        <div className="space-y-2 px-4 pb-4">
          <p className="text-[10.5px] leading-relaxed text-muted-foreground">
            Narrow on a single attribute. Substring match — partial words
            are fine.
          </p>
          <ul className="space-y-1.5">
            {filters.map((f) => (
              <li key={f.paramKey}>
                <DebouncedTextInput
                  label={f.label}
                  placeholder={f.placeholder}
                  value={drafts[f.paramKey] || ''}
                  onLocalChange={(v) =>
                    setDrafts((d) => ({ ...d, [f.paramKey]: v }))
                  }
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
//
// Labelled text input that commits its value 350ms after the user stops
// typing. Used by TextFiltersGroup so the URL (and the API call) only
// updates once the user has actually finished a token.
function DebouncedTextInput({ label, placeholder, value, onLocalChange, onCommit }) {
  const [touched, setTouched] = useState(false)

  // Debounce the commit. We deliberately *don't* fire on first render —
  // only after the user has actually edited the value. Otherwise every
  // mount would write the prop value back into the URL.
  useEffect(() => {
    if (!touched) return undefined
    const t = setTimeout(() => {
      onCommit?.(value)
    }, 350)
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
        className="min-w-0 flex-1 bg-transparent text-[12px] font-medium text-foreground outline-none placeholder:text-muted-foreground/70"
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
          className="grid size-5 shrink-0 place-items-center rounded text-muted-foreground hover:bg-accent hover:text-foreground"
        >
          <X className="size-3" />
        </button>
      ) : null}
    </label>
  )
}

function DateField({ label, value, onChange }) {
  return (
    <label className="block rounded-md border border-border bg-background px-2.5 py-1.5 transition-all focus-within:border-ring focus-within:ring-2 focus-within:ring-ring/20">
      <span className="block text-[9px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
        {label}
      </span>
      <input
        type="date"
        value={value || ''}
        onChange={(e) => onChange(e.target.value)}
        className="mt-0.5 block w-full bg-transparent text-[12px] font-medium text-foreground outline-none tabular-nums"
      />
    </label>
  )
}

// ── FacetGroup ─────────────────────────────────────────────────────────
function FacetGroup({ title, kind, entries, selected, defaultOpen, onToggle }) {
  const [open, setOpen] = useState(Boolean(defaultOpen))
  const [showAll, setShowAll] = useState(false)
  const [filter, setFilter] = useState('')

  const filtered = useMemo(() => {
    if (!filter.trim()) return entries
    const needle = filter.trim().toLowerCase()
    return entries.filter((e) => e.value.toLowerCase().includes(needle))
  }, [entries, filter])

  const isPersonsFacet = kind === 'persons'
  const max = isPersonsFacet ? 7 : 6
  const visible = showAll ? filtered : filtered.slice(0, max)
  const hidden = Math.max(0, filtered.length - max)
  const selectedCount = entries.filter((e) =>
    selected.has(e.code || e.value),
  ).length

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
            <span className="grid h-[18px] min-w-[18px] place-items-center rounded-full bg-primary px-1.5 text-[10px] font-bold text-primary-foreground">
              {selectedCount}
            </span>
          ) : null}
        </span>
        <ChevronDown
          className={cn(
            'size-3.5 text-muted-foreground transition-transform',
            open ? 'rotate-180' : '',
          )}
        />
      </button>
      {open ? (
        <div className="space-y-2 px-4 pb-4">
          {entries.length > 6 ? (
            <div className="relative">
              <SearchIcon className="pointer-events-none absolute left-2 top-1/2 size-3 -translate-y-1/2 text-muted-foreground" />
              <input
                type="search"
                value={filter}
                onChange={(e) => setFilter(e.target.value)}
                placeholder={`Filter ${title.toLowerCase()}…`}
                className="h-7 w-full rounded-md border border-border bg-background pl-7 pr-2 text-[11px] outline-none transition-all placeholder:text-muted-foreground/70 focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/20"
              />
            </div>
          ) : null}
          <ul className="space-y-px">
            {visible.map((entry) => {
              const key = entry.code || entry.value
              const isSelected = selected.has(key)
              return (
                <li key={key}>
                  <FacetRow
                    entry={entry}
                    selected={isSelected}
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
              className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-[11px] font-medium text-muted-foreground hover:bg-accent hover:text-foreground"
            >
              <ChevronDown
                className={cn('size-3', showAll ? 'rotate-180' : '')}
              />
              {showAll ? 'Show fewer' : `Show ${hidden} more`}
            </button>
          ) : null}
        </div>
      ) : null}
    </section>
  )
}

// ── FacetRow ───────────────────────────────────────────────────────────
function FacetRow({ entry, selected, onClick, showAvatar, matchQuery }) {
  const initials = personInitials(entry.value)
  const avatarSrc = showAvatar
    ? personImageSrc({
        profileImage: entry.image,
        profileImageUrl: entry.image,
      })
    : null
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={selected}
      title={entry.value}
      className={cn(
        'group/row flex w-full items-center gap-2.5 rounded-md px-2 py-1.5 text-left transition-colors',
        selected ? 'bg-primary/10' : 'hover:bg-accent',
      )}
    >
      <span
        aria-hidden="true"
        className={cn(
          'grid size-4 shrink-0 place-items-center rounded-[4px] border-[1.5px] bg-background transition-all',
          selected
            ? 'border-primary bg-primary text-primary-foreground'
            : 'border-border group-hover/row:border-foreground/30',
        )}
      >
        {selected ? (
          <svg viewBox="0 0 24 24" className="size-2.5">
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
          selected ? 'font-medium text-foreground' : 'text-muted-foreground',
        )}
      >
        {entry.count.toLocaleString()}
      </span>
    </button>
  )
}

function shortDate(iso) {
  if (!iso) return ''
  // Handle the dates we emit (yyyy-mm-dd) — just slice the year for the
  // active-stone label so it stays compact in the chip.
  const m = String(iso).match(/^(\d{4})/)
  return m ? m[1] : iso
}

export { BrowseSidebar }
