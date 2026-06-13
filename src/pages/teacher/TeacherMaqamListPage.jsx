import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import {
  AlertTriangle,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Clock3,
  Headphones,
  ListMusic,
  Loader2,
  Music4,
  RefreshCw,
  Search,
  Send,
  Users,
} from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { EmptyState } from '@/components/ui/empty-state'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { DataPagination } from '@/components/ui/pagination'
import { Skeleton } from '@/components/ui/skeleton'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { usePersistentState } from '@/hooks/use-persistent-state'
import { useToast } from '@/hooks/use-toast'
import { useCurrentProfile } from '@/hooks/use-current-profile'
import { MaqamPlayer } from '@/components/maqam/MaqamPlayer'
import { formatClock, teacherLabel, voteProgress } from '@/components/maqam/maqam-helpers'
import { COMMON_MAQAM_TYPES, formatKuDate, ku } from '@/lib/maqam-i18n'
import { cn } from '@/lib/utils'
import { castMaqamVote, getMaqam, getMaqamsPage } from '@/services/maqam'

const PAGE_SIZE = 10

function votesOf(record) {
  return Array.isArray(record?.teacherVotes) ? record.teacherVotes : []
}

function hasVoted(vote) {
  return Boolean(vote && ((vote.maqamType ?? '').toString().trim() || vote.votedAt))
}

function findMyVote(record, myId) {
  return votesOf(record).find((v) => v.teacherUserId === myId) || null
}

function initialsOf(label) {
  const parts = (label || '?').toString().trim().split(/\s+/).filter(Boolean)
  return parts.slice(0, 2).map((p) => p.charAt(0).toUpperCase()).join('') || '؟'
}

