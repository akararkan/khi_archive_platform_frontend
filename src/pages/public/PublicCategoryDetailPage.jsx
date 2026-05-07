import { useEffect, useMemo, useState } from 'react'
import { useParams, useSearchParams } from 'react-router-dom'
import { Tags } from 'lucide-react'

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
import { guestCategory, guestCategoryProjects } from '@/services/guest'

const PAGE_SIZE = 24

function PublicCategoryDetailPage() {
  const { code } = useParams()
  const [searchParams, setSearchParams] = useSearchParams()
  const page = Number(searchParams.get('page') || 0) || 0

  const [category, setCategory] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [projects, setProjects] = useState(null)
  const [projectsLoading, setProjectsLoading] = useState(true)

  useEffect(() => {
    const ctrl = new AbortController()
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setLoading(true)
     
    setError('')
    guestCategory(code, { signal: ctrl.signal })
      .then((d) => setCategory(d || null))
      .catch((err) => {
        if (err?.code === 'ERR_CANCELED') return
        setError('Could not load this category.')
      })
      .finally(() => setLoading(false))
    return () => ctrl.abort()
  }, [code])

  useEffect(() => {
    const ctrl = new AbortController()
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setProjectsLoading(true)
    guestCategoryProjects(code, { page, size: PAGE_SIZE, signal: ctrl.signal })
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
      { to: '/public/categories', label: 'Categories' },
      { label: category?.name || code },
    ],
    [category, code],
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
  if (error || !category) {
    return (
      <PageContainer>
        <ErrorState error={error || 'Category not found.'} />
      </PageContainer>
    )
  }

  const items = projects?.content || []

  return (
    <>
      <section className="border-b border-border/60 bg-gradient-to-b from-primary/5 via-background to-background">
        <PageContainer className="py-10 sm:py-14">
          <PageHeader
            eyebrow="Category"
            title={category.name || category.categoryCode}
            description={category.description}
            breadcrumbs={breadcrumbs}
            action={<CodeBadge code={category.categoryCode} size="lg" />}
          />
          {Array.isArray(category.keywords) && category.keywords.length > 0 ? (
            <div className="mt-5 flex flex-wrap gap-1.5">
              {category.keywords.map((k) => (
                <TagPill key={k}>{k}</TagPill>
              ))}
            </div>
          ) : null}
        </PageContainer>
      </section>

      <PageContainer>
        <h2 className="mb-4 font-heading text-lg font-semibold text-foreground">
          Projects in this category
          {Number.isFinite(projects?.totalElements) ? (
            <span className="ml-2 text-sm font-normal text-muted-foreground">
              · {projects.totalElements.toLocaleString()}
            </span>
          ) : null}
        </h2>
        {projectsLoading ? (
          <CardGridSkeleton count={8} />
        ) : items.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-border bg-muted/20 px-6 py-12 text-center text-sm text-muted-foreground">
            No projects assigned to this category yet.
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

export { PublicCategoryDetailPage }
