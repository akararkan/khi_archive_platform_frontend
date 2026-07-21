// Reusable, dependency-free chart primitives for the admin analytics
// reports. Everything is hand-built SVG/flex in the same house style as
// analytics-shared.jsx's ActivityTimeChart — no chart library — and stays
// theme-aware by driving colour through Tailwind tokens (SVG arcs use
// `stroke="currentColor"` so a `text-emerald-500` class paints the mark,
// which the browser resolves per light/dark like any other token).
//
// Each primitive is "dumb": the caller passes already-resolved Tailwind
// classes per segment (bars use a `barClass` like `bg-emerald-500`; donut
// arcs use a `colorClass` like `text-emerald-500`). The report components
// own the semantics — which colour means "public" vs "hidden" — so these
// stay generic and reusable.

import { cn } from '@/lib/utils'
import { formatNumber, percentOf } from '@/pages/admin/analytics-constants'

// Small coloured dot used across legends and inline labels.
function Dot({ className }) {
  return (
    <span
      aria-hidden="true"
      className={cn('inline-block size-2.5 shrink-0 rounded-[3px]', className)}
    />
  )
}

// Companion data table for a chart — visually hidden (sr-only) on screen,
// but real everywhere it matters:
//   • screen readers get the numbers as an actual table (the dataviz
//     method's "a table view exists" requirement), and
//   • AdminPrintManager picks it up as a print section (classes are
//     stripped in the print document, so it renders as a normal branded
//     table titled via data-print-title).
// Opt-in: charts only render one when the caller passes `printTitle` —
// per-row micro-bars inside visible tables must NOT each become a print
// section of their own.
function ChartDataTable({ title, head, rows }) {
  if (!title || !Array.isArray(rows) || rows.length === 0) return null
  return (
    <table className="sr-only" data-chart-table="true" data-print-title={title}>
      <caption>{title}</caption>
      <thead>
        <tr>
          {head.map((label) => (
            <th key={label} scope="col">{label}</th>
          ))}
        </tr>
      </thead>
      <tbody>
        {rows.map((cells, rowIndex) => (
          <tr key={rowIndex}>
            {cells.map((cell, cellIndex) => (
              <td key={cellIndex}>{cell}</td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  )
}

// Legend row — always rendered alongside any multi-segment chart so
// identity is never colour-alone (dataviz non-negotiable). Each item:
//   { key, label, value?, hint?, dotClass }
function ChartLegend({ items, className }) {
  const safe = Array.isArray(items) ? items.filter(Boolean) : []
  if (safe.length === 0) return null
  return (
    <ul className={cn('flex flex-wrap items-center gap-x-4 gap-y-1.5', className)}>
      {safe.map((item) => (
        <li key={item.key} className="inline-flex items-center gap-1.5 text-xs">
          <Dot className={item.dotClass} />
          <span className="text-muted-foreground">{item.label}</span>
          {item.value != null ? (
            <span className="font-semibold tabular-nums text-foreground">
              {formatNumber(item.value)}
            </span>
          ) : null}
          {item.hint ? (
            <span className="tabular-nums text-muted-foreground">{item.hint}</span>
          ) : null}
        </li>
      ))}
    </ul>
  )
}

// A single horizontal stacked bar (part-to-whole). Segments render left
// to right with a 2px surface gap between fills (dataviz mark spec) so
// adjacent tones stay separable even under CVD. Zero-value segments are
// dropped. `segments`: { key, label, value, barClass }.
function StackedProgressBar({ segments, total, height = 'h-3', showLegend = true, printTitle, className }) {
  const safe = Array.isArray(segments) ? segments.filter((s) => s && Number(s.value) > 0) : []
  const sum = total != null ? Number(total) : safe.reduce((acc, s) => acc + Number(s.value || 0), 0)

  return (
    <div className={cn('space-y-2.5', className)}>
      <ChartDataTable
        title={printTitle}
        head={['Segment', 'Count', 'Share']}
        rows={safe.map((s) => [s.label, formatNumber(s.value), `${percentOf(s.value, sum).toFixed(1)}%`])}
      />
      <div
        className={cn('flex w-full overflow-hidden rounded-full bg-muted/50', height)}
        role="img"
        aria-label={safe.map((s) => `${s.label}: ${formatNumber(s.value)}`).join(', ') || 'No data'}
      >
        {safe.map((seg, index) => {
          const width = percentOf(seg.value, sum)
          if (width <= 0) return null
          return (
            <div
              key={seg.key}
              className={cn(
                'group relative h-full transition-[width] duration-500',
                seg.barClass,
                index > 0 && 'border-l-2 border-card',
              )}
              style={{ width: `${width}%` }}
              title={`${seg.label}: ${formatNumber(seg.value)} (${width.toFixed(1)}%)`}
            />
          )
        })}
      </div>
      {showLegend ? (
        <ChartLegend
          items={safe.map((s) => ({
            key: s.key,
            label: s.label,
            value: s.value,
            hint: `${percentOf(s.value, sum).toFixed(0)}%`,
            dotClass: s.barClass,
          }))}
        />
      ) : null}
    </div>
  )
}

// Horizontal bar list — the workhorse for "magnitude by category" (maqam
// type distribution, inventory by type, per-type visibility). Each row is
// a label, a proportional bar, and a right-aligned value. Bars are sized
// against the largest value so the longest fills the track. Rows carry a
// hover tooltip. `items`: { key, label, value, barClass, secondary? }.
function HBarList({ items, valueFormatter = formatNumber, emptyLabel = 'No data', printTitle, className }) {
  const safe = Array.isArray(items) ? items.filter(Boolean) : []
  const max = safe.reduce((m, item) => Math.max(m, Number(item.value) || 0), 0)

  if (safe.length === 0) {
    return (
      <p className="rounded-lg border border-dashed border-border bg-muted/15 px-4 py-6 text-center text-xs text-muted-foreground">
        {emptyLabel}
      </p>
    )
  }

  return (
    <>
      <ChartDataTable
        title={printTitle}
        head={['Label', 'Count']}
        rows={safe.map((item) => [
          item.secondary ? `${item.label} ${item.secondary}` : item.label,
          valueFormatter(item.value),
        ])}
      />
      <ul className={cn('space-y-2.5', className)}>
      {safe.map((item) => {
        const width = max > 0 ? Math.max(1.5, ((Number(item.value) || 0) / max) * 100) : 0
        return (
          <li key={item.key} className="group grid grid-cols-[minmax(6rem,9rem)_minmax(0,1fr)_auto] items-center gap-3">
            <span className="truncate text-xs font-medium text-foreground" title={item.label}>
              {item.label}
            </span>
            <span className="relative flex h-2.5 w-full items-center overflow-hidden rounded-full bg-muted/50">
              <span
                className={cn('h-full rounded-full transition-[width] duration-500', item.barClass)}
                style={{ width: `${width}%` }}
                title={`${item.label}: ${valueFormatter(item.value)}`}
              />
            </span>
            <span className="min-w-[2.5rem] text-right text-xs font-semibold tabular-nums text-foreground">
              {valueFormatter(item.value)}
              {item.secondary ? (
                <span className="ml-1 font-normal text-muted-foreground">{item.secondary}</span>
              ) : null}
            </span>
          </li>
        )
      })}
      </ul>
    </>
  )
}

// Donut / ring chart for a small part-to-whole split (2–5 segments) —
// consensus vs disagreement, projects visible vs hidden. Arcs are SVG
// circles driven by stroke-dasharray with a 2px gap between segments;
// colour comes from `colorClass` (a text-* token) via currentColor. A
// centre figure shows the headline. Always paired with a legend by the
// caller. `segments`: { key, label, value, colorClass }.
function DonutChart({
  segments,
  size = 168,
  thickness = 18,
  centerValue,
  centerLabel,
  printTitle,
  className,
}) {
  const safe = Array.isArray(segments) ? segments.filter((s) => s && Number(s.value) > 0) : []
  const values = safe.map((s) => Number(s.value) || 0)
  const total = values.reduce((acc, v) => acc + v, 0)
  const radius = (size - thickness) / 2
  const circumference = 2 * Math.PI * radius
  const gap = total > 0 && safe.length > 1 ? 2 : 0 // px gap between arcs

  // Cumulative start offset per arc, computed as a prefix sum so nothing
  // is reassigned during render (n is 2–5, so the O(n²) scan is free).
  const arcs = safe.map((seg, i) => {
    const startValue = values.slice(0, i).reduce((acc, v) => acc + v, 0)
    const rawLen = total > 0 ? (values[i] / total) * circumference : 0
    const dash = Math.max(0, rawLen - gap)
    const startOffset = total > 0 ? (startValue / total) * circumference : 0
    return (
      <circle
        key={seg.key}
        cx={size / 2}
        cy={size / 2}
        r={radius}
        fill="none"
        stroke="currentColor"
        strokeWidth={thickness}
        strokeDasharray={`${dash} ${circumference - dash}`}
        strokeDashoffset={-startOffset}
        className={cn('transition-[stroke-dasharray] duration-500', seg.colorClass)}
      >
        <title>{`${seg.label}: ${formatNumber(seg.value)} (${percentOf(seg.value, total).toFixed(1)}%)`}</title>
      </circle>
    )
  })

  return (
    <>
      {/* Sibling, not child — role="img" would make a nested table
          presentational for screen readers. */}
      <ChartDataTable
        title={printTitle}
        head={['Segment', 'Count', 'Share']}
        rows={safe.map((s) => [s.label, formatNumber(s.value), `${percentOf(s.value, total).toFixed(1)}%`])}
      />
      <div
        className={cn('relative shrink-0', className)}
        style={{ width: size, height: size }}
        role="img"
        aria-label={
          safe.length > 0
            ? safe.map((s) => `${s.label}: ${formatNumber(s.value)}`).join(', ')
            : 'No data'
        }
      >
        <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
          {/* Track */}
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            strokeWidth={thickness}
            className="stroke-muted/50"
          />
          <g transform={`rotate(-90 ${size / 2} ${size / 2})`}>{arcs}</g>
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
          <span className="font-heading text-2xl font-semibold tabular-nums leading-none text-foreground">
            {centerValue}
          </span>
          {centerLabel ? (
            <span className="mt-1 max-w-[5.5rem] text-[10px] font-medium uppercase tracking-[0.14em] text-muted-foreground">
              {centerLabel}
            </span>
          ) : null}
        </div>
      </div>
    </>
  )
}

export { ChartDataTable, ChartLegend, DonutChart, HBarList, StackedProgressBar }
