import { useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { Info, Loader2, Lock, LogIn, User } from 'lucide-react'

import { AuthShell } from '@/components/auth/AuthShell'
import { IconField, PasswordField } from '@/components/auth/auth-fields'
import { Button } from '@/components/ui/button'
import { FormErrorBox } from '@/components/ui/form-error'
import { formatApiError } from '@/lib/get-error-message'
import { login } from '@/services/auth'

// Bilingual notices shown when the session interceptor bounced the user here.
const SESSION_NOTICES = {
  expired: {
    en: 'Your session expired. Please sign in again.',
    ku: 'ماوەی چوونەژوورەوەکەت بەسەرچوو. تکایە دووبارە بچۆرە ژوورەوە.',
  },
  invalid: {
    en: 'Your session ended. Please sign in again.',
    ku: 'دانیشتنەکەت کۆتایی هات. تکایە دووبارە بچۆرە ژوورەوە.',
  },
}

// Only follow a `next` target that is a safe in-app path (avoids open redirects
// and login loops).
function safeNext(next) {
  if (typeof next !== 'string' || !next.startsWith('/') || next.startsWith('//')) return null
  if (next.startsWith('/login')) return null
  return next
}

function LoginPage() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const sessionNotice = SESSION_NOTICES[searchParams.get('reason')] || null
  const nextPath = safeNext(searchParams.get('next'))
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
      navigate(nextPath || '/dashboard', { replace: true })
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
        {sessionNotice ? (
          <div
            role="status"
            className="flex items-start gap-2 rounded-md border border-amber-500/30 bg-amber-500/10 px-3 py-2.5 text-amber-700 dark:text-amber-300"
          >
            <Info className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
            <div className="min-w-0 flex-1 space-y-0.5">
              <p className="text-sm leading-5">{sessionNotice.en}</p>
              <p dir="rtl" lang="ckb" className="text-sm leading-5 opacity-90">
                {sessionNotice.ku}
              </p>
            </div>
          </div>
        ) : null}

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
          <p className="text-right text-xs text-muted-foreground">
            Forgot your password? Ask an administrator to reset it.
          </p>
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
