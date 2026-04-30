import { apiClient } from '@/lib/api-client'

// Backward-compatible: returns just the row array (was the old shape) so
// existing callers (modals, dropdowns, the Project-Detail page's media
// loaders) keep working. The backend now always returns a Spring Page,
// so we read `.content`.
export async function getProjects() {
  const { data } = await apiClient.get('/project')
  return data?.content ?? data ?? []
}

// Paginated fetch — returns the full Spring Page<DTO> shape:
//   { content, totalElements, totalPages, number, size, first, last }
// The list views call this so they can render server-side pagination.
export async function getProjectsPage({ page = 0, size = 100, signal } = {}) {
  const { data } = await apiClient.get('/project', { params: { page, size }, signal })
  return data
}

export async function getProject(code) {
  const { data } = await apiClient.get(`/project/${code}`)
  return data
}

export async function createProject(payload) {
  const { data } = await apiClient.post('/project', payload)
  return data
}

export async function updateProject(code, payload) {
  const { data } = await apiClient.patch(`/project/${code}`, payload)
  return data
}

// Soft-trash (V3 trash model). Important: deleting a project also bulk-
// trashes its audio/video/image/text records (server-side cascade). The
// linked person and category are NOT touched. Use the warning copy on
// the confirm dialog so users know what they're sending to trash.
export async function deleteProject(code) {
  const { data } = await apiClient.delete(`/project/${code}`)
  return data
}

// Restore a trashed project (admin-only — gated on project:delete).
// CASCADES: every audio/video/image/text record currently in this
// project's trash comes back with it. The response wraps the project
// DTO with per-media-type counts so the caller can show what came back:
//   {
//     project: { ... ProjectResponseDTO ... },
//     restoredAudios: 12, restoredVideos: 4,
//     restoredImages: 3,  restoredTexts:  0,
//   }
// Note this restores EVERY media currently trashed for the project,
// regardless of whether each was trashed via the project cascade or
// trashed independently before the project went to trash. The backend
// doesn't track that provenance; admin can re-trash specific media
// after restore if needed.
export async function restoreProject(code) {
  const { data } = await apiClient.post(`/project/${code}/restore`)
  return data
}

// Paginated trash listing (admin-only).
export async function getProjectTrashPage({ page = 0, size = 100, signal } = {}) {
  const { data } = await apiClient.get('/project/trash', { params: { page, size }, signal })
  return data
}

// Permanent delete from trash (admin-only — gated on project:delete).
// CASCADES: deletes the project plus every audio/video/image/text linked
// to it (rows + S3 files). Categories and the linked person are NOT
// touched. Backend requires the project to already be in trash; calling
// purge on an active project returns a validation error.
export async function purgeProject(code) {
  const { data } = await apiClient.delete(`/project/${code}/purge`)
  return data
}
