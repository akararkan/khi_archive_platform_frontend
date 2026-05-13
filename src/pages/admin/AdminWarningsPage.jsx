import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  AlertTriangle,
  CheckCircle2,
  Loader2,
  Pencil,
  Plus,
  RefreshCw,
  Search,
  Trash2,
  UserCircle2,
  XCircle,
} from 'lucide-react'

import { AdminEntityPage } from '@/components/admin/AdminEntityPage'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { ConfirmDialog } from '@/components/ui/confirm-dialog'
import { EmptyState } from '@/components/ui/empty-state'
import { Highlight } from '@/components/ui/highlight'
import { Input } from '@/components/ui/input'
import { DataPagination } from '@/components/ui/pagination'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { WarningDialog } from '@/components/warning/WarningDialog'
import { useToast } from '@/hooks/use-toast'
import { useCurrentProfile } from '@/hooks/use-current-profile'
import { cn } from '@/lib/utils'
import { SEVERITY_META, SEVERITY_ORDER, severityMetaFor } from '@/lib/warning-helpers'
import { formatRelative } from '@/pages/admin/analytics-constants'
import { listAdminUsers } from '@/services/admin-user'
import {
  adminIssueWarning,
  adminRevokeWarning,
  adminSearchWarnings,
  adminUpdateWarning,
} from '@/services/warnings'

const PAGE_SIZE = 25

