import { useEffect, useState } from 'react'
import { Calendar, ExternalLink, FolderOpen, Hash, Languages, Pencil, User, X } from 'lucide-react'

import { Button, buttonVariants } from '@/components/ui/button'
import { CodeBadge } from '@/components/ui/code-badge'
import { cn } from '@/lib/utils'
import { humanizeFieldName } from '@/lib/get-error-message'
import { formatDateTime } from '@/components/maqam/maqam-helpers'
import { getItemPayload, getTypeMeta } from '@/components/items/item-helpers'
import { TypeBadge, VisibilityBadges } from '@/components/items/item-badges'

// Keys we render in the curated header/overview already, or that are noise in a
// flat dump (internal bookkeeping, nested objects handled separately).
const SKIP_PAYLOAD_KEYS = new Set([
  'version',
  'project',
  'person',
  'categories',
  'projectVisibleToPublic',
])

// Turn the per-type DTO into a flat list of [label, value] scalar rows so we
// can show every original column without hand-mapping four different shapes.
// Objects are skipped, arrays are comma-joined, booleans become Yes/No.
function flattenPayload(payload) {
  const out = []
  for (const [key, value] of Object.entries(payload || {})) {
    if (SKIP_PAYLOAD_KEYS.has(key)) continue
    if (value == null) continue
    let display
    if (Array.isArray(value)) {
      const items = value.filter((v) => v != null && typeof v !== 'object').map((v) => String(v).trim()).filter(Boolean)
      if (items.length === 0) continue
      display = items.join(', ')
    } else if (typeof value === 'object') {
      continue
    } else if (typeof value === 'boolean') {
      display = value ? 'Yes' : 'No'
    } else {
      display = String(value).trim()
      if (!display) continue
    }
    out.push({ key, label: humanizeFieldName(key), value: display })
  }
  return out
}

function Row({ icon: Icon, label, children }) {
  return (
    <div className="flex items-start gap-2.5">
      {Icon ? <Icon className="mt-0.5 size-3.5 shrink-0 text-muted-foreground" /> : null}
      <div className="min-w-0">
        <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">{label}</p>
        <div className="text-sm leading-6 text-foreground" style={{ overflowWrap: 'anywhere' }}>
          {children}
        </div>
      </div>
    </div>
  )
}

/**
 * Read-only detail view for one unified Item. The list response already carries
 * the full per-type payload, so this renders straight from the row — no fetch.
 *
 * Props:
 *   item        the ItemDTO (null closes the dialog)
 *   onClose
 *   onEdit(item) optional — surfaces a jump-to-edit button in the footer
 */
