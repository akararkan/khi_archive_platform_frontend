import { useEffect, useMemo, useState } from 'react'
import { AlertTriangle, Loader2, Search, X } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { cn } from '@/lib/utils'
import { SEVERITY_META, SEVERITY_ORDER } from '@/lib/warning-helpers'

// Modal for issuing a new warning or editing an existing one. Same
// dialog handles both cases; the parent passes `warning` for edit mode
// and `users` so the target picker can search-as-you-type without a
// second API trip. Title is capped at 200 chars and message at 4000
// to match the backend bounds.

const TITLE_MAX = 200
const MESSAGE_MAX = 4000
const TEXTAREA_CLASS =
  'min-h-[140px] w-full resize-y rounded-lg border border-input bg-background px-3 py-2 text-sm shadow-sm transition-colors placeholder:text-muted-foreground/70 focus-visible:border-ring focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/30'

function WarningDialog({
  open,
  mode = 'issue', // 'issue' | 'edit'
  warning,
  users = [],
  defaultTargetUserId = null,
  isProcessing = false,
  onSubmit,
  onOpenChange,
}) {
  const isEdit = mode === 'edit'

  const [targetUserId, setTargetUserId] = useState(null)
  const [userQuery, setUserQuery] = useState('')
  const [severity, setSeverity] = useState('WARNING')
  const [title, setTitle] = useState('')
  const [message, setMessage] = useState('')
  const [formError, setFormError] = useState('')

  // Reset form whenever the dialog opens with a fresh warning/target.
  useEffect(() => {
    if (!open) return
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setFormError('')
    if (isEdit && warning) {
      setTargetUserId(warning.targetUserId ?? warning.target?.id ?? null)
      setSeverity(String(warning.severity || 'WARNING').toUpperCase())
      setTitle(warning.title || '')
      setMessage(warning.message || '')
      setUserQuery('')
    } else {
      setTargetUserId(defaultTargetUserId)
      setSeverity('WARNING')
      setTitle('')
      setMessage('')
      setUserQuery('')
    }
  }, [open, mode, warning, defaultTargetUserId, isEdit])

  // Escape closes; click on the backdrop closes. Both gated on
  // `isProcessing` so we don't drop the user mid-save.
  useEffect(() => {
    if (!open) return undefined
    const handleEscape = (e) => {
      if (e.key === 'Escape' && !isProcessing) onOpenChange(false)
    }
    window.addEventListener('keydown', handleEscape)
    return () => window.removeEventListener('keydown', handleEscape)
  }, [isProcessing, onOpenChange, open])

  // Snapshot of the selected user for the chip + the filter list.
  const targetUser = useMemo(
    () => (Array.isArray(users) ? users.find((u) => u.id === targetUserId) : null),
    [users, targetUserId],
  )

  const filteredUsers = useMemo(() => {
    const term = userQuery.trim().toLowerCase()
    if (!term) return users.slice(0, 8)
    return users
      .filter((u) => {
        const hay = [u.username, u.name, u.email].filter(Boolean).join(' ').toLowerCase()
        return hay.includes(term)
      })
      .slice(0, 8)
  }, [users, userQuery])

  if (!open) return null

  const titleLength = title.length
  const messageLength = message.length
  const titleOver = titleLength > TITLE_MAX
  const messageOver = messageLength > MESSAGE_MAX

  const handleSubmit = (event) => {
    event.preventDefault()
    setFormError('')

    if (!isEdit && !targetUserId) {
      setFormError('Pick the user this warning is for.')
      return
    }
    const trimmedTitle = title.trim()
    const trimmedMessage = message.trim()
    if (!trimmedTitle) {
      setFormError('Title is required.')
      return
    }
    if (!trimmedMessage) {
      setFormError('Write the message you want this user to read.')
      return
    }
    if (titleOver || messageOver) {
      setFormError('Trim the title or message — one of them is too long.')
      return
    }

    const payload = isEdit
      ? { severity, title: trimmedTitle, message: trimmedMessage }
      : {
          targetUserId,
          severity,
          title: trimmedTitle,
          message: trimmedMessage,
        }
    onSubmit(payload)
  }

  const severityMeta = SEVERITY_META[severity] || SEVERITY_META.WARNING
  const SeverityIcon = severityMeta.icon

  return (
    <div
      className="fixed inset-0 z-[96] flex items-center justify-center bg-black/50 px-4 py-6 backdrop-blur-[1px]"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget && !isProcessing) onOpenChange(false)
      }}
      role="dialog"
      aria-modal="true"
      aria-label={isEdit ? 'Edit warning' : 'Issue warning'}
    >
      <Card className="relative flex max-h-[92vh] w-full max-w-2xl flex-col overflow-hidden border-border bg-card shadow-2xl shadow-black/30">
        <Button
          type="button"
          variant="ghost"
          size="icon"
          onClick={() => !isProcessing && onOpenChange(false)}
          disabled={isProcessing}
          className="absolute right-3 top-3 z-10 size-8 rounded-full text-muted-foreground hover:text-foreground"
        >
          <X className="size-4" />
          <span className="sr-only">Close</span>
        </Button>

        <CardHeader className="space-y-3 border-b border-border pb-4">
          <div className={cn('flex size-11 items-center justify-center rounded-2xl bg-amber-500/10', severityMeta.accent)}>
            <SeverityIcon className="size-5" />
          </div>
          <div>
            <CardTitle className="text-lg font-semibold">
              {isEdit ? 'Edit warning' : 'Issue a warning'}
            </CardTitle>
            <p className="mt-1 text-xs leading-5 text-muted-foreground">
              {isEdit
                ? "Tighten the severity, title, or message. The recipient sees the new copy and re-acknowledges if they hadn't already."
                : 'Send a formal note to one user. They see it in their bell and must acknowledge it. Use this for behavior corrections that need a paper trail.'}
            </p>
          </div>
        </CardHeader>

        <form onSubmit={handleSubmit} className="flex min-h-0 flex-col">
          <CardContent className="flex-1 overflow-y-auto space-y-5 pt-5">
            {/* Target user — pickable on create, locked on edit. */}
            {isEdit ? (
              <div className="space-y-1.5">
                <Label>Target</Label>
                <div className="flex items-center gap-2 rounded-lg border border-border bg-muted/40 px-3 py-2 text-sm">
                  <span className="font-semibold text-foreground">
                    {warning?.targetName || warning?.target?.name || warning?.targetUsername || warning?.target?.username || `User #${warning?.targetUserId}`}
                  </span>
                  {(warning?.targetUsername || warning?.target?.username) ? (
                    <span className="text-xs text-muted-foreground">
                      @{warning?.targetUsername || warning?.target?.username}
                    </span>
                  ) : null}
                </div>
                <p className="text-[11px] text-muted-foreground">
                  Target is locked after creation. To redirect a warning, revoke this one and issue a new one.
                </p>
              </div>
            ) : (
              <div className="space-y-1.5">
                <Label htmlFor="warning-target">
                  Target user <span className="text-destructive">*</span>
                </Label>
                {targetUser ? (
                  <div className="flex items-center gap-2 rounded-lg border border-primary/30 bg-primary/5 px-3 py-2 text-sm">
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-semibold text-foreground">
                        {targetUser.name || targetUser.username}
                      </p>
                      <p className="truncate text-xs text-muted-foreground">
                        @{targetUser.username || targetUser.email}
                      </p>
                    </div>
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      onClick={() => setTargetUserId(null)}
                      disabled={isProcessing}
                    >
                      Change
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <div className="relative">
                      <Search className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                      <Input
                        id="warning-target"
                        value={userQuery}
                        onChange={(e) => setUserQuery(e.target.value)}
                        placeholder="Search a user by name, username, or email…"
                        className="pl-8"
                      />
                    </div>
                    <div className="max-h-56 overflow-y-auto rounded-lg border border-border bg-background">
                      {filteredUsers.length === 0 ? (
                        <p className="px-3 py-6 text-center text-xs text-muted-foreground">
                          No matching users.
                        </p>
                      ) : (
                        <ul className="divide-y divide-border">
                          {filteredUsers.map((u) => (
                            <li key={u.id}>
                              <button
                                type="button"
                                onClick={() => {
                                  setTargetUserId(u.id)
                                  setUserQuery('')
                                }}
                                className="flex w-full items-center gap-2 px-3 py-2 text-left transition-colors hover:bg-muted/40"
                              >
                                <div className="min-w-0 flex-1">
                                  <p className="truncate text-sm font-semibold text-foreground">
                                    {u.name || u.username}
                                  </p>
                                  <p className="truncate text-xs text-muted-foreground">
                                    @{u.username || u.email}
                                  </p>
                                </div>
                                <span className="shrink-0 rounded-full border border-border bg-background px-1.5 py-px text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                                  {u.role || 'USER'}
                                </span>
                              </button>
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Severity */}
            <div className="space-y-1.5">
              <Label>Severity</Label>
              <div className="grid gap-2 sm:grid-cols-3">
                {SEVERITY_ORDER.map((sev) => {
                  const meta = SEVERITY_META[sev]
                  const Icon = meta.icon
                  const isActive = severity === sev
                  return (
                    <button
                      key={sev}
                      type="button"
                      onClick={() => setSeverity(sev)}
                      disabled={isProcessing}
                      className={cn(
                        'flex items-center gap-2 rounded-lg border px-3 py-2 text-sm font-medium transition-colors',
                        isActive
                          ? cn('border-transparent ring-2', meta.ring, meta.accent, 'bg-background shadow-sm')
                          : 'border-border bg-background text-foreground/80 hover:border-primary/30 hover:bg-muted/40',
                      )}
                    >
                      <Icon className={cn('size-4', isActive ? meta.accent : 'text-muted-foreground')} />
                      <span>{meta.label}</span>
                    </button>
                  )
                })}
              </div>
            </div>

            {/* Title */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between gap-2">
                <Label htmlFor="warning-title">
                  Title <span className="text-destructive">*</span>
                </Label>
                <span className={cn('text-[11px] tabular-nums', titleOver ? 'text-destructive' : 'text-muted-foreground')}>
                  {titleLength} / {TITLE_MAX}
                </span>
              </div>
              <Input
                id="warning-title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="One short line — what's this about?"
                maxLength={TITLE_MAX + 50}
              />
            </div>

            {/* Message */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between gap-2">
                <Label htmlFor="warning-message">
                  Message <span className="text-destructive">*</span>
                </Label>
                <span className={cn('text-[11px] tabular-nums', messageOver ? 'text-destructive' : 'text-muted-foreground')}>
                  {messageLength} / {MESSAGE_MAX}
                </span>
              </div>
              <textarea
                id="warning-message"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Be specific: what happened, what you expect going forward."
                className={TEXTAREA_CLASS}
              />
            </div>

            {formError ? (
              <div className="flex items-start gap-2 rounded-lg border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive">
                <AlertTriangle className="mt-0.5 size-4 shrink-0" />
                <p>{formError}</p>
              </div>
            ) : null}
          </CardContent>

          <CardFooter className="flex items-center justify-end gap-2 border-t border-border bg-muted/20 px-6 py-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isProcessing}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isProcessing} className="gap-2">
              {isProcessing ? <Loader2 className="size-4 animate-spin" /> : null}
              {isEdit ? 'Save changes' : 'Issue warning'}
            </Button>
          </CardFooter>
        </form>
      </Card>
    </div>
  )
}

export { WarningDialog }
