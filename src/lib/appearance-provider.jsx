// React provider for the appearance store. Holds the persisted state
// in a context so any consumer can read/write it; effects keep the
// DOM, localStorage, and system-preference subscription in sync.
//
// The store itself (./appearance.js) is pure JS so the boot script
// can apply the saved values before React renders. This provider
// picks up from there — its initial state mirrors what's already on
// the document, so the first React render does not cause a flash.

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'

import {
  ACCENT_PALETTE,
  DEFAULT_APPEARANCE,
  FONT_PALETTE,
  RADIUS_PALETTE,
  applyAppearance,
  readAppearance,
  resolveAppearance,
  subscribeAppearance,
  writeAppearance,
} from '@/lib/appearance'
import { AppearanceContext } from '@/lib/appearance-context.js'

export function AppearanceProvider({ children }) {
  const [state, setState] = useState(() => readAppearance())

  // Apply on every state change. The boot script already applied the
  // initial values, so the first effect run is effectively a no-op
  // unless something updated the store between boot and mount.
  useEffect(() => {
    applyAppearance(state)
    writeAppearance(state)
  }, [state])

  // Track the latest state via ref so the long-lived subscription
  // closure always reads the current mode without re-subscribing.
  // We update the ref inside an effect (never during render) so React
  // strict-mode rules stay happy.
  const stateRef = useRef(state)
  useEffect(() => {
    stateRef.current = state
  }, [state])

  useEffect(() => {
    return subscribeAppearance(
      () => stateRef.current,
      () => {
        // System mode flipped or another tab wrote to storage. Re-read
        // and re-apply so this tab catches up. We bypass setState if
        // the persisted blob is identical — that's the system-mode
        // case where we still want to re-apply the resolved CSS vars.
        const next = readAppearance()
        setState((prev) => (shallowEqual(prev, next) ? prev : next))
        applyAppearance(next)
      },
    )
  }, [])

  const update = useCallback((patch) => {
    setState((prev) => ({ ...prev, ...patch }))
  }, [])
  const reset = useCallback(() => setState({ ...DEFAULT_APPEARANCE }), [])

  const resolved = useMemo(() => resolveAppearance(state), [state])

  const value = useMemo(
    () => ({
      state,
      resolved,
      update,
      reset,
      accents: ACCENT_PALETTE,
      fonts: FONT_PALETTE,
      radii: RADIUS_PALETTE,
    }),
    [state, resolved, update, reset],
  )

  return <AppearanceContext.Provider value={value}>{children}</AppearanceContext.Provider>
}

function shallowEqual(a, b) {
  if (a === b) return true
  if (!a || !b) return false
  for (const k of Object.keys(a)) if (a[k] !== b[k]) return false
  for (const k of Object.keys(b)) if (a[k] !== b[k]) return false
  return true
}
