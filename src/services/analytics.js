import { apiClient } from '@/lib/api-client'

// Backend gates the entire /api/analytics surface on ROLE_ADMIN — so all
// of these calls 403 for employees. They live exclusively under the
// /admin section of the app.
//
// Every endpoint accepts the same `AnalyticsFilter` shape on the server.
// `buildFilterParams` mirrors that contract: pass any subset and the
// helper drops empties and CSV-encodes array values. `days` defaults to
// 30 server-side and is capped at 365.

// CSV-encode arrays; the server splits on `,`. Empty/null values are
// dropped so callers can spread one object across every endpoint.
function buildFilterParams(filter = {}) {
  const params = {}
  if (filter.days != null) params.days = filter.days
  if (filter.from) params.from = filter.from
  if (filter.to) params.to = filter.to
  if (filter.entities && filter.entities.length) {
    params.entities = Array.isArray(filter.entities) ? filter.entities.join(',') : filter.entities
  }
  if (filter.actions && filter.actions.length) {
    params.actions = Array.isArray(filter.actions) ? filter.actions.join(',') : filter.actions
  }
  if (filter.actor) params.actor = filter.actor
  if (filter.actorPattern) params.actorPattern = filter.actorPattern
  if (filter.entityCode) params.entityCode = filter.entityCode
  if (filter.q) params.q = filter.q
  return params
}

// Caller's own activity picture (UserActivityDTO). The embedded
// `recent` field is now a FeedPageDTO — page/size/sort flow into it.
// `sort` accepts 'asc' | 'desc' (default 'desc') or Spring-style
// 'occurredAt,asc'. Server caps `size` at 500.
export async function getMyAnalytics({
  page = 0,
  size = 50,
  sort,
  signal,
  ...filter
} = {}) {
  const params = { ...buildFilterParams(filter), page, size }
  if (sort) params.sort = sort
  const { data } = await apiClient.get('/analytics/me', { params, signal })
  return data
}

// Another user's activity picture by username (UserActivityDTO).
// Same pagination + sort semantics as /me.
export async function getUserAnalytics(
  username,
  { page = 0, size = 50, sort, signal, ...filter } = {},
) {
  const params = { ...buildFilterParams(filter), page, size }
  if (sort) params.sort = sort
  const { data } = await apiClient.get(
    `/analytics/users/${encodeURIComponent(username)}`,
    { params, signal },
  )
  return data
}

// Per-user totals across the team — sorted by activity. Returns an array
// of UserSummaryDTO. Used to render the Users tab.
export async function getAnalyticsUsers({ signal, ...filter } = {}) {
  const { data } = await apiClient.get('/analytics/users', {
    params: buildFilterParams(filter),
    signal,
  })
  return data
}

// Team-wide overview (TeamOverviewDTO): totals, per-entity, top-N users,
// daily breakdown. Backbone of the Overview tab.
export async function getAnalyticsOverview({ topUsers = 10, signal, ...filter } = {}) {
  const { data } = await apiClient.get('/analytics/overview', {
    params: { ...buildFilterParams(filter), topUsers },
    signal,
  })
  return data
}

// Cross-entity chronological feed. Returns a FeedPageDTO ({ items,
// page, size, totalElements, totalPages, hasNext, hasPrevious }).
// Server caps `size` at 500. Pass `actor` to scope to one user; omit
// it for the team-wide feed. `sort` is 'asc' | 'desc' (default 'desc')
// or Spring-style 'occurredAt,asc'.
export async function getAnalyticsFeed({
  page = 0,
  size = 100,
  sort,
  signal,
  ...filter
} = {}) {
  const params = { ...buildFilterParams(filter), page, size }
  if (sort) params.sort = sort
  const { data } = await apiClient.get('/analytics/feed', { params, signal })
  return data
}

// Per-action breakdown (ActionStatsDTO[]) — used for the "By action"
// strip when the caller wants a server-side rollup instead of summing
// per-entity stats client-side.
export async function getAnalyticsActions({ signal, ...filter } = {}) {
  const { data } = await apiClient.get('/analytics/actions', {
    params: buildFilterParams(filter),
    signal,
  })
  return data
}

// Per-day time series. The overview already includes a daily slice so
// most callers won't need this; it exists for chart-only views that
// want the series without paying for the rest of TeamOverviewDTO.
export async function getAnalyticsDaily({ signal, ...filter } = {}) {
  const { data } = await apiClient.get('/analytics/daily', {
    params: buildFilterParams(filter),
    signal,
  })
  return data
}

