import { useEffect, useState } from 'react'

import { getPageState, setPageState } from '@/lib/page-state'

// Drop-in replacement for useState that survives React Router navigations.
//
// State is kept in the in-memory page-state store (cleared on full reload), so
// when a user filters/sorts/paginates a list, leaves to another page, and comes
// back, their view is exactly as they left it. Use it for TRANSIENT VIEW state
// — search text, filters, sort, current page, view mode, open panels, active
// tab. Do NOT use it for fetched data (refetch that fresh) or for modal/dialog
// open flags (a dialog shouldn't silently reopen on return).
//
//   const [filter, setFilter] = usePersistentState('employee.items.filter', INITIAL)
//
// `key` must be globally unique per field — prefix it with a stable page
// namespace. The API mirrors useState exactly (lazy initial + functional
// updates both supported), so adopting it is a one-line change per field.
export function usePersistentState(key, initialValue) {
  const [value, setValue] = useState(() => {
    const cached = getPageState(key)
    // A stored entry is wrapped in { value } so a legitimately-stored
    // undefined/null/'' is still honoured (not treated as "no cache").
    if (cached) return cached.value
    return typeof initialValue === 'function' ? initialValue() : initialValue
  })

  // Write through to the store after every change (and on mount, seeding it).
  // Writing to an external store from an effect is the intended use of effects.
  useEffect(() => {
    setPageState(key, { value })
  }, [key, value])

  return [value, setValue]
}
