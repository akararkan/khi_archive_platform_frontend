import { useEffect, useState } from 'react'
import { useParams, useSearchParams } from 'react-router-dom'

import { DETAIL, cardFromItem } from '@/components/khi/khi-data'
import KhiCard from '@/components/khi/KhiCard'
import {
  KhiDetailShell, KhiBreadcrumb, KhiDetailHero, KhiDetailDisc, KhiInfoGrid,
  KhiSectionCard, KhiEmptyState, KhiPager,
} from '@/components/khi/KhiDetail'
import { CardGridSkeleton } from '@/components/public/PublicShared'
import { IconCategory, IconProject } from '@/components/khi/icons'
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
      .then((d) => { if (!ctrl.signal.aborted) setCategory(d || null) })
      .catch((err) => { if (err?.code !== 'ERR_CANCELED') setError('Could not load this category.') })
      .finally(() => { if (!ctrl.signal.aborted) setLoading(false) })
    return () => ctrl.abort()
  }, [code])

  useEffect(() => {
    const ctrl = new AbortController()
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setProjectsLoading(true)
    guestCategoryProjects(code, { page, size: PAGE_SIZE, signal: ctrl.signal })
      .then((d) => { if (!ctrl.signal.aborted) setProjects(d || null) })
      .catch(() => {})
      .finally(() => { if (!ctrl.signal.aborted) setProjectsLoading(false) })
    return () => ctrl.abort()
  }, [code, page])

  const setPage = (next) => {
    const sp = new URLSearchParams(searchParams)
    if (next) sp.set('page', String(next))
    else sp.delete('page')
    setSearchParams(sp)
  }

  if (loading || error || !category) {
    return <KhiDetailShell loading={loading} error={error} notFound={!category} />
  }

  const title = category.categoryName || category.name || DETAIL.none
  const items = projects?.content || []
  const total = projects?.totalElements

  const infoCards = [
    { icon: IconCategory, label: DETAIL.name, value: title },
    { icon: IconProject, label: DETAIL.projects, value: Number.isFinite(total) ? total.toLocaleString() : null },
  ]

  return (
    <KhiDetailShell>
      <KhiDetailHero
        kind="category"
        title={title}
        description={category.description}
        breadcrumb={<KhiBreadcrumb items={[
          { to: '/public', label: DETAIL.home },
          { to: '/public/browse?type=category', label: 'پۆلەکان' },
          { label: title },
        ]} />}
        disc={<KhiDetailDisc kind="category" alt={title} badge={DETAIL.category} />}
      />

      <KhiInfoGrid items={infoCards} />

      <KhiSectionCard icon={IconProject} title={DETAIL.projects} count={Number.isFinite(total) ? total : (items.length || 0)}>
        {projectsLoading ? (
          <CardGridSkeleton count={4} />
        ) : items.length === 0 ? (
          <KhiEmptyState
            title="هێشتا هیچ پڕۆژەیەک نییە"
            text="هەرکاتێک پڕۆژەیەک لەم پۆلەدا تۆماربکرێت، لێرە دەردەکەوێت."
          />
        ) : (
          <>
            <div className="khi-grid">
              {items.map((p) => (
                <KhiCard key={p.projectCode || p.code} record={cardFromItem(p, 'project')} />
              ))}
            </div>
            <KhiPager page={projects?.number ?? page} totalPages={projects?.totalPages ?? 0} onPage={setPage} />
          </>
        )}
      </KhiSectionCard>
    </KhiDetailShell>
  )
}

export { PublicCategoryDetailPage }
