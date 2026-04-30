import { useEffect, useState } from 'react'
import { Download, Image as ImageIcon, X } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { CodeBadge } from '@/components/ui/code-badge'
import { Highlight, HighlightProvider } from '@/components/ui/highlight'
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

function ImagePreview({ src, alt, downloadHref }) {
  const [hasError, setHasError] = useState(false)

  if (!src) return null
  return (
    <div className="overflow-hidden rounded-xl border bg-muted/20">
      <div className="relative flex max-h-[60vh] items-center justify-center bg-[radial-gradient(circle_at_center,_var(--muted)_0%,_transparent_70%)]">
        {hasError ? (
          <div className="flex flex-col items-center gap-2 px-6 py-10 text-center text-muted-foreground">
            <ImageIcon className="size-8" />
            <p className="text-xs">Preview failed to load.</p>
          </div>
        ) : (
          <img
            src={src}
            alt={alt || 'preview'}
            onError={() => setHasError(true)}
            className="max-h-[60vh] w-auto max-w-full object-contain"
          />
        )}
      </div>
      {downloadHref ? (
        <div className="flex items-center justify-end border-t bg-card/60 px-3 py-2">
          <a
            href={downloadHref}
            download
            className="inline-flex items-center gap-1.5 rounded-md border px-2.5 py-1 text-[11px] font-medium text-foreground transition hover:bg-muted"
          >
            <Download className="size-3.5" />
            Download original
          </a>
        </div>
      ) : null}
    </div>
  )
}

