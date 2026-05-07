// Inline expandable filter panel for the audio table inside the
// project detail page. Composed entirely from the shared list-filter
// primitives so the visual language matches Person and Category.
//
// The audio domain has the most filterable fields by far (50+ across
// the backend's AudioFilterParams). We split them into 11 themed
// sections so the panel reads top-down — Classification, Language,
// Place, Technical, Quality & Versioning, People, Discovery,
// Catalog, Rights, Recording / Provenance, Lifecycle, Activity. A
// user looking for "WAV files at 48kHz" finds Technical at a glance;
// someone after "songs Ali Mardan composed in the 1970s" reaches
// People + Lifecycle.

import {
  Calendar,
  CalendarClock,
  Database,
  FileAudio2,
  Languages,
  ListMusic,
  MapPin,
  Mic2,
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

export function AudioFilterPanel({
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
      title="Filter audios"
      description="All filters apply across the audios in this project. Combine sections to drill down — every chip below the panel can be cleared individually."
      count={activeCount}
      onClear={isAnyActive ? onClear : null}
      onClose={onClose}
    >
      {/* Classification — what kind of piece this is */}
      <FilterSection icon={ListMusic} label="Classification" columns={3}>
        <FilterField label="Form">{txt('form', 'song, instrumental…')}</FilterField>
        <FilterField label="Type of basta">{txt('typeOfBasta', '')}</FilterField>
        <FilterField label="Type of maqam">{txt('typeOfMaqam', '')}</FilterField>
        <FilterField label="Composition type">{txt('typeOfComposition', '')}</FilterField>
        <FilterField label="Performance type">{txt('typeOfPerformance', '')}</FilterField>
        <FilterField label="Audience">{txt('audience', '')}</FilterField>
      </FilterSection>

      {/* Language — language and dialect */}
      <FilterSection icon={Languages} label="Language" columns={2}>
        <FilterField label="Language">{txt('language', 'Kurdish')}</FilterField>
        <FilterField label="Dialect">{txt('dialect', 'Sorani')}</FilterField>
      </FilterSection>

      {/* Place — where it was made or recorded */}
      <FilterSection icon={MapPin} label="Place" columns={2}>
        <FilterField label="City">{txt('city', 'Sulaimani')}</FilterField>
        <FilterField label="Region">{txt('region', '')}</FilterField>
      </FilterSection>

      {/* Technical — the bytes themselves */}
      <FilterSection icon={FileAudio2} label="Technical" columns={3}>
        <FilterField label="Audio channel">{txt('audioChannel', 'mono / stereo')}</FilterField>
        <FilterField label="File extension">{txt('fileExtension', 'wav')}</FilterField>
        <FilterField label="Sample rate">{txt('sampleRate', '48000')}</FilterField>
        <FilterField label="Bit depth">{txt('bitDepth', '24')}</FilterField>
        <FilterField label="Bit rate">{txt('bitRate', '')}</FilterField>
      </FilterSection>

      {/* Quality & Versioning — numeric ranges */}
      <FilterSection icon={Sparkles} label="Quality & Versioning" columns={3}>
        <NumericRangeField
          label="Quality"
          hint="0 – 10"
          from={filters.audioQualityMin}
          to={filters.audioQualityMax}
          min={0}
          max={10}
          onFromChange={(v) => onChange('audioQualityMin', v)}
          onToChange={(v) => onChange('audioQualityMax', v)}
        />
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

      {/* People — speaker/producer/composer/poet (contains) +
          contributors as a multi-value any/all match */}
      <FilterSection icon={Users} label="People" columns={2}>
        <FilterField label="Speaker">{txt('speaker', 'name…')}</FilterField>
        <FilterField label="Producer">{txt('producer', 'name…')}</FilterField>
        <FilterField label="Composer">{txt('composer', 'name…')}</FilterField>
        <FilterField label="Poet">{txt('poet', 'name…')}</FilterField>
        <div className="sm:col-span-2">
          <MultiValueFilter
            label="Contributors"
            placeholder="Type a contributor name and press Enter…"
            values={filters.contributors}
            matchMode={filters.contributorMatch}
            onValuesChange={(next) => onChange('contributors', next)}
            onMatchChange={(next) => onChange('contributorMatch', next)}
            helpText={
              <>
                <span className="font-mono">any</span> matches audios crediting at least one of the names;{' '}
                <span className="font-mono">all</span> requires every name.
              </>
            }
          />
        </div>
      </FilterSection>

      {/* Discovery — genres, tags, keywords with any/all match */}
      <FilterSection icon={Tag} label="Discovery" columns={1}>
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

      {/* Catalog — library-style classification + availability */}
      <FilterSection icon={Database} label="Catalog" columns={3}>
        <FilterField label="LCC classification">{txt('lccClassification', '')}</FilterField>
        <FilterField label="Accrual method">{txt('accrualMethod', '')}</FilterField>
        <FilterField label="Availability">{txt('availability', '')}</FilterField>
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

      {/* Rights — license + ownership + copyright */}
      <FilterSection icon={Scale} label="Rights" columns={3}>
        <FilterField label="License type">{txt('licenseType', 'CC-BY')}</FilterField>
        <FilterField label="Owner">{txt('owner', '')}</FilterField>
        <FilterField label="Publisher">{txt('publisher', '')}</FilterField>
        <FilterField label="Copyright">{txt('copyright', '')}</FilterField>
        <FilterField label="Right owner">{txt('rightOwner', '')}</FilterField>
        <FilterField label="Usage rights">{txt('usageRights', '')}</FilterField>
      </FilterSection>

      {/* Recording / Provenance — venue, archive, digitisation,
          provenance and lyrics in one place */}
      <FilterSection icon={Mic2} label="Recording / Provenance" columns={2}>
        <FilterField label="Recording venue">{txt('recordingVenue', '')}</FilterField>
        <FilterField label="Archive location">{txt('locationArchive', '')}</FilterField>
        <FilterField label="Digitized by">{txt('degitizedBy', '')}</FilterField>
        <FilterField label="Digitization equipment">{txt('degitizationEquipment', '')}</FilterField>
        <FilterField label="Provenance" span="full">{txt('provenance', '')}</FilterField>
        <FilterField label="Lyrics" hint="contains" span="full">{txt('lyrics', 'word from the lyrics…')}</FilterField>
      </FilterSection>

      {/* Lifecycle — entity-side dates (recorded / published /
          modified / copyrighted) */}
      <FilterSection icon={Calendar} label="Lifecycle" columns={2}>
        <DateRangeField
          label="Recording date"
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
