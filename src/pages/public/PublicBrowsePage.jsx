import { useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import {
  ArrowDownAZ,
  ArrowUpAZ,
  AudioLines,
  Calendar,
  FileText,
  FolderOpen,
  Image as ImageIcon,
  SlidersHorizontal,
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
  ListEmpty,
  PageContainer,
  PageHeader,
  ResultCard,
} from '@/components/public/PublicShared'
import { decodeSelectedFacets } from '@/components/public/public-helpers'
import { cn } from '@/lib/utils'
import {
  guestAudios,
  guestCategories,
  guestImages,
  guestPersons,
  guestProjects,
  guestTexts,
  guestVideos,
} from '@/services/guest'

const PAGE_SIZE = 24

const POPULAR_QUERIES = ['Hesen Zirek', 'maqam', 'Sulaymaniyah', 'oral history', 'folk']

function pickYear(value) {
  if (!value) return null
  const m = String(value).match(/(\d{4})/)
  return m ? m[1] : null
}

const SHARED_MEDIA_FACETS = [
  { paramKey: 'categoryCode', facetKey: 'categories', title: 'Categories' },
  { paramKey: 'personCode', facetKey: 'persons', title: 'Persons' },
  { paramKey: 'language', facetKey: 'languages', title: 'Languages' },
  { paramKey: 'dialect', facetKey: 'dialects', title: 'Dialects' },
  { paramKey: 'genre', facetKey: 'genres', title: 'Genres' },
  { paramKey: 'tag', facetKey: 'tags', title: 'Tags' },
  { paramKey: 'keyword', facetKey: 'keywords', title: 'Keywords' },
]

function makeMediaTypeAdapter({ label, kind, api, resource, facetMap, extraCard }) {
  return {
    key: kind,
    label,
    icon: { audio: AudioLines, video: VideoIcon, text: FileText, image: ImageIcon }[kind],
    api,
    resource,
    kind,
    showDateRange: true,
    sorts: [
      { key: 'createdAt', dir: 'desc', label: 'Newest', icon: Calendar },
      { key: 'createdAt', dir: 'asc', label: 'Oldest', icon: Calendar },
      { key: 'titleEnglish', dir: 'asc', label: 'A→Z', icon: ArrowDownAZ },
      { key: 'titleEnglish', dir: 'desc', label: 'Z→A', icon: ArrowUpAZ },
    ],
    facetMap: facetMap ?? SHARED_MEDIA_FACETS,
    card: (item) => {
      const code = item[`${kind}Code`]
      const title = item.titleEnglish || item.titleOriginal || code
      return {
        code,
        title,
        description: item.description,
        meta: extraCard.meta(item),
        year: pickYear(extraCard.dateField(item) || item.createdAt),
        image: extraCard.image?.(item) || null,
        count: extraCard.count?.(item),
        parent: {
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
          person: item.person || null,
          personImage: item.personImage || null,
        },
      }
    },
  }
}

const TYPES = {
  audio: makeMediaTypeAdapter({
    label: 'Audios',
    kind: 'audio',
    api: guestAudios,
    resource: 'audios',
    extraCard: {
      meta: (a) => [a.language, a.dialect, a.form].filter(Boolean),
      dateField: (a) => a.recordedAt || a.recordingDate,
    },
  }),
  video: makeMediaTypeAdapter({
    label: 'Videos',
    kind: 'video',
    api: guestVideos,
    resource: 'videos',
    extraCard: {
      meta: (v) => [v.language, v.event, v.location].filter(Boolean),
      dateField: (v) => v.recordedAt || v.recordingDate,
    },
  }),
  text: makeMediaTypeAdapter({
    label: 'Texts',
    kind: 'text',
    api: guestTexts,
    resource: 'texts',
    extraCard: {
      meta: (t) => [t.language, t.documentType, t.author].filter(Boolean),
      dateField: (t) => t.documentDate || t.recordedAt,
      count: (t) => (Number.isFinite(t.pageCount) ? t.pageCount : null),
    },
  }),
  image: makeMediaTypeAdapter({
    label: 'Images',
    kind: 'image',
    api: guestImages,
    resource: 'images',
    facetMap: SHARED_MEDIA_FACETS.filter(
      (f) => !['language', 'dialect'].includes(f.paramKey),
    ),
    extraCard: {
      meta: (i) => [i.form, i.event, i.location].filter(Boolean),
      dateField: (i) => i.imageDate || i.recordedAt,
      image: (i) => i.imageFileUrl,
    },
  }),
  project: {
    key: 'project',
    label: 'Projects',
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
      { paramKey: 'categoryCode', facetKey: 'categories', title: 'Categories' },
      { paramKey: 'personCode', facetKey: 'persons', title: 'Persons' },
      { paramKey: 'tag', facetKey: 'tags', title: 'Tags' },
      { paramKey: 'keyword', facetKey: 'keywords', title: 'Keywords' },
    ],
    card: (p) => ({
      code: p.projectCode,
      title: p.projectName,
      description: p.description,
      audioCount: p.audioCount,
      videoCount: p.videoCount,
      textCount: p.textCount,
      imageCount: p.imageCount,
      year: pickYear(p.createdAt),
      count:
        (Number(p.audioCount) || 0) +
        (Number(p.videoCount) || 0) +
        (Number(p.textCount) || 0) +
        (Number(p.imageCount) || 0),
      parent: p.personName
        ? {
            personName: p.personName,
            personCode: p.personCode,
            person: p.person || null,
            personImage: p.personImage || null,
          }
        : null,
    }),
  },
  person: {
    key: 'person',
    label: 'Persons',
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
    facetMap: [{ paramKey: 'region', facetKey: 'regions', title: 'Regions' }],
    card: (p) => ({
      code: p.personCode,
      title: p.fullName || p.name || p.personCode,
      description: p.bio || p.description,
      meta: [p.personType, p.region, p.gender].filter(Boolean),
      // Pass the whole row through; MediaCover resolves whichever field
      // name carries the photo (profileImageUrl, profileImage, etc.).
      person: p,
    }),
  },
  category: {
    key: 'category',
    label: 'Categories',
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
      title: c.name || c.categoryCode,
      description: c.description,
      count: c.projectCount,
    }),
  },
}

