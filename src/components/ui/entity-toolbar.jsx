import { useEffect, useRef, useState } from 'react'
import { RefreshCw, Search } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'

/**
 * Standard toolbar for list pages: record count, search input, refresh button.
 * Extra actions can be passed via `trailing` or `leading` slots.
 *
 * Sticks to the top of the viewport when the user scrolls past it. We detect
 * the "stuck" state with an IntersectionObserver on a 1-pixel sentinel
 * placed just above the toolbar, then switch styling on/off — frosted-
 * glass background, a slightly stronger shadow, and a softer border — so
 * the table content scrolling behind it stays subtly readable instead of
 * being hidden under a hard slab. Set `sticky={false}` to opt out.
 */
function EntityToolbar({
  filteredCount,
  totalCount,
  searchValue,
  onSearchChange,
  searchPlaceholder = 'Search…',
  onRefresh,
  isRefreshing = false,
  searchWidthClassName = 'sm:w-80',
  leading,
  trailing,
  sticky = true,
}) {
  const [isStuck, setIsStuck] = useState(false)
  const sentinelRef = useRef(null)

  useEffect(() => {
    if (!sticky) return undefined
    const sentinel = sentinelRef.current
    if (!sentinel) return undefined
    // The sentinel sits one pixel above the toolbar. While any part of it
    // is on screen, the toolbar is in its natural position. The moment the
    // sentinel scrolls off the top, the toolbar is stuck.
    const observer = new IntersectionObserver(
      ([entry]) => setIsStuck(!entry.isIntersecting && entry.boundingClientRect.top < 0),
      { threshold: [0, 1] },
    )
    observer.observe(sentinel)
    return () => observer.disconnect()
  }, [sticky])

  return (
    <>
      {sticky ? <div ref={sentinelRef} aria-hidden className="h-px -mb-px" /> : null}
      <Card
        className={cn(
          'border transition-[background-color,box-shadow,border-color,backdrop-filter] duration-200',
          sticky && 'sticky top-0 z-30',
          isStuck
            ? 'border-border/70 bg-card/80 shadow-md shadow-black/10 backdrop-blur-md supports-[backdrop-filter]:bg-card/70'
            : 'border-border bg-card shadow-sm shadow-black/5',
        )}
      >
        <CardContent className="flex flex-col gap-3 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3 text-sm text-muted-foreground">
            <span>
              Showing{' '}
              <span className="font-semibold tabular-nums text-foreground">{filteredCount}</span>
              {' '}of{' '}
              <span className="font-semibold tabular-nums text-foreground">{totalCount}</span>
              {' '}records
            </span>
            {leading}
          </div>

          <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:items-center">
            <div className={`relative w-full ${searchWidthClassName}`}>
              <Search className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={searchValue}
                onChange={(event) => onSearchChange(event.target.value)}
                placeholder={searchPlaceholder}
                className="pl-8"
              />
            </div>
            {onRefresh ? (
              <Button
                type="button"
                variant="outline"
                className="gap-2 shrink-0"
                onClick={onRefresh}
                disabled={isRefreshing}
              >
                <RefreshCw className={`size-4 ${isRefreshing ? 'animate-spin' : ''}`} />
                Refresh
              </Button>
            ) : null}
            {trailing}
          </div>
        </CardContent>
      </Card>
    </>
  )
}

export { EntityToolbar }
