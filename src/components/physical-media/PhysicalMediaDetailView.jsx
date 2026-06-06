import { useEffect, useState } from 'react'
import { ArrowLeft, CheckCircle2, Clock3, FileSpreadsheet, HardDrive, Loader2, Pencil } from 'lucide-react'

import { EmployeeEntityPage } from '@/components/employee/EmployeeEntityPage'
import { Button } from '@/components/ui/button'
import { CodeBadge } from '@/components/ui/code-badge'
import { Skeleton } from '@/components/ui/skeleton'
import { useToast } from '@/hooks/use-toast'
import { cn } from '@/lib/utils'
import { formatDateTime } from '@/components/maqam/maqam-helpers'
import { DIGITIZATION_LABELS } from '@/lib/physical-media-form'
import { getPhysicalMedia } from '@/services/physical-media'

function Row({ label, value, mono, full }) {
  const empty = value == null || value === ''
  return (
    <div className={cn('min-w-0 space-y-0.5', full && 'sm:col-span-2 lg:col-span-3')}>
      <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">{label}</p>
      <p
        className={cn('whitespace-pre-line break-words text-sm leading-6 text-foreground', mono && 'font-mono', empty && 'text-muted-foreground/40')}
        style={{ overflowWrap: 'anywhere' }}
      >
        {empty ? '—' : value}
      </p>
    </div>
  )
}

function Section({ title, children }) {
  return (
    <section className="rounded-2xl border border-border bg-card p-5 shadow-sm shadow-black/5">
      <h3 className="mb-4 text-sm font-semibold text-foreground">{title}</h3>
      <div className="grid gap-x-6 gap-y-4 sm:grid-cols-2 lg:grid-cols-3">{children}</div>
    </section>
  )
}

function DigitizationBadge({ value }) {
  if (!value) return null
  const tone =
    value === 'DIGITIZED' ? 'bg-green-500/15 text-green-600 dark:text-green-400'
      : value === 'DUPLICATED' ? 'bg-sky-500/15 text-sky-600 dark:text-sky-400'
        : 'bg-muted text-muted-foreground'
  return (
    <span className={cn('inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-semibold', tone)}>
      {DIGITIZATION_LABELS[value] || value}
    </span>
  )
}

/**
 * Full-page, read-only detail view for one physical-media record, with a back
 * button to the list. Loads the full record by code (writes a READ audit) and
 * lays the 29 fields out in grouped sections. Pass onEdit(row) to jump to edit.
 */
