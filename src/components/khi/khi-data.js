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
} from '@/services/guest'
import {
  pickMediaTitle,
  mediaThumbHref,
  personImageSrc,
  personInitials,
  extractPersonFromItem,
  formatPublicDate,
} from '@/components/public/public-helpers'
import { publicDetailPath } from '@/components/public/public-route-id'

export const PAGE_SIZE = 12
export const TYPE_PAGE_SIZES = {
  audio: 50,
  video: 50,
  text: 50,
  image: 50,
  person: 50,
  project: 50,
  category: 100,
}
// The public media grid is the landing — no "all results" nav button.
export const DEFAULT_TYPE = 'all'
export const MEDIA_KINDS = ['image', 'audio', 'video', 'text']

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
  brand: 'ئینستیتیوتی کەلەپووری کوردی',
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
  loadingMore: 'بارکردن…',
  clearAll: 'پاککردنەوەی هەموو',
  empty: 'هیچ ئەنجامێک نەدۆزرایەوە.',
  loadError: 'نەتوانرا داتاکان باربکرێن.',
  retry: 'دووبارە هەوڵبدەرەوە',
  searchWithin: 'گەڕان لەناو',
  mediaType: 'جۆری مێدیا',
  browseBy: 'گەڕان بەپێی',
  dateCreated: 'بەرواری تۆمارکردن',
  dateRange: 'مەودای ساڵ',
  allYears: 'هەموو ساڵەکان',
  reset: 'سڕینەوە',
  yearFrom: 'لە ساڵی',
  yearTo: 'تا ساڵی',
  dateStart: 'لە بەرواری',
  dateEnd: 'تا بەرواری',
  exactDates: 'یان بەرواری ورد هەڵبژێرە',
  dateInvalid: 'بەرواری دەستپێک دوای بەرواری کۆتاییە.',
  open: 'کردنەوە',
  untitled: 'بێ ناو',
  by: 'لەلایەن',
  page: 'پەڕە',
  of: 'لە',
}

export const TYPE_LABELS = { audio: 'دەنگ', video: 'ڤیدیۆ', text: 'دەق', image: 'وێنە', person: 'کەس', project: 'پڕۆژە', category: 'پۆل' }

// English kind word for the small Latin "type pill" accent on detail heroes.
export const TYPE_PILL = { audio: 'AUDIO', video: 'VIDEO', text: 'TEXT', image: 'IMAGE', person: 'PERSON', project: 'PROJECT', category: 'CATEGORY' }

// ── Detail-page Sorani labels ─────────────────────────────────────────────────
// One central dictionary so every public detail page reads the same way.
export const DETAIL = {
  home: 'سەرەتا',
  notFound: 'نەدۆزرایەوە.',
  back: 'گەڕانەوە',
  openDoc: 'کردنەوەی بەڵگەنامە',
  openOriginal: 'کردنەوەی ڕەسەن',
  help: 'یارمەتیمان بدە',
  seeAll: 'بینینی هەموو',
  none: 'هیچ نییە',
  fileUnavailable: 'فایل بەردەست نییە بۆ گشت.',
  // section titles
  summary: 'کورتە',
  body: 'دەق',
  lyrics: 'گۆرانی',
  transcription: 'نووسینەوە',
  photostory: 'چیرۆکی وێنە',
  details: 'وردەکاری',
  credits: 'بەشداربووان',
  musicForm: 'مۆسیقا و فۆڕم',
  subjectForm: 'بابەت و فۆڕم',
  document: 'بەڵگەنامە',
  langPlace: 'زمان و شوێن',
  dates: 'بەروارەکان',
  projects: 'پڕۆژەکان',
  media: 'مێدیا',
  // field labels
  name: 'ناو',
  type: 'جۆر',
  category: 'پۆل',
  categories: 'پۆلەکان',
  region: 'ناوچە',
  genre: 'ژانر',
  subject: 'بابەت',
  language: 'زمان',
  dialect: 'زاراوە',
  year: 'ساڵ',
  birthYear: 'ساڵی لەدایکبوون',
  date: 'بەروار',
  recorded: 'تۆمارکراوە',
  duration: 'ماوە',
  project: 'پڕۆژە',
  person: 'کەس',
  gender: 'ڕەگەز',
  nickname: 'نازناو',
  event: 'بۆنە',
  location: 'شوێن',
  form: 'فۆڕم',
  audience: 'بینەر/گوێگر',
  subtitle: 'ژێرنووس',
  author: 'نووسەر',
  poet: 'شاعیر',
  composer: 'مۆسیقاژەن',
  speaker: 'قسەکەر',
  singer: 'گۆرانیبێژ',
  producer: 'بەرهەمهێنەر',
  director: 'دەرهێنەر',
  photographer: 'وێنەگر',
  contributors: 'هاوبەشان',
  peopleShown: 'کەسانی دیار',
  typeOfMaqam: 'جۆری مەقام',
  typeOfBasta: 'جۆری بەستە',
  typeOfComposition: 'جۆری ئاوازدانان',
  typeOfPerformance: 'جۆری پێشکەشکردن',
  documentType: 'جۆری بەڵگەنامە',
  script: 'ڕێنووس',
  series: 'زنجیرە',
  publisher: 'بڵاوکەرەوە',
  printingHouse: 'چاپخانە',
  color: 'ڕەنگ',
  usedIn: 'بەکارهاتووە لە',
  counts: { audio: 'دەنگ', video: 'ڤیدیۆ', text: 'دەق', image: 'وێنە' },
}

