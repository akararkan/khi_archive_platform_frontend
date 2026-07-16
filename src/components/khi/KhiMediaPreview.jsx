import React, { useMemo } from 'react'
import {
  IconCategory,
  IconImage,
  IconMic,
  IconPerson,
  IconPlay,
  IconProject,
  IconText,
  IconVideo,
} from './icons'

const COVER_LABELS = {
  audio: 'دەنگ',
  video: 'ڤیدیۆ',
  text: 'دەق',
  image: 'وێنە',
  project: 'پڕۆژە',
}

function ArchiveRails() {
  return (
    <span className="archive-rails" aria-hidden="true">
      <i />
      <i />
      <i />
    </span>
  )
}

function CoverLabel({ kind, Icon }) {
  return (
    <span className={`archive-cover-label kind-${kind}`}>
      {Icon ? <Icon aria-hidden="true" /> : null}
      <span>{COVER_LABELS[kind] || kind}</span>
    </span>
  )
}

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

// Per-kind cover, sized by the card's fixed-ratio .media box. Image, text,
// video and person records preserve real preview artwork when present; the
// generated states share the same archival-board visual language. A project
// cover keeps that board identity and nests any supplied image in its photo
// slip, so the project list remains visually coherent.
export default function KhiMediaPreview({ record }) {
  const { kind, duration, image, videoSrc } = record
  const naturalImage = image ? (
    <div className={`natural-cover archive-real-cover kind-${kind}`}>
      {kind !== 'image' ? (
        <img className="cover-backdrop" src={image} alt="" aria-hidden="true" loading="lazy" />
      ) : null}
      <img className="cover-img" src={image} alt="" loading="lazy" />
      <span className="archive-real-shade" aria-hidden="true" />
      {kind === 'image' ? <CoverLabel kind="image" Icon={IconImage} /> : null}
      {kind === 'text' ? <CoverLabel kind="text" Icon={IconText} /> : null}
    </div>
  ) : null
  const videoThumbnail = image ? (
    <div className="natural-cover video-cover archive-real-cover kind-video">
      <img className="cover-backdrop" src={image} alt="" aria-hidden="true" loading="lazy" />
      <img className="cover-img" src={image} alt="" loading="lazy" />
      <span className="vig" aria-hidden="true" />
      {duration ? <span className="duration">{duration}</span> : null}
      <span className="play ring" aria-hidden="true"><IconPlay /></span>
      <CoverLabel kind="video" Icon={IconVideo} />
    </div>
  ) : null
  const videoFramePreview = videoSrc ? (
    <div className="natural-cover video-cover video-frame-cover archive-real-cover kind-video">
      <video
        className="cover-img"
        src={`${videoSrc}#t=0.1`}
        preload="metadata"
        muted
        playsInline
        aria-hidden="true"
      />
      <span className="vig" aria-hidden="true" />
      {duration ? <span className="duration">{duration}</span> : null}
      <span className="play ring" aria-hidden="true"><IconPlay /></span>
      <CoverLabel kind="video" Icon={IconVideo} />
    </div>
  ) : null

  if (kind === 'audio') {
    return (
      <div className="m-audio">
        <ArchiveRails />
        <span className="halo" aria-hidden="true" />
        <span className="base-line" aria-hidden="true" />
        <Waveform />
        {duration ? <span className="duration">{duration}</span> : null}
        <span className="play" aria-hidden="true"><IconPlay /></span>
        <CoverLabel kind="audio" Icon={IconMic} />
      </div>
    )
  }

  if (kind === 'video') {
    if (videoThumbnail) return videoThumbnail
    if (videoFramePreview) return videoFramePreview

    return (
      <div className="m-video">
        <ArchiveRails />
        <div className="filmstrip" />
        <div className="filmstrip bottom" />
        <div className="frame" />
        <span className="vig" aria-hidden="true" />
        <span className="scrub" aria-hidden="true"><i /></span>
        {duration ? <span className="duration">{duration}</span> : null}
        <span className="play ring" aria-hidden="true"><IconPlay /></span>
        <CoverLabel kind="video" Icon={IconVideo} />
      </div>
    )
  }

  if (kind === 'image') {
    return image ? naturalImage : (
      <div className="m-image">
        <ArchiveRails />
        <span className="archive-photo-placeholder" aria-hidden="true">
          <span className="archive-photo-sun" />
          <span className="archive-photo-hills" />
        </span>
        <CoverLabel kind="image" Icon={IconImage} />
      </div>
    )
  }

  if (kind === 'project') {
    return (
      <div className="m-project">
        <ArchiveRails />
        <span className="archive-tile project-text-tile" aria-hidden="true"><IconText /></span>
        <span className="archive-tile project-audio-tile" aria-hidden="true"><IconMic /></span>
        <span className="archive-tile project-image-tile" aria-hidden="true">
          {image ? <img src={image} alt="" loading="lazy" /> : <IconImage />}
        </span>
        <CoverLabel kind="project" Icon={IconProject} />
      </div>
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
      <ArchiveRails />
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
      <CoverLabel kind="text" Icon={IconText} />
    </div>
  )
}
