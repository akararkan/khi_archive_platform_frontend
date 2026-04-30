import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  Activity,
  ArrowRight,
  Clock,
  Eye,
  Pencil,
  Plus,
  RefreshCw,
  Search,
  UserCircle2,
  Users,
} from 'lucide-react'

import { AdminEntityPage } from '@/components/admin/AdminEntityPage'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { EmptyState } from '@/components/ui/empty-state'
import { Highlight } from '@/components/ui/highlight'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { cn } from '@/lib/utils'
import { getErrorMessage } from '@/lib/get-error-message'
import {
  getAnalyticsFeed,
  getAnalyticsOverview,
  getAnalyticsUsers,
} from '@/services/analytics'
import {
  ENTITY_META,
  formatNumber,
  formatRelative,
  isHiddenAction,
} from '@/pages/admin/analytics-constants'
import {
  DailyChart,
  ErrorCard,
  FeedRow,
  StatCard,
} from '@/pages/admin/analytics-shared'

// Backend caps `days` at 365 and the canonical short ranges are 7/30/90/365.
const RANGE_OPTIONS = [
  { value: 7, label: '7d' },
  { value: 30, label: '30d' },
  { value: 90, label: '90d' },
  { value: 365, label: '1y' },
]

const FEED_PAGE_SIZE = 100
// How often the live tabs (Overview, Feed) pull fresh data in the
// background. The backend's @Cacheable layer makes default-filter
// requests cheap, so 15s is fine for small/medium teams.
const POLL_INTERVAL_MS = 15000

// Stable identity for a feed item across polls — backend doesn't expose
// a synthetic id, so we hash on the natural unique tuple. occurredAt is
// timestamped per audit event, so collisions in this tuple are
// effectively impossible.
function feedItemKey(item) {
  return [
    item?.entity ?? '',
    item?.entityCode ?? '',
    item?.action ?? '',
    item?.actorUsername ?? '',
    item?.occurredAt ?? '',
  ].join('|')
}

// Merge a freshly-fetched page-0 batch into the existing accumulated
// feed. New items go on top; deeper pages the user already loaded via
// "Load more" stay put. Returns the same array reference when nothing
// changed so React skips the re-render.
function mergeFreshFeed(existing, fresh) {
  if (!Array.isArray(existing) || existing.length === 0) return fresh
  const seen = new Set(existing.map(feedItemKey))
  const newOnes = fresh.filter((it) => !seen.has(feedItemKey(it)))
  if (newOnes.length === 0) return existing
  return [...newOnes, ...existing]
}

// Defensive unwrap — accepts the canonical FeedPageDTO `items`,
// Spring's `content`, or a bare list (older servers).
function unwrapFeedPage(data) {
  if (Array.isArray(data)) return data
  if (Array.isArray(data?.items)) return data.items
  if (Array.isArray(data?.content)) return data.content
  return []
}

