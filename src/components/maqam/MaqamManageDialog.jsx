import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  BarChart3,
  Clock,
  Eye,
  Gauge,
  Loader2,
  Save,
  Trash2,
  UserCog,
  Users,
  X,
} from 'lucide-react'

import { Button } from '@/components/ui/button'
import { SearchSelect } from '@/components/ui/search-select'
import { useToast } from '@/hooks/use-toast'
import { cn } from '@/lib/utils'
import {
  MAX_TEACHERS,
  MIN_TEACHERS,
  formatClock,
  formatCoverage,
  formatDateTime,
  teacherLabel,
} from '@/components/maqam/maqam-helpers'
import {
  clearMaqamVote,
  getMaqamListenSummary,
  getMaqamSessions,
  getTeacherSessions,
  replaceMaqamTeachers,
} from '@/services/maqam'

/**
 * Admin management surface for a single maqam record:
 *   • Panel tab    — replace the 1–3 teacher roster, clear individual votes.
 *   • Engagement   — per-teacher listen summary, per-record session log (with
 *                    IP / user-agent PII), and a teacher's full cross-record
 *                    session history.
 *
 * Props:
 *   open, onOpenChange
 *   record           the MaqamResponse
 *   teacherOptions   [{ id, username, name }] active TEACHER users
 *   onChanged(record)  called with the updated MaqamResponse after a mutation
 */
