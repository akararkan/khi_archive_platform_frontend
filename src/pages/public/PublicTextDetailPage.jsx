import { useEffect, useMemo, useState } from 'react'
import { useParams } from 'react-router-dom'
import { Download, ExternalLink } from 'lucide-react'

import { buttonVariants } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { Skeleton } from '@/components/ui/skeleton'
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
import { guestTexts } from '@/services/guest'

function PublicTextDetailPage() {
  const { code } = useParams()
  const [text, setText] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    const ctrl = new AbortController()
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setLoading(true)
     
    setError('')
    guestTexts
      .one(code, { signal: ctrl.signal })
      .then((d) => setText(d || null))
      .catch((err) => {
        if (err?.code === 'ERR_CANCELED') return
        setError('Could not load this text.')
      })
      .finally(() => setLoading(false))
    return () => ctrl.abort()
  }, [code])

  const breadcrumbs = useMemo(
    () => [
      { to: '/public', label: 'Home' },
      { to: '/public/texts', label: 'Texts' },
      { label: pickMediaTitle(text) || 'Untitled text' },
    ],
    [text],
  )

  if (loading) {
    return (
      <PageContainer>
        <Skeleton className="h-6 w-32" />
        <Skeleton className="mt-4 h-10 w-2/3" />
        <Skeleton className="mt-3 h-4 w-1/2" />
        <Skeleton className="mt-8 h-96 w-full rounded-2xl" />
      </PageContainer>
    )
  }
  if (error || !text) {
    return (
      <PageContainer>
        <ErrorState error={error || 'Text not found.'} />
      </PageContainer>
    )
  }

  const title = pickMediaTitle(text) || 'Untitled text'
  const originalCandidate =
    text.originalTitle ||
    text.titleOriginal ||
    text.titleInCentralKurdish ||
    text.centralKurdishTitle
  const original = originalCandidate && originalCandidate !== title ? originalCandidate : null
  const fileUrl = text.textFileUrl
  const isPdf = fileUrl && /\.pdf($|\?)/i.test(fileUrl)

  return (
    <>
      <MediaHero
        kind="Text"
        title={title}
        originalTitle={original}
        description={text.description || text.summary}
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
                Open document
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
          <div className="min-w-0 space-y-6">
            {fileUrl && isPdf ? (
              <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm shadow-black/5">
                <iframe
                  src={fileUrl}
                  title={title}
                  className="h-[80vh] w-full"
                  loading="lazy"
                />
              </div>
            ) : null}

            {text.summary ? (
              <Section title="Summary">
                <p className="whitespace-pre-line break-words text-sm leading-7 text-foreground/90" style={{ overflowWrap: 'anywhere' }}>
                  {text.summary}
                </p>
              </Section>
            ) : null}

            {text.bodyText ? (
              <Section title="Text">
                <p className="whitespace-pre-line break-words text-sm leading-7 text-foreground/90" style={{ overflowWrap: 'anywhere' }}>
                  {text.bodyText}
                </p>
              </Section>
            ) : null}
          </div>

          <aside className="space-y-5 lg:sticky lg:top-32 lg:self-start">
            <MetaPanel title="Details">
              <MetaRow
                label="Project"
                value={text.project?.projectCode || text.projectCode}
              >
                <ProjectLink project={text.project || { projectCode: text.projectCode, projectName: text.projectName }} />
              </MetaRow>
              <MetaRow
                label="Person"
                value={text.person?.personCode || text.personCode}
              >
                <PersonLink person={text.person} fallbackCode={text.personCode} fallbackName={text.personName} />
              </MetaRow>
              <MetaRow label="Categories" value={text.categories}>
                <CategoryLinks categories={text.categories} />
              </MetaRow>
              <MetaRow label="Date">{formatPublicDate(text.documentDate || text.recordedAt)}</MetaRow>
            </MetaPanel>

            <MetaPanelIf
              obj={text}
              title="Document"
              keys={['documentType', 'subject', 'subjects', 'genre', 'script', 'isbn', 'edition', 'volume', 'series', 'assignmentNumber']}
            >
              <MetaRow label="Document type">{text.documentType}</MetaRow>
              <MetaRow label="Subject" value={text.subject || text.subjects}>
                <PillRow values={text.subject || text.subjects} />
              </MetaRow>
              <MetaRow label="Genre" value={text.genre}>
                <PillRow values={text.genre} />
              </MetaRow>
              <MetaRow label="Script">{text.script}</MetaRow>
              <MetaRow label="ISBN">{text.isbn}</MetaRow>
              <MetaRow label="Edition">{text.edition}</MetaRow>
              <MetaRow label="Volume">{text.volume}</MetaRow>
              <MetaRow label="Series">{text.series}</MetaRow>
              <MetaRow label="Assignment #">{text.assignmentNumber}</MetaRow>
            </MetaPanelIf>

            <MetaPanelIf
              obj={text}
              title="Credits"
              keys={['author', 'contributors', 'contributor', 'printingHouse', 'audience']}
            >
              <MetaRow label="Author">{text.author}</MetaRow>
              <MetaRow label="Contributors" value={text.contributors || text.contributor}>
                <PillRow values={text.contributors || text.contributor} />
              </MetaRow>
              <MetaRow label="Printing house">{text.printingHouse}</MetaRow>
              <MetaRow label="Audience">{text.audience}</MetaRow>
            </MetaPanelIf>

            <MetaPanelIf
              obj={text}
              title="Language"
              keys={['language', 'dialect']}
            >
              <MetaRow label="Language">{text.language}</MetaRow>
              <MetaRow label="Dialect">{text.dialect}</MetaRow>
            </MetaPanelIf>

            <MetaPanelIf
              obj={text}
              title="Dates"
              keys={['dateCreated', 'printDate', 'datePublished', 'dateModified']}
            >
              <MetaRow label="Created">{formatPublicDate(text.dateCreated)}</MetaRow>
              <MetaRow label="Print date">{formatPublicDate(text.printDate)}</MetaRow>
              <MetaRow label="Published">{formatPublicDate(text.datePublished)}</MetaRow>
              <MetaRow label="Modified">{formatPublicDate(text.dateModified)}</MetaRow>
            </MetaPanelIf>

            <MetaPanelIf
              obj={text}
              title="Physical & technical"
              keys={['pageCount', 'orientation', 'size', 'physicalDimensions', 'extension', 'fileSize', 'textVersion']}
            >
              <MetaRow label="Pages">{text.pageCount}</MetaRow>
              <MetaRow label="Orientation">{text.orientation}</MetaRow>
              <MetaRow label="Size">{text.size}</MetaRow>
              <MetaRow label="Dimensions">{text.physicalDimensions}</MetaRow>
              <MetaRow label="Extension">{text.extension}</MetaRow>
              <MetaRow label="File size">{text.fileSize}</MetaRow>
              <MetaRow label="Version">{text.textVersion}</MetaRow>
            </MetaPanelIf>

            <MetaPanelIf
              obj={text}
              title="Archive & provenance"
              keys={['textStatus', 'archiveCataloging', 'provenance', 'accrualMethod', 'physicalLabel', 'locationInArchiveRoom', 'lccClassification']}
            >
              <MetaRow label="Status">{text.textStatus}</MetaRow>
              <MetaRow label="Cataloging">{text.archiveCataloging}</MetaRow>
              <MetaRow label="Provenance">{text.provenance}</MetaRow>
              <MetaRow label="Accrual method">{text.accrualMethod}</MetaRow>
              <MetaRow label="Physical label">{text.physicalLabel}</MetaRow>
              <MetaRow label="Archive room">{text.locationInArchiveRoom}</MetaRow>
              <MetaRow label="LCC">{text.lccClassification}</MetaRow>
            </MetaPanelIf>

            <MetaPanelIf
              obj={text}
              title="Rights"
              keys={['copyright', 'rightOwner', 'dateCopyrighted', 'availability', 'licenseType', 'usageRights', 'owner', 'publisher']}
            >
              <MetaRow label="Copyright">{text.copyright}</MetaRow>
              <MetaRow label="Right owner">{text.rightOwner}</MetaRow>
              <MetaRow label="Date copyrighted">{formatPublicDate(text.dateCopyrighted)}</MetaRow>
              <MetaRow label="Availability">{text.availability}</MetaRow>
              <MetaRow label="License">{text.licenseType}</MetaRow>
              <MetaRow label="Usage">{text.usageRights}</MetaRow>
              <MetaRow label="Owner">{text.owner}</MetaRow>
              <MetaRow label="Publisher">{text.publisher}</MetaRow>
            </MetaPanelIf>

            <MetaPanelIf
              obj={text}
              title="Notes"
              keys={['note']}
            >
              <MetaRow label="Note">{text.note}</MetaRow>
            </MetaPanelIf>

            <MetaPanelIf
              obj={text}
              title="Tags & keywords"
              keys={['tags', 'keywords']}
            >
              <MetaRow label="Tags" value={text.tags}>
                <PillRow values={text.tags} tone="primary" />
              </MetaRow>
              <MetaRow label="Keywords" value={text.keywords}>
                <PillRow values={text.keywords} />
              </MetaRow>
            </MetaPanelIf>
          </aside>
        </div>
      </PageContainer>
    </>
  )
}

function Section({ title, children }) {
  return (
    <section className="rounded-2xl border border-border bg-card p-6 shadow-sm shadow-black/5">
      <h2 className="font-heading text-base font-semibold text-foreground">{title}</h2>
      <div className="mt-3">{children}</div>
    </section>
  )
}

export { PublicTextDetailPage }
