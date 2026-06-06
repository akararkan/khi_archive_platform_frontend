import { useState } from 'react'
import { Link } from 'react-router-dom'
import { KeyRound, Loader2, Mail } from 'lucide-react'

import { AuthShell } from '@/components/auth/AuthShell'
import { IconField, SuccessBox } from '@/components/auth/auth-fields'
import { Button } from '@/components/ui/button'
import { FormErrorBox } from '@/components/ui/form-error'
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
      description="Enter your account email and we'll prepare a password reset token."
      footer={
        <p>
          Remembered your password?{' '}
          <Link className="font-semibold text-primary underline-offset-4 hover:underline" to="/login">
            Back to sign in
          </Link>
        </p>
      }
    >
      <form className="space-y-4" onSubmit={handleSubmit}>
        <IconField
          id="email"
          name="email"
          label="Account email"
          icon={Mail}
          type="email"
          autoComplete="email"
          placeholder="you@example.com"
          maxLength={160}
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          required
        />

        <FormErrorBox error={errorMessage} />
        <SuccessBox>{successMessage}</SuccessBox>

        <Button type="submit" className="h-11 w-full gap-2 text-[0.95rem]" disabled={isSubmitting}>
          {isSubmitting ? <Loader2 className="size-4 animate-spin" /> : <KeyRound className="size-4" />}
          {isSubmitting ? 'Requesting token…' : 'Request reset token'}
        </Button>
      </form>

      <div className="mt-4 rounded-xl border border-border bg-muted/40 p-3 text-sm text-muted-foreground">
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
