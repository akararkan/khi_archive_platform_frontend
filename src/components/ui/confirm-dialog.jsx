import { useEffect } from 'react'
import { AlertTriangle, Loader2 } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'

function ConfirmDialog({
  open,
  title,
  description,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  confirmVariant = 'destructive',
  isProcessing = false,
  onConfirm,
  onOpenChange,
}) {
  useEffect(() => {
    if (!open) {
      return undefined
    }

    const handleEscape = (event) => {
      if (event.key === 'Escape' && !isProcessing) {
        onOpenChange(false)
      }
    }

    window.addEventListener('keydown', handleEscape)
    return () => window.removeEventListener('keydown', handleEscape)
  }, [isProcessing, onOpenChange, open])

  if (!open) {
    return null
  }

  return (
    <div
      className="fixed inset-0 z-[95] flex items-center justify-center bg-black/40 px-4 py-6 backdrop-blur-[1px]"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget && !isProcessing) {
          onOpenChange(false)
        }
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
        <CardContent>
          <p className="text-sm leading-6 text-muted-foreground">{description}</p>
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
            disabled={isProcessing}
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

export { ConfirmDialog }
