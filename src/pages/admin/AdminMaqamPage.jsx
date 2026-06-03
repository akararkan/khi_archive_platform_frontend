import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  AlertTriangle,
  Music4,
  Pencil,
  Plus,
  RefreshCw,
  RotateCcw,
  Search,
  Trash2,
  Users,
} from 'lucide-react'

import { AdminEntityPage } from '@/components/admin/AdminEntityPage'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { CodeBadge } from '@/components/ui/code-badge'
import { ConfirmDialog } from '@/components/ui/confirm-dialog'
import { EmptyState } from '@/components/ui/empty-state'
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
import { useToast } from '@/hooks/use-toast'
import { cn } from '@/lib/utils'
import { MaqamFormDialog } from '@/components/maqam/MaqamFormDialog'
import { MaqamManageDialog } from '@/components/maqam/MaqamManageDialog'
import { formatClock, formatDateTime, voteProgress } from '@/components/maqam/maqam-helpers'
import { listAdminUsers } from '@/services/admin-user'
import {
  deleteMaqam,
  getMaqamsPage,
  getMaqamTrashPage,
  purgeMaqam,
  restoreMaqam,
  searchMaqams,
} from '@/services/maqam'

const PAGE_SIZE = 25

function VoteBadge({ teacherVotes }) {
  const { cast, total } = voteProgress(teacherVotes)
  if (total === 0) {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-muted px-2 py-0.5 text-[11px] font-medium text-muted-foreground">
        No panel
      </span>
    )
  }
  const complete = cast >= total
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold',
        complete
          ? 'bg-green-500/15 text-green-600 dark:text-green-400'
          : 'bg-amber-500/15 text-amber-600 dark:text-amber-400',
      )}
    >
      <Users className="size-3" />
      {cast}/{total} voted
    </span>
  )
}

