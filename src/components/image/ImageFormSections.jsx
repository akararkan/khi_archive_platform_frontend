import { Plus } from 'lucide-react'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { FieldHelpButton } from '@/components/ui/field-help'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { TagsInput } from '@/components/ui/tags-input'
import { cn } from '@/lib/utils'
import { getImageFieldMetadata } from '@/lib/image-fields-metadata'

// Label + help-button row. htmlFor here is prefixed (img-x); the
// `fieldKey` arg defaults to stripping the `img-` prefix so the
// metadata getter receives the clean field name.
function ImageFieldLabel({ htmlFor, fieldKey, className, children }) {
  const key = fieldKey || (htmlFor ? htmlFor.replace(/^img-/, '') : null)
  return (
    <div className="flex items-center justify-between gap-2">
      <Label htmlFor={htmlFor} className={className}>
        {children}
      </Label>
      <FieldHelpButton metadata={getImageFieldMetadata(key)} />
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

function ImageFormSections({ form, setForm, projectCategories = [] }) {
  return (
    <>
      {/* Titles */}
      <Card className="border-border bg-card shadow-sm shadow-black/5">
        <CardHeader className="border-b border-border pb-4">
          <CardTitle className="text-base font-semibold">Titles</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-5 pt-5 sm:grid-cols-2">
          <div className="space-y-1.5 sm:col-span-2">
            <ImageFieldLabel htmlFor="img-fileName">File Name</ImageFieldLabel>
            <Input id="img-fileName" value={form.fileName} onChange={(e) => setForm({ ...form, fileName: e.target.value })} />
          </div>
          <div className="space-y-1.5">
            <ImageFieldLabel htmlFor="img-originalTitle">Original Title</ImageFieldLabel>
            <Input id="img-originalTitle" value={form.originalTitle} onChange={(e) => setForm({ ...form, originalTitle: e.target.value })} />
          </div>
          <div className="space-y-1.5">
            <ImageFieldLabel htmlFor="img-alternativeTitle">Alternative Title</ImageFieldLabel>
            <Input id="img-alternativeTitle" value={form.alternativeTitle} onChange={(e) => setForm({ ...form, alternativeTitle: e.target.value })} />
          </div>
          <div className="space-y-1.5">
            <ImageFieldLabel htmlFor="img-titleInCentralKurdish">Central Kurdish Title</ImageFieldLabel>
            <Input id="img-titleInCentralKurdish" value={form.titleInCentralKurdish} onChange={(e) => setForm({ ...form, titleInCentralKurdish: e.target.value })} dir="rtl" />
          </div>
          <div className="space-y-1.5">
            <ImageFieldLabel htmlFor="img-romanizedTitle">Romanized Title</ImageFieldLabel>
            <Input id="img-romanizedTitle" value={form.romanizedTitle} onChange={(e) => setForm({ ...form, romanizedTitle: e.target.value })} />
          </div>
        </CardContent>
      </Card>

      {/* Description & Classification */}
      <Card className="border-border bg-card shadow-sm shadow-black/5">
        <CardHeader className="border-b border-border pb-4">
          <CardTitle className="text-base font-semibold">Description</CardTitle>
        </CardHeader>
        <CardContent className="space-y-5 pt-5">
          <div className="space-y-1.5">
            <ImageFieldLabel htmlFor="img-description">Description</ImageFieldLabel>
            <textarea id="img-description" className={TEXTAREA_CLASS} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
          </div>
          <div className="grid gap-5 sm:grid-cols-2">
            <div className="space-y-1.5">
              <ImageFieldLabel htmlFor="img-event">Event</ImageFieldLabel>
              <Input id="img-event" value={form.event} onChange={(e) => setForm({ ...form, event: e.target.value })} />
            </div>
            <div className="space-y-1.5">
              <ImageFieldLabel htmlFor="img-location">Location</ImageFieldLabel>
              <Input id="img-location" value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} />
            </div>
          </div>
          <div className="grid gap-5 sm:grid-cols-2">
            <div className="space-y-1.5">
              <ImageFieldLabel htmlFor="img-subject">Subject</ImageFieldLabel>
              <TagsInput id="img-subject" value={form.subject} onChange={(next) => setForm({ ...form, subject: next })} placeholder="History, portrait, landscape…" />
            </div>
            <div className="space-y-1.5">
              <ImageFieldLabel htmlFor="img-form">Form</ImageFieldLabel>
              <Input id="img-form" value={form.form} onChange={(e) => setForm({ ...form, form: e.target.value })} placeholder="Photograph, painting, drawing…" />
            </div>
            <div className="space-y-1.5 sm:col-span-2">
              <div className="flex items-center justify-between gap-2">
                <Label>
                  Genres{' '}
                  <span className="font-normal text-muted-foreground">
                    (pick from this project's categories)
                  </span>
                </Label>
                <FieldHelpButton metadata={getImageFieldMetadata('genre')} />
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

      {/* Image meta */}
      <Card className="border-border bg-card shadow-sm shadow-black/5">
        <CardHeader className="border-b border-border pb-4">
          <CardTitle className="text-base font-semibold">Subject & Context</CardTitle>
          <CardDescription className="text-xs">People shown, color, where it was used.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-5 pt-5">
          <div className="space-y-1.5">
            <ImageFieldLabel htmlFor="img-personShownInImage">People shown in the image</ImageFieldLabel>
            <Input id="img-personShownInImage" value={form.personShownInImage} onChange={(e) => setForm({ ...form, personShownInImage: e.target.value })} />
          </div>
          <div className="grid gap-5 sm:grid-cols-2">
            <div className="space-y-1.5">
              <ImageFieldLabel htmlFor="img-colorOfImage">Color</ImageFieldLabel>
              <TagsInput id="img-colorOfImage" value={form.colorOfImage} onChange={(next) => setForm({ ...form, colorOfImage: next })} placeholder="black & white, color, sepia…" />
            </div>
            <div className="space-y-1.5">
              <ImageFieldLabel htmlFor="img-whereThisImageUsed">Where this image was used</ImageFieldLabel>
              <TagsInput id="img-whereThisImageUsed" value={form.whereThisImageUsed} onChange={(next) => setForm({ ...form, whereThisImageUsed: next })} placeholder="exhibition, book, magazine…" />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Equipment */}
      <Card className="border-border bg-card shadow-sm shadow-black/5">
        <CardHeader className="border-b border-border pb-4">
          <CardTitle className="text-base font-semibold">Equipment</CardTitle>
          <CardDescription className="text-xs">Camera body, lens, and manufacturer (optional).</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-5 pt-5 sm:grid-cols-3">
          <div className="space-y-1.5">
            <ImageFieldLabel htmlFor="img-manufacturer">Manufacturer</ImageFieldLabel>
            <Input id="img-manufacturer" value={form.manufacturer} onChange={(e) => setForm({ ...form, manufacturer: e.target.value })} placeholder="Canon, Nikon, Leica…" />
          </div>
          <div className="space-y-1.5">
            <ImageFieldLabel htmlFor="img-model">Model</ImageFieldLabel>
            <Input id="img-model" value={form.model} onChange={(e) => setForm({ ...form, model: e.target.value })} placeholder="EOS R5, D850…" />
          </div>
          <div className="space-y-1.5">
            <ImageFieldLabel htmlFor="img-lens">Lens</ImageFieldLabel>
            <Input id="img-lens" value={form.lens} onChange={(e) => setForm({ ...form, lens: e.target.value })} placeholder="50mm f/1.4…" />
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
            <ImageFieldLabel htmlFor="img-creatorArtistPhotographer">Creator / Artist / Photographer</ImageFieldLabel>
            <Input id="img-creatorArtistPhotographer" value={form.creatorArtistPhotographer} onChange={(e) => setForm({ ...form, creatorArtistPhotographer: e.target.value })} />
          </div>
          <div className="space-y-1.5">
            <ImageFieldLabel htmlFor="img-contributor">Contributor</ImageFieldLabel>
            <Input id="img-contributor" value={form.contributor} onChange={(e) => setForm({ ...form, contributor: e.target.value })} />
          </div>
          <div className="space-y-1.5">
            <ImageFieldLabel htmlFor="img-audience">Audience</ImageFieldLabel>
            <Input id="img-audience" value={form.audience} onChange={(e) => setForm({ ...form, audience: e.target.value })} />
          </div>
        </CardContent>
      </Card>

      {/* Technical */}
      <Card className="border-border bg-card shadow-sm shadow-black/5">
        <CardHeader className="border-b border-border pb-4">
          <CardTitle className="text-base font-semibold">Technical</CardTitle>
          <CardDescription className="text-xs">Dimension, DPI, bit depth — extension and file size auto-fill from the picked file.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-5 pt-5 sm:grid-cols-3">
          <div className="space-y-1.5">
            <ImageFieldLabel htmlFor="img-orientation">Orientation</ImageFieldLabel>
            <Input id="img-orientation" value={form.orientation} onChange={(e) => setForm({ ...form, orientation: e.target.value })} placeholder="landscape, portrait…" />
          </div>
          <div className="space-y-1.5">
            <ImageFieldLabel htmlFor="img-dimension">Dimension</ImageFieldLabel>
            <Input id="img-dimension" value={form.dimension} onChange={(e) => setForm({ ...form, dimension: e.target.value })} placeholder="6000×4000" />
          </div>
          <div className="space-y-1.5">
            <ImageFieldLabel htmlFor="img-dpi">DPI</ImageFieldLabel>
            <Input id="img-dpi" value={form.dpi} onChange={(e) => setForm({ ...form, dpi: e.target.value })} placeholder="300, 600…" />
          </div>
          <div className="space-y-1.5">
            <ImageFieldLabel htmlFor="img-bitDepth">Bit Depth</ImageFieldLabel>
            <Input id="img-bitDepth" value={form.bitDepth} onChange={(e) => setForm({ ...form, bitDepth: e.target.value })} placeholder="8-bit, 16-bit…" />
          </div>
          <div className="space-y-1.5">
            <ImageFieldLabel htmlFor="img-extension">Extension</ImageFieldLabel>
            <Input id="img-extension" value={form.extension} onChange={(e) => setForm({ ...form, extension: e.target.value })} placeholder="auto-filled (jpg, png, tif…)" />
          </div>
          <div className="space-y-1.5">
            <ImageFieldLabel htmlFor="img-fileSize">File Size</ImageFieldLabel>
            <Input id="img-fileSize" value={form.fileSize} onChange={(e) => setForm({ ...form, fileSize: e.target.value })} placeholder="auto-filled" />
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
            <ImageFieldLabel htmlFor="img-tags">Tags</ImageFieldLabel>
            <TagsInput id="img-tags" value={form.tags} onChange={(next) => setForm({ ...form, tags: next })} placeholder="archival, exhibition…" />
          </div>
          <div className="space-y-1.5">
            <ImageFieldLabel htmlFor="img-keywords">Keywords</ImageFieldLabel>
            <TagsInput id="img-keywords" value={form.keywords} onChange={(next) => setForm({ ...form, keywords: next })} placeholder="kurdistan, 1962…" />
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
            <ImageFieldLabel htmlFor="img-dateCreated">Created</ImageFieldLabel>
            <Input id="img-dateCreated" type="date" value={form.dateCreated} onChange={(e) => setForm({ ...form, dateCreated: e.target.value })} />
          </div>
          <div className="space-y-1.5">
            <ImageFieldLabel htmlFor="img-datePublished">Published</ImageFieldLabel>
            <Input id="img-datePublished" type="date" value={form.datePublished} onChange={(e) => setForm({ ...form, datePublished: e.target.value })} />
          </div>
          <div className="space-y-1.5">
            <ImageFieldLabel htmlFor="img-dateModified">Modified</ImageFieldLabel>
            <Input id="img-dateModified" type="date" value={form.dateModified} onChange={(e) => setForm({ ...form, dateModified: e.target.value })} />
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
            <ImageFieldLabel htmlFor="img-volumeName">Volume</ImageFieldLabel>
            <Input id="img-volumeName" value={form.volumeName} onChange={(e) => setForm({ ...form, volumeName: e.target.value })} placeholder="auto-filled from folder" />
          </div>
          <div className="space-y-1.5">
            <ImageFieldLabel htmlFor="img-directory">Directory</ImageFieldLabel>
            <Input id="img-directory" value={form.directory} onChange={(e) => setForm({ ...form, directory: e.target.value })} placeholder="auto-filled from folder" />
          </div>
          <div className="space-y-1.5">
            <ImageFieldLabel htmlFor="img-pathInExternalVolume">Path in External Volume</ImageFieldLabel>
            <Input id="img-pathInExternalVolume" value={form.pathInExternalVolume} onChange={(e) => setForm({ ...form, pathInExternalVolume: e.target.value })} placeholder="auto-filled from file" />
          </div>
          <div className="space-y-1.5">
            <ImageFieldLabel htmlFor="img-autoPath">Auto Path</ImageFieldLabel>
            <Input id="img-autoPath" value={form.autoPath} onChange={(e) => setForm({ ...form, autoPath: e.target.value })} placeholder="auto-filled from file" />
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
              <ImageFieldLabel htmlFor="img-imageStatus">Image Status</ImageFieldLabel>
              <Input id="img-imageStatus" value={form.imageStatus} onChange={(e) => setForm({ ...form, imageStatus: e.target.value })} />
            </div>
            <div className="space-y-1.5">
              <ImageFieldLabel htmlFor="img-archiveCataloging">Archive Cataloging</ImageFieldLabel>
              <Input id="img-archiveCataloging" value={form.archiveCataloging} onChange={(e) => setForm({ ...form, archiveCataloging: e.target.value })} />
            </div>
            <div className="space-y-1.5">
              <ImageFieldLabel htmlFor="img-provenance">Provenance</ImageFieldLabel>
              <Input id="img-provenance" value={form.provenance} onChange={(e) => setForm({ ...form, provenance: e.target.value })} />
            </div>
            <div className="space-y-1.5">
              <ImageFieldLabel htmlFor="img-accrualMethod">Accrual Method</ImageFieldLabel>
              <Input id="img-accrualMethod" value={form.accrualMethod} onChange={(e) => setForm({ ...form, accrualMethod: e.target.value })} />
            </div>
          </div>
          <div className="space-y-1.5">
            <ImageFieldLabel htmlFor="img-photostory">Photostory</ImageFieldLabel>
            <textarea id="img-photostory" className={cn(TEXTAREA_CLASS, 'min-h-[72px]')} value={form.photostory} onChange={(e) => setForm({ ...form, photostory: e.target.value })} />
          </div>
          <div className="flex items-center gap-2">
            <input
              id="img-physicalAvailability"
              type="checkbox"
              checked={Boolean(form.physicalAvailability)}
              onChange={(e) => setForm({ ...form, physicalAvailability: e.target.checked })}
              className="size-4 rounded border-input"
            />
            <Label htmlFor="img-physicalAvailability" className="cursor-pointer">A physical copy is available</Label>
            <FieldHelpButton metadata={getImageFieldMetadata('physicalAvailability')} />
          </div>
          <div className="grid gap-5 sm:grid-cols-2">
            <div className="space-y-1.5">
              <ImageFieldLabel htmlFor="img-physicalLabel">Physical Label</ImageFieldLabel>
              <Input id="img-physicalLabel" value={form.physicalLabel} onChange={(e) => setForm({ ...form, physicalLabel: e.target.value })} />
            </div>
            <div className="space-y-1.5">
              <ImageFieldLabel htmlFor="img-locationInArchiveRoom">Location in Archive Room</ImageFieldLabel>
              <Input id="img-locationInArchiveRoom" value={form.locationInArchiveRoom} onChange={(e) => setForm({ ...form, locationInArchiveRoom: e.target.value })} />
            </div>
            <div className="space-y-1.5">
              <ImageFieldLabel htmlFor="img-lccClassification">LCC Classification</ImageFieldLabel>
              <Input id="img-lccClassification" value={form.lccClassification} onChange={(e) => setForm({ ...form, lccClassification: e.target.value })} />
            </div>
          </div>
          <div className="space-y-1.5">
            <ImageFieldLabel htmlFor="img-note">Note</ImageFieldLabel>
            <textarea id="img-note" className={cn(TEXTAREA_CLASS, 'min-h-[72px]')} value={form.note} onChange={(e) => setForm({ ...form, note: e.target.value })} />
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
            <ImageFieldLabel htmlFor="img-copyright">Copyright</ImageFieldLabel>
            <Input id="img-copyright" value={form.copyright} onChange={(e) => setForm({ ...form, copyright: e.target.value })} />
          </div>
          <div className="space-y-1.5">
            <ImageFieldLabel htmlFor="img-rightOwner">Right Owner</ImageFieldLabel>
            <Input id="img-rightOwner" value={form.rightOwner} onChange={(e) => setForm({ ...form, rightOwner: e.target.value })} />
          </div>
          <div className="space-y-1.5">
            <ImageFieldLabel htmlFor="img-dateCopyrighted">Date Copyrighted</ImageFieldLabel>
            <Input id="img-dateCopyrighted" type="date" value={form.dateCopyrighted} onChange={(e) => setForm({ ...form, dateCopyrighted: e.target.value })} />
          </div>
          <div className="space-y-1.5">
            <ImageFieldLabel htmlFor="img-availability">Availability</ImageFieldLabel>
            <Input id="img-availability" value={form.availability} onChange={(e) => setForm({ ...form, availability: e.target.value })} />
          </div>
          <div className="space-y-1.5">
            <ImageFieldLabel htmlFor="img-licenseType">License Type</ImageFieldLabel>
            <Input id="img-licenseType" value={form.licenseType} onChange={(e) => setForm({ ...form, licenseType: e.target.value })} />
          </div>
          <div className="space-y-1.5">
            <ImageFieldLabel htmlFor="img-usageRights">Usage Rights</ImageFieldLabel>
            <Input id="img-usageRights" value={form.usageRights} onChange={(e) => setForm({ ...form, usageRights: e.target.value })} />
          </div>
          <div className="space-y-1.5">
            <ImageFieldLabel htmlFor="img-owner">Owner</ImageFieldLabel>
            <Input id="img-owner" value={form.owner} onChange={(e) => setForm({ ...form, owner: e.target.value })} />
          </div>
          <div className="space-y-1.5">
            <ImageFieldLabel htmlFor="img-publisher">Publisher</ImageFieldLabel>
            <Input id="img-publisher" value={form.publisher} onChange={(e) => setForm({ ...form, publisher: e.target.value })} />
          </div>
        </CardContent>
      </Card>
    </>
  )
}

export { ImageFormSections }
