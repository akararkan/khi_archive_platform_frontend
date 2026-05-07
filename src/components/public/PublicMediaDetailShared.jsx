import { Link } from 'react-router-dom'

import { CodeBadge } from '@/components/ui/code-badge'
import {
  PageContainer,
  PageHeader,
  TagPill,
} from '@/components/public/PublicShared'

function MediaHero({ kind, title, originalTitle, code, description, breadcrumbs, action }) {
  return (
    <section className="border-b border-border/60 bg-gradient-to-b from-primary/5 via-background to-background">
      <PageContainer className="py-10 sm:py-14">
        <PageHeader
          eyebrow={kind}
          title={title}
          description={originalTitle && originalTitle !== title ? originalTitle : description}
          breadcrumbs={breadcrumbs}
          action={code ? <CodeBadge code={code} size="lg" /> : null}
        />
        {originalTitle && originalTitle !== title && description ? (
          <p className="mt-3 max-w-3xl text-sm leading-6 text-muted-foreground">{description}</p>
        ) : null}
        {action ? <div className="mt-6">{action}</div> : null}
      </PageContainer>
    </section>
  )
}

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
    <div className="grid grid-cols-[120px_1fr] items-start gap-3">
      <dt className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
        {label}
      </dt>
      <dd className="min-w-0 text-foreground">{children}</dd>
    </div>
  )
}

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

function ProjectLink({ project }) {
  if (!project) return null
  const code = project.projectCode || project.code
  if (!code) return null
  return (
    <Link
      to={`/public/projects/${code}`}
      className="inline-flex items-center gap-1.5 font-medium text-foreground hover:text-primary"
    >
      <span className="truncate">{project.projectName || project.name || code}</span>
      <span className="font-mono text-[10px] text-muted-foreground">{code}</span>
    </Link>
  )
}

function PersonLink({ person, fallbackCode, fallbackName }) {
  const code = person?.personCode || fallbackCode
  if (!code) return null
  const name = person?.fullName || person?.name || fallbackName || code
  return (
    <Link
      to={`/public/persons/${code}`}
      className="inline-flex items-center gap-1.5 font-medium text-foreground hover:text-primary"
    >
      <span className="truncate">{name}</span>
      <span className="font-mono text-[10px] text-muted-foreground">{code}</span>
    </Link>
  )
}

function CategoryLinks({ categories }) {
  if (!Array.isArray(categories) || categories.length === 0) return null
  return (
    <div className="flex flex-wrap gap-1.5">
      {categories.map((c) => (
        <Link
          key={c.categoryCode || c.code}
          to={`/public/categories/${c.categoryCode || c.code}`}
          className="inline-flex items-center rounded-full border border-border bg-background px-2 py-0.5 text-[11px] font-medium text-foreground/80 hover:border-primary/30 hover:text-primary"
        >
          {c.categoryName || c.name || c.categoryCode || c.code}
        </Link>
      ))}
    </div>
  )
}

// `formatDate` lives in `./public-helpers.js` (as `formatPublicDate`) so this
// JSX file stays component-only for react-refresh.

export {
  MediaHero,
  MetaPanel,
  MetaRow,
  PillRow,
  ProjectLink,
  PersonLink,
  CategoryLinks,
}
