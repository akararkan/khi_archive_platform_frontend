// Pure helpers shared across the public/guest pages. Lives in a .js file
// (no JSX) so the react-refresh "only-export-components" rule keeps the
// neighbouring component files clean.

import { resolveProfileImageSource } from '@/lib/profile-image'

function pickFirst(...values) {
  for (const v of values) {
    if (v != null && v !== '') return v
  }
  return null
}

// Build a compact metadata strip for project cards: media-type counts,
// the first category, and the linked person.
function projectMeta(p) {
  const meta = []
  const types = []
  if (p?.audioCount) types.push(`${p.audioCount} audio`)
  if (p?.videoCount) types.push(`${p.videoCount} video`)
  if (p?.textCount) types.push(`${p.textCount} text`)
  if (p?.imageCount) types.push(`${p.imageCount} image`)
  if (types.length > 0) meta.push(types.join(' · '))
  if (Array.isArray(p?.categories) && p.categories[0]) {
    meta.push(p.categories[0].categoryName || p.categories[0].name || p.categories[0].categoryCode)
  }
  if (p?.personName) meta.push(p.personName)
  return meta
}

function mediaThumbHref(item) {
  return (
    item?.imageFileUrl ||
    item?.thumbnailUrl ||
    item?.coverImageUrl ||
    item?.posterUrl ||
    null
  )
}

function formatPublicDate(value) {
  if (!value) return null
  try {
    return new Date(value).toLocaleDateString(undefined, {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    })
  } catch {
    return value
  }
}

// ── Facet helpers ────────────────────────────────────────────────────────
//
// /api/guest/facets returns:
//   {
//     mediaTypes: [{ value, count }, …],   // 'audio' | 'video' | 'text' | 'image'
//     categories: [{ value, count, code? }, …],
//     persons:    [{ value, count, code? }, …],
//     languages:  [{ value, count }, …],
//     dialects:   [{ value, count }, …],
//     regions:    [{ value, count }, …],
//     genres:     [{ value, count }, …],
//     tags:       [{ value, count }, …],
//     keywords:   [{ value, count }, …],
//   }
//
// Entries are tolerated in a couple of shapes so a small backend rename
// later doesn't break the UI. We always normalise to `{ value, code, count }`.

const FACET_KEYS = [
  'mediaTypes',
  'categories',
  'persons',
  'languages',
  'dialects',
  'regions',
  'genres',
  'tags',
  'keywords',
]

function readFacetEntry(entry) {
  if (!entry) return null
  const value = entry.value ?? entry.label ?? entry.name ?? entry.code ?? entry.key
  const code = entry.code ?? entry.value ?? entry.key
  const count = entry.count ?? entry.total ?? entry.docCount ?? 0
  if (value == null) return null
  return { value: String(value), code: code != null ? String(code) : null, count: Number(count) || 0 }
}

function readFacet(facets, key) {
  if (!facets) return []
  const raw = facets[key]
  if (!Array.isArray(raw)) return []
  return raw.map(readFacetEntry).filter(Boolean)
}

function readMediaTypeCount(facets, mediaType) {
  for (const entry of readFacet(facets, 'mediaTypes')) {
    if (entry.value.toLowerCase() === mediaType) return entry.count
    if (entry.code && entry.code.toLowerCase() === mediaType) return entry.count
  }
  return null
}

function totalFacetCount(facets, key) {
  let total = 0
  for (const e of readFacet(facets, key)) total += e.count
  return total > 0 ? total : null
}

// Resolve a person row to a usable profile-image URL. The Person entity
// stores its public S3 portrait in `mediaPortrait` (not in any of the
// `profileImage*` fields that `/user/me` uses), so we check that first
// and fall back to the shared resolver for other shapes.
function personImageSrc(person) {
  if (!person) return ''
  if (typeof person.mediaPortrait === 'string' && person.mediaPortrait) {
    return person.mediaPortrait
  }
  if (typeof person.profileImageSource === 'string' && person.profileImageSource) {
    return person.profileImageSource
  }
  return resolveProfileImageSource(person) || ''
}

// Build a uniform person object out of any DTO shape the public APIs
// might return. Some endpoints embed the linked person as a nested
// `person` object; others flatten its name + portrait into the parent
// (e.g. `personCode`, `personName`, `personMediaPortrait` …). We try
// every reasonable name so a single call to `personImageSrc(...)`
// finds the photo URL whatever the backend chose to call the field.
function extractPersonFromItem(item) {
  if (!item) return null
  if (item.person && typeof item.person === 'object') {
    return item.person
  }
  if (!item.personCode && !item.personName) return null
  return {
    personCode: item.personCode,
    fullName: item.personFullName || item.personName,
    name: item.personName,
    // Person entity's public portrait field — what the backend actually
    // returns on /api/person and what the admin/employee UIs already
    // read.
    mediaPortrait:
      item.personMediaPortrait ||
      item.mediaPortrait ||
      item.personPortrait ||
      item.personPortraitUrl ||
      null,
    profileImage: item.personImage,
    profileImageUrl:
      item.personImageUrl || item.personProfileImageUrl || item.personPictureUrl,
    profileImageSource: item.personImageSource,
    imageUrl: item.personPictureUrl,
    avatarUrl: item.personAvatarUrl,
    image: item.personImage,
  }
}

function personInitials(text) {
  if (!text) return '·'
  const parts = String(text).trim().split(/\s+/).filter(Boolean)
  return (
    parts
      .slice(0, 2)
      .map((p) => p.charAt(0).toUpperCase())
      .join('') || '·'
  )
}

// Read each FacetSidebar group's currently-selected values out of the URL
// search params. Multi-select groups serialise to comma-joined strings —
// see `FacetSidebar` for the full contract. Returns
//   { paramKey: string[] }
function decodeSelectedFacets(searchParams, facetMap) {
  const out = {}
  for (const group of facetMap) {
    const raw = searchParams.get(group.paramKey)
    out[group.paramKey] = raw ? raw.split(',').filter(Boolean) : []
  }
  return out
}

export {
  pickFirst,
  projectMeta,
  mediaThumbHref,
  formatPublicDate,
  FACET_KEYS,
  readFacet,
  readFacetEntry,
  readMediaTypeCount,
  totalFacetCount,
  decodeSelectedFacets,
  personImageSrc,
  personInitials,
  extractPersonFromItem,
}
