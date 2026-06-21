import { useEffect, useState } from 'react'

// ── useDataFacets ─────────────────────────────────────────────────────────────
// The entity-specific media filters (form, typeOfMaqam, color, status, …) are
// FREE TEXT on the backend — there's no fixed enum to list — so their checkbox
// options are discovered from the values actually present in the archive. We
// sample the active media scope once and tally each configured `field` into a
// facets-shaped `{ [paramKey]: [{ value, code, count }] }` map that the existing
// FacetGroup renders exactly like the server-provided facets.
//
// Notes:
//  • Sample-based, so a value not yet used in the data won't appear until it is.
//  • List fields (color/whereUsed/contributor) hold arrays — every element is
//    tallied. A field missing from the public DTO yields an empty group, which
//    FacetGroup hides — graceful, never an error.

const SAMPLE_SIZE = 200

function tally(map, raw) {
  if (raw == null) return
  const v = String(raw).trim()
  if (!v) return
  map.set(v, (map.get(v) || 0) + 1)
}

export function useDataFacets(type) {
  const [facets, setFacets] = useState({})

  useEffect(() => {
    const defs = type?.dataFacets
    if (!defs || !defs.length || typeof type.api !== 'function') {
      // Reset when leaving a media scope (feed / entity scopes have no data facets).
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setFacets({})
      return undefined
    }
    const ctrl = new AbortController()
    let alive = true

    type
      .api({ size: SAMPLE_SIZE, sortBy: 'createdAt', sortDirection: 'desc', signal: ctrl.signal })
      .then((res) => {
        if (!alive) return
        const items = res?.content || (Array.isArray(res) ? res : [])
        const maps = new Map(defs.map((d) => [d.paramKey, new Map()]))
        for (const item of items) {
          for (const d of defs) {
            const val = item?.[d.field]
            if (Array.isArray(val)) val.forEach((x) => tally(maps.get(d.paramKey), x))
            else tally(maps.get(d.paramKey), val)
          }
        }
        const out = {}
        for (const d of defs) {
          out[d.paramKey] = [...maps.get(d.paramKey).entries()]
            .map(([value, count]) => ({ value, code: value, count }))
            .sort((a, b) => b.count - a.count || a.value.localeCompare(b.value))
        }
        setFacets(out)
      })
      .catch(() => {
        if (alive) setFacets({})
      })

    return () => {
      alive = false
      ctrl.abort()
    }
  }, [type])

  return facets
}
