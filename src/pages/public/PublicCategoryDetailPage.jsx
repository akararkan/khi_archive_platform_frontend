import { useEffect, useRef, useState } from 'react'
import { useParams } from 'react-router-dom'

import { DETAIL, UI, cardFromItem } from '@/components/khi/khi-data'
import KhiCard from '@/components/khi/KhiCard'
import {
  KhiDetailShell, KhiBreadcrumb, KhiDetailHero, KhiDetailDisc, KhiInfoGrid,
  KhiSectionCard, KhiEmptyState,
} from '@/components/khi/KhiDetail'
import { CardGridSkeleton } from '@/components/public/PublicShared'
import { IconCategory, IconProject } from '@/components/khi/icons'
import { guestCategory, guestCategoryProjects } from '@/services/guest'

const PAGE_SIZE = 24

function PublicCategoryDetailPage() {
  const { code } = useParams()

  const [category, setCategory] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [projects, setProjects] = useState([])
  const [projectMeta, setProjectMeta] = useState({
    totalElements: 0,
    totalPages: 0,
    number: 0,
  })
  const [projectPage, setProjectPage] = useState(0)
  const [projectsLoading, setProjectsLoading] = useState(true)
  const [projectsLoadingMore, setProjectsLoadingMore] = useState(false)
  const projectQueryRef = useRef('')

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
    const fresh = projectQueryRef.current !== code
    projectQueryRef.current = code
    const targetPage = fresh ? 0 : projectPage
    const append = targetPage > 0
    if (append) setProjectsLoadingMore(true)
    else setProjectsLoading(true)
    guestCategoryProjects(code, { page: targetPage, size: PAGE_SIZE, signal: ctrl.signal })
      .then((d) => {
        if (ctrl.signal.aborted) return
        const content = d?.content || []
        setProjects((prev) => (append ? [...prev, ...content] : content))
        setProjectMeta({
          totalElements: Number(d?.totalElements ?? content.length),
          totalPages: Number(d?.totalPages ?? (content.length ? 1 : 0)),
          number: Number(d?.number ?? targetPage),
        })
      })
      .catch(() => {})
      .finally(() => {
        if (!ctrl.signal.aborted) {
          setProjectsLoading(false)
          setProjectsLoadingMore(false)
        }
      })
    return () => ctrl.abort()
  }, [code, projectPage])

  if (loading || error || !category) {
    return <KhiDetailShell loading={loading} error={error} notFound={!category} />
  }

  const title = category.categoryName || category.name || DETAIL.none
  const items = projects
  const total = projectMeta.totalElements
  const hasMore =
    projectMeta.totalPages > 0
      ? projectMeta.number < projectMeta.totalPages - 1
      : items.length < total

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
            {hasMore ? (
              <div className="show-more-wrap">
                <button
                  type="button"
                  className="show-more-btn"
                  onClick={() => setProjectPage(projectMeta.number + 1)}
                  disabled={projectsLoadingMore}
                >
                  {projectsLoadingMore ? UI.loadingMore : UI.showMore}
                  <span className="sm-count">
                    {items.length.toLocaleString()} / {total.toLocaleString()}
                  </span>
                </button>
              </div>
            ) : total > PAGE_SIZE ? (
              <p className="show-more-done">{`${total.toLocaleString()} ${DETAIL.projects}`}</p>
            ) : null}
          </>
        )}
      </KhiSectionCard>
    </KhiDetailShell>
  )
}

export { PublicCategoryDetailPage }
