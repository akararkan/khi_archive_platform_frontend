import { useCallback, useEffect, useMemo, useState } from 'react'
import { DataPagination } from '@/components/ui/pagination'
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
  ShieldCheck,
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
import { searchAdminUserAuditLogs } from '@/services/admin-user'
import {
  ENTITY_META,
  dateFilterToFromTo,
  formatNumber,
  formatRelative,
  isHiddenAction,
  resolveDateFilter,
  unwrapFeedPage,
} from '@/pages/admin/analytics-constants'
import { UserAuditRow } from '@/pages/admin/user-audit-shared'
import {
  DailyChart,
  DateRangeFilter,
  ErrorCard,
  FeedRow,
  StatCard,
} from '@/pages/admin/analytics-shared'

const FEED_PAGE_SIZE = 100
// User-management audit endpoint clamps page size to 200 server-side;
// 50 keeps each request quick while showing enough rows to be useful.
const USER_ACTIONS_PAGE_SIZE = 50
// How often Overview/Feed/Users silently re-pull. The backend's
// @Cacheable layer collapses default-filter requests so 15s is fine
// for small/medium teams.
const POLL_INTERVAL_MS = 15000


function AdminAnalyticsPage() {
  // Date range state: presets (7d/30d/90d/1y) or a custom from/to. The
  // shared `resolveDateFilter` collapses these inputs into the
  // AnalyticsFilter slice the service expects, or returns null when the
  // user has typed an invalid range — in which case loaders skip.
  const [dateMode, setDateMode] = useState('preset')
  const [days, setDays] = useState(30)
  const [fromDate, setFromDate] = useState('')
  const [toDate, setToDate] = useState('')
  const dateFilter = useMemo(
    () => resolveDateFilter({ mode: dateMode, days, from: fromDate, to: toDate }),
    [dateMode, days, fromDate, toDate],
  )

  const [activeTab, setActiveTab] = useState('overview')

  // Each tab caches its own data so flipping between tabs is instant.
  // Filter changes invalidate everything below.
  const [overview, setOverview] = useState(null)
  const [users, setUsers] = useState(null)
  // Feed is paginated: `feed` always holds the CURRENT page's items
  // (no accumulation), `feedMeta` carries the FeedPageDTO wrapper, and
  // `feedPage` is the active 0-indexed page.
  const [feed, setFeed] = useState(null)
  const [feedMeta, setFeedMeta] = useState(null)
  const [feedPage, setFeedPage] = useState(0)
  // Global user-management audit feed — separate from the resource
  // feed because its rows have a different shape (target user,
  // before/after details strings) and a different backend endpoint.
  const [userActions, setUserActions] = useState(null)
  const [userActionsMeta, setUserActionsMeta] = useState(null)
  const [userActionsPage, setUserActionsPage] = useState(0)

  const [isLoading, setIsLoading] = useState({
    overview: false,
    users: false,
    feed: false,
    userActions: false,
  })
  const [error, setError] = useState({
    overview: '',
    users: '',
    feed: '',
    userActions: '',
  })

  const [userFilter, setUserFilter] = useState('') // Users tab: client-side filter

  const loadOverview = useCallback(async () => {
    if (!dateFilter) return
    setIsLoading((p) => ({ ...p, overview: true }))
    setError((p) => ({ ...p, overview: '' }))
    try {
      const data = await getAnalyticsOverview({ ...dateFilter, topUsers: 10 })
      setOverview(data || null)
    } catch (err) {
      setError((p) => ({ ...p, overview: getErrorMessage(err, 'Failed to load overview') }))
    } finally {
      setIsLoading((p) => ({ ...p, overview: false }))
    }
  }, [dateFilter])

  const loadUsers = useCallback(async () => {
    if (!dateFilter) return
    setIsLoading((p) => ({ ...p, users: true }))
    setError((p) => ({ ...p, users: '' }))
    try {
      const data = await getAnalyticsUsers(dateFilter)
      setUsers(Array.isArray(data) ? data : [])
    } catch (err) {
      setError((p) => ({ ...p, users: getErrorMessage(err, 'Failed to load users') }))
    } finally {
      setIsLoading((p) => ({ ...p, users: false }))
    }
  }, [dateFilter])

  // Each fetch REPLACES `feed` with the requested page. New audit
  // events naturally land at page 0; users on a deeper page see the
  // shifted slice on next refresh.
  const loadFeed = useCallback(
    async (page) => {
      if (!dateFilter) return
      setIsLoading((p) => ({ ...p, feed: true }))
      setError((p) => ({ ...p, feed: '' }))
      try {
        const data = await getAnalyticsFeed({ ...dateFilter, page, size: FEED_PAGE_SIZE })
        const { items, meta } = unwrapFeedPage(data)
        setFeed(items)
        setFeedMeta(meta)
      } catch (err) {
        setError((p) => ({ ...p, feed: getErrorMessage(err, 'Failed to load feed') }))
      } finally {
        setIsLoading((p) => ({ ...p, feed: false }))
      }
    },
    [dateFilter],
  )

  // User-management audit endpoint expects from/to ISO bounds, not
  // the analytics `days` shorthand — `dateFilterToFromTo` projects
  // either shape onto a concrete window.
  const loadUserActions = useCallback(
    async (page) => {
      if (!dateFilter) return
      setIsLoading((p) => ({ ...p, userActions: true }))
      setError((p) => ({ ...p, userActions: '' }))
      try {
        const data = await searchAdminUserAuditLogs({
          ...dateFilterToFromTo(dateFilter),
          page,
          size: USER_ACTIONS_PAGE_SIZE,
          sort: 'createdAt,desc',
        })
        const { items, meta } = unwrapFeedPage(data)
        setUserActions(items)
        setUserActionsMeta(meta)
      } catch (err) {
        setError((p) => ({
          ...p,
          userActions: getErrorMessage(err, 'Failed to load user actions'),
        }))
      } finally {
        setIsLoading((p) => ({ ...p, userActions: false }))
      }
    },
    [dateFilter],
  )

  // Silent background refreshers — no spinner, errors swallowed
  // (next poll retries). Feed silently refreshes the user's CURRENT
  // page so what's on screen stays in sync without yanking them away
  // from where they're paging.
  const silentReloadOverview = useCallback(async () => {
    if (!dateFilter) return
    try {
      const data = await getAnalyticsOverview({ ...dateFilter, topUsers: 10 })
      setOverview(data || null)
    } catch {
      // swallow
    }
  }, [dateFilter])

  const silentReloadFeed = useCallback(async () => {
    if (!dateFilter) return
    try {
      const data = await getAnalyticsFeed({
        ...dateFilter,
        page: feedPage,
        size: FEED_PAGE_SIZE,
      })
      const { items, meta } = unwrapFeedPage(data)
      setFeed(items)
      setFeedMeta(meta)
    } catch {
      // swallow
    }
  }, [dateFilter, feedPage])

  const silentReloadUsers = useCallback(async () => {
    if (!dateFilter) return
    try {
      const data = await getAnalyticsUsers(dateFilter)
      setUsers(Array.isArray(data) ? data : [])
    } catch {
      // swallow
    }
  }, [dateFilter])

  const silentReloadUserActions = useCallback(async () => {
    if (!dateFilter) return
    try {
      const data = await searchAdminUserAuditLogs({
        ...dateFilterToFromTo(dateFilter),
        page: userActionsPage,
        size: USER_ACTIONS_PAGE_SIZE,
        sort: 'createdAt,desc',
      })
      const { items, meta } = unwrapFeedPage(data)
      setUserActions(items)
      setUserActionsMeta(meta)
    } catch {
      // swallow
    }
  }, [dateFilter, userActionsPage])

  // Filter change invalidates everything and resets feed pagination
  // to page 0 (otherwise the user could be stranded on page 5 of a
  // window that no longer has 5 pages).
  useEffect(() => {
    setOverview(null)
    setUsers(null)
    setFeed(null)
    setFeedMeta(null)
    setFeedPage(0)
    setUserActions(null)
    setUserActionsMeta(null)
    setUserActionsPage(0)
    if (!dateFilter) return
    if (activeTab === 'overview') loadOverview()
    else if (activeTab === 'users') loadUsers()
    else if (activeTab === 'feed') loadFeed(0)
    else if (activeTab === 'userActions') loadUserActions(0)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dateFilter])

  // Lazy-load the tab's data on first switch.
  useEffect(() => {
    if (!dateFilter) return
    if (activeTab === 'overview' && overview == null && !isLoading.overview) loadOverview()
    if (activeTab === 'users' && users == null && !isLoading.users) loadUsers()
    if (activeTab === 'feed' && feed == null && !isLoading.feed) loadFeed(feedPage)
    if (
      activeTab === 'userActions' &&
      userActions == null &&
      !isLoading.userActions
    ) {
      loadUserActions(userActionsPage)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab])

  // Re-fetch the feed when the user navigates pages via DataPagination.
  useEffect(() => {
    if (activeTab !== 'feed') return
    if (!dateFilter) return
    loadFeed(feedPage)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [feedPage])

  useEffect(() => {
    if (activeTab !== 'userActions') return
    if (!dateFilter) return
    loadUserActions(userActionsPage)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userActionsPage])

  const refreshActive = () => {
    if (activeTab === 'overview') loadOverview()
    else if (activeTab === 'users') loadUsers()
    else if (activeTab === 'feed') loadFeed(feedPage)
    else if (activeTab === 'userActions') loadUserActions(userActionsPage)
  }

  // Live polling — every tick refreshes Overview, Feed AND Users in
  // parallel so flipping between tabs always lands on data that's
  // consistent with the rest of the page. Pauses when the browser
  // tab is hidden so we don't burn API quota on a backgrounded page.
  useEffect(() => {
    if (!dateFilter) return
    let cancelled = false

    const tick = () => {
      if (cancelled) return
      if (typeof document !== 'undefined' && document.visibilityState !== 'visible') return
      silentReloadOverview()
      silentReloadFeed()
      silentReloadUsers()
      silentReloadUserActions()
    }

    const id = setInterval(tick, POLL_INTERVAL_MS)
    return () => {
      cancelled = true
      clearInterval(id)
    }
  }, [
    dateFilter,
    silentReloadOverview,
    silentReloadFeed,
    silentReloadUsers,
    silentReloadUserActions,
  ])

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
        <div className="flex flex-wrap items-center gap-2">
          <span
            className="inline-flex items-center gap-1.5 rounded-md border border-emerald-500/30 bg-emerald-500/10 px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-emerald-600 dark:text-emerald-400"
            title={`Auto-refreshing Overview, Feed, and Users every ${POLL_INTERVAL_MS / 1000}s`}
          >
            <span className="relative flex size-1.5">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-500/70" />
              <span className="relative inline-flex size-1.5 rounded-full bg-emerald-500" />
            </span>
            Live
          </span>
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
            onClick={refreshActive}
            disabled={isLoading[activeTab] || !dateFilter}
          >
            <RefreshCw className={`size-4 ${isLoading[activeTab] ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>
      }
    >
      <div className="flex flex-wrap items-center gap-1 rounded-xl border border-border bg-card/60 p-1 shadow-sm">
        {[
          { key: 'overview',    label: 'Overview',     icon: Activity },
          { key: 'users',       label: 'Users',        icon: Users },
          { key: 'feed',        label: 'Feed',         icon: Clock },
          { key: 'userActions', label: 'User actions', icon: ShieldCheck },
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
      ) : activeTab === 'feed' ? (
        <FeedTab
          feed={feed}
          meta={feedMeta}
          page={feedPage}
          pageSize={FEED_PAGE_SIZE}
          isLoading={isLoading.feed}
          error={error.feed}
          onRetry={() => loadFeed(feedPage)}
          onPageChange={setFeedPage}
        />
      ) : (
        <UserActionsTab
          rows={userActions}
          meta={userActionsMeta}
          page={userActionsPage}
          pageSize={USER_ACTIONS_PAGE_SIZE}
          isLoading={isLoading.userActions}
          error={error.userActions}
          onRetry={() => loadUserActions(userActionsPage)}
          onPageChange={setUserActionsPage}
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

function FeedTab({ feed, meta, page, pageSize, isLoading, error, onRetry, onPageChange }) {
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
      <DataPagination
        page={page}
        totalPages={meta?.totalPages ?? 0}
        totalElements={meta?.totalElements ?? null}
        pageSize={pageSize}
        onPageChange={onPageChange}
      />
    </div>
  )
}

// Global "User actions" tab — paginated feed of admin actions on
// user accounts (role flips, permission grants, lock/unlock, etc.).
// Sister to FeedTab, but driven by the user-management audit
// endpoint instead of the resource activity feed.
function UserActionsTab({ rows, meta, page, pageSize, isLoading, error, onRetry, onPageChange }) {
  if (error) return <ErrorCard message={error} onRetry={onRetry} />

  // LIST audit was dropped backend-side; old DB rows still reference
  // it though, so apply the same filter the resource feed uses.
  const visible = Array.isArray(rows)
    ? rows.filter((row) => !isHiddenAction(row?.action))
    : rows

  if (isLoading && !rows) {
    return (
      <Card className="border-border bg-card shadow-sm shadow-black/5">
        <div className="space-y-2 p-3">
          {[1, 2, 3, 4, 5].map((i) => (
            <Skeleton key={i} className="h-16 w-full rounded-md" />
          ))}
        </div>
      </Card>
    )
  }

  if (!visible || visible.length === 0) {
    return (
      <EmptyState
        icon={ShieldCheck}
        title="No admin actions in this range"
        description="When an admin changes a role, grants permissions, locks an account, etc., it shows up here. Widen the range or wait for activity to land."
      />
    )
  }

  return (
    <div className="space-y-3">
      <Card className="border-border bg-card p-3 shadow-sm shadow-black/5">
        <ul className="space-y-2">
          {visible.map((row, idx) => {
            const when = row?.createdAt || row?.timestamp || row?.date
            const key = row?.logId ?? row?.id ?? `${row?.action}-${when}-${idx}`
            return <UserAuditRow key={key} row={row} showTarget />
          })}
        </ul>
      </Card>
      <DataPagination
        page={page}
        totalPages={meta?.totalPages ?? 0}
        totalElements={meta?.totalElements ?? null}
        pageSize={pageSize}
        onPageChange={onPageChange}
      />
    </div>
  )
}

export { AdminAnalyticsPage }
