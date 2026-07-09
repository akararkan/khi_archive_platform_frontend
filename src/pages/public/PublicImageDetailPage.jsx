import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'

import { HelpUsDialog } from '@/components/public/HelpUsDialog'
import {
  formatPublicDate, pickMediaTitle, extractPersonFromItem,
} from '@/components/public/public-helpers'
import { DETAIL, yearNum } from '@/components/khi/khi-data'
import KhiMediaDetail from '@/components/khi/KhiMediaDetail'
import {
  KhiDetailShell, KhiContentCard, KhiMetaPanel, KhiMetaPanelIf, KhiMetaRow,
  KhiPillRow, KhiSearchValue, KhiProjectLink, KhiPersonLink, KhiCategoryLinks,
} from '@/components/khi/KhiDetail'
import {
  IconPerson, IconProject, IconCalendar, IconRegion, IconImage, IconLayers,
  IconMic, IconExternal, IconPlus,
} from '@/components/khi/icons'
import { guestImages } from '@/services/guest'
import { decodePublicCode, isEncodedPublicCode, publicDetailPath } from '@/components/public/public-route-id'

function toList(v, cap = 12) {
  if (!v) return []
  const arr = Array.isArray(v) ? v : String(v).split(/[,،;]/)
  return arr.map((s) => String(s).trim()).filter(Boolean).slice(0, cap)
}