function AdminWarningsPage() {
  const toast = useToast()
  const profile = useCurrentProfile()

  // Filter state — drives the server query. Severity is one of the
  // SEVERITY_ORDER keys (or '' for all); acknowledged is '', 'true' or
  // 'false'; includeRevoked toggles whether soft-deleted rows show up.
  const [search, setSearch] = useState('')
  const [severity, setSeverity] = useState('')
  const [acknowledged, setAcknowledged] = useState('') // '' | 'true' | 'false'
  const [includeRevoked, setIncludeRevoked] = useState(false)
  const [targetUserId, setTargetUserId] = useState('') // optional filter

  const [page, setPage] = useState(0)
  const [warnings, setWarnings] = useState(null)
  const [meta, setMeta] = useState(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')

  // User picker is shared between the filter (targetUserId) and the
  // dialog (target picker). One fetch on mount, cached for the life
  // of the page since the user list changes slowly.
  const [users, setUsers] = useState([])

  // Dialog state — `mode` distinguishes issue vs. edit. `pendingRevoke`
  // is the warning the admin is about to soft-delete via ConfirmDialog.
  const [dialogOpen, setDialogOpen] = useState(false)
  const [dialogMode, setDialogMode] = useState('issue')
  const [dialogWarning, setDialogWarning] = useState(null)
  const [isSaving, setIsSaving] = useState(false)
  const [pendingRevoke, setPendingRevoke] = useState(null)
  const [isRevoking, setIsRevoking] = useState(false)

  const buildFilter = useCallback(() => {
    const filter = {}
    if (search.trim()) filter.q = search.trim()
    if (severity) filter.severity = severity
    if (acknowledged) filter.acknowledged = acknowledged === 'true'
    if (includeRevoked) filter.includeRevoked = true
    if (targetUserId) filter.targetUserId = Number(targetUserId)
    return filter
  }, [search, severity, acknowledged, includeRevoked, targetUserId])

  const loadWarnings = useCallback(
    async (nextPage = 0) => {
      setIsLoading(true)
      setError('')
      try {
        const data = await adminSearchWarnings({
          ...buildFilter(),
          page: nextPage,
          size: PAGE_SIZE,
          sort: 'createdAt,desc',
        })
        const items = Array.isArray(data?.items)
          ? data.items
          : Array.isArray(data?.content)
          ? data.content
          : Array.isArray(data)
          ? data
          : []
        setWarnings(items)
        setMeta({
          page: data?.page ?? nextPage,
          totalPages: data?.totalPages ?? Math.ceil(items.length / PAGE_SIZE),
          totalElements: data?.totalElements ?? items.length,
          hasNext: data?.hasNext ?? null,
        })
        setPage(data?.page ?? nextPage)
      } catch (err) {
        setError(err?.response?.data?.message || err?.message || 'Could not load warnings.')
      } finally {
        setIsLoading(false)
      }
    },
    [buildFilter],
  )

  // Initial data: warnings list + user catalog. Users list powers
  // both the filter pickup and the dialog's target search.
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadWarnings(0)
    listAdminUsers()
      .then(setUsers)
      .catch(() => setUsers([]))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Re-pull when filters change. Resets to page 0 so the admin can't
  // get stranded on a page that no longer exists.
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadWarnings(0)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [severity, acknowledged, includeRevoked, targetUserId])

  // Debounce the free-text search so we don't fire on every keystroke.
  useEffect(() => {
    const handle = setTimeout(() => loadWarnings(0), 350)
    return () => clearTimeout(handle)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search])

  const handlePageChange = (next) => {
    setPage(next)
    loadWarnings(next)
  }

  const handleOpenIssue = () => {
    setDialogMode('issue')
    setDialogWarning(null)
    setDialogOpen(true)
  }

  const handleOpenEdit = (warning) => {
    setDialogMode('edit')
    setDialogWarning(warning)
    setDialogOpen(true)
  }

  const handleSubmit = async (payload) => {
    setIsSaving(true)
    try {
      if (dialogMode === 'edit' && dialogWarning?.id) {
        await adminUpdateWarning(dialogWarning.id, payload)
        toast.success('Warning updated', 'The user will see your edits in their bell.')
      } else {
        await adminIssueWarning(payload)
        toast.success('Warning sent', 'The user has been notified.')
      }
      setDialogOpen(false)
      loadWarnings(page)
    } catch (err) {
      toast.apiError(err, 'Could not save the warning')
    } finally {
      setIsSaving(false)
    }
  }

  const handleRevoke = async () => {
    if (!pendingRevoke?.id) return
    setIsRevoking(true)
    try {
      await adminRevokeWarning(pendingRevoke.id)
      toast.success('Warning revoked', 'The recipient no longer sees this warning.')
      setPendingRevoke(null)
      loadWarnings(page)
    } catch (err) {
      toast.apiError(err, 'Could not revoke the warning')
    } finally {
      setIsRevoking(false)
    }
  }

  // Lightweight client-side stats. The list is small (~25 rows), so
  // walking it for severity counts is cheaper than firing a second
  // request just for these summary chips.
  const stats = useMemo(() => {
    if (!Array.isArray(warnings)) return null
    return {
      total: warnings.length,
      info: warnings.filter((w) => String(w.severity).toUpperCase() === 'INFO').length,
      warning: warnings.filter((w) => String(w.severity).toUpperCase() === 'WARNING').length,
      critical: warnings.filter((w) => String(w.severity).toUpperCase() === 'CRITICAL').length,
      unacknowledged: warnings.filter((w) => !w.acknowledged).length,
    }
  }, [warnings])

  return (
    <AdminEntityPage
      title="Warnings"
      description="Send formal notes to users who need to improve their work. Recipients see warnings in their bell and must acknowledge each one."
      action={
        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="outline"
            className="gap-2"
            onClick={() => loadWarnings(page)}
            disabled={isLoading}
          >
            <RefreshCw className={cn('size-4', isLoading && 'animate-spin')} />
            Refresh
          </Button>
          <Button type="button" className="gap-2" onClick={handleOpenIssue}>
            <Plus className="size-4" />
            Issue warning
          </Button>
        </div>
      }
    >
      {/* Severity filter chips + stat row. Reads at a glance: how many
          critical issues are currently open? */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <SummaryCard
          label="Total in view"
          value={stats?.total ?? '—'}
          accent="text-primary"
          icon={AlertTriangle}
          isLoading={isLoading && !warnings}
        />
        <SummaryCard
          label="Unacknowledged"
          value={stats?.unacknowledged ?? '—'}
          accent="text-amber-600 dark:text-amber-400"
          icon={XCircle}
          isLoading={isLoading && !warnings}
        />
        <SummaryCard
          label="Critical"
          value={stats?.critical ?? '—'}
          accent="text-rose-600 dark:text-rose-400"
          icon={AlertTriangle}
          isLoading={isLoading && !warnings}
        />
        <SummaryCard
          label="Acknowledged"
          value={stats ? stats.total - stats.unacknowledged : '—'}
          accent="text-emerald-600 dark:text-emerald-400"
          icon={CheckCircle2}
          isLoading={isLoading && !warnings}
        />
      </div>

      {/* Filter row: free-text search, severity chips, acknowledged
          toggle, includeRevoked toggle, optional target user filter. */}
      <Card className="border-border bg-card shadow-sm shadow-black/5">
        <CardContent className="flex flex-col gap-3 px-4 py-3 lg:flex-row lg:flex-wrap lg:items-center">
          <div className="relative w-full sm:max-w-xs">
            <Search className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search title or message…"
              className="pl-8"
            />
          </div>

          <div className="flex flex-wrap items-center gap-1.5">
            <FilterChip
              label="All severities"
              isActive={severity === ''}
              onClick={() => setSeverity('')}
            />
            {SEVERITY_ORDER.map((sev) => {
              const meta = SEVERITY_META[sev]
              return (
                <FilterChip
                  key={sev}
                  label={meta.label}
                  icon={meta.icon}
                  accent={meta.accent}
                  isActive={severity === sev}
                  onClick={() => setSeverity(sev)}
                />
              )
            })}
          </div>

          <div className="flex flex-wrap items-center gap-1.5">
            <FilterChip
              label="Any state"
              isActive={acknowledged === ''}
              onClick={() => setAcknowledged('')}
            />
            <FilterChip
              label="Unacknowledged"
              icon={XCircle}
              accent="text-amber-600 dark:text-amber-400"
              isActive={acknowledged === 'false'}
              onClick={() => setAcknowledged('false')}
            />
            <FilterChip
              label="Acknowledged"
              icon={CheckCircle2}
              accent="text-emerald-600 dark:text-emerald-400"
              isActive={acknowledged === 'true'}
              onClick={() => setAcknowledged('true')}
            />
          </div>

          <label className="inline-flex cursor-pointer items-center gap-2 rounded-md border border-border bg-background px-3 py-1.5 text-xs font-medium text-foreground/80">
            <input
              type="checkbox"
              className="size-3.5"
              checked={includeRevoked}
              onChange={(e) => setIncludeRevoked(e.target.checked)}
            />
            Include revoked
          </label>

          <select
            value={targetUserId}
            onChange={(e) => setTargetUserId(e.target.value)}
            className="rounded-md border border-input bg-background px-3 py-1.5 text-xs font-medium text-foreground/80 shadow-sm"
          >
            <option value="">Any recipient</option>
            {users.map((u) => (
              <option key={u.id} value={u.id}>
                {u.name || u.username} (@{u.username})
              </option>
            ))}
          </select>
        </CardContent>
      </Card>

      {error ? (
        <Card className="border-destructive/40 bg-destructive/5 shadow-sm">
          <CardContent className="flex items-start gap-3 px-4 py-3">
            <AlertTriangle className="mt-0.5 size-4 text-destructive" />
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-destructive">Could not load warnings</p>
              <p className="text-xs text-muted-foreground">{error}</p>
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => loadWarnings(page)}
            >
              Retry
            </Button>
          </CardContent>
        </Card>
      ) : null}

      {isLoading && !warnings ? (
        <Card className="border-border bg-card shadow-sm shadow-black/5">
          <div className="divide-y divide-border">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="flex items-center gap-4 px-4 py-3">
                <Skeleton className="h-9 w-9 rounded-full" />
                <Skeleton className="h-5 flex-1" />
                <Skeleton className="h-4 w-24" />
              </div>
            ))}
          </div>
        </Card>
      ) : !warnings || warnings.length === 0 ? (
        <EmptyState
          icon={AlertTriangle}
          title="No warnings match these filters"
          description="Drop a filter or issue a new warning to start a paper trail."
        />
      ) : (
        <div className="overflow-hidden rounded-xl border border-border bg-card shadow-sm shadow-black/5">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/40 hover:bg-muted/40">
                <TableHead className="w-[120px]">Severity</TableHead>
                <TableHead>Recipient</TableHead>
                <TableHead>Title</TableHead>
                <TableHead className="w-[140px]">From</TableHead>
                <TableHead className="w-[140px]">When</TableHead>
                <TableHead className="w-[140px]">Status</TableHead>
                <TableHead className="w-[120px] text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {warnings.map((w) => {
                const meta = severityMetaFor(w.severity)
                const SeverityIcon = meta.icon
                const isRevoked = Boolean(w.removedAt)
                const isAck = Boolean(w.acknowledged)
                const isSelf = profile?.id != null && w.actorUserId === profile.id
                return (
                  <TableRow
                    key={w.id}
                    className={cn('group', isRevoked && 'opacity-60')}
                  >
                    <TableCell>
                      <span
                        className={cn(
                          'inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wider',
                          meta.accent,
                          meta.ring,
                        )}
                      >
                        <SeverityIcon className="size-3" />
                        {meta.label}
                      </span>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
                          <UserCircle2 className="size-4" />
                        </span>
                        <div className="min-w-0">
                          <p className="truncate text-sm font-semibold text-foreground">
                            <Highlight
                              text={w.targetName || w.target?.name || w.targetUsername || w.target?.username || `User #${w.targetUserId}`}
                              query={search}
                            />
                          </p>
                          <p className="truncate text-[11px] text-muted-foreground">
                            @{w.targetUsername || w.target?.username || w.targetUserId}
                          </p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="max-w-[280px]">
                      <p className="truncate text-sm font-medium text-foreground">
                        <Highlight text={w.title || '—'} query={search} />
                      </p>
                      {w.message ? (
                        <p className="truncate text-[11px] text-muted-foreground">
                          <Highlight text={w.message} query={search} />
                        </p>
                      ) : null}
                    </TableCell>
                    <TableCell>
                      <p className="truncate text-xs text-foreground">
                        {w.actorName || w.actor?.name || w.actorUsername || w.actor?.username || `#${w.actorUserId}`}
                      </p>
                      {isSelf ? (
                        <span className="inline-flex items-center rounded-full bg-primary/10 px-1.5 py-0 text-[9px] font-semibold uppercase tracking-wider text-primary">
                          You
                        </span>
                      ) : null}
                    </TableCell>
                    <TableCell className="text-xs tabular-nums text-muted-foreground">
                      {formatRelative(w.createdAt)}
                    </TableCell>
                    <TableCell>
                      {isRevoked ? (
                        <span className="inline-flex items-center gap-1 rounded-full border border-rose-500/30 bg-rose-500/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-rose-600 dark:text-rose-400">
                          <Trash2 className="size-3" />
                          Revoked
                        </span>
                      ) : isAck ? (
                        <span className="inline-flex items-center gap-1 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
                          <CheckCircle2 className="size-3" />
                          Acknowledged
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 rounded-full border border-amber-500/30 bg-amber-500/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-amber-600 dark:text-amber-400">
                          <XCircle className="size-3" />
                          Pending
                        </span>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="inline-flex items-center gap-1">
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => handleOpenEdit(w)}
                          disabled={isRevoked}
                          className="h-7 gap-1 px-2 text-xs"
                        >
                          <Pencil className="size-3" />
                          Edit
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => setPendingRevoke(w)}
                          disabled={isRevoked}
                          className="h-7 gap-1 px-2 text-xs text-rose-600 hover:bg-rose-500/10 hover:text-rose-700 dark:text-rose-400"
                        >
                          <Trash2 className="size-3" />
                          Revoke
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        </div>
      )}

      <DataPagination
        page={page}
        totalPages={meta?.totalPages ?? 0}
        totalElements={meta?.totalElements ?? null}
        pageSize={PAGE_SIZE}
        onPageChange={handlePageChange}
      />

      <WarningDialog
        open={dialogOpen}
        mode={dialogMode}
        warning={dialogWarning}
        users={users}
        isProcessing={isSaving}
        onSubmit={handleSubmit}
        onOpenChange={(next) => !isSaving && setDialogOpen(next)}
      />

      <ConfirmDialog
        open={Boolean(pendingRevoke)}
        title="Revoke this warning?"
        description={
          pendingRevoke
            ? `The recipient (${pendingRevoke.targetName || pendingRevoke.target?.name || pendingRevoke.targetUsername || pendingRevoke.target?.username || `User #${pendingRevoke.targetUserId}`}) will no longer see this warning in their bell. It stays in the audit log forever.`
            : ''
        }
        confirmLabel={isRevoking ? 'Revoking…' : 'Revoke warning'}
        confirmVariant="destructive"
        isProcessing={isRevoking}
        onConfirm={handleRevoke}
        onOpenChange={(next) => !isRevoking && setPendingRevoke(next ? pendingRevoke : null)}
      />
    </AdminEntityPage>
  )
}

