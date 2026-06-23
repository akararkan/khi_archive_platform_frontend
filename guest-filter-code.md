# Guest / Public Filter — Complete Code

The full filter system used on the public (guest) surface. It is built from
three React components plus the CSS that styles them.

| Piece | File |
| --- | --- |
| Filter rail (media types, browse-by-entity, facet groups, date range, search-within) | `src/components/khi/KhiSidebar.jsx` |
| Toolbar with the "Filters" toggle + view/sort | `src/components/khi/KhiToolbar.jsx` |
| Date-range filter (dual-thumb year slider + decade chips + calendar inputs) | `src/components/khi/KhiDateRange.jsx` |
| All filter styling (scoped under `.khi-root`) | `src/styles/khi-archive.css` |

The page that wires them together is `src/pages/public/KhiBrowsePage.jsx`.

---

## 1. The filter rail — `src/components/khi/KhiSidebar.jsx`

```jsx
import React, { useState } from 'react'

import { readFacet, personImageSrc, personInitials } from '@/components/public/public-helpers'
import { IconFilter, IconChevron, IconCalendar, IconClose, TYPE_ICON, FACET_ICON } from './icons'
import { UI, TYPE_LABELS } from './khi-data'
import KhiDateRange from './KhiDateRange'

const INITIAL_VISIBLE = 6
const PERSON_VISIBLE = 7
const SEARCH_THRESHOLD = 8

function FacetGroup({ group, facets, selectedValues, onToggle }) {
  const [open, setOpen] = useState(group.defaultOpen || selectedValues.length > 0)
  const [showAll, setShowAll] = useState(false)
  const [needle, setNeedle] = useState('')

  const entries = readFacet(facets, group.facetKey || group.paramKey)
  if (!entries.length) return null

  const LeadIcon = FACET_ICON[group.paramKey] || FACET_ICON[group.facetKey] || IconChevron
  const n = needle.trim().toLowerCase()
  const filtered = n ? entries.filter((e) => e.value.toLowerCase().includes(n)) : entries
  const max = group.person ? PERSON_VISIBLE : INITIAL_VISIBLE
  const visible = showAll ? filtered : filtered.slice(0, max)

  return (
    <div className="facet">
      <summary onClick={() => setOpen((o) => !o)} style={{ listStyle: 'none' }}>
        <LeadIcon className="lead-ic" /> {group.title}
        <IconChevron className="chev" width="16" height="16" style={{ transform: open ? 'rotate(180deg)' : 'none' }} />
      </summary>
      {open ? (
        <div className="facet-body">
          {entries.length > SEARCH_THRESHOLD ? (
            <input
              className="filterbox"
              value={needle}
              onChange={(e) => setNeedle(e.target.value)}
              placeholder={`${group.title} بگەڕێ…`}
            />
          ) : null}
          {visible.map((entry) => {
            const val = entry.code || entry.value
            const on = selectedValues.includes(val)
            return (
              <label
                key={val}
                className={`check${on ? ' on' : ''}`}
                onClick={(e) => { e.preventDefault(); onToggle(group.paramKey, val) }}
              >
                <span className="box" />
                {group.person ? (
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8, minWidth: 0 }}>
                    <PersonDot entry={entry} />
                    <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{entry.value}</span>
                  </span>
                ) : (
                  <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{entry.value}</span>
                )}
                <span className="c-count">{entry.count.toLocaleString()}</span>
              </label>
            )
          })}
          {filtered.length > max ? (
            <button
              type="button"
              onClick={() => setShowAll((s) => !s)}
              style={{ marginTop: 4, fontSize: 13, fontWeight: 700, color: 'var(--pine-2)', textAlign: 'start' }}
            >
              {showAll ? UI.showFewer : `${UI.showMore} (${filtered.length - max})`}
            </button>
          ) : null}
        </div>
      ) : null}
    </div>
  )
}

function PersonDot({ entry }) {
  const img = personImageSrc({ profileImage: entry.image, profileImageUrl: entry.image, mediaPortrait: entry.image })
  return (
    <span
      style={{
        width: 22, height: 22, borderRadius: '50%', flexShrink: 0, overflow: 'hidden',
        display: 'grid', placeItems: 'center', background: 'var(--pine)', color: 'var(--gold-soft)',
        fontSize: 10, fontWeight: 700,
      }}
    >
      {img ? <img src={img} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : personInitials(entry.value)}
    </span>
  )
}

// Full public filter rail: type navigation + (for the unified feed) media-type
// narrowing + per-type facets + creation-date range + per-kind "search within".
export default function KhiSidebar({
  types, activeType, onType, counts = {}, onClose,
  facetGroups = [], facets, selected, onToggleFacet,
  showMediaTypes, mediaKinds = [], mediaTypeCounts = {}, selectedMediaTypes = [], onToggleMediaType,
  showDateRange, yearMin, yearMax, dateFrom, dateTo, onDateChange, yearLoading = false,
  textFilters = [], textFilterValues = {}, onTextFilter,
}) {
  return (
    <aside className="sidebar">
      <div className="side-head">
        <span className="ic"><IconFilter /></span>
        <span className="side-head-txt">
          <span className="eb">{UI.collection}</span>
          <b>{UI.filter}</b>
        </span>
        {onClose ? (
          <button type="button" className="side-close" onClick={onClose} aria-label={UI.clearAll}>
            <IconClose />
          </button>
        ) : null}
      </div>

      {/* Media-type checkboxes — the primary way to browse the unified feed,
          always shown; toggling one jumps to the feed from any scope. */}
      {showMediaTypes ? (
        <div className="facet media-facet">
          <summary style={{ listStyle: 'none' }}>
            {TYPE_ICON.all ? <TYPE_ICON.all className="lead-ic" /> : null} {UI.mediaType}
          </summary>
          <div className="facet-body">
            {mediaKinds.map((k) => {
              const on = selectedMediaTypes.includes(k)
              const KindIcon = TYPE_ICON[k]
              return (
                <label key={k} className={`check${on ? ' on' : ''}`} onClick={(e) => { e.preventDefault(); onToggleMediaType(k) }}>
                  <span className="box" />
                  {KindIcon ? <KindIcon className="check-ic" /> : null}
                  <span>{TYPE_LABELS[k]}</span>
                  {mediaTypeCounts[k] ? <span className="c-count">{mediaTypeCounts[k].toLocaleString()}</span> : null}
                </label>
              )
            })}
          </div>
        </div>
      ) : null}

      {/* Browse by distinct entity (persons / projects / categories). */}
      {types.length ? (
        <div className="facet">
          <summary style={{ listStyle: 'none' }}>
            {TYPE_ICON.person ? <TYPE_ICON.person className="lead-ic" /> : null} {UI.browseBy}
          </summary>
          <div className="nav-list" style={{ paddingTop: 12 }}>
            {types.map((t) => {
              const Icon = TYPE_ICON[t.key]
              const c = counts[t.key]
              return (
                <button
                  key={t.key}
                  className={`nav-item${t.key === activeType ? ' active' : ''}`}
                  onClick={() => onType(t.key)}
                >
                  <Icon /> {t.label}
                  {typeof c === 'number' && c > 0 ? <span className="n-count">{c.toLocaleString()}</span> : null}
                </button>
              )
            })}
          </div>
        </div>
      ) : null}

      {facetGroups.map((group) => (
        <FacetGroup
          key={group.paramKey}
          group={group}
          facets={facets}
          selectedValues={selected[group.paramKey] || []}
          onToggle={onToggleFacet}
        />
      ))}

      {showDateRange ? (
        <div className="facet">
          <summary style={{ listStyle: 'none' }}>
            <IconCalendar className="lead-ic" /> {UI.dateRange}
          </summary>
          <div className="facet-body">
            <KhiDateRange
              min={yearMin}
              max={yearMax}
              from={dateFrom}
              to={dateTo}
              loading={yearLoading}
              onChange={onDateChange}
            />
          </div>
        </div>
      ) : null}

      {textFilters.length ? (
        <div className="facet">
          <summary style={{ listStyle: 'none' }}>{UI.searchWithin}</summary>
          <div className="facet-body">
            {textFilters.map((f) => (
              <input
                key={f.paramKey}
                className="filterbox"
                value={textFilterValues[f.paramKey] || ''}
                onChange={(e) => onTextFilter(f.paramKey, e.target.value)}
                placeholder={f.label}
                style={{ marginBottom: 0 }}
              />
            ))}
          </div>
        </div>
      ) : null}
    </aside>
  )
}
```

