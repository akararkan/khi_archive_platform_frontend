import { cn } from '@/lib/utils'

const KHI_LOGO_SRC = '/khi-logo.jpg'

function KhiLogo({ className, alt = '', priority = false }) {
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
        src={KHI_LOGO_SRC}
      />
    </span>
  )
}

export { KHI_LOGO_SRC, KhiLogo }
