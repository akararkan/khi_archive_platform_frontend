import { useCallback, useEffect, useMemo, useState } from 'react'
import { AlertTriangle, Eye, Music4, Pencil, Plus, RefreshCw, Search, Users, X } from 'lucide-react'

import { EmployeeEntityPage } from '@/components/employee/EmployeeEntityPage'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { CodeBadge } from '@/components/ui/code-badge'
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
import { MaqamPlayer } from '@/components/maqam/MaqamPlayer'
import { MaqamTeacherPanelDialog } from '@/components/maqam/MaqamTeacherPanelDialog'
import {
  formatClock,
  formatDateTime,
  teacherLabel,
  voteProgress,
} from '@/components/maqam/maqam-helpers'
import { getMaqam, getMaqamsPage, searchMaqams } from '@/services/maqam'

const PAGE_SIZE = 25

function VoteBadge({ teacherVotes }) {
  const { cast, total } = voteProgress(teacherVotes)
  if (total === 0) {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-muted px-2 py-0.5 text-[11px] font-medium text-muted-foreground">
        Awaiting panel
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

function EmployeeMaqamPage() {
  const [records, setRecords] = useState(null)
  const [meta, setMeta] = useState(null)
  const [page, setPage] = useState(0)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const [search, setSearch] = useState('')
  const [searchResults, setSearchResults] = useState(null)
  const [searching, setSearching] = useState(false)

  const [formState, setFormState] = useState({ open: false, mode: 'create', record: null })
  const [previewCode, setPreviewCode] = useState(null)
  const [panelRecord, setPanelRecord] = useState(null)

  // Employees can assign teachers (maqam:teacher_manage) but can't list users
  // (admin-only). Build the selectable pool from teachers already visible on any
  // record's panel — enough to move a teacher onto another record.
  const teacherOptions = useMemo(() => {
    const map = new Map()
    for (const list of [records, searchResults]) {
      for (const rec of Array.isArray(list) ? list : []) {
        for (const v of Array.isArray(rec.teacherVotes) ? rec.teacherVotes : []) {
          if (v.teacherUserId != null && !map.has(v.teacherUserId)) {
            map.set(v.teacherUserId, {
              id: v.teacherUserId,
              username: v.teacherUsername,
              name: v.teacherDisplayName,
            })
          }
        }
      }
    }
    return Array.from(map.values())
  }, [records, searchResults])

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

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadActive(0)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

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

  const isSearchMode = Boolean(search.trim())
  const rows = isSearchMode ? searchResults : records
  const busy = isSearchMode ? searching : loading

  return (
    <EmployeeEntityPage
      eyebrow="Archive"
      title="Maqam"
      description="Prepare song recordings and their archive details, assign the teacher panel, and follow each classification's progress here."
      action={
        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="outline"
            className="gap-2"
            onClick={() => loadActive(page)}
            disabled={loading}
          >
            <RefreshCw className={cn('size-4', loading && 'animate-spin')} />
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
      }
    >
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
          {busy && !rows ? (
            <div className="space-y-2 p-4">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="flex items-center gap-4">
                  <Skeleton className="h-6 w-24" />
                  <Skeleton className="h-6 flex-1" />
                  <Skeleton className="h-6 w-20" />
                </div>
              ))}
            </div>
          ) : !rows || rows.length === 0 ? (
            <div className="py-10">
              <EmptyState
                icon={Music4}
                title={isSearchMode ? 'No matches' : 'No maqam records yet'}
                description={
                  isSearchMode
                    ? 'No records match your search.'
                    : 'Create your first record so admins can assign a teacher panel.'
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
                {rows.map((r) => (
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
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center justify-end gap-1.5">
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          className="gap-1"
                          onClick={() => setPreviewCode(r.maqamCode)}
                        >
                          <Eye className="size-3.5" />
                          View
                        </Button>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          className="gap-1"
                          onClick={() => setPanelRecord(r)}
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

      <MaqamFormDialog
        open={formState.open}
        onOpenChange={(open) => setFormState((s) => ({ ...s, open }))}
        mode={formState.mode}
        record={formState.record}
        allowTeacherAssignment
        teacherOptions={teacherOptions}
        onSaved={() => loadActive(page)}
      />

      <MaqamTeacherPanelDialog
        open={Boolean(panelRecord)}
        onOpenChange={(open) => !open && setPanelRecord(null)}
        record={panelRecord}
        teacherOptions={teacherOptions}
        onSaved={() => {
          setPanelRecord(null)
          loadActive(page)
        }}
      />

      <MaqamPreviewDialog
        code={previewCode}
        onClose={() => setPreviewCode(null)}
      />
    </EmployeeEntityPage>
  )
}

// Read-only preview: audio + vote status. Employees can stream (maqam:read)
// but listen tracking is teacher-only, so the player runs untracked.
function MaqamPreviewDialog({ code, onClose }) {
  const toast = useToast()
  const [record, setRecord] = useState(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!code) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setRecord(null)
      return undefined
    }
    let cancelled = false
    const ctrl = new AbortController()
    setLoading(true)
    getMaqam(code, { signal: ctrl.signal })
      .then((d) => {
        if (!cancelled) setRecord(d)
      })
      .catch((err) => {
        if (err?.code !== 'ERR_CANCELED') toast.apiError(err, 'Could not load record')
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
      ctrl.abort()
    }
  }, [code, toast])

  useEffect(() => {
    if (!code) return undefined
    const onKey = (e) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [code, onClose])

  if (!code) return null

  const votes = Array.isArray(record?.teacherVotes) ? record.teacherVotes : []

  return (
    <div
      className="fixed inset-0 z-[95] flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose()
      }}
      role="dialog"
      aria-modal="true"
    >
      <div
        className="flex w-full max-w-xl flex-col overflow-hidden rounded-2xl bg-card shadow-2xl ring-1 ring-black/10"
        style={{ maxHeight: '90vh' }}
      >
        <div className="flex shrink-0 items-center justify-between gap-4 border-b border-border px-6 py-4">
          <div className="min-w-0">
            <p className="truncate text-sm font-bold text-foreground">
              {record?.songName || 'Loading…'}
            </p>
            <p className="truncate text-[11px] text-muted-foreground">
              {record?.producer} {record?.maqamCode ? `· ${record.maqamCode}` : ''}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="grid size-8 place-items-center rounded-lg text-muted-foreground transition hover:bg-muted hover:text-foreground"
            aria-label="Close"
          >
            <X className="size-4" />
          </button>
        </div>

        <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-6 py-5">
          {loading && !record ? (
            <Skeleton className="h-32 w-full rounded-2xl" />
          ) : (
            <>
              <MaqamPlayer
                maqamCode={code}
                hasAudio={Boolean(record?.audioFileName || record?.audioDurationSeconds)}
                title={record?.songName}
                subtitle={record?.producer}
                track={false}
                labels={{
                  loading: 'Loading audio…',
                  error: 'Could not load the audio.',
                  unavailable: 'No audio attached.',
                }}
              />

              {record?.archiveNote ? (
                <div>
                  <p className="mb-1 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                    Archive note
                  </p>
                  <p
                    className="whitespace-pre-line break-words rounded-xl border border-border bg-muted/20 px-4 py-3 text-sm leading-6 text-foreground"
                    style={{ overflowWrap: 'anywhere' }}
                  >
                    {record.archiveNote}
                  </p>
                </div>
              ) : null}

              <div>
                <p className="mb-2 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                  Teacher classifications
                </p>
                {votes.length === 0 ? (
                  <p className="text-xs text-muted-foreground">No teachers assigned yet.</p>
                ) : (
                  <div className="space-y-2">
                    {votes.map((v) => {
                      const hasVote = Boolean((v.maqamType ?? '').toString().trim() || v.votedAt)
                      return (
                        <div
                          key={v.voteId ?? v.teacherUserId}
                          className="rounded-xl border border-border bg-background px-4 py-3"
                        >
                          <div className="flex items-center justify-between gap-3">
                            <p className="truncate text-sm font-semibold text-foreground">
                              {teacherLabel(v)}
                            </p>
                            {hasVote ? (
                              <span className="rounded-full bg-primary/10 px-2 py-0.5 text-xs font-semibold text-primary">
                                {v.maqamType || '—'}
                              </span>
                            ) : (
                              <span className="text-xs italic text-muted-foreground/70">No vote</span>
                            )}
                          </div>
                          {v.teacherNote ? (
                            <p className="mt-1 text-xs text-muted-foreground">{v.teacherNote}</p>
                          ) : null}
                          <p className="mt-1 text-[11px] text-muted-foreground/80">
                            Listened {formatClock(v.totalListenSeconds)}
                          </p>
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}

export { EmployeeMaqamPage }
