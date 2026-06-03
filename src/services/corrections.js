import { apiClient } from '@/lib/api-client'

// ── Guest (logged-in user) ────────────────────────────────────────────────────
export async function submitCorrection({ mediaType, mediaCode, targetField, suggestedValue }) {
  const { data } = await apiClient.post('/corrections', {
    mediaType,
    mediaCode,
    targetField,
    suggestedValue,
  })
  return data
}

export async function getMyCorrections(params = {}) {
  const { signal, ...query } = params
  const { data } = await apiClient.get('/corrections/me', { params: query, signal })
  return data
}

export async function getMyCorrection(id, { signal } = {}) {
  const { data } = await apiClient.get(`/corrections/me/${id}`, { signal })
  return data
}

// ── Admin ─────────────────────────────────────────────────────────────────────
export async function adminSearchCorrections(params = {}) {
  const { signal, ...query } = params
  const { data } = await apiClient.get('/admin/corrections', { params: query, signal })
  return data
}

export async function adminForwardCorrection(id, payload = {}) {
  const { data } = await apiClient.post(`/admin/corrections/${id}/forward`, payload)
  return data
}

export async function adminResolveCorrection(id, payload = {}) {
  const { data } = await apiClient.post(`/admin/corrections/${id}/resolve`, payload)
  return data
}

export async function adminRejectCorrection(id, payload = {}) {
  const { data } = await apiClient.post(`/admin/corrections/${id}/reject`, payload)
  return data
}

export async function adminRemoveCorrection(id) {
  const { data } = await apiClient.delete(`/admin/corrections/${id}`)
  return data
}

export async function adminApplyCorrection(id, payload = {}) {
  const { data } = await apiClient.post(`/admin/corrections/${id}/apply`, payload)
  return data
}

export async function adminGetCorrectionStats({ signal } = {}) {
  const { data } = await apiClient.get('/admin/corrections/stats', { signal })
  return data
}
