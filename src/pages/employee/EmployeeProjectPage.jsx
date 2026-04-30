import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import {
  Eye,
  FolderOpen,
  Loader2,
  Pencil,
  Plus,
  RefreshCw,
  Trash2,
  X,
} from 'lucide-react'

import { EmployeeEntityPage } from '@/components/employee/EmployeeEntityPage'
import { ProjectDetailsModal } from '@/components/project/ProjectDetailsModal'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { CodeBadge } from '@/components/ui/code-badge'
import { ConfirmDialog } from '@/components/ui/confirm-dialog'
import { TypedConfirmDialog } from '@/components/ui/typed-confirm-dialog'
import { EmptyState } from '@/components/ui/empty-state'
import { EntityToolbar } from '@/components/ui/entity-toolbar'
import { Highlight } from '@/components/ui/highlight'
import { Input } from '@/components/ui/input'
import { DataPagination } from '@/components/ui/pagination'
import { Label } from '@/components/ui/label'
import { SearchSelect } from '@/components/ui/search-select'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { TagsInput } from '@/components/ui/tags-input'
import { useToast } from '@/hooks/use-toast'
import { FormErrorBox } from '@/components/ui/form-error'
import { formatApiError, getErrorMessage, isStaleVersionError } from '@/lib/get-error-message'
import { getCategories, searchCategories } from '@/services/category'
import { getPersons, searchPersons } from '@/services/person'
import {
  createProject,
  deleteProject,
  getProjects,
  getProjectsPage,
  updateProject,
} from '@/services/project'

const PROJECTS_PAGE_SIZE = 100

function toArray(value) {
  if (Array.isArray(value)) return value.filter(Boolean)
  if (!value) return []
  return String(value)
    .split(/[,،;]/)
    .map((entry) => entry.trim())
    .filter(Boolean)
}

const PERSON_KIND_PERSON = 'person'
const PERSON_KIND_UNTITLED = 'untitled'

function createInitialForm() {
  return {
    projectName: '',
    personKind: PERSON_KIND_PERSON,
    personCode: '',
    categoryCodes: [],
    description: '',
    tags: [],
    keywords: [],
  }
}

function populateFormFromProject(project) {
  return {
    projectName: project.projectName || '',
    personKind: project.personCode ? PERSON_KIND_PERSON : PERSON_KIND_UNTITLED,
    personCode: project.personCode || '',
    categoryCodes: (project.categories || [])
      .map((cat) => cat.categoryCode)
      .filter(Boolean),
    description: project.description || '',
    tags: toArray(project.tags),
    keywords: toArray(project.keywords),
  }
}

