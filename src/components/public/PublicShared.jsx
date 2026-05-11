import { Link } from 'react-router-dom'
import {
  AudioLines,
  FileText,
  Folder,
  FolderOpen,
  Image as ImageIcon,
  Tags,
  User as UserIcon,
  Video as VideoIcon,
} from 'lucide-react'

import { Highlight } from '@/components/ui/highlight'
import { Skeleton } from '@/components/ui/skeleton'
import { MediaCover } from '@/components/public/MediaCover'
import {
  personImageSrc,
  personInitials,
} from '@/components/public/public-helpers'
import { cn } from '@/lib/utils'

// ── Page section wrappers ───────────────────────────────────────────────

function PageContainer({ className, children }) {
  return (
    <div className={cn('mx-auto w-full max-w-7xl px-4 py-8 sm:px-6 sm:py-10 lg:px-8', className)}>
      {children}
    </div>
  )
}

function PageHeader({ eyebrow, title, description, action, breadcrumbs }) {
  return (
    <header className="mb-6 sm:mb-8">
      {breadcrumbs ? <Breadcrumbs items={breadcrumbs} /> : null}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="min-w-0 flex-1">
          {eyebrow ? (
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-primary/80">
              {eyebrow}
            </p>
          ) : null}
          <h1
            className="mt-1 break-words font-heading text-2xl font-semibold tracking-tight text-foreground sm:text-3xl"
            style={{ overflowWrap: 'anywhere' }}
          >
            {title}
          </h1>
          {description ? (
            <p
              className="mt-2 max-w-2xl break-words text-sm leading-6 text-muted-foreground"
              style={{ overflowWrap: 'anywhere' }}
            >
              {description}
            </p>
          ) : null}
        </div>
        {action ? <div className="shrink-0">{action}</div> : null}
      </div>
    </header>
  )
}

function Breadcrumbs({ items }) {
  return (
    <nav aria-label="Breadcrumb" className="mb-3">
      <ol className="flex flex-wrap items-center gap-1.5 text-xs text-muted-foreground">
        {items.map((item, idx) => (
          <li key={`${item.to || idx}-${item.label}`} className="flex items-center gap-1.5">
            {item.to ? (
              <Link to={item.to} className="hover:text-foreground">
                {item.label}
              </Link>
            ) : (
              <span className="text-foreground">{item.label}</span>
            )}
            {idx < items.length - 1 ? <span aria-hidden>/</span> : null}
          </li>
        ))}
      </ol>
    </nav>
  )
}

function SectionTitle({ title, action, description, className }) {
  return (
    <div className={cn('mb-4 flex items-end justify-between gap-3', className)}>
      <div className="min-w-0">
        <h2 className="font-heading text-lg font-semibold text-foreground">{title}</h2>
        {description ? (
          <p className="mt-0.5 text-xs text-muted-foreground">{description}</p>
        ) : null}
      </div>
      {action ? <div className="shrink-0 text-sm">{action}</div> : null}
    </div>
  )
}

// ── Tag pills ───────────────────────────────────────────────────────────

function TagPill({ children, tone = 'default', className, ...rest }) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-medium',
        tone === 'primary'
          ? 'border-primary/30 bg-primary/10 text-primary'
          : tone === 'muted'
            ? 'border-border bg-muted/40 text-muted-foreground'
            : 'border-border bg-background text-foreground/80',
        className,
      )}
      {...rest}
    >
      {children}
    </span>
  )
}

// ── Stat counter (used on the hero) ────────────────────────────────────

function StatCard({ icon: Icon, label, value, accent }) {
  return (
    <div
      className={cn(
        'group relative overflow-hidden rounded-2xl border border-border bg-card p-4 shadow-sm shadow-black/[0.03] transition hover:-translate-y-0.5 hover:shadow-md',
        accent,
      )}
    >
      <div className="flex items-center gap-3">
        <span className="grid size-10 place-items-center rounded-xl bg-primary/10 text-primary">
          {Icon ? <Icon className="size-5" /> : null}
        </span>
        <div className="min-w-0">
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
            {label}
          </p>
          <p className="font-heading text-2xl font-semibold tabular-nums text-foreground">
            {Number.isFinite(value) ? value.toLocaleString() : value || '—'}
          </p>
        </div>
      </div>
    </div>
  )
}

