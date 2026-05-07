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
