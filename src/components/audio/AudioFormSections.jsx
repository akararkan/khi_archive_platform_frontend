import { EyeOff, Globe, Plus } from 'lucide-react'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { TagsInput } from '@/components/ui/tags-input'
import { TagSuggestInput } from '@/components/ui/tag-suggest-input'
import { KeywordSuggestInput } from '@/components/ui/keyword-suggest-input'
import { FieldHelpButton } from '@/components/ui/field-help'
import { getAudioFieldMetadata } from '@/lib/audio-fields-metadata'
import { getVolumeNameFromPath } from '@/lib/file-source-path'
import { cn } from '@/lib/utils'

// Extracted verbatim from EmployeeProjectDetailPage so the audio metadata form
// can be reused by the unified "List of Items" edit view. Purely presentational:
// all state flows through `setForm`. Mirrors VideoFormSections / ImageFormSections
// / TextFormSections.

const TEXTAREA_CLASS =
  'min-h-[96px] w-full resize-y rounded-lg border border-input bg-background px-3 py-2 text-sm shadow-sm transition-colors placeholder:text-muted-foreground/70 focus-visible:border-ring focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/30'

function GenreChips({ categories, value, onChange }) {
  const selected = Array.isArray(value) ? value : []
  const selectedLower = new Set(selected.map((s) => s.toLowerCase()))

  const categoryNames = (categories || [])
    .map((c) => c.categoryName || c.name || c.categoryCode)
    .filter(Boolean)
  const suggestions = categoryNames.filter((name) => !selectedLower.has(name.toLowerCase()))

  const addOne = (name) => {
    if (!name || selectedLower.has(name.toLowerCase())) return
    onChange([...selected, name])
  }

  return (
    <div className="space-y-2">
      <TagsInput
        value={selected}
        onChange={onChange}
        placeholder="Type a genre and press Enter, or pick a suggestion below"
      />
      {categoryNames.length === 0 ? (
        <p className="text-[11px] text-muted-foreground">
          Tip: add categories to this project to get one-click genre suggestions here.
        </p>
      ) : suggestions.length > 0 ? (
        <div className="flex flex-wrap items-center gap-1.5">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
            From categories:
          </p>
          {suggestions.map((name) => (
            <button
              type="button"
              key={name}
              onClick={() => addOne(name)}
              className="inline-flex items-center gap-1 rounded-full border border-dashed border-border bg-background px-2 py-0.5 text-[11px] font-medium text-muted-foreground transition hover:border-primary/40 hover:bg-primary/5 hover:text-foreground"
            >
              <Plus className="size-3" />
              {name}
            </button>
          ))}
        </div>
      ) : (
        <p className="text-[11px] text-muted-foreground">
          All of this project's categories are already used as genres.
        </p>
      )}
    </div>
  )
}

// Wraps a Label + help button row, looking up the description from the
// audio metadata. `fieldKey` defaults to `htmlFor` since most audio
// labels share the same name; pass an explicit fieldKey for the
// handful that differ (audioTags → tags, audioKeywords → keywords).
function AudioFieldLabel({ htmlFor, fieldKey, className, children }) {
  return (
    <div className="flex items-center justify-between gap-2">
      <Label htmlFor={htmlFor} className={className}>
        {children}
      </Label>
      <FieldHelpButton metadata={getAudioFieldMetadata(fieldKey || htmlFor)} />
    </div>
  )
}

