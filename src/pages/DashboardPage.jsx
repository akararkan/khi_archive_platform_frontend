import { useNavigate } from 'react-router-dom'

import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { getStoredToken, logout } from '@/services/auth'

function DashboardPage() {
  const navigate = useNavigate()
  const token = getStoredToken()
  const tokenPreview = token ? `${token.slice(0, 20)}...` : 'No auth token found'

  const handleLogout = () => {
    logout()
    navigate('/login', { replace: true })
  }

  return (
    <section className="mx-auto flex min-h-dvh w-full max-w-xl items-center px-4 py-10">
      <Card className="w-full border-border/70 bg-background/95 py-6 shadow-xl shadow-black/5 backdrop-blur">
        <CardHeader className="space-y-2 px-6">
          <CardTitle className="text-2xl font-semibold tracking-tight">Authenticated</CardTitle>
          <CardDescription>
            Login and registration are connected through your axios client and router guards.
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-3 px-6">
          <p className="text-sm text-muted-foreground">Stored token preview</p>
          <code className="block rounded-md border border-border bg-muted px-3 py-2 text-sm">{tokenPreview}</code>
        </CardContent>

        <CardFooter className="justify-end bg-transparent px-6 pb-1 pt-4">
          <Button variant="outline" onClick={handleLogout}>
            Logout
          </Button>
        </CardFooter>
      </Card>
    </section>
  )
}

export { DashboardPage }
