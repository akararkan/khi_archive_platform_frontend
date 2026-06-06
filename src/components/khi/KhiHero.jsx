import React, { useEffect, useMemo, useRef, useState } from 'react'

import { guestImages, guestPersons } from '@/services/guest'
import { IconSearch, IconAudio, IconVideo, IconImage, IconText } from './icons'
import { UI } from './khi-data'

const CHIPS = [
  { type: 'audio', label: 'دەنگ', Icon: IconAudio },
  { type: 'video', label: 'ڤیدیۆ', Icon: IconVideo },
  { type: 'image', label: 'وێنە', Icon: IconImage },
  { type: 'text', label: 'دەستنووس', Icon: IconText },
]

const MAX_SHOTS = 10
const CYCLE_MS = 6000

// Sunrise-over-the-mountains hero. Behind the SVG art, a layer of REAL archive
// photos (Image-entity images + person portraits) slowly cross-fades — so the
// hero reflects the living collection. Falls back to the pure art when no
// images are available.
export default function KhiHero({ query, onQuery, onSubmit, onJump }) {
  const ringRef = useRef(null)
  const rangeRef = useRef(null)
  const [shots, setShots] = useState([])
  const [idx, setIdx] = useState(0)

  // Generated once: 40 stars and 21 sun rays (like the Kurdish flag).
  const stars = useMemo(
    () => Array.from({ length: 40 }, (_, i) => ({
      left: ((i * 53) % 100),
      top: ((i * 29) % 55),
      delay: ((i * 7) % 40) / 10,
    })),
    [],
  )
  const rays = useMemo(() => {
    const arr = []
    for (let i = 0; i < 21; i++) {
      const a = (i / 21) * Math.PI * 2
      arr.push({
        x1: 100 + Math.cos(a) * 68, y1: 100 + Math.sin(a) * 68,
        x2: 100 + Math.cos(a) * 96, y2: 100 + Math.sin(a) * 96,
      })
    }
    return arr
  }, [])

  // Fetch real images for the cycling backdrop (public URLs, no auth).
  useEffect(() => {
    let cancelled = false
    const ctrl = new AbortController()
    Promise.all([
      guestImages.list({ page: 0, size: 40, signal: ctrl.signal }).catch(() => null),
      guestPersons({ page: 0, size: 40, signal: ctrl.signal }).catch(() => null),
    ]).then(([imgs, persons]) => {
      if (cancelled) return
      const fromImages = (imgs?.content || imgs || []).map((x) => x?.imageFileUrl).filter(Boolean)
      const fromPersons = (persons?.content || persons || []).map((p) => p?.mediaPortrait).filter(Boolean)
      // Interleave images + portraits, dedupe, cap.
      const merged = []
      const max = Math.max(fromImages.length, fromPersons.length)
      for (let i = 0; i < max; i++) {
        if (fromImages[i]) merged.push(fromImages[i])
        if (fromPersons[i]) merged.push(fromPersons[i])
      }
      const unique = [...new Set(merged)].slice(0, MAX_SHOTS)
      setShots(unique)
    })
    return () => { cancelled = true; ctrl.abort() }
  }, [])

  // Advance the active photo on an interval; pause when the tab is hidden.
  useEffect(() => {
    if (shots.length < 2) return () => {}
    const id = setInterval(() => {
      if (typeof document !== 'undefined' && document.visibilityState !== 'visible') return
      setIdx((i) => (i + 1) % shots.length)
    }, CYCLE_MS)
    return () => clearInterval(id)
  }, [shots])

  // Subtle parallax on the ridge + sun ring as the cursor moves.
  const handleMove = (e) => {
    const x = e.clientX / window.innerWidth - 0.5
    if (rangeRef.current) rangeRef.current.style.transform = `translateX(${x * -18}px)`
    if (ringRef.current) ringRef.current.style.transform = `translate(calc(-50% + ${x * 10}px), -50%)`
  }

  const submit = () => { if (onSubmit) onSubmit(query) }

  return (
    <section className="hero" onMouseMove={handleMove}>
      {shots.length ? (
        <div className="hero-photos">
          {shots.map((url, i) => (
            <div key={url} className={`shot${i === idx ? ' on' : ''}`} style={{ backgroundImage: `url("${url}")` }} />
          ))}
        </div>
      ) : null}

      <div className="stars">
        {stars.map((s, i) => (
          <i key={i} style={{ left: `${s.left}%`, top: `${s.top}%`, animationDelay: `${s.delay}s` }} />
        ))}
      </div>

      <div className="sun-glow" />

      <div className="sun-ring" ref={ringRef}>
        <svg viewBox="0 0 200 200" fill="none" stroke="#e7d3a0" strokeWidth="1">
          <g>
            {rays.map((r, i) => (
              <line key={i} x1={r.x1.toFixed(1)} y1={r.y1.toFixed(1)} x2={r.x2.toFixed(1)} y2={r.y2.toFixed(1)} strokeLinecap="round" />
            ))}
          </g>
          <circle cx="100" cy="100" r="46" strokeWidth="1.4" opacity=".9" />
          <circle cx="100" cy="100" r="60" strokeDasharray="2 6" opacity=".6" />
        </svg>
      </div>

      <div className="mountains">
        <svg ref={rangeRef} viewBox="0 0 1440 360" preserveAspectRatio="none">
          <path fill="#2a4a3c" opacity=".5" d="M0 360 V230 L120 180 L240 220 L360 160 L520 210 L680 150 L840 200 L1000 145 L1160 195 L1300 155 L1440 190 V360 Z" />
          <path fill="#1d362c" opacity=".82" d="M0 360 V270 L160 215 L300 255 L440 195 L600 250 L780 185 L960 245 L1140 195 L1300 240 L1440 205 V360 Z" />
          <path className="ridge-rim" fill="none" stroke="#d6b25e" strokeWidth="2.4" strokeLinejoin="round" d="M0 318 L140 262 L280 300 L420 238 L560 292 L700 228 L880 296 L1040 248 L1220 300 L1360 256 L1440 286" />
          <path fill="#122019" d="M0 360 V330 L140 262 L280 300 L420 238 L560 292 L700 228 L880 296 L1040 248 L1220 300 L1360 256 L1440 286 V360 Z" />
        </svg>
      </div>

      <div className="wrap">
        <div className="hero-inner">
          <div className="eyebrow rise" style={{ animationDelay: '.05s' }}>
            کۆکراوەی دیجیتاڵی · دەستپێگەیشتنی ئازاد
          </div>
          <h1 className="rise" style={{ animationDelay: '.12s' }}>
            گەنجینەی زیندووی <em>یادەوەری</em> گەلێک
          </h1>
          <p className="lead rise" style={{ animationDelay: '.2s' }}>
            کۆکراوەیەکی گشتی لە کەلەپووری کوردی — <b>دەنگ، ڤیدیۆ، وێنە و دەستنووس</b>،
            لەگەڵ ئەو کەسانەی دروستیان کردوون. بگەڕێ و پاڵاوتن بکە بەپێی کەس، پۆل، زمان، ناوچە و دەیە.
          </p>

          <div className="hero-search rise" style={{ animationDelay: '.28s' }}>
            <div className="field">
              <span className="ico"><IconSearch /></span>
              <input
                value={query}
                onChange={(e) => onQuery(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') submit() }}
                placeholder={UI.heroSearchPlaceholder}
              />
            </div>
            <button className="go" onClick={submit}>{UI.go}</button>
          </div>

          <div className="chips rise" style={{ animationDelay: '.36s' }}>
            <span className="lbl">{UI.searchBy}</span>
            {CHIPS.map((chip) => {
              const Ico = chip.Icon
              return (
                <button key={chip.type} className="chip" onClick={() => onJump(chip.type)}>
                  <Ico /> {chip.label}
                </button>
              )
            })}
          </div>
        </div>
      </div>
    </section>
  )
}
