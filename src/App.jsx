import { Outlet } from 'react-router-dom'

import { AppearanceTweaker } from '@/components/ui/appearance-tweaker'

function App() {
  return (
    <main className="min-h-dvh bg-background text-foreground">
      <Outlet />
      <AppearanceTweaker />
    </main>
  )
}

export default App
