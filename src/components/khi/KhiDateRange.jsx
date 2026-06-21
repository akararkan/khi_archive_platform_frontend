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
