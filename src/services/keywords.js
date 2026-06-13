import { apiClient } from '@/lib/api-client'

// ── Keyword autocomplete ─────────────────────────────────────────────────────
// GET /api/keywords/suggest?q=…&limit=… → KeywordSuggestionDTO[]
//   [{ value, usageCount, matchRank }]   matchRank: 0 exact · 1 prefix · 2 substring
//
// Mirror of services/tags.js but for keyword phrases — the backend UNIONs
// keywords across audio/video/image/text/project/category (trashed records
// excluded), canonicalises the query, ranks, and caches under `keywords:suggest`
// (a separate region from tags:suggest, so the two pickers are independent).

const SUGGEST_ENDPOINT = '/keywords/suggest'
const MAX_LIMIT = 25

export async function suggestKeywords(query, { limit = 10, signal } = {}) {
  const q = typeof query === 'string' ? query.trim() : ''
  if (!q) return []

  const { data } = await apiClient.get(SUGGEST_ENDPOINT, {
    params: { q, limit: Math.min(Math.max(1, Number(limit) || 10), MAX_LIMIT) },
    signal,
  })

  return Array.isArray(data) ? data : []
}
