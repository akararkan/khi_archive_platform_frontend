import React from 'react'
import { Link } from 'react-router-dom'

import { Highlight } from '@/components/ui/highlight'
import KhiMediaPreview from './KhiMediaPreview'
import { IconAll } from './icons'
import { TYPE_LABELS } from './khi-data'

const PREVIEW_LABELED_KINDS = new Set(['audio', 'video', 'text', 'image', 'project'])

// One catalogue card, kept deliberately spare: the cover, the Central-Kurdish
// name and the category — nothing else. Codes, people, dates and descriptions
// belong to the detail page.
export default function KhiCard({ record, index = 0, query = '' }) {
  const { kind, title, collection, categories = [], to } = record

  // The category chip: first linked category, else the entity's own grouping
  // label (person type / project collection) so entity cards never go bare.
  const category = categories.find((c) => c?.label)?.label || collection || null

  return (
    <Link
      to={to}
      className="card rise"
      style={{ animationDelay: `${(0.05 + (index % 12) * 0.04).toFixed(2)}s` }}
    >
      <div className="media">
        {!PREVIEW_LABELED_KINDS.has(kind) ? (
          <span className={`type-badge kind-${kind}`}>{TYPE_LABELS[kind] || kind}</span>
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
        {category ? (
          <span className="card-category">
            <Highlight text={category} query={query} />
          </span>
        ) : null}
      </div>
    </Link>
  )
}
