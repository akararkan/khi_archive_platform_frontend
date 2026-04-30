// Pure data + helpers for the admin analytics screens. Lives in a .js
// file (no JSX) so it doesn't trigger the react-refresh "only-export-
// components" rule when shared between AdminAnalyticsPage and
// AdminUserActivityPage.

import {
  Activity,
  AudioLines,
  Eye,
  FileText,
  FolderOpen,
  Image as ImageIcon,
  Pencil,
  Plus,
  RotateCcw,
  Search,
  Tags,
  Trash2,
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
