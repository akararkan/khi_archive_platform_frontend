// Look-alike detection for the tag/keyword vocabulary.
//
// The backend canonicaliser already folds case, zero-width joiners and repeated
// whitespace, so anything that survives as two distinct values differs by
// something it can't see: a separator ("folk-music" / "folk music"), word order
// ("kurdish folk" / "folk kurdish"), an English plural ("cassette" /
// "cassettes"), or — the common one in this archive — an Arabic-script letter
// written the Persian way instead of the Sorani way ("ي" for "ی", "ك" for "ک",
// "شیخ" for "شێخ").
//
// We reduce every value to a deliberately lossy key and group values that share
// one. This is a SUGGESTION engine: a shared key means "a human should look at
// these two", never "merge them automatically". Nothing here mutates anything —
// the admin picks the survivor and confirms.

// Arabic-script folding. Each pair collapses a spelling variant onto one form
// so the variants land on the same key. Lossy on purpose: ڕ/ر and ڵ/ل are
// distinct Sorani letters, but they are also the single most common thing
// people drop when typing, which is exactly the pair worth surfacing.
const SCRIPT_FOLD = {
  'ي': 'ی', 'ى': 'ی', 'ێ': 'ی', 'ۍ': 'ی',
  'ك': 'ک',
  'ة': 'ه', 'ە': 'ه', 'ۀ': 'ه',
  'أ': 'ا', 'إ': 'ا', 'آ': 'ا', 'ٱ': 'ا',
  'ؤ': 'و', 'ۆ': 'و', 'ۇ': 'و', 'ۋ': 'و',
  'ڕ': 'ر',
  'ڵ': 'ل',
  // Carriers and elongation carry no sound of their own here.
  'ئ': '', 'ء': '', 'ـ': '',
}

// Every combining mark, whatever the script: Latin accents and Arabic
// harakat/hamza alike. NFD first turns precomposed letters (é, أ) into
// base + mark, so this single pass flattens both.
const COMBINING_MARKS = /\p{M}/gu

// Arabic-Indic (٠-٩) and extended Arabic-Indic (۰-۹) digits → ASCII, so
// "1970s" and "١٩٧٠s" don't read as unrelated values.
const ARABIC_DIGITS = /[٠-٩۰-۹]/g

// Anything that isn't a letter or a digit is a separator: space, hyphen,
// underscore, slash, apostrophe, comma…
const SEPARATORS = /[^\p{L}\p{N}]+/u

function foldDigit(ch) {
  const code = ch.codePointAt(0)
  const base = code >= 0x06f0 ? 0x06f0 : 0x0660
  return String.fromCharCode(48 + (code - base))
}

// English plurals only — "cassettes" → "cassette". Guarded so short words
// ("ads"), double-s ("glass") and non-Latin scripts are left alone.
function stripPlural(token) {
  if (token.length <= 3) return token
  if (!/^[a-z0-9]+$/.test(token)) return token
  if (token.endsWith('ies')) return `${token.slice(0, -3)}y`
  if (token.endsWith('ss')) return token
  if (token.endsWith('s')) return token.slice(0, -1)
  return token
}

// The lossy key. Two values sharing one are candidates for a merge.
function similarityKey(value) {
  if (!value) return ''

  const folded = String(value)
    .toLowerCase()
    // Variant folding runs FIRST, on precomposed letters: NFD would split
    // "ئ" into a carrier + hamza and the map would never see it.
    .replace(/[ء-ۿ]/g, (ch) => (ch in SCRIPT_FOLD ? SCRIPT_FOLD[ch] : ch))
    .normalize('NFD')
    .replace(COMBINING_MARKS, '')
    .replace(ARABIC_DIGITS, foldDigit)

  const tokens = folded.split(SEPARATORS).filter(Boolean).map(stripPlural)
  if (tokens.length === 0) return ''

  // Sorting the tokens before joining makes the key word-order blind, and
  // joining without a separator makes it separator blind — so "folk-music",
  // "music folk" and "folkmusic" all collapse together.
  return tokens.sort().join('')
}

// Group a vocabulary list into look-alike clusters.
//
//   items   [{ value, usageCount }]
//   ignored iterable of cluster keys the admin has dismissed
//
// Returns clusters of 2+ values, biggest and busiest first. `keeper` is the
// most-used member — the sensible default survivor of a merge.
function buildSimilarGroups(items, { ignored } = {}) {
  const ignoredKeys = ignored instanceof Set ? ignored : new Set(ignored || [])
  const buckets = new Map()

  for (const item of Array.isArray(items) ? items : []) {
    const key = similarityKey(item?.value)
    if (!key) continue
    const bucket = buckets.get(key)
    if (bucket) bucket.push(item)
    else buckets.set(key, [item])
  }

  const groups = []
  for (const [key, members] of buckets) {
    if (members.length < 2 || ignoredKeys.has(key)) continue
    const sorted = [...members].sort(
      (a, b) => b.usageCount - a.usageCount || a.value.localeCompare(b.value),
    )
    groups.push({
      key,
      members: sorted,
      keeper: sorted[0],
      totalUsage: sorted.reduce((sum, m) => sum + m.usageCount, 0),
    })
  }

  groups.sort(
    (a, b) =>
      b.members.length - a.members.length ||
      b.totalUsage - a.totalUsage ||
      a.keeper.value.localeCompare(b.keeper.value),
  )
  return groups
}

export { buildSimilarGroups, similarityKey }
