// Pure data + helpers for the admin analytics screens. Lives in a .js
// file (no JSX) so it doesn't trigger the react-refresh "only-export-
// components" rule when shared between AdminAnalyticsPage and
// AdminUserActivityPage.

import {
  Activity,
  AudioLines,
  Check,
  Eye,
  FileText,
  FolderOpen,
  Image as ImageIcon,
  KeyRound,
  Lock,
  LogOut,
  Pencil,
  Plus,
  RotateCcw,
  Search,
  ShieldCheck,
  ShieldOff,
  Tags,
  Trash2,
  Unlock,
  UserPlus,
  UsersRound,
  Video as VideoIcon,
} from 'lucide-react'

// Per-entity icon + accent — kept aligned with the rest of the admin
// surface so a "12 audios" counter on Analytics matches the look of the
// audio tile on the Dashboard or the Audio tab in the Trash page.
export const ENTITY_META = {
  audio:    { label: 'Audio',       icon: AudioLines,  accent: 'text-rose-600 dark:text-rose-400' },
  video:    { label: 'Video',       icon: VideoIcon,   accent: 'text-emerald-600 dark:text-emerald-400' },
  image:    { label: 'Image',       icon: ImageIcon,   accent: 'text-orange-600 dark:text-orange-400' },
  text:     { label: 'Text',        icon: FileText,    accent: 'text-teal-600 dark:text-teal-400' },
  project:  { label: 'Projects',    icon: FolderOpen,  accent: 'text-sky-600 dark:text-sky-400' },
  category: { label: 'Categories',  icon: Tags,        accent: 'text-amber-600 dark:text-amber-400' },
  person:   { label: 'Persons',     icon: UsersRound,  accent: 'text-violet-600 dark:text-violet-400' },
}

// Per-action icon. Backend audit actions are uppercase strings
// (CREATE, UPDATE, DELETE, RESTORE, PURGE, READ/VIEWED, SEARCH, LIST).
// We map both the canonical names and a few common variants.
export const ACTION_META = {
  CREATE:   { icon: Plus,        accent: 'text-emerald-600 dark:text-emerald-400', label: 'Created' },
  UPDATE:   { icon: Pencil,      accent: 'text-amber-600 dark:text-amber-400',     label: 'Updated' },
  DELETE:   { icon: Trash2,      accent: 'text-rose-600 dark:text-rose-400',       label: 'Deleted' },
  RESTORE:  { icon: RotateCcw,   accent: 'text-sky-600 dark:text-sky-400',         label: 'Restored' },
  PURGE:    { icon: Trash2,      accent: 'text-rose-700 dark:text-rose-300',       label: 'Purged' },
  READ:     { icon: Eye,         accent: 'text-muted-foreground',                  label: 'Viewed' },
  VIEW:     { icon: Eye,         accent: 'text-muted-foreground',                  label: 'Viewed' },
  SEARCH:   { icon: Search,      accent: 'text-muted-foreground',                  label: 'Searched' },
  LIST:     { icon: Activity,    accent: 'text-muted-foreground',                  label: 'Listed' },
}

// Actions we don't want surfaced in the activity feed. LIST is a
// background "user opened a paginated list" event that floods the
// timeline without telling admins anything actionable.
export const HIDDEN_FEED_ACTIONS = new Set(['LIST'])

export function isHiddenAction(action) {
  return HIDDEN_FEED_ACTIONS.has(String(action || '').toUpperCase())
}

// Backend writes one audit row per media item when a project trash/
// restore/purge cascades. The `details` string carries the parent code
// so admins can see why dozens of near-identical rows landed at once.
// Format: "Trashed via project cascade (project=PROJ_001)" or
// "Restored via person cascade (person=PER_005)".
const CASCADE_DETAIL_RE =
  /via\s+(project|person)\s+cascade\s*\(\s*\w+\s*=\s*([^)]+)\s*\)/i

export function parseCascadeFromDetails(details) {
  if (!details) return null
  const m = String(details).match(CASCADE_DETAIL_RE)
  if (!m) return null
  return { source: m[1].toLowerCase(), code: m[2].trim() }
}

// Range presets the backend has stable behaviour for (`days` is capped
// at 365 server-side). Used by the shared DateRangeFilter component.
export const RANGE_PRESETS = [
  { value: 7, label: '7d' },
  { value: 30, label: '30d' },
  { value: 90, label: '90d' },
  { value: 365, label: '1y' },
]

// Convert a YYYY-MM-DD value (the format `<input type="date">` emits)
// into the inclusive UTC instant the backend expects. `from` snaps to
// 00:00:00.000Z, `to` snaps to 23:59:59.999Z so a single-day range
// covers the entire calendar day.
export function dateInputToInstant(yyyyMmDd, edge) {
  if (!yyyyMmDd) return ''
  return edge === 'end'
    ? `${yyyyMmDd}T23:59:59.999Z`
    : `${yyyyMmDd}T00:00:00.000Z`
}

// Turn the page's date-filter state into the AnalyticsFilter slice the
// service helpers want. Returns:
//   - { days } for preset mode
//   - { from, to } for a valid custom range
//   - null for an invalid custom range (from > to OR fields empty)
// Pages call this and skip fetching when it returns null.
export function resolveDateFilter({ mode, days, from, to }) {
  if (mode === 'custom') {
    if (!from || !to) return null
    const fromIso = dateInputToInstant(from, 'start')
    const toIso = dateInputToInstant(to, 'end')
    if (new Date(fromIso) > new Date(toIso)) return null
    return { from: fromIso, to: toIso }
  }
  return { days }
}

