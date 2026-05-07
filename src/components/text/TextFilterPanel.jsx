// Inline expandable filter panel for the text table inside the
// project detail page. Composed from the shared list-filter
// primitives so the visual language matches Audio, Image, Video,
// Person, and Category.
//
// Sections, top-down: Classification, Identifiers, Language, Format,
// Edition, Versioning, Pages, People, Discovery, Catalog, Rights,
// Description / Note, Lifecycle, Activity. A user looking for "books
// printed in 2010 with ISBN starting with 978" finds Identifiers +
// Lifecycle at a glance; someone after "field journals over 200 pages"
// reaches Format + Pages.

import {
  BookOpen,
  Calendar,
  CalendarClock,
  Database,
  FileText,
  Hash,
  Languages,
  Library,
  Notebook,
  Scale,
  Sparkles,
  Tag,
  Users,
} from 'lucide-react'

import {
  DateRangeField,
  FilterField,
  FilterPanel,
  FilterSection,
  MultiValueFilter,
  SegmentedControl,
  TextFilter,
} from '@/components/ui/list-filters'

// Two-up numeric range input. Same shell language as DateRangeField
// for consistency. Plays nicely with empty strings (the canonical
// "unset" value) and inline-validates min > max.
function NumericRangeField({ label, hint, from, to, min, max, step = 1, onFromChange, onToChange }) {
  const isInvalid =
    from !== '' && to !== '' && !Number.isNaN(Number(from)) && !Number.isNaN(Number(to)) && Number(from) > Number(to)
  return (
    <div className="space-y-1.5">
      {label ? (
        <span className="flex items-center justify-between gap-2 text-[11px] font-medium leading-none text-foreground/80">
          <span>{label}</span>
          {hint ? (
            <span className="text-[10px] font-normal text-muted-foreground/70">{hint}</span>
          ) : null}
        </span>
      ) : null}
      <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-1.5 rounded-lg border border-input bg-background px-1 py-1 transition-colors focus-within:border-ring focus-within:ring-3 focus-within:ring-ring/30">
        <input
          type="number"
          inputMode="decimal"
          value={from}
          min={min}
          max={max}
          step={step}
          placeholder="min"
          onChange={(e) => onFromChange(e.target.value)}
          className="h-7 w-full rounded-md border-0 bg-transparent px-1.5 text-xs text-foreground outline-none placeholder:text-muted-foreground/70 [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
          aria-label={`${label || 'Range'} min`}
        />
        <span className="text-[11px] font-medium text-muted-foreground/70">–</span>
        <input
          type="number"
          inputMode="decimal"
          value={to}
          min={min}
          max={max}
          step={step}
          placeholder="max"
          onChange={(e) => onToChange(e.target.value)}
          className="h-7 w-full rounded-md border-0 bg-transparent px-1.5 text-xs text-foreground outline-none placeholder:text-muted-foreground/70 [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
          aria-label={`${label || 'Range'} max`}
        />
      </div>
      {isInvalid ? (
        <p className="text-[11px] text-destructive">Min is greater than max.</p>
      ) : null}
    </div>
  )
}

