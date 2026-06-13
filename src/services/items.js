import { apiClient } from '@/lib/api-client'

// ── Unified items API ───────────────────────────────────────────────────────
// GET /api/items merges the four media types (Audio / Video / Image / Text)
// into one paginated, filterable list. The backend filters & sorts in-memory
// against the Redis-cached active set, so adding params is cheap. Caller needs
// all four read perms (audio:read + video:read + image:read + text:read) —
// employees get those by default, admins are locked-full.
//
// Each ItemDTO carries a top-level summary (type, code, title, project,
// person, categories, file, visibility, audit) PLUS the complete original
// per-type DTO under exactly one of item.audio / item.video / item.image /
// item.text — unwrap that only in the detail view.

// The four discriminator values, in display order.
export const ITEM_TYPES = ['AUDIO', 'VIDEO', 'IMAGE', 'TEXT']

// Paginated fetch — returns the full Spring Page<ItemDTO> shape:
//   { content, totalElements, totalPages, number, size, first, last }
//
// All filter/sort fields are optional; omitted ones are simply not sent so a
// bare call is a pure cache pass-through. Array fields serialise as repeated
// query params (?types=AUDIO&types=VIDEO) which matches the controller's
// List<String> signature. Date fields are ISO-8601 instants.
export async function getItemsPage({
  q,
  types,                    // string[]  AUDIO | VIDEO | IMAGE | TEXT
  projectCodes,             // string[]
  personCodes,              // string[]  (use 'UNTITLED' to include person-less projects)
  categoryCodes,            // string[]
  languages,                // string[]
  isPublic,                 // boolean — row's own flag
  projectVisibleToPublic,   // boolean — project-level flag
  createdFrom,
  createdTo,
  updatedFrom,
  updatedTo,
  sortBy,                   // createdAt | updatedAt | title | code | projectName | personName | type
  sortDirection,            // asc | desc
  page = 0,
  size = 50,
  signal,
} = {}) {
  const params = { page, size }

  const trimmed = typeof q === 'string' ? q.trim() : ''
  if (trimmed) params.q = trimmed
  if (Array.isArray(types) && types.length > 0) params.types = types
  if (Array.isArray(projectCodes) && projectCodes.length > 0) params.projectCodes = projectCodes
  if (Array.isArray(personCodes) && personCodes.length > 0) params.personCodes = personCodes
  if (Array.isArray(categoryCodes) && categoryCodes.length > 0) params.categoryCodes = categoryCodes
  if (Array.isArray(languages) && languages.length > 0) params.languages = languages
  if (typeof isPublic === 'boolean') params.isPublic = isPublic
  if (typeof projectVisibleToPublic === 'boolean') params.projectVisibleToPublic = projectVisibleToPublic
  if (createdFrom) params.createdFrom = createdFrom
  if (createdTo) params.createdTo = createdTo
  if (updatedFrom) params.updatedFrom = updatedFrom
  if (updatedTo) params.updatedTo = updatedTo
  if (sortBy) params.sortBy = sortBy
  if (sortDirection) params.sortDirection = sortDirection

  const { data } = await apiClient.get('/items', { params, signal })
  return data
}

// ── Inline visibility toggle ─────────────────────────────────────────────────
// Flip ONLY an item's own public flag (isPublic) without opening the edit form.
// One lightweight call to the dedicated unified endpoint — the backend resolves
// {type} → the matching media service, checks `{type}:update`, flips just the
// flag, and returns the updated DTO. Idempotent (no-op when unchanged), trash-
// safe (404 on a trashed code), and a concurrent edit returns 409 with the
// STALE_VERSION shape the page handler already detects.
//   PATCH /api/items/{type}/{code}/visibility   { isPublic }
// {type} is case-insensitive; item.type is already AUDIO|VIDEO|IMAGE|TEXT.
export async function setItemVisibility(item, isPublic) {
  if (!item?.type || !item?.code) {
    throw new Error(`Cannot set visibility for item: ${item?.type} ${item?.code}`)
  }
  const { data } = await apiClient.patch(
    `/items/${item.type}/${item.code}/visibility`,
    { isPublic },
  )
  return data
}
