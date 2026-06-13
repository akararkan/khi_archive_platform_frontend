// Client-side mirror of the backend's tag + keyword canonicalisation (platform
// Tags.java / Keywords.java, shared TextListCanonicalizer) so chips dedupe
// instantly and the user sees the exact value that will be stored - no
// post-save churn ("Quran" typed -> "quran" chip -> "quran" saved).
//
// The SERVER is the source of truth and re-canonicalises every save path; this
// is purely for snappy UX. Keep the steps in sync with the backend:
//   NFKC -> strip zero-width/control -> collapse whitespace -> trim -> lower-case
//        -> drop blanks -> drop > 64 chars (dropped whole, never chopped).

export const MAX_TAG_LENGTH = 64
export const MAX_KEYWORD_LENGTH = 200

// Zero-width space (U+200B), ZWNJ (U+200C), ZWJ (U+200D), word-joiner
// (U+2060) and BOM (U+FEFF). NFKC leaves these in place, so strip them
// explicitly - otherwise a zero-width-joined "Quran" reads as a distinct tag.
const ZERO_WIDTH = /[\u200B-\u200D\u2060\uFEFF]/g

// Core canonicaliser shared by tags (cap 64) and keywords (cap 200). Over-cap
// entries are dropped whole (returns '') — never truncated, since a chopped
// value silently collides with an unrelated one. Returns '' for anything to
// drop so callers can `.filter(Boolean)`.
function canonicalizeText(raw, maxLength) {
  if (raw == null) return ''
  const collapsed = String(raw)
    .normalize('NFKC')
    .replace(ZERO_WIDTH, '')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase()
  if (!collapsed) return ''
  if (collapsed.length > maxLength) return ''
  return collapsed
}

// Short labels (<= 64 chars).
export function canonicalizeTag(raw) {
  return canonicalizeText(raw, MAX_TAG_LENGTH)
}

// Search-hint phrases (<= 200 chars). Internal spaces are preserved (collapsed
// to a single space) — keywords are phrases, not single tokens.
export function canonicalizeKeyword(raw) {
  return canonicalizeText(raw, MAX_KEYWORD_LENGTH)
}

// Canonicalise a list, dropping blanks/over-long and de-duping
// (first-occurrence-wins, matching the backend's LinkedHashSet).
function canonicalizeList(list, canon) {
  const out = []
  const seen = new Set()
  for (const item of Array.isArray(list) ? list : []) {
    const value = canon(item)
    if (value && !seen.has(value)) {
      seen.add(value)
      out.push(value)
    }
  }
  return out
}

export function canonicalizeTags(list) {
  return canonicalizeList(list, canonicalizeTag)
}

export function canonicalizeKeywords(list) {
  return canonicalizeList(list, canonicalizeKeyword)
}
