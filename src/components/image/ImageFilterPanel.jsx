// Inline expandable filter panel for the image table inside the
// project detail page. Composed entirely from the shared list-filter
// primitives so the visual language matches Audio, Person, and
// Category.
//
// The image domain has the second-largest filter surface (40+ across
// the backend's ImageFilterParams). We split them into 12 themed
// sections so the panel reads top-down — Classification, Place /
// Event, Technical, Camera, Versioning, People, Discovery, Catalog,
// Rights, Description, Lifecycle, Activity. A user looking for "JPEGs
// shot at 300 DPI on a Nikon" finds Technical + Camera at a glance;
// someone after "photos of the Halabja gathering" reaches Place /
// Event + Discovery.

import {
  Calendar,
  CalendarClock,
  Camera,
  Database,
  FileImage,
  Image as ImageIcon,
  MapPin,
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

export function ImageFilterPanel({
  open,
  filters,
  onChange,
  onClear,
  onClose,
  isAnyActive,
  activeCount,
}) {
  // Convenience binders — every field uses (value, onCommit) for text
  // and (value, onChange) for the rest. Keeping these inline keeps
  // the JSX scannable without sprinkling arrow functions everywhere.
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
      title="Filter images"
      description="All filters apply across the images in this project. Combine sections to drill down — every chip below the panel can be cleared individually."
      count={activeCount}
      onClear={isAnyActive ? onClear : null}
      onClose={onClose}
    >
      {/* Classification — what kind of piece this is */}
      <FilterSection icon={ImageIcon} label="Classification" columns={3}>
        <FilterField label="Form">{txt('form', 'photo, scan…')}</FilterField>
        <FilterField label="Status">{txt('imageStatus', '')}</FilterField>
        <FilterField label="Version">{txt('imageVersion', 'RAW / MASTER')}</FilterField>
        <FilterField label="Audience">{txt('audience', '')}</FilterField>
        <FilterField label="Photostory" hint="contains" span="full">{txt('photostory', '')}</FilterField>
      </FilterSection>

      {/* Place / Event — where it was made or what it depicts */}
      <FilterSection icon={MapPin} label="Place / Event" columns={2}>
        <FilterField label="Event" hint="contains">{txt('event', 'gathering name…')}</FilterField>
        <FilterField label="Location" hint="contains">{txt('location', 'city / region…')}</FilterField>
      </FilterSection>

      {/* Technical — the bytes themselves */}
      <FilterSection icon={FileImage} label="Technical" columns={3}>
        <FilterField label="File extension">{txt('extension', 'jpg / tiff')}</FilterField>
        <FilterField label="Orientation">{txt('orientation', 'landscape')}</FilterField>
        <FilterField label="Dimension">{txt('dimension', '6000x4000')}</FilterField>
        <FilterField label="Bit depth">{txt('bitDepth', '24')}</FilterField>
        <FilterField label="DPI">{txt('dpi', '300')}</FilterField>
      </FilterSection>

      {/* Camera — capture device */}
      <FilterSection icon={Camera} label="Camera" columns={3}>
        <FilterField label="Manufacturer">{txt('manufacturer', 'Nikon')}</FilterField>
        <FilterField label="Model">{txt('model', 'D850')}</FilterField>
        <FilterField label="Lens">{txt('lens', '24-70mm')}</FilterField>
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

      {/* People — creator/contributor (contains) + person shown */}
      <FilterSection icon={Users} label="People" columns={2}>
        <FilterField label="Creator / Photographer">{txt('creatorArtistPhotographer', 'name…')}</FilterField>
        <FilterField label="Contributor">{txt('contributor', 'name…')}</FilterField>
        <FilterField label="Person shown" hint="contains" span="full">{txt('personShownInImage', 'name…')}</FilterField>
      </FilterSection>

      {/* Discovery — subjects, genres, colours, usage, tags, keywords */}
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
              <span className="font-mono">any</span> matches images tagged with at least one;{' '}
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
          label="Color"
          placeholder="Type a colour and press Enter…"
          values={filters.colorOfImage}
          matchMode={filters.colorMatch}
          onValuesChange={(next) => onChange('colorOfImage', next)}
          onMatchChange={(next) => onChange('colorMatch', next)}
        />
        <MultiValueFilter
          label="Used in"
          placeholder="Type a publication / context and press Enter…"
          values={filters.whereThisImageUsed}
          matchMode={filters.usageMatch}
          onValuesChange={(next) => onChange('whereThisImageUsed', next)}
          onMatchChange={(next) => onChange('usageMatch', next)}
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

      {/* Catalog — library-style classification + availability */}
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

      {/* Rights — license + ownership + copyright + provenance */}
      <FilterSection icon={Scale} label="Rights" columns={3}>
        <FilterField label="License type">{txt('licenseType', 'CC-BY')}</FilterField>
        <FilterField label="Owner">{txt('owner', '')}</FilterField>
        <FilterField label="Publisher">{txt('publisher', '')}</FilterField>
        <FilterField label="Copyright">{txt('copyright', '')}</FilterField>
        <FilterField label="Right owner">{txt('rightOwner', '')}</FilterField>
        <FilterField label="Usage rights">{txt('usageRights', '')}</FilterField>
        <FilterField label="Provenance" span="full">{txt('provenance', '')}</FilterField>
      </FilterSection>

      {/* Description / Note — long-form contains */}
      <FilterSection icon={Notebook} label="Description / Note" columns={1}>
        <FilterField label="Description" hint="contains">{txt('description', 'word from the description…')}</FilterField>
        <FilterField label="Note" hint="contains">{txt('note', 'word from the note…')}</FilterField>
      </FilterSection>

      {/* Lifecycle — entity-side dates (capture / published /
          modified / copyrighted) */}
      <FilterSection icon={Calendar} label="Lifecycle" columns={2}>
        <DateRangeField
          label="Capture date"
          from={filters.dateCreatedFrom}
          to={filters.dateCreatedTo}
          onFromChange={(v) => onChange('dateCreatedFrom', v)}
          onToChange={(v) => onChange('dateCreatedTo', v)}
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

      {/* Activity — audit dates (when the *record* was added/edited) */}
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