export function AudioFormSections({ form, setForm, projectCategories = [] }) {
  const isPublicAudio = form.isPublic === true
  return (
    <>
      {/* Visibility */}
      <div className={cn(
        'flex items-center justify-between rounded-2xl border px-5 py-4',
        isPublicAudio
          ? 'border-green-200 bg-green-50/40 dark:border-green-900/30 dark:bg-green-950/10'
          : 'border-amber-200 bg-amber-50/40 dark:border-amber-900/30 dark:bg-amber-950/10',
      )}>
        <div className="flex items-center gap-3">
          <span className={cn(
            'grid size-9 shrink-0 place-items-center rounded-xl',
            isPublicAudio ? 'bg-green-500/15 text-green-600' : 'bg-amber-500/15 text-amber-600',
          )}>
            {isPublicAudio ? <Globe className="size-4.5" /> : <EyeOff className="size-4.5" />}
          </span>
          <div>
            <p className="text-sm font-semibold text-foreground">
              {isPublicAudio ? 'Public — visible in the catalogue' : 'Private — hidden from guests'}
            </p>
            <p className="text-xs text-muted-foreground">
              {isPublicAudio
                ? 'This audio is visible to all public visitors and can be searched.'
                : 'Only archive staff can access this record. Guests cannot find or view it.'}
            </p>
          </div>
        </div>
        <label className="relative cursor-pointer select-none">
          <input
            type="checkbox"
            className="sr-only peer"
            checked={isPublicAudio}
            onChange={(e) => setForm({ ...form, isPublic: e.target.checked })}
          />
          <div className={cn(
            'flex h-6 w-11 items-center rounded-full px-0.5 transition-colors',
            isPublicAudio ? 'bg-green-500' : 'bg-input',
          )}>
            <div className={cn(
              'size-5 rounded-full bg-white shadow-sm transition-transform',
              isPublicAudio ? 'translate-x-5' : 'translate-x-0',
            )} />
          </div>
        </label>
      </div>

      <Card className="border-border bg-card shadow-sm shadow-black/5">
        <CardHeader className="border-b border-border pb-4">
          <CardTitle className="text-base font-semibold">Titles</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-5 pt-5 sm:grid-cols-2">
          <div className="space-y-1.5 sm:col-span-2">
            <AudioFieldLabel htmlFor="fileName">File Name</AudioFieldLabel>
            <Input
              id="fileName"
              value={form.fileName}
              readOnly
              placeholder="Filled automatically from the selected file"
              className="bg-muted/40 text-muted-foreground"
            />
            <p className="text-[11px] text-muted-foreground">
              Filled automatically from the selected audio file.
            </p>
          </div>
          <div className="space-y-1.5">
            <AudioFieldLabel htmlFor="originTitle">Origin Title</AudioFieldLabel>
            <Input id="originTitle" value={form.originTitle} onChange={(e) => setForm({ ...form, originTitle: e.target.value })} />
          </div>
          <div className="space-y-1.5">
            <AudioFieldLabel htmlFor="alterTitle">Alternate Title</AudioFieldLabel>
            <Input id="alterTitle" value={form.alterTitle} onChange={(e) => setForm({ ...form, alterTitle: e.target.value })} />
          </div>
          <div className="space-y-1.5">
            <AudioFieldLabel htmlFor="centralKurdishTitle">Central Kurdish Title</AudioFieldLabel>
            <Input id="centralKurdishTitle" value={form.centralKurdishTitle} onChange={(e) => setForm({ ...form, centralKurdishTitle: e.target.value })} dir="rtl" />
          </div>
          <div className="space-y-1.5">
            <AudioFieldLabel htmlFor="romanizedTitle">Romanized Title</AudioFieldLabel>
            <Input id="romanizedTitle" value={form.romanizedTitle} onChange={(e) => setForm({ ...form, romanizedTitle: e.target.value })} />
          </div>
        </CardContent>
      </Card>

      <Card className="border-border bg-card shadow-sm shadow-black/5">
        <CardHeader className="border-b border-border pb-4">
          <CardTitle className="text-base font-semibold">Description</CardTitle>
          <CardDescription className="text-xs">Abstract and full description.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-5 pt-5 sm:grid-cols-2">
          <div className="space-y-1.5">
            <AudioFieldLabel htmlFor="abstractText">Abstract</AudioFieldLabel>
            <textarea id="abstractText" className={TEXTAREA_CLASS} value={form.abstractText} onChange={(e) => setForm({ ...form, abstractText: e.target.value })} />
          </div>
          <div className="space-y-1.5">
            <AudioFieldLabel htmlFor="description">Description</AudioFieldLabel>
            <textarea id="description" className={`${TEXTAREA_CLASS} text-right`} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} dir="rtl" lang="ckb" />
          </div>
        </CardContent>
      </Card>

      <Card className="border-border bg-card shadow-sm shadow-black/5">
        <CardHeader className="border-b border-border pb-4">
          <CardTitle className="text-base font-semibold">Music & Form</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-5 pt-5 sm:grid-cols-2">
          <div className="space-y-1.5">
            <AudioFieldLabel htmlFor="form">Form</AudioFieldLabel>
            <Input id="form" value={form.form} onChange={(e) => setForm({ ...form, form: e.target.value })} />
          </div>
          <div className="space-y-1.5 sm:col-span-2">
            <div className="flex items-center justify-between gap-2">
              <Label>
                Genres{' '}
                <span className="font-normal text-muted-foreground">
                  (pick from this project's categories)
                </span>
              </Label>
              <FieldHelpButton metadata={getAudioFieldMetadata('genre')} />
            </div>
            <GenreChips
              categories={projectCategories}
              value={form.genre}
              onChange={(next) => setForm({ ...form, genre: next })}
            />
          </div>
          <div className="space-y-1.5">
            <AudioFieldLabel htmlFor="typeOfBasta">Type of Basta</AudioFieldLabel>
            <Input id="typeOfBasta" value={form.typeOfBasta} onChange={(e) => setForm({ ...form, typeOfBasta: e.target.value })} />
          </div>
          <div className="space-y-1.5">
            <AudioFieldLabel htmlFor="typeOfMaqam">Type of Maqam</AudioFieldLabel>
            <Input id="typeOfMaqam" value={form.typeOfMaqam} onChange={(e) => setForm({ ...form, typeOfMaqam: e.target.value })} />
          </div>
          <div className="space-y-1.5">
            <AudioFieldLabel htmlFor="typeOfComposition">Type of Composition</AudioFieldLabel>
            <Input id="typeOfComposition" value={form.typeOfComposition} onChange={(e) => setForm({ ...form, typeOfComposition: e.target.value })} />
          </div>
          <div className="space-y-1.5">
            <AudioFieldLabel htmlFor="typeOfPerformance">Type of Performance</AudioFieldLabel>
            <Input id="typeOfPerformance" value={form.typeOfPerformance} onChange={(e) => setForm({ ...form, typeOfPerformance: e.target.value })} />
          </div>
          <div className="space-y-1.5">
            <AudioFieldLabel htmlFor="poet">Poet</AudioFieldLabel>
            <Input id="poet" value={form.poet} onChange={(e) => setForm({ ...form, poet: e.target.value })} />
          </div>
          <div className="space-y-1.5 sm:col-span-2">
            <AudioFieldLabel htmlFor="lyrics">Lyrics</AudioFieldLabel>
            <textarea id="lyrics" className={TEXTAREA_CLASS} value={form.lyrics} onChange={(e) => setForm({ ...form, lyrics: e.target.value })} />
          </div>
        </CardContent>
      </Card>

      <Card className="border-border bg-card shadow-sm shadow-black/5">
        <CardHeader className="border-b border-border pb-4">
          <CardTitle className="text-base font-semibold">Credits</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-5 pt-5 sm:grid-cols-2">
          <div className="space-y-1.5">
            <AudioFieldLabel htmlFor="speaker">Speaker</AudioFieldLabel>
            <Input id="speaker" value={form.speaker} onChange={(e) => setForm({ ...form, speaker: e.target.value })} />
          </div>
          <div className="space-y-1.5">
            <AudioFieldLabel htmlFor="producer">Producer</AudioFieldLabel>
            <Input id="producer" value={form.producer} onChange={(e) => setForm({ ...form, producer: e.target.value })} />
          </div>
          <div className="space-y-1.5">
            <AudioFieldLabel htmlFor="composer">Composer</AudioFieldLabel>
            <Input id="composer" value={form.composer} onChange={(e) => setForm({ ...form, composer: e.target.value })} />
          </div>
          <div className="space-y-1.5">
            <AudioFieldLabel htmlFor="contributors">Contributors</AudioFieldLabel>
            <TagsInput id="contributors" value={form.contributors} onChange={(next) => setForm({ ...form, contributors: next })} placeholder="Name, role…" />
          </div>
        </CardContent>
      </Card>

      <Card className="border-border bg-card shadow-sm shadow-black/5">
        <CardHeader className="border-b border-border pb-4">
          <CardTitle className="text-base font-semibold">Context</CardTitle>
          <CardDescription className="text-xs">Language, recording location, and dates.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-5 pt-5 sm:grid-cols-3">
          <div className="space-y-1.5">
            <AudioFieldLabel htmlFor="language">Language</AudioFieldLabel>
            <Input id="language" value={form.language} onChange={(e) => setForm({ ...form, language: e.target.value })} />
          </div>
          <div className="space-y-1.5">
            <AudioFieldLabel htmlFor="dialect">Dialect</AudioFieldLabel>
            <Input id="dialect" value={form.dialect} onChange={(e) => setForm({ ...form, dialect: e.target.value })} />
          </div>
          <div className="space-y-1.5">
            <AudioFieldLabel htmlFor="audience">Audience</AudioFieldLabel>
            <Input id="audience" value={form.audience} onChange={(e) => setForm({ ...form, audience: e.target.value })} />
          </div>
          <div className="space-y-1.5">
            <AudioFieldLabel htmlFor="recordingVenue">Recording Venue</AudioFieldLabel>
            <Input id="recordingVenue" value={form.recordingVenue} onChange={(e) => setForm({ ...form, recordingVenue: e.target.value })} />
          </div>
          <div className="space-y-1.5">
            <AudioFieldLabel htmlFor="city">City</AudioFieldLabel>
            <Input id="city" value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} />
          </div>
          <div className="space-y-1.5">
            <AudioFieldLabel htmlFor="region">Region</AudioFieldLabel>
            <Input id="region" value={form.region} onChange={(e) => setForm({ ...form, region: e.target.value })} />
          </div>
          <div className="space-y-1.5">
            <AudioFieldLabel htmlFor="dateCreated">Date Created</AudioFieldLabel>
            <Input id="dateCreated" type="date" value={form.dateCreated} onChange={(e) => setForm({ ...form, dateCreated: e.target.value })} />
          </div>
          <div className="space-y-1.5">
            <AudioFieldLabel htmlFor="datePublished">Date Published</AudioFieldLabel>
            <Input id="datePublished" type="date" value={form.datePublished} onChange={(e) => setForm({ ...form, datePublished: e.target.value })} />
          </div>
          <div className="space-y-1.5">
            <AudioFieldLabel htmlFor="dateModified">Date Modified</AudioFieldLabel>
            <Input id="dateModified" type="date" value={form.dateModified} onChange={(e) => setForm({ ...form, dateModified: e.target.value })} />
          </div>
        </CardContent>
      </Card>

      <Card className="border-border bg-card shadow-sm shadow-black/5">
        <CardHeader className="border-b border-border pb-4">
          <CardTitle className="text-base font-semibold">Tags & Keywords</CardTitle>
          <CardDescription className="text-xs">Discovery tags and keywords for researchers.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-5 pt-5 sm:grid-cols-2">
          <div className="space-y-1.5">
            <AudioFieldLabel htmlFor="audioTags" fieldKey="tags">Tags</AudioFieldLabel>
            <TagSuggestInput id="audioTags" value={form.tags} onChange={(next) => setForm({ ...form, tags: next })} />
          </div>
          <div className="space-y-1.5">
            <AudioFieldLabel htmlFor="audioKeywords" fieldKey="keywords">Keywords</AudioFieldLabel>
            <KeywordSuggestInput id="audioKeywords" value={form.keywords} onChange={(next) => setForm({ ...form, keywords: next })} />
          </div>
        </CardContent>
      </Card>

      <Card className="border-border bg-card shadow-sm shadow-black/5">
        <CardHeader className="border-b border-border pb-4">
          <CardTitle className="text-base font-semibold">Archival</CardTitle>
          <CardDescription className="text-xs">Physical copy availability, archive location, and digitization details.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-5 pt-5 sm:grid-cols-2">
          <div className="flex items-center gap-2 sm:col-span-2">
            <input
              id="physicalAvailability"
              type="checkbox"
              checked={Boolean(form.physicalAvailability)}
              onChange={(e) => setForm({ ...form, physicalAvailability: e.target.checked })}
              className="size-4 rounded border-input"
            />
            <Label htmlFor="physicalAvailability" className="cursor-pointer">
              A physical copy is available
            </Label>
            <FieldHelpButton metadata={getAudioFieldMetadata('physicalAvailability')} />
          </div>
          <div className="space-y-1.5">
            <AudioFieldLabel htmlFor="physicalLabel">Physical Label</AudioFieldLabel>
            <Input id="physicalLabel" value={form.physicalLabel} onChange={(e) => setForm({ ...form, physicalLabel: e.target.value })} />
          </div>
          <div className="space-y-1.5">
            <AudioFieldLabel htmlFor="locationArchive">Archive Location</AudioFieldLabel>
            <Input id="locationArchive" value={form.locationArchive} onChange={(e) => setForm({ ...form, locationArchive: e.target.value })} />
          </div>
          <div className="space-y-1.5">
            <AudioFieldLabel htmlFor="degitizedBy">Digitized By</AudioFieldLabel>
            <Input id="degitizedBy" value={form.degitizedBy} onChange={(e) => setForm({ ...form, degitizedBy: e.target.value })} />
          </div>
          <div className="space-y-1.5">
            <AudioFieldLabel htmlFor="degitizationEquipment">Digitization Equipment</AudioFieldLabel>
            <Input id="degitizationEquipment" value={form.degitizationEquipment} onChange={(e) => setForm({ ...form, degitizationEquipment: e.target.value })} />
          </div>
        </CardContent>
      </Card>

      <Card className="border-border bg-card shadow-sm shadow-black/5">
        <CardHeader className="border-b border-border pb-4">
          <CardTitle className="text-base font-semibold">Technical</CardTitle>
          <CardDescription className="text-xs">Channel, bit-rate, sample-rate, etc. — extension and file size auto-fill from the picked file.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-5 pt-5 sm:grid-cols-3">
          <div className="space-y-1.5">
            <AudioFieldLabel htmlFor="audioChannel">Channel</AudioFieldLabel>
            <Input id="audioChannel" value={form.audioChannel} onChange={(e) => setForm({ ...form, audioChannel: e.target.value })} placeholder="Mono, Stereo…" />
          </div>
          <div className="space-y-1.5">
            <AudioFieldLabel htmlFor="fileExtension">File Extension</AudioFieldLabel>
            <Input id="fileExtension" value={form.fileExtension} onChange={(e) => setForm({ ...form, fileExtension: e.target.value })} placeholder="auto-filled from file (wav, mp3…)" />
          </div>
          <div className="space-y-1.5">
            <AudioFieldLabel htmlFor="fileSize">File Size</AudioFieldLabel>
            <Input id="fileSize" value={form.fileSize} onChange={(e) => setForm({ ...form, fileSize: e.target.value })} placeholder="auto-filled from file (e.g. 45.2 MB)" />
          </div>
          <div className="space-y-1.5">
            <AudioFieldLabel htmlFor="bitRate">Bit Rate</AudioFieldLabel>
            <Input id="bitRate" value={form.bitRate} onChange={(e) => setForm({ ...form, bitRate: e.target.value })} placeholder="e.g. 320 kbps" />
          </div>
          <div className="space-y-1.5">
            <AudioFieldLabel htmlFor="bitDepth">Bit Depth</AudioFieldLabel>
            <Input id="bitDepth" value={form.bitDepth} onChange={(e) => setForm({ ...form, bitDepth: e.target.value })} placeholder="e.g. 24-bit" />
          </div>
          <div className="space-y-1.5">
            <AudioFieldLabel htmlFor="sampleRate">Sample Rate</AudioFieldLabel>
            <Input id="sampleRate" value={form.sampleRate} onChange={(e) => setForm({ ...form, sampleRate: e.target.value })} placeholder="e.g. 48 kHz" />
          </div>
          <div className="space-y-1.5">
            <AudioFieldLabel htmlFor="audioQualityOutOf10">Quality (0–10)</AudioFieldLabel>
            <Input id="audioQualityOutOf10" type="number" min="0" max="10" step="1" value={form.audioQualityOutOf10} onChange={(e) => setForm({ ...form, audioQualityOutOf10: e.target.value })} />
          </div>
        </CardContent>
      </Card>

      <Card className="border-border bg-card shadow-sm shadow-black/5">
        <CardHeader className="border-b border-border pb-4">
          <CardTitle className="text-base font-semibold">Storage</CardTitle>
          <CardDescription className="text-xs">
            File metadata fills automatically. Enter source Volume, Directory, External Path, and cloud/archive Auto Path when required.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-5 pt-5 sm:grid-cols-2">
          <div className="space-y-1.5">
            <AudioFieldLabel htmlFor="volumeName">Volume</AudioFieldLabel>
            <Input id="volumeName" value={form.volumeName} onChange={(e) => setForm({ ...form, volumeName: getVolumeNameFromPath(e.target.value) || e.target.value })} placeholder="Volume name or /Volumes/Hard1/…" />
          </div>
          <div className="space-y-1.5">
            <AudioFieldLabel htmlFor="directoryName">Directory</AudioFieldLabel>
            <Input id="directoryName" value={form.directoryName} onChange={(e) => setForm({ ...form, directoryName: e.target.value })} placeholder="Parent folder, e.g. Hassan_Zirak" />
          </div>
          <div className="space-y-1.5">
            <AudioFieldLabel htmlFor="pathInExternal">External Path</AudioFieldLabel>
            <Input id="pathInExternal" value={form.pathInExternal} onChange={(e) => setForm({ ...form, pathInExternal: e.target.value })} placeholder="e.g. F:\\KHI_Audio\\Hassan_Zirak\\track.wav" />
          </div>
          <div className="space-y-1.5">
            <AudioFieldLabel htmlFor="autoPath">Auto Path</AudioFieldLabel>
            <Input id="autoPath" value={form.autoPath} onChange={(e) => setForm({ ...form, autoPath: e.target.value })} placeholder="e.g. https://cloud.khi.org/audio/…" />
          </div>
          <div className="space-y-1.5 sm:col-span-2">
            <AudioFieldLabel htmlFor="audioFileNote">File Note</AudioFieldLabel>
            <textarea id="audioFileNote" className={TEXTAREA_CLASS} value={form.audioFileNote} onChange={(e) => setForm({ ...form, audioFileNote: e.target.value })} />
          </div>
        </CardContent>
      </Card>

      <Card className="border-border bg-card shadow-sm shadow-black/5">
        <CardHeader className="border-b border-border pb-4">
          <CardTitle className="text-base font-semibold">Rights & Provenance</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-5 pt-5 sm:grid-cols-2">
          <div className="space-y-1.5">
            <AudioFieldLabel htmlFor="copyright">Copyright</AudioFieldLabel>
            <Input id="copyright" value={form.copyright} onChange={(e) => setForm({ ...form, copyright: e.target.value })} />
          </div>
          <div className="space-y-1.5">
            <AudioFieldLabel htmlFor="rightOwner">Right Owner</AudioFieldLabel>
            <Input id="rightOwner" value={form.rightOwner} onChange={(e) => setForm({ ...form, rightOwner: e.target.value })} />
          </div>
          <div className="space-y-1.5">
            <AudioFieldLabel htmlFor="dateCopyrighted">Date Copyrighted</AudioFieldLabel>
            <Input id="dateCopyrighted" type="date" value={form.dateCopyrighted} onChange={(e) => setForm({ ...form, dateCopyrighted: e.target.value })} />
          </div>
          <div className="space-y-1.5">
            <AudioFieldLabel htmlFor="availability">Availability</AudioFieldLabel>
            <Input id="availability" value={form.availability} onChange={(e) => setForm({ ...form, availability: e.target.value })} />
          </div>
          <div className="space-y-1.5">
            <AudioFieldLabel htmlFor="licenseType">License Type</AudioFieldLabel>
            <Input id="licenseType" value={form.licenseType} onChange={(e) => setForm({ ...form, licenseType: e.target.value })} />
          </div>
          <div className="space-y-1.5">
            <AudioFieldLabel htmlFor="usageRights">Usage Rights</AudioFieldLabel>
            <Input id="usageRights" value={form.usageRights} onChange={(e) => setForm({ ...form, usageRights: e.target.value })} />
          </div>
          <div className="space-y-1.5">
            <AudioFieldLabel htmlFor="owner">Owner</AudioFieldLabel>
            <Input id="owner" value={form.owner} onChange={(e) => setForm({ ...form, owner: e.target.value })} />
          </div>
          <div className="space-y-1.5">
            <AudioFieldLabel htmlFor="publisher">Publisher</AudioFieldLabel>
            <Input id="publisher" value={form.publisher} onChange={(e) => setForm({ ...form, publisher: e.target.value })} />
          </div>
          <div className="space-y-1.5">
            <AudioFieldLabel htmlFor="provenance">Provenance</AudioFieldLabel>
            <Input id="provenance" value={form.provenance} onChange={(e) => setForm({ ...form, provenance: e.target.value })} />
          </div>
          <div className="space-y-1.5">
            <AudioFieldLabel htmlFor="accrualMethod">Accrual Method</AudioFieldLabel>
            <Input id="accrualMethod" value={form.accrualMethod} onChange={(e) => setForm({ ...form, accrualMethod: e.target.value })} />
          </div>
          <div className="space-y-1.5">
            <AudioFieldLabel htmlFor="lccClassification">LCC Classification</AudioFieldLabel>
            <Input id="lccClassification" value={form.lccClassification} onChange={(e) => setForm({ ...form, lccClassification: e.target.value })} />
          </div>
          <div className="space-y-1.5 sm:col-span-2">
            <AudioFieldLabel htmlFor="archiveLocalNote">Archive Local Note</AudioFieldLabel>
            <textarea id="archiveLocalNote" className={TEXTAREA_CLASS} value={form.archiveLocalNote} onChange={(e) => setForm({ ...form, archiveLocalNote: e.target.value })} />
          </div>
        </CardContent>
      </Card>
    </>
  )
}
