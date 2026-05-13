// Helpers shared between the warning bell, inbox panel, and the admin
// warnings page. Lives in a .js file (no JSX) so the react-refresh
// "only-export-components" rule keeps the neighbouring component
// files clean.

import { AlertOctagon, AlertTriangle, Info } from 'lucide-react'

// Severity → icon + accent + ring. Used by both the recipient bell
// (compact rows) and the admin list (table rows + filter chips) so the
// same severity always reads the same way visually.
export const SEVERITY_META = {
  INFO:     { icon: Info,          accent: 'text-sky-600 dark:text-sky-400',     ring: 'ring-sky-500/30',   label: 'Info' },
  WARNING:  { icon: AlertTriangle, accent: 'text-amber-600 dark:text-amber-400', ring: 'ring-amber-500/30', label: 'Warning' },
  CRITICAL: { icon: AlertOctagon,  accent: 'text-rose-600 dark:text-rose-400',   ring: 'ring-rose-500/30',  label: 'Critical' },
}

export function severityMetaFor(severity) {
  return SEVERITY_META[String(severity || '').toUpperCase()] ?? SEVERITY_META.INFO
}

export const SEVERITY_ORDER = ['INFO', 'WARNING', 'CRITICAL']
