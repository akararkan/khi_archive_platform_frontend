// Warning system — admins can send users formal warnings about their
// work. Backend lives in two surfaces:
//
//   /api/admin/warnings    — issue, edit, list-all, revoke (ROLE_ADMIN
//                            + warning:* permissions)
//   /api/warnings          — recipient surface (any authenticated user
//                            sees their own warnings, can acknowledge)
//
// Severities: INFO | WARNING | CRITICAL.
// Revoked warnings are soft-deleted (removed_at set); they're filtered
// out by default on the recipient side and on admin lists unless the
// caller passes `includeRevoked: true`.

import { apiClient } from '@/lib/api-client'

// CSV-encode arrays + drop empty values so callers can spread one
// filter object across every endpoint without leaking `undefined`
// into the URL.
function buildAdminParams(filter = {}) {
  const params = {}
  if (filter.q) params.q = filter.q
  if (filter.targetUserId != null) params.targetUserId = filter.targetUserId
  if (filter.actorUserId != null) params.actorUserId = filter.actorUserId
  if (filter.severity) params.severity = filter.severity
  if (filter.acknowledged != null) params.acknowledged = filter.acknowledged
  if (filter.includeRevoked != null) params.includeRevoked = filter.includeRevoked
  if (filter.from) params.from = filter.from
  if (filter.to) params.to = filter.to
  return params
}

// ── Admin surface ────────────────────────────────────────────────────

// Paged search across all warnings ever issued. Filters: severity,
// target/actor user, acknowledged-or-not, includeRevoked, date range.
export async function adminSearchWarnings({
  page = 0,
  size = 50,
  sort = 'createdAt,desc',
  signal,
  ...filter
} = {}) {
  const params = { ...buildAdminParams(filter), page, size, sort }
  const { data } = await apiClient.get('/admin/warnings', { params, signal })
  return data
}

export async function adminGetWarning(id, { signal } = {}) {
  const { data } = await apiClient.get(`/admin/warnings/${id}`, { signal })
  return data
}

// Issue a new warning. Payload: { targetUserId, severity, title,
// message }. Self-warns are rejected server-side (409 SELF_WARNING).
export async function adminIssueWarning(payload, { signal } = {}) {
  const { data } = await apiClient.post('/admin/warnings', payload, { signal })
  return data
}

// Edit fields on an existing warning. Only severity/title/message are
// editable; target user, actor, acknowledgement state and timestamps
// are read-only.
export async function adminUpdateWarning(id, payload, { signal } = {}) {
  const { data } = await apiClient.put(`/admin/warnings/${id}`, payload, { signal })
  return data
}

// Revoke = soft-delete. The warning is hidden from the recipient's
// inbox but stays in the admin audit log forever.
export async function adminRevokeWarning(id, { signal } = {}) {
  const { data } = await apiClient.delete(`/admin/warnings/${id}`, { signal })
  return data
}

export async function adminGetSeverityCatalog({ signal } = {}) {
  const { data } = await apiClient.get('/admin/warnings/catalog/severities', { signal })
  return data
}

// ── Recipient surface ────────────────────────────────────────────────

// Caller's own warnings: unacknowledged first, then newest first.
// Revoked warnings are filtered out by the backend.
export async function getMyWarnings({
  page = 0,
  size = 20,
  signal,
} = {}) {
  const { data } = await apiClient.get('/warnings/me', {
    params: { page, size },
    signal,
  })
  return data
}

// `{ unacknowledged: N }` — used for the top-bar bell badge.
export async function getMyWarningCount({ signal } = {}) {
  const { data } = await apiClient.get('/warnings/me/count', { signal })
  return data
}

// Acknowledge one warning. Backend returns 409 WARNING_NOT_FOR_YOU if
// the caller isn't the target.
export async function acknowledgeWarning(id, { signal } = {}) {
  const { data } = await apiClient.post(`/warnings/${id}/acknowledge`, null, { signal })
  return data
}
