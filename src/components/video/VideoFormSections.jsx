import { Plus } from 'lucide-react'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { FieldHelpButton } from '@/components/ui/field-help'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { TagsInput } from '@/components/ui/tags-input'
import { cn } from '@/lib/utils'
import { getVideoFieldMetadata } from '@/lib/video-fields-metadata'

// Label + help-button row, looking up the description from the video
// metadata. `fieldKey` defaults to `htmlFor` since most names match;
// pass an explicit one for cases like videoTags → tags.
function VideoFieldLabel({ htmlFor, fieldKey, className, children }) {
  return (
    <div className="flex items-center justify-between gap-2">
      <Label htmlFor={htmlFor} className={className}>
        {children}
      </Label>
      <FieldHelpButton metadata={getVideoFieldMetadata(fieldKey || htmlFor)} />
    </div>
  )
}

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

function VideoFormSections({ form, setForm, projectCategories = [] }) {
  return (
    <>
      {/* Titles */}
      <Card className="border-border bg-card shadow-sm shadow-black/5">
        <CardHeader className="border-b border-border pb-4">
          <CardTitle className="text-base font-semibold">Titles</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-5 pt-5 sm:grid-cols-2">
          <div className="space-y-1.5 sm:col-span-2">
            <VideoFieldLabel htmlFor="fileName">File Name</VideoFieldLabel>
            <Input id="fileName" value={form.fileName} onChange={(e) => setForm({ ...form, fileName: e.target.value })} />
          </div>
          <div className="space-y-1.5">
            <VideoFieldLabel htmlFor="originalTitle">Original Title</VideoFieldLabel>
            <Input id="originalTitle" value={form.originalTitle} onChange={(e) => setForm({ ...form, originalTitle: e.target.value })} />
          </div>
          <div className="space-y-1.5">
            <VideoFieldLabel htmlFor="alternativeTitle">Alternative Title</VideoFieldLabel>
            <Input id="alternativeTitle" value={form.alternativeTitle} onChange={(e) => setForm({ ...form, alternativeTitle: e.target.value })} />
          </div>
          <div className="space-y-1.5">
            <VideoFieldLabel htmlFor="titleInCentralKurdish">Central Kurdish Title</VideoFieldLabel>
            <Input id="titleInCentralKurdish" value={form.titleInCentralKurdish} onChange={(e) => setForm({ ...form, titleInCentralKurdish: e.target.value })} dir="rtl" />
          </div>
          <div className="space-y-1.5">
            <VideoFieldLabel htmlFor="romanizedTitle">Romanized Title</VideoFieldLabel>
            <Input id="romanizedTitle" value={form.romanizedTitle} onChange={(e) => setForm({ ...form, romanizedTitle: e.target.value })} />
          </div>
        </CardContent>
      </Card>

      {/* Description */}
      <Card className="border-border bg-card shadow-sm shadow-black/5">
        <CardHeader className="border-b border-border pb-4">
          <CardTitle className="text-base font-semibold">Description</CardTitle>
        </CardHeader>
        <CardContent className="space-y-5 pt-5">
          <div className="space-y-1.5">
            <VideoFieldLabel htmlFor="description">Description</VideoFieldLabel>
            <textarea id="description" className={TEXTAREA_CLASS} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
          </div>
          <div className="grid gap-5 sm:grid-cols-2">
            <div className="space-y-1.5">
              <VideoFieldLabel htmlFor="event">Event</VideoFieldLabel>
              <Input id="event" value={form.event} onChange={(e) => setForm({ ...form, event: e.target.value })} />
            </div>
            <div className="space-y-1.5">
              <VideoFieldLabel htmlFor="location">Location</VideoFieldLabel>
              <Input id="location" value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} />
            </div>
          </div>
          <div className="grid gap-5 sm:grid-cols-2">
            <div className="space-y-1.5">
              <VideoFieldLabel htmlFor="subject">Subject</VideoFieldLabel>
              <TagsInput id="subject" value={form.subject} onChange={(next) => setForm({ ...form, subject: next })} placeholder="History, music, oral memory…" />
            </div>
            <div className="space-y-1.5">
              <div className="flex items-center justify-between gap-2">
                <Label>
                  Genres{' '}
                  <span className="font-normal text-muted-foreground">
                    (pick from this project's categories)
                  </span>
                </Label>
                <FieldHelpButton metadata={getVideoFieldMetadata('genre')} />
              </div>
              <GenreChips
                categories={projectCategories}
                value={form.genre}
                onChange={(next) => setForm({ ...form, genre: next })}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Video meta */}
      <Card className="border-border bg-card shadow-sm shadow-black/5">
        <CardHeader className="border-b border-border pb-4">
          <CardTitle className="text-base font-semibold">Subject & Context</CardTitle>
          <CardDescription className="text-xs">People shown, colors, where it was used.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-5 pt-5">
          <div className="space-y-1.5">
            <VideoFieldLabel htmlFor="personShownInVideo">People shown in the video</VideoFieldLabel>
            <Input id="personShownInVideo" value={form.personShownInVideo} onChange={(e) => setForm({ ...form, personShownInVideo: e.target.value })} />
          </div>
          <div className="grid gap-5 sm:grid-cols-2">
            <div className="space-y-1.5">
              <VideoFieldLabel htmlFor="colorOfVideo">Color of video</VideoFieldLabel>
              <TagsInput id="colorOfVideo" value={form.colorOfVideo} onChange={(next) => setForm({ ...form, colorOfVideo: next })} placeholder="black & white, color, sepia…" />
            </div>
            <div className="space-y-1.5">
              <VideoFieldLabel htmlFor="whereThisVideoUsed">Where this video was used</VideoFieldLabel>
              <TagsInput id="whereThisVideoUsed" value={form.whereThisVideoUsed} onChange={(next) => setForm({ ...form, whereThisVideoUsed: next })} placeholder="documentary, news, broadcast…" />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Credits */}
      <Card className="border-border bg-card shadow-sm shadow-black/5">
        <CardHeader className="border-b border-border pb-4">
          <CardTitle className="text-base font-semibold">Credits</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-5 pt-5 sm:grid-cols-2">
          <div className="space-y-1.5">
            <VideoFieldLabel htmlFor="creatorArtistDirector">Creator / Artist / Director</VideoFieldLabel>
            <Input id="creatorArtistDirector" value={form.creatorArtistDirector} onChange={(e) => setForm({ ...form, creatorArtistDirector: e.target.value })} />
          </div>
          <div className="space-y-1.5">
            <VideoFieldLabel htmlFor="producer">Producer</VideoFieldLabel>
            <Input id="producer" value={form.producer} onChange={(e) => setForm({ ...form, producer: e.target.value })} />
          </div>
          <div className="space-y-1.5">
            <VideoFieldLabel htmlFor="contributor">Contributor</VideoFieldLabel>
            <Input id="contributor" value={form.contributor} onChange={(e) => setForm({ ...form, contributor: e.target.value })} />
          </div>
          <div className="space-y-1.5">
            <VideoFieldLabel htmlFor="audience">Audience</VideoFieldLabel>
            <Input id="audience" value={form.audience} onChange={(e) => setForm({ ...form, audience: e.target.value })} />
          </div>
        </CardContent>
      </Card>

      {/* Language */}
      <Card className="border-border bg-card shadow-sm shadow-black/5">
        <CardHeader className="border-b border-border pb-4">
          <CardTitle className="text-base font-semibold">Language</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-5 pt-5 sm:grid-cols-3">
          <div className="space-y-1.5">
            <VideoFieldLabel htmlFor="language">Language</VideoFieldLabel>
            <Input id="language" value={form.language} onChange={(e) => setForm({ ...form, language: e.target.value })} />
          </div>
          <div className="space-y-1.5">
            <VideoFieldLabel htmlFor="dialect">Dialect</VideoFieldLabel>
            <Input id="dialect" value={form.dialect} onChange={(e) => setForm({ ...form, dialect: e.target.value })} />
          </div>
          <div className="space-y-1.5">
            <VideoFieldLabel htmlFor="subtitle">Subtitle</VideoFieldLabel>
            <Input id="subtitle" value={form.subtitle} onChange={(e) => setForm({ ...form, subtitle: e.target.value })} />
          </div>
        </CardContent>
      </Card>

      {/* Technical */}
      <Card className="border-border bg-card shadow-sm shadow-black/5">
        <CardHeader className="border-b border-border pb-4">
          <CardTitle className="text-base font-semibold">Technical</CardTitle>
          <CardDescription className="text-xs">Resolution, codec, bit-rate, etc. — extension and file size auto-fill from the picked file.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-5 pt-5 sm:grid-cols-3">
          <div className="space-y-1.5">
            <VideoFieldLabel htmlFor="orientation">Orientation</VideoFieldLabel>
            <Input id="orientation" value={form.orientation} onChange={(e) => setForm({ ...form, orientation: e.target.value })} placeholder="landscape, portrait…" />
          </div>
          <div className="space-y-1.5">
            <VideoFieldLabel htmlFor="dimension">Dimension</VideoFieldLabel>
            <Input id="dimension" value={form.dimension} onChange={(e) => setForm({ ...form, dimension: e.target.value })} placeholder="1920×1080" />
          </div>
          <div className="space-y-1.5">
            <VideoFieldLabel htmlFor="resolution">Resolution</VideoFieldLabel>
            <Input id="resolution" value={form.resolution} onChange={(e) => setForm({ ...form, resolution: e.target.value })} placeholder="HD, 4K…" />
          </div>
          <div className="space-y-1.5">
            <VideoFieldLabel htmlFor="duration">Duration</VideoFieldLabel>
            <Input id="duration" value={form.duration} onChange={(e) => setForm({ ...form, duration: e.target.value })} placeholder="01:23:45" />
          </div>
          <div className="space-y-1.5">
            <VideoFieldLabel htmlFor="frameRate">Frame Rate</VideoFieldLabel>
            <Input id="frameRate" value={form.frameRate} onChange={(e) => setForm({ ...form, frameRate: e.target.value })} placeholder="24 fps, 60 fps…" />
          </div>
          <div className="space-y-1.5">
            <VideoFieldLabel htmlFor="bitDepth">Bit Depth</VideoFieldLabel>
            <Input id="bitDepth" value={form.bitDepth} onChange={(e) => setForm({ ...form, bitDepth: e.target.value })} placeholder="8-bit, 10-bit…" />
          </div>
          <div className="space-y-1.5">
            <VideoFieldLabel htmlFor="overallBitRate">Overall Bit Rate</VideoFieldLabel>
            <Input id="overallBitRate" value={form.overallBitRate} onChange={(e) => setForm({ ...form, overallBitRate: e.target.value })} placeholder="20 Mb/s" />
          </div>
          <div className="space-y-1.5">
            <VideoFieldLabel htmlFor="videoCodec">Video Codec</VideoFieldLabel>
            <Input id="videoCodec" value={form.videoCodec} onChange={(e) => setForm({ ...form, videoCodec: e.target.value })} placeholder="H.264, ProRes…" />
          </div>
          <div className="space-y-1.5">
            <VideoFieldLabel htmlFor="audioCodec">Audio Codec</VideoFieldLabel>
            <Input id="audioCodec" value={form.audioCodec} onChange={(e) => setForm({ ...form, audioCodec: e.target.value })} placeholder="AAC, PCM…" />
          </div>
          <div className="space-y-1.5">
            <VideoFieldLabel htmlFor="audioChannels">Audio Channels</VideoFieldLabel>
            <Input id="audioChannels" value={form.audioChannels} onChange={(e) => setForm({ ...form, audioChannels: e.target.value })} placeholder="Stereo, 5.1…" />
          </div>
          <div className="space-y-1.5">
            <VideoFieldLabel htmlFor="extension">Extension</VideoFieldLabel>
            <Input id="extension" value={form.extension} onChange={(e) => setForm({ ...form, extension: e.target.value })} placeholder="auto-filled from file (mp4, mov…)" />
          </div>
          <div className="space-y-1.5">
            <VideoFieldLabel htmlFor="fileSize">File Size</VideoFieldLabel>
            <Input id="fileSize" value={form.fileSize} onChange={(e) => setForm({ ...form, fileSize: e.target.value })} placeholder="auto-filled from file (e.g. 1.2 GB)" />
          </div>
        </CardContent>
      </Card>

      {/* Tags */}
      <Card className="border-border bg-card shadow-sm shadow-black/5">
        <CardHeader className="border-b border-border pb-4">
          <CardTitle className="text-base font-semibold">Tags & Keywords</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-5 pt-5 sm:grid-cols-2">
          <div className="space-y-1.5">
            <VideoFieldLabel htmlFor="videoTags" fieldKey="videoTags">Tags</VideoFieldLabel>
            <TagsInput id="videoTags" value={form.tags} onChange={(next) => setForm({ ...form, tags: next })} placeholder="archival, broadcast…" />
          </div>
          <div className="space-y-1.5">
            <VideoFieldLabel htmlFor="videoKeywords" fieldKey="videoKeywords">Keywords</VideoFieldLabel>
            <TagsInput id="videoKeywords" value={form.keywords} onChange={(next) => setForm({ ...form, keywords: next })} placeholder="kurdistan, 1962…" />
          </div>
        </CardContent>
      </Card>

      {/* Dates */}
      <Card className="border-border bg-card shadow-sm shadow-black/5">
        <CardHeader className="border-b border-border pb-4">
          <CardTitle className="text-base font-semibold">Dates</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-5 pt-5 sm:grid-cols-3">
          <div className="space-y-1.5">
            <VideoFieldLabel htmlFor="dateCreated">Created</VideoFieldLabel>
            <Input id="dateCreated" type="date" value={form.dateCreated} onChange={(e) => setForm({ ...form, dateCreated: e.target.value })} />
          </div>
          <div className="space-y-1.5">
            <VideoFieldLabel htmlFor="datePublished">Published</VideoFieldLabel>
            <Input id="datePublished" type="date" value={form.datePublished} onChange={(e) => setForm({ ...form, datePublished: e.target.value })} />
          </div>
          <div className="space-y-1.5">
            <VideoFieldLabel htmlFor="dateModified">Modified</VideoFieldLabel>
            <Input id="dateModified" type="date" value={form.dateModified} onChange={(e) => setForm({ ...form, dateModified: e.target.value })} />
          </div>
        </CardContent>
      </Card>

      {/* Storage */}
      <Card className="border-border bg-card shadow-sm shadow-black/5">
        <CardHeader className="border-b border-border pb-4">
          <CardTitle className="text-base font-semibold">Storage</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-5 pt-5 sm:grid-cols-2">
          <div className="space-y-1.5">
            <VideoFieldLabel htmlFor="volumeName">Volume</VideoFieldLabel>
            <Input id="volumeName" value={form.volumeName} onChange={(e) => setForm({ ...form, volumeName: e.target.value })} placeholder="auto-filled from folder" />
          </div>
          <div className="space-y-1.5">
            <VideoFieldLabel htmlFor="directory">Directory</VideoFieldLabel>
            <Input id="directory" value={form.directory} onChange={(e) => setForm({ ...form, directory: e.target.value })} placeholder="auto-filled from folder" />
          </div>
          <div className="space-y-1.5">
            <VideoFieldLabel htmlFor="pathInExternalVolume">Path in External Volume</VideoFieldLabel>
            <Input id="pathInExternalVolume" value={form.pathInExternalVolume} onChange={(e) => setForm({ ...form, pathInExternalVolume: e.target.value })} placeholder="auto-filled from file" />
          </div>
          <div className="space-y-1.5">
            <VideoFieldLabel htmlFor="autoPath">Auto Path</VideoFieldLabel>
            <Input id="autoPath" value={form.autoPath} onChange={(e) => setForm({ ...form, autoPath: e.target.value })} placeholder="auto-filled from file" />
          </div>
        </CardContent>
      </Card>

      {/* Archival */}
      <Card className="border-border bg-card shadow-sm shadow-black/5">
        <CardHeader className="border-b border-border pb-4">
          <CardTitle className="text-base font-semibold">Archival</CardTitle>
        </CardHeader>
        <CardContent className="space-y-5 pt-5">
          <div className="grid gap-5 sm:grid-cols-2">
            <div className="space-y-1.5">
              <VideoFieldLabel htmlFor="videoStatus">Video Status</VideoFieldLabel>
              <Input id="videoStatus" value={form.videoStatus} onChange={(e) => setForm({ ...form, videoStatus: e.target.value })} />
            </div>
            <div className="space-y-1.5">
              <VideoFieldLabel htmlFor="archiveCataloging">Archive Cataloging</VideoFieldLabel>
              <Input id="archiveCataloging" value={form.archiveCataloging} onChange={(e) => setForm({ ...form, archiveCataloging: e.target.value })} />
            </div>
            <div className="space-y-1.5">
              <VideoFieldLabel htmlFor="provenance">Provenance</VideoFieldLabel>
              <Input id="provenance" value={form.provenance} onChange={(e) => setForm({ ...form, provenance: e.target.value })} />
            </div>
            <div className="space-y-1.5">
              <VideoFieldLabel htmlFor="accrualMethod">Accrual Method</VideoFieldLabel>
              <Input id="accrualMethod" value={form.accrualMethod} onChange={(e) => setForm({ ...form, accrualMethod: e.target.value })} />
            </div>
          </div>
          <div className="flex items-center gap-2">
            <input
              id="physicalAvailability"
              type="checkbox"
              checked={Boolean(form.physicalAvailability)}
              onChange={(e) => setForm({ ...form, physicalAvailability: e.target.checked })}
              className="size-4 rounded border-input"
            />
            <Label htmlFor="physicalAvailability" className="cursor-pointer">A physical copy is available</Label>
            <FieldHelpButton metadata={getVideoFieldMetadata('physicalAvailability')} />
          </div>
          <div className="grid gap-5 sm:grid-cols-2">
            <div className="space-y-1.5">
              <VideoFieldLabel htmlFor="physicalLabel">Physical Label</VideoFieldLabel>
              <Input id="physicalLabel" value={form.physicalLabel} onChange={(e) => setForm({ ...form, physicalLabel: e.target.value })} />
            </div>
            <div className="space-y-1.5">
              <VideoFieldLabel htmlFor="locationInArchiveRoom">Location in Archive Room</VideoFieldLabel>
              <Input id="locationInArchiveRoom" value={form.locationInArchiveRoom} onChange={(e) => setForm({ ...form, locationInArchiveRoom: e.target.value })} />
            </div>
            <div className="space-y-1.5">
              <VideoFieldLabel htmlFor="lccClassification">LCC Classification</VideoFieldLabel>
              <Input id="lccClassification" value={form.lccClassification} onChange={(e) => setForm({ ...form, lccClassification: e.target.value })} />
            </div>
          </div>
          <div className="space-y-1.5">
            <VideoFieldLabel htmlFor="note">Note</VideoFieldLabel>
            <textarea id="note" className={cn(TEXTAREA_CLASS, 'min-h-[72px]')} value={form.note} onChange={(e) => setForm({ ...form, note: e.target.value })} />
          </div>
        </CardContent>
      </Card>

      {/* Rights & Provenance */}
      <Card className="border-border bg-card shadow-sm shadow-black/5">
        <CardHeader className="border-b border-border pb-4">
          <CardTitle className="text-base font-semibold">Rights & Provenance</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-5 pt-5 sm:grid-cols-2">
          <div className="space-y-1.5">
            <VideoFieldLabel htmlFor="copyright">Copyright</VideoFieldLabel>
            <Input id="copyright" value={form.copyright} onChange={(e) => setForm({ ...form, copyright: e.target.value })} />
          </div>
          <div className="space-y-1.5">
            <VideoFieldLabel htmlFor="rightOwner">Right Owner</VideoFieldLabel>
            <Input id="rightOwner" value={form.rightOwner} onChange={(e) => setForm({ ...form, rightOwner: e.target.value })} />
          </div>
          <div className="space-y-1.5">
            <VideoFieldLabel htmlFor="dateCopyrighted">Date Copyrighted</VideoFieldLabel>
            <Input id="dateCopyrighted" type="date" value={form.dateCopyrighted} onChange={(e) => setForm({ ...form, dateCopyrighted: e.target.value })} />
          </div>
          <div className="space-y-1.5">
            <VideoFieldLabel htmlFor="availability">Availability</VideoFieldLabel>
            <Input id="availability" value={form.availability} onChange={(e) => setForm({ ...form, availability: e.target.value })} />
          </div>
          <div className="space-y-1.5">
            <VideoFieldLabel htmlFor="licenseType">License Type</VideoFieldLabel>
            <Input id="licenseType" value={form.licenseType} onChange={(e) => setForm({ ...form, licenseType: e.target.value })} />
          </div>
          <div className="space-y-1.5">
            <VideoFieldLabel htmlFor="usageRights">Usage Rights</VideoFieldLabel>
            <Input id="usageRights" value={form.usageRights} onChange={(e) => setForm({ ...form, usageRights: e.target.value })} />
          </div>
          <div className="space-y-1.5">
            <VideoFieldLabel htmlFor="owner">Owner</VideoFieldLabel>
            <Input id="owner" value={form.owner} onChange={(e) => setForm({ ...form, owner: e.target.value })} />
          </div>
          <div className="space-y-1.5">
            <VideoFieldLabel htmlFor="publisher">Publisher</VideoFieldLabel>
            <Input id="publisher" value={form.publisher} onChange={(e) => setForm({ ...form, publisher: e.target.value })} />
          </div>
        </CardContent>
      </Card>
    </>
  )
}

export { VideoFormSections }
