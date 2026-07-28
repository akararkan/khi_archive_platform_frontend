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
        disc={<KhiDetailDisc kind={kind} image={image} alt={title} badge={TYPE_LABELS[kind]} vinyl={vinyl} frame={useFrame} />}
      />
      <KhiInfoGrid items={infoCards} />
      {content}
      {meta ? (
        <section className="detail-meta-section" aria-labelledby="record-details-title">
          <header className="detail-meta-heading">
            <div>
              <span className="detail-meta-eyebrow">ARCHIVE METADATA</span>
              <h2 id="record-details-title">وردەکاریی تۆمار</h2>
            </div>
            <p>زانیاریی تەواوی ناساندن، ناوەڕۆک و مافەکانی ئەم تۆمارە</p>
          </header>
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
