// Opportunistic HLS upgrade for audio/video playback.
//
// Today the backend only exposes the byte-range progressive stream endpoints
// (`/api/guest/audio/{code}/stream`, etc). The Phase-2 goal is an HLS
// playlist per record (`/api/guest/audio/{code}/playlist.m3u8`), chunked into
// small segments so no single request ever hands out "the file".
//
// Rather than gate the frontend on that backend work landing first, this
// hook probes for the manifest with a small cached request and transparently
// upgrades playback to it the moment it exists — with zero further frontend
// changes required. Until then it falls back to the current direct stream
// URL exactly as before, so this is a strict, safe enhancement.
import { useEffect, useState } from 'react'

import { apiClient } from '@/lib/api-client'

// Cache probe results for the lifetime of the tab — avoids re-probing the
// same record's manifest on every render/navigation.
const probedAvailability = new Map()

async function probeManifest(url, signal) {
  if (probedAvailability.has(url)) return probedAvailability.get(url)
  try {
    const res = await apiClient.get(url, {
      signal,
      timeout: 4000,
      // A 1-byte range keeps this cheap even if a proxy ignores Range and
      // returns the (tiny) manifest body in full.
      headers: { Range: 'bytes=0-0' },
      validateStatus: () => true,
    })
    const available = res.status === 200 || res.status === 206
    probedAvailability.set(url, available)
    return available
  } catch {
    probedAvailability.set(url, false)
    return false
  }
}

/**
 * @param {{ hlsUrl?: string, directUrl?: string, enabled?: boolean }} options
 *   `hlsUrl` and `directUrl` must already be fully-resolved absolute URLs
 *   (see `resolveMediaUrl`).
 * @returns {string} the URL to feed the player right now.
 */
export function useHlsFallbackSource({ hlsUrl, directUrl, enabled = true }) {
  const [src, setSrc] = useState(() => (hlsUrl && probedAvailability.get(hlsUrl) ? hlsUrl : directUrl || ''))

  useEffect(() => {
    if (!enabled || !hlsUrl) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setSrc(directUrl || '')
      return undefined
    }
    if (probedAvailability.get(hlsUrl)) {
      setSrc(hlsUrl)
      return undefined
    }

    let cancelled = false
    const ctrl = new AbortController()
    // Don't block playback on the probe — start from the known-good
    // progressive URL and swap to HLS only once it's confirmed available.
    setSrc(directUrl || '')
    probeManifest(hlsUrl, ctrl.signal).then((available) => {
      if (!cancelled && available) setSrc(hlsUrl)
    })
    return () => {
      cancelled = true
      ctrl.abort()
    }
  }, [hlsUrl, directUrl, enabled])

  return src
}
