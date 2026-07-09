import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'

import {
  personImageSrc, personInitials,
} from '@/components/public/public-helpers'
import { DETAIL, UI, yearNum, cardFromItem } from '@/components/khi/khi-data'
import KhiCard from '@/components/khi/KhiCard'
import {
  KhiDetailShell, KhiBreadcrumb, KhiDetailHero, KhiDetailDisc, KhiInfoGrid,
  KhiSectionCard, KhiSeeAll, KhiEmptyState,
} from '@/components/khi/KhiDetail'
import { CardGridSkeleton } from '@/components/public/PublicShared'
import {
  IconPerson, IconMic, IconRegion, IconCalendar, IconTag, IconProject,
} from '@/components/khi/icons'
import { guestPerson, guestPersonProjects } from '@/services/guest'
import { decodePublicCode, isEncodedPublicCode, publicDetailPath } from '@/components/public/public-route-id'

const PAGE_SIZE = 24
const GENDER = { MALE: 'نێر', FEMALE: 'مێ', OTHER: 'تر', M: 'نێر', F: 'مێ' }

function toList(v, cap = 12) {
  if (!v) return []
  const arr = Array.isArray(v) ? v : String(v).split(/[,،;]/)
  return arr.map((s) => String(s).trim()).filter(Boolean).slice(0, cap)
}

function PublicPersonDetailPage() {
  const { code: routeCode } = useParams()
  const navigate = useNavigate()
  const code = decodePublicCode(routeCode)

  const [person, setPerson] = useState(null)
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
    if (routeCode && !isEncodedPublicCode(routeCode)) {
      navigate(publicDetailPath('persons', routeCode), { replace: true })
    }
  }, [navigate, routeCode])

  useEffect(() => {
    const ctrl = new AbortController()
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setLoading(true)
    setError('')
    guestPerson(code, { signal: ctrl.signal })
      .then((d) => { if (!ctrl.signal.aborted) setPerson(d || null) })
      .catch((err) => { if (err?.code !== 'ERR_CANCELED') setError('Could not load this person.') })
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
    guestPersonProjects(code, { page: targetPage, size: PAGE_SIZE, signal: ctrl.signal })
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

  const roles = useMemo(() => toList(person?.personType), [person])

  if (loading || error || !person) {
    return <KhiDetailShell loading={loading} error={error} notFound={!person} />
  }

  const display = person.fullName || person.name || DETAIL.none
  const portrait = personImageSrc(person)
  const year = yearNum(person)
  const items = projects
  const total = projectMeta.totalElements
  const hasMore =
    projectMeta.totalPages > 0
      ? projectMeta.number < projectMeta.totalPages - 1
      : items.length < total

  const heroTags = [
    person.nickname || null,
    person.region || null,
    GENDER[person.gender] || person.gender || null,
    ...toList(person.tags, 6),
  ].filter(Boolean)

  const infoCards = [
    { icon: IconPerson, label: DETAIL.name, value: display },
    { icon: IconMic, label: DETAIL.type, value: roles.join(' · ') || null },
    { icon: IconRegion, label: DETAIL.region, value: person.region },
    { icon: IconPerson, label: DETAIL.gender, value: GENDER[person.gender] || person.gender },
    { icon: IconTag, label: DETAIL.nickname, value: person.nickname },
    { icon: IconCalendar, label: DETAIL.birthYear, value: year },
  ]

  return (
    <KhiDetailShell>
      <KhiDetailHero
        kind="person"
        title={display}
        subtitle={roles.join(' · ') || null}
        description={person.bio || person.description}
        tags={heroTags}
        breadcrumb={<KhiBreadcrumb items={[
          { to: '/public', label: DETAIL.home },
          { to: '/public/browse?type=person', label: 'کەسەکان' },
          { label: display },
        ]} />}
        disc={<KhiDetailDisc kind="person" image={portrait} alt={display} badge={roles[0] || DETAIL.person} initials={personInitials(display)} frame />}
      />

      <KhiInfoGrid items={infoCards} />

      <KhiSectionCard
        icon={IconProject}
        title={DETAIL.projects}
        count={Number.isFinite(total) ? total : (items.length || 0)}
        action={Number.isFinite(total) && total > items.length
          ? <KhiSeeAll to={`/public/browse?type=project&q=${encodeURIComponent(display)}`} />
          : null}
      >
        {projectsLoading ? (
          <CardGridSkeleton count={4} />
        ) : items.length === 0 ? (
          <KhiEmptyState
            title="هێشتا هیچ پڕۆژەیەک نییە"
            text="هەرکاتێک پڕۆژەیەک — گۆرانی، ڤیدیۆ یان بەڵگەنامە — بەم کەسە پەیوەست بکرێت، لێرە دەردەکەوێت."
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

export { PublicPersonDetailPage }
