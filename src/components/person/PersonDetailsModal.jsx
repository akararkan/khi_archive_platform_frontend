import { useEffect } from 'react'
import { X } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { CodeBadge } from '@/components/ui/code-badge'
import { PersonPortrait } from '@/components/person/PersonPortrait'
import { useIsAdmin } from '@/hooks/use-current-profile'

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
  const pad = (v) =>
    v !== null && v !== undefined && v !== '' ? String(v).padStart(2, '0') : '--'
  return `${year || '----'}-${pad(month)}-${pad(day)}`
}

function resolveDate(person, type) {
  const raw = person[`dateOf${type}`]
  const precision = person[`dateOf${type}Precision`]
  if (raw) {
    return {
      date: formatDate(raw, precision),
      precision,
      year: String(raw).slice(0, 4),
    }
  }
  const yearPart = person[`dateOf${type}Year`]
  const date = formatDateFromParts(yearPart, person[`dateOf${type}Month`], person[`dateOf${type}Day`])
  return {
    date,
    precision: null,
    year: yearPart ? String(yearPart) : null,
  }
}

function formatInstant(instant) {
  if (!instant) return null
  try {
    return new Intl.DateTimeFormat('en-GB', {
      year: 'numeric',
      month: 'short',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    }).format(new Date(instant))
  } catch {
    return String(instant)
  }
}

function formatList(value) {
  if (!value) return null
  if (Array.isArray(value)) return value.length ? value.join(', ') : null
  const parts = String(value)
    .split(/[,،;]/)
    .map((s) => s.trim())
    .filter(Boolean)
  return parts.length ? parts.join(', ') : null
}

function computeLifespan(birthYear, deathYear) {
  const b = birthYear ? parseInt(birthYear, 10) : null
  const d = deathYear ? parseInt(deathYear, 10) : null
  if (!b || Number.isNaN(b)) return null
  if (d && !Number.isNaN(d)) return `${d - b} years`
  return null
}

function formatPreciseDate(entry) {
  if (!entry.date) return '—'
  if (entry.precision && entry.precision !== 'DAY') {
    return `${entry.date} · ${entry.precision.toLowerCase()} only`
  }
  return entry.date
}

/* ─── primitives ─────────────────────────────────────────────────────────── */

