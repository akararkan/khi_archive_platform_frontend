import React from 'react'
import { Link } from 'react-router-dom'

import { DETAIL, TYPE_PILL } from './khi-data'
import KhiLogoWatermark from './KhiLogoWatermark'
import { publicDetailPath } from '@/components/public/public-route-id'
import {
  IconHome, IconMic, IconVideo, IconImage, IconText, IconProject,
  IconCategory, IconPerson, IconArrowLeft,
} from './icons'

// ════════════════════════════════════════════════════════════════════════════
// KhiDetail — the heritage "Living Archive" detail-page design system.
// A record/medallion hero, a Sorani info-grid, stat strip, section cards,
// an illustrated empty state and curated meta panels. Everything is scoped
// under .khi-root (RTL) and styled in khi-archive.css. The page body stays
// WHITE — tints live only inside the hero + cards.
// ════════════════════════════════════════════════════════════════════════════

const KIND_BADGE_ICON = {
  audio: IconMic, video: IconVideo, image: IconImage, text: IconText,
  person: IconMic, project: IconProject, category: IconCategory,
}

function publicSearchHref(value) {
  const q = String(value ?? '').trim()
  return q ? `/public/browse?type=all&q=${encodeURIComponent(q)}` : '#'
}

// ── Breadcrumb ───────────────────────────────────────────────────────────────
export function KhiBreadcrumb({ items = [] }) {
  return (
    <nav className="detail-crumb" aria-label="breadcrumb">
      {items.map((it, i) => {
        const last = i === items.length - 1
        return (
          <React.Fragment key={`${it.label}-${i}`}>
            {it.to && !last ? (
              <Link to={it.to}>{i === 0 ? <IconHome width="15" height="15" /> : null}{it.label}</Link>
            ) : (
              <strong>{it.label}</strong>
            )}
            {!last ? <span className="sep" aria-hidden="true">/</span> : null}
          </React.Fragment>
        )
      })}
    </nav>
  )
}

// ── Action buttons (hero) ────────────────────────────────────────────────────
export function KhiActions({ actions = [] }) {
  const list = actions.filter(Boolean)
  if (!list.length) return null
  return (
    <div className="detail-actions">
      {list.map((a, i) => {
        const Icon = a.icon
        const cls = `detail-btn${a.primary ? ' primary' : ''}`
        const inner = <>{Icon ? <Icon width="17" height="17" /> : null}{a.label}</>
        if (a.href) {
          return (
            <a
              key={i}
              href={a.href}
              className={cls}
              {...(a.external ? { target: '_blank', rel: 'noreferrer' } : {})}
            >
              {inner}
            </a>
          )
        }
        return <button key={i} type="button" className={cls} onClick={a.onClick}>{inner}</button>
      })}
    </div>
  )
}

