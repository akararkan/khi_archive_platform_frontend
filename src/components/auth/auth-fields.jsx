import { useId, useState } from 'react'
import { Eye, EyeOff } from 'lucide-react'

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
          className={cn('h-11 pr-11', Icon && 'pl-9', className)}
          {...props}
        />
        <button
          type="button"
          onClick={() => setShow((s) => !s)}
          aria-label={show ? 'Hide password' : 'Show password'}
          aria-pressed={show}
          className="absolute right-1.5 top-1/2 grid size-8 -translate-y-1/2 place-items-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
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

// A conventional red → amber → green traffic-light scale (theme-independent on
// purpose: users read green = strong regardless of the brand palette).
const STRENGTH = [
  { label: 'Too short', tone: 'bg-destructive' },
  { label: 'Weak', tone: 'bg-destructive' },
  { label: 'Fair', tone: 'bg-amber-500' },
  { label: 'Good', tone: 'bg-lime-500' },
  { label: 'Strong', tone: 'bg-green-600 dark:bg-green-500' },
]

// A 4-segment strength meter shown under the new-password field. Renders nothing
// until the user starts typing.
function PasswordStrength({ value, labels }) {
  if (!value) return null
  const score = scorePassword(value)
  const meta = STRENGTH[score]
  const strengthLabel = labels?.levels?.[score] || meta.label
  const prefix = labels?.prefix || 'Password strength:'
  return (
    <div className="space-y-1.5 pt-0.5">
      <div className="flex gap-1.5" aria-hidden="true">
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
        {prefix} <span className="font-medium text-foreground">{strengthLabel}</span>
      </p>
    </div>
  )
}

export { IconField, PasswordField, PasswordStrength }
