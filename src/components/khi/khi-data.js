// Shared data + config for the public "Living Archive" surface.
// Kurdish (Sorani) labels, the per-type registry (endpoint / facets / sorts /
// routes), and a normalizer that maps any guest DTO into the card shape the
// KhiCard renders. Pure data/helpers (no JSX) so it can be imported anywhere.

import {
  guestAudios,
  guestVideos,
  guestTexts,
  guestImages,
  guestPersons,
  guestProjects,
  guestCategories,
  guestResults,
} from '@/services/guest'
import {
  pickMediaTitle,
  mediaThumbHref,
  personImageSrc,
  personInitials,
  extractPersonFromItem,
} from '@/components/public/public-helpers'

export const PAGE_SIZE = 24
export const DEFAULT_TYPE = 'all'
export const MEDIA_KINDS = ['audio', 'video', 'image', 'text']

export const KIND_TO_RESOURCE = {
  audio: 'audios',
  video: 'videos',
  text: 'texts',
  image: 'images',
  person: 'persons',
  project: 'projects',
  category: 'categories',
}

// ── Kurdish UI strings ───────────────────────────────────────────────────────
export const UI = {
  brand: 'گەنجینەی کەلەپوور',
  brandSub: 'کاتالۆگی گشتی',
  org: 'دەزگای کەلەپووری کوردی',
  searchPlaceholder: 'بگەڕێ بەناو گەنجینەکەدا — ناونیشان، کەس، ناوچە، زمان…',
  heroSearchPlaceholder: 'بگەڕێ بەناو گەنجینەکەدا — ناونیشان، کەس، دەنگبێژ…',
  profile: 'هەژمارەکەم',
  dashboard: 'داشبۆرد',
  signout: 'چوونەدەرەوە',
  signin: 'چوونەژوورەوە',
  register: 'تۆمارکردن',
  go: 'گەڕان',
  searchBy: 'بگەڕێ بەپێی:',
  filter: 'پاڵاوتن',
  collection: 'گەنجینەکە',
  results: 'ئەنجامەکان',
  grid: 'خشتە',
  list: 'لیست',
  sort: 'ڕیزکردن',
  showMore: 'زیاتر پیشانبدە',
  showFewer: 'کەمتر پیشانبدە',
  clearAll: 'پاککردنەوەی هەموو',
  empty: 'هیچ ئەنجامێک نەدۆزرایەوە.',
  loadError: 'نەتوانرا داتاکان باربکرێن.',
  retry: 'دووبارە هەوڵبدەرەوە',
  searchWithin: 'گەڕان لەناو',
  dateCreated: 'بەرواری تۆمارکردن',
  open: 'کردنەوە',
  untitled: 'بێ ناو',
  by: 'لەلایەن',
  page: 'پەڕە',
  of: 'لە',
}

export const TYPE_LABELS = { audio: 'دەنگ', video: 'ڤیدیۆ', text: 'دەق', image: 'وێنە', person: 'کەس', project: 'پڕۆژە', category: 'پۆل' }

const SHARED_MEDIA_FACETS = [
  { paramKey: 'personCode', facetKey: 'persons', title: 'کەس', person: true, defaultOpen: true },
  { paramKey: 'categoryCode', facetKey: 'categories', title: 'پۆل', defaultOpen: true },
  { paramKey: 'projectCode', facetKey: 'projects', title: 'پڕۆژە' },
  { paramKey: 'language', facetKey: 'languages', title: 'زمان' },
  { paramKey: 'dialect', facetKey: 'dialects', title: 'زاراوە' },
  { paramKey: 'genre', facetKey: 'genres', title: 'ژانر' },
]
const UNIFIED_FACETS = SHARED_MEDIA_FACETS.filter((f) => f.paramKey !== 'genre')
const IMAGE_FACETS = SHARED_MEDIA_FACETS.filter((f) => !['language', 'dialect'].includes(f.paramKey))
const PROJECT_FACETS = [
  { paramKey: 'personCode', facetKey: 'persons', title: 'کەس', person: true, defaultOpen: true },
  { paramKey: 'categoryCode', facetKey: 'categories', title: 'پۆل', defaultOpen: true },
]
const PERSON_FACETS = [{ paramKey: 'region', facetKey: 'regions', title: 'ناوچە', defaultOpen: true }]

