import React, { useMemo } from 'react'
import { IconImage, IconPlay, IconProject, IconCategory, IconPerson } from './icons'

// Audio waveform with stable pseudo-random bar heights (per card mount).
function Waveform() {
  const bars = useMemo(
    () => Array.from({ length: 34 }, (_, i) => 22 + Math.abs(Math.sin(i * 0.9)) * 58 + ((i * 37) % 16)),
    [],
  )
  return (
    <div className="wave">
      {bars.map((h, i) => (
        <div key={i} className="bar" style={{ height: `${h}%`, animationDelay: `${(i * 0.04).toFixed(2)}s` }} />
      ))}
    </div>
  )
}

// Per-kind cover, sized by the card's fixed-ratio .media box. Image/project/
// person use the real photo when present; everything else gets the kit's
// tasteful generated art. All variants fill the same cover, so cards stay
// uniform.
export default function KhiMediaPreview({ record }) {
  const { kind, duration, image, title } = record
  const naturalImage = image ? (
    <div className="natural-cover">
      <img className="cover-backdrop" src={image} alt="" aria-hidden="true" loading="lazy" />
      <img className="cover-img" src={image} alt={title || ''} loading="lazy" />
    </div>
  ) : null

  if (kind === 'audio') {
    return (
      <div className="m-audio">
        <span className="halo" aria-hidden="true" />
        <span className="base-line" aria-hidden="true" />
        <Waveform />
        {duration ? <span className="duration">{duration}</span> : null}
        <span className="play" aria-hidden="true"><IconPlay /></span>
      </div>
    )
  }

  if (kind === 'video') {
    return (
      <div className="m-video">
        <div className="filmstrip" />
        <div className="filmstrip bottom" />
        <div className="frame" />
        <span className="vig" aria-hidden="true" />
        <span className="scrub" aria-hidden="true"><i /></span>
        {duration ? <span className="duration">{duration}</span> : null}
        <span className="play ring" aria-hidden="true"><IconPlay /></span>
      </div>
    )
  }

  if (kind === 'image') {
    return image ? naturalImage : (
      <div className="m-image"><div className="ph"><IconImage /></div></div>
    )
  }

  if (kind === 'project') {
    return image ? naturalImage : (
      <div className="m-image"><div className="ph"><IconProject /></div></div>
    )
  }

  if (kind === 'category') {
    return <div className="m-image"><div className="ph"><IconCategory /></div></div>
  }

  if (kind === 'person') {
    // The real portrait is contained over a soft tonal backdrop, so faces and
    // full-length archival photographs are never sliced by the card ratio.
    return image ? naturalImage : (
      <div className="m-avatar">
        <span className="big-avatar">{record.avatarText || <IconPerson />}</span>
      </div>
    )
  }

  if (kind === 'text' && image) {
    return naturalImage
  }

  // text / manuscript — a tasteful aged-page sheet fallback
  return (
    <div className="m-text">
      <div className="page">
        <span className="fold" aria-hidden="true" />
        <div className="doc">
          <div className="fl">بسم</div>
          <div className="ln" style={{ width: '96%' }} />
          <div className="ln" style={{ width: '88%' }} />
          <div className="ln" style={{ width: '92%' }} />
          <div className="ln" style={{ width: '74%' }} />
          <div className="ln" style={{ width: '84%' }} />
        </div>
      </div>
    </div>
  )
}
