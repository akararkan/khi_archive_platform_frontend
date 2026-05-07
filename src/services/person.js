import { apiClient } from '@/lib/api-client'

// Backward-compatible: returns just the row array.
export async function getPersons() {
  const { data } = await apiClient.get('/person')
  return data?.content ?? data ?? []
}

// Paginated fetch — returns the full Spring Page<DTO> shape.
//
// Sort + filter (all optional, applied in-memory by the backend
// against its Redis-cached active set, so adding params is cheap).
//
// Sort:
//   - sortBy           'fullName' (synonyms: 'name', 'alpha')
//                      'createdAt' (synonyms: 'added', 'dateAdded')
//                      'updatedAt' (synonyms: 'modified', 'dateModified')
//                      'dateOfBirth' (synonyms: 'dob', 'birth')
//                      'dateOfDeath' (synonyms: 'dod', 'death')
//   - sortDirection    'asc' | 'desc'
//
// Filters (all optional):
//   - gender               'MALE' | 'FEMALE'
//   - region               case-insensitive contains
//   - placeOfBirth         case-insensitive contains
//   - placeOfDeath         case-insensitive contains
//   - dobFrom / dobTo      ISO-8601 date range over dateOfBirth
//   - dodFrom / dodTo      ISO-8601 date range over dateOfDeath
//   - createdFrom / To     ISO-8601 instant range over createdAt
//   - updatedFrom / To     ISO-8601 instant range over updatedAt
//   - tags                 string[]; pair with tagMatch
//   - tagMatch             'any' (default) | 'all'
//   - keywords             string[]; pair with keywordMatch
//   - keywordMatch         'any' (default) | 'all'
//   - personType           string[] (e.g. 'poet','writer'); pair
//                          with personTypeMatch
//   - personTypeMatch      'any' (default) | 'all'
//
// With no filter/sort params the call is a pure cache pass-through —
// no DB round-trip, so adding the toolbar UI doesn't add load.
export async function getPersonsPage({
  page = 0,
  size = 100,
  sortBy,
  sortDirection,
  gender,
  region,
  placeOfBirth,
  placeOfDeath,
  dobFrom,
  dobTo,
  dodFrom,
  dodTo,
  createdFrom,
  createdTo,
  updatedFrom,
  updatedTo,
  tags,
  tagMatch,
  keywords,
  keywordMatch,
  personType,
  personTypeMatch,
  signal,
} = {}) {
  const params = { page, size }
  if (sortBy) params.sortBy = sortBy
  if (sortDirection) params.sortDirection = sortDirection
  if (gender) params.gender = gender
  if (region) params.region = region
  if (placeOfBirth) params.placeOfBirth = placeOfBirth
  if (placeOfDeath) params.placeOfDeath = placeOfDeath
  if (dobFrom) params.dobFrom = dobFrom
  if (dobTo) params.dobTo = dobTo
  if (dodFrom) params.dodFrom = dodFrom
  if (dodTo) params.dodTo = dodTo
  if (createdFrom) params.createdFrom = createdFrom
  if (createdTo) params.createdTo = createdTo
  if (updatedFrom) params.updatedFrom = updatedFrom
  if (updatedTo) params.updatedTo = updatedTo
  // Backend accepts both repeated `?tags=a&tags=b` and a single
  // comma-joined string for the array filters. Axios serialises
  // arrays as repeated by default, which matches the controller's
  // @RequestParam List<String> signature.
  if (Array.isArray(tags) && tags.length > 0) params.tags = tags
  if (tagMatch) params.tagMatch = tagMatch
  if (Array.isArray(keywords) && keywords.length > 0) params.keywords = keywords
  if (keywordMatch) params.keywordMatch = keywordMatch
  if (Array.isArray(personType) && personType.length > 0) params.personType = personType
  if (personTypeMatch) params.personTypeMatch = personTypeMatch
  const { data } = await apiClient.get('/person', { params, signal })
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
