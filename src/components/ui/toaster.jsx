import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { CheckCircle2, CircleAlert, Info, X } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { LocalizedErrorContent } from '@/components/ui/error-display'
import { formatApiError } from '@/lib/get-error-message'
import { ToastContext } from '@/lib/toast-context'
import { cn } from '@/lib/utils'

const DEFAULT_TOAST_DURATION = 4000

function getToastIcon(variant) {
  if (variant === 'success') return CheckCircle2
  if (variant === 'error') return CircleAlert
  return Info
}

// A restrained tinted-glass wash + a variant ring sit on a translucent card so
// the toast reads as clearly intentional (the brand-correct answer to "plain /
// weak") without becoming a wall of colour. The crisp variant colour lives in
// a filled icon chip + the title; body copy stays neutral.
function getToastSurface(variant) {
  if (variant === 'success')
    return 'border-emerald-500/20 bg-emerald-50/70 ring-emerald-500/15 dark:bg-emerald-950/40 dark:ring-emerald-400/15'
  if (variant === 'error')
    return 'border-destructive/25 bg-red-50/70 ring-destructive/15 dark:bg-red-950/40 dark:ring-destructive/20'
  return 'border-border bg-card/80 ring-black/5 dark:ring-white/10'
}

// Filled circular chip behind the variant icon.
function getToastChip(variant) {
  if (variant === 'success') return 'bg-emerald-500/15 ring-emerald-500/25 dark:bg-emerald-400/15'
  if (variant === 'error') return 'bg-destructive/15 ring-destructive/25'
  return 'bg-primary/10 ring-primary/20'
}

function getToastIconClass(variant) {
  if (variant === 'success') return 'text-emerald-600 dark:text-emerald-400'
  if (variant === 'error') return 'text-destructive'
  return 'text-primary'
}

function getToastTitleClass(variant) {
  if (variant === 'success') return 'text-emerald-700 dark:text-emerald-300'
  if (variant === 'error') return 'text-destructive'
  return 'text-foreground'
}

// Thin bottom auto-dismiss bar fill.
function getToastProgress(variant) {
  if (variant === 'success') return 'bg-emerald-500/70 dark:bg-emerald-400/60'
  if (variant === 'error') return 'bg-destructive/70'
  return 'bg-primary/60'
}

// `description` may be a plain string OR an options object. Normalize either
// shape (and the legacy "second positional arg") into the toast row.
function resolveToastFields(secondArg) {
  if (secondArg === undefined || secondArg === null) {
    return { description: '', details: null, code: null, status: null }
  }

  if (typeof secondArg === 'string') {
    return { description: secondArg, details: null, code: null, status: null }
  }

  if (typeof secondArg === 'object') {
    const description =
      typeof secondArg.description === 'string' ? secondArg.description : ''
    const details = Array.isArray(secondArg.details) && secondArg.details.length > 0
      ? secondArg.details
      : null
    return {
      description,
      details,
      code: secondArg.code ?? null,
      status: typeof secondArg.status === 'number' ? secondArg.status : null,
    }
  }

  return { description: String(secondArg), details: null, code: null, status: null }
}

