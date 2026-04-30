import { apiClient } from '@/lib/api-client'

// Backward-compatible: returns just the row array.
export async function getAudios() {
  const { data } = await apiClient.get('/audio')
  return data?.content ?? data ?? []
}

// Paginated fetch — returns the full Spring Page<DTO> shape.
export async function getAudiosPage({ page = 0, size = 100, signal } = {}) {
  const { data } = await apiClient.get('/audio', { params: { page, size }, signal })
  return data
}

// Backend two-phase fuzzy search (pg_trgm) across audio_code, all titles,
// full_name, form, language, description, transcription, lyrics, contributors,
// and child collections (subjects, genres, tags, keywords). Pass projectCode
// to scope results server-side. Pass an AbortSignal to cancel the request
// when the user keeps typing.
export async function searchAudios(q, { limit, projectCode, signal } = {}) {
  const params = { q }
  if (typeof limit === 'number' && limit > 0) params.limit = limit
  if (projectCode) params.projectCode = projectCode
  const { data } = await apiClient.get('/audio/search', { params, signal })
  return data
}

export async function getAudio(code) {
  const { data } = await apiClient.get(`/audio/${code}`)
  return data
}

export async function createAudio(payload, file) {
  const formData = new FormData()
  formData.append('data', new Blob([JSON.stringify(payload)], { type: 'application/json' }))
  if (file) formData.append('file', file)

  const { data } = await apiClient.post('/audio', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  })
  return data
}

export async function updateAudio(code, payload, file) {
  const formData = new FormData()
  formData.append('data', new Blob([JSON.stringify(payload)], { type: 'application/json' }))
  if (file) formData.append('file', file)

  const { data } = await apiClient.patch(`/audio/${code}`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  })
  return data
}

// Soft-trash (V3 trash model — files in S3 are preserved).
export async function deleteAudio(code) {
  const { data } = await apiClient.delete(`/audio/${code}`)
  return data
}

// Restore a trashed audio (admin-only — gated on audio:delete). Backend
// blocks this if the parent project is still in trash; surface that error.
export async function restoreAudio(code) {
  const { data } = await apiClient.post(`/audio/${code}/restore`)
  return data
}

// Paginated trash listing (admin-only).
export async function getAudioTrashPage({ page = 0, size = 100, signal } = {}) {
  const { data } = await apiClient.get('/audio/trash', { params: { page, size }, signal })
  return data
}

// Permanent delete from trash (admin-only — gated on audio:delete).
// Removes the row AND the S3 file in one shot. Requires the audio to
// already be in trash; calling purge on an active record errors.
export async function purgeAudio(code) {
  const { data } = await apiClient.delete(`/audio/${code}/purge`)
  return data
}
