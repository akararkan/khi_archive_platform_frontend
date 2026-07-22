// Controlled vocabularies — the single source of truth for the fixed values
// the archive uses across every dashboard form (audio, video, image, text,
// physical media, person, project).
//
// These are SUGGESTIONS, not a closed enum: every field wired to this list
// stays a free-text field. The dropdown exists so archivists pick the agreed
// wording with one click instead of retyping Kurdish by hand (and drifting:
// "سۆرانی" vs "سورانی" vs "Sorani"), while still being able to type a brand-new
// value when the collection needs one. Whatever ends up in the input — preset
// or typed — is exactly what gets sent to the backend.
//
// ── Adding a value later ────────────────────────────────────────────────────
// Add one entry to the array below. It appears immediately in every form that
// uses that field, dashboard-wide. No component changes needed.
//
//   value  what is stored and sent to the API — must match the agreed spelling
//   hint   optional English gloss, shown muted at the end of the menu row so
//          non-Kurdish-reading staff can tell the options apart. Never sent.

const VOCABULARY = {
  language: [
    { value: 'کوردی', hint: 'Kurdish' },
  ],

  dialect: [
    { value: 'سۆرانی', hint: 'Sorani' },
    { value: 'کورمانجی', hint: 'Kurmanji' },
    { value: 'گۆرانی', hint: 'Gorani' },
    { value: 'هەورامی', hint: 'Hawrami' },
  ],

  region: [
    { value: 'باکووری کوردستان', hint: 'Northern Kurdistan' },
    { value: 'باشووری کوردستان', hint: 'Southern Kurdistan' },
    { value: 'ڕۆژئاوای کوردستان', hint: 'Western Kurdistan' },
    { value: 'ڕۆژهەڵاتی کوردستان', hint: 'Eastern Kurdistan' },
  ],

  copyright: [
    { value: 'پارێزراوە', hint: 'Rights reserved' },
    { value: 'گشتی (Public Domain)', hint: 'Public domain' },
  ],

  rightOwner: [
    { value: 'ئینستیتیوتی کەلەپووری کوردی', hint: 'Kurdish Heritage Institute' },
  ],

  availability: [
    { value: 'کراوە بۆ توێژینەوە', hint: 'Open for research' },
    { value: 'کراوە بۆ هەمووان', hint: 'Open to everyone' },
  ],

  licenseType: [
    { value: 'CC BY-NC-ND', hint: 'Attribution · NonCommercial · NoDerivatives' },
    { value: 'CC0', hint: 'No rights reserved' },
    { value: 'CC BY', hint: 'Attribution' },
  ],

  usageRights: [
    { value: 'تەنها بۆ گوێگرتن و لێکۆڵینەوە', hint: 'Listening & research only' },
    { value: 'بێسنوور', hint: 'Unrestricted' },
    { value: 'تەنها بۆ لێکۆڵینەوە', hint: 'Research only' },
    { value: 'ڕێگەپێدراو بە ئاماژەدان بە سەرچاوە', hint: 'Allowed with source credit' },
    { value: 'تەنها بۆ گوێگرتن', hint: 'Listening only' },
    { value: 'ڕێگەپێدراو بە ئاماژەدان', hint: 'Allowed with attribution' },
  ],

  lccClassification: [
    { value: 'M1706.K87', hint: 'LC — Kurdish folk music' },
  ],

  accrualMethod: [
    { value: 'دیاری', hint: 'Donation' },
    { value: 'کڕین', hint: 'Purchase' },
    { value: 'کۆکردنەوەی مەیدانی', hint: 'Field collection' },
  ],

  owner: [
    { value: 'KHI', hint: 'Kurdish Heritage Institute' },
  ],

  publisher: [
    { value: 'KHI', hint: 'Kurdish Heritage Institute' },
  ],

  // physical-media → physicalSize. The agreed wording is the four English
  // grades below, but the field stays free text: rows imported from the old
  // sheets carry material sizes like "7 inch" / "C60" and must keep editing.
  physicalSize: [
    { value: 'Big', hint: 'گەورە' },
    { value: 'Medium', hint: 'مامناوەند' },
    { value: 'Normal', hint: 'ئاسایی' },
    { value: 'Small', hint: 'بچووک' },
  ],
}

// Fields whose form `id` differs per media type (img-copyright, txt-language…)
// still resolve to the same vocabulary — call sites pass the bare field name.
export function getVocabularyOptions(field) {
  return VOCABULARY[field] || []
}

export function hasVocabulary(field) {
  return getVocabularyOptions(field).length > 0
}

// Comparison key used for "is this value one of the presets?". Trims, folds
// case (a no-op for Arabic script but not for `CC BY` / `cc by`) and collapses
// runs of whitespace so a stray double space doesn't read as a new term.
export function normalizeVocabularyValue(raw) {
  return String(raw ?? '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, ' ')
}

export function isPresetValue(field, raw) {
  const key = normalizeVocabularyValue(raw)
  if (!key) return false
  return getVocabularyOptions(field).some((opt) => normalizeVocabularyValue(opt.value) === key)
}

export { VOCABULARY }
