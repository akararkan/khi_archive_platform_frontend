import { useEffect, useState } from 'react'
import { Outlet, useLocation } from 'react-router-dom'

import { ScrollMemory } from '@/components/scroll-memory'
import { AppearanceTweaker } from '@/components/ui/appearance-tweaker'

function App() {
  const { pathname } = useLocation()
  // The appearance tweaker belongs to internal dashboard workspaces only.
  // Public, guest account, auth, and teacher surfaces keep their own fixed skin.
  const showTweaker = pathname.startsWith('/admin') || pathname.startsWith('/employee')
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

    // Everything that exposes public archive media, including the thumbnails
    // and portraits shown throughout the catalogue. This effect only exists
    // while a /public route is mounted, so staff workspaces keep their normal
    // context menus and media interactions.
    const protectedMediaSelector =
      'img, picture, video, audio, canvas, .protected-media, .protected-file-viewer, .media-stage, .player-mount, .protected-media-player'
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
    // Windows writes the PrintScreen capture to the clipboard as a bitmap
    // itself, at the OS level — no amount of preventDefault() on the key
    // event stops that (browsers can't intercept hardware-level capture).
    // What we CAN do: the instant the key is released, overwrite whatever
    // just landed on the clipboard with a plain-text notice, so a paste
    // lands this message instead of the archive image. Best-effort and
    // Windows/Chromium-specific — silently a no-op everywhere else
    // (macOS/Linux screenshot shortcuts don't touch the clipboard this
    // way, and the Clipboard API needs a secure context + permission).
    const scrubPrintScreenClipboard = (event) => {
      const key = event.key?.toLowerCase()
      if (key !== 'printscreen' && key !== 'snapshot') return
      navigator.clipboard
        ?.writeText('KHI Archive — screenshots of protected media are discouraged. Contact the archive team for reproduction requests.')
        .catch(() => {})
    }

    document.addEventListener('keydown', preventImplicitFormSubmit, true)
    document.addEventListener('keydown', preventForbiddenKeys, true)
    document.addEventListener('keyup', scrubPrintScreenClipboard, true)
    document.addEventListener('copy', preventClipboard, true)
    document.addEventListener('cut', preventClipboard, true)
    document.addEventListener('paste', preventClipboard, true)
    // Cover every public catalogue route, including /public/browse and all
    // entity detail pages. The surrounding publicRoute guard is the boundary.
    document.addEventListener('contextmenu', preventContextMenu, true)
    document.addEventListener('auxclick', preventProtectedMediaAuxOpen, true)
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
      document.removeEventListener('keyup', scrubPrintScreenClipboard, true)
      document.removeEventListener('copy', preventClipboard, true)
      document.removeEventListener('cut', preventClipboard, true)
      document.removeEventListener('paste', preventClipboard, true)
      document.removeEventListener('contextmenu', preventContextMenu, true)
      document.removeEventListener('auxclick', preventProtectedMediaAuxOpen, true)
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
      {showTweaker ? <AppearanceTweaker /> : null}
      {publicRoute && isScreenLocked ? <div className="screen-locked-overlay" aria-hidden="true" /> : null}
    </main>
  )
}

export default App
