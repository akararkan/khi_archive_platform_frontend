import { useEffect, useMemo, useRef, useState } from 'react'
import { FileAudio, Loader2, Music4, Plus, Upload, UserPlus, X } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { FieldHelpButton } from '@/components/ui/field-help'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { SearchSelect } from '@/components/ui/search-select'
import { useToast } from '@/hooks/use-toast'
import { cn } from '@/lib/utils'
import { isStaleVersionError } from '@/lib/get-error-message'
import { getMaqamFieldMetadata } from '@/lib/maqam-fields-metadata'
import { MAX_TEACHERS, formatFileSize } from '@/components/maqam/maqam-helpers'
import { createMaqam, updateMaqam } from '@/services/maqam'

const MAX_AUDIO_BYTES = 1024 * 1024 * 1024 // 1 GB, matches the backend cap.

/**
 * Create / edit a maqam song record (song fields + audio + optional roster).
 *
 * Props:
 *   open, onOpenChange
 *   mode               'create' | 'edit'
 *   record             the MaqamResponse being edited (edit mode)
 *   allowTeacherAssignment  admins may seed the teacher panel at create time
 *   teacherOptions     [{ id, username, name }] active TEACHER users
 *   onSaved(record)    called with the saved MaqamResponse on success
 */
export function MaqamFormDialog({
  open,
  onOpenChange,
  mode = 'create',
  record = null,
  allowTeacherAssignment = false,
  teacherOptions = [],
  onSaved,
}) {
  const toast = useToast()
  const fileInputRef = useRef(null)

  const [songName, setSongName] = useState('')
  const [producer, setProducer] = useState('')
  const [archiveNote, setArchiveNote] = useState('')
  const [file, setFile] = useState(null)
  const [teacherIds, setTeacherIds] = useState([])
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  const isEdit = mode === 'edit'

  useEffect(() => {
    if (!open) return
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setSongName(record?.songName ?? '')
    setProducer(record?.producer ?? '')
    setArchiveNote(record?.archiveNote ?? '')
    setFile(null)
    setTeacherIds([])
    setSubmitting(false)
    setError('')
  }, [open, record])

  useEffect(() => {
    if (!open) return undefined
    const onKey = (e) => {
      if (e.key === 'Escape' && !submitting) onOpenChange(false)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, submitting, onOpenChange])

  const availableTeachers = useMemo(
    () => teacherOptions.filter((t) => !teacherIds.includes(t.id)),
    [teacherOptions, teacherIds],
  )
  const pickedTeachers = useMemo(
    () => teacherIds.map((id) => teacherOptions.find((t) => t.id === id)).filter(Boolean),
    [teacherIds, teacherOptions],
  )

  if (!open) return null

  const handleFile = (f) => {
    if (!f) {
      setFile(null)
      return
    }
    if (f.size > MAX_AUDIO_BYTES) {
      setError('Audio file exceeds the 1 GB limit.')
      return
    }
    if (f.type && !f.type.startsWith('audio/')) {
      setError('Please choose an audio file.')
      return
    }
    setError('')
    setFile(f)
  }

  const addTeacher = (id) => {
    const numeric = Number(id)
    if (!numeric || teacherIds.includes(numeric)) return
    if (teacherIds.length >= MAX_TEACHERS) return
    setTeacherIds((prev) => [...prev, numeric])
  }
  const removeTeacher = (id) => setTeacherIds((prev) => prev.filter((x) => x !== id))

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (submitting) return
    const trimmedName = songName.trim()
    const trimmedProducer = producer.trim()
    if (!trimmedName || !trimmedProducer) {
      setError('Song name and singer are required.')
      return
    }
    if (!isEdit && !file) {
      setError('An audio file is required to create a record.')
      return
    }

    setSubmitting(true)
    setError('')
    try {
      let saved
      if (isEdit) {
        const payload = {
          songName: trimmedName,
          producer: trimmedProducer,
          archiveNote: archiveNote.trim() || null,
        }
        saved = await updateMaqam(record.maqamCode, payload, file)
      } else {
        const payload = {
          songName: trimmedName,
          producer: trimmedProducer,
          archiveNote: archiveNote.trim() || null,
        }
        if (allowTeacherAssignment && teacherIds.length > 0) {
          payload.teacherUserIds = teacherIds
        }
        saved = await createMaqam(payload, file)
      }
      toast.success(
        isEdit ? 'Record updated' : 'Record created',
        isEdit ? 'The maqam record was saved.' : 'The maqam record is ready for the teacher panel.',
      )
      onSaved?.(saved)
      onOpenChange(false)
    } catch (err) {
      if (isStaleVersionError(err)) {
        toast.apiError(err, 'Edit conflict')
        onSaved?.(null)
        onOpenChange(false)
        return
      }
      toast.apiError(err, isEdit ? 'Could not update record' : 'Could not create record')
      setError(err?.response?.data?.message || 'Something went wrong. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div
      className="fixed inset-0 z-[95] flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget && !submitting) onOpenChange(false)
      }}
      role="dialog"
      aria-modal="true"
    >
      <div className="flex max-h-[92vh] w-full max-w-xl flex-col overflow-hidden rounded-2xl bg-card shadow-2xl ring-1 ring-black/10">
        {/* Header */}
        <div className="flex shrink-0 items-center justify-between gap-4 border-b border-border px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="grid size-9 place-items-center rounded-xl bg-primary text-primary-foreground">
              <Music4 className="size-4.5" />
            </div>
            <div>
              <p className="text-sm font-bold text-foreground">
                {isEdit ? 'Edit maqam record' : 'New maqam record'}
              </p>
              <p className="text-[11px] text-muted-foreground">
                {isEdit ? record?.maqamCode : 'Prepare a song for the teacher panel to classify'}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => !submitting && onOpenChange(false)}
            className="grid size-8 place-items-center rounded-lg text-muted-foreground transition hover:bg-muted hover:text-foreground"
            aria-label="Close"
          >
            <X className="size-4" />
          </button>
        </div>

        {/* Body */}
        <form onSubmit={handleSubmit} className="flex min-h-0 flex-1 flex-col">
          <div className="flex-1 space-y-4 overflow-y-auto px-6 py-5">
            <div className="space-y-1.5">
              <div className="flex items-center justify-between gap-2">
                <Label htmlFor="maqam-song-name">
                  Song name <span className="text-destructive">*</span>
                </Label>
                <FieldHelpButton metadata={getMaqamFieldMetadata('songName')} />
              </div>
              <Input
                id="maqam-song-name"
                value={songName}
                onChange={(e) => setSongName(e.target.value)}
                placeholder="e.g. Yare Lawane"
                maxLength={1000}
                autoFocus
              />
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center justify-between gap-2">
                <Label htmlFor="maqam-producer">
                  Singer / producer <span className="text-destructive">*</span>
                </Label>
                <FieldHelpButton metadata={getMaqamFieldMetadata('producer')} />
              </div>
              <Input
                id="maqam-producer"
                value={producer}
                onChange={(e) => setProducer(e.target.value)}
                placeholder="e.g. Hassan Zirek"
                maxLength={500}
              />
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center justify-between gap-2">
                <Label htmlFor="maqam-note">Archive note</Label>
                <FieldHelpButton metadata={getMaqamFieldMetadata('archiveNote')} />
              </div>
              <textarea
                id="maqam-note"
                value={archiveNote}
                onChange={(e) => setArchiveNote(e.target.value)}
                placeholder="Optional notes about this recording…"
                rows={3}
                maxLength={10000}
                className="w-full resize-none rounded-lg border border-input bg-background px-3 py-2 text-sm leading-6 text-foreground outline-none transition-colors placeholder:text-muted-foreground/60 focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/40"
              />
            </div>

            {/* Audio file */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between gap-2">
                <Label>
                  Audio file {!isEdit ? <span className="text-destructive">*</span> : null}
                </Label>
                <FieldHelpButton metadata={getMaqamFieldMetadata('audioFile')} />
              </div>
              <input
                ref={fileInputRef}
                type="file"
                accept="audio/*"
                className="hidden"
                onChange={(e) => handleFile(e.target.files?.[0] ?? null)}
              />
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="flex w-full items-center gap-3 rounded-xl border border-dashed border-border bg-muted/20 px-4 py-3 text-left transition hover:border-primary/40 hover:bg-muted/40"
              >
                <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-background text-muted-foreground">
                  {file ? <FileAudio className="size-4 text-primary" /> : <Upload className="size-4" />}
                </span>
                <span className="min-w-0 flex-1">
                  {file ? (
                    <>
                      <span className="block truncate text-sm font-medium text-foreground">{file.name}</span>
                      <span className="text-[11px] text-muted-foreground">{formatFileSize(file.size)}</span>
                    </>
                  ) : isEdit ? (
                    <>
                      <span className="block text-sm font-medium text-foreground">
                        {record?.audioFileName ? 'Replace audio file' : 'Add audio file'}
                      </span>
                      <span className="text-[11px] text-muted-foreground">
                        {record?.audioFileName
                          ? `Current: ${record.audioFileName}`
                          : 'No audio attached yet'}
                      </span>
                    </>
                  ) : (
                    <>
                      <span className="block text-sm font-medium text-foreground">Choose an audio file</span>
                      <span className="text-[11px] text-muted-foreground">audio/* up to 1 GB</span>
                    </>
                  )}
                </span>
                {file ? (
                  <span
                    role="button"
                    tabIndex={0}
                    onClick={(ev) => {
                      ev.stopPropagation()
                      setFile(null)
                    }}
                    className="grid size-7 place-items-center rounded-lg text-muted-foreground transition hover:bg-muted hover:text-destructive"
                    aria-label="Remove file"
                  >
                    <X className="size-3.5" />
                  </span>
                ) : null}
              </button>
            </div>

            {/* Teacher roster (admin, create only) */}
            {allowTeacherAssignment && !isEdit ? (
              <div className="space-y-2 rounded-xl border border-border bg-muted/20 p-3">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <UserPlus className="size-4 text-muted-foreground" />
                    <Label className="text-xs">Assign teachers (optional, up to {MAX_TEACHERS})</Label>
                  </div>
                  <FieldHelpButton metadata={getMaqamFieldMetadata('teachers')} />
                </div>
                {pickedTeachers.length > 0 ? (
                  <div className="flex flex-wrap gap-1.5">
                    {pickedTeachers.map((t) => (
                      <span
                        key={t.id}
                        className="inline-flex items-center gap-1.5 rounded-full border border-primary/30 bg-primary/10 px-2.5 py-1 text-xs font-medium text-primary"
                      >
                        {t.name || t.username}
                        <button
                          type="button"
                          onClick={() => removeTeacher(t.id)}
                          className="text-primary/70 transition hover:text-primary"
                          aria-label="Remove teacher"
                        >
                          <X className="size-3" />
                        </button>
                      </span>
                    ))}
                  </div>
                ) : null}
                {teacherIds.length < MAX_TEACHERS ? (
                  <SearchSelect
                    items={availableTeachers}
                    value=""
                    onChange={addTeacher}
                    getKey={(t) => String(t.id)}
                    getLabel={(t) => t.name || t.username}
                    getSubtitle={(t) => t.username}
                    placeholder="Search teachers to add…"
                    emptyHint="No matching teachers"
                  />
                ) : (
                  <p className="text-[11px] text-muted-foreground">
                    Maximum of {MAX_TEACHERS} teachers reached.
                  </p>
                )}
                <p className="text-[11px] text-muted-foreground">
                  You can also manage the panel later from the record's “Teachers” action.
                </p>
              </div>
            ) : null}

            {error ? (
              <p className="rounded-lg border border-destructive/30 bg-destructive/5 px-3 py-2 text-xs text-destructive">
                {error}
              </p>
            ) : null}
          </div>

          {/* Footer */}
          <div className="flex shrink-0 items-center justify-end gap-2 border-t border-border bg-muted/10 px-6 py-4">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={submitting}>
              Cancel
            </Button>
            <Button type="submit" disabled={submitting} className={cn('gap-2')}>
              {submitting ? <Loader2 className="size-4 animate-spin" /> : <Plus className="size-4" />}
              {submitting ? 'Saving…' : isEdit ? 'Save changes' : 'Create record'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}
