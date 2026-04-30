import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  Check,
  Download,
  Gauge,
  Loader2,
  Maximize,
  Minimize,
  Pause,
  PictureInPicture,
  Play,
  Repeat,
  RotateCcw,
  RotateCw,
  Volume2,
  VolumeX,
} from 'lucide-react'

import { cn } from '@/lib/utils'

const PLAYBACK_RATES = [0.5, 0.75, 1, 1.25, 1.5, 1.75, 2]

function formatTime(seconds) {
  if (!Number.isFinite(seconds) || seconds < 0) return '0:00'
  const total = Math.floor(seconds)
  const h = Math.floor(total / 3600)
  const m = Math.floor((total % 3600) / 60)
  const s = total % 60
  if (h > 0) return `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`
  return `${m}:${s.toString().padStart(2, '0')}`
}

function VideoPlayer({ src, title, subtitle, downloadHref, className }) {
  const containerRef = useRef(null)
  const videoRef = useRef(null)
  const scrubberRef = useRef(null)
  const rateBtnRef = useRef(null)

  const [playing, setPlaying] = useState(false)
  const [current, setCurrent] = useState(0)
  const [duration, setDuration] = useState(0)
  const [buffered, setBuffered] = useState(0)
  const [volume, setVolume] = useState(0.9)
  const [muted, setMuted] = useState(false)
  const [ready, setReady] = useState(false)
  const [isSeeking, setIsSeeking] = useState(false)
  const [rate, setRate] = useState(1)
  const [loop, setLoop] = useState(false)
  const [rateMenuOpen, setRateMenuOpen] = useState(false)
  const [hover, setHover] = useState(null)
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [isPip, setIsPip] = useState(false)

  // Track isSeeking via ref so the video-element effect doesn't have to depend
  // on it (otherwise tearing down + resetting state would happen on every click).
  const isSeekingRef = useRef(false)
  useEffect(() => {
    isSeekingRef.current = isSeeking
  }, [isSeeking])

  /* ── video element wiring ─────────────────────────────────── */
  useEffect(() => {
    const el = videoRef.current
    if (!el) return undefined

    setReady(false)
    setCurrent(0)
    setDuration(0)
    setBuffered(0)
    setPlaying(false)

    const updateDuration = () => {
      const d = el.duration
      if (Number.isFinite(d) && d > 0) setDuration(d)
    }
    const onLoaded = () => {
      updateDuration()
      setReady(true)
    }
    const onCanPlay = () => setReady(true)
    const onTime = () => {
      if (!isSeekingRef.current) setCurrent(el.currentTime)
    }
    const onProgress = () => {
      try {
        if (el.buffered.length > 0) setBuffered(el.buffered.end(el.buffered.length - 1))
      } catch {
        // ignore
      }
    }
    const onEnded = () => setPlaying(false)
    const onPlay = () => setPlaying(true)
    const onPause = () => setPlaying(false)
    const onError = () => setReady(false)
    const onEnterPip = () => setIsPip(true)
    const onLeavePip = () => setIsPip(false)

    el.addEventListener('loadedmetadata', onLoaded)
    el.addEventListener('durationchange', updateDuration)
    el.addEventListener('canplay', onCanPlay)
    el.addEventListener('timeupdate', onTime)
    el.addEventListener('progress', onProgress)
    el.addEventListener('ended', onEnded)
    el.addEventListener('play', onPlay)
    el.addEventListener('pause', onPause)
    el.addEventListener('error', onError)
    el.addEventListener('enterpictureinpicture', onEnterPip)
    el.addEventListener('leavepictureinpicture', onLeavePip)

    return () => {
      el.removeEventListener('loadedmetadata', onLoaded)
      el.removeEventListener('durationchange', updateDuration)
      el.removeEventListener('canplay', onCanPlay)
      el.removeEventListener('timeupdate', onTime)
      el.removeEventListener('progress', onProgress)
      el.removeEventListener('ended', onEnded)
      el.removeEventListener('play', onPlay)
      el.removeEventListener('pause', onPause)
      el.removeEventListener('error', onError)
      el.removeEventListener('enterpictureinpicture', onEnterPip)
      el.removeEventListener('leavepictureinpicture', onLeavePip)
    }
  }, [src])

  useEffect(() => {
    if (videoRef.current) videoRef.current.volume = volume
  }, [volume])
  useEffect(() => {
    if (videoRef.current) videoRef.current.muted = muted
  }, [muted])
  useEffect(() => {
    if (videoRef.current) videoRef.current.playbackRate = rate
  }, [rate])
  useEffect(() => {
    if (videoRef.current) videoRef.current.loop = loop
  }, [loop])

  /* ── fullscreen tracking ──────────────────────────────────── */
  useEffect(() => {
    const onFsChange = () => {
      setIsFullscreen(document.fullscreenElement === containerRef.current)
    }
    document.addEventListener('fullscreenchange', onFsChange)
    return () => document.removeEventListener('fullscreenchange', onFsChange)
  }, [])

  /* ── controls ─────────────────────────────────────────────── */
  const togglePlay = useCallback(() => {
    const el = videoRef.current
    if (!el) return
    if (el.paused) {
      const p = el.play()
      if (p && typeof p.then === 'function') p.catch(() => setPlaying(false))
    } else {
      el.pause()
    }
  }, [])

  const handleSeek = useCallback(
    (value) => {
      const el = videoRef.current
      if (!el) return
      let next = Number(value)
      if (!Number.isFinite(next) || next < 0) next = 0
      if (Number.isFinite(duration) && duration > 0 && next > duration) next = duration
      setCurrent(next)
      try {
        el.currentTime = next
      } catch {
        // ignore — seek before metadata is ready
      }
    },
    [duration],
  )

  const seekFromClientX = useCallback(
    (clientX) => {
      if (!Number.isFinite(duration) || duration <= 0) return
      const node = scrubberRef.current
      if (!node) return
      const rect = node.getBoundingClientRect()
      if (rect.width <= 0) return
      const ratio = Math.min(1, Math.max(0, (clientX - rect.left) / rect.width))
      handleSeek(ratio * duration)
    },
    [duration, handleSeek],
  )

  const skip = useCallback(
    (delta) => {
      const el = videoRef.current
      if (!el) return
      const target = Math.max(0, Math.min(duration || el.currentTime + delta, el.currentTime + delta))
      el.currentTime = target
      setCurrent(target)
    },
    [duration],
  )

  const cycleRate = useCallback((dir) => {
    setRate((curr) => {
      const idx = PLAYBACK_RATES.indexOf(curr)
      const safeIdx = idx === -1 ? PLAYBACK_RATES.indexOf(1) : idx
      const next = Math.max(0, Math.min(PLAYBACK_RATES.length - 1, safeIdx + dir))
      return PLAYBACK_RATES[next]
    })
  }, [])

  const toggleFullscreen = useCallback(async () => {
    const el = containerRef.current
    if (!el) return
    try {
      if (document.fullscreenElement === el) await document.exitFullscreen()
      else await el.requestFullscreen?.()
    } catch {
      // ignore — browser may block fullscreen request without user gesture
    }
  }, [])

  const togglePip = useCallback(async () => {
    const el = videoRef.current
    if (!el) return
    try {
      if (document.pictureInPictureElement === el) await document.exitPictureInPicture()
      else if (el.requestPictureInPicture) await el.requestPictureInPicture()
    } catch {
      // ignore — PiP may be disabled / unsupported
    }
  }, [])

  /* ── document-level drag-to-seek ──────────────────────────── */
  useEffect(() => {
    if (!isSeeking) return undefined
    const onMouseMove = (e) => seekFromClientX(e.clientX)
    const onMouseUp = () => setIsSeeking(false)
    const onTouchMove = (e) => {
      if (e.touches[0]) seekFromClientX(e.touches[0].clientX)
    }
    const onTouchEnd = () => setIsSeeking(false)
    document.addEventListener('mousemove', onMouseMove)
    document.addEventListener('mouseup', onMouseUp)
    document.addEventListener('touchmove', onTouchMove, { passive: true })
    document.addEventListener('touchend', onTouchEnd)
    return () => {
      document.removeEventListener('mousemove', onMouseMove)
      document.removeEventListener('mouseup', onMouseUp)
      document.removeEventListener('touchmove', onTouchMove)
      document.removeEventListener('touchend', onTouchEnd)
    }
  }, [isSeeking, seekFromClientX])

  /* ── keyboard shortcuts ───────────────────────────────────── */
  useEffect(() => {
    const handler = (e) => {
      if (!containerRef.current) return
      const target = e.target
      const tag = target?.tagName?.toLowerCase()
      if (tag === 'input' || tag === 'textarea' || target?.isContentEditable) return
      const isHovered = containerRef.current.matches(':hover')
      const hasFocus = containerRef.current.contains(document.activeElement)
      if (!isHovered && !hasFocus) return

      switch (e.key) {
        case ' ':
        case 'k':
        case 'K':
          e.preventDefault()
          togglePlay()
          break
        case 'ArrowLeft':
          e.preventDefault()
          skip(e.shiftKey ? -30 : -5)
          break
        case 'ArrowRight':
          e.preventDefault()
          skip(e.shiftKey ? 30 : 5)
          break
        case 'ArrowUp':
          e.preventDefault()
          setVolume((v) => Math.min(1, Math.round((v + 0.05) * 100) / 100))
          setMuted(false)
          break
        case 'ArrowDown':
          e.preventDefault()
          setVolume((v) => Math.max(0, Math.round((v - 0.05) * 100) / 100))
          break
        case 'm':
        case 'M':
          setMuted((m) => !m)
          break
        case 'l':
        case 'L':
          setLoop((l) => !l)
          break
        case 'f':
        case 'F':
          toggleFullscreen()
          break
        case ',':
          cycleRate(-1)
          break
        case '.':
          cycleRate(1)
          break
        default:
          break
      }
    }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [cycleRate, skip, togglePlay, toggleFullscreen])

  /* ── close rate menu on outside click ─────────────────────── */
  useEffect(() => {
    if (!rateMenuOpen) return undefined
    const onDocClick = (e) => {
      if (rateBtnRef.current && !rateBtnRef.current.contains(e.target)) {
        setRateMenuOpen(false)
      }
    }
    document.addEventListener('mousedown', onDocClick)
    return () => document.removeEventListener('mousedown', onDocClick)
  }, [rateMenuOpen])

  const onScrubberMouseMove = (e) => {
    if (!duration || !scrubberRef.current) return
    const rect = scrubberRef.current.getBoundingClientRect()
    const ratio = Math.min(1, Math.max(0, (e.clientX - rect.left) / rect.width))
    setHover({ x: ratio * rect.width, time: ratio * duration })
  }

  const progressPct = duration ? Math.min(100, (current / duration) * 100) : 0
  const bufferedPct = duration ? Math.min(100, (buffered / duration) * 100) : 0
  const remaining = useMemo(
    () => (duration ? Math.max(0, duration - current) : 0),
    [duration, current],
  )

  return (
    <div
      ref={containerRef}
      tabIndex={0}
      className={cn(
        'group/player relative rounded-2xl border bg-card shadow-sm shadow-black/5 outline-none transition-shadow focus-visible:ring-2 focus-visible:ring-ring/40',
        className,
      )}
    >
      {(title || subtitle) && (
        <div className="border-b border-border/60 px-4 py-3">
          {title ? (
            <p className="truncate font-heading text-sm font-semibold text-foreground">{title}</p>
          ) : null}
          {subtitle ? (
            <p className="truncate text-[11px] text-muted-foreground">{subtitle}</p>
          ) : null}
        </div>
      )}

      {/* Video surface */}
      <div className="relative aspect-video w-full overflow-hidden bg-black">
        <video
          ref={videoRef}
          src={src}
          preload="metadata"
          playsInline
          onClick={togglePlay}
          className="size-full object-contain"
        />
        {!ready && src ? (
          <div className="pointer-events-none absolute inset-0 flex items-center justify-center bg-black/40">
            <Loader2 className="size-8 animate-spin text-white/80" />
          </div>
        ) : null}
        {!playing && ready ? (
          <button
            type="button"
            onClick={togglePlay}
            aria-label="Play"
            className="absolute inset-0 flex items-center justify-center bg-black/30 transition-opacity hover:bg-black/40"
          >
            <span className="flex size-16 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-2xl shadow-black/50 ring-2 ring-white/20 transition hover:scale-105">
              <Play className="ml-1 size-7" />
            </span>
          </button>
        ) : null}
      </div>

      {/* Controls below the video */}
      <div className="space-y-3 px-4 py-3">
        {/* Scrubber */}
        <div className="space-y-1">
          <div
            ref={scrubberRef}
            role="slider"
            aria-label="Seek"
            aria-valuemin={0}
            aria-valuemax={duration || 0}
            aria-valuenow={current}
            tabIndex={0}
            className={cn(
              'group relative h-2 w-full overflow-visible rounded-full bg-muted/70 transition-[height]',
              duration > 0 ? 'cursor-pointer hover:h-2.5' : 'cursor-default opacity-70',
            )}
            onMouseMove={onScrubberMouseMove}
            onMouseLeave={() => setHover(null)}
            onMouseDown={(e) => {
              if (!Number.isFinite(duration) || duration <= 0) return
              e.preventDefault()
              setIsSeeking(true)
              seekFromClientX(e.clientX)
            }}
            onTouchStart={(e) => {
              if (!Number.isFinite(duration) || duration <= 0) return
              setIsSeeking(true)
              if (e.touches[0]) seekFromClientX(e.touches[0].clientX)
            }}
          >
            <div className="absolute inset-y-0 left-0 rounded-full bg-muted-foreground/25" style={{ width: `${bufferedPct}%` }} />
            <div className="absolute inset-y-0 left-0 rounded-full bg-gradient-to-r from-primary to-primary/80 transition-[width] duration-75" style={{ width: `${progressPct}%` }} />
            <div
              className="pointer-events-none absolute top-1/2 size-3 -translate-x-1/2 -translate-y-1/2 rounded-full bg-primary shadow ring-2 ring-background transition-opacity group-hover:opacity-100"
              style={{ left: `${progressPct}%`, opacity: isSeeking ? 1 : undefined }}
            />
            {hover && duration ? (
              <div
                className="pointer-events-none absolute -top-7 -translate-x-1/2 rounded-md bg-foreground px-1.5 py-0.5 font-mono text-[10px] font-semibold text-background shadow"
                style={{ left: `${hover.x}px` }}
              >
                {formatTime(hover.time)}
              </div>
            ) : null}
          </div>
          <div className="flex items-center justify-between font-mono text-[10px] tabular-nums text-muted-foreground">
            <span>{formatTime(current)}</span>
            <span>-{formatTime(remaining)}</span>
            <span>{duration ? formatTime(duration) : '—:—'}</span>
          </div>
        </div>

        {/* Buttons row */}
        <div className="flex flex-wrap items-center gap-1.5">
          <SkipButton onClick={() => skip(-30)} ariaLabel="Skip back 30 seconds" disabled={!ready}>
            <RotateCcw className="size-3.5" />
            <span className="text-[10px] font-bold tabular-nums">30</span>
          </SkipButton>
          <SkipButton onClick={() => skip(-5)} ariaLabel="Skip back 5 seconds" disabled={!ready}>
            <RotateCcw className="size-3.5" />
            <span className="text-[10px] font-bold tabular-nums">5</span>
          </SkipButton>
          <button
            type="button"
            onClick={togglePlay}
            disabled={!src}
            aria-label={playing ? 'Pause' : 'Play'}
            className={cn(
              'flex size-10 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-md transition',
              'hover:scale-[1.04] active:scale-[0.96] disabled:cursor-not-allowed disabled:opacity-50',
            )}
          >
            {!ready && src ? <Loader2 className="size-4 animate-spin" /> : playing ? <Pause className="size-4" /> : <Play className="ml-0.5 size-4" />}
          </button>
          <SkipButton onClick={() => skip(5)} ariaLabel="Skip forward 5 seconds" disabled={!ready}>
            <span className="text-[10px] font-bold tabular-nums">5</span>
            <RotateCw className="size-3.5" />
          </SkipButton>
          <SkipButton onClick={() => skip(30)} ariaLabel="Skip forward 30 seconds" disabled={!ready}>
            <span className="text-[10px] font-bold tabular-nums">30</span>
            <RotateCw className="size-3.5" />
          </SkipButton>

          <div className="ml-auto flex items-center gap-1.5">
            <ChipButton active={loop} onClick={() => setLoop((l) => !l)} ariaLabel={loop ? 'Disable loop' : 'Enable loop'} title={`Loop (L) ${loop ? '· on' : ''}`}>
              <Repeat className="size-3.5" />
            </ChipButton>

            <div ref={rateBtnRef} className="relative">
              <button
                type="button"
                onClick={() => setRateMenuOpen((o) => !o)}
                aria-label="Playback speed"
                aria-haspopup="menu"
                aria-expanded={rateMenuOpen}
                title="Playback speed (, and . to step)"
                className={cn(
                  'flex h-8 items-center gap-1 rounded-full border px-2.5 text-xs font-medium shadow-sm transition',
                  rate === 1
                    ? 'border-border bg-background text-foreground hover:bg-muted/60'
                    : 'border-primary/40 bg-primary/10 text-primary',
                )}
              >
                <Gauge className="size-3.5" />
                <span className="font-mono text-[11px] font-bold tabular-nums">{rate}×</span>
                <span className="text-[9px] font-normal uppercase tracking-wider text-muted-foreground">
                  {rate === 1 ? 'normal' : rate < 1 ? 'slow' : 'fast'}
                </span>
              </button>
              {rateMenuOpen ? (
                <div role="menu" className="absolute bottom-full right-0 z-50 mb-2 min-w-[140px] overflow-hidden rounded-lg border border-border bg-popover py-1 shadow-xl shadow-black/10">
                  <p className="px-2.5 pb-1 pt-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Speed</p>
                  {PLAYBACK_RATES.map((r) => {
                    const label = r === 1 ? 'normal' : r < 1 ? 'slow' : 'fast'
                    return (
                      <button
                        key={r}
                        type="button"
                        role="menuitemradio"
                        aria-checked={r === rate}
                        onClick={() => {
                          setRate(r)
                          setRateMenuOpen(false)
                        }}
                        className={cn(
                          'flex w-full items-center justify-between gap-3 px-2.5 py-1.5 text-left text-xs transition-colors hover:bg-accent/60',
                          r === rate ? 'font-semibold text-primary' : 'text-foreground',
                        )}
                      >
                        <span className="font-mono tabular-nums">{r}×</span>
                        <span className="flex items-center gap-1.5">
                          <span className="text-[9px] uppercase tracking-wider text-muted-foreground">{label}</span>
                          {r === rate ? <Check className="size-3 text-primary" /> : null}
                        </span>
                      </button>
                    )
                  })}
                </div>
              ) : null}
            </div>

            <VolumeControl volume={volume} muted={muted} onToggleMute={() => setMuted((m) => !m)} onChange={(next) => { setVolume(next); setMuted(false) }} />

            <ChipButton active={isPip} onClick={togglePip} ariaLabel="Picture in picture" title="Picture-in-picture">
              <PictureInPicture className="size-3.5" />
            </ChipButton>
            <ChipButton active={isFullscreen} onClick={toggleFullscreen} ariaLabel={isFullscreen ? 'Exit fullscreen' : 'Fullscreen'} title="Fullscreen (F)">
              {isFullscreen ? <Minimize className="size-3.5" /> : <Maximize className="size-3.5" />}
            </ChipButton>

            {downloadHref ? (
              <a
                href={downloadHref}
                target="_blank"
                rel="noreferrer"
                title="Open original file"
                aria-label="Download / open original file"
                className="flex size-8 items-center justify-center rounded-full border border-border bg-background/70 text-muted-foreground transition hover:bg-background hover:text-foreground"
              >
                <Download className="size-3.5" />
              </a>
            ) : null}
          </div>
        </div>

        <p className="hidden text-[10px] text-muted-foreground/70 sm:block">
          <kbd className="rounded border bg-background px-1 font-mono text-[9px]">space</kbd> play ·{' '}
          <kbd className="rounded border bg-background px-1 font-mono text-[9px]">←/→</kbd> 5s ·{' '}
          <kbd className="rounded border bg-background px-1 font-mono text-[9px]">⇧←/→</kbd> 30s ·{' '}
          <kbd className="rounded border bg-background px-1 font-mono text-[9px]">↑/↓</kbd> volume ·{' '}
          <kbd className="rounded border bg-background px-1 font-mono text-[9px]">M</kbd> mute ·{' '}
          <kbd className="rounded border bg-background px-1 font-mono text-[9px]">L</kbd> loop ·{' '}
          <kbd className="rounded border bg-background px-1 font-mono text-[9px]">F</kbd> fullscreen ·{' '}
          <kbd className="rounded border bg-background px-1 font-mono text-[9px]">,/.</kbd> speed
        </p>
      </div>
    </div>
  )
}

function SkipButton({ onClick, ariaLabel, disabled, children }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={ariaLabel}
      title={ariaLabel}
      className="flex h-9 items-center gap-1 rounded-full border border-border bg-background/70 px-2.5 text-foreground/80 shadow-sm transition hover:bg-background hover:text-foreground disabled:opacity-40"
    >
      {children}
    </button>
  )
}

