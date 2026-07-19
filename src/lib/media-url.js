// Resolves protected-media API paths (audio/video/image/text stream, view,
// playlist, and tile endpoints) into absolute URLs against the API origin.
//
// The backend never returns a permanent storage (S3/R2) URL for these media
// kinds any more — it returns an application-controlled, relative path such
// as `/api/guest/audio/AUD-001/stream` or `/api/audio/AUD-001/stream`. That
// path must be resolved against the API's ORIGIN (scheme + host + port),
// NOT against `apiClient`'s `baseURL` (which already ends in `/api`) — naively
// joining the two would double up the `/api` segment.
//
// Absolute URLs (`http(s):`), and local blob/data URLs, pass through
// unchanged so this function is always safe to call defensively, including
// on legacy fields that may still carry a raw S3 URL until the backend
// finishes migrating that field.

import { apiClient } from '@/lib/api-client'

let cachedOrigin
let cachedFromBaseUrl

function computeApiOrigin(baseUrl) {
  if (!baseUrl) return ''
  try {
    return new URL(baseUrl, typeof window !== 'undefined' ? window.location.href : undefined).origin
  } catch {
    // Fall back to stripping a trailing /api (or any trailing path) by hand.
    return baseUrl.replace(/\/api\/?$/, '').replace(/\/+$/, '')
  }
}

/** The scheme+host+port the API (and its media routes) are served from. */
export function getApiOrigin() {
  const baseUrl = apiClient.defaults.baseURL ?? import.meta.env.VITE_API_BASE_URL ?? ''
  if (baseUrl !== cachedFromBaseUrl) {
    cachedFromBaseUrl = baseUrl
    cachedOrigin = computeApiOrigin(baseUrl)
  }
  return cachedOrigin || ''
}

const ABSOLUTE_URL_RE = /^([a-z][a-z\d+\-.]*:)?\/\//i
const INLINE_DATA_RE = /^(data|blob):/i

/**
 * Turn a relative, application-controlled media path into an absolute URL
 * the browser can fetch directly. Already-absolute URLs (including legacy
 * raw S3 links still returned by an unmigrated field) and blob:/data: URLs
 * are returned unchanged.
 */
export function resolveMediaUrl(path) {
  if (!path) return ''
  const value = String(path).trim()
  if (!value) return ''
  if (ABSOLUTE_URL_RE.test(value) || INLINE_DATA_RE.test(value)) return value

  const origin = getApiOrigin()
  if (!origin) return value

  return `${origin}${value.startsWith('/') ? '' : '/'}${value}`
}

/** True when `path` already looks like a fully-resolved/absolute URL. */
export function isAbsoluteMediaUrl(path) {
  const value = String(path || '').trim()
  return ABSOLUTE_URL_RE.test(value) || INLINE_DATA_RE.test(value)
}
