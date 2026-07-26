// DTO records → spreadsheet table. Every field of every record becomes a
// column ("the Excel is the real records, with the contents"): the column
// order follows the first record's own key order, later-only keys append, and
// values render the way an archivist reads them — arrays joined, booleans as
// Yes/No, linked entities by their name/code rather than raw JSON.

// When a value is a nested object (person, project, category link), show its
// most human field instead of JSON.
const PREFERRED_OBJECT_KEYS = [
  'name',
  'title',
  'label',
  'fullName',
  'projectName',
  'personName',
  'categoryName',
  'username',
  'email',
  'code',
  'value',
  'id',
]

// Acronyms that read wrong in Title Case ("Url" → "URL").
const UPPERCASE_TOKENS_RE = /\b(id|url|uri|api|isbn|issn|s3|hls|pdf|dvd|vhs)\b/gi

function humanizeFieldLabel(key) {
  const spaced = String(key)
    .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
    .replace(/[_-]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
  if (!spaced) return String(key)

  // Non-Latin keys (Sorani field names) are left untouched — Title Case only
  // makes sense for ASCII.
  if (!/^[\x20-\x7E]+$/.test(spaced)) return spaced

  return spaced
    .toLowerCase()
    .split(' ')
    .map((word) => (word ? word.charAt(0).toUpperCase() + word.slice(1) : word))
    .join(' ')
    .replace(UPPERCASE_TOKENS_RE, (match) => match.toUpperCase())
}

function formatCellValue(value) {
  if (value == null) return ''
  if (typeof value === 'string') return value.trim()
  if (typeof value === 'number' || typeof value === 'bigint') return String(value)
  if (typeof value === 'boolean') return value ? 'Yes' : 'No'
  if (value instanceof Date) return value.toISOString()
  if (Array.isArray(value)) return value.map(formatCellValue).filter(Boolean).join(', ')
  if (typeof value === 'object') {
    for (const key of PREFERRED_OBJECT_KEYS) {
      const nested = value[key]
      if (typeof nested === 'string' && nested.trim()) return nested.trim()
      if (typeof nested === 'number') return String(nested)
    }
    try {
      const json = JSON.stringify(value)
      return json === '{}' ? '' : json
    } catch {
      return ''
    }
  }
  return String(value)
}

function flattenRecords(records, { labels = {}, omit = [] } = {}) {
  const omitSet = new Set(omit)
  const keys = []
  const seen = new Set()

  for (const record of records) {
    if (!record || typeof record !== 'object') continue
    for (const key of Object.keys(record)) {
      if (seen.has(key) || omitSet.has(key) || typeof record[key] === 'function') continue
      seen.add(key)
      keys.push(key)
    }
  }

  return {
    columns: keys.map((key) => labels[key] ?? humanizeFieldLabel(key)),
    rows: records.map((record) => keys.map((key) => formatCellValue(record?.[key]))),
  }
}

export { flattenRecords, formatCellValue, humanizeFieldLabel }
