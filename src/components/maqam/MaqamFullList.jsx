import { Eye, Trash2 } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { CodeBadge } from '@/components/ui/code-badge'
import { cn } from '@/lib/utils'
import { teacherLabel } from '@/components/maqam/maqam-helpers'

// One row per record, with every teacher's vote + note and the archive note —
// a single comprehensive table over all records. Horizontally scrollable so
// nothing is clipped. "Show details" + Trash actions per row are preserved.
export function MaqamFullList({ rows, onDetails, onTrash }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[920px] border-collapse text-left text-sm">
        <thead>
          <tr className="border-b border-border bg-muted/40 text-[11px] font-bold uppercase tracking-wide text-muted-foreground">
            <th className="w-[44px] px-3 py-2.5 text-center">#</th>
            <th className="px-3 py-2.5">Code</th>
            <th className="px-3 py-2.5">Song</th>
            <th className="px-3 py-2.5">Producer</th>
            <th className="px-3 py-2.5">Teacher votes &amp; notes</th>
            <th className="px-3 py-2.5">Archive note</th>
            <th className="px-3 py-2.5 text-right">Actions</th>
          </tr>
        </thead>
        <tbody>
          {(rows || []).map((r, index) => {
            const votes = Array.isArray(r.teacherVotes) ? r.teacherVotes : []
            return (
              <tr key={r.maqamCode} className="border-b border-border/60 align-top hover:bg-muted/20">
                <td className="px-3 py-3 text-center text-xs tabular-nums text-muted-foreground">{index + 1}</td>
                <td className="px-3 py-3"><CodeBadge code={r.maqamCode} size="sm" /></td>
                <td className="min-w-[160px] max-w-[240px] px-3 py-3">
                  <p className="font-semibold text-foreground" style={{ overflowWrap: 'anywhere' }}>{r.songName || '—'}</p>
                </td>
                <td className="min-w-[120px] max-w-[200px] px-3 py-3 text-muted-foreground" style={{ overflowWrap: 'anywhere' }}>
                  {r.producer || '—'}
                </td>
                <td className="min-w-[280px] px-3 py-3">
                  {votes.length === 0 ? (
                    <span className="text-xs italic text-muted-foreground/60">No teachers assigned</span>
                  ) : (
                    <div className="space-y-2">
                      {votes.map((v) => {
                        const hasVote = Boolean((v.maqamType ?? '').toString().trim() || v.votedAt)
                        return (
                          <div key={v.voteId ?? v.teacherUserId} className="rounded-lg border border-border bg-background px-2.5 py-1.5">
                            <div className="flex flex-wrap items-center gap-1.5">
                              <span className="text-[13px] font-semibold text-foreground">{teacherLabel(v)}</span>
                              {hasVote ? (
                                <span className="inline-flex items-center rounded-full bg-primary/10 px-2 py-0.5 text-[11px] font-semibold text-primary">{v.maqamType || '—'}</span>
                              ) : (
                                <span className="text-[11px] italic text-muted-foreground/60">no vote</span>
                              )}
                            </div>
                            {v.teacherNote ? (
                              <p className="mt-1 whitespace-pre-line text-[12px] leading-5 text-muted-foreground" style={{ overflowWrap: 'anywhere' }}>{v.teacherNote}</p>
                            ) : null}
                          </div>
                        )
                      })}
                    </div>
                  )}
                </td>
                <td className="min-w-[200px] max-w-[320px] px-3 py-3">
                  {r.archiveNote ? (
                    <p className="whitespace-pre-line text-[13px] leading-6 text-foreground" style={{ overflowWrap: 'anywhere' }}>{r.archiveNote}</p>
                  ) : (
                    <span className="text-xs italic text-muted-foreground/50">—</span>
                  )}
                </td>
                <td className="px-3 py-3">
                  <div className={cn('flex items-center justify-end gap-1.5')}>
                    <Button type="button" variant="outline" size="sm" className="gap-1.5 whitespace-nowrap" onClick={() => onDetails(r.maqamCode)}>
                      <Eye className="size-3.5" /> Show details
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon-sm"
                      aria-label="Move to trash"
                      className="text-muted-foreground hover:text-destructive"
                      onClick={() => onTrash(r)}
                    >
                      <Trash2 className="size-3.5" />
                    </Button>
                  </div>
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
