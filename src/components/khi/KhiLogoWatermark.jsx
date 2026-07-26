import { useKhiLogoSrc } from '@/hooks/use-khi-logo'

// Animated, transparent brand watermark laid over protected media surfaces
// (image viewer, video frame, book pages). Purely decorative + deterrent:
// pointer-events stay off so zooming, seeking and page-turning are untouched.
// The slow zoom-in/zoom-out "breathing" lives in khi-archive.css
// (.khi-watermark) and honours prefers-reduced-motion.
export default function KhiLogoWatermark({ className = '' }) {
  const logoSrc = useKhiLogoSrc()

  return (
    <span aria-hidden="true" className={`khi-watermark ${className}`.trim()}>
      <img src={logoSrc} alt="" draggable="false" decoding="async" />
    </span>
  )
}