// ── The hero visual ──────────────────────────────────────────────────────────
// Public media details should respect the real archive asset first. Audio,
// video, image, and text pages therefore use a clean image surface with no
// generated frame, badge, or decorative overlay. The older illustrated frames
// remain below for project/category/person pages.
export function KhiDetailDisc({ kind, image, alt, badge, vinyl = false, initials, frame = false }) {
  const BadgeIcon = KIND_BADGE_ICON[kind] || IconMic

  if (['audio', 'video', 'image', 'text'].includes(kind)) {
    // Image, video, and book heroes carry the breathing brand watermark over
    // the artwork; audio has no visual asset to protect. The frame span
    // shrink-wraps the image so the mark anchors to the artwork box itself,
    // never the (usually wider) hero grid cell.
    const watermark = image && kind !== 'audio'
    return (
      <div className={`hero-image-area media-asset-area kind-${kind}${image ? ' has-image' : ' is-empty'}`}>
        {image && watermark ? (
          <span className="media-asset-frame">
            <img className="media-asset-image" src={image} alt={alt || ''} loading="lazy" />
            <KhiLogoWatermark className="hero-mark" />
          </span>
        ) : image ? (
          <img className="media-asset-image" src={image} alt={alt || ''} loading="lazy" />
        ) : (
          <span className="media-asset-empty">
            <BadgeIcon width="58" height="58" />
          </span>
        )}
      </div>
    )
  }

  if (kind === 'project') {
    return (
      <div className="hero-image-area project-visual">
        <div className="collection-frame">
          {image ? <img src={image} alt={alt || ''} loading="lazy" /> : null}
          <span className="shelf-row top" aria-hidden="true" />
          <span className="shelf-row middle" aria-hidden="true" />
          <span className="shelf-row bottom" aria-hidden="true" />
          <span className="archive-tile image" aria-hidden="true"><IconImage width="22" height="22" /></span>
          <span className="archive-tile audio" aria-hidden="true"><IconMic width="22" height="22" /></span>
          <span className="archive-tile text" aria-hidden="true"><IconText width="22" height="22" /></span>
        </div>
        {badge ? (
          <span className="mic-badge"><BadgeIcon width="18" height="18" /> {badge}</span>
        ) : null}
      </div>
    )
  }

  if (kind === 'category') {
    return (
      <div className="hero-image-area category-visual">
        <div className="category-mark">
          <span className="category-ring one" aria-hidden="true" />
          <span className="category-ring two" aria-hidden="true" />
          <span className="category-ring three" aria-hidden="true" />
          <span className="category-core">{initials || <IconCategory width="58" height="58" />}</span>
        </div>
        {badge ? (
          <span className="mic-badge"><BadgeIcon width="18" height="18" /> {badge}</span>
        ) : null}
      </div>
    )
  }

  if (frame) {
    return (
      <div className="hero-image-area">
        <span className="wave wave-left" aria-hidden="true" />
        <span className="wave wave-right" aria-hidden="true" />
        <div className="photo-frame">
          {image ? (
            <img src={image} alt={alt || ''} loading="lazy" />
          ) : (
            <span className="record-ph">{initials || <BadgeIcon width="64" height="64" />}</span>
          )}
        </div>
        {badge ? (
          <span className="mic-badge"><BadgeIcon width="18" height="18" /> {badge}</span>
        ) : null}
      </div>
    )
  }

  return (
    <div className="hero-image-area">
      <span className="wave wave-left" aria-hidden="true" />
      <span className="wave wave-right" aria-hidden="true" />
      <div className={`record-frame${vinyl ? ' vinyl' : ''}`}>
        <div className="record-image">
          {image ? (
            <img src={image} alt={alt || ''} loading="lazy" />
          ) : (
            <span className="record-ph">{initials || <BadgeIcon width="64" height="64" />}</span>
          )}
        </div>
        {vinyl ? <span className="record-hole" aria-hidden="true" /> : null}
      </div>
      {badge ? (
        <span className="mic-badge"><BadgeIcon width="18" height="18" /> {badge}</span>
      ) : null}
    </div>
  )
}

// ── Hero ─────────────────────────────────────────────────────────────────────
// kind drives the Latin type-pill + the disc badge; disc is a ready KhiDetailDisc.
export function KhiDetailHero({
  kind, title, subtitle, description, tags = [], action, disc, breadcrumb,
}) {
  const cleanTags = (tags || []).filter(Boolean)
  return (
    <section className={`detail-hero${kind ? ` kind-${kind}` : ''}`}>
      {breadcrumb}
      <div className="hero-grid">
        <div className="hero-content">
          {kind ? <span className="type-pill">{TYPE_PILL[kind] || kind}</span> : null}
          <h1>{title}</h1>
          {subtitle ? <h2>{subtitle}</h2> : null}
          {description ? <p className="hero-desc">{description}</p> : null}
          {cleanTags.length ? (
            <div className="hero-tags">
              {cleanTags.map((t, i) => (
                <Link key={`${t}-${i}`} to={publicSearchHref(t)} className="hero-tag">{t}</Link>
              ))}
            </div>
          ) : null}
          {action ? <div className="hero-action">{action}</div> : null}
        </div>
        {disc}
      </div>
    </section>
  )
}