export function PhysicalMediaDetailView({ code, onBack, onEdit }) {
  const toast = useToast()
  const [record, setRecord] = useState(null)
  const [loading, setLoading] = useState(false)

  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    if (!code) return undefined
    let cancelled = false
    const ctrl = new AbortController()
    setLoading(true)
    getPhysicalMedia(code, { signal: ctrl.signal })
      .then((d) => { if (!cancelled) setRecord(d) })
      .catch((err) => { if (err?.code !== 'ERR_CANCELED') toast.apiError(err, 'Could not load the record.') })
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true; ctrl.abort() }
  }, [code, toast])
  /* eslint-enable react-hooks/set-state-in-effect */

  const r = record || {}
  const needToClear = r.needToClear
  const sourceImport = String(r.source || '').toUpperCase() === 'IMPORT'

  return (
    <EmployeeEntityPage
      eyebrow="Physical media"
      title={loading && !record ? 'Loading…' : r.title || r.physicalLabel || r.pmCode || code}
      badge={r.pmCode || code}
      description="Full record detail."
      action={
        <div className="flex flex-wrap items-center gap-2">
          <Button type="button" variant="outline" className="gap-2 shrink-0" onClick={onBack}>
            <ArrowLeft className="size-4" />
            Back to list
          </Button>
          {onEdit ? (
            <Button type="button" className="gap-2 shrink-0" disabled={loading && !record} onClick={() => onEdit(r)}>
              <Pencil className="size-4" />
              Edit
            </Button>
          ) : null}
        </div>
      }
    >
      {/* Status strip */}
      <div className="flex flex-wrap items-center gap-2">
        <CodeBadge code={r.pmCode || code} size="sm" />
        {r.physicalMediaType ? (
          <span className="inline-flex items-center rounded-md bg-muted/60 px-2 py-0.5 text-[11px] text-muted-foreground">{r.physicalMediaType}</span>
        ) : null}
        <DigitizationBadge value={r.digitization} />
        {needToClear ? (
          <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/15 px-2 py-0.5 text-[11px] font-semibold text-amber-600 dark:text-amber-400">
            <Clock3 className="size-3" /> Needs clearing
          </span>
        ) : null}
        {r.source ? (
          <span className="inline-flex items-center gap-1 rounded-full border border-border bg-background px-2 py-0.5 text-[10px] font-medium text-muted-foreground">
            {sourceImport ? <FileSpreadsheet className="size-3" /> : <CheckCircle2 className="size-3" />}
            {sourceImport ? 'Imported' : 'Manual'}
          </span>
        ) : null}
      </div>

      {loading && !record ? (
        <div className="space-y-4">
          <Skeleton className="h-28 w-full rounded-2xl" />
          <Skeleton className="h-44 w-full rounded-2xl" />
          <Skeleton className="h-44 w-full rounded-2xl" />
        </div>
      ) : (
        <div className="space-y-4">
          <Section title="Identity & classification">
            <Row label="Physical media type" value={r.physicalMediaType} />
            <Row label="Media category" value={r.mediaCategory} />
            <Row label="Title" value={r.title} />
            <Row label="Physical label" value={r.physicalLabel} mono />
            <Row label="Type / sub-type" value={r.subType} />
            <Row label="Size" value={r.size} />
            <Row label="Inventory number" value={r.inventoryNumber} />
            <Row label="Row number" value={r.rowNumber} />
          </Section>

          <Section title="Content">
            <Row label="Content" value={r.content} full />
            <Row label="Owner" value={r.owner} />
            <Row label="Year" value={r.year} />
            <Row label="Duration (min)" value={r.durationMin} />
            <Row label="Track count" value={r.trackNumbers} />
            <Row label="Track name(s)" value={r.trackName} />
            <Row label="Tags" value={r.tags} />
          </Section>

          <Section title="Digitization">
            <Row label="Status" value={r.digitization ? DIGITIZATION_LABELS[r.digitization] || r.digitization : null} />
            <Row label="Digitize date" value={r.digitizeDate} />
            <Row label="Need to clear" value={needToClear == null ? null : needToClear ? 'Yes' : 'No'} />
          </Section>

          <Section title="Technical specifications">
            <Row label="Extension" value={r.extension} />
            <Row label="Format / codec" value={r.formatCodec} />
            <Row label="Bit / color depth" value={r.bitOrColorDepth} />
            <Row label="Sample / frame rate" value={r.sampleOrFrameRate} />
            <Row label="Channels / resolution" value={r.channelsOrResolution} />
            <Row label="Playback model" value={r.playbackModel} />
            <Row label="Capture interface" value={r.captureInterface} />
            <Row label="Signal interface" value={r.signalInterface} />
            <Row label="Ingest software" value={r.ingestSoftware} />
          </Section>

          {r.archiveDepNote || r.captureDepNote ? (
            <Section title="Notes">
              <Row label="Archive dept. note" value={r.archiveDepNote} full />
              <Row label="Capture dept. note" value={r.captureDepNote} full />
            </Section>
          ) : null}

          <Section title="Record">
            <Row label="Code" value={r.pmCode} mono />
            <Row label="Source" value={r.source} />
            <Row label="Created" value={r.createdAt ? formatDateTime(r.createdAt) : null} />
            <Row label="Created by" value={r.createdBy} />
            <Row label="Updated" value={r.updatedAt ? formatDateTime(r.updatedAt) : null} />
            <Row label="Updated by" value={r.updatedBy} />
          </Section>

          {loading ? (
            <p className="flex items-center gap-2 text-xs text-muted-foreground"><Loader2 className="size-3.5 animate-spin" /> Refreshing…</p>
          ) : null}
        </div>
      )}
    </EmployeeEntityPage>
  )
}