// HeroStat — flat number + label pair, used directly under the hero h1.
function HeroStat({ value, label }) {
  return (
    <div>
      <div className="font-heading text-[28px] font-semibold leading-none tracking-tight tabular-nums text-foreground">
        {Number.isFinite(value) ? value.toLocaleString() : value || '—'}
      </div>
      <div className="mt-1 text-xs text-muted-foreground">{label}</div>
    </div>
  )
}

// ── Entity icon ─────────────────────────────────────────────────────────

const KIND_ICONS = {
  project: FolderOpen,
  category: Tags,
  person: UserIcon,
  audio: AudioLines,
  video: VideoIcon,
  text: FileText,
  image: ImageIcon,
}

function KindIcon({ kind, className }) {
  const Icon = KIND_ICONS[kind] || FolderOpen
  return <Icon className={cn('size-4', className)} />
}

// ── Cards ───────────────────────────────────────────────────────────────

// Result card — shadcn card with an adaptive media cover, a kind badge
// pinned top-left, an ID tag top-right, and a body block beneath: title
// (line-clamp 2), meta line (by · year · region), and a tags row.
//
// Props:
//   to          Detail page link
//   kind        audio | video | text | image | project | person | category
//   title       Card title (highlightable via `query`)
//   subtitle    Code shown in the top-right ID tag (and used as fallback)
//   description Optional second line under the title
//   meta        Optional [string] meta items (region, language, …)
//   tags        Optional string[] of soft pill tags (footer of body)
//   image       Real image URL (used by Image cards)
//   parent      `{ project?, personName?, person?, personImage? }` —
//               renders the parent project as a small line + the person
//               as bold "by", so audios visibly say "Hasan Zirek · 1973".
//   audio/video/text/imageCount   Used by Project covers
//   year, duration                Used by media covers

// Pretty labels for the `matchedOn` chips returned by the unified
// /api/guest/results endpoint — the column the search engine actually
// matched on (title / person / project / tag / keyword). Surfacing this
// inline on each card explains *why* a row showed up, so the user can
// trust the ranked feed instead of treating it as a black box.
const MATCH_LABELS = {
  title: 'title',
  person: 'person',
  project: 'project',
  tag: 'tag',
}

function MatchedOnPills({ values, className }) {
  if (!Array.isArray(values)) return null
  // Keywords are never surfaced on the public catalogue, so strip them
  // out here too — otherwise a backend `matchedOn: ["keyword"]` would
  // leak the term back into the UI.
  const visible = values.filter((v) => v !== 'keyword')
  if (visible.length === 0) return null
  return (
    <div className={cn('flex flex-wrap items-center gap-1', className)}>
      <span className="text-[9px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
        Matched
      </span>
      {visible.map((v) => (
        <span
          key={v}
          className="inline-flex items-center rounded-sm border border-primary/25 bg-primary/8 px-1 py-px font-mono text-[10px] uppercase tracking-[0.06em] text-primary"
        >
          {MATCH_LABELS[v] || v}
        </span>
      ))}
    </div>
  )
}