---

## 2. The toolbar / filter toggle — `src/components/khi/KhiToolbar.jsx`

```jsx
import React from 'react'
import { IconGrid, IconList, IconChevron, IconFilter } from './icons'
import { UI } from './khi-data'

const selectStyle = {
  appearance: 'none', WebkitAppearance: 'none', background: 'transparent',
  border: 'none', color: 'inherit', font: 'inherit', fontWeight: 600, cursor: 'pointer',
  paddingInlineEnd: 4, outline: 'none',
}

// Results header: a Filters toggle (shows/hides the rail), title + subtitle,
// grid/list toggle, and a sort <select> styled to match the kit's .sort-btn.
// `sortIndex` is the active option index; `activeCount` badges the toggle with
// the number of live filters.
export default function KhiToolbar({
  title, subtitle, view, onView, sorts = [], sortIndex = 0, onSortChange,
  sidebarOpen = true, onToggleSidebar, activeCount = 0, showView = true,
}) {
  return (
    <div className="toolbar">
      <div className="toolbar-head">
        {onToggleSidebar ? (
          <button
            type="button"
            className={`filters-toggle${sidebarOpen ? ' on' : ''}`}
            onClick={onToggleSidebar}
            aria-pressed={sidebarOpen}
          >
            <IconFilter />
            <span>{UI.filter}</span>
            {activeCount > 0 ? <span className="cnt">{activeCount}</span> : null}
          </button>
        ) : null}
        <div>
          <h2>{title}</h2>
          {subtitle ? <div className="sub">{subtitle}</div> : null}
        </div>
      </div>

      <div className="controls">
        {showView ? (
          <div className="toggle">
            <button className={view === 'grid' ? 'active' : ''} onClick={() => onView('grid')}>
              <IconGrid /> {UI.grid}
            </button>
            <button className={view === 'list' ? 'active' : ''} onClick={() => onView('list')}>
              <IconList /> {UI.list}
            </button>
          </div>
        ) : null}

        {sorts.length ? (
          <label className="sort-btn">
            <span className="lab">{UI.sort}</span>
            <select value={sortIndex} onChange={(e) => onSortChange(Number(e.target.value))} style={selectStyle}>
              {sorts.map((s, i) => (
                <option key={`${s.key}-${s.dir}`} value={i}>{s.label}</option>
              ))}
            </select>
            <IconChevron />
          </label>
        ) : null}
      </div>
    </div>
  )
}
```

