function normalizeRole(role) {
  return typeof role === 'string' ? role.trim().toLowerCase() : ''
}

function getAccountArea(role) {
  const r = normalizeRole(role)
  if (r.includes('admin'))    return 'admin'
  if (r.includes('employee')) return 'employee'
  if (r.includes('teacher'))  return 'teacher'
  return 'guest'
}

function getAccountHomePath(profile) {
  const area = getAccountArea(profile?.role)
  if (area === 'admin')    return '/admin/dashboard'
  if (area === 'employee') return '/employee/profile'
  if (area === 'teacher')  return '/teacher'
  // Self-registered GUESTs have no role workspace — keep them on the
  // public catalogue and surface profile info inside the header dropdown.
  return '/public'
}

export { getAccountArea, getAccountHomePath, normalizeRole }