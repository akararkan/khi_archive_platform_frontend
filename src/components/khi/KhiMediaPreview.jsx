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

// Per-kind cover. Image/Project use the real photo when present; everything
// else gets the kit's tasteful placeholder art. `plate` is true for the
// image-based full-bleed card variant.
export default function KhiMediaPreview({ record, plate = false }) {
  const { kind, duration, image, title } = record

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
    return image ? (
      <img className="cover-img" src={image} alt={title || ''} loading="lazy" />
    ) : (
      <div className="m-image"><div className="ph"><IconImage /></div></div>
    )
  }

  if (kind === 'project') {
    return image ? (
      <img className="cover-img" src={image} alt={title || ''} loading="lazy" />
    ) : (
      <div className="m-image"><div className="ph"><IconProject /></div></div>
    )
  }

  if (kind === 'category') {
    return <div className="m-image"><div className="ph"><IconCategory /></div></div>
  }

  if (kind === 'person') {
    // Plate variant → full-bleed portrait; otherwise the circular avatar.
    if (plate && image) {
      return <img className="cover-img" src={image} alt={title || ''} loading="lazy" />
    }
    return (
      <div className="big-avatar">
        {image ? <img src={image} alt={title || ''} loading="lazy" /> : (record.avatarText || <IconPerson />)}
      </div>
    )
  }

  // text / manuscript — a tasteful aged-page sheet
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