// Normalise a FeedPageDTO (or legacy bare list / Spring Page) into a
// stable `{ items, meta }` shape for the UI. UserActivityDTO.recent is
// now a FeedPageDTO too, so this is the single unwrap helper used by
// every feed-shaped response.
export function unwrapFeedPage(data) {
  if (data == null) return { items: [], meta: null }
  if (Array.isArray(data)) {
    return {
      items: data,
      meta: { page: 0, size: data.length, totalElements: data.length, totalPages: 1, hasNext: false },
    }
  }
  const items = Array.isArray(data.items)
    ? data.items
    : Array.isArray(data.content)
    ? data.content
    : []
  return {
    items,
    meta: {
      page: data.page ?? 0,
      size: data.size ?? items.length,
      totalElements: data.totalElements ?? null,
      totalPages: data.totalPages ?? null,
      hasNext: data.hasNext ?? null,
      hasPrevious: data.hasPrevious ?? null,
    },
  }
}

export function humanize(text) {
  return String(text || '')
    .toLowerCase()
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (m) => m.toUpperCase())
}

export function actionMetaFor(action) {
  if (!action) return { icon: Activity, accent: 'text-muted-foreground', label: 'Action' }
  return ACTION_META[String(action).toUpperCase()] ?? {
    icon: Activity,
    accent: 'text-muted-foreground',
    label: humanize(action),
  }
}

// Per-action icon + accent for the *user-management* audit feed
// (admin acting on user accounts). Backend emits these from
// AdminUserService: CREATE / UPDATE / DELETE / READ / ROLE_CHANGE /
// GRANT_/REVOKE_PERMISSIONS / ACTIVATE / DEACTIVATE / LOCK / UNLOCK /
// FORCE_LOGOUT / RESET_FAILED_ATTEMPTS. Unknown actions fall back to
// the generic Activity icon and a humanised label.
export const USER_AUDIT_ACTION_META = {
  CREATE:                { icon: UserPlus,    accent: 'text-emerald-600 dark:text-emerald-400', label: 'Created' },
  UPDATE:                { icon: Pencil,      accent: 'text-amber-600 dark:text-amber-400',     label: 'Updated' },
  DELETE:                { icon: Trash2,      accent: 'text-rose-600 dark:text-rose-400',       label: 'Deleted' },
  READ:                  { icon: Eye,         accent: 'text-muted-foreground',                  label: 'Viewed' },
  ROLE_CHANGE:           { icon: ShieldCheck, accent: 'text-primary',                           label: 'Role changed' },
  GRANT_PERMISSIONS:     { icon: KeyRound,    accent: 'text-emerald-600 dark:text-emerald-400', label: 'Permissions granted' },
  REVOKE_PERMISSIONS:    { icon: KeyRound,    accent: 'text-rose-600 dark:text-rose-400',       label: 'Permissions revoked' },
  ACTIVATE:              { icon: Check,       accent: 'text-emerald-600 dark:text-emerald-400', label: 'Activated' },
  DEACTIVATE:            { icon: ShieldOff,   accent: 'text-rose-600 dark:text-rose-400',       label: 'Deactivated' },
  LOCK:                  { icon: Lock,        accent: 'text-rose-600 dark:text-rose-400',       label: 'Locked' },
  UNLOCK:                { icon: Unlock,      accent: 'text-emerald-600 dark:text-emerald-400', label: 'Unlocked' },
  FORCE_LOGOUT:          { icon: LogOut,      accent: 'text-amber-600 dark:text-amber-400',     label: 'Sessions revoked' },
  RESET_FAILED_ATTEMPTS: { icon: RotateCcw,   accent: 'text-sky-600 dark:text-sky-400',         label: 'Failed-login counter reset' },
}

export function userAuditActionMetaFor(action) {
  if (!action) return { icon: Activity, accent: 'text-muted-foreground', label: 'Action' }
  const key = String(action).toUpperCase()
  return (
    USER_AUDIT_ACTION_META[key] ?? {
      icon: Activity,
      accent: 'text-muted-foreground',
      label: humanize(action),
    }
  )
}

// Convert an analytics page's date filter into the from/to pair the
// user-audit endpoint expects. The audit Specification only
// understands timestamp bounds, not a `days` shorthand — so a preset
// like "30d" needs to be projected onto "now − 30d" → "now".
//
// Returns `{}` when the filter can't be resolved (callers fold this
// into their query so the backend's defaults apply).
export function dateFilterToFromTo(dateFilter) {
  if (!dateFilter) return {}
  if (dateFilter.from && dateFilter.to) {
    return { from: dateFilter.from, to: dateFilter.to }
  }
  const days = Number(dateFilter.days)
  if (Number.isFinite(days) && days > 0) {
    const now = new Date()
    const past = new Date(now.getTime() - days * 24 * 60 * 60 * 1000)
    return { from: past.toISOString(), to: now.toISOString() }
  }
  return {}
}

export function formatNumber(value) {
  if (value == null) return '—'
  return Number(value).toLocaleString()
}

// Relative time stamp ("3m ago"). The feed renders many of these so a
// cheap synchronous formatter is fine — Intl.RelativeTimeFormat would
// pull localisation we don't otherwise need on this page.
export function formatRelative(instant) {
  if (!instant) return '—'
  const then = new Date(instant).getTime()
  if (Number.isNaN(then)) return String(instant)
  const diffMs = Date.now() - then
  const sec = Math.round(diffMs / 1000)
  if (sec < 60)  return `${sec}s ago`
  const min = Math.round(sec / 60)
  if (min < 60)  return `${min}m ago`
  const hr = Math.round(min / 60)
  if (hr < 24)   return `${hr}h ago`
  const days = Math.round(hr / 24)
  if (days < 30) return `${days}d ago`
  return new Date(then).toLocaleDateString()
}
