import { useEffect, useRef, useState } from 'react'
import { ArrowLeft, FileUp, Loader2, X } from 'lucide-react'

import { EmployeeEntityPage } from '@/components/employee/EmployeeEntityPage'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { FormErrorBox } from '@/components/ui/form-error'
import { Skeleton } from '@/components/ui/skeleton'
import { useToast } from '@/hooks/use-toast'
import { cn } from '@/lib/utils'
import { formatApiError, isStaleVersionError } from '@/lib/get-error-message'
import { getItemPayload, getTypeMeta } from '@/components/items/item-helpers'

import { AudioFormSections } from '@/components/audio/AudioFormSections'
import { VideoFormSections } from '@/components/video/VideoFormSections'
import { ImageFormSections } from '@/components/image/ImageFormSections'
import { TextFormSections } from '@/components/text/TextFormSections'

import {
  buildAudioPayload,
  deriveAudioAutoFieldsFromFile,
  populateAudioFormFromAudio,
} from '@/lib/audio-form'
import {
  buildVideoPayload,
  deriveVideoAutoFieldsFromFile,
  populateVideoFormFromVideo,
} from '@/lib/video-form'
import {
  buildImagePayload,
  deriveImageAutoFieldsFromFile,
  populateImageFormFromImage,
} from '@/lib/image-form'
import {
  buildTextPayload,
  deriveTextAutoFieldsFromFile,
  populateTextFormFromText,
} from '@/lib/text-form'

import { getAudio, updateAudio } from '@/services/audio'
import { getVideo, updateVideo } from '@/services/video'
import { getImage, updateImage } from '@/services/image'
import { getText, updateText } from '@/services/text'
import { getProject } from '@/services/project'

// One config per media type wires the shared form module + service to the
// uniform edit flow. Each *update* is multipart (JSON payload + optional file)
// and the backend forbids changing the project on update, so projectCode is
// stripped from the payload (mirrors EmployeeProjectDetailPage's edit handlers).
const TYPE_CONFIG = {
  AUDIO: {
    label: 'audio',
    FormSections: AudioFormSections,
    populate: populateAudioFormFromAudio,
    build: buildAudioPayload,
    derive: deriveAudioAutoFieldsFromFile,
    fetchOne: getAudio,
    update: updateAudio,
    accept: 'audio/*',
  },
  VIDEO: {
    label: 'video',
    FormSections: VideoFormSections,
    populate: populateVideoFormFromVideo,
    build: buildVideoPayload,
    derive: deriveVideoAutoFieldsFromFile,
    fetchOne: getVideo,
    update: updateVideo,
    accept: 'video/*',
  },
  IMAGE: {
    label: 'image',
    FormSections: ImageFormSections,
    populate: populateImageFormFromImage,
    build: buildImagePayload,
    derive: deriveImageAutoFieldsFromFile,
    fetchOne: getImage,
    update: updateImage,
    accept: 'image/*',
  },
  TEXT: {
    label: 'text',
    FormSections: TextFormSections,
    populate: populateTextFormFromText,
    build: buildTextPayload,
    derive: deriveTextAutoFieldsFromFile,
    fetchOne: getText,
    update: updateText,
    accept: '.pdf,.doc,.docx,.txt,.rtf,.odt,.epub,.md',
  },
}

/**
 * Full-page edit view for a single unified Item — the same big metadata form the
 * project-detail page uses, driven polymorphically by item.type and saved via the
 * per-type update API. The list response already carries the full per-type DTO,
 * so the form populates instantly from item[type]; the parent project is fetched
 * only to seed the genre suggestions.
 *
 * Props:
 *   item       the ItemDTO to edit
 *   onCancel   () => void   — leave without saving
 *   onSaved    () => void   — saved (or bounced on stale version); refresh + close
 */