const TYPE_ORDER = ['audio', 'video', 'text', 'image', 'project', 'person', 'category']
const TYPE_LIST = TYPE_ORDER.map((k) => TYPES[k])

const DEFAULT_TYPE = 'audio'

function PublicBrowsePage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const typeKey = TYPES[searchParams.get('type')] ? searchParams.get('type') : DEFAULT_TYPE
  const type = TYPES[typeKey]

  const q = searchParams.get('q') || ''
  const sortKey = searchParams.get('sortBy') || type.sorts[0].key
  const sortDir = searchParams.get('sortDirection') || type.sorts[0].dir
  const page = Number(searchParams.get('page') || 0) || 0
  const dateFrom = searchParams.get('dateFrom') || ''
  const dateTo = searchParams.get('dateTo') || ''
  const selected = useMemo(
    () => decodeSelectedFacets(searchParams, type.facetMap),
    [searchParams, type.facetMap],
  )

  const [draft, setDraft] = useState(q)
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [filtersOpen, setFiltersOpen] = useState(false)

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setDraft(q)
  }, [q])

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
    for (const group of type.facetMap) {
      const list = selected[group.paramKey]
      if (Array.isArray(list) && list.length > 0) {
        params[group.paramKey] = list[0]
      }
    }
    type.api
      .list(params)
      .then((res) => setData(res || null))
      .catch((err) => {
        if (err?.code === 'ERR_CANCELED') return
        setError(`Could not load ${type.label.toLowerCase()}.`)
      })
      .finally(() => setLoading(false))
    return () => ctrl.abort()
  }, [type, q, sortKey, sortDir, page, selected, dateFrom, dateTo])

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
    setSearchParams(sp)
    setFiltersOpen(false)
  }

  const submitSearch = (rawValue) => {
    const value = typeof rawValue === 'string' ? rawValue.trim() : draft.trim()
    update({ q: value || null, page: 0 })
  }

  const clearAllFilters = () => {
    const sp = new URLSearchParams()
    sp.set('type', typeKey)
    sp.set('sortBy', type.sorts[0].key)
    sp.set('sortDirection', type.sorts[0].dir)
    setSearchParams(sp)
    setDraft('')
  }

  const items = data?.content || []
  const totalElements = Number(data?.totalElements ?? items.length)
  const loaded = items.length + page * PAGE_SIZE
  const activeFilterCount =
    (q ? 1 : 0) +
    (dateFrom || dateTo ? 1 : 0) +
    Object.values(selected).reduce(
      (acc, list) => acc + (Array.isArray(list) ? list.length : 0),
      0,
    )

  return (
    <PageContainer className="max-w-[1480px]">
      <PageHeader
        eyebrow="Browse"
        title={`Browse the archive · ${type.label}`}
        description="Use the sidebar to search, switch type and apply filters. Everything updates in place — no page reloads, no tabs."
        breadcrumbs={[{ to: '/public', label: 'Home' }, { label: 'Browse' }]}
      />

      <div className="grid gap-5 lg:grid-cols-[340px_minmax(0,1fr)] xl:grid-cols-[360px_minmax(0,1fr)]">
        {/* ── Sidebar (LEFT command center) ────────────────────── */}
        <div
          className={cn(
            'lg:block lg:sticky lg:top-32 lg:self-start',
            filtersOpen ? 'block' : 'hidden',
          )}
        >
          <BrowseSidebar
            searchValue={draft}
            onSearchChange={setDraft}
            onSearchSubmit={submitSearch}
            popularSearches={POPULAR_QUERIES}
            types={TYPE_LIST}
            activeType={typeKey}
            onTypeChange={switchType}
            facetMap={type.facetMap}
            selected={selected}
            onChange={(next) => update({ ...next, page: 0 })}
            onReset={clearAllFilters}
            showDateRange={type.showDateRange}
            dateFrom={dateFrom}
            dateTo={dateTo}
            onDateChange={(next) => update({ ...next, page: 0 })}
          />
        </div>

        {/* ── Results column ────────────────────────────────────── */}
        <div className="min-w-0">
          <ResultsBar
            totalElements={totalElements}
            loaded={Math.min(loaded, totalElements)}
            sortValue={`${sortKey}:${sortDir}`}
            sorts={type.sorts}
            onSortChange={(value) => {
              const [k, d] = value.split(':')
              update({ sortBy: k, sortDirection: d, page: 0 })
            }}
            onToggleFilters={() => setFiltersOpen((v) => !v)}
            filtersOpen={filtersOpen}
            filterCount={activeFilterCount}
            kindLabel={type.label}
          />

          {loading ? (
            <CardGridSkeleton count={10} />
          ) : error ? (
            <ErrorState error={error} onRetry={() => update({})} />
          ) : items.length === 0 ? (
            <ListEmpty
              title={`No ${type.label.toLowerCase()} match`}
              description={
                activeFilterCount > 0
                  ? 'Try widening your filters, or switch type from the sidebar — your search will follow.'
                  : 'Nothing here yet.'
              }
            />
          ) : (
            <>
              <HighlightProvider query={q}>
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-5">
                  {items.map((item) => {
                    const c = type.card(item)
                    return (
                      <ResultCard
                        key={c.code}
                        kind={type.kind}
                        to={`/public/${type.resource}/${c.code}`}
                        title={c.title}
                        subtitle={c.code}
                        description={c.description}
                        meta={c.meta}
                        image={c.image}
                        count={c.count}
                        year={c.year}
                        parent={
                          c.parent ||
                          (c.person
                            ? {
                                person: c.person,
                                personName: c.person.fullName || c.person.name,
                                personCode: c.person.personCode,
                              }
                            : null)
                        }
                        audioCount={c.audioCount}
                        videoCount={c.videoCount}
                        textCount={c.textCount}
                        imageCount={c.imageCount}
                      />
                    )
                  })}
                </div>
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
        </div>
      </div>
    </PageContainer>
  )
}

// ── ResultsBar ─────────────────────────────────────────────────────────
function ResultsBar({
  totalElements,
  loaded,
  sortValue,
  sorts,
  onSortChange,
  onToggleFilters,
  filtersOpen,
  filterCount,
  kindLabel,
}) {
  return (
    <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-3">
      <button
        type="button"
        onClick={onToggleFilters}
        className="relative flex h-9 items-center gap-1.5 rounded-full border border-border bg-card px-3 text-xs font-medium shadow-sm hover:bg-muted lg:hidden"
      >
        {filtersOpen ? <X className="size-3.5" /> : <SlidersHorizontal className="size-3.5" />}
        Filters
        {filterCount > 0 ? (
          <span className="ml-0.5 inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[10px] font-bold text-primary-foreground">
            {filterCount}
          </span>
        ) : null}
      </button>

      <div className="flex flex-1 items-baseline gap-2 rounded-full bg-gradient-to-r from-primary/15 via-primary/10 to-transparent px-4 py-2 font-mono tabular-nums text-foreground">
        <span className="text-base font-bold">
          {Number.isFinite(loaded) ? loaded.toLocaleString() : '—'}
        </span>
        <span className="text-xs text-muted-foreground">/</span>
        <span className="text-sm">
          {Number.isFinite(totalElements) ? totalElements.toLocaleString() : '—'}
        </span>
        <span className="ml-1 truncate text-[11px] font-sans uppercase tracking-[0.16em] text-muted-foreground">
          {kindLabel}
        </span>
      </div>

      <SortMenu value={sortValue} sorts={sorts} onChange={onSortChange} />
    </div>
  )
}

function SortMenu({ value, sorts, onChange }) {
  return (
    <div className="flex items-center gap-0.5 rounded-full border border-border bg-card p-0.5 shadow-sm">
      {sorts.map((s) => {
        const Icon = s.icon
        const v = `${s.key}:${s.dir}`
        const active = value === v
        return (
          <button
            key={v}
            type="button"
            onClick={() => onChange(v)}
            title={s.label}
            className={cn(
              'flex items-center gap-1 rounded-full px-2.5 py-1.5 text-xs font-medium transition-colors',
              active
                ? 'bg-primary text-primary-foreground shadow-sm'
                : 'text-muted-foreground hover:bg-muted hover:text-foreground',
            )}
          >
            <Icon className="size-3" />
            <span className="hidden sm:inline">{s.label}</span>
          </button>
        )
      })}
    </div>
  )
}

export { PublicBrowsePage }
