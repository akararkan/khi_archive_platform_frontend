import { apiClient } from '@/lib/api-client'

// ── Physical-media inventory API ───────────────────────────────────────────────
// The 9th entity domain: cassettes / reels / DVDs the team is preparing for
// digitisation. Create/update are plain JSON (no media file of its own — that's
// the maqam/audio entities' job). Bulk rows arrive via the Excel import endpoint.
// Mirrors the conventions of services/category.js (paged list, search, soft-trash
// + admin restore/purge).

// Paginated list — returns the full Spring Page<PhysicalMediaResponseDTO> shape.
export async function getPhysicalMediaPage({ page = 0, size = 50, sort, signal } = {}) {
  const params = { page, size }
  if (sort) params.sort = sort
  const { data } = await apiClient.get('/physical-media', { params, signal })
  return data
}

// Free-text search across type / category / label / title / content / tags.
// Returns a plain array (not paged). `limit` is clamped 1–100 server-side.
export async function searchPhysicalMedia(q, { limit, signal } = {}) {
  const params = { q }
  if (typeof limit === 'number' && limit > 0) params.limit = limit
  const { data } = await apiClient.get('/physical-media/search', { params, signal })
  return Array.isArray(data) ? data : []
}

export async function getPhysicalMedia(code, { signal } = {}) {
  const { data } = await apiClient.get(`/physical-media/${code}`, { signal })
  return data
}

// Preview the per-type auto-assigned inventory Number for the create form.
// Best-effort (no lock/audit) — the real create re-mints under a lock.
// Returns { physicalMediaType, nextInventoryNumber }.
export async function getPhysicalMediaNextNumber(type, { signal } = {}) {
  const { data } = await apiClient.get('/physical-media/next-number', { params: { type }, signal })
  return data
}

// `payload` matches PhysicalMediaCreateRequestDTO (camelCase field names).
export async function createPhysicalMedia(payload) {
  const { data } = await apiClient.post('/physical-media', payload)
  return data
}

// PATCH semantics: only the keys you send are touched. Empty string ("") clears
// a field server-side (trimOrNull); omit / null leaves it alone.
export async function updatePhysicalMedia(code, payload) {
  const { data } = await apiClient.patch(`/physical-media/${code}`, payload)
  return data
}

// Soft-trash (ADMIN only — gated on physical_media:remove server-side).
export async function deletePhysicalMedia(code) {
  const { data } = await apiClient.delete(`/physical-media/${code}`)
  return data
}

// Bulk Excel ingest. `file` is the .xlsx; optional `sheet` picks a non-default
// sheet by name. One IMPORT audit row is written per upload. Returns a
// PhysicalMediaImportReportDTO (totals + matched/unknown headers + row errors).
export async function importPhysicalMedia(file, { sheet, signal } = {}) {
  const formData = new FormData()
  formData.append('file', file)
  const params = {}
  if (sheet) params.sheet = sheet
  const { data } = await apiClient.post('/physical-media/import', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
    params,
    // A ~4400-row workbook can take ~10s to ingest; lift the default timeout.
    timeout: 0,
    signal,
  })
  return data
}

// ── Type catalog (physical_media:read to list, :type_manage to mutate) ──────────
// Each type carries 9 technical-capture defaults that the create/edit form
// autofills when a type is picked. The frontend GETs the list once and caches it.

export async function getPhysicalMediaTypes({ signal } = {}) {
  const { data } = await apiClient.get('/physical-media/types', { signal })
  return Array.isArray(data) ? data : []
}

// Admin-only (physical_media:type_manage). `payload` is a
// PhysicalMediaTypeCreateRequestDTO (name + the 9 defaults, optional description).
export async function createPhysicalMediaType(payload) {
  const { data } = await apiClient.post('/physical-media/types', payload)
  return data
}

// Admin-only. PATCH semantics on name / description / any of the 9 defaults.
export async function updatePhysicalMediaType(id, payload) {
  const { data } = await apiClient.patch(`/physical-media/types/${id}`, payload)
  return data
}

// Admin-only. Refused (400) if any physical_media row still references the type.
export async function deletePhysicalMediaType(id) {
  const { data } = await apiClient.delete(`/physical-media/types/${id}`)
  return data
}

// Peek at a workbook's sheet names (no DB writes) so the import UI can offer a
// sheet dropdown before kicking off the real import.
export async function getPhysicalMediaImportSheets(file, { signal } = {}) {
  const formData = new FormData()
  formData.append('file', file)
  const { data } = await apiClient.post('/physical-media/import/sheets', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
    timeout: 0,
    signal,
  })
  return Array.isArray(data) ? data : []
}

// ── Admin trash surface (physical_media:delete) ─────────────────────────────────

// Paginated trash listing (admin-only).
export async function getPhysicalMediaTrashPage({ page = 0, size = 50, signal } = {}) {
  const { data } = await apiClient.get('/admin/physical-media/trash', {
    params: { page, size },
    signal,
  })
  return data
}

// Restore a soft-trashed row.
export async function restorePhysicalMedia(code) {
  const { data } = await apiClient.post(`/admin/physical-media/${code}/restore`)
  return data
}

// Permanently delete a trashed row.
export async function purgePhysicalMedia(code) {
  const { data } = await apiClient.delete(`/admin/physical-media/${code}/purge`)
  return data
}
