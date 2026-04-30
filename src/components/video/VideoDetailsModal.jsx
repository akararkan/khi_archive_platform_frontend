import { useEffect } from 'react'
import { Video as VideoIcon, X } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { CodeBadge } from '@/components/ui/code-badge'
import { Highlight, HighlightProvider } from '@/components/ui/highlight'
import { VideoPlayer } from '@/components/ui/video-player'
import { useIsAdmin } from '@/hooks/use-current-profile'

function formatInstant(instant) {
  if (!instant) return null
  try {
    return new Intl.DateTimeFormat('en-GB', {
      year: 'numeric',
      month: 'short',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    }).format(new Date(instant))
  } catch {
    return String(instant)
  }
}

function Field({ label, value }) {
  if (value === null || value === undefined || value === '') return null
  const rendered = typeof value === 'string' ? <Highlight text={value} /> : value
  return (
    <div className="space-y-1.5">
      <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">{label}</p>
      <p className="break-words text-sm leading-6 text-foreground">{rendered}</p>
    </div>
  )
}

function Section({ title, children }) {
  return (
    <section className="space-y-3">
      <div className="flex items-center gap-3">
        <h3 className="text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">{title}</h3>
        <div className="h-px flex-1 bg-border" />
      </div>
      {children}
    </section>
  )
}

function Chips({ items }) {
  if (!items?.length) return <p className="text-sm text-muted-foreground">—</p>
  return (
    <div className="flex flex-wrap gap-1.5">
      {items.map((item, index) => (
        <span
          key={`${item}-${index}`}
          className="inline-flex items-center rounded-full border bg-muted/60 px-2.5 py-0.5 text-[11px] font-medium text-foreground/80"
        >
          <Highlight text={String(item)} />
        </span>
      ))}
    </div>
  )
}

function hasAny(obj, keys) {
  return keys.some((k) => {
    const v = obj[k]
    if (v === null || v === undefined || v === '') return false
    if (Array.isArray(v) && v.length === 0) return false
    return true
  })
}

