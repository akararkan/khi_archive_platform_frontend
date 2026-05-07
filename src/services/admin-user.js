import { apiClient } from '@/lib/api-client'

// All endpoints are gated on ROLE_ADMIN server-side (catalog endpoints)
// or on the user:read / user:update authorities (list / mutating ops).
// EMPLOYEE callers will 403 even on the list endpoint.
const BASE = '/admin/users'

// List every user with role + extra permissions + effective authorities.
// Backend returns a UserAdminDTO[] — fields used by the UI: id, username,
// email, name, role, extraPermissions[], effectiveAuthorities[], active,
// createdAt, updatedAt, lastLoginAt.
export async function listAdminUsers({ signal } = {}) {
  const { data } = await apiClient.get(BASE, { signal })
  return Array.isArray(data) ? data : []
}

export async function getAdminUser(userId, { signal } = {}) {
  const { data } = await apiClient.get(`${BASE}/${userId}`, { signal })
  return data
}

// Returns the updated user. Idempotent server-side — sending the same
// role the user already has is a no-op (no audit row written).
export async function updateAdminUserRole(userId, role) {
  const { data } = await apiClient.put(`${BASE}/${userId}/role`, { role })
  return data
}

// Update the user's fields (name / username / email / role / password /
// isActivated). The endpoint accepts a partial update — only the keys
// the admin changed should be sent so the audit row records a
// precise before→after diff. Returns the updated UserAdminDTO.
//
// The backend self-protects against the calling admin demoting or
// deactivating themselves through this route (returns 409 with
// SELF_DEMOTION / SELF_DEACTIVATE error codes — the standard
// IllegalAdminOperationException envelope handled by the toast layer).
export async function updateAdminUserDetails(userId, payload) {
  const body = {
    name: typeof payload?.name === 'string' ? payload.name.trim() : undefined,
    username:
      typeof payload?.username === 'string' ? payload.username.trim() : undefined,
    email:
      typeof payload?.email === 'string' ? payload.email.trim().toLowerCase() : undefined,
    role: typeof payload?.role === 'string' ? payload.role.trim().toUpperCase() : undefined,
    // Password is sent verbatim — the backend BCrypt-encodes it and
    // resets passwordExpiryDate to now+90d. The audit row records
    // "password=(reset by admin)" without the cleartext.
    password: typeof payload?.password === 'string' && payload.password ? payload.password : undefined,
    // boolean → boolean only; we don't want a spurious "false" sent
    // when the caller didn't touch this field.
    isActivated: typeof payload?.isActivated === 'boolean' ? payload.isActivated : undefined,
  }
  // Strip undefineds so the server can interpret the payload as a
  // partial update (only the keys the admin actually changed).
  const cleaned = Object.fromEntries(
    Object.entries(body).filter(([, v]) => v !== undefined && v !== ''),
  )
  const { data } = await apiClient.put(`${BASE}/${userId}`, cleaned)
  return data
}

// Hard-delete a user. Same caveat as above — assumed
// `DELETE /api/admin/users/{userId}` on the backend. The audit log
// records DELETE; downstream cascades follow the same rules as the
// existing entity hard-deletes.
export async function deleteAdminUser(userId) {
  await apiClient.delete(`${BASE}/${userId}`)
}

// Grant or revoke a list of permissions. Both endpoints accept
// `{ permissions: string[] }`. Idempotent — granting an already-held
// permission or revoking one the user doesn't have writes no audit row.
export async function grantAdminUserPermissions(userId, permissions) {
  const list = Array.isArray(permissions) ? permissions : [permissions]
  const { data } = await apiClient.post(`${BASE}/${userId}/permissions`, {
    permissions: list,
  })
  return data
}

export async function revokeAdminUserPermissions(userId, permissions) {
  const list = Array.isArray(permissions) ? permissions : [permissions]
  // axios DELETE bodies need to go through the `data` config field.
  const { data } = await apiClient.delete(`${BASE}/${userId}/permissions`, {
    data: { permissions: list },
  })
  return data
}

export async function activateAdminUser(userId) {
  const { data } = await apiClient.post(`${BASE}/${userId}/activate`)
  return data
}

export async function deactivateAdminUser(userId) {
  const { data } = await apiClient.post(`${BASE}/${userId}/deactivate`)
  return data
}

// Lock blocks future logins until unlocked. `failedAttempts` and
// `lockTime` come back on the returned UserAdminDTO so the row
// re-renders without an extra fetch.
export async function lockAdminUser(userId) {
  const { data } = await apiClient.post(`${BASE}/${userId}/lock`)
  return data
}

export async function unlockAdminUser(userId) {
  const { data } = await apiClient.post(`${BASE}/${userId}/unlock`)
  return data
}