function AdminAnalyticsPage() {
  const [days, setDays] = useState(30)
  const [activeTab, setActiveTab] = useState('overview')

  // Each tab caches its own data so flipping between tabs is instant.
  // Range changes invalidate everything — the effect below re-fetches
  // whatever's currently visible and clears the others to keep the
  // working set obvious.
  const [overview, setOverview] = useState(null)
  const [users, setUsers] = useState(null)
  // Feed is paginated server-side: `feed` accumulates items across
  // "Load more" clicks; `feedMeta` carries the pagination wrapper so we
  // know whether another page exists.
  const [feed, setFeed] = useState(null)
  const [feedMeta, setFeedMeta] = useState(null)
  const [isLoadingMoreFeed, setIsLoadingMoreFeed] = useState(false)

  const [isLoading, setIsLoading] = useState({ overview: false, users: false, feed: false })
  const [error, setError] = useState({ overview: '', users: '', feed: '' })

  const [userFilter, setUserFilter] = useState('') // Users tab: client-side filter

  const loadOverview = useCallback(async () => {
    setIsLoading((p) => ({ ...p, overview: true }))
    setError((p) => ({ ...p, overview: '' }))
    try {
      const data = await getAnalyticsOverview({ days, topUsers: 10 })
      setOverview(data || null)
    } catch (err) {
      setError((p) => ({ ...p, overview: getErrorMessage(err, 'Failed to load overview') }))
    } finally {
      setIsLoading((p) => ({ ...p, overview: false }))
    }
  }, [days])

  const loadUsers = useCallback(async () => {
    setIsLoading((p) => ({ ...p, users: true }))
    setError((p) => ({ ...p, users: '' }))
    try {
      const data = await getAnalyticsUsers({ days })
      setUsers(Array.isArray(data) ? data : [])
    } catch (err) {
      setError((p) => ({ ...p, users: getErrorMessage(err, 'Failed to load users') }))
    } finally {
      setIsLoading((p) => ({ ...p, users: false }))
    }
  }, [days])

  // `page = 0` resets the list; subsequent pages append.
  const loadFeed = useCallback(
    async (page = 0) => {
      if (page === 0) setIsLoading((p) => ({ ...p, feed: true }))
      else setIsLoadingMoreFeed(true)
      setError((p) => ({ ...p, feed: '' }))
      try {
        const data = await getAnalyticsFeed({ days, page, size: FEED_PAGE_SIZE })
        const items = unwrapFeedPage(data)
        setFeed((prev) => (page === 0 ? items : [...(prev || []), ...items]))
        setFeedMeta(
          Array.isArray(data)
            ? { page: 0, size: items.length, totalElements: items.length, totalPages: 1 }
            : {
                page: data?.page ?? page,
                size: data?.size ?? items.length,
                totalElements: data?.totalElements ?? null,
                totalPages: data?.totalPages ?? null,
              },
        )
      } catch (err) {
        setError((p) => ({ ...p, feed: getErrorMessage(err, 'Failed to load feed') }))
      } finally {
        if (page === 0) setIsLoading((p) => ({ ...p, feed: false }))
        else setIsLoadingMoreFeed(false)
      }
    },
    [days],
  )

  // Silent background refreshers used by the live polling effect.
  // - No spinner: visible loading state stays clean.
  // - No error toggling: a failed background poll shouldn't replace what
  //   the user is looking at with an error card; the next poll will retry.
  // - Feed: only refreshes page 0 and dedupe-merges into existing items
  //   so any pages the user paged in via "Load more" stay loaded. Meta's
  //   `page` is preserved for the same reason.
  const silentReloadOverview = useCallback(async () => {
    try {
      const data = await getAnalyticsOverview({ days, topUsers: 10 })
      setOverview(data || null)
    } catch {
      // swallow — the next poll will retry
    }
  }, [days])

  const silentReloadFeed = useCallback(async () => {
    try {
      const data = await getAnalyticsFeed({ days, page: 0, size: FEED_PAGE_SIZE })
      const items = unwrapFeedPage(data)
      setFeed((prev) => mergeFreshFeed(prev, items))
      setFeedMeta((prev) => ({
        page: prev?.page ?? 0,
        size: prev?.size ?? items.length,
        totalElements: data?.totalElements ?? prev?.totalElements ?? null,
        totalPages: data?.totalPages ?? prev?.totalPages ?? null,
      }))
    } catch {
      // swallow — the next poll will retry
    }
  }, [days])

  // Range change invalidates everything; immediately reloads only the
  // active tab. Other tabs lazy-load on first visit (effect below).
  useEffect(() => {
    setOverview(null)
    setUsers(null)
    setFeed(null)
    setFeedMeta(null)
    if (activeTab === 'overview') loadOverview()
    else if (activeTab === 'users') loadUsers()
    else if (activeTab === 'feed') loadFeed(0)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [days])

  // Lazy-load the tab's data on first switch.
  useEffect(() => {
    if (activeTab === 'overview' && overview == null && !isLoading.overview) loadOverview()
    if (activeTab === 'users' && users == null && !isLoading.users) loadUsers()
    if (activeTab === 'feed' && feed == null && !isLoading.feed) loadFeed(0)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab])

  const refreshActive = () => {
    if (activeTab === 'overview') loadOverview()
    else if (activeTab === 'users') loadUsers()
    else if (activeTab === 'feed') loadFeed(0)
  }

  // Live polling for the Overview + Feed tabs. Pauses when the tab
  // isn't one of those two or when the browser tab is hidden, so we
  // don't burn API quota on a backgrounded admin page.
  const isLive = activeTab === 'overview' || activeTab === 'feed'
  useEffect(() => {
    if (!isLive) return
    let cancelled = false

    const tick = () => {
      if (cancelled) return
      if (typeof document !== 'undefined' && document.visibilityState !== 'visible') return
      if (activeTab === 'overview') silentReloadOverview()
      else if (activeTab === 'feed') silentReloadFeed()
    }

    const id = setInterval(tick, POLL_INTERVAL_MS)
    return () => {
      cancelled = true
      clearInterval(id)
    }
  }, [activeTab, days, isLive, silentReloadOverview, silentReloadFeed])

  // "Load more" — feedMeta tracks the last page returned. Falls back to
  // a length-vs-totalElements check when totalPages isn't surfaced.
  const hasMoreFeed = (() => {
    if (!feedMeta || !feed) return false
    if (feedMeta.totalPages != null) return (feedMeta.page ?? 0) + 1 < feedMeta.totalPages
    if (feedMeta.totalElements != null) return feed.length < feedMeta.totalElements
    return false
  })()
  const loadMoreFeed = () => loadFeed((feedMeta?.page ?? 0) + 1)

  // Users tab: client-side filter on what the server already returned.
  const filteredUsers = useMemo(() => {
    const term = userFilter.trim().toLowerCase()
    if (!users) return null
    if (!term) return users
    return users.filter((u) => {
      const hay = [u.username, u.displayName].filter(Boolean).join(' ').toLowerCase()
      return hay.includes(term)
    })
  }, [users, userFilter])

  return (
    <AdminEntityPage
      title="Analytics"
      description="See what every user has been doing across the archive — counts by action and entity, daily trend, and a recent feed."
      action={
        <div className="flex items-center gap-2">
          {isLive ? (
            <span
              className="inline-flex items-center gap-1.5 rounded-md border border-emerald-500/30 bg-emerald-500/10 px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-emerald-600 dark:text-emerald-400"
              title={`Auto-refreshing every ${POLL_INTERVAL_MS / 1000}s`}
            >
              <span className="relative flex size-1.5">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-500/70" />
                <span className="relative inline-flex size-1.5 rounded-full bg-emerald-500" />
              </span>
              Live
            </span>
          ) : null}
          <div className="flex items-center gap-1 rounded-lg border border-border bg-card/60 p-0.5 shadow-sm">
            {RANGE_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                type="button"
                onClick={() => setDays(opt.value)}
                className={cn(
                  'rounded-md px-2.5 py-1 text-xs font-medium tabular-nums transition-colors',
                  days === opt.value
                    ? 'bg-background text-foreground shadow-sm'
                    : 'text-muted-foreground hover:text-foreground',
                )}
              >
                {opt.label}
              </button>
            ))}
          </div>
          <Button
            type="button"
            variant="outline"
            className="gap-2"
            onClick={refreshActive}
            disabled={isLoading[activeTab]}
          >
            <RefreshCw className={`size-4 ${isLoading[activeTab] ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>
      }
    >
      <div className="flex flex-wrap items-center gap-1 rounded-xl border border-border bg-card/60 p-1 shadow-sm">
        {[
          { key: 'overview', label: 'Overview',  icon: Activity },
          { key: 'users',    label: 'Users',     icon: Users },
          { key: 'feed',     label: 'Feed',      icon: Clock },
        ].map((tab) => {
          const Icon = tab.icon
          const isActive = activeTab === tab.key
          return (
            <button
              key={tab.key}
              type="button"
              onClick={() => setActiveTab(tab.key)}
              className={cn(
                'inline-flex items-center gap-2 rounded-lg px-3 py-1.5 text-sm font-medium transition-colors',
                isActive
                  ? 'bg-background text-foreground shadow-sm'
                  : 'text-muted-foreground hover:bg-muted/60 hover:text-foreground',
              )}
            >
              <Icon className="size-4" />
              {tab.label}
            </button>
          )
        })}
      </div>

      {activeTab === 'overview' ? (
        <OverviewTab
          overview={overview}
          isLoading={isLoading.overview}
          error={error.overview}
          onRetry={loadOverview}
        />
      ) : activeTab === 'users' ? (
        <UsersTab
          users={filteredUsers}
          rawUsers={users}
          isLoading={isLoading.users}
          error={error.users}
          onRetry={loadUsers}
          filterValue={userFilter}
          onFilterChange={setUserFilter}
        />
      ) : (
        <FeedTab
          feed={feed}
          meta={feedMeta}
          isLoading={isLoading.feed}
          isLoadingMore={isLoadingMoreFeed}
          hasMore={hasMoreFeed}
          error={error.feed}
          onRetry={() => loadFeed(0)}
          onLoadMore={loadMoreFeed}
        />
      )}
    </AdminEntityPage>
  )
}

function OverviewTab({ overview, isLoading, error, onRetry }) {
  if (error) return <ErrorCard message={error} onRetry={onRetry} />

  // Defensive picks — TeamOverviewDTO field names aren't fully nailed
  // down from the FE side, so we read the obvious ones with fallbacks.
  const totalActions = overview?.totalActions ?? overview?.total ?? null
  const distinctUsers = overview?.distinctUsers ?? overview?.usersCount ?? null
  const created = overview?.created ?? overview?.totalCreated ?? null
  const updated = overview?.updated ?? overview?.totalUpdated ?? null
  const byEntity = overview?.byEntity ?? {}
  const daily = overview?.daily ?? []
  const topUsers = overview?.topUsers ?? overview?.users ?? []

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Total actions" value={totalActions} icon={Activity}
                  accent="text-primary" isLoading={isLoading} />
        <StatCard label="Active users" value={distinctUsers} icon={Users}
                  accent="text-violet-600 dark:text-violet-400" isLoading={isLoading} />
        <StatCard label="Created" value={created} icon={Plus}
                  accent="text-emerald-600 dark:text-emerald-400" isLoading={isLoading} />
        <StatCard label="Updated" value={updated} icon={Pencil}
                  accent="text-amber-600 dark:text-amber-400" isLoading={isLoading} />
      </div>

      <Card className="border-border bg-card shadow-sm shadow-black/5">
        <CardContent className="space-y-3 px-5 py-5">
          <div className="flex items-center justify-between">
            <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
              Daily activity
            </p>
            {Array.isArray(daily) && daily.length > 0 ? (
              <p className="text-xs text-muted-foreground tabular-nums">
                {daily.length} day{daily.length === 1 ? '' : 's'}
              </p>
            ) : null}
          </div>
          {isLoading ? (
            <Skeleton className="h-16 w-full rounded-md" />
          ) : (
            <DailyChart daily={daily} />
          )}
        </CardContent>
      </Card>

      <div>
        <p className="mb-3 text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
          By entity
        </p>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {Object.entries(ENTITY_META).map(([kind, meta]) => {
            const stats = byEntity[kind] || {}
            const Icon = meta.icon
            return (
              <Card key={kind} className="border-border bg-card shadow-sm shadow-black/5">
                <CardContent className="space-y-2 px-4 py-4">
                  <div className="flex items-center gap-2">
                    <span className={cn('flex size-8 items-center justify-center rounded-lg bg-muted/60', meta.accent)}>
                      <Icon className="size-4" />
                    </span>
                    <p className="text-sm font-semibold text-foreground">{meta.label}</p>
                  </div>
                  {isLoading ? (
                    <Skeleton className="h-5 w-20" />
                  ) : (
                    <p className="font-heading text-xl font-semibold tabular-nums text-foreground">
                      {formatNumber(stats.total)}
                    </p>
                  )}
                  <div className="flex flex-wrap gap-x-3 gap-y-0.5 text-[11px] text-muted-foreground tabular-nums">
                    <span>+{formatNumber(stats.created)}</span>
                    <span>~{formatNumber(stats.updated)}</span>
                    {stats.deleted ? <span>−{formatNumber(stats.deleted)}</span> : null}
                    {stats.restored ? <span>↺{formatNumber(stats.restored)}</span> : null}
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      </div>

      {Array.isArray(topUsers) && topUsers.length > 0 ? (
        <div>
          <p className="mb-3 text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
            Most active users
          </p>
          <Card className="border-border bg-card shadow-sm shadow-black/5">
            <ul className="divide-y divide-border">
              {topUsers.slice(0, 10).map((u, idx) => (
                <li key={u.username || idx}>
                  <Link
                    to={`/admin/analytics/users/${encodeURIComponent(u.username || '')}`}
                    className="flex items-center gap-3 px-4 py-3 transition-colors hover:bg-muted/40"
                  >
                    <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-semibold tabular-nums text-foreground">
                      {idx + 1}
                    </span>
                    <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
                      <UserCircle2 className="size-5" />
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold text-foreground">
                        {u.displayName || u.username || '—'}
                      </p>
                      <p className="truncate text-xs text-muted-foreground">
                        {u.username || ''}
                      </p>
                    </div>
                    <p className="shrink-0 text-sm font-semibold tabular-nums text-foreground">
                      {formatNumber(u.totalActions ?? u.total ?? 0)}
                    </p>
                    <ArrowRight className="size-4 shrink-0 text-muted-foreground" />
                  </Link>
                </li>
              ))}
            </ul>
          </Card>
        </div>
      ) : null}
    </div>
  )
}

function UsersTab({ users, rawUsers, isLoading, error, onRetry, filterValue, onFilterChange }) {
  if (error) return <ErrorCard message={error} onRetry={onRetry} />

  return (
    <div className="space-y-4">
      <Card className="border-border bg-card shadow-sm shadow-black/5">
        <CardContent className="flex flex-col gap-3 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
          <span className="text-sm text-muted-foreground">
            Showing{' '}
            <span className="font-semibold tabular-nums text-foreground">
              {users ? users.length : 0}
            </span>{' '}
            of{' '}
            <span className="font-semibold tabular-nums text-foreground">
              {rawUsers ? rawUsers.length : 0}
            </span>{' '}
            users
          </span>
          <div className="relative w-full sm:w-80">
            <Search className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={filterValue}
              onChange={(e) => onFilterChange(e.target.value)}
              placeholder="Filter users by name or username…"
              className="pl-8"
            />
          </div>
        </CardContent>
      </Card>

      {isLoading && !users ? (
        <Card className="border-border bg-card shadow-sm shadow-black/5">
          <div className="divide-y divide-border">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="flex items-center gap-4 px-4 py-3">
                <Skeleton className="h-9 w-9 rounded-full" />
                <Skeleton className="h-5 w-44" />
                <Skeleton className="ml-auto h-4 w-24" />
              </div>
            ))}
          </div>
        </Card>
      ) : !users || users.length === 0 ? (
        <EmptyState
          icon={Users}
          title="No activity in this range"
          description="No user has logged any actions in the selected window. Widen the range or wait for more activity to land."
        />
      ) : (
        <div className="overflow-hidden rounded-xl border border-border bg-card shadow-sm shadow-black/5">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/40 hover:bg-muted/40">
                <TableHead className="w-[52px] text-center">#</TableHead>
                <TableHead>User</TableHead>
                <TableHead className="w-[120px] text-right">Created</TableHead>
                <TableHead className="w-[120px] text-right">Updated</TableHead>
                <TableHead className="w-[120px] text-right">Deleted</TableHead>
                <TableHead className="w-[120px] text-right">Total</TableHead>
                <TableHead className="w-[180px]">Last seen</TableHead>
                <TableHead className="w-[120px] text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {users.map((u, idx) => {
                const total = u.totalActions ?? u.total ?? 0
                const created = u.created ?? u.totalCreated ?? 0
                const updated = u.updated ?? u.totalUpdated ?? 0
                const deleted = u.deleted ?? u.totalDeleted ?? 0
                return (
                  <TableRow key={u.username || idx} className="group">
                    <TableCell className="text-center text-xs tabular-nums text-muted-foreground">
                      {idx + 1}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
                          <UserCircle2 className="size-5" />
                        </span>
                        <div className="min-w-0">
                          <p className="truncate text-sm font-semibold text-foreground">
                            <Highlight
                              text={u.displayName || u.username || '—'}
                              query={filterValue}
                            />
                          </p>
                          <p className="truncate text-xs text-muted-foreground">
                            <Highlight text={u.username || ''} query={filterValue} />
                          </p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="text-right tabular-nums text-emerald-600 dark:text-emerald-400">
                      {formatNumber(created)}
                    </TableCell>
                    <TableCell className="text-right tabular-nums text-amber-600 dark:text-amber-400">
                      {formatNumber(updated)}
                    </TableCell>
                    <TableCell className="text-right tabular-nums text-rose-600 dark:text-rose-400">
                      {formatNumber(deleted)}
                    </TableCell>
                    <TableCell className="text-right tabular-nums font-semibold text-foreground">
                      {formatNumber(total)}
                    </TableCell>
                    <TableCell className="text-xs tabular-nums text-muted-foreground">
                      {formatRelative(u.lastSeen)}
                    </TableCell>
                    <TableCell className="text-right">
                      {/* Real anchor styled as a button so right-click →
                          "Open in new tab" works for admins reviewing many
                          users in parallel. */}
                      <Link
                        to={`/admin/analytics/users/${encodeURIComponent(u.username || '')}`}
                        className="inline-flex h-7 items-center gap-1 rounded-md border border-border bg-background px-2 text-xs font-medium text-foreground hover:bg-muted"
                      >
                        <Eye className="size-3.5" />
                        Open
                      </Link>
                    </TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  )
}

function FeedTab({ feed, meta, isLoading, isLoadingMore, hasMore, error, onRetry, onLoadMore }) {
  if (error) return <ErrorCard message={error} onRetry={onRetry} />

  // Hide noisy actions (currently just LIST) from the timeline.
  const visibleFeed = Array.isArray(feed)
    ? feed.filter((item) => !isHiddenAction(item?.action))
    : feed

  if (isLoading && !feed) {
    return (
      <Card className="border-border bg-card shadow-sm shadow-black/5">
        <div className="divide-y divide-border">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="flex items-center gap-3 px-4 py-3">
              <Skeleton className="h-8 w-8 rounded-full" />
              <Skeleton className="h-4 flex-1" />
              <Skeleton className="h-4 w-20" />
            </div>
          ))}
        </div>
      </Card>
    )
  }

  if (!visibleFeed || visibleFeed.length === 0) {
    return (
      <EmptyState
        icon={Clock}
        title="No activity in this range"
        description="Nothing has been logged in the selected window. Widen the range or wait for activity to land."
      />
    )
  }

  return (
    <div className="space-y-3">
      <Card className="border-border bg-card shadow-sm shadow-black/5">
        <ul className="divide-y divide-border">
          {visibleFeed.map((item, idx) => (
            <FeedRow key={`${item.entity}-${item.entityCode}-${idx}`} item={item} />
          ))}
        </ul>
      </Card>
      <div className="flex items-center justify-between px-1 text-xs text-muted-foreground tabular-nums">
        <span>
          Showing <span className="font-semibold text-foreground">{visibleFeed.length}</span>
          {meta?.totalElements != null ? (
            <> of <span className="font-semibold text-foreground">{meta.totalElements}</span></>
          ) : null}{' '}
          item{visibleFeed.length === 1 ? '' : 's'}
        </span>
        {hasMore ? (
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="gap-2"
            onClick={onLoadMore}
            disabled={isLoadingMore}
          >
            <RefreshCw className={`size-3.5 ${isLoadingMore ? 'animate-spin' : ''}`} />
            {isLoadingMore ? 'Loading…' : 'Load more'}
          </Button>
        ) : null}
      </div>
    </div>
  )
}

export { AdminAnalyticsPage }
