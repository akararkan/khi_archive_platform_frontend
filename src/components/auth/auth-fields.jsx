import { useId, useState } from 'react'
import { CheckCircle2, Eye, EyeOff } from 'lucide-react'

import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { cn } from '@/lib/utils'

// A labelled input with an optional leading icon. Forwards every native input
// prop (value/onChange/required/pattern/…) straight through, so callers keep
// full control over validation and state.
function IconField({ id, label, icon, hint, className, ...props }) {
  const autoId = useId()
  const fieldId = id || autoId
  const Icon = icon
  return (
    <div className="space-y-1.5">
      <Label htmlFor={fieldId}>{label}</Label>
      <div className="relative">
        {Icon ? (
          <Icon className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        ) : null}
        <Input id={fieldId} className={cn('h-11', Icon && 'pl-9', className)} {...props} />
      </div>
      {hint ? <p className="text-xs text-muted-foreground">{hint}</p> : null}
    </div>
  )
}

// A password field with a leading icon and a show/hide reveal toggle.
function PasswordField({ id, label, icon, hint, className, ...props }) {
  const [show, setShow] = useState(false)
  const autoId = useId()
  const fieldId = id || autoId
  const Icon = icon
  return (
    <div className="space-y-1.5">
      <Label htmlFor={fieldId}>{label}</Label>
      <div className="relative">
        {Icon ? (
          <Icon className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        ) : null}
        <Input
          id={fieldId}
          type={show ? 'text' : 'password'}
          className={cn('h-11 pr-10', Icon && 'pl-9', className)}
          {...props}
        />
        <button
          type="button"
          onClick={() => setShow((s) => !s)}
          aria-label={show ? 'Hide password' : 'Show password'}
          tabIndex={-1}
          className="absolute right-1.5 top-1/2 grid size-8 -translate-y-1/2 place-items-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
        >
          {show ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
        </button>
      </div>
      {hint ? <p className="text-xs text-muted-foreground">{hint}</p> : null}
    </div>
  )
}

// Crude-but-helpful password score: length + character variety, 0–4.
function scorePassword(pw) {
  if (!pw) return 0
  let s = 0
  if (pw.length >= 6) s += 1
  if (pw.length >= 10) s += 1
  if (/[a-z]/.test(pw) && /[A-Z]/.test(pw)) s += 1
  if (/\d/.test(pw)) s += 1
  if (/[^A-Za-z0-9]/.test(pw)) s += 1
  return Math.min(s, 4)
}

const STRENGTH = [
  { label: 'Too short', tone: 'bg-destructive' },
  { label: 'Weak', tone: 'bg-destructive' },
  { label: 'Fair', tone: 'bg-amber-500' },
  { label: 'Good', tone: 'bg-primary/70' },
  { label: 'Strong', tone: 'bg-green-600 dark:bg-green-500' },
]

// A 4-segment strength meter shown under the new-password field. Renders nothing
// until the user starts typing.
function PasswordStrength({ value }) {
  if (!value) return null
  const score = scorePassword(value)
  const meta = STRENGTH[score]
  return (
    <div className="space-y-1.5 pt-0.5">
      <div className="flex gap-1.5">
        {[0, 1, 2, 3].map((i) => (
          <span
            key={i}
            className={cn(
              'h-1.5 flex-1 rounded-full transition-colors',
              i < score ? meta.tone : 'bg-muted',
            )}
          />
        ))}
      </div>
      <p className="text-xs text-muted-foreground">
        Password strength: <span className="font-medium text-foreground">{meta.label}</span>
      </p>
    </div>
  )
}

// A friendly success banner (used by the forgot/reset flows).
function SuccessBox({ children, className }) {
  if (!children) return null
  return (
    <div
      role="status"
      className={cn(
        'flex items-start gap-2 rounded-xl border border-green-600/30 bg-green-600/10 px-3 py-2.5 text-sm text-foreground dark:border-green-500/30 dark:bg-green-500/10',
        className,
      )}
    >
      <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-green-600 dark:text-green-500" />
      <span className="leading-6">{children}</span>
    </div>
  )
}

export { IconField, PasswordField, PasswordStrength, SuccessBox }
