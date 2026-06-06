import { apiClient } from '@/lib/api-client'

// ── List-of-Maqam API ─────────────────────────────────────────────────────────
// Covers every endpoint introduced by the maqam feature. Mirrors the
// conventions of services/audio.js (multipart create/update with a JSON `data`
// part) and services/admin-user.js (admin sub-resources).
//
// Audio rule: the raw S3 URL is NEVER returned by the backend. Playback always
// goes through the range-aware streaming endpoint, which requires auth. Since
// the <audio> element can't attach the Bearer token, we fetch the bytes as a
// blob through the shared apiClient (which sets Authorization) and hand the
// caller an object URL — see fetchMaqamStreamBlob below.

// ── Read (maqam:read) ──────────────────────────────────────────────────────────

// Paginated list. ADMIN/EMPLOYEE get every active record; TEACHER callers get
// only the records they're assigned to (enforced server-side). Returns the full
// Spring Page<MaqamResponse> shape.
export async function getMaqamsPage({ page = 0, size = 50, sort, signal } = {}) {
  const params = { page, size }
  if (sort) params.sort = sort
  const { data } = await apiClient.get('/maqam', { params, signal })
  return data
}

// Free-text search by song name / producer / maqam code. Returns a plain array.
export async function searchMaqams(q, { limit, signal } = {}) {
  const params = { q }
  if (typeof limit === 'number' && limit > 0) params.limit = limit
  const { data } = await apiClient.get('/maqam/search', { params, signal })
  return Array.isArray(data) ? data : []
}

export async function getMaqam(code, { signal } = {}) {
  const { data } = await apiClient.get(`/maqam/${code}`, { signal })
  return data
}

// Teacher "where was I?" feed (maqam:vote / TEACHER only). Returns a
// Page<MaqamTeacherRecentDTO> sorted by most-recent activity. Optional `q`
// substring-matches song name / producer / code server-side.
export async function getMyRecentMaqam({ q, page = 0, size = 50, signal } = {}) {
  const params = { page, size }
  if (q && q.trim()) params.q = q.trim()
  const { data } = await apiClient.get('/maqam/teacher/my-recent', { params, signal })
  return data
}

// ── Write (maqam:create / maqam:update / maqam:delete) ──────────────────────────

// `payload` is a MaqamCreateRequest (songName, producer, archiveNote?,
// teacherUserIds?). `file` is the audio (audio/* MIME, ≤ 1 GB). The S3 URL is
// computed server-side and never accepted from the client.
export async function createMaqam(payload, file) {
  const formData = new FormData()
  formData.append('data', new Blob([JSON.stringify(payload)], { type: 'application/json' }))
  if (file) formData.append('file', file)
  const { data } = await apiClient.post('/maqam', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
    // Audio can be large; lift the default 15s client timeout for uploads.
    timeout: 0,
  })
  return data
}

// `payload` is a MaqamUpdateRequest. Omitting `file` leaves the existing audio
// in place.
export async function updateMaqam(code, payload, file) {
  const formData = new FormData()
  formData.append('data', new Blob([JSON.stringify(payload)], { type: 'application/json' }))
  if (file) formData.append('file', file)
  const { data } = await apiClient.patch(`/maqam/${code}`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
    timeout: 0,
  })
  return data
}

// Soft-trash (ADMIN only — gated on maqam:delete server-side).
export async function deleteMaqam(code) {
  const { data } = await apiClient.delete(`/maqam/${code}`)
  return data
}

// ── Stream (maqam:read, range-aware) ────────────────────────────────────────────

// Fetch the audio bytes as a Blob with the Authorization header attached, so we
// can hand an object URL to the <audio> element (which can't set headers
// itself). Every call writes one STREAM audit row server-side. Remember to
// URL.revokeObjectURL the returned url when done.
export async function fetchMaqamStreamUrl(code, { signal } = {}) {
  const { data } = await apiClient.get(`/maqam/${code}/stream`, {
    responseType: 'blob',
    signal,
    timeout: 0,
  })
  return URL.createObjectURL(data)
}