function TeacherMaqamListPage() {
  const profile = useCurrentProfile()
  const myId = profile?.id
  const toast = useToast()
  const [searchParams, setSearchParams] = useSearchParams()

  // ── Paginated list state ─────────────────────────────────────────────────
  const [records, setRecords] = useState(null)
  const [meta, setMeta] = useState(null)
  const [page, setPage] = usePersistentState('teacher.maqam.page', 0)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [query, setQuery] = usePersistentState('teacher.maqam.query', '')

  // ── Active record (the one shown in the detail panel) ────────────────────
  const [activeCode, setActiveCode] = useState(null)
  const [activeRecord, setActiveRecord] = useState(null) // full record from getMaqam
  const [detailLoading, setDetailLoading] = useState(false)
  const activeCodeRef = useRef(null)
  // 'first' | 'last' | null — which row to focus once the next page lands.
  const selectAfterLoad = useRef('first')

  // ── Vote form state ──────────────────────────────────────────────────────
  const [maqamType, setMaqamType] = useState('')
  const [teacherNote, setTeacherNote] = useState('')
  const [alreadyVoted, setAlreadyVoted] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  const load = useCallback(async (nextPage = 0) => {
    setLoading(true)
    setError('')
    try {
      // Oldest first, so record #1 is the genuine first record and «داهاتوو»
      // walks forward toward newer ones (newly-added records land at the end).
      const data = await getMaqamsPage({ page: nextPage, size: PAGE_SIZE, sort: 'createdAt,asc' })
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
      setError(err?.response?.data?.message || ku.errorLoad)
    } finally {
      setLoading(false)
    }
  }, [setPage])

  // Open the console focused on a specific record (used when arriving from the
  // "My recent" page via `/teacher?code=…`). Walks pages in the same order the
  // table uses (createdAt,asc) until the record is found, so it lands on the
  // right page with the row highlighted, the counter/next-prev all correct, and
  // the vote form + other teachers populated. Falls back to page 0 if not found.
  const openByCode = useCallback(async (code) => {
    setLoading(true)
    setError('')
    try {
      let p = 0
      let totalPages = 1
      let found = false
      do {
        const data = await getMaqamsPage({ page: p, size: PAGE_SIZE, sort: 'createdAt,asc' })
        const rows = Array.isArray(data?.content) ? data.content : Array.isArray(data) ? data : []
        totalPages = data?.totalPages ?? (Math.ceil(rows.length / PAGE_SIZE) || 1)
        if (rows.some((r) => r.maqamCode === code)) {
          setRecords(rows)
          setMeta({
            page: data?.number ?? p,
            totalPages,
            totalElements: data?.totalElements ?? rows.length,
            size: data?.size ?? PAGE_SIZE,
          })
          setPage(data?.number ?? p)
          selectAfterLoad.current = null
          setActiveCode(code)
          found = true
          break
        }
        p += 1
      } while (p < totalPages)
      if (!found) {
        selectAfterLoad.current = 'first'
        await load(0)
      }
    } catch (err) {
      setError(err?.response?.data?.message || ku.errorLoad)
    } finally {
      setLoading(false)
    }
  }, [load, setPage])

  useEffect(() => {
    const code = searchParams.get('code')
    if (code) {
      // Consume the param so a later refresh starts from the default first page.
      const sp = new URLSearchParams(searchParams)
      sp.delete('code')
      setSearchParams(sp, { replace: true })
      // eslint-disable-next-line react-hooks/set-state-in-effect
      openByCode(code)
    } else {
      load(0)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Client-side filter over the current page.
  const displayed = useMemo(() => {
    if (!Array.isArray(records)) return []
    const q = query.trim().toLowerCase()
    if (!q) return records
    return records.filter(
      (r) =>
        (r.songName ?? '').toLowerCase().includes(q) ||
        (r.producer ?? '').toLowerCase().includes(q) ||
        (r.maqamCode ?? '').toLowerCase().includes(q),
    )
  }, [records, query])

  // Reconcile the active selection whenever the visible rows change (new page,
  // search filter, refresh). Honors a pending first/last request from Next/Prev.
  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    if (!Array.isArray(records)) return
    const list = displayed
    if (list.length === 0) {
      setActiveCode(null)
      return
    }
    const want = selectAfterLoad.current
    if (want === 'first') {
      setActiveCode(list[0].maqamCode)
      selectAfterLoad.current = null
      return
    }
    if (want === 'last') {
      setActiveCode(list[list.length - 1].maqamCode)
      selectAfterLoad.current = null
      return
    }
    setActiveCode((prev) => (prev && list.some((r) => r.maqamCode === prev) ? prev : list[0].maqamCode))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [displayed])
  /* eslint-enable react-hooks/set-state-in-effect */

  useEffect(() => {
    activeCodeRef.current = activeCode
  }, [activeCode])

  // Fetch the full record (archive note + fresh teacher votes) for the active row.
  useEffect(() => {
    if (!activeCode) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setActiveRecord(null)
      return undefined
    }
    let cancelled = false
    setDetailLoading(true)
    getMaqam(activeCode)
      .then((data) => {
        if (!cancelled) setActiveRecord(data)
      })
      .catch(() => {
        /* keep the lighter row data we already have */
      })
      .finally(() => {
        if (!cancelled) setDetailLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [activeCode])

  // Synchronous row data lets the header + player render instantly on Next,
  // while the full record (archive note, notes) streams in behind it.
  const activeRow = useMemo(
    () => (Array.isArray(displayed) ? displayed.find((r) => r.maqamCode === activeCode) : null) || null,
    [displayed, activeCode],
  )
  const record = activeRecord && activeRecord.maqamCode === activeCode ? activeRecord : activeRow

  // Seed the vote form from my existing vote whenever the active record changes.
  useEffect(() => {
    if (myId == null || !record) return
    const mine = findMyVote(record, myId)
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setMaqamType(mine?.maqamType || '')
    setTeacherNote(mine?.teacherNote || '')
    setAlreadyVoted(hasVoted(mine))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeCode, activeRecord, myId])

  // ── Navigation ───────────────────────────────────────────────────────────
  const activeIndex = displayed.findIndex((r) => r.maqamCode === activeCode)
  const hasNextPage = Boolean(meta && page < meta.totalPages - 1)
  const hasPrevPage = page > 0
  const canNext = (activeIndex >= 0 && activeIndex < displayed.length - 1) || hasNextPage
  const canPrev = activeIndex > 0 || hasPrevPage

  const goNext = useCallback(() => {
    if (loading) return
    if (activeIndex >= 0 && activeIndex < displayed.length - 1) {
      setActiveCode(displayed[activeIndex + 1].maqamCode)
    } else if (hasNextPage) {
      selectAfterLoad.current = 'first'
      load(page + 1)
    }
  }, [activeIndex, displayed, hasNextPage, loading, load, page])

  const goPrev = useCallback(() => {
    if (loading) return
    if (activeIndex > 0) {
      setActiveCode(displayed[activeIndex - 1].maqamCode)
    } else if (hasPrevPage) {
      selectAfterLoad.current = 'last'
      load(page - 1)
    }
  }, [activeIndex, displayed, hasPrevPage, loading, load, page])

  // Arrow-key navigation (RTL: ← advances, → goes back). Only fires when nothing
  // is focused, so it never hijacks the audio player's seek or form inputs.
  useEffect(() => {
    const onKey = (e) => {
      if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') return
      const ae = document.activeElement
      if (ae && ae !== document.body) return
      e.preventDefault()
      if (e.key === 'ArrowLeft') goNext()
      else goPrev()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [goNext, goPrev])

  // Position label: absolute when unfiltered, page-relative while searching.
  const counter = useMemo(() => {
    if (!record) return null
    if (query.trim()) return { pos: activeIndex + 1, total: displayed.length }
    const inRecords = Array.isArray(records) ? records.findIndex((r) => r.maqamCode === activeCode) : -1
    const size = meta?.size ?? PAGE_SIZE
    return {
      pos: page * size + (inRecords >= 0 ? inRecords : activeIndex) + 1,
      total: meta?.totalElements ?? displayed.length,
    }
  }, [record, query, activeIndex, displayed.length, records, meta, page, activeCode])

  // ── Voting (the teacher's own row stays editable) ────────────────────────
  const applyUpdatedRecord = useCallback((updated) => {
    setActiveRecord(updated)
    setRecords((prev) =>
      Array.isArray(prev)
        ? prev.map((r) => (r.maqamCode === updated.maqamCode ? { ...r, teacherVotes: updated.teacherVotes ?? r.teacherVotes } : r))
        : prev,
    )
  }, [])

  const refreshActive = useCallback(async () => {
    const code = activeCodeRef.current
    if (!code) return
    try {
      const data = await getMaqam(code)
      applyUpdatedRecord(data)
    } catch {
      /* best-effort live refresh */
    }
  }, [applyUpdatedRecord])

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (submitting || !activeCode) return
    const trimmed = maqamType.trim()
    if (!trimmed) {
      toast.error(ku.voteRequired)
      return
    }
    setSubmitting(true)
    const wasVoted = alreadyVoted
    try {
      const updated = await castMaqamVote(activeCode, {
        maqamType: trimmed,
        teacherNote: teacherNote.trim() || null,
      })
      applyUpdatedRecord(updated)
      setAlreadyVoted(true)
      toast.success(wasVoted ? ku.voteUpdatedTitle : ku.voteSavedTitle, ku.voteSavedDesc)
    } catch (err) {
      toast.apiError(err, ku.genericError)
    } finally {
      setSubmitting(false)
    }
  }

  // ── Derived display data for the active record ───────────────────────────
  const myActiveVote = findMyVote(record, myId)
  const otherVotes = votesOf(record).filter((v) => v.teacherUserId !== myId)
  const hasFullDetail = Boolean(activeRecord && activeRecord.maqamCode === activeCode)
  const progressPct = counter && counter.total > 0 ? Math.round((counter.pos / counter.total) * 100) : 0

  const firstLoad = loading && !records

  return (
    <section className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="min-w-0 space-y-1.5">
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="font-heading text-2xl font-semibold tracking-tight text-foreground sm:text-[1.75rem]">
              {ku.listTitle}
            </h1>
            {meta?.totalElements != null ? (
              <span className="inline-flex items-center rounded-full border bg-muted/40 px-2.5 py-0.5 text-xs font-medium text-muted-foreground">
                {meta.totalElements} {ku.records}
              </span>
            ) : null}
          </div>
          <p className="max-w-2xl text-sm leading-6 text-muted-foreground">{ku.consoleSubtitle}</p>
        </div>
        <Button type="button" variant="outline" className="shrink-0 gap-2" onClick={() => load(page)} disabled={loading}>
          <RefreshCw className={cn('size-4', loading && 'animate-spin')} />
          {ku.refresh}
        </Button>
      </div>

      {error ? (
        <Card className="border-destructive/40 bg-destructive/5">
          <CardContent className="flex items-center gap-3 px-4 py-3">
            <AlertTriangle className="size-4 shrink-0 text-destructive" />
            <p className="flex-1 text-sm text-destructive">{error}</p>
            <Button type="button" variant="outline" size="sm" onClick={() => load(page)}>
              {ku.retry}
            </Button>
          </CardContent>
        </Card>
      ) : null}

      {firstLoad ? (
        <div className="space-y-6">
          <Skeleton className="h-[30rem] w-full rounded-3xl" />
          <Skeleton className="h-72 w-full rounded-3xl" />
        </div>
      ) : !displayed.length && !records?.length ? (
        <Card className="border-border">
          <CardContent className="py-12">
            <EmptyState icon={Music4} title={ku.emptyTitle} description={ku.emptyDescription} />
          </CardContent>
        </Card>
      ) : (
        <>
          {/* ── Detail panel (auto-shows the active record) ──────────────── */}
          {record ? (
            <div className="relative overflow-hidden rounded-3xl border border-border bg-card shadow-lg shadow-black/[0.04]">
              {/* ── Sticky nav bar: identity + پێشوو / داهاتوو ─────────────── */}
              <div className="relative border-b border-border bg-gradient-to-b from-primary/[0.06] to-transparent">
                {detailLoading && !hasFullDetail ? (
                  <div className="absolute inset-x-0 top-0 h-0.5 animate-pulse bg-primary/50" />
                ) : null}
                <div className="flex flex-col gap-4 p-5 sm:p-6 lg:flex-row lg:items-center lg:justify-between">
                  <div className="flex min-w-0 items-start gap-4">
                    <div className="grid size-14 shrink-0 place-items-center rounded-2xl bg-primary text-primary-foreground shadow-sm shadow-primary/30">
                      <Music4 className="size-7" />
                    </div>
                    <div className="min-w-0">
                      <h2 className="truncate font-heading text-xl font-semibold tracking-tight text-foreground sm:text-2xl">
                        {record.songName}
                      </h2>
                      <p className="mt-0.5 truncate text-sm text-muted-foreground">
                        <span className="text-muted-foreground/70">{ku.byProducer}: </span>
                        {record.producer}
                      </p>
                      <div className="mt-2 flex flex-wrap items-center gap-2">
                        {record.audioDurationSeconds ? (
                          <span className="inline-flex items-center gap-1 rounded-md bg-muted/60 px-2 py-0.5 text-[11px] tabular-nums text-muted-foreground">
                            <Clock3 className="size-3" />
                            {formatClock(record.audioDurationSeconds)}
                          </span>
                        ) : null}
                        <StatusPill voted={hasVoted(myActiveVote)} />
                      </div>
                    </div>
                  </div>

                  {/* Navigation cluster */}
                  <div className="flex shrink-0 flex-col items-stretch gap-2 lg:items-end">
                    <div className="flex items-center gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        className="flex-1 gap-1.5 lg:flex-none"
                        onClick={goPrev}
                        disabled={!canPrev || loading}
                      >
                        <ChevronRight className="size-4" />
                        {ku.previous}
                      </Button>
                      <Button
                        type="button"
                        className="flex-1 gap-1.5 shadow-sm lg:flex-none"
                        onClick={goNext}
                        disabled={!canNext || loading}
                      >
                        {loading ? <Loader2 className="size-4 animate-spin" /> : null}
                        {ku.next}
                        <ChevronLeft className="size-4" />
                      </Button>
                    </div>
                    {counter ? (
                      <div className="flex items-center gap-2.5">
                        <span className="whitespace-nowrap text-xs font-medium tabular-nums text-muted-foreground">
                          {ku.records} {counter.pos} {ku.of} {counter.total}
                        </span>
                        <div className="h-1.5 w-28 overflow-hidden rounded-full bg-muted">
                          <div
                            className="h-full rounded-full bg-primary transition-all duration-500 ease-out"
                            style={{ width: `${progressPct}%` }}
                          />
                        </div>
                      </div>
                    ) : null}
                  </div>
                </div>
              </div>

              {/* ── Body — keyed so each record fades/slides in smoothly ──── */}
              <div
                key={activeCode}
                className="space-y-6 p-5 duration-500 animate-in fade-in slide-in-from-bottom-3 sm:p-6"
              >
                {/* Player */}
                <section className="space-y-2.5">
                  <div className="flex items-center justify-between">
                    <h3 className="inline-flex items-center gap-2 text-sm font-semibold text-foreground">
                      <Headphones className="size-4 text-primary" />
                      {ku.detailListenTitle}
                    </h3>
                    <span className="text-[11px] text-muted-foreground">{ku.detailListenHint}</span>
                  </div>
                  {/* Player stays LTR (timeline/seek/controls are built for it);
                      only the surrounding text + tables are RTL Kurdish. */}
                  <div dir="ltr">
                    <MaqamPlayer
                      maqamCode={activeCode}
                      hasAudio={Boolean(record.audioFileName || record.audioDurationSeconds)}
                      title={record.songName}
                      subtitle={record.producer}
                      track
                      onProgress={refreshActive}
                      labels={{
                        loading: ku.audioLoading,
                        error: ku.audioError,
                        unavailable: ku.audioUnavailable,
                      }}
                    />
                  </div>
                </section>

                {/* My vote — the only editable part */}
                <section className="rounded-2xl border border-primary/25 bg-primary/[0.03] p-5 shadow-sm shadow-primary/5">
                  <div className="mb-1 flex items-center gap-2">
                    <Music4 className="size-4 text-primary" />
                    <h3 className="text-sm font-semibold text-foreground">{ku.yourVote}</h3>
                    {hasVoted(myActiveVote) ? (
                      <span className="inline-flex items-center gap-1 rounded-full bg-green-500/15 px-2 py-0.5 text-[10px] font-semibold text-green-600 dark:text-green-400">
                        <CheckCircle2 className="size-3" />
                        {ku.voted}
                      </span>
                    ) : null}
                  </div>
                  <p className="mb-4 text-xs text-muted-foreground">{ku.yourVoteHint}</p>

                  <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="space-y-1.5">
                      <Label htmlFor="maqam-type">
                        {ku.maqamTypeLabel} <span className="text-destructive">*</span>
                      </Label>
                      <Input
                        id="maqam-type"
                        value={maqamType}
                        onChange={(e) => setMaqamType(e.target.value)}
                        placeholder={ku.maqamTypePlaceholder}
                        maxLength={1000}
                      />
                      <div className="flex flex-wrap gap-1.5 pt-1">
                        {COMMON_MAQAM_TYPES.map((t) => (
                          <button
                            key={t}
                            type="button"
                            onClick={() => setMaqamType(t)}
                            className={cn(
                              'rounded-full border px-2.5 py-1 text-xs font-medium transition-colors',
                              maqamType.trim() === t
                                ? 'border-primary/40 bg-primary/10 text-primary'
                                : 'border-border bg-background text-foreground/70 hover:bg-muted/60',
                            )}
                          >
                            {t}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <Label htmlFor="teacher-note">{ku.teacherNoteLabel}</Label>
                      <textarea
                        id="teacher-note"
                        value={teacherNote}
                        onChange={(e) => setTeacherNote(e.target.value)}
                        placeholder={ku.teacherNotePlaceholder}
                        rows={3}
                        maxLength={10000}
                        className="w-full resize-none rounded-lg border border-input bg-background px-3 py-2 text-sm leading-6 text-foreground outline-none transition-colors placeholder:text-muted-foreground/60 focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/40"
                      />
                    </div>

                    <div className="flex items-center justify-end">
                      <Button type="submit" disabled={submitting || !maqamType.trim()} className="gap-2">
                        {submitting ? <Loader2 className="size-4 animate-spin" /> : <Send className="size-4" />}
                        {submitting ? ku.saving : alreadyVoted ? ku.updateVote : ku.submitVote}
                      </Button>
                    </div>
                  </form>
                </section>

                {/* Other teachers' votes & notes — under my vote, read only */}
                <section className="rounded-2xl border border-border bg-card p-5 shadow-sm shadow-black/5">
                  <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                    <h3 className="inline-flex items-center gap-2 text-sm font-semibold text-foreground">
                      <Users className="size-4 text-primary" />
                      {ku.otherTeachersTitle}
                    </h3>
                    <span className="inline-flex items-center rounded-full border border-border bg-muted/30 px-2 py-0.5 text-[10px] font-medium text-muted-foreground">
                      {ku.otherTeachersHint}
                    </span>
                  </div>
                  {detailLoading && !hasFullDetail && otherVotes.length === 0 ? (
                    <div className="grid gap-2.5 sm:grid-cols-2">
                      <Skeleton className="h-20 w-full rounded-2xl" />
                      <Skeleton className="h-20 w-full rounded-2xl" />
                    </div>
                  ) : otherVotes.length === 0 ? (
                    <p className="rounded-2xl border border-dashed border-border bg-muted/10 px-4 py-8 text-center text-sm text-muted-foreground">
                      {ku.noOtherVotes}
                    </p>
                  ) : (
                    <div className="grid gap-2.5 sm:grid-cols-2">
                      {otherVotes.map((v) => (
                        <OtherVoteRow key={v.voteId ?? v.teacherUserId} vote={v} />
                      ))}
                    </div>
                  )}
                </section>
              </div>
            </div>
          ) : null}

          {/* ── Records table ────────────────────────────────────────────── */}
          <Card className="overflow-hidden border-border shadow-sm shadow-black/5">
            <CardContent className="space-y-4 p-4 sm:p-5">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-center gap-2">
                  <ListMusic className="size-4 text-primary" />
                  <h3 className="text-sm font-semibold text-foreground">{ku.tableTitle}</h3>
                  <span className="hidden text-[11px] text-muted-foreground sm:inline">· {ku.tableHint}</span>
                </div>
                <div className="relative w-full sm:max-w-xs">
                  <Search className="pointer-events-none absolute end-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder={ku.searchPlaceholder}
                    className="pe-8"
                  />
                </div>
              </div>

              {displayed.length === 0 ? (
                <p className="rounded-2xl border border-dashed border-border bg-muted/10 px-4 py-10 text-center text-sm text-muted-foreground">
                  {ku.emptyDescription}
                </p>
              ) : (
                <div className="overflow-hidden rounded-2xl border border-border">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-muted/40 hover:bg-muted/40">
                        <TableHead className="w-12 text-start text-muted-foreground">{ku.colNo}</TableHead>
                        <TableHead className="text-start text-muted-foreground">{ku.colSong}</TableHead>
                        <TableHead className="hidden text-start text-muted-foreground sm:table-cell">{ku.colProducer}</TableHead>
                        <TableHead className="hidden text-start text-muted-foreground sm:table-cell">{ku.colDuration}</TableHead>
                        <TableHead className="text-start text-muted-foreground">{ku.colStatus}</TableHead>
                        <TableHead className="hidden text-start text-muted-foreground md:table-cell">{ku.colPanel}</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {displayed.map((r, i) => {
                        const isActive = r.maqamCode === activeCode
                        const mine = findMyVote(r, myId)
                        const progress = voteProgress(r.teacherVotes)
                        const rowNo = (query.trim() ? 0 : page * (meta?.size ?? PAGE_SIZE)) + i + 1
                        return (
                          <TableRow
                            key={r.maqamCode}
                            role="button"
                            tabIndex={0}
                            onClick={() => setActiveCode(r.maqamCode)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter' || e.key === ' ') {
                                e.preventDefault()
                                setActiveCode(r.maqamCode)
                              }
                            }}
                            data-state={isActive ? 'selected' : undefined}
                            className={cn(
                              'cursor-pointer outline-none transition-colors focus-visible:bg-muted/60',
                              isActive && 'bg-primary/5 hover:bg-primary/5',
                            )}
                          >
                            <TableCell className="relative font-mono text-xs tabular-nums text-muted-foreground">
                              {isActive ? (
                                <span
                                  aria-hidden="true"
                                  className="absolute inset-y-1 start-0 w-0.5 rounded-e-full bg-primary"
                                />
                              ) : null}
                              {rowNo}
                            </TableCell>
                            <TableCell className="max-w-[12rem]">
                              <span className={cn('block truncate font-medium', isActive ? 'text-primary' : 'text-foreground')}>
                                {r.songName}
                              </span>
                              <span className="block truncate text-[11px] text-muted-foreground sm:hidden">{r.producer}</span>
                            </TableCell>
                            <TableCell className="hidden max-w-[10rem] truncate text-muted-foreground sm:table-cell">
                              {r.producer}
                            </TableCell>
                            <TableCell className="hidden tabular-nums text-muted-foreground sm:table-cell">
                              {r.audioDurationSeconds ? formatClock(r.audioDurationSeconds) : '—'}
                            </TableCell>
                            <TableCell>
                              {isActive ? (
                                <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-semibold text-primary">
                                  {ku.nowViewing}
                                </span>
                              ) : hasVoted(mine) ? (
                                <span className="inline-flex items-center gap-1 rounded-full bg-green-500/15 px-2 py-0.5 text-[10px] font-semibold text-green-600 dark:text-green-400">
                                  <CheckCircle2 className="size-3" />
                                  {ku.voted}
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/15 px-2 py-0.5 text-[10px] font-semibold text-amber-600 dark:text-amber-400">
                                  <Clock3 className="size-3" />
                                  {ku.notVoted}
                                </span>
                              )}
                            </TableCell>
                            <TableCell className="hidden tabular-nums text-muted-foreground md:table-cell">
                              {progress.cast}/{progress.total}
                            </TableCell>
                          </TableRow>
                        )
                      })}
                    </TableBody>
                  </Table>
                </div>
              )}

              {meta ? (
                <DataPagination
                  page={meta.page}
                  totalPages={meta.totalPages}
                  totalElements={meta.totalElements}
                  pageSize={meta.size}
                  onPageChange={(p) => {
                    selectAfterLoad.current = 'first'
                    load(p)
                  }}
                />
              ) : null}
            </CardContent>
          </Card>
        </>
      )}
    </section>
  )
}

function StatusPill({ voted }) {
  return voted ? (
    <span className="inline-flex items-center gap-1 rounded-full bg-green-500/15 px-2 py-0.5 text-[10px] font-semibold text-green-600 dark:text-green-400">
      <CheckCircle2 className="size-3" />
      {ku.voted}
    </span>
  ) : (
    <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/15 px-2 py-0.5 text-[10px] font-semibold text-amber-600 dark:text-amber-400">
      <Clock3 className="size-3" />
      {ku.notVoted}
    </span>
  )
}

function OtherVoteRow({ vote }) {
  const voted = hasVoted(vote)
  const label = teacherLabel(vote)
  return (
    <div className="rounded-2xl border border-border bg-background px-4 py-3 transition-colors hover:border-primary/30">
      <div className="flex items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-2.5">
          <div className="grid size-8 shrink-0 place-items-center rounded-lg bg-primary/10 text-[11px] font-semibold text-primary">
            {initialsOf(label)}
          </div>
          <p className="truncate text-sm font-semibold text-foreground">{label}</p>
        </div>
        {voted ? (
          <span className="shrink-0 rounded-full bg-primary/10 px-2.5 py-1 text-xs font-semibold text-primary">
            {vote.maqamType || '—'}
          </span>
        ) : (
          <span className="shrink-0 rounded-full bg-muted px-2.5 py-1 text-[11px] font-medium text-muted-foreground">
            {ku.othersNoVote}
          </span>
        )}
      </div>
      {voted && vote.teacherNote ? (
        <p
          className="mt-2.5 whitespace-pre-line break-words text-sm leading-6 text-foreground/80"
          style={{ overflowWrap: 'anywhere' }}
        >
          {vote.teacherNote}
        </p>
      ) : null}
      {vote.votedAt ? (
        <p className="mt-2 text-[11px] text-muted-foreground/80">{formatKuDate(vote.votedAt)}</p>
      ) : null}
    </div>
  )
}

export { TeacherMaqamListPage }
