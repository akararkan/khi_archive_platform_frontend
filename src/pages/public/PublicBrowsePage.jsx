import { useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import {
  ArrowDownAZ,
  ArrowUpAZ,
  AudioLines,
  Calendar,
  ChevronDown,
  FileText,
  Filter,
  FolderOpen,
  Grid3x3,
  Image as ImageIcon,
  Layers,
  List as ListIcon,
  Sparkles,
  Tags,
  User as UserIcon,
  Video as VideoIcon,
  X,
} from 'lucide-react'

import { HighlightProvider } from '@/components/ui/highlight'
import { DataPagination } from '@/components/ui/pagination'
import { BrowseSidebar } from '@/components/public/BrowseSidebar'
import {
  CardGridSkeleton,
  ErrorState,
  HeroStat,
  KindIcon,
  ListEmpty,
  ListSkeleton,
  ResultCard,
  ResultRow,
} from '@/components/public/PublicShared'
import {
  decodeSelectedFacets,
  extractPersonFromItem,
  personImageSrc,
  pickMediaTitle,
  readMediaTypeCount,
  totalFacetCount,
} from '@/components/public/public-helpers'
import { cn } from '@/lib/utils'
import {
  guestAudios,
  guestCategories,
  guestFacets,
  guestImages,
  guestPersons,
  guestProjects,
  guestResults,
  guestTexts,
  guestVideos,
} from '@/services/guest'

const PAGE_SIZE = 24

// Pretty labels for the per-kind section headers shown when the unified
// `all` results are rendered "part by parts" (one section per kind).
const KIND_SECTION_LABELS = {
  audio: 'Audios',
  video: 'Videos',
  text: 'Texts',
  image: 'Images',
}

// ── Type registry ──────────────────────────────────────────────────────

function pickYear(value) {
  if (!value) return null
  const m = String(value).match(/(\d{4})/)
  return m ? m[1] : null
}

// Tags / keywords are NOT facets — they live inside the search box,
// where the backend's full-text engine matches them as part of any
// query. Sidebar facets stay focused on picklist-shaped vocabulary
// (category, person, language, dialect, genre, region, …).
const SHARED_MEDIA_FACETS = [
  { paramKey: 'categoryCode', facetKey: 'categories', title: 'Category', defaultOpen: true },
  { paramKey: 'personCode', facetKey: 'persons', title: 'Person', defaultOpen: false },
  { paramKey: 'language', facetKey: 'languages', title: 'Language' },
  { paramKey: 'dialect', facetKey: 'dialects', title: 'Dialect' },
  { paramKey: 'genre', facetKey: 'genres', title: 'Genre' },
]

// Used by the unified `all` type to route a mixed-kind result to the
// right detail page based on its `kind` field.
const KIND_TO_RESOURCE = {
  audio: 'audios',
  video: 'videos',
  text: 'texts',
  image: 'images',
}

// Per-kind meta-line projector used by the `all` type's card mapper.
// Each kind highlights a different facet of metadata in the card body.
function unifiedMeta(kind, inner) {
  if (!inner) return []
  switch (kind) {
    case 'audio':
      return [inner.region, inner.language, inner.dialect, inner.form].filter(Boolean)
    case 'video':
      return [inner.region, inner.event, inner.location].filter(Boolean)
    case 'text':
      return [inner.documentType, inner.language, inner.author].filter(Boolean)
    case 'image':
      return [inner.form, inner.event, inner.location].filter(Boolean)
    default:
      return []
  }
}

const TYPES = {
  // ── Unified ranked search ─────────────────────────────────────────
  // Hits /api/guest/results: one merged feed of audios, videos, texts
  // and images, ranked by score (title hit +3, project +2, person +2,
  // tag/keyword +1) with `matchedOn` per row so the card can explain
  // *why* it matched. Different from the per-kind types below — those
  // are scoped browses; this one is "show me everything that fits".
  all: {
    key: 'all',
    label: 'All results',
    short: 'results',
    icon: Sparkles,
    api: { list: (params) => guestResults(params) },
    resource: null, // per-card routing via KIND_TO_RESOURCE
    kind: null,     // per-card kind from r.kind
    showDateRange: true,
    showMediaTypes: true,
    sorts: [
      { key: 'relevance', dir: 'desc', label: 'Relevance', icon: Sparkles },
      { key: 'date', dir: 'desc', label: 'Newest', icon: Calendar },
      { key: 'date', dir: 'asc', label: 'Oldest', icon: Calendar },
      { key: 'title', dir: 'asc', label: 'A→Z', icon: ArrowDownAZ },
      { key: 'title', dir: 'desc', label: 'Z→A', icon: ArrowUpAZ },
    ],
    facetMap: SHARED_MEDIA_FACETS,
    card: (r) => {
      const kind = r.kind
      const inner = (kind && r[kind]) || {}
      const resource = KIND_TO_RESOURCE[kind] || 'audios'
      const untitled =
        kind === 'audio' ? 'Untitled audio'
        : kind === 'video' ? 'Untitled video'
        : kind === 'text' ? 'Untitled text'
        : kind === 'image' ? 'Untitled image'
        : 'Untitled'
      return {
        kind,
        code: r.code,
        to: `/public/${resource}/${r.code}`,
        title: r.title || pickMediaTitle(inner) || untitled,
        description: inner.description || inner.summary,
        meta: unifiedMeta(kind, inner),
        // `dateCreated` and `createdAt` are technical timestamps —
        // when they're shown next to a card title they read as the
        // year of the *record* (e.g. "2026"), which is wrong and
        // confusing. Only fall back to dates that describe the media
        // itself (recording, document or image date).
        year: pickYear(
          inner.recordedAt ||
            inner.recordingDate ||
            inner.documentDate ||
            inner.imageDate,
        ),
        duration:
          kind === 'audio' || kind === 'video'
            ? inner.durationFormatted || formatDuration(inner.duration)
            : null,
        image: kind === 'image' ? inner.imageFileUrl : null,
        parent: parentFromMedia({
          ...inner,
          projectName: r.projectName || inner.projectName,
          projectCode: r.projectCode || inner.projectCode,
          personName: r.personName || inner.personName,
          personCode: r.personCode || inner.personCode,
        }),
        matchedOn: Array.isArray(r.matchedOn) ? r.matchedOn : null,
        score: Number.isFinite(r.score) ? r.score : null,
      }
    },
  },
  audio: {
    key: 'audio',
    label: 'Audios',
    short: 'audio recordings',
    icon: AudioLines,
    api: guestAudios,
    resource: 'audios',
    kind: 'audio',
    showDateRange: true,
    showPublishedRange: true,
    // Substring fields the backend exposes via /api/guest/audios — each
    // becomes a labelled, debounced text input under the sidebar's
    // "Search within" group. Keeping the universal `q` separate; these
    // narrow on a single attribute (composer, lyrics, …) when the user
    // already knows what they're hunting for.
    textFilters: [
      { paramKey: 'composer', label: 'Composer', placeholder: 'name' },
      { paramKey: 'producer', label: 'Producer', placeholder: 'name' },
      { paramKey: 'speaker', label: 'Speaker', placeholder: 'name' },
      { paramKey: 'poet', label: 'Poet', placeholder: 'name' },
      { paramKey: 'recordingVenue', label: 'Recording venue', placeholder: 'venue' },
      { paramKey: 'lyrics', label: 'Lyrics', placeholder: 'word or line' },
    ],
    sorts: [
      { key: 'createdAt', dir: 'desc', label: 'Newest', icon: Calendar },
      { key: 'createdAt', dir: 'asc', label: 'Oldest', icon: Calendar },
      { key: 'titleEnglish', dir: 'asc', label: 'A→Z', icon: ArrowDownAZ },
      { key: 'titleEnglish', dir: 'desc', label: 'Z→A', icon: ArrowUpAZ },
    ],
    facetMap: SHARED_MEDIA_FACETS,
    card: (a) => ({
      code: a.audioCode,
      title: pickMediaTitle(a) || 'Untitled audio',
      description: a.description,
      meta: [a.region, a.language, a.dialect, a.form].filter(Boolean),
      year: pickYear(a.recordedAt || a.recordingDate),
      duration: a.durationFormatted || formatDuration(a.duration),
      parent: parentFromMedia(a),
    }),
  },
  video: {
    key: 'video',
    label: 'Videos',
    short: 'video records',
    icon: VideoIcon,
    api: guestVideos,
    resource: 'videos',
    kind: 'video',
    showDateRange: true,
    showPublishedRange: true,
    textFilters: [
      { paramKey: 'creatorArtistDirector', label: 'Director / artist', placeholder: 'name' },
      { paramKey: 'producer', label: 'Producer', placeholder: 'name' },
      { paramKey: 'contributor', label: 'Contributor', placeholder: 'name' },
      { paramKey: 'personShownInVideo', label: 'Person in video', placeholder: 'name' },
      { paramKey: 'event', label: 'Event', placeholder: 'name' },
      { paramKey: 'location', label: 'Location', placeholder: 'place' },
      { paramKey: 'subtitle', label: 'Subtitle', placeholder: 'word' },
      { paramKey: 'provenance', label: 'Provenance', placeholder: 'source' },
      { paramKey: 'publisher', label: 'Publisher', placeholder: 'name' },
    ],
    sorts: [
      { key: 'createdAt', dir: 'desc', label: 'Newest', icon: Calendar },
      { key: 'createdAt', dir: 'asc', label: 'Oldest', icon: Calendar },
      { key: 'titleEnglish', dir: 'asc', label: 'A→Z', icon: ArrowDownAZ },
      { key: 'titleEnglish', dir: 'desc', label: 'Z→A', icon: ArrowUpAZ },
    ],
    facetMap: SHARED_MEDIA_FACETS,
    card: (v) => ({
      code: v.videoCode,
      title: pickMediaTitle(v) || 'Untitled video',
      description: v.description,
      meta: [v.region, v.event, v.location].filter(Boolean),
      year: pickYear(v.recordedAt || v.recordingDate),
      duration: v.durationFormatted || formatDuration(v.duration),
      parent: parentFromMedia(v),
    }),
  },
  text: {
    key: 'text',
    label: 'Texts',
    short: 'texts',
    icon: FileText,
    api: guestTexts,
    resource: 'texts',
    kind: 'text',
    showDateRange: true,
    showPublishedRange: true,
    showPrintRange: true,
    textFilters: [
      { paramKey: 'author', label: 'Author', placeholder: 'name' },
      { paramKey: 'contributors', label: 'Contributors', placeholder: 'name' },
      { paramKey: 'series', label: 'Series', placeholder: 'name' },
      { paramKey: 'edition', label: 'Edition', placeholder: 'edition' },
      { paramKey: 'volume', label: 'Volume', placeholder: 'volume' },
      { paramKey: 'printingHouse', label: 'Printing house', placeholder: 'name' },
      { paramKey: 'provenance', label: 'Provenance', placeholder: 'source' },
      { paramKey: 'publisher', label: 'Publisher', placeholder: 'name' },
    ],
    sorts: [
      { key: 'createdAt', dir: 'desc', label: 'Newest', icon: Calendar },
      { key: 'createdAt', dir: 'asc', label: 'Oldest', icon: Calendar },
      { key: 'titleEnglish', dir: 'asc', label: 'A→Z', icon: ArrowDownAZ },
      { key: 'titleEnglish', dir: 'desc', label: 'Z→A', icon: ArrowUpAZ },
    ],
    facetMap: SHARED_MEDIA_FACETS,
    card: (t) => ({
      code: t.textCode,
      title: pickMediaTitle(t) || 'Untitled text',
      description: t.description || t.summary,
      meta: [t.documentType, t.language, t.author].filter(Boolean),
      year: pickYear(t.documentDate || t.recordedAt),
      count: Number.isFinite(t.pageCount) ? t.pageCount : null,
      parent: parentFromMedia(t),
    }),
  },
  image: {
    key: 'image',
    label: 'Images',
    short: 'photographs',
    icon: ImageIcon,
    api: guestImages,
    resource: 'images',
    kind: 'image',
    showDateRange: true,
    showPublishedRange: true,
    textFilters: [
      { paramKey: 'creatorArtistPhotographer', label: 'Photographer / artist', placeholder: 'name' },
      { paramKey: 'contributor', label: 'Contributor', placeholder: 'name' },
      { paramKey: 'personShownInImage', label: 'Person in image', placeholder: 'name' },
      { paramKey: 'event', label: 'Event', placeholder: 'name' },
      { paramKey: 'location', label: 'Location', placeholder: 'place' },
      { paramKey: 'provenance', label: 'Provenance', placeholder: 'source' },
      { paramKey: 'photostory', label: 'Photo story', placeholder: 'word' },
    ],
    sorts: [
      { key: 'createdAt', dir: 'desc', label: 'Newest', icon: Calendar },
      { key: 'createdAt', dir: 'asc', label: 'Oldest', icon: Calendar },
      { key: 'titleEnglish', dir: 'asc', label: 'A→Z', icon: ArrowDownAZ },
      { key: 'titleEnglish', dir: 'desc', label: 'Z→A', icon: ArrowUpAZ },
    ],
    facetMap: SHARED_MEDIA_FACETS.filter(
      (f) => !['language', 'dialect'].includes(f.paramKey),
    ),
    card: (i) => ({
      code: i.imageCode,
      title: pickMediaTitle(i) || 'Untitled image',
      description: i.description,
      meta: [i.form, i.event, i.location].filter(Boolean),
      year: pickYear(i.imageDate || i.recordedAt),
      image: i.imageFileUrl,
      parent: parentFromMedia(i),
    }),
  },
  project: {
    key: 'project',
    label: 'Projects',
    short: 'projects',
    icon: FolderOpen,
    api: { list: (params) => guestProjects(params) },
    resource: 'projects',
    kind: 'project',
    showDateRange: false,
    sorts: [
      { key: 'createdAt', dir: 'desc', label: 'Newest', icon: Calendar },
      { key: 'createdAt', dir: 'asc', label: 'Oldest', icon: Calendar },
      { key: 'projectName', dir: 'asc', label: 'A→Z', icon: ArrowDownAZ },
      { key: 'projectName', dir: 'desc', label: 'Z→A', icon: ArrowUpAZ },
    ],
    facetMap: [
      { paramKey: 'categoryCode', facetKey: 'categories', title: 'Category', defaultOpen: true },
      { paramKey: 'personCode', facetKey: 'persons', title: 'Person' },
    ],
    card: (p) => ({
      code: p.projectCode,
      title: p.projectName,
      description: p.description,
      audioCount: p.audioCount,
      videoCount: p.videoCount,
      textCount: p.textCount,
      imageCount: p.imageCount,
      count:
        (Number(p.audioCount) || 0) +
        (Number(p.videoCount) || 0) +
        (Number(p.textCount) || 0) +
        (Number(p.imageCount) || 0),
      parent: parentFromMedia(p),
    }),
  },
  person: {
    key: 'person',
    label: 'Persons',
    short: 'persons',
    icon: UserIcon,
    api: { list: (params) => guestPersons(params) },
    resource: 'persons',
    kind: 'person',
    showDateRange: false,
    sorts: [
      { key: 'fullName', dir: 'asc', label: 'A→Z', icon: ArrowDownAZ },
      { key: 'fullName', dir: 'desc', label: 'Z→A', icon: ArrowUpAZ },
      { key: 'createdAt', dir: 'desc', label: 'Newest', icon: Calendar },
    ],
    facetMap: [
      { paramKey: 'region', facetKey: 'regions', title: 'Region', defaultOpen: true },
    ],
    card: (p) => {
      // personType may be an array (["Singer","Maqam Bezh", …]) or a
      // delimiter-joined string. Spread it into the meta list so each
      // role lands in its own dot-separated chunk instead of rendering
      // as a concatenated wall of text.
      const roles = Array.isArray(p.personType)
        ? p.personType
        : (typeof p.personType === 'string'
            ? p.personType.split(/[,،;]/).map((s) => s.trim()).filter(Boolean)
            : [])
      return {
        code: p.personCode,
        title: p.fullName || p.name || 'Untitled person',
        description: p.bio || p.description,
        meta: [...roles, p.region, p.gender].filter(Boolean),
        parent: { person: p },
      }
    },
  },
  category: {
    key: 'category',
    label: 'Categories',
    short: 'categories',
    icon: Tags,
    api: { list: (params) => guestCategories(params) },
    resource: 'categories',
    kind: 'category',
    showDateRange: false,
    sorts: [
      { key: 'name', dir: 'asc', label: 'A→Z', icon: ArrowDownAZ },
      { key: 'name', dir: 'desc', label: 'Z→A', icon: ArrowUpAZ },
    ],
    facetMap: [],
    card: (c) => ({
      code: c.categoryCode,
      title: c.name || 'Untitled category',
      description: c.description,
      count: c.projectCount,
    }),
  },
}

// `all` is intentionally first so it leads the type rail in the sidebar.
// It's the destination the global header search lands on by default
// (`/public/browse?type=all&q=…`), so people who searched something
// see the unified ranked feed immediately. The kind-specific types
// stay below for pure-browse scenarios.
//
// DEFAULT_TYPE stays `audio` though — the unified `all` endpoint is a
// search endpoint that needs a `q` to surface candidates, so an empty
// landing on /public would be a blank page. Audios are the largest
// kind in the archive and the best browse-without-search default.
const TYPE_ORDER = ['all', 'audio', 'video', 'text', 'image', 'person', 'project', 'category']
const TYPE_LIST = TYPE_ORDER.map((k) => TYPES[k])

const DEFAULT_TYPE = 'audio'

// Set of kinds the unified results endpoint supports as a `types[]`
// repeatable filter. Order matches TYPE_ORDER.
const MEDIA_KINDS = ['audio', 'video', 'text', 'image']

function parentFromMedia(item) {
  // Build a unified person stub no matter how the backend surfaces it
  // (nested `person` object OR flat `personName` / `personImageUrl` /
  // …) so every card with a linked person can render the real photo.
  const person = extractPersonFromItem(item)
  return {
    project:
      item.projectName ||
      item.project?.projectName ||
      item.project?.name ||
      null,
    personName:
      item.personName ||
      item.person?.fullName ||
      item.person?.name ||
      null,
    personCode: item.personCode || item.person?.personCode || null,
    person,
    personImage: personImageSrc(person) || null,
  }
}

function formatDuration(seconds) {
  if (!Number.isFinite(seconds) || seconds <= 0) return null
  const total = Math.floor(seconds)
  const m = Math.floor(total / 60)
  const s = total % 60
  return `${m}:${s.toString().padStart(2, '0')}`
}

// ── Page ───────────────────────────────────────────────────────────────

function PublicBrowsePage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const typeKey = TYPES[searchParams.get('type')] ? searchParams.get('type') : DEFAULT_TYPE
  const type = TYPES[typeKey]

  const q = searchParams.get('q') || ''
  const sortKey = searchParams.get('sortBy') || type.sorts[0].key
  const sortDir = searchParams.get('sortDirection') || type.sorts[0].dir
  const page = Number(searchParams.get('page') || 0) || 0
  const layout = searchParams.get('layout') === 'list' ? 'list' : 'grid'
  const dateFrom = searchParams.get('dateFrom') || ''
  const dateTo = searchParams.get('dateTo') || ''
  const publishedFrom = searchParams.get('publishedFrom') || ''
  const publishedTo = searchParams.get('publishedTo') || ''
  const printDateFrom = searchParams.get('printDateFrom') || ''
  const printDateTo = searchParams.get('printDateTo') || ''
  const selected = useMemo(
    () => decodeSelectedFacets(searchParams, type.facetMap),
    [searchParams, type.facetMap],
  )
  // Per-type substring filters (composer / lyrics / publisher / …) read
  // straight off the URL keyed by their paramKey. Encoded as plain
  // strings so they show up cleanly in browser history and shared links.
  //
  // Only available on the per-kind browse types (audio / video / text /
  // image) — the unified `/api/guest/results` endpoint that powers
  // `all` doesn't accept these per-kind columns yet, and showing UI that
  // silently does nothing is worse than not showing it at all. To use
  // composer / lyrics / etc., the user switches type from the sidebar
  // rail (one click), which gives them the full per-kind filter set
  // backed by /api/guest/audios (or /videos, /texts, /images).
  const textFilters = useMemo(() => type.textFilters || [], [type])
  const textFilterValues = useMemo(() => {
    const out = {}
    for (const f of textFilters) {
      out[f.paramKey] = searchParams.get(f.paramKey) || ''
    }
    return out
  }, [searchParams, textFilters])
  // For the `all` type: which media kinds to include in the merged feed.
  // URL `types=audio,video` → ['audio','video']. Empty / absent means
  // "all four" — the backend defaults to that when the param is omitted.
  const selectedMediaTypes = useMemo(() => {
    if (!type.showMediaTypes) return []
    const raw = searchParams.get('types')
    if (!raw) return []
    return raw
      .split(',')
      .map((s) => s.trim().toLowerCase())
      .filter((s) => MEDIA_KINDS.includes(s))
  }, [searchParams, type.showMediaTypes])

  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [filtersOpen, setFiltersOpen] = useState(false)
  const [facets, setFacets] = useState(null)
  const [tookMs, setTookMs] = useState(null)

  // Fetch facets once for hero stats and the type-rail counts.
  useEffect(() => {
    const ctrl = new AbortController()
    guestFacets({ signal: ctrl.signal })
      .then((data) => setFacets(data || null))
      .catch(() => {})
    return () => ctrl.abort()
  }, [])

  useEffect(() => {
    const ctrl = new AbortController()
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setLoading(true)
    setError('')
    const params = {
      page,
      size: PAGE_SIZE,
      sortBy: sortKey,
      sortDirection: sortDir,
      signal: ctrl.signal,
    }
    if (q) params.q = q
    if (type.showDateRange && dateFrom) params.dateFrom = dateFrom
    if (type.showDateRange && dateTo) params.dateTo = dateTo
    if (type.showPublishedRange && publishedFrom) params.publishedFrom = publishedFrom
    if (type.showPublishedRange && publishedTo) params.publishedTo = publishedTo
    if (type.showPrintRange && printDateFrom) params.printDateFrom = printDateFrom
    if (type.showPrintRange && printDateTo) params.printDateTo = printDateTo
    for (const group of type.facetMap) {
      const list = selected[group.paramKey]
      if (Array.isArray(list) && list.length > 0) {
        params[group.paramKey] = list[0]
      }
    }
    for (const f of textFilters) {
      const v = (textFilterValues[f.paramKey] || '').trim()
      if (v) params[f.paramKey] = v
    }
    // The unified `all` endpoint accepts a repeatable `types` filter
    // (audio/video/text/image). Omitting it means "all four". The
    // service-level paramsSerializer rewrites arrays to repeated
    // `?types=audio&types=video` for Spring's @RequestParam binder.
    if (type.showMediaTypes && selectedMediaTypes.length > 0) {
      params.types = selectedMediaTypes
    }
    const t0 = performance.now()
    type.api
      .list(params)
      .then((res) => {
        setData(res || null)
        setTookMs(Math.max(1, Math.round(performance.now() - t0)))
      })
      .catch((err) => {
        if (err?.code === 'ERR_CANCELED') return
        setError(`Could not load ${type.label.toLowerCase()}.`)
      })
      .finally(() => setLoading(false))
    return () => ctrl.abort()
  }, [
    type,
    q,
    sortKey,
    sortDir,
    page,
    selected,
    dateFrom,
    dateTo,
    publishedFrom,
    publishedTo,
    printDateFrom,
    printDateTo,
    selectedMediaTypes,
    textFilters,
    textFilterValues,
  ])

  const update = (next) => {
    const sp = new URLSearchParams(searchParams)
    Object.entries(next).forEach(([k, v]) => {
      if (v == null || v === '') sp.delete(k)
      else sp.set(k, String(v))
    })
    setSearchParams(sp)
  }

  const switchType = (nextKey) => {
    const next = TYPES[nextKey]
    const sp = new URLSearchParams()
    if (q) sp.set('q', q)
    sp.set('type', nextKey)
    sp.set('sortBy', next.sorts[0].key)
    sp.set('sortDirection', next.sorts[0].dir)
    if (layout === 'list') sp.set('layout', 'list')
    setSearchParams(sp)
    setFiltersOpen(false)
  }

  const clearAllFilters = () => {
    const sp = new URLSearchParams()
    sp.set('type', typeKey)
    sp.set('sortBy', type.sorts[0].key)
    sp.set('sortDirection', type.sorts[0].dir)
    if (layout === 'list') sp.set('layout', 'list')
    setSearchParams(sp)
  }

  const items = data?.content || []
  const totalElements = Number(data?.totalElements ?? items.length)
  const activeTextFilterCount = textFilters.reduce(
    (acc, f) => acc + ((textFilterValues[f.paramKey] || '').trim() ? 1 : 0),
    0,
  )
  const activeFilterCount =
    (q ? 1 : 0) +
    (dateFrom || dateTo ? 1 : 0) +
    (publishedFrom || publishedTo ? 1 : 0) +
    (printDateFrom || printDateTo ? 1 : 0) +
    (selectedMediaTypes.length > 0 && selectedMediaTypes.length < MEDIA_KINDS.length ? 1 : 0) +
    activeTextFilterCount +
    Object.values(selected).reduce(
      (acc, list) => acc + (Array.isArray(list) ? list.length : 0),
      0,
    )

  // Hero stats — pull live numbers off /guest/facets.
  const heroStats = useMemo(() => {
    const audio = readMediaTypeCount(facets, 'audio')
    const video = readMediaTypeCount(facets, 'video')
    const text = readMediaTypeCount(facets, 'text')
    const image = readMediaTypeCount(facets, 'image')
    const total =
      [audio, video, text, image].reduce((a, b) => a + (Number(b) || 0), 0) || null
    const persons = totalFacetCount(facets, 'persons')
    const categories = totalFacetCount(facets, 'categories')
    return { total, persons, categories, audio, video, text, image }
  }, [facets])

  // Type rail counts — read from facets so the numbers match what's
  // actually filterable. The unified `all` type sums the four media-
  // kind totals (the `/results` endpoint never returns persons,
  // projects or categories — those have their own scopes).
  const typeListWithCounts = useMemo(
    () =>
      TYPE_LIST.map((t) => {
        let count
        if (t.key === 'all') {
          count = [heroStats.audio, heroStats.video, heroStats.text, heroStats.image].reduce(
            (a, b) => a + (Number(b) || 0),
            0,
          ) || null
        } else if (t.kind === 'audio') count = heroStats.audio
        else if (t.kind === 'video') count = heroStats.video
        else if (t.kind === 'text') count = heroStats.text
        else if (t.kind === 'image') count = heroStats.image
        else if (t.kind === 'person') count = heroStats.persons
        else if (t.kind === 'category') count = heroStats.categories
        return { ...t, count }
      }),
    [heroStats],
  )

  // Media-type counts for the "Media types" sidebar group on `all`.
  const mediaTypeCounts = useMemo(
    () => ({
      audio: heroStats.audio,
      video: heroStats.video,
      text: heroStats.text,
      image: heroStats.image,
    }),
    [heroStats],
  )

  const sidebarProps = {
    types: typeListWithCounts,
    activeType: typeKey,
    onTypeChange: switchType,
    facetMap: type.facetMap,
    selected,
    onChange: (next) => update({ ...next, page: 0 }),
    onReset: clearAllFilters,
    searchValue: q,
    onClearSearch: () => update({ q: null, page: 0 }),
    showDateRange: type.showDateRange,
    dateFrom,
    dateTo,
    onDateChange: (next) => update({ ...next, page: 0 }),
    // ── Date variants the backend now exposes per type ──────────
    showPublishedRange: Boolean(type.showPublishedRange),
    publishedFrom,
    publishedTo,
    onPublishedDateChange: (next) => update({ ...next, page: 0 }),
    showPrintRange: Boolean(type.showPrintRange),
    printDateFrom,
    printDateTo,
    onPrintDateChange: (next) => update({ ...next, page: 0 }),
    // ── Substring "search within" filters (per type) ────────────
    textFilters,
    textFilterValues,
    onTextFilterChange: (paramKey, value) =>
      update({ [paramKey]: value || null, page: 0 }),
    // Media-type checkboxes — only the `all` type opts in. Empty
    // selection means "all four" (the backend default), so we never
    // serialize an empty array into the URL.
    showMediaTypes: Boolean(type.showMediaTypes),
    mediaKinds: MEDIA_KINDS,
    mediaTypeCounts,
    selectedMediaTypes,
    onMediaTypesChange: (nextArray) => {
      const isAll = nextArray.length === 0 || nextArray.length === MEDIA_KINDS.length
      update({ types: isAll ? null : nextArray.join(','), page: 0 })
    },
  }

  return (
    <>
      {/* ── Desktop sidebar — fixed at viewport left:0, scrolls independently ── */}
      <aside
        aria-label="Filters"
        className="fixed bottom-0 left-0 top-16 z-30 hidden w-[300px] overflow-y-auto overscroll-contain border-r border-sidebar-border bg-sidebar text-sidebar-foreground lg:block"
      >
        <BrowseSidebar {...sidebarProps} />
      </aside>

      {/* ── Mobile filter drawer ──────────────────────────────── */}
      {filtersOpen ? (
        <div
          className="fixed bottom-0 left-0 right-0 top-16 z-40 overflow-y-auto bg-sidebar text-sidebar-foreground lg:hidden"
          role="dialog"
          aria-modal="true"
        >
          <BrowseSidebar {...sidebarProps} />
        </div>
      ) : null}

      {/* ── Main column (everything to the right of the sidebar on desktop) ── */}
      <div className="lg:pl-[300px]">
        {/* ── Hero ────────────────────────────────────────────────
            The page-level search bar is gone — the global SearchCommand
            in the header is the only entry point now. The hero just
            anchors the page with the title, an at-a-glance count line
            and the live facet stats. */}
        <section className="border-b border-border bg-gradient-to-b from-background to-secondary/40">
          <div className="mx-auto w-full max-w-5xl px-4 pb-8 pt-9 sm:px-6 sm:pt-11 lg:px-8">
            <h1 className="max-w-3xl font-heading text-[clamp(24px,3vw,36px)] font-semibold leading-[1.1] tracking-tight text-foreground">
              {q ? (
                <>
                  Results for{' '}
                  <span className="text-primary">“{q}”</span>
                </>
              ) : (
                <>
                  Browse the archive.{' '}
                  <span className="font-normal text-muted-foreground">
                    Search across audio, video, photographs, manuscripts and people.
                  </span>
                </>
              )}
            </h1>
            <p className="mt-3 max-w-2xl text-[14px] leading-relaxed text-muted-foreground">
              {Number.isFinite(heroStats.total) && heroStats.total > 0
                ? `${heroStats.total.toLocaleString()} records — fully indexed, filterable by person, category, language and decade.`
                : 'A public catalogue of the Kurdish Heritage Institute — fully indexed, filterable by person, category, language and decade.'}
            </p>

            <div className="mt-5 flex flex-wrap gap-x-8 gap-y-3.5">
              <HeroStat value={heroStats.total} label="Total records" />
              <HeroStat value={heroStats.persons} label="Persons indexed" />
              <HeroStat value={heroStats.categories} label="Categories" />
              <HeroStat value={totalElements || null} label={`Matching ${type.label.toLowerCase()}`} />
            </div>
          </div>
        </section>

        {/* Mobile filter trigger — sits between hero and results */}
        <div className="border-b border-border bg-background px-4 py-2.5 sm:px-6 lg:hidden">
          <button
            type="button"
            onClick={() => setFiltersOpen((v) => !v)}
            className="inline-flex h-9 items-center gap-1.5 rounded-md border border-border bg-background px-3 text-[13px] font-medium hover:bg-accent"
          >
            {filtersOpen ? <X className="size-3.5" /> : <Filter className="size-3.5" />}
            {filtersOpen ? 'Hide filters' : 'Filters'}
            {activeFilterCount > 0 ? (
              <span className="ml-0.5 inline-grid size-4 min-w-4 place-items-center rounded-full bg-primary px-1 text-[10px] font-bold text-primary-foreground">
                {activeFilterCount}
              </span>
            ) : null}
          </button>
        </div>

        {/* Results */}
        <main className="mx-auto w-full min-w-0 max-w-5xl px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
          {type.key === 'all' ? (
            <MediaTypePillBar
              kinds={MEDIA_KINDS}
              counts={mediaTypeCounts}
              selected={selectedMediaTypes}
              total={heroStats.total || null}
              onChange={(nextArray) => {
                const isAll =
                  nextArray.length === 0 || nextArray.length === MEDIA_KINDS.length
                update({ types: isAll ? null : nextArray.join(','), page: 0 })
              }}
            />
          ) : null}
          <ActiveFiltersStrip
            q={q}
            onClearSearch={() => update({ q: null, page: 0 })}
            dateFrom={dateFrom}
            dateTo={dateTo}
            onClearDate={() =>
              update({ dateFrom: null, dateTo: null, page: 0 })
            }
            publishedFrom={publishedFrom}
            publishedTo={publishedTo}
            onClearPublished={() =>
              update({ publishedFrom: null, publishedTo: null, page: 0 })
            }
            printDateFrom={printDateFrom}
            printDateTo={printDateTo}
            onClearPrintDate={() =>
              update({ printDateFrom: null, printDateTo: null, page: 0 })
            }
            mediaKinds={MEDIA_KINDS}
            selectedMediaTypes={selectedMediaTypes}
            showMediaTypes={Boolean(type.showMediaTypes)}
            onClearMediaType={(kind) => {
              const next = selectedMediaTypes.filter((k) => k !== kind)
              update({ types: next.length === 0 ? null : next.join(','), page: 0 })
            }}
            facetMap={type.facetMap}
            selected={selected}
            onRemoveFacet={(paramKey, value) => {
              const list = (selected[paramKey] || []).filter((v) => v !== value)
              update({
                [paramKey]: list.length === 0 ? null : list.join(','),
                page: 0,
              })
            }}
            textFilters={textFilters}
            textFilterValues={textFilterValues}
            onClearTextFilter={(paramKey) => update({ [paramKey]: null, page: 0 })}
            totalActive={activeFilterCount}
            onClearAll={clearAllFilters}
          />
          <ResultsHead
            count={totalElements}
            label={type.short}
            ms={tookMs}
            sorts={type.sorts}
            sortValue={`${sortKey}:${sortDir}`}
            onSortChange={(value) => {
              const [k, d] = value.split(':')
              update({ sortBy: k, sortDirection: d, page: 0 })
            }}
            layout={layout}
            onLayoutChange={(next) => update({ layout: next === 'grid' ? null : next })}
          />

          {loading ? (
            layout === 'list' ? <ListSkeleton count={6} /> : <CardGridSkeleton count={10} />
          ) : error ? (
            <ErrorState error={error} onRetry={() => update({})} />
          ) : items.length === 0 && type.key !== 'all' ? (
            // The unified `all` view never falls through to ListEmpty —
            // ResultsBody renders all four kind sections with their own
            // NoKindMatches placeholders, which is the more informative
            // empty state for cross-kind search.
            <ListEmpty
              title={`No ${type.label.toLowerCase()} match`}
              description={
                activeFilterCount > 0
                  ? 'Try widening filters, or switch type from the sidebar — your search will follow.'
                  : 'Nothing here yet.'
              }
            />
          ) : (
            <>
              <HighlightProvider query={q}>
                <ResultsBody
                  type={type}
                  items={items}
                  layout={layout}
                />
              </HighlightProvider>
              <DataPagination
                page={data?.number ?? page}
                totalPages={data?.totalPages ?? 0}
                totalElements={data?.totalElements ?? 0}
                pageSize={data?.size ?? PAGE_SIZE}
                onPageChange={(next) => update({ page: next })}
                className="mt-8"
              />
            </>
          )}
        </main>
      </div>
    </>
  )
}

