import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'

import { VideoPlayer } from '@/components/ui/video-player'
import { HelpUsDialog } from '@/components/public/HelpUsDialog'
import {
  mediaThumbHref, pickMediaTitle, extractPersonFromItem,
} from '@/components/public/public-helpers'
import { DETAIL, yearNum } from '@/components/khi/khi-data'
import KhiMediaDetail from '@/components/khi/KhiMediaDetail'
import { KhiPublicMediaFields } from '@/components/khi/KhiPublicMediaFields'
import {
  KhiDetailShell, KhiContentCard, KhiMetaPanel, KhiMetaRow,
  KhiProjectLink, KhiPersonLink, KhiCategoryLinks,
} from '@/components/khi/KhiDetail'
import {
  IconPerson, IconProject, IconCalendar, IconLanguage, IconRegion, IconClock,
  IconLayers, IconText, IconPlus,
} from '@/components/khi/icons'
import { guestVideos } from '@/services/guest'
import { getStaffMediaOne } from '@/services/staff-public-catalog'
import { usePublicAccess } from '@/hooks/use-public-access'
import { useHlsFallbackSource } from '@/hooks/use-hls-fallback-source'
import { decodePublicCode, isEncodedPublicCode, publicDetailPath } from '@/components/public/public-route-id'
import { resolveMediaUrl } from '@/lib/media-url'
import { buildHlsPlaylistPath } from '@/lib/hls-source'

function toList(v, cap = 12) {
  if (!v) return []
  const arr = Array.isArray(v) ? v : String(v).split(/[,،;]/)
  return arr.map((s) => String(s).trim()).filter(Boolean).slice(0, cap)
}

function PublicVideoDetailPage() {
  const { code: routeCode } = useParams()
  const navigate = useNavigate()
  const code = decodePublicCode(routeCode)
  const [video, setVideo] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [helpOpen, setHelpOpen] = useState(false)
  const { isStaff, ready: accessReady } = usePublicAccess()

  useEffect(() => {
    if (routeCode && !isEncodedPublicCode(routeCode)) {
      navigate(publicDetailPath('videos', routeCode), { replace: true })
    }
  }, [navigate, routeCode])

  useEffect(() => {
    if (!accessReady) return undefined
    const ctrl = new AbortController()
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setLoading(true)
    setError('')
    const request = isStaff
      ? getStaffMediaOne('video', code, { signal: ctrl.signal })
      : guestVideos.one(code, { signal: ctrl.signal })
    request
      .then((d) => { if (!ctrl.signal.aborted) setVideo(d || null) })
      .catch((err) => { if (err?.code !== 'ERR_CANCELED') setError('Could not load this video.') })
      .finally(() => { if (!ctrl.signal.aborted) setLoading(false) })
    return () => ctrl.abort()
  }, [accessReady, code, isStaff])

  const person = useMemo(() => extractPersonFromItem(video), [video])
  const directVideoSrc = resolveMediaUrl(video?.videoFileUrl)
  const hlsVideoSrc = video?.videoCode
    ? resolveMediaUrl(buildHlsPlaylistPath('video', video.videoCode, { guest: !isStaff }))
    : ''
  const playbackSrc = useHlsFallbackSource({
    hlsUrl: hlsVideoSrc,
    directUrl: directVideoSrc,
    enabled: Boolean(directVideoSrc),
  })

  if (loading || error || !video) {
    return <KhiDetailShell loading={loading} error={error} notFound={!video} />
  }

  const title = pickMediaTitle(video) || DETAIL.none
  const originalCandidate = video.originalTitle || video.titleOriginal || video.titleInCentralKurdish || video.centralKurdishTitle
  const original = originalCandidate && originalCandidate !== title ? originalCandidate : null
  const projectCode = video.project?.projectCode || video.projectCode

  const infoCards = [
    { icon: IconPerson, label: DETAIL.person, value: person?.fullName || person?.name, to: person?.personCode ? publicDetailPath('persons', person.personCode) : null },
    { icon: IconProject, label: DETAIL.project, value: video.project?.projectName || video.projectName, to: projectCode ? publicDetailPath('projects', projectCode) : null },
    { icon: IconCalendar, label: DETAIL.event, value: video.event },
    { icon: IconRegion, label: DETAIL.location, value: video.location || video.region },
    { icon: IconLanguage, label: DETAIL.language, value: video.language },
    { icon: IconCalendar, label: DETAIL.year, value: yearNum(video) },
    { icon: IconClock, label: DETAIL.duration, value: video.durationFormatted || video.duration },
  ]

  const content = (
    <>
      {directVideoSrc ? (
        <div className="player-mount protected-media" style={{ marginBottom: 22 }}>
          <VideoPlayer src={playbackSrc} title={title} subtitle={video.event || video.location || video.language || ''} protectedMode />
        </div>
      ) : (
        <div className="media-unavailable">{DETAIL.fileUnavailable}</div>
      )}
      {video.transcription ? <KhiContentCard icon={IconText} title={DETAIL.transcription}><p>{video.transcription}</p></KhiContentCard> : null}
    </>
  )

  const meta = (
    <>
      <KhiMetaPanel icon={IconLayers} title={DETAIL.details}>
        <KhiMetaRow label={DETAIL.project} value={projectCode}><KhiProjectLink project={video.project || { projectCode: video.projectCode, projectName: video.projectName }} /></KhiMetaRow>
        <KhiMetaRow label={DETAIL.person} value={person?.personCode}><KhiPersonLink person={person} fallbackName={person?.name} /></KhiMetaRow>
        <KhiMetaRow label={DETAIL.categories} value={video.categories}><KhiCategoryLinks categories={video.categories} /></KhiMetaRow>
      </KhiMetaPanel>
      <KhiPublicMediaFields kind="video" item={video} full={isStaff} />
    </>
  )

  return (
    <>
      <HelpUsDialog open={helpOpen} onOpenChange={setHelpOpen} mediaType="VIDEO" mediaCode={code} mediaTitle={title} mediaData={video} />
      <KhiDetailShell>
        <KhiMediaDetail
          kind="video"
          title={title}
          subtitle={original}
          description={video.description}
          image={mediaThumbHref(video)}
          tags={toList(video.tags)}
          breadcrumbItems={[
            { to: '/public', label: DETAIL.home },
            { to: '/public/browse?types=video', label: 'ڤیدیۆکان' },
            { label: title },
          ]}
          actions={[{ label: DETAIL.help, icon: IconPlus, onClick: () => setHelpOpen(true) }]}
          infoCards={infoCards}
          content={content}
          meta={meta}
        />
      </KhiDetailShell>
    </>
  )
}

export { PublicVideoDetailPage }
