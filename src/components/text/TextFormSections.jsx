import { Plus } from 'lucide-react'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { FieldHelpButton } from '@/components/ui/field-help'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { TagsInput } from '@/components/ui/tags-input'
import { cn } from '@/lib/utils'
import { getTextFieldMetadata } from '@/lib/text-fields-metadata'

// Label + help-button row. htmlFor here is prefixed (txt-x); `fieldKey`
// defaults to stripping the prefix so metadata lookups use the clean
// field name.
function TextFieldLabel({ htmlFor, fieldKey, className, children }) {
  const key = fieldKey || (htmlFor ? htmlFor.replace(/^txt-/, '') : null)
  return (
    <div className="flex items-center justify-between gap-2">
      <Label htmlFor={htmlFor} className={className}>
        {children}
      </Label>
      <FieldHelpButton metadata={getTextFieldMetadata(key)} />
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
            <TextFieldLabel htmlFor="txt-fileName">File Name</TextFieldLabel>
            <Input id="txt-fileName" value={form.fileName} onChange={(e) => setForm({ ...form, fileName: e.target.value })} />
          </div>
          <div className="space-y-1.5">
            <TextFieldLabel htmlFor="txt-originalTitle">Original Title</TextFieldLabel>
            <Input id="txt-originalTitle" value={form.originalTitle} onChange={(e) => setForm({ ...form, originalTitle: e.target.value })} />
          </div>
          <div className="space-y-1.5">
            <TextFieldLabel htmlFor="txt-alternativeTitle">Alternative Title</TextFieldLabel>
            <Input id="txt-alternativeTitle" value={form.alternativeTitle} onChange={(e) => setForm({ ...form, alternativeTitle: e.target.value })} />
          </div>
          <div className="space-y-1.5">
            <TextFieldLabel htmlFor="txt-titleInCentralKurdish">Central Kurdish Title</TextFieldLabel>
            <Input id="txt-titleInCentralKurdish" value={form.titleInCentralKurdish} onChange={(e) => setForm({ ...form, titleInCentralKurdish: e.target.value })} dir="rtl" />
          </div>
          <div className="space-y-1.5">
            <TextFieldLabel htmlFor="txt-romanizedTitle">Romanized Title</TextFieldLabel>
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
            <TextFieldLabel htmlFor="txt-description">Description</TextFieldLabel>
            <textarea id="txt-description" className={TEXTAREA_CLASS} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
          </div>
          <div className="grid gap-5 sm:grid-cols-2">
            <div className="space-y-1.5">
              <TextFieldLabel htmlFor="txt-documentType">Document Type</TextFieldLabel>
              <Input id="txt-documentType" value={form.documentType} onChange={(e) => setForm({ ...form, documentType: e.target.value })} placeholder="book, manuscript, letter…" />
            </div>
            <div className="space-y-1.5">
              <TextFieldLabel htmlFor="txt-subject">Subject</TextFieldLabel>
              <TagsInput id="txt-subject" value={form.subject} onChange={(next) => setForm({ ...form, subject: next })} placeholder="History, poetry, religion…" />
            </div>
            <div className="space-y-1.5 sm:col-span-2">
              <div className="flex items-center justify-between gap-2">
                <Label>
                  Genres{' '}
                  <span className="font-normal text-muted-foreground">
                    (pick from this project's categories)
                  </span>
                </Label>
                <FieldHelpButton metadata={getTextFieldMetadata('genre')} />
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

      {/* Text Details */}
      <Card className="border-border bg-card shadow-sm shadow-black/5">
        <CardHeader className="border-b border-border pb-4">
          <CardTitle className="text-base font-semibold">Subject & Context</CardTitle>
          <CardDescription className="text-xs">Script, ISBN, edition and series.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-5 pt-5">
          <div className="grid gap-5 sm:grid-cols-2">
            <div className="space-y-1.5">
              <TextFieldLabel htmlFor="txt-script">Script</TextFieldLabel>
              <Input id="txt-script" value={form.script} onChange={(e) => setForm({ ...form, script: e.target.value })} placeholder="Arabic, Latin, Cyrillic…" />
            </div>
            <div className="space-y-1.5">
              <TextFieldLabel htmlFor="txt-isbn">ISBN</TextFieldLabel>
              <Input id="txt-isbn" value={form.isbn} onChange={(e) => setForm({ ...form, isbn: e.target.value })} />
            </div>
            <div className="space-y-1.5">
              <TextFieldLabel htmlFor="txt-assignmentNumber">Assignment Number</TextFieldLabel>
              <Input id="txt-assignmentNumber" value={form.assignmentNumber} onChange={(e) => setForm({ ...form, assignmentNumber: e.target.value })} />
            </div>
            <div className="space-y-1.5">
              <TextFieldLabel htmlFor="txt-edition">Edition</TextFieldLabel>
              <Input id="txt-edition" value={form.edition} onChange={(e) => setForm({ ...form, edition: e.target.value })} placeholder="1st, 2nd, revised…" />
            </div>
            <div className="space-y-1.5">
              <TextFieldLabel htmlFor="txt-volume">Volume</TextFieldLabel>
              <Input id="txt-volume" value={form.volume} onChange={(e) => setForm({ ...form, volume: e.target.value })} />
            </div>
            <div className="space-y-1.5">
              <TextFieldLabel htmlFor="txt-series">Series</TextFieldLabel>
              <Input id="txt-series" value={form.series} onChange={(e) => setForm({ ...form, series: e.target.value })} />
            </div>
          </div>
          <div className="space-y-1.5">
            <TextFieldLabel htmlFor="txt-transcription">Transcription</TextFieldLabel>
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
            <TextFieldLabel htmlFor="txt-language">Language</TextFieldLabel>
            <Input id="txt-language" value={form.language} onChange={(e) => setForm({ ...form, language: e.target.value })} />
          </div>
          <div className="space-y-1.5">
            <TextFieldLabel htmlFor="txt-dialect">Dialect</TextFieldLabel>
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
            <TextFieldLabel htmlFor="txt-author">Author</TextFieldLabel>
            <Input id="txt-author" value={form.author} onChange={(e) => setForm({ ...form, author: e.target.value })} />
          </div>
          <div className="space-y-1.5">
            <TextFieldLabel htmlFor="txt-contributors">Contributors</TextFieldLabel>
            <Input id="txt-contributors" value={form.contributors} onChange={(e) => setForm({ ...form, contributors: e.target.value })} />
          </div>
          <div className="space-y-1.5">
            <TextFieldLabel htmlFor="txt-printingHouse">Printing House</TextFieldLabel>
            <Input id="txt-printingHouse" value={form.printingHouse} onChange={(e) => setForm({ ...form, printingHouse: e.target.value })} />
          </div>
          <div className="space-y-1.5">
            <TextFieldLabel htmlFor="txt-audience">Audience</TextFieldLabel>
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
            <TextFieldLabel htmlFor="txt-pageCount">Page Count</TextFieldLabel>
            <Input id="txt-pageCount" type="number" min="0" step="1" value={form.pageCount} onChange={(e) => setForm({ ...form, pageCount: e.target.value })} />
          </div>
          <div className="space-y-1.5">
            <TextFieldLabel htmlFor="txt-orientation">Orientation</TextFieldLabel>
            <Input id="txt-orientation" value={form.orientation} onChange={(e) => setForm({ ...form, orientation: e.target.value })} placeholder="portrait, landscape…" />
          </div>
          <div className="space-y-1.5">
            <TextFieldLabel htmlFor="txt-size">Size</TextFieldLabel>
            <Input id="txt-size" value={form.size} onChange={(e) => setForm({ ...form, size: e.target.value })} placeholder="A4, Letter, B5…" />
          </div>
          <div className="space-y-1.5">
            <TextFieldLabel htmlFor="txt-physicalDimensions">Physical Dimensions</TextFieldLabel>
            <Input id="txt-physicalDimensions" value={form.physicalDimensions} onChange={(e) => setForm({ ...form, physicalDimensions: e.target.value })} placeholder="21×29.7 cm" />
          </div>
          <div className="space-y-1.5">
            <TextFieldLabel htmlFor="txt-extension">Extension</TextFieldLabel>
            <Input id="txt-extension" value={form.extension} onChange={(e) => setForm({ ...form, extension: e.target.value })} placeholder="auto-filled (pdf, docx, txt…)" />
          </div>
          <div className="space-y-1.5">
            <TextFieldLabel htmlFor="txt-fileSize">File Size</TextFieldLabel>
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
            <TextFieldLabel htmlFor="txt-tags">Tags</TextFieldLabel>
            <TagsInput id="txt-tags" value={form.tags} onChange={(next) => setForm({ ...form, tags: next })} placeholder="archival, manuscript…" />
          </div>
          <div className="space-y-1.5">
            <TextFieldLabel htmlFor="txt-keywords">Keywords</TextFieldLabel>
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
            <TextFieldLabel htmlFor="txt-dateCreated">Created</TextFieldLabel>
            <Input id="txt-dateCreated" type="date" value={form.dateCreated} onChange={(e) => setForm({ ...form, dateCreated: e.target.value })} />
          </div>
          <div className="space-y-1.5">
            <TextFieldLabel htmlFor="txt-printDate">Print Date</TextFieldLabel>
            <Input id="txt-printDate" type="date" value={form.printDate} onChange={(e) => setForm({ ...form, printDate: e.target.value })} />
          </div>
          <div className="space-y-1.5">
            <TextFieldLabel htmlFor="txt-datePublished">Published</TextFieldLabel>
            <Input id="txt-datePublished" type="date" value={form.datePublished} onChange={(e) => setForm({ ...form, datePublished: e.target.value })} />
          </div>
          <div className="space-y-1.5">
            <TextFieldLabel htmlFor="txt-dateModified">Modified</TextFieldLabel>
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
            <TextFieldLabel htmlFor="txt-volumeName">Volume</TextFieldLabel>
            <Input id="txt-volumeName" value={form.volumeName} onChange={(e) => setForm({ ...form, volumeName: e.target.value })} placeholder="auto-filled from folder" />
          </div>
          <div className="space-y-1.5">
            <TextFieldLabel htmlFor="txt-directory">Directory</TextFieldLabel>
            <Input id="txt-directory" value={form.directory} onChange={(e) => setForm({ ...form, directory: e.target.value })} placeholder="auto-filled from folder" />
          </div>
          <div className="space-y-1.5">
            <TextFieldLabel htmlFor="txt-pathInExternalVolume">Path in External Volume</TextFieldLabel>
            <Input id="txt-pathInExternalVolume" value={form.pathInExternalVolume} onChange={(e) => setForm({ ...form, pathInExternalVolume: e.target.value })} placeholder="auto-filled from file" />
          </div>
          <div className="space-y-1.5">
            <TextFieldLabel htmlFor="txt-autoPath">Auto Path</TextFieldLabel>
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
              <TextFieldLabel htmlFor="txt-textStatus">Text Status</TextFieldLabel>
              <Input id="txt-textStatus" value={form.textStatus} onChange={(e) => setForm({ ...form, textStatus: e.target.value })} />
            </div>
            <div className="space-y-1.5">
              <TextFieldLabel htmlFor="txt-archiveCataloging">Archive Cataloging</TextFieldLabel>
              <Input id="txt-archiveCataloging" value={form.archiveCataloging} onChange={(e) => setForm({ ...form, archiveCataloging: e.target.value })} />
            </div>
            <div className="space-y-1.5">
              <TextFieldLabel htmlFor="txt-provenance">Provenance</TextFieldLabel>
              <Input id="txt-provenance" value={form.provenance} onChange={(e) => setForm({ ...form, provenance: e.target.value })} />
            </div>
            <div className="space-y-1.5">
              <TextFieldLabel htmlFor="txt-accrualMethod">Accrual Method</TextFieldLabel>
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
            <FieldHelpButton metadata={getTextFieldMetadata('physicalAvailability')} />
          </div>
          <div className="grid gap-5 sm:grid-cols-2">
            <div className="space-y-1.5">
              <TextFieldLabel htmlFor="txt-physicalLabel">Physical Label</TextFieldLabel>
              <Input id="txt-physicalLabel" value={form.physicalLabel} onChange={(e) => setForm({ ...form, physicalLabel: e.target.value })} />
            </div>
            <div className="space-y-1.5">
              <TextFieldLabel htmlFor="txt-locationInArchiveRoom">Location in Archive Room</TextFieldLabel>
              <Input id="txt-locationInArchiveRoom" value={form.locationInArchiveRoom} onChange={(e) => setForm({ ...form, locationInArchiveRoom: e.target.value })} />
            </div>
            <div className="space-y-1.5">
              <TextFieldLabel htmlFor="txt-lccClassification">LCC Classification</TextFieldLabel>
              <Input id="txt-lccClassification" value={form.lccClassification} onChange={(e) => setForm({ ...form, lccClassification: e.target.value })} />
            </div>
          </div>
          <div className="space-y-1.5">
            <TextFieldLabel htmlFor="txt-note">Note</TextFieldLabel>
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
            <TextFieldLabel htmlFor="txt-copyright">Copyright</TextFieldLabel>
            <Input id="txt-copyright" value={form.copyright} onChange={(e) => setForm({ ...form, copyright: e.target.value })} />
          </div>
          <div className="space-y-1.5">
            <TextFieldLabel htmlFor="txt-rightOwner">Right Owner</TextFieldLabel>
            <Input id="txt-rightOwner" value={form.rightOwner} onChange={(e) => setForm({ ...form, rightOwner: e.target.value })} />
          </div>
          <div className="space-y-1.5">
            <TextFieldLabel htmlFor="txt-dateCopyrighted">Date Copyrighted</TextFieldLabel>
            <Input id="txt-dateCopyrighted" type="date" value={form.dateCopyrighted} onChange={(e) => setForm({ ...form, dateCopyrighted: e.target.value })} />
          </div>
          <div className="space-y-1.5">
            <TextFieldLabel htmlFor="txt-availability">Availability</TextFieldLabel>
            <Input id="txt-availability" value={form.availability} onChange={(e) => setForm({ ...form, availability: e.target.value })} />
          </div>
          <div className="space-y-1.5">
            <TextFieldLabel htmlFor="txt-licenseType">License Type</TextFieldLabel>
            <Input id="txt-licenseType" value={form.licenseType} onChange={(e) => setForm({ ...form, licenseType: e.target.value })} />
          </div>
          <div className="space-y-1.5">
            <TextFieldLabel htmlFor="txt-usageRights">Usage Rights</TextFieldLabel>
            <Input id="txt-usageRights" value={form.usageRights} onChange={(e) => setForm({ ...form, usageRights: e.target.value })} />
          </div>
          <div className="space-y-1.5">
            <TextFieldLabel htmlFor="txt-owner">Owner</TextFieldLabel>
            <Input id="txt-owner" value={form.owner} onChange={(e) => setForm({ ...form, owner: e.target.value })} />
          </div>
          <div className="space-y-1.5">
            <TextFieldLabel htmlFor="txt-publisher">Publisher</TextFieldLabel>
            <Input id="txt-publisher" value={form.publisher} onChange={(e) => setForm({ ...form, publisher: e.target.value })} />
          </div>
        </CardContent>
      </Card>
    </>
  )
}

export { TextFormSections }
