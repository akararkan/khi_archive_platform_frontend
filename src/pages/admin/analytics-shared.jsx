// Shared React components for the admin analytics screens. Pure helpers
// + constants live in `analytics-constants.js` to keep this file
// component-only (Vite's fast-refresh rule).

import { Link } from 'react-router-dom'
import {
  Activity,
  CalendarClock,
  CalendarDays,
  CalendarRange,
  Clock,
  CornerDownRight,
  RefreshCw,
  Sparkles,
} from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import { cn } from '@/lib/utils'
import {
  dateInputToInstant,
  ENTITY_META,
  RANGE_PRESETS,
  actionMetaFor,
  formatNumber,
  formatRelative,
  humanize,
  parseCascadeFromDetails,
} from '@/pages/admin/analytics-constants'

// Default "always-safe" set the action-catalog falls back to when the
// backend hasn't replied yet — same set the catalog endpoint returns
// after dropping LIST: the CRUDs plus VIEW and SEARCH.
const DEFAULT_ACTION_CATALOG = ['CREATE', 'READ', 'UPDATE', 'DELETE', 'SEARCH']

// Which field on a bucket carries its period key, and the singular noun
// for that period — one entry per granularity the chart understands.
const PERIOD_KEY = { daily: 'date', weekly: 'week', monthly: 'label', yearly: 'year' }
const PERIOD_UNIT = { daily: 'day', weekly: 'week', monthly: 'month', yearly: 'year' }

function formatPeriodLabel(value, granularity, compact = false) {
  if (!value) return '—'
  const raw = String(value)

  // Yearly buckets key on a Jan-1 date (or a bare "2026" label) — just
  // surface the four-digit year in both compact and full forms.
  if (granularity === 'yearly') {
    const m = raw.match(/(\d{4})/)
    return m ? m[1] : raw
  }

  const date = granularity === 'monthly'
    ? new Date(`${raw.slice(0, 7)}-01T00:00:00`)
    : new Date(`${raw.slice(0, 10)}T00:00:00`)
  if (Number.isNaN(date.getTime())) return raw

  if (granularity === 'monthly') {
    return new Intl.DateTimeFormat(undefined, {
      month: compact ? 'short' : 'long',
      year: 'numeric',
    }).format(date)
  }

  // Weekly buckets key on the Monday that starts the ISO week. Compact
  // axis shows "Jul 13"; the tooltip spells out "Week of Jul 13, 2026".
  if (granularity === 'weekly') {
    const md = new Intl.DateTimeFormat(undefined, { month: 'short', day: 'numeric' }).format(date)
    if (compact) return md
    const year = new Intl.DateTimeFormat(undefined, { year: 'numeric' }).format(date)
    return `Week of ${md}, ${year}`
  }

  return new Intl.DateTimeFormat(undefined, {
    month: compact ? 'short' : 'long',
    day: 'numeric',
    ...(compact ? {} : { year: 'numeric' }),
  }).format(date)
}

