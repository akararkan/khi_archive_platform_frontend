import { useEffect } from 'react'
import { X } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

/* ─── helpers ────────────────────────────────────────────────────────────── */

function formatDate(raw, precision) {
  if (!raw) return null
  const str = typeof raw === 'string' ? raw : String(raw)
  const [yyyy, mm, dd] = str.split('-')
  if (!precision || precision === 'DAY') return `${yyyy}-${mm}-${dd}`
  if (precision === 'MONTH') return `${yyyy}-${mm}`
  if (precision === 'YEAR') return yyyy
  return str
}

function formatDateFromParts(year, month, day) {
  if (!year && !month && !day) return null
  const pad = (v) => (v !== null && v !== undefined && v !== '' ? String(v).padStart(2, '0') : '--')
  return `${year || '----'}-${pad(month)}-${pad(day)}`
}

function resolveDate(person, type) {
  const raw = person[`dateOf${type}`]
  const precision = person[`dateOf${type}Precision`]
  if (raw) return { date: formatDate(raw, precision), precision }
  const date = formatDateFromParts(
    person[`dateOf${type}Year`],
    person[`dateOf${type}Month`],
    person[`dateOf${type}Day`],
  )
  return { date, precision: null }
}

function formatInstant(instant) {
  if (!instant) return null
  try {
    return new Intl.DateTimeFormat('en-GB', {
      year: 'numeric', month: 'short', day: '2-digit',
      hour: '2-digit', minute: '2-digit',
    }).format(new Date(instant))
  } catch {
    return String(instant)
  }
}

function formatList(value) {
  if (!value) return null
  if (Array.isArray(value)) return value.length ? value.join(', ') : null
  const parts = String(value).split(/[,،;]/).map((s) => s.trim()).filter(Boolean)
  return parts.length ? parts.join(', ') : null
}

/* ─── primitives ─────────────────────────────────────────────────────────── */

function Chip({ children }) {
  return (
    <span className="inline-flex items-center rounded-md border border-border bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground">
      {children}
    </span>
  )
}

function InfoRow({ label, value }) {
  if (value === null || value === undefined || value === '') return null
  return (
    <div className="grid grid-cols-[150px_minmax(0,1fr)] gap-3 border-b border-border/60 py-2 text-sm">
      <p className="font-medium text-muted-foreground">{label}</p>
      <p className="break-words text-foreground">{value}</p>
    </div>
  )
}

function SectionTitle({ children }) {
  return (
    <p className="mb-2 mt-4 text-xs font-semibold uppercase tracking-widest text-muted-foreground first:mt-0">
      {children}
    </p>
  )
}

function HRule() {
  return <div className="my-5 border-t border-border" />
}

/* ─── modal ──────────────────────────────────────────────────────────────── */