const SHARED_MEDIA_FACETS = [
  { paramKey: 'categoryCode', facetKey: 'categories', title: 'پۆل', defaultOpen: true },
  { paramKey: 'personCode', facetKey: 'persons', title: 'کەس', person: true },
  { paramKey: 'language', facetKey: 'languages', title: 'زمان' },
  { paramKey: 'dialect', facetKey: 'dialects', title: 'زاراوە' },
  { paramKey: 'subject', facetKey: 'subjects', title: DETAIL.subject, multi: true },
  { paramKey: 'genre', facetKey: 'genres', title: 'ژانر', multi: true },
  { paramKey: 'tag', facetKey: 'tags', title: 'تاگ', multi: true },
]
const IMAGE_FACETS = SHARED_MEDIA_FACETS.filter((f) => !['language', 'dialect'].includes(f.paramKey))
const PROJECT_FACETS = [
  { paramKey: 'categoryCode', facetKey: 'categories', title: 'پۆل', defaultOpen: true },
  { paramKey: 'personCode', facetKey: 'persons', title: 'کەس', person: true },
  { paramKey: 'tag', facetKey: 'tags', title: 'تاگ', multi: true },
]
const PERSON_FACETS = [{ paramKey: 'region', facetKey: 'regions', title: 'ناوچە', defaultOpen: true }]
// Common filters sent to every selected public media endpoint. The media-type
// narrowing is the checkbox group, not a facet here.
const FEED_FACETS = [
  { paramKey: 'categoryCode', facetKey: 'categories', title: 'پۆل', defaultOpen: true },
  { paramKey: 'personCode', facetKey: 'persons', title: 'کەس', person: true },
  { paramKey: 'subject', facetKey: 'subjects', title: DETAIL.subject, multi: true },
  { paramKey: 'genre', facetKey: 'genres', title: 'ژانر', multi: true },
  { paramKey: 'tag', facetKey: 'tags', title: 'تاگ', multi: true },
  { paramKey: 'region', facetKey: 'regions', title: 'ناوچە' },
  { paramKey: 'language', facetKey: 'languages', title: 'زمان' },
  { paramKey: 'dialect', facetKey: 'dialects', title: 'زاراوە' },
]

const MEDIA_SORTS = [
  { key: 'date', dir: 'desc', label: 'نوێترین' },
  { key: 'date', dir: 'asc', label: 'کۆنترین' },
  { key: 'datePublished', dir: 'desc', label: 'بڵاوکراوە نوێترین' },
  { key: 'datePublished', dir: 'asc', label: 'بڵاوکراوە کۆنترین' },
  { key: 'title', dir: 'asc', label: 'ناونیشان ↑' },
  { key: 'title', dir: 'desc', label: 'ناونیشان ↓' },
]
const ALL_SORTS = [
  { key: 'relevance', dir: 'desc', label: 'پەیوەندیدار' },
  { key: 'date', dir: 'desc', label: 'نوێترین' },
  { key: 'date', dir: 'asc', label: 'کۆنترین' },
  { key: 'datePublished', dir: 'desc', label: 'بڵاوکراوە نوێترین' },
  { key: 'datePublished', dir: 'asc', label: 'بڵاوکراوە کۆنترین' },
  { key: 'title', dir: 'asc', label: 'ناونیشان ↑' },
  { key: 'title', dir: 'desc', label: 'ناونیشان ↓' },
]
const BASIC_SORTS = [
  { key: 'createdAt', dir: 'desc', label: 'نوێترین' },
  { key: 'createdAt', dir: 'asc', label: 'کۆنترین' },
]

