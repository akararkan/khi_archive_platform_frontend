import { CircleAlert } from 'lucide-react'

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { LocalizedErrorContent } from '@/components/ui/error-display'
import { cn } from '@/lib/utils'

// Accepts:
//   - falsy → renders nothing
//   - string → single neutral line
//   - `formatApiError` result → bilingual (English + Sorani Kurdish) box with
//     title, message, per-field details, recovery hint, and support traceId
//   - legacy { title, description, details, status } → English-only box
//
// Style: a structured card with a calm header and a separate details surface.
// Red remains an accent, while the actionable content stays easy to scan.
function FormErrorBox({ error, className }) {
  if (!error) return null

  return (
    <Card
      role="alert"
      aria-live="assertive"
      className={cn(
        'relative gap-0 overflow-hidden rounded-2xl border border-destructive/25 bg-card py-0 shadow-lg shadow-destructive/5 ring-1 ring-destructive/10',
        className,
      )}
    >
      <span
        aria-hidden="true"
        className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-destructive via-destructive/70 to-destructive/15"
      />
      <CardHeader className="border-b border-destructive/10 bg-destructive/[0.035] px-5 pb-3.5 pt-5">
        <div className="flex items-start gap-3">
          <span className="grid size-10 shrink-0 place-items-center rounded-xl border border-destructive/20 bg-destructive/10 text-destructive shadow-sm">
            <CircleAlert className="size-5" aria-hidden="true" />
          </span>
          <div className="min-w-0 space-y-0.5">
            <CardTitle className="text-sm font-semibold text-foreground">
              Something needs your attention
            </CardTitle>
            <CardDescription className="text-xs leading-5">
              Review the information below, correct it, and try again.
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="px-5 py-4">
        <LocalizedErrorContent error={error} presentation="card" />
      </CardContent>
    </Card>
  )
}

export { FormErrorBox }
