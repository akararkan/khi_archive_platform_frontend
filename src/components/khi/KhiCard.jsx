import React from 'react'
import { Link, useNavigate } from 'react-router-dom'

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

// One catalogue card. The grid mixes two archetypes:
//   • "plate" (IMAGE-BASED) — a record with a real photograph (image / project /
//     person) renders full-bleed, the caption laid over a warm scrim. Immersive.
//   • "frame" (CONTAINER-BASED) — audio / video / text / category, and any
//     photo-less record, keep the clean cover-on-top + body-below card.
// `index` staggers the rise-in; `query` highlights; `view` switches grid/list;
// `lead` marks the landing's first plate as a wide cinematic feature.
export default function KhiCard({ record, index = 0, query = '', view = 'grid', lead = false }) {
  const navigate = useNavigate()
  const { kind, collection, title, person, region, decade, to, image } = record
  const TypeIcon = TYPE_ICON[kind]
  const isPerson = kind === 'person'
  const filterTags = Array.isArray(record.filterTags) ? record.filterTags.filter(Boolean).slice(0, 3) : []

  // A real photograph only exists for these kinds; everything else uses the
  // kit's generated art and therefore stays a container "frame" card.
  const hasCover = Boolean(image) && (kind === 'image' || kind === 'project' || kind === 'person')
  const plate = view === 'grid' && hasCover
  const featured = plate && lead

  const creator = person?.name || null
  const secondary = creator || region || collection || null
  const year = decade || null

  const cls = ['card', 'rise']
  if (plate) cls.push('plate')
  else if (isPerson) cls.push('person-card')
  if (featured) cls.push('featured')

  return (
    <article
      className={cls.join(' ')}
      style={{ animationDelay: `${(0.05 + (index % 12) * 0.04).toFixed(2)}s` }}
    >
      <Link className="card-hit" to={to} aria-label={title || TYPE_LABELS[kind] || kind} />
      <div className="media">
        {/* Internal codes are never shown on public pages. */}
        {TypeIcon ? (
          <span className="type-badge"><TypeIcon /> {TYPE_LABELS[kind] || kind}</span>
        ) : null}
        <KhiMediaPreview record={record} plate={plate} />
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

        {filterTags.length ? (
          <div className="tags">
            {filterTags.map((tag) => (
              <button
                key={tag}
                type="button"
                className="tag tag-link"
                onClick={(event) => {
                  event.preventDefault()
                  event.stopPropagation()
                  navigate(`/public/browse?tag=${encodeURIComponent(tag)}`)
                }}
              >
                {tag}
              </button>
            ))}
          </div>
        ) : null}
      </div>
    </article>
  )
}
