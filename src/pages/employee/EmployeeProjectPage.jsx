import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import {
  Eye,
  EyeOff,
  FolderOpen,
  Globe,
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
import { FieldHelpButton } from '@/components/ui/field-help'
import { getProjectFieldMetadata } from '@/lib/project-fields-metadata'
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
import { TagSuggestInput } from '@/components/ui/tag-suggest-input'
import { KeywordSuggestInput } from '@/components/ui/keyword-suggest-input'
import { VisibilityToggle } from '@/components/ui/visibility-toggle'
import { usePersistentState } from '@/hooks/use-persistent-state'
import { useToast } from '@/hooks/use-toast'
import { FormErrorBox } from '@/components/ui/form-error'
import { cn } from '@/lib/utils'
import { formatApiError, getErrorMessage, isStaleVersionError } from '@/lib/get-error-message'
import { getCategories, searchCategories } from '@/services/category'
import { getPersons, searchPersons } from '@/services/person'
import {
  createProject,
  deleteProject,
  getProjects,
  getProjectsPage,
  setProjectVisibility,
  updateProject,
} from '@/services/project'
import { getItemsPage } from '@/services/items'

const PROJECTS_PAGE_SIZE = 100
const PROJECT_MEDIA_COUNT_PAGE_SIZE = 500
const PROJECT_CODE_PREFIX_PATTERN = /^[A-Z0-9_-]+$/
const PROJECT_CODE_SUFFIX_RE = /-PROJ-(\d{6})$/i
const PROJECT_CODE_FULL_PATTERN = /^[A-Z0-9_-]+-PROJ-\d{6}$/
const PROJECT_CODE_MARKER_RE = /-PROJ-/i

function toArray(value) {
  if (Array.isArray(value)) return value.filter(Boolean)
  if (!value) return []
  return String(value)
    .split(/[,،;]/)
    .map((entry) => entry.trim())
    .filter(Boolean)
}

const PERSON_KIND_PERSON = 'person'
const PERSON_KIND_NONE = 'none'

function projectMediaCounts(project) {
  return [
    { key: 'audio', label: 'audio', value: Number(project?.audioCount) || 0 },
    { key: 'video', label: 'video', value: Number(project?.videoCount) || 0 },
    { key: 'image', label: 'image', value: Number(project?.imageCount) || 0 },
    { key: 'text', label: 'text', value: Number(project?.textCount) || 0 },
  ].filter((entry) => entry.value > 0)
}

function createEmptyMediaCounts() {
  return { audioCount: 0, videoCount: 0, imageCount: 0, textCount: 0 }
}

function mediaCountKey(type) {
  const normalized = String(type || '').toUpperCase()
  if (normalized === 'AUDIO') return 'audioCount'
  if (normalized === 'VIDEO') return 'videoCount'
  if (normalized === 'IMAGE') return 'imageCount'
  if (normalized === 'TEXT') return 'textCount'
  return null
}

async function getMediaCountsForProjects(projectCodes) {
  const codes = [...new Set((projectCodes || []).filter(Boolean))]
  const countsByProject = new Map(codes.map((code) => [code, createEmptyMediaCounts()]))
  if (codes.length === 0) return countsByProject

  let itemPage = 0
  let totalItemPages = 1

  do {
    const pageData = await getItemsPage({
      projectCodes: codes,
      page: itemPage,
      size: PROJECT_MEDIA_COUNT_PAGE_SIZE,
    })
    const rows = Array.isArray(pageData?.content) ? pageData.content : []

    for (const item of rows) {
      const projectCode = item?.projectCode || item?.project?.projectCode
      const countKey = mediaCountKey(item?.type)
      if (!projectCode || !countKey) continue
      const counts = countsByProject.get(projectCode) || createEmptyMediaCounts()
      counts[countKey] += 1
      countsByProject.set(projectCode, counts)
    }

    const reportedTotalPages = Number(pageData?.totalPages)
    if (Number.isFinite(reportedTotalPages) && reportedTotalPages > 0) {
      totalItemPages = reportedTotalPages
    } else {
      totalItemPages = rows.length < PROJECT_MEDIA_COUNT_PAGE_SIZE ? itemPage + 1 : itemPage + 2
    }
    itemPage += 1
  } while (itemPage < totalItemPages)

  return countsByProject
}

async function addMediaCountsToProjects(projectRows) {
  const rows = Array.isArray(projectRows) ? projectRows : []
  if (rows.length === 0) return rows
  let countsByProject
  try {
    countsByProject = await getMediaCountsForProjects(rows.map((project) => project.projectCode))
  } catch {
    return rows
  }
  return rows.map((project) => ({
    ...project,
    ...(countsByProject.get(project.projectCode) || createEmptyMediaCounts()),
  }))
}

function isTrendingProject(project) {
  const rank = Number(project?.trendingRank ?? project?.trendRank)
  const score = Number(project?.trendingScore ?? project?.trendScore)
  return Boolean(
    project?.trending ||
    project?.isTrending ||
    (Number.isFinite(rank) && rank > 0) ||
    (Number.isFinite(score) && score > 0),
  )
}

function ProjectTrendingBadge({ project }) {
  if (!isTrendingProject(project)) return null
  const rank = project?.trendingRank ?? project?.trendRank
  return (
    <span className="inline-flex items-center rounded-full bg-orange-500/15 px-2 py-0.5 text-[10px] font-semibold text-orange-700 dark:text-orange-300">
      {rank ? `Trending #${rank}` : 'Trending'}
    </span>
  )
}

function ProjectPersonChip({ project, query }) {
  const label = project?.personCode ? project.personName || project.personCode : 'No person linked'
  return (
    <span
      className={cn(
        'inline-flex max-w-full items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-medium',
        project?.personCode
          ? 'border-purple-200 bg-purple-500/10 text-purple-700 dark:border-purple-900/40 dark:text-purple-300'
          : 'border-border bg-muted/30 text-muted-foreground italic',
      )}
    >
      <Highlight text={String(label)} query={query} />
      {project?.personCode ? (
        <span className="font-mono text-[10px] text-muted-foreground">
          <Highlight text={project.personCode} query={query} />
        </span>
      ) : null}
    </span>
  )
}

function ProjectCategoryChips({ project, query }) {
  const categories = Array.isArray(project?.categories) ? project.categories : []
  if (categories.length === 0) return <span className="text-sm text-muted-foreground">—</span>
  return (
    <div className="flex flex-wrap gap-1">
      {categories.map((c) => (
        <span
          key={c.categoryCode || c.code || c.id || c.categoryName || c.name}
          className="inline-flex items-center rounded-full border bg-muted/40 px-2 py-0.5 text-[11px] font-medium text-foreground/80"
        >
          <Highlight text={c.categoryName || c.name || c.categoryCode || c.code} query={query} />
        </span>
      ))}
    </div>
  )
}

function ProjectCountChips({ project }) {
  const counts = projectMediaCounts(project)
  const total = counts.reduce((sum, count) => sum + count.value, 0)
  return (
    <span className={cn(
      'inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs font-medium',
      total > 0 ? 'bg-background text-foreground/80' : 'bg-muted/30 text-muted-foreground',
    )}>
      <span className="font-mono text-[11px] font-semibold tabular-nums">{total}</span>
      media
    </span>
  )
}

function projectCodePrefix(value) {
  const prefix = String(value || '')
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toUpperCase()
    .replace(/&/g, 'AND')
    .replace(/[^A-Z0-9]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 48)
    .replace(/-$/g, '')
  return prefix || 'PROJECT'
}

function formatProjectCodeInput(value) {
  return String(value || '')
    .trim()
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toUpperCase()
    .replace(/\s+/g, '-')
    .replace(/[^A-Z0-9_-]/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
}

function projectCodePrefixFromValue(value) {
  return formatProjectCodeInput(value).replace(PROJECT_CODE_SUFFIX_RE, '')
}

function normalizedProjectCodeInput(value) {
  return formatProjectCodeInput(value)
}

// Keep in-progress separators while the user is typing. Final cleanup still
// happens through normalizedProjectCodeInput when validating/submitting.
function projectCodeDraftInput(value) {
  return String(value || '')
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toUpperCase()
    .replace(/\s+/g, '-')
    .replace(/[^A-Z0-9_-]/g, '')
    .slice(0, 72)
}

function isFullProjectCode(value) {
  return PROJECT_CODE_FULL_PATTERN.test(normalizedProjectCodeInput(value))
}

function nextProjectCodeNumber(projects) {
  const max = (projects || []).reduce((highest, project) => {
    const match = String(project?.projectCode || '').match(PROJECT_CODE_SUFFIX_RE)
    if (!match) return highest
    const value = Number(match[1])
    return Number.isFinite(value) ? Math.max(highest, value) : highest
  }, 0)
  return String(max + 1).padStart(6, '0')
}

function buildProjectCodeFromPrefix(prefix, projects) {
  return `${projectCodePrefixFromValue(prefix) || 'PROJECT'}-PROJ-${nextProjectCodeNumber(projects)}`
}

function buildProjectCodeFromInput(value, projects) {
  const normalized = normalizedProjectCodeInput(value)
  if (isFullProjectCode(normalized)) return normalized
  return buildProjectCodeFromPrefix(normalized, projects)
}

function createInitialForm() {
  return {
    projectName: '',
    projectCode: '',
    personKind: PERSON_KIND_PERSON,
    personCode: '',
    categoryCodes: [],
    description: '',
    tags: [],
    keywords: [],
    isVisibleToPublic: false,
    visibilityCascade: 'NONE', // CASCADE | NONE — only sent on update when the flag changes
  }
}

function populateFormFromProject(project) {
  return {
    projectName: project.projectName || '',
    projectCode: project.projectCode || '',
    personKind: project.personCode ? PERSON_KIND_PERSON : PERSON_KIND_NONE,
    personCode: project.personCode || '',
    categoryCodes: (project.categories || [])
      .map((cat) => cat.categoryCode)
      .filter(Boolean),
    description: project.description || '',
    tags: toArray(project.tags),
    keywords: toArray(project.keywords),
    isVisibleToPublic: project.isVisibleToPublic === true,
    visibilityCascade: 'NONE',
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
  const [isProjectCodeManual, setIsProjectCodeManual] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [formError, setFormError] = useState('')

  const [searchTerm, setSearchTerm] = usePersistentState('employee.project.search', '')
  const [detailsTarget, setDetailsTarget] = useState(null)

  // Server-side pagination. When the user is searching we fall back to
  // fetching the whole list and filtering client-side (Project doesn't have
  // a /search endpoint), so the pagination bar hides itself in that mode
  // because totalPages stays at 0.
  const [page, setPage] = usePersistentState('employee.project.page', 0)
  const [totalPages, setTotalPages] = useState(0)
  const [totalElements, setTotalElements] = useState(0)

  const [deleteTarget, setDeleteTarget] = useState(null)
  const [isDeleting, setIsDeleting] = useState(false)

  const [visSaving, setVisSaving] = useState({}) // projectCode -> true while a toggle saves

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
          const rows = await addMediaCountsToProjects(data || [])
          setProjects(rows)
          setTotalPages(0)
          setTotalElements(rows.length)
        } else {
          const pageData = await getProjectsPage({ page, size: PROJECTS_PAGE_SIZE })
          const rows = await addMediaCountsToProjects(pageData?.content || [])
          setProjects(rows)
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
  }, [setSearchTerm, setPage])

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
    setIsProjectCodeManual(false)
    setFormError('')
    loadLinkOptions()
    setView('create')
  }

  const handleOpenEdit = (project) => {
    setCurrentProject(project)
    setForm(populateFormFromProject(project))
    setIsProjectCodeManual(true)
    setFormError('')
    loadLinkOptions()
    setView('edit')
  }

  const handleCloseForm = () => {
    setView('list')
    setCurrentProject(null)
    setIsProjectCodeManual(false)
    setFormError('')
  }

  const buildCreatePayload = (existingProjects = projects) => {
    const payload = {
      projectName: form.projectName.trim(),
      personCode:
        form.personKind === PERSON_KIND_PERSON && form.personCode.trim()
          ? form.personCode.trim()
          : null,
      categoryCodes: form.categoryCodes,
      description: form.description.trim() || null,
      tags: toArray(form.tags),
      keywords: toArray(form.keywords),
      isVisibleToPublic: form.isVisibleToPublic === true,
    }
    if (form.personKind === PERSON_KIND_NONE) {
      const manualCode = normalizedProjectCodeInput(form.projectCode).trim()
      const codeInput = isProjectCodeManual && manualCode
        ? manualCode
        : projectCodePrefix(form.projectName)
      payload.projectCode = buildProjectCodeFromInput(codeInput, existingProjects)
    }
    return payload
  }

  const buildUpdatePayload = () => {
    const payload = {
      projectName: form.projectName.trim(),
      categoryCodes: form.categoryCodes,
      description: form.description.trim() || null,
      tags: toArray(form.tags),
      keywords: toArray(form.keywords),
    }
    // Only send the visibility flag when it actually changed; pair it with the
    // cascade choice so the backend either flips all media (CASCADE) or leaves
    // each media's own isPublic untouched (NONE).
    const orig = currentProject?.isVisibleToPublic === true
    const next = form.isVisibleToPublic === true
    if (next !== orig) {
      payload.isVisibleToPublic = next
      payload.visibilityCascade = form.visibilityCascade === 'CASCADE' ? 'CASCADE' : 'NONE'
    }
    return payload
  }

  const handleSubmit = async (event) => {
    event.preventDefault()
    setFormError('')

    if (!form.projectName.trim()) {
      setFormError('Project name is required.')
      return
    }
    if (form.personKind === PERSON_KIND_PERSON && !form.personCode.trim()) {
      setFormError('Choose a person, or switch to No person linked.')
      return
    }
    if (form.categoryCodes.length === 0) {
      setFormError('Pick at least one category for this project.')
      return
    }
    if (view === 'create' && form.personKind === PERSON_KIND_NONE) {
      const manualCode = normalizedProjectCodeInput(form.projectCode).trim()
      const projectCodeInputValue = isProjectCodeManual && manualCode
        ? manualCode
        : projectCodePrefix(form.projectName)
      if (PROJECT_CODE_MARKER_RE.test(projectCodeInputValue) && !isFullProjectCode(projectCodeInputValue)) {
        setFormError('Full project codes must end with -PROJ- followed by six digits, for example DENG-PROJ-000004.')
        return
      }
      if (!PROJECT_CODE_PREFIX_PATTERN.test(projectCodeInputValue)) {
        setFormError('Project code must use letters, numbers, hyphens, or underscores.')
        return
      }
    }

    setIsSaving(true)
    try {
      if (view === 'create') {
        let codeSourceProjects = projects
        if (form.personKind === PERSON_KIND_NONE) {
          try {
            codeSourceProjects = await getProjects()
          } catch {
            // The create request still goes through; the backend validates the
            // submitted code and will surface any duplicate/race condition.
          }
        }
        const saved = await createProject(buildCreatePayload(codeSourceProjects))
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

  // Flip a collection's public visibility right from the row — optimistic, with
  // a rollback + toast on failure. cascade='NONE' touches only the collection
  // flag (guests already need both flags true, so its media stays hidden from
  // guests anyway). A stale-version conflict reloads so the row catches up.
  const handleToggleVisibility = useCallback(
    async (project, next) => {
      const code = project.projectCode
      setVisSaving((s) => ({ ...s, [code]: true }))
      setProjects((ps) =>
        ps.map((p) =>
          p.projectCode === code
            ? { ...p, isVisibleToPublic: next, visibleToPublic: next }
            : p,
        ),
      )
      try {
        const saved = await setProjectVisibility(project, next)
        if (saved?.projectCode) {
          setProjects((ps) => ps.map((p) => (p.projectCode === code ? { ...p, ...saved } : p)))
        }
        toast.success(
          next ? 'Collection is now public' : 'Collection hidden',
          next
            ? `${code} — guests can find and view it.`
            : `${code} — hidden from guests (its media is hidden from them too).`,
        )
      } catch (err) {
        setProjects((ps) =>
          ps.map((p) =>
            p.projectCode === code
              ? { ...p, isVisibleToPublic: !next, visibleToPublic: !next }
              : p,
          ),
        )
        if (isStaleVersionError(err)) {
          toast.apiError(err, 'Reload required')
          await loadProjects()
          return
        }
        toast.apiError(err, 'Unable to update visibility')
      } finally {
        setVisSaving((s) => {
          const copy = { ...s }
          delete copy[code]
          return copy
        })
      }
    },
    [toast, loadProjects],
  )

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
    const isPublicVisible = form.isVisibleToPublic === true
    // The cascade choice only matters when editing AND the flag actually changed.
    const visibilityDirty = isEdit && isPublicVisible !== (currentProject?.isVisibleToPublic === true)
    const showProjectCodeField = form.personKind === PERSON_KIND_NONE
    const suggestedProjectCode =
      showProjectCodeField && form.projectName.trim()
        ? buildProjectCodeFromPrefix(projectCodePrefix(form.projectName), projects)
        : ''
    const projectCodeInput = isEdit
      ? String(currentProject?.projectCode || '')
      : projectCodeDraftInput(form.projectCode)
    const effectiveProjectCodeInput = projectCodeInput || suggestedProjectCode
    const savedProjectCodePreview =
      showProjectCodeField && effectiveProjectCodeInput
        ? buildProjectCodeFromInput(effectiveProjectCodeInput, projects)
        : ''
    return (
      <EmployeeEntityPage
        eyebrow={isEdit ? 'Editing' : 'New record'}
        title={isEdit ? 'Edit Project' : 'New Project'}
        description="A project is a collection that ties media files (audio, and later video / image / text) to a person, or leaves the person empty when no person applies."
      >
        <form id="project-form" onSubmit={handleSubmit} className="mx-auto block w-full max-w-3xl">
          <div className="space-y-6">
            <Card className="border-border bg-card shadow-sm shadow-black/5">
              <CardHeader className="border-b border-border pb-4">
                <CardTitle className="text-base font-semibold">Project</CardTitle>
                <CardDescription className="text-xs">
                  Identity, the linked person (or no person linked), and categories.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-5 pt-5">
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between gap-2">
                    <Label htmlFor="projectName">
                      Project name <span className="text-destructive">*</span>
                    </Label>
                    <FieldHelpButton metadata={getProjectFieldMetadata('projectName')} />
                  </div>
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
                  <div className="flex items-center justify-between gap-2">
                    <Label>Person link {isEdit ? <span className="font-normal text-muted-foreground">(locked after creation)</span> : null}</Label>
                    <FieldHelpButton metadata={getProjectFieldMetadata('person')} />
                  </div>
                  <div className="flex gap-2">
                    <Button
                      type="button"
                      size="sm"
                      variant={form.personKind === PERSON_KIND_PERSON ? 'default' : 'outline'}
                      disabled={isEdit}
                      onClick={() => {
                        setIsProjectCodeManual(false)
                        setForm((f) => ({ ...f, personKind: PERSON_KIND_PERSON }))
                      }}
                    >
                      Linked to a person
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant={form.personKind === PERSON_KIND_NONE ? 'default' : 'outline'}
                      disabled={isEdit}
                      onClick={() => {
                        setIsProjectCodeManual(false)
                        setForm((f) => ({ ...f, personKind: PERSON_KIND_NONE, personCode: '' }))
                      }}
                    >
                      No person linked
                    </Button>
                  </div>
                  {form.personKind === PERSON_KIND_PERSON ? (
                    <div className="pt-2">
                      <SearchSelect
                        items={persons}
                        value={form.personCode}
                        onChange={(next) => {
                          setIsProjectCodeManual(false)
                          setForm({ ...form, personCode: next })
                        }}
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
                    </div>
                  ) : (
                    <p className="pt-1 text-xs text-muted-foreground">
                      The frontend sends the full project code for no-person projects; the backend stores that exact code.
                    </p>
                  )}
                </div>

                {showProjectCodeField ? (
                  <div className="space-y-2 rounded-lg border bg-muted/20 px-4 py-3">
                    <div className="flex items-center justify-between gap-2">
                      <Label htmlFor="projectCode">Project code</Label>
                      <FieldHelpButton metadata={getProjectFieldMetadata('projectCode')} />
                    </div>
                    <div className="flex flex-col gap-2 sm:flex-row">
                      <Input
                        id="projectCode"
                        value={projectCodeInput || ''}
                        onChange={(e) => {
                          setIsProjectCodeManual(true)
                          setForm((f) => ({ ...f, projectCode: projectCodeDraftInput(e.target.value) }))
                        }}
                        placeholder={suggestedProjectCode || 'DENG-PROJ-000004'}
                        disabled={isEdit}
                        readOnly={isEdit}
                        autoComplete="off"
                        spellCheck={false}
                        className="font-mono text-sm font-semibold"
                      />
                      {!isEdit ? (
                        <Button
                          type="button"
                          variant="outline"
                          className="shrink-0 gap-2"
                          disabled={!suggestedProjectCode}
                          onClick={() => {
                            setIsProjectCodeManual(true)
                            setForm((f) => ({ ...f, projectCode: suggestedProjectCode }))
                          }}
                        >
                          <RefreshCw className="size-3.5" />
                          Use suggested
                        </Button>
                      ) : null}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {isEdit
                        ? 'Locked after creation.'
                        : savedProjectCodePreview
                        ? `${projectCodeInput ? 'Your code' : 'Suggested code'}: ${savedProjectCodePreview}. You can type a full code or only a prefix; the backend stores the final code as-is.`
                        : 'Only no-person projects send projectCode from the frontend. Type a full code, or type a prefix and use the generated preview.'}
                    </p>
                  </div>
                ) : null}

                <div className="space-y-1.5">
                  <div className="flex items-center justify-between gap-2">
                    <Label>
                      Categories <span className="text-destructive">*</span>{' '}
                      <span className="font-normal text-muted-foreground">(at least one)</span>
                    </Label>
                    <FieldHelpButton metadata={getProjectFieldMetadata('categories')} />
                  </div>
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
                <CardTitle className="text-base font-semibold">Visibility</CardTitle>
                <CardDescription className="text-xs">
                  Control whether this collection is visible to public / guest visitors.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4 pt-5">
                <div
                  className={cn(
                    'flex items-center justify-between gap-4 rounded-2xl border px-5 py-4',
                    isPublicVisible
                      ? 'border-green-200 bg-green-50/40 dark:border-green-900/30 dark:bg-green-950/10'
                      : 'border-amber-200 bg-amber-50/40 dark:border-amber-900/30 dark:bg-amber-950/10',
                  )}
                >
                  <div className="flex items-center gap-3">
                    <span
                      className={cn(
                        'grid size-9 shrink-0 place-items-center rounded-xl',
                        isPublicVisible ? 'bg-green-500/15 text-green-600' : 'bg-amber-500/15 text-amber-600',
                      )}
                    >
                      {isPublicVisible ? <Globe className="size-4.5" /> : <EyeOff className="size-4.5" />}
                    </span>
                    <div>
                      <p className="text-sm font-semibold text-foreground">
                        {isPublicVisible ? 'Visible to public' : 'Hidden from public'}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {isPublicVisible
                          ? 'Guests can find and view this collection.'
                          : 'Only archive staff can see it — guests cannot find it.'}
                      </p>
                    </div>
                  </div>
                  <label className="relative cursor-pointer select-none">
                    <input
                      type="checkbox"
                      className="peer sr-only"
                      checked={isPublicVisible}
                      onChange={(e) => setForm({ ...form, isVisibleToPublic: e.target.checked })}
                    />
                    <div
                      className={cn(
                        'flex h-6 w-11 items-center rounded-full px-0.5 transition-colors',
                        isPublicVisible ? 'bg-green-500' : 'bg-input',
                      )}
                    >
                      <div
                        className={cn(
                          'size-5 rounded-full bg-white shadow-sm transition-transform',
                          isPublicVisible ? 'translate-x-5' : 'translate-x-0',
                        )}
                      />
                    </div>
                  </label>
                </div>

                {visibilityDirty ? (
                  <div className="rounded-2xl border border-border bg-muted/20 px-5 py-4">
                    <p className="mb-3 text-sm font-medium text-foreground">
                      When you change this, what should happen to the audios / videos / images / texts inside?
                    </p>
                    <div className="space-y-2.5">
                      <label className="flex cursor-pointer items-start gap-3">
                        <input
                          type="radio"
                          name="visibilityCascade"
                          className="mt-1"
                          checked={form.visibilityCascade === 'CASCADE'}
                          onChange={() => setForm({ ...form, visibilityCascade: 'CASCADE' })}
                        />
                        <span>
                          <span className="text-sm font-semibold text-foreground">Cascade</span>
                          <span className="block text-xs text-muted-foreground">
                            Apply the same visibility to every media file in this collection.
                          </span>
                        </span>
                      </label>
                      <label className="flex cursor-pointer items-start gap-3">
                        <input
                          type="radio"
                          name="visibilityCascade"
                          className="mt-1"
                          checked={form.visibilityCascade !== 'CASCADE'}
                          onChange={() => setForm({ ...form, visibilityCascade: 'NONE' })}
                        />
                        <span>
                          <span className="text-sm font-semibold text-foreground">Custom</span>
                          <span className="block text-xs text-muted-foreground">
                            Only change the collection flag — keep each media file&apos;s own visibility.
                          </span>
                        </span>
                      </label>
                    </div>
                  </div>
                ) : null}
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
                  <div className="flex items-center justify-between gap-2">
                    <Label htmlFor="description">Description</Label>
                    <FieldHelpButton metadata={getProjectFieldMetadata('description')} />
                  </div>
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
                    <div className="flex items-center justify-between gap-2">
                      <Label htmlFor="tags">Tags</Label>
                      <FieldHelpButton metadata={getProjectFieldMetadata('tags')} />
                    </div>
                    <TagSuggestInput
                      id="tags"
                      value={form.tags}
                      onChange={(next) => setForm({ ...form, tags: next })}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between gap-2">
                      <Label htmlFor="keywords">Keywords</Label>
                      <FieldHelpButton metadata={getProjectFieldMetadata('keywords')} />
                    </div>
                    <KeywordSuggestInput
                      id="keywords"
                      value={form.keywords}
                      onChange={(next) => setForm({ ...form, keywords: next })}
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
      description="Each project is a collection of audio, video, image and text records, tied to a person or left without a person."
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
          description="Create your first project — pick a person or leave it blank, choose categories, and start ingesting media."
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
                <TableHead className="w-[320px]">Project</TableHead>
                <TableHead className="w-[200px]">Person</TableHead>
                <TableHead className="w-[260px]">Categories</TableHead>
                <TableHead className="w-[130px]">Media</TableHead>
                <TableHead className="w-[130px]">Visibility</TableHead>
                <TableHead className="w-[190px] text-right">Actions</TableHead>
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
                filteredProjects.map((project, index) => (
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
                        <div className="min-w-0 space-y-1.5">
                          <div className="flex min-w-0 items-center gap-2">
                            <Link
                              to={`${sectionBase}/project/${project.projectCode}`}
                              className="block min-w-0 truncate text-left font-semibold leading-tight text-foreground hover:text-primary focus-visible:outline-none focus-visible:underline"
                              title={project.projectName}
                            >
                              <Highlight text={project.projectName || project.projectCode || ''} query={searchTerm} />
                            </Link>
                            <ProjectTrendingBadge project={project} />
                          </div>
                          <CodeBadge
                            code={project.projectCode}
                            variant="subtle"
                            size="sm"
                            highlightQuery={searchTerm}
                            className="border-blue-200 bg-blue-500/10 text-blue-700 dark:border-blue-900/40 dark:text-blue-300"
                          />
                          {project.removedAt && (
                            <span className="inline-flex items-center rounded-full border border-amber-500/30 bg-amber-500/10 px-2 py-0.5 text-[10px] font-medium text-amber-700 dark:text-amber-300">
                              Removed
                            </span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <ProjectPersonChip project={project} query={searchTerm} />
                      </TableCell>
                      <TableCell>
                        <ProjectCategoryChips project={project} query={searchTerm} />
                      </TableCell>
                      <TableCell>
                        <ProjectCountChips project={project} />
                      </TableCell>
                      <TableCell>
                        <VisibilityToggle
                          checked={project.isVisibleToPublic === true}
                          pending={Boolean(visSaving[project.projectCode])}
                          onToggle={(next) => handleToggleVisibility(project, next)}
                          title={
                            project.isVisibleToPublic === true
                              ? 'Visible to public — click to hide'
                              : 'Hidden from public — click to show'
                          }
                        />
                      </TableCell>
                      <TableCell className="text-right align-middle">
                        <div className="flex flex-col items-end gap-1.5">
                          <div className="flex items-center justify-end gap-1.5">
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              className="h-8 gap-1.5 px-2.5 text-xs font-semibold"
                              onClick={() => navigate(`${sectionBase}/project/${project.projectCode}`)}
                            >
                              <Eye className="size-3.5" />
                              Open
                            </Button>
                            <span className="admin-print-record-target inline-flex" data-admin-print-target />
                          </div>
                          <div className="flex items-center justify-end gap-0.5 rounded-full border border-border/70 bg-muted/30 px-1 py-0.5">
                            <Button
                              variant="ghost"
                              size="icon-xs"
                              className="text-muted-foreground hover:bg-background hover:text-foreground"
                              onClick={() => setDetailsTarget(project)}
                              title="Quick details"
                            >
                              <FolderOpen className="size-3.5" />
                              <span className="sr-only">Details</span>
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon-xs"
                              className="text-muted-foreground hover:bg-background hover:text-foreground"
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
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
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