function ActivityTimeChart({ items, granularity = 'daily' }) {
  const keyName = PERIOD_KEY[granularity] ?? 'date'
  const unit = PERIOD_UNIT[granularity] ?? 'day'
  const data = Array.isArray(items) && items.length > 0
    ? [...items]
        .map((item) => ({ ...item, total: Number(item.total ?? 0) }))
        .sort((a, b) => String(a[keyName]).localeCompare(String(b[keyName])))
    : []

  if (data.length === 0) {
    return (
      <div className="flex min-h-60 flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-border bg-muted/15 text-center">
        <span className="grid size-10 place-items-center rounded-xl bg-muted/60 text-muted-foreground">
          <Activity className="size-5" />
        </span>
        <div>
          <p className="text-sm font-medium text-foreground">No activity in this range</p>
          <p className="text-xs text-muted-foreground">Try a wider date range or another action filter.</p>
        </div>
      </div>
    )
  }

  const total = data.reduce((sum, item) => sum + item.total, 0)
  const average = total / data.length
  const peak = data.reduce((best, item) => (item.total > best.total ? item : best), data[0])
  const max = Math.max(1, peak.total)
  const averagePosition = Math.min(100, (average / max) * 100)
  const labelStep =
    data.length <= 14 ? 1
      : data.length <= 31 ? 3
        : data.length <= 60 ? 5
          : Math.ceil(data.length / 10)

  return (
    <div className="space-y-5">
      <div className="grid gap-2 sm:grid-cols-3">
        <div className="rounded-xl border border-border/80 bg-muted/20 px-3.5 py-3">
          <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
            Period total
          </p>
          <p className="mt-0.5 font-heading text-xl font-semibold tabular-nums text-foreground">
            {formatNumber(total)}
          </p>
        </div>
        <div className="rounded-xl border border-border/80 bg-muted/20 px-3.5 py-3">
          <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
            Average / {unit}
          </p>
          <p className="mt-0.5 font-heading text-xl font-semibold tabular-nums text-foreground">
            {average.toLocaleString(undefined, { maximumFractionDigits: 1 })}
          </p>
        </div>
        <div className="rounded-xl border border-primary/15 bg-primary/[0.045] px-3.5 py-3">
          <p className="inline-flex items-center gap-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-primary">
            <Sparkles className="size-3" />
            Peak {unit}
          </p>
          <div className="mt-0.5 flex items-baseline justify-between gap-2">
            <p className="font-heading text-xl font-semibold tabular-nums text-foreground">
              {formatNumber(peak.total)}
            </p>
            <p className="truncate text-[11px] text-muted-foreground">
              {formatPeriodLabel(peak[keyName], granularity, true)}
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-[2.5rem_minmax(0,1fr)] gap-x-3">
        <div className="flex h-48 flex-col justify-between pb-px text-right text-[10px] tabular-nums text-muted-foreground">
          <span>{formatNumber(max)}</span>
          <span>{formatNumber(Math.round(max / 2))}</span>
          <span>0</span>
        </div>

        <div className="min-w-0">
          <div className="relative h-48">
            {[0, 25, 50, 75, 100].map((position) => (
              <span
                key={position}
                aria-hidden="true"
                className="absolute inset-x-0 border-t border-border/60"
                style={{ bottom: `${position}%` }}
              />
            ))}

            <div
              aria-hidden="true"
              className="absolute inset-x-0 z-10 border-t border-dashed border-primary/45"
              style={{ bottom: `${averagePosition}%` }}
            >
              <span className="absolute right-0 top-0 -translate-y-1/2 rounded-full border border-primary/15 bg-card px-1.5 py-0.5 text-[9px] font-medium tabular-nums text-primary shadow-sm">
                Avg {average.toLocaleString(undefined, { maximumFractionDigits: 1 })}
              </span>
            </div>

            <div
              className="absolute inset-0 grid items-end gap-1 sm:gap-1.5"
              style={{ gridTemplateColumns: `repeat(${data.length}, minmax(0, 1fr))` }}
            >
              {data.map((item, index) => {
                const percentage = item.total > 0
                  ? Math.max(2.5, (item.total / max) * 100)
                  : 0
                const isPeak = item === peak
                const breakdown = [
                  item.created ? `${formatNumber(item.created)} created` : null,
                  item.updated ? `${formatNumber(item.updated)} updated` : null,
                  item.deleted ? `${formatNumber(item.deleted)} deleted` : null,
                  item.restored ? `${formatNumber(item.restored)} restored` : null,
                ].filter(Boolean)
                return (
                  <div
                    key={item[keyName] || index}
                    tabIndex={0}
                    role="img"
                    aria-label={`${formatPeriodLabel(item[keyName], granularity)}: ${formatNumber(item.total)} actions`}
                    className="group relative flex h-full min-w-0 items-end justify-center rounded-t-md outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
                  >
                    <span
                      className={cn(
                        'pointer-events-none absolute top-2 z-30 hidden min-w-max rounded-lg border border-border bg-popover px-2.5 py-2 text-left shadow-xl group-hover:block group-focus:block',
                        index === 0
                          ? 'left-0'
                          : index === data.length - 1
                            ? 'right-0'
                            : 'left-1/2 -translate-x-1/2',
                      )}
                    >
                      <span className="block text-[10px] font-medium text-muted-foreground">
                        {formatPeriodLabel(item[keyName], granularity)}
                      </span>
                      <span className="mt-0.5 block text-sm font-semibold tabular-nums text-foreground">
                        {formatNumber(item.total)} action{item.total === 1 ? '' : 's'}
                      </span>
                      {item.activeUsers != null ? (
                        <span className="block text-[10px] text-muted-foreground">
                          {formatNumber(item.activeUsers)} active user{item.activeUsers === 1 ? '' : 's'}
                        </span>
                      ) : null}
                      {breakdown.length > 0 ? (
                        <span className="mt-1 block max-w-52 text-[10px] text-muted-foreground">
                          {breakdown.join(' · ')}
                        </span>
                      ) : null}
                    </span>

                    <span
                      aria-hidden="true"
                      className={cn(
                        'block w-full max-w-12 rounded-t-md border border-b-0 transition-[height,background-color,opacity] duration-300',
                        isPeak
                          ? 'border-primary/35 bg-gradient-to-t from-primary to-primary/65 shadow-lg shadow-primary/20'
                          : 'border-primary/15 bg-gradient-to-t from-primary/75 to-primary/35 group-hover:from-primary group-hover:to-primary/60',
                      )}
                      style={{ height: `${percentage}%` }}
                    />
                  </div>
                )
              })}
            </div>
          </div>

          <div
            className="mt-2 grid gap-1"
            style={{ gridTemplateColumns: `repeat(${data.length}, minmax(0, 1fr))` }}
          >
            {data.map((item, index) => {
              const visible =
                index === 0 ||
                index === data.length - 1 ||
                index % labelStep === 0
              return (
                <span
                  key={item[keyName] || index}
                  className={cn(
                    'truncate text-center text-[9px] tabular-nums text-muted-foreground',
                    !visible && 'opacity-0',
                  )}
                >
                  {formatPeriodLabel(item[keyName], granularity, true)}
                </span>
              )
            })}
          </div>
        </div>
      </div>
    </div>
  )
}

