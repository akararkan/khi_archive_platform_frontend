import { useEffect, useState } from 'react'
import { Calendar, ExternalLink, FolderOpen, Hash, Languages, Pencil, User, X } from 'lucide-react'

import { Button, buttonVariants } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { humanizeFieldName } from '@/lib/get-error-message'
import { formatDateTime } from '@/components/maqam/maqam-helpers'
import { getItemPayload, getTypeMeta } from '@/components/items/item-helpers'
import { TypeBadge, VisibilityBadges } from '@/components/items/item-badges'
import {
  formatCompleteFieldValue,
  isEmptyValue,
} from '@/components/items/full-media-inventory'
import { CompleteMediaInventory } from '@/components/items/CompleteMediaInventory'

// ItemDTO summary fields are distinct from the nested full media payload. Keep
// a stable schema so an empty value is still represented, then append any new
// runtime keys returned by the backend. The four nested payload containers are
// rendered field-by-field in the complete inventory rather than as one giant
// duplicated JSON object.
const ITEM_RECORD_SCHEMA_KEYS = [
  'type',
  'code',
  'title',
  'project',
  'projectCode',
  'projectName',
  'person',
  'personCode',
  'personName',
  'categories',
  'categoryCodes',
  'language',
  'dialect',
  'fileUrl',
  'coverImageUrl',
  'fileExtension',
  'fileSize',
  'isPublic',
  'projectVisibleToPublic',
  'version',
  'createdAt',
  'createdBy',
  'updatedAt',
  'updatedBy',
  'removedAt',
  'removedBy',
  'deletedAt',
  'deletedBy',
]

const PAYLOAD_CONTAINER_KEYS = new Set([
  'audio',
  'image',
  'text',
  'video',
])

function buildItemRecordRows(item) {
  const orderedKeys = [...ITEM_RECORD_SCHEMA_KEYS]
  const seen = new Set(orderedKeys)
  for (const key of Object.keys(item || {})) {
    if (seen.has(key) || PAYLOAD_CONTAINER_KEYS.has(key)) continue
    seen.add(key)
    orderedKeys.push(key)
  }
  return orderedKeys.map((key) => ({
    key,
    label: humanizeFieldName(key),
    value: item?.[key],
  }))
}

function CompleteField({ label, value }) {
  const empty = isEmptyValue(value)
  return (
    <div className={`min-w-0 space-y-0.5${empty ? ' opacity-60' : ''}`}>
      <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">{label}</p>
      <p
        className={`whitespace-pre-wrap break-words text-sm leading-6 ${empty ? 'font-mono text-muted-foreground' : 'text-foreground'}`}
        style={{ overflowWrap: 'anywhere' }}
      >
        {formatCompleteFieldValue(value)}
      </p>
    </div>
  )
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
  }, [item?.type, item?.code, item?.fileUrl, item?.coverImageUrl, item?.text?.coverImageUrl])

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
  const recordFields = buildItemRecordRows(item)
  const previewUrl = item.type === 'IMAGE'
    ? item.fileUrl
    : item.type === 'TEXT'
      ? item.coverImageUrl || payload?.coverImageUrl
      : null
  const showImagePreview = previewUrl && !imgFailed
  const showTextCover = item.type === 'TEXT'
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
      <div className="flex max-h-[90vh] w-full max-w-5xl flex-col overflow-hidden rounded-2xl bg-card shadow-2xl ring-1 ring-black/10">
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
            showTextCover ? (
              <div className="flex justify-center overflow-hidden rounded-2xl border border-amber-900/10 bg-gradient-to-br from-amber-50 via-background to-muted/40 p-5 dark:from-amber-950/20">
                <div className="relative aspect-[2/3] w-40 max-w-[60%]">
                  <span
                    aria-hidden="true"
                    className="absolute inset-1 translate-x-2.5 translate-y-2.5 rounded-xl border border-amber-900/15 bg-amber-100/80 shadow-sm dark:bg-amber-950/30"
                  />
                  <img
                    src={previewUrl}
                    alt={`${item.title || item.code} cover`}
                    onError={() => setImgFailed(true)}
                    className="relative size-full rounded-xl border border-border bg-white object-contain shadow-2xl shadow-black/20"
                  />
                </div>
              </div>
            ) : (
              <img
                src={previewUrl}
                alt={item.title || item.code}
                onError={() => setImgFailed(true)}
                className="max-h-72 w-full rounded-2xl border border-border bg-muted object-contain"
              />
            )
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

          <CompleteMediaInventory
            className="rounded-2xl"
            item={payload}
            kind={item.type}
            title="Complete media fields"
          />

          <section className="rounded-2xl border border-border bg-background p-4">
            <h3 className="mb-3 text-sm font-semibold text-foreground">Complete ItemDTO record</h3>
            <div className="grid gap-x-6 gap-y-3 sm:grid-cols-2 lg:grid-cols-3">
              {recordFields.map((field) => (
                <CompleteField key={field.key} label={field.label} value={field.value} />
              ))}
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
