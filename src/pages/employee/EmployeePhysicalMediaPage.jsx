import { useCallback, useEffect, useRef, useState } from 'react'
import {
  AlertTriangle,
  Eye,
  HardDrive,
  Loader2,
  Pencil,
  Plus,
  RefreshCw,
  RotateCcw,
  Search,
  Trash2,
  Upload,
} from 'lucide-react'

import { EmployeeEntityPage } from '@/components/employee/EmployeeEntityPage'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardFooter } from '@/components/ui/card'
import { CodeBadge } from '@/components/ui/code-badge'
import { ConfirmDialog } from '@/components/ui/confirm-dialog'
import { EmptyState } from '@/components/ui/empty-state'
import { Input } from '@/components/ui/input'
import { DataPagination } from '@/components/ui/pagination'
import { Skeleton } from '@/components/ui/skeleton'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { usePersistentState } from '@/hooks/use-persistent-state'
import { useToast } from '@/hooks/use-toast'
import { useIsAdmin } from '@/hooks/use-current-profile'
import { cn } from '@/lib/utils'
import { isStaleVersionError } from '@/lib/get-error-message'
import { formatDateTime } from '@/components/maqam/maqam-helpers'
import { PhysicalMediaDetailView } from '@/components/physical-media/PhysicalMediaDetailView'
import { PhysicalMediaFormSections } from '@/components/physical-media/PhysicalMediaFormSections'
import { PhysicalMediaImportDialog } from '@/components/physical-media/PhysicalMediaImportDialog'
import { PhysicalMediaTypeDialog } from '@/components/physical-media/PhysicalMediaTypeDialog'
import {
  DIGITIZATION_LABELS,
  TYPE_DEFAULT_FIELDS,
  buildPhysicalMediaPayload,
  createInitialPhysicalMediaForm,
  populateFormFromPhysicalMedia,
} from '@/lib/physical-media-form'
import {
  createPhysicalMedia,
  deletePhysicalMedia,
  getPhysicalMedia,
  getPhysicalMediaNextNumber,
  getPhysicalMediaPage,
  getPhysicalMediaTrashPage,
  getPhysicalMediaTypes,
  purgePhysicalMedia,
  restorePhysicalMedia,
  searchPhysicalMedia,
  updatePhysicalMedia,
} from '@/services/physical-media'

const PAGE_SIZE = 50

function DigitizationBadge({ value }) {
  if (!value) return <span className="text-muted-foreground">—</span>
  const tone =
    value === 'DIGITIZED'
      ? 'bg-green-500/15 text-green-600 dark:text-green-400'
      : value === 'DUPLICATED'
        ? 'bg-sky-500/15 text-sky-600 dark:text-sky-400'
        : 'bg-muted text-muted-foreground'
  return (
    <span className={cn('inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium', tone)}>
      {DIGITIZATION_LABELS[value] || value}
    </span>
  )
}

function ClearBadge({ value }) {
  if (value == null) return <span className="text-muted-foreground">—</span>
  return value ? (
    <span className="inline-flex items-center rounded-full bg-amber-500/15 px-2 py-0.5 text-[11px] font-medium text-amber-600 dark:text-amber-400">
      Needs clearing
    </span>
  ) : (
    <span className="inline-flex items-center rounded-full bg-muted px-2 py-0.5 text-[11px] font-medium text-muted-foreground">
      Clean
    </span>
  )
}

function TabButton({ active, onClick, icon, children }) {
  const Icon = icon
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'inline-flex items-center gap-2 rounded-xl border px-3 py-1.5 text-sm font-medium transition-colors',
        active
          ? 'border-primary/40 bg-primary/10 text-primary'
          : 'border-border bg-background text-muted-foreground hover:bg-muted/60',
      )}
    >
      <Icon className="size-4" />
      {children}
    </button>
  )
}

