import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'

import { AuthShell } from '@/components/auth/AuthShell'
import { Button } from '@/components/ui/button'
import { FormErrorBox } from '@/components/ui/form-error'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { formatApiError } from '@/lib/get-error-message'
import { register } from '@/services/auth'

function RegisterPage() {
  const navigate = useNavigate()
  const [formData, setFormData] = useState({
    name: '',
    username: '',
    email: '',
    password: '',
    confirmPassword: '',
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

    if (formData.password !== formData.confirmPassword) {
      setErrorMessage('Passwords do not match.')
      return
    }

    setIsSubmitting(true)

    try {
      await register({
        name: formData.name,
        username: formData.username,
        email: formData.email,
        password: formData.password,
      })

      navigate('/dashboard', { replace: true })
    } catch (error) {
      setErrorMessage(formatApiError(error, 'Unable to register. Please try again.'))
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <AuthShell
      title="Create account"
      description="Create your account with username, email, and password."
      footer={
        <p>
          Already have an account?{' '}
          <Link className="font-medium text-primary underline-offset-4 hover:underline" to="/login">
            Login
          </Link>
        </p>
      }
    >
      <form className="space-y-4" onSubmit={handleSubmit}>
        <div className="space-y-1.5">
          <Label htmlFor="name">Full name</Label>
          <Input
            id="name"
            name="name"
            type="text"
            autoComplete="name"
            placeholder="John Doe"
            maxLength={120}
            className="h-10"
            value={formData.name}
            onChange={handleInputChange}
            required
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="username">Username</Label>
          <Input
            id="username"
            name="username"
            type="text"
            autoComplete="username"
            placeholder="john_doe"
            minLength={3}
            maxLength={80}
            pattern="[A-Za-z0-9_]+"
            title="Use only letters, numbers, and underscores"
            className="h-10"
            value={formData.username}
            onChange={handleInputChange}
            required
          />
          <p className="text-xs text-muted-foreground">Letters, numbers, and underscores only.</p>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="email">Email</Label>
          <Input
            id="email"
            name="email"
            type="email"
            autoComplete="email"
            placeholder="you@example.com"
            maxLength={160}
            className="h-10"
            value={formData.email}
            onChange={handleInputChange}
            required
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="password">Password</Label>
          <Input
            id="password"
            name="password"
            type="password"
            autoComplete="new-password"
            placeholder="Create a password"
            minLength={6}
            maxLength={128}
            className="h-10"
            value={formData.password}
            onChange={handleInputChange}
            required
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="confirmPassword">Confirm password</Label>
          <Input
            id="confirmPassword"
            name="confirmPassword"
            type="password"
            autoComplete="new-password"
            placeholder="Repeat your password"
            minLength={6}
            maxLength={128}
            className="h-10"
            value={formData.confirmPassword}
            onChange={handleInputChange}
            required
          />
        </div>

        <FormErrorBox error={errorMessage} />

        <Button type="submit" className="h-10 w-full" disabled={isSubmitting}>
          {isSubmitting ? 'Creating account...' : 'Register'}
        </Button>
      </form>
    </AuthShell>
  )
}

export { RegisterPage }
