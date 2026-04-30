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

function TextFormSections({ form, setForm, projectCategories = [] }) {
  return (
    <>
      {/* Titles */}
      <Card className="border-border bg-card shadow-sm shadow-black/5">
        <CardHeader className="border-b border-border pb-4">
          <CardTitle className="text-base font-semibold">Titles</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-5 pt-5 sm:grid-cols-2">
          <div className="space-y-1.5 sm:col-span-2">
            <Label htmlFor="txt-fileName">File Name</Label>
            <Input id="txt-fileName" value={form.fileName} onChange={(e) => setForm({ ...form, fileName: e.target.value })} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="txt-originalTitle">Original Title</Label>
            <Input id="txt-originalTitle" value={form.originalTitle} onChange={(e) => setForm({ ...form, originalTitle: e.target.value })} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="txt-alternativeTitle">Alternative Title</Label>
            <Input id="txt-alternativeTitle" value={form.alternativeTitle} onChange={(e) => setForm({ ...form, alternativeTitle: e.target.value })} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="txt-titleInCentralKurdish">Central Kurdish Title</Label>
            <Input id="txt-titleInCentralKurdish" value={form.titleInCentralKurdish} onChange={(e) => setForm({ ...form, titleInCentralKurdish: e.target.value })} dir="rtl" />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="txt-romanizedTitle">Romanized Title</Label>
            <Input id="txt-romanizedTitle" value={form.romanizedTitle} onChange={(e) => setForm({ ...form, romanizedTitle: e.target.value })} />
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
            <Label htmlFor="txt-description">Description</Label>
            <textarea id="txt-description" className={TEXTAREA_CLASS} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
          </div>
          <div className="grid gap-5 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="txt-documentType">Document Type</Label>
              <Input id="txt-documentType" value={form.documentType} onChange={(e) => setForm({ ...form, documentType: e.target.value })} placeholder="book, manuscript, letter…" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="txt-subject">Subject</Label>
              <TagsInput id="txt-subject" value={form.subject} onChange={(next) => setForm({ ...form, subject: next })} placeholder="History, poetry, religion…" />
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

      {/* Text Details */}
      <Card className="border-border bg-card shadow-sm shadow-black/5">
        <CardHeader className="border-b border-border pb-4">
          <CardTitle className="text-base font-semibold">Subject & Context</CardTitle>
          <CardDescription className="text-xs">Script, ISBN, edition and series.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-5 pt-5">
          <div className="grid gap-5 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="txt-script">Script</Label>
              <Input id="txt-script" value={form.script} onChange={(e) => setForm({ ...form, script: e.target.value })} placeholder="Arabic, Latin, Cyrillic…" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="txt-isbn">ISBN</Label>
              <Input id="txt-isbn" value={form.isbn} onChange={(e) => setForm({ ...form, isbn: e.target.value })} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="txt-assignmentNumber">Assignment Number</Label>
              <Input id="txt-assignmentNumber" value={form.assignmentNumber} onChange={(e) => setForm({ ...form, assignmentNumber: e.target.value })} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="txt-edition">Edition</Label>
              <Input id="txt-edition" value={form.edition} onChange={(e) => setForm({ ...form, edition: e.target.value })} placeholder="1st, 2nd, revised…" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="txt-volume">Volume</Label>
              <Input id="txt-volume" value={form.volume} onChange={(e) => setForm({ ...form, volume: e.target.value })} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="txt-series">Series</Label>
              <Input id="txt-series" value={form.series} onChange={(e) => setForm({ ...form, series: e.target.value })} />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="txt-transcription">Transcription</Label>
            <textarea id="txt-transcription" className={cn(TEXTAREA_CLASS, 'min-h-[120px]')} value={form.transcription} onChange={(e) => setForm({ ...form, transcription: e.target.value })} />
          </div>
        </CardContent>
      </Card>

      {/* Language */}
      <Card className="border-border bg-card shadow-sm shadow-black/5">
        <CardHeader className="border-b border-border pb-4">
          <CardTitle className="text-base font-semibold">Language</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-5 pt-5 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="txt-language">Language</Label>
            <Input id="txt-language" value={form.language} onChange={(e) => setForm({ ...form, language: e.target.value })} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="txt-dialect">Dialect</Label>
            <Input id="txt-dialect" value={form.dialect} onChange={(e) => setForm({ ...form, dialect: e.target.value })} />
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
            <Label htmlFor="txt-author">Author</Label>
            <Input id="txt-author" value={form.author} onChange={(e) => setForm({ ...form, author: e.target.value })} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="txt-contributors">Contributors</Label>
            <Input id="txt-contributors" value={form.contributors} onChange={(e) => setForm({ ...form, contributors: e.target.value })} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="txt-printingHouse">Printing House</Label>
            <Input id="txt-printingHouse" value={form.printingHouse} onChange={(e) => setForm({ ...form, printingHouse: e.target.value })} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="txt-audience">Audience</Label>
            <Input id="txt-audience" value={form.audience} onChange={(e) => setForm({ ...form, audience: e.target.value })} />
          </div>
        </CardContent>
      </Card>

      {/* Technical */}
      <Card className="border-border bg-card shadow-sm shadow-black/5">
        <CardHeader className="border-b border-border pb-4">
          <CardTitle className="text-base font-semibold">Technical</CardTitle>
          <CardDescription className="text-xs">Pages, dimensions — extension and file size auto-fill from the picked file.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-5 pt-5 sm:grid-cols-3">
          <div className="space-y-1.5">
            <Label htmlFor="txt-pageCount">Page Count</Label>
            <Input id="txt-pageCount" type="number" min="0" step="1" value={form.pageCount} onChange={(e) => setForm({ ...form, pageCount: e.target.value })} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="txt-orientation">Orientation</Label>
            <Input id="txt-orientation" value={form.orientation} onChange={(e) => setForm({ ...form, orientation: e.target.value })} placeholder="portrait, landscape…" />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="txt-size">Size</Label>
            <Input id="txt-size" value={form.size} onChange={(e) => setForm({ ...form, size: e.target.value })} placeholder="A4, Letter, B5…" />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="txt-physicalDimensions">Physical Dimensions</Label>
            <Input id="txt-physicalDimensions" value={form.physicalDimensions} onChange={(e) => setForm({ ...form, physicalDimensions: e.target.value })} placeholder="21×29.7 cm" />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="txt-extension">Extension</Label>
            <Input id="txt-extension" value={form.extension} onChange={(e) => setForm({ ...form, extension: e.target.value })} placeholder="auto-filled (pdf, docx, txt…)" />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="txt-fileSize">File Size</Label>
            <Input id="txt-fileSize" value={form.fileSize} onChange={(e) => setForm({ ...form, fileSize: e.target.value })} placeholder="auto-filled" />
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
            <Label htmlFor="txt-tags">Tags</Label>
            <TagsInput id="txt-tags" value={form.tags} onChange={(next) => setForm({ ...form, tags: next })} placeholder="archival, manuscript…" />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="txt-keywords">Keywords</Label>
            <TagsInput id="txt-keywords" value={form.keywords} onChange={(next) => setForm({ ...form, keywords: next })} placeholder="kurdistan, 1962…" />
          </div>
        </CardContent>
      </Card>

      {/* Dates */}
      <Card className="border-border bg-card shadow-sm shadow-black/5">
        <CardHeader className="border-b border-border pb-4">
          <CardTitle className="text-base font-semibold">Dates</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-5 pt-5 sm:grid-cols-4">
          <div className="space-y-1.5">
            <Label htmlFor="txt-dateCreated">Created</Label>
            <Input id="txt-dateCreated" type="date" value={form.dateCreated} onChange={(e) => setForm({ ...form, dateCreated: e.target.value })} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="txt-printDate">Print Date</Label>
            <Input id="txt-printDate" type="date" value={form.printDate} onChange={(e) => setForm({ ...form, printDate: e.target.value })} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="txt-datePublished">Published</Label>
            <Input id="txt-datePublished" type="date" value={form.datePublished} onChange={(e) => setForm({ ...form, datePublished: e.target.value })} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="txt-dateModified">Modified</Label>
            <Input id="txt-dateModified" type="date" value={form.dateModified} onChange={(e) => setForm({ ...form, dateModified: e.target.value })} />
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
            <Label htmlFor="txt-volumeName">Volume</Label>
            <Input id="txt-volumeName" value={form.volumeName} onChange={(e) => setForm({ ...form, volumeName: e.target.value })} placeholder="auto-filled from folder" />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="txt-directory">Directory</Label>
            <Input id="txt-directory" value={form.directory} onChange={(e) => setForm({ ...form, directory: e.target.value })} placeholder="auto-filled from folder" />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="txt-pathInExternalVolume">Path in External Volume</Label>
            <Input id="txt-pathInExternalVolume" value={form.pathInExternalVolume} onChange={(e) => setForm({ ...form, pathInExternalVolume: e.target.value })} placeholder="auto-filled from file" />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="txt-autoPath">Auto Path</Label>
            <Input id="txt-autoPath" value={form.autoPath} onChange={(e) => setForm({ ...form, autoPath: e.target.value })} placeholder="auto-filled from file" />
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
              <Label htmlFor="txt-textStatus">Text Status</Label>
              <Input id="txt-textStatus" value={form.textStatus} onChange={(e) => setForm({ ...form, textStatus: e.target.value })} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="txt-archiveCataloging">Archive Cataloging</Label>
              <Input id="txt-archiveCataloging" value={form.archiveCataloging} onChange={(e) => setForm({ ...form, archiveCataloging: e.target.value })} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="txt-provenance">Provenance</Label>
              <Input id="txt-provenance" value={form.provenance} onChange={(e) => setForm({ ...form, provenance: e.target.value })} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="txt-accrualMethod">Accrual Method</Label>
              <Input id="txt-accrualMethod" value={form.accrualMethod} onChange={(e) => setForm({ ...form, accrualMethod: e.target.value })} />
            </div>
          </div>
          <div className="flex items-center gap-2">
            <input
              id="txt-physicalAvailability"
              type="checkbox"
              checked={Boolean(form.physicalAvailability)}
              onChange={(e) => setForm({ ...form, physicalAvailability: e.target.checked })}
              className="size-4 rounded border-input"
            />
            <Label htmlFor="txt-physicalAvailability" className="cursor-pointer">A physical copy is available</Label>
          </div>
          <div className="grid gap-5 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="txt-physicalLabel">Physical Label</Label>
              <Input id="txt-physicalLabel" value={form.physicalLabel} onChange={(e) => setForm({ ...form, physicalLabel: e.target.value })} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="txt-locationInArchiveRoom">Location in Archive Room</Label>
              <Input id="txt-locationInArchiveRoom" value={form.locationInArchiveRoom} onChange={(e) => setForm({ ...form, locationInArchiveRoom: e.target.value })} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="txt-lccClassification">LCC Classification</Label>
              <Input id="txt-lccClassification" value={form.lccClassification} onChange={(e) => setForm({ ...form, lccClassification: e.target.value })} />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="txt-note">Note</Label>
            <textarea id="txt-note" className={cn(TEXTAREA_CLASS, 'min-h-[72px]')} value={form.note} onChange={(e) => setForm({ ...form, note: e.target.value })} />
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
            <Label htmlFor="txt-copyright">Copyright</Label>
            <Input id="txt-copyright" value={form.copyright} onChange={(e) => setForm({ ...form, copyright: e.target.value })} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="txt-rightOwner">Right Owner</Label>
            <Input id="txt-rightOwner" value={form.rightOwner} onChange={(e) => setForm({ ...form, rightOwner: e.target.value })} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="txt-dateCopyrighted">Date Copyrighted</Label>
            <Input id="txt-dateCopyrighted" type="date" value={form.dateCopyrighted} onChange={(e) => setForm({ ...form, dateCopyrighted: e.target.value })} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="txt-availability">Availability</Label>
            <Input id="txt-availability" value={form.availability} onChange={(e) => setForm({ ...form, availability: e.target.value })} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="txt-licenseType">License Type</Label>
            <Input id="txt-licenseType" value={form.licenseType} onChange={(e) => setForm({ ...form, licenseType: e.target.value })} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="txt-usageRights">Usage Rights</Label>
            <Input id="txt-usageRights" value={form.usageRights} onChange={(e) => setForm({ ...form, usageRights: e.target.value })} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="txt-owner">Owner</Label>
            <Input id="txt-owner" value={form.owner} onChange={(e) => setForm({ ...form, owner: e.target.value })} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="txt-publisher">Publisher</Label>
            <Input id="txt-publisher" value={form.publisher} onChange={(e) => setForm({ ...form, publisher: e.target.value })} />
          </div>
        </CardContent>
      </Card>
    </>
  )
}

export { TextFormSections }