export function ItemDetailDialog({ item, onClose, onEdit }) {
  const [imgFailed, setImgFailed] = useState(false)

  // Reset the image fallback whenever a different item opens.
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setImgFailed(false)
  }, [item?.type, item?.code])

  useEffect(() => {
    if (!item) return undefined
    const onKey = (e) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [item, onClose])

  if (!item) return null

  const meta = getTypeMeta(item.type)
  const HeaderIcon = meta.icon
  const payload = getItemPayload(item)
  const fields = flattenPayload(payload)
  const showImagePreview = item.type === 'IMAGE' && item.fileUrl && !imgFailed
  const categories = Array.isArray(item.categoryCodes) ? item.categoryCodes.filter(Boolean) : []

  return (
    <div
      className="fixed inset-0 z-[95] flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose()
      }}
      role="dialog"
      aria-modal="true"
    >
      <div className="flex max-h-[90vh] w-full max-w-2xl flex-col overflow-hidden rounded-2xl bg-card shadow-2xl ring-1 ring-black/10">
        {/* Header */}
        <div className="relative shrink-0 border-b border-border bg-gradient-to-b from-primary/[0.06] to-transparent">
          <div className="flex items-start justify-between gap-4 px-6 py-4">
            <div className="flex min-w-0 items-start gap-3">
              <div className={cn('grid size-11 shrink-0 place-items-center rounded-2xl text-primary-foreground shadow-sm', 'bg-primary shadow-primary/30')}>
                <HeaderIcon className="size-5" />
              </div>
              <div className="min-w-0">
                <p className="truncate font-heading text-base font-semibold text-foreground">
                  {item.title || item.code}
                </p>
                <div className="mt-1 flex flex-wrap items-center gap-2">
                  <TypeBadge type={item.type} />
                  <span className="font-mono text-[11px] text-muted-foreground">{item.code}</span>
                  <VisibilityBadges item={item} />
                </div>
              </div>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="grid size-8 shrink-0 place-items-center rounded-lg text-muted-foreground transition hover:bg-muted hover:text-foreground"
              aria-label="Close"
            >
              <X className="size-4" />
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-6 py-5">
          {showImagePreview ? (
            <img
              src={item.fileUrl}
              alt={item.title || item.code}
              onError={() => setImgFailed(true)}
              className="max-h-72 w-full rounded-2xl border border-border bg-muted object-contain"
            />
          ) : null}

          <section className="rounded-2xl border border-border bg-background p-4">
            <h3 className="mb-3 text-sm font-semibold text-foreground">Overview</h3>
            <div className="grid gap-x-6 gap-y-3 sm:grid-cols-2">
              <Row icon={FolderOpen} label="Collection">
                {item.projectName || '—'}
                {item.projectCode ? (
                  <span className="ml-1 font-mono text-[11px] text-muted-foreground">{item.projectCode}</span>
                ) : null}
              </Row>
              <Row icon={User} label="Person">
                {item.personName || item.personCode || <span className="italic text-muted-foreground">Untitled</span>}
              </Row>
              <Row icon={Languages} label="Language / dialect">
                {[item.language, item.dialect].filter(Boolean).join(' · ') || '—'}
              </Row>
              <Row icon={Hash} label="Categories">
                {categories.length ? (
                  <span className="flex flex-wrap gap-1">
                    {categories.map((c) => (
                      <span key={c} className="inline-flex items-center rounded-full border bg-background px-2 py-0.5 text-[11px] text-foreground/80">
                        {c}
                      </span>
                    ))}
                  </span>
                ) : (
                  '—'
                )}
              </Row>
              <Row icon={Calendar} label="Added">{formatDateTime(item.createdAt)}</Row>
              <Row icon={Calendar} label="Updated">{formatDateTime(item.updatedAt)}</Row>
            </div>
          </section>

          {fields.length ? (
            <section className="rounded-2xl border border-border bg-background p-4">
              <h3 className="mb-3 text-sm font-semibold text-foreground">All details</h3>
              <div className="grid gap-x-6 gap-y-3 sm:grid-cols-2">
                {fields.map((f) => (
                  <div key={f.key} className="min-w-0 space-y-0.5">
                    <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">{f.label}</p>
                    <p className="whitespace-pre-line break-words text-sm leading-6 text-foreground" style={{ overflowWrap: 'anywhere' }}>
                      {f.value}
                    </p>
                  </div>
                ))}
              </div>
            </section>
          ) : null}

          <section className="rounded-2xl border border-border bg-background p-4">
            <h3 className="mb-3 text-sm font-semibold text-foreground">Record</h3>
            <div className="grid gap-x-6 gap-y-3 sm:grid-cols-2">
              <Row label="Code"><CodeBadge code={item.code} size="sm" /></Row>
              <Row label="File">
                {item.fileExtension || item.fileSize
                  ? [item.fileExtension ? `.${String(item.fileExtension).replace(/^\./, '')}` : null, item.fileSize].filter(Boolean).join(' · ')
                  : '—'}
              </Row>
              <Row label="Created by">{item.createdBy || '—'}</Row>
              <Row label="Updated by">{item.updatedBy || '—'}</Row>
            </div>
          </section>
        </div>

        {/* Footer */}
        <div className="flex shrink-0 items-center justify-end gap-2 border-t border-border px-6 py-4">
          {item.fileUrl ? (
            <a
              href={item.fileUrl}
              target="_blank"
              rel="noopener noreferrer"
              className={cn(buttonVariants({ variant: 'outline' }), 'gap-2')}
            >
              <ExternalLink className="size-4" />
              Open file
            </a>
          ) : null}
          {onEdit ? (
            <Button type="button" variant="outline" className="gap-2" onClick={() => onEdit(item)}>
              <Pencil className="size-4" />
              Edit
            </Button>
          ) : null}
          <Button type="button" onClick={onClose}>
            Close
          </Button>
        </div>
      </div>
    </div>
  )
}
