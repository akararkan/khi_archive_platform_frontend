import { useEffect, useRef, useState } from 'react'
import { ArrowLeft, FileUp, Loader2 } from 'lucide-react'

import { EmployeeEntityPage } from '@/components/employee/EmployeeEntityPage'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { FormErrorBox } from '@/components/ui/form-error'
import { SingleMediaFilePicker } from '@/components/ui/single-media-file-picker'
import { Skeleton } from '@/components/ui/skeleton'
import { TextCoverImagePicker } from '@/components/text/TextCoverImagePicker'
import { useToast } from '@/hooks/use-toast'
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
import { extractTextMetadata, textMetadataToForm } from '@/lib/media-metadata'

import { getAudio, updateAudio } from '@/services/audio'
import { getVideo, updateVideo } from '@/services/video'
import { getImage, updateImage } from '@/services/image'
import { getText, updateText } from '@/services/text'
import { getProject } from '@/services/project'

const AUDIO_FILE_PATTERN = /\.(wav|mp3|flac|ogg|m4a|aac|aiff|aif|wma|opus)$/i
const VIDEO_FILE_PATTERN = /\.(mp4|mov|mkv|webm|avi|m4v|mpg|mpeg|wmv|flv|3gp|ogv)$/i
const IMAGE_FILE_PATTERN = /\.(jpe?g|png|gif|tiff?|bmp|webp|heic|heif|raw|cr2|cr3|nef|arw|dng|svg)$/i
const TEXT_FILE_PATTERN = /\.(pdf|docx?|odt|rtf|txt|md|tex|epub|mobi|xml|html?|csv|tsv)$/i

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
    accept: 'audio/*,.wav,.mp3,.flac,.ogg,.m4a,.aac,.aiff,.aif,.wma,.opus',
    acceptedFormats: 'WAV, MP3, FLAC, OGG…',
    isAcceptedFile: (file) =>
      Boolean((file.type && file.type.startsWith('audio/')) || AUDIO_FILE_PATTERN.test(file.name)),
  },
  VIDEO: {
    label: 'video',
    FormSections: VideoFormSections,
    populate: populateVideoFormFromVideo,
    build: buildVideoPayload,
    derive: deriveVideoAutoFieldsFromFile,
    fetchOne: getVideo,
    update: updateVideo,
    accept: 'video/*,.mp4,.mov,.mkv,.webm,.avi,.m4v,.mpg,.mpeg,.wmv,.flv,.3gp,.ogv',
    acceptedFormats: 'MP4, MOV, MKV, WEBM…',
    isAcceptedFile: (file) =>
      Boolean((file.type && file.type.startsWith('video/')) || VIDEO_FILE_PATTERN.test(file.name)),
  },
  IMAGE: {
    label: 'image',
    FormSections: ImageFormSections,
    populate: populateImageFormFromImage,
    build: buildImagePayload,
    derive: deriveImageAutoFieldsFromFile,
    fetchOne: getImage,
    update: updateImage,
    accept: 'image/*,.tif,.tiff,.heic,.heif,.raw,.cr2,.cr3,.nef,.arw,.dng',
    acceptedFormats: 'JPG, PNG, TIFF, RAW…',
    isAcceptedFile: (file) =>
      Boolean((file.type && file.type.startsWith('image/')) || IMAGE_FILE_PATTERN.test(file.name)),
  },
  TEXT: {
    label: 'text',
    FormSections: TextFormSections,
    populate: populateTextFormFromText,
    build: buildTextPayload,
    derive: deriveTextAutoFieldsFromFile,
    fetchOne: getText,
    update: updateText,
    accept: '.pdf,.doc,.docx,.odt,.rtf,.txt,.md,.tex,.epub,.mobi,.xml,.html,.htm,.csv,.tsv,application/pdf,text/*',
    acceptedFormats: 'PDF, DOCX, TXT, MD, EPUB…',
    isAcceptedFile: (file) =>
      Boolean(
        TEXT_FILE_PATTERN.test(file.name) ||
          (file.type &&
            (file.type.startsWith('text/') ||
              file.type === 'application/pdf' ||
              file.type.includes('word') ||
              file.type.includes('opendocument'))),
      ),
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
  const [coverImage, setCoverImage] = useState(null)
  const [projectCategories, setProjectCategories] = useState([])
  const metadataSessionRef = useRef(0)

  // Populate the form with the record's CURRENT field values, then load the
  // parent project's categories for the genre picker.
  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    if (!item || !cfg) return undefined
    let cancelled = false
    metadataSessionRef.current += 1

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

  const handlePickFile = (picked) => {
    const sessionId = ++metadataSessionRef.current
    setFile(picked)
    // Replacing the file means the file-bound technical fields should follow it.
    if (picked) {
      const derived = cfg.derive(picked)
      if (derived) setForm((f) => ({ ...f, ...derived }))

      if (item.type === 'TEXT') {
        extractTextMetadata(picked)
          .then((metadata) => {
            if (sessionId !== metadataSessionRef.current) return
            const extracted = textMetadataToForm(metadata)
            if (Object.keys(extracted).length > 0) {
              setForm((current) => ({ ...current, ...extracted }))
            }
          })
          .catch(() => {})
      }
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!form) return
    setFormError('')
    setIsSaving(true)
    try {
      const payload = cfg.build(form, item.projectCode)
      const coverImageFile = item.type === 'TEXT' ? coverImage : undefined
      // The project is fixed once a record exists — backend forbids re-parenting.
      delete payload.projectCode
      // Pass coverImage for text updates (multipart part `coverImage`)
      const saved = await cfg.update(
        item.code,
        payload,
        file,
        coverImageFile,
      )
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
            {item.type === 'TEXT' ? (
              <TextCoverImagePicker
                id={`item-${item.type.toLowerCase()}-cover`}
                file={coverImage}
                currentUrl={form.coverImageUrl || item.coverImageUrl || (item.text && item.text.coverImageUrl) || ''}
                onFileChange={setCoverImage}
              />
            ) : null}

            <FormSections form={form} setForm={setForm} projectCategories={projectCategories} />

            {/* Optional file replacement */}
            <Card className="border-border bg-card shadow-sm shadow-black/5">
              <CardHeader className="border-b border-border pb-4">
                <CardTitle className="text-base font-semibold">Replace file</CardTitle>
                <CardDescription className="text-xs">
                  Optional — leave empty to keep the current file. Picking a new one re-fills the
                  file metadata and path fields.
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
                <SingleMediaFilePicker
                  id={`item-${item.type.toLowerCase()}-file`}
                  file={file}
                  onFileChange={handlePickFile}
                  mediaLabel={cfg.label}
                  accept={cfg.accept}
                  acceptedFormats={cfg.acceptedFormats}
                  isEdit
                  icon={FileUp}
                  isAcceptedFile={cfg.isAcceptedFile}
                />
              </CardContent>
            </Card>

            {formError ? <FormErrorBox error={formError} /> : null}
          </form>

          <div className="sticky bottom-3 z-40 sm:bottom-4">
            <Card className="overflow-hidden rounded-2xl border border-border/70 bg-background/90 shadow-[0_22px_70px_-32px_rgba(15,23,42,0.55)] backdrop-blur-xl">
              <CardFooter className="flex flex-col-reverse gap-3 px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:px-6">
                <p className="text-xs text-muted-foreground">Your changes stay handy at the bottom while you scroll.</p>
                <div className="flex items-center justify-end gap-2">
                  <Button type="button" variant="outline" onClick={onCancel} disabled={isSaving}>
                    Cancel
                  </Button>
                  <Button type="submit" form="item-edit-form" disabled={isSaving} className="gap-2">
                    {isSaving ? <Loader2 className="size-4 animate-spin" /> : null}
                    {isSaving ? 'Saving…' : 'Save changes'}
                  </Button>
                </div>
              </CardFooter>
            </Card>
          </div>
        </>
      )}
    </EmployeeEntityPage>
  )
}
