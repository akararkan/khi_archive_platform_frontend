import { Lightbulb } from 'lucide-react'

import { cn } from '@/lib/utils'

// Shared renderer for a localized API error. Used inside both the toaster and
// FormErrorBox so the bilingual (English + Sorani Kurdish) layout — title,
// message, per-field details, recovery hint, and support traceId — is
// identical everywhere an exception surfaces.
//
// Visual contract: red is an ACCENT (title + the container's bar/icon), not a
// wash. Body copy stays neutral/foreground so it reads as information, not
// alarm; the hint sits in its own calm panel. Works on both the toast's card
// background and the form box's faint-red background.
//
// Accepts:
//   - a plain string                → single neutral line
//   - a `formatApiError` result     → `.i18n` bundle drives the bilingual view
//   - a legacy { title, description, details, status } object → English-only

// HTTP status — part of the error's identity, so it carries the red accent.
function StatusChip({ value }) {
  if (value == null) return null
  return (
    <span className="inline-flex items-center rounded-full border border-destructive/30 bg-destructive/10 px-1.5 py-0 font-mono text-[10px] font-semibold tabular-nums tracking-wide text-destructive">
      {value}
    </span>
  )
}

// Machine code — a developer/support breadcrumb, kept visually quiet.
function CodeChip({ value }) {
  if (!value) return null
  return (
    <span className="inline-flex items-center rounded-full border border-border bg-muted/70 px-1.5 py-0 font-mono text-[10px] font-medium tracking-wide text-muted-foreground">
      {value}
    </span>
  )
}

function DetailList({ details, presentation = 'compact' }) {
  if (!Array.isArray(details) || details.length === 0) return null
  const list = (
    <ul className={cn(presentation === 'card' ? 'space-y-2' : 'space-y-1 pt-0.5')}>
      {details.map((detail, index) => {
        // Bilingual label when present ({ en, ku }), else a legacy string label.
        const labelEn = typeof detail.label === 'object' ? detail.label?.en : detail.label
        const labelKu = typeof detail.label === 'object' ? detail.label?.ku : null
        return (
          <li
            key={`${detail.field || 'detail'}-${index}`}
            className={cn(
              'flex items-start gap-2 text-[11px] leading-5',
              presentation === 'card' && 'rounded-lg border border-border/70 bg-background px-3 py-2',
            )}
          >
            <span
              aria-hidden="true"
              className="mt-[7px] size-1.5 shrink-0 rounded-full bg-destructive/65"
            />
            <span className="min-w-0 break-words">
              {labelEn ? (
                <span className="font-semibold text-foreground/85">
                  {labelEn}
                  {labelKu ? (
                    <span dir="rtl" lang="ckb" className="font-normal text-muted-foreground">
                      {' '}
                      · {labelKu}
                    </span>
                  ) : null}
                  :{' '}
                </span>
              ) : null}
              <span className="text-muted-foreground">{detail.message}</span>
            </span>
          </li>
        )
      })}
    </ul>
  )

  if (presentation !== 'card') return list

  return (
    <div className="space-y-2 rounded-xl border border-border/70 bg-muted/25 p-3">
      <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-foreground/55">
        Information to review
      </p>
      {list}
    </div>
  )
}

// Recovery hint — its own calm panel with a two-language header laid out
// left/right so the scripts never collide.
function HintBlock({ hint, presentation = 'compact' }) {
  if (!hint || (!hint.en && !hint.ku)) return null
  return (
    <div
      className={cn(
        'mt-0.5 border border-border/70',
        presentation === 'card'
          ? 'rounded-xl bg-amber-500/[0.055] px-3 py-2.5'
          : 'rounded-lg bg-muted/40 px-2.5 py-2',
      )}
    >
      <div className="flex items-center justify-between gap-2">
        <span className="inline-flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wider text-foreground/55">
          <Lightbulb className="size-3 text-amber-500" aria-hidden="true" />
          What to do next
        </span>
        <span dir="rtl" lang="ckb" className="text-[11px] font-semibold text-foreground/55">
          چی بکەیت
        </span>
      </div>
      {hint.en ? (
        <p className="mt-1 text-[11px] leading-5 text-muted-foreground">{hint.en}</p>
      ) : null}
      {hint.ku ? (
        <p dir="rtl" lang="ckb" className="mt-0.5 text-[11px] leading-5 text-muted-foreground">
          {hint.ku}
        </p>
      ) : null}
    </div>
  )
}

