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

// Card background everywhere; the variant adds a coloured border + a left
// accent bar + a coloured icon/title. Body copy stays neutral so the toast
// reads cleanly instead of becoming a wall of colour.
function getToastBorder(variant) {
  if (variant === 'success') return 'border-emerald-500/30'
  if (variant === 'error') return 'border-destructive/30'
  return 'border-border'
}

function getToastAccent(variant) {
  if (variant === 'success') return 'bg-emerald-500'
  if (variant === 'error') return 'bg-destructive'
  return 'bg-primary'
}

function getToastIconClass(variant) {
  if (variant === 'success') return 'text-emerald-600 dark:text-emerald-400'
  if (variant === 'error') return 'text-destructive'
  return 'text-muted-foreground'
}

function getToastTitleClass(variant) {
  if (variant === 'success') return 'text-emerald-700 dark:text-emerald-300'
  if (variant === 'error') return 'text-destructive'
  return 'text-foreground'
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

  const dismiss = useCallback((id) => {
    const timeoutId = timeoutMapRef.current.get(id)
    if (timeoutId) {
      clearTimeout(timeoutId)
      timeoutMapRef.current.delete(id)
    }

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
      },
    ])

    const timeoutId = window.setTimeout(() => {
      dismiss(id)
    }, duration)

    timeoutMapRef.current.set(id, timeoutId)

    return id
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

      <div className="pointer-events-none fixed right-4 top-4 z-[100] flex w-[min(92vw,420px)] flex-col gap-2">
        {toasts.map((toast) => {
          const Icon = getToastIcon(toast.variant)

          return (
            <div
              key={toast.id}
              className={cn(
                'pointer-events-auto relative overflow-hidden rounded-xl border bg-card py-3 pl-4 pr-3 shadow-lg shadow-black/10 backdrop-blur supports-[backdrop-filter]:bg-card/95',
                getToastBorder(toast.variant),
              )}
              role="status"
            >
              <span
                aria-hidden="true"
                className={cn('absolute inset-y-0 left-0 w-1', getToastAccent(toast.variant))}
              />
              <div className="flex items-start gap-3">
                <Icon className={cn('mt-0.5 size-4 shrink-0', getToastIconClass(toast.variant))} />

                {toast.i18n ? (
                  // API errors: bilingual title/message/hint/traceId/details.
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
                  className="size-6 rounded-full"
                  onClick={() => dismiss(toast.id)}
                >
                  <X className="size-3.5" />
                  <span className="sr-only">Dismiss notification</span>
                </Button>
              </div>
            </div>
          )
        })}
      </div>
    </ToastContext.Provider>
  )
}

export { ToastProvider }
