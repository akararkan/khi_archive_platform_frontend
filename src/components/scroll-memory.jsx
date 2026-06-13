import { useEffect, useRef } from 'react'
import { useLocation } from 'react-router-dom'

import { getPageState, setPageState } from '@/lib/page-state'

// Remembers the window scroll position per route so returning to a page lands
// you where you left off — the scroll companion to usePersistentState.
//
// Mounted once at the app root (it never unmounts), it watches location and:
//   • continuously saves the current path's scrollY (rAF-throttled),
//   • on a path change, restores the incoming path's saved scrollY, retrying
//     across a few frames while async content grows the page tall enough.
//
// Layouts here scroll the WINDOW (min-h-dvh, no inner scroll container), so
// window.scrollY is the single source of truth. Cleared on full reload along
// with the rest of the page-state store.
function ScrollMemory() {
  const { pathname } = useLocation()
  // While we're programmatically restoring, suppress saves — otherwise a
  // not-yet-tall page clamps scrollTo() and we'd overwrite the saved value.
  const restoringRef = useRef(false)

  // Save on scroll for the current path.
  useEffect(() => {
    const key = `scroll:${pathname}`
    let raf = 0
    const onScroll = () => {
      if (restoringRef.current) return
      cancelAnimationFrame(raf)
      raf = requestAnimationFrame(() => setPageState(key, { value: window.scrollY }))
    }
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => {
      window.removeEventListener('scroll', onScroll)
      cancelAnimationFrame(raf)
      if (!restoringRef.current) setPageState(key, { value: window.scrollY })
    }
  }, [pathname])

  // Restore on path change (best-effort while the page finishes rendering).
  useEffect(() => {
    const key = `scroll:${pathname}`
    const target = getPageState(key)?.value ?? 0

    restoringRef.current = true
    let raf = 0
    let tries = 0
    const apply = () => {
      window.scrollTo(0, target)
      tries += 1
      const settled = Math.abs(window.scrollY - target) <= 2
      if (!settled && tries < 30) {
        raf = requestAnimationFrame(apply)
      } else {
        restoringRef.current = false
      }
    }
    raf = requestAnimationFrame(apply)
    // Hard stop so we never get stuck suppressing saves.
    const stop = window.setTimeout(() => {
      restoringRef.current = false
    }, 1200)

    return () => {
      cancelAnimationFrame(raf)
      window.clearTimeout(stop)
      restoringRef.current = false
    }
  }, [pathname])

  return null
}

export { ScrollMemory }
