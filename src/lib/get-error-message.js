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

// Keys the backend uses on ACCESS_DENIED 403s to describe *why* the
// caller failed authorization. These are context, not validation
// errors — render them through getRequiredAuthority instead so they
// don't double up with the already-good `message` from the server.
const ACCESS_DENIED_META_KEYS = new Set([
  'requiredAuthority',
  'actor',
  'actorAuthorities',
  'requestMethod',
])

// Keys that are URL pointers (e.g. UNKNOWN_PERMISSION includes a
// `catalog` field pointing at the permissions catalog endpoint).
// Useful as a debug breadcrumb but not what we want to show users.
const URL_HINT_KEYS = new Set(['catalog'])

function getErrorDetails(error) {
  const data = getResponseData(error)
  const details = data && typeof data === 'object' ? data.details : null
  if (!details || typeof details !== 'object') return []

  const out = []
  for (const [field, value] of Object.entries(details)) {
    if (ACCESS_DENIED_META_KEYS.has(field)) continue
    if (URL_HINT_KEYS.has(field)) continue
    if (value == null) continue
    // Arrays show up in details for typed errors that name a list of
    // offenders (e.g. UNKNOWN_PERMISSION → details.unknown = [...]).
    // Render them as a comma-joined string so the UI can highlight
    // the specific bad inputs instead of dropping them silently.
    if (Array.isArray(value)) {
      const items = value
        .filter((v) => v != null)
        .map((v) => String(v).trim())
        .filter(Boolean)
      if (items.length === 0) continue
      out.push({ field, label: humanizeFieldName(field), message: items.join(', ') })
      continue
    }
    const message = String(value).trim()
    if (!message) continue
    out.push({ field, label: humanizeFieldName(field), message })
  }
  return out
}

// Pull the `requiredAuthority` field out of an ACCESS_DENIED 403 so
// callers can surface targeted UX (e.g. a "Request access to
// person:create" affordance). Returns null if the error isn't an
// access-denied response or the field is absent.
function getRequiredAuthority(error) {
  const data = getResponseData(error)
  const required = data && typeof data === 'object' ? data.details?.requiredAuthority : null
  return typeof required === 'string' && required.trim() ? required.trim() : null
}

// Format an ACCESS_DENIED 403 into a user-actionable single line that
// names the authority they need AND lists what their account already
// has. Returns null when the error isn't an access-denied response —
// callers fall back to `formatApiError` / `getErrorMessage` in that
// case. Useful for toasts where the raw backend message ("Required
// authority: 'person:create'.") doesn't tell the user *why* they can't
// retry — knowing what they DO have shifts the resolution from
// "I'm stuck" to "ask an admin to grant me X".
function getAccessDeniedMessage(error) {
  const data = getResponseData(error)
  if (!data || typeof data !== 'object' || data.error !== 'ACCESS_DENIED') return null
  const required =
    typeof data.details?.requiredAuthority === 'string' && data.details.requiredAuthority.trim()
      ? data.details.requiredAuthority.trim()
      : null
  const have = Array.isArray(data.details?.actorAuthorities)
    ? data.details.actorAuthorities.filter((a) => typeof a === 'string')
    : []
  if (required) {
    const haveSummary = have.length > 0 ? have.join(', ') : 'none'
    return (
      `You need permission '${required}' to do this. ` +
      `Your account has: ${haveSummary}. ` +
      `Ask an admin to grant it.`
    )
  }
  if (typeof data.message === 'string' && data.message.trim()) return data.message.trim()
  return "You don't have permission to perform this action."
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
  getAccessDeniedMessage,
  getErrorDetails,
  getErrorMessage,
  getErrorTitle,
  getRequiredAuthority,
  humanizeErrorCode,
  humanizeFieldName,
  isStaleVersionError,
}
