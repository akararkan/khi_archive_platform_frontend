import { useState } from 'react'

import { useKhiLogoSrc } from '@/hooks/use-khi-logo'
import { KHI_LOGO_FALLBACK_SRC } from '@/lib/khi-logo'
import { cn } from '@/lib/utils'

// The logo is uploaded through Admin → Settings → Application logo and served
// from the database record's S3 URL (see `lib/khi-logo.js`). The bundled file
// is only a fallback: no logo uploaded yet, or the stored URL fails to load.
const KHI_LOGO_SRC = KHI_LOGO_FALLBACK_SRC

function KhiLogo({ className, alt = '', priority = false }) {
  const uploadedSrc = useKhiLogoSrc()
  const [failedSrc, setFailedSrc] = useState('')
  const src = failedSrc === uploadedSrc ? KHI_LOGO_FALLBACK_SRC : uploadedSrc

  return (
    <span
      aria-hidden={alt ? undefined : true}
      className={cn(
        'inline-flex shrink-0 overflow-hidden rounded-full bg-white ring-1 ring-black/10',
        className,
      )}
    >
      <img
        alt={alt}
        className="size-full object-cover"
        decoding="async"
        draggable="false"
        loading={priority ? 'eager' : 'lazy'}
        onError={() => setFailedSrc(uploadedSrc)}
        src={src}
      />
    </span>
  )
}

export { KHI_LOGO_SRC, KhiLogo }
