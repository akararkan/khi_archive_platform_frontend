import { Link } from 'react-router-dom'
import {
  AudioLines,
  FileText,
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
        <div className="min-w-0">
          {eyebrow ? (
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-primary/80">
              {eyebrow}
            </p>
          ) : null}
          <h1 className="mt-1 font-heading text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
            {title}
          </h1>
          {description ? (
            <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">{description}</p>
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

// ── Stat counter ────────────────────────────────────────────────────────

function StatCard({ icon: Icon, label, value, accent }) {
  return (
    <div
      className={cn(
        'group relative overflow-hidden rounded-2xl border border-border bg-card p-4 shadow-sm shadow-black/5 transition hover:-translate-y-0.5 hover:shadow-md',
        accent,
      )}
    >
      <div className="flex items-center gap-3">
        <span className="flex size-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
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

// KCAC-inspired result card with a kind-adaptive cover.
//
// Props:
//   kind, title, subtitle (code), description, query (highlight)
//   image       Optional explicit cover (used by Image cards)
//   count       Optional integer badge (e.g. project media total, text pages)
//   year        Optional 4-digit year for the footer right
//   parent      Optional `{ project, personName, personCode, personImage }`
//               surfaced under the title so audio cards visibly say
//               "Hasan Zirak — Folk Recordings 1962"
//   covers      Override for project counts (audio/video/text/image)

function ResultCard({
  to,
  kind,
  title,
  subtitle,
  description,
  meta,
  query,
  image,
  count,
  year,
  parent,
  audioCount,
  videoCount,
  textCount,
  imageCount,
}) {
  return (
    <Link
      to={to}
      className={cn(
        'group/card relative flex h-full flex-col overflow-hidden rounded-xl border border-border bg-card shadow-sm shadow-black/5 transition-all',
        'hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-xl hover:shadow-black/15',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40',
      )}
    >
      {/* ── Adaptive cover (3:4 portrait) ────────────────────── */}
      <div className="relative aspect-[3/4] w-full overflow-hidden bg-muted">
        <MediaCover
          kind={kind}
          title={title}
          subtitle={subtitle}
          image={image}
          person={parent?.person}
          audioCount={audioCount}
          videoCount={videoCount}
          textCount={textCount}
          imageCount={imageCount}
        />
        {parent?.personName && kind !== 'person' ? (
          <PersonAvatarBadge
            name={parent.personName}
            image={
              parent.personImage ||
              personImageSrc(parent.person) ||
              null
            }
          />
        ) : null}
      </div>

      {/* ── Dark info footer ────────────────────────────────── */}
      <div className="flex flex-1 flex-col gap-1.5 bg-[oklch(0.16_0_0)] px-3 py-2.5 text-white">
        <p
          className="line-clamp-2 font-heading text-[13px] font-semibold leading-snug"
          title={title}
        >
          {query ? (
            <Highlight
              text={title || ''}
              query={query}
              className="bg-yellow-300/30 text-white"
            />
          ) : (
            title
          )}
        </p>
        {parent?.project ? (
          <p
            className="line-clamp-1 text-[11px] leading-relaxed text-white/65"
            title={parent.project}
          >
            <span className="text-white/40">in </span>
            {query ? (
              <Highlight
                text={parent.project}
                query={query}
                className="bg-yellow-300/30 text-white"
              />
            ) : (
              parent.project
            )}
          </p>
        ) : description ? (
          <p className="line-clamp-1 text-[11px] leading-relaxed text-white/60">
            {query ? (
              <Highlight
                text={description}
                query={query}
                className="bg-yellow-300/30 text-white"
              />
            ) : (
              description
            )}
          </p>
        ) : null}
        <div className="mt-auto flex items-center justify-between gap-2 pt-1.5 text-[11px] text-white/70">
          <span className="inline-flex items-center gap-1 font-mono tabular-nums">
            <KindIcon kind={kind} className="size-3" />
            {Number.isFinite(count) ? count.toLocaleString() : subtitle || '—'}
          </span>
          {year ? (
            <span className="font-mono tabular-nums">{year}</span>
          ) : meta && meta.length > 0 ? (
            <span className="truncate text-white/55">{meta[0]}</span>
          ) : null}
        </div>
      </div>
    </Link>
  )
}

// Small circular avatar pinned to the top-left of media covers, showing
// the linked person. Lets a user spot "this audio is by Hasan Zirak"
// without reading the title or footer.
function PersonAvatarBadge({ name, image }) {
  const hue = stableHue(name || 'person')
  const initials = getInitials(name)
  return (
    <div
      className="absolute left-2 top-2 flex items-center gap-1.5 rounded-full bg-background/95 py-0.5 pl-0.5 pr-2 shadow-md ring-1 ring-black/10 backdrop-blur"
      title={name}
    >
      <span
        className="flex size-6 items-center justify-center overflow-hidden rounded-full text-[10px] font-bold text-white"
        style={{
          background: `linear-gradient(135deg, oklch(0.62 0.12 ${hue}), oklch(0.42 0.12 ${hue}))`,
        }}
      >
        {image ? (
          <img src={image} alt={name || ''} className="size-full object-cover" />
        ) : (
          initials
        )}
      </span>
      <span className="max-w-[100px] truncate text-[10px] font-medium text-foreground">
        {name}
      </span>
    </div>
  )
}

function getInitials(name) {
  return personInitials(name)
}

function stableHue(seed) {
  let h = 0
  for (let i = 0; i < String(seed).length; i += 1) {
    h = (h * 31 + String(seed).charCodeAt(i)) >>> 0
  }
  return h % 360
}

function CardGridSkeleton({ count = 8 }) {
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-5">
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className="overflow-hidden rounded-xl border border-border bg-card shadow-sm shadow-black/5"
        >
          <Skeleton className="aspect-[3/4] rounded-none" />
          <div className="space-y-2 bg-[oklch(0.16_0_0)] p-3">
            <Skeleton className="h-3 w-3/4 bg-white/15" />
            <Skeleton className="h-2.5 w-1/2 bg-white/10" />
          </div>
        </div>
      ))}
    </div>
  )
}

function ListEmpty({ title, description }) {
  return (
    <div className="rounded-3xl border border-dashed border-border bg-muted/20 px-6 py-16 text-center">
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
    <div className="rounded-3xl border border-destructive/30 bg-destructive/5 px-6 py-12 text-center">
      <p className="font-medium text-destructive">{error || 'Something went wrong.'}</p>
      {onRetry ? (
        <button
          type="button"
          onClick={onRetry}
          className="mt-4 inline-flex items-center gap-1.5 rounded-full border border-destructive/30 bg-background px-3 py-1.5 text-xs font-medium text-destructive hover:bg-destructive/10"
        >
          Try again
        </button>
      ) : null}
    </div>
  )
}

// Helpers (`pickFirst`, `projectMeta`, `mediaThumbHref`, `formatPublicDate`)
// live in `./public-helpers.js` so the react-refresh "only-export-components"
// rule stays satisfied for this file.

export {
  PageContainer,
  PageHeader,
  Breadcrumbs,
  SectionTitle,
  TagPill,
  StatCard,
  KindIcon,
  ResultCard,
  CardGridSkeleton,
  ListEmpty,
  ErrorState,
}