function Chip({ children, variant = 'default' }) {
  const styles = {
    default:
      'border-border/80 bg-muted/60 text-foreground/80',
    code:
      'border-border/80 bg-background text-foreground/80 font-mono tracking-tight',
    danger:
      'border-destructive/25 bg-destructive/10 text-destructive',
  }
  return (
    <span
      className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-[11px] font-medium leading-5 ${styles[variant]}`}
    >
      {children}
    </span>
  )
}

function Field({ label, value }) {
  if (value === null || value === undefined || value === '') return null
  return (
    <div className="space-y-1.5">
      <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
        {label}
      </p>
      <p className="break-words text-sm leading-6 text-foreground">{value}</p>
    </div>
  )
}

function Section({ title, children }) {
  return (
    <section className="space-y-3">
      <div className="flex items-center gap-3">
        <h3 className="text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
          {title}
        </h3>
        <div className="h-px flex-1 bg-border" />
      </div>
      {children}
    </section>
  )
}

/* ─── lifespan ───────────────────────────────────────────────────────────── */

function LifespanBlock({ birth, death, birthPlace, deathPlace }) {
  if (!birth.date && !death.date && !birthPlace && !deathPlace) return null
  const lifespan = computeLifespan(birth.year, death.year)

  return (
    <div className="rounded-lg border bg-muted/30">
      <div className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-2 px-5 py-4">
        <div className="flex items-baseline gap-3 font-heading">
          <span className="text-3xl font-semibold tracking-tight text-foreground">
            {birth.year || '?'}
          </span>
          <span className="text-xl text-muted-foreground/70">—</span>
          <span className="text-3xl font-semibold tracking-tight text-foreground">
            {death.year || <span className="text-muted-foreground/60">Present</span>}
          </span>
        </div>
        {lifespan && (
          <span className="text-[11px] font-medium uppercase tracking-[0.14em] text-muted-foreground">
            {lifespan}
          </span>
        )}
      </div>

      {(birth.date || death.date || birthPlace || deathPlace) && (
        <div className="grid gap-5 border-t px-5 py-4 sm:grid-cols-2">
          <div className="space-y-1">
            <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
              Born
            </p>
            <p className="text-sm text-foreground">{formatPreciseDate(birth)}</p>
            {birthPlace && (
              <p className="text-sm text-muted-foreground">{birthPlace}</p>
            )}
          </div>
          <div className="space-y-1">
            <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
              Died
            </p>
            <p className="text-sm text-foreground">{formatPreciseDate(death)}</p>
            {deathPlace && (
              <p className="text-sm text-muted-foreground">{deathPlace}</p>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

/* ─── modal ──────────────────────────────────────────────────────────────── */

function PersonDetailsModal({ person, open, onOpenChange }) {
  const isAdmin = useIsAdmin()

  useEffect(() => {
    if (!open) return undefined
    const handleEscape = (e) => {
      if (e.key === 'Escape') onOpenChange(false)
    }
    window.addEventListener('keydown', handleEscape)
    return () => window.removeEventListener('keydown', handleEscape)
  }, [onOpenChange, open])

  useEffect(() => {
    if (!open) return undefined
    const original = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = original
    }
  }, [open])

  if (!open || !person) return null

  const birth = resolveDate(person, 'Birth')
  const death = resolveDate(person, 'Death')
  const personTypes = Array.isArray(person.personType)
    ? person.personType
    : person.personType
      ? [person.personType]
      : []

  const hasLifeEvents =
    birth.date || death.date || person.placeOfBirth || person.placeOfDeath

  const tagsFmt = formatList(person.tag)
  const keywordsFmt = formatList(person.keywords)
  const hasClassification = tagsFmt || keywordsFmt

  const hasAudit =
    person.createdAt ||
    person.updatedAt ||
    person.createdBy ||
    person.updatedBy ||
    person.deletedAt ||
    person.deletedBy

  const showRomanized =
    person.romanizedName && person.romanizedName !== person.fullName

  return (
    <div
      className="fixed inset-0 z-[96] flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm animate-in fade-in-0 duration-200 sm:p-6"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onOpenChange(false)
      }}
      role="dialog"
      aria-modal="true"
      aria-labelledby="person-details-title"
    >
      <div
        className="relative flex max-h-[92vh] w-full max-w-3xl flex-col overflow-hidden rounded-xl border bg-card text-card-foreground shadow-2xl shadow-black/40 animate-in fade-in-0 zoom-in-95 slide-in-from-bottom-2 duration-200"
      >
        {/* close */}
        <Button
          type="button"
          variant="ghost"
          size="icon"
          onClick={() => onOpenChange(false)}
          className="absolute right-3 top-3 z-20 size-8 rounded-full bg-background/80 opacity-80 ring-1 ring-border backdrop-blur-md transition hover:opacity-100"
        >
          <X className="size-4" />
          <span className="sr-only">Close</span>
        </Button>

        {/* hero */}
        <div className="relative shrink-0 border-b bg-gradient-to-b from-muted/70 via-muted/20 to-transparent px-6 pb-6 pt-7 sm:px-8 sm:pb-7 sm:pt-8">
          <div className="flex flex-col gap-5 sm:flex-row sm:gap-7">
            {/* portrait */}
            <div className="shrink-0">
              <div className="group relative h-56 w-44 overflow-hidden rounded-xl ring-1 ring-border shadow-lg shadow-black/25 sm:h-64 sm:w-48">
                <PersonPortrait
                  src={person.mediaPortrait}
                  name={person.fullName}
                  rounded="rounded-xl"
                  loading="eager"
                  className="size-full"
                  fallbackClassName="text-6xl"
                  imgClassName="size-full transition-transform duration-500 group-hover:scale-[1.04]"
                />
                <div className="pointer-events-none absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-black/35 to-transparent opacity-0 transition-opacity group-hover:opacity-100" />
              </div>
            </div>

            {/* identity */}
            <div className="flex min-w-0 flex-1 flex-col justify-between gap-4 pr-10 sm:pr-12">
              <div className="min-w-0 space-y-2.5">
                {person.personCode && (
                  <div className="flex items-center gap-2">
                    <CodeBadge code={person.personCode} />
                    {person.deletedAt && <Chip variant="danger">Deleted</Chip>}
                  </div>
                )}
                <h2
                  id="person-details-title"
                  className="break-words font-heading text-2xl font-semibold leading-tight tracking-tight text-foreground sm:text-[1.9rem]"
                >
                  {person.fullName}
                </h2>
                {person.nickname && (
                  <p className="text-base italic text-muted-foreground">
                    “{person.nickname}”
                  </p>
                )}
                {showRomanized && (
                  <p className="text-sm text-muted-foreground/80">
                    {person.romanizedName}
                  </p>
                )}
              </div>

              <div className="flex flex-wrap items-center gap-1.5">
                {personTypes.map((t) => (
                  <Chip key={t}>{t}</Chip>
                ))}
                {person.gender && <Chip>{person.gender}</Chip>}
                {person.region && <Chip>{person.region}</Chip>}
              </div>
            </div>
          </div>
        </div>

        {/* body */}
        <div className="flex-1 overflow-y-auto px-6 py-7 sm:px-8">
          <div className="space-y-8">
            {hasLifeEvents && (
              <Section title="Life">
                <LifespanBlock
                  birth={birth}
                  death={death}
                  birthPlace={person.placeOfBirth}
                  deathPlace={person.placeOfDeath}
                />
              </Section>
            )}

            {hasClassification && (
              <Section title="Classification">
                <div className="grid gap-5 sm:grid-cols-2">
                  <Field label="Tags" value={tagsFmt} />
                  <Field label="Keywords" value={keywordsFmt} />
                </div>
              </Section>
            )}

            {person.description && (
              <Section title="Biography">
                <p className="whitespace-pre-wrap border-l-2 border-border pl-4 text-sm leading-7 text-foreground/90">
                  {person.description}
                </p>
              </Section>
            )}

            {person.note && (
              <Section title="Internal Note">
                <div className="rounded-lg border border-amber-500/25 bg-amber-500/5 p-4">
                  <p className="whitespace-pre-wrap text-sm leading-6 text-foreground/90">
                    {person.note}
                  </p>
                </div>
              </Section>
            )}

            {isAdmin && hasAudit && (
              <details className="group rounded-lg border bg-muted/20 px-4 py-3 open:pb-4 [&_summary::-webkit-details-marker]:hidden">
                <summary className="flex cursor-pointer list-none items-center justify-between text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground transition-colors hover:text-foreground">
                  <span>Audit Trail</span>
                  <span
                    aria-hidden="true"
                    className="text-base text-muted-foreground transition-transform duration-200 group-open:rotate-90"
                  >
                    ›
                  </span>
                </summary>
                <div className="mt-4 grid gap-5 border-t pt-4 sm:grid-cols-2">
                  <div className="space-y-3">
                    <Field label="Created At" value={formatInstant(person.createdAt)} />
                    <Field label="Created By" value={person.createdBy} />
                    <Field label="Updated At" value={formatInstant(person.updatedAt)} />
                    <Field label="Updated By" value={person.updatedBy} />
                  </div>
                  <div className="space-y-3">
                    <Field label="Deleted At" value={formatInstant(person.deletedAt)} />
                    <Field label="Deleted By" value={person.deletedBy} />
                  </div>
                </div>
              </details>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

export { PersonDetailsModal }
