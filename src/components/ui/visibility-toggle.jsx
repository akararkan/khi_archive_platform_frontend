import { Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'

/**
 * Compact, accessible on/off switch with a built-in pending state — for flipping
 * a boolean inline (e.g. an item or collection's public visibility) straight
 * from a list row, with no edit form.
 *
 * The parent owns the value and performs the save; pass `pending` while the
 * request is in flight to lock the control and spin the knob. Use optimistic
 * updates in the parent so the switch moves instantly and only rolls back on
 * error.
 *
 * Props:
 *   checked   boolean            current value
 *   onToggle  (next) => void     called with the requested next value
 *   pending   boolean            request in flight — disables + shows a spinner
 *   disabled  boolean            hard-disable (e.g. no permission)
 *   label     string?            text beside the switch (defaults to on/offLabel)
 *   onLabel / offLabel  string   default label text per state
 *   title     string?            tooltip / aria-label override
 */
export function VisibilityToggle({
  checked,
  onToggle,
  pending = false,
  disabled = false,
  label,
  onLabel = 'Public',
  offLabel = 'Hidden',
  title,
  className,
}) {
  const isDisabled = pending || disabled
  const text = label ?? (checked ? onLabel : offLabel)
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={title || text}
      title={title || text}
      disabled={isDisabled}
      onClick={() => onToggle(!checked)}
      className={cn(
        'group inline-flex items-center gap-2 rounded-full text-left transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40 disabled:cursor-not-allowed',
        className,
      )}
    >
      <span
        className={cn(
          'relative inline-flex h-5 w-9 shrink-0 items-center rounded-full px-0.5 transition-colors',
          checked ? 'bg-emerald-500' : 'bg-input',
          isDisabled && 'opacity-70',
        )}
      >
        <span
          className={cn(
            'grid size-4 place-items-center rounded-full bg-white shadow-sm transition-transform',
            checked ? 'translate-x-4' : 'translate-x-0',
          )}
        >
          {pending ? <Loader2 className="size-3 animate-spin text-muted-foreground" /> : null}
        </span>
      </span>
      {text ? (
        <span
          className={cn(
            'text-xs font-medium',
            checked ? 'text-emerald-600 dark:text-emerald-400' : 'text-muted-foreground',
          )}
        >
          {text}
        </span>
      ) : null}
    </button>
  )
}