function VolumeControl({ volume, muted, onToggleMute, onChange }) {
  const effective = muted ? 0 : volume
  const fillPct = Math.max(0, Math.min(100, effective * 100))
  let iconColor = 'text-muted-foreground'
  if (muted || effective === 0) iconColor = 'text-muted-foreground'
  else if (effective < 0.4) iconColor = 'text-emerald-500'
  else if (effective < 0.8) iconColor = 'text-amber-500'
  else iconColor = 'text-rose-500'

  return (
    <div className="flex items-center gap-1.5">
      <button
        type="button"
        onClick={onToggleMute}
        aria-label={muted ? 'Unmute' : 'Mute'}
        className={cn('flex size-8 items-center justify-center rounded-full transition hover:bg-muted/60', iconColor)}
      >
        {muted || effective === 0 ? <VolumeX className="size-4" /> : <Volume2 className="size-4" />}
      </button>
      <input
        type="range"
        min="0"
        max="1"
        step="0.01"
        value={effective}
        onChange={(e) => onChange(Number(e.target.value))}
        aria-label="Volume"
        style={{
          backgroundImage:
            'linear-gradient(to right, rgb(16 185 129) 0%, rgb(245 158 11) 55%, rgb(244 63 94) 100%)',
          backgroundSize: `${fillPct}% 100%`,
          backgroundRepeat: 'no-repeat',
        }}
        className={cn(
          'hidden h-2 w-20 cursor-pointer appearance-none rounded-full bg-muted/70 sm:block',
          '[&::-webkit-slider-thumb]:appearance-none',
          '[&::-webkit-slider-thumb]:size-3.5',
          '[&::-webkit-slider-thumb]:rounded-full',
          '[&::-webkit-slider-thumb]:bg-background',
          '[&::-webkit-slider-thumb]:shadow-md',
          '[&::-webkit-slider-thumb]:ring-1',
          '[&::-webkit-slider-thumb]:ring-foreground/30',
          '[&::-webkit-slider-thumb]:transition-transform',
          'hover:[&::-webkit-slider-thumb]:scale-110',
          '[&::-moz-range-thumb]:size-3.5',
          '[&::-moz-range-thumb]:rounded-full',
          '[&::-moz-range-thumb]:border-0',
          '[&::-moz-range-thumb]:bg-background',
          '[&::-moz-range-thumb]:shadow-md',
        )}
      />
    </div>
  )
}

function ChipButton({ active, onClick, ariaLabel, title, children }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={ariaLabel}
      aria-pressed={active}
      title={title}
      className={cn(
        'flex h-8 items-center gap-1 rounded-full border px-2.5 text-xs font-medium shadow-sm transition',
        active
          ? 'border-primary/30 bg-primary/10 text-primary'
          : 'border-border bg-background/70 text-muted-foreground hover:bg-background hover:text-foreground',
      )}
    >
      {children}
    </button>
  )
}

export { VideoPlayer }
