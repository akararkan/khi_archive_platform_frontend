import { useCallback, useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { Bell, Check, CheckCircle2, Loader2 } from 'lucide-react'

import { useToast } from '@/hooks/use-toast'
import { cn } from '@/lib/utils'
import { severityMetaFor } from '@/lib/warning-helpers'
import { formatRelative } from '@/pages/admin/analytics-constants'
import {
  acknowledgeWarning,
  getMyWarningCount,
  getMyWarnings,
} from '@/services/warnings'

// How often we silently re-pull the unacknowledged-count badge so it
// stays in sync without the user refreshing. The dedicated counter
// endpoint is cheap (one COUNT(*) query) so 30s is comfortable.
const COUNT_POLL_MS = 30000
// Recent-warnings list shown inside the popover. Twenty rows fit
// comfortably with a small scroll and matches the backend's default.
const INBOX_PAGE_SIZE = 20

// Notification bell — lives in the sidebar. Shows a numeric badge for
// unacknowledged warnings, opens a popover with a per-warning list and
// an inline "I've read this" acknowledge button on each row.
//
// Polls just the count endpoint while the popover is closed (cheap);
// pulls the full /me list on open so the user always sees fresh data.
// Polling pauses when the browser tab is hidden — same idiom as the
// analytics page — so a backgrounded tab doesn't burn API quota.
function WarningBell() {
  const toast = useToast()
  const [open, setOpen] = useState(false)
  const [unacknowledged, setUnacknowledged] = useState(0)
  const [items, setItems] = useState(null)
  const [isLoading, setIsLoading] = useState(false)
  const [acknowledging, setAcknowledging] = useState(null)
  const [coords, setCoords] = useState({ top: 0, left: 0 })
  const buttonRef = useRef(null)
  const popoverRef = useRef(null)

  const refreshCount = useCallback(async ({ silent } = { silent: true }) => {
    try {
      const data = await getMyWarningCount()
      const next = Number(data?.unacknowledged) || 0
      setUnacknowledged(next)
    } catch (err) {
      // Silent failures are normal — bell pings every 30s, network
      // hiccups would otherwise spam the user with toasts.
      if (!silent) toast.apiError(err, 'Could not refresh warnings')
    }
  }, [toast])

  const refreshList = useCallback(async () => {
    setIsLoading(true)
    try {
      const data = await getMyWarnings({ page: 0, size: INBOX_PAGE_SIZE })
      const rows = Array.isArray(data?.items) ? data.items
        : Array.isArray(data?.content) ? data.content
        : Array.isArray(data) ? data
        : []
      setItems(rows)
    } catch (err) {
      toast.apiError(err, 'Could not load your warnings')
    } finally {
      setIsLoading(false)
    }
  }, [toast])

  // Initial badge pull + 30s background poll. Pauses when the tab is
  // hidden so a backgrounded window doesn't keep firing requests.
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    refreshCount({ silent: true })

    const tick = () => {
      if (typeof document !== 'undefined' && document.visibilityState !== 'visible') return
      refreshCount({ silent: true })
    }
    const id = setInterval(tick, COUNT_POLL_MS)
    return () => clearInterval(id)
  }, [refreshCount])

  // When the user opens the popover, anchor it under the button and
  // refresh the recent-warnings list. We keep `items` around between
  // opens so reopening shows the previous state immediately.
  useEffect(() => {
    if (!open) return
    if (buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect()
      // Popover is right-anchored: align its right edge with the
      // button's right edge so it stays inside the viewport even when
      // the sidebar is narrow.
      const POPOVER_WIDTH = 360
      const top = rect.bottom + 8
      const left = Math.max(8, rect.right - POPOVER_WIDTH)
      setCoords({ top, left })
    }
    refreshList()
  }, [open, refreshList])

  // Click-outside + Escape to close.
  useEffect(() => {
    if (!open) return
    const handleClick = (e) => {
      if (popoverRef.current?.contains(e.target)) return
      if (buttonRef.current?.contains(e.target)) return
      setOpen(false)
    }
    const handleKey = (e) => {
      if (e.key === 'Escape') setOpen(false)
    }
    document.addEventListener('mousedown', handleClick)
    document.addEventListener('keydown', handleKey)
    return () => {
      document.removeEventListener('mousedown', handleClick)
      document.removeEventListener('keydown', handleKey)
    }
  }, [open])

  const handleAcknowledge = async (warning) => {
    if (!warning?.id) return
    setAcknowledging(warning.id)
    try {
      const updated = await acknowledgeWarning(warning.id)
      // Optimistically swap the local row so the badge updates
      // immediately even before the next count poll lands.
      setItems((prev) => {
        if (!Array.isArray(prev)) return prev
        return prev.map((row) =>
          row.id === warning.id
            ? { ...row, ...(updated || {}), acknowledged: true, acknowledgedAt: updated?.acknowledgedAt || new Date().toISOString() }
            : row,
        )
      })
      setUnacknowledged((n) => Math.max(0, n - 1))
      toast.success('Acknowledged', 'Thanks for confirming you saw this.')
    } catch (err) {
      toast.apiError(err, 'Could not acknowledge')
    } finally {
      setAcknowledging(null)
    }
  }

  const hasUnack = unacknowledged > 0
  const badgeText = unacknowledged > 99 ? '99+' : String(unacknowledged)

  return (
    <>
      <button
        ref={buttonRef}
        type="button"
        onClick={() => setOpen((v) => !v)}
        className={cn(
          'relative flex w-full items-center gap-3 rounded-2xl border px-3 py-2.5 text-sm font-medium transition-colors',
          hasUnack
            ? 'border-amber-500/40 bg-amber-500/10 text-amber-900 hover:bg-amber-500/15 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-100'
            : 'border-border bg-background text-foreground/80 hover:border-primary/30 hover:bg-muted/40',
        )}
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-label={hasUnack ? `${unacknowledged} unacknowledged warning${unacknowledged === 1 ? '' : 's'}` : 'Warnings'}
      >
        <span
          className={cn(
            'relative flex size-8 shrink-0 items-center justify-center rounded-lg',
            hasUnack
              ? 'bg-amber-500/15 text-amber-600 dark:text-amber-300'
              : 'bg-muted/60 text-muted-foreground',
          )}
        >
          <Bell className="size-4" />
          {hasUnack ? (
            <>
              <span
                aria-hidden="true"
                className="absolute -right-0.5 -top-0.5 inline-flex size-2.5 animate-ping rounded-full bg-amber-500/60"
              />
              <span
                aria-hidden="true"
                className="absolute -right-0.5 -top-0.5 inline-flex min-h-4 min-w-4 items-center justify-center rounded-full bg-amber-500 px-1 text-[10px] font-bold leading-none text-white shadow-sm"
              >
                {badgeText}
              </span>
            </>
          ) : null}
        </span>
        <span className="min-w-0 flex-1 text-left">
          <span className="block truncate">Warnings</span>
          <span className="block truncate text-[11px] font-normal text-muted-foreground">
            {hasUnack
              ? `${unacknowledged} unacknowledged`
              : 'No new warnings'}
          </span>
        </span>
      </button>

      {open
        ? createPortal(
            <div
              ref={popoverRef}
              role="dialog"
              aria-label="Your warnings"
              style={{ position: 'fixed', top: coords.top, left: coords.left, zIndex: 90 }}
              className="w-[360px] overflow-hidden rounded-2xl border border-border bg-popover shadow-xl shadow-black/30"
            >
              <div className="flex items-center justify-between gap-2 border-b border-border px-4 py-3">
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-foreground">Your warnings</p>
                  <p className="text-[11px] text-muted-foreground">
                    {hasUnack
                      ? `${unacknowledged} unacknowledged`
                      : "You're all caught up."}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => refreshList()}
                  disabled={isLoading}
                  className="inline-flex size-7 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted/60 hover:text-foreground"
                  aria-label="Refresh warnings"
                >
                  {isLoading ? (
                    <Loader2 className="size-3.5 animate-spin" />
                  ) : (
                    <CheckCircle2 className="size-3.5" />
                  )}
                </button>
              </div>
              <div className="max-h-[60vh] overflow-y-auto">
                {isLoading && !items ? (
                  <div className="flex flex-col items-center justify-center gap-2 px-4 py-8 text-center text-xs text-muted-foreground">
                    <Loader2 className="size-4 animate-spin" />
                    Loading…
                  </div>
                ) : !items || items.length === 0 ? (
                  <div className="flex flex-col items-center justify-center gap-2 px-4 py-10 text-center">
                    <CheckCircle2 className="size-6 text-emerald-500" />
                    <p className="text-sm font-semibold text-foreground">No warnings</p>
                    <p className="text-xs text-muted-foreground">
                      You haven't received any warnings.
                    </p>
                  </div>
                ) : (
                  <ul className="divide-y divide-border">
                    {items.map((w) => (
                      <WarningRow
                        key={w.id}
                        warning={w}
                        onAcknowledge={() => handleAcknowledge(w)}
                        isAcknowledging={acknowledging === w.id}
                      />
                    ))}
                  </ul>
                )}
              </div>
            </div>,
            document.body,
          )
        : null}
    </>
  )
}

