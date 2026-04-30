// Backend (`ApiErrorResponse`) shape:
//   { timestamp, status, error: "CODE_LIKE_THIS", message, path, details: { field: msg } | null }
// These helpers normalize that envelope (plus axios + plain Error) into things
// we can show: a short title, a one-line description, and a list of per-field
// validation issues.

const STATUS_TITLES = {
  400: 'Invalid request',
  401: 'Sign-in required',
  403: 'Access denied',
  404: 'Not found',
  408: 'Request timed out',
  409: 'Conflict',
  410: 'No longer available',
  413: 'File too large',
  415: 'Unsupported media type',
  422: 'Validation failed',
  423: 'Account locked',
  429: 'Too many requests',
  500: 'Server error',
  502: 'Bad gateway',
  503: 'Service unavailable',
  504: 'Gateway timeout',
}

function humanizeErrorCode(code) {
  return code
    .toString()
    .toLowerCase()
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (m) => m.toUpperCase())
}

// "personShownInImage" / "person.full_name" / "person_shown_in_image"
//                                   → "Person Shown In Image"
function humanizeFieldName(name) {
  if (!name) return ''
  return String(name)
    .replace(/[._]+/g, ' ')
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/\b\w/g, (m) => m.toUpperCase())
}

function getResponseData(error) {
  return error?.response?.data ?? null
}

function getStatus(error) {
  const status = error?.response?.status
  return typeof status === 'number' ? status : null
}

function getErrorDetails(error) {
  const data = getResponseData(error)
  const details = data && typeof data === 'object' ? data.details : null
  if (!details || typeof details !== 'object') return []

  const out = []
  for (const [field, value] of Object.entries(details)) {
    if (value == null) continue
    const message = String(value).trim()
    if (!message) continue
    out.push({ field, label: humanizeFieldName(field), message })
  }
  return out
}

function getErrorTitle(error, fallback = 'Something went wrong') {
  const data = getResponseData(error)
  if (data && typeof data === 'object' && typeof data.error === 'string' && data.error.trim()) {
    return humanizeErrorCode(data.error)
  }
  const status = getStatus(error)
  if (status && STATUS_TITLES[status]) return STATUS_TITLES[status]
  return fallback
}

// Single-string version, kept stable for callers that just want one line.
// When details exist they are concatenated so users still see the specifics.
function getErrorMessage(error, fallback = 'Something went wrong. Please try again.') {
  const data = getResponseData(error)

  if (typeof data === 'string' && data.trim()) return data

  if (data && typeof data === 'object') {
    const baseMessage =
      typeof data.message === 'string' && data.message.trim() ? data.message.trim() : ''
    const details = getErrorDetails(error)

    if (details.length > 0) {
      const detailText = details.map((d) => `${d.label}: ${d.message}`).join('; ')
      return baseMessage ? `${baseMessage} — ${detailText}` : detailText
    }
    if (baseMessage) return baseMessage

    if (typeof data.error === 'string' && data.error.trim()) {
      return humanizeErrorCode(data.error)
    }
    if (typeof data.response === 'string' && data.response.trim()) {
      return data.response
    }
  }

  if (typeof error?.message === 'string' && error.message.trim()) return error.message

  return fallback
}

// Structured version for nicer rendering (toast / FormErrorBox).
//   { title, description, details: [{field, label, message}], code, status }
function formatApiError(error, fallbackTitle = 'Something went wrong') {
  const data = getResponseData(error)
  const status = getStatus(error)
  const code = data && typeof data === 'object' && typeof data.error === 'string' ? data.error : null

  const title =
    (code && humanizeErrorCode(code)) ||
    (status ? STATUS_TITLES[status] : null) ||
    fallbackTitle

  let description = null
  if (data && typeof data === 'object' && typeof data.message === 'string' && data.message.trim()) {
    description = data.message.trim()
  } else if (typeof data === 'string' && data.trim()) {
    description = data.trim()
  } else if (typeof error?.message === 'string' && error.message.trim()) {
    description = error.message.trim()
  }

  // Avoid description duplicating the title.
  if (description && description.toLowerCase() === title.toLowerCase()) {
    description = null
  }

  const details = getErrorDetails(error)

  return {
    title,
    description,
    details,
    code,
    status,
  }
}

// Backend signals an optimistic-locking conflict (V3 concurrency model)
// with HTTP 409 + error code "STALE_VERSION". The backend's `message`
// field is already user-friendly ("This Audio was modified by someone
// else while you were editing it. Reload to see the latest version,
// then re-apply your changes."), so callers usually just want to know
// "is this the stale-version case?" so they can additionally close
// the form and refresh the list. The other 409 case ("CONFLICT" — a
// duplicate-code collision) does NOT need that recovery dance.
function isStaleVersionError(error) {
  const data = getResponseData(error)
  const code = data && typeof data === 'object' ? data.error : null
  return getStatus(error) === 409 && code === 'STALE_VERSION'
}

export {
  formatApiError,
  getErrorDetails,
  getErrorMessage,
  getErrorTitle,
  humanizeErrorCode,
  humanizeFieldName,
  isStaleVersionError,
}
