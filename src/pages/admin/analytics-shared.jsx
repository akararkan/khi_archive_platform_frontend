// Shared React components for the admin analytics screens. Pure helpers
// + constants live in `analytics-constants.js` to keep this file
// component-only (Vite's fast-refresh rule).

import { Link } from 'react-router-dom'
import { Activity, CalendarRange, CornerDownRight, RefreshCw } from 'lucide-react'

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

// Sparkline — pure SVG, no chart lib. Sorted ascending by date so the
// rightmost bar is most recent (the eye reads left-to-right, oldest →
// newest). Single SVG scales cleanly to any container width.
function DailyChart({ daily, height = 64 }) {
  const data = Array.isArray(daily) && daily.length > 0
    ? [...daily]
        .map((d) => ({ ...d, total: Number(d.total ?? 0) }))
        .sort((a, b) => String(a.date).localeCompare(String(b.date)))
    : []

  if (data.length === 0) {
    return (
      <div className="flex h-16 items-center justify-center text-xs text-muted-foreground">
        No activity in this range.
      </div>
    )
  }

  const max = Math.max(1, ...data.map((d) => d.total))
  const barWidth = 100 / data.length
  return (
    <svg
      role="img"
      aria-label="Daily activity"
      viewBox={`0 0 100 ${height}`}
      preserveAspectRatio="none"
      className="block h-16 w-full"
    >
      {data.map((d, idx) => {
        const h = (d.total / max) * (height - 4)
        return (
          <rect
            key={d.date || idx}
            x={idx * barWidth + barWidth * 0.1}
            y={height - h}
            width={barWidth * 0.8}
            height={Math.max(0.5, h)}
            rx={0.6}
            className="fill-primary/70"
          >
            <title>{`${d.date}: ${formatNumber(d.total)} action${d.total === 1 ? '' : 's'}`}</title>
          </rect>
        )
      })}
    </svg>
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

export { DailyChart, StatCard, FeedRow, ErrorCard, DateRangeFilter }
