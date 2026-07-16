const DEFAULT_EMPTY_VALUE = '—'

function isEmptyValue(value) {
  if (value == null || value === '') return true
  if (Array.isArray(value)) return value.length === 0 || value.every(isEmptyValue)
  return false
}

function valueFrom(item, key, { aliases = {}, keepEmpty = false } = {}) {
  const keys = aliases[key] || [key]
  let emptyValue = null
  let foundEmpty = false
  for (const candidate of keys) {
    if (!Object.prototype.hasOwnProperty.call(item || {}, candidate)) continue
    const value = item?.[candidate]
    if (!isEmptyValue(value)) return value
    if (!foundEmpty) {
      emptyValue = value
      foundEmpty = true
    }
  }
  return keepEmpty && foundEmpty ? emptyValue : null
}

function safeStringify(value, space = 0) {
  const seen = new WeakSet()
  try {
    return JSON.stringify(value, (key, entry) => {
      if (entry && typeof entry === 'object') {
        if (seen.has(entry)) return '[Circular]'
        seen.add(entry)
      }
      return entry
    }, space)
  } catch {
    return String(value)
  }
}

function buildCompleteMediaFieldGroups(kind, item, {
  aliases = {},
  fieldGroups = {},
  sharedGroups = [],
} = {}) {
  const normalizedKind = String(kind || '').trim().toLowerCase()
  const typeGroups = fieldGroups[normalizedKind] || []
  if (!typeGroups.length) return []

  const groups = [...typeGroups, ...sharedGroups].map((group) => ({
    ...group,
    fields: [...group.fields],
  }))
  const covered = new Set(groups.flatMap((group) => group.fields))
  for (const field of [...covered]) {
    for (const alias of aliases[field] || []) covered.add(alias)
  }

  const additional = Object.keys(item || {}).filter((field) => !covered.has(field))
  if (additional.length) {
    groups.push({
      title: 'Additional DTO Fields (خانە زیادەکانی تۆمار)',
      icon: null,
      fields: additional,
    })
  }
  return groups
}

function formatCompleteFieldValue(value, {
  emptyLabel = DEFAULT_EMPTY_VALUE,
  trueLabel = 'Yes',
  falseLabel = 'No',
} = {}) {
  if (isEmptyValue(value)) return emptyLabel
  if (typeof value === 'boolean') return value ? trueLabel : falseLabel
  if (Array.isArray(value)) {
    if (!value.length) return emptyLabel
    return value.map((entry) => formatCompleteFieldValue(entry, {
      emptyLabel,
      trueLabel,
      falseLabel,
    })).join('\n')
  }
  if (typeof value === 'object') return safeStringify(value, 2)
  return String(value)
}

export {
  buildCompleteMediaFieldGroups,
  formatCompleteFieldValue,
  isEmptyValue,
  safeStringify,
  valueFrom,
}