// ── MediaTypePillBar ───────────────────────────────────────────────────
//
// Top-of-results pill row, shown on the unified `all` view. The user's
// primary axis for narrowing the cross-kind feed: tap "Audios" and the
// search becomes "everything matching my query that is an audio". The
// "All" pill clears the narrowing back to all four kinds. Pills toggle
// — clicking an active one removes it; clicking another adds it. The
// underlying state is the same `types` URL param the sidebar checkbox
// group writes to, so the pills + checkboxes stay perfectly in sync.
function MediaTypePillBar({ kinds, counts, selected, onChange, total }) {
  const allActive = selected.length === 0 || selected.length === kinds.length
  return (
    <div className="mb-6 flex flex-wrap items-center gap-1.5 rounded-2xl border border-border bg-secondary/40 p-1 shadow-sm shadow-black/[0.02]">
      <PillButton
        active={allActive}
        Icon={Layers}
        label="All"
        count={total}
        onClick={() => onChange([])}
      />
      {kinds.map((kind) => {
        const Icon = MEDIA_PILL_ICONS[kind]
        const isActive = !allActive && selected.includes(kind)
        return (
          <PillButton
            key={kind}
            active={isActive}
            Icon={Icon}
            label={KIND_SECTION_LABELS[kind] || kind}
            count={counts[kind]}
            onClick={() => {
              const set = new Set(selected)
              if (set.has(kind)) set.delete(kind)
              else set.add(kind)
              onChange(Array.from(set))
            }}
          />
        )
      })}
    </div>
  )
}

