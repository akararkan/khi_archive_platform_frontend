import { useEffect, useMemo, useState } from 'react'
import { useParams } from 'react-router-dom'
import { Download, ExternalLink } from 'lucide-react'

import { buttonVariants } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { cn } from '@/lib/utils'
import {
  ErrorState,
  PageContainer,
} from '@/components/public/PublicShared'
import {
  CategoryLinks,
  MediaHero,
  MetaPanel,
  MetaPanelIf,
  MetaRow,
  PersonLink,
  PillRow,
  ProjectLink,
} from '@/components/public/PublicMediaDetailShared'
import { formatPublicDate, pickMediaTitle } from '@/components/public/public-helpers'
import { guestImages } from '@/services/guest'

function PublicImageDetailPage() {
  const { code } = useParams()
  const [image, setImage] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    const ctrl = new AbortController()
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setLoading(true)
     
    setError('')
    guestImages
      .one(code, { signal: ctrl.signal })
      .then((d) => setImage(d || null))
      .catch((err) => {
        if (err?.code === 'ERR_CANCELED') return
        setError('Could not load this image.')
      })
      .finally(() => setLoading(false))
    return () => ctrl.abort()
  }, [code])

  const breadcrumbs = useMemo(
    () => [
      { to: '/public', label: 'Home' },
      { to: '/public/images', label: 'Images' },
      { label: pickMediaTitle(image) || 'Untitled image' },
    ],
    [image],
  )

  if (loading) {
    return (
      <PageContainer>
        <Skeleton className="h-6 w-32" />
        <Skeleton className="mt-4 h-10 w-2/3" />
        <Skeleton className="mt-3 h-4 w-1/2" />
        <Skeleton className="mt-8 aspect-[16/10] w-full rounded-2xl" />
      </PageContainer>
    )
  }
  if (error || !image) {
    return (
      <PageContainer>
        <ErrorState error={error || 'Image not found.'} />
      </PageContainer>
    )
  }

  const title = pickMediaTitle(image) || 'Untitled image'
  const originalCandidate =
    image.originalTitle ||
    image.titleOriginal ||
    image.titleInCentralKurdish ||
    image.centralKurdishTitle
  const original = originalCandidate && originalCandidate !== title ? originalCandidate : null
  const fileUrl = image.imageFileUrl

  return (
    <>
      <MediaHero
        kind="Image"
        title={title}
        originalTitle={original}
        description={image.description}
        breadcrumbs={breadcrumbs}
        action={
          fileUrl ? (
            <div className="flex flex-wrap gap-2">
              <a
                href={fileUrl}
                target="_blank"
                rel="noreferrer"
                className={cn(buttonVariants(), 'gap-1.5')}
              >
                <ExternalLink className="size-4" />
                Open original
              </a>
              <a
                href={fileUrl}
                download
                className={cn(buttonVariants({ variant: 'outline' }), 'gap-1.5')}
              >
                <Download className="size-4" />
                Download
              </a>
            </div>
          ) : null
        }
      />
      <PageContainer>
        <div className="grid gap-8 lg:grid-cols-[1fr_340px]">
          <div className="min-w-0">
            {fileUrl ? (
              <a
                href={fileUrl}
                target="_blank"
                rel="noreferrer"
                className="block overflow-hidden rounded-2xl border border-border bg-black/90 shadow-md shadow-black/10"
              >
                <img
                  src={fileUrl}
                  alt={title}
                  className="block max-h-[80vh] w-full object-contain"
                />
              </a>
            ) : (
              <div className="rounded-2xl border border-dashed border-border bg-muted/20 px-6 py-16 text-center text-sm text-muted-foreground">
                Image not publicly available.
              </div>
            )}

            {image.description ? (
              <section className="mt-6 rounded-2xl border border-border bg-card p-6 shadow-sm shadow-black/5">
                <h2 className="font-heading text-base font-semibold text-foreground">Description</h2>
                <p
                  className="mt-3 whitespace-pre-line break-words text-sm leading-7 text-foreground/90"
                  style={{ overflowWrap: 'anywhere' }}
                >
                  {image.description}
                </p>
              </section>
            ) : null}
          </div>

          <aside className="space-y-5 lg:sticky lg:top-32 lg:self-start">
            <MetaPanel title="Details">
              <MetaRow
                label="Project"
                value={image.project?.projectCode || image.projectCode}
              >
                <ProjectLink project={image.project || { projectCode: image.projectCode, projectName: image.projectName }} />
              </MetaRow>
              <MetaRow
                label="Person"
                value={image.person?.personCode || image.personCode}
              >
                <PersonLink person={image.person} fallbackCode={image.personCode} fallbackName={image.personName} />
              </MetaRow>
              <MetaRow label="Categories" value={image.categories}>
                <CategoryLinks categories={image.categories} />
              </MetaRow>
              <MetaRow label="Date">{formatPublicDate(image.imageDate || image.recordedAt)}</MetaRow>
            </MetaPanel>

            <MetaPanelIf
              obj={image}
              title="Subject & form"
              keys={['form', 'event', 'location', 'subject', 'subjects', 'genre', 'personShownInImage']}
            >
              <MetaRow label="Form">{image.form}</MetaRow>
              <MetaRow label="Event">{image.event}</MetaRow>
              <MetaRow label="Location">{image.location}</MetaRow>
              <MetaRow label="Subject" value={image.subject || image.subjects}>
                <PillRow values={image.subject || image.subjects} />
              </MetaRow>
              <MetaRow label="Genre" value={image.genre}>
                <PillRow values={image.genre} />
              </MetaRow>
              <MetaRow label="People shown">{image.personShownInImage}</MetaRow>
            </MetaPanelIf>

            <MetaPanelIf
              obj={image}
              title="Credits"
              keys={['creatorArtistPhotographer', 'contributor', 'contributors', 'audience']}
            >
              <MetaRow label="Creator / Photographer">{image.creatorArtistPhotographer}</MetaRow>
              <MetaRow label="Contributors" value={image.contributors || image.contributor}>
                <PillRow values={image.contributors || image.contributor} />
              </MetaRow>
              <MetaRow label="Audience">{image.audience}</MetaRow>
            </MetaPanelIf>

            <MetaPanelIf
              obj={image}
              title="Camera"
              keys={['manufacturer', 'model', 'lens']}
            >
              <MetaRow label="Manufacturer">{image.manufacturer}</MetaRow>
              <MetaRow label="Model">{image.model}</MetaRow>
              <MetaRow label="Lens">{image.lens}</MetaRow>
            </MetaPanelIf>

            <MetaPanelIf
              obj={image}
              title="Dates"
              keys={['dateCreated', 'datePublished', 'dateModified']}
            >
              <MetaRow label="Created">{formatPublicDate(image.dateCreated)}</MetaRow>
              <MetaRow label="Published">{formatPublicDate(image.datePublished)}</MetaRow>
              <MetaRow label="Modified">{formatPublicDate(image.dateModified)}</MetaRow>
            </MetaPanelIf>

            <MetaPanelIf
              obj={image}
              title="Technical"
              keys={['orientation', 'dimension', 'dpi', 'bitDepth', 'extension', 'fileSize', 'imageVersion']}
            >
              <MetaRow label="Orientation">{image.orientation}</MetaRow>
              <MetaRow label="Dimension">{image.dimension}</MetaRow>
              <MetaRow label="DPI">{image.dpi}</MetaRow>
              <MetaRow label="Bit depth">{image.bitDepth}</MetaRow>
              <MetaRow label="Extension">{image.extension}</MetaRow>
              <MetaRow label="File size">{image.fileSize}</MetaRow>
              <MetaRow label="Version">{image.imageVersion}</MetaRow>
            </MetaPanelIf>

            <MetaPanelIf
              obj={image}
              title="Archive & provenance"
              keys={['imageStatus', 'archiveCataloging', 'provenance', 'accrualMethod', 'physicalLabel', 'locationInArchiveRoom', 'lccClassification']}
            >
              <MetaRow label="Status">{image.imageStatus}</MetaRow>
              <MetaRow label="Cataloging">{image.archiveCataloging}</MetaRow>
              <MetaRow label="Provenance">{image.provenance}</MetaRow>
              <MetaRow label="Accrual method">{image.accrualMethod}</MetaRow>
              <MetaRow label="Physical label">{image.physicalLabel}</MetaRow>
              <MetaRow label="Archive room">{image.locationInArchiveRoom}</MetaRow>
              <MetaRow label="LCC">{image.lccClassification}</MetaRow>
            </MetaPanelIf>

            <MetaPanelIf
              obj={image}
              title="Rights"
              keys={['copyright', 'rightOwner', 'dateCopyrighted', 'availability', 'licenseType', 'usageRights', 'owner', 'publisher']}
            >
              <MetaRow label="Copyright">{image.copyright}</MetaRow>
              <MetaRow label="Right owner">{image.rightOwner}</MetaRow>
              <MetaRow label="Date copyrighted">{formatPublicDate(image.dateCopyrighted)}</MetaRow>
              <MetaRow label="Availability">{image.availability}</MetaRow>
              <MetaRow label="License">{image.licenseType}</MetaRow>
              <MetaRow label="Usage">{image.usageRights}</MetaRow>
              <MetaRow label="Owner">{image.owner}</MetaRow>
              <MetaRow label="Publisher">{image.publisher}</MetaRow>
            </MetaPanelIf>

            <MetaPanelIf
              obj={image}
              title="Notes"
              keys={['photostory', 'note']}
            >
              <MetaRow label="Photostory">{image.photostory}</MetaRow>
              <MetaRow label="Note">{image.note}</MetaRow>
            </MetaPanelIf>

            <MetaPanelIf
              obj={image}
              title="Tags & keywords"
              keys={['tags', 'keywords']}
            >
              <MetaRow label="Tags" value={image.tags}>
                <PillRow values={image.tags} tone="primary" />
              </MetaRow>
              <MetaRow label="Keywords" value={image.keywords}>
                <PillRow values={image.keywords} />
              </MetaRow>
            </MetaPanelIf>
          </aside>
        </div>
      </PageContainer>
    </>
  )
}

export { PublicImageDetailPage }
