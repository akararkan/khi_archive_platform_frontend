import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react'

// Positions a floating element (a dropdown menu) against an anchor (the
// trigger) using `position: fixed` viewport coordinates. Because the menu is
// rendered in a portal at <body>, NO `overflow:hidden` ancestor — a Card, a
// table wrapper, a scrollable dialog — can ever clip it. That's what
// guarantees "all options visible".
//
// It picks the side with more room (flips up near the bottom of the viewport),
// caps the height to the available space (so a long list scrolls inside the
// menu instead of running off-screen), keeps the menu at least as wide as the
// trigger, and re-measures on scroll (capture phase, so ancestor scrolls count)
// and resize.
//
//   const { floatingRef, style } = useAnchoredPosition(anchorRef, open)
//   return open ? createPortal(<div ref={floatingRef} style={style}>…</div>, document.body) : null
export function useAnchoredPosition(anchorRef, open, options = {}) {
  const { gap = 6, align = 'start', minHeight = 160, viewportPadding = 8 } = options
  const floatingRef = useRef(null)
  const [style, setStyle] = useState(null)

  const update = useCallback(() => {
    const anchor = anchorRef.current
    if (!anchor || typeof window === 'undefined') return

    const rect = anchor.getBoundingClientRect()
    const vw = window.innerWidth
    const vh = window.innerHeight

    const spaceBelow = vh - rect.bottom - gap - viewportPadding
    const spaceAbove = rect.top - gap - viewportPadding

    // Prefer opening downward; flip up only when below is cramped and above
    // has more room.
    const floating = floatingRef.current
    const desired = floating ? floating.scrollHeight : 0
    const openUp = spaceBelow < Math.min(desired || minHeight, 240) && spaceAbove > spaceBelow

    const maxHeight = Math.max(minHeight, Math.floor(openUp ? spaceAbove : spaceBelow))
    const minWidth = rect.width

    // Horizontal placement, clamped to the viewport so the menu never bleeds
    // off the left/right edges.
    const floatingWidth = floating ? Math.max(floating.offsetWidth, minWidth) : minWidth
    let left = align === 'end' ? rect.right - floatingWidth : rect.left
    left = Math.min(left, vw - floatingWidth - viewportPadding)
    left = Math.max(viewportPadding, left)

    const next = {
      position: 'fixed',
      left: `${Math.round(left)}px`,
      minWidth: `${Math.round(minWidth)}px`,
      maxHeight: `${maxHeight}px`,
      zIndex: 120,
    }
    if (openUp) next.bottom = `${Math.round(vh - rect.top + gap)}px`
    else next.top = `${Math.round(rect.bottom + gap)}px`

    setStyle(next)
  }, [anchorRef, gap, align, minHeight, viewportPadding])

  // Measure synchronously after the menu mounts to avoid a flash at (0,0). No
  // reset on close is needed — the caller unmounts the menu while closed, and
  // the next open re-measures here before paint.
  useLayoutEffect(() => {
    if (!open) return undefined
    update()
    // A second pass on the next frame, once the menu has real dimensions, so
    // the flip-up decision uses the true content height.
    const raf = requestAnimationFrame(update)
    return () => cancelAnimationFrame(raf)
  }, [open, update])

  useEffect(() => {
    if (!open || typeof window === 'undefined') return undefined
    const onChange = () => update()
    // Capture phase so scrolls inside ANY ancestor (not just window) reposition
    // the menu.
    window.addEventListener('scroll', onChange, true)
    window.addEventListener('resize', onChange)

    let observer
    if (typeof ResizeObserver !== 'undefined' && floatingRef.current) {
      observer = new ResizeObserver(() => update())
      observer.observe(floatingRef.current)
    }

    return () => {
      window.removeEventListener('scroll', onChange, true)
      window.removeEventListener('resize', onChange)
      observer?.disconnect()
    }
  }, [open, update])

  return { floatingRef, style }
}