function AdminMaqamPage() {
  const toast = useToast()

  const [view, setView] = useState('active') // 'active' | 'trash'

  const [records, setRecords] = useState(null)
  const [meta, setMeta] = useState(null)
  const [page, setPage] = useState(0)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const [trashRecords, setTrashRecords] = useState(null)
  const [trashMeta, setTrashMeta] = useState(null)
  const [trashPage, setTrashPage] = useState(0)
  const [trashLoading, setTrashLoading] = useState(false)

  const [search, setSearch] = useState('')
  const [searchResults, setSearchResults] = useState(null)
  const [searching, setSearching] = useState(false)

  const [teacherOptions, setTeacherOptions] = useState([])

  const [formState, setFormState] = useState({ open: false, mode: 'create', record: null })
  const [manageRecord, setManageRecord] = useState(null)
  const [confirm, setConfirm] = useState(null) // { title, description, confirmLabel, onConfirm }
  const [confirmBusy, setConfirmBusy] = useState(false)

  const loadActive = useCallback(async (nextPage = 0) => {
    setLoading(true)
    setError('')
    try {
      const data = await getMaqamsPage({ page: nextPage, size: PAGE_SIZE, sort: 'createdAt,desc' })
      const rows = Array.isArray(data?.content) ? data.content : Array.isArray(data) ? data : []
      setRecords(rows)
      setMeta({
        page: data?.number ?? nextPage,
        totalPages: data?.totalPages ?? Math.ceil(rows.length / PAGE_SIZE),
        totalElements: data?.totalElements ?? rows.length,
        size: data?.size ?? PAGE_SIZE,
      })
      setPage(data?.number ?? nextPage)
    } catch (err) {
      setError(err?.response?.data?.message || err?.message || 'Could not load maqam records.')
    } finally {
      setLoading(false)
    }
  }, [])

  const loadTrash = useCallback(async (nextPage = 0) => {
    setTrashLoading(true)
    try {
      const data = await getMaqamTrashPage({ page: nextPage, size: PAGE_SIZE })
      const rows = Array.isArray(data?.content) ? data.content : Array.isArray(data) ? data : []
      setTrashRecords(rows)
      setTrashMeta({
        page: data?.number ?? nextPage,
        totalPages: data?.totalPages ?? Math.ceil(rows.length / PAGE_SIZE),
        totalElements: data?.totalElements ?? rows.length,
        size: data?.size ?? PAGE_SIZE,
      })
      setTrashPage(data?.number ?? nextPage)
    } catch (err) {
      toast.apiError(err, 'Could not load trash')
    } finally {
      setTrashLoading(false)
    }
  }, [toast])

  const loadTeachers = useCallback(async () => {
    try {
      const users = await listAdminUsers()
      const teachers = (Array.isArray(users) ? users : [])
        .filter((u) => String(u.role || '').toUpperCase() === 'TEACHER' && u.active !== false)
        .map((u) => ({ id: u.id, username: u.username, name: u.name }))
      setTeacherOptions(teachers)
    } catch {
      setTeacherOptions([])
    }
  }, [])

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadActive(0)
    loadTeachers()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (view === 'trash' && trashRecords == null) loadTrash(0)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [view])

  // Debounced search over active records.
  useEffect(() => {
    const q = search.trim()
    if (!q) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setSearchResults(null)
      setSearching(false)
      return undefined
    }
    const ctrl = new AbortController()
    setSearching(true)
    const timer = setTimeout(async () => {
      try {
        const data = await searchMaqams(q, { limit: 50, signal: ctrl.signal })
        if (!ctrl.signal.aborted) setSearchResults(Array.isArray(data) ? data : [])
      } catch (err) {
        if (err?.code !== 'ERR_CANCELED') setSearchResults([])
      } finally {
        if (!ctrl.signal.aborted) setSearching(false)
      }
    }, 280)
    return () => {
      clearTimeout(timer)
      ctrl.abort()
    }
  }, [search])

  const refreshAfterMutation = useCallback(() => {
    loadActive(page)
    if (view === 'trash' || trashRecords != null) loadTrash(trashPage)
    if (search.trim()) {
      // re-run search by nudging the effect
      setSearch((s) => s)
    }
  }, [loadActive, loadTrash, page, trashPage, view, trashRecords, search])

  const handleTrash = (record) => {
    setConfirm({
      title: 'Move to trash?',
      description: `“${record.songName}” will be soft-trashed. You can restore it later from the Trash tab.`,
      confirmLabel: 'Move to trash',
      onConfirm: async () => {
        setConfirmBusy(true)
        try {
          await deleteMaqam(record.maqamCode)
          toast.success('Moved to trash', `${record.maqamCode} was trashed.`)
          setConfirm(null)
          refreshAfterMutation()
        } catch (err) {
          toast.apiError(err, 'Could not trash record')
        } finally {
          setConfirmBusy(false)
        }
      },
    })
  }

  const handleRestore = (record) => {
    setConfirm({
      title: 'Restore record?',
      description: `“${record.songName}” will be restored to the active list.`,
      confirmLabel: 'Restore',
      confirmVariant: 'default',
      onConfirm: async () => {
        setConfirmBusy(true)
        try {
          await restoreMaqam(record.maqamCode)
          toast.success('Restored', `${record.maqamCode} is active again.`)
          setConfirm(null)
          loadTrash(trashPage)
          loadActive(page)
        } catch (err) {
          toast.apiError(err, 'Could not restore record')
        } finally {
          setConfirmBusy(false)
        }
      },
    })
  }

  const handlePurge = (record) => {
    setConfirm({
      title: 'Delete permanently?',
      description: `“${record.songName}” and its audio file will be permanently deleted. This cannot be undone.`,
      confirmLabel: 'Delete permanently',
      onConfirm: async () => {
        setConfirmBusy(true)
        try {
          await purgeMaqam(record.maqamCode)
          toast.success('Deleted', `${record.maqamCode} was permanently removed.`)
          setConfirm(null)
          loadTrash(trashPage)
        } catch (err) {
          toast.apiError(err, 'Could not delete record')
        } finally {
          setConfirmBusy(false)
        }
      },
    })
  }

  const isSearchMode = Boolean(search.trim())
  const activeRows = isSearchMode ? searchResults : records
  const activeBusy = isSearchMode ? searching : loading

  const totalActive = meta?.totalElements ?? 0
  const totalTrash = trashMeta?.totalElements

  const headerAction = useMemo(
    () => (
      <div className="flex items-center gap-2">
        <Button
          type="button"
          variant="outline"
          className="gap-2"
          onClick={() => (view === 'active' ? loadActive(page) : loadTrash(trashPage))}
          disabled={view === 'active' ? loading : trashLoading}
        >
          <RefreshCw
            className={cn('size-4', (view === 'active' ? loading : trashLoading) && 'animate-spin')}
          />
          Refresh
        </Button>
        <Button
          type="button"
          className="gap-2"
          onClick={() => setFormState({ open: true, mode: 'create', record: null })}
        >
          <Plus className="size-4" />
          New record
        </Button>
      </div>
    ),
    [view, page, trashPage, loading, trashLoading, loadActive, loadTrash],
  )

  return (
    <AdminEntityPage
      title="Maqam"
      description="Prepare song recordings, assign 1–3 teachers to classify the maqam type, and review their votes and listening engagement."
      action={headerAction}
    >
      {/* View tabs */}
      <div className="flex flex-wrap items-center gap-2">
        <TabButton active={view === 'active'} onClick={() => setView('active')} icon={Music4}>
          Active {totalActive ? `(${totalActive})` : ''}
        </TabButton>
        <TabButton active={view === 'trash'} onClick={() => setView('trash')} icon={Trash2}>
          Trash {totalTrash != null ? `(${totalTrash})` : ''}
        </TabButton>
      </div>

      {view === 'active' ? (
        <>
          {/* Search */}
          <Card className="border-border shadow-sm shadow-black/5">
            <CardContent className="px-4 py-3">
              <div className="relative w-full sm:max-w-md">
                <Search className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search by song, singer, or code…"
                  className="pl-8"
                />
              </div>
            </CardContent>
          </Card>

          {error ? (
            <Card className="border-destructive/40 bg-destructive/5">
              <CardContent className="flex items-center gap-3 px-4 py-3">
                <AlertTriangle className="size-4 shrink-0 text-destructive" />
                <p className="flex-1 text-sm text-destructive">{error}</p>
                <Button type="button" variant="outline" size="sm" onClick={() => loadActive(page)}>
                  Retry
                </Button>
              </CardContent>
            </Card>
          ) : null}

          <Card className="border-border shadow-sm shadow-black/5">
            <CardContent className="px-0 py-0">
              {activeBusy && !activeRows ? (
                <TableSkeleton />
              ) : !activeRows || activeRows.length === 0 ? (
                <div className="py-10">
                  <EmptyState
                    icon={Music4}
                    title={isSearchMode ? 'No matches' : 'No maqam records yet'}
                    description={
                      isSearchMode
                        ? 'No records match your search.'
                        : 'Create your first record to start collecting teacher classifications.'
                    }
                  />
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Code</TableHead>
                      <TableHead>Song</TableHead>
                      <TableHead>Panel</TableHead>
                      <TableHead>Duration</TableHead>
                      <TableHead>Created</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {activeRows.map((r) => (
                      <TableRow key={r.maqamCode}>
                        <TableCell>
                          <CodeBadge code={r.maqamCode} size="sm" />
                        </TableCell>
                        <TableCell className="max-w-[260px]">
                          <p className="truncate font-medium text-foreground">{r.songName}</p>
                          <p className="truncate text-xs text-muted-foreground">{r.producer}</p>
                        </TableCell>
                        <TableCell>
                          <VoteBadge teacherVotes={r.teacherVotes} />
                        </TableCell>
                        <TableCell className="tabular-nums text-muted-foreground">
                          {r.audioDurationSeconds ? formatClock(r.audioDurationSeconds) : '—'}
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground">
                          {formatDateTime(r.createdAt)}
                          {r.createdBy ? <span className="block text-[11px]">{r.createdBy}</span> : null}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center justify-end gap-1.5">
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              className="gap-1"
                              onClick={() => setManageRecord(r)}
                            >
                              <Users className="size-3.5" />
                              Teachers
                            </Button>
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon-sm"
                              aria-label="Edit"
                              onClick={() => setFormState({ open: true, mode: 'edit', record: r })}
                            >
                              <Pencil className="size-3.5" />
                            </Button>
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon-sm"
                              aria-label="Move to trash"
                              className="text-muted-foreground hover:text-destructive"
                              onClick={() => handleTrash(r)}
                            >
                              <Trash2 className="size-3.5" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>

          {!isSearchMode && meta ? (
            <DataPagination
              page={meta.page}
              totalPages={meta.totalPages}
              totalElements={meta.totalElements}
              pageSize={meta.size}
              onPageChange={(p) => loadActive(p)}
            />
          ) : null}
        </>
      ) : (
        <>
          <Card className="border-border shadow-sm shadow-black/5">
            <CardContent className="px-0 py-0">
              {trashLoading && !trashRecords ? (
                <TableSkeleton />
              ) : !trashRecords || trashRecords.length === 0 ? (
                <div className="py-10">
                  <EmptyState icon={Trash2} title="Trash is empty" description="No trashed maqam records." />
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Code</TableHead>
                      <TableHead>Song</TableHead>
                      <TableHead>Trashed</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {trashRecords.map((r) => (
                      <TableRow key={r.maqamCode}>
                        <TableCell>
                          <CodeBadge code={r.maqamCode} size="sm" />
                        </TableCell>
                        <TableCell className="max-w-[260px]">
                          <p className="truncate font-medium text-foreground">{r.songName}</p>
                          <p className="truncate text-xs text-muted-foreground">{r.producer}</p>
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground">
                          {formatDateTime(r.removedAt)}
                          {r.removedBy ? <span className="block text-[11px]">{r.removedBy}</span> : null}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center justify-end gap-1.5">
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              className="gap-1"
                              onClick={() => handleRestore(r)}
                            >
                              <RotateCcw className="size-3.5" />
                              Restore
                            </Button>
                            <Button
                              type="button"
                              variant="destructive"
                              size="sm"
                              className="gap-1"
                              onClick={() => handlePurge(r)}
                            >
                              <Trash2 className="size-3.5" />
                              Delete
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>

          {trashMeta ? (
            <DataPagination
              page={trashMeta.page}
              totalPages={trashMeta.totalPages}
              totalElements={trashMeta.totalElements}
              pageSize={trashMeta.size}
              onPageChange={(p) => loadTrash(p)}
            />
          ) : null}
        </>
      )}

      <MaqamFormDialog
        open={formState.open}
        onOpenChange={(open) => setFormState((s) => ({ ...s, open }))}
        mode={formState.mode}
        record={formState.record}
        allowTeacherAssignment
        teacherOptions={teacherOptions}
        onSaved={() => refreshAfterMutation()}
      />

      <MaqamManageDialog
        open={Boolean(manageRecord)}
        onOpenChange={(open) => !open && setManageRecord(null)}
        record={manageRecord}
        teacherOptions={teacherOptions}
        onChanged={(updated) => {
          if (updated) {
            setManageRecord(updated)
            setRecords((prev) =>
              Array.isArray(prev)
                ? prev.map((r) => (r.maqamCode === updated.maqamCode ? updated : r))
                : prev,
            )
            setSearchResults((prev) =>
              Array.isArray(prev)
                ? prev.map((r) => (r.maqamCode === updated.maqamCode ? updated : r))
                : prev,
            )
          }
        }}
      />

      <ConfirmDialog
        open={Boolean(confirm)}
        title={confirm?.title}
        description={confirm?.description}
        confirmLabel={confirm?.confirmLabel}
        confirmVariant={confirm?.confirmVariant || 'destructive'}
        isProcessing={confirmBusy}
        onConfirm={() => confirm?.onConfirm?.()}
        onOpenChange={(open) => {
          if (!open && !confirmBusy) setConfirm(null)
        }}
      />
    </AdminEntityPage>
  )
}

function TabButton({ active, onClick, icon: Icon, children }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full border px-3.5 py-1.5 text-sm font-medium transition-colors',
        active
          ? 'border-primary/40 bg-primary/10 text-primary'
          : 'border-border bg-background text-foreground/70 hover:bg-muted/60',
      )}
    >
      <Icon className="size-4" />
      {children}
    </button>
  )
}

function TableSkeleton() {
  return (
    <div className="space-y-2 p-4">
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} className="flex items-center gap-4">
          <Skeleton className="h-6 w-24" />
          <Skeleton className="h-6 flex-1" />
          <Skeleton className="h-6 w-20" />
        </div>
      ))}
    </div>
  )
}

export { AdminMaqamPage }
