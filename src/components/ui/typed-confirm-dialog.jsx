import { useEffect, useState } from 'react'
import { AlertTriangle, Loader2 } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'

/**
 * Confirmation dialog that requires the user to TYPE a specific token
 * (usually the entity's code) before the destructive action enables.
 *
 * Mirrors the GitHub "type the repository name to confirm deletion"
 * pattern. Same visual shell as <ConfirmDialog>; the Confirm button
 * stays disabled until `value === codeToConfirm` exactly (case-sensitive
 * by default — codes in this archive are uppercase identifiers like
 * `HAZAZIRA_PROJ_000002`, where a typo could mean trashing the wrong
 * thing on retry).
 *
 * The input auto-focuses on open and the field clears whenever the
 * dialog opens for a new target, so the previous value can't leak
 * across confirmations.
 */
function TypedConfirmDialog({
  open,
  title,
  description,
  codeToConfirm,
  // Free-form prefix for the prompt — usually "Type" or
  // "Type the project code". Keep it short.
  promptLabel = 'Type the code below to confirm',
  confirmLabel = 'Delete',
  cancelLabel = 'Cancel',
  confirmVariant = 'destructive',
  isProcessing = false,
  caseSensitive = true,
  onConfirm,
  onOpenChange,
}) {
  // We early-return null when `open` is false (see below), so the
  // component unmounts whenever the dialog closes. That makes
  // `useState('')` give us a fresh empty value on every fresh open —
  // no manual reset needed and no risk of an old typed value unlocking
  // a new confirmation target.
  const [value, setValue] = useState('')

  useEffect(() => {
    if (!open) return undefined
    const handleEscape = (event) => {
      if (event.key === 'Escape' && !isProcessing) onOpenChange(false)
    }
    window.addEventListener('keydown', handleEscape)
    return () => window.removeEventListener('keydown', handleEscape)
  }, [isProcessing, onOpenChange, open])

  if (!open) return null

  const matches = caseSensitive
    ? value === codeToConfirm
    : value.toLowerCase() === String(codeToConfirm || '').toLowerCase()
  const canConfirm = matches && !isProcessing && Boolean(codeToConfirm)

  return (
    <div
      className="fixed inset-0 z-[95] flex items-center justify-center bg-black/40 px-4 py-6 backdrop-blur-[1px]"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget && !isProcessing) onOpenChange(false)
      }}
      role="dialog"
      aria-modal="true"
      aria-label={title}
    >
      <Card className="w-full max-w-md border-border bg-card shadow-lg shadow-black/15">
        <CardHeader className="space-y-3">
          <div className="flex size-11 items-center justify-center rounded-2xl bg-destructive/10 text-destructive">
            <AlertTriangle className="size-5" />
          </div>
          <CardTitle className="text-lg font-semibold">{title}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm leading-6 text-muted-foreground">{description}</p>

          <div className="space-y-2">
            <p className="text-xs text-muted-foreground">
              {promptLabel}{' '}
              <span className="rounded bg-muted px-1.5 py-0.5 font-mono text-[11px] font-semibold text-foreground">
                {codeToConfirm}
              </span>
            </p>
            <Input
              autoFocus
              value={value}
              onChange={(event) => setValue(event.target.value)}
              placeholder={codeToConfirm || ''}
              disabled={isProcessing}
              autoComplete="off"
              spellCheck={false}
              className={cn(
                'font-mono tracking-wide',
                // Subtle green ring once it matches — instant visual
                // feedback that the destructive button is now armed.
                matches && 'border-emerald-500/40 focus-visible:ring-emerald-500/40',
              )}
              onKeyDown={(event) => {
                if (event.key === 'Enter' && canConfirm) {
                  event.preventDefault()
                  onConfirm?.()
                }
              }}
              aria-invalid={value.length > 0 && !matches}
              aria-label={`Type ${codeToConfirm} to confirm`}
            />
          </div>
        </CardContent>
        <CardFooter className="flex items-center justify-end gap-2 border-t border-border bg-muted/20 px-6 py-4">
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isProcessing}
          >
            {cancelLabel}
          </Button>
          <Button
            type="button"
            variant={confirmVariant}
            onClick={onConfirm}
            disabled={!canConfirm}
            className="gap-2"
          >
            {isProcessing ? <Loader2 className="size-4 animate-spin" /> : null}
            {confirmLabel}
          </Button>
        </CardFooter>
      </Card>
    </div>
  )
}

export { TypedConfirmDialog }
