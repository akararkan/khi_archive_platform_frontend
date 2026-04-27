import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { CheckCircle2, CircleAlert, Info, X } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { ToastContext } from '@/lib/toast-context'
import { cn } from '@/lib/utils'

const DEFAULT_TOAST_DURATION = 4000

function getToastIcon(variant) {
  if (variant === 'success') return CheckCircle2
  if (variant === 'error') return CircleAlert
  return Info
}

function getToastClasses(variant) {
  if (variant === 'success') {
    return 'border-emerald-500/30 bg-emerald-500/10 text-emerald-950 dark:text-emerald-200'
  }

  if (variant === 'error') {
    return 'border-destructive/30 bg-destructive/10 text-destructive'
  }

  return 'border-border bg-card text-foreground'
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
      toast: (title, description = '') => push({ title, description, variant: 'info' }),
      success: (title, description = '') => push({ title, description, variant: 'success' }),
      error: (title, description = '') =>
        push({
          title,
          description,
          variant: 'error',
          duration: 5500,
        }),
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
                'pointer-events-auto rounded-xl border p-3 shadow-lg shadow-black/10 backdrop-blur supports-[backdrop-filter]:bg-card/95',
                getToastClasses(toast.variant),
              )}
              role="status"
            >
              <div className="flex items-start gap-3">
                <Icon className="mt-0.5 size-4 shrink-0" />

                <div className="min-w-0 flex-1 space-y-1">
                  <p className="text-sm font-semibold leading-5">{toast.title}</p>
                  {toast.description ? (
                    <p className="text-xs leading-5 text-muted-foreground">{toast.description}</p>
                  ) : null}
                </div>

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
