import { useCallback, useEffect, useMemo, useState } from 'react'
import { DataPagination } from '@/components/ui/pagination'
import { Link, useParams } from 'react-router-dom'
import {
  Activity,
  ArrowLeft,
  Calendar,
  Clock,
  Eye,
  Pencil,
  Plus,
  RefreshCw,
  RotateCcw,
  Search,
  Trash2,
  UserCircle2,
  Users,
} from 'lucide-react'

import { AdminEntityPage } from '@/components/admin/AdminEntityPage'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { EmptyState } from '@/components/ui/empty-state'
import { Skeleton } from '@/components/ui/skeleton'
import { cn } from '@/lib/utils'
import { getErrorMessage } from '@/lib/get-error-message'
import { getAnalyticsFeed, getUserAnalytics } from '@/services/analytics'
import {
  ENTITY_META,
  formatNumber,
  formatRelative,
  isHiddenAction,
  resolveDateFilter,
  unwrapFeedPage,
} from '@/pages/admin/analytics-constants'
import {
  DailyChart,
  DateRangeFilter,
  ErrorCard,
  FeedRow,
  StatCard,
} from '@/pages/admin/analytics-shared'

// Each per-action total card on the activity strip. Six fixed columns so
// the layout is stable regardless of which actions a user actually has.
const ACTION_COLUMNS = [
  { key: 'created',  label: 'Created',  icon: Plus,      accent: 'text-emerald-600 dark:text-emerald-400' },
  { key: 'updated',  label: 'Updated',  icon: Pencil,    accent: 'text-amber-600 dark:text-amber-400' },
  { key: 'deleted',  label: 'Deleted',  icon: Trash2,    accent: 'text-rose-600 dark:text-rose-400' },
  { key: 'restored', label: 'Restored', icon: RotateCcw, accent: 'text-sky-600 dark:text-sky-400' },
  { key: 'viewed',   label: 'Viewed',   icon: Eye,       accent: 'text-muted-foreground' },
  { key: 'searched', label: 'Searched', icon: Search,    accent: 'text-muted-foreground' },
]

// Page size for the user's activity feed. Initial page comes embedded
// in UserActivityDTO.recent (FeedPageDTO); page nav uses /feed?actor=
// at the same size so page indexes line up.
const RECENT_PAGE_SIZE = 50