---

## 3. The date-range filter — `src/components/khi/KhiDateRange.jsx`

```jsx
import React, { useEffect, useRef, useState } from 'react'

import { UI } from './khi-data'

// ── KhiDateRange ──────────────────────────────────────────────────────────────
// The catalogue's creation-date filter. Three ways to set the same range, all
// writing ISO `yyyy-mm-dd` to dateFrom/dateTo:
//   1. an enhanced dual-thumb YEAR slider (the centerpiece — drag the medallion
//      handles; always-on year bubbles; decade ticks),
//   2. one-tap decade chips,
//   3. exact-day calendar inputs (From / To) for precision.
// The slider works in whole years (an edge at a bound = open/cleared); the
// calendar refines to the day. Laid out LTR (years/dates read naturally) inside
// the RTL rail.
//
// Props: from/to (ISO strings or '') · min/max (decade-snapped YEAR bounds) ·
// onChange({from,to}) (null edge = unfiltered) · loading (calm shell).

const clamp = (n, a, b) => Math.min(b, Math.max(a, n))
const isoStart = (y) => `${y}-01-01`
const isoEnd = (y) => `${y}-12-31`
const yearOf = (iso) => (iso ? Number(String(iso).slice(0, 4)) || null : null)

export default function KhiDateRange({ from = '', to = '', min, max, onChange, loading = false }) {
  const trackRef = useRef(null)
  const [drag, setDrag] = useState(null)   // 'lo' | 'hi' | null
  const [draft, setDraft] = useState(null) // [lo, hi] (years) while dragging

  const safeMin = Number.isFinite(min) ? min : 1900
  const safeMax = Number.isFinite(max) && max > safeMin ? max : safeMin + 10
  const span = Math.max(1, safeMax - safeMin)
  const minISO = isoStart(safeMin)
  const maxISO = isoEnd(safeMax)

  const hasFilter = Boolean(from || to)
  const invalid = Boolean(from && to && from > to)

  const fromY = yearOf(from)
  const toY = yearOf(to)
  const rawLo = fromY == null ? safeMin : clamp(fromY, safeMin, safeMax)
  const rawHi = toY == null ? safeMax : clamp(toY, safeMin, safeMax)
  const activeLo = Math.min(rawLo, rawHi)
  const activeHi = Math.max(rawLo, rawHi)
  const lo = draft ? draft[0] : activeLo
  const hi = draft ? draft[1] : activeHi

  const pct = (y) => ((clamp(y, safeMin, safeMax) - safeMin) / span) * 100

  // Fresh values for the window drag listeners without re-subscribing per render.
  const ref = useRef({})
  useEffect(() => { ref.current = { safeMin, safeMax, span, lo, hi, onChange } })

  const emit = (next) => {
    if (loading) return
    onChange?.({ from: next.from || null, to: next.to || null })
  }

  // Slider commit: years → ISO with full-day inclusive edges; an edge AT the
  // bound means "open" (that side cleared).
  const commitYears = (a, b) => {
    const { safeMin: loB, safeMax: hiB, onChange: cb } = ref.current
    let na = clamp(Math.round(a), loB, hiB)
    let nb = clamp(Math.round(b), loB, hiB)
    if (na > nb) [na, nb] = [nb, na]
    cb?.({ from: na <= loB ? null : isoStart(na), to: nb >= hiB ? null : isoEnd(nb) })
  }

  const yearAt = (clientX) => {
    const el = trackRef.current
    const { safeMin: loB, span: sp } = ref.current
    if (!el) return loB
    const r = el.getBoundingClientRect()
    const ratio = clamp((clientX - r.left) / (r.width || 1), 0, 1) // LTR track
    return Math.round(loB + ratio * sp)
  }

  useEffect(() => {
    if (!drag) return undefined
    const move = (e) => {
      const y = yearAt(e.clientX)
      setDraft((d) => {
        const [dl, dh] = d || [ref.current.lo, ref.current.hi]
        return drag === 'lo' ? [Math.min(y, dh), dh] : [dl, Math.max(y, dl)]
      })
    }
    const up = () => {
      commitYears(ref.current.lo, ref.current.hi)
      setDraft(null)
      setDrag(null)
    }
    window.addEventListener('pointermove', move)
    window.addEventListener('pointerup', up)
    window.addEventListener('pointercancel', up)
    return () => {
      window.removeEventListener('pointermove', move)
      window.removeEventListener('pointerup', up)
      window.removeEventListener('pointercancel', up)
    }
  }, [drag])

  const startThumb = (thumb) => (e) => {
    if (loading) return
    e.preventDefault(); e.stopPropagation()
    setDraft([lo, hi]); setDrag(thumb)
  }

  const onRailDown = (e) => {
    if (loading) return
    e.preventDefault()
    const y = yearAt(e.clientX)
    const thumb = lo === hi
      ? (y >= lo ? 'hi' : 'lo')
      : (Math.abs(y - lo) <= Math.abs(y - hi) ? 'lo' : 'hi')
    setDraft(thumb === 'lo' ? [Math.min(y, hi), hi] : [lo, Math.max(y, lo)])
    setDrag(thumb)
  }

  const onKey = (thumb) => (e) => {
    if (loading) return
    const step = e.shiftKey ? 10 : 1
    let a = lo
    let b = hi
    switch (e.key) {
      case 'ArrowLeft': case 'ArrowDown': thumb === 'lo' ? (a = lo - step) : (b = hi - step); break
      case 'ArrowRight': case 'ArrowUp': thumb === 'lo' ? (a = lo + step) : (b = hi + step); break
      case 'PageDown': thumb === 'lo' ? (a = lo - 10) : (b = hi - 10); break
      case 'PageUp': thumb === 'lo' ? (a = lo + 10) : (b = hi + 10); break
      case 'Home': thumb === 'lo' ? (a = safeMin) : (b = lo); break
      case 'End': thumb === 'lo' ? (a = hi) : (b = safeMax); break
      default: return
    }
    e.preventDefault()
    if (thumb === 'lo') commitYears(Math.min(a, hi), hi)
    else commitYears(lo, Math.max(b, lo))
  }

  // One chip per whole decade across the bounds (1980 → 1980s … 2020s).
  const decades = []
  const lastDecade = Math.ceil(safeMax / 10) * 10 - 10
  for (let d = Math.floor(safeMin / 10) * 10; d <= lastDecade; d += 10) {
    decades.push({ d, a: Math.max(d, safeMin), b: Math.min(d + 9, safeMax) })
  }
  const decadeOn = (a, b) => hasFilter && activeLo === a && activeHi === b
  const onDecade = (a, b) => () => commitYears(decadeOn(a, b) ? safeMin : a, decadeOn(a, b) ? safeMax : b)

  return (
    <div className={`khi-dr${loading ? ' loading' : ''}`}>
      <div className="khi-dr-readout">
        {hasFilter || draft ? (
          <span className="khi-dr-range" dir="ltr"><b>{lo}</b><i>–</i><b>{hi}</b></span>
        ) : (
          <span className="khi-dr-all">{UI.allYears}</span>
        )}
        {hasFilter ? (
          <button type="button" className="khi-dr-reset" onClick={() => emit({ from: '', to: '' })}>
            {UI.reset}
          </button>
        ) : null}
      </div>

      {/* Enhanced dual-thumb year slider. */}
      <div className="khi-dr-slider" dir="ltr">
        <div className="khi-dr-rail" ref={trackRef} onPointerDown={onRailDown}>
          <div className="khi-dr-ticks" aria-hidden="true">
            {decades.slice(1).map((dc) => (
              <span key={dc.d} className="khi-dr-tick" style={{ left: `${pct(dc.d)}%` }} />
            ))}
          </div>
          <div className="khi-dr-fill" style={{ left: `${pct(lo)}%`, width: `${Math.max(0, pct(hi) - pct(lo))}%` }} />
          {[['lo', lo], ['hi', hi]].map(([thumb, val]) => (
            <span
              key={thumb}
              role="slider"
              tabIndex={loading ? -1 : 0}
              aria-label={thumb === 'lo' ? UI.yearFrom : UI.yearTo}
              aria-valuemin={thumb === 'lo' ? safeMin : lo}
              aria-valuemax={thumb === 'lo' ? hi : safeMax}
              aria-valuenow={val}
              aria-valuetext={String(val)}
              className={`khi-dr-thumb${drag === thumb ? ' dragging' : ''}`}
              style={{ left: `${pct(val)}%` }}
              onPointerDown={startThumb(thumb)}
              onKeyDown={onKey(thumb)}
            >
              <span className="khi-dr-bubble">{val}</span>
            </span>
          ))}
        </div>
        <div className="khi-dr-ends" aria-hidden="true">
          <span>{safeMin}</span>
          <span>{safeMax}</span>
        </div>
      </div>

      {decades.length > 1 ? (
        <div className="khi-dr-decades" dir="ltr">
          {decades.map((dc) => (
            <button
              key={dc.d}
              type="button"
              className={`khi-dr-chip${decadeOn(dc.a, dc.b) ? ' on' : ''}`}
              onClick={onDecade(dc.a, dc.b)}
              disabled={loading}
            >
              {`${dc.d}s`}
            </button>
          ))}
        </div>
      ) : null}

      {/* Exact-day calendar inputs (refine the slider to a specific date). */}
      <div className="khi-dr-exact">
        <span className="khi-dr-exact-label">{UI.exactDates}</span>
        <div className="khi-dr-fields" dir="ltr">
          <label className="khi-dr-field">
            <span className="khi-dr-cap">{UI.dateStart}</span>
            <input
              type="date"
              value={from}
              min={minISO}
              max={to || maxISO}
              disabled={loading}
              onChange={(e) => emit({ from: e.target.value, to })}
              aria-label={UI.dateStart}
            />
          </label>
          <span className="khi-dr-arrow" aria-hidden="true">→</span>
          <label className="khi-dr-field">
            <span className="khi-dr-cap">{UI.dateEnd}</span>
            <input
              type="date"
              value={to}
              min={from || minISO}
              max={maxISO}
              disabled={loading}
              onChange={(e) => emit({ from, to: e.target.value })}
              aria-label={UI.dateEnd}
            />
          </label>
        </div>
      </div>

      {invalid ? <p className="khi-dr-err">{UI.dateInvalid}</p> : null}
    </div>
  )
}
```

