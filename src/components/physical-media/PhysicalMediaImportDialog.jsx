import { useEffect, useRef, useState } from 'react'
import { AlertTriangle, CheckCircle2, FileSpreadsheet, Loader2, Upload, X } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useToast } from '@/hooks/use-toast'
import { getPhysicalMediaImportSheets, importPhysicalMedia } from '@/services/physical-media'

const XLSX_ACCEPT = '.xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
const SELECT_CLASS =
  'flex h-9 w-full rounded-lg border border-input bg-background px-3 py-1 text-sm shadow-sm transition-colors focus-visible:border-ring focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/30'

function Stat({ label, value, accent }) {
  return (
    <div className="rounded-xl border border-border bg-background px-3 py-2.5 text-center">
      <p className={`text-lg font-semibold tabular-nums ${accent || 'text-foreground'}`}>{value}</p>
      <p className="text-[10px] uppercase tracking-wide text-muted-foreground">{label}</p>
    </div>
  )
}

function Chips({ items, tone }) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {items.map((h) => (
        <span
          key={h}
          className={
            tone === 'warn'
              ? 'inline-flex items-center rounded-full border border-amber-300/50 bg-amber-500/10 px-2 py-0.5 text-[11px] text-amber-700 dark:text-amber-300'
              : 'inline-flex items-center rounded-full border border-border bg-muted/40 px-2 py-0.5 text-[11px] text-muted-foreground'
          }
        >
          {h}
        </span>
      ))}
    </div>
  )
}

/**
 * Excel (.xlsx) bulk-import modal for physical-media rows.
 *
 * Props:
 *   open, onOpenChange
 *   onImported()  — called after a successful import so the list can refresh
 */