function DailyChart({ daily }) {
  return <ActivityTimeChart items={daily} granularity="daily" />
}

function WeeklyChart({ weekly }) {
  return <ActivityTimeChart items={weekly} granularity="weekly" />
}

function YearlyChart({ yearly }) {
  return <ActivityTimeChart items={yearly} granularity="yearly" />
}

// The four granularities the trend card exposes, in ascending period
// length. Shared by AdminAnalyticsPage (team) and AdminUserActivityPage
// (per-user) so the toggle looks and behaves identically on both.
const TREND_GRANULARITIES = [
  { key: 'daily',   label: 'Daily',   unit: 'day',   icon: Clock },
  { key: 'weekly',  label: 'Weekly',  unit: 'week',  icon: CalendarRange },
  { key: 'monthly', label: 'Monthly', unit: 'month', icon: CalendarDays },
  { key: 'yearly',  label: 'Yearly',  unit: 'year',  icon: CalendarClock },
]

// "Activity over time" card with a Daily/Weekly/Monthly/Yearly toggle.
// `seriesByView` is an object keyed by granularity → bucket array; the
// caller owns which views it populates (a view with no data just renders
// the chart's empty state). `isLoading` should reflect the ACTIVE view so
// the skeleton only shows while that granularity is still in flight.
function ActivityTrendCard({
  title = 'Activity over time',
  icon = Activity,
  seriesByView,
  view,
  onViewChange,
  isLoading = false,
}) {
  const Icon = icon
  const active = TREND_GRANULARITIES.find((g) => g.key === view) ?? TREND_GRANULARITIES[0]
  const series = Array.isArray(seriesByView?.[active.key]) ? seriesByView[active.key] : []
  const count = series.length

  return (
    <Card className="rounded-2xl border-border bg-card shadow-md shadow-black/5">
      <CardContent className="space-y-5 px-5 py-5 sm:px-6 sm:py-6">
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-border/70 pb-5">
          <div className="flex items-center gap-3">
            <span className="grid size-10 shrink-0 place-items-center rounded-xl border border-primary/15 bg-primary/[0.07] text-primary">
              <Icon className="size-5" />
            </span>
            <div className="space-y-0.5">
              <p className="font-heading text-base font-semibold text-foreground">{title}</p>
              <p className="text-xs text-muted-foreground tabular-nums">
                {`${count} ${active.unit}${count === 1 ? '' : 's'} in the selected range`}
              </p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-1 rounded-xl border border-border bg-muted/35 p-1 shadow-inner">
            {TREND_GRANULARITIES.map((gran) => {
              const GranIcon = gran.icon
              const isActive = active.key === gran.key
              return (
                <button
                  key={gran.key}
                  type="button"
                  onClick={() => onViewChange(gran.key)}
                  aria-pressed={isActive}
                  className={cn(
                    'inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition-all',
                    isActive
                      ? 'bg-background text-foreground shadow-sm ring-1 ring-border/60'
                      : 'text-muted-foreground hover:text-foreground',
                  )}
                >
                  <GranIcon className="size-3.5" />
                  {gran.label}
                </button>
              )
            })}
          </div>
        </div>
        {isLoading && count === 0 ? (
          <Skeleton className="h-[312px] w-full rounded-xl" />
        ) : (
          <ActivityTimeChart items={series} granularity={active.key} />
        )}
      </CardContent>
    </Card>
  )
}

