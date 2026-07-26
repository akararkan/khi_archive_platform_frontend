import { apiClient } from '@/lib/api-client'
import { multipartUploadConfig } from '@/lib/multipart-upload'

// KhiLogo — the single uploaded site/app logo (KHI_LOGO_FEATURE.md).
// Simple CRUD over `/api/khi-logo`; the record only holds the S3 `imageUrl`,
// so once we know that URL any <img> can render it without a token.
//
// Wire shape: { id, imageUrl, createdAt, updatedAt }

// The upload endpoints accept `image/*` only and the record is pure branding,
// so we keep the client-side guard small and explicit.
const ACCEPTED_LOGO_TYPES = ['image/png', 'image/jpeg', 'image/webp', 'image/svg+xml', 'image/avif']
const ACCEPTED_LOGO_ACCEPT = ACCEPTED_LOGO_TYPES.join(',')
const MAX_LOGO_BYTES = 8 * 1024 * 1024

function normalizeKhiLogo(payload) {
  // Tolerates the four shapes a Spring endpoint may hand back for "the logo":
  // the DTO itself, a bare array, a Page<DTO>, or an envelope with `data`.
  if (!payload) return null

  if (Array.isArray(payload)) {
    return normalizeKhiLogo(payload[payload.length - 1])
  }

  if (Array.isArray(payload.content)) {
    return normalizeKhiLogo(payload.content[payload.content.length - 1])
  }

  if (payload.data && typeof payload.data === 'object') {
    return normalizeKhiLogo(payload.data)
  }

  const imageUrl = payload.imageUrl ?? payload.imageURL ?? payload.url ?? ''
  if (!imageUrl) return null

  return {
    id: payload.id ?? null,
    imageUrl: String(imageUrl),
    createdAt: payload.createdAt ?? null,
    updatedAt: payload.updatedAt ?? payload.createdAt ?? null,
  }
}

function validateLogoFile(file) {
  if (!file) return 'Choose an image file first.'
  if (file.type && !ACCEPTED_LOGO_TYPES.includes(file.type)) {
    return 'Unsupported format. Use PNG, JPG, WEBP, AVIF, or SVG.'
  }
  if (file.size > MAX_LOGO_BYTES) {
    return `That file is ${(file.size / 1024 / 1024).toFixed(1)} MB. The limit is 8 MB.`
  }
  return ''
}

async function getKhiLogo(id, { signal } = {}) {
  const { data } = await apiClient.get(`/khi-logo/${id}`, { signal })
  return normalizeKhiLogo(data)
}

async function uploadKhiLogo(file, uploadOptions) {
  const formData = new FormData()
  formData.append('file', file)

  const { data } = await apiClient.post('/khi-logo', formData, multipartUploadConfig(uploadOptions))
  return normalizeKhiLogo(data)
}

// PATCH replaces the image on an existing record and drops the old S3 object.
async function replaceKhiLogo(id, file, uploadOptions) {
  const formData = new FormData()
  formData.append('file', file)

  const { data } = await apiClient.patch(
    `/khi-logo/${id}`,
    formData,
    multipartUploadConfig(uploadOptions),
  )
  return normalizeKhiLogo(data)
}

// Deletes the row AND the S3 file — the app falls back to the bundled logo.
async function deleteKhiLogo(id) {
  const { data } = await apiClient.delete(`/khi-logo/${id}`)
  return data
}

// Resolving "which record is the current logo" without a dedicated endpoint.
//
// The documented API only exposes GET /khi-logo/{id}, so we probe, cheapest
// first, and stop at the first hit:
//   1. /khi-logo/current  — if the backend ever adds it, this just starts working
//   2. /khi-logo          — a list / Page endpoint, same deal
//   3. /khi-logo/{knownId}— the id this browser last uploaded or read
//   4. /khi-logo/1        — the single-record model means the first row is it
// Every probe failure is swallowed: a missing endpoint or a 403 for a guest
// simply means "no managed logo", and the UI keeps the bundled file.
const LOGO_DISCOVERY_PATHS = ['/khi-logo/current', '/khi-logo']

// Returns the record, or `false` when the caller is not allowed to read logos
// at all (guest / missing khi_logo:read) — in that case every remaining probe
// would fail the same way, so discovery stops instead of firing three more.
async function probe(path, signal) {
  try {
    const { data } = await apiClient.get(path, { signal })
    return normalizeKhiLogo(data)
  } catch (error) {
    const status = error?.response?.status
    return status === 401 || status === 403 ? false : null
  }
}

async function fetchCurrentKhiLogo({ knownId, signal } = {}) {
  const ids = []
  if (knownId != null && knownId !== '') ids.push(knownId)
  if (!ids.includes(1) && !ids.includes('1')) ids.push(1)

  const paths = [...LOGO_DISCOVERY_PATHS, ...ids.map((id) => `/khi-logo/${id}`)]

  for (const path of paths) {
    const found = await probe(path, signal)
    if (found) return found
    if (found === false) return null
  }

  return null
}

export {
  ACCEPTED_LOGO_ACCEPT,
  ACCEPTED_LOGO_TYPES,
  MAX_LOGO_BYTES,
  deleteKhiLogo,
  fetchCurrentKhiLogo,
  getKhiLogo,
  normalizeKhiLogo,
  replaceKhiLogo,
  uploadKhiLogo,
  validateLogoFile,
}