---

## 4. The styles — `src/styles/khi-archive.css`

All filter-related CSS, in the order it appears in the stylesheet. Everything is
scoped under `.khi-root` so it never leaks into the admin UI.

### Sidebar / rail layout + facets + checkboxes

```css
/* Desktop: toggling the rail collapses its column (the results reflow to fill). */
@media(min-width:1025px){
  .khi-root .layout.side-hidden{grid-template-columns:0 1fr;gap:0}
  .khi-root .layout.side-hidden > .sidebar{opacity:0;transform:translateX(20px);pointer-events:none;overflow:hidden}
}

/* ============ SIDEBAR ============ */
.khi-root .sidebar{position:sticky;top:84px;max-height:calc(100dvh - 96px);overflow-y:auto;overflow-x:hidden;min-width:0;scrollbar-width:thin;scrollbar-color:var(--line-2) transparent;transition:opacity .3s ease,transform .42s cubic-bezier(.4,0,.2,1)}
.khi-root .sidebar::-webkit-scrollbar{width:7px}
.khi-root .sidebar::-webkit-scrollbar-thumb{background:var(--line-2);border-radius:8px}
.khi-root .sidebar::-webkit-scrollbar-track{background:transparent}

.khi-root .side-head{display:flex;align-items:center;gap:13px;padding-bottom:16px;margin-bottom:12px;border-bottom:1px solid var(--line)}
.khi-root .side-head .ic{width:40px;height:40px;border-radius:8px;background:var(--paper-2);border:1px solid var(--line-2);display:grid;place-items:center;color:var(--pine)}
.khi-root .side-head .ic svg{width:20px;height:20px}
.khi-root .side-head .eb{font-size:12px;color:var(--muted)}
.khi-root .side-head b{font-family:'Amiri',serif;font-weight:700;font-size:21px;display:block;line-height:1.2}
.khi-root .side-head-txt{display:block;min-width:0}
.khi-root .side-close{display:none;margin-inline-start:auto;width:38px;height:38px;flex-shrink:0;border-radius:8px;border:1px solid var(--line-2);background:var(--paper-2);color:var(--ink-soft);place-items:center;transition:.18s}
.khi-root .side-close svg{width:18px;height:18px}
.khi-root .side-close:hover{border-color:var(--pine-2);color:var(--ink);background:var(--paper-3)}

.khi-root .nav-list{display:flex;flex-direction:column;gap:3px}
.khi-root .nav-item{display:flex;align-items:center;gap:13px;padding:11px 13px;border-radius:8px;font-weight:600;font-size:15px;color:var(--ink-soft);transition:.18s;position:relative;text-align:right;width:100%}
.khi-root .nav-item svg{width:19px;height:19px;opacity:.7;flex-shrink:0}
.khi-root .nav-item:hover{background:var(--paper-2);color:var(--ink)}
.khi-root .nav-item.active{background:var(--pine);color:var(--cream)}
.khi-root .nav-item.active svg{opacity:1;color:var(--gold-bright)}
.khi-root .nav-item.active::after{content:"";position:absolute;right:-1px;top:9px;bottom:9px;width:3px;border-radius:3px;background:var(--gold-bright)}
.khi-root .nav-item .n-count{margin-right:auto;font-family:'IBM Plex Mono',monospace;font-size:11.5px;color:var(--muted);direction:ltr}
.khi-root .nav-item.active .n-count{color:var(--gold-soft)}

.khi-root .facet{border-top:1px solid var(--line);padding:16px 0}
.khi-root .facet summary{display:flex;align-items:center;cursor:pointer;list-style:none;font-weight:700;font-size:15px}
.khi-root .facet summary::-webkit-details-marker{display:none}
.khi-root .facet summary .chev{margin-right:auto;transition:.25s;color:var(--muted)}
.khi-root .facet[open] summary .chev{transform:rotate(180deg)}
.khi-root .facet summary svg.lead-ic{width:18px;height:18px;margin-left:11px;color:var(--pine)}
.khi-root .facet-body{padding-top:13px;display:flex;flex-direction:column;gap:9px}
.khi-root .check{display:flex;align-items:center;gap:11px;font-size:14.5px;color:var(--ink-soft);cursor:pointer;padding:2px 0}
.khi-root .check .box{width:17px;height:17px;border:1.5px solid var(--line-2);border-radius:4px;flex-shrink:0;transition:.15s;display:grid;place-items:center}
.khi-root .check:hover .box{border-color:var(--pine-2)}
.khi-root .check.on .box{background:var(--pine);border-color:var(--pine)}
.khi-root .check.on .box::after{content:"✓";color:var(--gold-bright);font-size:11px;font-weight:700}
.khi-root .check .c-count{margin-right:auto;font-family:'IBM Plex Mono',monospace;font-size:11.5px;color:var(--muted);direction:ltr}
.khi-root .filterbox{width:100%;padding:9px 12px;border:1px solid var(--line-2);border-radius:8px;background:var(--paper-2);font-size:13.5px;margin-bottom:6px}
.khi-root .filterbox:focus{outline:none;border-color:var(--pine-2)}
```