// ── Info grid ────────────────────────────────────────────────────────────────
// items: [{ icon, label, value, to }] — empty values are dropped.
export function KhiInfoGrid({ items = [] }) {
  const rows = items.filter((it) => it && it.value != null && it.value !== '')
  if (!rows.length) return null
  return (
    <div className="info-grid">
      {rows.map((it, i) => {
        const Icon = it.icon
        const body = (
          <>
            <span className="info-icon">{Icon ? <Icon width="22" height="22" /> : null}</span>
            <div className="info-text">
              <span>{it.label}</span>
              <strong>{it.value}</strong>
            </div>
          </>
        )
        return it.to ? (
          <Link key={i} to={it.to} className="info-card link">{body}</Link>
        ) : (
          <div key={i} className="info-card">{body}</div>
        )
      })}
    </div>
  )
}

// ── Stats strip ──────────────────────────────────────────────────────────────
export function KhiStatsRow({ items = [] }) {
  const rows = items.filter(Boolean)
  if (!rows.length) return null
  return (
    <div className="stats-row">
      {rows.map((s, i) => {
        const Icon = s.icon
        return (
          <div className="stat" key={i}>
            <span className="stat-icon">{Icon ? <Icon width="22" height="22" /> : null}</span>
            <div>
              <strong>{Number.isFinite(s.value) ? s.value.toLocaleString() : (s.value ?? '0')}</strong>
              <span>{s.label}</span>
            </div>
          </div>
        )
      })}
    </div>
  )
}

// ── Section card (Projects / Media) ──────────────────────────────────────────
export function KhiSectionCard({ icon, title, count, action, children }) {
  const Icon = icon
  return (
    <section className="section-card">
      <div className="section-head">
        <div className="section-title">
          {Icon ? <span className="section-ic"><Icon width="20" height="20" /></span> : null}
          <h3>{title}</h3>
          {count != null ? <span className="count-badge">{Number(count).toLocaleString()}</span> : null}
        </div>
        {action ? <div className="section-action">{action}</div> : null}
      </div>
      {children}
    </section>
  )
}

// A small "see all →" link for section headers.
export function KhiSeeAll({ to, label }) {
  if (!to) return null
  return (
    <Link to={to} className="see-all-btn">{label || DETAIL.seeAll} <IconArrowLeft width="16" height="16" /></Link>
  )
}

// ── Empty state with the archive illustration ────────────────────────────────
function KhiArchiveIllustration() {
  return (
    <div className="archive-illustration" aria-hidden="true">
      <span className="archive-box" />
      <span className="cassette" />
      <span className="small-photo" />
    </div>
  )
}

export function KhiEmptyState({ title, text, action, illustration = true }) {
  return (
    <div className="empty-state">
      <div className="empty-text">
        <h4>{title}</h4>
        {text ? <p>{text}</p> : null}
        {action || null}
      </div>
      {illustration ? <KhiArchiveIllustration /> : null}
    </div>
  )
}

// ── Curated meta panels ──────────────────────────────────────────────────────
export function KhiMetaPanel({ icon, title, children }) {
  const Icon = icon
  return (
    <div className="meta-panel">
      <p className="meta-panel-title">
        {Icon ? <Icon width="16" height="16" /> : null}{title}
      </p>
      <dl className="meta-rows">{children}</dl>
    </div>
  )
}

// MetaRow drops itself when `value` is explicitly empty (mirrors the old
// PublicMediaDetailShared contract) so empty fields never leave a dangling label.
export function KhiMetaRow({ label, value, children }) {
  const explicitlyEmpty =
    value !== undefined &&
    (value == null || value === '' || value === false ||
      (Array.isArray(value) && value.length === 0))
  if (explicitlyEmpty) return null
  if (value === undefined &&
    (children == null || children === '' ||
      (Array.isArray(children) && children.length === 0))) {
    return null
  }
  return (
    <div className="meta-row">
      <dt>{label}</dt>
      <dd>{children}</dd>
    </div>
  )
}

// Renders nothing (and no panel) unless at least one key on `obj` is non-empty.
export function KhiMetaPanelIf({ obj, keys = [], icon, title, children }) {
  const has = obj && keys.some((k) => {
    const v = obj[k]
    if (v == null || v === '') return false
    if (Array.isArray(v) && v.length === 0) return false
    return true
  })
  if (!has) return null
  return <KhiMetaPanel icon={icon} title={title}>{children}</KhiMetaPanel>
}

