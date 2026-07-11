import { useEffect, useState } from 'react'
import { Outlet, useLocation } from 'react-router-dom'

import { ScrollMemory } from '@/components/scroll-memory'
import { AppearanceTweaker } from '@/components/ui/appearance-tweaker'

function App() {
  const { pathname } = useLocation()
  // The guest (public) and teacher surfaces wear the warm "Living Archive" skin
  // and get their own background-tone slider instead of the full appearance
  // tweaker, so we hide the tweaker there.
  const hideTweaker = pathname.startsWith('/public') || pathname.startsWith('/teacher')
  const publicRoute = pathname.startsWith('/public')
  const [isScreenLocked, setIsScreenLocked] = useState(false)

  useEffect(() => {
    if (!publicRoute) return undefined

    const preventImplicitFormSubmit = (event) => {
      if (
        event.key !== 'Enter' ||
        event.defaultPrevented ||
        event.isComposing
      ) {
        return
      }

      const target = event.target
      if (!(target instanceof Element) || !target.closest('form')) return

      // Multiline editors keep their normal newline behavior. Controls with
      // their own Enter handling (tags, autocomplete, etc.) call
      // preventDefault before this document-level guard receives the event.
      if (
        target.closest('textarea, [contenteditable="true"]') ||
        target.closest('button, [role="button"]')
      ) {
        return
      }

      event.preventDefault()
    }

    const protectedMediaSelector =
      'video, audio, canvas, .protected-media, .protected-file-viewer, .media-stage, .player-mount, .protected-media-player'
    const preventClipboard = (event) => event.preventDefault()
    const preventSelection = (event) => event.preventDefault()
    const preventContextMenu = (event) => {
      const target = event.target
      if (!(target instanceof Element)) return
      if (target.closest(protectedMediaSelector)) {
        event.preventDefault()
      }
    }
    const preventProtectedMediaAuxOpen = (event) => {
      if (event.button !== 1) return
      const target = event.target
      if (!(target instanceof Element)) return
      if (target.closest(protectedMediaSelector)) {
        event.preventDefault()
      }
    }
    const preventForbiddenKeys = (event) => {
      const key = event.key?.toLowerCase()
      const isCmd = event.metaKey || event.ctrlKey
      const isShift = event.shiftKey
      const isAlt = event.altKey

      if (key === 'printscreen' || key === 'snapshot') {
        event.preventDefault()
      }
      if (key === 'f12') {
        event.preventDefault()
      }
      if (isCmd && isShift && ['i', 'c', 'j', 'p', '3', '4', '5', '6', 's'].includes(key)) {
        event.preventDefault()
      }
      if (isCmd && ['u', 's', 'p'].includes(key)) {
        event.preventDefault()
      }
      if (isCmd && isAlt && ['i', 'p', 's'].includes(key)) {
        event.preventDefault()
      }
      if (isAlt && isShift && ['printscreen', 's'].includes(key)) {
        event.preventDefault()
      }
    }

    const preventDrag = (event) => event.preventDefault()
    const preventBeforePrint = (event) => event.preventDefault()
    const lockWhenHidden = () => {
      setIsScreenLocked(document.visibilityState !== 'visible')
    }

    document.addEventListener('keydown', preventImplicitFormSubmit, true)
    document.addEventListener('keydown', preventForbiddenKeys, true)
    document.addEventListener('copy', preventClipboard, true)
    document.addEventListener('cut', preventClipboard, true)
    document.addEventListener('paste', preventClipboard, true)
    // Only suppress context menu / middle-click open for the public
    // homepage and individual public item pages (images/texts/videos/audios/etc.).
    const protectMediaRoute = pathname === '/public' || /^\/public\/(images|texts|videos|audios|physical-media|projects|persons)(?:\/|$)/.test(pathname)
    if (protectMediaRoute) {
      document.addEventListener('contextmenu', preventContextMenu, true)
      document.addEventListener('auxclick', preventProtectedMediaAuxOpen, true)
    }
    document.addEventListener('selectstart', preventSelection, true)
    document.addEventListener('dragstart', preventDrag, true)
    window.addEventListener('beforeprint', preventBeforePrint)
    window.addEventListener('visibilitychange', lockWhenHidden)
    window.addEventListener('blur', lockWhenHidden)
    window.addEventListener('focus', lockWhenHidden)
    lockWhenHidden()

    return () => {
      document.removeEventListener('keydown', preventImplicitFormSubmit, true)
      document.removeEventListener('keydown', preventForbiddenKeys, true)
      document.removeEventListener('copy', preventClipboard, true)
      document.removeEventListener('cut', preventClipboard, true)
      document.removeEventListener('paste', preventClipboard, true)
      if (protectMediaRoute) {
        document.removeEventListener('contextmenu', preventContextMenu, true)
        document.removeEventListener('auxclick', preventProtectedMediaAuxOpen, true)
      }
      document.removeEventListener('selectstart', preventSelection, true)
      document.removeEventListener('dragstart', preventDrag, true)
      window.removeEventListener('beforeprint', preventBeforePrint)
      window.removeEventListener('visibilitychange', lockWhenHidden)
      window.removeEventListener('blur', lockWhenHidden)
      window.removeEventListener('focus', lockWhenHidden)
    }
  }, [publicRoute])

  return (
    <main className="min-h-dvh bg-background text-foreground">
      {/* Remembers per-route scroll position across navigations. */}
      <ScrollMemory />
      <Outlet />
      {hideTweaker ? null : <AppearanceTweaker />}
      {publicRoute && isScreenLocked ? <div className="screen-locked-overlay" aria-hidden="true" /> : null}
    </main>
  )
}

export default App
