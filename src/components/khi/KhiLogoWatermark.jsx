import { useKhiLogoSrc } from '@/hooks/use-khi-logo'

// Quiet, transparent brand watermark pinned to the bottom-right corner of the
// protected media surfaces (image viewer, video frame, book pages). Static by
// design — the mark should sit still over the artwork, never animate. Purely
// decorative + deterrent: pointer-events stay off so zooming, seeking and
// page-turning are untouched. Styles live in khi-archive.css (.khi-watermark).
export default function KhiLogoWatermark({ className = '' }) {
  const logoSrc = useKhiLogoSrc()

  return (
    <span aria-hidden="true" className={`khi-watermark ${className}`.trim()}>
      <img src={logoSrc} alt="" draggable="false" decoding="async" />
    </span>
  )
}