// ── Entity-specific checkbox filters (DATA-DRIVEN) ───────────────────────────
// These per-kind fields are FREE TEXT on the backend (no fixed enum), so the
// checkbox options can't be hardcoded — they're tallied from the real values in
// the archive (see use-data-facets.js) and rendered through the same FacetGroup
// the shared facets use. `paramKey` is the GET filter param; `field` is the DTO
// property to read option values from (they differ for color/whereUsed/
// contributor); `multi` marks a repeatable list param. DETAIL holds the Sorani
// labels. Empty groups (no values / not in the public DTO) auto-hide.
const AUDIO_DATA_FACETS = [
  { paramKey: 'form', field: 'form', title: DETAIL.form },
  { paramKey: 'typeOfMaqam', field: 'typeOfMaqam', title: DETAIL.typeOfMaqam },
  { paramKey: 'typeOfBasta', field: 'typeOfBasta', title: DETAIL.typeOfBasta },
  { paramKey: 'typeOfComposition', field: 'typeOfComposition', title: DETAIL.typeOfComposition },
  { paramKey: 'typeOfPerformance', field: 'typeOfPerformance', title: DETAIL.typeOfPerformance },
  { paramKey: 'composer', field: 'composer', title: DETAIL.composer },
  { paramKey: 'poet', field: 'poet', title: DETAIL.poet },
  { paramKey: 'speaker', field: 'speaker', title: DETAIL.speaker },
  { paramKey: 'producer', field: 'producer', title: DETAIL.producer },
  { paramKey: 'recordingVenue', field: 'recordingVenue', title: 'شوێنی تۆمار' },
  { paramKey: 'city', field: 'city', title: 'شار' },
  { paramKey: 'audience', field: 'audience', title: DETAIL.audience },
  { paramKey: 'contributor', field: 'contributors', title: DETAIL.contributors, multi: true },
]
const VIDEO_DATA_FACETS = [
  { paramKey: 'event', field: 'event', title: DETAIL.event },
  { paramKey: 'location', field: 'location', title: DETAIL.location },
  { paramKey: 'creatorArtistDirector', field: 'creatorArtistDirector', title: DETAIL.director },
  { paramKey: 'producer', field: 'producer', title: DETAIL.producer },
  { paramKey: 'personShownInVideo', field: 'personShownInVideo', title: DETAIL.peopleShown },
  { paramKey: 'subtitle', field: 'subtitle', title: DETAIL.subtitle },
  { paramKey: 'audience', field: 'audience', title: DETAIL.audience },
  { paramKey: 'provenance', field: 'provenance', title: 'سەرچاوە' },
  { paramKey: 'videoStatus', field: 'videoStatus', title: 'دۆخ' },
  { paramKey: 'publisher', field: 'publisher', title: DETAIL.publisher },
  { paramKey: 'color', field: 'colorOfVideo', title: DETAIL.color, multi: true },
  { paramKey: 'whereUsed', field: 'whereThisVideoUsed', title: DETAIL.usedIn, multi: true },
]
const TEXT_DATA_FACETS = [
  { paramKey: 'documentType', field: 'documentType', title: DETAIL.documentType },
  { paramKey: 'author', field: 'author', title: DETAIL.author },
  { paramKey: 'script', field: 'script', title: DETAIL.script },
  { paramKey: 'series', field: 'series', title: DETAIL.series },
  { paramKey: 'edition', field: 'edition', title: 'چاپ' },
  { paramKey: 'volume', field: 'volume', title: 'بەرگ' },
  { paramKey: 'printingHouse', field: 'printingHouse', title: DETAIL.printingHouse },
  { paramKey: 'audience', field: 'audience', title: DETAIL.audience },
  { paramKey: 'provenance', field: 'provenance', title: 'سەرچاوە' },
  { paramKey: 'publisher', field: 'publisher', title: DETAIL.publisher },
]
const IMAGE_DATA_FACETS = [
  { paramKey: 'event', field: 'event', title: DETAIL.event },
  { paramKey: 'location', field: 'location', title: DETAIL.location },
  { paramKey: 'creatorArtistPhotographer', field: 'creatorArtistPhotographer', title: DETAIL.photographer },
  { paramKey: 'personShownInImage', field: 'personShownInImage', title: DETAIL.peopleShown },
  { paramKey: 'audience', field: 'audience', title: DETAIL.audience },
  { paramKey: 'provenance', field: 'provenance', title: 'سەرچاوە' },
  { paramKey: 'imageStatus', field: 'imageStatus', title: 'دۆخ' },
  { paramKey: 'publisher', field: 'publisher', title: DETAIL.publisher },
  { paramKey: 'color', field: 'colorOfImage', title: DETAIL.color, multi: true },
  { paramKey: 'whereUsed', field: 'whereThisImageUsed', title: DETAIL.usedIn, multi: true },
]

