import { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react'
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
  RotateCcw,
  Search,
  Send,
  Users,
} from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { EmptyState } from '@/components/ui/empty-state'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { SearchClearButton } from '@/components/ui/search-clear-button'
import { Skeleton } from '@/components/ui/skeleton'
import { usePersistentState } from '@/hooks/use-persistent-state'
import { useToast } from '@/hooks/use-toast'
import { useCurrentProfile } from '@/hooks/use-current-profile'
import { MaqamPlayer } from '@/components/maqam/MaqamPlayer'
import { formatClock, teacherLabel, voteProgress } from '@/components/maqam/maqam-helpers'
import { COMMON_MAQAM_TYPES, formatKuDate, ku } from '@/lib/maqam-i18n'
import { cn } from '@/lib/utils'
import { castMaqamVote, getMaqam, getMaqamsPage } from '@/services/maqam'

const PAGE_SIZE = 10
const NOTE_MAX = 10000

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

  // ── Active record (the one shown in the work surface) ─────────────────────
  const [activeCode, setActiveCode] = useState(null)
  const [activeRecord, setActiveRecord] = useState(null) // full record from getMaqam
  const [detailLoading, setDetailLoading] = useState(false)
  const activeCodeRef = useRef(null)
  // 'first' | 'last' | null — which row to focus once the next page lands.
  const selectAfterLoad = useRef('first')
  // Full records already fetched this session. Revisiting a record via
  // Prev/Next then renders instantly instead of flashing a loading bar while
  // the same payload is fetched again; we still revalidate in the background.
  const detailCache = useRef(new Map())

  // ── Vote form state ──────────────────────────────────────────────────────
  const [maqamType, setMaqamType] = useState('')
  const [teacherNote, setTeacherNote] = useState('')
  const [alreadyVoted, setAlreadyVoted] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  // Which record the form was seeded from, and whether the teacher has touched
  // it since. The listen tracker refreshes the active record every ~15s while
  // audio plays — without this guard that refresh re-seeded the form and wiped
  // whatever was being typed mid-sentence.
  const seededCode = useRef(null)
  const formDirty = useRef(false)

  const load = useCallback(async (nextPage = 0) => {
    setLoading(true)
    setError('')
    try {
      // Oldest first, so record #1 is the genuine first record and «داهاتوو»
      // walks forward toward newer ones (newly-added records land at the end).
      // Ordering goes through sortBy/sortDirection — never Spring's
      // `sort=field,dir`, which this endpoint does not read.
      const data = await getMaqamsPage({
        page: nextPage,
        size: PAGE_SIZE,
        sortBy: 'createdAt',
        sortDirection: 'asc',
      })
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
  // queue uses (createdAt,asc) until the record is found, so it lands on the
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
        const data = await getMaqamsPage({
          page: p,
          size: PAGE_SIZE,
          sortBy: 'createdAt',
          sortDirection: 'asc',
        })
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

  // Fetch the full record (archive note + fresh teacher votes) for the active
  // row. A cached copy renders immediately and is revalidated silently.
  useEffect(() => {
    if (!activeCode) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setActiveRecord(null)
      return undefined
    }
    let cancelled = false
    const cached = detailCache.current.get(activeCode)
    setActiveRecord(cached ?? null)
    setDetailLoading(!cached)
    getMaqam(activeCode)
      .then((data) => {
        detailCache.current.set(activeCode, data)
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

  // Seed the vote form from my existing vote — on record change, or when the
  // full record arrives for a record the teacher hasn't typed into yet.
  useEffect(() => {
    if (myId == null || !record) return
    const codeChanged = seededCode.current !== activeCode
    if (codeChanged) formDirty.current = false
    else if (formDirty.current) return
    const mine = findMyVote(record, myId)
    setMaqamType(mine?.maqamType || '')
    setTeacherNote(mine?.teacherNote || '')
    setAlreadyVoted(hasVoted(mine))
    seededCode.current = activeCode
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeCode, activeRecord, myId])

  const savedVote = findMyVote(record, myId)
  const isDirty =
    maqamType !== (savedVote?.maqamType || '') || teacherNote !== (savedVote?.teacherNote || '')

  const touchForm = () => { formDirty.current = true }

  const revertForm = () => {
    formDirty.current = false
    setMaqamType(savedVote?.maqamType || '')
    setTeacherNote(savedVote?.teacherNote || '')
  }

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

  // Jumping a whole page always lands on that page's first record.
  const goToPage = useCallback((next) => {
    if (loading) return
    selectAfterLoad.current = 'first'
    load(next)
  }, [loading, load])

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

  // How much of THIS page the teacher has already classified — the question the
  // position counter never answered ("how much is left for me to do?").
  const pageProgress = useMemo(() => {
    const rows = Array.isArray(records) ? records : []
    const done = rows.filter((r) => hasVoted(findMyVote(r, myId))).length
    return { done, total: rows.length, pct: rows.length ? Math.round((done / rows.length) * 100) : 0 }
  }, [records, myId])

  // ── Voting (the teacher's own row stays editable) ────────────────────────
  const applyUpdatedRecord = useCallback((updated) => {
    detailCache.current.set(updated.maqamCode, updated)
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
      formDirty.current = false
      toast.success(wasVoted ? ku.voteUpdatedTitle : ku.voteSavedTitle, ku.voteSavedDesc)
    } catch (err) {
      toast.apiError(err, ku.genericError)
    } finally {
      setSubmitting(false)
    }
  }

  // Ctrl/⌘ + Enter submits from anywhere inside the vote form.
  const handleFormKeyDown = (e) => {
    if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
      e.preventDefault()
      handleSubmit(e)
    }
  }

  // ── Derived display data for the active record ───────────────────────────
  const myActiveVote = savedVote
  const otherVotes = votesOf(record).filter((v) => v.teacherUserId !== myId)
  const hasFullDetail = Boolean(activeRecord && activeRecord.maqamCode === activeCode)
  const firstLoad = loading && !records

  return (
    <section className="space-y-5">
      {/* ── Page header: identity, workload, refresh ───────────────────────── */}
      <header className="flex flex-col gap-4 border-b border-border pb-5 lg:flex-row lg:items-end lg:justify-between">
        <div className="min-w-0 space-y-2">
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
              {ku.listTitle}
            </h1>
            {meta?.totalElements != null ? (
              <span className="inline-flex items-center rounded-full border border-border bg-muted px-3 py-1 text-[13px] font-semibold text-foreground">
                {meta.totalElements} {ku.records}
              </span>
            ) : null}
          </div>
          <p className="max-w-prose text-[15px] leading-7 text-muted-foreground">{ku.consoleSubtitle}</p>
        </div>

        <div className="flex items-center gap-3">
          {records?.length ? (
            <div className="min-w-[9.5rem] rounded-2xl border border-border bg-card px-4 py-2.5 shadow-sm shadow-black/5">
              <div className="flex items-baseline justify-between gap-3">
                <span className="text-[13px] font-medium text-muted-foreground">{ku.progressDone}</span>
                <span className="text-base font-semibold tabular-nums text-foreground">
                  {pageProgress.done}<span className="text-muted-foreground">/{pageProgress.total}</span>
                </span>
              </div>
              <div
                role="progressbar"
                aria-valuenow={pageProgress.done}
                aria-valuemin={0}
                aria-valuemax={pageProgress.total}
                aria-label={ku.progressAria}
                className="mt-2 h-2 overflow-hidden rounded-full bg-muted"
              >
                <div
                  className="h-full rounded-full bg-primary transition-[width] duration-500 ease-out motion-reduce:transition-none"
                  style={{ width: `${pageProgress.pct}%` }}
                />
              </div>
              <p className="mt-1.5 text-[11px] font-medium text-muted-foreground">{ku.progressOnPage}</p>
            </div>
          ) : null}
          <Button
            type="button"
            variant="outline"
            className="h-11 shrink-0 gap-2 px-4 text-sm"
            onClick={() => load(page)}
            disabled={loading}
          >
            <RefreshCw className={cn('size-4', loading && 'animate-spin motion-reduce:animate-none')} />
            {ku.refresh}
          </Button>
        </div>
      </header>

      {error ? (
        <Card className="border-destructive/40 bg-destructive/5">
          <CardContent className="flex flex-wrap items-center gap-3 px-4 py-3">
            <AlertTriangle className="size-5 shrink-0 text-destructive" />
            <p className="flex-1 text-sm font-medium text-destructive">{error}</p>
            <Button type="button" variant="outline" className="h-9 px-3" onClick={() => load(page)}>
              {ku.retry}
            </Button>
          </CardContent>
        </Card>
      ) : null}

      {firstLoad ? (
        <div className="grid gap-5 xl:grid-cols-[minmax(0,1.6fr)_minmax(20rem,1fr)]">
          <div className="space-y-5">
            <Skeleton className="h-32 w-full rounded-3xl" />
            <Skeleton className="h-40 w-full rounded-3xl" />
            <Skeleton className="h-64 w-full rounded-3xl" />
          </div>
          <Skeleton className="h-[32rem] w-full rounded-3xl" />
        </div>
      ) : !displayed.length && !records?.length ? (
        <EmptyState icon={Music4} title={ku.emptyTitle} description={ku.emptyDescription} />
      ) : (
        <div className="grid items-start gap-5 xl:grid-cols-[minmax(0,1.6fr)_minmax(20rem,1fr)]">
          {/* ── Work surface ────────────────────────────────────────────── */}
          <div className="min-w-0 space-y-5">
            {record ? (
              <>
                {/* Announce record changes to assistive tech without stealing focus. */}
                <p className="sr-only" role="status" aria-live="polite">
                  {ku.viewingNow} {record.songName}
                </p>

                {/* Record identity + prev/next */}
                <div className="relative overflow-hidden rounded-3xl border border-border bg-card shadow-sm shadow-black/5">
                  {detailLoading && !hasFullDetail ? (
                    <div className="absolute inset-x-0 top-0 h-0.5 animate-pulse bg-primary/60 motion-reduce:animate-none" />
                  ) : null}
                  <div className="flex flex-col gap-5 bg-gradient-to-b from-primary/[0.07] to-transparent p-5 sm:p-6 lg:flex-row lg:items-start lg:justify-between">
                    <div className="flex min-w-0 items-start gap-4">
                      <span className="grid size-14 shrink-0 place-items-center rounded-2xl bg-primary text-primary-foreground shadow-sm shadow-primary/30">
                        <Music4 className="size-7" />
                      </span>
                      <div className="min-w-0">
                        <h2 className="break-words text-xl font-semibold leading-tight tracking-tight text-foreground sm:text-2xl">
                          {record.songName}
                        </h2>
                        <p className="mt-1 truncate text-[15px] text-muted-foreground">
                          {ku.byProducer}: <span className="font-medium text-foreground">{record.producer}</span>
                        </p>
                        <div className="mt-3 flex flex-wrap items-center gap-2">
                          {record.audioDurationSeconds ? (
                            <span className="inline-flex items-center gap-1.5 rounded-lg bg-muted px-2.5 py-1 text-[13px] font-medium tabular-nums text-foreground">
                              <Clock3 className="size-3.5" />
                              {formatClock(record.audioDurationSeconds)}
                            </span>
                          ) : null}
                          <StatusPill voted={hasVoted(myActiveVote)} />
                        </div>
                      </div>
                    </div>

                    <div className="flex shrink-0 flex-col gap-2.5 lg:items-end">
                      <div className="flex items-center gap-2">
                        <Button
                          type="button"
                          variant="outline"
                          className="h-11 flex-1 gap-1.5 px-4 text-sm lg:flex-none"
                          onClick={goPrev}
                          disabled={!canPrev || loading}
                        >
                          <ChevronRight className="size-4" />
                          {ku.previous}
                        </Button>
                        <Button
                          type="button"
                          className="h-11 flex-1 gap-1.5 px-4 text-sm shadow-sm lg:flex-none"
                          onClick={goNext}
                          disabled={!canNext || loading}
                        >
                          {loading ? <Loader2 className="size-4 animate-spin motion-reduce:animate-none" /> : null}
                          {ku.next}
                          <ChevronLeft className="size-4" />
                        </Button>
                      </div>
                      {counter ? (
                        <p className="text-[13px] font-medium tabular-nums text-muted-foreground">
                          {ku.records} <span className="text-foreground">{counter.pos}</span> {ku.of} {counter.total}
                        </p>
                      ) : null}
                      <p className="hidden items-center gap-1.5 text-[11px] text-muted-foreground lg:flex">
                        <kbd className="rounded border border-border bg-muted px-1.5 py-px font-sans">←</kbd>
                        <kbd className="rounded border border-border bg-muted px-1.5 py-px font-sans">→</kbd>
                        {ku.keyboardHint}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Player */}
                <section
                  aria-labelledby="listen-title"
                  className="rounded-3xl border border-border bg-card p-5 shadow-sm shadow-black/5 sm:p-6"
                >
                  <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                    <h3 id="listen-title" className="inline-flex items-center gap-2 text-[15px] font-semibold text-foreground">
                      <Headphones className="size-4 text-primary" />
                      {ku.detailListenTitle}
                    </h3>
                    <span className="text-xs text-muted-foreground">{ku.detailListenHint}</span>
                  </div>
                  {/* Player stays LTR (timeline/seek/controls are built for it);
                      only the surrounding text + queue are RTL Kurdish. */}
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

                {/* My vote — the primary task on this page */}
                <section
                  aria-labelledby="vote-title"
                  className="rounded-3xl border-2 border-primary/30 bg-primary/[0.04] p-5 shadow-sm shadow-primary/10 sm:p-6"
                >
                  <div className="mb-1 flex flex-wrap items-center gap-2">
                    <Music4 className="size-[18px] text-primary" />
                    <h3 id="vote-title" className="text-base font-semibold text-foreground">{ku.yourVote}</h3>
                    {hasVoted(myActiveVote) ? (
                      <span className="inline-flex items-center gap-1 rounded-full bg-green-600/15 px-2.5 py-0.5 text-xs font-semibold text-green-800 dark:text-green-300">
                        <CheckCircle2 className="size-3.5" />
                        {ku.voted}
                      </span>
                    ) : null}
                  </div>
                  <p className="mb-5 text-[13px] leading-6 text-muted-foreground">{ku.yourVoteHint}</p>

                  <form onSubmit={handleSubmit} onKeyDown={handleFormKeyDown} className="space-y-5">
                    <div className="space-y-2">
                      <Label htmlFor="maqam-type" className="text-sm font-semibold">
                        {ku.maqamTypeLabel} <span aria-hidden="true" className="text-destructive">*</span>
                      </Label>
                      <Input
                        id="maqam-type"
                        value={maqamType}
                        onChange={(e) => { touchForm(); setMaqamType(e.target.value) }}
                        placeholder={ku.maqamTypePlaceholder}
                        maxLength={1000}
                        required
                        aria-required="true"
                        className="h-11 text-[15px]"
                      />
                      <div className="pt-1">
                        <p className="mb-2 text-xs font-medium text-muted-foreground">{ku.quickPick}</p>
                        <div className="flex flex-wrap gap-2">
                          {COMMON_MAQAM_TYPES.map((t) => {
                            const on = maqamType.trim() === t
                            return (
                              <button
                                key={t}
                                type="button"
                                aria-pressed={on}
                                onClick={() => { touchForm(); setMaqamType(t) }}
                                className={cn(
                                  'inline-flex h-10 items-center rounded-full border px-4 text-sm font-medium transition-colors',
                                  'focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50',
                                  on
                                    ? 'border-primary bg-primary text-primary-foreground shadow-sm'
                                    : 'border-border bg-background text-foreground hover:border-primary/40 hover:bg-muted',
                                )}
                              >
                                {t}
                              </button>
                            )
                          })}
                        </div>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <div className="flex items-baseline justify-between gap-3">
                        <Label htmlFor="teacher-note" className="text-sm font-semibold">{ku.teacherNoteLabel}</Label>
                        <span className="text-[11px] tabular-nums text-muted-foreground">
                          {teacherNote.length} / {NOTE_MAX}
                        </span>
                      </div>
                      <textarea
                        id="teacher-note"
                        value={teacherNote}
                        onChange={(e) => { touchForm(); setTeacherNote(e.target.value) }}
                        placeholder={ku.teacherNotePlaceholder}
                        rows={4}
                        maxLength={NOTE_MAX}
                        className="w-full resize-y rounded-xl border border-input bg-background px-3.5 py-2.5 text-[15px] leading-7 text-foreground outline-none transition-colors placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/40"
                      />
                    </div>

                    <div className="flex flex-wrap items-center gap-3 border-t border-primary/15 pt-4">
                      <Button
                        type="submit"
                        disabled={submitting || !maqamType.trim()}
                        className="h-11 gap-2 px-5 text-sm max-sm:w-full"
                      >
                        {submitting
                          ? <Loader2 className="size-4 animate-spin motion-reduce:animate-none" />
                          : <Send className="size-4" />}
                        {submitting ? ku.saving : alreadyVoted ? ku.updateVote : ku.submitVote}
                      </Button>
                      {isDirty && !submitting ? (
                        <Button
                          type="button"
                          variant="ghost"
                          className="h-11 gap-2 px-3 text-sm"
                          onClick={revertForm}
                        >
                          <RotateCcw className="size-4" />
                          {ku.revert}
                        </Button>
                      ) : null}
                      <span className="ms-auto flex items-center gap-3">
                        {isDirty ? (
                          <span className="inline-flex items-center gap-1.5 text-[13px] font-semibold text-amber-700 dark:text-amber-300">
                            <span aria-hidden="true" className="size-2 rounded-full bg-amber-500" />
                            {ku.unsavedChanges}
                          </span>
                        ) : null}
                        <kbd className="hidden rounded border border-border bg-background px-1.5 py-0.5 text-[11px] text-muted-foreground sm:inline">
                          {ku.submitShortcut}
                        </kbd>
                      </span>
                    </div>
                  </form>
                </section>

                {/* Other teachers' votes & notes — read only */}
                <section
                  aria-labelledby="others-title"
                  className="rounded-3xl border border-border bg-card p-5 shadow-sm shadow-black/5 sm:p-6"
                >
                  <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
                    <h3 id="others-title" className="inline-flex items-center gap-2 text-[15px] font-semibold text-foreground">
                      <Users className="size-4 text-primary" />
                      {ku.otherTeachersTitle}
                    </h3>
                    <span className="inline-flex items-center rounded-full border border-border bg-muted px-2.5 py-1 text-[11px] font-medium text-muted-foreground">
                      {ku.otherTeachersHint}
                    </span>
                  </div>
                  {detailLoading && !hasFullDetail && otherVotes.length === 0 ? (
                    <div className="grid gap-3 sm:grid-cols-2">
                      <Skeleton className="h-24 w-full rounded-2xl" />
                      <Skeleton className="h-24 w-full rounded-2xl" />
                    </div>
                  ) : otherVotes.length === 0 ? (
                    <p className="rounded-2xl border border-dashed border-border bg-muted/30 px-4 py-8 text-center text-sm text-muted-foreground">
                      {ku.noOtherVotes}
                    </p>
                  ) : (
                    <ul className="grid gap-3 sm:grid-cols-2">
                      {otherVotes.map((v) => (
                        <OtherVoteRow key={v.voteId ?? v.teacherUserId} vote={v} />
                      ))}
                    </ul>
                  )}
                </section>
              </>
            ) : null}
          </div>

          {/* ── Queue rail ──────────────────────────────────────────────── */}
          <aside className="min-w-0 xl:sticky xl:top-6">
            <div className="overflow-hidden rounded-3xl border border-border bg-card shadow-sm shadow-black/5">
              <div className="space-y-3 border-b border-border p-4">
                <div className="flex items-center gap-2">
                  <ListMusic className="size-4 text-primary" />
                  <h2 className="text-[15px] font-semibold text-foreground">{ku.queueTitle}</h2>
                  <span className="ms-auto text-[13px] tabular-nums text-muted-foreground">
                    {displayed.length}
                  </span>
                </div>
                <div className="relative">
                  <Search aria-hidden="true" className="pointer-events-none absolute end-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder={ku.searchPlaceholder}
                    aria-label={ku.searchPlaceholder}
                    className="h-11 pe-10 ps-10 text-sm"
                  />
                  {query ? (
                    <SearchClearButton
                      className="left-2 right-auto"
                      label={ku.clearSearch}
                      onClick={() => setQuery('')}
                    />
                  ) : null}
                </div>
              </div>

              {displayed.length === 0 ? (
                <p className="px-4 py-12 text-center text-sm text-muted-foreground">{ku.queueEmptySearch}</p>
              ) : (
                <ul
                  className="max-h-[min(60vh,34rem)] divide-y divide-border overflow-y-auto xl:max-h-[calc(100dvh-22rem)]"
                  aria-label={ku.queueTitle}
                >
                  {displayed.map((r, i) => (
                    <QueueRow
                      key={r.maqamCode}
                      record={r}
                      index={(query.trim() ? 0 : page * (meta?.size ?? PAGE_SIZE)) + i + 1}
                      active={r.maqamCode === activeCode}
                      voted={hasVoted(findMyVote(r, myId))}
                      onSelect={setActiveCode}
                    />
                  ))}
                </ul>
              )}

              {/* Compact, fully-Kurdish pager — the shared <DataPagination> ships
                  English labels and a summary line that overflows this rail. */}
              {meta && meta.totalPages > 1 ? (
                <div className="flex items-center justify-between gap-2 border-t border-border p-3">
                  <Button
                    type="button"
                    variant="outline"
                    className="h-10 gap-1.5 px-3 text-sm"
                    disabled={!hasPrevPage || loading}
                    onClick={() => goToPage(page - 1)}
                  >
                    <ChevronRight className="size-4" />
                    {ku.previous}
                  </Button>
                  <p className="text-[13px] font-medium tabular-nums text-muted-foreground">
                    {ku.pageLabel} <span className="text-foreground">{meta.page + 1}</span> {ku.of} {meta.totalPages}
                  </p>
                  <Button
                    type="button"
                    variant="outline"
                    className="h-10 gap-1.5 px-3 text-sm"
                    disabled={!hasNextPage || loading}
                    onClick={() => goToPage(page + 1)}
                  >
                    {ku.next}
                    <ChevronLeft className="size-4" />
                  </Button>
                </div>
              ) : null}
            </div>
          </aside>
        </div>
      )}
    </section>
  )
}

function StatusPill({ voted }) {
  return voted ? (
    <span className="inline-flex items-center gap-1.5 rounded-lg bg-green-600/15 px-2.5 py-1 text-[13px] font-semibold text-green-800 dark:text-green-300">
      <CheckCircle2 className="size-3.5" />
      {ku.voted}
    </span>
  ) : (
    <span className="inline-flex items-center gap-1.5 rounded-lg bg-amber-500/20 px-2.5 py-1 text-[13px] font-semibold text-amber-800 dark:text-amber-200">
      <Clock3 className="size-3.5" />
      {ku.notVoted}
    </span>
  )
}

// One row of the queue. Memoised because the rail re-renders on every keystroke
// in the vote form; only the row whose props actually changed repaints.
const QueueRow = memo(function QueueRow({ record, index, active, voted, onSelect }) {
  const progress = voteProgress(record.teacherVotes)
  return (
    <li>
      <button
        type="button"
        onClick={() => onSelect(record.maqamCode)}
        aria-current={active ? 'true' : undefined}
        className={cn(
          'relative flex w-full items-center gap-3 px-4 py-3 text-start transition-colors',
          'focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:ring-inset',
          active ? 'bg-primary/10' : 'hover:bg-muted',
        )}
      >
        {active ? (
          <span aria-hidden="true" className="absolute inset-y-2 start-0 w-1 rounded-e-full bg-primary" />
        ) : null}
        <span
          className={cn(
            'grid size-8 shrink-0 place-items-center rounded-lg text-xs font-semibold tabular-nums',
            active ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground',
          )}
        >
          {index}
        </span>
        <span className="min-w-0 flex-1">
          <span className={cn('block truncate text-sm font-semibold', active ? 'text-primary' : 'text-foreground')}>
            {record.songName}
          </span>
          <span className="mt-0.5 flex items-center gap-2 text-xs text-muted-foreground">
            <span className="truncate">{record.producer}</span>
            {record.audioDurationSeconds ? (
              <>
                <span aria-hidden="true">·</span>
                <span className="shrink-0 tabular-nums">{formatClock(record.audioDurationSeconds)}</span>
              </>
            ) : null}
          </span>
        </span>
        <span className="flex shrink-0 flex-col items-end gap-1">
          <span
            className={cn(
              'inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[11px] font-semibold',
              voted
                ? 'bg-green-600/15 text-green-800 dark:text-green-300'
                : 'bg-amber-500/20 text-amber-800 dark:text-amber-200',
            )}
          >
            {voted ? <CheckCircle2 className="size-3" /> : <Clock3 className="size-3" />}
            {voted ? ku.voted : ku.notVoted}
          </span>
          <span className="text-[11px] tabular-nums text-muted-foreground" title={ku.colPanel}>
            <span className="sr-only">{ku.panelVotesAria}: </span>
            {progress.cast}/{progress.total}
          </span>
        </span>
      </button>
    </li>
  )
})

function OtherVoteRow({ vote }) {
  const voted = hasVoted(vote)
  const label = teacherLabel(vote)
  return (
    <li className="rounded-2xl border border-border bg-background px-4 py-3.5 transition-colors hover:border-primary/30">
      <div className="flex items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-2.5">
          <span aria-hidden="true" className="grid size-9 shrink-0 place-items-center rounded-xl bg-primary/12 text-xs font-semibold text-primary">
            {initialsOf(label)}
          </span>
          <p className="truncate text-sm font-semibold text-foreground">{label}</p>
        </div>
        {voted ? (
          <span className="shrink-0 rounded-full bg-primary/12 px-3 py-1 text-[13px] font-semibold text-primary">
            {vote.maqamType || '—'}
          </span>
        ) : (
          <span className="shrink-0 rounded-full bg-muted px-3 py-1 text-xs font-medium text-muted-foreground">
            {ku.othersNoVote}
          </span>
        )}
      </div>
      {voted && vote.teacherNote ? (
        <p
          className="mt-3 whitespace-pre-line break-words text-sm leading-7 text-foreground"
          style={{ overflowWrap: 'anywhere' }}
        >
          {vote.teacherNote}
        </p>
      ) : null}
      {vote.votedAt ? (
        <p className="mt-2 text-[11px] text-muted-foreground">{formatKuDate(vote.votedAt)}</p>
      ) : null}
    </li>
  )
}

export { TeacherMaqamListPage }
