import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import {
  BarChart3,
  CheckCircle2,
  ChevronRight,
  Clock,
  Gauge,
  Loader2,
  Music4,
  Send,
} from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Skeleton } from '@/components/ui/skeleton'
import { useToast } from '@/hooks/use-toast'
import { useCurrentProfile } from '@/hooks/use-current-profile'
import { MaqamPlayer } from '@/components/maqam/MaqamPlayer'
import { COMMON_MAQAM_TYPES, formatKuDate, formatKuDuration, ku } from '@/lib/maqam-i18n'
import { formatCoverage } from '@/components/maqam/maqam-helpers'
import { cn } from '@/lib/utils'
import { castMaqamVote, getMaqam, getMaqamListenSummary } from '@/services/maqam'

function TeacherMaqamDetailPage() {
  const { code } = useParams()
  const navigate = useNavigate()
  const toast = useToast()
  const profile = useCurrentProfile()
  const myId = profile?.id

  const [record, setRecord] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const [maqamType, setMaqamType] = useState('')
  const [teacherNote, setTeacherNote] = useState('')
  const [alreadyVoted, setAlreadyVoted] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  const [mySummary, setMySummary] = useState(null)

  const myVote = useMemo(() => {
    const votes = Array.isArray(record?.teacherVotes) ? record.teacherVotes : []
    return votes.find((v) => v.teacherUserId === myId) || null
  }, [record, myId])

  const loadRecord = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const data = await getMaqam(code)
      setRecord(data)
    } catch (err) {
      const status = err?.response?.status
      setError(status === 404 || status === 403 ? ku.notFound : ku.errorLoad)
    } finally {
      setLoading(false)
    }
  }, [code])

  const loadSummary = useCallback(async () => {
    try {
      const rows = await getMaqamListenSummary(code)
      const mine = Array.isArray(rows) ? rows.find((r) => r.teacherUserId === myId) : null
      if (mine) setMySummary(mine)
    } catch {
      // engagement is best-effort
    }
  }, [code, myId])

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadRecord()
  }, [loadRecord])

  // Seed the vote form from my existing vote once the record (and my id) load.
  useEffect(() => {
    if (!record || myId == null) return
    if (myVote) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setMaqamType(myVote.maqamType || '')
      setTeacherNote(myVote.teacherNote || '')
      setAlreadyVoted(Boolean((myVote.maqamType ?? '').toString().trim() || myVote.votedAt))
    }
    loadSummary()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [record, myId])

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (submitting) return
    const trimmed = maqamType.trim()
    if (!trimmed) {
      toast.error(ku.voteRequired)
      return
    }
    setSubmitting(true)
    const wasVoted = alreadyVoted
    try {
      const updated = await castMaqamVote(code, {
        maqamType: trimmed,
        teacherNote: teacherNote.trim() || null,
      })
      setRecord(updated)
      setAlreadyVoted(true)
      toast.success(wasVoted ? ku.voteUpdatedTitle : ku.voteSavedTitle, ku.voteSavedDesc)
    } catch (err) {
      toast.apiError(err, ku.genericError)
    } finally {
      setSubmitting(false)
    }
  }

  // Prefer the live listen-summary; fall back to the vote row aggregates.
  const engagement = mySummary || {
    totalSeconds: myVote?.totalListenSeconds ?? 0,
    maxPositionSeconds: myVote?.maxPositionSeconds ?? 0,
    sessionCount: null,
    coverageRatio: null,
    lastListenAt: myVote?.lastListenAt ?? null,
  }
  const hasEngagement = (engagement.totalSeconds ?? 0) > 0

  if (loading && !record) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-5 w-24" />
        <Skeleton className="h-10 w-2/3" />
        <Skeleton className="h-32 w-full rounded-2xl" />
        <Skeleton className="h-48 w-full rounded-2xl" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="space-y-6">
        <BackLink onClick={() => navigate('/teacher')} />
        <Card className="border-destructive/40 bg-destructive/5">
          <CardContent className="flex flex-col items-center gap-3 py-12 text-center">
            <Music4 className="size-8 text-destructive/70" />
            <p className="text-sm text-destructive">{error}</p>
            <Button type="button" variant="outline" onClick={loadRecord}>
              {ku.retry}
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <BackLink onClick={() => navigate('/teacher')} />

      {/* Header */}
      <div className="flex items-start gap-4 border-b border-border pb-5">
        <div className="grid size-12 shrink-0 place-items-center rounded-2xl bg-primary/10 text-primary">
          <Music4 className="size-6" />
        </div>
        <div className="min-w-0 flex-1">
          <h1 className="font-heading text-2xl font-semibold tracking-tight text-foreground">
            {record?.songName}
          </h1>
          <p className="mt-0.5 text-sm text-muted-foreground">
            <span className="text-muted-foreground/70">{ku.byProducer}: </span>
            {record?.producer}
          </p>
          <p className="mt-1 font-mono text-[11px] text-muted-foreground/70">{record?.maqamCode}</p>
        </div>
        {alreadyVoted ? (
          <span className="inline-flex shrink-0 items-center gap-1.5 rounded-full bg-green-500/15 px-3 py-1 text-xs font-semibold text-green-600 dark:text-green-400">
            <CheckCircle2 className="size-3.5" />
            {ku.voted}
          </span>
        ) : null}
      </div>

      {/* Player */}
      <section className="space-y-2">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-foreground">{ku.detailListenTitle}</h2>
          <span className="text-[11px] text-muted-foreground">{ku.detailListenHint}</span>
        </div>
        <MaqamPlayer
          maqamCode={code}
          hasAudio={Boolean(record?.audioFileName || record?.audioDurationSeconds)}
          title={record?.songName}
          subtitle={record?.producer}
          track
          onProgress={loadSummary}
          labels={{
            loading: ku.audioLoading,
            error: ku.audioError,
            unavailable: ku.audioUnavailable,
          }}
        />
      </section>

      {/* Archive note */}
      {record?.archiveNote ? (
        <section>
          <h2 className="mb-2 text-sm font-semibold text-foreground">{ku.archiveNote}</h2>
          <p
            className="whitespace-pre-line break-words rounded-2xl border border-border bg-muted/20 px-4 py-3 text-sm leading-7 text-foreground"
            style={{ overflowWrap: 'anywhere' }}
          >
            {record.archiveNote}
          </p>
        </section>
      ) : null}

      {/* Engagement */}
      <section className="rounded-2xl border border-border bg-card p-5 shadow-sm shadow-black/5">
        <div className="mb-4 flex items-center gap-2">
          <BarChart3 className="size-4 text-primary" />
          <h2 className="text-sm font-semibold text-foreground">{ku.engagementTitle}</h2>
        </div>
        {hasEngagement ? (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <EngagementStat icon={Clock} label={ku.totalListen} value={formatKuDuration(engagement.totalSeconds)} />
            <EngagementStat icon={Gauge} label={ku.furthestPoint} value={formatKuDuration(engagement.maxPositionSeconds)} />
            {engagement.coverageRatio != null ? (
              <EngagementStat icon={Gauge} label={ku.coverage} value={formatCoverage(engagement.coverageRatio)} />
            ) : null}
            {engagement.sessionCount != null ? (
              <EngagementStat icon={BarChart3} label={ku.sessionCount} value={engagement.sessionCount} />
            ) : null}
            {engagement.lastListenAt ? (
              <EngagementStat icon={Clock} label={ku.lastListen} value={formatKuDate(engagement.lastListenAt)} wide />
            ) : null}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">{ku.noEngagement}</p>
        )}
      </section>

      {/* Vote form */}
      <section className="rounded-2xl border border-border bg-card p-5 shadow-sm shadow-black/5">
        <div className="mb-1 flex items-center gap-2">
          <Music4 className="size-4 text-primary" />
          <h2 className="text-sm font-semibold text-foreground">{ku.voteTitle}</h2>
        </div>
        <p className="mb-4 text-xs text-muted-foreground">{ku.voteSubtitle}</p>

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
    </div>
  )
}

function BackLink({ onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="inline-flex items-center gap-1 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
    >
      <ChevronRight className="size-4" />
      {ku.back}
    </button>
  )
}

function EngagementStat({ icon: Icon, label, value, wide }) {
  return (
    <div className={cn('flex items-center gap-2 rounded-xl bg-muted/40 px-3 py-2.5', wide && 'col-span-2')}>
      <Icon className="size-4 shrink-0 text-muted-foreground" />
      <div className="min-w-0">
        <p className="truncate text-sm font-semibold text-foreground">{value}</p>
        <p className="text-[10px] text-muted-foreground">{label}</p>
      </div>
    </div>
  )
}

export { TeacherMaqamDetailPage }
