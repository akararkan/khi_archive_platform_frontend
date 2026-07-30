import { apiClient } from '@/lib/api-client'
import {
  MAX_KEYWORD_LENGTH,
  MAX_TAG_LENGTH,
  canonicalizeKeyword,
  canonicalizeTag,
} from '@/lib/canonicalize-tag'

// ── Admin tag + keyword vocabulary ───────────────────────────────────────────
// GET    /api/admin/{tags,keywords}?q=&limit=&offset=  → [{ value, usageCount }]
// PATCH  /api/admin/{tags,keywords}   { from, to }     → { from, to, renamed, merged }
// DELETE /api/admin/{tags,keywords}?value=…            → { value, deleted }
//
// ADMIN only. Tags and keywords are @ElementCollection bags spread over the
// owning entities (tags: audio/video/image/text/project · keywords: those five
// + category), so the backend runs set-based SQL over every collection table:
// one rename or delete rewrites the value everywhere at once.
//
// Two behaviours worth remembering at the call site:
//   · The LIST counts only live (non-trashed) parents, matching /suggest.
//   · RENAME and DELETE rewrite active *and* trashed rows, so restoring a
//     trashed record can't resurrect a retired value.
//
// Person.tag / Person.keywords are delimited String columns, not part of this
// vocabulary — they are never touched by these endpoints.

const KIND_META = {
  tag: {
    kind: 'tag',
    endpoint: '/admin/tags',
    label: 'Tag',
    plural: 'Tags',
    maxLength: MAX_TAG_LENGTH,
    canonicalize: canonicalizeTag,
    // Where the vocabulary lives — surfaced in the UI so an admin knows the
    // blast radius of a rename before pressing it.
    owners: ['Audio', 'Video', 'Image', 'Text', 'Project'],
    blurb: 'Short labels (max 64 characters) attached to audio, video, image, text and project records.',
  },
  keyword: {
    kind: 'keyword',
    endpoint: '/admin/keywords',
    label: 'Keyword',
    plural: 'Keywords',
    maxLength: MAX_KEYWORD_LENGTH,
    canonicalize: canonicalizeKeyword,
    owners: ['Audio', 'Video', 'Image', 'Text', 'Project', 'Category'],
    blurb: 'Search phrases (max 200 characters) attached to the five media types plus categories.',
  },
}

const VOCABULARY_KINDS = ['tag', 'keyword']

// The backend caps `limit` at 2000; we walk in those chunks. MAX_VALUES is a
// backstop so a runaway vocabulary can't pull an unbounded list into the page.
const SERVER_MAX_LIMIT = 2000
const MAX_VALUES = 20000

function vocabularyMeta(kind) {
  return KIND_META[kind] || KIND_META.tag
}

function normalizeItem(row) {
  return {
    value: String(row?.value ?? ''),
    usageCount: Number(row?.usageCount ?? 0) || 0,
  }
}

// One page of the vocabulary, ordered by usageCount DESC, value ASC.
async function listVocabulary(kind, { q = '', limit = 200, offset = 0, signal } = {}) {
  const { endpoint } = vocabularyMeta(kind)
  const params = {
    limit: Math.min(Math.max(1, Number(limit) || 200), SERVER_MAX_LIMIT),
    offset: Math.max(0, Number(offset) || 0),
  }
  if (q && q.trim()) params.q = q.trim()

  const { data } = await apiClient.get(endpoint, { params, signal })
  return Array.isArray(data) ? data.map(normalizeItem).filter((item) => item.value) : []
}

// The whole vocabulary in one shot, walked in 2000-row chunks.
//
// Deliberate: the admin screen filters, sorts, groups look-alikes and counts
// totals across the *entire* vocabulary, none of which an offset window can
// answer. A value row is two small fields, so even a large archive is a few
// hundred KB — cheaper than a round-trip per keystroke. `truncated` tells the
// caller the MAX_VALUES backstop tripped and the view is partial.
async function fetchWholeVocabulary(kind, { signal } = {}) {
  const items = []
  let truncated = false

  for (let offset = 0; ; offset += SERVER_MAX_LIMIT) {
    const chunk = await listVocabulary(kind, { limit: SERVER_MAX_LIMIT, offset, signal })
    items.push(...chunk)

    if (items.length >= MAX_VALUES) {
      items.length = MAX_VALUES
      truncated = true
      break
    }
    if (chunk.length < SERVER_MAX_LIMIT) break
  }

  return { items, truncated }
}

// Global rename. `renamed` = rows rewritten; `merged` = duplicate rows
// collapsed because their parent already carried the target — so the net new
// occurrences of `to` are `renamed - merged`. A from === to (after
// canonicalisation) is a server-side no-op, not an error.
async function renameVocabularyValue(kind, from, to) {
  const { endpoint } = vocabularyMeta(kind)
  const { data } = await apiClient.patch(endpoint, { from, to })
  return {
    from: String(data?.from ?? from),
    to: String(data?.to ?? to),
    renamed: Number(data?.renamed ?? 0) || 0,
    merged: Number(data?.merged ?? 0) || 0,
  }
}

// Global delete — the value is stripped from every owning record, trashed ones
// included. The value travels as a query param (URL-encoded by axios) because
// tags and keywords may contain spaces or slashes.
async function deleteVocabularyValue(kind, value) {
  const { endpoint } = vocabularyMeta(kind)
  const { data } = await apiClient.delete(endpoint, { params: { value } })
  return {
    value: String(data?.value ?? value),
    deleted: Number(data?.deleted ?? 0) || 0,
  }
}

export {
  MAX_VALUES,
  VOCABULARY_KINDS,
  deleteVocabularyValue,
  fetchWholeVocabulary,
  listVocabulary,
  renameVocabularyValue,
  vocabularyMeta,
}
