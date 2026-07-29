import { Boxes, CalendarClock, HardDrive, Ruler, Tag } from 'lucide-react'

import {
  DateRangeField,
  FilterField,
  FilterPanel,
  FilterSection,
  NumberRangeField,
  SegmentedControl,
  TextFilter,
} from '@/components/ui/list-filters'
import { getVocabularyOptions } from '@/lib/controlled-vocabulary'
import {
  DIGITIZATION_OPTIONS,
  NEED_TO_CLEAR_OPTIONS,
} from '@/pages/employee/physical-media-filters'

// `typeOptions` comes from the page's already-loaded type catalog, so the Type
// box offers the real inventory types instead of asking staff to retype them.
// It stays free text either way — the backend matches case-insensitively.
export function PhysicalMediaFilterPanel({
  open,
  filters,
  onChange,
  onClear,
  onClose,
  isAnyActive,
  activeCount,
  typeOptions = [],
}) {
  return (
    <FilterPanel
      open={open}
      title="Filter physical media"
      description="Narrow the inventory by classification, digitisation state, identity, measurements or activity dates."
      count={activeCount}
      onClear={isAnyActive ? onClear : null}
      onClose={onClose}
    >
      <FilterSection icon={Boxes} label="Classification" columns={3}>
        <FilterField label="Type" htmlFor="pm-filter-type">
          <TextFilter
            id="pm-filter-type"
            value={filters.physicalMediaType}
            onCommit={(v) => onChange('physicalMediaType', v)}
            options={typeOptions}
            placeholder="Cassette, Reel, DVD…"
          />
        </FilterField>
        <FilterField label="Category" htmlFor="pm-filter-category">
          <TextFilter
            id="pm-filter-category"
            value={filters.mediaCategory}
            onCommit={(v) => onChange('mediaCategory', v)}
            placeholder="Audio, Video…"
          />
        </FilterField>
        <FilterField label="Physical size" htmlFor="pm-filter-size">
          <TextFilter
            id="pm-filter-size"
            value={filters.physicalSize}
            onCommit={(v) => onChange('physicalSize', v)}
            options={getVocabularyOptions('physicalSize')}
            placeholder="Big, Medium, Small…"
          />
        </FilterField>
        <FilterField label="Digitisation" span="wide">
          <SegmentedControl
            value={filters.digitization}
            onChange={(v) => onChange('digitization', v)}
            options={DIGITIZATION_OPTIONS}
            ariaLabel="Digitisation state"
            fullWidth
          />
        </FilterField>
        <FilterField label="Clearing">
          <SegmentedControl
            value={filters.needToClear}
            onChange={(v) => onChange('needToClear', v)}
            options={NEED_TO_CLEAR_OPTIONS}
            ariaLabel="Needs clearing"
            fullWidth
          />
        </FilterField>
      </FilterSection>

      <FilterSection icon={Tag} label="Identity" columns={3}>
        <FilterField label="Code" htmlFor="pm-filter-code">
          <TextFilter
            id="pm-filter-code"
            value={filters.pmCode}
            onCommit={(v) => onChange('pmCode', v)}
            placeholder="PM_000123"
          />
        </FilterField>
        <FilterField label="Title" htmlFor="pm-filter-title">
          <TextFilter
            id="pm-filter-title"
            value={filters.title}
            onCommit={(v) => onChange('title', v)}
            placeholder="Title contains…"
          />
        </FilterField>
        <FilterField label="Physical label" htmlFor="pm-filter-label">
          <TextFilter
            id="pm-filter-label"
            value={filters.physicalLabel}
            onCommit={(v) => onChange('physicalLabel', v)}
            placeholder="Label contains…"
          />
        </FilterField>
        <FilterField label="Owner" htmlFor="pm-filter-owner">
          <TextFilter
            id="pm-filter-owner"
            value={filters.owner}
            onCommit={(v) => onChange('owner', v)}
            placeholder="Owner contains…"
          />
        </FilterField>
        <FilterField label="Tags" htmlFor="pm-filter-tags">
          <TextFilter
            id="pm-filter-tags"
            value={filters.tags}
            onCommit={(v) => onChange('tags', v)}
            placeholder="Tag contains…"
          />
        </FilterField>
        <FilterField label="Content" htmlFor="pm-filter-content">
          <TextFilter
            id="pm-filter-content"
            value={filters.content}
            onCommit={(v) => onChange('content', v)}
            placeholder="Content contains…"
          />
        </FilterField>
      </FilterSection>

      <FilterSection icon={Ruler} label="Measurements" columns={3}>
        <NumberRangeField
          label="Year"
          min={filters.yearMin}
          max={filters.yearMax}
          onMinChange={(v) => onChange('yearMin', v)}
          onMaxChange={(v) => onChange('yearMax', v)}
          minPlaceholder="1970"
          maxPlaceholder="1999"
        />
        <NumberRangeField
          label="Duration"
          hint="minutes"
          min={filters.durationMinutesMin}
          max={filters.durationMinutesMax}
          onMinChange={(v) => onChange('durationMinutesMin', v)}
          onMaxChange={(v) => onChange('durationMinutesMax', v)}
        />
        <NumberRangeField
          label="Inventory №"
          min={filters.inventoryNumberMin}
          max={filters.inventoryNumberMax}
          onMinChange={(v) => onChange('inventoryNumberMin', v)}
          onMaxChange={(v) => onChange('inventoryNumberMax', v)}
        />
      </FilterSection>

      <FilterSection icon={HardDrive} label="Digital file" columns={2}>
        <FilterField label="Extension" htmlFor="pm-filter-ext">
          <TextFilter
            id="pm-filter-ext"
            value={filters.extension}
            onCommit={(v) => onChange('extension', v)}
            placeholder="wav, mp4…"
          />
        </FilterField>
        <FilterField label="Format / codec" htmlFor="pm-filter-codec">
          <TextFilter
            id="pm-filter-codec"
            value={filters.formatCodec}
            onCommit={(v) => onChange('formatCodec', v)}
            placeholder="PCM, H.264…"
          />
        </FilterField>
      </FilterSection>

      <FilterSection icon={CalendarClock} label="Activity" columns={3}>
        <DateRangeField
          label="Digitised"
          from={filters.digitizeDateFrom}
          to={filters.digitizeDateTo}
          onFromChange={(v) => onChange('digitizeDateFrom', v)}
          onToChange={(v) => onChange('digitizeDateTo', v)}
        />
        <DateRangeField
          label="Created"
          from={filters.createdFrom}
          to={filters.createdTo}
          onFromChange={(v) => onChange('createdFrom', v)}
          onToChange={(v) => onChange('createdTo', v)}
        />
        <DateRangeField
          label="Updated"
          from={filters.updatedFrom}
          to={filters.updatedTo}
          onFromChange={(v) => onChange('updatedFrom', v)}
          onToChange={(v) => onChange('updatedTo', v)}
        />
      </FilterSection>
    </FilterPanel>
  )
}
