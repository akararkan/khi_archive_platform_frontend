import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { AtSign, CheckCircle2, Loader2, Lock, Mail, User, UserPlus } from 'lucide-react'

import { AuthShell } from '@/components/auth/AuthShell'
import { IconField, PasswordField, PasswordStrength } from '@/components/auth/auth-fields'
import { Button } from '@/components/ui/button'
import { FormErrorBox } from '@/components/ui/form-error'
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

  const confirmTouched = formData.confirmPassword.length > 0
  const passwordsMatch = confirmTouched && formData.password === formData.confirmPassword

  return (
    <AuthShell
      title="Create your account"
      description="Join the archive with your name, username, email, and a password."
      footer={
        <p>
          Already have an account?{' '}
          <Link className="font-semibold text-primary underline-offset-4 hover:underline" to="/login">
            Sign in
          </Link>
        </p>
      }
    >
      <form className="space-y-4" onSubmit={handleSubmit}>
        <IconField
          id="name"
          name="name"
          label="Full name"
          icon={User}
          type="text"
          autoComplete="name"
          placeholder="John Doe"
          maxLength={120}
          value={formData.name}
          onChange={handleInputChange}
          required
        />

        <IconField
          id="username"
          name="username"
          label="Username"
          icon={AtSign}
          type="text"
          autoComplete="username"
          placeholder="john_doe"
          minLength={3}
          maxLength={80}
          pattern="[A-Za-z0-9_]+"
          title="Use only letters, numbers, and underscores"
          hint="Letters, numbers, and underscores only."
          value={formData.username}
          onChange={handleInputChange}
          required
        />

        <IconField
          id="email"
          name="email"
          label="Email"
          icon={Mail}
          type="email"
          autoComplete="email"
          placeholder="you@example.com"
          maxLength={160}
          value={formData.email}
          onChange={handleInputChange}
          required
        />

        <div className="space-y-1.5">
          <PasswordField
            id="password"
            name="password"
            label="Password"
            icon={Lock}
            autoComplete="new-password"
            placeholder="Create a password"
            minLength={6}
            maxLength={128}
            value={formData.password}
            onChange={handleInputChange}
            required
          />
          <PasswordStrength value={formData.password} />
        </div>

        <div className="space-y-1.5">
          <PasswordField
            id="confirmPassword"
            name="confirmPassword"
            label="Confirm password"
            icon={Lock}
            autoComplete="new-password"
            placeholder="Repeat your password"
            minLength={6}
            maxLength={128}
            value={formData.confirmPassword}
            onChange={handleInputChange}
            required
          />
          <div role="status" aria-live="polite">
            {confirmTouched ? (
              <p
                className={
                  passwordsMatch
                    ? 'flex items-center gap-1.5 text-xs font-medium text-green-600 dark:text-green-500'
                    : 'text-xs text-muted-foreground'
                }
              >
                {passwordsMatch ? <CheckCircle2 className="size-3.5" /> : null}
                {passwordsMatch ? 'Passwords match' : "Passwords don't match yet"}
              </p>
            ) : null}
          </div>
        </div>

        <FormErrorBox error={errorMessage} />

        <Button type="submit" className="h-11 w-full gap-2 text-[0.95rem]" disabled={isSubmitting}>
          {isSubmitting ? <Loader2 className="size-4 animate-spin" /> : <UserPlus className="size-4" />}
          {isSubmitting ? 'Creating account…' : 'Create account'}
        </Button>
      </form>
    </AuthShell>
  )
}

export { RegisterPage }
