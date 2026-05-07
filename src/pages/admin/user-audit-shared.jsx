// Shared row component for the user-management audit feed. Used by
// both AdminUsersPage's per-user activity dialog AND
// AdminAnalyticsPage's global "User actions" tab so a single edit
// updates every surface that shows admin-on-user activity.
//
// Visual metadata + lookup (`USER_AUDIT_ACTION_META`,
// `userAuditActionMetaFor`, `dateFilterToFromTo`) live in
// `analytics-constants.js`; this file is only the component so the
// react-refresh contract (one file = components OR helpers, never
// both) holds.

import { cn } from '@/lib/utils'
import {
  formatRelative,
  userAuditActionMetaFor,
} from '@/pages/admin/analytics-constants'

// One row of the user-audit timeline. `showTarget` controls whether
// to include the affected user — turn off when the surrounding view
// is already scoped to a single user (e.g. per-user dialog), turn on
// for global feeds where every row may target a different account.
export function UserAuditRow({ row, showTarget = false }) {
  const meta = userAuditActionMetaFor(row?.action)
  const Icon = meta.icon
  const actor =
    row?.actorDisplayName || row?.actorUsername || row?.actorName || 'Unknown admin'
  const target =
    row?.targetDisplayName || row?.targetUsername || row?.targetName || null
  const when = row?.createdAt || row?.timestamp || row?.date
  const details = typeof row?.details === 'string' ? row.details.trim() : ''

  return (
    <li className="rounded-md border border-border bg-background/60 p-3">
      <div className="flex items-start gap-3">
        <span className={cn('mt-0.5 shrink-0', meta.accent)}>
          <Icon className="size-4" />
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-0.5">
            <p className="text-sm font-semibold text-foreground">
              {meta.label}
              {showTarget && target ? (
                <>
                  <span className="text-muted-foreground"> &middot; </span>
                  <span className="font-medium text-foreground/90">{target}</span>
                </>
              ) : null}
            </p>
            <p
              className="text-xs text-muted-foreground"
              title={when ? new Date(when).toLocaleString() : undefined}
            >
              {formatRelative(when)}
            </p>
          </div>
          <p className="text-xs text-muted-foreground">
            by <span className="font-medium text-foreground/90">{actor}</span>
          </p>
          {details ? (
            <p className="mt-1 break-words font-mono text-[11px] leading-relaxed text-foreground/80">
              {details}
            </p>
          ) : null}
        </div>
      </div>
    </li>
  )
}
