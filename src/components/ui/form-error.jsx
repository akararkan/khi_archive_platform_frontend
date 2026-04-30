import { CircleAlert } from 'lucide-react'

import { cn } from '@/lib/utils'

// Accepts:
//   - falsy → renders nothing
//   - string → renders as a single-line error
//   - { title, description, details: [{label, message}], status } → renders a
//     titled box with a bulleted list of field errors when provided.
function FormErrorBox({ error, className }) {
  if (!error) return null

  if (typeof error === 'string') {
    return (
      <div
        role="alert"
        className={cn(
          'rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive',
          className,
        )}
      >
        {error}
      </div>
    )
  }

  const title = error.title
  const description = error.description
  const details = Array.isArray(error.details) ? error.details : []
  const status = typeof error.status === 'number' ? error.status : null

  return (
    <div
      role="alert"
      className={cn(
        'rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2.5 text-sm text-destructive',
        className,
      )}
    >
      <div className="flex items-start gap-2">
        <CircleAlert className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
        <div className="min-w-0 flex-1 space-y-1">
          <div className="flex flex-wrap items-center gap-1.5">
            {title ? <p className="font-semibold leading-5">{title}</p> : null}
            {status ? (
              <span className="inline-flex items-center rounded-full border border-current/30 bg-background/60 px-1.5 py-0 font-mono text-[10px] font-semibold uppercase tracking-wider opacity-80">
                {status}
              </span>
            ) : null}
          </div>
          {description ? (
            <p className="break-words text-xs leading-5 text-destructive/90">
              {description}
            </p>
          ) : null}
          {details.length > 0 ? (
            <ul className="space-y-0.5 pl-1 pt-0.5 text-[11px] leading-5">
              {details.map((detail, index) => (
                <li
                  key={`${detail.field || 'detail'}-${index}`}
                  className="flex gap-1.5 break-words"
                >
                  <span aria-hidden="true" className="select-none opacity-60">•</span>
                  <span>
                    {detail.label ? (
                      <span className="font-semibold">{detail.label}: </span>
                    ) : null}
                    <span className="opacity-90">{detail.message}</span>
                  </span>
                </li>
              ))}
            </ul>
          ) : null}
        </div>
      </div>
    </div>
  )
}

export { FormErrorBox }