export function TextFilterPanel({
  open,
  filters,
  onChange,
  onClear,
  onClose,
  isAnyActive,
  activeCount,
}) {
  const txt = (key, placeholder) => (
    <TextFilter
      value={filters[key]}
      onCommit={(v) => onChange(key, v)}
      placeholder={placeholder}
    />
  )

  return (
    <FilterPanel
      open={open}
      title="Filter texts"
      description="All filters apply across the texts in this project. Combine sections to drill down — every chip below the panel can be cleared individually."
      count={activeCount}
      onClear={isAnyActive ? onClear : null}
      onClose={onClose}
    >
      {/* Classification — what kind of piece this is */}
      <FilterSection icon={FileText} label="Classification" columns={3}>
        <FilterField label="Status">{txt('textStatus', '')}</FilterField>
        <FilterField label="Version">{txt('textVersion', 'RAW / MASTER')}</FilterField>
        <FilterField label="Document type">{txt('documentType', 'book / letter / journal')}</FilterField>
        <FilterField label="Audience">{txt('audience', '')}</FilterField>
      </FilterSection>

      {/* Identifiers — text-specific bits */}
      <FilterSection icon={Hash} label="Identifiers" columns={2}>
        <FilterField label="ISBN">{txt('isbn', '978-…')}</FilterField>
        <FilterField label="Assignment #">{txt('assignmentNumber', '')}</FilterField>
      </FilterSection>

      {/* Language */}
      <FilterSection icon={Languages} label="Language" columns={3}>
        <FilterField label="Language">{txt('language', 'Kurdish')}</FilterField>
        <FilterField label="Dialect">{txt('dialect', 'Sorani')}</FilterField>
        <FilterField label="Script">{txt('script', 'Latin / Arabic')}</FilterField>
      </FilterSection>

      {/* Format — file + physical format */}
      <FilterSection icon={BookOpen} label="Format" columns={3}>
        <FilterField label="File extension">{txt('extension', 'pdf / epub')}</FilterField>
        <FilterField label="Orientation">{txt('orientation', 'portrait')}</FilterField>
        <FilterField label="Size">{txt('size', '')}</FilterField>
        <FilterField label="Physical dimensions">{txt('physicalDimensions', '21x29.7cm')}</FilterField>
      </FilterSection>

      {/* Edition — bibliographic edition slot */}
      <FilterSection icon={Library} label="Edition" columns={3}>
        <FilterField label="Edition">{txt('edition', '2nd')}</FilterField>
        <FilterField label="Volume">{txt('volume', '')}</FilterField>
        <FilterField label="Series">{txt('series', '')}</FilterField>
      </FilterSection>

      {/* Versioning — numeric ranges */}
      <FilterSection icon={Sparkles} label="Versioning" columns={2}>
        <NumericRangeField
          label="Version number"
          from={filters.versionNumberMin}
          to={filters.versionNumberMax}
          min={0}
          onFromChange={(v) => onChange('versionNumberMin', v)}
          onToChange={(v) => onChange('versionNumberMax', v)}
        />
        <NumericRangeField
          label="Copy number"
          from={filters.copyNumberMin}
          to={filters.copyNumberMax}
          min={0}
          onFromChange={(v) => onChange('copyNumberMin', v)}
          onToChange={(v) => onChange('copyNumberMax', v)}
        />
      </FilterSection>

      {/* Pages — text-specific numeric range */}
      <FilterSection icon={Hash} label="Pages" columns={1}>
        <NumericRangeField
          label="Page count"
          from={filters.pageCountMin}
          to={filters.pageCountMax}
          min={0}
          onFromChange={(v) => onChange('pageCountMin', v)}
          onToChange={(v) => onChange('pageCountMax', v)}
        />
      </FilterSection>

      {/* People — author / contributors / printer (contains) */}
      <FilterSection icon={Users} label="People" columns={2}>
        <FilterField label="Author" hint="contains">{txt('author', 'name…')}</FilterField>
        <FilterField label="Contributors" hint="contains">{txt('contributors', 'name…')}</FilterField>
        <FilterField label="Printer / printing house" hint="contains" span="full">{txt('printingHouse', '')}</FilterField>
      </FilterSection>

      {/* Discovery — subjects, genres, tags, keywords */}
      <FilterSection icon={Tag} label="Discovery" columns={1}>
        <MultiValueFilter
          label="Subject"
          placeholder="Type a subject and press Enter…"
          values={filters.subject}
          matchMode={filters.subjectMatch}
          onValuesChange={(next) => onChange('subject', next)}
          onMatchChange={(next) => onChange('subjectMatch', next)}
          helpText={
            <>
              <span className="font-mono">any</span> matches texts tagged with at least one;{' '}
              <span className="font-mono">all</span> requires every subject.
            </>
          }
        />
        <MultiValueFilter
          label="Genre"
          placeholder="Type a genre and press Enter…"
          values={filters.genre}
          matchMode={filters.genreMatch}
          onValuesChange={(next) => onChange('genre', next)}
          onMatchChange={(next) => onChange('genreMatch', next)}
        />
        <MultiValueFilter
          label="Tags"
          placeholder="Type a tag and press Enter…"
          values={filters.tags}
          matchMode={filters.tagMatch}
          onValuesChange={(next) => onChange('tags', next)}
          onMatchChange={(next) => onChange('tagMatch', next)}
        />
        <MultiValueFilter
          label="Keywords"
          placeholder="Type a keyword and press Enter…"
          values={filters.keywords}
          matchMode={filters.keywordMatch}
          onValuesChange={(next) => onChange('keywords', next)}
          onMatchChange={(next) => onChange('keywordMatch', next)}
        />
      </FilterSection>

      {/* Catalog */}
      <FilterSection icon={Database} label="Catalog" columns={3}>
        <FilterField label="LCC classification">{txt('lccClassification', '')}</FilterField>
        <FilterField label="Accrual method">{txt('accrualMethod', '')}</FilterField>
        <FilterField label="Availability">{txt('availability', '')}</FilterField>
        <FilterField label="Cataloging" hint="contains">{txt('archiveCataloging', '')}</FilterField>
        <FilterField label="Physical label" hint="contains">{txt('physicalLabel', '')}</FilterField>
        <FilterField label="Archive room" hint="contains">{txt('locationInArchiveRoom', '')}</FilterField>
        <FilterField label="Physical copy" span="full">
          <SegmentedControl
            value={filters.physicalAvailability}
            onChange={(v) => onChange('physicalAvailability', v)}
            ariaLabel="Physical availability"
            fullWidth
            options={[
              { value: '', label: 'Any' },
              { value: 'true', label: 'Has physical copy' },
              { value: 'false', label: 'Digital only' },
            ]}
          />
        </FilterField>
      </FilterSection>

      {/* Rights */}
      <FilterSection icon={Scale} label="Rights" columns={3}>
        <FilterField label="License type">{txt('licenseType', 'CC-BY')}</FilterField>
        <FilterField label="Owner">{txt('owner', '')}</FilterField>
        <FilterField label="Publisher">{txt('publisher', '')}</FilterField>
        <FilterField label="Copyright">{txt('copyright', '')}</FilterField>
        <FilterField label="Right owner">{txt('rightOwner', '')}</FilterField>
        <FilterField label="Usage rights">{txt('usageRights', '')}</FilterField>
        <FilterField label="Provenance" span="full">{txt('provenance', '')}</FilterField>
      </FilterSection>

      {/* Description / Note + transcription */}
      <FilterSection icon={Notebook} label="Description / Note" columns={1}>
        <FilterField label="Description" hint="contains">{txt('description', 'word from the description…')}</FilterField>
        <FilterField label="Transcription" hint="contains">{txt('transcription', 'word from the transcription…')}</FilterField>
        <FilterField label="Note" hint="contains">{txt('note', 'word from the note…')}</FilterField>
      </FilterSection>

      {/* Lifecycle — entity-side dates including printDate */}
      <FilterSection icon={Calendar} label="Lifecycle" columns={2}>
        <DateRangeField
          label="Created date"
          from={filters.dateCreatedFrom}
          to={filters.dateCreatedTo}
          onFromChange={(v) => onChange('dateCreatedFrom', v)}
          onToChange={(v) => onChange('dateCreatedTo', v)}
        />
        <DateRangeField
          label="Print date"
          from={filters.printDateFrom}
          to={filters.printDateTo}
          onFromChange={(v) => onChange('printDateFrom', v)}
          onToChange={(v) => onChange('printDateTo', v)}
        />
        <DateRangeField
          label="Published"
          from={filters.datePublishedFrom}
          to={filters.datePublishedTo}
          onFromChange={(v) => onChange('datePublishedFrom', v)}
          onToChange={(v) => onChange('datePublishedTo', v)}
        />
        <DateRangeField
          label="Modified"
          from={filters.dateModifiedFrom}
          to={filters.dateModifiedTo}
          onFromChange={(v) => onChange('dateModifiedFrom', v)}
          onToChange={(v) => onChange('dateModifiedTo', v)}
        />
        <DateRangeField
          label="Copyrighted"
          from={filters.dateCopyrightedFrom}
          to={filters.dateCopyrightedTo}
          onFromChange={(v) => onChange('dateCopyrightedFrom', v)}
          onToChange={(v) => onChange('dateCopyrightedTo', v)}
        />
      </FilterSection>

      {/* Activity — audit dates */}
      <FilterSection icon={CalendarClock} label="Activity" columns={2}>
        <DateRangeField
          label="Created in archive"
          from={filters.createdFrom}
          to={filters.createdTo}
          onFromChange={(v) => onChange('createdFrom', v)}
          onToChange={(v) => onChange('createdTo', v)}
        />
        <DateRangeField
          label="Last updated"
          from={filters.updatedFrom}
          to={filters.updatedTo}
          onFromChange={(v) => onChange('updatedFrom', v)}
          onToChange={(v) => onChange('updatedTo', v)}
        />
      </FilterSection>
    </FilterPanel>
  )
}
