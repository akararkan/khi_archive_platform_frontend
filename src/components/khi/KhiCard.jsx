import React from 'react'
import { Link } from 'react-router-dom'

import { Highlight } from '@/components/ui/highlight'
import KhiLogoWatermark from './KhiLogoWatermark'
import KhiMediaPreview from './KhiMediaPreview'
import { IconAll, TYPE_ICON } from './icons'
import { TYPE_LABELS, UI } from './khi-data'

const PREVIEW_LABELED_KINDS = new Set(['audio', 'video', 'text', 'image', 'project'])

function Avatar({ person }) {
  if (!person) return null
  const initials = (person.name || '·').trim().split(/\s+/).slice(0, 2).map((p) => p.charAt(0)).join('')
  return (
    <span className="avatar">
      {person.image ? <img src={person.image} alt={person.name || ''} loading="lazy" /> : initials || '·'}
    </span>
  )
}

function CountChips({ counts = [] }) {
  if (!counts.length) return null
  return (
    <div className="count-chips">
      {counts.map((count) => (
        <span key={count.kind} className={`count-chip kind-${count.kind}`}>
          <strong>{count.value}</strong> {count.label}
        </span>
      ))}
    </div>
  )
}

function MetaPart({ children, muted = false }) {
  if (!children) return null
  return (
    <span className={muted ? 'muted' : ''}>
      {children}
    </span>
  )
}

// One catalogue card. Public cards intentionally avoid archive codes,
// visibility flags, raw file URLs, and dashboard-only keyword metadata.
export default function KhiCard({ record, index = 0, query = '' }) {
  const {
    kind,
    collection,
    title,
    person,
    region,
    decade,
    dateLabel,
    description,
    to,
    projectName,
    counts = [],
  } = record
  const TypeIcon = TYPE_ICON[kind]

  const creator = person?.name || null
  const publicDate = dateLabel || decade || null
  const context = creator ? (projectName || collection || region) : (region || collection || projectName)
  const hasMeta = creator || publicDate || context

  return (
    <Link
      to={to}
      className="card rise"
      style={{ animationDelay: `${(0.05 + (index % 12) * 0.04).toFixed(2)}s` }}
    >
      <div className="media">
        {TypeIcon && !PREVIEW_LABELED_KINDS.has(kind) ? (
          <span className={`type-badge kind-${kind}`}><TypeIcon /> {TYPE_LABELS[kind] || kind}</span>
        ) : null}
        {record.trending ? (
          <span className="trend-badge">
            <IconAll />
            {record.trendingRank ? `#${record.trendingRank}` : 'Trending'}
          </span>
        ) : null}
        <KhiMediaPreview record={record} />
        <KhiLogoWatermark className="card-mark" />
      </div>

      <div className="body">
        <h3><Highlight text={title || ''} query={query} /></h3>

        {hasMeta ? (
          <div className="card-public-meta">
            {creator ? <Avatar person={person} /> : null}
            <div className="card-public-meta-text">
              <MetaPart>
                {creator ? <Highlight text={creator} query={query} /> : null}
              </MetaPart>
              <MetaPart muted={!creator}>
                {!creator && context ? <Highlight text={context} query={query} /> : null}
              </MetaPart>
              {publicDate ? <MetaPart muted>{publicDate}</MetaPart> : null}
              {creator && context ? (
                <MetaPart muted>
                  <Highlight text={context} query={query} />
                </MetaPart>
              ) : null}
            </div>
          </div>
        ) : null}

        {description ? (
          <p className="card-description">
            <Highlight text={description} query={query} />
          </p>
        ) : null}

        <div className="card-foot">
          <CountChips counts={counts} />
          <span className="card-open">{UI.showMore}</span>
        </div>
      </div>
    </Link>
  )
}