// `query` is still accepted as a per-instance override but is no longer
// required: <Highlight> falls back to the surrounding <HighlightProvider>
// query, so the page only has to set it once at the grid root for every
// title/description/person/project to light up consistently.
function ResultCard({
  to,
  kind,
  title,
  subtitle,
  description,
  meta,
  tags,
  query,
  image,
  count,
  year,
  duration,
  parent,
  audioCount,
  videoCount,
  textCount,
  imageCount,
  matchedOn,
}) {
  const metaParts = []
  if (parent?.personName) metaParts.push({ kind: 'by', value: parent.personName })
  if (year) metaParts.push({ kind: 'plain', value: year })
  if (Array.isArray(meta)) {
    for (const m of meta) {
      if (m) metaParts.push({ kind: 'plain', value: m })
    }
  }

  return (
    <Link
      to={to}
      data-kind={kind}
      className={cn(
        'group/card relative flex h-full flex-col overflow-hidden rounded-xl border border-border bg-card text-card-foreground shadow-sm shadow-black/[0.03] transition-all duration-200',
        'hover:-translate-y-0.5 hover:border-foreground/20 hover:shadow-lg hover:shadow-black/[0.07]',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40',
      )}
    >
      {/* ── Adaptive cover (16:10) ───────────────────────────────
          Top of the cover hosts the person identity pill (when the
          record is owned by a person) — a profile avatar paired with
          the person's name, sitting on a frosted backdrop so it stays
          legible over any cover variant. The technical code chip and
          the redundant kind badge are gone: kind is already conveyed
          by the cover artwork (waveform, page, photo, …) and by the
          per-kind section header on the unified results page. */}
      <div className="relative aspect-[16/10] w-full overflow-hidden border-b border-border bg-secondary">
        <MediaCover
          kind={kind}
          title={title}
          subtitle={subtitle}
          image={image}
          person={parent?.person}
          duration={duration}
          audioCount={audioCount}
          videoCount={videoCount}
          textCount={textCount}
          imageCount={imageCount}
        />
        {parent?.personName && kind !== 'person' ? (
          <PersonAvatarBadge
            name={parent.personName}
            image={parent.personImage || personImageSrc(parent.person) || null}
          />
        ) : null}
      </div>

      {/* ── Body ─────────────────────────────────────────────── */}
      <div className="flex flex-1 flex-col gap-1.5 p-3.5">
        <h3
          className="line-clamp-2 text-[14px] font-semibold leading-snug tracking-tight text-foreground"
          title={title}
        >
          <Highlight text={title || ''} query={query} />
        </h3>
        {metaParts.length > 0 ? (
          <p className="flex flex-wrap items-baseline gap-x-1.5 gap-y-0.5 text-[12px] text-muted-foreground">
            {metaParts.map((p, i) => (
              <span key={i} className="inline-flex items-center gap-1.5">
                {i > 0 ? <span className="text-muted-foreground/50">·</span> : null}
                <span className={p.kind === 'by' ? 'font-medium text-foreground' : ''}>
                  <Highlight text={String(p.value)} query={query} />
                </span>
              </span>
            ))}
          </p>
        ) : description ? (
          <p className="line-clamp-1 text-[12px] text-muted-foreground">
            <Highlight text={description} query={query} />
          </p>
        ) : null}
        {parent?.project ? (
          <p
            className="mt-0.5 inline-flex max-w-full items-center gap-1.5 text-[11px] text-muted-foreground"
            title={parent.project}
          >
            <span className="grid size-4 shrink-0 place-items-center rounded-[5px] bg-primary/10 text-primary ring-1 ring-primary/15">
              <Folder className="size-2.5" strokeWidth={2.25} />
            </span>
            <span className="min-w-0 truncate font-medium text-foreground/85">
              <Highlight text={parent.project} query={query} />
            </span>
          </p>
        ) : null}
        {Array.isArray(tags) && tags.length > 0 ? (
          <div className="mt-1.5 flex flex-wrap gap-1">
            {tags.slice(0, 3).map((t) => (
              <span
                key={t}
                className="inline-flex items-center rounded border border-border bg-secondary px-1.5 py-0.5 text-[10px] text-muted-foreground"
              >
                {t}
              </span>
            ))}
          </div>
        ) : null}
        {Number.isFinite(count) && !tags?.length ? (
          <p className="mt-1 text-[11px] text-muted-foreground">
            <span className="font-mono tabular-nums">{count.toLocaleString()}</span>{' '}
            {kind === 'text' ? 'pages' : kind === 'project' ? 'records' : ''}
          </p>
        ) : null}
        <MatchedOnPills values={matchedOn} className="mt-1.5" />
      </div>
    </Link>
  )
}