// Take `icon` as the raw prop and re-bind to PascalCase inside the body —
// destructure-renames in the param list trip eslint-plugin-react's
// usage detection in this repo's config.
function StatCard({ label, value, icon, accent, isLoading }) {
  const Icon = icon
  return (
    <Card className="border-border bg-card shadow-sm shadow-black/5">
      <CardContent className="flex items-start gap-4 px-5 py-5">
        <div
          className={cn(
            'flex size-11 shrink-0 items-center justify-center rounded-xl bg-muted/60',
            accent,
          )}
        >
          <Icon className="size-5" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
            {label}
          </p>
          <p className="font-heading text-2xl font-semibold tabular-nums leading-tight text-foreground">
            {isLoading ? (
              <Skeleton as="span" className="inline-block h-7 w-16 align-middle" />
            ) : (
              formatNumber(value)
            )}
          </p>
        </div>
      </CardContent>
    </Card>
  )
}

function FeedRow({ item }) {
  const am = actionMetaFor(item.action)
  const em = ENTITY_META[item.entity] ?? {
    label: humanize(item.entity),
    icon: Activity,
    accent: 'text-muted-foreground',
  }
  const ActionIcon = am.icon
  const EntityIcon = em.icon
  // Project/person cascade rows get their parent code surfaced as a
  // chip so 50 near-identical rows are visually groupable. The raw
  // details string still goes on the title for hover.
  const cascade = parseCascadeFromDetails(item.details)
  return (
    <li className="flex items-start gap-3 px-4 py-3">
      <span className={cn('flex size-8 shrink-0 items-center justify-center rounded-full bg-muted/60', am.accent)}>
        <ActionIcon className="size-4" />
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-sm leading-snug text-foreground">
          <Link
            to={`/admin/analytics/users/${encodeURIComponent(item.actorUsername || '')}`}
            className="font-semibold hover:underline"
          >
            {item.actorUsername || 'unknown'}
          </Link>{' '}
          <span className="text-muted-foreground">{am.label.toLowerCase()}</span>{' '}
          <span className={cn('inline-flex items-center gap-1 align-middle', em.accent)}>
            <EntityIcon className="size-3.5" />
            <span className="text-foreground">{em.label.replace(/s$/, '')}</span>
          </span>{' '}
          {item.entityCode ? (
            <span className="rounded bg-muted px-1.5 py-0.5 font-mono text-[11px] text-foreground/80">
              {item.entityCode}
            </span>
          ) : null}
          {cascade ? (
            <span
              className="ml-1.5 inline-flex items-center gap-1 rounded-full border border-border bg-muted/40 px-1.5 py-0.5 align-middle text-[10px] font-medium text-muted-foreground"
              title={item.details}
            >
              <CornerDownRight className="size-3" />
              <span>via</span>
              <span className="font-mono text-foreground">{cascade.code}</span>
            </span>
          ) : null}
        </p>
        {item.details && !cascade ? (
          <p className="mt-0.5 truncate text-xs text-muted-foreground" title={item.details}>
            {item.details}
          </p>
        ) : null}
      </div>
      <span
        className="shrink-0 text-xs tabular-nums text-muted-foreground"
        title={item.occurredAt ? new Date(item.occurredAt).toLocaleString() : ''}
      >
        {formatRelative(item.occurredAt)}
      </span>
    </li>
  )
}

