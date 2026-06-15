import React, { useState } from 'react'

import { readFacet, personImageSrc, personInitials } from '@/components/public/public-helpers'
import { IconFilter, IconChevron, IconCalendar, IconClose, TYPE_ICON, FACET_ICON } from './icons'
import { UI, TYPE_LABELS } from './khi-data'
import KhiYearRange from './KhiYearRange'

const INITIAL_VISIBLE = 6
const PERSON_VISIBLE = 7
const SEARCH_THRESHOLD = 8

function FacetGroup({ group, facets, selectedValues, onToggle }) {
  const [open, setOpen] = useState(group.defaultOpen || selectedValues.length > 0)
  const [showAll, setShowAll] = useState(false)
  const [needle, setNeedle] = useState('')

  const entries = readFacet(facets, group.facetKey)
  if (!entries.length) return null

  const LeadIcon = FACET_ICON[group.paramKey] || FACET_ICON[group.facetKey] || IconChevron
  const n = needle.trim().toLowerCase()
  const filtered = n ? entries.filter((e) => e.value.toLowerCase().includes(n)) : entries
  const max = group.person ? PERSON_VISIBLE : INITIAL_VISIBLE
  const visible = showAll ? filtered : filtered.slice(0, max)

  return (
    <div className="facet">
      <summary onClick={() => setOpen((o) => !o)} style={{ listStyle: 'none' }}>
        <LeadIcon className="lead-ic" /> {group.title}
        <IconChevron className="chev" width="16" height="16" style={{ transform: open ? 'rotate(180deg)' : 'none' }} />
      </summary>
      {open ? (
        <div className="facet-body">
          {entries.length > SEARCH_THRESHOLD ? (
            <input
              className="filterbox"
              value={needle}
              onChange={(e) => setNeedle(e.target.value)}
              placeholder={`${group.title} بگەڕێ…`}
            />
          ) : null}
          {visible.map((entry) => {
            const val = entry.code || entry.value
            const on = selectedValues.includes(val)
            return (
              <label
                key={val}
                className={`check${on ? ' on' : ''}`}
                onClick={(e) => { e.preventDefault(); onToggle(group.paramKey, val) }}
              >
                <span className="box" />
                {group.person ? (
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8, minWidth: 0 }}>
                    <PersonDot entry={entry} />
                    <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{entry.value}</span>
                  </span>
                ) : (
                  <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{entry.value}</span>
                )}
                <span className="c-count">{entry.count.toLocaleString()}</span>
              </label>
            )
          })}
          {filtered.length > max ? (
            <button
              type="button"
              onClick={() => setShowAll((s) => !s)}
              style={{ marginTop: 4, fontSize: 13, fontWeight: 700, color: 'var(--pine-2)', textAlign: 'start' }}
            >
              {showAll ? UI.showFewer : `${UI.showMore} (${filtered.length - max})`}
            </button>
          ) : null}
        </div>
      ) : null}
    </div>
  )
}

function PersonDot({ entry }) {
  const img = personImageSrc({ profileImage: entry.image, profileImageUrl: entry.image, mediaPortrait: entry.image })
  return (
    <span
      style={{
        width: 22, height: 22, borderRadius: '50%', flexShrink: 0, overflow: 'hidden',
        display: 'grid', placeItems: 'center', background: 'var(--pine)', color: 'var(--gold-soft)',
        fontSize: 10, fontWeight: 700,
      }}
    >
      {img ? <img src={img} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : personInitials(entry.value)}
    </span>
  )
}

// Full public filter rail: type navigation + (for the unified feed) media-type
// narrowing + per-type facets + creation-date range + per-kind "search within".
export default function KhiSidebar({
  types, activeType, onType, counts = {}, onClose,
  type, facets, selected, onToggleFacet,
  showMediaTypes, mediaKinds = [], mediaTypeCounts = {}, selectedMediaTypes = [], onToggleMediaType,
  showDateRange, yearMin, yearMax, yearFrom, yearTo, onYearChange, yearLoading = false,
  textFilters = [], textFilterValues = {}, onTextFilter,
}) {
  return (
    <aside className="sidebar">
      <div className="side-head">
        <span className="ic"><IconFilter /></span>
        <span className="side-head-txt">
          <span className="eb">{UI.collection}</span>
          <b>{UI.filter}</b>
        </span>
        {onClose ? (
          <button type="button" className="side-close" onClick={onClose} aria-label={UI.clearAll}>
            <IconClose />
          </button>
        ) : null}
      </div>

      {/* Media-type checkboxes — the primary way to browse the unified feed,
          always shown; toggling one jumps to the feed from any scope. */}
      {showMediaTypes ? (
        <div className="facet media-facet">
          <summary style={{ listStyle: 'none' }}>
            {TYPE_ICON.all ? <TYPE_ICON.all className="lead-ic" /> : null} {UI.mediaType}
          </summary>
          <div className="facet-body">
            {mediaKinds.map((k) => {
              const on = selectedMediaTypes.includes(k)
              const KindIcon = TYPE_ICON[k]
              return (
                <label key={k} className={`check${on ? ' on' : ''}`} onClick={(e) => { e.preventDefault(); onToggleMediaType(k) }}>
                  <span className="box" />
                  {KindIcon ? <KindIcon className="check-ic" /> : null}
                  <span>{TYPE_LABELS[k]}</span>
                  {mediaTypeCounts[k] ? <span className="c-count">{mediaTypeCounts[k].toLocaleString()}</span> : null}
                </label>
              )
            })}
          </div>
        </div>
      ) : null}

      {/* Browse by distinct entity (persons / projects / categories). */}
      {types.length ? (
        <div className="facet">
          <summary style={{ listStyle: 'none' }}>
            {TYPE_ICON.person ? <TYPE_ICON.person className="lead-ic" /> : null} {UI.browseBy}
          </summary>
          <div className="nav-list" style={{ paddingTop: 12 }}>
            {types.map((t) => {
              const Icon = TYPE_ICON[t.key]
              const c = counts[t.key]
              return (
                <button
                  key={t.key}
                  className={`nav-item${t.key === activeType ? ' active' : ''}`}
                  onClick={() => onType(t.key)}
                >
                  <Icon /> {t.label}
                  {typeof c === 'number' && c > 0 ? <span className="n-count">{c.toLocaleString()}</span> : null}
                </button>
              )
            })}
          </div>
        </div>
      ) : null}

      {(type?.facetMap || []).map((group) => (
        <FacetGroup
          key={group.paramKey}
          group={group}
          facets={facets}
          selectedValues={selected[group.paramKey] || []}
          onToggle={onToggleFacet}
        />
      ))}

      {showDateRange ? (
        <div className="facet">
          <summary style={{ listStyle: 'none' }}>
            <IconCalendar className="lead-ic" /> {UI.dateRange}
          </summary>
          <div className="facet-body">
            <KhiYearRange
              min={yearMin}
              max={yearMax}
              from={yearFrom}
              to={yearTo}
              loading={yearLoading}
              onChange={onYearChange}
            />
          </div>
        </div>
      ) : null}

      {textFilters.length ? (
        <div className="facet">
          <summary style={{ listStyle: 'none' }}>{UI.searchWithin}</summary>
          <div className="facet-body">
            {textFilters.map((f) => (
              <input
                key={f.paramKey}
                className="filterbox"
                value={textFilterValues[f.paramKey] || ''}
                onChange={(e) => onTextFilter(f.paramKey, e.target.value)}
                placeholder={f.label}
                style={{ marginBottom: 0 }}
              />
            ))}
          </div>
        </div>
      ) : null}
    </aside>
  )
}
