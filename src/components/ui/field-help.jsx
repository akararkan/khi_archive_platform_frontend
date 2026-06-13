import { useEffect, useId, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { CircleHelp, X } from 'lucide-react'

import { Button, buttonVariants } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { useAnchoredPosition } from '@/hooks/use-anchored-position'
import { cn } from '@/lib/utils'

// Small (?) button next to every form label. Clicking it opens a portaled,
// anchored popover showing the field's RTL Sorani title + description right at
// the button — NOT a top-of-screen toast. Portal + position:fixed means it
// never shifts the form row and is never clipped by an overflow:hidden Card, a
// table wrapper, or a scrollable dialog. `metadata` = { title, description } in
// RTL Sorani, or null (renders nothing, so callers can wire `metadataFor(key)`
// blindly without a separate null-check).
//
// The trigger is a raw <button> styled with buttonVariants (not the <Button>
// component) so `anchorRef` attaches straight to the real DOM node — the same
// anchored-trigger idiom as select.jsx; no dependency on ref forwarding.
function FieldHelpButton({ metadata }) {
  const [open, setOpen] = useState(false)
  const anchorRef = useRef(null)
  const popoverId = useId()
  // align:'end' anchors the popover's right edge under the right-aligned (?);
  // minHeight:0 so the flip-up logic uses the real (short) content height and
  // favours opening downward whenever there's any room.
  const { floatingRef, style } = useAnchoredPosition(anchorRef, open, {
    align: 'end',
    gap: 6,
    minHeight: 0,
  })

  // Dismiss on outside mousedown + Escape. The popover is portaled to <body>,
  // so it isn't a DOM descendant of anchorRef — check BOTH refs (same idiom as
  // search-select.jsx). Escape also returns focus to the trigger.
  useEffect(() => {
    if (!open) return undefined
    const onDocMouseDown = (e) => {
      if (anchorRef.current?.contains(e.target)) return
      if (floatingRef.current?.contains(e.target)) return
      setOpen(false)
    }
    const onKey = (e) => {
      if (e.key === 'Escape') {
        e.preventDefault()
        // Stop the keystroke here so it doesn't also bubble to a host form
        // dialog's window-level Escape listener (MaqamFormDialog, confirm
        // dialogs, …) and close the whole form out from under the user.
        e.stopPropagation()
        setOpen(false)
        anchorRef.current?.focus()
      }
    }
    document.addEventListener('mousedown', onDocMouseDown)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onDocMouseDown)
      document.removeEventListener('keydown', onKey)
    }
  }, [open, floatingRef])

  if (!metadata) return null

  return (
    <>
      <button
        ref={anchorRef}
        type="button"
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-controls={open ? popoverId : undefined}
        onClick={() => setOpen((v) => !v)}
        className={cn(
          buttonVariants({ variant: 'ghost', size: 'icon-xs' }),
          'size-6 rounded-full text-muted-foreground transition-colors hover:text-foreground',
          open && 'bg-accent text-foreground',
        )}
      >
        <CircleHelp className="size-3.5" />
        <span className="sr-only">Show field help</span>
      </button>

      {open
        ? createPortal(
            <div
              ref={floatingRef}
              id={popoverId}
              role="dialog"
              aria-label="Field help"
              style={style || { position: 'fixed', visibility: 'hidden' }}
              className={cn(
                // Reuse search-select's popover language for visual consistency.
                'w-[min(20rem,calc(100vw-1rem))] overflow-hidden rounded-lg border border-border bg-popover text-popover-foreground shadow-xl shadow-black/20',
                'animate-in fade-in-0 zoom-in-95 duration-100',
              )}
            >
              {/* max-h-[inherit] + overflow-y-auto: when the popover lands in a
                  vertically cramped spot (the hook clamps maxHeight via style),
                  a long Sorani description scrolls instead of being silently
                  clipped — mirrors search-select.jsx's scroll list. */}
              <div className="flex max-h-[inherit] items-start gap-2 overflow-y-auto overscroll-contain px-3 py-2.5">
                {/* RTL Sorani text block. NO inline font-family — matches the
                    error-display.jsx convention (the codebase RTL standard). */}
                <div dir="rtl" lang="ckb" className="min-w-0 flex-1 space-y-1 text-right">
                  {metadata.title ? (
                    <p className="text-[13px] font-semibold leading-6 text-foreground">{metadata.title}</p>
                  ) : null}
                  {metadata.description ? (
                    <p className="break-words text-xs leading-6 text-muted-foreground">{metadata.description}</p>
                  ) : null}
                </div>
                {/* Close X sits OUTSIDE the dir=rtl block (flex default LTR) so it
                    lands in the conventional top-right corner regardless of
                    script. Returns focus to the trigger on close. */}
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-xs"
                  className="size-5 shrink-0 rounded-full text-muted-foreground/70 hover:text-foreground"
                  onClick={() => {
                    setOpen(false)
                    anchorRef.current?.focus()
                  }}
                >
                  <X className="size-3" />
                  <span className="sr-only">Close field help</span>
                </Button>
              </div>
            </div>,
            document.body,
          )
        : null}
    </>
  )
}

// Label + help-button row. Layout matches the original PersonFieldLabel
// pattern (label on the left, help button right-aligned). Pass either:
//   - `metadata` directly, or
//   - `metadataFor` (a getter) plus `fieldKey` to look up by key
// so call sites can pick whichever is less verbose at their scale. Only depends
// on FieldHelpButton's `metadata` prop, which is preserved — every per-form
// wrapper compiles untouched.
function FieldLabel({
  htmlFor,
  className,
  metadata,
  metadataFor,
  fieldKey,
  children,
}) {
  const resolved = metadata ?? (metadataFor && fieldKey ? metadataFor(fieldKey) : null)
  return (
    <div className="flex items-center justify-between gap-2">
      <Label htmlFor={htmlFor} className={className || 'text-sm font-medium text-foreground'}>
        {children}
      </Label>
      <FieldHelpButton metadata={resolved} />
    </div>
  )
}

export { FieldHelpButton, FieldLabel }
