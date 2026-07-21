// The three data-rich analytics reports — Inventory, Visibility, and
// Maqam — built on the shared chart primitives (analytics-charts.jsx) and
// the house card/table style. Each is a pure presentational component: the
// page owns fetching + polling and passes `data` (possibly null while
// loading) plus an `isLoading` flag.
//
// Colour discipline (see the dataviz method):
//   • categorical identity  → the per-entity tone map below (colour follows
//     the entity, never its rank — same hues the rest of the admin uses).
//   • status                → emerald = complete/public/consensus,
//     amber = partial/pending/private, rose = trashed/hidden/disagreement,
//     muted = neutral/unclassified.

import { Link } from 'react-router-dom'
import {
  AlertTriangle,
  CheckCircle2,
  Clock,
  Eye,
  EyeOff,
  FolderOpen,
  Globe,
  Handshake,
  Headphones,
  Layers,
  ListChecks,
  Lock,
  Music2,
  Trash2,
  UserCircle2,
  Users,
} from 'lucide-react'

import { Card, CardContent } from '@/components/ui/card'
import { EmptyState } from '@/components/ui/empty-state'
import { Skeleton } from '@/components/ui/skeleton'
import { cn } from '@/lib/utils'
import {
  ENTITY_META,
  INVENTORY_ORDER,
  VISIBILITY_MEDIA_ORDER,
  formatCompactDuration,
  formatNumber,
  formatRelative,
  percentOf,
} from '@/pages/admin/analytics-constants'
import { ChartLegend, DonutChart, HBarList, StackedProgressBar } from '@/pages/admin/analytics-charts'

// Solid bar fill per entity — the bg-* counterpart to ENTITY_META's text-*
// accents. Kept as an explicit map (not string-derived) so a hue rename is
// a single deliberate edit.
const ENTITY_BAR = {
  audio: 'bg-rose-500',
  video: 'bg-emerald-500',
  image: 'bg-orange-500',
  text: 'bg-teal-500',
  maqam: 'bg-fuchsia-500',
  physical_media: 'bg-cyan-500',
  project: 'bg-sky-500',
  person: 'bg-violet-500',
  category: 'bg-amber-500',
  user: 'bg-indigo-500',
}

// ── Small shared building blocks ─────────────────────────────────────────

// Section wrapper: an icon-badged header row over the card body. Mirrors
// the "Activity over time" card header on the Overview tab.
function ReportSection({ icon, title, subtitle, right, children, className }) {
  // Rebind icon → PascalCase locally; a rename in the param list isn't
  // seen as a usage by this repo's eslint (see StatCard in analytics-shared).
  const Icon = icon
  return (
    <Card className={cn('rounded-2xl border-border bg-card shadow-md shadow-black/5', className)}>
      <CardContent className="space-y-5 px-5 py-5 sm:px-6 sm:py-6">
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-border/70 pb-5">
          <div className="flex items-center gap-3">
            <span className="grid size-10 shrink-0 place-items-center rounded-xl border border-primary/15 bg-primary/[0.07] text-primary">
              <Icon className="size-5" />
            </span>
            <div className="space-y-0.5">
              <p className="font-heading text-base font-semibold text-foreground">{title}</p>
              {subtitle ? <p className="text-xs text-muted-foreground tabular-nums">{subtitle}</p> : null}
            </div>
          </div>
          {right ?? null}
        </div>
        {children}
      </CardContent>
    </Card>
  )
}

// KPI tile — accepts an already-formatted string/number `value` (so it can
// show a duration like "142h 13m" or a plain count) plus an optional hint.
function MetricTile({ label, value, icon, accent, hint, isLoading }) {
  const Icon = icon
  return (
    <Card
      className="border-border bg-card shadow-sm shadow-black/5"
      data-print-stat="true"
      data-print-label={label}
      data-print-value={value == null ? '—' : String(value)}
      data-print-hint={hint || undefined}
    >
      <CardContent className="flex items-start gap-4 px-5 py-5">
        <div className={cn('flex size-11 shrink-0 items-center justify-center rounded-xl bg-muted/60', accent)}>
          <Icon className="size-5" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">{label}</p>
          {isLoading ? (
            <Skeleton className="mt-1 h-7 w-16" />
          ) : (
            <p className="font-heading text-2xl font-semibold tabular-nums leading-tight text-foreground">
              {value}
            </p>
          )}
          {hint && !isLoading ? <p className="mt-0.5 text-[11px] text-muted-foreground">{hint}</p> : null}
        </div>
      </CardContent>
    </Card>
  )
}

