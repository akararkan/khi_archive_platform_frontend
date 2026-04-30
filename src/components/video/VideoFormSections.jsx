import { Plus } from 'lucide-react'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { TagsInput } from '@/components/ui/tags-input'
import { cn } from '@/lib/utils'

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
            <Label htmlFor="fileName">File Name</Label>
            <Input id="fileName" value={form.fileName} onChange={(e) => setForm({ ...form, fileName: e.target.value })} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="originalTitle">Original Title</Label>
            <Input id="originalTitle" value={form.originalTitle} onChange={(e) => setForm({ ...form, originalTitle: e.target.value })} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="alternativeTitle">Alternative Title</Label>
            <Input id="alternativeTitle" value={form.alternativeTitle} onChange={(e) => setForm({ ...form, alternativeTitle: e.target.value })} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="titleInCentralKurdish">Central Kurdish Title</Label>
            <Input id="titleInCentralKurdish" value={form.titleInCentralKurdish} onChange={(e) => setForm({ ...form, titleInCentralKurdish: e.target.value })} dir="rtl" />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="romanizedTitle">Romanized Title</Label>
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
            <Label htmlFor="description">Description</Label>
            <textarea id="description" className={TEXTAREA_CLASS} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
          </div>
          <div className="grid gap-5 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="event">Event</Label>
              <Input id="event" value={form.event} onChange={(e) => setForm({ ...form, event: e.target.value })} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="location">Location</Label>
              <Input id="location" value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} />
            </div>
          </div>
          <div className="grid gap-5 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="subject">Subject</Label>
              <TagsInput id="subject" value={form.subject} onChange={(next) => setForm({ ...form, subject: next })} placeholder="History, music, oral memory…" />
            </div>
            <div className="space-y-1.5">
              <Label>
                Genres{' '}
                <span className="font-normal text-muted-foreground">
                  (pick from this project's categories)
                </span>
              </Label>
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
            <Label htmlFor="personShownInVideo">People shown in the video</Label>
            <Input id="personShownInVideo" value={form.personShownInVideo} onChange={(e) => setForm({ ...form, personShownInVideo: e.target.value })} />
          </div>
          <div className="grid gap-5 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="colorOfVideo">Color of video</Label>
              <TagsInput id="colorOfVideo" value={form.colorOfVideo} onChange={(next) => setForm({ ...form, colorOfVideo: next })} placeholder="black & white, color, sepia…" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="whereThisVideoUsed">Where this video was used</Label>
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
            <Label htmlFor="creatorArtistDirector">Creator / Artist / Director</Label>
            <Input id="creatorArtistDirector" value={form.creatorArtistDirector} onChange={(e) => setForm({ ...form, creatorArtistDirector: e.target.value })} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="producer">Producer</Label>
            <Input id="producer" value={form.producer} onChange={(e) => setForm({ ...form, producer: e.target.value })} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="contributor">Contributor</Label>
            <Input id="contributor" value={form.contributor} onChange={(e) => setForm({ ...form, contributor: e.target.value })} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="audience">Audience</Label>
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
            <Label htmlFor="language">Language</Label>
            <Input id="language" value={form.language} onChange={(e) => setForm({ ...form, language: e.target.value })} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="dialect">Dialect</Label>
            <Input id="dialect" value={form.dialect} onChange={(e) => setForm({ ...form, dialect: e.target.value })} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="subtitle">Subtitle</Label>
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
            <Label htmlFor="orientation">Orientation</Label>
            <Input id="orientation" value={form.orientation} onChange={(e) => setForm({ ...form, orientation: e.target.value })} placeholder="landscape, portrait…" />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="dimension">Dimension</Label>
            <Input id="dimension" value={form.dimension} onChange={(e) => setForm({ ...form, dimension: e.target.value })} placeholder="1920×1080" />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="resolution">Resolution</Label>
            <Input id="resolution" value={form.resolution} onChange={(e) => setForm({ ...form, resolution: e.target.value })} placeholder="HD, 4K…" />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="duration">Duration</Label>
            <Input id="duration" value={form.duration} onChange={(e) => setForm({ ...form, duration: e.target.value })} placeholder="01:23:45" />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="frameRate">Frame Rate</Label>
            <Input id="frameRate" value={form.frameRate} onChange={(e) => setForm({ ...form, frameRate: e.target.value })} placeholder="24 fps, 60 fps…" />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="bitDepth">Bit Depth</Label>
            <Input id="bitDepth" value={form.bitDepth} onChange={(e) => setForm({ ...form, bitDepth: e.target.value })} placeholder="8-bit, 10-bit…" />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="overallBitRate">Overall Bit Rate</Label>
            <Input id="overallBitRate" value={form.overallBitRate} onChange={(e) => setForm({ ...form, overallBitRate: e.target.value })} placeholder="20 Mb/s" />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="videoCodec">Video Codec</Label>
            <Input id="videoCodec" value={form.videoCodec} onChange={(e) => setForm({ ...form, videoCodec: e.target.value })} placeholder="H.264, ProRes…" />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="audioCodec">Audio Codec</Label>
            <Input id="audioCodec" value={form.audioCodec} onChange={(e) => setForm({ ...form, audioCodec: e.target.value })} placeholder="AAC, PCM…" />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="audioChannels">Audio Channels</Label>
            <Input id="audioChannels" value={form.audioChannels} onChange={(e) => setForm({ ...form, audioChannels: e.target.value })} placeholder="Stereo, 5.1…" />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="extension">Extension</Label>
            <Input id="extension" value={form.extension} onChange={(e) => setForm({ ...form, extension: e.target.value })} placeholder="auto-filled from file (mp4, mov…)" />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="fileSize">File Size</Label>
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
            <Label htmlFor="videoTags">Tags</Label>
            <TagsInput id="videoTags" value={form.tags} onChange={(next) => setForm({ ...form, tags: next })} placeholder="archival, broadcast…" />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="videoKeywords">Keywords</Label>
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
            <Label htmlFor="dateCreated">Created</Label>
            <Input id="dateCreated" type="date" value={form.dateCreated} onChange={(e) => setForm({ ...form, dateCreated: e.target.value })} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="datePublished">Published</Label>
            <Input id="datePublished" type="date" value={form.datePublished} onChange={(e) => setForm({ ...form, datePublished: e.target.value })} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="dateModified">Modified</Label>
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
            <Label htmlFor="volumeName">Volume</Label>
            <Input id="volumeName" value={form.volumeName} onChange={(e) => setForm({ ...form, volumeName: e.target.value })} placeholder="auto-filled from folder" />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="directory">Directory</Label>
            <Input id="directory" value={form.directory} onChange={(e) => setForm({ ...form, directory: e.target.value })} placeholder="auto-filled from folder" />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="pathInExternalVolume">Path in External Volume</Label>
            <Input id="pathInExternalVolume" value={form.pathInExternalVolume} onChange={(e) => setForm({ ...form, pathInExternalVolume: e.target.value })} placeholder="auto-filled from file" />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="autoPath">Auto Path</Label>
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
              <Label htmlFor="videoStatus">Video Status</Label>
              <Input id="videoStatus" value={form.videoStatus} onChange={(e) => setForm({ ...form, videoStatus: e.target.value })} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="archiveCataloging">Archive Cataloging</Label>
              <Input id="archiveCataloging" value={form.archiveCataloging} onChange={(e) => setForm({ ...form, archiveCataloging: e.target.value })} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="provenance">Provenance</Label>
              <Input id="provenance" value={form.provenance} onChange={(e) => setForm({ ...form, provenance: e.target.value })} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="accrualMethod">Accrual Method</Label>
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
          </div>
          <div className="grid gap-5 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="physicalLabel">Physical Label</Label>
              <Input id="physicalLabel" value={form.physicalLabel} onChange={(e) => setForm({ ...form, physicalLabel: e.target.value })} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="locationInArchiveRoom">Location in Archive Room</Label>
              <Input id="locationInArchiveRoom" value={form.locationInArchiveRoom} onChange={(e) => setForm({ ...form, locationInArchiveRoom: e.target.value })} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="lccClassification">LCC Classification</Label>
              <Input id="lccClassification" value={form.lccClassification} onChange={(e) => setForm({ ...form, lccClassification: e.target.value })} />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="note">Note</Label>
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
            <Label htmlFor="copyright">Copyright</Label>
            <Input id="copyright" value={form.copyright} onChange={(e) => setForm({ ...form, copyright: e.target.value })} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="rightOwner">Right Owner</Label>
            <Input id="rightOwner" value={form.rightOwner} onChange={(e) => setForm({ ...form, rightOwner: e.target.value })} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="dateCopyrighted">Date Copyrighted</Label>
            <Input id="dateCopyrighted" type="date" value={form.dateCopyrighted} onChange={(e) => setForm({ ...form, dateCopyrighted: e.target.value })} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="availability">Availability</Label>
            <Input id="availability" value={form.availability} onChange={(e) => setForm({ ...form, availability: e.target.value })} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="licenseType">License Type</Label>
            <Input id="licenseType" value={form.licenseType} onChange={(e) => setForm({ ...form, licenseType: e.target.value })} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="usageRights">Usage Rights</Label>
            <Input id="usageRights" value={form.usageRights} onChange={(e) => setForm({ ...form, usageRights: e.target.value })} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="owner">Owner</Label>
            <Input id="owner" value={form.owner} onChange={(e) => setForm({ ...form, owner: e.target.value })} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="publisher">Publisher</Label>
            <Input id="publisher" value={form.publisher} onChange={(e) => setForm({ ...form, publisher: e.target.value })} />
          </div>
        </CardContent>
      </Card>
    </>
  )
}

export { VideoFormSections }
