import { useEffect, useMemo, useState } from 'react'
import { useParams, useSearchParams } from 'react-router-dom'

import { CodeBadge } from '@/components/ui/code-badge'
import {
  CardGridSkeleton,
  ErrorState,
  PageContainer,
  PageHeader,
  ResultCard,
  TagPill,
} from '@/components/public/PublicShared'
import { projectMeta } from '@/components/public/public-helpers'
import { DataPagination } from '@/components/ui/pagination'
import { Skeleton } from '@/components/ui/skeleton'
import { guestPerson, guestPersonProjects } from '@/services/guest'

const PAGE_SIZE = 24

function getInitials(text) {
  if (!text) return '·'
  const parts = String(text).trim().split(/\s+/).filter(Boolean)
  return (
    parts
      .slice(0, 2)
      .map((p) => p.charAt(0).toUpperCase())
      .join('') || '·'
  )
}

function PublicPersonDetailPage() {
  const { code } = useParams()
  const [searchParams, setSearchParams] = useSearchParams()
  const page = Number(searchParams.get('page') || 0) || 0

  const [person, setPerson] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [projects, setProjects] = useState(null)
  const [projectsLoading, setProjectsLoading] = useState(true)

  useEffect(() => {
    const ctrl = new AbortController()
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setLoading(true)
     
    setError('')
    guestPerson(code, { signal: ctrl.signal })
      .then((d) => setPerson(d || null))
      .catch((err) => {
        if (err?.code === 'ERR_CANCELED') return
        setError('Could not load this person.')
      })
      .finally(() => setLoading(false))
    return () => ctrl.abort()
  }, [code])

  useEffect(() => {
    const ctrl = new AbortController()
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setProjectsLoading(true)
    guestPersonProjects(code, { page, size: PAGE_SIZE, signal: ctrl.signal })
      .then((d) => setProjects(d || null))
      .catch(() => {})
      .finally(() => setProjectsLoading(false))
    return () => ctrl.abort()
  }, [code, page])

  const setPage = (next) => {
    const sp = new URLSearchParams(searchParams)
    if (next) sp.set('page', String(next))
    else sp.delete('page')
    setSearchParams(sp)
  }

  const breadcrumbs = useMemo(
    () => [
      { to: '/public', label: 'Home' },
      { to: '/public/persons', label: 'Persons' },
      { label: person?.fullName || person?.name || code },
    ],
    [person, code],
  )

  if (loading) {
    return (
      <PageContainer>
        <Skeleton className="h-6 w-32" />
        <Skeleton className="mt-4 h-10 w-2/3" />
        <Skeleton className="mt-3 h-4 w-1/2" />
      </PageContainer>
    )
  }
  if (error || !person) {
    return (
      <PageContainer>
        <ErrorState error={error || 'Person not found.'} />
      </PageContainer>
    )
  }

  const items = projects?.content || []
  const display = person.fullName || person.name || person.personCode

  return (
    <>
      <section className="border-b border-border/60 bg-gradient-to-b from-primary/5 via-background to-background">
        <PageContainer className="py-10 sm:py-14">
          <div className="flex flex-col gap-6 sm:flex-row sm:items-start">
            <div className="flex size-24 shrink-0 items-center justify-center rounded-3xl bg-gradient-to-br from-primary/20 to-primary/5 font-heading text-3xl font-semibold text-primary ring-1 ring-primary/20 shadow-md shadow-primary/10">
              {getInitials(display)}
            </div>
            <div className="min-w-0 flex-1">
              <PageHeader
                eyebrow="Person"
                title={display}
                description={person.bio || person.description}
                breadcrumbs={breadcrumbs}
                action={<CodeBadge code={person.personCode} size="lg" />}
              />
              <div className="mt-1 flex flex-wrap gap-1.5">
                {person.personType ? <TagPill tone="primary">{person.personType}</TagPill> : null}
                {person.gender ? <TagPill tone="muted">{person.gender}</TagPill> : null}
                {person.region ? <TagPill>{person.region}</TagPill> : null}
                {person.nickname ? <TagPill>aka {person.nickname}</TagPill> : null}
              </div>
            </div>
          </div>

          {(person.places?.length || person.tags?.length || person.keywords?.length) ? (
            <div className="mt-6 grid gap-4 sm:grid-cols-3">
              {person.places?.length ? (
                <Panel title="Places">
                  <div className="flex flex-wrap gap-1.5">
                    {person.places.map((p) => (
                      <TagPill key={p}>{p}</TagPill>
                    ))}
                  </div>
                </Panel>
              ) : null}
              {person.tags?.length ? (
                <Panel title="Tags">
                  <div className="flex flex-wrap gap-1.5">
                    {person.tags.map((t) => (
                      <TagPill key={t} tone="primary">
                        {t}
                      </TagPill>
                    ))}
                  </div>
                </Panel>
              ) : null}
              {person.keywords?.length ? (
                <Panel title="Keywords">
                  <div className="flex flex-wrap gap-1.5">
                    {person.keywords.map((k) => (
                      <TagPill key={k}>{k}</TagPill>
                    ))}
                  </div>
                </Panel>
              ) : null}
            </div>
          ) : null}
        </PageContainer>
      </section>

      <PageContainer>
        <h2 className="mb-4 font-heading text-lg font-semibold text-foreground">
          Projects
          {Number.isFinite(projects?.totalElements) ? (
            <span className="ml-2 text-sm font-normal text-muted-foreground">
              · {projects.totalElements.toLocaleString()}
            </span>
          ) : null}
        </h2>
        {projectsLoading ? (
          <CardGridSkeleton count={6} />
        ) : items.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-border bg-muted/20 px-6 py-12 text-center text-sm text-muted-foreground">
            No projects linked to this person yet.
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {items.map((p) => (
                <ResultCard
                  key={p.projectCode}
                  kind="project"
                  to={`/public/projects/${p.projectCode}`}
                  title={p.projectName}
                  subtitle={p.projectCode}
                  description={p.description}
                  meta={projectMeta(p)}
                />
              ))}
            </div>
            <DataPagination
              page={projects?.number ?? page}
              totalPages={projects?.totalPages ?? 0}
              totalElements={projects?.totalElements ?? 0}
              pageSize={projects?.size ?? PAGE_SIZE}
              onPageChange={setPage}
              className="mt-8"
            />
          </>
        )}
      </PageContainer>
    </>
  )
}

function Panel({ title, children }) {
  return (
    <div className="rounded-2xl border border-border bg-card p-4 shadow-sm shadow-black/5">
      <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
        {title}
      </p>
      <div className="mt-2.5">{children}</div>
    </div>
  )
}

export { PublicPersonDetailPage }
