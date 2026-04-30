import { useState } from 'react'
import { Link } from 'react-router-dom'

import { AuthShell } from '@/components/auth/AuthShell'
import { Button } from '@/components/ui/button'
import { FormErrorBox } from '@/components/ui/form-error'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { formatApiError } from '@/lib/get-error-message'
import { requestPasswordResetToken } from '@/services/auth'

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

function ForgotPasswordPage() {
  const [email, setEmail] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [errorMessage, setErrorMessage] = useState(null)
  const [successMessage, setSuccessMessage] = useState('')

  const handleSubmit = async (event) => {
    event.preventDefault()
    setErrorMessage(null)
    setSuccessMessage('')
    setIsSubmitting(true)

    try {
      const data = await requestPasswordResetToken(email)
      setSuccessMessage(
        getApiMessage(
          data,
          'If an account exists for that email, password reset instructions have been prepared.',
        ),
      )
    } catch (error) {
      setErrorMessage(formatApiError(error, 'Unable to request a reset token right now.'))
    } finally {
      setIsSubmitting(false)
    }
  }

  const trimmedEmail = email.trim()
  const resetLink = trimmedEmail ? `/reset-password?email=${encodeURIComponent(trimmedEmail)}` : '/reset-password'

  return (
    <AuthShell
      title="Forgot password"
      description="Enter your account email and request a password reset token."
      footer={
        <p>
          Remembered your password?{' '}
          <Link className="font-medium text-primary underline-offset-4 hover:underline" to="/login">
            Back to login
          </Link>
        </p>
      }
    >
      <form className="space-y-4" onSubmit={handleSubmit}>
        <div className="space-y-1.5">
          <Label htmlFor="email">Account email</Label>
          <Input
            id="email"
            name="email"
            type="email"
            autoComplete="email"
            placeholder="you@example.com"
            maxLength={160}
            className="h-10"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            required
          />
        </div>

        <FormErrorBox error={errorMessage} />

        {successMessage ? (
          <p className="rounded-md border border-chart-2/35 bg-chart-2/12 px-3 py-2 text-sm text-foreground">
            {successMessage}
          </p>
        ) : null}

        <Button type="submit" className="h-10 w-full" disabled={isSubmitting}>
          {isSubmitting ? 'Requesting token...' : 'Request reset token'}
        </Button>
      </form>

      <div className="rounded-xl border border-border/70 bg-muted/35 p-3 text-sm text-muted-foreground">
        <p>
          After you receive the token, continue to{' '}
          <Link className="font-medium text-primary underline-offset-4 hover:underline" to={resetLink}>
            reset password
          </Link>
          .
        </p>
      </div>
    </AuthShell>
  )
}

export { ForgotPasswordPage }
