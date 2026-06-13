import { apiClient } from '@/lib/api-client'

// ── Tag autocomplete ─────────────────────────────────────────────────────────
// GET /api/tags/suggest?q=…&limit=… → TagSuggestionDTO[]
//   [{ value, usageCount, matchRank }]   matchRank: 0 exact · 1 prefix · 2 substring
//
// The backend UNIONs tags across audio/video/image/text/project (trashed
// records excluded), canonicalises the query itself, ranks, and caches under
// `tags:suggest`. Results arrive already sorted best-first, so we pass them
// straight through. Pass an AbortSignal so the caller's debounce can cancel
// in-flight requests on rapid keystrokes.

const SUGGEST_ENDPOINT = '/tags/suggest'
const MAX_LIMIT = 25

export async function suggestTags(query, { limit = 10, signal } = {}) {
  const q = typeof query === 'string' ? query.trim() : ''
  if (!q) return []

  const { data } = await apiClient.get(SUGGEST_ENDPOINT, {
    params: { q, limit: Math.min(Math.max(1, Number(limit) || 10), MAX_LIMIT) },
    signal,
  })

  return Array.isArray(data) ? data : []
}