const MEDIA_SORTS = [
  { key: 'dateCreated', dir: 'desc', label: 'نوێترین' },
  { key: 'dateCreated', dir: 'asc', label: 'کۆنترین' },
  { key: 'title', dir: 'asc', label: 'ناونیشان ↑' },
  { key: 'title', dir: 'desc', label: 'ناونیشان ↓' },
]
const ALL_SORTS = [
  { key: 'relevance', dir: 'desc', label: 'پەیوەندیدار' },
  { key: 'date', dir: 'desc', label: 'نوێترین' },
  { key: 'date', dir: 'asc', label: 'کۆنترین' },
  { key: 'title', dir: 'asc', label: 'ناونیشان ↑' },
  { key: 'title', dir: 'desc', label: 'ناونیشان ↓' },
]
const BASIC_SORTS = [
  { key: 'createdAt', dir: 'desc', label: 'نوێترین' },
  { key: 'createdAt', dir: 'asc', label: 'کۆنترین' },
]

// Per-kind "search within" substring filters (kept lean — the high-value ones).
const AUDIO_TEXT_FILTERS = [
  { paramKey: 'composer', label: 'مۆسیقاژەن' },
  { paramKey: 'speaker', label: 'دەنگبێژ' },
  { paramKey: 'poet', label: 'شاعیر' },
]
const VIDEO_TEXT_FILTERS = [{ paramKey: 'location', label: 'شوێن' }, { paramKey: 'event', label: 'بۆنە' }]
const IMAGE_TEXT_FILTERS = [{ paramKey: 'location', label: 'شوێن' }, { paramKey: 'event', label: 'بۆنە' }]
const TEXT_TEXT_FILTERS = [{ paramKey: 'author', label: 'نووسەر' }]

// ── Type registry ────────────────────────────────────────────────────────────
// The unified catalogue ('all') is the public home: all four media types in one
// feed, narrowed by the shared facets (person → category → project), media-type
// checkboxes, and the decade range. The four media types stay in the registry
// (so TYPE_MAP resolves them for legacy /public/<type> deep links AND for the
// "focus one type" behaviour that unlocks that type's uncommon search-within
// fields) but are `navHidden` — they are checkboxes inside the catalogue, not
// their own nav tabs. Person / Project / Category remain real nav tabs so a
// visitor can open an entity.
export const TYPES = [
  { key: 'all', group: 'discover', label: 'گەنجینەکە', sub: 'دەنگ، ڤیدیۆ، وێنە و دەق بەیەکەوە', resource: null, kind: null,
    api: (p) => guestResults(p), facetMap: UNIFIED_FACETS, sorts: ALL_SORTS, showMediaTypes: true, showDateRange: true },
  { key: 'person', group: 'entities', label: 'کەسەکان', sub: 'هونەرمەند، دەنگبێژ و چیرۆکبێژ', resource: 'persons', kind: 'person',
    api: (p) => guestPersons(p), facetMap: PERSON_FACETS, sorts: BASIC_SORTS },
  { key: 'project', group: 'entities', label: 'پڕۆژەکان', sub: 'کۆکراوە و توێژینەوەکان', resource: 'projects', kind: 'project',
    api: (p) => guestProjects(p), facetMap: PROJECT_FACETS, sorts: BASIC_SORTS },
  { key: 'category', group: 'entities', label: 'پۆلەکان', sub: 'پۆلێنی کەلەپوور', resource: 'categories', kind: 'category',
    api: (p) => guestCategories(p), facetMap: [], sorts: BASIC_SORTS },
  { key: 'audio', group: 'media', navHidden: true, label: 'دەنگەکان', sub: 'گۆرانی، دەنگبێژ و گێڕانەوەی زارەکی', resource: 'audios', kind: 'audio',
    api: (p) => guestAudios.list(p), facetMap: SHARED_MEDIA_FACETS, sorts: MEDIA_SORTS, showDateRange: true, textFilters: AUDIO_TEXT_FILTERS },
  { key: 'video', group: 'media', navHidden: true, label: 'ڤیدیۆکان', sub: 'فیلم و تۆماری بینراو', resource: 'videos', kind: 'video',
    api: (p) => guestVideos.list(p), facetMap: SHARED_MEDIA_FACETS, sorts: MEDIA_SORTS, showDateRange: true, textFilters: VIDEO_TEXT_FILTERS },
  { key: 'image', group: 'media', navHidden: true, label: 'وێنەکان', sub: 'وێنە مێژووییەکان', resource: 'images', kind: 'image',
    api: (p) => guestImages.list(p), facetMap: IMAGE_FACETS, sorts: MEDIA_SORTS, showDateRange: true, textFilters: IMAGE_TEXT_FILTERS },
  { key: 'text', group: 'media', navHidden: true, label: 'دەقەکان', sub: 'دەستنووس و نووسراوەکان', resource: 'texts', kind: 'text',
    api: (p) => guestTexts.list(p), facetMap: SHARED_MEDIA_FACETS, sorts: MEDIA_SORTS, showDateRange: true, textFilters: TEXT_TEXT_FILTERS },
]
export const TYPE_MAP = Object.fromEntries(TYPES.map((t) => [t.key, t]))