function AdminUserActivityPage() {
  const { username } = useParams()

  // Date range state, mirroring AdminAnalyticsPage.
  const [dateMode, setDateMode] = useState('preset')
  const [days, setDays] = useState(30)
  const [fromDate, setFromDate] = useState('')
  const [toDate, setToDate] = useState('')
  const dateFilter = useMemo(
    () => resolveDateFilter({ mode: dateMode, days, from: fromDate, to: toDate }),
    [dateMode, days, fromDate, toDate],
  )

  const [activity, setActivity] = useState(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')

  // Recent feed pagination. The initial activity load embeds page 0 in
  // `activity.recent`; subsequent pages come from /feed?actor=username
  // and replace `recentPageItems` / `recentPageMeta`. When the user
  // navigates back to page 0 we re-show the embedded slice without a
  // round-trip, so initial-load and page-0-after-nav are visually the
  // same.
  const [recentPage, setRecentPage] = useState(0)
  const [recentPageItems, setRecentPageItems] = useState(null)
  const [recentPageMeta, setRecentPageMeta] = useState(null)
  const [isLoadingFeed, setIsLoadingFeed] = useState(false)

  const load = useCallback(async () => {
    if (!username) return
    if (!dateFilter) return
    setIsLoading(true)
    setError('')
    try {
      const data = await getUserAnalytics(username, {
        ...dateFilter,
        page: 0,
        size: RECENT_PAGE_SIZE,
      })
      setActivity(data || null)
      setRecentPage(0)
      // Seed the recent-page state from the embedded FeedPageDTO so the
      // pagination control has totals/hasNext on first paint.
      const { items, meta } = unwrapFeedPage(data?.recent)
      setRecentPageItems(items)
      setRecentPageMeta(meta)
    } catch (err) {
      setError(getErrorMessage(err, 'Failed to load user activity'))
    } finally {
      setIsLoading(false)
    }
  }, [username, dateFilter])

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load()
  }, [load])

  // Page navigation — fetches the requested page from /feed?actor=...
  // and replaces the visible slice. Page 0 short-circuits to the
  // embedded slice we already have on `activity.recent`.
  const loadFeedPage = useCallback(
    async (page) => {
      if (!username || !dateFilter) return
      if (page === 0 && activity?.recent) {
        const { items, meta } = unwrapFeedPage(activity.recent)
        setRecentPageItems(items)
        setRecentPageMeta(meta)
        return
      }
      setIsLoadingFeed(true)
      try {
        const data = await getAnalyticsFeed({
          ...dateFilter,
          actor: username,
          page,
          size: RECENT_PAGE_SIZE,
        })
        const { items, meta } = unwrapFeedPage(data)
        setRecentPageItems(items)
        setRecentPageMeta(meta)
      } catch (err) {
        setError(getErrorMessage(err, 'Failed to load activity page'))
      } finally {
        setIsLoadingFeed(false)
      }
    },
    [username, dateFilter, activity],
  )

  // Re-fetch when the user navigates pages. Intentionally only depends
  // on `recentPage` so the initial load doesn't re-trigger here.
  useEffect(() => {
    if (!activity) return
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadFeedPage(recentPage)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [recentPage])

  // LIST events are hidden in render — they're noisy for admins.
  const recent = (recentPageItems ?? []).filter((item) => !isHiddenAction(item?.action))

  // Sum totals across entities for the headline strip when the backend
  // doesn't surface them at the top level. Defensive — uses what's there.
  const totals = (() => {
    if (!activity) return null
    const out = {
      total: activity.totalActions ?? 0,
      created: 0,
      updated: 0,
      deleted: 0,
      restored: 0,
      viewed: 0,
      searched: 0,
    }
    const byEntity = activity.byEntity ?? {}
    for (const stats of Object.values(byEntity)) {
      out.created  += Number(stats.created  ?? 0)
      out.updated  += Number(stats.updated  ?? 0)
      out.deleted  += Number(stats.deleted  ?? 0)
      out.restored += Number(stats.restored ?? 0)
      out.viewed   += Number(stats.viewed   ?? 0)
      out.searched += Number(stats.searched ?? 0)
    }
    return out
  })()

  const displayName = activity?.displayName || activity?.username || username

  return (
    <AdminEntityPage
      title={
        <span className="inline-flex items-center gap-3">
          <span className="flex size-10 items-center justify-center rounded-full bg-primary/10 text-primary">
            <UserCircle2 className="size-6" />
          </span>
          <span>{displayName}</span>
        </span>
      }
      description={
        activity?.username && activity.username !== displayName
          ? `@${activity.username} — actions across the archive in the selected window.`
          : 'Actions across the archive in the selected window.'
      }
      action={
        <div className="flex flex-wrap items-center gap-2">
          <Link
            to="/admin/analytics"
            className="inline-flex h-8 items-center gap-1.5 rounded-md border border-border bg-background px-2.5 text-sm font-medium text-foreground hover:bg-muted"
          >
            <ArrowLeft className="size-4" />
            Back
          </Link>
          <DateRangeFilter
            mode={dateMode}
            setMode={setDateMode}
            days={days}
            setDays={setDays}
            from={fromDate}
            setFrom={setFromDate}
            to={toDate}
            setTo={setToDate}
          />
          <Button
            type="button"
            variant="outline"
            className="gap-2"
            onClick={load}
            disabled={isLoading || !dateFilter}
          >
            <RefreshCw className={`size-4 ${isLoading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>
      }
    >
      {error ? <ErrorCard message={error} onRetry={load} /> : null}

      {/* Identity strip */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Total actions"
          value={totals?.total ?? null}
          icon={Activity}
          accent="text-primary"
          isLoading={isLoading && !activity}
        />
        <Card className="border-border bg-card shadow-sm shadow-black/5">
          <CardContent className="flex items-start gap-4 px-5 py-5">
            <div className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-muted/60 text-muted-foreground">
              <Calendar className="size-5" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                First seen
              </p>
              <p className="text-sm font-semibold tabular-nums text-foreground">
                {isLoading && !activity ? (
                  <Skeleton as="span" className="inline-block h-5 w-24 align-middle" />
                ) : activity?.firstSeen ? (
                  new Date(activity.firstSeen).toLocaleDateString()
                ) : (
                  '—'
                )}
              </p>
            </div>
          </CardContent>
        </Card>
        <Card className="border-border bg-card shadow-sm shadow-black/5">
          <CardContent className="flex items-start gap-4 px-5 py-5">
            <div className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-muted/60 text-muted-foreground">
              <Clock className="size-5" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                Last seen
              </p>
              <p className="text-sm font-semibold tabular-nums text-foreground">
                {isLoading && !activity ? (
                  <Skeleton as="span" className="inline-block h-5 w-24 align-middle" />
                ) : (
                  formatRelative(activity?.lastSeen)
                )}
              </p>
            </div>
          </CardContent>
        </Card>
        <Card className="border-border bg-card shadow-sm shadow-black/5">
          <CardContent className="flex items-start gap-4 px-5 py-5">
            <div className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-muted/60 text-muted-foreground">
              <Users className="size-5" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                Username
              </p>
              <p className="truncate font-mono text-sm font-semibold text-foreground">
                {activity?.username || username || '—'}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Action totals across all entities */}
      <div>
        <p className="mb-3 text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
          By action
        </p>
        <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-6">
          {ACTION_COLUMNS.map((col) => {
            const Icon = col.icon
            return (
              <Card key={col.key} className="border-border bg-card shadow-sm shadow-black/5">
                <CardContent className="space-y-1.5 px-4 py-4">
                  <div className={cn('inline-flex items-center gap-1.5 text-xs font-semibold', col.accent)}>
                    <Icon className="size-3.5" />
                    {col.label}
                  </div>
                  <p className="font-heading text-xl font-semibold tabular-nums text-foreground">
                    {isLoading && !activity ? (
                      <Skeleton as="span" className="inline-block h-6 w-12 align-middle" />
                    ) : (
                      formatNumber(totals?.[col.key])
                    )}
                  </p>
                </CardContent>
              </Card>
            )
          })}
        </div>
      </div>

      {/* Daily timeline */}
      <Card className="border-border bg-card shadow-sm shadow-black/5">
        <CardContent className="space-y-3 px-5 py-5">
          <div className="flex items-center justify-between">
            <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
              Daily activity
            </p>
            {Array.isArray(activity?.daily) && activity.daily.length > 0 ? (
              <p className="text-xs text-muted-foreground tabular-nums">
                {activity.daily.length} day{activity.daily.length === 1 ? '' : 's'}
              </p>
            ) : null}
          </div>
          {isLoading && !activity ? (
            <Skeleton className="h-16 w-full rounded-md" />
          ) : (
            <DailyChart daily={activity?.daily ?? []} />
          )}
        </CardContent>
      </Card>

      {/* Per-entity breakdown */}
      <div>
        <p className="mb-3 text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
          By entity
        </p>
        <div className="overflow-hidden rounded-xl border border-border bg-card shadow-sm shadow-black/5">
          <table className="w-full text-sm">
            <thead className="bg-muted/40">
              <tr className="text-left">
                <th className="px-4 py-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Entity</th>
                <th className="px-3 py-2 text-right text-xs font-semibold uppercase tracking-wider text-muted-foreground">Created</th>
                <th className="px-3 py-2 text-right text-xs font-semibold uppercase tracking-wider text-muted-foreground">Updated</th>
                <th className="px-3 py-2 text-right text-xs font-semibold uppercase tracking-wider text-muted-foreground">Deleted</th>
                <th className="px-3 py-2 text-right text-xs font-semibold uppercase tracking-wider text-muted-foreground">Restored</th>
                <th className="px-3 py-2 text-right text-xs font-semibold uppercase tracking-wider text-muted-foreground">Viewed</th>
                <th className="px-3 py-2 text-right text-xs font-semibold uppercase tracking-wider text-muted-foreground">Searched</th>
                <th className="px-3 py-2 text-right text-xs font-semibold uppercase tracking-wider text-muted-foreground">Distinct</th>
                <th className="px-4 py-2 text-right text-xs font-semibold uppercase tracking-wider text-muted-foreground">Total</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {Object.entries(ENTITY_META).map(([kind, meta]) => {
                const stats = activity?.byEntity?.[kind] || {}
                const Icon = meta.icon
                return (
                  <tr key={kind}>
                    <td className="px-4 py-2.5">
                      <div className="flex items-center gap-2">
                        <span className={cn('flex size-7 items-center justify-center rounded-lg bg-muted/60', meta.accent)}>
                          <Icon className="size-3.5" />
                        </span>
                        <span className="font-medium text-foreground">{meta.label}</span>
                      </div>
                    </td>
                    <td className="px-3 py-2.5 text-right tabular-nums text-emerald-600 dark:text-emerald-400">{formatNumber(stats.created)}</td>
                    <td className="px-3 py-2.5 text-right tabular-nums text-amber-600 dark:text-amber-400">{formatNumber(stats.updated)}</td>
                    <td className="px-3 py-2.5 text-right tabular-nums text-rose-600 dark:text-rose-400">{formatNumber(stats.deleted)}</td>
                    <td className="px-3 py-2.5 text-right tabular-nums text-sky-600 dark:text-sky-400">{formatNumber(stats.restored)}</td>
                    <td className="px-3 py-2.5 text-right tabular-nums text-muted-foreground">{formatNumber(stats.viewed)}</td>
                    <td className="px-3 py-2.5 text-right tabular-nums text-muted-foreground">{formatNumber(stats.searched)}</td>
                    <td className="px-3 py-2.5 text-right tabular-nums text-muted-foreground">{formatNumber(stats.distinctEntities)}</td>
                    <td className="px-4 py-2.5 text-right tabular-nums font-semibold text-foreground">{formatNumber(stats.total)}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Recent feed */}
      <div>
        <div className="mb-3 flex items-center justify-between">
          <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
            Recent activity
          </p>
          {isLoadingFeed ? (
            <p className="text-xs text-muted-foreground">Loading page…</p>
          ) : null}
        </div>
        {isLoading && !activity ? (
          <Card className="border-border bg-card shadow-sm shadow-black/5">
            <div className="divide-y divide-border">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="flex items-center gap-3 px-4 py-3">
                  <Skeleton className="h-8 w-8 rounded-full" />
                  <Skeleton className="h-4 flex-1" />
                  <Skeleton className="h-4 w-20" />
                </div>
              ))}
            </div>
          </Card>
        ) : recent.length === 0 ? (
          <EmptyState
            icon={Clock}
            title="No recent activity"
            description="Nothing has been logged for this user in the selected range."
          />
        ) : (
          <div className="space-y-3">
            <Card className="border-border bg-card shadow-sm shadow-black/5">
              <ul className="divide-y divide-border">
                {recent.map((item, idx) => (
                  <FeedRow
                    key={`${item.entity}-${item.entityCode}-${item.occurredAt ?? idx}-${idx}`}
                    item={item}
                  />
                ))}
              </ul>
            </Card>
            <DataPagination
              page={recentPage}
              totalPages={recentPageMeta?.totalPages ?? 0}
              totalElements={recentPageMeta?.totalElements ?? null}
              pageSize={RECENT_PAGE_SIZE}
              onPageChange={setRecentPage}
            />
          </div>
        )}
      </div>
    </AdminEntityPage>
  )
}

export { AdminUserActivityPage }
