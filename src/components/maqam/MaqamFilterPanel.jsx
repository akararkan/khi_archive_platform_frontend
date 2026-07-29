import { CalendarClock, FileText, Headphones, Music4, Users } from 'lucide-react'

import {
  DateRangeField,
  FilterField,
  FilterPanel,
  FilterSection,
  NumberRangeField,
  SegmentedControl,
  TextFilter,
} from '@/components/ui/list-filters'
import { ASSIGNMENT_OPTIONS, VOTE_STATUS_OPTIONS } from '@/pages/employee/maqam-filters'

// The Maqam filter panel — same scaffolding as PersonFilterPanel so the entity
// reads as one of the family rather than a bespoke screen. State, params and
// chips all live in pages/employee/maqam-filters.js; this is presentation only.
// Both the employee and admin Maqam pages render it.
export function MaqamFilterPanel({ open, filters, onChange, onClear, onClose, isAnyActive, activeCount }) {
  return (
    <FilterPanel
      open={open}
      title="Filter maqam records"
      description="Narrow the list by record details, teacher panel state, audio length or activity dates."
      count={activeCount}
      onClear={isAnyActive ? onClear : null}
      onClose={onClose}
    >
      <FilterSection icon={Music4} label="Record" columns={3}>
        <FilterField label="Song" htmlFor="maqam-filter-song">
          <TextFilter
            id="maqam-filter-song"
            value={filters.songName}
            onCommit={(v) => onChange('songName', v)}
            placeholder="Song name contains…"
          />
        </FilterField>
        <FilterField label="Singer" htmlFor="maqam-filter-producer">
          <TextFilter
            id="maqam-filter-producer"
            value={filters.producer}
            onCommit={(v) => onChange('producer', v)}
            placeholder="Singer contains…"
          />
        </FilterField>
        <FilterField label="Code" htmlFor="maqam-filter-code">
          <TextFilter
            id="maqam-filter-code"
            value={filters.maqamCode}
            onCommit={(v) => onChange('maqamCode', v)}
            placeholder="MAQAM_000123"
          />
        </FilterField>
      </FilterSection>

      <FilterSection icon={Users} label="Teacher panel" columns={2}>
        <FilterField label="Assignment">
          <SegmentedControl
            value={filters.assignmentStatus}
            onChange={(v) => onChange('assignmentStatus', v)}
            options={ASSIGNMENT_OPTIONS}
            ariaLabel="Panel assignment"
            fullWidth
          />
        </FilterField>
        <FilterField label="Voting progress">
          <SegmentedControl
            value={filters.voteStatus}
            onChange={(v) => onChange('voteStatus', v)}
            options={VOTE_STATUS_OPTIONS}
            ariaLabel="Voting progress"
            fullWidth
          />
        </FilterField>
        <FilterField label="Maqam type" hint="any panel member voted it" htmlFor="maqam-filter-type">
          <TextFilter
            id="maqam-filter-type"
            value={filters.maqamType}
            onCommit={(v) => onChange('maqamType', v)}
            placeholder="e.g. Hoseyni"
          />
        </FilterField>
        <FilterField label="Teacher" htmlFor="maqam-filter-teacher">
          <TextFilter
            id="maqam-filter-teacher"
            value={filters.teacherUsername}
            onCommit={(v) => onChange('teacherUsername', v)}
            placeholder="Username contains…"
          />
        </FilterField>
      </FilterSection>

      <FilterSection icon={Headphones} label="Audio" columns={2}>
        <NumberRangeField
          label="Duration"
          hint="seconds"
          min={filters.durationSecondsMin}
          max={filters.durationSecondsMax}
          onMinChange={(v) => onChange('durationSecondsMin', v)}
          onMaxChange={(v) => onChange('durationSecondsMax', v)}
          icon={Headphones}
        />
        <FilterField label="Audio file name" htmlFor="maqam-filter-audio">
          <TextFilter
            id="maqam-filter-audio"
            value={filters.audioFileName}
            onCommit={(v) => onChange('audioFileName', v)}
            placeholder="File name contains…"
          />
        </FilterField>
      </FilterSection>

      <FilterSection icon={FileText} label="Notes" columns={1}>
        <FilterField label="Archive note" htmlFor="maqam-filter-note">
          <TextFilter
            id="maqam-filter-note"
            value={filters.archiveNote}
            onCommit={(v) => onChange('archiveNote', v)}
            placeholder="Archive note contains…"
          />
        </FilterField>
      </FilterSection>

      <FilterSection icon={CalendarClock} label="Activity" columns={2}>
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