### Filters toggle button

```css
/* Filters toggle — shows/hides the rail; badges the live-filter count. */
.khi-root .filters-toggle{display:inline-flex;align-items:center;gap:9px;flex-shrink:0;height:44px;padding:0 16px;border-radius:8px;border:1px solid var(--line-2);background:var(--paper-2);color:var(--ink-soft);font-weight:700;font-size:14.5px;transition:.18s}
.khi-root .filters-toggle svg{width:18px;height:18px}
.khi-root .filters-toggle:hover{border-color:var(--pine-2);color:var(--ink);background:var(--paper-3)}
.khi-root .filters-toggle.on{background:var(--pine);border-color:var(--pine);color:var(--cream)}
.khi-root .filters-toggle.on svg{color:var(--gold-bright)}
.khi-root .filters-toggle .cnt{display:inline-grid;place-items:center;min-width:20px;height:20px;padding:0 6px;border-radius:20px;background:var(--gold-bright);color:var(--pine-deep);font-family:'IBM Plex Mono',monospace;font-size:11.5px;font-weight:700;direction:ltr}
```

### Mobile drawer + scrim

```css
.khi-root .scrim{position:fixed;inset:0;z-index:85;background:rgba(16,30,23,.5);backdrop-filter:blur(2px);opacity:0;pointer-events:none;transition:opacity .3s ease}
@media(max-width:1024px){
  .khi-root .sidebar{position:fixed;top:0;bottom:0;right:0;left:auto;width:min(88vw,360px);max-height:100dvh;z-index:90;background:var(--paper-2);border-left:1px solid var(--line-2);box-shadow:-22px 0 60px -28px rgba(16,30,23,.55);padding:22px 20px calc(22px + env(safe-area-inset-bottom));transform:translateX(110%);opacity:1;overflow-y:auto}
  .khi-root .layout:not(.side-hidden) > .sidebar{transform:none}
  .khi-root .layout:not(.side-hidden) .scrim{opacity:1;pointer-events:auto}
  .khi-root .side-close{display:grid}
}
```