function VideoDetailsModal({ video, open, onOpenChange, searchQuery }) {
  const isAdmin = useIsAdmin()

  useEffect(() => {
    if (!open) return undefined
    const handleEscape = (e) => {
      if (e.key === 'Escape') onOpenChange(false)
    }
    window.addEventListener('keydown', handleEscape)
    return () => window.removeEventListener('keydown', handleEscape)
  }, [onOpenChange, open])

  useEffect(() => {
    if (!open) return undefined
    const original = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = original
    }
  }, [open])

  if (!open || !video) return null

  const title =
    video.originalTitle ||
    video.alternativeTitle ||
    video.titleInCentralKurdish ||
    video.romanizedTitle ||
    video.fileName ||
    video.videoCode

  const projectChip = video.projectCode
    ? { label: video.projectName || video.projectCode, code: video.projectCode }
    : null
  const personChip = video.personCode
    ? { label: video.personName || video.personCode, code: video.personCode }
    : null

  const hasTitles = hasAny(video, ['originalTitle', 'alternativeTitle', 'titleInCentralKurdish', 'romanizedTitle', 'fileName'])
  const hasClassification = hasAny(video, ['subject', 'genre', 'event', 'location', 'description'])
  const hasVideoMeta = hasAny(video, ['personShownInVideo', 'colorOfVideo', 'whereThisVideoUsed', 'videoVersion', 'versionNumber', 'copyNumber'])
  const hasTechnical = hasAny(video, [
    'orientation', 'dimension', 'resolution', 'duration', 'bitDepth', 'frameRate',
    'overallBitRate', 'videoCodec', 'audioCodec', 'audioChannels', 'extension', 'fileSize',
  ])
  const hasLanguage = hasAny(video, ['language', 'dialect', 'subtitle'])
  const hasCredits = hasAny(video, ['creatorArtistDirector', 'producer', 'contributor', 'audience'])
  const hasArchival = hasAny(video, [
    'accrualMethod', 'provenance', 'videoStatus', 'archiveCataloging', 'physicalAvailability',
    'physicalLabel', 'locationInArchiveRoom', 'lccClassification', 'note',
  ])
  const hasStorage = hasAny(video, ['volumeName', 'directory', 'pathInExternalVolume', 'autoPath'])
  const hasDates = hasAny(video, ['dateCreated', 'datePublished', 'dateModified'])
  const hasRights = hasAny(video, [
    'copyright', 'rightOwner', 'dateCopyrighted', 'licenseType', 'usageRights',
    'availability', 'owner', 'publisher',
  ])
  const hasTags = hasAny(video, ['tags', 'keywords'])
  const hasAudit =
    video.createdAt || video.updatedAt || video.createdBy || video.updatedBy || video.removedAt || video.removedBy

  return (
    <div
      className="fixed inset-0 z-[96] flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm animate-in fade-in-0 duration-200 sm:p-6"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onOpenChange(false)
      }}
      role="dialog"
      aria-modal="true"
      aria-labelledby="video-details-title"
    >
      <div className="relative flex max-h-[92vh] w-full max-w-3xl flex-col overflow-hidden rounded-xl border bg-card text-card-foreground shadow-2xl shadow-black/40 animate-in fade-in-0 zoom-in-95 slide-in-from-bottom-2 duration-200">
        <HighlightProvider query={searchQuery}>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          onClick={() => onOpenChange(false)}
          className="absolute right-3 top-3 z-20 size-8 rounded-full bg-background/80 opacity-80 ring-1 ring-border backdrop-blur-md transition hover:opacity-100"
        >
          <X className="size-4" />
          <span className="sr-only">Close</span>
        </Button>

        <div className="relative shrink-0 border-b bg-gradient-to-b from-muted/70 via-muted/20 to-transparent px-6 py-6 sm:px-8 sm:py-7">
          <div className="flex items-start gap-4 pr-10">
            <div className="flex size-12 shrink-0 items-center justify-center rounded-xl border bg-background text-muted-foreground shadow-sm">
              <VideoIcon className="size-5" />
            </div>
            <div className="min-w-0 space-y-2">
              {video.videoCode && (
                <div className="flex flex-wrap items-center gap-2">
                  <CodeBadge code={video.videoCode} highlightQuery={searchQuery} />
                  {video.videoVersion && (
                    <span className="inline-flex items-center rounded-full border bg-background px-2.5 py-0.5 text-[11px] font-medium">
                      <Highlight text={video.videoVersion} />
                    </span>
                  )}
                  {video.removedAt && (
                    <span className="inline-flex items-center rounded-full border border-amber-500/30 bg-amber-500/10 px-2.5 py-0.5 text-[11px] font-medium text-amber-700 dark:text-amber-300">
                      Removed
                    </span>
                  )}
                </div>
              )}
              <h2
                id="video-details-title"
                className="break-words font-heading text-2xl font-semibold leading-tight tracking-tight text-foreground sm:text-[1.75rem]"
              >
                <Highlight text={String(title)} />
              </h2>
              {(projectChip || personChip) && (
                <div className="flex flex-wrap items-center gap-2 text-sm">
                  {projectChip && (
                    <>
                      <span className="text-muted-foreground">in project</span>
                      <span className="inline-flex items-center gap-1.5 rounded-full border bg-background px-2.5 py-0.5 text-xs font-medium text-foreground">
                        <Highlight text={String(projectChip.label)} />
                        <span className="font-mono text-[10px] text-muted-foreground">
                          <Highlight text={String(projectChip.code)} />
                        </span>
                      </span>
                    </>
                  )}
                  {personChip && (
                    <>
                      <span className="text-muted-foreground">person</span>
                      <span className="inline-flex items-center gap-1.5 rounded-full border bg-background px-2.5 py-0.5 text-xs font-medium text-foreground">
                        <Highlight text={String(personChip.label)} />
                        <span className="font-mono text-[10px] text-muted-foreground">
                          <Highlight text={String(personChip.code)} />
                        </span>
                      </span>
                    </>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-7 sm:px-8">
          <div className="space-y-8">
            {video.videoFileUrl && (
              <Section title="Playback">
                <VideoPlayer
                  src={video.videoFileUrl}
                  title={title}
                  subtitle={[video.videoVersion, video.extension, video.resolution, video.frameRate]
                    .filter(Boolean)
                    .join(' • ')}
                  downloadHref={video.videoFileUrl}
                />
              </Section>
            )}

            {hasTitles && (
              <Section title="Titles">
                <div className="grid gap-5 sm:grid-cols-2">
                  <Field label="Original Title" value={video.originalTitle} />
                  <Field label="Alternative Title" value={video.alternativeTitle} />
                  <Field label="Central Kurdish Title" value={video.titleInCentralKurdish} />
                  <Field label="Romanized Title" value={video.romanizedTitle} />
                  <Field label="File Name" value={video.fileName} />
                </div>
              </Section>
            )}

            {video.description && (
              <Section title="Description">
                <p className="whitespace-pre-wrap border-l-2 border-border pl-4 text-sm leading-7 text-foreground/90">
                  <Highlight text={video.description} />
                </p>
              </Section>
            )}

            {hasClassification && (
              <Section title="Classification">
                <div className="grid gap-5 sm:grid-cols-2">
                  <Field label="Event" value={video.event} />
                  <Field label="Location" value={video.location} />
                </div>
                {video.subject?.length ? (
                  <div className="space-y-2">
                    <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">Subject</p>
                    <Chips items={video.subject} />
                  </div>
                ) : null}
                {video.genre?.length ? (
                  <div className="space-y-2">
                    <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">Genre</p>
                    <Chips items={video.genre} />
                  </div>
                ) : null}
              </Section>
            )}

            {hasVideoMeta && (
              <Section title="Video Details">
                <div className="grid gap-5 sm:grid-cols-3">
                  <Field label="Version" value={video.videoVersion} />
                  <Field label="Version #" value={video.versionNumber} />
                  <Field label="Copy #" value={video.copyNumber} />
                </div>
                <Field label="People shown" value={video.personShownInVideo} />
                {video.colorOfVideo?.length ? (
                  <div className="space-y-2">
                    <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">Color</p>
                    <Chips items={video.colorOfVideo} />
                  </div>
                ) : null}
                {video.whereThisVideoUsed?.length ? (
                  <div className="space-y-2">
                    <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">Where used</p>
                    <Chips items={video.whereThisVideoUsed} />
                  </div>
                ) : null}
              </Section>
            )}

            {hasCredits && (
              <Section title="Credits">
                <div className="grid gap-5 sm:grid-cols-2">
                  <Field label="Creator / Artist / Director" value={video.creatorArtistDirector} />
                  <Field label="Producer" value={video.producer} />
                  <Field label="Contributor" value={video.contributor} />
                  <Field label="Audience" value={video.audience} />
                </div>
              </Section>
            )}

            {hasLanguage && (
              <Section title="Language">
                <div className="grid gap-5 sm:grid-cols-3">
                  <Field label="Language" value={video.language} />
                  <Field label="Dialect" value={video.dialect} />
                  <Field label="Subtitle" value={video.subtitle} />
                </div>
              </Section>
            )}

            {hasTechnical && (
              <Section title="Technical">
                <div className="grid gap-5 sm:grid-cols-3">
                  <Field label="Orientation" value={video.orientation} />
                  <Field label="Dimension" value={video.dimension} />
                  <Field label="Resolution" value={video.resolution} />
                  <Field label="Duration" value={video.duration} />
                  <Field label="Frame Rate" value={video.frameRate} />
                  <Field label="Bit Depth" value={video.bitDepth} />
                  <Field label="Overall Bit Rate" value={video.overallBitRate} />
                  <Field label="Video Codec" value={video.videoCodec} />
                  <Field label="Audio Codec" value={video.audioCodec} />
                  <Field label="Audio Channels" value={video.audioChannels} />
                  <Field label="Extension" value={video.extension} />
                  <Field label="File Size" value={video.fileSize} />
                </div>
              </Section>
            )}

            {hasStorage && (
              <Section title="Storage">
                <div className="grid gap-5 sm:grid-cols-2">
                  <Field label="Volume" value={video.volumeName} />
                  <Field label="Directory" value={video.directory} />
                  <Field label="Path in External Volume" value={video.pathInExternalVolume} />
                  <Field label="Auto Path" value={video.autoPath} />
                </div>
              </Section>
            )}

            {hasDates && (
              <Section title="Dates">
                <div className="grid gap-5 sm:grid-cols-3">
                  <Field label="Created" value={formatInstant(video.dateCreated)} />
                  <Field label="Published" value={formatInstant(video.datePublished)} />
                  <Field label="Modified" value={formatInstant(video.dateModified)} />
                </div>
              </Section>
            )}

            {hasTags && (
              <Section title="Tags & Keywords">
                <div className="grid gap-5 sm:grid-cols-2">
                  <div className="space-y-2">
                    <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">Tags</p>
                    <Chips items={video.tags} />
                  </div>
                  <div className="space-y-2">
                    <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">Keywords</p>
                    <Chips items={video.keywords} />
                  </div>
                </div>
              </Section>
            )}

            {hasArchival && (
              <Section title="Archival">
                <div className="grid gap-5 sm:grid-cols-2">
                  <Field label="Status" value={video.videoStatus} />
                  <Field label="Cataloging" value={video.archiveCataloging} />
                  <Field label="Provenance" value={video.provenance} />
                  <Field label="Accrual Method" value={video.accrualMethod} />
                  <Field
                    label="Physical Availability"
                    value={typeof video.physicalAvailability === 'boolean' ? (video.physicalAvailability ? 'Yes' : 'No') : null}
                  />
                  <Field label="Physical Label" value={video.physicalLabel} />
                  <Field label="Archive Room Location" value={video.locationInArchiveRoom} />
                  <Field label="LCC Classification" value={video.lccClassification} />
                </div>
                <Field label="Note" value={video.note} />
              </Section>
            )}

            {hasRights && (
              <Section title="Rights & Provenance">
                <div className="grid gap-5 sm:grid-cols-2">
                  <Field label="Copyright" value={video.copyright} />
                  <Field label="Right Owner" value={video.rightOwner} />
                  <Field label="Date Copyrighted" value={formatInstant(video.dateCopyrighted)} />
                  <Field label="Availability" value={video.availability} />
                  <Field label="License Type" value={video.licenseType} />
                  <Field label="Usage Rights" value={video.usageRights} />
                  <Field label="Owner" value={video.owner} />
                  <Field label="Publisher" value={video.publisher} />
                </div>
              </Section>
            )}

            {isAdmin && hasAudit && (
              <details className="group rounded-lg border bg-muted/20 px-4 py-3 open:pb-4 [&_summary::-webkit-details-marker]:hidden">
                <summary className="flex cursor-pointer list-none items-center justify-between text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground transition-colors hover:text-foreground">
                  <span>Audit Trail</span>
                  <span aria-hidden="true" className="text-base text-muted-foreground transition-transform duration-200 group-open:rotate-90">›</span>
                </summary>
                <div className="mt-4 grid gap-5 border-t pt-4 sm:grid-cols-2">
                  <div className="space-y-3">
                    <Field label="Created At" value={formatInstant(video.createdAt)} />
                    <Field label="Created By" value={video.createdBy} />
                    <Field label="Updated At" value={formatInstant(video.updatedAt)} />
                    <Field label="Updated By" value={video.updatedBy} />
                  </div>
                  <div className="space-y-3">
                    <Field label="Removed At" value={formatInstant(video.removedAt)} />
                    <Field label="Removed By" value={video.removedBy} />
                  </div>
                </div>
              </details>
            )}
          </div>
        </div>
        </HighlightProvider>
      </div>
    </div>
  )
}

export { VideoDetailsModal }
