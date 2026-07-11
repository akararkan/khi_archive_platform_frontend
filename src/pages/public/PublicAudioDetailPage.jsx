import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'

import { AudioPlayer } from '@/components/ui/audio-player'
import { HelpUsDialog } from '@/components/public/HelpUsDialog'
import {
  formatPublicDate, mediaThumbHref, pickMediaTitle, extractPersonFromItem, personImageSrc,
} from '@/components/public/public-helpers'
import { DETAIL, yearNum } from '@/components/khi/khi-data'
import KhiMediaDetail from '@/components/khi/KhiMediaDetail'
import {
  KhiDetailShell, KhiContentCard, KhiMetaPanel, KhiMetaPanelIf, KhiMetaRow,
  KhiPillRow, KhiSearchValue, KhiProjectLink, KhiPersonLink, KhiCategoryLinks,
} from '@/components/khi/KhiDetail'
import {
  IconPerson, IconProject, IconCategory, IconAudio, IconLanguage, IconRegion,
  IconCalendar, IconClock, IconLayers, IconMic, IconText, IconQuote, IconPlus,
} from '@/components/khi/icons'
import { guestAudios } from '@/services/guest'
import { decodePublicCode, isEncodedPublicCode, publicDetailPath } from '@/components/public/public-route-id'

// Normalise a list-ish value (array | comma/semicolon/Arabic-comma string).
function toList(v, cap = 12) {
  if (!v) return []
  const arr = Array.isArray(v) ? v : String(v).split(/[,،;]/)
  return arr.map((s) => String(s).trim()).filter(Boolean).slice(0, cap)
}