export function PhysicalMediaImportDialog({ open, onOpenChange, onImported }) {
  const toast = useToast()
  const fileInputRef = useRef(null)
  const [file, setFile] = useState(null)
  const [sheet, setSheet] = useState('')
  const [sheets, setSheets] = useState([])
  const [sheetsLoading, setSheetsLoading] = useState(false)
  const [importing, setImporting] = useState(false)
  const [report, setReport] = useState(null)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!open) return
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setFile(null)
    setSheet('')
    setSheets([])
    setSheetsLoading(false)
    setImporting(false)
    setReport(null)
    setError('')
  }, [open])

  useEffect(() => {
    if (!open) return undefined
    const onKey = (e) => {
      if (e.key === 'Escape' && !importing) onOpenChange(false)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, importing, onOpenChange])

  if (!open) return null

  const handleFile = async (f) => {
    setError('')
    setReport(null)
    setSheets([])
    setSheet('')
    if (!f) {
      setFile(null)
      return
    }
    if (!f.name.toLowerCase().endsWith('.xlsx')) {
      setError('Please choose an .xlsx workbook.')
      return
    }
    setFile(f)
    // Peek at the workbook's sheet names so the user can pick one (best-effort —
    // falls back to the free-text sheet field if the endpoint is unavailable).
    setSheetsLoading(true)
    try {
      const names = await getPhysicalMediaImportSheets(f)
      setSheets(names)
      if (names.length) setSheet(names[0])
    } catch {
      // ignore — free-text sheet input stays available
    } finally {
      setSheetsLoading(false)
    }
  }

  const handleImport = async () => {
    if (!file || importing) return
    setImporting(true)
    setError('')
    try {
      const result = await importPhysicalMedia(file, { sheet: sheet.trim() || undefined })
      setReport(result)
      toast.success(
        'Import finished',
        `Inserted ${result?.inserted ?? 0} · updated ${result?.updated ?? 0} · skipped ${result?.skipped ?? 0}.`,
      )
      onImported?.()
    } catch (err) {
      setError(err?.response?.data?.message || err?.message || 'The import failed.')
      toast.apiError(err, 'Could not import the workbook.')
    } finally {
      setImporting(false)
    }
  }

  const matched = Array.isArray(report?.matchedHeaders) ? report.matchedHeaders : []
  const unknown = Array.isArray(report?.unknownHeaders) ? report.unknownHeaders : []
  const errors = Array.isArray(report?.errors) ? report.errors : []

  return (
    <div
      className="fixed inset-0 z-[95] flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget && !importing) onOpenChange(false)
      }}
      role="dialog"
      aria-modal="true"
    >
      <div className="flex max-h-[90vh] w-full max-w-xl flex-col overflow-hidden rounded-2xl bg-card shadow-2xl ring-1 ring-black/10">
        <div className="flex shrink-0 items-center justify-between gap-4 border-b border-border px-6 py-4">
          <div className="flex min-w-0 items-center gap-3">
            <div className="grid size-9 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary">
              <FileSpreadsheet className="size-4" />
            </div>
            <div className="min-w-0">
              <p className="truncate text-sm font-bold text-foreground">Import physical media</p>
              <p className="truncate text-[11px] text-muted-foreground">Upload the .xlsx inventory sheet</p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => !importing && onOpenChange(false)}
            className="grid size-8 place-items-center rounded-lg text-muted-foreground transition hover:bg-muted hover:text-foreground"
            aria-label="Close"
          >
            <X className="size-4" />
          </button>
        </div>

        <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-6 py-5">
          {/* File picker */}
          <div className="space-y-1.5">
            <Label>Workbook (.xlsx)</Label>
            <input
              ref={fileInputRef}
              type="file"
              accept={XLSX_ACCEPT}
              className="hidden"
              onChange={(e) => handleFile(e.target.files?.[0] ?? null)}
            />
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="flex w-full items-center gap-3 rounded-xl border border-dashed border-border bg-muted/20 px-4 py-3 text-left transition hover:border-primary/40 hover:bg-muted/40"
            >
              <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-background text-muted-foreground">
                {file ? <FileSpreadsheet className="size-4 text-primary" /> : <Upload className="size-4" />}
              </span>
              <span className="min-w-0 flex-1">
                {file ? (
                  <span className="block truncate text-sm font-medium text-foreground">{file.name}</span>
                ) : (
                  <>
                    <span className="block text-sm font-medium text-foreground">Choose a workbook</span>
                    <span className="text-[11px] text-muted-foreground">.xlsx — bilingual (Kurdish/English) headers supported</span>
                  </>
                )}
              </span>
            </button>
          </div>

          {/* Sheet selection — dropdown when we could read the workbook, else free-text */}
          <div className="space-y-1.5">
            <Label htmlFor="pm-import-sheet">Sheet {sheets.length ? '' : '(optional)'}</Label>
            {sheets.length > 0 ? (
              <select
                id="pm-import-sheet"
                value={sheet}
                onChange={(e) => setSheet(e.target.value)}
                className={SELECT_CLASS}
              >
                {sheets.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            ) : (
              <Input
                id="pm-import-sheet"
                value={sheet}
                onChange={(e) => setSheet(e.target.value)}
                placeholder={sheetsLoading ? 'Reading sheets…' : 'Defaults to the first sheet (e.g. Sheet1)'}
              />
            )}
          </div>

          {error ? (
            <div className="flex items-center gap-2 rounded-xl border border-destructive/40 bg-destructive/5 px-3 py-2.5 text-sm text-destructive">
              <AlertTriangle className="size-4 shrink-0" />
              <span className="flex-1">{error}</span>
            </div>
          ) : null}

          {/* Report */}
          {report ? (
            <div className="space-y-4 rounded-2xl border border-border bg-muted/10 p-4">
              <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
                <CheckCircle2 className="size-4 text-green-600 dark:text-green-400" />
                Import summary
                {report.sheetName ? (
                  <span className="font-normal text-muted-foreground">· {report.sheetName}</span>
                ) : null}
              </div>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                <Stat label="Rows" value={report.totalDataRows ?? 0} />
                <Stat label="Inserted" value={report.inserted ?? 0} accent="text-green-600 dark:text-green-400" />
                <Stat label="Updated" value={report.updated ?? 0} accent="text-amber-600 dark:text-amber-400" />
                <Stat label="Skipped" value={report.skipped ?? 0} accent={errors.length ? 'text-rose-600 dark:text-rose-400' : undefined} />
              </div>

              {matched.length ? (
                <div className="space-y-1.5">
                  <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Matched columns</p>
                  <Chips items={matched} />
                </div>
              ) : null}

              {unknown.length ? (
                <div className="space-y-1.5">
                  <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                    Unknown columns — ignored
                  </p>
                  <Chips items={unknown} tone="warn" />
                </div>
              ) : null}

              {errors.length ? (
                <div className="space-y-1.5">
                  <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                    Skipped rows ({errors.length})
                  </p>
                  <div className="max-h-40 overflow-y-auto rounded-xl border border-border">
                    <table className="w-full text-xs">
                      <tbody>
                        {errors.map((row, i) => (
                          <tr key={`${row.rowNumber}-${i}`} className="border-b border-border last:border-0">
                            <td className="w-16 px-3 py-1.5 font-mono tabular-nums text-muted-foreground">#{row.rowNumber}</td>
                            <td className="px-3 py-1.5 text-foreground/80">{row.message}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              ) : null}
            </div>
          ) : null}
        </div>

        <div className="flex shrink-0 items-center justify-end gap-2 border-t border-border px-6 py-4">
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={importing}>
            {report ? 'Close' : 'Cancel'}
          </Button>
          <Button type="button" className="gap-2" onClick={handleImport} disabled={!file || importing}>
            {importing ? <Loader2 className="size-4 animate-spin" /> : <Upload className="size-4" />}
            {importing ? 'Importing…' : 'Import'}
          </Button>
        </div>
      </div>
    </div>
  )
}