// Every entity-specific filter param across the 4 media kinds — used to strip
// scope-specific filters from the URL when the active media scope changes.
export const ENTITY_FILTER_KEYS = [
  ...new Set(
    [...AUDIO_DATA_FACETS, ...VIDEO_DATA_FACETS, ...TEXT_DATA_FACETS, ...IMAGE_DATA_FACETS].map((f) => f.paramKey),
  ),
]

// ── Type registry ────────────────────────────────────────────────────────────
export const TYPES = [
  { key: 'all', label: 'گەنجینەکە', sub: 'هەموو وێنە، دەنگ، ڤیدیۆ و دەق', resource: null, kind: null,
    api: null, facetMap: FEED_FACETS, sorts: ALL_SORTS, showMediaTypes: true, showDateRange: true },
  { key: 'audio', label: 'دەنگەکان', sub: 'گۆرانی، دەنگبێژ و گێڕانەوەی زارەکی', resource: 'audios', kind: 'audio',
    api: (p) => guestAudios.list(p), facetMap: SHARED_MEDIA_FACETS, dataFacets: AUDIO_DATA_FACETS, sorts: MEDIA_SORTS, showDateRange: true },
  { key: 'video', label: 'ڤیدیۆکان', sub: 'فیلم و تۆماری بینراو', resource: 'videos', kind: 'video',
    api: (p) => guestVideos.list(p), facetMap: SHARED_MEDIA_FACETS, dataFacets: VIDEO_DATA_FACETS, sorts: MEDIA_SORTS, showDateRange: true },
  { key: 'text', label: 'دەقەکان', sub: 'دەستنووس و نووسراوەکان', resource: 'texts', kind: 'text',
    api: (p) => guestTexts.list(p), facetMap: SHARED_MEDIA_FACETS, dataFacets: TEXT_DATA_FACETS, sorts: MEDIA_SORTS, showDateRange: true },
  { key: 'image', label: 'وێنەکان', sub: 'وێنە مێژووییەکان', resource: 'images', kind: 'image',
    api: (p) => guestImages.list(p), facetMap: IMAGE_FACETS, dataFacets: IMAGE_DATA_FACETS, sorts: MEDIA_SORTS, showDateRange: true },
  { key: 'person', label: 'کەسەکان', sub: 'هونەرمەند، دەنگبێژ و چیرۆکبێژ', resource: 'persons', kind: 'person',
    api: (p) => guestPersons(p), facetMap: PERSON_FACETS, sorts: BASIC_SORTS },
  { key: 'project', label: 'پڕۆژەکان', sub: 'کۆکراوە و توێژینەوەکان', resource: 'projects', kind: 'project',
    api: (p) => guestProjects(p), facetMap: PROJECT_FACETS, sorts: BASIC_SORTS },
  { key: 'category', label: 'پۆلەکان', sub: 'پۆلێنی کەلەپوور', resource: 'categories', kind: 'category',
    api: (p) => guestCategories(p), facetMap: [], sorts: BASIC_SORTS },
]
export const TYPE_MAP = Object.fromEntries(TYPES.map((t) => [t.key, t]))

