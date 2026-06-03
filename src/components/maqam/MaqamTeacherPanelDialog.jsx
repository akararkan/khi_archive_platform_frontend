import { useEffect, useMemo, useState } from 'react'
import { Loader2, Save, UserPlus, Users, X } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { SearchSelect } from '@/components/ui/search-select'
import { useToast } from '@/hooks/use-toast'
import { MAX_TEACHERS, MIN_TEACHERS } from '@/components/maqam/maqam-helpers'
import { replaceMaqamTeachers } from '@/services/maqam'

/**
 * Assign / replace the 1–3 teachers on a maqam record's panel.
 *
 * Backed by PUT /api/admin/maqam/{code}/teachers (authority: maqam:teacher_manage),
 * which ADMIN and EMPLOYEE both hold. Self-contained overlay so it can drop into
 * either the admin or employee maqam surface.
 *
 * Props:
 *   open, onOpenChange
 *   record           the MaqamResponse whose panel is being edited
 *   teacherOptions   [{ id, username, name }] selectable teachers
 *   onSaved(record)  called with the updated MaqamResponse on success
 */
export function MaqamTeacherPanelDialog({ open, onOpenChange, record, teacherOptions = [], onSaved }) {
  const toast = useToast()
  const [teacherIds, setTeacherIds] = useState([])
  const [submitting, setSubmitting] = useState(false)

  const currentVotes = useMemo(
    () => (Array.isArray(record?.teacherVotes) ? record.teacherVotes : []),
    [record],
  )

  // Seed from the record's existing panel each time the dialog opens.
  useEffect(() => {
    if (!open) return
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setTeacherIds(currentVotes.map((v) => v.teacherUserId).filter((id) => id != null))
    setSubmitting(false)
  }, [open, currentVotes])

  // Close on Escape.
  useEffect(() => {
    if (!open) return undefined
    const onKey = (e) => {
      if (e.key === 'Escape') onOpenChange(false)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onOpenChange])

  // Label lookup spans both the option pool and the record's current panel, so
  // already-assigned teachers always render with a name even if not in options.
  const labelById = useMemo(() => {
    const map = new Map()
    for (const v of currentVotes) {
      if (v.teacherUserId != null) {
        map.set(v.teacherUserId, { id: v.teacherUserId, username: v.teacherUsername, name: v.teacherDisplayName })
      }
    }
    for (const t of teacherOptions) map.set(t.id, t)
    return map
  }, [currentVotes, teacherOptions])

  const pickedTeachers = useMemo(
    () => teacherIds.map((id) => labelById.get(id) || { id, name: `#${id}` }),
    [teacherIds, labelById],
  )

  const availableTeachers = useMemo(
    () => teacherOptions.filter((t) => !teacherIds.includes(t.id)),
    [teacherOptions, teacherIds],
  )

  if (!open || !record) return null

  const addTeacher = (id) => {
    const numeric = Number(id)
    if (!Number.isFinite(numeric) || teacherIds.includes(numeric)) return
    if (teacherIds.length >= MAX_TEACHERS) return
    setTeacherIds((prev) => [...prev, numeric])
  }
  const removeTeacher = (id) => setTeacherIds((prev) => prev.filter((x) => x !== id))

  const dirty =
    teacherIds.length !== currentVotes.length ||
    teacherIds.some((id) => !currentVotes.find((v) => v.teacherUserId === id))
  const valid = teacherIds.length >= MIN_TEACHERS && teacherIds.length <= MAX_TEACHERS

  const handleSave = async () => {
    if (submitting || !valid) return
    setSubmitting(true)
    try {
      const updated = await replaceMaqamTeachers(record.maqamCode, teacherIds)
      toast.success('Teacher panel updated', 'The assigned teachers were saved.')
      onSaved?.(updated)
      onOpenChange(false)
    } catch (err) {
      toast.apiError(err, 'Could not update the teacher panel.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div
      className="fixed inset-0 z-[95] flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onOpenChange(false)
      }}
      role="dialog"
      aria-modal="true"
    >
      <div className="flex w-full max-w-md flex-col overflow-hidden rounded-2xl bg-card shadow-2xl ring-1 ring-black/10">
        <div className="flex shrink-0 items-center justify-between gap-4 border-b border-border px-6 py-4">
          <div className="flex min-w-0 items-center gap-3">
            <div className="grid size-9 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary">
              <Users className="size-4" />
            </div>
            <div className="min-w-0">
              <p className="truncate text-sm font-bold text-foreground">Assign teachers</p>
              <p className="truncate text-[11px] text-muted-foreground">
                {record.songName} · {record.maqamCode}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => onOpenChange(false)}
            className="grid size-8 place-items-center rounded-lg text-muted-foreground transition hover:bg-muted hover:text-foreground"
            aria-label="Close"
          >
            <X className="size-4" />
          </button>
        </div>

        <div className="space-y-3 px-6 py-5">
          <div className="flex items-center gap-2">
            <UserPlus className="size-4 text-muted-foreground" />
            <Label className="text-xs">Panel teachers ({MIN_TEACHERS}–{MAX_TEACHERS})</Label>
          </div>

          {pickedTeachers.length > 0 ? (
            <div className="flex flex-wrap gap-1.5">
              {pickedTeachers.map((t) => (
                <span
                  key={t.id}
                  className="inline-flex items-center gap-1.5 rounded-full border border-primary/30 bg-primary/10 px-2.5 py-1 text-xs font-medium text-primary"
                >
                  {t.name || t.username || `#${t.id}`}
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
          ) : (
            <p className="rounded-xl border border-dashed border-border bg-muted/20 px-3 py-2.5 text-[11px] text-muted-foreground">
              No teachers selected yet — pick at least {MIN_TEACHERS}.
            </p>
          )}

          {teacherIds.length < MAX_TEACHERS ? (
            <SearchSelect
              items={availableTeachers}
              value=""
              onChange={addTeacher}
              getKey={(t) => String(t.id)}
              getLabel={(t) => t.name || t.username}
              getSubtitle={(t) => t.username}
              placeholder="Search teachers to add…"
              emptyHint="No teachers available to add"
            />
          ) : (
            <p className="text-[11px] text-muted-foreground">Maximum of {MAX_TEACHERS} teachers reached.</p>
          )}

          {availableTeachers.length === 0 && teacherIds.length < MAX_TEACHERS ? (
            <p className="text-[11px] text-muted-foreground/80">
              Only teachers already on a record you can see are selectable here.
            </p>
          ) : null}
        </div>

        <div className="flex shrink-0 items-center justify-end gap-2 border-t border-border px-6 py-4">
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={submitting}>
            Cancel
          </Button>
          <Button type="button" className="gap-2" onClick={handleSave} disabled={submitting || !valid || !dirty}>
            {submitting ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />}
            Save panel
          </Button>
        </div>
      </div>
    </div>
  )
}
