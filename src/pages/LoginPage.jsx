import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'

import { AuthShell } from '@/components/auth/AuthShell'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { getErrorMessage } from '@/lib/get-error-message'
import { login } from '@/services/auth'

function LoginPage() {
  const navigate = useNavigate()
  const [formData, setFormData] = useState({
    username: '',
    password: '',
  })
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')

  const handleInputChange = (event) => {
    const { name, value } = event.target

    setFormData((previous) => ({
      ...previous,
      [name]: value,
    }))
  }

  const handleSubmit = async (event) => {
    event.preventDefault()
    setErrorMessage('')
    setIsSubmitting(true)

    try {
      await login({
        username: formData.username,
        password: formData.password,
      })
      navigate('/dashboard', { replace: true })
    } catch (error) {
      setErrorMessage(getErrorMessage(error, 'Unable to login. Please verify your credentials.'))
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <AuthShell
      title="Welcome back"
      description="Sign in with your username or email to continue to your archive platform."
      footer={
        <p>
          Don&apos;t have an account?{' '}
          <Link className="font-medium text-primary underline-offset-4 hover:underline" to="/register">
            Register
          </Link>
        </p>
      }
    >
      <form className="space-y-4" onSubmit={handleSubmit}>
        <div className="space-y-1.5">
          <Label htmlFor="username">Username or email</Label>
          <Input
            id="username"
            name="username"
            type="text"
            autoComplete="username"
            placeholder="your_username or you@example.com"
            maxLength={160}
            className="h-10"
            value={formData.username}
            onChange={handleInputChange}
            required
          />
          <p className="text-xs text-muted-foreground">Use your username or your email address.</p>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="password">Password</Label>
          <Input
            id="password"
            name="password"
            type="password"
            autoComplete="current-password"
            placeholder="Enter your password"
            minLength={6}
            maxLength={128}
            className="h-10"
            value={formData.password}
            onChange={handleInputChange}
            required
          />
          <div className="flex justify-end">
            <Link
              className="text-xs font-medium text-primary underline-offset-4 hover:underline"
              to="/forgot-password"
            >
              Forgot password?
            </Link>
          </div>
        </div>

        {errorMessage ? (
          <p className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
            {errorMessage}
          </p>
        ) : null}

        <Button type="submit" className="h-10 w-full" disabled={isSubmitting}>
          {isSubmitting ? 'Signing in...' : 'Login'}
        </Button>
      </form>
    </AuthShell>
  )
}

export { LoginPage }