// ── Card normalization ───────────────────────────────────────────────────────
function fmtSeconds(s) {
  const n = Math.max(0, Math.floor(Number(s) || 0))
  if (!n) return null
  const h = Math.floor(n / 3600)
  const m = Math.floor((n % 3600) / 60)
  const sec = n % 60
  if (h > 0) return `${h}:${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`
  return `${m}:${String(sec).padStart(2, '0')}`
}

function yearOf(item) {
  const raw =
    item.recordedAt || item.recordingDate || item.documentDate || item.imageDate ||
    item.dateCreated || item.datePublished || item.printDate || item.createdAt ||
    item.year || item.date || null
  if (!raw) return null
  const m = String(raw).match(/(\d{4})/)
  return m ? m[1] : null
}

function durationOf(item) {
  return (
    item.durationFormatted ||
    (typeof item.duration === 'string' ? item.duration : null) ||
    fmtSeconds(item.durationSeconds || item.duration)
  )
}

function codeOf(item, kind) {
  return (
    item.code || item[`${kind}Code`] || item.audioCode || item.videoCode || item.textCode ||
    item.imageCode || item.personCode || item.projectCode || item.categoryCode || null
  )
}

function tagsOf(item) {
  const t = item.tags
  if (Array.isArray(t)) return t.filter(Boolean).slice(0, 4)
  if (typeof t === 'string' && t.trim()) return t.split(/[,،;]/).map((x) => x.trim()).filter(Boolean).slice(0, 4)
  return []
}

// Turn one DTO into the card shape KhiCard renders. `typeKey` is the active
// browse type; for the unified 'all' feed each row carries its own `kind`.
export function cardFromItem(item, typeKey) {
  const kind = typeKey === 'all' ? (item.kind || 'audio') : typeKey
  const code = codeOf(item, kind)
  const resource = KIND_TO_RESOURCE[kind] || 'audios'
  const to = code ? `/public/${resource}/${code}` : '#'

  if (kind === 'person') {
    const name = item.fullName || item.name || code
    return {
      kind, code, to, acc: code,
      title: name,
      collection: Array.isArray(item.personType) ? item.personType.join(' · ') : item.personType || null,
      region: item.region || null,
      image: personImageSrc(item),
      avatarText: personInitials(name),
      tags: tagsOf(item),
      filterTags: tagsOf(item),
      count: item.projectCount || item.totalCount || null,
    }
  }

  if (kind === 'project') {
    const counts = []
    if (item.audioCount) counts.push(`${item.audioCount} دەنگ`)
    if (item.videoCount) counts.push(`${item.videoCount} ڤیدیۆ`)
    if (item.imageCount) counts.push(`${item.imageCount} وێنە`)
    if (item.textCount) counts.push(`${item.textCount} دەق`)
    const person = extractPersonFromItem(item)
    return {
      kind, code, to, acc: code,
      title: item.projectName || item.name || code,
      collection: Array.isArray(item.categories) && item.categories[0]
        ? (item.categories[0].categoryName || item.categories[0].name || item.categories[0].categoryCode)
        : null,
      person: person ? { name: person.fullName || person.name, code: person.personCode, image: personImageSrc(person) } : null,
      tags: counts,
      filterTags: tagsOf(item),
      image: mediaThumbHref(item),
    }
  }

  if (kind === 'category') {
    return {
      kind, code, to, acc: code,
      title: item.categoryName || item.name || code,
      collection: null,
      tags: item.projectCount ? [`${item.projectCount} پڕۆژە`] : tagsOf(item),
      filterTags: tagsOf(item),
    }
  }

  // media kinds (audio/video/text/image)
  const person = extractPersonFromItem(item)
  return {
    kind, code, to, acc: code,
    title: pickMediaTitle(item) || code,
    collection: item.projectName || item.project?.projectName || item.collection || null,
    person: person ? { name: person.fullName || person.name, code: person.personCode, image: personImageSrc(person) } : null,
    region: item.region || item.location || null,
    lang: item.language || null,
    decade: yearOf(item),
    duration: durationOf(item),
    image: kind === 'image' ? mediaThumbHref(item) : null,
    tags: tagsOf(item),
    filterTags: tagsOf(item),
    matchedOn: Array.isArray(item.matchedOn) ? item.matchedOn : null,
  }
}
