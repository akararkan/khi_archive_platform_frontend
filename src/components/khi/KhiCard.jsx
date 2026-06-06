import React from 'react'
import { Link } from 'react-router-dom'

import { Highlight } from '@/components/ui/highlight'
import KhiMediaPreview from './KhiMediaPreview'
import { IconCollection, TYPE_ICON } from './icons'
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

// One catalogue card for any kind (audio/video/text/image/person/project/category).
// `index` staggers the rise-in animation. `query` highlights search matches.
export default function KhiCard({ record, index = 0, query = '' }) {
  const { kind, collection, title, person, region, lang, decade, tags, count, to } = record
  const TypeIcon = TYPE_ICON[kind]
  const isPerson = kind === 'person'

  return (
    <Link
      to={to}
      className={`card rise${isPerson ? ' person-card' : ''}`}
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
        {collection ? (
          <div className="coll"><IconCollection /><span>{collection}</span></div>
        ) : null}

        <h3><Highlight text={title || ''} query={query} /></h3>

        {person?.name ? (
          <div className="person">
            <Avatar person={person} />
            <span>
              <span className="pn"><Highlight text={person.name} query={query} /></span>
              {region ? <span className="pr">{region}</span> : null}
            </span>
          </div>
        ) : region && !isPerson ? (
          <div className="person">
            <span className="pn" style={{ color: 'var(--muted)', fontWeight: 600 }}>{region}</span>
          </div>
        ) : null}

        {isPerson && region ? (
          <div className="person"><span className="pr" style={{ marginInlineStart: 0 }}>{region}</span></div>
        ) : null}

        <div className="tags">
          {lang ? <span className="tag lang">{lang}</span> : null}
          {(tags || []).map((t, idx) => <span key={`${t}-${idx}`} className="tag">{t}</span>)}
          {decade ? <span className="tag dec">{decade}</span> : null}
          {count ? <span className="tag dec">{count}</span> : null}
        </div>
      </div>
    </Link>
  )
}
