import { apiClient } from '@/lib/api-client'

// Backward-compatible: returns just the row array.
export async function getTexts() {
  const { data } = await apiClient.get('/text')
  return data?.content ?? data ?? []
}

// Paginated fetch — returns the full Spring Page<DTO> shape.
export async function getTextsPage({ page = 0, size = 100, signal } = {}) {
  const { data } = await apiClient.get('/text', { params: { page, size }, signal })
  return data
}

// Backend two-phase fuzzy search (pg_trgm) across text_code, all titles,
// description, transcription, author, contributors, printing_house,
// provenance, note, isbn, and child collections (subjects, genres, tags,
// keywords). Pass projectCode to scope results server-side. Pass an
// AbortSignal to cancel the request when the user keeps typing.
export async function searchTexts(q, { limit, projectCode, signal } = {}) {
  const params = { q }
  if (typeof limit === 'number' && limit > 0) params.limit = limit
  if (projectCode) params.projectCode = projectCode
  const { data } = await apiClient.get('/text/search', { params, signal })
  return data
}

export async function getText(code) {
  const { data } = await apiClient.get(`/text/${code}`)
  return data
}

export async function createText(payload, file) {
  const formData = new FormData()
  formData.append('data', new Blob([JSON.stringify(payload)], { type: 'application/json' }))
  if (file) formData.append('file', file)

  const { data } = await apiClient.post('/text', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  })
  return data
}

export async function updateText(code, payload, file) {
  const formData = new FormData()
  formData.append('data', new Blob([JSON.stringify(payload)], { type: 'application/json' }))
  if (file) formData.append('file', file)

  const { data } = await apiClient.patch(`/text/${code}`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  })
  return data
}

// Soft-trash (V3 trash model).
export async function deleteText(code) {
  const { data } = await apiClient.delete(`/text/${code}`)
  return data
}

// Restore a trashed text (admin-only). Blocked if parent project is trashed.
export async function restoreText(code) {
  const { data } = await apiClient.post(`/text/${code}/restore`)
  return data
}

// Paginated trash listing (admin-only).
export async function getTextTrashPage({ page = 0, size = 100, signal } = {}) {
  const { data } = await apiClient.get('/text/trash', { params: { page, size }, signal })
  return data
}

// Permanent delete from trash (admin-only — gated on text:delete).
// Removes row + S3 file. Requires the text to already be in trash.
export async function purgeText(code) {
  const { data } = await apiClient.delete(`/text/${code}/purge`)
  return data
}