// Per-entity stats map keyed by entity kind (audio/video/image/text/
// project/category/person). Same shape as TeamOverviewDTO.byEntity.
export async function getAnalyticsEntities({ signal, ...filter } = {}) {
  const { data } = await apiClient.get('/analytics/entities', {
    params: buildFilterParams(filter),
    signal,
  })
  return data
}

// Monthly buckets — same filter shape as the rest, but the response is
// MonthlyBucketDTO[] (one row per calendar month within the window).
// Each bucket carries total / created / updated / deleted / restored /
// purged / viewed / searched / activeUsers and a "YYYY-MM" label.
// Defaults to a 365d window server-side so ~12 buckets render out of
// the box.
export async function getAnalyticsMonthly({ signal, ...filter } = {}) {
  const { data } = await apiClient.get('/analytics/monthly', {
    params: buildFilterParams(filter),
    signal,
  })
  return data
}

// Catalog of action codes the admin can choose from on the action
// filter (e.g. ["CREATE","READ","UPDATE","DELETE","SEARCH"]). LIST was
// dropped backend-side so it doesn't appear here. The filter UI POSTs
// the chosen subset back via `?actions=CREATE,READ`.
export async function getAnalyticsActionCatalog({ signal } = {}) {
  const { data } = await apiClient.get('/analytics/actions/catalog', { signal })
  return data
}

// Weekly buckets — ISO weeks, Monday-anchored, newest first. Same filter
// shape as the rest. Each bucket carries week (Monday date) / label
// ("2026-W29") / total / created / updated / deleted / restored / purged
// / viewed / searched / activeUsers. Defaults to 12 weeks server-side.
export async function getAnalyticsWeekly({ signal, ...filter } = {}) {
  const { data } = await apiClient.get('/analytics/weekly', {
    params: buildFilterParams(filter),
    signal,
  })
  return data
}

// Yearly buckets — calendar years, newest first. Each bucket carries year
// (Jan 1 date) / label ("2026") / same counters as weekly. Defaults to the
// last 5 years server-side. NOTE: the `days` param is capped at 365, so a
// multi-year custom window must pass explicit `from`/`to` instead.
export async function getAnalyticsYearly({ signal, ...filter } = {}) {
  const { data } = await apiClient.get('/analytics/yearly', {
    params: buildFilterParams(filter),
    signal,
  })
  return data
}

// ── Live snapshots — no filter params (not affected by the date window) ──

// Inventory (InventoryDTO): live row counts against the real tables, per
// type, split active / trashed / total, plus grand totals. Keys under
// `byType`: audio, video, image, text, maqam, physical_media, project,
// person, category.
export async function getAnalyticsInventory({ signal } = {}) {
  const { data } = await apiClient.get('/analytics/inventory', { signal })
  return data
}

// Visibility (VisibilityDTO): public-vs-hidden snapshot over active rows —
// projectsVisible/Hidden/Total, mediaByType (publicCount/privateCount/total
// for audio/video/image/text), mediaPublicTotal/PrivateTotal, and the UX-
// critical itemsInVisibleProjects / itemsInHiddenProjects split.
export async function getAnalyticsVisibility({ signal } = {}) {
  const { data } = await apiClient.get('/analytics/visibility', { signal })
  return data
}

// Maqam classification overview (MaqamOverviewDTO): team-level progress
// (unclassified/partial/fully-voted, consensus vs disagreement), listen
// totals, maqamTypeDistribution, and an embedded `teachers` leaderboard.
export async function getMaqamAnalyticsOverview({ signal } = {}) {
  const { data } = await apiClient.get('/analytics/maqam/overview', { signal })
  return data
}

// Maqam teacher leaderboard (TeacherActivityDTO[]) on its own — assigned
// records, votes cast/pending, distinct maqam types, listen seconds/
// sessions, records listened, first-voted / last-listen timestamps.
export async function getMaqamAnalyticsTeachers({ signal } = {}) {
  const { data } = await apiClient.get('/analytics/maqam/teachers', { signal })
  return data
}

// One maqam teacher's activity (TeacherActivityDTO). 404 if the username
// isn't on any active-record panel.
export async function getMaqamAnalyticsTeacher(username, { signal } = {}) {
  const { data } = await apiClient.get(
    `/analytics/maqam/teachers/${encodeURIComponent(username)}`,
    { signal },
  )
  return data
}