// Zero the failed-login counter without touching lock state. Useful
// when a user who's racking up attempts isn't an attacker — e.g.
// they're typo-ing a forgotten password.
export async function resetFailedAttempts(userId) {
  const { data } = await apiClient.post(`${BASE}/${userId}/reset-failed-attempts`)
  return data
}

// Revoke every active Session row for the user — they'll be signed
// out from every device and forced to re-authenticate. Backend
// rejects this for the calling admin themselves; admins should use
// /api/auth/logout-all for that.
export async function forceLogoutAdminUser(userId) {
  const { data } = await apiClient.post(`${BASE}/${userId}/force-logout`)
  return data
}

// Catalog endpoints — drive the role / permissions dropdowns. The
// backend returns roles as `{ name, authorities: string[] }`; we
// normalise to also expose `role` so existing UI code that reads
// `item.role` (RoleDialog, AddUserDialog) keeps working without each
// callsite knowing the wire field name.
export async function getRoleCatalog({ signal } = {}) {
  const { data } = await apiClient.get(`${BASE}/catalog/roles`, { signal })
  if (!Array.isArray(data)) return []
  return data.map((item) => {
    const canonical = item?.role ?? item?.name ?? null
    return { ...item, name: canonical, role: canonical }
  })
}

export async function getPermissionCatalog({ signal } = {}) {
  const { data } = await apiClient.get(`${BASE}/catalog/permissions`, { signal })
  return Array.isArray(data) ? data : []
}

// ── User-management audit log ──────────────────────────────────────────
// Backend exposes a Specification-backed endpoint with paging clamped
// to MAX_PAGE_SIZE=200. Filters are passed as query params; only keys
// the caller sets are forwarded so the server's defaults apply
// elsewhere. The shape comes back as a Spring Page (`content`,
// `totalElements`, `number`, `size`, …) — callers usually want
// `content` and `totalElements`.
//
// Available filter keys:
//   - userId         number  scope to a specific target user (only useful via the
//                            global endpoint; the per-user helper sets it for you)
//   - actorId        number  who performed the action
//   - action         string  e.g. 'GRANT_PERMISSIONS', 'ROLE_CHANGE'
//   - q              string  free-text search across username, display name, details
//   - from / to      ISO ts  inclusive timestamp window
//   - page / size    number  zero-indexed page / page size (clamped)
//   - sort           string  e.g. 'createdAt,desc'
function buildAuditQuery(filter = {}) {
  const params = {}
  for (const [key, value] of Object.entries(filter)) {
    if (value === undefined || value === null || value === '') continue
    params[key] = value
  }
  return params
}

// All user-management audit rows across the platform. Use for the
// global activity view + filterable search.
export async function searchAdminUserAuditLogs(filter = {}, { signal } = {}) {
  const { data } = await apiClient.get(`${BASE}/audit-logs`, {
    params: buildAuditQuery(filter),
    signal,
  })
  return data
}

// Per-user audit trail (everything an admin has done to this user
// account: role changes, permission grants/revokes, lock/unlock,
// activate/deactivate, force-logout, delete). Convenience path —
// equivalent to passing `userId` to `searchAdminUserAuditLogs`.
export async function getAdminUserAuditLogs(userId, filter = {}, { signal } = {}) {
  const { data } = await apiClient.get(`${BASE}/${userId}/audit-logs`, {
    params: buildAuditQuery(filter),
    signal,
  })
  return data
}

// Admin-driven user creation. Hits the dedicated admin endpoint
// (POST /api/admin/users) which lets the admin pick the new user's
// role in a single call AND seeds EMPLOYEE_DEFAULT_PERMISSIONS into
// `extraPermissions` server-side. Returns the created UserAdminDTO,
// so the caller can splice it directly into the table without
// refetching.
//
// Critically does NOT go through `services/auth.js#register` — that
// helper stores the new user's JWT and would log the calling admin
// out. The admin endpoint authenticates the caller as the admin and
// emits no token in the response.
export async function registerUserAsAdmin({ name, username, email, password, role }) {
  const body = {
    name: typeof name === 'string' ? name.trim() : '',
    username: typeof username === 'string' ? username.trim() : '',
    email: typeof email === 'string' ? email.trim().toLowerCase() : '',
    password: typeof password === 'string' ? password : '',
    role: typeof role === 'string' && role.trim() ? role.trim().toUpperCase() : undefined,
  }
  const cleaned = Object.fromEntries(
    Object.entries(body).filter(([, v]) => v !== undefined && v !== ''),
  )
  const { data } = await apiClient.post(BASE, cleaned)
  return data
}
