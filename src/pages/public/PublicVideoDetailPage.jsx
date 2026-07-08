import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'

import { VideoPlayer } from '@/components/ui/video-player'
import { HelpUsDialog } from '@/components/public/HelpUsDialog'
import {
  formatPublicDate, mediaThumbHref, pickMediaTitle, extractPersonFromItem,
} from '@/components/public/public-helpers'
import { DETAIL, yearNum } from '@/components/khi/khi-data'
import KhiMediaDetail from '@/components/khi/KhiMediaDetail'
import {
  KhiDetailShell, KhiContentCard, KhiMetaPanel, KhiMetaPanelIf, KhiMetaRow,
  KhiPillRow, KhiSearchValue, KhiProjectLink, KhiPersonLink, KhiCategoryLinks,
} from '@/components/khi/KhiDetail'
import {
  IconPerson, IconProject, IconCalendar, IconLanguage, IconRegion, IconClock,
  IconLayers, IconVideo, IconMic, IconText, IconPlus,
} from '@/components/khi/icons'
import { guestVideos } from '@/services/guest'
import { decodePublicCode, isEncodedPublicCode, publicDetailPath } from '@/components/public/public-route-id'

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

  useEffect(() => {
    if (routeCode && !isEncodedPublicCode(routeCode)) {
      navigate(publicDetailPath('videos', routeCode), { replace: true })
    }
  }, [navigate, routeCode])

  useEffect(() => {
    const ctrl = new AbortController()
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setLoading(true)
    setError('')
    guestVideos
      .one(code, { signal: ctrl.signal })
      .then((d) => { if (!ctrl.signal.aborted) setVideo(d || null) })
      .catch((err) => { if (err?.code !== 'ERR_CANCELED') setError('Could not load this video.') })
      .finally(() => { if (!ctrl.signal.aborted) setLoading(false) })
    return () => ctrl.abort()
  }, [code])

  const person = useMemo(() => extractPersonFromItem(video), [video])

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
      {video.videoFileUrl ? (
        <div className="player-mount" style={{ marginBottom: 22 }}>
          <VideoPlayer src={video.videoFileUrl} title={title} subtitle={video.event || video.location || video.language || ''} />
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
        <KhiMetaRow label={DETAIL.subject} value={video.subject}><KhiPillRow values={video.subject} search /></KhiMetaRow>
        <KhiMetaRow label={DETAIL.audience} value={video.audience}><KhiSearchValue value={video.audience} /></KhiMetaRow>
      </KhiMetaPanel>

      <KhiMetaPanelIf obj={video} icon={IconVideo} title={DETAIL.subjectForm} keys={['event', 'location', 'genre', 'personShownInVideo', 'colorOfVideo', 'whereThisVideoUsed']}>
        <KhiMetaRow label={DETAIL.event} value={video.event}><KhiSearchValue value={video.event} /></KhiMetaRow>
        <KhiMetaRow label={DETAIL.location} value={video.location}><KhiSearchValue value={video.location} /></KhiMetaRow>
        <KhiMetaRow label={DETAIL.genre} value={video.genre}><KhiPillRow values={video.genre} search /></KhiMetaRow>
        <KhiMetaRow label={DETAIL.peopleShown} value={video.personShownInVideo}><KhiSearchValue value={video.personShownInVideo} /></KhiMetaRow>
        <KhiMetaRow label={DETAIL.color} value={video.colorOfVideo}><KhiPillRow values={video.colorOfVideo} /></KhiMetaRow>
        <KhiMetaRow label={DETAIL.usedIn} value={video.whereThisVideoUsed}><KhiPillRow values={video.whereThisVideoUsed} /></KhiMetaRow>
      </KhiMetaPanelIf>

      <KhiMetaPanelIf obj={video} icon={IconMic} title={DETAIL.credits} keys={['creatorArtistDirector', 'producer', 'contributors', 'contributor', 'subtitle']}>
        <KhiMetaRow label={DETAIL.director} value={video.creatorArtistDirector}><KhiSearchValue value={video.creatorArtistDirector} /></KhiMetaRow>
        <KhiMetaRow label={DETAIL.producer} value={video.producer}><KhiSearchValue value={video.producer} /></KhiMetaRow>
        <KhiMetaRow label={DETAIL.contributors} value={video.contributors || video.contributor}><KhiPillRow values={video.contributors || video.contributor} search /></KhiMetaRow>
        <KhiMetaRow label={DETAIL.subtitle} value={video.subtitle}><KhiSearchValue value={video.subtitle} /></KhiMetaRow>
      </KhiMetaPanelIf>

      <KhiMetaPanelIf obj={video} icon={IconLanguage} title={DETAIL.langPlace} keys={['language', 'dialect']}>
        <KhiMetaRow label={DETAIL.language} value={video.language}><KhiSearchValue value={video.language} /></KhiMetaRow>
        <KhiMetaRow label={DETAIL.dialect} value={video.dialect}><KhiSearchValue value={video.dialect} /></KhiMetaRow>
      </KhiMetaPanelIf>

      <KhiMetaPanelIf obj={video} icon={IconCalendar} title={DETAIL.dates} keys={['recordedAt', 'recordingDate', 'dateCreated', 'publisher']}>
        <KhiMetaRow label={DETAIL.recorded}>{formatPublicDate(video.recordedAt || video.recordingDate)}</KhiMetaRow>
        <KhiMetaRow label={DETAIL.date}>{formatPublicDate(video.dateCreated)}</KhiMetaRow>
        <KhiMetaRow label={DETAIL.publisher} value={video.publisher}><KhiSearchValue value={video.publisher} /></KhiMetaRow>
      </KhiMetaPanelIf>
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
