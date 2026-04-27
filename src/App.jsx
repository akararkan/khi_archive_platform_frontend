import { Outlet } from 'react-router-dom'

function App() {
  return (
    <main className="min-h-dvh bg-background text-foreground">
      <Outlet />
    </main>
  )
}

export default App
