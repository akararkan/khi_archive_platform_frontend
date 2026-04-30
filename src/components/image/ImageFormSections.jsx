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
            <Label htmlFor="img-fileName">File Name</Label>
            <Input id="img-fileName" value={form.fileName} onChange={(e) => setForm({ ...form, fileName: e.target.value })} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="img-originalTitle">Original Title</Label>
            <Input id="img-originalTitle" value={form.originalTitle} onChange={(e) => setForm({ ...form, originalTitle: e.target.value })} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="img-alternativeTitle">Alternative Title</Label>
            <Input id="img-alternativeTitle" value={form.alternativeTitle} onChange={(e) => setForm({ ...form, alternativeTitle: e.target.value })} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="img-titleInCentralKurdish">Central Kurdish Title</Label>
            <Input id="img-titleInCentralKurdish" value={form.titleInCentralKurdish} onChange={(e) => setForm({ ...form, titleInCentralKurdish: e.target.value })} dir="rtl" />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="img-romanizedTitle">Romanized Title</Label>
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
            <Label htmlFor="img-description">Description</Label>
            <textarea id="img-description" className={TEXTAREA_CLASS} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
          </div>
          <div className="grid gap-5 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="img-event">Event</Label>
              <Input id="img-event" value={form.event} onChange={(e) => setForm({ ...form, event: e.target.value })} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="img-location">Location</Label>
              <Input id="img-location" value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} />
            </div>
          </div>
          <div className="grid gap-5 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="img-subject">Subject</Label>
              <TagsInput id="img-subject" value={form.subject} onChange={(next) => setForm({ ...form, subject: next })} placeholder="History, portrait, landscape…" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="img-form">Form</Label>
              <Input id="img-form" value={form.form} onChange={(e) => setForm({ ...form, form: e.target.value })} placeholder="Photograph, painting, drawing…" />
            </div>
            <div className="space-y-1.5 sm:col-span-2">
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

      {/* Image meta */}
      <Card className="border-border bg-card shadow-sm shadow-black/5">
        <CardHeader className="border-b border-border pb-4">
          <CardTitle className="text-base font-semibold">Subject & Context</CardTitle>
          <CardDescription className="text-xs">People shown, color, where it was used.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-5 pt-5">
          <div className="space-y-1.5">
            <Label htmlFor="img-personShownInImage">People shown in the image</Label>
            <Input id="img-personShownInImage" value={form.personShownInImage} onChange={(e) => setForm({ ...form, personShownInImage: e.target.value })} />
          </div>
          <div className="grid gap-5 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="img-colorOfImage">Color</Label>
              <TagsInput id="img-colorOfImage" value={form.colorOfImage} onChange={(next) => setForm({ ...form, colorOfImage: next })} placeholder="black & white, color, sepia…" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="img-whereThisImageUsed">Where this image was used</Label>
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
            <Label htmlFor="img-manufacturer">Manufacturer</Label>
            <Input id="img-manufacturer" value={form.manufacturer} onChange={(e) => setForm({ ...form, manufacturer: e.target.value })} placeholder="Canon, Nikon, Leica…" />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="img-model">Model</Label>
            <Input id="img-model" value={form.model} onChange={(e) => setForm({ ...form, model: e.target.value })} placeholder="EOS R5, D850…" />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="img-lens">Lens</Label>
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
            <Label htmlFor="img-creatorArtistPhotographer">Creator / Artist / Photographer</Label>
            <Input id="img-creatorArtistPhotographer" value={form.creatorArtistPhotographer} onChange={(e) => setForm({ ...form, creatorArtistPhotographer: e.target.value })} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="img-contributor">Contributor</Label>
            <Input id="img-contributor" value={form.contributor} onChange={(e) => setForm({ ...form, contributor: e.target.value })} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="img-audience">Audience</Label>
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
            <Label htmlFor="img-orientation">Orientation</Label>
            <Input id="img-orientation" value={form.orientation} onChange={(e) => setForm({ ...form, orientation: e.target.value })} placeholder="landscape, portrait…" />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="img-dimension">Dimension</Label>
            <Input id="img-dimension" value={form.dimension} onChange={(e) => setForm({ ...form, dimension: e.target.value })} placeholder="6000×4000" />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="img-dpi">DPI</Label>
            <Input id="img-dpi" value={form.dpi} onChange={(e) => setForm({ ...form, dpi: e.target.value })} placeholder="300, 600…" />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="img-bitDepth">Bit Depth</Label>
            <Input id="img-bitDepth" value={form.bitDepth} onChange={(e) => setForm({ ...form, bitDepth: e.target.value })} placeholder="8-bit, 16-bit…" />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="img-extension">Extension</Label>
            <Input id="img-extension" value={form.extension} onChange={(e) => setForm({ ...form, extension: e.target.value })} placeholder="auto-filled (jpg, png, tif…)" />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="img-fileSize">File Size</Label>
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
            <Label htmlFor="img-tags">Tags</Label>
            <TagsInput id="img-tags" value={form.tags} onChange={(next) => setForm({ ...form, tags: next })} placeholder="archival, exhibition…" />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="img-keywords">Keywords</Label>
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
            <Label htmlFor="img-dateCreated">Created</Label>
            <Input id="img-dateCreated" type="date" value={form.dateCreated} onChange={(e) => setForm({ ...form, dateCreated: e.target.value })} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="img-datePublished">Published</Label>
            <Input id="img-datePublished" type="date" value={form.datePublished} onChange={(e) => setForm({ ...form, datePublished: e.target.value })} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="img-dateModified">Modified</Label>
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
            <Label htmlFor="img-volumeName">Volume</Label>
            <Input id="img-volumeName" value={form.volumeName} onChange={(e) => setForm({ ...form, volumeName: e.target.value })} placeholder="auto-filled from folder" />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="img-directory">Directory</Label>
            <Input id="img-directory" value={form.directory} onChange={(e) => setForm({ ...form, directory: e.target.value })} placeholder="auto-filled from folder" />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="img-pathInExternalVolume">Path in External Volume</Label>
            <Input id="img-pathInExternalVolume" value={form.pathInExternalVolume} onChange={(e) => setForm({ ...form, pathInExternalVolume: e.target.value })} placeholder="auto-filled from file" />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="img-autoPath">Auto Path</Label>
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
              <Label htmlFor="img-imageStatus">Image Status</Label>
              <Input id="img-imageStatus" value={form.imageStatus} onChange={(e) => setForm({ ...form, imageStatus: e.target.value })} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="img-archiveCataloging">Archive Cataloging</Label>
              <Input id="img-archiveCataloging" value={form.archiveCataloging} onChange={(e) => setForm({ ...form, archiveCataloging: e.target.value })} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="img-provenance">Provenance</Label>
              <Input id="img-provenance" value={form.provenance} onChange={(e) => setForm({ ...form, provenance: e.target.value })} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="img-accrualMethod">Accrual Method</Label>
              <Input id="img-accrualMethod" value={form.accrualMethod} onChange={(e) => setForm({ ...form, accrualMethod: e.target.value })} />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="img-photostory">Photostory</Label>
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
          </div>
          <div className="grid gap-5 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="img-physicalLabel">Physical Label</Label>
              <Input id="img-physicalLabel" value={form.physicalLabel} onChange={(e) => setForm({ ...form, physicalLabel: e.target.value })} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="img-locationInArchiveRoom">Location in Archive Room</Label>
              <Input id="img-locationInArchiveRoom" value={form.locationInArchiveRoom} onChange={(e) => setForm({ ...form, locationInArchiveRoom: e.target.value })} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="img-lccClassification">LCC Classification</Label>
              <Input id="img-lccClassification" value={form.lccClassification} onChange={(e) => setForm({ ...form, lccClassification: e.target.value })} />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="img-note">Note</Label>
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
            <Label htmlFor="img-copyright">Copyright</Label>
            <Input id="img-copyright" value={form.copyright} onChange={(e) => setForm({ ...form, copyright: e.target.value })} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="img-rightOwner">Right Owner</Label>
            <Input id="img-rightOwner" value={form.rightOwner} onChange={(e) => setForm({ ...form, rightOwner: e.target.value })} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="img-dateCopyrighted">Date Copyrighted</Label>
            <Input id="img-dateCopyrighted" type="date" value={form.dateCopyrighted} onChange={(e) => setForm({ ...form, dateCopyrighted: e.target.value })} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="img-availability">Availability</Label>
            <Input id="img-availability" value={form.availability} onChange={(e) => setForm({ ...form, availability: e.target.value })} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="img-licenseType">License Type</Label>
            <Input id="img-licenseType" value={form.licenseType} onChange={(e) => setForm({ ...form, licenseType: e.target.value })} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="img-usageRights">Usage Rights</Label>
            <Input id="img-usageRights" value={form.usageRights} onChange={(e) => setForm({ ...form, usageRights: e.target.value })} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="img-owner">Owner</Label>
            <Input id="img-owner" value={form.owner} onChange={(e) => setForm({ ...form, owner: e.target.value })} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="img-publisher">Publisher</Label>
            <Input id="img-publisher" value={form.publisher} onChange={(e) => setForm({ ...form, publisher: e.target.value })} />
          </div>
        </CardContent>
      </Card>
    </>
  )
}

export { ImageFormSections }
