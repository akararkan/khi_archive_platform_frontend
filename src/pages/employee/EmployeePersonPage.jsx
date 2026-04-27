import { useCallback, useEffect, useMemo, useState } from 'react'
import { Plus, Pencil, Trash2, Loader2, Camera, X, RefreshCw, Search, Eye } from 'lucide-react'

import { EmployeeEntityPage } from '@/components/employee/EmployeeEntityPage'
import { PersonDetailsModal } from '@/components/person/PersonDetailsModal'
import { PersonFieldHelpButton } from '@/components/person/PersonFieldHelpButton'
import { ConfirmDialog } from '@/components/ui/confirm-dialog'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { useToast } from '@/hooks/use-toast'
import { getErrorMessage } from '@/lib/get-error-message'
import { getPersons, createPerson, updatePerson, deletePerson } from '@/services/person'

function createInitialForm() {
  return {
    personCode: '',
    fullName: '',
    nickname: '',
    romanizedName: '',
    gender: '',
    personType: '',
    region: '',
    dateOfBirthYear: '',
    dateOfBirthMonth: '',
    dateOfBirthDay: '',
    placeOfBirth: '',
    dateOfDeathYear: '',
    dateOfDeathMonth: '',
    dateOfDeathDay: '',
    placeOfDeath: '',
    description: '',
    tag: '',
    keywords: '',
    note: '',
    removeMediaPortrait: false,
  }
}

function parseList(value) {
  if (!value) {
    return []
  }

  return value
    .split(',')
    .map((entry) => entry.trim())
    .filter(Boolean)
}

function parseInteger(value) {
  if (value === '' || value == null) {
    return null
  }

  const parsed = Number.parseInt(value, 10)
  return Number.isNaN(parsed) ? null : parsed
}

function getDatePart(dateValue, part) {
  if (!dateValue) {
    return ''
  }

  const parsedDate = new Date(dateValue)
  if (Number.isNaN(parsedDate.getTime())) {
    return ''
  }

  if (part === 'year') {
    return parsedDate.getFullYear()
  }

  if (part === 'month') {
    return parsedDate.getMonth() + 1
  }

  return parsedDate.getDate()
}

function getLifespan(person) {
  const birthYear = person.dateOfBirthYear ?? getDatePart(person.dateOfBirth, 'year')
  const deathYear = person.dateOfDeathYear ?? getDatePart(person.dateOfDeath, 'year')

  if (!birthYear && !deathYear) {
    return '—'
  }

  if (birthYear && !deathYear) {
    return `${birthYear} -`
  }

  if (!birthYear && deathYear) {
    return `- ${deathYear}`
  }

  return `${birthYear} - ${deathYear}`
}

function ensurePersonCodePrefix(code) {
  const value = String(code || '').trim()
  if (!value) {
    return ''
  }

  return `KHI_${value.replace(/^KHI_/i, '')}`
}

function FieldLabel({ htmlFor, fieldKey, children }) {
  return (
    <div className="flex items-center justify-between gap-2">
      <Label htmlFor={htmlFor} className="text-sm font-medium text-foreground">
        {children}
      </Label>
      <PersonFieldHelpButton fieldKey={fieldKey} />
    </div>
  )
}

