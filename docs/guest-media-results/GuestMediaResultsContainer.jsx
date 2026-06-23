import React, { useRef } from 'react'

import KhiCard from '@/components/khi/KhiCard'
import KhiToolbar from '@/components/khi/KhiToolbar'
import { IconClose } from '@/components/khi/icons'
import { UI } from '@/components/khi/khi-data'

function SkeletonGrid() {
  return (
    <div className="khi-grid">
      {Array.from({ length: 8 }).map((_, index) => (
        <div key={index} className="card skeleton">
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

function Pager({
  page,
  totalPages,
  totalElements,
  pageSize,
  onPage,
}) {
  if (!totalPages || totalPages <= 1) return null

  const slots = []
  const add = (number) => {
    if (number >= 0 && number < totalPages && !slots.includes(number)) {
      slots.push(number)
    }
  }

  add(0)
  add(1)
  add(page - 1)
  add(page)
  add(page + 1)
  add(totalPages - 2)
  add(totalPages - 1)
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
          <b>{start.toLocaleString()}</b>–<b>{end.toLocaleString()}</b>{' '}
          {UI.of} <b>{total.toLocaleString()}</b>
        </span>
      ) : null}

      <button aria-label="first" disabled={isFirst} onClick={() => onPage(0)}>«</button>
      <button aria-label="previous" disabled={isFirst} onClick={() => onPage(page - 1)}>‹</button>

      {slots.map((number, index) => (
        <React.Fragment key={number}>
          {index > 0 && number - slots[index - 1] > 1 ? (
            <span className="info">…</span>
          ) : null}
          <button
            className={number === page ? 'active' : ''}
            onClick={() => onPage(number)}
          >
            {(number + 1).toLocaleString()}
          </button>
        </React.Fragment>
      ))}

      <button aria-label="next" disabled={isLast} onClick={() => onPage(page + 1)}>›</button>
      <button aria-label="last" disabled={isLast} onClick={() => onPage(totalPages - 1)}>»</button>
    </div>
  )
}

/**
 * Extracted guest/public catalogue result container.
 *
 * `cards` should already be normalized with cardFromItem() from khi-data.js.
 * Each chip is: { key, label, onRemove }.
 */
export default function GuestMediaResultsContainer({
  title,
  subtitle,
  cards = [],
  chips = [],
  query = '',
  view = 'grid',
  loading = false,
  error = '',
  page = 0,
  totalPages = 0,
  totalElements = 0,
  pageSize = 24,
  sorts = [],
  sortIndex = 0,
  sidebarOpen = true,
  showView = true,
  onView = () => {},
  onSortChange = () => {},
  onToggleSidebar = null,
  onClearAll = () => {},
  onRetry = () => {},
  onPage = () => {},
}) {
  const resultsRef = useRef(null)

  return (
    <main className="catalogue-main">
      <KhiToolbar
        title={title}
        subtitle={subtitle}
        view={view}
        onView={onView}
        showView={showView}
        sorts={sorts}
        sortIndex={sortIndex}
        onSortChange={onSortChange}
        sidebarOpen={sidebarOpen}
        onToggleSidebar={onToggleSidebar}
        activeCount={chips.length}
      />

      {chips.length ? (
        <div className="active-chips">
          {chips.map((chip) => (
            <span key={chip.key} className="ac">
              {chip.label}
              <button
                className="x"
                onClick={chip.onRemove}
                aria-label="لابردن"
              >
                <IconClose width="10" height="10" />
              </button>
            </span>
          ))}
          <button className="clear-all" onClick={onClearAll}>
            {UI.clearAll}
          </button>
        </div>
      ) : null}

      <div className="results-scroll" ref={resultsRef}>
        {loading ? (
          <SkeletonGrid />
        ) : error ? (
          <div className="empty">
            {error}{' '}
            <button className="clear-all" onClick={onRetry}>
              {UI.retry}
            </button>
          </div>
        ) : cards.length ? (
          <div className={`khi-grid${view === 'list' ? ' list' : ''}`}>
            {cards.map((card, index) => (
              <KhiCard
                key={`${card.kind}:${card.code}`}
                record={card}
                index={index}
                query={query}
                view={view}
                lead={index === 0 && page === 0 && !query && view === 'grid'}
              />
            ))}
          </div>
        ) : (
          <p className="empty">{UI.empty}</p>
        )}
      </div>

      {!loading && !error && cards.length ? (
        <Pager
          page={page}
          totalPages={totalPages}
          totalElements={totalElements}
          pageSize={pageSize}
          onPage={onPage}
        />
      ) : null}
    </main>
  )
}

