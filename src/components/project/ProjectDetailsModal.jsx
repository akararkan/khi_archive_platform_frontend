import { useEffect } from 'react'
import { FolderOpen, X } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { CodeBadge } from '@/components/ui/code-badge'
import { useIsAdmin } from '@/hooks/use-current-profile'

function formatInstant(instant) {
  if (!instant) return null
  try {
    return new Intl.DateTimeFormat('en-GB', {
      year: 'numeric',
      month: 'short',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    }).format(new Date(instant))
  } catch {
    return String(instant)
  }
}

function Field({ label, value }) {
  if (value === null || value === undefined || value === '') return null
  return (
    <div className="space-y-1.5">
      <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
        {label}
      </p>
      <p className="break-words text-sm leading-6 text-foreground">{value}</p>
    </div>
  )
}

function Section({ title, children }) {
  return (
    <section className="space-y-3">
      <div className="flex items-center gap-3">
        <h3 className="text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
          {title}
        </h3>
        <div className="h-px flex-1 bg-border" />
      </div>
      {children}
    </section>
  )
}

function Chips({ items }) {
  if (!items?.length) return <p className="text-sm text-muted-foreground">—</p>
  return (
    <div className="flex flex-wrap gap-1.5">
      {items.map((item, index) => (
        <span
          key={`${item}-${index}`}
          className="inline-flex items-center rounded-full border bg-muted/60 px-2.5 py-0.5 text-[11px] font-medium text-foreground/80"
        >
          {item}
        </span>
      ))}
    </div>
  )
}

