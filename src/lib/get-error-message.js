// Normalizes the backend `ApiErrorResponse` envelope (plus raw axios / plain
// Error objects) into things the UI can render. The bilingual (English +
// Sorani Kurdish) catalog and the heavy lifting live in `error-i18n.js`; this
// module is the stable, backward-compatible surface the rest of the app imports.
//
// New wire shape (see error-i18n.js for the full contract):
//   { timestamp, status, error: "CODE", category, message, hint, path,
//     traceId, details: { field: msg } | { ...meta } }
//
// `formatApiError` returns BOTH the legacy string fields (title / description)
// AND an `i18n` bundle that FormErrorBox / the toaster use to show both
// languages, the recovery hint, and the support traceId.

import {
  buildLocalizedError,
  humanizeErrorCode,
  humanizeFieldName,
  resolveErrorCategory,
} from '@/lib/error-i18n'

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

function getResponseData(error) {
  // Accept a raw axios error, OR an already-extracted response body (some
  // callers pass `error.response.data` directly).
  if (error && typeof error === 'object' && error.response && typeof error.response === 'object') {
    return error.response.data ?? null
  }
  if (error && typeof error === 'object' && typeof error.error === 'string') {
    // Looks like a bare ApiErrorResponse body.
    return error
  }
  return null
}

function getStatus(error) {
  const status = error?.response?.status ?? (typeof error?.status === 'number' ? error.status : null)
  return typeof status === 'number' ? status : null
}

// Produce the full structured bilingual view for a caught error. Callers that
// want to dispatch on category or render both languages themselves use this.
function localizeApiError(error, fallbackTitle = 'Something went wrong') {
  return buildLocalizedError(getResponseData(error), getStatus(error), fallbackTitle)
}

// Broad family (ErrorCategory) for category-based dispatch, e.g.
//   switch (getErrorCategory(err)) { case 'AUTHENTICATION': ... }
function getErrorCategory(error) {
  return resolveErrorCategory(getResponseData(error), getStatus(error))
}

// Legacy per-field details: [{ field, label (string), message }]. Kept for any
// caller reading the flat shape; the bilingual labels live on `i18n.details`.
function getErrorDetails(error) {
  const view = localizeApiError(error)
  return view.details.map((d) => ({ field: d.field, label: d.label.en, message: d.message }))
}

// Pull `requiredAuthority` out of an ACCESS_DENIED 403 so callers can surface
// targeted UX (e.g. a "Request access to person:create" affordance).
function getRequiredAuthority(error) {
  const data = getResponseData(error)
  const required = data && typeof data === 'object' ? data.details?.requiredAuthority : null
  return typeof required === 'string' && required.trim() ? required.trim() : null
}

// Format an ACCESS_DENIED 403 into a user-actionable single line that names the
// authority they need AND what they already have. Returns null when the error
// isn't an access-denied response — callers fall back to formatApiError.
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
    const view = localizeApiError(error, fallback)
    return view.title.en
  }
  const status = getStatus(error)
  if (status && STATUS_TITLES[status]) return STATUS_TITLES[status]
  return fallback
}

// Single bilingual string for inline banners: "English message — Kurdish".
// Field details are appended to the English part when present.
function getErrorMessage(error, fallback = 'Something went wrong. Please try again.') {
  const data = getResponseData(error)

  if (typeof data === 'string' && data.trim()) return data

  if (data && typeof data === 'object') {
    const view = buildLocalizedError(data, getStatus(error), fallback)
    let en = view.message.en || view.title.en || ''
    if (view.details.length > 0) {
      const detailText = view.details.map((d) => `${d.label.en}: ${d.message}`).join('; ')
      en = en ? `${en} — ${detailText}` : detailText
    }
    const ku = view.message.ku || view.title.ku || ''
    if (en && ku) return `${en} — ${ku}`
    if (en) return en
  }

  if (typeof error?.message === 'string' && error.message.trim()) return error.message
  return fallback
}

// Structured version for FormErrorBox / the toaster. Returns the legacy string
// fields (title / description / details) for backward compatibility PLUS the
// bilingual `i18n` bundle, the broad `category`, the recovery `hint`, and the
// support `traceId`.
function formatApiError(error, fallbackTitle = 'Something went wrong') {
  const data = getResponseData(error)
  const status = getStatus(error)

  // Non-API failures (network down, no response body): keep the old behavior.
  if (!data || typeof data !== 'object') {
    let description = null
    if (typeof data === 'string' && data.trim()) description = data.trim()
    else if (typeof error?.message === 'string' && error.message.trim())
      description = error.message.trim()

    const title = (status && STATUS_TITLES[status]) || fallbackTitle
    if (description && description.toLowerCase() === title.toLowerCase()) description = null
    return { title, description, details: [], code: null, status, category: null, hint: null, traceId: null, i18n: null }
  }

  const view = buildLocalizedError(data, status, fallbackTitle)

  // Legacy flat fields (English) so any direct reader keeps working.
  const legacyDetails = view.details.map((d) => ({
    field: d.field,
    label: d.label.en,
    message: d.message,
  }))

  return {
    title: view.title.en,
    description: view.message.en,
    details: legacyDetails,
    code: view.code,
    status: view.status,
    category: view.category,
    hint: view.hint.en,
    traceId: view.traceId,
    // Bilingual bundle consumed by the shared error renderer.
    i18n: view,
  }
}

// Backend signals an optimistic-locking conflict with HTTP 409 + code
// "STALE_VERSION". Callers use this to additionally close the form and refresh.
function isStaleVersionError(error) {
  const data = getResponseData(error)
  const code = data && typeof data === 'object' ? data.error : null
  return getStatus(error) === 409 && code === 'STALE_VERSION'
}

export {
  formatApiError,
  getAccessDeniedMessage,
  getErrorCategory,
  getErrorDetails,
  getErrorMessage,
  getErrorTitle,
  getRequiredAuthority,
  humanizeErrorCode,
  humanizeFieldName,
  isStaleVersionError,
  localizeApiError,
}