function EntityCell({ kind }) {
  const meta = ENTITY_META[kind] ?? { label: kind, icon: Layers, accent: 'text-muted-foreground' }
  const Icon = meta.icon
  return (
    <div className="flex items-center gap-2.5">
      <span className={cn('flex size-7 shrink-0 items-center justify-center rounded-lg bg-muted/60', meta.accent)}>
        <Icon className="size-3.5" />
      </span>
      <span className="font-medium text-foreground">{meta.label}</span>
    </div>
  )
}

const TH = 'px-3 py-2 text-right text-[11px] font-semibold uppercase tracking-wider text-muted-foreground'
const TH_LEFT = 'px-4 py-2 text-left text-[11px] font-semibold uppercase tracking-wider text-muted-foreground'
const TD = 'px-3 py-2.5 text-right tabular-nums'

// ══════════════════════════════════════════════════════════════════════
// 1. INVENTORY
// ══════════════════════════════════════════════════════════════════════

function InventoryReport({ data, isLoading }) {
  const byType = data?.byType ?? {}
  const rows = INVENTORY_ORDER.map((kind) => ({
    kind,
    active: Number(byType[kind]?.active ?? 0),
    trashed: Number(byType[kind]?.trashed ?? 0),
    total: Number(byType[kind]?.total ?? 0),
  }))
  const grandTotal = data?.grandTotal ?? rows.reduce((s, r) => s + r.total, 0)

  const barItems = rows
    .filter((r) => r.total > 0)
    .sort((a, b) => b.total - a.total)
    .map((r) => ({
      key: r.kind,
      label: ENTITY_META[r.kind]?.label ?? r.kind,
      value: r.total,
      barClass: ENTITY_BAR[r.kind] ?? 'bg-primary',
      secondary: r.trashed > 0 ? `(${formatNumber(r.trashed)} trashed)` : null,
    }))

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <MetricTile label="Total items" value={formatNumber(grandTotal)} icon={Layers}
                    accent="text-primary" isLoading={isLoading}
                    hint={data?.generatedAt ? `As of ${formatRelative(data.generatedAt)}` : null} />
        <MetricTile label="Active" value={formatNumber(data?.totalActive)} icon={CheckCircle2}
                    accent="text-emerald-600 dark:text-emerald-400" isLoading={isLoading} />
        <MetricTile label="In trash" value={formatNumber(data?.totalTrashed)} icon={Trash2}
                    accent="text-rose-600 dark:text-rose-400" isLoading={isLoading} />
      </div>

      <ReportSection
        icon={Layers}
        title="Items by type"
        subtitle={`${rows.filter((r) => r.total > 0).length} of ${INVENTORY_ORDER.length} types in use`}
      >
        {isLoading && !data ? (
          <Skeleton className="h-56 w-full rounded-xl" />
        ) : (
          <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)] lg:items-start">
            {/* Magnitude view */}
            <HBarList items={barItems} emptyLabel="No items yet" />

            {/* Full table: active / trashed / total + a share bar */}
            <div className="overflow-x-auto rounded-xl border border-border">
              <table className="w-full min-w-[26rem] text-sm" data-print-title="Inventory by type">
                <thead className="bg-muted/40">
                  <tr>
                    <th className={TH_LEFT}>Type</th>
                    <th className={TH}>Active</th>
                    <th className={TH}>Trashed</th>
                    <th className={TH}>Total</th>
                    <th className={cn(TH, 'w-24')}>Share</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {rows.map((r) => (
                    <tr key={r.kind} className={r.total === 0 ? 'opacity-50' : undefined}>
                      <td className="px-4 py-2.5 text-left"><EntityCell kind={r.kind} /></td>
                      <td className={cn(TD, 'text-emerald-600 dark:text-emerald-400')}>{formatNumber(r.active)}</td>
                      <td className={cn(TD, r.trashed ? 'text-rose-600 dark:text-rose-400' : 'text-muted-foreground')}>
                        {formatNumber(r.trashed)}
                      </td>
                      <td className={cn(TD, 'font-semibold text-foreground')}>{formatNumber(r.total)}</td>
                      <td className="px-3 py-2.5">
                        <span className="flex h-2 w-full items-center overflow-hidden rounded-full bg-muted/50" title={`${percentOf(r.total, grandTotal).toFixed(1)}% of all items`}>
                          <span className={cn('h-full rounded-full', ENTITY_BAR[r.kind] ?? 'bg-primary')}
                                style={{ width: `${percentOf(r.total, grandTotal)}%` }} />
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot className="border-t-2 border-border bg-muted/25">
                  <tr>
                    <td className="px-4 py-2.5 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">Total</td>
                    <td className={cn(TD, 'font-semibold text-foreground')}>{formatNumber(data?.totalActive)}</td>
                    <td className={cn(TD, 'font-semibold text-foreground')}>{formatNumber(data?.totalTrashed)}</td>
                    <td className={cn(TD, 'font-semibold text-foreground')}>{formatNumber(grandTotal)}</td>
                    <td />
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
        )}
      </ReportSection>
    </div>
  )
}

