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

// Returns the most-readable title for any media DTO regardless of which
// of the backend's title field names it actually carries. The backend
// uses different names per kind (audio uses originTitle / alterTitle /
// fullName, video uses originalTitle / alternativeTitle, text/image
// follow video, and the unified results endpoint exposes a normalised
// `title`). Reading them all here means every detail page, card, and
// breadcrumb gets a consistent best-available title and never falls
// through to the technical code on a record that has titles set under
// a name we forgot to check.
function pickMediaTitle(item) {
  if (!item) return null
  return (
    pickFirst(
      // Already-resolved title (from /results endpoint).
      item.title,
      // Per-kind primary "main" titles.
      item.titleEnglish,
      item.fullName,
      // Romanized — same script everyone can read.
      item.romanizedTitle,
      // Original-script titles, in priority order.
      item.originalTitle,
      item.originTitle,
      item.titleOriginal,
      item.centralKurdishTitle,
      item.titleInCentralKurdish,
      // Alternative titles as a final fallback.
      item.alternativeTitle,
      item.alterTitle,
    ) || null
  )
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

// hasAny: returns true if `obj` has at least one non-empty value across
// the given keys. Public detail pages use it to skip whole sidebar
// panels (with their heading) when none of the rows inside would render.
function hasAny(obj, keys) {
  if (!obj) return false
  for (const k of keys) {
    const v = obj[k]
    if (v === null || v === undefined || v === '') continue
    if (Array.isArray(v) && v.length === 0) continue
    return true
  }
  return false
}

// "Yes" / "No" / null helper for boolean-typed DTO fields like
// physicalAvailability. Returning null lets MetaRow drop the row when
// the field wasn't set at all rather than rendering an empty string.
function formatBool(value) {
  if (value === true) return 'Yes'
  if (value === false) return 'No'
  return null
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

// Note: 'keywords' is intentionally absent — keywords are an internal
// cataloguing concept and aren't exposed on the public surface.
const FACET_KEYS = [
  'mediaTypes',
  'categories',
  'persons',
  'languages',
  'dialects',
  'regions',
  'genres',
  'tags',
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
  pickMediaTitle,
  projectMeta,
  mediaThumbHref,
  formatPublicDate,
  hasAny,
  formatBool,
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
