import { apiClient } from '@/lib/api-client'

// Backward-compatible: returns just the row array.
export async function getVideos() {
  const { data } = await apiClient.get('/video')
  return data?.content ?? data ?? []
}

// Paginated fetch — returns the full Spring Page<DTO> shape.
export async function getVideosPage({ page = 0, size = 100, signal } = {}) {
  const { data } = await apiClient.get('/video', { params: { page, size }, signal })
  return data
}

// Backend two-phase fuzzy search (pg_trgm) across video_code, all titles,
// description, event, location, language, resolution, and child collections
// (subjects, genres, tags, keywords, contributors). Pass projectCode to
// scope results server-side. Pass an AbortSignal to cancel the request when
// the user keeps typing.
export async function searchVideos(q, { limit, projectCode, signal } = {}) {
  const params = { q }
  if (typeof limit === 'number' && limit > 0) params.limit = limit
  if (projectCode) params.projectCode = projectCode
  const { data } = await apiClient.get('/video/search', { params, signal })
  return data
}

export async function getVideo(code) {
  const { data } = await apiClient.get(`/video/${code}`)
  return data
}

export async function createVideo(payload, file) {
  const formData = new FormData()
  formData.append('data', new Blob([JSON.stringify(payload)], { type: 'application/json' }))
  if (file) formData.append('file', file)

  const { data } = await apiClient.post('/video', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  })
  return data
}

export async function updateVideo(code, payload, file) {
  const formData = new FormData()
  formData.append('data', new Blob([JSON.stringify(payload)], { type: 'application/json' }))
  if (file) formData.append('file', file)

  const { data } = await apiClient.patch(`/video/${code}`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  })
  return data
}

// Soft-trash (V3 trash model).
export async function deleteVideo(code) {
  const { data } = await apiClient.delete(`/video/${code}`)
  return data
}

// Restore a trashed video (admin-only). Blocked if parent project is trashed.
export async function restoreVideo(code) {
  const { data } = await apiClient.post(`/video/${code}/restore`)
  return data
}

// Paginated trash listing (admin-only).
export async function getVideoTrashPage({ page = 0, size = 100, signal } = {}) {
  const { data } = await apiClient.get('/video/trash', { params: { page, size }, signal })
  return data
}

// Permanent delete from trash (admin-only — gated on video:delete).
// Removes row + S3 file. Requires the video to already be in trash.
export async function purgeVideo(code) {
  const { data } = await apiClient.delete(`/video/${code}/purge`)
  return data
}