function ProjectDetailsModal({ project, open, onOpenChange }) {
  const isAdmin = useIsAdmin()

  useEffect(() => {
    if (!open) return undefined
    const handleEscape = (e) => {
      if (e.key === 'Escape') onOpenChange(false)
    }
    window.addEventListener('keydown', handleEscape)
    return () => window.removeEventListener('keydown', handleEscape)
  }, [onOpenChange, open])

  useEffect(() => {
    if (!open) return undefined
    const original = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = original
    }
  }, [open])

  if (!open || !project) return null

  const personLabel = project.personCode
    ? project.personName || project.personCode
    : 'Untitled (no person)'
  const categories = Array.isArray(project.categories) ? project.categories : []
  const audioCount = Array.isArray(project.audios) ? project.audios.length : project.audioCount

  const hasAudit =
    project.createdAt ||
    project.updatedAt ||
    project.createdBy ||
    project.updatedBy ||
    project.removedAt ||
    project.removedBy

  return (
    <div
      className="fixed inset-0 z-[96] flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm animate-in fade-in-0 duration-200 sm:p-6"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onOpenChange(false)
      }}
      role="dialog"
      aria-modal="true"
      aria-labelledby="project-details-title"
    >
      <div className="relative flex max-h-[92vh] w-full max-w-2xl flex-col overflow-hidden rounded-xl border bg-card text-card-foreground shadow-2xl shadow-black/40 animate-in fade-in-0 zoom-in-95 slide-in-from-bottom-2 duration-200">
        <Button
          type="button"
          variant="ghost"
          size="icon"
          onClick={() => onOpenChange(false)}
          className="absolute right-3 top-3 z-20 size-8 rounded-full bg-background/80 opacity-80 ring-1 ring-border backdrop-blur-md transition hover:opacity-100"
        >
          <X className="size-4" />
          <span className="sr-only">Close</span>
        </Button>

        <div className="relative shrink-0 border-b bg-gradient-to-b from-muted/70 via-muted/20 to-transparent px-6 py-6 sm:px-8 sm:py-7">
          <div className="flex items-start gap-4 pr-10">
            <div className="flex size-12 shrink-0 items-center justify-center rounded-xl border bg-background text-muted-foreground shadow-sm">
              <FolderOpen className="size-5" />
            </div>
            <div className="min-w-0 space-y-2">
              {project.projectCode && (
                <div className="flex flex-wrap items-center gap-2">
                  <CodeBadge code={project.projectCode} />
                  {project.removedAt && (
                    <span className="inline-flex items-center rounded-full border border-amber-500/30 bg-amber-500/10 px-2.5 py-0.5 text-[11px] font-medium text-amber-700 dark:text-amber-300">
                      Removed
                    </span>
                  )}
                </div>
              )}
              <h2
                id="project-details-title"
                className="break-words font-heading text-2xl font-semibold leading-tight tracking-tight text-foreground sm:text-[1.75rem]"
              >
                {project.projectName}
              </h2>
              <div className="flex flex-wrap items-center gap-2 text-sm">
                <span className="text-muted-foreground">person</span>
                <span className="inline-flex items-center gap-1.5 rounded-full border bg-background px-2.5 py-0.5 text-xs font-medium text-foreground">
                  {personLabel}
                  {project.personCode ? (
                    <span className="font-mono text-[10px] text-muted-foreground">
                      {project.personCode}
                    </span>
                  ) : null}
                </span>
                {audioCount != null ? (
                  <span className="inline-flex items-center gap-1.5 rounded-full border bg-background px-2.5 py-0.5 text-xs font-medium text-foreground">
                    {audioCount} audio
                  </span>
                ) : null}
              </div>
            </div>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-7 sm:px-8">
          <div className="space-y-8">
            {project.description && (
              <Section title="Description">
                <p className="whitespace-pre-wrap border-l-2 border-border pl-4 text-sm leading-7 text-foreground/90">
                  {project.description}
                </p>
              </Section>
            )}

            {categories.length > 0 && (
              <Section title="Categories">
                <div className="flex flex-wrap gap-1.5">
                  {categories.map((cat) => (
                    <span
                      key={cat.categoryCode || cat.id}
                      className="inline-flex items-center gap-1.5 rounded-full border bg-muted/40 px-2.5 py-0.5 text-xs font-medium text-foreground"
                    >
                      {cat.categoryName || cat.name || cat.categoryCode}
                      {cat.categoryCode ? (
                        <span className="font-mono text-[10px] text-muted-foreground">
                          {cat.categoryCode}
                        </span>
                      ) : null}
                    </span>
                  ))}
                </div>
              </Section>
            )}

            {((project.tags?.length ?? 0) > 0 || (project.keywords?.length ?? 0) > 0) && (
              <Section title="Classification">
                <div className="grid gap-5 sm:grid-cols-2">
                  <div className="space-y-2">
                    <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                      Tags
                    </p>
                    <Chips items={project.tags} />
                  </div>
                  <div className="space-y-2">
                    <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                      Keywords
                    </p>
                    <Chips items={project.keywords} />
                  </div>
                </div>
              </Section>
            )}

            {isAdmin && hasAudit && (
              <details className="group rounded-lg border bg-muted/20 px-4 py-3 open:pb-4 [&_summary::-webkit-details-marker]:hidden">
                <summary className="flex cursor-pointer list-none items-center justify-between text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground transition-colors hover:text-foreground">
                  <span>Audit Trail</span>
                  <span
                    aria-hidden="true"
                    className="text-base text-muted-foreground transition-transform duration-200 group-open:rotate-90"
                  >
                    ›
                  </span>
                </summary>
                <div className="mt-4 grid gap-5 border-t pt-4 sm:grid-cols-2">
                  <div className="space-y-3">
                    <Field label="Created At" value={formatInstant(project.createdAt)} />
                    <Field label="Created By" value={project.createdBy} />
                    <Field label="Updated At" value={formatInstant(project.updatedAt)} />
                    <Field label="Updated By" value={project.updatedBy} />
                  </div>
                  <div className="space-y-3">
                    <Field label="Removed At" value={formatInstant(project.removedAt)} />
                    <Field label="Removed By" value={project.removedBy} />
                  </div>
                </div>
              </details>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

export { ProjectDetailsModal }
