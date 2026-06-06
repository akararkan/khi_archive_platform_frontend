import { cn } from '@/lib/utils'
import { getTypeMeta } from '@/components/items/item-helpers'

// Small pill that names the item's type with its icon + colour.
export function TypeBadge({ type, className }) {
  const meta = getTypeMeta(type)
  const Icon = meta.icon
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold',
        meta.chip,
        className,
      )}
    >
      <Icon className="size-3" />
      {meta.label}
    </span>
  )
}

// Two-badge visibility model (per the backend contract): a guest sees a row
// only when BOTH the project flag and the row's own flag are true. Staff
// always see everything, so we surface the badges instead of hiding rows.
//
//   projectVisibleToPublic === false → "Project hidden"
//   isPublic === false               → "Hidden"
export function VisibilityBadges({ item, className }) {
  const projectHidden = item?.projectVisibleToPublic === false
  const itemHidden = item?.isPublic === false
  if (!projectHidden && !itemHidden) {
    return (
      <span
        className={cn(
          'inline-flex items-center rounded-full bg-emerald-500/15 px-2 py-0.5 text-[11px] font-medium text-emerald-600 dark:text-emerald-400',
          className,
        )}
      >
        Public
      </span>
    )
  }
  return (
    <span className={cn('inline-flex flex-wrap items-center gap-1', className)}>
      {projectHidden ? (
        <span className="inline-flex items-center rounded-full bg-amber-500/15 px-2 py-0.5 text-[11px] font-medium text-amber-600 dark:text-amber-400">
          Project hidden
        </span>
      ) : null}
      {itemHidden ? (
        <span className="inline-flex items-center rounded-full bg-rose-500/15 px-2 py-0.5 text-[11px] font-medium text-rose-600 dark:text-rose-400">
          Hidden
        </span>
      ) : null}
    </span>
  )
}
