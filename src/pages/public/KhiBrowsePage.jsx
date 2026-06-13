import React, { useEffect, useMemo, useRef, useState } from 'react'
import { useSearchParams } from 'react-router-dom'

import { HighlightProvider } from '@/components/ui/highlight'
import { readMediaTypeCount, totalFacetCount, decodeSelectedFacets } from '@/components/public/public-helpers'
import { guestFacets, guestResults } from '@/services/guest'
import KhiSidebar from '@/components/khi/KhiSidebar'
import KhiToolbar from '@/components/khi/KhiToolbar'
import KhiCard from '@/components/khi/KhiCard'
import { IconClose } from '@/components/khi/icons'
import {
  TYPES, TYPE_MAP, DEFAULT_TYPE, PAGE_SIZE, MEDIA_KINDS, UI, cardFromItem,
} from '@/components/khi/khi-data'

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

function Pager({ page, totalPages, totalElements, pageSize, onPage }) {
  if (!totalPages || totalPages <= 1) return null
  const slots = []
  const add = (n) => { if (n >= 0 && n < totalPages && !slots.includes(n)) slots.push(n) }
  add(0); add(1); add(page - 1); add(page); add(page + 1); add(totalPages - 2); add(totalPages - 1)
  slots.sort((a, b) => a - b)
  const isFirst = page <= 0
  const isLast = page >= totalPages - 1
  const total = Number(totalElements) || 0
  const start = total ? page * pageSize + 1 : 0
  const end = total ? Math.min(total, (page + 1) * pageSize) : 0
  return (
    <div className="pager">
      {total ? (
        <span className="info">
          <b>{start.toLocaleString()}</b>–<b>{end.toLocaleString()}</b> {UI.of} <b>{total.toLocaleString()}</b>
        </span>
      ) : null}
      <button aria-label="first" disabled={isFirst} onClick={() => onPage(0)}>«</button>
      <button aria-label="previous" disabled={isFirst} onClick={() => onPage(page - 1)}>‹</button>
      {slots.map((n, i) => (
        <React.Fragment key={n}>
          {i > 0 && n - slots[i - 1] > 1 ? <span className="info">…</span> : null}
          <button className={n === page ? 'active' : ''} onClick={() => onPage(n)}>{(n + 1).toLocaleString()}</button>
        </React.Fragment>
      ))}
      <button aria-label="next" disabled={isLast} onClick={() => onPage(page + 1)}>›</button>
      <button aria-label="last" disabled={isLast} onClick={() => onPage(totalPages - 1)}>»</button>
    </div>
  )
}

function readListParam(searchParams, key) {
  return searchParams
    .getAll(key)
    .flatMap((value) => String(value || '').split(','))
    .map((value) => value.trim())
    .filter(Boolean)
}

function extractResultYear(row) {
  if (!row) return null
  const kind = row.kind
  const inner = kind && row[kind] && typeof row[kind] === 'object' ? row[kind] : row
  const values = [
    row.dateCreated,
    row.date,
    row.recordedAt,
    row.recordingDate,
    row.documentDate,
    row.imageDate,
    inner.recordedAt,
    inner.recordingDate,
    inner.documentDate,
    inner.imageDate,
    inner.dateCreated,
    inner.datePublished,
    inner.printDate,
  ]
  for (const value of values) {
    const match = String(value || '').match(/(\d{4})/)
    if (match) return Number(match[1])
  }
  return null
}

function firstContent(res) {
  const list = res?.content || (Array.isArray(res) ? res : [])
  return Array.isArray(list) ? list[0] : null
}

function decadeChip(dateFrom, dateTo) {
  const from = String(dateFrom || '').match(/(\d{4})/)
  const to = String(dateTo || '').match(/(\d{4})/)
  const fromLabel = from ? `${Math.floor(Number(from[1]) / 10) * 10}s` : '…'
  const toLabel = to ? `${Math.floor(Number(to[1]) / 10) * 10}s` : '…'
  return `${fromLabel} → ${toLabel}`
}

