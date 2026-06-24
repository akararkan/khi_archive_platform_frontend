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

const FETCH_SIZE = 500
const MAX_PAGES = 200

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
      // Reset when leaving a media scope (mixed grid / entity scopes have no data facets).
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setFacets({})
      return undefined
    }
    const ctrl = new AbortController()
    let alive = true

    async function fetchAll() {
      const items = []
      let page = 0
      let totalPages = 1

      while (alive && !ctrl.signal.aborted && page < totalPages && page < MAX_PAGES) {
        const res = await type.api({
          page,
          size: FETCH_SIZE,
          signal: ctrl.signal,
        })
        const content = res?.content || (Array.isArray(res) ? res : [])
        items.push(...content)
        const explicitPages = Number(res?.totalPages)
        if (Number.isFinite(explicitPages) && explicitPages > 0) {
          totalPages = explicitPages
        } else {
          const total = Number(res?.totalElements)
          totalPages = Number.isFinite(total) && content.length > 0
            ? Math.ceil(total / content.length)
            : 1
        }
        page += 1
      }

      return items
    }

    fetchAll()
      .then((res) => {
        if (!alive) return
        const items = Array.isArray(res) ? res : []
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
