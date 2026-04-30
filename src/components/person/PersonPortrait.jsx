import { useState } from 'react'

import { cn } from '@/lib/utils'

/**
 * Portrait image with a graceful fallback to the name initial.
 * The backend stores `mediaPortrait` as a public S3 URL; if it fails to load
 * (expired signature, network error, deleted object) we render the initial.
 */
function PersonPortrait({
  src,
  name,
  className,
  fallbackClassName,
  imgClassName,
  rounded = 'rounded-lg',
  loading = 'lazy',
  objectPosition = 'object-top',
}) {
  // Track which src has failed — if src changes, `failed` naturally resets
  // because the previous failedSrc no longer matches the current src.
  const [failedSrc, setFailedSrc] = useState(null)
  const failed = failedSrc !== null && failedSrc === src

  const initial = name?.charAt(0)?.toUpperCase() || 'P'

  if (!src || failed) {
    return (
      <div
        className={cn(
          'flex items-center justify-center border bg-gradient-to-br from-muted to-muted/40 font-heading font-semibold text-muted-foreground/70 shadow-inner',
          rounded,
          className,
          fallbackClassName,
        )}
        aria-label={name}
      >
        {initial}
      </div>
    )
  }

  return (
    <img
      src={src}
      alt={name}
      loading={loading}
      onError={() => setFailedSrc(src)}
      className={cn('border object-cover', rounded, objectPosition, className, imgClassName)}
    />
  )
}

export { PersonPortrait }