function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([])
  const timeoutMapRef = useRef(new Map())
  // Per-toast dismiss bookkeeping for the truthful hover-pause: `endAt` is when
  // the current run will dismiss; `remaining` is captured on pause so resume
  // continues from exactly where it froze (timer AND progress bar in lockstep).
  const runMapRef = useRef(new Map())

  const dismiss = useCallback((id) => {
    const timeoutId = timeoutMapRef.current.get(id)
    if (timeoutId) {
      clearTimeout(timeoutId)
      timeoutMapRef.current.delete(id)
    }
    runMapRef.current.delete(id)

    setToasts((currentToasts) => currentToasts.filter((toast) => toast.id !== id))
  }, [])

  const push = useCallback((options = {}) => {
    const {
      title = 'Update',
      description = '',
      details = null,
      code = null,
      status = null,
      i18n = null,
      variant = 'info',
      duration = DEFAULT_TOAST_DURATION,
    } = options

    const id =
      typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
        ? crypto.randomUUID()
        : `${Date.now()}-${Math.random().toString(16).slice(2)}`

    setToasts((currentToasts) => [
      ...currentToasts,
      {
        id,
        title,
        description,
        details,
        code,
        status,
        i18n,
        variant,
        duration,
        // `runKey` re-keys the progress bar to restart its CSS animation on
        // resume; `elapsed` becomes a negative animation-delay so the bar
        // resumes from exactly where it paused (no jump).
        runKey: 0,
        elapsed: 0,
      },
    ])

    const timeoutId = window.setTimeout(() => {
      dismiss(id)
    }, duration)

    timeoutMapRef.current.set(id, timeoutId)
    runMapRef.current.set(id, { endAt: Date.now() + duration, remaining: duration })

    return id
  }, [dismiss])

  // Truthful hover-pause: while the pointer is over a toast we cancel the real
  // auto-dismiss timer (not just the visual bar) and capture how much time is
  // left, so a toast you're reading never vanishes mid-sentence.
  const pauseTimer = useCallback((id) => {
    const timeoutId = timeoutMapRef.current.get(id)
    if (!timeoutId) return
    clearTimeout(timeoutId)
    timeoutMapRef.current.delete(id)
    const run = runMapRef.current.get(id)
    if (run) run.remaining = Math.max(0, run.endAt - Date.now())
  }, [])

  // On leave, resume from the captured remaining time (NOT a fresh full
  // duration) and re-key the bar with a negative delay so the visual bar and
  // the real timer finish together. The has() guard makes repeated enter/leave
  // race-free — two timers can never stack for one toast.
  const resumeTimer = useCallback((id, duration) => {
    if (timeoutMapRef.current.has(id)) return
    const full = duration ?? DEFAULT_TOAST_DURATION
    const run = runMapRef.current.get(id)
    const remaining = run ? run.remaining : full
    const timeoutId = window.setTimeout(() => dismiss(id), remaining)
    timeoutMapRef.current.set(id, timeoutId)
    runMapRef.current.set(id, { endAt: Date.now() + remaining, remaining })
    const elapsed = Math.max(0, full - remaining)
    setToasts((currentToasts) =>
      currentToasts.map((toast) =>
        toast.id === id ? { ...toast, runKey: (toast.runKey ?? 0) + 1, elapsed } : toast,
      ),
    )
  }, [dismiss])

  useEffect(() => {
    const timeoutMap = timeoutMapRef.current

    return () => {
      timeoutMap.forEach((timeoutId) => {
        clearTimeout(timeoutId)
      })
      timeoutMap.clear()
    }
  }, [])

  const api = useMemo(
    () => ({
      toast: (title, description = '') => {
        const fields = resolveToastFields(description)
        return push({ title, ...fields, variant: 'info' })
      },
      success: (title, description = '') => {
        const fields = resolveToastFields(description)
        return push({ title, ...fields, variant: 'success' })
      },
      error: (title, description = '') => {
        const fields = resolveToastFields(description)
        // Errors with field details get more time on screen since the user
        // needs to read several lines.
        const duration =
          fields.details && fields.details.length > 1 ? 9000 : 5500
        return push({
          title,
          ...fields,
          variant: 'error',
          duration,
        })
      },
      // Convenience for axios/fetch failures: extract the title, message, and
      // per-field validation errors from an `ApiErrorResponse`-shaped body.
      apiError: (error, fallbackTitle = 'Something went wrong') => {
        const formatted = formatApiError(error, fallbackTitle)
        // Errors with a hint / multiple field rows need more reading time.
        const rows = (formatted.details ? formatted.details.length : 0) + (formatted.hint ? 1 : 0)
        const duration = rows > 1 ? 9000 : 6000
        return push({
          title: formatted.title,
          description: formatted.description || '',
          details: formatted.details && formatted.details.length > 0
            ? formatted.details
            : null,
          code: formatted.code,
          status: formatted.status,
          // Bilingual bundle: drives the English + Kurdish rendering, the
          // recovery hint, and the support traceId in the toast body.
          i18n: formatted.i18n,
          variant: 'error',
          duration,
        })
      },
      dismiss,
    }),
    [dismiss, push],
  )

  return (
    <ToastContext.Provider value={api}>
      {children}

      <div className="pointer-events-none fixed right-4 top-4 z-[100] flex w-[min(92vw,420px)] flex-col gap-2.5">
        {toasts.map((toast) => {
          const Icon = getToastIcon(toast.variant)

          return (
            <div
              key={toast.id}
              role={toast.variant === 'error' ? 'alert' : 'status'}
              aria-live={toast.variant === 'error' ? 'assertive' : 'polite'}
              onMouseEnter={() => pauseTimer(toast.id)}
              onMouseLeave={() => resumeTimer(toast.id, toast.duration)}
              className={cn(
                'group pointer-events-auto relative overflow-hidden rounded-xl border p-3.5 pr-2.5 shadow-lg shadow-black/10 ring-1 backdrop-blur-md',
                'supports-[backdrop-filter]:bg-card/80',
                'animate-in fade-in-0 slide-in-from-right-3 zoom-in-[0.98] duration-300 ease-out motion-reduce:animate-none',
                getToastSurface(toast.variant),
              )}
            >
              <div className="flex items-start gap-3">
                {/* Filled circular icon chip — the crisp variant colour lives
                    here, not as a full-card wash. */}
                <span className={cn('mt-0.5 grid size-7 shrink-0 place-items-center rounded-full ring-1', getToastChip(toast.variant))}>
                  <Icon className={cn('size-4', getToastIconClass(toast.variant))} aria-hidden="true" />
                </span>

                {toast.i18n ? (
                  // API errors: bilingual title/message/hint/traceId/details.
                  // (LocalizedErrorContent applies min-w-0 flex-1 on its root.)
                  <LocalizedErrorContent error={{ i18n: toast.i18n }} />
                ) : (
                  <div className="min-w-0 flex-1 space-y-1">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <p className={cn('text-sm font-semibold leading-5', getToastTitleClass(toast.variant))}>{toast.title}</p>
                      {toast.status ? (
                        <span className="inline-flex items-center rounded-full border border-current/30 bg-background/60 px-1.5 py-0 font-mono text-[10px] font-semibold uppercase tracking-wider opacity-80">
                          {toast.status}
                        </span>
                      ) : null}
                    </div>
                    {toast.description ? (
                      <p className="break-words text-xs leading-5 text-muted-foreground">
                        {toast.description}
                      </p>
                    ) : null}
                    {Array.isArray(toast.details) && toast.details.length > 0 ? (
                      <ul className="space-y-0.5 pl-1 pt-0.5 text-[11px] leading-5">
                        {toast.details.map((detail, index) => (
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
                )}

                <Button
                  type="button"
                  variant="ghost"
                  size="icon-xs"
                  className="size-6 shrink-0 rounded-full text-muted-foreground/70 transition-opacity hover:text-foreground"
                  onClick={() => dismiss(toast.id)}
                >
                  <X className="size-3.5" />
                  <span className="sr-only">Dismiss notification</span>
                </Button>
              </div>

              {/* Thin auto-dismiss bar pinned to the bottom, depleting L→R over
                  the toast's own `duration`. group-hover freezes the CSS
                  animation while the real timer is paused (pauseTimer); on
                  leave the span is re-keyed (runKey) with a negative
                  animation-delay equal to the elapsed time, so the bar resumes
                  exactly where it froze and finishes in lockstep with the
                  resumed timer — the affordance is truthful. */}
              <span aria-hidden="true" className="absolute inset-x-0 bottom-0 h-0.5 overflow-hidden">
                <span
                  key={toast.runKey ?? 0}
                  className={cn(
                    'block h-full origin-left animate-toast-progress group-hover:[animation-play-state:paused] motion-reduce:animate-none',
                    getToastProgress(toast.variant),
                  )}
                  style={{
                    animationDuration: `${toast.duration ?? DEFAULT_TOAST_DURATION}ms`,
                    animationDelay: `-${toast.elapsed ?? 0}ms`,
                  }}
                />
              </span>
            </div>
          )
        })}
      </div>
    </ToastContext.Provider>
  )
}

export { ToastProvider }