export function ItemEditForm({ item, onCancel, onSaved }) {
  const toast = useToast()
  const cfg = TYPE_CONFIG[item?.type]

  const [form, setForm] = useState(null)
  const [formError, setFormError] = useState('')
  const [isSaving, setIsSaving] = useState(false)
  const [file, setFile] = useState(null)
  const [projectCategories, setProjectCategories] = useState([])
  const fileInputRef = useRef(null)

  // Populate the form with the record's CURRENT field values, then load the
  // parent project's categories for the genre picker.
  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    if (!item || !cfg) return undefined
    let cancelled = false

    // Instant partial fill from whatever the list row already carries, so the
    // form isn't blank while the full record loads.
    const embedded = getItemPayload(item)
    if (embedded) setForm(cfg.populate(embedded))

    // Always fetch the COMPLETE record by code so every field shows its current
    // value — the unified /api/items payload can be a trimmed projection, which
    // is why some fields appeared empty in the editor.
    cfg
      .fetchOne(item.code)
      .then((full) => {
        if (!cancelled && full) setForm(cfg.populate(full))
      })
      .catch(() => {
        if (!cancelled && !embedded) toast.error('Could not load the record', 'Please go back and try again.')
      })

    setFile(null)
    setFormError('')

    if (item.projectCode) {
      getProject(item.projectCode)
        .then((p) => {
          if (!cancelled) setProjectCategories(p?.categories || [])
        })
        .catch(() => {
          if (!cancelled) setProjectCategories([])
        })
    } else {
      setProjectCategories([])
    }

    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [item?.type, item?.code])
  /* eslint-enable react-hooks/set-state-in-effect */

  if (!item || !cfg) return null

  const meta = getTypeMeta(item.type)
  const FormSections = cfg.FormSections

  const handlePickFile = (e) => {
    const picked = e.target.files?.[0] || null
    setFile(picked)
    // Replacing the file means the file-bound technical fields should follow it.
    if (picked) {
      const derived = cfg.derive(picked)
      if (derived) setForm((f) => ({ ...f, ...derived }))
    }
  }

  const clearFile = () => {
    setFile(null)
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!form) return
    setFormError('')
    setIsSaving(true)
    try {
      const payload = cfg.build(form, item.projectCode)
      // The project is fixed once a record exists — backend forbids re-parenting.
      delete payload.projectCode
      const saved = await cfg.update(item.code, payload, file)
      toast.success(
        `${meta.label} updated`,
        `${saved?.[`${cfg.label}Code`] || item.code} changes were saved.`,
      )
      onSaved?.()
    } catch (err) {
      // Optimistic-locking conflict — bounce to the list so re-opening reloads.
      if (isStaleVersionError(err)) {
        toast.apiError(err, 'Reload required')
        onSaved?.()
        return
      }
      setFormError(formatApiError(err, `Failed to save ${cfg.label}`))
      toast.apiError(err, `Unable to save ${cfg.label}`)
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <EmployeeEntityPage
      eyebrow="Editing"
      title={`Edit ${cfg.label}`}
      badge={item.code}
      description={`Update this ${cfg.label} record. Changes are saved straight to the catalogue.`}
      action={
        <Button type="button" variant="outline" className="gap-2 shrink-0" onClick={onCancel} disabled={isSaving}>
          <ArrowLeft className="size-4" />
          Back to list
        </Button>
      }
    >
      {!form ? (
        <div className="space-y-4">
          <Skeleton className="h-20 w-full rounded-2xl" />
          <Skeleton className="h-64 w-full rounded-2xl" />
          <Skeleton className="h-64 w-full rounded-2xl" />
        </div>
      ) : (
        <>
          <form id="item-edit-form" onSubmit={handleSubmit} className="space-y-5">
            <FormSections form={form} setForm={setForm} projectCategories={projectCategories} />

            {/* Optional file replacement */}
            <Card className="border-border bg-card shadow-sm shadow-black/5">
              <CardHeader className="border-b border-border pb-4">
                <CardTitle className="text-base font-semibold">Replace file</CardTitle>
                <CardDescription className="text-xs">
                  Optional — leave empty to keep the current file. Picking a new one re-fills the
                  extension, size and path fields.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3 pt-5">
                {item.fileExtension || item.fileSize ? (
                  <p className="text-xs text-muted-foreground">
                    Current file:{' '}
                    <span className="font-medium text-foreground">
                      {[item.fileExtension ? `.${String(item.fileExtension).replace(/^\./, '')}` : null, item.fileSize]
                        .filter(Boolean)
                        .join(' · ') || '—'}
                    </span>
                  </p>
                ) : null}
                <div className="flex flex-wrap items-center gap-2">
                  <label
                    className={cn(
                      'inline-flex cursor-pointer items-center gap-2 rounded-lg border border-input bg-background px-3 py-2 text-sm font-medium shadow-sm transition-colors hover:bg-muted',
                    )}
                  >
                    <FileUp className="size-4" />
                    Choose new file
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept={cfg.accept}
                      className="hidden"
                      onChange={handlePickFile}
                    />
                  </label>
                  {file ? (
                    <span className="inline-flex max-w-full items-center gap-1.5 rounded-full bg-muted/60 px-2.5 py-1 text-xs text-foreground">
                      <span className="max-w-[18rem] truncate">{file.name}</span>
                      <button
                        type="button"
                        onClick={clearFile}
                        className="text-muted-foreground transition hover:text-foreground"
                        aria-label="Remove selected file"
                      >
                        <X className="size-3" />
                      </button>
                    </span>
                  ) : (
                    <span className="text-xs text-muted-foreground">No new file selected</span>
                  )}
                </div>
              </CardContent>
            </Card>

            {formError ? <FormErrorBox error={formError} /> : null}
          </form>

          <Card className="border-border bg-card shadow-sm shadow-black/5">
            <CardFooter className="flex items-center justify-end gap-2 px-6 py-4">
              <Button type="button" variant="outline" onClick={onCancel} disabled={isSaving}>
                Cancel
              </Button>
              <Button type="submit" form="item-edit-form" disabled={isSaving} className="gap-2">
                {isSaving ? <Loader2 className="size-4 animate-spin" /> : null}
                {isSaving ? 'Saving…' : 'Save changes'}
              </Button>
            </CardFooter>
          </Card>
        </>
      )}
    </EmployeeEntityPage>
  )
}