function ImageDetailsModal({ image, open, onOpenChange, searchQuery }) {
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

  if (!open || !image) return null

  const title =
    image.originalTitle ||
    image.alternativeTitle ||
    image.titleInCentralKurdish ||
    image.romanizedTitle ||
    image.fileName ||
    image.imageCode

  const projectChip = image.projectCode
    ? { label: image.projectName || image.projectCode, code: image.projectCode }
    : null
  const personChip = image.personCode
    ? { label: image.personName || image.personCode, code: image.personCode }
    : null

  const hasTitles = hasAny(image, ['originalTitle', 'alternativeTitle', 'titleInCentralKurdish', 'romanizedTitle', 'fileName'])
  const hasClassification = hasAny(image, ['subject', 'genre', 'event', 'location', 'description', 'form'])
  const hasImageMeta = hasAny(image, ['personShownInImage', 'colorOfImage', 'whereThisImageUsed', 'imageVersion', 'versionNumber', 'copyNumber'])
  const hasEquipment = hasAny(image, ['manufacturer', 'model', 'lens'])
  const hasTechnical = hasAny(image, ['orientation', 'dimension', 'bitDepth', 'dpi', 'extension', 'fileSize'])
  const hasCredits = hasAny(image, ['creatorArtistPhotographer', 'contributor', 'audience'])
  const hasArchival = hasAny(image, [
    'accrualMethod', 'provenance', 'photostory', 'imageStatus', 'archiveCataloging',
    'physicalAvailability', 'physicalLabel', 'locationInArchiveRoom', 'lccClassification', 'note',
  ])
  const hasStorage = hasAny(image, ['volumeName', 'directory', 'pathInExternalVolume', 'autoPath'])
  const hasDates = hasAny(image, ['dateCreated', 'datePublished', 'dateModified'])
  const hasRights = hasAny(image, [
    'copyright', 'rightOwner', 'dateCopyrighted', 'licenseType', 'usageRights',
    'availability', 'owner', 'publisher',
  ])
  const hasTags = hasAny(image, ['tags', 'keywords'])
  const hasAudit =
    image.createdAt || image.updatedAt || image.createdBy || image.updatedBy || image.removedAt || image.removedBy

  return (
    <div
      className="fixed inset-0 z-[96] flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm animate-in fade-in-0 duration-200 sm:p-6"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onOpenChange(false)
      }}
      role="dialog"
      aria-modal="true"
      aria-labelledby="image-details-title"
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
              <ImageIcon className="size-5" />
            </div>
            <div className="min-w-0 space-y-2">
              {image.imageCode && (
                <div className="flex flex-wrap items-center gap-2">
                  <CodeBadge code={image.imageCode} highlightQuery={searchQuery} />
                  {image.imageVersion && (
                    <span className="inline-flex items-center rounded-full border bg-background px-2.5 py-0.5 text-[11px] font-medium">
                      <Highlight text={image.imageVersion} />
                    </span>
                  )}
                  {image.removedAt && (
                    <span className="inline-flex items-center rounded-full border border-amber-500/30 bg-amber-500/10 px-2.5 py-0.5 text-[11px] font-medium text-amber-700 dark:text-amber-300">
                      Removed
                    </span>
                  )}
                </div>
              )}
              <h2
                id="image-details-title"
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
            {image.imageFileUrl && (
              <Section title="Preview">
                <ImagePreview src={image.imageFileUrl} alt={title} downloadHref={image.imageFileUrl} />
              </Section>
            )}

            {hasTitles && (
              <Section title="Titles">
                <div className="grid gap-5 sm:grid-cols-2">
                  <Field label="Original Title" value={image.originalTitle} />
                  <Field label="Alternative Title" value={image.alternativeTitle} />
                  <Field label="Central Kurdish Title" value={image.titleInCentralKurdish} />
                  <Field label="Romanized Title" value={image.romanizedTitle} />
                  <Field label="File Name" value={image.fileName} />
                </div>
              </Section>
            )}

            {image.description && (
              <Section title="Description">
                <p className="whitespace-pre-wrap border-l-2 border-border pl-4 text-sm leading-7 text-foreground/90">
                  <Highlight text={image.description} />
                </p>
              </Section>
            )}

            {hasClassification && (
              <Section title="Classification">
                <div className="grid gap-5 sm:grid-cols-2">
                  <Field label="Form" value={image.form} />
                  <Field label="Event" value={image.event} />
                  <Field label="Location" value={image.location} />
                </div>
                {image.subject?.length ? (
                  <div className="space-y-2">
                    <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">Subject</p>
                    <Chips items={image.subject} />
                  </div>
                ) : null}
                {image.genre?.length ? (
                  <div className="space-y-2">
                    <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">Genre</p>
                    <Chips items={image.genre} />
                  </div>
                ) : null}
              </Section>
            )}

            {hasImageMeta && (
              <Section title="Image Details">
                <div className="grid gap-5 sm:grid-cols-3">
                  <Field label="Version" value={image.imageVersion} />
                  <Field label="Version #" value={image.versionNumber} />
                  <Field label="Copy #" value={image.copyNumber} />
                </div>
                <Field label="People shown" value={image.personShownInImage} />
                {image.colorOfImage?.length ? (
                  <div className="space-y-2">
                    <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">Color</p>
                    <Chips items={image.colorOfImage} />
                  </div>
                ) : null}
                {image.whereThisImageUsed?.length ? (
                  <div className="space-y-2">
                    <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">Where used</p>
                    <Chips items={image.whereThisImageUsed} />
                  </div>
                ) : null}
              </Section>
            )}

            {hasEquipment && (
              <Section title="Equipment">
                <div className="grid gap-5 sm:grid-cols-3">
                  <Field label="Manufacturer" value={image.manufacturer} />
                  <Field label="Model" value={image.model} />
                  <Field label="Lens" value={image.lens} />
                </div>
              </Section>
            )}

            {hasCredits && (
              <Section title="Credits">
                <div className="grid gap-5 sm:grid-cols-2">
                  <Field label="Creator / Artist / Photographer" value={image.creatorArtistPhotographer} />
                  <Field label="Contributor" value={image.contributor} />
                  <Field label="Audience" value={image.audience} />
                </div>
              </Section>
            )}

            {hasTechnical && (
              <Section title="Technical">
                <div className="grid gap-5 sm:grid-cols-3">
                  <Field label="Orientation" value={image.orientation} />
                  <Field label="Dimension" value={image.dimension} />
                  <Field label="DPI" value={image.dpi} />
                  <Field label="Bit Depth" value={image.bitDepth} />
                  <Field label="Extension" value={image.extension} />
                  <Field label="File Size" value={image.fileSize} />
                </div>
              </Section>
            )}

            {hasStorage && (
              <Section title="Storage">
                <div className="grid gap-5 sm:grid-cols-2">
                  <Field label="Volume" value={image.volumeName} />
                  <Field label="Directory" value={image.directory} />
                  <Field label="Path in External Volume" value={image.pathInExternalVolume} />
                  <Field label="Auto Path" value={image.autoPath} />
                </div>
              </Section>
            )}

            {hasDates && (
              <Section title="Dates">
                <div className="grid gap-5 sm:grid-cols-3">
                  <Field label="Created" value={formatInstant(image.dateCreated)} />
                  <Field label="Published" value={formatInstant(image.datePublished)} />
                  <Field label="Modified" value={formatInstant(image.dateModified)} />
                </div>
              </Section>
            )}

            {hasTags && (
              <Section title="Tags & Keywords">
                <div className="grid gap-5 sm:grid-cols-2">
                  <div className="space-y-2">
                    <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">Tags</p>
                    <Chips items={image.tags} />
                  </div>
                  <div className="space-y-2">
                    <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">Keywords</p>
                    <Chips items={image.keywords} />
                  </div>
                </div>
              </Section>
            )}

            {hasArchival && (
              <Section title="Archival">
                <div className="grid gap-5 sm:grid-cols-2">
                  <Field label="Status" value={image.imageStatus} />
                  <Field label="Cataloging" value={image.archiveCataloging} />
                  <Field label="Provenance" value={image.provenance} />
                  <Field label="Accrual Method" value={image.accrualMethod} />
                  <Field
                    label="Physical Availability"
                    value={typeof image.physicalAvailability === 'boolean' ? (image.physicalAvailability ? 'Yes' : 'No') : null}
                  />
                  <Field label="Physical Label" value={image.physicalLabel} />
                  <Field label="Archive Room Location" value={image.locationInArchiveRoom} />
                  <Field label="LCC Classification" value={image.lccClassification} />
                </div>
                <Field label="Photostory" value={image.photostory} />
                <Field label="Note" value={image.note} />
              </Section>
            )}

            {hasRights && (
              <Section title="Rights & Provenance">
                <div className="grid gap-5 sm:grid-cols-2">
                  <Field label="Copyright" value={image.copyright} />
                  <Field label="Right Owner" value={image.rightOwner} />
                  <Field label="Date Copyrighted" value={formatInstant(image.dateCopyrighted)} />
                  <Field label="Availability" value={image.availability} />
                  <Field label="License Type" value={image.licenseType} />
                  <Field label="Usage Rights" value={image.usageRights} />
                  <Field label="Owner" value={image.owner} />
                  <Field label="Publisher" value={image.publisher} />
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
                    <Field label="Created At" value={formatInstant(image.createdAt)} />
                    <Field label="Created By" value={image.createdBy} />
                    <Field label="Updated At" value={formatInstant(image.updatedAt)} />
                    <Field label="Updated By" value={image.updatedBy} />
                  </div>
                  <div className="space-y-3">
                    <Field label="Removed At" value={formatInstant(image.removedAt)} />
                    <Field label="Removed By" value={image.removedBy} />
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

export { ImageDetailsModal }
