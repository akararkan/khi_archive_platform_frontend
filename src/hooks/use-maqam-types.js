import { useEffect, useMemo, useState } from 'react'

import { getMaqamTypes } from '@/services/maqam'

// Distinct maqam types panels have actually voted, most-common first, shaped for
// the filter kit's creatable dropdown (`TextFilter options`).
//
// `maqamType` is an exact, case-insensitive match on a free-text Kurdish name,
// so a typed spelling variant silently matches nothing — offering the real
// values is what makes that filter trustworthy. Still free text: whatever ends
// up in the box is what gets sent.
//
// The response is normalised defensively: the endpoint may return plain strings
// or count objects, and either is fine here.
function useMaqamTypeOptions() {
  const [types, setTypes] = useState([])

  useEffect(() => {
    let cancelled = false
    getMaqamTypes()
      .then((data) => {
        if (!cancelled) setTypes(Array.isArray(data) ? data : [])
      })
      .catch(() => {
        // Non-fatal — the filter just stays a plain text box.
      })
    return () => {
      cancelled = true
    }
  }, [])

  return useMemo(() => {
    const seen = new Set()
    const options = []
    for (const entry of types) {
      const value =
        typeof entry === 'string'
          ? entry
          : entry?.maqamType ?? entry?.type ?? entry?.name ?? entry?.value ?? entry?.label
      const clean = String(value ?? '').trim()
      if (!clean || seen.has(clean.toLowerCase())) continue
      seen.add(clean.toLowerCase())
      const count = typeof entry === 'object' ? entry?.count ?? entry?.total ?? entry?.votes : null
      options.push(Number.isFinite(count) ? { value: clean, hint: `${count}` } : { value: clean })
    }
    return options
  }, [types])
}

export { useMaqamTypeOptions }
