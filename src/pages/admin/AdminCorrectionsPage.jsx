import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  AlertTriangle,
  CheckCircle2,
  CheckCheck,
  Clock,
  ExternalLink,
  FileText,
  Loader2,
  MessageSquarePlus,
  RefreshCw,
  Search,
  Send,
  Sparkles,
  Trash2,
  XCircle,
} from 'lucide-react'

import { AdminEntityPage } from '@/components/admin/AdminEntityPage'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { ConfirmDialog } from '@/components/ui/confirm-dialog'
import { EmptyState } from '@/components/ui/empty-state'
import { Input } from '@/components/ui/input'
import { DataPagination } from '@/components/ui/pagination'
import { Select } from '@/components/ui/select'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { usePersistentState } from '@/hooks/use-persistent-state'
import { useToast } from '@/hooks/use-toast'
import { cn } from '@/lib/utils'
import { listAdminUsers } from '@/services/admin-user'
import {
  adminApplyCorrection,
  adminForwardCorrection,
  adminRejectCorrection,
  adminRemoveCorrection,
  adminResolveCorrection,
  adminSearchCorrections,
} from '@/services/corrections'

const PAGE_SIZE = 25

// ── Status meta ───────────────────────────────────────────────────────────────
const STATUS_META = {
  PENDING:   { label: 'Pending',   color: 'bg-amber-500/15 text-amber-600 dark:text-amber-400',   dot: 'bg-amber-500'  },
  FORWARDED: { label: 'Forwarded', color: 'bg-blue-500/15 text-blue-600 dark:text-blue-400',       dot: 'bg-blue-500'   },
  RESOLVED:  { label: 'Resolved',  color: 'bg-green-500/15 text-green-600 dark:text-green-400',    dot: 'bg-green-500'  },
  REJECTED:  { label: 'Rejected',  color: 'bg-rose-500/15 text-rose-600 dark:text-rose-400',       dot: 'bg-rose-500'   },
}

const STATUS_ORDER = ['PENDING', 'FORWARDED', 'RESOLVED', 'REJECTED']

// ── Media type meta ───────────────────────────────────────────────────────────
const MEDIA_META = {
  AUDIO: { color: 'bg-violet-500/15 text-violet-600 dark:text-violet-400' },
  VIDEO: { color: 'bg-rose-500/15 text-rose-600 dark:text-rose-400'       },
  IMAGE: { color: 'bg-teal-500/15 text-teal-600 dark:text-teal-400'       },
  TEXT:  { color: 'bg-orange-500/15 text-orange-600 dark:text-orange-400' },
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
          {isLoading ? (
            <Skeleton className="mb-1 h-6 w-10" />
          ) : (
            <p className={cn('text-2xl font-bold', accent)}>{value}</p>
          )}
          <p className="text-xs text-muted-foreground">{label}</p>
        </div>
      </CardContent>
    </Card>
  )
}

function StatusBadge({ status }) {
  const meta = STATUS_META[String(status).toUpperCase()] ?? { label: status, color: 'bg-muted text-muted-foreground', dot: 'bg-muted-foreground' }
  return (
    <span className={cn('inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold', meta.color)}>
      <span className={cn('size-1.5 rounded-full', meta.dot)} />
      {meta.label}
    </span>
  )
}

function MediaTypeBadge({ type }) {
  const meta = MEDIA_META[String(type).toUpperCase()] ?? { color: 'bg-muted text-muted-foreground' }
  return (
    <span className={cn('rounded-md px-2 py-0.5 text-[10px] font-bold uppercase tracking-widest', meta.color)}>
      {type}
    </span>
  )
}

function FilterChip({ label, isActive, onClick, icon: Icon, accent }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium transition-colors',
        isActive
          ? 'border-primary/40 bg-primary/10 text-primary'
          : 'border-border bg-background text-foreground/70 hover:border-border/80 hover:bg-muted/60',
      )}
    >
      {Icon && <Icon className={cn('size-3', isActive && accent ? accent : '')} />}
      {label}
    </button>
  )
}

