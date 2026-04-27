import { useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'

import { AuthShell } from '@/components/auth/AuthShell'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { getErrorMessage } from '@/lib/get-error-message'
import { resetPassword } from '@/services/auth'

function getApiMessage(data, fallbackMessage) {
  if (typeof data === 'string' && data.trim()) {
    return data
  }

  if (typeof data?.message === 'string' && data.message.trim()) {
    return data.message
  }

  if (typeof data?.response === 'string' && data.response.trim()) {
    return data.response
  }

  return fallbackMessage
}

function ResetPasswordPage() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const [formData, setFormData] = useState({
    email: searchParams.get('email') ?? '',
    resetToken: '',
    newPassword: '',
    confirmPassword: '',
  })
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')
  const [successMessage, setSuccessMessage] = useState('')

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
    setSuccessMessage('')

    if (formData.newPassword !== formData.confirmPassword) {
      setErrorMessage('New password and confirm password do not match.')
      return
    }

    setIsSubmitting(true)

    try {
      const data = await resetPassword(formData)
      setSuccessMessage(
        getApiMessage(data, 'Password reset completed successfully. You can now login.'),
      )
      setFormData((previous) => ({
        ...previous,
        resetToken: '',
        newPassword: '',
        confirmPassword: '',
      }))
    } catch (error) {
      setErrorMessage(getErrorMessage(error, 'Unable to reset password right now.'))
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <AuthShell
      title="Reset password"
      description="Use your email, reset token, and new password to recover your account."
      footer={
        <p>
          Need a token first?{' '}
          <Link className="font-medium text-primary underline-offset-4 hover:underline" to="/forgot-password">
            Request token
          </Link>
        </p>
      }
    >
      <form className="space-y-4" onSubmit={handleSubmit}>
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
          <Label htmlFor="resetToken">Reset token</Label>
          <Input
            id="resetToken"
            name="resetToken"
            type="text"
            placeholder="Paste your reset token"
            className="h-10"
            value={formData.resetToken}
            onChange={handleInputChange}
            required
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="newPassword">New password</Label>
          <Input
            id="newPassword"
            name="newPassword"
            type="password"
            autoComplete="new-password"
            placeholder="At least 6 characters"
            minLength={6}
            maxLength={128}
            className="h-10"
            value={formData.newPassword}
            onChange={handleInputChange}
            required
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="confirmPassword">Confirm new password</Label>
          <Input
            id="confirmPassword"
            name="confirmPassword"
            type="password"
            autoComplete="new-password"
            placeholder="Repeat your new password"
            minLength={6}
            maxLength={128}
            className="h-10"
            value={formData.confirmPassword}
            onChange={handleInputChange}
            required
          />
        </div>

        {errorMessage ? (
          <p className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
            {errorMessage}
          </p>
        ) : null}

        {successMessage ? (
          <p className="rounded-md border border-chart-2/35 bg-chart-2/12 px-3 py-2 text-sm text-foreground">
            {successMessage}
          </p>
        ) : null}

        <Button type="submit" className="h-10 w-full" disabled={isSubmitting}>
          {isSubmitting ? 'Resetting password...' : 'Reset password'}
        </Button>
      </form>

      <div className="flex items-center justify-between gap-3 rounded-xl border border-border/70 bg-muted/35 p-3 text-sm">
        <span className="text-muted-foreground">After success, continue to login.</span>
        <Button type="button" variant="outline" className="h-8 px-3" onClick={() => navigate('/login')}>
          Go to login
        </Button>
      </div>
    </AuthShell>
  )
}

export { ResetPasswordPage }