// ══════════════════════════════════════════════════════════════════════
// 2. VISIBILITY
// ══════════════════════════════════════════════════════════════════════

function VisibilityReport({ data, isLoading }) {
  const mediaByType = data?.mediaByType ?? {}
  const projectsVisible = Number(data?.projectsVisible ?? 0)
  const projectsHidden = Number(data?.projectsHidden ?? 0)
  const projectsTotal = data?.projectsTotal ?? projectsVisible + projectsHidden

  const itemsVisible = Number(data?.itemsInVisibleProjects ?? 0)
  const itemsHidden = Number(data?.itemsInHiddenProjects ?? 0)
  const itemsTotal = itemsVisible + itemsHidden

  const mediaRows = VISIBILITY_MEDIA_ORDER.map((kind) => ({
    kind,
    publicCount: Number(mediaByType[kind]?.publicCount ?? 0),
    privateCount: Number(mediaByType[kind]?.privateCount ?? 0),
    total: Number(mediaByType[kind]?.total ?? 0),
  }))

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <MetricTile label="Visible projects" value={formatNumber(projectsVisible)} icon={Eye}
                    accent="text-emerald-600 dark:text-emerald-400" isLoading={isLoading} />
        <MetricTile label="Hidden projects" value={formatNumber(projectsHidden)} icon={EyeOff}
                    accent="text-rose-600 dark:text-rose-400" isLoading={isLoading} />
        <MetricTile label="Public media" value={formatNumber(data?.mediaPublicTotal)} icon={Globe}
                    accent="text-emerald-600 dark:text-emerald-400" isLoading={isLoading} />
        <MetricTile label="Private media" value={formatNumber(data?.mediaPrivateTotal)} icon={Lock}
                    accent="text-amber-600 dark:text-amber-400" isLoading={isLoading} />
      </div>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,0.85fr)_minmax(0,1.15fr)] lg:items-stretch">
        {/* Projects visible vs hidden — donut */}
        <ReportSection icon={FolderOpen} title="Project visibility" subtitle={`${formatNumber(projectsTotal)} active projects`}>
          {isLoading && !data ? (
            <Skeleton className="mx-auto h-44 w-44 rounded-full" />
          ) : projectsTotal === 0 ? (
            <EmptyState icon={FolderOpen} title="No projects yet" description="Visibility splits appear once projects exist." />
          ) : (
            <div className="flex flex-col items-center gap-5 sm:flex-row sm:justify-center">
              <DonutChart
                segments={[
                  { key: 'visible', label: 'Visible', value: projectsVisible, colorClass: 'text-emerald-500' },
                  { key: 'hidden', label: 'Hidden', value: projectsHidden, colorClass: 'text-rose-500' },
                ]}
                centerValue={`${percentOf(projectsVisible, projectsTotal).toFixed(0)}%`}
                centerLabel="Public"
                printTitle="Project visibility"
              />
              <ChartLegend
                className="flex-col !items-start gap-2"
                items={[
                  { key: 'visible', label: 'Visible to guests', value: projectsVisible, dotClass: 'bg-emerald-500' },
                  { key: 'hidden', label: 'Hidden from guests', value: projectsHidden, dotClass: 'bg-rose-500' },
                ]}
              />
            </div>
          )}
        </ReportSection>

        {/* Media public vs private per type — table + stacked bars */}
        <ReportSection icon={Globe} title="Media visibility by type" subtitle="Public vs private across active media">
          {isLoading && !data ? (
            <Skeleton className="h-56 w-full rounded-xl" />
          ) : (
            <div className="overflow-x-auto rounded-xl border border-border">
              <table className="w-full min-w-[30rem] text-sm" data-print-title="Media visibility by type">
                <thead className="bg-muted/40">
                  <tr>
                    <th className={TH_LEFT}>Type</th>
                    <th className={TH}>Public</th>
                    <th className={TH}>Private</th>
                    <th className={TH}>Total</th>
                    <th className={cn(TH_LEFT, 'w-40 text-left')}>Split</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {mediaRows.map((r) => (
                    <tr key={r.kind}>
                      <td className="px-4 py-2.5 text-left"><EntityCell kind={r.kind} /></td>
                      <td className={cn(TD, 'text-emerald-600 dark:text-emerald-400')}>{formatNumber(r.publicCount)}</td>
                      <td className={cn(TD, r.privateCount ? 'text-amber-600 dark:text-amber-400' : 'text-muted-foreground')}>
                        {formatNumber(r.privateCount)}
                      </td>
                      <td className={cn(TD, 'font-semibold text-foreground')}>{formatNumber(r.total)}</td>
                      <td className="px-4 py-2.5">
                        <StackedProgressBar
                          height="h-2.5"
                          showLegend={false}
                          total={r.total}
                          segments={[
                            { key: 'public', label: 'Public', value: r.publicCount, barClass: 'bg-emerald-500' },
                            { key: 'private', label: 'Private', value: r.privateCount, barClass: 'bg-amber-500' },
                          ]}
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </ReportSection>
      </div>

      {/* Items-in-hidden-projects callout — the important UX nuance */}
      {!isLoading || data ? (
        <Card className={cn(
          'rounded-2xl border shadow-sm',
          itemsHidden > 0
            ? 'border-amber-500/30 bg-amber-500/[0.06]'
            : 'border-border bg-card shadow-black/5',
        )}>
          <CardContent className="space-y-4 px-5 py-5 sm:px-6">
            <div className="flex items-start gap-3">
              <span className={cn(
                'grid size-10 shrink-0 place-items-center rounded-xl',
                itemsHidden > 0 ? 'bg-amber-500/15 text-amber-600 dark:text-amber-400' : 'bg-muted/60 text-muted-foreground',
              )}>
                <AlertTriangle className="size-5" />
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-foreground">
                  {formatNumber(itemsHidden)} item{itemsHidden === 1 ? '' : 's'} hidden because their project is hidden
                </p>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  An item can be public itself yet still invisible to guests when its parent project is hidden.
                  {itemsTotal > 0 ? ` That's ${percentOf(itemsHidden, itemsTotal).toFixed(1)}% of all items.` : ''}
                </p>
              </div>
            </div>
            {itemsTotal > 0 ? (
              <StackedProgressBar
                total={itemsTotal}
                printTitle="Items in visible vs hidden projects"
                segments={[
                  { key: 'visible', label: 'In visible projects', value: itemsVisible, barClass: 'bg-emerald-500' },
                  { key: 'hidden', label: 'In hidden projects', value: itemsHidden, barClass: 'bg-amber-500' },
                ]}
              />
            ) : null}
          </CardContent>
        </Card>
      ) : null}
    </div>
  )
}

// ══════════════════════════════════════════════════════════════════════
// 3. MAQAM (the richest — teacher leaderboard has the most fields)
// ══════════════════════════════════════════════════════════════════════

function MaqamReport({ overview, isLoading }) {
  const teachers = Array.isArray(overview?.teachers) ? overview.teachers : []
  const activeRecords = Number(overview?.totalActiveRecords ?? 0)

  const unclassified = Number(overview?.recordsUnclassified ?? 0)
  const partial = Number(overview?.recordsPartiallyVoted ?? 0)
  const full = Number(overview?.recordsFullyVoted ?? 0)
  const consensus = Number(overview?.recordsWithConsensus ?? 0)
  const disagreement = Number(overview?.recordsWithDisagreement ?? 0)
  const fullyVoted = consensus + disagreement

  const distribution = overview?.maqamTypeDistribution ?? {}
  const distItems = Object.entries(distribution)
    .map(([type, count]) => ({ key: type, label: type, value: Number(count) || 0, barClass: 'bg-fuchsia-500' }))
    .sort((a, b) => b.value - a.value)

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <MetricTile label="Teachers" value={formatNumber(overview?.totalTeachers)} icon={Users}
                    accent="text-primary" isLoading={isLoading} />
        <MetricTile label="Active records" value={formatNumber(activeRecords)} icon={Music2}
                    accent="text-fuchsia-600 dark:text-fuchsia-400" isLoading={isLoading} />
        <MetricTile label="Votes cast" value={formatNumber(overview?.totalVotesCast)} icon={CheckCircle2}
                    accent="text-emerald-600 dark:text-emerald-400" isLoading={isLoading}
                    hint={overview?.totalAssignments != null ? `of ${formatNumber(overview.totalAssignments)} assignments` : null} />
        <MetricTile label="Pending votes" value={formatNumber(overview?.totalPendingVotes)} icon={Clock}
                    accent="text-amber-600 dark:text-amber-400" isLoading={isLoading} />
      </div>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1.15fr)_minmax(0,0.85fr)] lg:items-stretch">
        {/* Classification progress — stacked bar */}
        <ReportSection icon={ListChecks} title="Classification progress" subtitle={`${formatNumber(activeRecords)} active records`}>
          {isLoading && !overview ? (
            <Skeleton className="h-24 w-full rounded-xl" />
          ) : activeRecords === 0 ? (
            <EmptyState icon={Music2} title="No maqam records yet" description="Progress appears once records are assigned to teachers." />
          ) : (
            <div className="space-y-5 pt-1">
              <StackedProgressBar
                height="h-4"
                total={activeRecords}
                printTitle="Maqam classification progress"
                segments={[
                  { key: 'full', label: 'Fully voted', value: full, barClass: 'bg-emerald-500' },
                  { key: 'partial', label: 'Partially voted', value: partial, barClass: 'bg-amber-500' },
                  { key: 'unclassified', label: 'Unclassified', value: unclassified, barClass: 'bg-muted-foreground/40' },
                ]}
              />
              <div className="grid grid-cols-3 gap-3 pt-1">
                {[
                  { label: 'Fully voted', value: full, accent: 'text-emerald-600 dark:text-emerald-400' },
                  { label: 'Partially voted', value: partial, accent: 'text-amber-600 dark:text-amber-400' },
                  { label: 'Unclassified', value: unclassified, accent: 'text-muted-foreground' },
                ].map((s) => (
                  <div key={s.label} className="rounded-xl border border-border/80 bg-muted/20 px-3.5 py-3">
                    <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">{s.label}</p>
                    <p className={cn('mt-0.5 font-heading text-xl font-semibold tabular-nums', s.accent)}>{formatNumber(s.value)}</p>
                    <p className="text-[10px] tabular-nums text-muted-foreground">{percentOf(s.value, activeRecords).toFixed(0)}%</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </ReportSection>

        {/* Consensus vs disagreement — donut (of fully-voted records) */}
        <ReportSection icon={Handshake} title="Agreement" subtitle={`${formatNumber(fullyVoted)} fully-voted records`}>
          {isLoading && !overview ? (
            <Skeleton className="mx-auto h-44 w-44 rounded-full" />
          ) : fullyVoted === 0 ? (
            <EmptyState icon={Handshake} title="No fully-voted records" description="Agreement shows once every assigned teacher has voted on a record." />
          ) : (
            <div className="flex flex-col items-center gap-5 sm:flex-row sm:justify-center">
              <DonutChart
                segments={[
                  { key: 'consensus', label: 'Consensus', value: consensus, colorClass: 'text-emerald-500' },
                  { key: 'disagreement', label: 'Disagreement', value: disagreement, colorClass: 'text-rose-500' },
                ]}
                centerValue={`${percentOf(consensus, fullyVoted).toFixed(0)}%`}
                centerLabel="Agree"
                printTitle="Agreement on fully-voted records"
              />
              <ChartLegend
                className="flex-col !items-start gap-2"
                items={[
                  { key: 'consensus', label: 'Consensus', value: consensus, dotClass: 'bg-emerald-500' },
                  { key: 'disagreement', label: 'Disagreement', value: disagreement, dotClass: 'bg-rose-500' },
                ]}
              />
            </div>
          )}
        </ReportSection>
      </div>

      {/* Listen totals + maqam-type distribution */}
      <div className="grid gap-6 lg:grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)] lg:items-start">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-1">
          <MetricTile label="Listen sessions" value={formatNumber(overview?.totalListenSessions)} icon={Headphones}
                      accent="text-sky-600 dark:text-sky-400" isLoading={isLoading} />
          <MetricTile label="Total listening time" value={formatCompactDuration(overview?.totalListenSeconds)} icon={Clock}
                      accent="text-violet-600 dark:text-violet-400" isLoading={isLoading}
                      hint="Across all teachers" />
        </div>
        <ReportSection
          icon={Music2}
          title="Maqam-type distribution"
          subtitle={distItems.length > 0 ? `${distItems.length} distinct types` : null}
          right={<span className="text-[10px] text-muted-foreground">Raw labels — case-sensitive</span>}
        >
          {isLoading && !overview ? (
            <Skeleton className="h-40 w-full rounded-xl" />
          ) : (
            <HBarList items={distItems} emptyLabel="No votes cast yet" printTitle="Maqam-type distribution" />
          )}
        </ReportSection>
      </div>

      {/* Teacher leaderboard — the rich table */}
      <ReportSection icon={Users} title="Teacher leaderboard" subtitle={`${formatNumber(teachers.length)} teacher${teachers.length === 1 ? '' : 's'}`}>
        {isLoading && !overview ? (
          <Skeleton className="h-64 w-full rounded-xl" />
        ) : teachers.length === 0 ? (
          <EmptyState icon={Users} title="No teachers assigned" description="Assign teachers to maqam records to see their classification activity here." />
        ) : (
          <div className="overflow-x-auto rounded-xl border border-border">
            <table className="w-full min-w-[52rem] text-sm" data-print-title="Teacher leaderboard">
              <thead className="bg-muted/40">
                <tr>
                  <th className={cn(TH_LEFT, 'w-[44px] text-center')}>#</th>
                  <th className={TH_LEFT}>Teacher</th>
                  <th className={TH}>Assigned</th>
                  <th className={cn(TH_LEFT, 'w-40 text-left')}>Vote progress</th>
                  <th className={TH}>Pending</th>
                  <th className={TH}>Types</th>
                  <th className={TH}>Records heard</th>
                  <th className={TH}>Listen time</th>
                  <th className={TH}>Last listen</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {teachers.map((t, idx) => {
                  const assigned = Number(t.assignedRecords ?? 0)
                  const votes = Number(t.votesCast ?? 0)
                  const pct = percentOf(votes, assigned)
                  return (
                    <tr key={t.teacherUsername || t.teacherUserId || idx} className="group">
                      <td className="px-4 py-2.5 text-center text-xs tabular-nums text-muted-foreground">{idx + 1}</td>
                      <td className="px-4 py-2.5 text-left">
                        <div className="flex items-center gap-2.5">
                          <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
                            <UserCircle2 className="size-4" />
                          </span>
                          <div className="min-w-0">
                            <p className="truncate text-sm font-semibold text-foreground">
                              {t.teacherDisplayName || t.teacherUsername || '—'}
                            </p>
                            {t.teacherUsername ? (
                              <Link
                                to={`/admin/analytics/users/${encodeURIComponent(t.teacherUsername)}`}
                                className="truncate font-mono text-[11px] text-muted-foreground hover:text-primary hover:underline"
                              >
                                @{t.teacherUsername}
                              </Link>
                            ) : null}
                          </div>
                        </div>
                      </td>
                      <td className={cn(TD, 'font-semibold text-foreground')}>{formatNumber(assigned)}</td>
                      <td className="px-4 py-2.5">
                        <div className="flex items-center gap-2">
                          <span className="flex h-2 w-full min-w-[3rem] items-center overflow-hidden rounded-full bg-muted/50" title={`${votes} of ${assigned} voted`}>
                            <span className="h-full rounded-full bg-emerald-500" style={{ width: `${pct}%` }} />
                          </span>
                          <span className="shrink-0 text-[11px] font-medium tabular-nums text-muted-foreground">{pct.toFixed(0)}%</span>
                        </div>
                      </td>
                      <td className={cn(TD, Number(t.pendingVotes) ? 'text-amber-600 dark:text-amber-400' : 'text-muted-foreground')}>
                        {formatNumber(t.pendingVotes)}
                      </td>
                      <td className={cn(TD, 'text-muted-foreground')}>{formatNumber(t.distinctMaqamTypes)}</td>
                      <td className={cn(TD, 'text-muted-foreground')}>{formatNumber(t.recordsListened)}</td>
                      <td className={cn(TD, 'text-foreground')}>{formatCompactDuration(t.totalListenSeconds)}</td>
                      <td className={cn(TD, 'text-xs text-muted-foreground')}>{t.lastListenAt ? formatRelative(t.lastListenAt) : '—'}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </ReportSection>
    </div>
  )
}

export { InventoryReport, MaqamReport, VisibilityReport }
