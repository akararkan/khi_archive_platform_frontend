import { useEffect } from 'react'
import { Download, FileText, X } from 'lucide-react'

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

function TextFilePreview({ src, ext, downloadHref }) {
  if (!src) return null
  const lower = (ext || '').toLowerCase()
  const isPdf = lower === 'pdf'

  return (
    <div className="overflow-hidden rounded-xl border bg-muted/20">
      {isPdf ? (
        <iframe
          src={src}
          title="Text preview"
          className="block h-[60vh] w-full bg-background"
        />
      ) : (
        <div className="flex flex-col items-center gap-3 px-6 py-10 text-center text-muted-foreground">
          <FileText className="size-8" />
          <p className="text-sm">Inline preview is not available for this file type.</p>
        </div>
      )}
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

function TextDetailsModal({ text, open, onOpenChange, searchQuery }) {
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

  if (!open || !text) return null

  const title =
    text.originalTitle ||
    text.alternativeTitle ||
    text.titleInCentralKurdish ||
    text.romanizedTitle ||
    text.fileName ||
    text.textCode

  const projectChip = text.projectCode
    ? { label: text.projectName || text.projectCode, code: text.projectCode }
    : null
  const personChip = text.personCode
    ? { label: text.personName || text.personCode, code: text.personCode }
    : null

  const hasTitles = hasAny(text, ['originalTitle', 'alternativeTitle', 'titleInCentralKurdish', 'romanizedTitle', 'fileName'])
  const hasClassification = hasAny(text, ['subject', 'genre', 'documentType', 'description'])
  const hasTextDetails = hasAny(text, [
    'script', 'isbn', 'assignmentNumber', 'edition', 'volume', 'series',
    'textVersion', 'versionNumber', 'copyNumber', 'transcription',
  ])
  const hasTechnical = hasAny(text, ['orientation', 'pageCount', 'size', 'physicalDimensions', 'extension', 'fileSize'])
  const hasLanguage = hasAny(text, ['language', 'dialect'])
  const hasCredits = hasAny(text, ['author', 'contributors', 'printingHouse', 'audience'])
  const hasArchival = hasAny(text, [
    'accrualMethod', 'provenance', 'textStatus', 'archiveCataloging', 'physicalAvailability',
    'physicalLabel', 'locationInArchiveRoom', 'lccClassification', 'note',
  ])
  const hasStorage = hasAny(text, ['volumeName', 'directory', 'pathInExternalVolume', 'autoPath'])
  const hasDates = hasAny(text, ['dateCreated', 'printDate', 'datePublished', 'dateModified'])
  const hasRights = hasAny(text, [
    'copyright', 'rightOwner', 'dateCopyrighted', 'licenseType', 'usageRights',
    'availability', 'owner', 'publisher',
  ])
  const hasTags = hasAny(text, ['tags', 'keywords'])
  const hasAudit =
    text.createdAt || text.updatedAt || text.createdBy || text.updatedBy || text.removedAt || text.removedBy

  return (
    <div
      className="fixed inset-0 z-[96] flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm animate-in fade-in-0 duration-200 sm:p-6"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onOpenChange(false)
      }}
      role="dialog"
      aria-modal="true"
      aria-labelledby="text-details-title"
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
              <FileText className="size-5" />
            </div>
            <div className="min-w-0 space-y-2">
              {text.textCode && (
                <div className="flex flex-wrap items-center gap-2">
                  <CodeBadge code={text.textCode} highlightQuery={searchQuery} />
                  {text.textVersion && (
                    <span className="inline-flex items-center rounded-full border bg-background px-2.5 py-0.5 text-[11px] font-medium">
                      <Highlight text={text.textVersion} />
                    </span>
                  )}
                  {text.removedAt && (
                    <span className="inline-flex items-center rounded-full border border-amber-500/30 bg-amber-500/10 px-2.5 py-0.5 text-[11px] font-medium text-amber-700 dark:text-amber-300">
                      Removed
                    </span>
                  )}
                </div>
              )}
              <h2
                id="text-details-title"
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
            {text.textFileUrl && (
              <Section title="Preview">
                <TextFilePreview
                  src={text.textFileUrl}
                  ext={text.extension}
                  downloadHref={text.textFileUrl}
                />
              </Section>
            )}

            {hasTitles && (
              <Section title="Titles">
                <div className="grid gap-5 sm:grid-cols-2">
                  <Field label="Original Title" value={text.originalTitle} />
                  <Field label="Alternative Title" value={text.alternativeTitle} />
                  <Field label="Central Kurdish Title" value={text.titleInCentralKurdish} />
                  <Field label="Romanized Title" value={text.romanizedTitle} />
                  <Field label="File Name" value={text.fileName} />
                </div>
              </Section>
            )}

            {text.description && (
              <Section title="Description">
                <p className="whitespace-pre-wrap border-l-2 border-border pl-4 text-sm leading-7 text-foreground/90">
                  <Highlight text={text.description} />
                </p>
              </Section>
            )}

            {hasClassification && (
              <Section title="Classification">
                <div className="grid gap-5 sm:grid-cols-2">
                  <Field label="Document Type" value={text.documentType} />
                </div>
                {text.subject?.length ? (
                  <div className="space-y-2">
                    <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">Subject</p>
                    <Chips items={text.subject} />
                  </div>
                ) : null}
                {text.genre?.length ? (
                  <div className="space-y-2">
                    <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">Genre</p>
                    <Chips items={text.genre} />
                  </div>
                ) : null}
              </Section>
            )}

            {hasTextDetails && (
              <Section title="Text Details">
                <div className="grid gap-5 sm:grid-cols-3">
                  <Field label="Version" value={text.textVersion} />
                  <Field label="Version #" value={text.versionNumber} />
                  <Field label="Copy #" value={text.copyNumber} />
                  <Field label="Script" value={text.script} />
                  <Field label="ISBN" value={text.isbn} />
                  <Field label="Assignment #" value={text.assignmentNumber} />
                  <Field label="Edition" value={text.edition} />
                  <Field label="Volume" value={text.volume} />
                  <Field label="Series" value={text.series} />
                </div>
                {text.transcription ? (
                  <div className="space-y-2">
                    <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">Transcription</p>
                    <p className="whitespace-pre-wrap rounded-md border bg-muted/20 px-3 py-2 text-sm leading-6 text-foreground/90">
                      <Highlight text={text.transcription} />
                    </p>
                  </div>
                ) : null}
              </Section>
            )}

            {hasLanguage && (
              <Section title="Language">
                <div className="grid gap-5 sm:grid-cols-2">
                  <Field label="Language" value={text.language} />
                  <Field label="Dialect" value={text.dialect} />
                </div>
              </Section>
            )}

            {hasCredits && (
              <Section title="Credits">
                <div className="grid gap-5 sm:grid-cols-2">
                  <Field label="Author" value={text.author} />
                  <Field label="Contributors" value={text.contributors} />
                  <Field label="Printing House" value={text.printingHouse} />
                  <Field label="Audience" value={text.audience} />
                </div>
              </Section>
            )}

            {hasTechnical && (
              <Section title="Technical">
                <div className="grid gap-5 sm:grid-cols-3">
                  <Field label="Page Count" value={text.pageCount} />
                  <Field label="Orientation" value={text.orientation} />
                  <Field label="Size" value={text.size} />
                  <Field label="Physical Dimensions" value={text.physicalDimensions} />
                  <Field label="Extension" value={text.extension} />
                  <Field label="File Size" value={text.fileSize} />
                </div>
              </Section>
            )}

            {hasStorage && (
              <Section title="Storage">
                <div className="grid gap-5 sm:grid-cols-2">
                  <Field label="Volume" value={text.volumeName} />
                  <Field label="Directory" value={text.directory} />
                  <Field label="Path in External Volume" value={text.pathInExternalVolume} />
                  <Field label="Auto Path" value={text.autoPath} />
                </div>
              </Section>
            )}

            {hasDates && (
              <Section title="Dates">
                <div className="grid gap-5 sm:grid-cols-4">
                  <Field label="Created" value={formatInstant(text.dateCreated)} />
                  <Field label="Print Date" value={formatInstant(text.printDate)} />
                  <Field label="Published" value={formatInstant(text.datePublished)} />
                  <Field label="Modified" value={formatInstant(text.dateModified)} />
                </div>
              </Section>
            )}

            {hasTags && (
              <Section title="Tags & Keywords">
                <div className="grid gap-5 sm:grid-cols-2">
                  <div className="space-y-2">
                    <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">Tags</p>
                    <Chips items={text.tags} />
                  </div>
                  <div className="space-y-2">
                    <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">Keywords</p>
                    <Chips items={text.keywords} />
                  </div>
                </div>
              </Section>
            )}

            {hasArchival && (
              <Section title="Archival">
                <div className="grid gap-5 sm:grid-cols-2">
                  <Field label="Status" value={text.textStatus} />
                  <Field label="Cataloging" value={text.archiveCataloging} />
                  <Field label="Provenance" value={text.provenance} />
                  <Field label="Accrual Method" value={text.accrualMethod} />
                  <Field
                    label="Physical Availability"
                    value={typeof text.physicalAvailability === 'boolean' ? (text.physicalAvailability ? 'Yes' : 'No') : null}
                  />
                  <Field label="Physical Label" value={text.physicalLabel} />
                  <Field label="Archive Room Location" value={text.locationInArchiveRoom} />
                  <Field label="LCC Classification" value={text.lccClassification} />
                </div>
                <Field label="Note" value={text.note} />
              </Section>
            )}

            {hasRights && (
              <Section title="Rights & Provenance">
                <div className="grid gap-5 sm:grid-cols-2">
                  <Field label="Copyright" value={text.copyright} />
                  <Field label="Right Owner" value={text.rightOwner} />
                  <Field label="Date Copyrighted" value={formatInstant(text.dateCopyrighted)} />
                  <Field label="Availability" value={text.availability} />
                  <Field label="License Type" value={text.licenseType} />
                  <Field label="Usage Rights" value={text.usageRights} />
                  <Field label="Owner" value={text.owner} />
                  <Field label="Publisher" value={text.publisher} />
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
                    <Field label="Created At" value={formatInstant(text.createdAt)} />
                    <Field label="Created By" value={text.createdBy} />
                    <Field label="Updated At" value={formatInstant(text.updatedAt)} />
                    <Field label="Updated By" value={text.updatedBy} />
                  </div>
                  <div className="space-y-3">
                    <Field label="Removed At" value={formatInstant(text.removedAt)} />
                    <Field label="Removed By" value={text.removedBy} />
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

export { TextDetailsModal }
