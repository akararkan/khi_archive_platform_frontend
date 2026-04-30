import { apiClient } from '@/lib/api-client'

// Backward-compatible: returns just the row array.
export async function getImages() {
  const { data } = await apiClient.get('/image')
  return data?.content ?? data ?? []
}

// Paginated fetch — returns the full Spring Page<DTO> shape.
export async function getImagesPage({ page = 0, size = 100, signal } = {}) {
  const { data } = await apiClient.get('/image', { params: { page, size }, signal })
  return data
}

// Backend two-phase fuzzy search (pg_trgm) across image_code, all titles,
// description, event, location, creator, contributor, person_shown,
// provenance, photostory, note, and child collections (subjects, genres,
// colors, usages, tags, keywords). Pass projectCode to scope results to a
// single project (server-side filter — needed at 30TB scale). Pass an
// AbortSignal to cancel the request when the user keeps typing.
export async function searchImages(q, { limit, projectCode, signal } = {}) {
  const params = { q }
  if (typeof limit === 'number' && limit > 0) params.limit = limit
  if (projectCode) params.projectCode = projectCode
  const { data } = await apiClient.get('/image/search', { params, signal })
  return data
}

export async function getImage(code) {
  const { data } = await apiClient.get(`/image/${code}`)
  return data
}

export async function createImage(payload, file) {
  const formData = new FormData()
  formData.append('data', new Blob([JSON.stringify(payload)], { type: 'application/json' }))
  if (file) formData.append('file', file)

  const { data } = await apiClient.post('/image', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  })
  return data
}

export async function updateImage(code, payload, file) {
  const formData = new FormData()
  formData.append('data', new Blob([JSON.stringify(payload)], { type: 'application/json' }))
  if (file) formData.append('file', file)

  const { data } = await apiClient.patch(`/image/${code}`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  })
  return data
}

// Soft-trash (V3 trash model).
export async function deleteImage(code) {
  const { data } = await apiClient.delete(`/image/${code}`)
  return data
}

// Restore a trashed image (admin-only). Blocked if parent project is trashed.
export async function restoreImage(code) {
  const { data } = await apiClient.post(`/image/${code}/restore`)
  return data
}

// Paginated trash listing (admin-only).
export async function getImageTrashPage({ page = 0, size = 100, signal } = {}) {
  const { data } = await apiClient.get('/image/trash', { params: { page, size }, signal })
  return data
}

// Permanent delete from trash (admin-only — gated on image:delete).
// Removes row + S3 file. Requires the image to already be in trash.
export async function purgeImage(code) {
  const { data } = await apiClient.delete(`/image/${code}/purge`)
  return data
}