const MEDIA_PILL_ICONS = {
  audio: AudioLines,
  video: VideoIcon,
  text: FileText,
  image: ImageIcon,
}

function PillButton({ active, Icon, label, count, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        'group/pill inline-flex h-9 items-center gap-2 rounded-xl px-3.5 text-[13px] font-semibold transition-all',
        active
          ? 'bg-primary text-primary-foreground shadow-sm shadow-primary/25'
          : 'text-muted-foreground hover:bg-background hover:text-foreground',
      )}
    >
      {Icon ? <Icon className="size-3.5" /> : null}
      <span>{label}</span>
      {Number.isFinite(count) ? (
        <span
          className={cn(
            'inline-flex h-[18px] min-w-[22px] items-center justify-center rounded-full px-1.5 font-mono text-[10.5px] tabular-nums',
            active
              ? 'bg-primary-foreground/20 text-primary-foreground'
              : 'bg-background text-muted-foreground',
          )}
        >
          {count.toLocaleString()}
        </span>
      ) : null}
    </button>
  )
}

// ── ActiveFiltersStrip ─────────────────────────────────────────────────
//
// Horizontal chip strip rendered above the results, mirroring (and
// enhancing) the sidebar's "Active filters" stones. The point is
// progressive narrowing — the user always sees exactly which filters
// are active, can remove any single chip without leaving the results
// context, and can reset the whole stack with one tap. On mobile the
// strip scrolls horizontally so it never wraps and pushes the results
// down the page.
function ActiveFiltersStrip({
  q,
  onClearSearch,
  dateFrom,
  dateTo,
  onClearDate,
  publishedFrom,
  publishedTo,
  onClearPublished,
  printDateFrom,
  printDateTo,
  onClearPrintDate,
  mediaKinds,
  selectedMediaTypes,
  showMediaTypes,
  onClearMediaType,
  facetMap,
  selected,
  onRemoveFacet,
  textFilters,
  textFilterValues,
  onClearTextFilter,
  totalActive,
  onClearAll,
}) {
  if (!totalActive) return null
  const mediaKindsActive =
    showMediaTypes &&
    selectedMediaTypes.length > 0 &&
    selectedMediaTypes.length < (mediaKinds?.length || 4)
  return (
    <div className="mb-5 flex items-center gap-2 rounded-xl border border-border bg-card/60 px-3 py-2 shadow-sm shadow-black/[0.02]">
      <span className="hidden shrink-0 text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground sm:inline">
        Filters
      </span>
      <div className="flex min-w-0 flex-1 items-center gap-1.5 overflow-x-auto py-0.5">
        {q ? (
          <FilterChip
            label="Search"
            value={`“${q}”`}
            onClear={onClearSearch}
            tone="primary"
          />
        ) : null}
        {dateFrom || dateTo ? (
          <FilterChip
            label="Created"
            value={`${shortYear(dateFrom) || '…'} → ${shortYear(dateTo) || '…'}`}
            onClear={onClearDate}
          />
        ) : null}
        {publishedFrom || publishedTo ? (
          <FilterChip
            label="Published"
            value={`${shortYear(publishedFrom) || '…'} → ${shortYear(publishedTo) || '…'}`}
            onClear={onClearPublished}
          />
        ) : null}
        {printDateFrom || printDateTo ? (
          <FilterChip
            label="Printed"
            value={`${shortYear(printDateFrom) || '…'} → ${shortYear(printDateTo) || '…'}`}
            onClear={onClearPrintDate}
          />
        ) : null}
        {mediaKindsActive
          ? selectedMediaTypes.map((kind) => (
              <FilterChip
                key={`type-${kind}`}
                label="Type"
                value={KIND_SECTION_LABELS[kind] || kind}
                onClear={() => onClearMediaType(kind)}
              />
            ))
          : null}
        {(facetMap || []).flatMap((g) =>
          (selected?.[g.paramKey] || []).map((v) => (
            <FilterChip
              key={`${g.paramKey}-${v}`}
              label={g.title}
              value={v}
              onClear={() => onRemoveFacet(g.paramKey, v)}
            />
          )),
        )}
        {(textFilters || []).map((f) => {
          const v = (textFilterValues?.[f.paramKey] || '').trim()
          if (!v) return null
          return (
            <FilterChip
              key={`tf-${f.paramKey}`}
              label={f.label}
              value={v}
              onClear={() => onClearTextFilter(f.paramKey)}
            />
          )
        })}
      </div>
      <button
        type="button"
        onClick={onClearAll}
        className="ml-auto inline-flex h-7 shrink-0 items-center gap-1 rounded-md px-2 text-[11.5px] font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
      >
        Clear all
      </button>
    </div>
  )
}

