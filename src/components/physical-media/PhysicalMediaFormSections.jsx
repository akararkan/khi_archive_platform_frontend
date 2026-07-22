import { Loader2 } from 'lucide-react'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { FieldHelpButton } from '@/components/ui/field-help'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { Select } from '@/components/ui/select'
import { TagsInput } from '@/components/ui/tags-input'
import { TagSuggestInput } from '@/components/ui/tag-suggest-input'
import { VocabInput } from '@/components/ui/vocab-input'
import { hasVocabulary } from '@/lib/controlled-vocabulary'
import { cn } from '@/lib/utils'
import { getPhysicalMediaFieldMetadata } from '@/lib/physical-media-fields-metadata'
import { DIGITIZATION_OPTIONS, NEED_TO_CLEAR_OPTIONS } from '@/lib/physical-media-form'

const TEXTAREA_CLASS =
  'min-h-[88px] w-full resize-y rounded-lg border border-input bg-background px-3 py-2 text-sm shadow-sm transition-colors placeholder:text-muted-foreground/70 focus-visible:border-ring focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/30'

const ADD_TYPE_SENTINEL = '__add_type__'

// ── Module-level field components (NOT defined inside the form, so typing in an
//    input never remounts it / loses focus) ──────────────────────────────────

// Label row (label + `?` help) shared by every field.
function FieldRow({ id, label, fieldKey, required, children }) {
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between gap-2">
        <Label htmlFor={id}>
          {label}
          {required ? <span className="text-destructive"> *</span> : null}
        </Label>
        <FieldHelpButton metadata={getPhysicalMediaFieldMetadata(fieldKey)} />
      </div>
      {children}
    </div>
  )
}

// Fields that have an agreed value list (owner, and anything added to
// controlled-vocabulary.js later) get the preset dropdown for free; everything
// else stays a plain text box.
function TextField({ k, label, required, placeholder, mono, value, onText }) {
  return (
    <FieldRow id={`pm-${k}`} label={label} fieldKey={k} required={required}>
      {hasVocabulary(k) ? (
        <VocabInput
          id={`pm-${k}`}
          field={k}
          value={value}
          onChange={(next) => onText(k, next)}
          placeholder={placeholder}
          className={cn(mono && 'font-mono tracking-wide')}
        />
      ) : (
        <Input
          id={`pm-${k}`}
          value={value}
          onChange={(e) => onText(k, e.target.value)}
          placeholder={placeholder}
          className={cn(mono && 'font-mono tracking-wide')}
        />
      )}
    </FieldRow>
  )
}

// Split a stored comma-string ("a, b, c") into chip values, and join chips back
// into the same delimited string the API expects. Storage stays a single string
// (TEXT_FIELDS in physical-media-form.js) — only the editing UI becomes chips.
const splitChips = (str) =>
  String(str ?? '')
    .split(/[,،;]/)
    .map((s) => s.trim())
    .filter(Boolean)

const joinChips = (arr) => (Array.isArray(arr) ? arr.join(', ') : '')

// Comma-separated multi-value field rendered as removable chips via the shared
// TagsInput, so values are added with Enter OR comma and Enter never submits the
// surrounding pm-form. `suggest` swaps in TagSuggestInput (tag autocomplete) for
// the tags field, matching Audio/Video/Image/Text/Project tags.
function ChipField({ k, label, fieldKey, placeholder, value, onText, suggest }) {
  const Comp = suggest ? TagSuggestInput : TagsInput
  return (
    <FieldRow id={`pm-${k}`} label={label} fieldKey={fieldKey || k}>
      <Comp
        id={`pm-${k}`}
        value={splitChips(value)}
        onChange={(arr) => onText(k, joinChips(arr))}
        placeholder={placeholder}
      />
    </FieldRow>
  )
}

function NumberField({ k, label, placeholder, value, onText, hint }) {
  return (
    <FieldRow id={`pm-${k}`} label={label} fieldKey={k}>
      <Input
        id={`pm-${k}`}
        type="number"
        inputMode="numeric"
        value={value}
        onChange={(e) => onText(k, e.target.value)}
        placeholder={placeholder}
      />
      {hint ? <p className="text-[11px] text-muted-foreground">{hint}</p> : null}
    </FieldRow>
  )
}

function TextAreaField({ k, label, value, onText, placeholder }) {
  return (
    <FieldRow id={`pm-${k}`} label={label} fieldKey={k}>
      <textarea
        id={`pm-${k}`}
        value={value}
        onChange={(e) => onText(k, e.target.value)}
        className={TEXTAREA_CLASS}
        placeholder={placeholder}
      />
    </FieldRow>
  )
}

