import { useEffect, useRef, useState } from 'react'
import { Loader2, Maximize, Minimize, Plus, Minus, RotateCcw, ImageOff } from 'lucide-react'
import OpenSeadragon from 'openseadragon'

import KhiLogoWatermark from '@/components/khi/KhiLogoWatermark'
import { cn } from '@/lib/utils'

function stopProtectedMediaEvent(event) {
  event.preventDefault()
  event.stopPropagation()
}

function ControlButton({ onClick, label, children }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      title={label}
      className="grid size-8 place-items-center rounded-full border border-border/60 bg-background/85 text-foreground shadow-sm backdrop-blur-md transition hover:bg-background"
    >
      {children}
    </button>
  )
}

/**
 * Deep-zoom pan/zoom image viewer built on OpenSeadragon.
 *
 * Points at the secure, application-controlled image endpoint — never a raw
 * storage URL — and gives guests the same "zoom into any corner" experience
 * a IIIF/tile-pyramid viewer would, without requiring the backend to
 * generate a tile pyramid first:
 *
 *  - `src` (the common case today) is handed to OpenSeadragon as a "simple
 *    image" source. Pan/zoom/pinch all work immediately against the single
 *    image the protected endpoint returns.
 *  - `tileSources` accepts a real DZI/IIIF tile pyramid config for the day
 *    the backend starts generating one (see PRIVATE_MEDIA_STREAMING docs,
 *    Phase 2B) — OpenSeadragon then streams only the tiles visible at the
 *    current zoom level instead of the whole image. Nothing else here needs
 *    to change to benefit from that upgrade.
 *
 * Right-click/drag-save prevention is a minor speed bump only (consistent
 * with AudioPlayer/VideoPlayer's `protectedMode`) — it does not, and cannot,
 * make guest-visible content uncopyable.
 */