function FilterChip({ label, value, onClear, tone }) {
  const isPrimary = tone === 'primary'
  return (
    <button
      type="button"
      onClick={onClear}
      className={cn(
        'group/chip inline-flex h-7 max-w-full shrink-0 items-center gap-1.5 rounded-full border py-px pl-2 pr-1 text-[11.5px] font-medium transition-colors',
        isPrimary
          ? 'border-primary/30 bg-primary/8 text-primary hover:border-primary/50'
          : 'border-border bg-background text-foreground hover:border-foreground/30 hover:bg-accent',
      )}
      title={`${label}: ${value} — click to remove`}
    >
      <span
        className={cn(
          'shrink-0 text-[9px] font-semibold uppercase tracking-[0.14em]',
          isPrimary ? 'text-primary/80' : 'text-muted-foreground',
        )}
      >
        {label}
      </span>
      <span className="max-w-[20ch] truncate font-medium">{value}</span>
      <span
        className={cn(
          'grid size-4 place-items-center rounded-full transition-colors',
          isPrimary
            ? 'text-primary/70 group-hover/chip:bg-primary/15 group-hover/chip:text-primary'
            : 'text-muted-foreground group-hover/chip:bg-foreground/10 group-hover/chip:text-foreground',
        )}
      >
        <X className="size-2.5" strokeWidth={3} />
      </span>
    </button>
  )
}

