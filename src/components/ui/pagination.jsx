import { ChevronLeft, ChevronRight, MoreHorizontal } from 'lucide-react'

import { cn } from '@/lib/utils'

// ── Low-level shadcn-style primitives ───────────────────────────────────
//
// These mirror the public shadcn/ui Pagination API (Pagination /
// PaginationContent / PaginationItem / PaginationLink / PaginationPrevious
// / PaginationNext / PaginationEllipsis) but emit click handlers instead
// of href anchors, since our pages drive page state in React, not the URL.
// Use these directly when you need full control over the layout, or the
// higher-level <DataPagination> below for the common case.

function Pagination({ className, ...props }) {
  return (
    <nav
      role="navigation"
      aria-label="pagination"
      className={cn('mx-auto flex w-full justify-center', className)}
      {...props}
    />
  )
}

function PaginationContent({ className, ...props }) {
  return <ul className={cn('flex flex-row items-center gap-1', className)} {...props} />
}

function PaginationItem({ className, ...props }) {
  return <li className={cn('', className)} {...props} />
}

// Visual variants reuse the same tokens the rest of the app uses, so this
// component blends in regardless of theme. Active page gets the solid
// border/background; inactive pages are ghost buttons.
const PAGINATION_LINK_BASE =
  'inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 h-9 min-w-9 px-3 tabular-nums'

function PaginationLink({ className, isActive, disabled, ...props }) {
  return (
    <button
      type="button"
      aria-current={isActive ? 'page' : undefined}
      disabled={disabled}
      className={cn(
        PAGINATION_LINK_BASE,
        isActive
          ? 'border border-input bg-background text-foreground shadow-sm hover:bg-accent hover:text-accent-foreground'
          : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground',
        className,
      )}
      {...props}
    />
  )
}

function PaginationPrevious({ className, disabled, ...props }) {
  return (
    <PaginationLink
      aria-label="Go to previous page"
      disabled={disabled}
      className={cn('gap-1 px-2.5', className)}
      {...props}
    >
      <ChevronLeft className="size-4" />
      <span className="hidden sm:inline">Previous</span>
    </PaginationLink>
  )
}

function PaginationNext({ className, disabled, ...props }) {
  return (
    <PaginationLink
      aria-label="Go to next page"
      disabled={disabled}
      className={cn('gap-1 px-2.5', className)}
      {...props}
    >
      <span className="hidden sm:inline">Next</span>
      <ChevronRight className="size-4" />
    </PaginationLink>
  )
}

function PaginationEllipsis({ className, ...props }) {
  return (
    <span
      aria-hidden
      className={cn('flex h-9 w-9 items-center justify-center text-muted-foreground', className)}
      {...props}
    >
      <MoreHorizontal className="size-4" />
      <span className="sr-only">More pages</span>
    </span>
  )
}

// ── Page-range algorithm ────────────────────────────────────────────────
//
// Returns the list of slots to render between Prev and Next. Slots are
// either page indices (0-based, Spring style) or the literal string
// 'ellipsis'. Always shows first and last; shows a window of 1 around
// `current`; expands the window near the start/end so the bar doesn't
// shrink awkwardly on early/late pages.

// Show every page numbered up to this threshold; beyond it we collapse the
// middle with ellipses. 12 fits comfortably on a desktop row and means a
// 1,000-record dataset at 100/page (11 pages) renders all pages directly,
// matching the expectation that every page is reachable in one click.
const SHOW_ALL_PAGES_UP_TO = 12

function buildPageSlots(current, totalPages) {
  if (totalPages <= 0) return []
  if (totalPages <= SHOW_ALL_PAGES_UP_TO) {
    return Array.from({ length: totalPages }, (_, i) => i)
  }
  const set = new Set([0, totalPages - 1, current])
  if (current > 0) set.add(current - 1)
  if (current < totalPages - 1) set.add(current + 1)
  if (current <= 2) {
    set.add(1)
    set.add(2)
    set.add(3)
  }
  if (current >= totalPages - 3) {
    set.add(totalPages - 2)
    set.add(totalPages - 3)
    set.add(totalPages - 4)
  }
  const sorted = [...set].filter((n) => n >= 0 && n < totalPages).sort((a, b) => a - b)
  const slots = []
  for (let i = 0; i < sorted.length; i += 1) {
    if (i > 0 && sorted[i] - sorted[i - 1] > 1) slots.push('ellipsis')
    slots.push(sorted[i])
  }
  return slots
}

// ── High-level convenience component ────────────────────────────────────
//
// The shape callers actually want:
//
//   <DataPagination
//     page={page}                  // 0-indexed
//     totalPages={page.totalPages}
//     totalElements={page.totalElements}
//     pageSize={page.size}
//     onPageChange={setPage}
//   />
//
// Renders "Showing X–Y of Z" on the left, prev/numbers/next on the right.
// Hides itself if there's only one page so empty paginators don't clutter
// the UI. Buttons are all real <button>s — no anchor tags, no URL change.

function DataPagination({
  page,
  totalPages,
  totalElements,
  pageSize,
  onPageChange,
  className,
  hideOnSinglePage = true,
}) {
  if (totalPages == null || totalPages < 0) return null
  if (hideOnSinglePage && totalPages <= 1) return null

  const slots = buildPageSlots(page, totalPages)
  const isFirst = page <= 0
  const isLast = page >= totalPages - 1

  // Compute the "Showing X–Y of Z" range. Guards against the last page
  // having fewer items than `pageSize`.
  let summary = null
  if (typeof totalElements === 'number' && typeof pageSize === 'number' && totalElements > 0) {
    const start = page * pageSize + 1
    const end = Math.min(totalElements, (page + 1) * pageSize)
    summary = (
      <span className="text-xs text-muted-foreground tabular-nums">
        Showing <span className="font-medium text-foreground">{start.toLocaleString()}</span>–
        <span className="font-medium text-foreground">{end.toLocaleString()}</span> of{' '}
        <span className="font-medium text-foreground">{totalElements.toLocaleString()}</span>
      </span>
    )
  }

  const goto = (next) => {
    if (next < 0 || next >= totalPages || next === page) return
    onPageChange?.(next)
  }

  return (
    <div
      className={cn(
        'flex flex-col items-center justify-between gap-3 px-1 py-2 sm:flex-row',
        className,
      )}
    >
      <div className="order-2 sm:order-1">{summary}</div>
      <Pagination className="order-1 mx-0 w-auto sm:order-2">
        <PaginationContent>
          <PaginationItem>
            <PaginationPrevious onClick={() => goto(page - 1)} disabled={isFirst} />
          </PaginationItem>
          {slots.map((slot, idx) =>
            slot === 'ellipsis' ? (
              <PaginationItem key={`e-${idx}`}>
                <PaginationEllipsis />
              </PaginationItem>
            ) : (
              <PaginationItem key={slot}>
                <PaginationLink isActive={slot === page} onClick={() => goto(slot)}>
                  {slot + 1}
                </PaginationLink>
              </PaginationItem>
            ),
          )}
          <PaginationItem>
            <PaginationNext onClick={() => goto(page + 1)} disabled={isLast} />
          </PaginationItem>
        </PaginationContent>
      </Pagination>
    </div>
  )
}

export {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationPrevious,
  PaginationNext,
  PaginationEllipsis,
  DataPagination,
}
