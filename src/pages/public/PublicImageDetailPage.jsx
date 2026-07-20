import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'

import { HelpUsDialog } from '@/components/public/HelpUsDialog'
import {
  pickMediaTitle, extractPersonFromItem,
} from '@/components/public/public-helpers'
import { DETAIL, yearNum } from '@/components/khi/khi-data'
import KhiMediaDetail from '@/components/khi/KhiMediaDetail'
import { KhiPublicMediaFields } from '@/components/khi/KhiPublicMediaFields'
import {
  KhiDetailShell, KhiContentCard, KhiMetaPanel, KhiMetaRow,
  KhiProjectLink, KhiPersonLink, KhiCategoryLinks,
} from '@/components/khi/KhiDetail'
import {
  IconPerson, IconProject, IconCalendar, IconRegion, IconImage, IconLayers,
  IconMic, IconPlus,
} from '@/components/khi/icons'
import { guestImages } from '@/services/guest'
import { getStaffMediaOne } from '@/services/staff-public-catalog'
import { usePublicAccess } from '@/hooks/use-public-access'
import { useAuthedMediaUrl } from '@/hooks/use-authed-media-url'
import { decodePublicCode, isEncodedPublicCode, publicDetailPath } from '@/components/public/public-route-id'
import { resolveMediaUrl } from '@/lib/media-url'
import { DeepZoomViewer } from '@/components/ui/deep-zoom-viewer'

function toList(v, cap = 12) {
  if (!v) return []
  const arr = Array.isArray(v) ? v : String(v).split(/[,،;]/)
  return arr.map((s) => String(s).trim()).filter(Boolean).slice(0, cap)
}

function stopProtectedMediaEvent(event) {
  event.preventDefault()
  event.stopPropagation()
}

function PublicImageDetailPage() {
  const { code: routeCode } = useParams()
  const navigate = useNavigate()
  const code = decodePublicCode(routeCode)
  const [image, setImage] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [helpOpen, setHelpOpen] = useState(false)
  const { isStaff, ready: accessReady } = usePublicAccess()

  useEffect(() => {
    if (routeCode && !isEncodedPublicCode(routeCode)) {
      navigate(publicDetailPath('images', routeCode), { replace: true })
    }
  }, [navigate, routeCode])

  useEffect(() => {
    if (!accessReady) return undefined
    const ctrl = new AbortController()
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setLoading(true)
    setError('')
    const request = isStaff
      ? getStaffMediaOne('image', code, { signal: ctrl.signal })
      : guestImages.one(code, { signal: ctrl.signal })
    request
      .then((d) => { if (!ctrl.signal.aborted) setImage(d || null) })
      .catch((err) => { if (err?.code !== 'ERR_CANCELED') setError('Could not load this image.') })
      .finally(() => { if (!ctrl.signal.aborted) setLoading(false) })
    return () => ctrl.abort()
  }, [accessReady, code, isStaff])

  const person = useMemo(() => extractPersonFromItem(image), [image])
  // Staff previewing the public site get admin-shaped, Bearer-protected URLs
  // (getStaffMediaOne hits the admin /image/{code} endpoint) — a plain
  // DeepZoomViewer <img> can't send that header, so fetch it as an authed
  // blob instead. Guests always get the guest DTO's already-correct,
  // unauthenticated path, which supports native Range requests — no reason
  // to trade that away by routing it through a blob fetch too.
  const staffImage = useAuthedMediaUrl(image?.imageFileUrl, { enabled: isStaff })

  if (loading || error || !image) {
    return <KhiDetailShell loading={loading} error={error} notFound={!image} />
  }

  const title = pickMediaTitle(image) || DETAIL.none
  const originalCandidate = image.originalTitle || image.titleOriginal || image.titleInCentralKurdish || image.centralKurdishTitle
  const original = originalCandidate && originalCandidate !== title ? originalCandidate : null
  const fileUrl = isStaff ? staffImage.url : resolveMediaUrl(image.imageFileUrl)
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
        <div
          className="media-stage image protected-media"
          onAuxClick={stopProtectedMediaEvent}
          onContextMenu={stopProtectedMediaEvent}
        >
          <DeepZoomViewer
            src={fileUrl}
            alt={title}
            className="h-[70vh] max-h-[78vh] w-full rounded-none border-0 bg-transparent shadow-none"
          />
        </div>
      ) : isStaff && staffImage.loading ? (
        <div className="media-unavailable">…</div>
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
      </KhiMetaPanel>
      <KhiPublicMediaFields kind="image" item={image} full={isStaff} />
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
