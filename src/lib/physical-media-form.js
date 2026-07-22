// Form helpers for the physical-media create/edit form, mirroring the shape of
// src/lib/image-form.js (createInitial* / populate* / build payload).
//
// Every one of the spreadsheet's columns maps to a field here. Two columns are
// encoded:
//   - digitization → DigitizationStatus enum ('' = unknown)
//   - needToClear  → tri-state boolean ('' = unknown, 'false', 'true')

function trimOrNull(value) {
  if (value == null) return null
  const trimmed = String(value).trim()
  return trimmed === '' ? null : trimmed
}

// Parse an integer-ish field; blank/invalid → null.
function intOrNull(value) {
  if (value == null || String(value).trim() === '') return null
  const n = Number.parseInt(String(value).trim(), 10)
  return Number.isFinite(n) ? n : null
}

// ── Encoded-field option sets (drive the form's button groups) ────────────────

// digitization — DigitizationStatus enum. '' is the unknown/null choice.
export const DIGITIZATION_OPTIONS = [
  { value: '', label: 'Unknown' },
  { value: 'NOT_DIGITIZED', label: 'Not digitized' },
  { value: 'DIGITIZED', label: 'Digitized' },
  { value: 'DUPLICATED', label: 'Duplicated' },
]

export const DIGITIZATION_LABELS = {
  NOT_DIGITIZED: 'Not digitized',
  DIGITIZED: 'Digitized',
  DUPLICATED: 'Duplicated',
}

// needToClear — tri-state boolean stored as a string in the form.
export const NEED_TO_CLEAR_OPTIONS = [
  { value: '', label: 'Unknown' },
  { value: 'false', label: 'No' },
  { value: 'true', label: 'Yes' },
]

// All string-typed keys — kept in one place so create vs edit payloads stay
// in lock-step and clearing works through PATCH (empty string → null server-side).
const TEXT_FIELDS = [
  'physicalMediaType',
  'mediaCategory',
  'title',
  'sizeGB',
  'physicalLabel',
  'physicalSize',
  'content',
  'owner',
  'trackName',
  'tags',
  'extension',
  'bitOrColorDepth',
  'sampleOrFrameRate',
  'channelsOrResolution',
  'playbackModel',
  'captureInterface',
  'signalInterface',
  'ingestSoftware',
  'formatCodec',
  'archiveDepNote',
  'captureDepNote',
]

const INT_FIELDS = ['rowNumber', 'year', 'durationMin', 'trackNumbers']

// Server-assigned, never sent: the backend mints the per-type inventory Number
// under a lock on create (Audio Cassette 101 while VHS is 56) and treats it as
// read-only afterwards. It lives in the form purely so the UI can display it —
// the preview on create, the stamped value on edit.
const READ_ONLY_INT_FIELDS = ['inventoryNumber']

// The nine technical-capture fields a type-catalog row carries as defaults and
// autofills into the form when a type is picked. Order matches the spec.
export const TYPE_DEFAULT_FIELDS = [
  'extension',
  'bitOrColorDepth',
  'sampleOrFrameRate',
  'channelsOrResolution',
  'playbackModel',
  'captureInterface',
  'signalInterface',
  'ingestSoftware',
  'formatCodec',
]

export function createInitialPhysicalMediaForm() {
  const form = {}
  for (const key of TEXT_FIELDS) form[key] = ''
  for (const key of INT_FIELDS) form[key] = ''
  for (const key of READ_ONLY_INT_FIELDS) form[key] = ''
  form.digitization = ''
  form.needToClear = ''
  form.digitizeDate = '' // 'YYYY-MM-DD'
  return form
}

export function populateFormFromPhysicalMedia(record) {
  const form = createInitialPhysicalMediaForm()
  if (!record) return form
  for (const key of TEXT_FIELDS) form[key] = record[key] ?? ''
  for (const key of [...INT_FIELDS, ...READ_ONLY_INT_FIELDS]) {
    form[key] = record[key] == null ? '' : String(record[key])
  }
  form.digitization = record.digitization ?? ''
  form.needToClear = record.needToClear == null ? '' : String(Boolean(record.needToClear))
  // The API returns an ISO date ('2026-06-03'); the date input wants the same.
  form.digitizeDate = (record.digitizeDate ?? '').toString().slice(0, 10)
  return form
}

// Single payload builder used for BOTH create and update. Strings are sent
// trimmed (empty string clears the field through the PATCH mapper's trimOrNull);
// ints/date/enum/bool send their typed value or null. inventoryNumber is
// deliberately absent — see READ_ONLY_INT_FIELDS.
export function buildPhysicalMediaPayload(form) {
  const payload = {}
  for (const key of TEXT_FIELDS) payload[key] = String(form[key] ?? '').trim()
  for (const key of INT_FIELDS) payload[key] = intOrNull(form[key])
  payload.digitization = form.digitization ? form.digitization : null
  payload.needToClear = form.needToClear === '' ? null : form.needToClear === 'true'
  payload.digitizeDate = trimOrNull(form.digitizeDate)
  return payload
}

// Required server-side: physicalMediaType, and (title OR physicalLabel). Mirror
// that client-side so the user gets an inline message instead of a 400.
export function validatePhysicalMediaForm(form) {
  if (!String(form.physicalMediaType ?? '').trim()) {
    return 'Physical media type is required.'
  }
  if (!String(form.title ?? '').trim() && !String(form.physicalLabel ?? '').trim()) {
    return 'Provide a title or a physical label (at least one).'
  }
  return ''
}