### Active-filter chips + filter animations

```css
/* A small inline "active filters" strip above the grid */
.khi-root .active-chips{display:flex;flex-wrap:wrap;gap:8px;margin-bottom:20px}
.khi-root .active-chips .ac{display:inline-flex;align-items:center;gap:7px;padding:6px 12px;border-radius:8px;background:var(--pine);color:var(--cream);font-size:13px;font-weight:600;animation:khi-chip-in .28s cubic-bezier(.2,.7,.2,1)}
.khi-root .active-chips .ac .x{display:grid;place-items:center;width:16px;height:16px;border-radius:50%;background:rgba(231,211,160,.2);color:var(--gold-soft)}
.khi-root .active-chips .ac .x:hover{background:var(--gold-bright);color:var(--pine-deep)}
.khi-root .active-chips .clear-all{font-size:13px;font-weight:600;color:var(--clay)}

/* Mobile filter toggle (sidebar is hidden < 1024px) */
.khi-root .mobile-filter{display:none}
@media(max-width:1024px){.khi-root .mobile-filter{display:inline-flex}}

/* ── Filter animations (nice, layout-safe) ── */
@keyframes khi-facet-in{from{opacity:0;transform:translateY(-6px)}to{opacity:1;transform:none}}
@keyframes khi-row-in{from{opacity:0;transform:translateY(-4px)}to{opacity:1;transform:none}}
@keyframes khi-chip-in{from{opacity:0;transform:scale(.82) translateY(4px)}to{opacity:1;transform:none}}
.khi-root .facet-body{animation:khi-facet-in .26s cubic-bezier(.2,.7,.2,1)}
.khi-root .facet-body > .check{animation:khi-row-in .3s cubic-bezier(.2,.7,.2,1) both}
.khi-root .facet-body > .check:nth-child(1){animation-delay:.02s}
.khi-root .facet-body > .check:nth-child(2){animation-delay:.05s}
.khi-root .facet-body > .check:nth-child(3){animation-delay:.08s}
.khi-root .facet-body > .check:nth-child(4){animation-delay:.11s}
.khi-root .facet-body > .check:nth-child(5){animation-delay:.14s}
.khi-root .facet-body > .check:nth-child(6){animation-delay:.17s}
.khi-root .facet summary .chev{transition:transform .25s cubic-bezier(.2,.7,.2,1)}
@media (prefers-reduced-motion: reduce){
  .khi-root .facet-body,.khi-root .facet-body > .check,.khi-root .active-chips .ac{animation:none}
}
```