// Date range filter — preset bar (7d/30d/90d/1y/Custom) plus, when
// Custom is active, two `<input type="date">` fields. Validates
// from <= to client-side; renders a small inline error otherwise so
// the user doesn't fire the request and get the server's 400 back.
function DateRangeFilter({
  mode,
  setMode,
  days,
  setDays,
  from,
  setFrom,
  to,
  setTo,
  className,
}) {
  const isInvalidRange =
    mode === 'custom' &&
    Boolean(from) &&
    Boolean(to) &&
    new Date(dateInputToInstant(from, 'start')) >
      new Date(dateInputToInstant(to, 'end'))

  return (
    <div className={cn('flex flex-wrap items-center gap-2', className)}>
      <div className="flex items-center gap-1 rounded-lg border border-border bg-card/60 p-0.5 shadow-sm">
        {RANGE_PRESETS.map((opt) => (
          <button
            key={opt.value}
            type="button"
            onClick={() => {
              setMode('preset')
              setDays(opt.value)
            }}
            className={cn(
              'rounded-md px-2.5 py-1 text-xs font-medium tabular-nums transition-colors',
              mode === 'preset' && days === opt.value
                ? 'bg-background text-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground',
            )}
          >
            {opt.label}
          </button>
        ))}
        <button
          type="button"
          onClick={() => setMode('custom')}
          className={cn(
            'inline-flex items-center gap-1 rounded-md px-2.5 py-1 text-xs font-medium transition-colors',
            mode === 'custom'
              ? 'bg-background text-foreground shadow-sm'
              : 'text-muted-foreground hover:text-foreground',
          )}
        >
          <CalendarRange className="size-3.5" />
          Custom
        </button>
      </div>
      {mode === 'custom' ? (
        <div className="flex items-center gap-1.5">
          <Input
            type="date"
            value={from}
            onChange={(e) => setFrom(e.target.value)}
            max={to || undefined}
            className="h-8 w-[150px] text-xs"
            aria-label="From date"
          />
          <span className="text-xs text-muted-foreground">–</span>
          <Input
            type="date"
            value={to}
            onChange={(e) => setTo(e.target.value)}
            min={from || undefined}
            className="h-8 w-[150px] text-xs"
            aria-label="To date"
          />
          {isInvalidRange ? (
            <span className="text-xs font-medium text-destructive">
              From must be ≤ To
            </span>
          ) : null}
        </div>
      ) : null}
    </div>
  )
}

function MonthlyChart({ monthly }) {
  return <ActivityTimeChart items={monthly} granularity="monthly" />
}

// Action filter — checkbox-style chip row. The admin picks any subset
// of action types and the page passes that subset through every
// downstream call as `actions=CREATE,READ,…`. An "All" chip clears
// the selection (server then returns every action; same as no filter).
function ActionFilter({ catalog, selected, onChange, isLoading }) {
  const safeCatalog = Array.isArray(catalog) && catalog.length > 0
    ? catalog
    : DEFAULT_ACTION_CATALOG
  const selectedSet = new Set((selected || []).map((s) => String(s).toUpperCase()))
  const allActive = selectedSet.size === 0

  const toggle = (action) => {
    const upper = String(action).toUpperCase()
    const next = new Set(selectedSet)
    if (next.has(upper)) next.delete(upper)
    else next.add(upper)
    onChange(Array.from(next))
  }

  return (
    <div className="flex flex-wrap items-center gap-1.5">
      <button
        type="button"
        onClick={() => onChange([])}
        disabled={isLoading}
        className={cn(
          'inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium transition-colors',
          allActive
            ? 'border-primary/40 bg-primary/10 text-primary'
            : 'border-border bg-background text-muted-foreground hover:border-primary/30 hover:text-foreground',
        )}
      >
        All actions
      </button>
      {safeCatalog.map((action) => {
        const meta = actionMetaFor(action)
        const Icon = meta.icon
        const upper = String(action).toUpperCase()
        const isActive = selectedSet.has(upper)
        return (
          <button
            key={upper}
            type="button"
            onClick={() => toggle(action)}
            disabled={isLoading}
            className={cn(
              'inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium transition-colors',
              isActive
                ? 'border-primary/40 bg-primary/10 text-primary'
                : 'border-border bg-background text-muted-foreground hover:border-primary/30 hover:text-foreground',
            )}
          >
            <Icon className={cn('size-3.5', isActive ? 'text-primary' : meta.accent)} />
            {meta.label}
          </button>
        )
      })}
    </div>
  )
}

function ErrorCard({ message, onRetry }) {
  return (
    <Card className="border-border bg-card shadow-sm shadow-black/5">
      <CardContent className="flex flex-col items-start gap-3 px-6 py-6">
        <p className="text-sm text-destructive">{message}</p>
        {onRetry ? (
          <Button type="button" variant="outline" className="gap-2" onClick={onRetry}>
            <RefreshCw className="size-4" />
            Retry
          </Button>
        ) : null}
      </CardContent>
    </Card>
  )
}

export {
  ActionFilter,
  ActivityTimeChart,
  ActivityTrendCard,
  DailyChart,
  DateRangeFilter,
  ErrorCard,
  FeedRow,
  MonthlyChart,
  StatCard,
  WeeklyChart,
  YearlyChart,
}
