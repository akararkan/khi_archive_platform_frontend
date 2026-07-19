// Attaches a playback source to a raw <audio>/<video> element, transparently
// using hls.js for `.m3u8` manifests (falling back to native HLS support on
// Safari, which needs neither hls.js nor any special handling) and a plain
// `src` assignment for everything else (the existing byte-range progressive
// stream endpoints).
//
// This is the browser-side half of the "never expose a single downloadable
// file" pattern: once the backend starts publishing an HLS playlist for a
// track, the only frontend change needed is which URL gets passed in here —
// the element wiring itself already understands both shapes.
import Hls from 'hls.js'

const HLS_URL_RE = /\.m3u8(\?|#|$)/i

export function isHlsUrl(url) {
  return HLS_URL_RE.test(String(url || ''))
}

/**
 * @param {HTMLMediaElement} el
 * @param {string} url
 * @param {{ onFatalError?: (data: unknown) => void }} [options]
 * @returns {() => void} cleanup — call before re-attaching or on unmount.
 */
export function attachMediaSource(el, url, { onFatalError } = {}) {
  if (!el) return () => {}

  if (!url) {
    el.removeAttribute('src')
    try {
      el.load?.()
    } catch {
      // ignore — some browsers throw if load() runs with no source at all
    }
    return () => {}
  }

  if (!isHlsUrl(url)) {
    el.src = url
    return () => {}
  }

  // Safari (macOS + iOS) plays HLS natively via the plain `src` attribute —
  // preferred there since it keeps OS-level AirPlay/PiP integration.
  const nativeHlsSupport =
    typeof el.canPlayType === 'function' && el.canPlayType('application/vnd.apple.mpegurl') !== ''
  if (nativeHlsSupport) {
    el.src = url
    return () => {}
  }

  if (Hls.isSupported()) {
    const hls = new Hls({ maxBufferLength: 30 })
    let destroyed = false
    hls.on(Hls.Events.ERROR, (_event, data) => {
      if (destroyed || !data?.fatal) return
      onFatalError?.(data)
      switch (data.type) {
        case Hls.ErrorTypes.NETWORK_ERROR:
          hls.startLoad()
          break
        case Hls.ErrorTypes.MEDIA_ERROR:
          hls.recoverMediaError()
          break
        default:
          hls.destroy()
          break
      }
    })
    hls.loadSource(url)
    hls.attachMedia(el)
    return () => {
      destroyed = true
      hls.destroy()
    }
  }

  // No HLS support at all — let the element try the manifest URL directly;
  // it will simply fail to play, same as any other unsupported media type.
  el.src = url
  return () => {}
}

/** Conventional HLS manifest path for a given media kind/code. */
export function buildHlsPlaylistPath(kind, code, { guest = true } = {}) {
  if (!kind || !code) return ''
  const base = guest ? `/api/guest/${kind}/${code}` : `/api/${kind}/${code}`
  return `${base}/playlist.m3u8`
}
