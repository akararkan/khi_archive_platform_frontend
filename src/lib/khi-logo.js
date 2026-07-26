// Global cache for the uploaded site logo, mirroring `current-profile.js`.
//
// The logo now lives in the database (KHI_LOGO_FEATURE.md) instead of the repo,
// so every surface that draws the brand mark reads it from here. The record is
// mirrored into localStorage so a reload paints the right logo on the very
// first frame — no flash of the bundled fallback while the request is in
// flight, and guests (who cannot read `/api/khi-logo`) still see the logo they
// saw last time.

import { fetchCurrentKhiLogo } from '@/services/khi-logo'

// Bundled file shipped in /public — used until a logo is uploaded, and whenever
// the stored S3 URL fails to load.
const KHI_LOGO_FALLBACK_SRC = '/khi-logo.jpg'

const STORAGE_KEY = 'khi-active-logo'

let cachedLogo = readStoredLogo()
let inflight = null
const subscribers = new Set()

function readStoredLogo() {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw)
    return parsed?.imageUrl ? parsed : null
  } catch {
    // Storage may be unavailable in a private browser context.
    return null
  }
}

function writeStoredLogo(record) {
  try {
    if (record?.imageUrl) window.localStorage.setItem(STORAGE_KEY, JSON.stringify(record))
    else window.localStorage.removeItem(STORAGE_KEY)
  } catch {
    // Non-fatal — the in-memory cache still serves this session.
  }
}

function notify() {
  for (const fn of subscribers) fn(cachedLogo)
}

function getActiveKhiLogo() {
  return cachedLogo
}

function setActiveKhiLogo(record) {
  cachedLogo = record?.imageUrl ? record : null
  writeStoredLogo(cachedLogo)
  notify()
  return cachedLogo
}

function clearActiveKhiLogo() {
  cachedLogo = null
  inflight = null
  writeStoredLogo(null)
  notify()
}

function subscribeKhiLogo(fn) {
  subscribers.add(fn)
  return () => {
    subscribers.delete(fn)
  }
}

// Fetched once per page load (deduped). A stored record is still refreshed in
// the background so a logo replaced by another admin lands on the next visit.
function ensureActiveKhiLogo() {
  if (!inflight) {
    inflight = fetchCurrentKhiLogo({ knownId: cachedLogo?.id })
      .then((record) => {
        // A failed probe (offline, guest, endpoint missing) must not wipe a
        // perfectly good cached logo — only a real record replaces it.
        if (record) setActiveKhiLogo(record)
        return record ?? cachedLogo
      })
      .catch(() => cachedLogo)
  }
  return inflight
}

function refreshActiveKhiLogo() {
  inflight = null
  return ensureActiveKhiLogo()
}

// S3 keeps serving the old bytes for a replaced logo when the key is reused, so
// the record's `updatedAt` doubles as a cache-buster. Presigned URLs are left
// untouched — an extra param would break their signature.
function resolveKhiLogoSrc(record) {
  const url = record?.imageUrl
  if (!url) return KHI_LOGO_FALLBACK_SRC
  if (!record?.updatedAt || url.includes('X-Amz-')) return url

  const version = String(record.updatedAt).replace(/\D/g, '').slice(0, 14)
  if (!version) return url

  return `${url}${url.includes('?') ? '&' : '?'}v=${version}`
}

export {
  KHI_LOGO_FALLBACK_SRC,
  clearActiveKhiLogo,
  ensureActiveKhiLogo,
  getActiveKhiLogo,
  refreshActiveKhiLogo,
  resolveKhiLogoSrc,
  setActiveKhiLogo,
  subscribeKhiLogo,
}