// The sidebar's "browse by" nav — only the distinct ENTITY scopes. Media kinds
// are a checkbox group over the default media grid (not nav buttons), and the
// grid itself is the landing (no "all results" button).
export const NAV_TYPES = TYPES.filter((t) => ['person', 'project', 'category'].includes(t.key))

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

// Pull a 4-digit content year out of any media DTO, trying the descriptive
// date fields (recording / document / image / created / published / print)
// before the bookkeeping `createdAt`, so the value reflects WHEN the work is
// from rather than when the row was entered. Returns a string ('1991') for
// display, or null. `yearNum` returns the same as a number for range math.
function yearOf(item) {
  if (!item) return null
  const raw =
    item.recordedAt || item.recordingDate || item.documentDate || item.imageDate ||
    item.dateCreated || item.datePublished || item.printDate || item.createdAt ||
    item.year || item.date || null
  if (!raw) return null
  const m = String(raw).match(/(\d{4})/)
  return m ? m[1] : null
}

export function yearNum(item) {
  const y = yearOf(item)
  const n = y ? Number(y) : NaN
  return Number.isFinite(n) ? n : null
}

function durationOf(item) {
  return (
    item.durationFormatted ||
    (typeof item.duration === 'string' ? item.duration : null) ||
    fmtSeconds(item.durationSeconds || item.duration)
  )
}

function dateLabelOf(item) {
  if (!item) return null
  const raw =
    item.recordedAt || item.recordingDate || item.documentDate || item.imageDate ||
    item.dateCreated || item.datePublished || item.printDate || item.createdAt ||
    item.year || item.date || null
  if (raw != null && /^\d{4}$/.test(String(raw).trim())) return String(raw).trim()
  return formatPublicDate(raw) || yearOf(item)
}

