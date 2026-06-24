import React, { useEffect, useMemo, useRef, useState } from 'react'
import { useSearchParams } from 'react-router-dom'

import { HighlightProvider } from '@/components/ui/highlight'
import { readMediaTypeCount, decodeSelectedFacets } from '@/components/public/public-helpers'
import { guestCategories, guestFacets, guestPersons, guestProjects } from '@/services/guest'
import KhiSidebar from '@/components/khi/KhiSidebar'
import KhiToolbar from '@/components/khi/KhiToolbar'
import KhiCard from '@/components/khi/KhiCard'
import { useYearBounds } from '@/components/khi/use-year-bounds'
import { useDataFacets } from '@/components/khi/use-data-facets'
import { IconClose } from '@/components/khi/icons'
import {
  NAV_TYPES, TYPE_MAP, DEFAULT_TYPE, PAGE_SIZE, MEDIA_KINDS, UI, cardFromItem, ENTITY_FILTER_KEYS,
  TYPE_PAGE_SIZES,
} from '@/components/khi/khi-data'

// Entity scopes reachable via ?type= (the media kinds are reached by selecting
// a single media-type checkbox, which drops into that per-entity scope).
const ENTITY_SCOPES = ['person', 'project', 'category']
const FEED_SECTION_KEYS = {
  image: ['image', 'images', 'photo', 'photos'],
  audio: ['audio', 'audios', 'sound', 'sounds'],
  video: ['video', 'videos'],
  text: ['text', 'texts'],
}

function pageContent(value) {
  if (Array.isArray(value)) return value
  if (Array.isArray(value?.content)) return value.content
  if (Array.isArray(value?.items)) return value.items
  if (Array.isArray(value?.results)) return value.results
  return []
}

function pageTotal(value, fallback = 0) {
  const n = Number(value?.totalElements ?? value?.totalItems ?? value?.total ?? value?.count)
  return Number.isFinite(n) ? n : fallback
}

function pageCount(value, total, size) {
  const n = Number(value?.totalPages ?? value?.pages)
  if (Number.isFinite(n)) return n
  return total > 0 ? Math.ceil(total / Math.max(1, size)) : 0
}

function isGroupedSection(value) {
  return Boolean(
    value &&
    typeof value === 'object' &&
    (Array.isArray(value.content) || Array.isArray(value.items) || Array.isArray(value.results)) &&
    (value.kind || value.type || value.mediaType || value.key || value.name),
  )
}

function findFeedSection(feed, kind) {
  const aliases = FEED_SECTION_KEYS[kind] || [kind]
  const containers = [feed, feed?.media, feed?.mediaByType, feed?.byType, feed?.sectionsByType]
  for (const container of containers) {
    if (!container || typeof container !== 'object' || Array.isArray(container)) continue
    for (const key of aliases) {
      if (container[key] != null) return container[key]
    }
  }

  const sectionLists = [feed?.sections, feed?.groups, feed?.mediaSections, feed?.content]
  for (const list of sectionLists) {
    if (!Array.isArray(list)) continue
    for (const section of list) {
      const key = String(section?.kind || section?.type || section?.mediaType || section?.key || section?.name || '').toLowerCase()
      if (aliases.includes(key)) return section
    }
  }
  return null
}

function normalizeFeedResponse(res, targetPage, size) {
  const content = pageContent(res)
  if (content.length > 0 && !content.every(isGroupedSection)) {
    const total = pageTotal(res, content.length)
    return {
      content,
      totalElements: total,
      totalPages: pageCount(res, total, size),
      number: Number(res?.number ?? targetPage),
      hasMore: typeof res?.last === 'boolean' ? !res.last : content.length < total,
    }
  }

  const sections = MEDIA_KINDS.map((kind) => [kind, findFeedSection(res, kind)])
  const items = sections.flatMap(([kind, section]) =>
    pageContent(section).map((item) => ({ ...item, kind: item.kind || kind })),
  )
  const sectionTotals = sections.map(([, section]) => pageTotal(section, pageContent(section).length))
  const sectionTotal = sectionTotals.reduce((sum, total) => sum + total, 0)
  const topTotal = pageTotal(res, 0)
  let totalElements = topTotal || sectionTotal || items.length
  const totalPages = Math.max(
    pageCount(res, totalElements, size),
    ...sections.map(([, section], index) => pageCount(section, sectionTotals[index], size)),
  )
  const hasMore = Boolean(
    res?.hasNext ||
    res?.next ||
    (typeof res?.last === 'boolean' && !res.last) ||
    sections.some(([, section]) => section?.hasNext || section?.next || section?.last === false),
  )

  if (hasMore && totalElements <= items.length) totalElements = items.length + 1

  return {
    content: items,
    totalElements,
    totalPages,
    number: Number(res?.number ?? res?.page ?? targetPage),
    hasMore: hasMore || items.length < totalElements,
  }
}

