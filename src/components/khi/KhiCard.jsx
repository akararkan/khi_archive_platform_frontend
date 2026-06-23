import React from 'react'
import { Link } from 'react-router-dom'

import { Highlight } from '@/components/ui/highlight'
import KhiMediaPreview from './KhiMediaPreview'
import { TYPE_ICON } from './icons'
import { TYPE_LABELS } from './khi-data'

function Avatar({ person }) {
  if (!person) return null
  const initials = (person.name || '·').trim().split(/\s+/).slice(0, 2).map((p) => p.charAt(0)).join('')
  return (
    <span className="avatar">
      {person.image ? <img src={person.image} alt={person.name || ''} loading="lazy" /> : initials || '·'}
    </span>
  )
}

// One catalogue card. Every record renders in the SAME uniform shape — a
// fixed-ratio cover on top (the real photo for image/project/person, the kit's
// generated art for audio/video/text/category) and a body below with a
// two-line-clamped title + a single meta row — so the grid reads as an even set
// of equal-sized cards. `index` staggers the rise-in; `query` highlights.
export default function KhiCard({ record, index = 0, query = '' }) {
  const { kind, collection, title, person, region, decade, to } = record
  const TypeIcon = TYPE_ICON[kind]

  const creator = person?.name || null
  const secondary = creator || region || collection || null
  const year = decade || null

  return (
    <Link
      to={to}
      className="card rise"
      style={{ animationDelay: `${(0.05 + (index % 12) * 0.04).toFixed(2)}s` }}
    >
      <div className="media">
        {/* Internal codes are never shown on public pages. */}
        {TypeIcon ? (
          <span className="type-badge"><TypeIcon /> {TYPE_LABELS[kind] || kind}</span>
        ) : null}
        <KhiMediaPreview record={record} />
      </div>

      <div className="body">
        <h3><Highlight text={title || ''} query={query} /></h3>

        {secondary ? (
          <div className="meta">
            {creator ? <Avatar person={person} /> : null}
            <span className={`mn${creator ? '' : ' muted'}`}>
              {creator ? <Highlight text={secondary} query={query} /> : secondary}
            </span>
            {year ? <span className="yr">{year}</span> : null}
          </div>
        ) : year ? (
          <div className="meta"><span className="yr only">{year}</span></div>
        ) : null}
      </div>
    </Link>
  )
}