function EmployeeProjectPage() {
  const toast = useToast()
  const navigate = useNavigate()
  const location = useLocation()

  // Section-aware base path. Same component is mounted under /employee/project
  // and /admin/project; we derive the prefix from the current URL so the
  // "Open" link, the navigate-to-detail call, and the post-create redirect
  // all stay inside the section the user is currently working in.
  const sectionBase = location.pathname.startsWith('/admin') ? '/admin' : '/employee'

  const [projects, setProjects] = useState([])
  const [persons, setPersons] = useState([])
  const [categories, setCategories] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [isLoadingLinks, setIsLoadingLinks] = useState(false)
  const [error, setError] = useState('')

  const [view, setView] = useState('list')
  const [currentProject, setCurrentProject] = useState(null)

  const [form, setForm] = useState(createInitialForm)
  const [isSaving, setIsSaving] = useState(false)
  const [formError, setFormError] = useState('')

  const [searchTerm, setSearchTerm] = useState('')
  const [detailsTarget, setDetailsTarget] = useState(null)

  // Server-side pagination. When the user is searching we fall back to
  // fetching the whole list and filtering client-side (Project doesn't have
  // a /search endpoint), so the pagination bar hides itself in that mode
  // because totalPages stays at 0.
  const [page, setPage] = useState(0)
  const [totalPages, setTotalPages] = useState(0)
  const [totalElements, setTotalElements] = useState(0)

  const [deleteTarget, setDeleteTarget] = useState(null)
  const [isDeleting, setIsDeleting] = useState(false)

  const loadProjects = useCallback(
    async (options = {}) => {
      const { notifyError = false } = options
      setIsLoading(true)
      setError('')
      try {
        if (searchTerm.trim()) {
          // Search mode — Project has no backend /search endpoint, so fetch
          // the full list and let the client-side filter handle it. Pagination
          // bar hides (totalPages=0) because there's nothing to paginate.
          const data = await getProjects()
          setProjects(data || [])
          setTotalPages(0)
          setTotalElements((data || []).length)
        } else {
          const pageData = await getProjectsPage({ page, size: PROJECTS_PAGE_SIZE })
          setProjects(pageData?.content || [])
          setTotalPages(pageData?.totalPages || 0)
          setTotalElements(pageData?.totalElements || 0)
        }
      } catch (err) {
        setError(getErrorMessage(err, 'Failed to load projects'))
        if (notifyError) toast.apiError(err, 'Could not refresh projects')
      } finally {
        setIsLoading(false)
      }
    },
    [page, searchTerm, toast],
  )

  const loadLinkOptions = useCallback(async () => {
    setIsLoadingLinks(true)
    try {
      const [personsData, categoriesData] = await Promise.all([
        getPersons().catch(() => []),
        getCategories().catch(() => []),
      ])
      setPersons((personsData || []).filter((p) => !p.removedAt))
      setCategories((categoriesData || []).filter((c) => !c.removedAt))
    } finally {
      setIsLoadingLinks(false)
    }
  }, [])

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadProjects()
  }, [loadProjects])

  // Reset to page 0 when the user starts/stops searching, otherwise the
  // browse-mode `page` could point past totalPages of a smaller result.
  const handleSearchChange = useCallback((value) => {
    setSearchTerm(value)
    setPage(0)
  }, [])

  // V3 trash model: backend's GET /project returns active records only;
  // trashed records live at /project/trash and are managed from the admin
  // Trash page.
  const visibleProjects = projects

  const filteredProjects = useMemo(() => {
    const term = searchTerm.trim().toLowerCase()
    if (!term) return visibleProjects
    return visibleProjects.filter((project) => {
      const categories = (project.categories || [])
        .map((c) => `${c.categoryName || ''} ${c.categoryCode || ''}`)
        .join(' ')
      const tags = Array.isArray(project.tags) ? project.tags.join(' ') : ''
      const keywords = Array.isArray(project.keywords) ? project.keywords.join(' ') : ''
      const haystack = [
        project.projectCode,
        project.projectName,
        project.personCode,
        project.personName,
        project.description,
        categories,
        tags,
        keywords,
      ]
        .filter(Boolean)
        .join(' ')
      return haystack.toLowerCase().includes(term)
    })
  }, [visibleProjects, searchTerm])

  const categoryByCode = useMemo(() => {
    const map = new Map()
    for (const cat of categories) {
      if (cat.categoryCode) map.set(cat.categoryCode, cat)
    }
    return map
  }, [categories])

  // Backend search across name, nickname, romanized name, description, tags,
  // keywords, region, places, code, and person type. The seed list still
  // comes from `persons` so the dropdown isn't empty before the user types.
  const personAsyncSearch = useCallback(
    async (q, { signal }) => searchPersons(q, { limit: 50, signal }),
    [],
  )

  const handleOpenCreate = () => {
    setCurrentProject(null)
    setForm(createInitialForm())
    setFormError('')
    loadLinkOptions()
    setView('create')
  }

  const handleOpenEdit = (project) => {
    setCurrentProject(project)
    setForm(populateFormFromProject(project))
    setFormError('')
    loadLinkOptions()
    setView('edit')
  }

  const handleCloseForm = () => {
    setView('list')
    setCurrentProject(null)
    setFormError('')
  }

  const buildCreatePayload = () => ({
    projectName: form.projectName.trim(),
    personCode:
      form.personKind === PERSON_KIND_PERSON && form.personCode.trim()
        ? form.personCode.trim()
        : null,
    categoryCodes: form.categoryCodes,
    description: form.description.trim() || null,
    tags: toArray(form.tags),
    keywords: toArray(form.keywords),
  })

  const buildUpdatePayload = () => ({
    projectName: form.projectName.trim(),
    categoryCodes: form.categoryCodes,
    description: form.description.trim() || null,
    tags: toArray(form.tags),
    keywords: toArray(form.keywords),
  })

  const handleSubmit = async (event) => {
    event.preventDefault()
    setFormError('')

    if (!form.projectName.trim()) {
      setFormError('Project name is required.')
      return
    }
    if (form.personKind === PERSON_KIND_PERSON && !form.personCode.trim()) {
      setFormError('Choose a person, or switch to Untitled Project.')
      return
    }
    if (form.categoryCodes.length === 0) {
      setFormError('Pick at least one category for this project.')
      return
    }

    setIsSaving(true)
    try {
      if (view === 'create') {
        const saved = await createProject(buildCreatePayload())
        toast.success('Project created', `${saved.projectCode} — pick a media type to start adding files.`)
        // Land the user on the project detail page where they can pick a media
        // type (Audio / Video / Image / Text) and start adding files. We don't
        // auto-open the audio form so the future media types are visible.
        navigate(`${sectionBase}/project/${saved.projectCode}`)
        return
      }
      await updateProject(currentProject.projectCode, buildUpdatePayload())
      toast.success('Project updated', `${currentProject.projectCode} changes were saved.`)
      await loadProjects()
      handleCloseForm()
    } catch (err) {
      // Optimistic-locking conflict — bounce back to list so the user
      // can re-open the row and see the latest values.
      if (isStaleVersionError(err)) {
        toast.apiError(err, 'Reload required')
        await loadProjects()
        handleCloseForm()
        return
      }
      setFormError(formatApiError(err, 'Failed to save project'))
      toast.apiError(err, 'Unable to save project')
    } finally {
      setIsSaving(false)
    }
  }

  // Soft-trash. Backend cascades: trashing a project also bulk-trashes its
  // audio/video/image/text records. The linked person and category are not
  // touched. The confirm dialog copy below spells this out.
  const handleDeleteConfirm = async () => {
    if (!deleteTarget) return
    setIsDeleting(true)
    try {
      await deleteProject(deleteTarget.projectCode)
      toast.success(
        'Sent to trash',
        `${deleteTarget.projectCode} and its media moved to trash. An admin can restore them.`,
      )
      setDeleteTarget(null)
      await loadProjects()
    } catch (err) {
      toast.apiError(err, 'Unable to send project to trash')
    } finally {
      setIsDeleting(false)
    }
  }

  /* ── form view ──────────────────────────────────────────────── */
  if (view === 'create' || view === 'edit') {
    const isEdit = view === 'edit'
    return (
      <EmployeeEntityPage
        eyebrow={isEdit ? 'Editing' : 'New record'}
        title={isEdit ? 'Edit Project' : 'New Project'}
        description="A project is a collection that ties media files (audio, and later video / image / text) to a person, or to an untitled project when no person applies."
      >
        <form id="project-form" onSubmit={handleSubmit} className="mx-auto block w-full max-w-3xl">
          <div className="space-y-6">
            <Card className="border-border bg-card shadow-sm shadow-black/5">
              <CardHeader className="border-b border-border pb-4">
                <CardTitle className="text-base font-semibold">Project</CardTitle>
                <CardDescription className="text-xs">
                  Identity, the linked person (or untitled), and categories.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-5 pt-5">
                <div className="space-y-1.5">
                  <Label htmlFor="projectName">
                    Project name <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="projectName"
                    value={form.projectName}
                    onChange={(e) => setForm({ ...form, projectName: e.target.value })}
                    placeholder="e.g. Hesen Zirek — Field Recordings 1962"
                    required
                    className="text-base font-medium"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label>Person link {isEdit ? <span className="font-normal text-muted-foreground">(locked after creation)</span> : null}</Label>
                  <div className="flex gap-2">
                    <Button
                      type="button"
                      size="sm"
                      variant={form.personKind === PERSON_KIND_PERSON ? 'default' : 'outline'}
                      disabled={isEdit}
                      onClick={() => setForm((f) => ({ ...f, personKind: PERSON_KIND_PERSON }))}
                    >
                      Linked to a person
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant={form.personKind === PERSON_KIND_UNTITLED ? 'default' : 'outline'}
                      disabled={isEdit}
                      onClick={() =>
                        setForm((f) => ({ ...f, personKind: PERSON_KIND_UNTITLED, personCode: '' }))
                      }
                    >
                      Untitled (no person)
                    </Button>
                  </div>
                  {form.personKind === PERSON_KIND_PERSON ? (
                    <div className="pt-2">
                      <SearchSelect
                        items={persons}
                        value={form.personCode}
                        onChange={(next) => setForm({ ...form, personCode: next })}
                        getKey={(p) => p.personCode}
                        getLabel={(p) => p.fullName || p.personCode}
                        getSubtitle={(p) => p.personCode}
                        placeholder="Search by name, nickname, code, region, places, or tags…"
                        emptyHint="No matching persons"
                        loading={isLoadingLinks && persons.length === 0}
                        disabled={isEdit}
                        required
                        fallbackLabel={form.personCode}
                        asyncSearch={personAsyncSearch}
                      />
                      {isEdit ? null : (
                        <p className="pt-1 text-xs text-muted-foreground">
                          Audio code prefix becomes the person's name (e.g.{' '}
                          <span className="font-mono font-semibold text-foreground">
                            HASAZIRA_AUD_RAW_V1_Copy(1)_000001
                          </span>
                          ).
                        </p>
                      )}
                    </div>
                  ) : (
                    <p className="pt-1 text-xs text-muted-foreground">
                      Audio code prefix will use the project's first category name.
                    </p>
                  )}
                </div>

                <div className="space-y-1.5">
                  <Label>
                    Categories <span className="text-destructive">*</span>{' '}
                    <span className="font-normal text-muted-foreground">(at least one)</span>
                  </Label>
                  <CategoryMultiSelect
                    categories={categories}
                    value={form.categoryCodes}
                    onChange={(next) => setForm({ ...form, categoryCodes: next })}
                    loading={isLoadingLinks}
                    categoryByCode={categoryByCode}
                  />
                </div>
              </CardContent>
            </Card>

            <Card className="border-border bg-card shadow-sm shadow-black/5">
              <CardHeader className="border-b border-border pb-4">
                <CardTitle className="text-base font-semibold">Description & Tags</CardTitle>
                <CardDescription className="text-xs">
                  Free-form notes plus searchable tags & keywords.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-5 pt-5">
                <div className="space-y-1.5">
                  <Label htmlFor="description">Description</Label>
                  <textarea
                    id="description"
                    value={form.description}
                    onChange={(e) => setForm({ ...form, description: e.target.value })}
                    placeholder="What is this collection? Provenance, scope, period…"
                    className="min-h-[120px] w-full resize-y rounded-lg border border-input bg-background px-3 py-2 text-sm shadow-sm transition-colors placeholder:text-muted-foreground/70 focus-visible:border-ring focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/30"
                  />
                </div>

                <div className="grid gap-5 sm:grid-cols-2">
                  <div className="space-y-1.5">
                    <Label htmlFor="tags">Tags</Label>
                    <TagsInput
                      id="tags"
                      value={form.tags}
                      onChange={(next) => setForm({ ...form, tags: next })}
                      placeholder="folk, 1962…"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="keywords">Keywords</Label>
                    <TagsInput
                      id="keywords"
                      value={form.keywords}
                      onChange={(next) => setForm({ ...form, keywords: next })}
                      placeholder="oral history, maqam…"
                    />
                  </div>
                </div>

                <FormErrorBox error={formError} />
              </CardContent>
              <CardFooter className="flex items-center justify-end gap-2 border-t border-border bg-muted/20 px-6 py-4">
                <Button type="button" variant="outline" onClick={handleCloseForm} disabled={isSaving}>
                  Cancel
                </Button>
                <Button type="submit" disabled={isSaving} className="gap-2">
                  {isSaving ? <Loader2 className="size-4 animate-spin" /> : null}
                  {isSaving ? 'Saving…' : isEdit ? 'Save Changes' : 'Create Project'}
                </Button>
              </CardFooter>
            </Card>
          </div>
        </form>
      </EmployeeEntityPage>
    )
  }

  /* ── list view ──────────────────────────────────────────────── */
  return (
    <EmployeeEntityPage
      eyebrow="Archive"
      title="Projects"
      badge={!isLoading && !error
        ? `${(searchTerm.trim() ? visibleProjects.length : totalElements).toLocaleString()} total`
        : null}
      description="Each project is a collection of media files (audio for now), tied to a person or marked Untitled Project."
      action={
        <Button onClick={handleOpenCreate} className="gap-2 shrink-0">
          <Plus className="size-4" />
          New Project
        </Button>
      }
    >
      <EntityToolbar
        filteredCount={filteredProjects.length}
        totalCount={searchTerm.trim() ? visibleProjects.length : totalElements}
        searchValue={searchTerm}
        onSearchChange={handleSearchChange}
        searchPlaceholder="Search by code, name, person, category, tags…"
        onRefresh={() => loadProjects({ notifyError: true })}
        isRefreshing={isLoading}
      />

      {isLoading ? (
        <Card className="border-border bg-card shadow-sm shadow-black/5">
          <div className="divide-y divide-border">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="flex items-center gap-4 px-4 py-3">
                <Skeleton className="h-4 w-6" />
                <Skeleton className="h-6 w-44 rounded-md" />
                <Skeleton className="h-4 w-40" />
                <Skeleton className="h-5 w-28 rounded-full" />
                <Skeleton className="h-4 flex-1 max-w-[300px]" />
                <Skeleton className="ml-auto h-7 w-20" />
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
              onClick={() => loadProjects({ notifyError: true })}
            >
              <RefreshCw className="size-4" />
              Retry
            </Button>
          </CardContent>
        </Card>
      ) : projects.length === 0 ? (
        <EmptyState
          icon={FolderOpen}
          title="No projects yet"
          description="Create your first project — pick a person (or Untitled), choose categories, and start ingesting audio."
          action={
            <Button onClick={handleOpenCreate} className="gap-2">
              <Plus className="size-4" />
              New Project
            </Button>
          }
        />
      ) : (
        <div className="overflow-hidden rounded-xl border border-border bg-card shadow-sm shadow-black/5">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/40 hover:bg-muted/40">
                <TableHead className="w-[52px] text-center">#</TableHead>
                <TableHead className="w-[220px]">Code</TableHead>
                <TableHead className="w-[260px]">Name</TableHead>
                <TableHead className="w-[200px]">Person</TableHead>
                <TableHead className="w-[260px]">Categories</TableHead>
                <TableHead>Description</TableHead>
                <TableHead className="w-[200px] text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredProjects.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="h-24 text-center text-muted-foreground">
                    No matching projects for this search.
                  </TableCell>
                </TableRow>
              ) : (
                filteredProjects.map((project, index) => {
                  const cats = (project.categories || []).slice(0, 2)
                  const extraCats = (project.categories?.length || 0) - cats.length
                  const personLabel = project.personCode
                    ? project.personName || project.personCode
                    : 'Untitled'
                  return (
                    <TableRow
                      key={project.projectCode}
                      className={`group transition-colors ${project.removedAt ? 'opacity-60' : ''}`}
                    >
                      <TableCell className="text-center text-xs tabular-nums text-muted-foreground">
                        {/* Absolute index across all pages — so page 10 with
                            size 100 numbers rows 901–1000, not 1–100. In
                            search mode there's no global position, so we
                            fall back to in-list rank. */}
                        {(searchTerm.trim() ? 0 : page * PROJECTS_PAGE_SIZE) + index + 1}
                      </TableCell>
                      <TableCell>
                        <CodeBadge code={project.projectCode} variant="subtle" highlightQuery={searchTerm} />
                      </TableCell>
                      <TableCell>
                        <Link
                          to={`${sectionBase}/project/${project.projectCode}`}
                          className="block max-w-[260px] truncate text-left font-semibold leading-tight text-foreground hover:text-primary focus-visible:outline-none focus-visible:underline"
                          title={project.projectName}
                        >
                          <Highlight text={project.projectName || ''} query={searchTerm} />
                        </Link>
                        {project.removedAt && (
                          <span className="inline-flex items-center rounded-full border border-amber-500/30 bg-amber-500/10 px-2 py-0.5 text-[10px] font-medium text-amber-700 dark:text-amber-300">
                            Removed
                          </span>
                        )}
                      </TableCell>
                      <TableCell>
                        <span
                          className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-medium ${project.personCode ? 'bg-muted/40 text-foreground' : 'bg-muted/20 text-muted-foreground italic'}`}
                        >
                          <Highlight text={String(personLabel)} query={searchTerm} />
                          {project.personCode ? (
                            <span className="font-mono text-[10px] text-muted-foreground">
                              <Highlight text={project.personCode} query={searchTerm} />
                            </span>
                          ) : null}
                        </span>
                      </TableCell>
                      <TableCell>
                        {cats.length === 0 ? (
                          <span className="text-sm text-muted-foreground">—</span>
                        ) : (
                          <div className="flex flex-wrap gap-1">
                            {cats.map((c) => (
                              <span
                                key={c.categoryCode}
                                className="inline-flex items-center rounded-full border bg-background px-2 py-0.5 text-[11px] text-foreground/80"
                              >
                                <Highlight text={c.categoryName || c.categoryCode} query={searchTerm} />
                              </span>
                            ))}
                            {extraCats > 0 ? (
                              <span className="text-[11px] font-medium text-muted-foreground">
                                +{extraCats}
                              </span>
                            ) : null}
                          </div>
                        )}
                      </TableCell>
                      <TableCell className="max-w-[320px]">
                        <p
                          className="truncate text-sm text-muted-foreground"
                          title={project.description || '—'}
                        >
                          {project.description ? (
                            <Highlight text={project.description} query={searchTerm} />
                          ) : (
                            '—'
                          )}
                        </p>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            className="h-7 gap-1 px-2 text-xs"
                            onClick={() => navigate(`${sectionBase}/project/${project.projectCode}`)}
                          >
                            <Eye className="size-3.5" />
                            Open
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon-xs"
                            className="text-muted-foreground hover:text-foreground"
                            onClick={() => setDetailsTarget(project)}
                            title="Quick details"
                          >
                            <FolderOpen className="size-3.5" />
                            <span className="sr-only">Details</span>
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon-xs"
                            className="text-muted-foreground hover:text-foreground"
                            onClick={() => handleOpenEdit(project)}
                            title="Edit project"
                          >
                            <Pencil className="size-3.5" />
                            <span className="sr-only">Edit</span>
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon-xs"
                            className="text-destructive/70 hover:bg-destructive/10 hover:text-destructive"
                            onClick={() => setDeleteTarget(project)}
                            title="Send to trash"
                          >
                            <Trash2 className="size-3.5" />
                            <span className="sr-only">Send to trash</span>
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

      {/* Server-side pagination — hidden during search (no /project/search). */}
      {!searchTerm.trim() && totalPages > 1 && (
        <DataPagination
          page={page}
          totalPages={totalPages}
          totalElements={totalElements}
          pageSize={PROJECTS_PAGE_SIZE}
          onPageChange={setPage}
          className="mt-4"
        />
      )}

      <TypedConfirmDialog
        open={Boolean(deleteTarget)}
        title="Send project to trash"
        description={
          deleteTarget
            ? `"${deleteTarget.projectName}" and ALL of its audio, video, image and text records will be moved to trash. The linked person and categories are not affected. An admin can restore from the Trash page.`
            : ''
        }
        codeToConfirm={deleteTarget?.projectCode}
        promptLabel="To confirm, type the project code"
        confirmLabel="Send to Trash"
        cancelLabel="Cancel"
        confirmVariant="destructive"
        isProcessing={isDeleting}
        onConfirm={handleDeleteConfirm}
        onOpenChange={(nextOpen) => {
          if (!nextOpen) setDeleteTarget(null)
        }}
      />

      <ProjectDetailsModal
        open={Boolean(detailsTarget)}
        project={detailsTarget}
        onOpenChange={(nextOpen) => {
          if (!nextOpen) setDetailsTarget(null)
        }}
      />
    </EmployeeEntityPage>
  )
}

function CategoryMultiSelect({ categories, value, onChange, loading, categoryByCode }) {
  const remaining = useMemo(
    () => categories.filter((c) => !value.includes(c.categoryCode)),
    [categories, value],
  )

  // Backend search across category name, description, code, and keywords.
  // The seed list still comes from `categories` so the dropdown isn't empty
  // before the user types, and already-picked entries are filtered out
  // client-side after the API returns.
  const asyncSearch = useCallback(
    async (q, { signal }) => {
      const results = await searchCategories(q, { limit: 50, signal })
      const selectedSet = new Set(value)
      return (results || []).filter((c) => !selectedSet.has(c.categoryCode))
    },
    [value],
  )

  return (
    <div className="space-y-2">
      <SearchSelect
        items={remaining}
        value=""
        onChange={(next) => {
          if (!next) return
          if (value.includes(next)) return
          onChange([...value, next])
        }}
        getKey={(c) => c.categoryCode}
        getLabel={(c) => c.name || c.categoryCode}
        getSubtitle={(c) => c.categoryCode}
        placeholder="Search by name, description, code, or keywords…"
        emptyHint={remaining.length === 0 ? 'All categories already added' : 'No matching categories'}
        loading={loading && categories.length === 0}
        asyncSearch={asyncSearch}
      />
      {value.length === 0 ? (
        <p className="text-xs text-muted-foreground">No categories chosen yet.</p>
      ) : (
        <div className="flex flex-wrap gap-1.5">
          {value.map((code) => {
            const cat = categoryByCode.get(code)
            const label = cat ? cat.name || code : code
            return (
              <span
                key={code}
                className="inline-flex items-center gap-1.5 rounded-full border bg-muted/40 px-2.5 py-1 text-xs font-medium text-foreground"
              >
                {label}
                <span className="font-mono text-[10px] text-muted-foreground">{code}</span>
                <button
                  type="button"
                  onClick={() => onChange(value.filter((v) => v !== code))}
                  className="text-muted-foreground transition hover:text-foreground"
                  aria-label={`Remove ${label}`}
                >
                  <X className="size-3" />
                </button>
              </span>
            )
          })}
        </div>
      )}
    </div>
  )
}

export { EmployeeProjectPage }