// Catalog-bound type dropdown. Picking a type autofills the 9 technical fields
// (handled by the page via onSelect); a trailing "+ Add new type" entry (admin
// only) opens the create-type modal.
function TypeSelectField({ value, types, onSelect, onAddType, canManageTypes }) {
  const known = types.some((t) => t.name === value)
  return (
    <FieldRow id="pm-physicalMediaType" label="Physical media type" fieldKey="physicalMediaType">
      <Select
        id="pm-physicalMediaType"
        value={value || ''}
        onChange={(v) => {
          if (v === ADD_TYPE_SENTINEL) {
            onAddType?.()
            return
          }
          onSelect(v)
        }}
        placeholder="Select a type…"
        className="w-full"
        options={[
          // keep an unknown stamped value (e.g. an edited legacy row) selectable
          ...(!known && value ? [{ value, label: value }] : []),
          ...types.map((t) => ({ value: t.name, label: t.name })),
          ...(canManageTypes ? [{ value: ADD_TYPE_SENTINEL, label: '+ Add new type…' }] : []),
        ]}
      />
      {types.length === 0 ? <p className="text-[11px] text-muted-foreground">Loading types…</p> : null}
    </FieldRow>
  )
}

// Inventory number is never typed: the server mints it per type under a lock
// (Audio Cassette 101 while VHS is 56). On create we show the previewed next
// number — a hint, not a reservation, so two people adding at once both see
// "101" and the authoritative value comes back in the create response. On edit
// we show the stamped value. Either way it is display-only.
function InventoryNumberField({ mode, value, loading, hasType }) {
  const creating = mode === 'create'
  const shown = value == null || value === '' ? '' : String(value)
  return (
    <FieldRow label={creating ? 'New inventory number' : 'Inventory number'} fieldKey="inventoryNumber">
      {/* No input, so no htmlFor target — this is a value readout, not a field. */}
      <div className="flex h-8 w-full items-center gap-2 rounded-lg border border-dashed border-input bg-muted/40 px-2.5 text-sm">
        {loading ? (
          <>
            <Loader2 className="size-3.5 shrink-0 animate-spin text-muted-foreground" />
            <span className="text-muted-foreground">Checking…</span>
          </>
        ) : shown ? (
          <span className="font-mono tabular-nums text-foreground">{shown}</span>
        ) : (
          <span className="text-muted-foreground">
            {creating && !hasType ? 'Select a type first' : '—'}
          </span>
        )}
      </div>
      <p className="text-[11px] text-muted-foreground">
        {creating
          ? 'Assigned automatically on save — the final number comes from the server.'
          : 'System-assigned — not editable.'}
      </p>
    </FieldRow>
  )
}

// Segmented button group for the encoded enum / tri-state boolean fields.
function ChoiceGroup({ value, onChange, options }) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {options.map((o) => (
        <Button
          key={o.value || 'unknown'}
          type="button"
          size="sm"
          variant={value === o.value ? 'default' : 'outline'}
          className={cn(value !== o.value && 'text-foreground/70')}
          onClick={() => onChange(o.value)}
        >
          {o.label}
        </Button>
      ))}
    </div>
  )
}

