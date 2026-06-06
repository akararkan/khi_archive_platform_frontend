import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Loader2, Lock, LogIn, User } from 'lucide-react'

import { AuthShell } from '@/components/auth/AuthShell'
import { IconField, PasswordField } from '@/components/auth/auth-fields'
import { Button } from '@/components/ui/button'
import { FormErrorBox } from '@/components/ui/form-error'
import { formatApiError } from '@/lib/get-error-message'
import { login } from '@/services/auth'

function LoginPage() {
  const navigate = useNavigate()
  const [formData, setFormData] = useState({
    username: '',
    password: '',
  })
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [errorMessage, setErrorMessage] = useState(null)

  const handleInputChange = (event) => {
    const { name, value } = event.target

    setFormData((previous) => ({
      ...previous,
      [name]: value,
    }))
  }

  const handleSubmit = async (event) => {
    event.preventDefault()
    setErrorMessage(null)
    setIsSubmitting(true)

    try {
      await login({
        username: formData.username,
        password: formData.password,
      })
      navigate('/dashboard', { replace: true })
    } catch (error) {
      setErrorMessage(formatApiError(error, 'Unable to login. Please verify your credentials.'))
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <AuthShell
      title="Welcome back"
      description="Sign in with your username or email to continue to your archive."
      footer={
        <p>
          Don&apos;t have an account?{' '}
          <Link className="font-semibold text-primary underline-offset-4 hover:underline" to="/register">
            Create one
          </Link>
        </p>
      }
    >
      <form className="space-y-4" onSubmit={handleSubmit}>
        <IconField
          id="username"
          name="username"
          label="Username or email"
          icon={User}
          type="text"
          autoComplete="username"
          placeholder="your_username or you@example.com"
          maxLength={160}
          hint="Use your username or your email address."
          value={formData.username}
          onChange={handleInputChange}
          required
        />

        <div className="space-y-1.5">
          <PasswordField
            id="password"
            name="password"
            label="Password"
            icon={Lock}
            autoComplete="current-password"
            placeholder="Enter your password"
            minLength={6}
            maxLength={128}
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

        <FormErrorBox error={errorMessage} />

        <Button type="submit" className="h-11 w-full gap-2 text-[0.95rem]" disabled={isSubmitting}>
          {isSubmitting ? <Loader2 className="size-4 animate-spin" /> : <LogIn className="size-4" />}
          {isSubmitting ? 'Signing in…' : 'Sign in'}
        </Button>
      </form>
    </AuthShell>
  )
}

export { LoginPage }
