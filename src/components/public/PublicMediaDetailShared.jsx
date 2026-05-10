import { Link } from 'react-router-dom'
import { ArrowUpRight, FolderOpen, Tags, User as UserIcon } from 'lucide-react'

import {
  PageContainer,
  PageHeader,
  TagPill,
} from '@/components/public/PublicShared'
import { cn } from '@/lib/utils'

// ── MediaHero ──────────────────────────────────────────────────────────
//
// Detail-page hero used by every media kind (audio / video / text /
// image). Holds the kind eyebrow, title, optional original title /
// description, breadcrumbs, and an optional `action` slot for the
// download / open buttons.
//
// `code` is intentionally NOT a prop any more. Showing the raw record
// code (e.g. HAZAZIRA_AUD_RAW_V1_Copy(1)_000001) on the public page is
// internal noise — it appears on the page URL for deep-linking and that
// is the only place a public visitor needs to see it.
function MediaHero({ kind, title, originalTitle, description, breadcrumbs, action }) {
  const showOriginalUnderTitle = originalTitle && originalTitle !== title
  return (
    <section className="border-b border-border/60 bg-gradient-to-b from-primary/5 via-background to-background">
      <PageContainer className="py-10 sm:py-14">
        <PageHeader
          eyebrow={kind}
          title={title}
          description={showOriginalUnderTitle ? originalTitle : description}
          breadcrumbs={breadcrumbs}
        />
        {showOriginalUnderTitle && description ? (
          <p
            className="mt-3 max-w-3xl break-words text-sm leading-7 text-muted-foreground"
            style={{ overflowWrap: 'anywhere' }}
          >
            {description}
          </p>
        ) : null}
        {action ? <div className="mt-6">{action}</div> : null}
      </PageContainer>
    </section>
  )
}

// ── MetaPanel ──────────────────────────────────────────────────────────
function MetaPanel({ title, children }) {
  return (
    <div className="rounded-2xl border border-border bg-card p-5 shadow-sm shadow-black/5">
      <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
        {title}
      </p>
      <dl className="mt-3 space-y-3 text-sm">{children}</dl>
    </div>
  )
}

function MetaRow({ label, children }) {
  if (children == null || children === '' || (Array.isArray(children) && children.length === 0))
    return null
  return (
    <div className="grid grid-cols-[110px_minmax(0,1fr)] items-start gap-3">
      <dt className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
        {label}
      </dt>
      <dd
        className="min-w-0 break-words text-foreground"
        style={{ overflowWrap: 'anywhere' }}
      >
        {children}
      </dd>
    </div>
  )
}

// ── PillRow ────────────────────────────────────────────────────────────
function PillRow({ values, tone = 'default', linkPrefix }) {
  if (!values) return null
  const arr = Array.isArray(values)
    ? values.filter(Boolean)
    : String(values).split(/[,;]/).map((s) => s.trim()).filter(Boolean)
  if (arr.length === 0) return null
  return (
    <div className="flex flex-wrap gap-1.5">
      {arr.map((v) => {
        if (linkPrefix) {
          return (
            <Link
              key={v}
              to={`${linkPrefix}${encodeURIComponent(v)}`}
              className="inline-flex items-center rounded-full border border-border bg-background px-2 py-0.5 text-[11px] font-medium text-foreground/80 hover:border-primary/30 hover:text-primary"
            >
              {v}
            </Link>
          )
        }
        return (
          <TagPill key={v} tone={tone}>
            {v}
          </TagPill>
        )
      })}
    </div>
  )
}

// ── EntityChip ─────────────────────────────────────────────────────────
//
// Inline chip for a linked entity — project, person, category. Carries
// a small kind icon in a primary-tinted tile so the row reads visually
// even before the eye reads the name. Used by ProjectLink, PersonLink
// and CategoryLinks below; all three render this with the right icon
// and a per-kind detail-page route. No code is ever displayed on the
// public surface; the route uses it.
function EntityChip({ to, label, Icon, className }) {
  return (
    <Link
      to={to}
      className={cn(
        'group/chip inline-flex max-w-full items-center gap-1.5 rounded-full border border-border bg-background py-1 pl-1 pr-2.5 text-[12px] font-medium text-foreground transition-all',
        'hover:-translate-y-px hover:border-primary/30 hover:text-primary hover:shadow-sm',
        className,
      )}
    >
      <span className="grid size-5 shrink-0 place-items-center rounded-full bg-primary/10 text-primary ring-1 ring-primary/15">
        {Icon ? <Icon className="size-2.5" strokeWidth={2.5} /> : null}
      </span>
      <span className="min-w-0 truncate">{label}</span>
      <ArrowUpRight className="size-3 shrink-0 opacity-0 transition-opacity group-hover/chip:opacity-100" />
    </Link>
  )
}

// ── ProjectLink ────────────────────────────────────────────────────────
function ProjectLink({ project }) {
  if (!project) return null
  const code = project.projectCode || project.code
  if (!code) return null
  return (
    <EntityChip
      to={`/public/projects/${code}`}
      label={project.projectName || project.name || 'Untitled project'}
      Icon={FolderOpen}
    />
  )
}

// ── PersonLink ─────────────────────────────────────────────────────────
function PersonLink({ person, fallbackCode, fallbackName }) {
  const code = person?.personCode || fallbackCode
  if (!code) return null
  const name = person?.fullName || person?.name || fallbackName || 'Untitled person'
  return (
    <EntityChip to={`/public/persons/${code}`} label={name} Icon={UserIcon} />
  )
}

// ── CategoryLinks ──────────────────────────────────────────────────────
function CategoryLinks({ categories }) {
  if (!Array.isArray(categories) || categories.length === 0) return null
  return (
    <div className="flex flex-wrap gap-1.5">
      {categories.map((c) => (
        <EntityChip
          key={c.categoryCode || c.code}
          to={`/public/categories/${c.categoryCode || c.code}`}
          label={c.categoryName || c.name || 'Untitled category'}
          Icon={Tags}
        />
      ))}
    </div>
  )
}

export {
  MediaHero,
  MetaPanel,
  MetaRow,
  PillRow,
  ProjectLink,
  PersonLink,
  CategoryLinks,
}