function PersonDetailsModal({ person, open, onOpenChange }) {
  useEffect(() => {
    if (!open) return undefined
    const handleEscape = (e) => { if (e.key === 'Escape') onOpenChange(false) }
    window.addEventListener('keydown', handleEscape)
    return () => window.removeEventListener('keydown', handleEscape)
  }, [onOpenChange, open])

  if (!open || !person) return null

  const initial = person.fullName?.charAt(0)?.toUpperCase() ?? 'P'
  const birth = resolveDate(person, 'Birth')
  const death = resolveDate(person, 'Death')
  const personTypes = Array.isArray(person.personType)
    ? person.personType
    : person.personType ? [person.personType] : []

  const hasAudit =
    person.createdAt || person.updatedAt || person.createdBy || person.updatedBy ||
    person.deletedAt || person.deletedBy

  return (
    <div
      className="fixed inset-0 z-[96] flex items-center justify-center bg-black/45 px-4 py-6 backdrop-blur-[2px]"
      onMouseDown={(e) => { if (e.target === e.currentTarget) onOpenChange(false) }}
      role="dialog"
      aria-modal="true"
      aria-label="Person details"
    >
      <Card className="max-h-[92vh] w-full max-w-4xl overflow-hidden border-border bg-card shadow-xl shadow-black/20">

        {/* ── header ── */}
        <CardHeader className="border-b border-border bg-muted/20 px-6 py-4">
          <div className="flex items-start justify-between gap-3">
            <div>
              <CardTitle className="text-xl font-semibold">{person.fullName}</CardTitle>
              {person.nickname && (
                <p className="mt-0.5 text-sm italic text-muted-foreground">"{person.nickname}"</p>
              )}
              <div className="mt-2 flex flex-wrap gap-1.5">
                <Chip>{person.personCode}</Chip>
                {personTypes.map((t) => (
                  <Chip key={t}>{t}</Chip>
                ))}
              </div>
            </div>
            <Button type="button" variant="ghost" size="icon" onClick={() => onOpenChange(false)}>
              <X className="size-4" />
              <span className="sr-only">Close</span>
            </Button>
          </div>
        </CardHeader>

        {/* ── body ── */}
        <CardContent className="max-h-[calc(92vh-96px)] overflow-y-auto px-6 py-5">
          <div className="flex gap-6">

            {/* portrait */}
            <div className="flex-shrink-0">
              {person.mediaPortrait ? (
                <img
                  src={person.mediaPortrait}
                  alt={person.fullName}
                  className="h-48 w-36 rounded-lg border border-border object-cover shadow-sm"
                />
              ) : (
                <div className="flex h-48 w-36 items-center justify-center rounded-lg border border-border bg-muted text-3xl font-semibold text-muted-foreground shadow-sm">
                  {initial}
                </div>
              )}
            </div>

            {/* fields */}
            <div className="min-w-0 flex-1">

              <SectionTitle>Identity</SectionTitle>
              <InfoRow label="Full Name"      value={person.fullName} />
              <InfoRow label="Nickname"       value={person.nickname} />
              <InfoRow label="Romanized Name" value={person.romanizedName} />
              <InfoRow label="Gender"         value={person.gender} />
              <InfoRow label="Type"           value={formatList(person.personType)} />
              <InfoRow label="Region"         value={person.region} />

              <SectionTitle>Life Events</SectionTitle>
              <InfoRow
                label="Birth Date"
                value={birth.date
                  ? birth.precision && birth.precision !== 'DAY'
                    ? `${birth.date} (${birth.precision.toLowerCase()} only)`
                    : birth.date
                  : null}
              />
              <InfoRow label="Birth Place"    value={person.placeOfBirth} />
              <InfoRow
                label="Death Date"
                value={death.date
                  ? death.precision && death.precision !== 'DAY'
                    ? `${death.date} (${death.precision.toLowerCase()} only)`
                    : death.date
                  : null}
              />
              <InfoRow label="Death Place"    value={person.placeOfDeath} />

              <SectionTitle>Classification</SectionTitle>
              <InfoRow label="Tags"           value={formatList(person.tag)} />
              <InfoRow label="Keywords"       value={formatList(person.keywords)} />

            </div>
          </div>

          {/* biography */}
          {person.description && (
            <div className="mt-5 rounded-lg border border-border bg-muted/30 px-4 py-3">
              <p className="mb-1.5 text-xs font-semibold uppercase tracking-widest text-muted-foreground">Biography / Description</p>
              <p className="whitespace-pre-wrap text-sm leading-6 text-foreground">{person.description}</p>
            </div>
          )}

          {/* internal note */}
          {person.note && (
            <div className="mt-3 rounded-lg border border-border bg-muted/30 px-4 py-3">
              <p className="mb-1.5 text-xs font-semibold uppercase tracking-widest text-muted-foreground">Internal Note</p>
              <p className="whitespace-pre-wrap text-sm leading-6 text-foreground">{person.note}</p>
            </div>
          )}

          {/* audit trail */}
          {hasAudit && (
            <>
              <HRule />
              <SectionTitle>Audit Trail</SectionTitle>
              <div className="grid gap-x-8 sm:grid-cols-2">
                <div>
                  <InfoRow label="Created At"  value={formatInstant(person.createdAt)} />
                  <InfoRow label="Created By"  value={person.createdBy} />
                  <InfoRow label="Updated At"  value={formatInstant(person.updatedAt)} />
                  <InfoRow label="Updated By"  value={person.updatedBy} />
                </div>
                <div>
                  <InfoRow label="Deleted At"  value={formatInstant(person.deletedAt)} />
                  <InfoRow label="Deleted By"  value={person.deletedBy} />
                </div>
              </div>
            </>
          )}

        </CardContent>
      </Card>
    </div>
  )
}

export { PersonDetailsModal }