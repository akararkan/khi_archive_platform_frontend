import { useKhiLogoSrc } from '@/hooks/use-khi-logo'

// Opaque brand watermark pinned to the bottom-left corner of the
// protected media surfaces (image viewer, video frame, book pages). Static by
// design — the mark should sit still over the artwork, never animate. Purely
// decorative + deterrent: pointer-events stay off so zooming, seeking and
// page-turning are untouched. Styles live in khi-archive.css (.khi-watermark).
// `style` lets a caller pin the mark to the artwork's real box instead of the
// whole container — the deep-zoom viewer letterboxes its image, so without it
// the logo would sit on the empty gutter beside the photograph.
export default function KhiLogoWatermark({ className = '', style }) {
  const logoSrc = useKhiLogoSrc()

  return (
    <span aria-hidden="true" className={`khi-watermark ${className}`.trim()} style={style}>
      <img src={logoSrc} alt="" draggable="false" decoding="async" />
    </span>
  )
}
