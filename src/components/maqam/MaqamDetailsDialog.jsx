import { useEffect, useState } from 'react'
import { Clock, Music4, Pencil, Users, X } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { CodeBadge } from '@/components/ui/code-badge'
import { Skeleton } from '@/components/ui/skeleton'
import { useToast } from '@/hooks/use-toast'
import { cn } from '@/lib/utils'
import { humanizeFieldName } from '@/lib/get-error-message'
import { MaqamPlayer } from '@/components/maqam/MaqamPlayer'
import {
  formatClock,
  formatCoverage,
  formatDateTime,
  formatFileSize,
  teacherLabel,
  voteProgress,
} from '@/components/maqam/maqam-helpers'
import { getMaqam, getMaqamListenSummary, getMaqamSessions } from '@/services/maqam'

// A bordered, horizontally-scrollable table block with a title + count.
function TableBlock({ title, count, children }) {
  return (
    <section className="space-y-2">
      <div className="flex items-center gap-2">
        <h3 className="text-sm font-semibold text-foreground">{title}</h3>
        {count != null ? (
          <span className="rounded-full bg-muted px-2 py-0.5 text-[11px] font-semibold text-muted-foreground">{count}</span>
        ) : null}
      </div>
      <div className="overflow-x-auto rounded-2xl border border-border bg-background">
        <table className="w-full min-w-[640px] border-collapse text-left text-sm">{children}</table>
      </div>
    </section>
  )
}

// Flatten the whole record into [label, value] rows so the details view can
// render EVERY field of each record as a table. Nested arrays/objects (votes,
// engagement) are shown in their own tables, so they're skipped here.
const SKIP_RECORD_KEYS = new Set(['teacherVotes', 'version', 'listenSummary', 'sessions'])
function flattenRecord(r, { formatClock: fc, formatFileSize: ffs, formatDateTime: fdt }) {
  const out = []
  for (const [k, v] of Object.entries(r || {})) {
    if (SKIP_RECORD_KEYS.has(k)) continue
    if (v == null || v === '') continue
    let value
    if (Array.isArray(v)) {
      const items = v.filter((x) => x != null && typeof x !== 'object').map((x) => String(x).trim()).filter(Boolean)
      if (!items.length) continue
      value = items.join('، ')
    } else if (typeof v === 'object') {
      continue
    } else if (typeof v === 'boolean') {
      value = v ? 'Yes' : 'No'
    } else if (k === 'durationSeconds') {
      value = fc(v)
    } else if (k === 'fileSize') {
      value = ffs(v)
    } else if (/(At|Date)$/.test(k) || /date/i.test(k)) {
      value = fdt(v)
    } else {
      value = String(v)
    }
    out.push({ key: k, label: humanizeFieldName(k), value })
  }
  return out
}

const TH = ({ children, className }) => (
  <th className={cn('whitespace-nowrap border-b border-border bg-muted/50 px-3 py-2.5 text-[11px] font-bold uppercase tracking-wide text-muted-foreground', className)}>{children}</th>
)
const TD = ({ children, className }) => (
  <td className={cn('border-b border-border/60 px-3 py-2.5 align-top text-foreground', className)}>{children}</td>
)

/**
 * Read-only full-detail view of one maqam record for admins: the complete
 * record plus EVERY assigned teacher's vote, note and listening engagement,
 * and the full per-session log — all shown at once as tables. The body scrolls
 * on both axes so nothing is ever clipped.
 *
 * Props: code (null closes), onClose, onEdit(record)?, onManage(record)?
 */
