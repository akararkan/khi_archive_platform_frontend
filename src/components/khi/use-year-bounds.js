// Derives the [min, max] YEAR span that the date-range timeline should cover,
// straight from the live data — so the slider always starts at the oldest
// record in the archive and ends at the newest, and re-derives whenever the
// active media type (or the data behind it) changes.
//
// Strategy, cheapest-first, unioned so we never under-cover the real span:
//   1. A year range advertised by /guest/facets, if the backend exposes one
//      (several shapes tolerated, so a later backend rename won't break us).
//   2. Two tiny sorted probes against the active type's endpoint —
//      sortBy=date asc → the oldest record, desc → the newest. The reference
//      guarantees every guest endpoint honours sortBy=date.
//   3. A sane fallback ([1900 … current year]) so the control is never empty
//      while probes are in flight or if the archive is empty.
//
// The union means: the moment the backend adds an authoritative year facet,
// it is honoured automatically without touching this file.

import { useEffect, useMemo, useState } from 'react'

import { yearNum } from './khi-data'

const FIRST_FALLBACK = 1900

function currentYear() {
  return new Date().getFullYear()
}

function clampYear(n) {
  if (!Number.isFinite(n)) return null
  // Guard against junk dates leaking into bounds (e.g. a stray 19012 typo).
  if (n < 1000 || n > currentYear() + 1) return null
  return Math.round(n)
}

// Best-effort read of a year range the facets payload might carry, under any
// of a handful of plausible field names / shapes.
function readFacetYearRange(facets) {
  if (!facets || typeof facets !== 'object') return null
  const candidates = []

  // years: [{ value, count }] histogram
  const hist = facets.years || facets.decades || facets.dateHistogram
  if (Array.isArray(hist)) {
    for (const e of hist) {
      const v = clampYear(Number(e?.value ?? e?.year ?? e?.label ?? e))
      if (v != null) candidates.push(v)
    }
  }

  // { min, max } / { from, to } / [min, max] objects
  const range = facets.yearRange || facets.dateRange || facets.years
  if (range && !Array.isArray(range) && typeof range === 'object') {
    const a = clampYear(Number(range.min ?? range.from ?? range.start ?? range.oldest))
    const b = clampYear(Number(range.max ?? range.to ?? range.end ?? range.newest))
    if (a != null) candidates.push(a)
    if (b != null) candidates.push(b)
  } else if (Array.isArray(range) && range.length === 2 && typeof range[0] !== 'object') {
    const a = clampYear(Number(range[0]))
    const b = clampYear(Number(range[1]))
    if (a != null) candidates.push(a)
    if (b != null) candidates.push(b)
  }

  // Flat min/max keys
  for (const k of ['minYear', 'oldestYear', 'earliestYear']) {
    const v = clampYear(Number(facets[k]))
    if (v != null) candidates.push(v)
  }
  for (const k of ['maxYear', 'newestYear', 'latestYear']) {
    const v = clampYear(Number(facets[k]))
    if (v != null) candidates.push(v)
  }

  if (!candidates.length) return null
  return { min: Math.min(...candidates), max: Math.max(...candidates) }
}

// Pull a representative content year out of a (paginated or array) response.
function probeYear(res) {
  const item = res?.content?.[0] ?? (Array.isArray(res) ? res[0] : res?.[0])
  return clampYear(yearNum(item || {}))
}

// type: the active TYPE registry entry (has `.api` + `.showDateRange`).
// facets: the global /guest/facets payload (may be null while loading).
export function useYearBounds(type, facets) {
  const fallback = useMemo(() => ({ min: FIRST_FALLBACK, max: currentYear() }), [])
  const [probed, setProbed] = useState(null)
  const [loading, setLoading] = useState(false)
  // True once the first probe for the active type has settled (resolved OR
  // failed). The slider stays in its calm "loading" shell until then, then
  // becomes interactive on whatever bounds we have — probed, facet-derived,
  // or the [1900 … now] fallback — so it can never get stuck disabled when a
  // probe returns no dated rows.
  const [settled, setSettled] = useState(false)

  const enabled = Boolean(type?.showDateRange)
  const typeKey = type?.key

  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    // When the active type has no date range, leave state alone — the memo
    // below already returns nulls for disabled types, so stale probe data
    // can't leak into the output.
    if (!enabled || typeof type?.api !== 'function') return undefined
    let cancelled = false
    setProbed(null) // clear a previous type's span so it never flashes
    setSettled(false)
    setLoading(true)
    const base = { page: 0, size: 1, sortBy: 'date' }
    Promise.all([
      type.api({ ...base, sortDirection: 'asc' }).catch(() => null),
      type.api({ ...base, sortDirection: 'desc' }).catch(() => null),
    ])
      .then(([oldest, newest]) => {
        if (cancelled) return
        const a = probeYear(oldest)
        const b = probeYear(newest)
        const found = [a, b].filter((n) => n != null)
        setProbed(found.length ? { min: Math.min(...found), max: Math.max(...found) } : null)
      })
      .finally(() => { if (!cancelled) { setLoading(false); setSettled(true) } })
    return () => { cancelled = true }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled, typeKey])
  /* eslint-enable react-hooks/set-state-in-effect */

  return useMemo(() => {
    if (!enabled) return { min: null, max: null, loading: false, ready: false }
    const facetRange = readFacetYearRange(facets)
    const mins = [probed?.min, facetRange?.min].filter((n) => n != null)
    const maxs = [probed?.max, facetRange?.max].filter((n) => n != null)
    let min = mins.length ? Math.min(...mins) : fallback.min
    let max = maxs.length ? Math.max(...maxs) : fallback.max
    if (max < min) [min, max] = [max, min]
    // The span tracks the DATA: oldest record → newest record. Only guard
    // against a collapsed (single-year) span so the track is always draggable.
    if (max - min < 1) min = max - 1
    // Interactive once the probe settles or a facet range is known — never
    // stuck if a type has no dated rows (we fall back to [1900 … now]).
    const ready = settled || facetRange != null
    return { min, max, loading, ready }
  }, [enabled, facets, probed, loading, settled, fallback])
}

export default useYearBounds
