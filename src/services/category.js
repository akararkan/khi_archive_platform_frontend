import { apiClient } from '@/lib/api-client'

// Backward-compatible: returns just the row array.
export async function getCategories() {
  const { data } = await apiClient.get('/category')
  return data?.content ?? data ?? []
}

// Paginated fetch — returns the full Spring Page<DTO> shape.
//
// Sort + filter (all optional, applied in-memory by the backend
// against its Redis-cached active set, so adding params is cheap):
//   - sortBy           'name' | 'createdAt' | 'updatedAt'
//                      (synonyms: 'added'/'dateAdded' = createdAt;
//                       'modified'/'dateModified' = updatedAt)
//   - sortDirection    'asc' | 'desc'
//   - createdFrom/To   inclusive ISO-8601 range over createdAt
//   - updatedFrom/To   inclusive ISO-8601 range over updatedAt
//   - tags             string[] of tag/keyword values
//   - tagMatch         'any' (default) | 'all'
//
// With no filter/sort params the call is a pure cache pass-through —
// no DB round-trip, so adding the toolbar UI doesn't add load.
export async function getCategoriesPage({
  page = 0,
  size = 100,
  sortBy,
  sortDirection,
  createdFrom,
  createdTo,
  updatedFrom,
  updatedTo,
  tags,
  tagMatch,
  signal,
} = {}) {
  const params = { page, size }
  if (sortBy) params.sortBy = sortBy
  if (sortDirection) params.sortDirection = sortDirection
  if (createdFrom) params.createdFrom = createdFrom
  if (createdTo) params.createdTo = createdTo
  if (updatedFrom) params.updatedFrom = updatedFrom
  if (updatedTo) params.updatedTo = updatedTo
  // Backend accepts both repeated `?tags=a&tags=b` and a single
  // comma-joined string. Axios serialises arrays as repeated by
  // default, which matches the controller's @RequestParam List<String>
  // signature.
  if (Array.isArray(tags) && tags.length > 0) params.tags = tags
  if (tagMatch) params.tagMatch = tagMatch
  const { data } = await apiClient.get('/category', { params, signal })
  return data
}

// Backend search across category name, description, code, and keywords.
// Pass an AbortSignal to cancel an in-flight request when the user keeps typing.
export async function searchCategories(q, { limit, signal } = {}) {
  const params = { q }
  if (typeof limit === 'number' && limit > 0) params.limit = limit
  const { data } = await apiClient.get('/category/search', { params, signal })
  return data
}

export async function getCategory(code) {
  const { data } = await apiClient.get(`/category/${code}`)
  return data
}

export async function createCategory(payload) {
  const { data } = await apiClient.post('/category', payload)
  return data
}

export async function updateCategory(code, payload) {
  const { data } = await apiClient.patch(`/category/${code}`, payload)
  return data
}

// Soft-trash. The backend's DELETE is now a soft-trash (sets
// removedAt/removedBy) rather than a hard delete — files/relations are
// preserved so an admin can restore. Same auth as before (category:delete).
export async function deleteCategory(code) {
  const { data } = await apiClient.delete(`/category/${code}`)
  return data
}

// Restore a trashed category (admin-only — gated on category:delete).
// Mirrors the backend POST endpoint added in the V3 trash model.
export async function restoreCategory(code) {
  const { data } = await apiClient.post(`/category/${code}/restore`)
  return data
}

// Paginated trash listing (admin-only). Returns the full Spring Page<DTO>
// shape — same as getCategoriesPage but for soft-trashed records only.
export async function getCategoryTrashPage({ page = 0, size = 100, signal } = {}) {
  const { data } = await apiClient.get('/category/trash', { params: { page, size }, signal })
  return data
}

// Permanent delete from trash (admin-only — gated on category:delete).
// Backend rejects this if (a) the category is not currently in trash, or
// (b) any project — active OR trashed — still references it. The error
// surfaces back as a 4xx with a human message; let the caller handle.
export async function purgeCategory(code) {
  const { data } = await apiClient.delete(`/category/${code}/purge`)
  return data
}
