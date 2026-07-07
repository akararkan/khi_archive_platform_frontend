import React from 'react'
import { Link } from 'react-router-dom'

import { Highlight } from '@/components/ui/highlight'
import KhiMediaPreview from './KhiMediaPreview'
import { IconAll, TYPE_ICON } from './icons'
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

function CodeChip({ children, className = '' }) {
  if (!children) return null
  return <span className={`card-code-chip ${className}`.trim()}>{children}</span>
}

function VisibilityChip({ visibility }) {
  if (!visibility) return null
  const isPrivate = visibility === 'private'
  return (
    <span className={`visibility-chip ${isPrivate ? 'private' : 'public'}`}>
      {isPrivate ? 'Private' : 'Public'}
    </span>
  )
}

function CategoryChips({ categories = [], query }) {
  if (!categories.length) return null
  const visible = categories.slice(0, 4)
  const extra = categories.length - visible.length
  return (
    <div className="card-categories">
      {visible.map((cat) => (
        <span key={cat.code || cat.label} className="category-chip">
          <Highlight text={cat.label || cat.code || ''} query={query} />
        </span>
      ))}
      {extra > 0 ? <span className="category-chip muted">+{extra}</span> : null}
    </div>
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

// One catalogue card. Media/project records use the guide's structured chip
// stack (codes, project, person, categories, visibility/trending), while
// person/category cards keep the compact entity-card shape.
export default function KhiCard({ record, index = 0, query = '' }) {
  const {
    kind,
    code,
    collection,
    title,
    person,
    personEmpty,
    region,
    decade,
    to,
    projectCode,
    projectName,
    categories = [],
    counts = [],
    visibility,
  } = record
  const TypeIcon = TYPE_ICON[kind]

  const creator = person?.name || null
  const secondary = creator || region || collection || null
  const year = decade || null
  const isMedia = ['audio', 'video', 'text', 'image'].includes(kind)
  const isProject = kind === 'project'
  const showStructuredBody = isMedia || isProject
  const displayProjectCode = isProject ? (projectCode || code) : projectCode

  return (
    <Link
      to={to}
      className="card rise"
      style={{ animationDelay: `${(0.05 + (index % 12) * 0.04).toFixed(2)}s` }}
    >
      <div className="media">
        {TypeIcon ? (
          <span className={`type-badge kind-${kind}`}><TypeIcon /> {TYPE_LABELS[kind] || kind}</span>
        ) : null}
        {record.trending ? (
          <span className="trend-badge">
            <IconAll />
            {record.trendingRank ? `#${record.trendingRank}` : 'Trending'}
          </span>
        ) : null}
        <KhiMediaPreview record={record} />
      </div>

      <div className="body">
        <h3><Highlight text={title || ''} query={query} /></h3>

        {showStructuredBody ? (
          <>
            <div className="card-chip-row">
              {isMedia && code ? (
                <CodeChip className="media-code">
                  <Highlight text={code} query={query} />
                </CodeChip>
              ) : null}
              {displayProjectCode ? (
                <CodeChip className="project-code">
                  <Highlight text={displayProjectCode} query={query} />
                </CodeChip>
              ) : null}
              <VisibilityChip visibility={visibility} />
            </div>

            {isMedia && projectName ? (
              <div className="card-entity-line project-name">
                <span className="label">Project</span>
                <span><Highlight text={projectName} query={query} /></span>
              </div>
            ) : null}

            {person || (isProject && personEmpty) ? (
              <div className={`card-person-chip ${person ? 'linked' : 'empty'}`}>
                {person ? <Avatar person={person} /> : null}
                <span>
                  <Highlight text={person?.name || 'No person linked'} query={query} />
                </span>
              </div>
            ) : null}

            <CategoryChips categories={categories} query={query} />
            <CountChips counts={counts} />
          </>
        ) : secondary ? (
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