function SummaryCard({ label, value, accent, icon, isLoading }) {
  // Take the icon as a raw prop and re-bind to PascalCase inside the
  // body — destructure-renames in the param list trip
  // eslint-plugin-react's usage detection in this repo's config.
  const Icon = icon
  return (
    <Card className="border-border bg-card shadow-sm shadow-black/5">
      <CardContent className="flex items-center gap-3 px-4 py-4">
        <span className={cn('flex size-10 shrink-0 items-center justify-center rounded-xl bg-muted/60', accent)}>
          <Icon className="size-5" />
        </span>
        <div className="min-w-0">
          <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
            {label}
          </p>
          {isLoading ? (
            <Skeleton className="mt-1 h-6 w-12" />
          ) : (
            <p className="font-heading text-xl font-semibold tabular-nums text-foreground">
              {value}
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  )
}

function FilterChip({ label, icon, accent, isActive, onClick }) {
  const Icon = icon
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium transition-colors',
        isActive
          ? 'border-primary/40 bg-primary/10 text-primary'
          : 'border-border bg-background text-muted-foreground hover:border-primary/30 hover:text-foreground',
      )}
    >
      {Icon ? (
        <Icon className={cn('size-3.5', isActive ? 'text-primary' : accent || 'text-muted-foreground')} />
      ) : null}
      {label}
    </button>
  )
}

export { AdminWarningsPage }