function WarningRow({ warning, onAcknowledge, isAcknowledging }) {
  const meta = severityMetaFor(warning.severity)
  const Icon = meta.icon
  const ack = Boolean(warning.acknowledged || warning.acknowledgedAt)
  return (
    <li
      className={cn(
        'group flex items-start gap-3 px-4 py-3 transition-colors',
        ack ? 'opacity-70' : 'hover:bg-muted/30',
      )}
    >
      <span
        className={cn(
          'mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-lg bg-muted/60 ring-1',
          meta.accent,
          meta.ring,
        )}
      >
        <Icon className="size-3.5" />
      </span>
      <div className="min-w-0 flex-1 space-y-1">
        <div className="flex items-center justify-between gap-2">
          <p className="truncate text-sm font-semibold text-foreground">
            {warning.title || meta.label}
          </p>
          <span className="shrink-0 text-[10px] tabular-nums text-muted-foreground">
            {formatRelative(warning.createdAt)}
          </span>
        </div>
        {warning.message ? (
          <p className="whitespace-pre-line break-words text-xs leading-5 text-muted-foreground">
            {warning.message}
          </p>
        ) : null}
        <div className="flex items-center justify-between gap-2 pt-1">
          <span
            className={cn(
              'inline-flex items-center rounded-full border px-1.5 py-px text-[10px] font-semibold uppercase tracking-wider',
              meta.accent,
              meta.ring,
            )}
          >
            {meta.label}
          </span>
          {ack ? (
            <span className="inline-flex items-center gap-1 text-[11px] text-emerald-600 dark:text-emerald-400">
              <Check className="size-3" /> Acknowledged
            </span>
          ) : (
            <button
              type="button"
              onClick={onAcknowledge}
              disabled={isAcknowledging}
              className="inline-flex h-6 items-center gap-1 rounded-md border border-border bg-background px-2 text-[11px] font-medium text-foreground transition-colors hover:bg-muted disabled:opacity-60"
            >
              {isAcknowledging ? (
                <Loader2 className="size-3 animate-spin" />
              ) : (
                <Check className="size-3" />
              )}
              {isAcknowledging ? 'Saving…' : 'I read this'}
            </button>
          )}
        </div>
      </div>
    </li>
  )
}

export { WarningBell }
