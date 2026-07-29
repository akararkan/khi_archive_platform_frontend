// Client-side mirror of the backend's KurdishText.normalize
// (platform service/common/KurdishText.java) — the fold that makes text
// matching work for Kurdish.
//
// Why it exists: Kurdish is written in Arabic script, which has no letter case,
// so `toLowerCase()` — the thing that makes a comparison "case-insensitive" —
// does nothing for it and the match silently degrades to an exact byte compare.
// Meanwhile the same-looking letter has several codepoints (Arabic Kaf ك vs
// Keheh ک, Arabic Yeh ي vs Kurdish Yeh ی), and invisible characters (ZWNJ,
// tatweel, harakat) ride along invisibly. Two values that look identical on
// screen therefore fail to match.
//
// Keep the steps IN SYNC with the backend, in this order:
//   NFC → fold interchangeable letters → drop invisibles → collapse whitespace
//       → trim → lower-case (Latin only; a no-op for Arabic script)
//
// Deliberately NOT bridged (same as the backend): genuine spelling drift, e.g.
// حوسینی vs حسینی. Those are different letters and stay distinct — the
// /api/maqam/maqam-types dropdown is the answer for that, not fuzzy matching.

// Codepoints are written as \u escapes, never literal glyphs: several of these
// are invisible, and a bare ZWNJ sitting in source is unreviewable.
const YEH_VARIANTS = /[\u064A\u0649]/g   // Arabic Yeh, Alef Maksura
const KURDISH_YEH = '\u06CC'
const KAF_ARABIC = /\u0643/g             // Arabic Kaf
const KEHEH = '\u06A9'

// Tatweel (kashida) | zero-width space/non-joiner/joiner | BOM | the Arabic
// harakat block | superscript alef - all invisible or purely decorative.
// Written as alternation rather than one character class: a class of combining
// marks trips no-misleading-character-class.
const INVISIBLE = /\u0640|\u200B|\u200C|\u200D|\uFEFF|[\u064B-\u0652]|\u0670/g

/**
 * Fold a string to the canonical form both sides of a comparison use.
 * `null`/`undefined` pass through as `null`; blank input returns `''`.
 */
export function normalizeKurdish(raw) {
  if (raw == null) return null
  return String(raw)
    .normalize('NFC')
    .replace(YEH_VARIANTS, KURDISH_YEH)
    .replace(KAF_ARABIC, KEHEH)
    .replace(INVISIBLE, '')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase()
}

/** Comparison key for match helpers — same as normalizeKurdish, but never null. */
export function matchKey(raw) {
  return normalizeKurdish(raw) ?? ''
}

/** Case- and script-insensitive equality. */
export function equalsKurdish(value, needle) {
  return matchKey(value) === matchKey(needle)
}

/** Case- and script-insensitive substring test. */
export function containsKurdish(value, needle) {
  const key = matchKey(needle)
  if (!key) return true
  return matchKey(value).includes(key)
}