function PhysicalMediaFormSections({
  form,
  setForm,
  types = [],
  onTypeSelect,
  onAddType,
  canManageTypes = false,
  mode = 'create',
  inventoryNumber = null,
  inventoryNumberLoading = false,
}) {
  const onText = (key, value) => setForm((f) => ({ ...f, [key]: value }))

  return (
    <div className="space-y-5">
      {/* Identity & classification */}
      <Card className="border-border bg-card shadow-sm shadow-black/5">
        <CardHeader className="border-b border-border pb-4">
          <CardTitle className="text-base font-semibold">Identity &amp; classification</CardTitle>
          <CardDescription>Fill in whatever you have — blank or partial records are accepted.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 pt-5 sm:grid-cols-2">
          <TypeSelectField
            value={form.physicalMediaType}
            types={types}
            onSelect={(name) => onTypeSelect?.(name)}
            onAddType={onAddType}
            canManageTypes={canManageTypes}
          />
          <InventoryNumberField
            mode={mode}
            value={inventoryNumber}
            loading={inventoryNumberLoading}
            hasType={Boolean(String(form.physicalMediaType ?? '').trim())}
          />
          <TextField k="mediaCategory" label="Media category" placeholder="e.g. Music" value={form.mediaCategory} onText={onText} />
          <TextField k="title" label="Title" placeholder="Artefact title" value={form.title} onText={onText} />
          <TextField k="physicalLabel" label="Physical label" mono placeholder="Sticker code on the item" value={form.physicalLabel} onText={onText} />
          <TextField k="physicalSize" label="Physical Size" placeholder="Big / Medium / Normal / Small" value={form.physicalSize} onText={onText} />
          <NumberField k="rowNumber" label="Row number (sheet)" placeholder="e.g. 3" value={form.rowNumber} onText={onText} />
        </CardContent>
      </Card>

      {/* Content */}
      <Card className="border-border bg-card shadow-sm shadow-black/5">
        <CardHeader className="border-b border-border pb-4">
          <CardTitle className="text-base font-semibold">Content</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 pt-5">
          <TextAreaField k="content" label="Content" value={form.content} onText={onText} placeholder="What is recorded on this item?" />
          <div className="grid gap-4 sm:grid-cols-2">
            <TextField k="owner" label="Owner" placeholder="Original owner / source" value={form.owner} onText={onText} />
            <NumberField k="year" label="Year" placeholder="e.g. 1985" value={form.year} onText={onText} />
            <NumberField k="durationMin" label="Duration (minutes)" placeholder="e.g. 60" value={form.durationMin} onText={onText} />
            <NumberField k="trackNumbers" label="Track count" placeholder="e.g. 12" value={form.trackNumbers} onText={onText} />
            <ChipField k="trackName" label="Track name(s)" placeholder="Type a track name, then Enter or comma…" value={form.trackName} onText={onText} />
            <ChipField k="tags" label="Tags" placeholder="Type a tag, then Enter or comma…" value={form.tags} onText={onText} suggest />
          </div>
        </CardContent>
      </Card>

      {/* Digitization */}
      <Card className="border-border bg-card shadow-sm shadow-black/5">
        <CardHeader className="border-b border-border pb-4">
          <CardTitle className="text-base font-semibold">Digitization</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 pt-5 sm:grid-cols-2">
          <FieldRow id="pm-digitization" label="Digitization status" fieldKey="digitization">
            <ChoiceGroup value={form.digitization} onChange={(v) => onText('digitization', v)} options={DIGITIZATION_OPTIONS} />
          </FieldRow>
          <FieldRow id="pm-needToClear" label="Need to clear" fieldKey="needToClear">
            <ChoiceGroup value={form.needToClear} onChange={(v) => onText('needToClear', v)} options={NEED_TO_CLEAR_OPTIONS} />
          </FieldRow>
          <FieldRow id="pm-digitizeDate" label="Digitize date" fieldKey="digitizeDate">
            <Input id="pm-digitizeDate" type="date" value={form.digitizeDate} onChange={(e) => onText('digitizeDate', e.target.value)} />
          </FieldRow>
        </CardContent>
      </Card>

      {/* Technical specifications */}
      <Card className="border-border bg-card shadow-sm shadow-black/5">
        <CardHeader className="border-b border-border pb-4">
          <CardTitle className="text-base font-semibold">Technical specifications</CardTitle>
          <CardDescription>Capture / digitisation chain details. All optional.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 pt-5 sm:grid-cols-2">
          <TextField k="extension" label="Extension" placeholder="e.g. wav, mp4" value={form.extension} onText={onText} />
          <TextField k="formatCodec" label="Format / codec" placeholder="e.g. PCM, H.264" value={form.formatCodec} onText={onText} />
          <TextField k="sizeGB" label="Size GB" placeholder="e.g. 4.7, 4.7 GB, 700 MB" value={form.sizeGB} onText={onText} />
          <TextField k="bitOrColorDepth" label="Bit Depth / Color Depth" placeholder="e.g. 24-bit" value={form.bitOrColorDepth} onText={onText} />
          <TextField k="sampleOrFrameRate" label="Sample Rate kHz / Frame Rate FPS" placeholder="e.g. 48 kHz, 25 fps" value={form.sampleOrFrameRate} onText={onText} />
          <TextField k="channelsOrResolution" label="Channels / resolution" placeholder="e.g. Stereo, 1080p" value={form.channelsOrResolution} onText={onText} />
          <TextField k="playbackModel" label="Playback model" placeholder="Deck / player model" value={form.playbackModel} onText={onText} />
          <TextField k="captureInterface" label="Capture interface" placeholder="e.g. SDI, HDMI" value={form.captureInterface} onText={onText} />
          <TextField k="signalInterface" label="Signal interface (cable)" placeholder="e.g. XLR, RCA" value={form.signalInterface} onText={onText} />
          <TextField k="ingestSoftware" label="Ingest software" placeholder="e.g. Audacity" value={form.ingestSoftware} onText={onText} />
        </CardContent>
      </Card>

      {/* Notes */}
      <Card className="border-border bg-card shadow-sm shadow-black/5">
        <CardHeader className="border-b border-border pb-4">
          <CardTitle className="text-base font-semibold">Notes</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 pt-5 sm:grid-cols-2">
          <TextAreaField k="archiveDepNote" label="Archive dept. note" value={form.archiveDepNote} onText={onText} placeholder="Internal note from the archive department…" />
          <TextAreaField k="captureDepNote" label="Capture dept. note" value={form.captureDepNote} onText={onText} placeholder="Internal note from the capture department…" />
        </CardContent>
      </Card>
    </div>
  )
}

export { PhysicalMediaFormSections }
