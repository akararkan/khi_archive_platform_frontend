import { X } from 'lucide-react'

import { cn } from '@/lib/utils'

function SearchClearButton({ onClick, className, label = 'Clear search' }) {
  return (
    <button
      type="button"
      onMouseDown={(event) => event.preventDefault()}
      onClick={onClick}
      className={cn(
        'absolute right-1.5 top-1/2 inline-flex size-6 -translate-y-1/2 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50',
        className,
      )}
      aria-label={label}
      title={label}
    >
      <X className="size-3.5" />
    </button>
  )
}

export { SearchClearButton }
