import { useCallback, useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { AlertTriangle, CheckCircle2, History, Play, RefreshCw, Search } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { EmptyState } from '@/components/ui/empty-state'
import { Input } from '@/components/ui/input'
import { DataPagination } from '@/components/ui/pagination'
import { Skeleton } from '@/components/ui/skeleton'
import { cn } from '@/lib/utils'
import { ku } from '@/lib/maqam-i18n'
import { usePersistentState } from '@/hooks/use-persistent-state'
import { formatDateTime } from '@/components/maqam/maqam-helpers'
import { getMyRecentMaqam } from '@/services/maqam'

const PAGE_SIZE = 25

// Teacher "where was I?" dashboard — every record they're attached to, newest
// activity first, with vote status, their note and a resume affordance. No
// internal codes are shown (teacher surface).
function TeacherRecentPage() {
  const navigate = useNavigate()

  const [rows, setRows] = useState(null)
  const [meta, setMeta] = useState(null)
  // Not persisted: the debounced-search effect resets this to 0 on mount.
  const [page, setPage] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [search, setSearch] = usePersistentState('teacher.recent.search', '')
  const [debounced, setDebounced] = useState('')

  // Debounce the search box (~250ms) and reset to the first page on new terms.
  useEffect(() => {
    const id = setTimeout(() => { setDebounced(search.trim()); setPage(0) }, 250)
    return () => clearTimeout(id)
  }, [search])

  const load = useCallback(async (nextPage, q, opts = {}) => {
    setLoading(true)
    if (!opts.silent) setError('')
    const ctrl = new AbortController()
    try {
      const data = await getMyRecentMaqam({ q, page: nextPage, size: PAGE_SIZE, signal: ctrl.signal })
      const content = Array.isArray(data?.content) ? data.content : Array.isArray(data) ? data : []
      setRows(content)
      setMeta({
        page: data?.number ?? nextPage,
        totalPages: data?.totalPages ?? Math.ceil(content.length / PAGE_SIZE),
        totalElements: data?.totalElements ?? content.length,
        size: data?.size ?? PAGE_SIZE,
      })
    } catch (err) {
      if (err?.code !== 'ERR_CANCELED') setError(err?.response?.data?.message || err?.message || ku.errorLoad)
    } finally {
      setLoading(false)
    }
    return () => ctrl.abort()
  }, [])

  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => { load(page, debounced) }, [load, page, debounced])
  /* eslint-enable react-hooks/set-state-in-effect */

  const total = meta?.totalElements

  return (
    <section className="space-y-6" dir="rtl">
      {/* Header */}
      <div className="flex flex-col gap-4 border-b border-border pb-5 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0 space-y-1.5">
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="font-heading text-2xl font-semibold tracking-tight text-foreground sm:text-[1.7rem]">
              {ku.recentTitle}
            </h1>
            {total != null ? (
              <span className="inline-flex items-center rounded-full border bg-muted/40 px-2.5 py-0.5 text-xs font-medium text-muted-foreground">
                {total.toLocaleString()}
              </span>
            ) : null}
          </div>
          <p className="max-w-2xl text-sm leading-7 text-muted-foreground">{ku.recentSubtitle}</p>
        </div>
        <Button type="button" variant="outline" className="shrink-0 gap-2" onClick={() => load(page, debounced)} disabled={loading}>
          <RefreshCw className={cn('size-4', loading && 'animate-spin')} />
          {ku.refresh}
        </Button>
      </div>

      {/* Search */}
      <div className="relative w-full sm:max-w-md">
        <Search className="pointer-events-none absolute right-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder={ku.recentSearch}
          className="pr-9"
        />
      </div>

      {error ? (
        <Card className="border-destructive/40 bg-destructive/5">
          <CardContent className="flex items-center gap-3 px-4 py-3">
            <AlertTriangle className="size-4 shrink-0 text-destructive" />
            <p className="flex-1 text-sm text-destructive">{error}</p>
            <Button type="button" variant="outline" size="sm" onClick={() => load(page, debounced)}>{ku.retry}</Button>
          </CardContent>
        </Card>
      ) : null}

      {loading && !rows ? (
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-28 w-full rounded-2xl" />)}
        </div>
      ) : !rows || rows.length === 0 ? (
        <div className="py-10">
          <EmptyState icon={History} title={ku.recentEmptyTitle} description={ku.recentEmptyDescription} />
        </div>
      ) : (
        <ul className="space-y-2.5">
          {rows.map((r, idx) => {
            const hasVoted = Boolean(r.hasVoted ?? ((r.maqamType ?? '').toString().trim() || r.votedAt))
            const isLatest = idx === 0 && page === 0 && !debounced // the most recent record
            // Open inside the maqam review console (list page) focused on this
            // record — richer than the bare detail page (vote form, other
            // teachers, next/prev). The list page consumes `?code=`.
            const goto = () => navigate(`/teacher?code=${encodeURIComponent(r.maqamCode)}`)
            return (
              <li key={r.voteId ?? r.maqamCode}>
                <Card
                  className={cn(
                    'border bg-card transition-colors',
                    isLatest
                      ? 'border-primary/45 bg-primary/[0.05] shadow-md shadow-primary/10 ring-1 ring-primary/20'
                      : 'border-border shadow-sm shadow-black/5 hover:border-primary/30',
                  )}
                >
                  <CardContent className="space-y-2.5 px-5 py-4">
                    {isLatest ? (
                      <span className="inline-flex items-center gap-1.5 rounded-full bg-primary px-2.5 py-0.5 text-[11px] font-semibold text-primary-foreground">
                        <Play className="size-3" />
                        {ku.recentLatest}
                      </span>
                    ) : null}
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <button
                          type="button"
                          onClick={goto}
                          className={cn(
                            'block max-w-full truncate text-start font-heading font-semibold text-foreground transition-colors hover:text-primary',
                            isLatest ? 'text-xl' : 'text-lg',
                          )}
                          title={r.songName}
                        >
                          {r.songName || '—'}
                        </button>
                        <p className="mt-0.5 truncate text-sm text-muted-foreground">
                          <span className="text-muted-foreground/70">{ku.byProducer}: </span>{r.producer || '—'}
                        </p>
                        <p className="mt-0.5 text-[12px] text-muted-foreground/80">
                          {ku.lastWorked} {r.lastActivityAt ? formatDateTime(r.lastActivityAt) : ku.never}
                        </p>
                      </div>
                      {hasVoted ? (
                        <span className="inline-flex shrink-0 items-center gap-1.5 rounded-full bg-green-500/15 px-3 py-1 text-xs font-semibold text-green-600 dark:text-green-400">
                          <CheckCircle2 className="size-3.5" />
                          {ku.voted}{r.maqamType ? `: ${r.maqamType}` : ''}
                        </span>
                      ) : (
                        <span className="inline-flex shrink-0 items-center rounded-full bg-amber-500/15 px-3 py-1 text-xs font-semibold text-amber-600 dark:text-amber-400">
                          {ku.votePending}
                        </span>
                      )}
                    </div>

                    {r.teacherNote ? (
                      <p className="rounded-xl bg-muted/40 px-3 py-2 text-sm leading-7 text-foreground" style={{ overflowWrap: 'anywhere' }}>
                        «{r.teacherNote}»
                      </p>
                    ) : null}

                    <div>
                      <Button type="button" size="sm" variant={isLatest ? 'default' : 'outline'} className="gap-1.5" onClick={goto}>
                        <Play className="size-3.5" />
                        {ku.openRecord}
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </li>
            )
          })}
        </ul>
      )}

      {meta && meta.totalPages > 1 ? (
        <DataPagination
          page={meta.page}
          totalPages={meta.totalPages}
          totalElements={meta.totalElements}
          pageSize={meta.size}
          onPageChange={setPage}
          className="mt-4"
        />
      ) : null}
    </section>
  )
}

export { TeacherRecentPage }
