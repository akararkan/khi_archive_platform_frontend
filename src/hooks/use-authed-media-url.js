// Shared hook for previewing protected staff/admin media (audio, video,
// image, PDF) that requires an Authorization header the media tag itself
// can't send.
//
// Native <audio>/<video>/<img>/<iframe> `src` attributes cannot carry a
// Bearer token. The authenticated stream/view endpoints
// (`/api/audio/{code}/stream`, `/api/video/{code}/stream`,
// `/api/image/{code}/view`, …) require one, so the only way to preview them
// from a plain element is to fetch the bytes through the shared `apiClient`
// (which attaches the token / cookies via its interceptors) and hand the
// element a local `blob:` object URL instead.
//
// This mirrors the pattern already used for maqam audio
// (see services/maqam.js#fetchMaqamStreamUrl) generalized for every media
// kind. Guest/public pages should NOT use this hook — their routes are
// `permitAll`, and fetching a blob upfront would throw away the browser's
// native HTTP Range-request seeking for large audio/video.
//
// A 404 here means the underlying file is genuinely missing (see
// FRONTEND_MEDIA_URL_GUIDE.md #4) — retrying it would just 404 again, so we
// surface `notFound` and stop. Any other failure (5xx, network blip) gets a
// couple of short backoff retries before giving up and degrading to a plain
// resolved URL, since those are typically transient.
import { useEffect, useState } from 'react'

import { apiClient } from '@/lib/api-client'
import { resolveMediaUrl } from '@/lib/media-url'

const RETRY_DELAYS_MS = [500, 1500]

function wait(ms, signal) {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(resolve, ms)
    signal.addEventListener('abort', () => {
      clearTimeout(timer)
      reject(new DOMException('aborted', 'AbortError'))
    })
  })
}

/**
 * @param {string} path Relative or absolute media path, e.g.
 *   `/api/audio/AUD-001/stream`.
 * @param {{ enabled?: boolean }} [options]
 * @returns {{ url: string, loading: boolean, notFound: boolean }}
 */
export function useAuthedMediaUrl(path, { enabled = true } = {}) {
  const [state, setState] = useState({ url: '', loading: false, notFound: false })

  useEffect(() => {
    if (!enabled || !path) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setState({ url: '', loading: false, notFound: false })
      return undefined
    }

    let objectUrl = ''
    let cancelled = false
    const ctrl = new AbortController()
    setState({ url: '', loading: true, notFound: false })

    async function load() {
      for (let attempt = 0; attempt <= RETRY_DELAYS_MS.length; attempt += 1) {
        try {
          const res = await apiClient.get(resolveMediaUrl(path), {
            responseType: 'blob',
            signal: ctrl.signal,
            // Audio/video previews can be large; don't let the default 15s
            // client timeout cut off a slow admin-panel download.
            timeout: 0,
            // VideoStreamAPI (unlike Audio/Image/Text) ALWAYS chunks a
            // no-Range request down to a fixed 2MB window — it assumes the
            // caller is a native <video> that will follow up with its own
            // Range requests as it plays. We're doing a single one-shot
            // blob download instead, so without this header every video
            // over 2MB silently arrived truncated (unparseable container —
            // "Cannot parse metadata" in Firefox; a frozen few seconds of
            // playback elsewhere). An explicit open-ended Range asks every
            // stream endpoint for the whole file in one response; audio/
            // text already do that by default and are unaffected, image
            // ignores Range entirely.
            headers: { Range: 'bytes=0-' },
          })
          if (cancelled) return
          objectUrl = URL.createObjectURL(res.data)
          setState({ url: objectUrl, loading: false, notFound: false })
          return
        } catch (err) {
          if (cancelled || err?.code === 'ERR_CANCELED') return
          if (err?.response?.status === 404) {
            setState({ url: '', loading: false, notFound: true })
            return
          }
          if (attempt < RETRY_DELAYS_MS.length) {
            try {
              await wait(RETRY_DELAYS_MS[attempt], ctrl.signal)
              continue
            } catch {
              return
            }
          }
          // Degrade gracefully instead of a hard failure: a field the
          // backend hasn't migrated to the authenticated proxy yet may
          // still be a plain, CORS-open URL that a direct
          // <img>/<audio>/<video> src can load even though a cross-origin
          // blob fetch can't read its bytes. If it's genuinely unreachable,
          // the caller's own onError/player error handling takes over from
          // here exactly as it did before.
          setState({ url: resolveMediaUrl(path), loading: false, notFound: false })
        }
      }
    }

    load()

    return () => {
      cancelled = true
      ctrl.abort()
      if (objectUrl) URL.revokeObjectURL(objectUrl)
    }
  }, [path, enabled])

  return state
}