function EmployeePhysicalMediaPage() {
  const toast = useToast()
  const isAdmin = useIsAdmin()

  const [view, setView] = useState('list') // 'list' | 'create' | 'edit'
  const [tab, setTab] = usePersistentState('employee.physicalMedia.tab', 'active') // 'active' | 'trash' (admin only)

  // Active list
  const [records, setRecords] = useState(null)
  const [meta, setMeta] = useState(null)
  const [page, setPage] = usePersistentState('employee.physicalMedia.page', 0)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  // Search
  const [search, setSearch] = usePersistentState('employee.physicalMedia.search', '')
  const [searchResults, setSearchResults] = useState(null)
  const [searching, setSearching] = useState(false)

  // Trash (admin)
  const [trashRecords, setTrashRecords] = useState(null)
  const [trashMeta, setTrashMeta] = useState(null)
  const [trashPage, setTrashPage] = useState(0)
  const [trashLoading, setTrashLoading] = useState(false)

  // Form
  const [form, setForm] = useState(createInitialPhysicalMediaForm)
  const [formError, setFormError] = useState('')
  const [isSaving, setIsSaving] = useState(false)
  const [currentCode, setCurrentCode] = useState(null)
  const [editLoadingCode, setEditLoadingCode] = useState(null)

  // Type catalog (cached; drives the type dropdown + autofill)
  const [types, setTypes] = useState([])
  const [addTypeOpen, setAddTypeOpen] = useState(false)
  const lastTypeRef = useRef(null) // the type row whose 9 defaults were last applied
  const lastAutoNumberRef = useRef('') // the last auto-suggested Number we prefilled

  // Misc UI
  const [importOpen, setImportOpen] = useState(false)
  const [viewCode, setViewCode] = useState(null)
  const [confirm, setConfirm] = useState(null) // { title, description, confirmLabel, variant, onConfirm }
  const [busyCode, setBusyCode] = useState(null)

  const loadTypes = useCallback(async () => {
    try {
      const data = await getPhysicalMediaTypes()
      setTypes(Array.isArray(data) ? data : [])
    } catch {
      // non-fatal — the dropdown just won't have catalog options
    }
  }, [])

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadTypes()
  }, [loadTypes])

  // Copy a catalog row's 9 technical defaults into the form + remember it so we
  // know later which fields are still "untouched defaults" vs user edits.
  const applyTypeDefaults = (typeRow) => {
    setForm((f) => {
      const next = { ...f, physicalMediaType: typeRow.name }
      for (const k of TYPE_DEFAULT_FIELDS) next[k] = typeRow[k] ?? ''
      return next
    })
    lastTypeRef.current = typeRow
  }

  // Preview the server-assigned per-type Number and prefill it — but only if the
  // user hasn't already typed a Number, and only when creating.
  const fetchNextNumber = async (typeName) => {
    if (!typeName) return
    try {
      const res = await getPhysicalMediaNextNumber(typeName)
      const n = res?.nextInventoryNumber
      if (n == null) return
      setForm((f) => {
        const cur = String(f.inventoryNumber ?? '').trim()
        // Prefill only if blank or still showing a previous auto-suggestion (so we
        // refresh on type switch but never clobber a number the user typed).
        if (cur === '' || cur === lastAutoNumberRef.current) {
          lastAutoNumberRef.current = String(n)
          return { ...f, inventoryNumber: String(n) }
        }
        return f
      })
    } catch {
      // best-effort preview — server still auto-assigns on submit
    }
  }

  // Picking a type autofills the technical fields. If the user already typed
  // custom values into them, confirm before overwriting (spec §2.4).
  const onTypeSelect = (name) => {
    const row = types.find((t) => t.name === name)
    if (!row) {
      setForm((f) => ({ ...f, physicalMediaType: name }))
      return
    }
    const prev = lastTypeRef.current
    const dirty = TYPE_DEFAULT_FIELDS.some((k) => {
      const cur = String(form[k] ?? '').trim()
      if (!cur) return false
      const prevDefault = prev ? String(prev[k] ?? '').trim() : ''
      return cur !== prevDefault
    })
    if (dirty) {
      setForm((f) => ({ ...f, physicalMediaType: row.name }))
      setConfirm({
        title: 'Overwrite technical fields?',
        description: `Apply “${row.name}” capture defaults? Your edited technical fields will be replaced.`,
        confirmLabel: 'Overwrite',
        variant: 'destructive',
        onConfirm: () => applyTypeDefaults(row),
      })
    } else {
      applyTypeDefaults(row)
    }
    if (view === 'create') fetchNextNumber(row.name)
  }

  const handleTypeCreated = (created) => {
    setAddTypeOpen(false)
    loadTypes()
    if (created) {
      applyTypeDefaults(created)
      if (view === 'create') fetchNextNumber(created.name)
    }
  }

  const loadActive = useCallback(async (nextPage = 0) => {
    setLoading(true)
    setError('')
    try {
      // No sort override — the backend defaults to id,ASC so rows read 1..N like the sheet.
      const data = await getPhysicalMediaPage({ page: nextPage, size: PAGE_SIZE })
      const rows = Array.isArray(data?.content) ? data.content : Array.isArray(data) ? data : []
      setRecords(rows)
      setMeta({
        page: data?.number ?? nextPage,
        totalPages: data?.totalPages ?? Math.ceil(rows.length / PAGE_SIZE),
        totalElements: data?.totalElements ?? rows.length,
        size: data?.size ?? PAGE_SIZE,
      })
      setPage(data?.number ?? nextPage)
    } catch (err) {
      setError(err?.response?.data?.message || err?.message || 'Could not load physical media.')
    } finally {
      setLoading(false)
    }
  }, [setPage])

  const loadTrash = useCallback(async (nextPage = 0) => {
    setTrashLoading(true)
    try {
      const data = await getPhysicalMediaTrashPage({ page: nextPage, size: PAGE_SIZE })
      const rows = Array.isArray(data?.content) ? data.content : Array.isArray(data) ? data : []
      setTrashRecords(rows)
      setTrashMeta({
        page: data?.number ?? nextPage,
        totalPages: data?.totalPages ?? Math.ceil(rows.length / PAGE_SIZE),
        totalElements: data?.totalElements ?? rows.length,
        size: data?.size ?? PAGE_SIZE,
      })
      setTrashPage(data?.number ?? nextPage)
    } catch (err) {
      toast.apiError(err, 'Could not load the trash.')
    } finally {
      setTrashLoading(false)
    }
  }, [toast])

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadActive(0)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Lazy-load trash the first time the admin opens that tab.
  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    if (tab === 'trash' && isAdmin && trashRecords == null) loadTrash(0)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab, isAdmin])
  /* eslint-enable react-hooks/set-state-in-effect */

  // Debounced backend search over the active set.
  useEffect(() => {
    const q = search.trim()
    if (!q) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setSearchResults(null)
      setSearching(false)
      return undefined
    }
    const ctrl = new AbortController()
    setSearching(true)
    const timer = setTimeout(async () => {
      try {
        const data = await searchPhysicalMedia(q, { limit: 50, signal: ctrl.signal })
        if (!ctrl.signal.aborted) setSearchResults(Array.isArray(data) ? data : [])
      } catch (err) {
        if (err?.code !== 'ERR_CANCELED') setSearchResults([])
      } finally {
        if (!ctrl.signal.aborted) setSearching(false)
      }
    }, 280)
    return () => {
      clearTimeout(timer)
      ctrl.abort()
    }
  }, [search])

  const isSearchMode = Boolean(search.trim())
  const activeRows = isSearchMode ? searchResults : records
  const activeBusy = isSearchMode ? searching : loading

  // ── Form handlers ─────────────────────────────────────────────────────────
  const openCreate = () => {
    setForm(createInitialPhysicalMediaForm())
    setCurrentCode(null)
    setFormError('')
    lastTypeRef.current = null
    lastAutoNumberRef.current = ''
    setView('create')
  }

  const openEdit = async (row) => {
    setEditLoadingCode(row.pmCode)
    let full = row
    try {
      full = await getPhysicalMedia(row.pmCode)
    } catch {
      // fall back to the row data we already have
    }
    setEditLoadingCode(null)
    setForm(populateFormFromPhysicalMedia(full))
    setCurrentCode(full.pmCode)
    // Seed the "last applied type" so re-picking the same type doesn't falsely
    // flag the stamped (matching) defaults as user edits.
    lastTypeRef.current = types.find((t) => t.name === full.physicalMediaType) || null
    setFormError('')
    setView('edit')
  }

  const closeForm = () => {
    setView('list')
    setCurrentCode(null)
    setFormError('')
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    // No client-side gate — empty / partial records are accepted; the server is
    // the only authority and its message (if any) is surfaced inline.
    setFormError('')
    setIsSaving(true)
    const payload = buildPhysicalMediaPayload(form)
    try {
      if (view === 'create') {
        const saved = await createPhysicalMedia(payload)
        toast.success('Record created', `${saved?.pmCode || 'New record'} was added.`)
      } else {
        await updatePhysicalMedia(currentCode, payload)
        toast.success('Record updated', `${currentCode} was saved.`)
      }
      await loadActive(view === 'create' ? 0 : page)
      closeForm()
    } catch (err) {
      if (isStaleVersionError(err)) {
        toast.apiError(err, 'Reload required')
        await loadActive(page)
        closeForm()
        return
      }
      const data = err?.response?.data
      const details =
        data?.details && typeof data.details === 'object'
          ? Object.entries(data.details)
              .map(([k, v]) => `${k}: ${v}`)
              .join(' · ')
          : ''
      setFormError(details || data?.message || err?.message || 'Failed to save the record.')
      toast.apiError(err, 'Unable to save the record.')
    } finally {
      setIsSaving(false)
    }
  }

  // ── Destructive actions (admin) ─────────────────────────────────────────────
  const askDelete = (row) =>
    setConfirm({
      title: 'Move to trash?',
      description: `“${row.title || row.physicalLabel || row.pmCode}” will be soft-trashed. You can restore it later.`,
      confirmLabel: 'Move to trash',
      variant: 'destructive',
      onConfirm: async () => {
        setBusyCode(row.pmCode)
        try {
          await deletePhysicalMedia(row.pmCode)
          toast.success('Moved to trash', `${row.pmCode} was trashed.`)
          await loadActive(page)
          if (trashRecords != null) await loadTrash(trashPage)
        } catch (err) {
          toast.apiError(err, 'Could not trash the record.')
        } finally {
          setBusyCode(null)
        }
      },
    })

  const handleRestore = async (row) => {
    setBusyCode(row.pmCode)
    try {
      await restorePhysicalMedia(row.pmCode)
      toast.success('Restored', `${row.pmCode} is back in the active list.`)
      await loadTrash(trashPage)
      await loadActive(page)
    } catch (err) {
      toast.apiError(err, 'Could not restore the record.')
    } finally {
      setBusyCode(null)
    }
  }

  const askPurge = (row) =>
    setConfirm({
      title: 'Permanently delete?',
      description: `“${row.title || row.physicalLabel || row.pmCode}” will be permanently deleted. This cannot be undone.`,
      confirmLabel: 'Delete permanently',
      variant: 'destructive',
      onConfirm: async () => {
        setBusyCode(row.pmCode)
        try {
          await purgePhysicalMedia(row.pmCode)
          toast.success('Deleted', `${row.pmCode} was permanently removed.`)
          await loadTrash(trashPage)
        } catch (err) {
          toast.apiError(err, 'Could not delete the record.')
        } finally {
          setBusyCode(null)
        }
      },
    })

  const totalActive = meta?.totalElements
  const totalTrash = trashMeta?.totalElements

  // ── Full-page detail view ────────────────────────────────────────────────────
  if (view === 'detail') {
    return (
      <PhysicalMediaDetailView
        code={viewCode}
        onBack={() => { setView('list'); setViewCode(null) }}
        onEdit={(row) => openEdit(row)}
      />
    )
  }

  // ── Create / edit form view ─────────────────────────────────────────────────
  if (view === 'create' || view === 'edit') {
    return (
      <EmployeeEntityPage
        eyebrow={view === 'create' ? 'New record' : 'Editing'}
        title={view === 'create' ? 'Add physical media' : 'Edit physical media'}
        badge={view === 'edit' ? currentCode : undefined}
        description="Track a cassette, reel, DVD or other physical artefact being prepared for digitisation."
      >
        <form id="pm-form" onSubmit={handleSubmit} className="space-y-5">
          <PhysicalMediaFormSections
            form={form}
            setForm={setForm}
            types={types}
            onTypeSelect={onTypeSelect}
            onAddType={() => setAddTypeOpen(true)}
            canManageTypes={isAdmin}
          />

          {formError ? (
            <div className="flex items-center gap-2 rounded-xl border border-destructive/40 bg-destructive/5 px-3 py-2.5 text-sm text-destructive">
              <AlertTriangle className="size-4 shrink-0" />
              <span>{formError}</span>
            </div>
          ) : null}
        </form>

        <Card className="mt-5 border-border bg-card shadow-sm shadow-black/5">
          <CardFooter className="flex items-center justify-end gap-2 px-6 py-4">
            <Button type="button" variant="outline" onClick={closeForm} disabled={isSaving}>
              Cancel
            </Button>
            <Button type="submit" form="pm-form" disabled={isSaving} className="gap-2">
              {isSaving ? <Loader2 className="size-4 animate-spin" /> : null}
              {isSaving ? 'Saving…' : view === 'create' ? 'Create record' : 'Save changes'}
            </Button>
          </CardFooter>
        </Card>

        {isAdmin ? (
          <PhysicalMediaTypeDialog
            open={addTypeOpen}
            onOpenChange={setAddTypeOpen}
            initialName={form.physicalMediaType && !types.some((t) => t.name === form.physicalMediaType) ? form.physicalMediaType : ''}
            onCreated={handleTypeCreated}
          />
        ) : null}

        <ConfirmDialog
          open={Boolean(confirm)}
          onOpenChange={(open) => !open && setConfirm(null)}
          title={confirm?.title}
          description={confirm?.description}
          confirmLabel={confirm?.confirmLabel}
          confirmVariant={confirm?.variant}
          onConfirm={async () => {
            const fn = confirm?.onConfirm
            setConfirm(null)
            if (fn) await fn()
          }}
        />
      </EmployeeEntityPage>
    )
  }

  // ── List view ───────────────────────────────────────────────────────────────
  return (
    <EmployeeEntityPage
      eyebrow="Archive"
      title="Physical media"
      badge={totalActive != null ? `${totalActive} items` : undefined}
      description="The cassette / reel / DVD inventory being prepared for digitisation. Add rows by hand or import the Excel sheet."
      action={
        <div className="flex flex-wrap items-center gap-2">
          <Button type="button" variant="outline" className="gap-2" onClick={() => loadActive(page)} disabled={loading}>
            <RefreshCw className={cn('size-4', loading && 'animate-spin')} />
            Refresh
          </Button>
          <Button type="button" variant="outline" className="gap-2" onClick={() => setImportOpen(true)}>
            <Upload className="size-4" />
            Import Excel
          </Button>
          <Button type="button" className="gap-2" onClick={openCreate}>
            <Plus className="size-4" />
            New record
          </Button>
        </div>
      }
    >
      {/* Tabs (trash is admin-only) */}
      {isAdmin ? (
        <div className="flex flex-wrap items-center gap-2">
          <TabButton active={tab === 'active'} onClick={() => setTab('active')} icon={HardDrive}>
            Active {totalActive != null ? `(${totalActive})` : ''}
          </TabButton>
          <TabButton active={tab === 'trash'} onClick={() => setTab('trash')} icon={Trash2}>
            Trash {totalTrash != null ? `(${totalTrash})` : ''}
          </TabButton>
        </div>
      ) : null}

      {error ? (
        <Card className="border-destructive/40 bg-destructive/5">
          <CardContent className="flex items-center gap-3 px-4 py-3">
            <AlertTriangle className="size-4 shrink-0 text-destructive" />
            <p className="flex-1 text-sm text-destructive">{error}</p>
            <Button type="button" variant="outline" size="sm" onClick={() => loadActive(page)}>
              Retry
            </Button>
          </CardContent>
        </Card>
      ) : null}

      {tab === 'active' ? (
        <>
          {/* Search */}
          <Card className="border-border shadow-sm shadow-black/5">
            <CardContent className="px-4 py-3">
              <div className="relative w-full sm:max-w-md">
                <Search className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search by type, title, label, category…"
                  className="pl-8"
                />
              </div>
            </CardContent>
          </Card>

          <Card className="overflow-hidden border-border shadow-sm shadow-black/5">
            <CardContent className="p-0">
              {activeBusy && !activeRows ? (
                <div className="space-y-2 p-4">
                  {Array.from({ length: 6 }).map((_, i) => (
                    <Skeleton key={i} className="h-10 w-full" />
                  ))}
                </div>
              ) : !activeRows || activeRows.length === 0 ? (
                <div className="py-10">
                  <EmptyState
                    icon={HardDrive}
                    title={isSearchMode ? 'No matches' : 'No physical media yet'}
                    description={
                      isSearchMode
                        ? 'No records match your search.'
                        : 'Add your first record by hand, or import the inventory spreadsheet.'
                    }
                  />
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Code</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Title / label</TableHead>
                      <TableHead className="hidden md:table-cell">Category</TableHead>
                      <TableHead className="hidden lg:table-cell">Digitization</TableHead>
                      <TableHead className="hidden lg:table-cell">Year</TableHead>
                      <TableHead className="hidden xl:table-cell">Clear</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {activeRows.map((r) => (
                      <TableRow key={r.pmCode}>
                        <TableCell>
                          <CodeBadge code={r.pmCode} size="sm" />
                        </TableCell>
                        <TableCell className="max-w-[12rem] truncate text-foreground">{r.physicalMediaType || '—'}</TableCell>
                        <TableCell className="max-w-[16rem]">
                          <p className="truncate font-medium text-foreground">{r.title || r.physicalLabel || '—'}</p>
                          {r.title && r.physicalLabel ? (
                            <p className="truncate font-mono text-[11px] text-muted-foreground">{r.physicalLabel}</p>
                          ) : null}
                        </TableCell>
                        <TableCell className="hidden text-muted-foreground md:table-cell">{r.mediaCategory || '—'}</TableCell>
                        <TableCell className="hidden lg:table-cell">
                          <DigitizationBadge value={r.digitization} />
                        </TableCell>
                        <TableCell className="hidden tabular-nums text-muted-foreground lg:table-cell">{r.year ?? '—'}</TableCell>
                        <TableCell className="hidden xl:table-cell">
                          <ClearBadge value={r.needToClear} />
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center justify-end gap-1.5">
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              className="gap-1"
                              onClick={() => { setViewCode(r.pmCode); setView('detail') }}
                            >
                              <Eye className="size-3.5" />
                              View
                            </Button>
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              className="gap-1"
                              onClick={() => openEdit(r)}
                              disabled={editLoadingCode === r.pmCode}
                            >
                              {editLoadingCode === r.pmCode ? (
                                <Loader2 className="size-3.5 animate-spin" />
                              ) : (
                                <Pencil className="size-3.5" />
                              )}
                              Edit
                            </Button>
                            {isAdmin ? (
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon-sm"
                                aria-label="Move to trash"
                                disabled={busyCode === r.pmCode}
                                onClick={() => askDelete(r)}
                              >
                                <Trash2 className="size-3.5" />
                              </Button>
                            ) : null}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>

          {!isSearchMode && meta ? (
            <DataPagination
              page={meta.page}
              totalPages={meta.totalPages}
              totalElements={meta.totalElements}
              pageSize={meta.size}
              onPageChange={(p) => loadActive(p)}
            />
          ) : null}
        </>
      ) : (
        /* Trash tab (admin) */
        <>
          <Card className="overflow-hidden border-border shadow-sm shadow-black/5">
            <CardContent className="p-0">
              {trashLoading && !trashRecords ? (
                <div className="space-y-2 p-4">
                  {Array.from({ length: 4 }).map((_, i) => (
                    <Skeleton key={i} className="h-10 w-full" />
                  ))}
                </div>
              ) : !trashRecords || trashRecords.length === 0 ? (
                <div className="py-10">
                  <EmptyState icon={Trash2} title="Trash is empty" description="No trashed physical-media records." />
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Code</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Title / label</TableHead>
                      <TableHead className="hidden md:table-cell">Trashed</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {trashRecords.map((r) => (
                      <TableRow key={r.pmCode}>
                        <TableCell>
                          <CodeBadge code={r.pmCode} size="sm" />
                        </TableCell>
                        <TableCell className="max-w-[12rem] truncate text-foreground">{r.physicalMediaType || '—'}</TableCell>
                        <TableCell className="max-w-[16rem] truncate font-medium text-foreground">
                          {r.title || r.physicalLabel || '—'}
                        </TableCell>
                        <TableCell className="hidden text-xs text-muted-foreground md:table-cell">
                          {formatDateTime(r.removedAt)}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center justify-end gap-1.5">
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              className="gap-1"
                              disabled={busyCode === r.pmCode}
                              onClick={() => handleRestore(r)}
                            >
                              {busyCode === r.pmCode ? (
                                <Loader2 className="size-3.5 animate-spin" />
                              ) : (
                                <RotateCcw className="size-3.5" />
                              )}
                              Restore
                            </Button>
                            <Button
                              type="button"
                              variant="destructive"
                              size="sm"
                              className="gap-1"
                              disabled={busyCode === r.pmCode}
                              onClick={() => askPurge(r)}
                            >
                              <Trash2 className="size-3.5" />
                              Delete
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>

          {trashMeta ? (
            <DataPagination
              page={trashMeta.page}
              totalPages={trashMeta.totalPages}
              totalElements={trashMeta.totalElements}
              pageSize={trashMeta.size}
              onPageChange={(p) => loadTrash(p)}
            />
          ) : null}
        </>
      )}

      <PhysicalMediaImportDialog
        open={importOpen}
        onOpenChange={setImportOpen}
        onImported={() => loadActive(0)}
      />

      <ConfirmDialog
        open={Boolean(confirm)}
        onOpenChange={(open) => !open && setConfirm(null)}
        title={confirm?.title}
        description={confirm?.description}
        confirmLabel={confirm?.confirmLabel}
        confirmVariant={confirm?.variant}
        onConfirm={async () => {
          const fn = confirm?.onConfirm
          setConfirm(null)
          if (fn) await fn()
        }}
      />
    </EmployeeEntityPage>
  )
}

export { EmployeePhysicalMediaPage }
