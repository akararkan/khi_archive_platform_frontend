import { Outlet, useLocation } from 'react-router-dom'

import { ScrollMemory } from '@/components/scroll-memory'
import { AppearanceTweaker } from '@/components/ui/appearance-tweaker'

function App() {
  const { pathname } = useLocation()
  // The guest (public) and teacher surfaces wear the warm "Living Archive" skin
  // and get their own background-tone slider instead of the full appearance
  // tweaker, so we hide the tweaker there.
  const hideTweaker = pathname.startsWith('/public') || pathname.startsWith('/teacher')

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
