import { useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { CheckCircle2, KeyRound, Loader2, Lock, Mail, ShieldCheck } from 'lucide-react'

import { AuthShell } from '@/components/auth/AuthShell'
import { IconField, PasswordField, PasswordStrength, SuccessBox } from '@/components/auth/auth-fields'
import { Button } from '@/components/ui/button'
import { FormErrorBox } from '@/components/ui/form-error'
import { formatApiError } from '@/lib/get-error-message'
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
  const [errorMessage, setErrorMessage] = useState(null)
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
    setErrorMessage(null)
    setSuccessMessage('')

    if (formData.newPassword !== formData.confirmPassword) {
      setErrorMessage('New password and confirm password do not match.')
      return
    }

    setIsSubmitting(true)

    try {
      const data = await resetPassword(formData)
      setSuccessMessage(
        getApiMessage(data, 'Password reset completed successfully. You can now sign in.'),
      )
      setFormData((previous) => ({
        ...previous,
        resetToken: '',
        newPassword: '',
        confirmPassword: '',
      }))
    } catch (error) {
      setErrorMessage(formatApiError(error, 'Unable to reset password right now.'))
    } finally {
      setIsSubmitting(false)
    }
  }

  const confirmTouched = formData.confirmPassword.length > 0
  const passwordsMatch = confirmTouched && formData.newPassword === formData.confirmPassword

  return (
    <AuthShell
      title="Reset password"
      description="Use your email, reset token, and a new password to recover your account."
      footer={
        <p>
          Need a token first?{' '}
          <Link className="font-semibold text-primary underline-offset-4 hover:underline" to="/forgot-password">
            Request token
          </Link>
        </p>
      }
    >
      <form className="space-y-4" onSubmit={handleSubmit}>
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

        <IconField
          id="resetToken"
          name="resetToken"
          label="Reset token"
          icon={KeyRound}
          type="text"
          placeholder="Paste your reset token"
          value={formData.resetToken}
          onChange={handleInputChange}
          required
        />

        <div className="space-y-1.5">
          <PasswordField
            id="newPassword"
            name="newPassword"
            label="New password"
            icon={Lock}
            autoComplete="new-password"
            placeholder="At least 6 characters"
            minLength={6}
            maxLength={128}
            value={formData.newPassword}
            onChange={handleInputChange}
            required
          />
          <PasswordStrength value={formData.newPassword} />
        </div>

        <div className="space-y-1.5">
          <PasswordField
            id="confirmPassword"
            name="confirmPassword"
            label="Confirm new password"
            icon={Lock}
            autoComplete="new-password"
            placeholder="Repeat your new password"
            minLength={6}
            maxLength={128}
            value={formData.confirmPassword}
            onChange={handleInputChange}
            required
          />
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

        <FormErrorBox error={errorMessage} />
        <SuccessBox>{successMessage}</SuccessBox>

        <Button type="submit" className="h-11 w-full gap-2 text-[0.95rem]" disabled={isSubmitting}>
          {isSubmitting ? <Loader2 className="size-4 animate-spin" /> : <ShieldCheck className="size-4" />}
          {isSubmitting ? 'Resetting password…' : 'Reset password'}
        </Button>
      </form>

      <div className="mt-4 flex items-center justify-between gap-3 rounded-xl border border-border bg-muted/40 p-3 text-sm">
        <span className="text-muted-foreground">After success, continue to sign in.</span>
        <Button type="button" variant="outline" size="sm" className="h-8 px-3" onClick={() => navigate('/login')}>
          Go to sign in
        </Button>
      </div>
    </AuthShell>
  )
}

export { ResetPasswordPage }
