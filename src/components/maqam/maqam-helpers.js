// Shared, language-neutral helpers for the maqam admin/employee surfaces.

// Format a byte count as a compact human string (e.g. "4.2 MB").
export function formatFileSize(bytes) {
  const n = Number(bytes)
  if (!Number.isFinite(n) || n <= 0) return '—'
  const units = ['B', 'KB', 'MB', 'GB', 'TB']
  let value = n
  let i = 0
  while (value >= 1024 && i < units.length - 1) {
    value /= 1024
    i += 1
  }
  return `${value >= 100 || i === 0 ? Math.round(value) : value.toFixed(1)} ${units[i]}`
}

// Format a duration in seconds as "m:ss" / "h:mm:ss".
export function formatClock(totalSeconds) {
  const s = Math.max(0, Math.floor(Number(totalSeconds) || 0))
  const h = Math.floor(s / 3600)
  const m = Math.floor((s % 3600) / 60)
  const sec = s % 60
  if (h > 0) return `${h}:${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`
  return `${m}:${String(sec).padStart(2, '0')}`
}

// Format a coverage ratio (0–1) as a percentage string, or "—" when unknown.
export function formatCoverage(ratio) {
  const n = Number(ratio)
  if (!Number.isFinite(n)) return '—'
  return `${Math.round(Math.min(1, Math.max(0, n)) * 100)}%`
}

export function formatDateTime(value) {
  if (!value) return '—'
  try {
    return new Date(value).toLocaleString('en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  } catch {
    return String(value)
  }
}

// A teacher panel must hold 1–3 distinct TEACHER users.
export const MIN_TEACHERS = 1
export const MAX_TEACHERS = 3

// Pull a friendly display label for a vote / summary row.
export function teacherLabel(row) {
  return row?.teacherDisplayName || row?.teacherUsername || `#${row?.teacherUserId ?? '?'}`
}

// How many of a record's assigned teachers have actually cast a vote.
export function voteProgress(teacherVotes) {
  const votes = Array.isArray(teacherVotes) ? teacherVotes : []
  const total = votes.length
  const cast = votes.filter((v) => (v?.maqamType ?? '').toString().trim() || v?.votedAt).length
  return { cast, total }
}
