import React from 'react'

import {
  KhiBreadcrumb, KhiDetailHero, KhiDetailDisc, KhiInfoGrid, KhiActions,
} from './KhiDetail'
import { DETAIL, TYPE_LABELS } from './khi-data'

// Presentational shell shared by all four media detail pages (audio / video /
// text / image). The page handles fetching + builds the data arrays; this lays
// it out the heritage way: hero → info-grid → content → meta ledger → year.
// `helpAction` floats at the hero's top-left corner; the hero-action row is
// where the project button now lives. `footerYear` closes the page.
export default function KhiMediaDetail({
  kind, title, subtitle, description, image, vinyl = false,
  breadcrumbItems = [], actions = [], infoCards = [], tags = [],
  content = null, meta = null, helpAction = null, footerYear = null,
}) {
  const useFrame = kind === 'image' || kind === 'audio'
  // The image page renders the photograph once, in the zoomable stage below —
  // repeating it inside the hero card doubled the artwork, so the image hero
  // carries text only.
  const showDisc = kind !== 'image'

  return (
    <>
      <KhiDetailHero
        kind={kind}
        title={title}
        subtitle={subtitle}
        description={description}
        tags={tags}
        action={actions.length ? <KhiActions actions={actions} /> : null}
        corner={helpAction ? <KhiActions actions={[helpAction]} /> : null}
        breadcrumb={<KhiBreadcrumb items={breadcrumbItems} />}
        disc={showDisc ? <KhiDetailDisc kind={kind} image={image} alt={title} badge={TYPE_LABELS[kind]} vinyl={vinyl} frame={useFrame} /> : null}
      />
      <KhiInfoGrid items={infoCards} />
      {content}
      {/* No section heading — the numbered ledger bands are the headers
          (user: no English anywhere in the details, no extra title block). */}
      {meta ? (
        <section className="detail-meta-section">
          <div className="detail-meta">{meta}</div>
        </section>
      ) : null}
      {footerYear ? (
        <footer className="detail-year-foot">
          <span className="dyf-label">{DETAIL.year}</span>
          <span className="dyf-value">{footerYear}</span>
        </footer>
      ) : null}
    </>
  )
}
