// Guest (public) API — all endpoints under /api/guest/** are permitAll on the
// backend. The shared apiClient prepends /api, so we hit /guest/... here. The
// JWT interceptor still attaches a token when one happens to be in storage,
// but the backend ignores it for these routes.

import { apiClient } from '@/lib/api-client'

// Universal global search — single round-trip that returns the top N rows in
// every section (projects/categories/persons/audios/videos/texts/images) plus
// per-section counts. The home page and the global results page both use it.
export async function guestGlobalSearch({ q, perSection, signal } = {}) {
  const params = {}
  if (q) params.q = q
  if (typeof perSection === 'number' && perSection > 0) params.perSection = perSection
  const { data } = await apiClient.get('/guest/search', { params, signal })
  return data
}

// Public media feed for the main guest browse/search grid. The backend accepts
// repeated arrays (`types`, `subject`, `genre`, `tag`, `keyword`) in Spring's
// `?types=image&types=audio` form, so axios bracket indexes are disabled here.
export async function guestFeed(params = {}) {
  const { signal, ...rest } = params
  const { data } = await apiClient.get('/guest/feed', {
    params: rest,
    paramsSerializer: { indexes: null },
    signal,
  })
  return data
}

// Autocomplete suggestions across every entity. Keep `limit` small (~10) for
// header search dropdowns.
export async function guestSuggest({ q, limit, signal } = {}) {
  const params = { q }
  if (typeof limit === 'number' && limit > 0) params.limit = limit
  const { data } = await apiClient.get('/guest/suggest', { params, signal })
  return data
}

// Sidebar checkbox counts (media-type, categories, persons, languages,
// dialects, regions, subjects, genres, tags, keywords). Hits the in-memory
// facet map.
export async function guestFacets({ signal } = {}) {
  const { data } = await apiClient.get('/guest/facets', { signal })
  return data
}

// Public trending data: highlighted media rows plus top search terms.
export async function guestTrending({ signal } = {}) {
  const { data } = await apiClient.get('/guest/trending', { signal })
  return data
}

// ── Projects ─────────────────────────────────────────────────────────────
export async function guestProjects(params = {}) {
  const { signal, ...query } = params
  const { data } = await apiClient.get('/guest/projects', { params: query, signal })
  return data
}

export async function guestProject(projectCode, { signal } = {}) {
  const { data } = await apiClient.get(`/guest/projects/${projectCode}`, { signal })
  return data
}

export async function guestProjectMedia(projectCode, { type, signal } = {}) {
  const params = {}
  if (type) params.type = type
  const { data } = await apiClient.get(`/guest/projects/${projectCode}/media`, { params, signal })
  return data
}

// ── Categories ───────────────────────────────────────────────────────────
export async function guestCategories(params = {}) {
  const { signal, ...query } = params
  const { data } = await apiClient.get('/guest/categories', { params: query, signal })
  return data
}

export async function guestCategory(categoryCode, { signal } = {}) {
  const { data } = await apiClient.get(`/guest/categories/${categoryCode}`, { signal })
  return data
}

export async function guestCategoryProjects(categoryCode, params = {}) {
  const { signal, ...query } = params
  const { data } = await apiClient.get(`/guest/categories/${categoryCode}/projects`, {
    params: query,
    signal,
  })
  return data
}

// ── Persons ──────────────────────────────────────────────────────────────
export async function guestPersons(params = {}) {
  const { signal, ...query } = params
  const { data } = await apiClient.get('/guest/persons', { params: query, signal })
  return data
}

export async function guestPerson(personCode, { signal } = {}) {
  const { data } = await apiClient.get(`/guest/persons/${personCode}`, { signal })
  return data
}

export async function guestPersonProjects(personCode, params = {}) {
  const { signal, ...query } = params
  const { data } = await apiClient.get(`/guest/persons/${personCode}/projects`, {
    params: query,
    signal,
  })
  return data
}

// ── Media (audios / videos / texts / images) ─────────────────────────────
function makeMediaApi(resource) {
  return {
    async list(params = {}) {
      const { signal, ...query } = params
      // Repeatable filters (genre/subject/tag/keyword + the entity-specific list
      // fields like color/whereUsed/contributor) must serialize as
      // `?genre=a&genre=b`, not axios's default `genre[]=…` brackets — same
      // contract the feed call uses.
      const { data } = await apiClient.get(`/guest/${resource}`, {
        params: query,
        paramsSerializer: { indexes: null },
        signal,
      })
      return data
    },
    async one(code, { signal } = {}) {
      const { data } = await apiClient.get(`/guest/${resource}/${code}`, { signal })
      return data
    },
  }
}

export const guestAudios = makeMediaApi('audios')
export const guestVideos = makeMediaApi('videos')
export const guestTexts = makeMediaApi('texts')
export const guestImages = makeMediaApi('images')