// Year extractor for the active-filter date chips (yyyy-mm-dd → "yyyy"
// so the chip stays compact in a horizontal scroller).
function shortYear(iso) {
  if (!iso) return ''
  const m = String(iso).match(/^(\d{4})/)
  return m ? m[1] : iso
}

// ── ResultsBody ────────────────────────────────────────────────────────
//
// Renders the result list. Two layouts are supported (grid + list); the
// unified `all` type renders them "part by parts" — one section per
// media kind (audio / video / text / image) with its own header — so a
// merged ranked feed still reads as four scannable groups instead of a
// single homogeneous wall. Other types render a single flat block since
// every row already shares the same kind.
function ResultsBody({ type, items, layout }) {
  // Per-card render — extracted as helpers so the sectioned and flat
  // paths can share the exact same per-item JSX without drifting.
  const renderCard = (item, idx) => {
    const c = type.card(item)
    const cardKind = c.kind || type.kind
    const cardTo = c.to || `/public/${type.resource}/${c.code}`
    return (
      <ResultCard
        key={`${cardKind}:${c.code}:${idx}`}
        kind={cardKind}
        to={cardTo}
        title={c.title}
        subtitle={c.code}
        description={c.description}
        meta={c.meta}
        image={c.image}
        count={c.count}
        year={c.year}
        duration={c.duration}
        parent={c.parent}
        audioCount={c.audioCount}
        videoCount={c.videoCount}
        textCount={c.textCount}
        imageCount={c.imageCount}
        matchedOn={c.matchedOn}
      />
    )
  }
  const renderRow = (item, idx) => {
    const c = type.card(item)
    const cardKind = c.kind || type.kind
    const cardTo = c.to || `/public/${type.resource}/${c.code}`
    return (
      <ResultRow
        key={`${cardKind}:${c.code}:${idx}`}
        kind={cardKind}
        to={cardTo}
        title={c.title}
        subtitle={c.code}
        description={c.description}
        meta={c.meta}
        year={c.year}
        duration={c.duration}
        image={c.image}
        parent={c.parent}
        audioCount={c.audioCount}
        videoCount={c.videoCount}
        textCount={c.textCount}
        imageCount={c.imageCount}
        matchedOn={c.matchedOn}
      />
    )
  }

  // ── Sectioned: only the unified `all` type ──────────────────────
  // We render *every* media kind as its own section, even when its
  // bucket comes back empty — the empty section gets a NoKindMatches
  // placeholder card so the user always sees the full classification
  // (yes there are 3 audios, no there are no videos / texts / images
  // for this query). This is the "show all categories always" UX from
  // the spec: nothing collapses silently.
  if (type.key === 'all') {
    const buckets = MEDIA_KINDS.map((kind) => ({
      kind,
      bucket: items.filter((i) => i.kind === kind),
    }))

    return (
      <div className="space-y-9">
        {buckets.map(({ kind, bucket }) => (
          <section key={kind} className="space-y-4">
            <KindSectionHeader kind={kind} count={bucket.length} />
            {bucket.length === 0 ? (
              <NoKindMatches kind={kind} />
            ) : layout === 'list' ? (
              <div className="flex flex-col gap-2.5">
                {bucket.map((item, idx) => renderRow(item, idx))}
              </div>
            ) : (
              <div className="grid grid-cols-[repeat(auto-fill,minmax(240px,1fr))] gap-4">
                {bucket.map((item, idx) => renderCard(item, idx))}
              </div>
            )}
          </section>
        ))}
      </div>
    )
  }

  // ── Flat: every other type (per-kind browses) ───────────────────
  if (layout === 'list') {
    return (
      <div className="flex flex-col gap-2.5">
        {items.map((item, idx) => renderRow(item, idx))}
      </div>
    )
  }
  return (
    <div className="grid grid-cols-[repeat(auto-fill,minmax(240px,1fr))] gap-4">
      {items.map((item, idx) => renderCard(item, idx))}
    </div>
  )
}

