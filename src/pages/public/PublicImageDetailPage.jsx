import { useEffect, useMemo, useState } from 'react'
import { useParams } from 'react-router-dom'
import { Download, ExternalLink } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import {
  ErrorState,
  PageContainer,
} from '@/components/public/PublicShared'
import {
  CategoryLinks,
  MediaHero,
  MetaPanel,
  MetaRow,
  PersonLink,
  PillRow,
  ProjectLink,
} from '@/components/public/PublicMediaDetailShared'
import { formatPublicDate } from '@/components/public/public-helpers'
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
      { label: image?.titleEnglish || image?.titleOriginal || code },
    ],
    [image, code],
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

  const title = image.titleEnglish || image.titleOriginal || image.imageCode
  const original = image.titleOriginal && image.titleOriginal !== title ? image.titleOriginal : null
  const fileUrl = image.imageFileUrl

  return (
    <>
      <MediaHero
        kind="Image"
        title={title}
        originalTitle={original}
        code={image.imageCode}
        description={image.description}
        breadcrumbs={breadcrumbs}
        action={
          fileUrl ? (
            <div className="flex flex-wrap gap-2">
              <Button asChild className="gap-1.5">
                <a href={fileUrl} target="_blank" rel="noreferrer">
                  <ExternalLink className="size-4" />
                  Open original
                </a>
              </Button>
              <Button asChild variant="outline" className="gap-1.5">
                <a href={fileUrl} download>
                  <Download className="size-4" />
                  Download
                </a>
              </Button>
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
                <p className="mt-3 whitespace-pre-line text-sm leading-7 text-foreground/90">
                  {image.description}
                </p>
              </section>
            ) : null}
          </div>

          <aside className="space-y-5 lg:sticky lg:top-32 lg:self-start">
            <MetaPanel title="Details">
              <MetaRow label="Form">{image.form}</MetaRow>
              <MetaRow label="Event">{image.event}</MetaRow>
              <MetaRow label="Location">{image.location}</MetaRow>
              <MetaRow label="Subject">{image.subject}</MetaRow>
              <MetaRow label="Genre">{image.genre}</MetaRow>
              <MetaRow label="Date">{formatPublicDate(image.imageDate || image.recordedAt)}</MetaRow>
              <MetaRow label="Project">
                <ProjectLink project={image.project || { projectCode: image.projectCode, projectName: image.projectName }} />
              </MetaRow>
              <MetaRow label="Person">
                <PersonLink person={image.person} fallbackCode={image.personCode} fallbackName={image.personName} />
              </MetaRow>
              <MetaRow label="Categories">
                <CategoryLinks categories={image.categories} />
              </MetaRow>
              <MetaRow label="Subjects">
                <PillRow values={image.subjects} />
              </MetaRow>
            </MetaPanel>

            {(image.tags?.length || image.keywords?.length) ? (
              <MetaPanel title="Tags & keywords">
                <MetaRow label="Tags">
                  <PillRow values={image.tags} tone="primary" />
                </MetaRow>
                <MetaRow label="Keywords">
                  <PillRow values={image.keywords} />
                </MetaRow>
              </MetaPanel>
            ) : null}
          </aside>
        </div>
      </PageContainer>
    </>
  )
}

export { PublicImageDetailPage }