function PublicAudioDetailPage() {
  const { code: routeCode } = useParams()
  const navigate = useNavigate()
  const code = decodePublicCode(routeCode)
  const [audio, setAudio] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [helpOpen, setHelpOpen] = useState(false)

  useEffect(() => {
    if (routeCode && !isEncodedPublicCode(routeCode)) {
      navigate(publicDetailPath('audios', routeCode), { replace: true })
    }
  }, [navigate, routeCode])

  useEffect(() => {
    const ctrl = new AbortController()
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setLoading(true)
    setError('')
    guestAudios
      .one(code, { signal: ctrl.signal })
      .then((d) => { if (!ctrl.signal.aborted) setAudio(d || null) })
      .catch((err) => { if (err?.code !== 'ERR_CANCELED') setError('Could not load this audio.') })
      .finally(() => { if (!ctrl.signal.aborted) setLoading(false) })
    return () => ctrl.abort()
  }, [code])

  const person = useMemo(() => extractPersonFromItem(audio), [audio])

  if (loading || error || !audio) {
    return <KhiDetailShell loading={loading} error={error} notFound={!audio} />
  }

  const title = pickMediaTitle(audio) || DETAIL.none
  const originalCandidate = audio.originTitle || audio.titleOriginal || audio.centralKurdishTitle || audio.titleInCentralKurdish
  const original = originalCandidate && originalCandidate !== title ? originalCandidate : null
  const firstCat = Array.isArray(audio.categories) && audio.categories[0]
  const catName = firstCat ? (firstCat.categoryName || firstCat.name || firstCat.categoryCode) : null
  const catCode = firstCat ? (firstCat.categoryCode || firstCat.code) : null
  const projectCode = audio.project?.projectCode || audio.projectCode

  const infoCards = [
    { icon: IconPerson, label: DETAIL.person, value: person?.fullName || person?.name, to: person?.personCode ? publicDetailPath('persons', person.personCode) : null },
    { icon: IconProject, label: DETAIL.project, value: audio.project?.projectName || audio.projectName, to: projectCode ? publicDetailPath('projects', projectCode) : null },
    { icon: IconCategory, label: DETAIL.category, value: catName, to: catCode ? publicDetailPath('categories', catCode) : null },
    { icon: IconAudio, label: DETAIL.form, value: audio.form },
    { icon: IconLanguage, label: DETAIL.language, value: audio.language },
    { icon: IconRegion, label: DETAIL.region, value: audio.region || audio.city },
    { icon: IconCalendar, label: DETAIL.year, value: yearNum(audio) },
    { icon: IconClock, label: DETAIL.duration, value: audio.durationFormatted || (audio.duration ? `${audio.duration}s` : null) },
  ]

  const content = (
    <>
      {audio.audioFileUrl ? (
        <div className="player-mount protected-media" style={{ marginBottom: 22 }}>
          <AudioPlayer src={audio.audioFileUrl} title={title} subtitle={audio.form || audio.language || ''} protectedMode />
        </div>
      ) : (
        <div className="media-unavailable">{DETAIL.fileUnavailable}</div>
      )}
      {audio.lyrics ? <KhiContentCard icon={IconQuote} title={DETAIL.lyrics}><p>{audio.lyrics}</p></KhiContentCard> : null}
      {audio.transcription ? <KhiContentCard icon={IconText} title={DETAIL.transcription}><p>{audio.transcription}</p></KhiContentCard> : null}
    </>
  )

  const meta = (
    <>
      <KhiMetaPanel icon={IconLayers} title={DETAIL.details}>
        <KhiMetaRow label={DETAIL.project} value={projectCode}><KhiProjectLink project={audio.project || { projectCode: audio.projectCode, projectName: audio.projectName }} /></KhiMetaRow>
        <KhiMetaRow label={DETAIL.person} value={person?.personCode}><KhiPersonLink person={person} fallbackName={person?.name} /></KhiMetaRow>
        <KhiMetaRow label={DETAIL.categories} value={audio.categories}><KhiCategoryLinks categories={audio.categories} /></KhiMetaRow>
        <KhiMetaRow label={DETAIL.subject} value={audio.subjects || audio.subject}><KhiPillRow values={audio.subjects || audio.subject} search /></KhiMetaRow>
        <KhiMetaRow label={DETAIL.audience} value={audio.audience}><KhiSearchValue value={audio.audience} /></KhiMetaRow>
      </KhiMetaPanel>

      <KhiMetaPanelIf obj={audio} icon={IconAudio} title={DETAIL.musicForm} keys={['form', 'typeOfMaqam', 'typeOfBasta', 'typeOfComposition', 'typeOfPerformance', 'poet', 'genre']}>
        <KhiMetaRow label={DETAIL.form} value={audio.form}><KhiSearchValue value={audio.form} /></KhiMetaRow>
        <KhiMetaRow label={DETAIL.typeOfMaqam} value={audio.typeOfMaqam}><KhiSearchValue value={audio.typeOfMaqam} /></KhiMetaRow>
        <KhiMetaRow label={DETAIL.typeOfBasta} value={audio.typeOfBasta}><KhiSearchValue value={audio.typeOfBasta} /></KhiMetaRow>
        <KhiMetaRow label={DETAIL.typeOfComposition} value={audio.typeOfComposition}><KhiSearchValue value={audio.typeOfComposition} /></KhiMetaRow>
        <KhiMetaRow label={DETAIL.typeOfPerformance} value={audio.typeOfPerformance}><KhiSearchValue value={audio.typeOfPerformance} /></KhiMetaRow>
        <KhiMetaRow label={DETAIL.poet} value={audio.poet}><KhiSearchValue value={audio.poet} /></KhiMetaRow>
        <KhiMetaRow label={DETAIL.genre} value={audio.genre}><KhiPillRow values={audio.genre} search /></KhiMetaRow>
      </KhiMetaPanelIf>

      <KhiMetaPanelIf obj={audio} icon={IconMic} title={DETAIL.credits} keys={['singer', 'speaker', 'composer', 'producer', 'contributors', 'contributor']}>
        <KhiMetaRow label={DETAIL.singer} value={audio.singer}><KhiSearchValue value={audio.singer} /></KhiMetaRow>
        <KhiMetaRow label={DETAIL.speaker} value={audio.speaker}><KhiSearchValue value={audio.speaker} /></KhiMetaRow>
        <KhiMetaRow label={DETAIL.composer} value={audio.composer}><KhiSearchValue value={audio.composer} /></KhiMetaRow>
        <KhiMetaRow label={DETAIL.producer} value={audio.producer}><KhiSearchValue value={audio.producer} /></KhiMetaRow>
        <KhiMetaRow label={DETAIL.contributors} value={audio.contributors || audio.contributor}><KhiPillRow values={audio.contributors || audio.contributor} search /></KhiMetaRow>
      </KhiMetaPanelIf>

      <KhiMetaPanelIf obj={audio} icon={IconRegion} title={DETAIL.langPlace} keys={['language', 'dialect', 'recordingVenue', 'city', 'region']}>
        <KhiMetaRow label={DETAIL.language} value={audio.language}><KhiSearchValue value={audio.language} /></KhiMetaRow>
        <KhiMetaRow label={DETAIL.dialect} value={audio.dialect}><KhiSearchValue value={audio.dialect} /></KhiMetaRow>
        <KhiMetaRow label={DETAIL.location} value={audio.recordingVenue}><KhiSearchValue value={audio.recordingVenue} /></KhiMetaRow>
        <KhiMetaRow label={DETAIL.region} value={audio.city || audio.region}><KhiSearchValue value={audio.city || audio.region} /></KhiMetaRow>
      </KhiMetaPanelIf>

      <KhiMetaPanelIf obj={audio} icon={IconCalendar} title={DETAIL.dates} keys={['recordedAt', 'recordingDate', 'dateCreated', 'publisher']}>
        <KhiMetaRow label={DETAIL.recorded}>{formatPublicDate(audio.recordedAt || audio.recordingDate)}</KhiMetaRow>
        <KhiMetaRow label={DETAIL.date}>{formatPublicDate(audio.dateCreated)}</KhiMetaRow>
        <KhiMetaRow label={DETAIL.publisher} value={audio.publisher}><KhiSearchValue value={audio.publisher} /></KhiMetaRow>
      </KhiMetaPanelIf>
    </>
  )

  return (
    <>
      <HelpUsDialog open={helpOpen} onOpenChange={setHelpOpen} mediaType="AUDIO" mediaCode={code} mediaTitle={title} mediaData={audio} />
      <KhiDetailShell>
        <KhiMediaDetail
          kind="audio"
          title={title}
          subtitle={original}
          description={audio.description}
          image={mediaThumbHref(audio) || personImageSrc(person)}
          tags={toList(audio.tags)}
          breadcrumbItems={[
            { to: '/public', label: DETAIL.home },
            { to: '/public/browse?types=audio', label: 'دەنگەکان' },
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

export { PublicAudioDetailPage }