export function MaqamDetailsDialog({ code, onClose, onEdit, onManage }) {
  const toast = useToast()
  const [record, setRecord] = useState(null)
  const [summary, setSummary] = useState([])
  const [sessions, setSessions] = useState([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!code) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setRecord(null); setSummary([]); setSessions([])
      return undefined
    }
    let cancelled = false
    const ctrl = new AbortController()
    setLoading(true)
    Promise.all([
      getMaqam(code, { signal: ctrl.signal }),
      getMaqamListenSummary(code, { signal: ctrl.signal }).catch(() => []),
      getMaqamSessions(code, { size: 200, signal: ctrl.signal }).catch(() => null),
    ])
      .then(([rec, sum, sess]) => {
        if (cancelled) return
        setRecord(rec)
        setSummary(Array.isArray(sum) ? sum : [])
        const rows = Array.isArray(sess?.content) ? sess.content : Array.isArray(sess) ? sess : []
        setSessions(rows)
      })
      .catch((err) => { if (err?.code !== 'ERR_CANCELED') toast.apiError(err, 'Could not load the record.') })
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true; ctrl.abort() }
  }, [code, toast])

  useEffect(() => {
    if (!code) return undefined
    const onKey = (e) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [code, onClose])

  if (!code) return null

  const r = record || {}
  const votes = Array.isArray(r.teacherVotes) ? r.teacherVotes : []
  const { cast, total } = voteProgress(votes)

  return (
    <div
      className="fixed inset-0 z-[95] flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm"
      onMouseDown={(e) => { if (e.target === e.currentTarget) onClose() }}
      role="dialog"
      aria-modal="true"
    >
      <div className="flex max-h-[92vh] w-full max-w-5xl flex-col overflow-hidden rounded-2xl bg-card shadow-2xl ring-1 ring-black/10">
        {/* Header */}
        <div className="relative shrink-0 border-b border-border bg-gradient-to-b from-primary/[0.06] to-transparent">
          <div className="flex items-start justify-between gap-4 px-6 py-4">
            <div className="flex min-w-0 items-start gap-3">
              <div className="grid size-11 shrink-0 place-items-center rounded-2xl bg-primary text-primary-foreground shadow-sm shadow-primary/30">
                <Music4 className="size-5" />
              </div>
              <div className="min-w-0">
                <p className="truncate font-heading text-base font-semibold text-foreground">
                  {loading && !record ? 'Loading…' : r.songName || r.maqamCode || code}
                </p>
                <div className="mt-1 flex flex-wrap items-center gap-2">
                  <span className="font-mono text-[11px] text-muted-foreground">{r.maqamCode || code}</span>
                  {r.producer ? <span className="inline-flex items-center rounded-md bg-muted/60 px-2 py-0.5 text-[11px] text-muted-foreground">{r.producer}</span> : null}
                  <span className={cn(
                    'inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium',
                    cast >= total && total > 0 ? 'bg-green-500/15 text-green-600 dark:text-green-400' : 'bg-amber-500/15 text-amber-600 dark:text-amber-400',
                  )}>
                    <Users className="size-3" />{cast}/{total} voted
                  </span>
                  {r.durationSeconds ? (
                    <span className="inline-flex items-center gap-1 rounded-full border border-border bg-background px-2 py-0.5 text-[11px] text-muted-foreground">
                      <Clock className="size-3" />{formatClock(r.durationSeconds)}
                    </span>
                  ) : null}
                </div>
              </div>
            </div>
            <button type="button" onClick={onClose} className="grid size-8 shrink-0 place-items-center rounded-lg text-muted-foreground transition hover:bg-muted hover:text-foreground" aria-label="Close">
              <X className="size-4" />
            </button>
          </div>
        </div>

        {/* Body — everything at once; scrolls on both axes */}
        <div className="min-h-0 flex-1 space-y-5 overflow-auto px-6 py-5">
          {loading && !record ? (
            <div className="space-y-3">
              <Skeleton className="h-24 w-full rounded-2xl" />
              <Skeleton className="h-40 w-full rounded-2xl" />
              <Skeleton className="h-40 w-full rounded-2xl" />
            </div>
          ) : (
            <>
              {/* Recording */}
              <section className="rounded-2xl border border-border bg-background p-4">
                <h3 className="mb-3 text-sm font-semibold text-foreground">Recording</h3>
                <MaqamPlayer maqamCode={r.maqamCode || code} title={r.songName} subtitle={r.producer} />
              </section>

              {/* Full record details — every field of this record, as a table */}
              <TableBlock title="Record details">
                <tbody>
                  {flattenRecord(r, { formatClock, formatFileSize, formatDateTime }).map((f) => (
                    <tr key={f.key} className="hover:bg-muted/30">
                      <TH className="w-[34%] text-start font-semibold normal-case text-foreground">{f.label}</TH>
                      <TD className="whitespace-pre-line" style={{ overflowWrap: 'anywhere' }}>{f.value}</TD>
                    </tr>
                  ))}
                </tbody>
              </TableBlock>

              {/* Votes & notes table */}
              <TableBlock title="Teacher votes & notes" count={votes.length}>
                <thead>
                  <tr>
                    <TH>Teacher</TH><TH>Vote (maqam type)</TH><TH>Note</TH>
                    <TH className="text-end">Listened</TH><TH className="text-end">Furthest</TH><TH>Voted at</TH>
                  </tr>
                </thead>
                <tbody>
                  {votes.length === 0 ? (
                    <tr><TD colSpan={6} className="text-muted-foreground">No teachers assigned yet.</TD></tr>
                  ) : votes.map((v) => {
                    const hasVote = Boolean((v.maqamType ?? '').toString().trim() || v.votedAt)
                    return (
                      <tr key={v.voteId ?? v.teacherUserId} className="hover:bg-muted/30">
                        <TD className="font-semibold">{teacherLabel(v)}</TD>
                        <TD>
                          {hasVote ? (
                            <span className="inline-flex items-center rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-semibold text-primary">{v.maqamType || '—'}</span>
                          ) : (
                            <span className="text-xs italic text-muted-foreground/70">No vote yet</span>
                          )}
                        </TD>
                        <TD className="min-w-[200px] max-w-[360px] whitespace-pre-line text-muted-foreground" >{v.teacherNote || '—'}</TD>
                        <TD className="text-end tabular-nums">{formatClock(v.totalListenSeconds)}</TD>
                        <TD className="text-end tabular-nums">{formatClock(v.maxPositionSeconds)}</TD>
                        <TD className="whitespace-nowrap text-muted-foreground">{v.votedAt ? formatDateTime(v.votedAt) : '—'}</TD>
                      </tr>
                    )
                  })}
                </tbody>
              </TableBlock>

              {/* Engagement table */}
              <TableBlock title="Listening engagement" count={summary.length || null}>
                <thead>
                  <tr>
                    <TH>Teacher</TH><TH className="text-end">Total</TH><TH className="text-end">Furthest</TH>
                    <TH className="text-end">Sessions</TH><TH className="text-end">Coverage</TH>
                  </tr>
                </thead>
                <tbody>
                  {summary.length === 0 ? (
                    <tr><TD colSpan={5} className="text-muted-foreground">No listening recorded yet.</TD></tr>
                  ) : summary.map((s) => (
                    <tr key={s.teacherUserId} className="hover:bg-muted/30">
                      <TD className="font-semibold">{teacherLabel(s)}</TD>
                      <TD className="text-end tabular-nums">{formatClock(s.totalSeconds)}</TD>
                      <TD className="text-end tabular-nums">{formatClock(s.maxPositionSeconds)}</TD>
                      <TD className="text-end tabular-nums">{s.sessionCount ?? 0}</TD>
                      <TD className="text-end tabular-nums">{formatCoverage(s.coverageRatio)}</TD>
                    </tr>
                  ))}
                </tbody>
              </TableBlock>

              {/* Session log table */}
              <TableBlock title="Session log" count={sessions.length || null}>
                <thead>
                  <tr>
                    <TH>Teacher</TH><TH>Started</TH><TH className="text-end">Listened</TH><TH>IP</TH><TH>Device</TH>
                  </tr>
                </thead>
                <tbody>
                  {sessions.length === 0 ? (
                    <tr><TD colSpan={5} className="text-muted-foreground">No sessions recorded.</TD></tr>
                  ) : sessions.map((s) => (
                    <tr key={s.id ?? `${s.sessionKey}-${s.startedAt}`} className="hover:bg-muted/30">
                      <TD className="font-medium">{teacherLabel(s)}</TD>
                      <TD className="whitespace-nowrap text-muted-foreground">{formatDateTime(s.startedAt)}</TD>
                      <TD className="text-end tabular-nums">{formatClock(s.secondsListened)}</TD>
                      <TD className="whitespace-nowrap font-mono text-[11px] text-muted-foreground">{s.ipAddress || '—'}</TD>
                      <TD className="max-w-[220px] truncate text-[11px] text-muted-foreground" >{s.userAgent || '—'}</TD>
                    </tr>
                  ))}
                </tbody>
              </TableBlock>
            </>
          )}
        </div>

        {/* Footer */}
        <div className="flex shrink-0 items-center justify-end gap-2 border-t border-border px-6 py-4">
          {onManage ? (
            <Button type="button" variant="outline" className="gap-2" disabled={loading && !record} onClick={() => onManage(r)}>
              <Users className="size-4" /> Manage teachers
            </Button>
          ) : null}
          {onEdit ? (
            <Button type="button" variant="outline" className="gap-2" disabled={loading && !record} onClick={() => onEdit(r)}>
              <Pencil className="size-4" /> Edit
            </Button>
          ) : null}
          <Button type="button" onClick={onClose}>Close</Button>
        </div>
      </div>
    </div>
  )
}
