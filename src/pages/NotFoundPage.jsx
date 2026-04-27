import { useNavigate } from 'react-router-dom'

import { Button } from '@/components/ui/button'

function NotFoundPage() {
  const navigate = useNavigate()

  return (
    <section className="mx-auto flex min-h-dvh w-full max-w-md flex-col items-center justify-center gap-4 px-4 text-center">
      <p className="text-sm font-medium uppercase tracking-widest text-muted-foreground">404</p>
      <h1 className="text-3xl font-semibold tracking-tight">Page not found</h1>
      <p className="text-sm text-muted-foreground">The page you requested does not exist.</p>
      <Button variant="outline" onClick={() => navigate('/login')}>
        Go to login
      </Button>
    </section>
  )
}

export { NotFoundPage }
