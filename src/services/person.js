import { apiClient } from '@/lib/api-client'

// Backward-compatible: returns just the row array.
export async function getPersons() {
  const { data } = await apiClient.get('/person')
  return data?.content ?? data ?? []
}

// Paginated fetch — returns the full Spring Page<DTO> shape.
export async function getPersonsPage({ page = 0, size = 100, signal } = {}) {
  const { data } = await apiClient.get('/person', { params: { page, size }, signal })
  return data
}

// Backend search across full name, nickname, romanized name, description,
// tags, keywords, region, places, code, and person type. Pass an AbortSignal
// to cancel an in-flight request when the user keeps typing.
export async function searchPersons(q, { limit, signal } = {}) {
  const params = { q }
  if (typeof limit === 'number' && limit > 0) params.limit = limit
  const { data } = await apiClient.get('/person/search', { params, signal })
  return data
}

export async function getPerson(code) {
  const { data } = await apiClient.get(`/person/${code}`)
  return data
}

export async function createPerson(payload, mediaPortrait) {
  const formData = new FormData()
  formData.append('data', new Blob([JSON.stringify(payload)], { type: 'application/json' }))
  if (mediaPortrait) formData.append('mediaPortrait', mediaPortrait)

  const { data } = await apiClient.post('/person', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  })
  return data
}

export async function updatePerson(code, payload, mediaPortrait) {
  const formData = new FormData()
  formData.append('data', new Blob([JSON.stringify(payload)], { type: 'application/json' }))
  if (mediaPortrait) formData.append('mediaPortrait', mediaPortrait)

  const { data } = await apiClient.patch(`/person/${code}`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  })
  return data
}

// Soft-trash with cascade (V3 trash model). Trashes the person AND every
// project they're linked to (each project itself cascades to its media).
// Categories and other people are not touched. Returns a summary the
// caller surfaces in the toast so the user sees exactly what happened:
//   {
//     personCode: "PER0042",
//     trashedProjectsCount: 2,
//     trashedProjectCodes: ["PER0042_PROJ_000001", "PER0042_PROJ_000002"]
//   }
// The body is empty `{}` if there were no active projects to trash.
export async function deletePerson(code) {
  const { data } = await apiClient.delete(`/person/${code}`)
  return data
}

// Restore a trashed person (admin-only — gated on person:delete).
// CASCADES: every trashed project linked to this person is restored,
// and each restored project itself cascade-restores its media. So
// `Person delete → restore` is fully reversible. The response wraps
// the person DTO with the cascade summary:
//   {
//     person: { ... PersonResponseDTO ... },
//     restoredProjectsCount: 2,
//     restoredProjectCodes: ["PER0042_PROJ_000001", "PER0042_PROJ_000002"],
//   }
export async function restorePerson(code) {
  const { data } = await apiClient.post(`/person/${code}/restore`)
  return data
}

// Paginated trash listing (admin-only).
export async function getPersonTrashPage({ page = 0, size = 100, signal } = {}) {
  const { data } = await apiClient.get('/person/trash', { params: { page, size }, signal })
  return data
}

// Permanent delete from trash (admin-only — gated on person:delete).
// Backend rejects this if (a) the person is not currently in trash, or
// (b) any project — active OR trashed — still references them. Surface
// the server error verbatim so admin sees which projects to purge first.
export async function purgePerson(code) {
  const { data } = await apiClient.delete(`/person/${code}/purge`)
  return data
}