// ── Voting (maqam:vote, TEACHER only) ────────────────────────────────────────────

// Upsert. First call records VOTE_CAST; later calls record VOTE_UPDATED.
// `payload` is a MaqamVoteRequest (maqamType, teacherNote?). Returns the full
// MaqamResponse so callers can refresh the record in place.
export async function castMaqamVote(code, payload) {
  const { data } = await apiClient.post(`/maqam/${code}/vote`, payload)
  return data
}

// ── Listen tracking (maqam:vote, TEACHER only) ───────────────────────────────────

// Open a listen session. `payload`: { sessionKey, startPositionSeconds? }.
export async function startMaqamListen(code, payload) {
  const { data } = await apiClient.post(`/maqam/${code}/listen/start`, payload)
  return data
}

// Ping a delta of listened audio time. `payload`:
// { sessionKey, addSeconds, positionSeconds }. addSeconds is capped at 60/call
// server-side.
export async function progressMaqamListen(code, payload) {
  const { data } = await apiClient.post(`/maqam/${code}/listen/progress`, payload)
  return data
}

// Close the listen session. `payload`:
// { sessionKey, addSeconds?, positionSeconds? }.
export async function endMaqamListen(code, payload) {
  const { data } = await apiClient.post(`/maqam/${code}/listen/end`, payload)
  return data
}

// Per-teacher engagement aggregate (array of MaqamListenSummary).
export async function getMaqamListenSummary(code, { signal } = {}) {
  const { data } = await apiClient.get(`/maqam/${code}/listen-summary`, { signal })
  return Array.isArray(data) ? data : []
}

// Per-session listen log for a record (paged SessionPage). Optionally scope to
// one teacher via `teacherUserId`.
export async function getMaqamSessions(code, { teacherUserId, page = 0, size = 100, signal } = {}) {
  const params = { page, size }
  if (teacherUserId != null) params.teacherUserId = teacherUserId
  const { data } = await apiClient.get(`/maqam/${code}/sessions`, { params, signal })
  return data
}

// ── Admin surface (maqam:teacher_manage / maqam:delete / ROLE_ADMIN) ─────────────

// Replace the teacher panel (1–3 distinct TEACHER users). Returns the updated
// MaqamResponse.
export async function replaceMaqamTeachers(code, teacherUserIds) {
  const list = Array.isArray(teacherUserIds) ? teacherUserIds : [teacherUserIds]
  const { data } = await apiClient.put(`/admin/maqam/${code}/teachers`, {
    teacherUserIds: list,
  })
  return data
}

// Paginated trash listing (admin-only).
export async function getMaqamTrashPage({ page = 0, size = 100, signal } = {}) {
  const { data } = await apiClient.get('/admin/maqam/trash', { params: { page, size }, signal })
  return data
}

// Restore a soft-trashed record.
export async function restoreMaqam(code) {
  const { data } = await apiClient.post(`/admin/maqam/${code}/restore`)
  return data
}

// Permanently delete a trashed record (including its S3 file).
export async function purgeMaqam(code) {
  const { data } = await apiClient.delete(`/admin/maqam/${code}/purge`)
  return data
}

// Clear one teacher's vote without removing them from the panel — they may
// re-vote. Returns the updated MaqamResponse.
export async function clearMaqamVote(code, teacherUserId) {
  const { data } = await apiClient.delete(`/admin/maqam/${code}/votes/${teacherUserId}`)
  return data
}

// Every listen session a teacher ever recorded, across all records (ADMIN
// only). Includes ipAddress / userAgent PII. Paged SessionPage.
export async function getTeacherSessions(teacherUserId, { page = 0, size = 100, signal } = {}) {
  const { data } = await apiClient.get(`/admin/maqam/teachers/${teacherUserId}/sessions`, {
    params: { page, size },
    signal,
  })
  return data
}
