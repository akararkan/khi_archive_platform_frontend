import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  Check,
  Download,
  Gauge,
  Loader2,
  Pause,
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

function AudioPlayer({ src, title, subtitle, downloadHref, className }) {
  const containerRef = useRef(null)
  const audioRef = useRef(null)
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
  const [hover, setHover] = useState(null) // { x, time }

  // Track isSeeking via ref so the audio-element effect below doesn't have to
  // depend on it. Including it in the deps caused the effect to tear down and
  // reset ready/duration/current to 0 every time the user clicked the scrubber,
  // which made the player appear to "crash" / re-enter the loading spinner.
  const isSeekingRef = useRef(false)
  useEffect(() => {
    isSeekingRef.current = isSeeking
  }, [isSeeking])

  /* ── audio element wiring ─────────────────────────────────── */
  useEffect(() => {
    const el = audioRef.current
    if (!el) return undefined

    // Reset visible state when the source changes.
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
    const onCanPlay = () => setReady(true)
    const onError = () => setReady(false)

    el.addEventListener('loadedmetadata', onLoaded)
    // VBR mp3s often only get a real duration after this event fires, so we
    // listen for it to keep the scrubber responsive on those files.
    el.addEventListener('durationchange', updateDuration)
    el.addEventListener('canplay', onCanPlay)
    el.addEventListener('timeupdate', onTime)
    el.addEventListener('progress', onProgress)
    el.addEventListener('ended', onEnded)
    el.addEventListener('play', onPlay)
    el.addEventListener('pause', onPause)
    el.addEventListener('error', onError)

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
    }
  }, [src])

  useEffect(() => {
    if (audioRef.current) audioRef.current.volume = volume
  }, [volume])

  useEffect(() => {
    if (audioRef.current) audioRef.current.muted = muted
  }, [muted])

  useEffect(() => {
    if (audioRef.current) audioRef.current.playbackRate = rate
  }, [rate])

  useEffect(() => {
    if (audioRef.current) audioRef.current.loop = loop
  }, [loop])

  /* ── controls ─────────────────────────────────────────────── */
  const togglePlay = useCallback(() => {
    const el = audioRef.current
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
      const el = audioRef.current
      if (!el) return
      let next = Number(value)
      if (!Number.isFinite(next) || next < 0) next = 0
      if (Number.isFinite(duration) && duration > 0 && next > duration) next = duration
      setCurrent(next)
      try {
        el.currentTime = next
      } catch {
        // Some browsers throw if currentTime is set before metadata has loaded
        // or before the source has been resolved — ignore and let the UI catch
        // up on the next loadedmetadata event.
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
      const el = audioRef.current
      if (!el) return
      const target = Math.max(0, Math.min(duration || el.currentTime + delta, el.currentTime + delta))
      el.currentTime = target
      setCurrent(target)
    },
    [duration],
  )

  const cycleRate = useCallback((dir) => {
    setRate((current) => {
      const idx = PLAYBACK_RATES.indexOf(current)
      const safeIdx = idx === -1 ? PLAYBACK_RATES.indexOf(1) : idx
      const next = Math.max(0, Math.min(PLAYBACK_RATES.length - 1, safeIdx + dir))
      return PLAYBACK_RATES[next]
    })
  }, [])

  /* ── keyboard shortcuts ───────────────────────────────────── */
  useEffect(() => {
    const handler = (e) => {
      if (!containerRef.current) return
      const target = e.target
      const tag = target?.tagName?.toLowerCase()
      if (tag === 'input' || tag === 'textarea' || target?.isContentEditable) return
      // Only respond when our player is hovered OR a control inside it has focus.
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
        case '<':
        case ',':
          cycleRate(-1)
          break
        case '>':
        case '.':
          cycleRate(1)
          break
        default:
          break
      }
    }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [cycleRate, skip, togglePlay])

  /* ── document-level drag-to-seek listeners while user is dragging ── */
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

  /* ── scrubber hover preview ───────────────────────────────── */
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
        // No overflow-hidden here on purpose — the playback-rate popover opens
        // upward and would be clipped if the container clipped its overflow.
        'group/player relative rounded-2xl border bg-gradient-to-br from-primary/10 via-card to-muted/30 p-4 shadow-sm shadow-black/5 outline-none transition-shadow focus-visible:ring-2 focus-visible:ring-ring/40 sm:p-5',
        className,
      )}
    >
      <audio ref={audioRef} src={src} preload="metadata" className="hidden" />

      {(title || subtitle) && (
        <div className="mb-4 min-w-0">
          {title ? (
            <p className="truncate font-heading text-sm font-semibold text-foreground">{title}</p>
          ) : null}
          {subtitle ? (
            <p className="truncate text-[11px] text-muted-foreground">{subtitle}</p>
          ) : null}
        </div>
      )}

      {/* Scrubber — click anywhere on the track to seek; drag to scrub. */}
      <div className="mb-3 space-y-1.5">
        <div
          ref={scrubberRef}
          role="slider"
          aria-label="Seek"
          aria-valuemin={0}
          aria-valuemax={duration || 0}
          aria-valuenow={current}
          tabIndex={0}
          className={cn(
            'group relative h-2.5 w-full overflow-visible rounded-full bg-muted/70 transition-[height]',
            duration > 0 ? 'cursor-pointer hover:h-3' : 'cursor-default opacity-70',
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
          <div
            className="absolute inset-y-0 left-0 rounded-full bg-muted-foreground/25"
            style={{ width: `${bufferedPct}%` }}
          />
          <div
            className="absolute inset-y-0 left-0 rounded-full bg-gradient-to-r from-primary to-primary/80 transition-[width] duration-75"
            style={{ width: `${progressPct}%` }}
          />
          <div
            className="pointer-events-none absolute top-1/2 size-3.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-primary shadow ring-2 ring-background transition-opacity group-hover:opacity-100"
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
        <div className="flex items-center justify-between font-mono text-[11px] tabular-nums text-muted-foreground">
          <span>{formatTime(current)}</span>
          <span>-{formatTime(remaining)}</span>
          <span>{duration ? formatTime(duration) : '—:—'}</span>
        </div>
      </div>

      {/* Controls */}
      <div className="flex flex-wrap items-center gap-2">
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
            'flex size-12 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg shadow-primary/30 ring-1 ring-primary/20 transition',
            'hover:scale-[1.04] active:scale-[0.96] disabled:cursor-not-allowed disabled:opacity-50',
          )}
        >
          {!ready && src ? (
            <Loader2 className="size-5 animate-spin" />
          ) : playing ? (
            <Pause className="size-5" />
          ) : (
            <Play className="ml-0.5 size-5" />
          )}
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
          {/* Loop */}
          <ChipButton
            active={loop}
            onClick={() => setLoop((l) => !l)}
            ariaLabel={loop ? 'Disable loop' : 'Enable loop'}
            title={`Loop (L) ${loop ? '· on' : ''}`}
          >
            <Repeat className="size-3.5" />
          </ChipButton>

          {/* Playback rate — always shows the current speed (including 1×) in
              the active style so the user always sees the value clearly. */}
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
              {rate !== 1 ? (
                <span className="text-[9px] font-normal uppercase tracking-wider text-muted-foreground">
                  {rate < 1 ? 'slow' : 'fast'}
                </span>
              ) : (
                <span className="text-[9px] font-normal uppercase tracking-wider text-muted-foreground">
                  normal
                </span>
              )}
            </button>
            {rateMenuOpen ? (
              <div
                role="menu"
                className="absolute bottom-full right-0 z-50 mb-2 min-w-[140px] overflow-hidden rounded-lg border border-border bg-popover py-1 shadow-xl shadow-black/10"
              >
                <p className="px-2.5 pb-1 pt-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                  Speed
                </p>
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
                        <span className="text-[9px] uppercase tracking-wider text-muted-foreground">
                          {label}
                        </span>
                        {r === rate ? <Check className="size-3 text-primary" /> : null}
                      </span>
                    </button>
                  )
                })}
              </div>
            ) : null}
          </div>

          {/* Volume */}
          <VolumeControl
            volume={volume}
            muted={muted}
            onToggleMute={() => setMuted((m) => !m)}
            onChange={(next) => {
              setVolume(next)
              setMuted(false)
            }}
          />

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

      <p className="mt-3 hidden text-[10px] text-muted-foreground/70 sm:block">
        <kbd className="rounded border bg-background px-1 font-mono text-[9px]">space</kbd> play ·{' '}
        <kbd className="rounded border bg-background px-1 font-mono text-[9px]">←/→</kbd> skip 5s ·{' '}
        <kbd className="rounded border bg-background px-1 font-mono text-[9px]">⇧←/→</kbd> 30s ·{' '}
        <kbd className="rounded border bg-background px-1 font-mono text-[9px]">↑/↓</kbd> volume ·{' '}
        <kbd className="rounded border bg-background px-1 font-mono text-[9px]">M</kbd> mute ·{' '}
        <kbd className="rounded border bg-background px-1 font-mono text-[9px]">L</kbd> loop ·{' '}
        <kbd className="rounded border bg-background px-1 font-mono text-[9px]">,/.</kbd> speed
      </p>
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

  // Icon color tracks volume so the speaker glyph itself reads as a meter.
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
        className={cn(
          'flex size-8 items-center justify-center rounded-full transition hover:bg-muted/60',
          iconColor,
        )}
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
          // Vibrant green→amber→red fill, sized to the current volume so a higher
          // volume reveals more of the warmer end of the meter — classic VU look.
          backgroundImage:
            'linear-gradient(to right, rgb(16 185 129) 0%, rgb(245 158 11) 55%, rgb(244 63 94) 100%)',
          backgroundSize: `${fillPct}% 100%`,
          backgroundRepeat: 'no-repeat',
        }}
        className={cn(
          'hidden h-2 w-24 cursor-pointer appearance-none rounded-full bg-muted/70 sm:block',
          // Thumb (Chromium / Safari)
          '[&::-webkit-slider-thumb]:appearance-none',
          '[&::-webkit-slider-thumb]:size-3.5',
          '[&::-webkit-slider-thumb]:rounded-full',
          '[&::-webkit-slider-thumb]:bg-background',
          '[&::-webkit-slider-thumb]:shadow-md',
          '[&::-webkit-slider-thumb]:ring-1',
          '[&::-webkit-slider-thumb]:ring-foreground/30',
          '[&::-webkit-slider-thumb]:transition-transform',
          'hover:[&::-webkit-slider-thumb]:scale-110',
          // Thumb (Firefox)
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

export { AudioPlayer }