function TraceRow({ traceId }) {
  if (!traceId) return null
  return (
    <div className="flex flex-wrap items-center gap-1.5 pt-0.5 text-[10px] text-muted-foreground">
      <span className="font-semibold uppercase tracking-wider">Trace ID</span>
      <code className="select-all break-all rounded bg-muted px-1 py-0.5 font-mono text-[10px] text-foreground/80">
        {traceId}
      </code>
    </div>
  )
}

function LocalizedErrorContent({ error, className, presentation = 'compact' }) {
  if (!error) return null

  // Plain string → single neutral line (the container's icon/bar signal error).
  if (typeof error === 'string') {
    return (
      <p className={cn('min-w-0 flex-1 break-words text-sm leading-5 text-foreground', className)}>
        {error}
      </p>
    )
  }

  // Legacy object without the bilingual bundle → English-only fields.
  if (!error.i18n) {
    const title = typeof error.title === 'string' ? error.title : null
    const description = typeof error.description === 'string' ? error.description : null
    const status = typeof error.status === 'number' ? error.status : null
    const details = Array.isArray(error.details) ? error.details : []
    return (
      <div
        className={cn(
          'min-w-0 flex-1',
          presentation === 'card' ? 'space-y-2.5' : 'space-y-1.5',
          className,
        )}
      >
        {(title || status) && (
          <div className="flex flex-wrap items-center gap-1.5">
            {title ? (
              <p className="text-sm font-semibold leading-5 text-destructive">{title}</p>
            ) : null}
            <StatusChip value={status} />
          </div>
        )}
        {description ? (
          <p className="break-words text-xs leading-5 text-foreground/90">{description}</p>
        ) : null}
        <DetailList details={details} presentation={presentation} />
      </div>
    )
  }

  const view = error.i18n

  return (
    <div
      className={cn(
        'min-w-0 flex-1',
        presentation === 'card' ? 'space-y-3' : 'space-y-2',
        className,
      )}
    >
      {/* Title — English (red accent) + chips, then Kurdish underneath */}
      <div className="space-y-0.5">
        <div className="flex flex-wrap items-center gap-1.5">
          <p className="text-sm font-semibold leading-5 text-destructive">{view.title.en}</p>
          <StatusChip value={view.status} />
          <CodeChip value={view.code} />
        </div>
        {view.title.ku ? (
          <p dir="rtl" lang="ckb" className="text-[13px] font-semibold leading-5 text-destructive/80">
            {view.title.ku}
          </p>
        ) : null}
      </div>

      {/* Message (description) in both languages — neutral, readable */}
      {view.message.en || view.message.ku ? (
        <div className="space-y-0.5">
          {view.message.en ? (
            <p className="break-words text-xs leading-5 text-foreground/90">{view.message.en}</p>
          ) : null}
          {view.message.ku ? (
            <p dir="rtl" lang="ckb" className="break-words text-xs leading-5 text-foreground/70">
              {view.message.ku}
            </p>
          ) : null}
        </div>
      ) : null}

      {/* Per-field validation details */}
      <DetailList details={view.details} presentation={presentation} />

      {/* Recovery hint */}
      <HintBlock hint={view.hint} presentation={presentation} />

      {/* Support correlation id (5xx / infrastructure errors) */}
      {view.showTrace ? <TraceRow traceId={view.traceId} /> : null}
    </div>
  )
}

export { LocalizedErrorContent }