function EmployeePersonPage() {
  const toast = useToast()

  const [persons, setPersons] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')

  const [view, setView] = useState('list') // 'list', 'create', 'edit'
  const [currentPerson, setCurrentPerson] = useState(null)

  const [form, setForm] = useState(createInitialForm)
  const [isSaving, setIsSaving] = useState(false)
  const [formError, setFormError] = useState('')

  const [mediaPortrait, setMediaPortrait] = useState(null)
  const [previewImage, setPreviewImage] = useState(null)

  const [searchTerm, setSearchTerm] = useState('')

  const [deleteTarget, setDeleteTarget] = useState(null)
  const [isDeleting, setIsDeleting] = useState(false)
  const [detailsTarget, setDetailsTarget] = useState(null)

  const filteredPersons = useMemo(() => {
    const normalizedTerm = searchTerm.trim().toLowerCase()

    if (!normalizedTerm) {
      return persons
    }

    return persons.filter((person) => {
      const personType = Array.isArray(person.personType) ? person.personType.join(' ') : person.personType
      const keywords = Array.isArray(person.keywords) ? person.keywords.join(' ') : person.keywords
      const tags = Array.isArray(person.tag) ? person.tag.join(' ') : person.tag

      const value = `${person.personCode || ''} ${person.fullName || ''} ${personType || ''} ${person.region || ''} ${keywords || ''} ${tags || ''}`
      return value.toLowerCase().includes(normalizedTerm)
    })
  }, [persons, searchTerm])

  const loadPersons = useCallback(async (options = {}) => {
    const { notifyError = false } = options

    setIsLoading(true)
    setError('')

    try {
      const data = await getPersons()
      setPersons(data || [])
    } catch (err) {
      const message = getErrorMessage(err, 'Failed to load persons')
      setError(message)

      if (notifyError) {
        toast.error('Could not refresh persons', message)
      }
    } finally {
      setIsLoading(false)
    }
  }, [toast])

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadPersons()
  }, [loadPersons])

  useEffect(() => {
    return () => {
      if (previewImage && previewImage.startsWith('blob:')) {
        URL.revokeObjectURL(previewImage)
      }
    }
  }, [previewImage])

  const handleOpenCreate = () => {
    setForm(createInitialForm())
    setMediaPortrait(null)
    setPreviewImage(null)
    setFormError('')
    setCurrentPerson(null)
    setView('create')
  }

  const handleOpenEdit = (person) => {
    setCurrentPerson(person)
    setForm({
      personCode: ensurePersonCodePrefix(person.personCode),
      fullName: person.fullName || '',
      nickname: person.nickname || '',
      romanizedName: person.romanizedName || '',
      gender: person.gender || '',
      personType: Array.isArray(person.personType) ? person.personType.join(', ') : person.personType || '',
      region: person.region || '',
      dateOfBirthYear: person.dateOfBirthYear ?? getDatePart(person.dateOfBirth, 'year'),
      dateOfBirthMonth: person.dateOfBirthMonth ?? getDatePart(person.dateOfBirth, 'month'),
      dateOfBirthDay: person.dateOfBirthDay ?? getDatePart(person.dateOfBirth, 'day'),
      placeOfBirth: person.placeOfBirth || '',
      dateOfDeathYear: person.dateOfDeathYear ?? getDatePart(person.dateOfDeath, 'year'),
      dateOfDeathMonth: person.dateOfDeathMonth ?? getDatePart(person.dateOfDeath, 'month'),
      dateOfDeathDay: person.dateOfDeathDay ?? getDatePart(person.dateOfDeath, 'day'),
      placeOfDeath: person.placeOfDeath || '',
      description: person.description || '',
      tag: Array.isArray(person.tag) ? person.tag.join(', ') : person.tag || '',
      keywords: Array.isArray(person.keywords) ? person.keywords.join(', ') : person.keywords || '',
      note: person.note || '',
      removeMediaPortrait: false,
    })
    setMediaPortrait(null)
    setPreviewImage(person.mediaPortrait || null)
    setFormError('')
    setView('edit')
  }

  const handleCloseForm = () => {
    setView('list')
    setCurrentPerson(null)
    setMediaPortrait(null)
    setPreviewImage(null)
    setFormError('')
  }

  const handleFileChange = (event) => {
    const file = event.target.files?.[0]
    if (!file) {
      return
    }

    if (previewImage && previewImage.startsWith('blob:')) {
      URL.revokeObjectURL(previewImage)
    }

    setMediaPortrait(file)
    setPreviewImage(URL.createObjectURL(file))
    setForm((currentForm) => ({ ...currentForm, removeMediaPortrait: false }))
  }

  const removeSelectedImage = () => {
    if (previewImage && previewImage.startsWith('blob:')) {
      URL.revokeObjectURL(previewImage)
    }

    setMediaPortrait(null)
    setPreviewImage(null)

    if (view === 'edit') {
      setForm((currentForm) => ({ ...currentForm, removeMediaPortrait: true }))
    }
  }

  const handleSubmit = async (event) => {
    event.preventDefault()
    setFormError('')
    setIsSaving(true)

    const normalizedPersonCode = ensurePersonCodePrefix(form.personCode)

    if (view === 'create' && !normalizedPersonCode) {
      const message = 'Person code is required.'
      setFormError(message)
      toast.error('Unable to save person', message)
      setIsSaving(false)
      return
    }

    try {
      const payload = {
        fullName: form.fullName,
        nickname: form.nickname,
        romanizedName: form.romanizedName,
        gender: form.gender || null,
        personType: parseList(form.personType),
        region: form.region,
        dateOfBirthYear: parseInteger(form.dateOfBirthYear),
        dateOfBirthMonth: parseInteger(form.dateOfBirthMonth),
        dateOfBirthDay: parseInteger(form.dateOfBirthDay),
        placeOfBirth: form.placeOfBirth,
        dateOfDeathYear: parseInteger(form.dateOfDeathYear),
        dateOfDeathMonth: parseInteger(form.dateOfDeathMonth),
        dateOfDeathDay: parseInteger(form.dateOfDeathDay),
        placeOfDeath: form.placeOfDeath,
        description: form.description,
        tag: parseList(form.tag),
        keywords: parseList(form.keywords),
        note: form.note,
        ...(view === 'edit' && form.removeMediaPortrait ? { removeMediaPortrait: true } : {}),
      }

      if (view === 'create') {
        payload.personCode = normalizedPersonCode
        await createPerson(payload, mediaPortrait)
        toast.success('Person created', `${form.fullName} was added to records.`)
      } else if (view === 'edit') {
        await updatePerson(currentPerson.personCode, payload, mediaPortrait)
        toast.success('Person updated', `${form.fullName} changes were saved.`)
      }

      await loadPersons()
      handleCloseForm()
    } catch (err) {
      const message = getErrorMessage(err, 'Failed to save person record')
      setFormError(message)
      toast.error('Unable to save person', message)
    } finally {
      setIsSaving(false)
    }
  }

  const handleDeleteRequest = (person) => {
    setDeleteTarget(person)
  }

  const handleOpenDetails = (person) => {
    setDetailsTarget({
      ...person,
      personCode: ensurePersonCodePrefix(person.personCode),
    })
  }

  const handleDeleteConfirm = async () => {
    if (!deleteTarget) {
      return
    }

    setIsDeleting(true)
    try {
      await deletePerson(deleteTarget.personCode)
      toast.success('Person deleted', `${deleteTarget.fullName} was removed.`)
      setDeleteTarget(null)
      await loadPersons()
    } catch (err) {
      const message = getErrorMessage(err, 'Failed to delete person record')
      setError(message)
      toast.error('Unable to delete person', message)
    } finally {
      setIsDeleting(false)
    }
  }

  if (view === 'create' || view === 'edit') {
    return (
      <EmployeeEntityPage
        title={view === 'create' ? 'Add New Person' : 'Edit Person Record'}
        description="Provide comprehensive details about the person below."
      >
        <form id="person-form" onSubmit={handleSubmit} className="mx-auto block w-full">
          <div className="grid gap-6 xl:grid-cols-[1fr_360px]">
            <div className="space-y-6">

              {/* ── Identity Information ── */}
              <Card className="border-border bg-card shadow-sm shadow-black/5">
                <CardHeader className="border-b border-border pb-4">
                  <CardTitle className="text-base font-semibold">Identity Information</CardTitle>
                  <CardDescription className="text-xs">Primary metadata for this archive person.</CardDescription>
                </CardHeader>
                <CardContent className="grid gap-5 pt-5 sm:grid-cols-2">

                  {view === 'create' ? (
                    <div className="space-y-2 sm:col-span-2">
                      <FieldLabel htmlFor="personCode" fieldKey="personCode">
                        Person Code Suffix <span className="text-destructive">*</span>
                      </FieldLabel>
                      <div className="flex items-center">
                        <span className="inline-flex h-9 items-center rounded-l-md border border-r-0 border-input bg-muted px-3 text-xs font-bold tracking-widest text-muted-foreground">
                          KHI_
                        </span>
                        <Input
                          id="personCode"
                          value={form.personCode}
                          onChange={(event) =>
                            setForm({
                              ...form,
                              personCode: event.target.value.replace(/^KHI_/i, '').toUpperCase(),
                            })
                          }
                          required
                          placeholder="HZI"
                          className="rounded-l-none font-mono tracking-wide"
                        />
                      </div>
                      <p className="text-xs text-muted-foreground">
                        Final code:{' '}
                        <span className="font-mono font-semibold text-foreground">
                          {ensurePersonCodePrefix(form.personCode) || 'KHI_…'}
                        </span>
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-2 sm:col-span-2">
                      <FieldLabel htmlFor="personCodeReadonly" fieldKey="personCode">
                        Person Code
                      </FieldLabel>
                      <Input
                        id="personCodeReadonly"
                        value={form.personCode}
                        disabled
                        className="font-mono tracking-wide"
                      />
                    </div>
                  )}

                  <div className="space-y-2 sm:col-span-2">
                    <FieldLabel htmlFor="fullName" fieldKey="fullName">
                      Full Name <span className="text-destructive">*</span>
                    </FieldLabel>
                    <Input
                      id="fullName"
                      value={form.fullName}
                      onChange={(event) => setForm({ ...form, fullName: event.target.value })}
                      required
                      placeholder="e.g. Hesen Zirek"
                      className="text-base font-medium"
                    />
                  </div>

                  <div className="space-y-2">
                    <FieldLabel htmlFor="nickname" fieldKey="nickname">Nickname</FieldLabel>
                    <Input
                      id="nickname"
                      value={form.nickname}
                      onChange={(event) => setForm({ ...form, nickname: event.target.value })}
                      placeholder="Known as…"
                    />
                  </div>

                  <div className="space-y-2">
                    <FieldLabel htmlFor="romanizedName" fieldKey="romanizedName">Romanized Name</FieldLabel>
                    <Input
                      id="romanizedName"
                      value={form.romanizedName}
                      onChange={(event) => setForm({ ...form, romanizedName: event.target.value })}
                      placeholder="Latin script"
                    />
                  </div>

                  <div className="space-y-2">
                    <FieldLabel htmlFor="gender" fieldKey="gender">Gender (MALE / FEMALE / UNKNOWN)</FieldLabel>
                    <Input
                      id="gender"
                      value={form.gender}
                      onChange={(event) => setForm({ ...form, gender: event.target.value })}
                      placeholder="MALE"
                    />
                  </div>

                  <div className="space-y-2">
                    <FieldLabel htmlFor="region" fieldKey="region">Region</FieldLabel>
                    <Input
                      id="region"
                      value={form.region}
                      onChange={(event) => setForm({ ...form, region: event.target.value })}
                      placeholder="e.g. Kurdistan"
                    />
                  </div>

                  <div className="space-y-2 sm:col-span-2">
                    <FieldLabel htmlFor="personType" fieldKey="personType">
                      Roles / Types{' '}
                      <span className="font-normal text-muted-foreground">(comma-separated)</span>
                    </FieldLabel>
                    <Input
                      id="personType"
                      value={form.personType}
                      onChange={(event) => setForm({ ...form, personType: event.target.value })}
                      placeholder="Singer, Poet, Artist"
                    />
                  </div>
                </CardContent>
              </Card>

              {/* ── Life Events ── */}
              <Card className="border-border bg-card shadow-sm shadow-black/5">
                <CardHeader className="border-b border-border pb-4">
                  <CardTitle className="text-base font-semibold">Life Events</CardTitle>
                  <CardDescription className="text-xs">
                    Birth and death details — partial dates are fully supported.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-5 pt-5">

                  {/* Birth */}
                  <div className="space-y-4 rounded-lg border border-border/60 bg-muted/20 p-4">
                    <p className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">
                      Birth
                    </p>
                    <div className="space-y-2">
                      <FieldLabel htmlFor="placeOfBirth" fieldKey="placeOfBirth">Place of Birth</FieldLabel>
                      <Input
                        id="placeOfBirth"
                        value={form.placeOfBirth}
                        onChange={(event) => setForm({ ...form, placeOfBirth: event.target.value })}
                        placeholder="City, Country"
                      />
                    </div>
                    <div className="grid grid-cols-3 gap-3">
                      <div className="space-y-2">
                        <FieldLabel htmlFor="dateOfBirthYear" fieldKey="dateOfBirthYear">Year</FieldLabel>
                        <Input
                          id="dateOfBirthYear"
                          type="number"
                          placeholder="YYYY"
                          value={form.dateOfBirthYear}
                          onChange={(event) => setForm({ ...form, dateOfBirthYear: event.target.value })}
                        />
                      </div>
                      <div className="space-y-2">
                        <FieldLabel htmlFor="dateOfBirthMonth" fieldKey="dateOfBirthMonth">Month</FieldLabel>
                        <Input
                          id="dateOfBirthMonth"
                          type="number"
                          placeholder="MM"
                          min="1"
                          max="12"
                          value={form.dateOfBirthMonth}
                          onChange={(event) => setForm({ ...form, dateOfBirthMonth: event.target.value })}
                        />
                      </div>
                      <div className="space-y-2">
                        <FieldLabel htmlFor="dateOfBirthDay" fieldKey="dateOfBirthDay">Day</FieldLabel>
                        <Input
                          id="dateOfBirthDay"
                          type="number"
                          placeholder="DD"
                          min="1"
                          max="31"
                          value={form.dateOfBirthDay}
                          onChange={(event) => setForm({ ...form, dateOfBirthDay: event.target.value })}
                        />
                      </div>
                    </div>
                  </div>

                  {/* Death */}
                  <div className="space-y-4 rounded-lg border border-border/60 bg-muted/20 p-4">
                    <p className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">
                      Death
                    </p>
                    <div className="space-y-2">
                      <FieldLabel htmlFor="placeOfDeath" fieldKey="placeOfDeath">Place of Death</FieldLabel>
                      <Input
                        id="placeOfDeath"
                        value={form.placeOfDeath}
                        onChange={(event) => setForm({ ...form, placeOfDeath: event.target.value })}
                        placeholder="City, Country"
                      />
                    </div>
                    <div className="grid grid-cols-3 gap-3">
                      <div className="space-y-2">
                        <FieldLabel htmlFor="dateOfDeathYear" fieldKey="dateOfDeathYear">Year</FieldLabel>
                        <Input
                          id="dateOfDeathYear"
                          type="number"
                          placeholder="YYYY"
                          value={form.dateOfDeathYear}
                          onChange={(event) => setForm({ ...form, dateOfDeathYear: event.target.value })}
                        />
                      </div>
                      <div className="space-y-2">
                        <FieldLabel htmlFor="dateOfDeathMonth" fieldKey="dateOfDeathMonth">Month</FieldLabel>
                        <Input
                          id="dateOfDeathMonth"
                          type="number"
                          placeholder="MM"
                          min="1"
                          max="12"
                          value={form.dateOfDeathMonth}
                          onChange={(event) => setForm({ ...form, dateOfDeathMonth: event.target.value })}
                        />
                      </div>
                      <div className="space-y-2">
                        <FieldLabel htmlFor="dateOfDeathDay" fieldKey="dateOfDeathDay">Day</FieldLabel>
                        <Input
                          id="dateOfDeathDay"
                          type="number"
                          placeholder="DD"
                          min="1"
                          max="31"
                          value={form.dateOfDeathDay}
                          onChange={(event) => setForm({ ...form, dateOfDeathDay: event.target.value })}
                        />
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* ── Classification & Notes ── */}
              <Card className="border-border bg-card shadow-sm shadow-black/5">
                <CardHeader className="border-b border-border pb-4">
                  <CardTitle className="text-base font-semibold">Classification & Notes</CardTitle>
                  <CardDescription className="text-xs">Discovery tags and internal notes for researchers.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-5 pt-5">

                  <div className="space-y-2">
                    <FieldLabel htmlFor="description" fieldKey="description">Description / Biography</FieldLabel>
                    <textarea
                      id="description"
                      className="min-h-[120px] w-full resize-y rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                      value={form.description}
                      onChange={(event) => setForm({ ...form, description: event.target.value })}
                      placeholder="Write a short biography or notable facts…"
                    />
                  </div>

                  <div className="grid gap-5 sm:grid-cols-2">
                    <div className="space-y-2">
                      <FieldLabel htmlFor="tag" fieldKey="tag">
                        Tags{' '}
                        <span className="font-normal text-muted-foreground">(comma-separated)</span>
                      </FieldLabel>
                      <Input
                        id="tag"
                        value={form.tag}
                        onChange={(event) => setForm({ ...form, tag: event.target.value })}
                        placeholder="poet, revolutionary"
                      />
                    </div>

                    <div className="space-y-2">
                      <FieldLabel htmlFor="keywords" fieldKey="keywords">
                        Keywords{' '}
                        <span className="font-normal text-muted-foreground">(comma-separated)</span>
                      </FieldLabel>
                      <Input
                        id="keywords"
                        value={form.keywords}
                        onChange={(event) => setForm({ ...form, keywords: event.target.value })}
                        placeholder="music, folklore"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <FieldLabel htmlFor="note" fieldKey="note">Internal Notes</FieldLabel>
                    <Input
                      id="note"
                      value={form.note}
                      onChange={(event) => setForm({ ...form, note: event.target.value })}
                      placeholder="Private notes for archive staff…"
                    />
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* ── Sticky Sidebar ── */}
            <div className="space-y-5">
              <div className="sticky top-[5rem] space-y-5">

                <Card className="border-border bg-card shadow-sm shadow-black/5">
                  <CardHeader className="border-b border-border pb-4">
                    <CardTitle className="text-base font-semibold">Portrait Image</CardTitle>
                    <CardDescription className="text-xs">Attach or replace the person portrait.</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4 pt-5">

                    {/* Preview */}
                    {previewImage ? (
                      <div className="group relative aspect-[3/4] w-full overflow-hidden rounded-xl border-2 border-border shadow-sm">
                        <img
                          src={previewImage}
                          alt="Portrait preview"
                          className="size-full object-cover object-top transition-transform duration-300 group-hover:scale-[1.02]"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/30 via-transparent to-transparent opacity-0 transition-opacity group-hover:opacity-100" />
                        <Button
                          type="button"
                          variant="destructive"
                          size="icon"
                          className="absolute right-2 top-2 size-7 rounded-full opacity-0 shadow-md transition-opacity group-hover:opacity-100"
                          onClick={removeSelectedImage}
                        >
                          <X className="size-3.5" />
                          <span className="sr-only">Remove portrait</span>
                        </Button>
                      </div>
                    ) : (
                      /* Styled drop-zone label — hides native file input text entirely */
                      <label
                        htmlFor="portraitFile"
                        className="flex aspect-[3/4] w-full cursor-pointer flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed border-border bg-muted/20 text-center transition-colors hover:border-primary/50 hover:bg-muted/40"
                      >
                        <div className="flex size-12 items-center justify-center rounded-full bg-muted text-muted-foreground transition-colors group-hover:bg-primary/10 group-hover:text-primary">
                          <Camera className="size-5" />
                        </div>
                        <div>
                          <p className="text-sm font-medium text-foreground">Upload Image</p>
                          <p className="mt-0.5 text-xs text-muted-foreground">Click to browse files</p>
                        </div>
                      </label>
                    )}

                    {/* Hidden native input — avoids browser-locale text rendering */}
                    <input
                      id="portraitFile"
                      type="file"
                      accept="image/*"
                      onChange={handleFileChange}
                      className="sr-only"
                    />

                    {/* Show "Change Image" button only when a preview exists */}
                    {previewImage && (
                      <Label
                        htmlFor="portraitFile"
                        className="flex w-full cursor-pointer items-center justify-center gap-2 rounded-md border border-input bg-background px-3 py-2 text-sm font-medium shadow-sm transition-colors hover:bg-accent hover:text-accent-foreground"
                      >
                        <Camera className="size-4 shrink-0" />
                        Change Image
                      </Label>
                    )}

                    {formError ? (
                      <div className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2.5 text-sm text-destructive">
                        {formError}
                      </div>
                    ) : null}
                  </CardContent>
                  <CardFooter className="flex flex-col gap-2.5 border-t border-border pt-4">
                    <Button type="submit" className="w-full gap-2" disabled={isSaving}>
                      {isSaving ? <Loader2 className="size-4 animate-spin" /> : null}
                      {isSaving ? 'Saving…' : 'Save Record'}
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      className="w-full"
                      onClick={handleCloseForm}
                      disabled={isSaving}
                    >
                      Cancel
                    </Button>
                  </CardFooter>
                </Card>

              </div>
            </div>
          </div>
        </form>
      </EmployeeEntityPage>
    )
  }

  /* ── List view ── */

  return (
    <EmployeeEntityPage
      title="Persons Directory"
      description="Manage all person records with clear, searchable metadata and fast actions."
      action={
        <Button onClick={handleOpenCreate} className="gap-2 shrink-0">
          <Plus className="size-4" />
          Add Person
        </Button>
      }
    >
      {/* Search / filter bar */}
      <Card className="border-border bg-card shadow-sm shadow-black/5">
        <CardContent className="flex flex-col gap-3 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="text-sm text-muted-foreground">
            Showing{' '}
            <span className="font-semibold tabular-nums text-foreground">{filteredPersons.length}</span>
            {' '}of{' '}
            <span className="font-semibold tabular-nums text-foreground">{persons.length}</span>
            {' '}records
          </div>

          <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row">
            <div className="relative w-full sm:w-96">
              <Search className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={searchTerm}
                onChange={(event) => setSearchTerm(event.target.value)}
                placeholder="Search by code, name, type, region, or tags…"
                className="pl-8"
              />
            </div>
            <Button
              type="button"
              variant="outline"
              className="gap-2 shrink-0"
              onClick={() => loadPersons({ notifyError: true })}
              disabled={isLoading}
            >
              <RefreshCw className={`size-4 ${isLoading ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* States */}
      {isLoading ? (
        <Card className="border-border bg-card shadow-sm shadow-black/5">
          <div className="divide-y divide-border">
            {[1, 2, 3, 4, 5].map((index) => (
              <div key={index} className="flex items-center gap-4 px-4 py-3">
                <Skeleton className="size-9 shrink-0 rounded-full" />
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-4 w-36" />
                <Skeleton className="h-4 w-28" />
                <Skeleton className="h-4 w-20" />
                <Skeleton className="ml-auto h-4 w-24" />
              </div>
            ))}
          </div>
        </Card>
      ) : error ? (
        <Card className="border-border bg-card shadow-sm shadow-black/5">
          <CardContent className="flex flex-col items-start gap-4 px-6 py-8">
            <p className="text-sm text-destructive">{error}</p>
            <Button
              type="button"
              variant="outline"
              className="gap-2"
              onClick={() => loadPersons({ notifyError: true })}
            >
              <RefreshCw className="size-4" />
              Retry
            </Button>
          </CardContent>
        </Card>
      ) : persons.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-3xl border border-dashed border-border bg-muted/20 py-24 text-center">
          <div className="mb-4 flex size-16 items-center justify-center rounded-full bg-muted text-muted-foreground">
            <Plus className="size-6" />
          </div>
          <h3 className="text-lg font-semibold text-foreground">No persons registered</h3>
          <p className="mt-1 max-w-sm text-sm text-muted-foreground">
            Add a new prominent figure or contributor to begin building the person records.
          </p>
          <Button onClick={handleOpenCreate} className="mt-6 gap-2">
            <Plus className="size-4" />
            Create Record
          </Button>
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-border bg-card shadow-sm shadow-black/5">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/40 hover:bg-muted/40">
                <TableHead className="w-[52px] text-center">#</TableHead>
                <TableHead className="w-[52px]"></TableHead>
                <TableHead className="w-[140px]">Code</TableHead>
                <TableHead className="w-[220px]">Full Name</TableHead>
                <TableHead className="w-[220px]">Type</TableHead>
                <TableHead className="w-[180px]">Region</TableHead>
                <TableHead className="w-[140px]">Lifespan</TableHead>
                <TableHead className="w-[360px]">Description</TableHead>
                <TableHead className="w-[220px] text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredPersons.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={9} className="h-24 text-center text-muted-foreground">
                    No matching people for this search.
                  </TableCell>
                </TableRow>
              ) : (
                filteredPersons.map((person, index) => {
                  const typeLabel = Array.isArray(person.personType)
                    ? person.personType.join(', ')
                    : person.personType || person.gender || '—'

                  const initial = person.fullName?.charAt(0)?.toUpperCase() || 'P'

                  return (
                    <TableRow key={person.personCode} className="group transition-colors">
                      <TableCell className="text-center text-xs tabular-nums text-muted-foreground">
                        {index + 1}
                      </TableCell>
                      <TableCell>
                        {person.mediaPortrait ? (
                          <div className="size-9 overflow-hidden rounded-full border-2 border-border shadow-sm">
                            <img
                              src={person.mediaPortrait}
                              alt={person.fullName}
                              className="size-full object-cover"
                            />
                          </div>
                        ) : (
                          <div className="flex size-9 items-center justify-center rounded-full border-2 border-border bg-muted/60 text-xs font-bold text-muted-foreground">
                            {initial}
                          </div>
                        )}
                      </TableCell>
                      <TableCell>
                        <span className="font-mono text-xs font-medium text-muted-foreground">
                          {ensurePersonCodePrefix(person.personCode)}
                        </span>
                      </TableCell>
                      <TableCell>
                        <div className="font-semibold leading-tight text-foreground">
                          {person.fullName}
                        </div>
                        {person.nickname && (
                          <div className="mt-0.5 text-xs text-muted-foreground">{person.nickname}</div>
                        )}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">{typeLabel}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {person.region || '—'}
                      </TableCell>
                      <TableCell className="tabular-nums text-sm text-muted-foreground">
                        {getLifespan(person)}
                      </TableCell>
                      <TableCell className="max-w-[360px]">
                        <p
                          className="truncate text-sm text-muted-foreground"
                          title={person.description || '—'}
                        >
                          {person.description || '—'}
                        </p>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            className="h-7 gap-1 px-2 text-xs"
                            onClick={() => handleOpenDetails(person)}
                          >
                            <Eye className="size-3.5" />
                            Details
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon-xs"
                            className="text-muted-foreground hover:text-foreground"
                            onClick={() => handleOpenEdit(person)}
                          >
                            <Pencil className="size-3.5" />
                            <span className="sr-only">Edit</span>
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon-xs"
                            className="text-destructive/50 hover:bg-destructive/10 hover:text-destructive"
                            onClick={() => handleDeleteRequest(person)}
                          >
                            <Trash2 className="size-3.5" />
                            <span className="sr-only">Delete</span>
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  )
                })
              )}
            </TableBody>
          </Table>
        </div>
      )}

      <ConfirmDialog
        open={Boolean(deleteTarget)}
        title="Delete person record"
        description={
          deleteTarget
            ? `This will permanently remove "${deleteTarget.fullName}" (${deleteTarget.personCode}). This action cannot be undone.`
            : ''
        }
        confirmLabel="Delete Person"
        cancelLabel="Keep Record"
        confirmVariant="destructive"
        isProcessing={isDeleting}
        onConfirm={handleDeleteConfirm}
        onOpenChange={(nextOpen) => {
          if (!nextOpen) {
            setDeleteTarget(null)
          }
        }}
      />

      <PersonDetailsModal
        open={Boolean(detailsTarget)}
        person={detailsTarget}
        onOpenChange={(nextOpen) => {
          if (!nextOpen) {
            setDetailsTarget(null)
          }
        }}
      />
    </EmployeeEntityPage>
  )
}

export { EmployeePersonPage }
