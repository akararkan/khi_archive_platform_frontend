import { useEffect, useMemo, useState } from 'react'
import { useParams } from 'react-router-dom'

import { mediaThumbHref, extractPersonFromItem } from '@/components/public/public-helpers'
import { DETAIL, cardFromItem } from '@/components/khi/khi-data'
import KhiCard from '@/components/khi/KhiCard'
import {
  KhiDetailShell, KhiBreadcrumb, KhiDetailHero, KhiDetailDisc, KhiInfoGrid,
  KhiStatsRow, KhiSectionCard, KhiEmptyState,
} from '@/components/khi/KhiDetail'
import { Skeleton } from '@/components/ui/skeleton'
import {
  IconAudio, IconVideo, IconText, IconImage, IconLayers, IconPerson,
  IconCategory, IconCalendar, IconProject,
} from '@/components/khi/icons'
import { guestProject, guestProjectMedia } from '@/services/guest'

const TABS = [
  { key: 'all', label: DETAIL.media, icon: IconLayers },
  { key: 'audio', label: 'دەنگ', icon: IconAudio },
  { key: 'video', label: 'ڤیدیۆ', icon: IconVideo },
  { key: 'text', label: 'دەق', icon: IconText },
  { key: 'image', label: 'وێنە', icon: IconImage },
]

function toList(v, cap = 12) {
  if (!v) return []
  const arr = Array.isArray(v) ? v : String(v).split(/[,،;]/)
  return arr.map((s) => String(s).trim()).filter(Boolean).slice(0, cap)
}

function pickArr(obj, keys) {
  if (!obj) return []
  if (Array.isArray(obj)) return obj
  for (const k of keys) {
    if (Array.isArray(obj[k])) return obj[k]
    if (Array.isArray(obj[k]?.content)) return obj[k].content
  }
  if (Array.isArray(obj.content)) return obj.content
  return []
}

function PublicProjectDetailPage() {
  const { code } = useParams()
  const [project, setProject] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [tab, setTab] = useState('all')
  const [media, setMedia] = useState(null)
  const [mediaLoading, setMediaLoading] = useState(true)

  useEffect(() => {
    const ctrl = new AbortController()
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setLoading(true)
    setError('')
    guestProject(code, { signal: ctrl.signal })
      .then((d) => { if (!ctrl.signal.aborted) setProject(d || null) })
      .catch((err) => { if (err?.code !== 'ERR_CANCELED') setError('Could not load this project.') })
      .finally(() => { if (!ctrl.signal.aborted) setLoading(false) })
    return () => ctrl.abort()
  }, [code])

  useEffect(() => {
    const ctrl = new AbortController()
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setMediaLoading(true)
    guestProjectMedia(code, { type: tab === 'all' ? 'all' : tab, signal: ctrl.signal })
      .then((d) => { if (!ctrl.signal.aborted) setMedia(d || null) })
      .catch(() => {})
      .finally(() => { if (!ctrl.signal.aborted) setMediaLoading(false) })
    return () => ctrl.abort()
  }, [code, tab])

  const person = useMemo(() => extractPersonFromItem(project), [project])

  if (loading || error || !project) {
    return <KhiDetailShell loading={loading} error={error} notFound={!project} />
  }

  const title = project.projectName || project.name || DETAIL.none
  const firstCat = Array.isArray(project.categories) && project.categories[0]
  const catName = firstCat ? (typeof firstCat === 'string' ? firstCat : (firstCat.categoryName || firstCat.name || firstCat.categoryCode)) : null
  const catCode = firstCat ? (typeof firstCat === 'string' ? firstCat : (firstCat.categoryCode || firstCat.code)) : null
  const totalMedia = (project.audioCount || 0) + (project.videoCount || 0) + (project.textCount || 0) + (project.imageCount || 0)

  const stats = [
    { icon: IconAudio, label: DETAIL.counts.audio, value: project.audioCount || 0 },
    { icon: IconVideo, label: DETAIL.counts.video, value: project.videoCount || 0 },
    { icon: IconText, label: DETAIL.counts.text, value: project.textCount || 0 },
    { icon: IconImage, label: DETAIL.counts.image, value: project.imageCount || 0 },
  ]

  const infoCards = [
    { icon: IconPerson, label: DETAIL.person, value: person?.fullName || person?.name, to: person?.personCode ? `/public/persons/${person.personCode}` : null },
    { icon: IconCategory, label: DETAIL.category, value: catName, to: catCode ? `/public/categories/${catCode}` : null },
    { icon: IconLayers, label: DETAIL.media, value: totalMedia ? totalMedia.toLocaleString() : null },
  ]

  return (
    <KhiDetailShell>
      <KhiDetailHero
        kind="project"
        title={title}
        subtitle={catName}
        description={project.description}
        tags={toList(project.tags)}
        breadcrumb={<KhiBreadcrumb items={[
          { to: '/public', label: DETAIL.home },
          { to: '/public/browse?type=project', label: 'پڕۆژەکان' },
          { label: title },
        ]} />}
        disc={<KhiDetailDisc kind="project" image={mediaThumbHref(project)} alt={title} badge={DETAIL.project} />}
      />

      <KhiStatsRow items={stats} />
      <KhiInfoGrid items={infoCards} />

      <KhiSectionCard icon={IconProject} title={DETAIL.media} count={totalMedia || null}>
        <div className="detail-tabs">
          {TABS.map((t) => {
            const Icon = t.icon
            return (
              <button key={t.key} type="button" className={`detail-tab${tab === t.key ? ' active' : ''}`} onClick={() => setTab(t.key)}>
                <Icon /> {t.label}
              </button>
            )
          })}
        </div>
        {mediaLoading ? (
          <div className="khi-grid">{Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-44 rounded-2xl" />)}</div>
        ) : (
          <MediaGroups media={media} tab={tab} />
        )}
      </KhiSectionCard>
    </KhiDetailShell>
  )
}

function MediaGroups({ media, tab }) {
  const groups = []
  const want = (k) => tab === 'all' || tab === k
  if (want('audio')) { const items = pickArr(media, ['audios', 'audio']); if (items.length) groups.push({ kind: 'audio', label: 'دەنگ', items }) }
  if (want('video')) { const items = pickArr(media, ['videos', 'video']); if (items.length) groups.push({ kind: 'video', label: 'ڤیدیۆ', items }) }
  if (want('text')) { const items = pickArr(media, ['texts', 'text']); if (items.length) groups.push({ kind: 'text', label: 'دەق', items }) }
  if (want('image')) { const items = pickArr(media, ['images', 'image']); if (items.length) groups.push({ kind: 'image', label: 'وێنە', items }) }

  if (!groups.length) {
    return <KhiEmptyState title="هیچ مێدیایەک لەم بەشەدا نییە" text="هەرکاتێک مێدیا بۆ ئەم پڕۆژەیە زیادبکرێت، لێرە دەردەکەوێت." />
  }

  return (
    <>
      {groups.map((g) => (
        <div className="detail-group" key={g.kind}>
          {tab === 'all' ? <p className="detail-group-title">{g.label} · {g.items.length.toLocaleString()}</p> : null}
          <div className="khi-grid">
            {g.items.map((item, i) => (
              <KhiCard key={(item.code || item[`${g.kind}Code`] || i)} record={cardFromItem(item, g.kind)} />
            ))}
          </div>
        </div>
      ))}
    </>
  )
}

export { PublicProjectDetailPage }