// Skeleton placeholder cards shown while a page of results loads.
function SkeletonGrid() {
  return (
    <div className="khi-grid">
      {Array.from({ length: 8 }).map((_, i) => (
        <div key={i} className="card skeleton">
          <div className="media" />
          <div className="body">
            <div className="sk-line" style={{ width: '40%' }} />
            <div className="sk-line" style={{ width: '85%', height: 18 }} />
            <div className="sk-line" style={{ width: '60%' }} />
          </div>
        </div>
      ))}
    </div>
  )
}

export function KhiBrowsePage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const resultsRef = useRef(null)
  // Filter rail visibility. Open by default on desktop; closed (drawer) on
  // phones/tablets so it never blocks the catalogue on first paint.
  const [sidebarOpen, setSidebarOpen] = useState(
    () => (typeof window !== 'undefined' ? window.matchMedia('(min-width:1025px)').matches : true),
  )

  const q = searchParams.get('q') || ''
  const view = searchParams.get('layout') === 'list' ? 'list' : 'grid'
  const dateFrom = searchParams.get('dateFrom') || ''
  const dateTo = searchParams.get('dateTo') || ''
  // Years are derived only for the compact active-filter chip; the URL keeps
  // backend-native ISO dates (yyyy-mm-dd) so links stay shareable + exact.
  const yearFrom = dateFrom ? Number(dateFrom.slice(0, 4)) || null : null
  const yearTo = dateTo ? Number(dateTo.slice(0, 4)) || null : null

  const selectedMediaTypes = useMemo(
    () => (searchParams.get('types') || '').split(',').filter((k) => MEDIA_KINDS.includes(k)),
    [searchParams],
  )
  // Scope resolution: an explicit ?type= entity (person/project/category) wins;
  // else selecting exactly ONE media type drops into that media's per-entity
  // scope — the only place the entity-specific filters work (the feed accepts
  // just the common block). 0 or 2+ media kinds → the unified feed ('all').
  const typeParam = searchParams.get('type')
  const isEntityScope = ENTITY_SCOPES.includes(typeParam) && Boolean(TYPE_MAP[typeParam])
  const typeKey = isEntityScope
    ? typeParam
    : (selectedMediaTypes.length === 1 ? selectedMediaTypes[0] : DEFAULT_TYPE)
  const type = TYPE_MAP[typeKey]
  const pageSize = TYPE_PAGE_SIZES[typeKey] || PAGE_SIZE

  // Shared (server) facets + the scope's entity-specific (data-driven) facets,
  // rendered through one FacetGroup list. Data groups key their options by the
  // filter param itself.
  const filterGroups = useMemo(
    () => [
      ...(type.facetMap || []),
      ...(type.dataFacets || []).map((d) => ({ ...d, facetKey: d.paramKey })),
    ],
    [type],
  )

  // Default sort: "relevance" only earns its place when there's a query —
  // otherwise lead with Newest (the catalogue's natural landing order).
  const defaultSort = (!q && type.sorts.some((s) => s.key === 'date'))
    ? (type.sorts.find((s) => s.key === 'date' && s.dir === 'desc') || type.sorts[0])
    : type.sorts[0]
  const sortBy = searchParams.get('sortBy') || defaultSort.key
  const sortDir = searchParams.get('sortDirection') || defaultSort.dir
  const sortIndex = Math.max(0, type.sorts.findIndex((s) => s.key === sortBy && s.dir === sortDir))

  const selected = useMemo(() => decodeSelectedFacets(searchParams, filterGroups), [searchParams, filterGroups])
  const textFilterValues = useMemo(() => {
    const out = {}
    for (const f of type.textFilters || []) out[f.paramKey] = searchParams.get(f.paramKey) || ''
    return out
  }, [searchParams, type.textFilters])

  const [facets, setFacets] = useState(null)
  const [entityCounts, setEntityCounts] = useState({})
  // Entity-specific checkbox options, tallied from the live archive for the
  // active media scope (empty for the feed / entity scopes). Merged on top of
  // the server facets so the FacetGroup list renders both from one object.
  const dataFacets = useDataFacets(type)
  const allFacets = useMemo(() => ({ ...(facets || {}), ...dataFacets }), [facets, dataFacets])
  // Oldest → newest YEAR span for the date filter bounds, derived from live data.
  const yearBounds = useYearBounds(type, facets)
  // Accumulating result list: a fresh query replaces it; "Show more" appends the
  // next API page. `meta` mirrors the Spring Page envelope (number/totalPages/
  // totalElements). `page` is the highest page index loaded so far.
  const [items, setItems] = useState([])
  const [meta, setMeta] = useState({ totalElements: 0, totalPages: 0, number: 0 })
  const [page, setPage] = useState(0)
  const [loading, setLoading] = useState(true)        // first/replacing load → skeleton
  const [loadingMore, setLoadingMore] = useState(false) // appending the next page
  const [error, setError] = useState('')
  const [reload, setReload] = useState(0) // bump to force a refetch (retry button)

  // Debounced "search within" drafts so typing doesn't refetch per keystroke.
  const [textDrafts, setTextDrafts] = useState(textFilterValues)
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { setTextDrafts(textFilterValues) }, [textFilterValues])

  // ── URL helpers ─────────────────────────────────────────────────────────────
  const update = (next, resetPage = true) => {
    const sp = new URLSearchParams(searchParams)
    for (const [k, v] of Object.entries(next)) {
      if (v == null || v === '') sp.delete(k)
      else sp.set(k, v)
    }
    if (resetPage && !('page' in next)) sp.delete('page')
    setSearchParams(sp)
  }

  const switchType = (key) => {
    const sp = new URLSearchParams()
    // 'all' is the default feed — leave it out of the URL for a clean link.
    if (key && key !== 'all') sp.set('type', key)
    if (q) sp.set('q', q)
    if (view === 'list') sp.set('layout', 'list')
    setSearchParams(sp)
  }

  // On phones the rail is a drawer — close it after a navigation so the user
  // lands back on the results. On desktop it stays put.
  const closeSidebarOnMobile = () => {
    if (typeof window !== 'undefined' && !window.matchMedia('(min-width:1025px)').matches) {
      setSidebarOpen(false)
    }
  }

  // ── Facets (once) ─────────────────────────────────────────────────────────
  useEffect(() => {
    const ctrl = new AbortController()
    guestFacets({ signal: ctrl.signal }).then((d) => setFacets(d || null)).catch(() => {})
    return () => ctrl.abort()
  }, [])

  useEffect(() => {
    const ctrl = new AbortController()
    const totalOf = (res) => Number(res?.totalElements ?? res?.total ?? res?.count ?? 0) || 0
    Promise.allSettled([
      guestPersons({ page: 0, size: 1, signal: ctrl.signal }),
      guestProjects({ page: 0, size: 1, signal: ctrl.signal }),
      guestCategories({ page: 0, size: 1, signal: ctrl.signal }),
    ]).then((results) => {
      if (ctrl.signal.aborted) return
      setEntityCounts({
        person: results[0].status === 'fulfilled' ? totalOf(results[0].value) : undefined,
        project: results[1].status === 'fulfilled' ? totalOf(results[1].value) : undefined,
        category: results[2].status === 'fulfilled' ? totalOf(results[2].value) : undefined,
      })
    })
    return () => ctrl.abort()
  }, [])

  // ── Results ─────────────────────────────────────────────────────────────────
  const selectedKey = JSON.stringify(selected)
  const textKey = JSON.stringify(textFilterValues)
  const mediaKey = selectedMediaTypes.join(',')
  // Identifies the query independent of paging. When it changes we start over at
  // page 0 and REPLACE the list; while it's stable, bumping `page` APPENDS.
  const queryKey = `${typeKey}|${q}|${sortBy}|${sortDir}|${dateFrom}|${dateTo}|${selectedKey}|${textKey}|${mediaKey}|${reload}`

  /* eslint-disable react-hooks/set-state-in-effect */
  // A new query resets paging to 0 (the fetch below then replaces the list).
  useEffect(() => { setPage(0) }, [queryKey])

  const queryKeyRef = useRef('')
  useEffect(() => {
    const ctrl = new AbortController()
    // On a query change the page state may still hold a stale value for one
    // render; force page 0 so we never append the wrong page to a fresh list.
    const fresh = queryKeyRef.current !== queryKey
    queryKeyRef.current = queryKey
    const targetPage = fresh ? 0 : page
    const append = targetPage > 0

    if (append) setLoadingMore(true)
    else setLoading(true)
    setError('')

    const params = { page: targetPage, size: pageSize, sortBy, sortDirection: sortDir, signal: ctrl.signal }
    if (q) params.q = q
    if (type.showDateRange && dateFrom) params.dateFrom = dateFrom
    if (type.showDateRange && dateTo) params.dateTo = dateTo
    for (const group of filterGroups) {
      const list = selected[group.paramKey]
      if (!Array.isArray(list) || !list.length) continue
      // Repeatable params send every selection; single params send one value.
      params[group.paramKey] = group.multi ? list : list[0]
    }
    if (type.showMediaTypes && selectedMediaTypes.length > 0) params.types = selectedMediaTypes

    type.api(params)
      .then((res) => {
        if (ctrl.signal.aborted) return
        const normalized = typeKey === 'all'
          ? normalizeFeedResponse(res, targetPage, pageSize)
          : {
            content: res?.content || (Array.isArray(res) ? res : []),
            totalElements: pageTotal(res, pageContent(res).length),
            totalPages: pageCount(res, pageTotal(res, pageContent(res).length), pageSize),
            number: Number(res?.number ?? targetPage),
            hasMore: typeof res?.last === 'boolean' ? !res.last : undefined,
          }
        const content = normalized.content
        setItems((prev) => (append ? [...prev, ...content] : content))
        setMeta({
          totalElements: normalized.totalElements,
          totalPages: normalized.totalPages,
          number: normalized.number,
          hasMore: normalized.hasMore,
        })
      })
      .catch((err) => { if (err?.code !== 'ERR_CANCELED') setError(UI.loadError) })
      .finally(() => { if (!ctrl.signal.aborted) { setLoading(false); setLoadingMore(false) } })
    return () => ctrl.abort()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [queryKey, page, pageSize])
  /* eslint-enable react-hooks/set-state-in-effect */

  // On a NEW query (not when appending), reset the internal scroll so the user
  // starts at the top; "Show more" keeps the scroll position so the list grows.
  useEffect(() => {
    if (resultsRef.current) resultsRef.current.scrollTop = 0
  }, [queryKey])

  const cards = useMemo(() => items.map((it) => cardFromItem(it, typeKey)), [items, typeKey])
  const totalElements = meta.totalElements
  const hasMore = typeof meta.hasMore === 'boolean' ? meta.hasMore : items.length < totalElements

  // Type-rail counts from global facets.
  const counts = useMemo(() => {
    const c = {}
    if (facets) {
      c.audio = readMediaTypeCount(facets, 'audio')
      c.video = readMediaTypeCount(facets, 'video')
      c.text = readMediaTypeCount(facets, 'text')
      c.image = readMediaTypeCount(facets, 'image')
    }
    // Only the ACTIVE entity scope gets a count, taken from its list total.
    // Facet sums under-count entities with no linked media (a person with 0
    // items isn't in the facet map), which is what made "persons" read 1/3.
    c.person = Number.isFinite(Number(entityCounts.person)) ? entityCounts.person : undefined
    c.project = Number.isFinite(Number(entityCounts.project)) ? entityCounts.project : undefined
    c.category = Number.isFinite(Number(entityCounts.category)) ? entityCounts.category : undefined
    if (['person', 'project', 'category'].includes(typeKey)) c[typeKey] = totalElements
    return c
  }, [entityCounts, facets, typeKey, totalElements])
  const mediaTypeCounts = { audio: counts.audio, video: counts.video, text: counts.text, image: counts.image }

  // ── Facet / filter handlers ─────────────────────────────────────────────────
  // Repeatable params (subject/genre/tag/keyword + entity list fields)
  // accumulate; single-value params (category/person/language/… + single
  // entity fields) replace, so the checkbox group behaves like the backend's
  // one-value contract.
  const onToggleFacet = (paramKey, val) => {
    const group = filterGroups.find((g) => g.paramKey === paramKey)
    const cur = new Set(selected[paramKey] || [])
    if (group && group.multi) {
      cur.has(val) ? cur.delete(val) : cur.add(val)
    } else if (cur.has(val) && cur.size === 1) {
      cur.clear()
    } else {
      cur.clear()
      cur.add(val)
    }
    const arr = [...cur]
    update({ [paramKey]: arr.length ? arr.join(',') : null })
  }
  const onToggleMediaType = (k) => {
    const cur = new Set(selectedMediaTypes)
    cur.has(k) ? cur.delete(k) : cur.add(k)
    const arr = [...cur]
    // Media selection governs the scope. Keep what's universal (q, date range,
    // layout, shared facets); drop the entity ?type=, paging, sort and any
    // scope-specific entity filters — they don't carry across media kinds.
    const sp = new URLSearchParams(searchParams)
    sp.delete('type')
    sp.delete('page')
    sp.delete('sortBy')
    sp.delete('sortDirection')
    for (const key of ENTITY_FILTER_KEYS) sp.delete(key)
    if (arr.length) sp.set('types', arr.join(','))
    else sp.delete('types')
    setSearchParams(sp)
  }
  // Clear every filter but stay in the current scope (entity ?type= or the
  // selected media kinds) and keep the query.
  const clearAll = () => {
    const sp = new URLSearchParams()
    if (q) sp.set('q', q)
    if (view === 'list') sp.set('layout', 'list')
    if (isEntityScope) sp.set('type', typeKey)
    else if (selectedMediaTypes.length) sp.set('types', selectedMediaTypes.join(','))
    setSearchParams(sp)
  }
  const onTextFilter = (paramKey, value) => {
    setTextDrafts((d) => ({ ...d, [paramKey]: value }))
  }
  // Calendar picker emits backend-native ISO dates (yyyy-mm-dd) directly, so the
  // filter is exact to the day; an empty edge clears that bound.
  const onDateChange = ({ from, to }) => {
    update({ dateFrom: from || null, dateTo: to || null })
  }
  // Commit text drafts to the URL after a pause.
  useEffect(() => {
    const id = setTimeout(() => {
      const patch = {}
      let changed = false
      for (const f of type.textFilters || []) {
        const draft = (textDrafts[f.paramKey] || '').trim()
        const live = (textFilterValues[f.paramKey] || '').trim()
        if (draft !== live) { patch[f.paramKey] = draft || null; changed = true }
      }
      if (changed) update(patch)
    }, 400)
    return () => clearTimeout(id)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [textDrafts, type.textFilters])

  // ── Active-filter chips ──────────────────────────────────────────────────────
  const chips = []
  if (q) chips.push({ key: 'q', label: `«${q}»`, onRemove: () => update({ q: null }) })
  for (const group of filterGroups) {
    for (const val of selected[group.paramKey] || []) {
      chips.push({ key: `${group.paramKey}:${val}`, label: `${group.title}: ${val}`, onRemove: () => onToggleFacet(group.paramKey, val) })
    }
  }
  for (const k of selectedMediaTypes) chips.push({ key: `mt:${k}`, label: ({ audio: 'دەنگ', video: 'ڤیدیۆ', text: 'دەق', image: 'وێنە' })[k], onRemove: () => onToggleMediaType(k) })
  if (type.showDateRange && (dateFrom || dateTo)) chips.push({ key: 'date', label: `${UI.dateRange}: ${yearFrom || '…'}–${yearTo || '…'}`, onRemove: () => update({ dateFrom: null, dateTo: null }) })

  const subtitle = loading ? type.sub : `${type.sub} · ${totalElements.toLocaleString()} ${UI.results}`

  return (
    <HighlightProvider query={q}>
      <div className={`layout${sidebarOpen ? '' : ' side-hidden'}`}>
        {/* Mobile-only dimmer behind the filter drawer. */}
        <div className="scrim" onClick={() => setSidebarOpen(false)} aria-hidden="true" />

        <KhiSidebar
          types={NAV_TYPES}
          activeType={typeKey}
          onType={(k) => { switchType(k === typeKey ? 'all' : k); closeSidebarOnMobile() }}
          onClose={() => setSidebarOpen(false)}
          counts={counts}
          facetGroups={filterGroups}
          facets={allFacets}
          selected={selected}
          onToggleFacet={onToggleFacet}
          showMediaTypes
          mediaKinds={MEDIA_KINDS}
          mediaTypeCounts={mediaTypeCounts}
          selectedMediaTypes={selectedMediaTypes}
          onToggleMediaType={onToggleMediaType}
          showDateRange={type.showDateRange}
          yearMin={yearBounds.min}
          yearMax={yearBounds.max}
          dateFrom={dateFrom}
          dateTo={dateTo}
          yearLoading={!yearBounds.ready}
          onDateChange={onDateChange}
          textFilters={type.textFilters || []}
          textFilterValues={textDrafts}
          onTextFilter={onTextFilter}
        />

        <main className="catalogue-main">
          <KhiToolbar
            title={type.label}
            subtitle={subtitle}
            view={view}
            onView={(v) => update({ layout: v === 'list' ? 'list' : null }, false)}
            showView={!!q}
            sorts={type.sorts}
            sortIndex={sortIndex}
            onSortChange={(i) => { const s = type.sorts[i]; update({ sortBy: s.key, sortDirection: s.dir }) }}
            sidebarOpen={sidebarOpen}
            onToggleSidebar={() => setSidebarOpen((o) => !o)}
            activeCount={chips.length}
          />

          {chips.length ? (
            <div className="active-chips">
              {chips.map((c) => (
                <span key={c.key} className="ac">
                  {c.label}
                  <button className="x" onClick={c.onRemove} aria-label="لابردن"><IconClose width="10" height="10" /></button>
                </span>
              ))}
              <button className="clear-all" onClick={clearAll}>{UI.clearAll}</button>
            </div>
          ) : null}

          {/* Only the card grid scrolls (desktop): the pager below stays pinned
              at the foot of the results column, always visible. */}
          <div className="results-scroll" ref={resultsRef}>
            {loading ? (
              <SkeletonGrid />
            ) : error ? (
              <div className="empty">
                {error}{' '}
                <button className="clear-all" onClick={() => setReload((n) => n + 1)}>{UI.retry}</button>
              </div>
            ) : cards.length ? (
              <>
                <div className={`khi-grid${view === 'list' ? ' list' : ''}`}>
                  {cards.map((c, i) => (
                    <KhiCard key={`${c.kind}:${c.code}:${i}`} record={c} index={i} query={q} />
                  ))}
                </div>

                {hasMore ? (
                  <div className="show-more-wrap">
                    <button
                      type="button"
                      className="show-more-btn"
                      onClick={() => setPage((p) => p + 1)}
                      disabled={loadingMore}
                    >
                      {loadingMore ? UI.loadingMore : UI.showMore}
                      <span className="sm-count">
                        {items.length.toLocaleString()} / {totalElements.toLocaleString()}
                      </span>
                    </button>
                  </div>
                ) : totalElements > pageSize ? (
                  <p className="show-more-done">{`${totalElements.toLocaleString()} ${UI.results}`}</p>
                ) : null}
              </>
            ) : (
              <p className="empty">{UI.empty}</p>
            )}
          </div>
        </main>
      </div>
    </HighlightProvider>
  )
}

export default KhiBrowsePage