// ── ResultRow (list-mode variant) ──────────────────────────────────────
function ResultRow({
  to,
  kind,
  title,
  subtitle,
  description,
  query,
  image,
  parent,
  meta,
  year,
  duration,
  audioCount,
  videoCount,
  textCount,
  imageCount,
  matchedOn,
}) {
  return (
    <Link
      to={to}
      className={cn(
        'group/row grid grid-cols-[120px_minmax(0,1fr)_auto] items-center gap-4 rounded-xl border border-border bg-card p-3.5 text-card-foreground shadow-sm shadow-black/[0.03] transition-colors',
        'hover:border-foreground/15 hover:bg-secondary',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40',
      )}
    >
      <div className="relative aspect-[16/10] overflow-hidden rounded-md border border-border bg-secondary">
        <MediaCover
          kind={kind}
          title={title}
          subtitle={subtitle}
          image={image}
          person={parent?.person}
          duration={duration}
          audioCount={audioCount}
          videoCount={videoCount}
          textCount={textCount}
          imageCount={imageCount}
        />
      </div>
      <div className="min-w-0">
        <h3 className="truncate text-[15px] font-semibold leading-snug tracking-tight text-foreground">
          <Highlight text={title || ''} query={query} />
        </h3>
        <p className="mt-0.5 flex flex-wrap items-baseline gap-x-1.5 gap-y-0.5 text-[12px] text-muted-foreground">
          {parent?.personName ? (
            <span className="font-medium text-foreground">
              <Highlight text={parent.personName} query={query} />
            </span>
          ) : null}
          {year ? <DotSep value={year} muted /> : null}
          {Array.isArray(meta) && meta[0] ? (
            <DotSep>
              <Highlight text={String(meta[0])} query={query} />
            </DotSep>
          ) : null}
        </p>
        {parent?.project ? (
          <p
            className="mt-1 inline-flex max-w-full items-center gap-1.5 text-[11.5px] text-muted-foreground"
            title={parent.project}
          >
            <span className="grid size-4 shrink-0 place-items-center rounded-[5px] bg-primary/10 text-primary ring-1 ring-primary/15">
              <Folder className="size-2.5" strokeWidth={2.25} />
            </span>
            <span className="min-w-0 truncate font-medium text-foreground/85">
              <Highlight text={parent.project} query={query} />
            </span>
          </p>
        ) : null}
        {description ? (
          <p className="mt-1.5 line-clamp-2 max-w-[640px] text-[12.5px] leading-relaxed text-muted-foreground">
            <Highlight text={description} query={query} />
          </p>
        ) : null}
        <MatchedOnPills values={matchedOn} className="mt-1.5" />
      </div>
      <div className="flex flex-col items-end gap-1.5 text-right">
        <span className="inline-flex h-7 items-center rounded-md border border-border bg-background px-2.5 text-[12px] font-medium text-foreground transition-colors group-hover/row:border-foreground/20">
          Open
        </span>
      </div>
    </Link>
  )
}

// Tiny middle-dot separator used in compact meta lines so the dots stay
// aligned and the surrounding spans wrap cleanly. Set `muted` to render
// the value itself in muted colour (used for the year, which is purely
// contextual).
function DotSep({ value, children, muted }) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <span aria-hidden="true" className="text-muted-foreground/50">·</span>
      <span className={cn(muted ? 'text-muted-foreground' : '')}>
        {value ?? children}
      </span>
    </span>
  )
}