// ── Action dialog (Forward / Resolve / Reject / Apply) ───────────────────────
function ActionDialog({ open, onOpenChange, mode, correction, onConfirm, isProcessing, employees = [] }) {
  const [note,               setNote]               = useState('')
  const [targetEmployeeId,   setTargetEmployeeId]   = useState('')

  useEffect(() => {
    if (open) { setNote(''); setTargetEmployeeId('') }
  }, [open])

  if (!open || !correction) return null

  const config = {
    forward: {
      title: 'Forward to Employee',
      description: `Notify the responsible employee about this correction suggestion. They will receive a warning notification with your note.`,
      confirmLabel: 'Forward',
      confirmClass: 'bg-blue-600 hover:bg-blue-500 text-white',
      icon: Send,
      iconClass: 'bg-blue-500/15 text-blue-600',
      notePlaceholder: 'Optional note for the employee…',
    },
    resolve: {
      title: 'Mark as Resolved',
      description: 'Mark this correction as resolved, indicating the record has been updated.',
      confirmLabel: 'Resolve',
      confirmClass: 'bg-green-600 hover:bg-green-500 text-white',
      icon: CheckCheck,
      iconClass: 'bg-green-500/15 text-green-600',
      notePlaceholder: 'Optional resolution note…',
    },
    reject: {
      title: 'Reject Correction',
      description: "Reject this correction. The guest's suggestion will not be applied.",
      confirmLabel: 'Reject',
      confirmClass: 'bg-rose-600 hover:bg-rose-500 text-white',
      icon: XCircle,
      iconClass: 'bg-rose-500/15 text-rose-600',
      notePlaceholder: 'Optional reason for rejection…',
    },
    apply: {
      title: 'Apply Correction Directly',
      description: `Directly update the "${correction.targetField}" field on the record with the suggested value, then mark this correction as resolved.`,
      confirmLabel: 'Apply & Resolve',
      confirmClass: 'bg-primary hover:bg-primary/90 text-primary-foreground',
      icon: Sparkles,
      iconClass: 'bg-primary/15 text-primary',
      notePlaceholder: 'Optional resolve note…',
    },
  }[mode] ?? {}

  const Icon = config.icon

  return (
    <div
      className="fixed inset-0 z-[95] flex items-center justify-center bg-black/50 px-4 backdrop-blur-sm"
      onMouseDown={(e) => { if (e.target === e.currentTarget && !isProcessing) onOpenChange(false) }}
      role="dialog"
      aria-modal="true"
    >
      <div className="w-full max-w-md overflow-hidden rounded-2xl border border-border bg-card shadow-2xl shadow-black/20">
        {/* header */}
        <div className="flex items-center gap-3 border-b border-border px-6 py-5">
          <span className={cn('grid size-10 shrink-0 place-items-center rounded-xl', config.iconClass)}>
            <Icon className="size-5" />
          </span>
          <div>
            <h3 className="text-[15px] font-bold text-foreground">{config.title}</h3>
            <p className="mt-0.5 text-[11px] text-muted-foreground">{config.description}</p>
          </div>
        </div>

        {/* correction preview */}
        <div className="px-6 py-4 space-y-4">
          <div className="rounded-xl border border-border bg-muted/30 p-4 space-y-2">
            <div className="flex items-center gap-2">
              <MediaTypeBadge type={correction.mediaType} />
              <span className="text-xs font-medium text-muted-foreground">{correction.targetField}</span>
            </div>
            <p className="text-sm leading-6 text-foreground break-words line-clamp-3"
              style={{ overflowWrap: 'anywhere' }}>
              {correction.suggestedValue}
            </p>
            <p className="text-[11px] text-muted-foreground">
              Submitted by{' '}
              <span className="font-semibold text-foreground">
                {correction.submittedByUsername || correction.submittedBy || 'unknown'}
              </span>
            </p>
          </div>

          {/* Employee picker — only for forward */}
          {mode === 'forward' && employees.length > 0 ? (
            <div>
              <label className="mb-1.5 block text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                Notify employee (optional — defaults to record creator)
              </label>
              <Select
                value={targetEmployeeId}
                onChange={setTargetEmployeeId}
                ariaLabel="Notify employee"
                className="w-full"
                options={[
                  { value: '', label: '— Default: employee who created the record —' },
                  ...employees.map((u) => ({
                    value: String(u.id),
                    label: `${u.name || u.username} (@${u.username})`,
                  })),
                ]}
              />
            </div>
          ) : null}

          {/* note */}
          <div>
            <label className="mb-1.5 block text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
              Note (optional)
            </label>
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder={config.notePlaceholder}
              rows={3}
              className="w-full resize-none rounded-xl border border-input bg-background px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground/50 outline-none transition focus:border-primary focus:ring-3 focus:ring-primary/20"
            />
          </div>
        </div>

        {/* footer */}
        <div className="flex justify-end gap-2 border-t border-border bg-muted/20 px-6 py-4">
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isProcessing}
          >
            Cancel
          </Button>
          <button
            type="button"
            onClick={() => onConfirm(note.trim(), targetEmployeeId || null)}
            disabled={isProcessing}
            className={cn(
              'inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold transition disabled:opacity-50',
              config.confirmClass,
            )}
          >
            {isProcessing ? <Loader2 className="size-4 animate-spin" /> : <Icon className="size-4" />}
            {config.confirmLabel}
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Detail dialog ─────────────────────────────────────────────────────────────
function DetailDialog({ open, onOpenChange, correction }) {
  if (!open || !correction) return null

  const publicPath = {
    AUDIO: `/public/audios/${correction.mediaCode}`,
    VIDEO: `/public/videos/${correction.mediaCode}`,
    IMAGE: `/public/images/${correction.mediaCode}`,
    TEXT:  `/public/texts/${correction.mediaCode}`,
  }[correction.mediaType] ?? '#'

  const rows = [
    { label: 'Media type',        value: correction.mediaType },
    { label: 'Media code',        value: correction.mediaCode },
    { label: 'Field',             value: correction.targetField },
    { label: 'Suggested value',   value: correction.suggestedValue, long: true },
    { label: 'Status',            value: correction.status },
    { label: 'Submitted by',      value: correction.submittedByUsername || correction.submittedBy },
    { label: 'Submitted at',      value: formatDate(correction.createdAt || correction.submittedAt) },
    { label: 'Forwarded at',      value: formatDate(correction.forwardedAt) },
    { label: 'Forward note',      value: correction.forwardNote },
    { label: 'Resolved at',       value: formatDate(correction.resolvedAt) },
    { label: 'Resolve note',      value: correction.resolveNote },
    { label: 'Rejected at',       value: formatDate(correction.rejectedAt) },
    { label: 'Reject note',       value: correction.rejectNote },
  ].filter((r) => r.value != null && r.value !== '' && r.value !== '—')

  return (
    <div
      className="fixed inset-0 z-[95] flex items-center justify-center bg-black/50 px-4 backdrop-blur-sm"
      onMouseDown={(e) => { if (e.target === e.currentTarget) onOpenChange(false) }}
      role="dialog"
      aria-modal="true"
    >
      <div className="w-full max-w-lg overflow-hidden rounded-2xl border border-border bg-card shadow-2xl shadow-black/20">
        <div className="flex items-center justify-between gap-3 border-b border-border px-6 py-5">
          <div className="flex items-center gap-3">
            <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary">
              <FileText className="size-4" />
            </span>
            <h3 className="text-[15px] font-bold text-foreground">Correction Detail</h3>
          </div>
          <div className="flex items-center gap-2">
            <a
              href={publicPath}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-xs font-medium text-foreground transition hover:bg-muted"
            >
              <ExternalLink className="size-3.5" />
              View record
            </a>
            <button
              type="button"
              onClick={() => onOpenChange(false)}
              className="grid size-7 place-items-center rounded-lg text-muted-foreground transition hover:bg-muted"
            >
              <XCircle className="size-4" />
            </button>
          </div>
        </div>

        <div className="max-h-[60vh] overflow-y-auto px-6 py-5">
          <dl className="space-y-3">
            {rows.map((r) => (
              <div key={r.label} className="grid grid-cols-[140px_1fr] gap-3 text-sm">
                <dt className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground self-start pt-0.5">
                  {r.label}
                </dt>
                <dd className={cn('text-foreground break-words', r.long ? 'leading-6' : '')}
                  style={{ overflowWrap: 'anywhere' }}>
                  {r.label === 'Status' ? <StatusBadge status={r.value} /> : r.value}
                </dd>
              </div>
            ))}
          </dl>
        </div>

        <div className="border-t border-border bg-muted/20 px-6 py-4 flex justify-end">
          <Button type="button" onClick={() => onOpenChange(false)}>Close</Button>
        </div>
      </div>
    </div>
  )
}

// ── Main page ─────────────────────────────────────────────────────────────────
function AdminCorrectionsPage() {
  const toast = useToast()

  const [search, setSearch] = usePersistentState('admin.corrections.search', '')
  const [status, setStatus] = usePersistentState('admin.corrections.status', '')
  const [mediaType, setMediaType] = usePersistentState('admin.corrections.mediaType', '')
  const [page, setPage] = usePersistentState('admin.corrections.page', 0)

  const [corrections, setCorrections] = useState(null)
  const [meta,        setMeta]        = useState(null)
  const [isLoading,   setIsLoading]   = useState(false)
  const [error,       setError]       = useState('')

  // Action dialogs
  const [actionDialog, setActionDialog]   = useState({ open: false, mode: null, item: null })
  const [isActioning,  setIsActioning]    = useState(false)
  const [removeDialog, setRemoveDialog]   = useState({ open: false, item: null })
  const [isRemoving,   setIsRemoving]     = useState(false)
  const [detailDialog, setDetailDialog]   = useState({ open: false, item: null })

  // Track per-row pending state so the row stays responsive during an API call
  const [employees,  setEmployees]  = useState([])

  const [pendingIds, setPendingIds] = useState(new Set())
  const setPending   = (id, v) => setPendingIds((s) => { const n = new Set(s); v ? n.add(id) : n.delete(id); return n })

  const buildFilter = useCallback(() => {
    const f = {}
    if (search.trim())  f.q         = search.trim()
    if (status)         f.status    = status
    if (mediaType)      f.mediaType = mediaType
    return f
  }, [search, status, mediaType])

  const loadCorrections = useCallback(async (nextPage = 0) => {
    setIsLoading(true)
    setError('')
    try {
      const data = await adminSearchCorrections({
        ...buildFilter(),
        page: nextPage,
        size: PAGE_SIZE,
        sort: 'createdAt,desc',
      })
      const items = Array.isArray(data?.items)    ? data.items
                  : Array.isArray(data?.content)  ? data.content
                  : Array.isArray(data)            ? data
                  : []
      setCorrections(items)
      setMeta({
        page:          data?.page          ?? nextPage,
        totalPages:    data?.totalPages    ?? Math.ceil(items.length / PAGE_SIZE),
        totalElements: data?.totalElements ?? items.length,
        hasNext:       data?.hasNext       ?? null,
      })
      setPage(data?.page ?? nextPage)
    } catch (err) {
      setError(err?.response?.data?.message || err?.message || 'Could not load corrections.')
    } finally {
      setIsLoading(false)
    }
  }, [buildFilter, setPage])

  // Initial load: corrections + employee list for forward dialog
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadCorrections(0)
    listAdminUsers()
      .then((list) => {
        const emps = Array.isArray(list)
          ? list.filter((u) => ['EMPLOYEE', 'ADMIN'].includes(String(u.role).toUpperCase()))
          : []
        setEmployees(emps)
      })
      .catch(() => setEmployees([]))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Re-load when filter chips change
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadCorrections(0)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status, mediaType])

  // Debounced search
  useEffect(() => {
    const h = setTimeout(() => loadCorrections(0), 350)
    return () => clearTimeout(h)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search])

  const handlePageChange = (next) => { setPage(next); loadCorrections(next) }

  // Replace item in list after a mutation
  const replaceItem = (updated) =>
    setCorrections((prev) =>
      Array.isArray(prev) ? prev.map((c) => (c.id === updated.id ? updated : c)) : prev
    )

  // Remove item from list
  const removeItem = (id) =>
    setCorrections((prev) => Array.isArray(prev) ? prev.filter((c) => c.id !== id) : prev)

  const openAction = (item, mode) => setActionDialog({ open: true, mode, item })
  const closeAction = () => setActionDialog({ open: false, mode: null, item: null })

  const handleAction = async (note, targetEmployeeId) => {
    const { mode, item } = actionDialog
    if (!item) return
    setIsActioning(true)
    setPending(item.id, true)
    try {
      let updated
      if (mode === 'forward') {
        const payload = {}
        if (note) payload.note = note
        if (targetEmployeeId) payload.targetEmployeeId = Number(targetEmployeeId)
        updated = await adminForwardCorrection(item.id, payload)
        toast.success('Forwarded', 'The employee has been notified about this correction.')
      } else if (mode === 'resolve') {
        updated = await adminResolveCorrection(item.id, note ? { note } : {})
        toast.success('Resolved', 'The correction has been marked as resolved.')
      } else if (mode === 'reject') {
        updated = await adminRejectCorrection(item.id, note ? { note } : {})
        toast.success('Rejected', 'The correction has been rejected.')
      } else if (mode === 'apply') {
        updated = await adminApplyCorrection(item.id, note ? { resolveNote: note } : {})
        toast.success('Applied', 'The correction was applied directly to the record and marked as resolved.')
      }
      if (updated) replaceItem(updated)
      else loadCorrections(page)
      closeAction()
    } catch (err) {
      toast.apiError(err, `Could not ${mode} the correction`)
    } finally {
      setIsActioning(false)
      setPending(item.id, false)
    }
  }

  const handleRemove = async () => {
    const { item } = removeDialog
    if (!item) return
    setIsRemoving(true)
    setPending(item.id, true)
    try {
      await adminRemoveCorrection(item.id)
      toast.success('Removed', 'The correction has been permanently deleted.')
      removeItem(item.id)
      setRemoveDialog({ open: false, item: null })
    } catch (err) {
      toast.apiError(err, 'Could not remove the correction')
    } finally {
      setIsRemoving(false)
      setPending(item.id, false)
    }
  }

  const stats = useMemo(() => {
    if (!Array.isArray(corrections)) return null
    return {
      total:     corrections.length,
      pending:   corrections.filter((c) => String(c.status).toUpperCase() === 'PENDING').length,
      forwarded: corrections.filter((c) => String(c.status).toUpperCase() === 'FORWARDED').length,
      resolved:  corrections.filter((c) => String(c.status).toUpperCase() === 'RESOLVED').length,
      rejected:  corrections.filter((c) => String(c.status).toUpperCase() === 'REJECTED').length,
    }
  }, [corrections])

  const isPending = (c) => String(c.status).toUpperCase() === 'PENDING'
  const isForwarded = (c) => String(c.status).toUpperCase() === 'FORWARDED'
  const isSettled = (c) => ['RESOLVED', 'REJECTED'].includes(String(c.status).toUpperCase())

  return (
    <AdminEntityPage
      title="Guest Corrections"
      description="Review correction suggestions submitted by registered users. Forward them to the responsible employee, then resolve or reject."
      action={
        <Button
          type="button"
          variant="outline"
          className="gap-2"
          onClick={() => loadCorrections(page)}
          disabled={isLoading}
        >
          <RefreshCw className={cn('size-4', isLoading && 'animate-spin')} />
          Refresh
        </Button>
      }
    >
      {/* ── Summary cards ─────────────────────────────────────────────── */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <SummaryCard
          label="Total in view"
          value={stats?.total ?? '—'}
          accent="text-primary"
          icon={MessageSquarePlus}
          isLoading={isLoading && !corrections}
        />
        <SummaryCard
          label="Pending review"
          value={stats?.pending ?? '—'}
          accent="text-amber-600 dark:text-amber-400"
          icon={Clock}
          isLoading={isLoading && !corrections}
        />
        <SummaryCard
          label="Forwarded"
          value={stats?.forwarded ?? '—'}
          accent="text-blue-600 dark:text-blue-400"
          icon={Send}
          isLoading={isLoading && !corrections}
        />
        <SummaryCard
          label="Resolved"
          value={stats?.resolved ?? '—'}
          accent="text-green-600 dark:text-green-400"
          icon={CheckCircle2}
          isLoading={isLoading && !corrections}
        />
      </div>

      {/* ── Filters ───────────────────────────────────────────────────── */}
      <Card className="border-border shadow-sm shadow-black/5">
        <CardContent className="flex flex-col gap-3 px-4 py-3 lg:flex-row lg:flex-wrap lg:items-center">
          {/* search */}
          <div className="relative w-full sm:max-w-xs">
            <Search className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search field or correction…"
              className="pl-8"
            />
          </div>

          {/* status chips */}
          <div className="flex flex-wrap items-center gap-1.5">
            <FilterChip label="All statuses" isActive={status === ''} onClick={() => setStatus('')} />
            {STATUS_ORDER.map((s) => {
              const m = STATUS_META[s]
              return (
                <FilterChip
                  key={s}
                  label={m.label}
                  isActive={status === s}
                  onClick={() => setStatus(s)}
                />
              )
            })}
          </div>

          {/* media type chips */}
          <div className="flex flex-wrap items-center gap-1.5">
            <FilterChip label="All types" isActive={mediaType === ''} onClick={() => setMediaType('')} />
            {['AUDIO','VIDEO','IMAGE','TEXT'].map((t) => (
              <FilterChip key={t} label={t} isActive={mediaType === t} onClick={() => setMediaType(t)} />
            ))}
          </div>
        </CardContent>
      </Card>

      {/* ── Error ─────────────────────────────────────────────────────── */}
      {error ? (
        <Card className="border-destructive/40 bg-destructive/5 shadow-sm">
          <CardContent className="flex items-start gap-3 px-4 py-3">
            <AlertTriangle className="mt-0.5 size-4 text-destructive" />
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-destructive">Could not load corrections</p>
              <p className="text-xs text-muted-foreground">{error}</p>
            </div>
            <Button type="button" variant="outline" size="sm" onClick={() => loadCorrections(page)}>
              Retry
            </Button>
          </CardContent>
        </Card>
      ) : null}

      {/* ── Table ─────────────────────────────────────────────────────── */}
      <Card className="border-border shadow-sm shadow-black/5">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-24">Type</TableHead>
              <TableHead className="w-36">Field</TableHead>
              <TableHead>Correction</TableHead>
              <TableHead className="w-36">Submitted by</TableHead>
              <TableHead className="w-36">Date</TableHead>
              <TableHead className="w-28">Status</TableHead>
              <TableHead className="w-56 text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>

          <TableBody>
            {isLoading && !corrections ? (
              Array.from({ length: 8 }).map((_, i) => (
                <TableRow key={i}>
                  {Array.from({ length: 7 }).map((__, j) => (
                    <TableCell key={j}><Skeleton className="h-4 w-full" /></TableCell>
                  ))}
                </TableRow>
              ))
            ) : !corrections || corrections.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="py-16">
                  <EmptyState
                    icon={MessageSquarePlus}
                    title="No corrections yet"
                    description="When registered users submit correction suggestions from the public pages, they will appear here."
                  />
                </TableCell>
              </TableRow>
            ) : (
              corrections.map((c) => {
                const rowPending = pendingIds.has(c.id)
                return (
                  <TableRow
                    key={c.id}
                    className={cn(
                      'transition-colors',
                      rowPending && 'opacity-60 pointer-events-none',
                    )}
                  >
                    <TableCell>
                      <MediaTypeBadge type={c.mediaType} />
                    </TableCell>

                    <TableCell>
                      <span className="text-xs font-medium text-foreground/80">
                        {c.targetField}
                      </span>
                    </TableCell>

                    <TableCell>
                      <p
                        className="max-w-[280px] truncate text-sm text-foreground"
                        title={c.suggestedValue}
                      >
                        {c.suggestedValue}
                      </p>
                    </TableCell>

                    <TableCell>
                      <span className="text-sm text-foreground/80">
                        {c.submittedByUsername || c.submittedBy || '—'}
                      </span>
                    </TableCell>

                    <TableCell>
                      <span className="text-xs text-muted-foreground">
                        {formatDate(c.createdAt || c.submittedAt)}
                      </span>
                    </TableCell>

                    <TableCell>
                      <StatusBadge status={c.status} />
                    </TableCell>

                    <TableCell>
                      <div className="flex items-center justify-end gap-1">
                        {/* Detail */}
                        <button
                          type="button"
                          title="View detail"
                          onClick={() => setDetailDialog({ open: true, item: c })}
                          className="inline-flex items-center gap-1.5 rounded-lg border border-border px-2.5 py-1.5 text-xs font-medium text-foreground/80 transition hover:bg-muted"
                        >
                          <FileText className="size-3.5" />
                          Detail
                        </button>

                        {/* Forward — only for PENDING or FORWARDED */}
                        {!isSettled(c) ? (
                          <button
                            type="button"
                            title="Forward to employee"
                            onClick={() => openAction(c, 'forward')}
                            disabled={rowPending}
                            className="inline-flex items-center gap-1.5 rounded-lg bg-blue-500/10 px-2.5 py-1.5 text-xs font-medium text-blue-600 transition hover:bg-blue-500/20 dark:text-blue-400 disabled:opacity-50"
                          >
                            <Send className="size-3.5" />
                            Forward
                          </button>
                        ) : null}

                        {/* Resolve — only for PENDING or FORWARDED */}
                        {!isSettled(c) ? (
                          <button
                            type="button"
                            title="Mark as resolved"
                            onClick={() => openAction(c, 'resolve')}
                            disabled={rowPending}
                            className="inline-flex items-center gap-1.5 rounded-lg bg-green-500/10 px-2.5 py-1.5 text-xs font-medium text-green-600 transition hover:bg-green-500/20 dark:text-green-400 disabled:opacity-50"
                          >
                            <CheckCheck className="size-3.5" />
                            Resolve
                          </button>
                        ) : null}

                        {/* Apply directly — only for PENDING or FORWARDED */}
                        {!isSettled(c) ? (
                          <button
                            type="button"
                            title="Apply correction directly to the record"
                            onClick={() => openAction(c, 'apply')}
                            disabled={rowPending}
                            className="inline-flex items-center gap-1.5 rounded-lg bg-primary/10 px-2.5 py-1.5 text-xs font-medium text-primary transition hover:bg-primary/20 disabled:opacity-50"
                          >
                            <Sparkles className="size-3.5" />
                            Apply
                          </button>
                        ) : null}

                        {/* Reject — only for PENDING */}
                        {isPending(c) ? (
                          <button
                            type="button"
                            title="Reject"
                            onClick={() => openAction(c, 'reject')}
                            disabled={rowPending}
                            className="inline-flex items-center gap-1.5 rounded-lg bg-rose-500/10 px-2.5 py-1.5 text-xs font-medium text-rose-600 transition hover:bg-rose-500/20 dark:text-rose-400 disabled:opacity-50"
                          >
                            <XCircle className="size-3.5" />
                            Reject
                          </button>
                        ) : null}

                        {/* Remove */}
                        <button
                          type="button"
                          title="Delete permanently"
                          onClick={() => setRemoveDialog({ open: true, item: c })}
                          disabled={rowPending}
                          className="grid size-7 place-items-center rounded-lg text-muted-foreground transition hover:bg-destructive/10 hover:text-destructive disabled:opacity-50"
                        >
                          <Trash2 className="size-3.5" />
                        </button>
                      </div>
                    </TableCell>
                  </TableRow>
                )
              })
            )}
          </TableBody>
        </Table>
      </Card>

      {/* Pagination */}
      {meta && meta.totalPages > 1 ? (
        <DataPagination
          page={meta.page}
          totalPages={meta.totalPages}
          onPageChange={handlePageChange}
        />
      ) : null}

      {/* ── Dialogs ───────────────────────────────────────────────────── */}
      <ActionDialog
        open={actionDialog.open}
        onOpenChange={closeAction}
        mode={actionDialog.mode}
        correction={actionDialog.item}
        onConfirm={handleAction}
        isProcessing={isActioning}
        employees={employees}
      />

      <ConfirmDialog
        open={removeDialog.open}
        onOpenChange={(v) => !v && setRemoveDialog({ open: false, item: null })}
        title="Delete this correction?"
        description={`This will permanently delete the "${removeDialog.item?.targetField}" correction. This cannot be undone.`}
        confirmLabel="Delete"
        confirmVariant="destructive"
        isProcessing={isRemoving}
        onConfirm={handleRemove}
      />

      <DetailDialog
        open={detailDialog.open}
        onOpenChange={(v) => !v && setDetailDialog({ open: false, item: null })}
        correction={detailDialog.item}
      />
    </AdminEntityPage>
  )
}

export { AdminCorrectionsPage }
