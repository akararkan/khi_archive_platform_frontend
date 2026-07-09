import { useEffect } from 'react'
import { Outlet, useLocation } from 'react-router-dom'

import { ScrollMemory } from '@/components/scroll-memory'
import { AppearanceTweaker } from '@/components/ui/appearance-tweaker'

function App() {
  const { pathname } = useLocation()
  // The guest (public) and teacher surfaces wear the warm "Living Archive" skin
  // and get their own background-tone slider instead of the full appearance
  // tweaker, so we hide the tweaker there.
  const hideTweaker = pathname.startsWith('/public') || pathname.startsWith('/teacher')

  useEffect(() => {
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

    const preventContextMenu = (event) => event.preventDefault()
    const preventClipboard = (event) => event.preventDefault()
    const preventScreenshotKeys = (event) => {
      const key = event.key?.toLowerCase()
      if (key === 'printscreen') {
        event.preventDefault()
      }
      if ((event.ctrlKey || event.metaKey) && event.shiftKey && ['3', '4', '5'].includes(key)) {
        event.preventDefault()
      }
      if (event.ctrlKey && key === 'p') {
        event.preventDefault()
      }
    }

    const preventDrag = (event) => event.preventDefault()

    document.addEventListener('keydown', preventImplicitFormSubmit)
    document.addEventListener('keydown', preventScreenshotKeys)
    document.addEventListener('contextmenu', preventContextMenu)
    document.addEventListener('copy', preventClipboard)
    document.addEventListener('cut', preventClipboard)
    document.addEventListener('paste', preventClipboard)
    document.addEventListener('dragstart', preventDrag)
    return () => {
      document.removeEventListener('keydown', preventImplicitFormSubmit)
      document.removeEventListener('keydown', preventScreenshotKeys)
      document.removeEventListener('contextmenu', preventContextMenu)
      document.removeEventListener('copy', preventClipboard)
      document.removeEventListener('cut', preventClipboard)
      document.removeEventListener('paste', preventClipboard)
      document.removeEventListener('dragstart', preventDrag)
    }
  }, [])

  return (
    <main className="min-h-dvh bg-background text-foreground">
      {/* Remembers per-route scroll position across navigations. */}
      <ScrollMemory />
      <Outlet />
      {hideTweaker ? null : <AppearanceTweaker />}
    </main>
  )
}

export default App
