import { createElement } from 'react'

import { cn } from '@/lib/utils'

// `as` lets the consumer pick the underlying element. Default is
// `<div>` (block-level placeholder); pass `as="span"` when nesting
// inside a phrasing-content parent like `<p>` or `<button>`, where
// a `<div>` would be invalid HTML and trip a hydration warning.
function Skeleton({ as = 'div', className, ...props }) {
  return createElement(as, {
    'data-slot': 'skeleton',
    className: cn('animate-pulse rounded-md bg-muted/70', className),
    ...props,
  })
}

export { Skeleton }
