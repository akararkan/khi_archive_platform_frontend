import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  AlertTriangle,
  Bell,
  Check,
  CheckCircle2,
  Clock,
  FolderOpen,
  Loader2,
  MessageSquarePlus,
  RefreshCw,
  Search,
} from 'lucide-react'

import { EmployeeEntityPage } from '@/components/employee/EmployeeEntityPage'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { EmptyState } from '@/components/ui/empty-state'
import { Input } from '@/components/ui/input'
import { DataPagination } from '@/components/ui/pagination'
import { SearchClearButton } from '@/components/ui/search-clear-button'
import { Skeleton } from '@/components/ui/skeleton'
import { usePersistentState } from '@/hooks/use-persistent-state'
import { useToast } from '@/hooks/use-toast'
import { cn } from '@/lib/utils'
import { severityMetaFor } from '@/lib/warning-helpers'
import { formatRelative } from '@/pages/admin/analytics-constants'
import { acknowledgeWarning, getMyWarnings } from '@/services/warnings'
import { getMyCorrections } from '@/services/corrections'

const PAGE_SIZE = 30

// A warning is treated as a "correction request" when its title or
// message mentions relevant keywords. This matches what the backend
// sends when admin forwards a guest correction to an employee.
function isCorrectionWarning(w) {
  const text = `${w?.title ?? ''} ${w?.message ?? ''}`.toLowerCase()
  return (
    text.includes('correction') ||
    text.includes('suggested value') ||
    text.includes('field correction') ||
    text.includes('correction request')
  )
}

// Extract a media code from a warning message if the backend embeds it.
function extractMediaCode(message = '') {
  // Backend typically includes the code in the message, e.g.:
  // "record code: NATURE(OLD_PICTURES)_IMG_RAW_V1_Copy(1)_000001"
  const match =
    message.match(/([A-Z0-9()_-]+_(?:AUD|VID|IMG|TXT)_[A-Z0-9()_-]+)/i) ??
    message.match(/\b([A-Z0-9_]{10,}(?:AUD|VID|IMG|TXT)[A-Z0-9_]*)\b/i)
  return match?.[1] ?? null
}

function formatDate(str) {
  if (!str) return '—'
  try {
    return new Date(str).toLocaleDateString('en-GB', {
      day: '2-digit', month: 'short', year: 'numeric',
      hour: '2-digit', minute: '2-digit',
    })
  } catch { return str }
}

// ── Sub-components ────────────────────────────────────────────────────────────
function SummaryCard({ label, value, accent, icon: Icon, isLoading }) {
  return (
    <Card className="border-border shadow-sm shadow-black/5">
      <CardContent className="flex items-center gap-4 px-5 py-4">
        <div className={cn('flex size-10 shrink-0 items-center justify-center rounded-xl bg-muted/60', accent)}>
          <Icon className="size-5" />
        </div>
        <div>
          {isLoading
            ? <div className="mb-1 h-6 w-10 animate-pulse rounded bg-muted" />
            : <p className={cn('text-2xl font-bold tabular-nums', accent)}>{value ?? '—'}</p>}
          <p className="text-xs text-muted-foreground">{label}</p>
        </div>
      </CardContent>
    </Card>
  )
}

function FilterChip({ label, isActive, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium transition-colors',
        isActive
          ? 'border-primary/40 bg-primary/10 text-primary'
          : 'border-border bg-background text-foreground/70 hover:bg-muted/60',
      )}
    >
      {label}
    </button>
  )
}