export function MaqamManageDialog({ open, onOpenChange, record, teacherOptions = [], onChanged }) {
  const toast = useToast()
  const [tab, setTab] = useState('panel')

  // Roster editing
  const [rosterIds, setRosterIds] = useState([])
  const [savingRoster, setSavingRoster] = useState(false)
  const [clearingId, setClearingId] = useState(null)

  // Engagement
  const [summary, setSummary] = useState(null)
  const [sessions, setSessions] = useState(null)
  const [engLoading, setEngLoading] = useState(false)
  const [expandedTeacher, setExpandedTeacher] = useState(null)
  const [teacherHistory, setTeacherHistory] = useState({}) // userId -> sessions[]
  const [historyLoadingId, setHistoryLoadingId] = useState(null)

  const code = record?.maqamCode
  const votes = useMemo(() => (Array.isArray(record?.teacherVotes) ? record.teacherVotes : []), [record])

  useEffect(() => {
    if (!open) return
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setTab('panel')
    setRosterIds(votes.map((v) => v.teacherUserId).filter((id) => id != null))
    setSummary(null)
    setSessions(null)
    setExpandedTeacher(null)
    setTeacherHistory({})
  }, [open, votes])

  useEffect(() => {
    if (!open) return undefined
    const onKey = (e) => {
      if (e.key === 'Escape' && !savingRoster && clearingId == null) onOpenChange(false)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, savingRoster, clearingId, onOpenChange])

  const loadEngagement = useCallback(async () => {
    if (!code) return
    setEngLoading(true)
    try {
      const [sum, sess] = await Promise.all([
        getMaqamListenSummary(code),
        getMaqamSessions(code, { page: 0, size: 200 }),
      ])
      setSummary(Array.isArray(sum) ? sum : [])
      const rows = Array.isArray(sess?.content) ? sess.content : Array.isArray(sess) ? sess : []
      setSessions(rows)
    } catch (err) {
      toast.apiError(err, 'Could not load engagement')
      setSummary([])
      setSessions([])
    } finally {
      setEngLoading(false)
    }
  }, [code, toast])

  useEffect(() => {
    if (open && tab === 'engagement' && summary == null && !engLoading) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      loadEngagement()
    }
  }, [open, tab, summary, engLoading, loadEngagement])

  if (!open || !record) return null

  const availableTeachers = teacherOptions.filter((t) => !rosterIds.includes(t.id))
  const pickedTeachers = rosterIds
    .map((id) => teacherOptions.find((t) => t.id === id) || { id, username: `#${id}`, name: null })
    .filter(Boolean)

  const rosterDirty =
    rosterIds.length !== votes.length ||
    rosterIds.some((id) => !votes.find((v) => v.teacherUserId === id))
  const rosterValid = rosterIds.length >= MIN_TEACHERS && rosterIds.length <= MAX_TEACHERS

  const addTeacher = (id) => {
    const numeric = Number(id)
    if (!numeric || rosterIds.includes(numeric) || rosterIds.length >= MAX_TEACHERS) return
    setRosterIds((prev) => [...prev, numeric])
  }
  const removeTeacher = (id) => setRosterIds((prev) => prev.filter((x) => x !== id))

  const handleSaveRoster = async () => {
    if (!rosterValid || savingRoster) return
    setSavingRoster(true)
    try {
      const updated = await replaceMaqamTeachers(code, rosterIds)
      toast.success('Panel updated', 'The teacher panel was saved.')
      onChanged?.(updated)
    } catch (err) {
      toast.apiError(err, 'Could not update panel')
    } finally {
      setSavingRoster(false)
    }
  }

  const handleClearVote = async (teacherUserId) => {
    setClearingId(teacherUserId)
    try {
      const updated = await clearMaqamVote(code, teacherUserId)
      toast.success('Vote cleared', 'The teacher can vote again.')
      onChanged?.(updated)
    } catch (err) {
      toast.apiError(err, 'Could not clear vote')
    } finally {
      setClearingId(null)
    }
  }

  const toggleTeacherHistory = async (teacherUserId) => {
    if (expandedTeacher === teacherUserId) {
      setExpandedTeacher(null)
      return
    }
    setExpandedTeacher(teacherUserId)
    if (teacherHistory[teacherUserId]) return
    setHistoryLoadingId(teacherUserId)
    try {
      const data = await getTeacherSessions(teacherUserId, { page: 0, size: 200 })
      const rows = Array.isArray(data?.content) ? data.content : Array.isArray(data) ? data : []
      setTeacherHistory((prev) => ({ ...prev, [teacherUserId]: rows }))
    } catch (err) {
      toast.apiError(err, 'Could not load history')
      setTeacherHistory((prev) => ({ ...prev, [teacherUserId]: [] }))
    } finally {
      setHistoryLoadingId(null)
    }
  }

  return (
    <div
      className="fixed inset-0 z-[95] flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget && !savingRoster && clearingId == null) onOpenChange(false)
      }}
      role="dialog"
      aria-modal="true"
    >
      <div
        className="flex w-full max-w-3xl flex-col overflow-hidden rounded-2xl bg-card shadow-2xl ring-1 ring-black/10"
        style={{ height: 'min(90vh, 760px)' }}
      >
        {/* Header */}
        <div className="flex shrink-0 items-center justify-between gap-4 border-b border-border px-6 py-4">
          <div className="flex min-w-0 items-center gap-3">
            <div className="grid size-9 place-items-center rounded-xl bg-primary text-primary-foreground">
              <UserCog className="size-4.5" />
            </div>
            <div className="min-w-0">
              <p className="truncate text-sm font-bold text-foreground">{record.songName}</p>
              <p className="truncate font-mono text-[11px] text-muted-foreground">{record.maqamCode}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => onOpenChange(false)}
            className="grid size-8 place-items-center rounded-lg text-muted-foreground transition hover:bg-muted hover:text-foreground"
            aria-label="Close"
          >
            <X className="size-4" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex shrink-0 gap-1 border-b border-border px-4">
          {[
            { key: 'panel', label: 'Panel & votes', icon: Users },
            { key: 'engagement', label: 'Engagement', icon: BarChart3 },
          ].map(({ key, label, icon: Icon }) => (
            <button
              key={key}
              type="button"
              onClick={() => setTab(key)}
              className={cn(
                'flex items-center gap-1.5 border-b-2 px-3 py-2.5 text-sm font-medium transition-colors',
                tab === key
                  ? 'border-primary text-primary'
                  : 'border-transparent text-muted-foreground hover:text-foreground',
              )}
            >
              <Icon className="size-4" />
              {label}
            </button>
          ))}
        </div>

        {/* Body */}
        <div className="min-h-0 flex-1 overflow-y-auto px-6 py-5">
          {tab === 'panel' ? (
            <div className="space-y-6">
              {/* Roster editor */}
              <section className="space-y-3">
                <h3 className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground">
                  Teacher panel ({rosterIds.length}/{MAX_TEACHERS})
                </h3>
                {pickedTeachers.length > 0 ? (
                  <div className="flex flex-wrap gap-1.5">
                    {pickedTeachers.map((t) => (
                      <span
                        key={t.id}
                        className="inline-flex items-center gap-1.5 rounded-full border border-primary/30 bg-primary/10 px-2.5 py-1 text-xs font-medium text-primary"
                      >
                        {t.name || t.username}
                        <button
                          type="button"
                          onClick={() => removeTeacher(t.id)}
                          className="text-primary/70 transition hover:text-primary"
                          aria-label="Remove from panel"
                        >
                          <X className="size-3" />
                        </button>
                      </span>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-muted-foreground">No teachers assigned yet.</p>
                )}
                {rosterIds.length < MAX_TEACHERS ? (
                  <SearchSelect
                    items={availableTeachers}
                    value=""
                    onChange={addTeacher}
                    getKey={(t) => String(t.id)}
                    getLabel={(t) => t.name || t.username}
                    getSubtitle={(t) => t.username}
                    placeholder="Search teachers to add…"
                    emptyHint="No matching teachers"
                  />
                ) : null}
                <div className="flex items-center justify-between gap-3">
                  <p className="text-[11px] text-muted-foreground">
                    A panel must hold {MIN_TEACHERS}–{MAX_TEACHERS} distinct teachers.
                  </p>
                  <Button
                    type="button"
                    size="sm"
                    className="gap-1.5"
                    disabled={!rosterDirty || !rosterValid || savingRoster}
                    onClick={handleSaveRoster}
                  >
                    {savingRoster ? <Loader2 className="size-3.5 animate-spin" /> : <Save className="size-3.5" />}
                    Save panel
                  </Button>
                </div>
              </section>

              {/* Votes */}
              <section className="space-y-3">
                <h3 className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground">
                  Votes
                </h3>
                {votes.length === 0 ? (
                  <p className="text-xs text-muted-foreground">No teachers on the panel yet.</p>
                ) : (
                  <div className="space-y-2">
                    {votes.map((v) => {
                      const hasVote = Boolean((v.maqamType ?? '').toString().trim() || v.votedAt)
                      return (
                        <div
                          key={v.voteId ?? v.teacherUserId}
                          className="flex flex-wrap items-center gap-3 rounded-xl border border-border bg-background px-4 py-3"
                        >
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-sm font-semibold text-foreground">
                              {teacherLabel(v)}
                            </p>
                            {hasVote ? (
                              <p className="text-xs text-muted-foreground">
                                <span className="font-medium text-foreground">{v.maqamType || '—'}</span>
                                {v.teacherNote ? ` · ${v.teacherNote}` : ''}
                              </p>
                            ) : (
                              <p className="text-xs italic text-muted-foreground/70">No vote yet</p>
                            )}
                            <p className="mt-0.5 text-[11px] text-muted-foreground/80">
                              Listened {formatClock(v.totalListenSeconds)} · furthest{' '}
                              {formatClock(v.maxPositionSeconds)}
                              {v.votedAt ? ` · voted ${formatDateTime(v.votedAt)}` : ''}
                            </p>
                          </div>
                          {hasVote ? (
                            <Button
                              type="button"
                              variant="destructive"
                              size="sm"
                              className="gap-1.5"
                              disabled={clearingId === v.teacherUserId}
                              onClick={() => handleClearVote(v.teacherUserId)}
                            >
                              {clearingId === v.teacherUserId ? (
                                <Loader2 className="size-3.5 animate-spin" />
                              ) : (
                                <Trash2 className="size-3.5" />
                              )}
                              Clear vote
                            </Button>
                          ) : null}
                        </div>
                      )
                    })}
                  </div>
                )}
              </section>
            </div>
          ) : (
            <div className="space-y-6">
              {engLoading && summary == null ? (
                <div className="flex items-center justify-center gap-2 py-16 text-sm text-muted-foreground">
                  <Loader2 className="size-4 animate-spin" /> Loading engagement…
                </div>
              ) : (
                <>
                  {/* Per-teacher summary */}
                  <section className="space-y-3">
                    <h3 className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground">
                      Per-teacher listening
                    </h3>
                    {!summary || summary.length === 0 ? (
                      <p className="text-xs text-muted-foreground">No listening recorded yet.</p>
                    ) : (
                      <div className="space-y-2">
                        {summary.map((s) => (
                          <div
                            key={s.teacherUserId}
                            className="rounded-xl border border-border bg-background px-4 py-3"
                          >
                            <div className="flex flex-wrap items-center gap-3">
                              <p className="min-w-0 flex-1 truncate text-sm font-semibold text-foreground">
                                {teacherLabel(s)}
                              </p>
                              <button
                                type="button"
                                onClick={() => toggleTeacherHistory(s.teacherUserId)}
                                className="inline-flex items-center gap-1 rounded-lg border border-border bg-background px-2 py-1 text-[11px] font-medium text-muted-foreground transition hover:bg-muted hover:text-foreground"
                              >
                                <Eye className="size-3" />
                                All sessions
                              </button>
                            </div>
                            <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-4">
                              <Stat icon={Clock} label="Total" value={formatClock(s.totalSeconds)} />
                              <Stat icon={Gauge} label="Furthest" value={formatClock(s.maxPositionSeconds)} />
                              <Stat icon={BarChart3} label="Sessions" value={s.sessionCount ?? 0} />
                              <Stat icon={Gauge} label="Coverage" value={formatCoverage(s.coverageRatio)} />
                            </div>
                            {expandedTeacher === s.teacherUserId ? (
                              <div className="mt-3 border-t border-border pt-3">
                                {historyLoadingId === s.teacherUserId ? (
                                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                    <Loader2 className="size-3.5 animate-spin" /> Loading history…
                                  </div>
                                ) : (
                                  <SessionTable rows={teacherHistory[s.teacherUserId] || []} showCode />
                                )}
                              </div>
                            ) : null}
                          </div>
                        ))}
                      </div>
                    )}
                  </section>

                  {/* Per-record session log */}
                  <section className="space-y-3">
                    <h3 className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground">
                      Session log (this record)
                    </h3>
                    <SessionTable rows={sessions || []} />
                  </section>
                </>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

function Stat({ icon: Icon, label, value }) {
  return (
    <div className="flex items-center gap-2 rounded-lg bg-muted/40 px-2.5 py-1.5">
      <Icon className="size-3.5 shrink-0 text-muted-foreground" />
      <div className="min-w-0">
        <p className="truncate text-sm font-semibold tabular-nums text-foreground">{value}</p>
        <p className="text-[10px] uppercase tracking-wide text-muted-foreground">{label}</p>
      </div>
    </div>
  )
}

// Renders a compact session table. Admin responses carry ipAddress / userAgent;
// they're shown when present.
function SessionTable({ rows, showCode = false }) {
  if (!rows || rows.length === 0) {
    return <p className="text-xs text-muted-foreground">No sessions recorded.</p>
  }
  return (
    <div className="overflow-x-auto rounded-xl border border-border">
      <table className="w-full text-left text-xs">
        <thead className="bg-muted/40 text-[10px] uppercase tracking-wide text-muted-foreground">
          <tr>
            <th className="px-3 py-2 font-semibold">Teacher</th>
            {showCode ? <th className="px-3 py-2 font-semibold">Record</th> : null}
            <th className="px-3 py-2 font-semibold">Started</th>
            <th className="px-3 py-2 font-semibold">Listened</th>
            <th className="px-3 py-2 font-semibold">IP</th>
            <th className="px-3 py-2 font-semibold">Device</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.id ?? `${r.sessionKey}-${r.startedAt}`} className="border-t border-border">
              <td className="px-3 py-2 font-medium text-foreground">{teacherLabel(r)}</td>
              {showCode ? <td className="px-3 py-2 font-mono text-[10px] text-muted-foreground">{r.maqamCode}</td> : null}
              <td className="px-3 py-2 text-muted-foreground">{formatDateTime(r.startedAt)}</td>
              <td className="px-3 py-2 tabular-nums text-foreground">{formatClock(r.secondsListened)}</td>
              <td className="px-3 py-2 font-mono text-[10px] text-muted-foreground">{r.ipAddress || '—'}</td>
              <td className="max-w-[160px] truncate px-3 py-2 text-muted-foreground" title={r.userAgent || ''}>
                {r.userAgent || '—'}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
