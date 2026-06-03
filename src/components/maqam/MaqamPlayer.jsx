import { useCallback, useEffect, useRef, useState } from 'react'
import { Loader2, Music2 } from 'lucide-react'

import { AudioPlayer } from '@/components/ui/audio-player'
import { cn } from '@/lib/utils'
import {
  endMaqamListen,
  fetchMaqamStreamUrl,
  progressMaqamListen,
  startMaqamListen,
} from '@/services/maqam'

// Flush accumulated listen time to the backend on this cadence (seconds).
// Kept under the server-side 60s/ping cap so a single flush never exceeds it.
const FLUSH_INTERVAL_SECONDS = 15

function genSessionKey() {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID()
  }
  return `sess-${Date.now()}-${Math.random().toString(16).slice(2)}`
}

/**
 * Authenticated, range-fetched maqam audio player with listen tracking.
 *
 * - Pulls the audio bytes through the auth'd streaming endpoint as a blob
 *   (the raw S3 URL is never exposed; the <audio> element can't send the
 *   Bearer token itself, so we fetch + object-URL it).
 * - Opens a listen session on first play, flushes progress every
 *   FLUSH_INTERVAL_SECONDS while playing, and closes the session on end /
 *   unmount. `track` can be set false for admin/employee preview (no vote
 *   permission → the listen endpoints would 403).
 *
 * Props:
 *   maqamCode   string
 *   hasAudio    boolean         — whether the record actually has audio
 *   title/subtitle              — passed through to AudioPlayer
 *   track       boolean         — drive listen tracking (default true)
 *   labels      { loading, error, unavailable } — localized status copy
 *   onProgress  () => void      — optional; fired after each successful flush
 *   className
 */
export function MaqamPlayer({
  maqamCode,
  hasAudio = true,
  title,
  subtitle,
  track = true,
  labels = {},
  onProgress,
  className,
}) {
  const [src, setSrc] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(false)

  // Listen-tracking state held in refs so the 1s ticker and the player
  // callbacks share it without re-rendering.
  const sessionKeyRef = useRef(null)
  const startingRef = useRef(false)
  const accRef = useRef(0) // listened seconds not yet flushed
  const sinceFlushRef = useRef(0)
  const posRef = useRef(0) // latest playback position (seconds)
  const playingRef = useRef(false)
  const onProgressRef = useRef(onProgress)
  useEffect(() => {
    onProgressRef.current = onProgress
  }, [onProgress])

  // ── Load the audio blob via the authenticated stream endpoint ─────────────
  useEffect(() => {
    if (!hasAudio || !maqamCode) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setSrc('')
      return undefined
    }
    let url = ''
    let cancelled = false
    const ctrl = new AbortController()
    setLoading(true)
    setError(false)
    fetchMaqamStreamUrl(maqamCode, { signal: ctrl.signal })
      .then((objectUrl) => {
        if (cancelled) {
          URL.revokeObjectURL(objectUrl)
          return
        }
        url = objectUrl
        setSrc(objectUrl)
      })
      .catch((err) => {
        if (err?.code === 'ERR_CANCELED' || cancelled) return
        setError(true)
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
      ctrl.abort()
      if (url) URL.revokeObjectURL(url)
    }
  }, [maqamCode, hasAudio])

  // ── Flush helpers ─────────────────────────────────────────────────────────
  const flushProgress = useCallback(async () => {
    if (!track) return
    const key = sessionKeyRef.current
    const add = accRef.current
    if (!key || add <= 0) return
    accRef.current = 0
    sinceFlushRef.current = 0
    try {
      await progressMaqamListen(maqamCode, {
        sessionKey: key,
        addSeconds: Math.min(60, Math.round(add)),
        positionSeconds: Math.round(posRef.current),
      })
      onProgressRef.current?.()
    } catch {
      // best-effort; drop this delta rather than retry-storm
    }
  }, [maqamCode, track])

  const endSession = useCallback(async () => {
    if (!track) return
    const key = sessionKeyRef.current
    if (!key) return
    const add = accRef.current
    sessionKeyRef.current = null
    accRef.current = 0
    sinceFlushRef.current = 0
    startingRef.current = false
    try {
      await endMaqamListen(maqamCode, {
        sessionKey: key,
        addSeconds: Math.min(60, Math.round(add)),
        positionSeconds: Math.round(posRef.current),
      })
      onProgressRef.current?.()
    } catch {
      // ignore
    }
  }, [maqamCode, track])

  const ensureSession = useCallback(async () => {
    if (!track) return
    if (sessionKeyRef.current || startingRef.current) return
    startingRef.current = true
    const key = genSessionKey()
    try {
      await startMaqamListen(maqamCode, {
        sessionKey: key,
        startPositionSeconds: Math.round(posRef.current),
      })
      sessionKeyRef.current = key
    } catch {
      // tracking unavailable (e.g. not on panel) — leave session unset so we
      // simply don't record; playback is unaffected.
    } finally {
      startingRef.current = false
    }
  }, [maqamCode, track])

  // ── 1s ticker: accrue listened time while playing, flush periodically ─────
  useEffect(() => {
    if (!track) return undefined
    const id = setInterval(() => {
      if (!playingRef.current) return
      accRef.current += 1
      sinceFlushRef.current += 1
      if (sinceFlushRef.current >= FLUSH_INTERVAL_SECONDS) {
        flushProgress()
      }
    }, 1000)
    return () => clearInterval(id)
  }, [track, flushProgress])

  // ── End the session when the player unmounts or the record changes ────────
  useEffect(() => {
    return () => {
      playingRef.current = false
      endSession()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [maqamCode])

  // ── Player callbacks ──────────────────────────────────────────────────────
  const handlePlayingChange = useCallback(
    (isPlaying) => {
      playingRef.current = isPlaying
      if (isPlaying) {
        ensureSession()
      } else {
        flushProgress()
      }
    },
    [ensureSession, flushProgress],
  )

  const handleTimeUpdate = useCallback((t) => {
    if (Number.isFinite(t)) posRef.current = t
  }, [])

  const handleEnded = useCallback(() => {
    playingRef.current = false
    endSession()
  }, [endSession])

  // ── Render ────────────────────────────────────────────────────────────────
  if (!hasAudio) {
    return (
      <div
        className={cn(
          'flex items-center justify-center gap-2 rounded-2xl border border-dashed border-border bg-muted/20 px-6 py-12 text-center text-sm text-muted-foreground',
          className,
        )}
      >
        <Music2 className="size-4" />
        {labels.unavailable || 'Audio is not available.'}
      </div>
    )
  }

  if (loading && !src) {
    return (
      <div
        className={cn(
          'flex items-center justify-center gap-2 rounded-2xl border border-border bg-muted/20 px-6 py-12 text-center text-sm text-muted-foreground',
          className,
        )}
      >
        <Loader2 className="size-4 animate-spin" />
        {labels.loading || 'Loading audio…'}
      </div>
    )
  }

  if (error || !src) {
    return (
      <div
        className={cn(
          'rounded-2xl border border-destructive/40 bg-destructive/5 px-6 py-10 text-center text-sm text-destructive',
          className,
        )}
      >
        {labels.error || 'Could not load the audio. Please try again.'}
      </div>
    )
  }

  return (
    <AudioPlayer
      src={src}
      title={title}
      subtitle={subtitle}
      className={className}
      onPlayingChange={handlePlayingChange}
      onTimeUpdate={handleTimeUpdate}
      onEnded={handleEnded}
    />
  )
}
