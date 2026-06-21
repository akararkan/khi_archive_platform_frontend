import React from 'react'

import { UI } from './khi-data'

// ── KhiDateRange ──────────────────────────────────────────────────────────────
// The catalogue's creation-date filter. Two native calendar inputs (From / To)
// — a real, familiar date picker, the easiest reliable way to pick a day — plus
// one-tap decade shortcuts for broad browsing. Values are ISO `yyyy-mm-dd`, so
// the URL/API contract (dateFrom/dateTo) stays exact to the day. The fields are
// laid out LTR (dates read naturally) inside the RTL rail.
//
// Props: from/to (ISO strings or '') · min/max (decade-snapped YEAR bounds, for
// the calendar's allowed span + decade chips) · onChange({from,to}) (empty edge
// = unfiltered) · loading (calm shell).

const isoStart = (y) => `${y}-01-01`
const isoEnd = (y) => `${y}-12-31`
const yearOf = (iso) => (iso ? Number(String(iso).slice(0, 4)) : null)

export default function KhiDateRange({ from = '', to = '', min, max, onChange, loading = false }) {
  const safeMinY = Number.isFinite(min) ? min : 1900
  const safeMaxY = Number.isFinite(max) && max > safeMinY ? max : safeMinY + 10
  const minISO = isoStart(safeMinY)
  const maxISO = isoEnd(safeMaxY)

  const hasFilter = Boolean(from || to)
  const invalid = Boolean(from && to && from > to)

  const emit = (next) => {
    if (loading) return
    onChange?.({ from: next.from || null, to: next.to || null })
  }

  // One chip per whole decade across the bounds (e.g. 1980 → 1980s … 2020s).
  const decades = []
  const lastDecade = Math.ceil(safeMaxY / 10) * 10 - 10
  for (let d = Math.floor(safeMinY / 10) * 10; d <= lastDecade; d += 10) {
    decades.push({ d, a: Math.max(d, safeMinY), b: Math.min(d + 9, safeMaxY) })
  }
  const fromY = yearOf(from)
  const toY = yearOf(to)
  const decadeOn = (a, b) => hasFilter && fromY === a && toY === b
  const onDecade = (a, b) => () =>
    emit(decadeOn(a, b) ? { from: '', to: '' } : { from: isoStart(a), to: isoEnd(b) })

  return (
    <div className={`khi-dr${loading ? ' loading' : ''}`}>
      <div className="khi-dr-readout">
        {hasFilter ? (
          <span className="khi-dr-range">
            <b>{from || '…'}</b><i>→</i><b>{to || '…'}</b>
          </span>
        ) : (
          <span className="khi-dr-all">{UI.allYears}</span>
        )}
        {hasFilter ? (
          <button type="button" className="khi-dr-reset" onClick={() => emit({ from: '', to: '' })}>
            {UI.reset}
          </button>
        ) : null}
      </div>

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

      {invalid ? <p className="khi-dr-err">{UI.dateInvalid}</p> : null}

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
    </div>
  )
}
