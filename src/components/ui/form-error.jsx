import { CircleAlert } from 'lucide-react'

import { LocalizedErrorContent } from '@/components/ui/error-display'
import { cn } from '@/lib/utils'

// Accepts:
//   - falsy → renders nothing
//   - string → single neutral line
//   - `formatApiError` result → bilingual (English + Sorani Kurdish) box with
//     title, message, per-field details, recovery hint, and support traceId
//   - legacy { title, description, details, status } → English-only box
//
// Style: a faint-red surface with a red left accent bar + red alert icon, so
// the error reads clearly without drowning the (neutral) body copy in red.
function FormErrorBox({ error, className }) {
  if (!error) return null

  return (
    <div
      role="alert"
      className={cn(
        'relative overflow-hidden rounded-lg border border-destructive/30 bg-destructive/5 py-2.5 pl-4 pr-3 text-sm shadow-sm',
        className,
      )}
    >
      <span aria-hidden="true" className="absolute inset-y-0 left-0 w-1 bg-destructive" />
      <div className="flex items-start gap-2.5">
        <CircleAlert className="mt-0.5 size-4 shrink-0 text-destructive" aria-hidden="true" />
        <LocalizedErrorContent error={error} />
      </div>
    </div>
  )
}

export { FormErrorBox }