// Person identity pill pinned to the TOP-LEFT of media covers. The
// avatar is the first thing the user sees, so a Hasan Zirek search
// instantly reads as Hasan Zirek's records — name + face together
// before title, year, or any other meta. A frosted-glass backdrop
// keeps it legible whether the cover beneath is a waveform, a
// manuscript page, a photograph, or a tinted hatch.
function PersonAvatarBadge({ name, image }) {
  return (
    <div
      className="absolute left-2.5 top-2.5 z-10 flex max-w-[calc(100%-1.25rem)] items-center gap-1.5 rounded-full border border-border/80 bg-background/85 py-0.5 pl-0.5 pr-2.5 shadow-sm backdrop-blur-sm"
      title={name}
    >
      <span className="grid size-7 place-items-center overflow-hidden rounded-full bg-secondary text-[10px] font-bold text-foreground ring-1 ring-border/70">
        {image ? (
          <img src={image} alt={name || ''} className="size-full object-cover" />
        ) : (
          personInitials(name)
        )}
      </span>
      <span className="min-w-0 truncate text-[11.5px] font-semibold tracking-tight text-foreground">
        {name}
      </span>
    </div>
  )
}

// ── Skeletons / empty / error ──────────────────────────────────────────

function CardGridSkeleton({ count = 8 }) {
  return (
    <div className="grid grid-cols-[repeat(auto-fill,minmax(240px,1fr))] gap-4">
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className="overflow-hidden rounded-xl border border-border bg-card shadow-sm shadow-black/[0.03]"
        >
          <Skeleton className="aspect-[16/10] rounded-none" />
          <div className="space-y-2 p-3.5">
            <Skeleton className="h-3.5 w-3/4" />
            <Skeleton className="h-3 w-1/2" />
          </div>
        </div>
      ))}
    </div>
  )
}

function ListSkeleton({ count = 5 }) {
  return (
    <div className="space-y-2.5">
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className="grid grid-cols-[120px_1fr_auto] items-center gap-4 rounded-xl border border-border bg-card p-3.5"
        >
          <Skeleton className="aspect-[16/10] rounded-md" />
          <div className="space-y-2">
            <Skeleton className="h-4 w-3/5" />
            <Skeleton className="h-3 w-2/5" />
            <Skeleton className="h-3 w-4/5" />
          </div>
          <div className="flex flex-col items-end gap-1.5">
            <Skeleton className="h-4 w-20" />
            <Skeleton className="h-7 w-14 rounded-md" />
          </div>
        </div>
      ))}
    </div>
  )
}

function ListEmpty({ title, description }) {
  return (
    <div className="rounded-xl border border-dashed border-border bg-secondary/40 px-6 py-16 text-center">
      <h3 className="font-heading text-lg font-semibold text-foreground">{title}</h3>
      {description ? (
        <p className="mx-auto mt-1 max-w-md text-sm leading-6 text-muted-foreground">
          {description}
        </p>
      ) : null}
    </div>
  )
}

function ErrorState({ error, onRetry }) {
  return (
    <div className="rounded-xl border border-destructive/30 bg-destructive/5 px-6 py-12 text-center">
      <p className="font-medium text-destructive">{error || 'Something went wrong.'}</p>
      {onRetry ? (
        <button
          type="button"
          onClick={onRetry}
          className="mt-4 inline-flex items-center gap-1.5 rounded-md border border-destructive/30 bg-background px-3 py-1.5 text-xs font-medium text-destructive hover:bg-destructive/10"
        >
          Try again
        </button>
      ) : null}
    </div>
  )
}

// Helpers (`pickFirst`, `projectMeta`, `formatPublicDate`, the facet
// helpers, and `personImageSrc` / `personInitials`) live in
// `./public-helpers.js` so this file stays component-only for
// the react-refresh "only-export-components" rule.

export {
  PageContainer,
  PageHeader,
  Breadcrumbs,
  SectionTitle,
  TagPill,
  StatCard,
  HeroStat,
  KindIcon,
  ResultCard,
  ResultRow,
  CardGridSkeleton,
  ListSkeleton,
  ListEmpty,
  ErrorState,
}
