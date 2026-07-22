import { useEffect, useState } from 'react'
import { AlertTriangle, Loader2, Plus, X } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useToast } from '@/hooks/use-toast'
import { TYPE_DEFAULT_FIELDS } from '@/lib/physical-media-form'
import { createPhysicalMediaType } from '@/services/physical-media'

// Human labels for the 9 technical-default fields (camelCase API keys → label).
const DEFAULT_LABELS = {
  extension: 'Extension',
  bitOrColorDepth: 'Bit Depth / Color Depth',
  sampleOrFrameRate: 'Sample Rate kHz / Frame Rate FPS',
  channelsOrResolution: 'Channels / resolution',
  playbackModel: 'Playback model',
  captureInterface: 'Capture interface',
  signalInterface: 'Signal interface',
  ingestSoftware: 'Ingest software',
  formatCodec: 'Format / codec',
}

function emptyTypeForm() {
  const form = { name: '', description: '' }
  for (const k of TYPE_DEFAULT_FIELDS) form[k] = ''
  return form
}

/**
 * Create a new physical-media type (admin / physical_media:type_manage).
 *
 * Props:
 *   open, onOpenChange
 *   initialName    — prefill the name (e.g. a value the user was typing)
 *   onCreated(type) — called with the created PhysicalMediaTypeResponseDTO
 */
export function PhysicalMediaTypeDialog({ open, onOpenChange, initialName = '', onCreated }) {
  const toast = useToast()
  const [form, setForm] = useState(emptyTypeForm)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!open) return
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setForm({ ...emptyTypeForm(), name: initialName || '' })
    setSaving(false)
    setError('')
  }, [open, initialName])

  useEffect(() => {
    if (!open) return undefined
    const onKey = (e) => {
      if (e.key === 'Escape' && !saving) onOpenChange(false)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, saving, onOpenChange])

  if (!open) return null

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }))

  const handleSave = async () => {
    if (saving) return
    if (!form.name.trim()) {
      setError('A type name is required.')
      return
    }
    setSaving(true)
    setError('')
    const payload = { name: form.name.trim(), description: form.description.trim() || null }
    for (const k of TYPE_DEFAULT_FIELDS) payload[k] = form[k].trim() || null
    try {
      const created = await createPhysicalMediaType(payload)
      toast.success('Type added', `“${created?.name || form.name}” is now in the catalog.`)
      onCreated?.(created)
      onOpenChange(false)
    } catch (err) {
      setError(err?.response?.data?.message || err?.message || 'Could not create the type.')
      toast.apiError(err, 'Could not create the type.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div
      className="fixed inset-0 z-[96] flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget && !saving) onOpenChange(false)
      }}
      role="dialog"
      aria-modal="true"
    >
      <div className="flex max-h-[90vh] w-full max-w-lg flex-col overflow-hidden rounded-2xl bg-card shadow-2xl ring-1 ring-black/10">
        <div className="flex shrink-0 items-center justify-between gap-4 border-b border-border px-6 py-4">
          <div className="flex min-w-0 items-center gap-3">
            <div className="grid size-9 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary">
              <Plus className="size-4" />
            </div>
            <div className="min-w-0">
              <p className="truncate text-sm font-bold text-foreground">Add physical-media type</p>
              <p className="truncate text-[11px] text-muted-foreground">Its capture defaults autofill the form when picked</p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => !saving && onOpenChange(false)}
            className="grid size-8 place-items-center rounded-lg text-muted-foreground transition hover:bg-muted hover:text-foreground"
            aria-label="Close"
          >
            <X className="size-4" />
          </button>
        </div>

        <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-6 py-5">
          <div className="space-y-1.5">
            <Label htmlFor="pmt-name">
              Type name <span className="text-destructive">*</span>
            </Label>
            <Input
              id="pmt-name"
              value={form.name}
              onChange={(e) => set('name', e.target.value)}
              placeholder="e.g. Betamax"
              autoFocus
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="pmt-description">Description</Label>
            <Input
              id="pmt-description"
              value={form.description}
              onChange={(e) => set('description', e.target.value)}
              placeholder="Optional note about this format"
            />
          </div>

          <div className="space-y-1.5">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Technical capture defaults
            </p>
            <div className="grid gap-3 sm:grid-cols-2">
              {TYPE_DEFAULT_FIELDS.map((k) => (
                <div key={k} className="space-y-1.5">
                  <Label htmlFor={`pmt-${k}`} className="text-xs">
                    {DEFAULT_LABELS[k]}
                  </Label>
                  <Input id={`pmt-${k}`} value={form[k]} onChange={(e) => set(k, e.target.value)} />
                </div>
              ))}
            </div>
          </div>

          {error ? (
            <div className="flex items-center gap-2 rounded-xl border border-destructive/40 bg-destructive/5 px-3 py-2.5 text-sm text-destructive">
              <AlertTriangle className="size-4 shrink-0" />
              <span>{error}</span>
            </div>
          ) : null}
        </div>

        <div className="flex shrink-0 items-center justify-end gap-2 border-t border-border px-6 py-4">
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
            Cancel
          </Button>
          <Button type="button" className="gap-2" onClick={handleSave} disabled={saving || !form.name.trim()}>
            {saving ? <Loader2 className="size-4 animate-spin" /> : <Plus className="size-4" />}
            Add type
          </Button>
        </div>
      </div>
    </div>
  )
}