// A value that links into a search for itself.
export function KhiSearchValue({ value, children }) {
  if (value == null || value === '') return null
  return <Link to={publicSearchHref(value)} className="meta-link">{children ?? value}</Link>
}

// A row of pills. `search` makes each pill a search link.
export function KhiPillRow({ values, search = false }) {
  if (!values) return null
  const arr = Array.isArray(values)
    ? values.filter(Boolean)
    : String(values).split(/[,،;]/).map((s) => s.trim()).filter(Boolean)
  if (!arr.length) return null
  return (
    <div className="meta-pills">
      {arr.map((v, i) => (search
        ? <Link key={`${v}-${i}`} to={publicSearchHref(v)} className="meta-pill">{v}</Link>
        : <span key={`${v}-${i}`} className="meta-pill">{v}</span>
      ))}
    </div>
  )
}

// Inline chip linking to another entity's detail page.
export function KhiEntityChip({ to, label, icon }) {
  const Icon = icon
  if (!to || !label) return null
  return (
    <Link to={to} className="entity-chip">
      <span className="ec-ic">{Icon ? <Icon width="13" height="13" /> : null}</span>
      <span className="ec-label">{label}</span>
    </Link>
  )
}

export function KhiProjectLink({ project }) {
  if (!project) return null
  const code = project.projectCode || project.code
  if (!code) return null
  return <KhiEntityChip to={publicDetailPath('projects', code)} label={project.projectName || project.name || DETAIL.project} icon={IconProject} />
}

export function KhiPersonLink({ person, fallbackCode, fallbackName }) {
  const code = person?.personCode || fallbackCode
  if (!code) return null
  return <KhiEntityChip to={publicDetailPath('persons', code)} label={person?.fullName || person?.name || fallbackName || DETAIL.person} icon={IconPerson} />
}

export function KhiCategoryLinks({ categories }) {
  if (!Array.isArray(categories) || !categories.length) return null
  return (
    <div className="meta-pills">
      {categories.map((c) => {
        const code = typeof c === 'string' ? c : (c?.categoryCode || c?.code)
        const label = typeof c === 'string' ? c : (c?.categoryName || c?.name || c?.categoryCode || c?.code)
        if (!code) return null
        return <KhiEntityChip key={code} to={publicDetailPath('categories', code)} label={label} icon={IconCategory} />
      })}
    </div>
  )
}

// ── Content section (player / description / lyrics …) ─────────────────────────
export function KhiContentCard({ icon, title, children, className = '' }) {
  const Icon = icon
  return (
    <section className={`content-card ${className}`.trim()}>
      {title ? (
        <h2 className="content-title">{Icon ? <Icon width="18" height="18" /> : null}{title}</h2>
      ) : null}
      <div className="content-body">{children}</div>
    </section>
  )
}

// ── Page shell: loading skeleton + error, else children ──────────────────────
export function KhiDetailShell({ loading, error, notFound, children }) {
  if (loading) {
    return (
      <div className="detail-page">
        <div className="detail-skeleton">
          <div className="sk-crumb" />
          <div className="sk-hero">
            <div className="sk-lines">
              <span className="sk-pill" />
              <span className="sk-title" />
              <span className="sk-sub" />
              <span className="sk-p" /><span className="sk-p" /><span className="sk-p short" />
            </div>
            <div className="sk-disc" />
          </div>
          <div className="sk-grid">{Array.from({ length: 6 }).map((_, i) => <span key={i} />)}</div>
        </div>
      </div>
    )
  }
  if (error || notFound) {
    return (
      <div className="detail-page">
        <div className="detail-error">
          <p>{error || DETAIL.notFound}</p>
          <Link to="/public/browse" className="detail-btn primary"><IconArrowLeft width="16" height="16" /> {DETAIL.back}</Link>
        </div>
      </div>
    )
  }
  return <div className="detail-page">{children}</div>
}