### Date-range slider, decade chips & calendar inputs

```css
/* ── Date range — enhanced YEAR slider + decade chips + calendar ── */
.khi-root .khi-dr{display:flex;flex-direction:column;gap:14px;width:100%}
.khi-root .khi-dr-readout{display:flex;align-items:center;justify-content:space-between;gap:10px;min-height:30px}
.khi-root .khi-dr-range{display:inline-flex;align-items:center;gap:8px;font-family:'IBM Plex Mono',monospace;direction:ltr;font-size:15px;font-weight:800;color:var(--pine);
  background:linear-gradient(180deg,#fffdf8,var(--paper-3));border:1px solid var(--line);border-radius:10px;padding:5px 14px;box-shadow:0 2px 7px -4px rgba(31,58,49,.4)}
.khi-root .khi-dr-range i{color:var(--gold);font-style:normal;font-weight:700}
.khi-root .khi-dr-all{font-size:13.5px;font-weight:600;color:var(--muted)}
.khi-root .khi-dr-reset{font-size:12.5px;font-weight:800;color:var(--clay);transition:.15s}
.khi-root .khi-dr-reset:hover{text-decoration:underline}

/* the slider sits in a padded stage so bubbles clear the top + end thumbs never clip */
.khi-root .khi-dr-slider{padding:34px 13px 2px}
.khi-root .khi-dr-rail{position:relative;height:12px;border-radius:99px;cursor:pointer;touch-action:none;
  background:linear-gradient(180deg,#e9efe6,#d6e1d2);
  box-shadow:inset 0 2px 5px rgba(20,38,32,.26),inset 0 -1px 0 rgba(255,255,255,.55),0 1px 0 rgba(255,255,255,.6)}
.khi-root .khi-dr-ticks{position:absolute;inset:0;pointer-events:none}
.khi-root .khi-dr-tick{position:absolute;top:50%;width:2px;height:12px;transform:translate(-50%,-50%);background:rgba(31,58,49,.14);border-radius:2px}
.khi-root .khi-dr-fill{position:absolute;top:0;bottom:0;border-radius:99px;overflow:hidden;
  background:linear-gradient(90deg,var(--gold),var(--gold-bright));
  box-shadow:0 0 0 1px rgba(176,136,51,.35),0 4px 14px -3px rgba(214,178,94,.6),inset 0 1px 0 rgba(255,255,255,.45)}
/* a slow sheen drifts across the active span */
.khi-root .khi-dr-fill::after{content:"";position:absolute;inset:0;
  background:linear-gradient(100deg,transparent 32%,rgba(255,255,255,.55) 50%,transparent 68%);
  background-size:220% 100%;animation:khi-dr-sheen 3.6s ease-in-out infinite}
@keyframes khi-dr-sheen{0%{background-position:130% 0}55%,100%{background-position:-50% 0}}
.khi-root .khi-dr-thumb{position:absolute;top:50%;width:26px;height:26px;border-radius:50%;transform:translate(-50%,-50%);z-index:3;cursor:grab;touch-action:none;
  background:radial-gradient(circle at 34% 28%,#fff,#f6dca0 56%,var(--gold-bright) 100%);border:2.5px solid var(--pine);
  box-shadow:0 4px 12px rgba(20,38,32,.4),inset 0 1px 0 rgba(255,255,255,.8);
  transition:box-shadow .18s ease,transform .1s ease}
.khi-root .khi-dr-thumb::after{content:"";position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);width:6px;height:6px;border-radius:50%;background:var(--pine);box-shadow:0 0 0 2px rgba(255,255,255,.5)}
.khi-root .khi-dr-thumb:hover{transform:translate(-50%,-50%) scale(1.08);box-shadow:0 6px 18px rgba(20,38,32,.5),0 0 0 6px rgba(44,84,72,.12)}
.khi-root .khi-dr-thumb:focus-visible{outline:none;box-shadow:0 4px 12px rgba(20,38,32,.4),0 0 0 5px rgba(44,84,72,.3)}
.khi-root .khi-dr-thumb.dragging{cursor:grabbing;transform:translate(-50%,-50%) scale(1.14);box-shadow:0 8px 22px rgba(20,38,32,.55),0 0 0 7px rgba(44,84,72,.16)}
/* always-on year bubble above each thumb */
.khi-root .khi-dr-bubble{position:absolute;bottom:calc(100% + 11px);left:50%;transform:translateX(-50%);
  font-family:'IBM Plex Mono',monospace;font-size:12px;font-weight:800;direction:ltr;white-space:nowrap;color:var(--cream);
  background:linear-gradient(165deg,var(--pine-2),var(--pine));padding:3px 9px;border-radius:8px;border:1px solid rgba(214,178,94,.45);
  box-shadow:0 6px 14px -6px rgba(20,38,32,.7);transition:transform .1s ease}
.khi-root .khi-dr-bubble::after{content:"";position:absolute;top:100%;left:50%;transform:translateX(-50%);border:5px solid transparent;border-top-color:var(--pine)}
.khi-root .khi-dr-thumb.dragging .khi-dr-bubble{transform:translateX(-50%) scale(1.1)}
.khi-root .khi-dr-ends{display:flex;justify-content:space-between;margin-top:11px;font-family:'IBM Plex Mono',monospace;font-size:11px;font-weight:600;color:var(--muted);direction:ltr}

/* one-tap decade shortcuts */
.khi-root .khi-dr-decades{display:flex;flex-wrap:wrap;gap:7px}
.khi-root .khi-dr-chip{flex:0 0 auto;font-family:'IBM Plex Mono',monospace;direction:ltr;font-size:12px;font-weight:700;color:var(--ink-soft);background:#fff;border:1px solid var(--line-2);border-radius:999px;padding:6px 12px;cursor:pointer;transition:.15s}
.khi-root .khi-dr-chip:hover{border-color:var(--pine-2);color:var(--pine);background:var(--paper-3);transform:translateY(-1px)}
.khi-root .khi-dr-chip.on{background:linear-gradient(165deg,var(--pine-2),var(--pine));border-color:var(--pine);color:var(--cream);box-shadow:0 5px 14px -5px rgba(31,58,49,.7)}

/* exact-day calendar inputs */
.khi-root .khi-dr-exact{display:flex;flex-direction:column;gap:8px;padding-top:13px;border-top:1px dashed var(--line-2)}
.khi-root .khi-dr-exact-label{font-size:11px;font-weight:700;color:var(--muted)}
.khi-root .khi-dr-fields{display:flex;align-items:flex-end;gap:8px}
.khi-root .khi-dr-field{display:flex;flex-direction:column;gap:5px;flex:1 1 0;min-width:0}
.khi-root .khi-dr-cap{font-size:10.5px;font-weight:700;color:var(--muted)}
.khi-root .khi-dr-field input[type=date]{color-scheme:light;width:100%;font-family:'IBM Plex Mono',monospace;font-size:12px;font-weight:600;color:var(--pine);
  background:#fff;border:1px solid var(--line-2);border-radius:10px;padding:8px 10px;cursor:pointer;transition:.15s}
.khi-root .khi-dr-field input[type=date]:hover{border-color:var(--pine-2)}
.khi-root .khi-dr-field input[type=date]:focus{outline:none;border-color:var(--pine);box-shadow:0 0 0 3px rgba(44,84,72,.16)}
.khi-root .khi-dr-field input[type=date]::-webkit-calendar-picker-indicator{cursor:pointer;opacity:.55;transition:.15s}
.khi-root .khi-dr-field input[type=date]:hover::-webkit-calendar-picker-indicator{opacity:1}
.khi-root .khi-dr-arrow{padding-bottom:9px;color:var(--gold);font-weight:800}
.khi-root .khi-dr-err{font-size:11.5px;font-weight:700;color:var(--clay);margin:0}
.khi-root .khi-dr.loading{opacity:.6;pointer-events:none}
.khi-root .khi-dr.loading .khi-dr-rail{background:linear-gradient(110deg,var(--paper-3) 8%,#fff 18%,var(--paper-3) 33%);background-size:200% 100%;animation:khi-shimmer 1.3s linear infinite}

/* Reduced-motion: drop the looping slider shimmer + sheen. */
@media (prefers-reduced-motion: reduce){
  .khi-root .khi-dr-fill::after{animation:none}
  .khi-root .khi-dr.loading .khi-dr-rail{animation:none}
}
```

### Media-type facet tweaks

```css
.khi-root .media-facet{border-top:none;padding-top:2px}
.khi-root .check .check-ic{width:16px;height:16px;flex-shrink:0;color:var(--pine);opacity:.6}
.khi-root .check.on .check-ic{opacity:1;color:var(--pine-2)}
```