// ── KindSectionHeader ──────────────────────────────────────────────────
// One per kind in the unified-results sectioned view. Soft tinted icon
// tile + label + count badge, sitting above a faint hairline so each
// section reads as its own scannable block. The count badge dims to a
// muted state when zero so the header still looks complete but reads
// as "nothing here" at a glance.
function KindSectionHeader({ kind, count }) {
  const label = KIND_SECTION_LABELS[kind] || kind
  const empty = !count
  return (
    <header className="flex items-center justify-between gap-3 border-b border-border/70 pb-2.5">
      <h2 className="inline-flex items-center gap-2.5 font-heading text-[15px] font-semibold tracking-tight text-foreground">
        <span
          className={cn(
            'grid size-7 place-items-center rounded-lg ring-1 transition-colors',
            empty
              ? 'bg-muted text-muted-foreground/70 ring-border'
              : 'bg-primary/10 text-primary ring-primary/15',
          )}
        >
          <KindIcon kind={kind} className="size-3.5" />
        </span>
        <span className={empty ? 'text-muted-foreground' : ''}>{label}</span>
        <span
          className={cn(
            'rounded-full border px-2 py-0.5 font-mono text-[11px] tabular-nums',
            empty
              ? 'border-border bg-muted text-muted-foreground/70'
              : 'border-border bg-background text-muted-foreground',
          )}
        >
          {count.toLocaleString()}
        </span>
      </h2>
    </header>
  )
}