function PublicImageDetailPage() {
  const { code: routeCode } = useParams()
  const navigate = useNavigate()
  const code = decodePublicCode(routeCode)
  const [image, setImage] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [helpOpen, setHelpOpen] = useState(false)

  useEffect(() => {
    if (routeCode && !isEncodedPublicCode(routeCode)) {
      navigate(publicDetailPath('images', routeCode), { replace: true })
    }
  }, [navigate, routeCode])

  useEffect(() => {
    const ctrl = new AbortController()
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setLoading(true)
    setError('')
    guestImages
      .one(code, { signal: ctrl.signal })
      .then((d) => { if (!ctrl.signal.aborted) setImage(d || null) })
      .catch((err) => { if (err?.code !== 'ERR_CANCELED') setError('Could not load this image.') })
      .finally(() => { if (!ctrl.signal.aborted) setLoading(false) })
    return () => ctrl.abort()
  }, [code])

  const person = useMemo(() => extractPersonFromItem(image), [image])

  if (loading || error || !image) {
    return <KhiDetailShell loading={loading} error={error} notFound={!image} />
  }

  const title = pickMediaTitle(image) || DETAIL.none
  const originalCandidate = image.originalTitle || image.titleOriginal || image.titleInCentralKurdish || image.centralKurdishTitle
  const original = originalCandidate && originalCandidate !== title ? originalCandidate : null
  const fileUrl = image.imageFileUrl
  const projectCode = image.project?.projectCode || image.projectCode

  const infoCards = [
    { icon: IconPerson, label: DETAIL.person, value: person?.fullName || person?.name, to: person?.personCode ? publicDetailPath('persons', person.personCode) : null },
    { icon: IconProject, label: DETAIL.project, value: image.project?.projectName || image.projectName, to: projectCode ? publicDetailPath('projects', projectCode) : null },
    { icon: IconCalendar, label: DETAIL.event, value: image.event },
    { icon: IconRegion, label: DETAIL.location, value: image.location || image.region },
    { icon: IconMic, label: DETAIL.photographer, value: image.creatorArtistPhotographer },
    { icon: IconCalendar, label: DETAIL.year, value: yearNum(image) },
  ]

  const content = (
    <>
      {fileUrl ? (
        <div className="media-stage image">
          <img
            src={fileUrl}
            alt={title}
            draggable={false}
          />
        </div>
      ) : (
        <div className="media-unavailable">{DETAIL.fileUnavailable}</div>
      )}
      {image.photostory ? <KhiContentCard icon={IconImage} title={DETAIL.photostory}><p>{image.photostory}</p></KhiContentCard> : null}
    </>
  )

  const meta = (
    <>
      <KhiMetaPanel icon={IconLayers} title={DETAIL.details}>
        <KhiMetaRow label={DETAIL.project} value={projectCode}><KhiProjectLink project={image.project || { projectCode: image.projectCode, projectName: image.projectName }} /></KhiMetaRow>
        <KhiMetaRow label={DETAIL.person} value={person?.personCode}><KhiPersonLink person={person} fallbackName={person?.name} /></KhiMetaRow>
        <KhiMetaRow label={DETAIL.categories} value={image.categories}><KhiCategoryLinks categories={image.categories} /></KhiMetaRow>
        <KhiMetaRow label={DETAIL.subject} value={image.subject || image.subjects}><KhiPillRow values={image.subject || image.subjects} search /></KhiMetaRow>
        <KhiMetaRow label={DETAIL.audience} value={image.audience}><KhiSearchValue value={image.audience} /></KhiMetaRow>
      </KhiMetaPanel>

      <KhiMetaPanelIf obj={image} icon={IconImage} title={DETAIL.subjectForm} keys={['form', 'event', 'location', 'genre', 'personShownInImage']}>
        <KhiMetaRow label={DETAIL.form} value={image.form}><KhiSearchValue value={image.form} /></KhiMetaRow>
        <KhiMetaRow label={DETAIL.event} value={image.event}><KhiSearchValue value={image.event} /></KhiMetaRow>
        <KhiMetaRow label={DETAIL.location} value={image.location}><KhiSearchValue value={image.location} /></KhiMetaRow>
        <KhiMetaRow label={DETAIL.genre} value={image.genre}><KhiPillRow values={image.genre} search /></KhiMetaRow>
        <KhiMetaRow label={DETAIL.peopleShown} value={image.personShownInImage}><KhiSearchValue value={image.personShownInImage} /></KhiMetaRow>
      </KhiMetaPanelIf>

      <KhiMetaPanelIf obj={image} icon={IconMic} title={DETAIL.credits} keys={['creatorArtistPhotographer', 'contributors', 'contributor']}>
        <KhiMetaRow label={DETAIL.photographer} value={image.creatorArtistPhotographer}><KhiSearchValue value={image.creatorArtistPhotographer} /></KhiMetaRow>
        <KhiMetaRow label={DETAIL.contributors} value={image.contributors || image.contributor}><KhiPillRow values={image.contributors || image.contributor} search /></KhiMetaRow>
      </KhiMetaPanelIf>

      <KhiMetaPanelIf obj={image} icon={IconCalendar} title={DETAIL.dates} keys={['imageDate', 'recordedAt', 'publisher']}>
        <KhiMetaRow label={DETAIL.date}>{formatPublicDate(image.imageDate || image.recordedAt)}</KhiMetaRow>
        <KhiMetaRow label={DETAIL.publisher} value={image.publisher}><KhiSearchValue value={image.publisher} /></KhiMetaRow>
      </KhiMetaPanelIf>
    </>
  )

  return (
    <>
      <HelpUsDialog open={helpOpen} onOpenChange={setHelpOpen} mediaType="IMAGE" mediaCode={code} mediaTitle={title} mediaData={image} />
      <KhiDetailShell>
        <KhiMediaDetail
          kind="image"
          title={title}
          subtitle={original}
          description={image.description}
          image={fileUrl}
          tags={toList(image.tags)}
          breadcrumbItems={[
            { to: '/public', label: DETAIL.home },
            { to: '/public/browse?types=image', label: 'وێنەکان' },
            { label: title },
          ]}
          actions={[
            ...([]),
            { label: DETAIL.help, icon: IconPlus, onClick: () => setHelpOpen(true) },
          ]}
          infoCards={infoCards}
          content={content}
          meta={meta}
        />
      </KhiDetailShell>
    </>
  )
}

export { PublicImageDetailPage }
