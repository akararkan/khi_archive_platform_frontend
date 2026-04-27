function normalizeRole(role) {
  return typeof role === 'string' ? role.trim().toLowerCase() : ''
}

function getAccountArea(role) {
  return normalizeRole(role).includes('admin') ? 'admin' : 'employee'
}

function getAccountHomePath(profile) {
  return getAccountArea(profile?.role) === 'admin' ? '/admin/dashboard' : '/employee/profile'
}

export { getAccountArea, getAccountHomePath, normalizeRole }