// ── NoKindMatches ──────────────────────────────────────────────────────
// Placeholder card shown inside an empty section on the unified-results
// view. Carries the kind icon at the same visual weight as a normal
// card so the section still reads as intentional ("we looked, found
// none") instead of looking like the page is broken.
function NoKindMatches({ kind }) {
  const label = (KIND_SECTION_LABELS[kind] || kind).toLowerCase()
  return (
    <div className="rounded-xl border border-dashed border-border bg-muted/15 px-6 py-9 text-center">
      <span className="mx-auto mb-2 grid size-9 place-items-center rounded-full bg-muted text-muted-foreground/70">
        <KindIcon kind={kind} className="size-4" />
      </span>
      <p className="text-[13px] font-medium text-foreground">
        No {label} match this search
      </p>
      <p className="mt-1 text-[11.5px] leading-relaxed text-muted-foreground">
        Try widening your filters, or remove the type narrowing to see
        everything that matched.
      </p>
    </div>
  )
}

// ── Results header (count + ms pill, layout toggle, sort) ──────────────
function ResultsHead({
  count,
  label,
  ms,
  sorts,
  sortValue,
  onSortChange,
  layout,
  onLayoutChange,
}) {
  const [sortOpen, setSortOpen] = useState(false)
  const active = sorts.find((s) => `${s.key}:${s.dir}` === sortValue) || sorts[0]

  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-3 border-b border-border pb-4">
      <div className="flex flex-col gap-1">
        <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
          Showing
        </p>
        <div className="flex flex-wrap items-baseline gap-2">
          <span className="font-heading text-2xl font-semibold tabular-nums leading-none tracking-tight text-foreground">
            {Number.isFinite(count) ? count.toLocaleString() : '—'}
          </span>
          <span className="text-[13.5px] text-muted-foreground">{label}</span>
          {Number.isFinite(ms) ? (
            <span className="ml-1 rounded-full bg-muted px-2 py-0.5 font-mono text-[10px] tabular-nums text-muted-foreground">
              {ms}ms
            </span>
          ) : null}
        </div>
      </div>
      <div className="flex items-center gap-2">
        {/* Layout toggle */}
        <div className="inline-flex rounded-md border border-border bg-secondary p-0.5">
          <button
            type="button"
            onClick={() => onLayoutChange('grid')}
            className={cn(
              'inline-flex h-7 items-center gap-1.5 rounded px-2.5 text-[12px] font-medium transition-colors',
              layout === 'grid'
                ? 'bg-background text-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground',
            )}
          >
            <Grid3x3 className="size-3" />
            <span className="hidden sm:inline">Grid</span>
          </button>
          <button
            type="button"
            onClick={() => onLayoutChange('list')}
            className={cn(
              'inline-flex h-7 items-center gap-1.5 rounded px-2.5 text-[12px] font-medium transition-colors',
              layout === 'list'
                ? 'bg-background text-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground',
            )}
          >
            <ListIcon className="size-3" />
            <span className="hidden sm:inline">List</span>
          </button>
        </div>

        {/* Sort dropdown */}
        <div className="relative">
          <button
            type="button"
            onClick={() => setSortOpen((v) => !v)}
            aria-haspopup="menu"
            aria-expanded={sortOpen}
            onBlur={(e) => {
              if (!e.currentTarget.contains(e.relatedTarget)) {
                setTimeout(() => setSortOpen(false), 80)
              }
            }}
            className="inline-flex h-9 items-center gap-1.5 rounded-md border border-border bg-background px-3 text-[13px] hover:bg-accent"
          >
            <span className="text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
              Sort
            </span>
            {active.label}
            <ChevronDown className="size-3 text-muted-foreground" />
          </button>
          {sortOpen ? (
            <div className="absolute right-0 top-[calc(100%+4px)] z-30 min-w-[180px] overflow-hidden rounded-lg border border-border bg-popover shadow-xl shadow-black/10">
              <ul className="py-1">
                {sorts.map((s) => {
                  const v = `${s.key}:${s.dir}`
                  const isActive = v === sortValue
                  const Icon = s.icon
                  return (
                    <li key={v}>
                      <button
                        type="button"
                        onClick={() => {
                          onSortChange(v)
                          setSortOpen(false)
                        }}
                        className={cn(
                          'flex w-full items-center gap-2 px-3 py-1.5 text-left text-[13px]',
                          isActive
                            ? 'bg-accent font-medium text-foreground'
                            : 'text-muted-foreground hover:bg-accent hover:text-foreground',
                        )}
                      >
                        <Icon className="size-3.5" />
                        {s.label}
                      </button>
                    </li>
                  )
                })}
              </ul>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  )
}

export { PublicBrowsePage }
