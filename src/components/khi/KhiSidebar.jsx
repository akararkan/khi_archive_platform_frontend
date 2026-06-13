import React, { useState } from 'react'

import { readFacet, personImageSrc, personInitials } from '@/components/public/public-helpers'
import { IconFilter, IconChevron, IconCalendar, IconClose, TYPE_ICON, FACET_ICON } from './icons'
import { UI, TYPE_LABELS } from './khi-data'

const INITIAL_VISIBLE = 6
const PERSON_VISIBLE = 7
const SEARCH_THRESHOLD = 8
const GROUP_LABELS = {
  discover: 'گەڕان',
  entities: 'بنەماکان',
  media: 'جۆری ئایتم',
}

function yearFromDate(value) {
  const m = String(value || '').match(/(\d{4})/)
  return m ? Number(m[1]) : null
}

function decadeStart(year) {
  return Math.floor(Number(year) / 10) * 10
}

function clampDecade(value, min, max) {
  return Math.min(max, Math.max(min, decadeStart(value)))
}

function dateFromDecade(decade) {
  return `${decade}-01-01`
}

function dateToDecade(decade, maxYear) {
  const endYear = Math.min(decade + 9, maxYear)
  return `${endYear}-12-31`
}

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

function DecadeRange({ minYear, maxYear, dateFrom, dateTo, onDateChange }) {
  const fallbackMax = new Date().getFullYear()
  const min = decadeStart(Number.isFinite(minYear) ? minYear : 1800)
  const max = decadeStart(Number.isFinite(maxYear) ? maxYear : fallbackMax)
  const safeMax = Math.max(min, max)
  const fromYear = yearFromDate(dateFrom)
  const toYear = yearFromDate(dateTo)
  const from = fromYear ? clampDecade(fromYear, min, safeMax) : min
  const to = toYear ? clampDecade(toYear, min, safeMax) : safeMax
  const lower = Math.min(from, to)
  const upper = Math.max(from, to)
  const span = Math.max(1, safeMax - min)
  const fromPct = ((lower - min) / span) * 100
  const toPct = ((upper - min) / span) * 100
  const isFullRange = lower === min && upper === safeMax

  const commit = (nextFrom, nextTo) => {
    const nextLower = Math.min(nextFrom, nextTo)
    const nextUpper = Math.max(nextFrom, nextTo)
    onDateChange({
      dateFrom: nextLower === min ? '' : dateFromDecade(nextLower),
      dateTo: nextUpper === safeMax ? '' : dateToDecade(nextUpper, Number.isFinite(maxYear) ? maxYear : fallbackMax),
    })
  }

  return (
    <div
      className="decade-range"
      style={{ '--from': `${fromPct}%`, '--to': `${toPct}%` }}
    >
      <div className="decade-labels">
        <span>{lower}s</span>
        <span>{upper}s</span>
      </div>
      <div className="decade-slider" dir="ltr">
        <div className="decade-track" />
        <input
          type="range"
          min={min}
          max={safeMax}
          step="10"
          value={lower}
          onChange={(e) => commit(Number(e.target.value), upper)}
          aria-label="دەستپێکی دەیە"
        />
        <input
          type="range"
          min={min}
          max={safeMax}
          step="10"
          value={upper}
          onChange={(e) => commit(lower, Number(e.target.value))}
          aria-label="کۆتایی دەیە"
        />
      </div>
      <div className="decade-foot">
        <span>{min}s</span>
        {!isFullRange ? (
          <button type="button" onClick={() => onDateChange({ dateFrom: '', dateTo: '' })}>
            {UI.clearAll}
          </button>
        ) : null}
        <span>{safeMax}s</span>
      </div>
    </div>
  )
}

function TextFilterGroup({ filters, values, onTextFilter }) {
  const hasValue = filters.some((f) => (values[f.paramKey] || '').trim())
  const [open, setOpen] = useState(hasValue)

  return (
    <div className="facet uncommon">
      <summary onClick={() => setOpen((o) => !o)} style={{ listStyle: 'none' }}>
        {UI.searchWithin}
        <IconChevron className="chev" width="16" height="16" style={{ transform: open ? 'rotate(180deg)' : 'none' }} />
      </summary>
      {open ? (
        <div className="facet-body">
          {filters.map((f) => (
            <input
              key={f.paramKey}
              className="filterbox"
              value={values[f.paramKey] || ''}
              onChange={(e) => onTextFilter(f.paramKey, e.target.value)}
              placeholder={f.label}
              style={{ marginBottom: 0 }}
            />
          ))}
        </div>
      ) : null}
    </div>
  )
}

// Full public filter rail: type navigation + (for the unified feed) media-type
// narrowing + per-type facets + creation-date range + per-kind "search within".
export default function KhiSidebar({
  types, activeType, onType, counts = {}, onClose,
  type, facets, selected, onToggleFacet,
  showMediaTypes, mediaKinds = [], mediaTypeCounts = {}, selectedMediaTypes = [], onToggleMediaType,
  showDateRange, dateFrom, dateTo, dateBounds, onDateChange,
  textFilters = [], textFilterValues = {}, onTextFilter,
}) {
  const groupedTypes = []
  for (const t of types) {
    // Media types are checkboxes inside the catalogue, not nav tabs.
    if (t.navHidden) continue
    const group = t.group || 'discover'
    let bucket = groupedTypes.find((g) => g.key === group)
    if (!bucket) {
      bucket = { key: group, label: GROUP_LABELS[group] || group, items: [] }
      groupedTypes.push(bucket)
    }
    bucket.items.push(t)
  }

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

      <div className="nav-list">
        {groupedTypes.map((group) => (
          <div key={group.key} className="nav-section">
            <p className="nav-section-title">{group.label}</p>
            {group.items.map((t) => {
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
        ))}
      </div>

      {showMediaTypes ? (
        <div className="facet">
          <summary style={{ listStyle: 'none' }}>
            {TYPE_ICON.all ? <TYPE_ICON.all className="lead-ic" /> : null} جۆری مێدیا
          </summary>
          <div className="facet-body">
            {mediaKinds.map((k) => {
              const on = selectedMediaTypes.includes(k)
              return (
                <label key={k} className={`check${on ? ' on' : ''}`} onClick={(e) => { e.preventDefault(); onToggleMediaType(k) }}>
                  <span className="box" />
                  <span>{TYPE_LABELS[k]}</span>
                  {mediaTypeCounts[k] ? <span className="c-count">{mediaTypeCounts[k].toLocaleString()}</span> : null}
                </label>
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
            <IconCalendar className="lead-ic" /> {UI.dateCreated}
          </summary>
          <div className="facet-body">
            <DecadeRange
              minYear={dateBounds?.minYear}
              maxYear={dateBounds?.maxYear}
              dateFrom={dateFrom}
              dateTo={dateTo}
              onDateChange={onDateChange}
            />
          </div>
        </div>
      ) : null}

      {textFilters.length ? (
        <TextFilterGroup key={type?.key || 'text-filters'} filters={textFilters} values={textFilterValues} onTextFilter={onTextFilter} />
      ) : null}
    </aside>
  )
}
