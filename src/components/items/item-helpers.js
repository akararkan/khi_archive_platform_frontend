import { AudioLines, FileText, Image as ImageIcon, Video } from 'lucide-react'

// ── Per-type presentation ────────────────────────────────────────────────────
// One source of truth for the icon + colour each item type wears, so the list
// table, the type chips, and the detail dialog all read the same. Pure data /
// helpers only — the badge components live in item-badges.jsx.
export const ITEM_TYPE_META = {
  AUDIO: {
    label: 'Audio',
    icon: AudioLines,
    chip: 'bg-violet-500/15 text-violet-600 dark:text-violet-300',
    dot: 'bg-violet-500',
  },
  VIDEO: {
    label: 'Video',
    icon: Video,
    chip: 'bg-rose-500/15 text-rose-600 dark:text-rose-300',
    dot: 'bg-rose-500',
  },
  IMAGE: {
    label: 'Image',
    icon: ImageIcon,
    chip: 'bg-amber-500/15 text-amber-600 dark:text-amber-300',
    dot: 'bg-amber-500',
  },
  TEXT: {
    label: 'Text',
    icon: FileText,
    chip: 'bg-sky-500/15 text-sky-600 dark:text-sky-300',
    dot: 'bg-sky-500',
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
