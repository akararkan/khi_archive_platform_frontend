import { AudioLines, FileText, Image as ImageIcon, Video } from 'lucide-react'

// ── Per-type presentation ────────────────────────────────────────────────────
// One source of truth for the icon + colour each item type wears, so the list
// table, the type chips, and the detail dialog all read the same. Pure data /
// helpers only — the badge components live in item-badges.jsx.
export const ITEM_TYPE_META = {
  AUDIO: {
    label: 'Audio',
    icon: AudioLines,
    chip: 'bg-orange-500/15 text-orange-700 dark:text-orange-300',
    dot: 'bg-orange-500',
  },
  VIDEO: {
    label: 'Video',
    icon: Video,
    chip: 'bg-red-500/15 text-red-600 dark:text-red-300',
    dot: 'bg-red-500',
  },
  IMAGE: {
    label: 'Image',
    icon: ImageIcon,
    chip: 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-300',
    dot: 'bg-emerald-500',
  },
  TEXT: {
    label: 'Text',
    icon: FileText,
    chip: 'bg-indigo-500/15 text-indigo-600 dark:text-indigo-300',
    dot: 'bg-indigo-500',
  },
}

export function getTypeMeta(type) {
  return (
    ITEM_TYPE_META[type] || {
      label: type || '—',
      icon: FileText,
      chip: 'bg-muted text-muted-foreground',
      dot: 'bg-muted-foreground',
    }
  )
}

// Unwrap the one populated per-type payload off an ItemDTO.
export function getItemPayload(item) {
  if (!item) return null
  return item.audio || item.video || item.image || item.text || null
}
