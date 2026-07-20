import { KHI_LOGO_SRC } from '@/components/brand/KhiLogo'

// Animated, transparent brand watermark laid over protected media surfaces
// (image viewer, video frame, book pages). Purely decorative + deterrent:
// pointer-events stay off so zooming, seeking and page-turning are untouched.
// The slow zoom-in/zoom-out "breathing" lives in khi-archive.css
// (.khi-watermark) and honours prefers-reduced-motion.
export default function KhiLogoWatermark({ className = '' }) {
  return (
    <span aria-hidden="true" className={`khi-watermark ${className}`.trim()}>
      <img src={KHI_LOGO_SRC} alt="" draggable="false" decoding="async" />
    </span>
  )
}