function DeepZoomViewer({ src, tileSources, alt = '', className, protectedMode = true, onError }) {
  const rootRef = useRef(null)
  const containerRef = useRef(null)
  const viewerRef = useRef(null)
  const [failed, setFailed] = useState(false)
  const [loading, setLoading] = useState(true)
  const [isFullscreen, setIsFullscreen] = useState(false)

  useEffect(() => {
    const el = containerRef.current
    const source = tileSources || (src ? { type: 'image', url: src } : null)
    if (!el || !source) {
      setLoading(false)
      return undefined
    }

    setFailed(false)
    setLoading(true)

    const viewer = OpenSeadragon({
      element: el,
      tileSources: source,
      showNavigationControl: false,
      showZoomControl: false,
      showHomeControl: false,
      showFullPageControl: false,
      gestureSettingsMouse: { clickToZoom: false, dblClickToZoom: true, scrollToZoom: true, flickEnabled: false },
      gestureSettingsTouch: { pinchToZoom: true, dblClickToZoom: true, flickEnabled: true },
      animationTime: 0.4,
      springStiffness: 8,
      visibilityRatio: 1,
      constrainDuringPan: true,
      minZoomImageRatio: 0.9,
      maxZoomPixelRatio: 5,
      crossOriginPolicy: 'Anonymous',
      loadTilesWithAjax: false,
    })
    viewerRef.current = viewer

    const handleOpen = () => setLoading(false)
    const handleFailed = () => {
      setFailed(true)
      setLoading(false)
      onError?.()
    }
    viewer.addHandler('open', handleOpen)
    viewer.addHandler('open-failed', handleFailed)
    viewer.addHandler('tile-load-failed', handleFailed)

    return () => {
      viewer.removeHandler('open', handleOpen)
      viewer.removeHandler('open-failed', handleFailed)
      viewer.removeHandler('tile-load-failed', handleFailed)
      viewer.destroy()
      viewerRef.current = null
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [src, tileSources])

  useEffect(() => {
    const onFsChange = () => setIsFullscreen(document.fullscreenElement === rootRef.current)
    document.addEventListener('fullscreenchange', onFsChange)
    return () => document.removeEventListener('fullscreenchange', onFsChange)
  }, [])

  const zoomIn = () => {
    const viewport = viewerRef.current?.viewport
    if (!viewport) return
    viewport.zoomBy(1.4)
    viewport.applyConstraints()
  }
  const zoomOut = () => {
    const viewport = viewerRef.current?.viewport
    if (!viewport) return
    viewport.zoomBy(0.7)
    viewport.applyConstraints()
  }
  const resetView = () => viewerRef.current?.viewport?.goHome()
  // Fullscreen the OUTER wrapper (not the OpenSeadragon host div) so the
  // watermark, loading/failure overlays and the control bar all travel into
  // fullscreen with the canvas.
  const toggleFullscreen = async () => {
    const el = rootRef.current
    if (!el) return
    try {
      if (document.fullscreenElement === el) await document.exitFullscreen()
      else await el.requestFullscreen?.()
    } catch {
      // ignore — browser may block fullscreen without a user gesture
    }
  }

  return (
    <div
      ref={rootRef}
      className={cn(
        // `pointer-events-auto` is intentional and load-bearing: this viewer
        // is frequently nested inside legacy `.protected-media`/`.media-stage`
        // wrappers that set `pointer-events: none` on themselves (and, via
        // inheritance, on any child that doesn't say otherwise) to keep plain
        // <img> previews non-interactive. OpenSeadragon's pan/zoom/pinch
        // handlers need real pointer events to work, so this element always
        // opts back in regardless of what it's nested inside.
        'group/zoom relative overflow-hidden rounded-2xl border bg-muted/20 shadow-sm shadow-black/5 pointer-events-auto cursor-grab active:cursor-grabbing',
        !isFullscreen && 'min-h-[360px]',
        isFullscreen && 'bg-background',
        className,
      )}
      onAuxClick={protectedMode ? stopProtectedMediaEvent : undefined}
      onContextMenu={protectedMode ? stopProtectedMediaEvent : undefined}
      role="img"
      aria-label={alt}
    >
      <div ref={containerRef} className={cn('size-full', !isFullscreen && 'min-h-[360px]')} />

      {protectedMode && !loading && !failed ? <KhiLogoWatermark /> : null}

      {loading && !failed ? (
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center bg-muted/20">
          <Loader2 className="size-8 animate-spin text-muted-foreground" />
        </div>
      ) : null}

      {failed ? (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-muted/30 text-center text-sm text-muted-foreground">
          <ImageOff className="size-8" />
          <p>Could not load the image.</p>
        </div>
      ) : null}

      {!loading && !failed ? (
        <div className="pointer-events-none absolute inset-x-0 bottom-0 flex items-center justify-between gap-2 p-2.5 opacity-0 transition-opacity group-hover/zoom:opacity-100 focus-within:opacity-100">
          <span className="pointer-events-none rounded-full border border-border/60 bg-background/85 px-2.5 py-1 text-[10px] font-medium uppercase tracking-[0.1em] text-muted-foreground backdrop-blur-md">
            Pinch or scroll to zoom
          </span>
          <div className="pointer-events-auto flex items-center gap-1.5">
            <ControlButton onClick={zoomOut} label="Zoom out"><Minus className="size-4" /></ControlButton>
            <ControlButton onClick={resetView} label="Reset view"><RotateCcw className="size-3.5" /></ControlButton>
            <ControlButton onClick={zoomIn} label="Zoom in"><Plus className="size-4" /></ControlButton>
            <ControlButton onClick={toggleFullscreen} label={isFullscreen ? 'Exit fullscreen' : 'Fullscreen'}>
              {isFullscreen ? <Minimize className="size-3.5" /> : <Maximize className="size-3.5" />}
            </ControlButton>
          </div>
        </div>
      ) : null}
    </div>
  )
}

export { DeepZoomViewer }