export function KhiBrowsePage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const resultsRef = useRef(null)
  // Filter rail visibility. Open by default on desktop; closed (drawer) on
  // phones/tablets so it never blocks the catalogue on first paint.
  const [sidebarOpen, setSidebarOpen] = useState(
    () => (typeof window !== 'undefined' ? window.matchMedia('(min-width:1025px)').matches : true),
  )

  const typeKey = TYPE_MAP[searchParams.get('type')] ? searchParams.get('type') : DEFAULT_TYPE
  const type = TYPE_MAP[typeKey]
  const q = searchParams.get('q') || ''
  const view = searchParams.get('layout') === 'list' ? 'list' : 'grid'
  const page = Math.max(0, Number(searchParams.get('page')) || 0)
  const dateFrom = searchParams.get('dateFrom') || ''
  const dateTo = searchParams.get('dateTo') || ''

  const sortBy = searchParams.get('sortBy') || type.sorts[0].key
  const sortDir = searchParams.get('sortDirection') || type.sorts[0].dir
  const sortIndex = Math.max(0, type.sorts.findIndex((s) => s.key === sortBy && s.dir === sortDir))

  const selected = useMemo(() => decodeSelectedFacets(searchParams, type.facetMap), [searchParams, type.facetMap])
  const selectedTags = useMemo(() => readListParam(searchParams, 'tag'), [searchParams])
  const selectedMediaTypes = useMemo(
    () => readListParam(searchParams, 'types').filter((k) => MEDIA_KINDS.includes(k)),
    [searchParams],
  )
  const textFilterValues = useMemo(() => {
    const out = {}
    for (const f of type.textFilters || []) out[f.paramKey] = searchParams.get(f.paramKey) || ''
    return out
  }, [searchParams, type.textFilters])

  const [facets, setFacets] = useState(null)
  const [dateBounds, setDateBounds] = useState({ minYear: null, maxYear: null })
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
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
    sp.set('type', key)
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

  // Date bounds come from public media itself, so if an older record is added
  // later, the range expands the next time this public page loads.
  useEffect(() => {
    const ctrl = new AbortController()
    Promise.all([
      guestResults({ page: 0, size: 1, sortBy: 'date', sortDirection: 'asc', signal: ctrl.signal }),
      guestResults({ page: 0, size: 1, sortBy: 'date', sortDirection: 'desc', signal: ctrl.signal }),
    ])
      .then(([oldest, newest]) => {
        if (ctrl.signal.aborted) return
        setDateBounds({
          minYear: extractResultYear(firstContent(oldest)),
          maxYear: extractResultYear(firstContent(newest)),
        })
      })
      .catch(() => {})
    return () => ctrl.abort()
  }, [])

  // ── Results ─────────────────────────────────────────────────────────────────
  const selectedKey = JSON.stringify(selected)
  const textKey = JSON.stringify(textFilterValues)
  const tagKey = selectedTags.join(',')
  const mediaKey = selectedMediaTypes.join(',')
  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    const ctrl = new AbortController()
    setLoading(true)
    setError('')
    const params = { page, size: PAGE_SIZE, sortBy, sortDirection: sortDir, signal: ctrl.signal }
    if (q) params.q = q
    if (type.showDateRange && dateFrom) params.dateFrom = dateFrom
    if (type.showDateRange && dateTo) params.dateTo = dateTo
    for (const group of type.facetMap) {
      const list = selected[group.paramKey]
      if (Array.isArray(list) && list.length > 0) params[group.paramKey] = list[0]
    }
    for (const f of type.textFilters || []) {
      const v = (textFilterValues[f.paramKey] || '').trim()
      if (v) params[f.paramKey] = v
    }
    if (selectedTags.length > 0 && ['all', 'audio', 'video', 'image', 'text', 'project'].includes(typeKey)) {
      params.tag = selectedTags
    }
    if (type.showMediaTypes && selectedMediaTypes.length > 0) params.types = selectedMediaTypes

    type.api(params)
      .then((res) => { if (!ctrl.signal.aborted) setData(res || null) })
      .catch((err) => { if (err?.code !== 'ERR_CANCELED') setError(UI.loadError) })
      .finally(() => { if (!ctrl.signal.aborted) setLoading(false) })
    return () => ctrl.abort()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [typeKey, q, sortBy, sortDir, page, dateFrom, dateTo, selectedKey, textKey, tagKey, mediaKey, reload])
  /* eslint-enable react-hooks/set-state-in-effect */

  // When the result set changes (new page, type, search, sort, filters), reset
  // the internal scroll so the user always starts at the top of the new results.
  useEffect(() => {
    if (resultsRef.current) resultsRef.current.scrollTop = 0
  }, [page, typeKey, q, sortBy, sortDir, dateFrom, dateTo, selectedKey, textKey, tagKey, mediaKey])

  const items = useMemo(() => data?.content || (Array.isArray(data) ? data : []), [data])
  const cards = useMemo(() => items.map((it) => cardFromItem(it, typeKey)), [items, typeKey])
  const totalElements = Number(data?.totalElements ?? items.length)
  const totalPages = Number(data?.totalPages ?? (totalElements ? Math.ceil(totalElements / PAGE_SIZE) : 0))

  // Type-rail counts from global facets.
  const counts = useMemo(() => {
    if (!facets) return {}
    const a = readMediaTypeCount(facets, 'audio') || 0
    const v = readMediaTypeCount(facets, 'video') || 0
    const t = readMediaTypeCount(facets, 'text') || 0
    const i = readMediaTypeCount(facets, 'image') || 0
    return {
      all: a + v + t + i, audio: a, video: v, text: t, image: i,
      person: totalFacetCount(facets, 'persons') || undefined,
      category: totalFacetCount(facets, 'categories') || undefined,
    }
  }, [facets])
  const mediaTypeCounts = { audio: counts.audio, video: counts.video, text: counts.text, image: counts.image }

  // ── Facet / filter handlers ─────────────────────────────────────────────────
  const onToggleFacet = (paramKey, val) => {
    const cur = new Set(selected[paramKey] || [])
    cur.has(val) ? cur.delete(val) : cur.add(val)
    const arr = [...cur]
    update({ [paramKey]: arr.length ? arr.join(',') : null })
  }
  const onToggleMediaType = (k) => {
    const cur = new Set(selectedMediaTypes)
    cur.has(k) ? cur.delete(k) : cur.add(k)
    const arr = [...cur]
    update({ types: arr.length ? arr.join(',') : null })
  }
  const onToggleTag = (tag) => {
    const cur = new Set(selectedTags)
    cur.has(tag) ? cur.delete(tag) : cur.add(tag)
    const arr = [...cur]
    update({ tag: arr.length ? arr.join(',') : null })
  }
  const onTextFilter = (paramKey, value) => {
    setTextDrafts((d) => ({ ...d, [paramKey]: value }))
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
  for (const group of type.facetMap) {
    for (const val of selected[group.paramKey] || []) {
      chips.push({ key: `${group.paramKey}:${val}`, label: `${group.title}: ${val}`, onRemove: () => onToggleFacet(group.paramKey, val) })
    }
  }
  for (const k of selectedMediaTypes) chips.push({ key: `mt:${k}`, label: ({ audio: 'دەنگ', video: 'ڤیدیۆ', text: 'دەق', image: 'وێنە' })[k], onRemove: () => onToggleMediaType(k) })
  for (const tag of selectedTags) chips.push({ key: `tag:${tag}`, label: `تاگ: ${tag}`, onRemove: () => onToggleTag(tag) })
  if (type.showDateRange && (dateFrom || dateTo)) chips.push({ key: 'date', label: `${UI.dateCreated}: ${decadeChip(dateFrom, dateTo)}`, onRemove: () => update({ dateFrom: null, dateTo: null }) })

  const subtitle = loading ? type.sub : `${type.sub} · ${totalElements.toLocaleString()} ${UI.results}`

  return (
    <HighlightProvider query={q}>
      <div className={`layout${sidebarOpen ? '' : ' side-hidden'}`}>
        {/* Mobile-only dimmer behind the filter drawer. */}
        <div className="scrim" onClick={() => setSidebarOpen(false)} aria-hidden="true" />

        <KhiSidebar
          types={TYPES}
          activeType={typeKey}
          onType={(k) => { switchType(k); closeSidebarOnMobile() }}
          onClose={() => setSidebarOpen(false)}
          counts={counts}
          type={type}
          facets={facets}
          selected={selected}
          onToggleFacet={onToggleFacet}
          showMediaTypes={type.showMediaTypes}
          mediaKinds={MEDIA_KINDS}
          mediaTypeCounts={mediaTypeCounts}
          selectedMediaTypes={selectedMediaTypes}
          onToggleMediaType={onToggleMediaType}
          showDateRange={type.showDateRange}
          dateFrom={dateFrom}
          dateTo={dateTo}
          dateBounds={dateBounds}
          onDateChange={({ dateFrom: f, dateTo: t }) => update({ dateFrom: f || null, dateTo: t || null })}
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
              <button className="clear-all" onClick={() => switchType(typeKey)}>{UI.clearAll}</button>
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
              <div className={`khi-grid${view === 'list' ? ' list' : ''}`}>
                {cards.map((c, i) => (
                  <KhiCard
                    key={`${c.kind}:${c.code}`}
                    record={c}
                    index={i}
                    query={q}
                    view={view}
                    lead={i === 0 && page === 0 && !q && view === 'grid'}
                  />
                ))}
              </div>
            ) : (
              <p className="empty">{UI.empty}</p>
            )}
          </div>

          {!loading && !error && cards.length ? (
            <Pager
              page={data?.number ?? page}
              totalPages={totalPages}
              totalElements={totalElements}
              pageSize={PAGE_SIZE}
              onPage={(n) => update({ page: String(n) }, false)}
            />
          ) : null}
        </main>
      </div>
    </HighlightProvider>
  )
}

export default KhiBrowsePage