// A single warning card — richer than the bell's compact row.
function WarningCard({ warning, onAcknowledge, isAcknowledging }) {
  const meta    = severityMetaFor(warning.severity)
  const Icon    = meta.icon
  const ack     = Boolean(warning.acknowledged || warning.acknowledgedAt)
  const isCorr  = isCorrectionWarning(warning)
  const code    = extractMediaCode(warning.message ?? '')

  return (
    <Card className={cn(
      'border transition-colors shadow-sm shadow-black/5',
      !ack && isCorr
        ? 'border-primary/30 bg-primary/5 dark:bg-primary/8'
        : !ack
        ? 'border-amber-200/60 dark:border-amber-900/30'
        : 'border-border opacity-75',
    )}>
      <CardContent className="px-5 py-4">
        <div className="flex items-start gap-4">
          {/* Severity icon */}
          <span className={cn(
            'mt-0.5 grid size-9 shrink-0 place-items-center rounded-xl bg-muted/60 ring-1',
            meta.accent, meta.ring,
          )}>
            <Icon className="size-4" />
          </span>

          <div className="min-w-0 flex-1 space-y-2">
            {/* Title + date */}
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="text-sm font-bold text-foreground">
                    {warning.title || meta.label}
                  </p>
                  {isCorr && !ack && (
                    <span className="inline-flex items-center gap-1 rounded-full bg-primary/15 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-primary">
                      <MessageSquarePlus className="size-2.5" />
                      Correction
                    </span>
                  )}
                  <span className={cn(
                    'inline-flex items-center rounded-full border px-1.5 py-px text-[10px] font-semibold uppercase tracking-wider',
                    meta.accent, meta.ring,
                  )}>
                    {meta.label}
                  </span>
                </div>
                <p className="mt-0.5 text-[11px] text-muted-foreground">
                  {formatDate(warning.createdAt)} · {formatRelative(warning.createdAt)}
                </p>
              </div>
            </div>

            {/* Full message */}
            {warning.message ? (
              <div className={cn(
                'rounded-xl border px-4 py-3 text-sm leading-6 text-foreground',
                isCorr
                  ? 'border-border/60 bg-background'
                  : 'border-border/40 bg-muted/30',
              )}>
                <p className="whitespace-pre-line break-words" style={{ overflowWrap: 'anywhere' }}>
                  {warning.message}
                </p>
              </div>
            ) : null}

            {/* Actions */}
            <div className="flex flex-wrap items-center gap-2 pt-1">
              {isCorr ? (
                <Link
                  to="/employee/project"
                  className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-background px-3 py-1.5 text-xs font-semibold text-foreground transition hover:bg-muted"
                >
                  <FolderOpen className="size-3.5" />
                  Open my projects
                </Link>
              ) : null}

              {code ? (
                <span className="rounded-md bg-muted px-2 py-1 font-mono text-[11px] text-muted-foreground">
                  {code}
                </span>
              ) : null}

              <div className="ml-auto">
                {ack ? (
                  <span className="inline-flex items-center gap-1 text-[11px] text-emerald-600 dark:text-emerald-400">
                    <CheckCircle2 className="size-3.5" /> Acknowledged
                  </span>
                ) : (
                  <button
                    type="button"
                    onClick={() => onAcknowledge(warning)}
                    disabled={isAcknowledging}
                    className="inline-flex h-7 items-center gap-1.5 rounded-lg border border-border bg-background px-3 text-xs font-semibold text-foreground transition hover:bg-muted disabled:opacity-60"
                  >
                    {isAcknowledging
                      ? <Loader2 className="size-3 animate-spin" />
                      : <Check className="size-3" />}
                    {isAcknowledging ? 'Saving…' : 'Mark as read'}
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

// ── Main page ─────────────────────────────────────────────────────────────────
function EmployeeCorrectionsPage() {
  const toast = useToast()

  const [filter, setFilter] = usePersistentState('employee.corrections.filter', 'all') // 'all' | 'corrections' | 'other' | 'unread'
  const [search, setSearch] = usePersistentState('employee.corrections.search', '')
  const [page, setPage] = usePersistentState('employee.corrections.page', 0)

  const [warnings,  setWarnings]  = useState(null)
  const [meta,      setMeta]      = useState(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error,     setError]     = useState('')
  const [ackId,     setAckId]     = useState(null)

  // My own submitted corrections (as a guest/user)
  const [myCorr,       setMyCorr]       = useState(null)
  const [myCorrLoading, setMyCorrLoading] = useState(false)

  const loadWarnings = useCallback(async (nextPage = 0) => {
    setIsLoading(true)
    setError('')
    try {
      const data = await getMyWarnings({ page: nextPage, size: PAGE_SIZE })
      const items = Array.isArray(data?.items)   ? data.items
                  : Array.isArray(data?.content) ? data.content
                  : Array.isArray(data)           ? data
                  : []
      setWarnings(items)
      setMeta({
        page:          data?.page          ?? nextPage,
        totalPages:    data?.totalPages    ?? Math.ceil(items.length / PAGE_SIZE),
        totalElements: data?.totalElements ?? items.length,
      })
      setPage(data?.page ?? nextPage)
    } catch (err) {
      setError(err?.response?.data?.message || err?.message || 'Could not load notifications.')
    } finally {
      setIsLoading(false)
    }
  }, [setPage])

  const loadMyCorrections = useCallback(async () => {
    setMyCorrLoading(true)
    try {
      const data = await getMyCorrections({ page: 0, size: 50 })
      const items = Array.isArray(data?.items)   ? data.items
                  : Array.isArray(data?.content) ? data.content
                  : Array.isArray(data)           ? data
                  : []
      setMyCorr(items)
    } catch {
      setMyCorr([])
    } finally {
      setMyCorrLoading(false)
    }
  }, [])

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadWarnings(0)
    loadMyCorrections()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const handleAcknowledge = async (warning) => {
    if (!warning?.id) return
    setAckId(warning.id)
    try {
      const updated = await acknowledgeWarning(warning.id)
      setWarnings((prev) =>
        Array.isArray(prev)
          ? prev.map((w) =>
              w.id === warning.id
                ? { ...w, ...(updated || {}), acknowledged: true, acknowledgedAt: updated?.acknowledgedAt || new Date().toISOString() }
                : w,
            )
          : prev,
      )
      toast.success('Acknowledged', 'Marked as read.')
    } catch (err) {
      toast.apiError(err, 'Could not acknowledge')
    } finally {
      setAckId(null)
    }
  }

  // Client-side filter + search
  const displayed = useMemo(() => {
    if (!Array.isArray(warnings)) return []
    let list = warnings
    if (filter === 'corrections') list = list.filter(isCorrectionWarning)
    else if (filter === 'other')  list = list.filter((w) => !isCorrectionWarning(w))
    else if (filter === 'unread') list = list.filter((w) => !w.acknowledged && !w.acknowledgedAt)
    if (search.trim()) {
      const q = search.toLowerCase()
      list = list.filter(
        (w) =>
          (w.title ?? '').toLowerCase().includes(q) ||
          (w.message ?? '').toLowerCase().includes(q),
      )
    }
    return list
  }, [warnings, filter, search])

  const stats = useMemo(() => {
    if (!Array.isArray(warnings)) return null
    const corrections = warnings.filter(isCorrectionWarning)
    const unread      = warnings.filter((w) => !w.acknowledged && !w.acknowledgedAt)
    return {
      total:       warnings.length,
      unread:      unread.length,
      corrections: corrections.length,
      done:        warnings.length - unread.length,
    }
  }, [warnings])

  const STATUS_META = {
    PENDING:   { label: 'Pending',   color: 'bg-amber-500/15 text-amber-700 dark:text-amber-400',  dot: 'bg-amber-500'  },
    FORWARDED: { label: 'Forwarded', color: 'bg-blue-500/15 text-blue-700 dark:text-blue-400',      dot: 'bg-blue-500'   },
    RESOLVED:  { label: 'Resolved',  color: 'bg-green-500/15 text-green-700 dark:text-green-400',   dot: 'bg-green-500'  },
    REJECTED:  { label: 'Rejected',  color: 'bg-rose-500/15 text-rose-700 dark:text-rose-400',      dot: 'bg-rose-500'   },
  }
  const MEDIA_COLORS = {
    AUDIO: 'bg-violet-500/15 text-violet-700',
    VIDEO: 'bg-rose-500/15 text-rose-700',
    IMAGE: 'bg-teal-500/15 text-teal-700',
    TEXT:  'bg-orange-500/15 text-orange-700',
  }

  return (
    <EmployeeEntityPage
      title="Corrections Inbox"
      description="Review correction requests forwarded to you by admin, and track the suggestions you submitted from the public catalogue."
      action={
        <Button
          type="button"
          variant="outline"
          className="gap-2"
          onClick={() => { loadWarnings(0); loadMyCorrections() }}
          disabled={isLoading}
        >
          <RefreshCw className={cn('size-4', isLoading && 'animate-spin')} />
          Refresh
        </Button>
      }
    >
      {/* ── Summary cards ─────────────────────────────────────────────── */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <SummaryCard label="Total notifications" value={stats?.total}       accent="text-foreground"                              icon={Bell}             isLoading={isLoading && !warnings} />
        <SummaryCard label="Needs your attention" value={stats?.unread}     accent="text-amber-600 dark:text-amber-400"           icon={Clock}            isLoading={isLoading && !warnings} />
        <SummaryCard label="Correction requests"  value={stats?.corrections} accent="text-primary"                                icon={MessageSquarePlus} isLoading={isLoading && !warnings} />
        <SummaryCard label="Acknowledged"          value={stats?.done}       accent="text-green-600 dark:text-green-400"           icon={CheckCircle2}     isLoading={isLoading && !warnings} />
      </div>

      {/* ── Filter bar ────────────────────────────────────────────────── */}
      <Card className="border-border shadow-sm shadow-black/5">
        <CardContent className="flex flex-col gap-3 px-4 py-3 sm:flex-row sm:flex-wrap sm:items-center">
          <div className="relative w-full sm:max-w-xs">
            <Search className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search notifications…"
              className="pl-8 pr-8"
            />
            {search ? <SearchClearButton onClick={() => setSearch('')} /> : null}
          </div>
          <div className="flex flex-wrap gap-1.5">
            <FilterChip label="All"              isActive={filter === 'all'}         onClick={() => setFilter('all')}         />
            <FilterChip label="Corrections"      isActive={filter === 'corrections'} onClick={() => setFilter('corrections')} />
            <FilterChip label="Needs attention"  isActive={filter === 'unread'}      onClick={() => setFilter('unread')}      />
            <FilterChip label="Other"            isActive={filter === 'other'}       onClick={() => setFilter('other')}       />
          </div>
        </CardContent>
      </Card>

      {/* ── Error ─────────────────────────────────────────────────────── */}
      {error ? (
        <Card className="border-destructive/40 bg-destructive/5">
          <CardContent className="flex items-center gap-3 px-4 py-3">
            <AlertTriangle className="size-4 shrink-0 text-destructive" />
            <p className="flex-1 text-sm text-destructive">{error}</p>
            <Button type="button" variant="outline" size="sm" onClick={() => loadWarnings(page)}>Retry</Button>
          </CardContent>
        </Card>
      ) : null}

      {/* ── Forwarded corrections (warnings) ──────────────────────────── */}
      <div>
        <p className="mb-3 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
          Notifications from admin
        </p>

        {isLoading && !warnings ? (
          <div className="space-y-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <Card key={i} className="border-border">
                <CardContent className="px-5 py-4">
                  <div className="flex gap-4">
                    <div className="size-9 animate-pulse rounded-xl bg-muted" />
                    <div className="flex-1 space-y-2">
                      <div className="h-4 w-1/3 animate-pulse rounded bg-muted" />
                      <div className="h-14 w-full animate-pulse rounded-xl bg-muted" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : displayed.length === 0 ? (
          <Card className="border-border">
            <CardContent className="py-12">
              <EmptyState
                icon={Bell}
                title="No notifications"
                description="You haven't received any correction requests or admin notes yet."
              />
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {displayed.map((w) => (
              <WarningCard
                key={w.id}
                warning={w}
                onAcknowledge={handleAcknowledge}
                isAcknowledging={ackId === w.id}
              />
            ))}
          </div>
        )}

        {meta && meta.totalPages > 1 ? (
          <div className="mt-4">
            <DataPagination
              page={meta.page}
              totalPages={meta.totalPages}
              onPageChange={(p) => { setPage(p); loadWarnings(p) }}
            />
          </div>
        ) : null}
      </div>

      {/* ── My own submitted corrections ──────────────────────────────── */}
      <div>
        <p className="mb-3 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
          My submitted suggestions (public catalogue)
        </p>

        {myCorrLoading ? (
          <div className="space-y-2">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="h-16 animate-pulse rounded-xl bg-muted" />
            ))}
          </div>
        ) : !myCorr || myCorr.length === 0 ? (
          <Card className="border-border">
            <CardContent className="py-8">
              <EmptyState
                icon={MessageSquarePlus}
                title="No suggestions yet"
                description="You haven't submitted any correction suggestions from the public archive pages."
              />
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-2">
            {myCorr.map((c) => {
              const smeta   = STATUS_META[String(c.status).toUpperCase()] ?? { label: c.status, color: 'bg-muted text-muted-foreground', dot: 'bg-muted-foreground' }
              const mmeta   = MEDIA_COLORS[String(c.mediaType).toUpperCase()] ?? 'bg-muted text-muted-foreground'
              return (
                <Card key={c.id} className="border-border shadow-sm shadow-black/5">
                  <CardContent className="px-5 py-4">
                    <div className="flex flex-wrap items-start gap-3">
                      <div className="flex flex-1 flex-col gap-1.5 min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className={cn('rounded-md px-2 py-0.5 text-[10px] font-bold uppercase tracking-widest', mmeta)}>
                            {c.mediaType}
                          </span>
                          <span className="text-xs font-semibold text-foreground">{c.targetField}</span>
                          <span className={cn('inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[10px] font-bold', smeta.color)}>
                            <span className={cn('size-1.5 rounded-full', smeta.dot)} />
                            {smeta.label}
                          </span>
                        </div>
                        <p className="break-words text-sm text-muted-foreground line-clamp-2" style={{ overflowWrap: 'anywhere' }}>
                          {c.suggestedValue}
                        </p>
                        {c.mediaCode ? (
                          <span className="font-mono text-[11px] text-muted-foreground/70">{c.mediaCode}</span>
                        ) : null}
                      </div>
                      <p className="shrink-0 text-[11px] text-muted-foreground tabular-nums">
                        {formatDate(c.createdAt || c.submittedAt)}
                      </p>
                    </div>
                  </CardContent>
                </Card>
              )
            })}
          </div>
        )}
      </div>
    </EmployeeEntityPage>
  )
}

export { EmployeeCorrectionsPage }