function descriptionOf(item) {
  const raw =
    item?.description ||
    item?.summary ||
    item?.bio ||
    item?.photostory ||
    item?.transcription ||
    item?.bodyText ||
    item?.lyrics ||
    null
  if (raw == null) return null
  const text = String(raw).replace(/\s+/g, ' ').trim()
  return text || null
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

function categoriesOf(item) {
  const out = []
  const push = (raw) => {
    if (!raw) return
    if (typeof raw === 'string') {
      out.push({ code: raw, label: raw })
      return
    }
    const code = raw.categoryCode || raw.code || raw.value || raw.key || raw.id || null
    const label = raw.categoryName || raw.name || raw.label || code
    if (!label && !code) return
    out.push({
      code: code ? String(code) : String(label),
      label: String(label || code),
    })
  }
  if (Array.isArray(item?.categories)) {
    item.categories.forEach(push)
  } else if (Array.isArray(item?.categoryCodes)) {
    item.categoryCodes.forEach(push)
  } else {
    push(item?.category || {
      categoryCode: item?.categoryCode,
      categoryName: item?.categoryName,
      name: item?.categoryName,
    })
  }
  const seen = new Set()
  return out.filter((cat) => {
    const key = cat.code || cat.label
    if (!key || seen.has(key)) return false
    seen.add(key)
    return true
  })
}

function projectCountsOf(item) {
  const defs = [
    ['audio', item?.audioCount, DETAIL.counts.audio],
    ['video', item?.videoCount, DETAIL.counts.video],
    ['image', item?.imageCount, DETAIL.counts.image],
    ['text', item?.textCount, DETAIL.counts.text],
  ]
  return defs
    .map(([kind, value, label]) => ({ kind, value: Number(value) || 0, label }))
    .filter((entry) => entry.value > 0)
}

function trendOf(item) {
  const rank = item?.trendingRank ?? item?.trendRank ?? null
  const score = item?.trendingScore ?? item?.trendScore ?? null
  const rankNumber = Number(rank)
  const scoreNumber = Number(score)
  const trending = Boolean(
    item?.trending ||
    item?.isTrending ||
    (Number.isFinite(rankNumber) && rankNumber > 0) ||
    (Number.isFinite(scoreNumber) && scoreNumber > 0),
  )
  return {
    trending,
    trendingRank: rank,
    trendingScore: score,
  }
}

// Turn one DTO into the card shape KhiCard renders. `typeKey` is the active
// browse type; for the unified 'all' media grid each row carries its own
// `kind` — only the media kinds image|audio|video|text.
// The person/project/category branches below are reached only via the dedicated
// entity scopes (?type=… → guestPersons/guestProjects/guestCategories) and
// explicit detail-page calls — never the mixed media grid.
export function cardFromItem(item, typeKey) {
  const kind = typeKey === 'all' ? (item.kind || 'audio') : typeKey
  const code = codeOf(item, kind)
  const resource = KIND_TO_RESOURCE[kind] || 'audios'
  const to = code ? publicDetailPath(resource, code) : '#'
  const categories = categoriesOf(item)
  const trend = trendOf(item)

  if (kind === 'person') {
    // Two DTO shapes flow through here: the full Person record (dedicated
    // `person` scope — `fullName` + `mediaPortrait`) and older slim rows
    // (name in `title`/`personName`, portrait in `personMediaPortrait` and
    // mirrored to `fileUrl`). Read both so cards show the real name and photo
    // instead of falling through to the technical code.
    const name = item.fullName || item.name || item.personName || item.title || DETAIL.untitled
    return {
      kind, code, to, acc: code,
      title: name,
      description: descriptionOf(item),
      collection: Array.isArray(item.personType) ? item.personType.join(' · ') : item.personType || null,
      region: item.region || null,
      dateLabel: dateLabelOf(item),
      image: personImageSrc(item) || item.personMediaPortrait || item.fileUrl || '',
      avatarText: personInitials(name),
      tags: tagsOf(item),
      count: item.projectCount || item.totalCount || null,
      ...trend,
    }
  }

  if (kind === 'project') {
    const person = extractPersonFromItem(item)
    return {
      kind, code, to, acc: code,
      title: item.projectName || item.name || item.title || DETAIL.untitled,
      description: descriptionOf(item),
      projectCode: item.projectCode || code,
      projectName: item.projectName || item.name || item.title || null,
      collection: categories[0]?.label || null,
      categories,
      person: person ? { name: person.fullName || person.name, code: person.personCode, image: personImageSrc(person) } : null,
      personEmpty: !person,
      counts: projectCountsOf(item),
      tags: tagsOf(item),
      dateLabel: dateLabelOf(item),
      // Per-type project DTOs carry a thumbnail field; older slim rows mirror
      // the cover into `fileUrl`.
      image: mediaThumbHref(item) || item.fileUrl || null,
      ...trend,
    }
  }

  if (kind === 'category') {
    return {
      kind, code, to, acc: code,
      title: item.categoryName || item.name || DETAIL.untitled,
      description: descriptionOf(item),
      collection: null,
      tags: item.projectCount ? [`${item.projectCount} پڕۆژە`] : tagsOf(item),
      ...trend,
    }
  }

  // media kinds (audio/video/text/image)
  const person = extractPersonFromItem(item)
  return {
    kind, code, to, acc: code,
    title: pickMediaTitle(item) || DETAIL.untitled,
    description: descriptionOf(item),
    projectCode: item.projectCode || item.project?.projectCode || null,
    projectName: item.projectName || item.project?.projectName || item.collection || null,
    collection: item.projectName || item.project?.projectName || item.collection || null,
    person: person ? { name: person.fullName || person.name, code: person.personCode, image: personImageSrc(person) } : null,
    personEmpty: !person,
    categories,
    region: item.region || item.location || null,
    lang: item.language || null,
    decade: yearOf(item),
    dateLabel: dateLabelOf(item),
    duration: durationOf(item),
    // Per-type image rows use imageFileUrl. Video rows can carry a generated
    // thumbnail/poster. Text rows must only use the separate book/document
    // cover, never textFileUrl/fileUrl.
    image: kind === 'image'
      ? (mediaThumbHref(item) || item.fileUrl || null)
      : kind === 'video'
        ? mediaThumbHref(item) || null
        : kind === 'text'
          ? item.coverImageUrl || null
          : null,
    videoSrc: kind === 'video' ? item.videoFileUrl || item.fileUrl || null : null,
    tags: tagsOf(item),
    matchedOn: Array.isArray(item.matchedOn) ? item.matchedOn : null,
    ...trend,
  }
}
