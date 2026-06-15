import React from 'react'

import {
  KhiBreadcrumb, KhiDetailHero, KhiDetailDisc, KhiInfoGrid, KhiActions,
} from './KhiDetail'
import { TYPE_LABELS } from './khi-data'

// Presentational shell shared by all four media detail pages (audio / video /
// text / image). The page handles fetching + builds the data arrays; this lays
// it out the heritage way: record-disc hero → info-grid → content → meta panels.
export default function KhiMediaDetail({
  kind, title, subtitle, description, image, vinyl = false,
  breadcrumbItems = [], actions = [], infoCards = [], tags = [],
  content = null, meta = null,
}) {
  return (
    <>
      <KhiDetailHero
        kind={kind}
        title={title}
        subtitle={subtitle}
        description={description}
        tags={tags}
        action={actions.length ? <KhiActions actions={actions} /> : null}
        breadcrumb={<KhiBreadcrumb items={breadcrumbItems} />}
        disc={<KhiDetailDisc kind={kind} image={image} alt={title} badge={TYPE_LABELS[kind]} vinyl={vinyl} />}
      />
      <KhiInfoGrid items={infoCards} />
      {content}
      {meta ? <div className="detail-meta">{meta}</div> : null}
    </>
  )
}
