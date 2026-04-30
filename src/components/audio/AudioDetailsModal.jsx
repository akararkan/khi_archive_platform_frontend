import { useEffect } from 'react'
import { AudioLines, X } from 'lucide-react'

import { AudioPlayer } from '@/components/ui/audio-player'
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
  // String values get search-term highlighting via the surrounding
  // <HighlightProvider>; non-strings (numbers, formatted dates, JSX) render
  // as-is.
  const rendered = typeof value === 'string' ? <Highlight text={value} /> : value
  return (
    <div className="space-y-1.5">
      <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
        {label}
      </p>
      <p className="break-words text-sm leading-6 text-foreground">{rendered}</p>
    </div>
  )
}

function Section({ title, children }) {
  return (
    <section className="space-y-3">
      <div className="flex items-center gap-3">
        <h3 className="text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
          {title}
        </h3>
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

function AudioDetailsModal({ audio, open, onOpenChange, searchQuery }) {
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

  if (!open || !audio) return null

  const title =
    audio.originTitle || audio.alterTitle || audio.centralKurdishTitle || audio.romanizedTitle || audio.fullName || audio.audioCode

  const projectChip = audio.projectCode
    ? { label: audio.projectName || audio.projectCode, code: audio.projectCode }
    : null
  const personChip = audio.personCode
    ? { label: audio.personName || audio.personCode, code: audio.personCode }
    : null

  const hasTitles = hasAny(audio, ['originTitle', 'alterTitle', 'centralKurdishTitle', 'romanizedTitle', 'fullName'])
  const hasMusic = hasAny(audio, ['form', 'genre', 'typeOfBasta', 'typeOfMaqam', 'typeOfComposition', 'typeOfPerformance', 'lyrics', 'poet'])
  const hasCredits = hasAny(audio, ['speaker', 'producer', 'composer', 'contributors'])
  const hasLanguage = hasAny(audio, ['language', 'dialect'])
  const hasLocation = hasAny(audio, ['recordingVenue', 'city', 'region'])
  const hasDates = hasAny(audio, ['dateCreated', 'datePublished', 'dateModified'])
  const hasClassification = hasAny(audio, ['tags', 'keywords', 'audience'])
  const hasPhysical = hasAny(audio, ['physicalAvailability', 'physicalLabel', 'locationArchive', 'degitizedBy', 'degitizationEquipment'])
  const hasFileMeta = hasAny(audio, [
    'audioChannel', 'fileExtension', 'fileSize', 'bitRate', 'bitDepth', 'sampleRate',
    'audioQualityOutOf10', 'audioVersion', 'versionNumber', 'copyNumber',
  ])
  const hasStorage = hasAny(audio, ['volumeName', 'directoryName', 'pathInExternal', 'autoPath', 'audioFileNote'])
  const hasRights = hasAny(audio, [
    'copyright', 'rightOwner', 'dateCopyrighted', 'availability', 'licenseType',
    'usageRights', 'owner', 'publisher', 'provenance', 'accrualMethod',
    'lccClassification', 'archiveLocalNote',
  ])
  const hasAudit =
    audio.createdAt ||
    audio.updatedAt ||
    audio.createdBy ||
    audio.updatedBy ||
    audio.removedAt ||
    audio.removedBy

  return (
    <div
      className="fixed inset-0 z-[96] flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm animate-in fade-in-0 duration-200 sm:p-6"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onOpenChange(false)
      }}
      role="dialog"
      aria-modal="true"
      aria-labelledby="audio-details-title"
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

        {/* hero */}
        <div className="relative shrink-0 border-b bg-gradient-to-b from-muted/70 via-muted/20 to-transparent px-6 py-6 sm:px-8 sm:py-7">
          <div className="flex items-start gap-4 pr-10">
            <div className="flex size-12 shrink-0 items-center justify-center rounded-xl border bg-background text-muted-foreground shadow-sm">
              <AudioLines className="size-5" />
            </div>
            <div className="min-w-0 space-y-2">
              {audio.audioCode && (
                <div className="flex flex-wrap items-center gap-2">
                  <CodeBadge code={audio.audioCode} highlightQuery={searchQuery} />
                  {audio.audioVersion && (
                    <span className="inline-flex items-center rounded-full border bg-background px-2.5 py-0.5 text-[11px] font-medium">
                      <Highlight text={audio.audioVersion} />
                    </span>
                  )}
                  {audio.removedAt && (
                    <span className="inline-flex items-center rounded-full border border-amber-500/30 bg-amber-500/10 px-2.5 py-0.5 text-[11px] font-medium text-amber-700 dark:text-amber-300">
                      Removed
                    </span>
                  )}
                </div>
              )}
              <h2
                id="audio-details-title"
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

        {/* body */}
        <div className="flex-1 overflow-y-auto px-6 py-7 sm:px-8">
          <div className="space-y-8">
            {audio.audioFileUrl && (
              <Section title="Playback">
                <AudioPlayer
                  src={audio.audioFileUrl}
                  title={title}
                  subtitle={[audio.audioVersion, audio.fileExtension, audio.bitRate]
                    .filter(Boolean)
                    .join(' • ')}
                  downloadHref={audio.audioFileUrl}
                />
              </Section>
            )}

            {hasTitles && (
              <Section title="Titles">
                <div className="grid gap-5 sm:grid-cols-2">
                  <Field label="Origin Title" value={audio.originTitle} />
                  <Field label="Alternate Title" value={audio.alterTitle} />
                  <Field label="Central Kurdish Title" value={audio.centralKurdishTitle} />
                  <Field label="Romanized Title" value={audio.romanizedTitle} />
                  <Field label="Full Name" value={audio.fullName} />
                </div>
              </Section>
            )}

            {(audio.abstractText || audio.description) && (
              <Section title="Summary">
                {audio.abstractText && (
                  <p className="whitespace-pre-wrap border-l-2 border-border pl-4 text-sm leading-7 text-foreground/90">
                    <Highlight text={audio.abstractText} />
                  </p>
                )}
                {audio.description && (
                  <p className="whitespace-pre-wrap border-l-2 border-border pl-4 text-sm leading-7 text-foreground/90">
                    <Highlight text={audio.description} />
                  </p>
                )}
              </Section>
            )}

            {hasMusic && (
              <Section title="Music & Form">
                <div className="grid gap-5 sm:grid-cols-2">
                  <Field label="Form" value={audio.form} />
                  <Field label="Type of Basta" value={audio.typeOfBasta} />
                  <Field label="Type of Maqam" value={audio.typeOfMaqam} />
                  <Field label="Type of Composition" value={audio.typeOfComposition} />
                  <Field label="Type of Performance" value={audio.typeOfPerformance} />
                  <Field label="Poet" value={audio.poet} />
                </div>
                {(() => {
                  const genres = Array.isArray(audio.genre)
                    ? audio.genre
                    : audio.genre
                    ? [audio.genre]
                    : []
                  if (genres.length === 0) return null
                  return (
                    <div className="space-y-2">
                      <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                        Genres
                      </p>
                      <Chips items={genres} />
                    </div>
                  )
                })()}
                {audio.lyrics && (
                  <div className="space-y-1.5">
                    <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                      Lyrics
                    </p>
                    <p className="whitespace-pre-wrap border-l-2 border-border pl-4 text-sm leading-7 text-foreground/90">
                      <Highlight text={audio.lyrics} />
                    </p>
                  </div>
                )}
              </Section>
            )}

            {hasCredits && (
              <Section title="Credits">
                <div className="grid gap-5 sm:grid-cols-2">
                  <Field label="Speaker" value={audio.speaker} />
                  <Field label="Producer" value={audio.producer} />
                  <Field label="Composer" value={audio.composer} />
                </div>
                {audio.contributors?.length ? (
                  <div className="space-y-2">
                    <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                      Contributors
                    </p>
                    <Chips items={audio.contributors} />
                  </div>
                ) : null}
              </Section>
            )}

            {hasLanguage && (
              <Section title="Language">
                <div className="grid gap-5 sm:grid-cols-2">
                  <Field label="Language" value={audio.language} />
                  <Field label="Dialect" value={audio.dialect} />
                </div>
              </Section>
            )}

            {hasLocation && (
              <Section title="Recording Location">
                <div className="grid gap-5 sm:grid-cols-3">
                  <Field label="Venue" value={audio.recordingVenue} />
                  <Field label="City" value={audio.city} />
                  <Field label="Region" value={audio.region} />
                </div>
              </Section>
            )}

            {hasDates && (
              <Section title="Dates">
                <div className="grid gap-5 sm:grid-cols-3">
                  <Field label="Created" value={formatInstant(audio.dateCreated)} />
                  <Field label="Published" value={formatInstant(audio.datePublished)} />
                  <Field label="Modified" value={formatInstant(audio.dateModified)} />
                </div>
              </Section>
            )}

            {hasClassification && (
              <Section title="Classification">
                <div className="grid gap-5 sm:grid-cols-2">
                  <div className="space-y-2">
                    <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                      Tags
                    </p>
                    <Chips items={audio.tags} />
                  </div>
                  <div className="space-y-2">
                    <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                      Keywords
                    </p>
                    <Chips items={audio.keywords} />
                  </div>
                </div>
                <Field label="Audience" value={audio.audience} />
              </Section>
            )}

            {hasPhysical && (
              <Section title="Physical Copy">
                <div className="grid gap-5 sm:grid-cols-2">
                  <Field
                    label="Physical Availability"
                    value={
                      typeof audio.physicalAvailability === 'boolean'
                        ? audio.physicalAvailability
                          ? 'Yes'
                          : 'No'
                        : null
                    }
                  />
                  <Field label="Physical Label" value={audio.physicalLabel} />
                  <Field label="Archive Location" value={audio.locationArchive} />
                  <Field label="Digitized By" value={audio.degitizedBy} />
                  <Field label="Digitization Equipment" value={audio.degitizationEquipment} />
                </div>
              </Section>
            )}

            {hasFileMeta && (
              <Section title="Audio Details">
                <div className="grid gap-5 sm:grid-cols-3">
                  <Field label="Version" value={audio.audioVersion} />
                  <Field label="Version #" value={audio.versionNumber} />
                  <Field label="Copy #" value={audio.copyNumber} />
                  <Field label="Channel" value={audio.audioChannel} />
                  <Field label="Extension" value={audio.fileExtension} />
                  <Field label="File Size" value={audio.fileSize} />
                  <Field label="Bit Rate" value={audio.bitRate} />
                  <Field label="Bit Depth" value={audio.bitDepth} />
                  <Field label="Sample Rate" value={audio.sampleRate} />
                  <Field
                    label="Quality"
                    value={audio.audioQualityOutOf10 != null ? `${audio.audioQualityOutOf10} / 10` : null}
                  />
                </div>
              </Section>
            )}

            {hasStorage && (
              <Section title="Storage & Notes">
                <div className="grid gap-5 sm:grid-cols-2">
                  <Field label="Volume" value={audio.volumeName} />
                  <Field label="Directory" value={audio.directoryName} />
                  <Field label="External Path" value={audio.pathInExternal} />
                  <Field label="Auto Path" value={audio.autoPath} />
                </div>
                <Field label="File Note" value={audio.audioFileNote} />
              </Section>
            )}

            {hasRights && (
              <Section title="Rights & Provenance">
                <div className="grid gap-5 sm:grid-cols-2">
                  <Field label="Copyright" value={audio.copyright} />
                  <Field label="Right Owner" value={audio.rightOwner} />
                  <Field label="Date Copyrighted" value={formatInstant(audio.dateCopyrighted)} />
                  <Field label="Availability" value={audio.availability} />
                  <Field label="License Type" value={audio.licenseType} />
                  <Field label="Usage Rights" value={audio.usageRights} />
                  <Field label="Owner" value={audio.owner} />
                  <Field label="Publisher" value={audio.publisher} />
                  <Field label="Provenance" value={audio.provenance} />
                  <Field label="Accrual Method" value={audio.accrualMethod} />
                  <Field label="LCC Classification" value={audio.lccClassification} />
                </div>
                <Field label="Archive Local Note" value={audio.archiveLocalNote} />
              </Section>
            )}

            {isAdmin && hasAudit && (
              <details className="group rounded-lg border bg-muted/20 px-4 py-3 open:pb-4 [&_summary::-webkit-details-marker]:hidden">
                <summary className="flex cursor-pointer list-none items-center justify-between text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground transition-colors hover:text-foreground">
                  <span>Audit Trail</span>
                  <span
                    aria-hidden="true"
                    className="text-base text-muted-foreground transition-transform duration-200 group-open:rotate-90"
                  >
                    ›
                  </span>
                </summary>
                <div className="mt-4 grid gap-5 border-t pt-4 sm:grid-cols-2">
                  <div className="space-y-3">
                    <Field label="Created At" value={formatInstant(audio.createdAt)} />
                    <Field label="Created By" value={audio.createdBy} />
                    <Field label="Updated At" value={formatInstant(audio.updatedAt)} />
                    <Field label="Updated By" value={audio.updatedBy} />
                  </div>
                  <div className="space-y-3">
                    <Field label="Removed At" value={formatInstant(audio.removedAt)} />
                    <Field label="Removed By" value={audio.removedBy} />
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

export { AudioDetailsModal }
