import React, { useEffect, useRef, useState } from 'react'

import { UI } from './khi-data'

// ── KhiYearRange ──────────────────────────────────────────────────────────────
// A bespoke dual-thumb TIMELINE slider for the public catalogue's date filter.
// Heritage-styled (pine rail, gold active span, draggable medallion handles),
// fully keyboard-accessible, laid out LTR (years read oldest → newest) inside
// the RTL rail. Bounds are decade-snapped upstream so the track + the one-tap
// DECADE chips below it always line up.
//
// Props: min/max (decade-snapped bounds) · from/to (selected YEARS or null) ·
// onChange({from,to}) (null edge = unfiltered) · loading (calm shell).

const clamp = (n, a, b) => Math.min(b, Math.max(a, n))

export default function KhiYearRange({ min, max, from, to, onChange, loading = false }) {
  const trackRef = useRef(null)
  const [drag, setDrag] = useState(null)   // 'lo' | 'hi' | null
  const [draft, setDraft] = useState(null) // [lo, hi] while dragging | null

  const safeMin = Number.isFinite(min) ? min : 1900
  const safeMax = Number.isFinite(max) && max > safeMin ? max : safeMin + 10
  const span = Math.max(1, safeMax - safeMin)

  const hasFilter = from != null || to != null
  const rawLo = from == null ? safeMin : clamp(from, safeMin, safeMax)
  const rawHi = to == null ? safeMax : clamp(to, safeMin, safeMax)
  const activeLo = Math.min(rawLo, rawHi)
  const activeHi = Math.max(rawLo, rawHi)
  const lo = draft ? draft[0] : activeLo
  const hi = draft ? draft[1] : activeHi

  const pct = (y) => ((clamp(y, safeMin, safeMax) - safeMin) / span) * 100

  // Fresh values for the window drag listeners without re-subscribing per render.
  const ref = useRef({})
  useEffect(() => { ref.current = { safeMin, safeMax, span, onChange, lo, hi } })

  const commit = (a, b) => {
    const { safeMin: loB, safeMax: hiB, onChange: emit } = ref.current
    let na = clamp(Math.round(a), loB, hiB)
    let nb = clamp(Math.round(b), loB, hiB)
    if (na > nb) [na, nb] = [nb, na]
    emit({ from: na <= loB ? null : na, to: nb >= hiB ? null : nb })
  }

  const yearAt = (clientX) => {
    const el = trackRef.current
    const { safeMin: loB, span: sp } = ref.current
    if (!el) return loB
    const r = el.getBoundingClientRect()
    const ratio = clamp((clientX - r.left) / (r.width || 1), 0, 1)
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
      commit(ref.current.lo, ref.current.hi)
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
    if (thumb === 'lo') commit(Math.min(a, hi), hi)
    else commit(lo, Math.max(b, lo))
  }

  // One chip per whole decade in range (e.g. 1980 → [1980s … 2020s], no stub).
  const decades = []
  const lastDecade = Math.ceil(safeMax / 10) * 10 - 10
  for (let d = Math.floor(safeMin / 10) * 10; d <= lastDecade; d += 10) {
    decades.push({ d, a: Math.max(d, safeMin), b: Math.min(d + 9, safeMax) })
  }
  const decadeActive = (a, b) => hasFilter && activeLo === a && activeHi === b
  const onDecade = (a, b) => () => {
    if (loading) return
    decadeActive(a, b) ? commit(safeMin, safeMax) : commit(a, b)
  }

  return (
    <div className={`khi-yr${loading ? ' loading' : ''}`}>
      <div className="khi-yr-readout">
        {hasFilter ? (
          <span className="khi-yr-range"><b>{lo}</b><i>–</i><b>{hi}</b></span>
        ) : (
          <span className="khi-yr-all">{UI.allYears}</span>
        )}
        {hasFilter ? (
          <button type="button" className="khi-yr-reset" onClick={() => commit(safeMin, safeMax)}>{UI.reset}</button>
        ) : null}
      </div>

      <div className="khi-yr-stage" dir="ltr">
        <div className="khi-yr-rail" ref={trackRef} onPointerDown={onRailDown}>
          <div className="khi-yr-ticks" aria-hidden="true">
            {decades.slice(1).map((dc) => (
              <span key={dc.d} className="khi-yr-tick" style={{ left: `${pct(dc.d)}%` }} />
            ))}
          </div>
          <div className="khi-yr-fill" style={{ left: `${pct(lo)}%`, width: `${Math.max(0, pct(hi) - pct(lo))}%` }} />
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
              className={`khi-yr-thumb${drag === thumb ? ' dragging' : ''}`}
              style={{ left: `${pct(val)}%` }}
              onPointerDown={startThumb(thumb)}
              onKeyDown={onKey(thumb)}
            >
              <span className="khi-yr-bubble">{val}</span>
            </span>
          ))}
        </div>
        <div className="khi-yr-ends" aria-hidden="true">
          <span>{safeMin}</span>
          <span>{safeMax}</span>
        </div>
      </div>

      {decades.length > 1 ? (
        <div className="khi-yr-decades" dir="ltr">
          {decades.map((dc) => (
            <button
              key={dc.d}
              type="button"
              className={`khi-yr-chip${decadeActive(dc.a, dc.b) ? ' on' : ''}`}
              onClick={onDecade(dc.a, dc.b)}
            >
              {`${dc.d}s`}
            </button>
          ))}
        </div>
      ) : null}
    </div>
  )
}
