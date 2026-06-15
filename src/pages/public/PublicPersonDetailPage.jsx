import { useEffect, useMemo, useState } from 'react'
import { useParams, useSearchParams } from 'react-router-dom'

import {
  personImageSrc, personInitials,
} from '@/components/public/public-helpers'
import { DETAIL, yearNum, cardFromItem } from '@/components/khi/khi-data'
import KhiCard from '@/components/khi/KhiCard'
import {
  KhiDetailShell, KhiBreadcrumb, KhiDetailHero, KhiDetailDisc, KhiInfoGrid,
  KhiSectionCard, KhiSeeAll, KhiEmptyState, KhiPager,
} from '@/components/khi/KhiDetail'
import { CardGridSkeleton } from '@/components/public/PublicShared'
import {
  IconPerson, IconMic, IconRegion, IconCalendar, IconTag, IconProject,
} from '@/components/khi/icons'
import { guestPerson, guestPersonProjects } from '@/services/guest'

const PAGE_SIZE = 24
const GENDER = { MALE: 'نێر', FEMALE: 'مێ', OTHER: 'تر', M: 'نێر', F: 'مێ' }

function toList(v, cap = 12) {
  if (!v) return []
  const arr = Array.isArray(v) ? v : String(v).split(/[,،;]/)
  return arr.map((s) => String(s).trim()).filter(Boolean).slice(0, cap)
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
      .then((d) => { if (!ctrl.signal.aborted) setPerson(d || null) })
      .catch((err) => { if (err?.code !== 'ERR_CANCELED') setError('Could not load this person.') })
      .finally(() => { if (!ctrl.signal.aborted) setLoading(false) })
    return () => ctrl.abort()
  }, [code])

  useEffect(() => {
    const ctrl = new AbortController()
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setProjectsLoading(true)
    guestPersonProjects(code, { page, size: PAGE_SIZE, signal: ctrl.signal })
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

  const roles = useMemo(() => toList(person?.personType), [person])

  if (loading || error || !person) {
    return <KhiDetailShell loading={loading} error={error} notFound={!person} />
  }

  const display = person.fullName || person.name || DETAIL.none
  const portrait = personImageSrc(person)
  const year = yearNum(person)
  const items = projects?.content || []
  const total = projects?.totalElements

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
        disc={<KhiDetailDisc kind="person" image={portrait} alt={display} badge={roles[0] || DETAIL.person} vinyl initials={personInitials(display)} />}
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
            <KhiPager page={projects?.number ?? page} totalPages={projects?.totalPages ?? 0} onPage={setPage} />
          </>
        )}
      </KhiSectionCard>
    </KhiDetailShell>
  )
}

export { PublicPersonDetailPage }
