import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useLocation, useNavigate, useParams } from 'react-router-dom'
import {
  ArrowDownAZ,
  ArrowLeft,
  ArrowUpAZ,
  AudioLines,
  CheckCircle2,
  Eye,
  FileAudio,
  FileText,
  FolderOpen,
  Image as ImageIcon,
  Loader2,
  Pencil,
  Plus,
  Trash2,
  Upload,
  Video as VideoIcon,
  X,
} from 'lucide-react'

import { AudioDetailsModal } from '@/components/audio/AudioDetailsModal'
import { AudioFilterPanel } from '@/components/audio/AudioFilterPanel'
import { EmployeeEntityPage } from '@/components/employee/EmployeeEntityPage'
import { ImageDetailsModal } from '@/components/image/ImageDetailsModal'
import { ImageFilterPanel } from '@/components/image/ImageFilterPanel'
import { ImageFormSections } from '@/components/image/ImageFormSections'
import { TextDetailsModal } from '@/components/text/TextDetailsModal'
import { TextFilterPanel } from '@/components/text/TextFilterPanel'
import { TextFormSections } from '@/components/text/TextFormSections'
import { VideoDetailsModal } from '@/components/video/VideoDetailsModal'
import { VideoFilterPanel } from '@/components/video/VideoFilterPanel'
import { VideoFormSections } from '@/components/video/VideoFormSections'
import { AudioPlayer } from '@/components/ui/audio-player'
import { VideoPlayer } from '@/components/ui/video-player'
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
import { Highlight } from '@/components/ui/highlight'
import { TypedConfirmDialog } from '@/components/ui/typed-confirm-dialog'
import { EmptyState } from '@/components/ui/empty-state'
import { EntityToolbar } from '@/components/ui/entity-toolbar'
import {
  FilterChips,
  FilterTriggerButton,
  SortSelect,
} from '@/components/ui/list-filters'
import {
  AUDIO_SORT_OPTIONS,
  DEFAULT_AUDIO_SORT_KEY,
  applyAudioFilters,
  applyAudioSort,
  buildAudioChips,
  countAudioFilters,
  createInitialAudioFilters,
  isAudioFilterEmpty,
} from '@/pages/employee/audio-filters'
import {
  IMAGE_SORT_OPTIONS,
  DEFAULT_IMAGE_SORT_KEY,
  applyImageFilters,
  applyImageSort,
  buildImageChips,
  countImageFilters,
  createInitialImageFilters,
  isImageFilterEmpty,
} from '@/pages/employee/image-filters'
import {
  VIDEO_SORT_OPTIONS,
  DEFAULT_VIDEO_SORT_KEY,
  applyVideoFilters,
  applyVideoSort,
  buildVideoChips,
  countVideoFilters,
  createInitialVideoFilters,
  isVideoFilterEmpty,
} from '@/pages/employee/video-filters'
import {
  TEXT_SORT_OPTIONS,
  DEFAULT_TEXT_SORT_KEY,
  applyTextFilters,
  applyTextSort,
  buildTextChips,
  countTextFilters,
  createInitialTextFilters,
  isTextFilterEmpty,
} from '@/pages/employee/text-filters'
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
import { TagsInput } from '@/components/ui/tags-input'
import { useToast } from '@/hooks/use-toast'
import { FormErrorBox } from '@/components/ui/form-error'
import { formatApiError, getErrorMessage, isStaleVersionError } from '@/lib/get-error-message'
import { cn } from '@/lib/utils'
import {
  createAudio,
  deleteAudio,
  getAudios,
  searchAudios,
  updateAudio,
} from '@/services/audio'
import { getProject } from '@/services/project'
import {
  createVideo,
  deleteVideo,
  getVideos,
  searchVideos,
  updateVideo,
} from '@/services/video'
import {
  createImage,
  deleteImage,
  getImages,
  searchImages,
  updateImage,
} from '@/services/image'
import {
  createText,
  deleteText,
  getTexts,
  searchTexts,
  updateText,
} from '@/services/text'
import {
  VIDEO_VERSIONS,
  buildVideoPayload,
  createInitialVideoForm,
  deriveVideoAutoFieldsFromFile,
  populateVideoFormFromVideo,
} from '@/lib/video-form'
import {
  IMAGE_VERSIONS,
  buildImagePayload,
  createInitialImageForm,
  deriveImageAutoFieldsFromFile,
  populateImageFormFromImage,
} from '@/lib/image-form'
import {
  TEXT_VERSIONS,
  buildTextPayload,
  createInitialTextForm,
  deriveTextAutoFieldsFromFile,
  populateTextFormFromText,
} from '@/lib/text-form'

const AUDIO_VERSIONS = ['RAW', 'MASTER']

function toArray(value) {
  if (Array.isArray(value)) return value.filter(Boolean)
  if (!value) return []
  return String(value)
    .split(/[,،;]/)
    .map((entry) => entry.trim())
    .filter(Boolean)
}

function toDateInputValue(instant) {
  if (!instant) return ''
  try {
    const d = new Date(instant)
    if (Number.isNaN(d.getTime())) return ''
    return d.toISOString().slice(0, 10)
  } catch {
    return ''
  }
}

function fromDateInputValue(value) {
  if (!value) return null
  try {
    const d = new Date(`${value}T00:00:00Z`)
    if (Number.isNaN(d.getTime())) return null
    return d.toISOString()
  } catch {
    return null
  }
}

function trimOrNull(value) {
  if (value === undefined || value === null) return null
  const trimmed = String(value).trim()
  return trimmed === '' ? null : trimmed
}

function formatFileSize(bytes) {
  if (typeof bytes !== 'number' || !Number.isFinite(bytes) || bytes < 0) return ''
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 ** 2) return `${(bytes / 1024).toFixed(1)} KB`
  if (bytes < 1024 ** 3) return `${(bytes / 1024 ** 2).toFixed(2)} MB`
  return `${(bytes / 1024 ** 3).toFixed(2)} GB`
}

function deriveAutoFieldsFromFile(file) {
  if (!file) return null
  const name = file.name || ''
  const dot = name.lastIndexOf('.')
  const ext = dot > -1 ? name.slice(dot + 1).toLowerCase() : ''
  // Browsers only expose the filename for single-file pickers (real OS path is
  // hidden for security). webkitRelativePath is set when the user picks a folder
  // via <input webkitdirectory>, in which case it contains the path relative to
  // the picked root, e.g. "HesenZirek/RAW/song1.mp3".
  const relativePath = file.webkitRelativePath || ''
  const path = relativePath || name

  let volumeName = ''
  let directoryName = ''
  if (relativePath) {
    const parts = relativePath.split('/').filter(Boolean)
    if (parts.length >= 2) {
      // First segment = the folder the user picked (treated as the "volume").
      volumeName = parts[0]
      // Last segment is the filename, second-to-last is the immediate parent.
      directoryName = parts[parts.length - 2]
    }
  }

  return {
    fileExtension: ext,
    fileSize: formatFileSize(file.size),
    pathInExternal: path,
    autoPath: path,
    volumeName,
    directoryName,
  }
}

function createInitialAudioForm() {
  return {
    audioVersion: 'RAW',
    versionNumber: '1',
    copyNumber: '1',

    fullName: '',
    originTitle: '',
    alterTitle: '',
    centralKurdishTitle: '',
    romanizedTitle: '',

    abstractText: '',
    description: '',

    form: '',
    genre: [],
    typeOfBasta: '',
    typeOfMaqam: '',
    typeOfComposition: '',
    typeOfPerformance: '',
    lyrics: '',
    poet: '',

    speaker: '',
    producer: '',
    composer: '',
    contributors: [],

    language: '',
    dialect: '',

    recordingVenue: '',
    city: '',
    region: '',

    dateCreated: '',
    datePublished: '',
    dateModified: '',

    audience: '',
    tags: [],
    keywords: [],

    physicalAvailability: false,
    physicalLabel: '',
    locationArchive: '',
    degitizedBy: '',
    degitizationEquipment: '',

    audioChannel: '',
    fileExtension: '',
    fileSize: '',
    bitRate: '',
    bitDepth: '',
    sampleRate: '',
    audioQualityOutOf10: '',

    volumeName: '',
    directoryName: '',
    pathInExternal: '',
    autoPath: '',
    audioFileNote: '',

    copyright: '',
    rightOwner: '',
    dateCopyrighted: '',
    availability: '',
    licenseType: '',
    usageRights: '',
    owner: '',
    publisher: '',
    provenance: '',
    accrualMethod: '',
    lccClassification: '',
    archiveLocalNote: '',
  }
}

function buildAudioPayload(form, projectCode) {
  return {
    projectCode,

    audioVersion: form.audioVersion ? form.audioVersion.toUpperCase() : null,
    versionNumber: form.versionNumber ? Number(form.versionNumber) : null,
    copyNumber: form.copyNumber ? Number(form.copyNumber) : null,

    fullName: trimOrNull(form.fullName),
    originTitle: trimOrNull(form.originTitle),
    alterTitle: trimOrNull(form.alterTitle),
    centralKurdishTitle: trimOrNull(form.centralKurdishTitle),
    romanizedTitle: trimOrNull(form.romanizedTitle),

    abstractText: trimOrNull(form.abstractText),
    description: trimOrNull(form.description),

    form: trimOrNull(form.form),
    genre: toArray(form.genre),
    typeOfBasta: trimOrNull(form.typeOfBasta),
    typeOfMaqam: trimOrNull(form.typeOfMaqam),
    typeOfComposition: trimOrNull(form.typeOfComposition),
    typeOfPerformance: trimOrNull(form.typeOfPerformance),
    lyrics: trimOrNull(form.lyrics),
    poet: trimOrNull(form.poet),

    speaker: trimOrNull(form.speaker),
    producer: trimOrNull(form.producer),
    composer: trimOrNull(form.composer),
    contributors: toArray(form.contributors),

    language: trimOrNull(form.language),
    dialect: trimOrNull(form.dialect),

    recordingVenue: trimOrNull(form.recordingVenue),
    city: trimOrNull(form.city),
    region: trimOrNull(form.region),

    dateCreated: fromDateInputValue(form.dateCreated),
    datePublished: fromDateInputValue(form.datePublished),
    dateModified: fromDateInputValue(form.dateModified),

    audience: trimOrNull(form.audience),
    tags: toArray(form.tags),
    keywords: toArray(form.keywords),

    physicalAvailability: Boolean(form.physicalAvailability),
    physicalLabel: trimOrNull(form.physicalLabel),
    locationArchive: trimOrNull(form.locationArchive),
    degitizedBy: trimOrNull(form.degitizedBy),
    degitizationEquipment: trimOrNull(form.degitizationEquipment),

    audioChannel: trimOrNull(form.audioChannel),
    fileExtension: trimOrNull(form.fileExtension),
    fileSize: trimOrNull(form.fileSize),
    bitRate: trimOrNull(form.bitRate),
    bitDepth: trimOrNull(form.bitDepth),
    sampleRate: trimOrNull(form.sampleRate),
    audioQualityOutOf10:
      form.audioQualityOutOf10 === '' ? null : Number(form.audioQualityOutOf10),

    volumeName: trimOrNull(form.volumeName),
    directoryName: trimOrNull(form.directoryName),
    pathInExternal: trimOrNull(form.pathInExternal),
    autoPath: trimOrNull(form.autoPath),
    audioFileNote: trimOrNull(form.audioFileNote),

    copyright: trimOrNull(form.copyright),
    rightOwner: trimOrNull(form.rightOwner),
    dateCopyrighted: fromDateInputValue(form.dateCopyrighted),
    availability: trimOrNull(form.availability),
    licenseType: trimOrNull(form.licenseType),
    usageRights: trimOrNull(form.usageRights),
    owner: trimOrNull(form.owner),
    publisher: trimOrNull(form.publisher),
    provenance: trimOrNull(form.provenance),
    accrualMethod: trimOrNull(form.accrualMethod),
    lccClassification: trimOrNull(form.lccClassification),
    archiveLocalNote: trimOrNull(form.archiveLocalNote),
  }
}

function populateAudioFormFromAudio(audio) {
  return {
    ...createInitialAudioForm(),
    audioVersion: audio.audioVersion || 'RAW',
    versionNumber: audio.versionNumber != null ? String(audio.versionNumber) : '1',
    copyNumber: audio.copyNumber != null ? String(audio.copyNumber) : '1',

    fullName: audio.fullName || '',
    originTitle: audio.originTitle || '',
    alterTitle: audio.alterTitle || '',
    centralKurdishTitle: audio.centralKurdishTitle || '',
    romanizedTitle: audio.romanizedTitle || '',

    abstractText: audio.abstractText || '',
    description: audio.description || '',

    form: audio.form || '',
    genre: toArray(audio.genre),
    typeOfBasta: audio.typeOfBasta || '',
    typeOfMaqam: audio.typeOfMaqam || '',
    typeOfComposition: audio.typeOfComposition || '',
    typeOfPerformance: audio.typeOfPerformance || '',
    lyrics: audio.lyrics || '',
    poet: audio.poet || '',

    speaker: audio.speaker || '',
    producer: audio.producer || '',
    composer: audio.composer || '',
    contributors: toArray(audio.contributors),

    language: audio.language || '',
    dialect: audio.dialect || '',

    recordingVenue: audio.recordingVenue || '',
    city: audio.city || '',
    region: audio.region || '',

    dateCreated: toDateInputValue(audio.dateCreated),
    datePublished: toDateInputValue(audio.datePublished),
    dateModified: toDateInputValue(audio.dateModified),

    audience: audio.audience || '',
    tags: toArray(audio.tags),
    keywords: toArray(audio.keywords),

    physicalAvailability: Boolean(audio.physicalAvailability),
    physicalLabel: audio.physicalLabel || '',
    locationArchive: audio.locationArchive || '',
    degitizedBy: audio.degitizedBy || '',
    degitizationEquipment: audio.degitizationEquipment || '',

    audioChannel: audio.audioChannel || '',
    fileExtension: audio.fileExtension || '',
    fileSize: audio.fileSize || '',
    bitRate: audio.bitRate || '',
    bitDepth: audio.bitDepth || '',
    sampleRate: audio.sampleRate || '',
    audioQualityOutOf10:
      audio.audioQualityOutOf10 != null ? String(audio.audioQualityOutOf10) : '',

    volumeName: audio.volumeName || '',
    directoryName: audio.directoryName || '',
    pathInExternal: audio.pathInExternal || '',
    autoPath: audio.autoPath || '',
    audioFileNote: audio.audioFileNote || '',

    copyright: audio.copyright || '',
    rightOwner: audio.rightOwner || '',
    dateCopyrighted: toDateInputValue(audio.dateCopyrighted),
    availability: audio.availability || '',
    licenseType: audio.licenseType || '',
    usageRights: audio.usageRights || '',
    owner: audio.owner || '',
    publisher: audio.publisher || '',
    provenance: audio.provenance || '',
    accrualMethod: audio.accrualMethod || '',
    lccClassification: audio.lccClassification || '',
    archiveLocalNote: audio.archiveLocalNote || '',
  }
}

const SELECT_CLASS = cn(
  'flex h-9 w-full rounded-lg border border-input bg-background px-3 py-1 text-sm shadow-sm transition-colors',
  'focus:outline-none focus:border-ring focus:ring-2 focus:ring-ring/30',
  'disabled:cursor-not-allowed disabled:opacity-60',
)

const TEXTAREA_CLASS =
  'min-h-[96px] w-full resize-y rounded-lg border border-input bg-background px-3 py-2 text-sm shadow-sm transition-colors placeholder:text-muted-foreground/70 focus-visible:border-ring focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/30'

function EmployeeProjectDetailPage() {
  const { code: projectCode } = useParams()
  const toast = useToast()
  const navigate = useNavigate()
  const location = useLocation()

  // Section-aware base path so the "Back to Projects" navigation lands in
  // /admin/project when the user is in admin and /employee/project when in
  // employee — rather than always sending them to the employee section.
  const sectionBase = location.pathname.startsWith('/admin') ? '/admin' : '/employee'

  const [project, setProject] = useState(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')

  // Which media tab is active. The list/form/modals all switch with this.
  const [mediaType, setMediaType] = useState('audio') // 'audio' | 'video'

  // ── Audio state ────────────────────────────────────────────
  const [audios, setAudios] = useState([])
  const [isLoadingAudios, setIsLoadingAudios] = useState(false)
  const [currentAudio, setCurrentAudio] = useState(null)
  const [form, setForm] = useState(createInitialAudioForm)
  const [audioFile, setAudioFile] = useState(null)
  const [folderCandidates, setFolderCandidates] = useState([])

  // ── Video state ────────────────────────────────────────────
  const [videos, setVideos] = useState([])
  const [isLoadingVideos, setIsLoadingVideos] = useState(false)
  const [currentVideo, setCurrentVideo] = useState(null)
  const [videoForm, setVideoForm] = useState(createInitialVideoForm)
  const [videoFile, setVideoFile] = useState(null)
  const [videoFolderCandidates, setVideoFolderCandidates] = useState([])

  // ── Image state ────────────────────────────────────────────
  const [images, setImages] = useState([])
  const [isLoadingImages, setIsLoadingImages] = useState(false)
  const [currentImage, setCurrentImage] = useState(null)
  const [imageForm, setImageForm] = useState(createInitialImageForm)
  const [imageFile, setImageFile] = useState(null)
  const [imageFolderCandidates, setImageFolderCandidates] = useState([])

  // ── Text state ─────────────────────────────────────────────
  const [texts, setTexts] = useState([])
  const [isLoadingTexts, setIsLoadingTexts] = useState(false)
  const [currentText, setCurrentText] = useState(null)
  const [textForm, setTextForm] = useState(createInitialTextForm)
  const [textFile, setTextFile] = useState(null)
  const [textFolderCandidates, setTextFolderCandidates] = useState([])

  // ── Shared form-view state ─────────────────────────────────
  // The form is single-instance: only one media-type form is open at a time
  // (switching tabs while editing closes the form, see handleSwitchMediaType).
  const [view, setView] = useState('list') // list | create | edit
  const [isSaving, setIsSaving] = useState(false)
  const [formError, setFormError] = useState('')

  // Audios saved in this create-session (resets when the form closes). Lets us
  // show "you've added N audios so far" so the user has clear feedback when they
  // chain "Save & Add Another" several times in a row.
  const [savedThisSession, setSavedThisSession] = useState([])
  // Differentiates the two submit buttons. The ref is read by the submit handler
  // (which captures stale closures otherwise); the parallel state is used only
  // for rendering the spinner on the right button — refs aren't allowed during
  // render under React 19's strict rules.
  const submitModeRef = useRef('finish') // 'finish' | 'add-another'
  const [pendingSubmitMode, setPendingSubmitMode] = useState('finish')

  // Tracks the last auto-fill values that handleAudioFilePicked wrote into the
  // form, so we can replace them when the user picks a different file *without*
  // clobbering values they manually edited in between.
  const lastAutoFilledRef = useRef({})

  // Audio search/details/remove/delete
  const [searchTerm, setSearchTerm] = useState('')
  // Backend two-phase fuzzy search results (pg_trgm). `null` = no active
  // search; render the full project-scoped list. The search call is scoped
  // to this projectCode server-side so results stay relevant at 30TB.
  const [audioSearchResults, setAudioSearchResults] = useState(null)
  const [isAudioSearching, setIsAudioSearching] = useState(false)
  const [detailsTarget, setDetailsTarget] = useState(null)
  // V3 trash model: a single "Send to trash" action per row, calling
  // deleteX (which the backend now treats as soft-trash). Trashed items
  // disappear from the regular list and are managed from /admin/trash.
  const [deleteTarget, setDeleteTarget] = useState(null)
  const [isDeleting, setIsDeleting] = useState(false)

  // Audio sort + filter. Mirrors AudioFilterParams on the backend
  // exactly, but applied client-side against the project-scoped
  // audios array (no extra round-trip — the project's audios are
  // already in memory). Disabled while a fuzzy search is active
  // because /audio/search has its own ranking and bypasses the
  // filter model anyway.
  const [audioSortKey, setAudioSortKey] = useState(DEFAULT_AUDIO_SORT_KEY)
  const [audioFilters, setAudioFilters] = useState(createInitialAudioFilters)
  const [isAudioFilterPanelOpen, setIsAudioFilterPanelOpen] = useState(false)

  // Video search/details/delete
  const [videoSearchTerm, setVideoSearchTerm] = useState('')
  const [videoSearchResults, setVideoSearchResults] = useState(null)
  const [isVideoSearching, setIsVideoSearching] = useState(false)
  const [videoDetailsTarget, setVideoDetailsTarget] = useState(null)
  const [videoDeleteTarget, setVideoDeleteTarget] = useState(null)
  const [isVideoDeleting, setIsVideoDeleting] = useState(false)
  const [savedVideosThisSession, setSavedVideosThisSession] = useState([])

  // Video sort + filter. Mirrors VideoFilterParams on the backend
  // exactly. Disabled while a fuzzy search is active because
  // /video/search has its own ranking and bypasses the filter model
  // server-side.
  const [videoSortKey, setVideoSortKey] = useState(DEFAULT_VIDEO_SORT_KEY)
  const [videoFilters, setVideoFilters] = useState(createInitialVideoFilters)
  const [isVideoFilterPanelOpen, setIsVideoFilterPanelOpen] = useState(false)

  // Image search/details/delete
  const [imageSearchTerm, setImageSearchTerm] = useState('')
  const [imageSearchResults, setImageSearchResults] = useState(null)
  const [isImageSearching, setIsImageSearching] = useState(false)
  const [imageDetailsTarget, setImageDetailsTarget] = useState(null)
  const [imageDeleteTarget, setImageDeleteTarget] = useState(null)
  const [isImageDeleting, setIsImageDeleting] = useState(false)
  const [savedImagesThisSession, setSavedImagesThisSession] = useState([])

  // Image sort + filter. Mirrors ImageFilterParams on the backend
  // exactly, but applied client-side against the project-scoped
  // images array. Disabled while a fuzzy search is active because
  // /image/search has its own ranking and bypasses the filter model
  // server-side.
  const [imageSortKey, setImageSortKey] = useState(DEFAULT_IMAGE_SORT_KEY)
  const [imageFilters, setImageFilters] = useState(createInitialImageFilters)
  const [isImageFilterPanelOpen, setIsImageFilterPanelOpen] = useState(false)

  // Text search/details/delete
  const [textSearchTerm, setTextSearchTerm] = useState('')
  const [textSearchResults, setTextSearchResults] = useState(null)
  const [isTextSearching, setIsTextSearching] = useState(false)
  const [textDetailsTarget, setTextDetailsTarget] = useState(null)
  const [textDeleteTarget, setTextDeleteTarget] = useState(null)
  const [isTextDeleting, setIsTextDeleting] = useState(false)
  const [savedTextsThisSession, setSavedTextsThisSession] = useState([])

  // Text sort + filter. Mirrors TextFilterParams on the backend, plus
  // text-specific bits (isbn / assignmentNumber / printDate /
  // pageCount). Disabled while a fuzzy search is active.
  const [textSortKey, setTextSortKey] = useState(DEFAULT_TEXT_SORT_KEY)
  const [textFilters, setTextFilters] = useState(createInitialTextFilters)
  const [isTextFilterPanelOpen, setIsTextFilterPanelOpen] = useState(false)

  const loadProject = useCallback(async () => {
    setIsLoading(true)
    setError('')
    try {
      const data = await getProject(projectCode)
      setProject(data)
    } catch (err) {
      setError(getErrorMessage(err, 'Failed to load project. Please try again.'))
    } finally {
      setIsLoading(false)
    }
  }, [projectCode])

  const loadAudios = useCallback(async () => {
    setIsLoadingAudios(true)
    try {
      const all = await getAudios()
      setAudios((all || []).filter((a) => a.projectCode === projectCode))
    } catch (err) {
      toast.apiError(err, 'Could not load audios')
    } finally {
      setIsLoadingAudios(false)
    }
  }, [projectCode, toast])

  const loadVideos = useCallback(async () => {
    setIsLoadingVideos(true)
    try {
      const all = await getVideos()
      setVideos((all || []).filter((v) => v.projectCode === projectCode))
    } catch (err) {
      toast.apiError(err, 'Could not load videos')
    } finally {
      setIsLoadingVideos(false)
    }
  }, [projectCode, toast])

  const loadImages = useCallback(async () => {
    setIsLoadingImages(true)
    try {
      const all = await getImages()
      setImages((all || []).filter((i) => i.projectCode === projectCode))
    } catch (err) {
      toast.apiError(err, 'Could not load images')
    } finally {
      setIsLoadingImages(false)
    }
  }, [projectCode, toast])

  const loadTexts = useCallback(async () => {
    setIsLoadingTexts(true)
    try {
      const all = await getTexts()
      setTexts((all || []).filter((t) => t.projectCode === projectCode))
    } catch (err) {
      toast.apiError(err, 'Could not load texts')
    } finally {
      setIsLoadingTexts(false)
    }
  }, [projectCode, toast])

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadProject()
    loadAudios()
    loadVideos()
    loadImages()
    loadTexts()
  }, [loadProject, loadAudios, loadVideos, loadImages, loadTexts])

  // V3 trash model: backend's GET /<media> returns active records only,
  // so the frontend's old "show removed" toggle is gone. Trashed items
  // are listed at /admin/trash. The arrays below are the active set; the
  // search results stay project-scoped on the client as a defensive belt
  // (the server already filters by projectCode).
  const visibleAudios = audios

  const audioFiltersActive = useMemo(
    () => !isAudioFilterEmpty(audioFilters),
    [audioFilters],
  )
  const audioSortActive = audioSortKey !== DEFAULT_AUDIO_SORT_KEY
  const audioFilterCount = useMemo(
    () => countAudioFilters(audioFilters),
    [audioFilters],
  )
  const activeAudioSort = useMemo(
    () =>
      AUDIO_SORT_OPTIONS.find((opt) => opt.key === audioSortKey) ?? AUDIO_SORT_OPTIONS[0],
    [audioSortKey],
  )

  const filteredAudios = useMemo(() => {
    const term = searchTerm.trim()
    // Search bypasses the filter model entirely — /audio/search has
    // its own pg_trgm ranking that wouldn't compose with client-side
    // filters anyway.
    if (term) {
      if (audioSearchResults == null) return [] // request in flight or pre-debounce
      return audioSearchResults.filter(
        (a) => !a.projectCode || a.projectCode === projectCode,
      )
    }
    const filtered = applyAudioFilters(visibleAudios, audioFilters)
    return applyAudioSort(filtered, audioSortKey)
  }, [
    visibleAudios,
    searchTerm,
    audioSearchResults,
    projectCode,
    audioFilters,
    audioSortKey,
  ])

  const updateAudioFilter = useCallback(
    (key, value) => setAudioFilters((prev) => ({ ...prev, [key]: value })),
    [],
  )
  const clearAudioFilters = useCallback(
    () => setAudioFilters(createInitialAudioFilters()),
    [],
  )
  const audioChips = useMemo(
    () =>
      buildAudioChips({
        filters: audioFilters,
        sortKey: audioSortKey,
        sortLabel: audioSortActive ? activeAudioSort.label : null,
        onClearSort: () => setAudioSortKey(DEFAULT_AUDIO_SORT_KEY),
        updateFilter: updateAudioFilter,
      }),
    [audioFilters, audioSortKey, audioSortActive, activeAudioSort, updateAudioFilter],
  )

  const visibleVideos = videos

  const videoFiltersActive = useMemo(
    () => !isVideoFilterEmpty(videoFilters),
    [videoFilters],
  )
  const videoSortActive = videoSortKey !== DEFAULT_VIDEO_SORT_KEY
  const videoFilterCount = useMemo(
    () => countVideoFilters(videoFilters),
    [videoFilters],
  )
  const activeVideoSort = useMemo(
    () =>
      VIDEO_SORT_OPTIONS.find((opt) => opt.key === videoSortKey) ?? VIDEO_SORT_OPTIONS[0],
    [videoSortKey],
  )

  const filteredVideos = useMemo(() => {
    const term = videoSearchTerm.trim()
    if (term) {
      if (videoSearchResults == null) return []
      return videoSearchResults.filter(
        (v) => !v.projectCode || v.projectCode === projectCode,
      )
    }
    const filtered = applyVideoFilters(visibleVideos, videoFilters)
    return applyVideoSort(filtered, videoSortKey)
  }, [
    visibleVideos,
    videoSearchTerm,
    videoSearchResults,
    projectCode,
    videoFilters,
    videoSortKey,
  ])

  const updateVideoFilter = useCallback(
    (key, value) => setVideoFilters((prev) => ({ ...prev, [key]: value })),
    [],
  )
  const clearVideoFilters = useCallback(
    () => setVideoFilters(createInitialVideoFilters()),
    [],
  )
  const videoChips = useMemo(
    () =>
      buildVideoChips({
        filters: videoFilters,
        sortKey: videoSortKey,
        sortLabel: videoSortActive ? activeVideoSort.label : null,
        onClearSort: () => setVideoSortKey(DEFAULT_VIDEO_SORT_KEY),
        updateFilter: updateVideoFilter,
      }),
    [videoFilters, videoSortKey, videoSortActive, activeVideoSort, updateVideoFilter],
  )

  const visibleImages = images

  const imageFiltersActive = useMemo(
    () => !isImageFilterEmpty(imageFilters),
    [imageFilters],
  )
  const imageSortActive = imageSortKey !== DEFAULT_IMAGE_SORT_KEY
  const imageFilterCount = useMemo(
    () => countImageFilters(imageFilters),
    [imageFilters],
  )
  const activeImageSort = useMemo(
    () =>
      IMAGE_SORT_OPTIONS.find((opt) => opt.key === imageSortKey) ?? IMAGE_SORT_OPTIONS[0],
    [imageSortKey],
  )

  const filteredImages = useMemo(() => {
    const term = imageSearchTerm.trim()
    // Search bypasses the filter model entirely — /image/search has
    // its own pg_trgm ranking that wouldn't compose with client-side
    // filters anyway.
    if (term) {
      if (imageSearchResults == null) return []
      return imageSearchResults.filter(
        (i) => !i.projectCode || i.projectCode === projectCode,
      )
    }
    const filtered = applyImageFilters(visibleImages, imageFilters)
    return applyImageSort(filtered, imageSortKey)
  }, [
    visibleImages,
    imageSearchTerm,
    imageSearchResults,
    projectCode,
    imageFilters,
    imageSortKey,
  ])

  const updateImageFilter = useCallback(
    (key, value) => setImageFilters((prev) => ({ ...prev, [key]: value })),
    [],
  )
  const clearImageFilters = useCallback(
    () => setImageFilters(createInitialImageFilters()),
    [],
  )
  const imageChips = useMemo(
    () =>
      buildImageChips({
        filters: imageFilters,
        sortKey: imageSortKey,
        sortLabel: imageSortActive ? activeImageSort.label : null,
        onClearSort: () => setImageSortKey(DEFAULT_IMAGE_SORT_KEY),
        updateFilter: updateImageFilter,
      }),
    [imageFilters, imageSortKey, imageSortActive, activeImageSort, updateImageFilter],
  )

  const visibleTexts = texts

  const textFiltersActive = useMemo(
    () => !isTextFilterEmpty(textFilters),
    [textFilters],
  )
  const textSortActive = textSortKey !== DEFAULT_TEXT_SORT_KEY
  const textFilterCount = useMemo(
    () => countTextFilters(textFilters),
    [textFilters],
  )
  const activeTextSort = useMemo(
    () =>
      TEXT_SORT_OPTIONS.find((opt) => opt.key === textSortKey) ?? TEXT_SORT_OPTIONS[0],
    [textSortKey],
  )

  const filteredTexts = useMemo(() => {
    const term = textSearchTerm.trim()
    if (term) {
      if (textSearchResults == null) return []
      return textSearchResults.filter(
        (t) => !t.projectCode || t.projectCode === projectCode,
      )
    }
    const filtered = applyTextFilters(visibleTexts, textFilters)
    return applyTextSort(filtered, textSortKey)
  }, [
    visibleTexts,
    textSearchTerm,
    textSearchResults,
    projectCode,
    textFilters,
    textSortKey,
  ])

  const updateTextFilter = useCallback(
    (key, value) => setTextFilters((prev) => ({ ...prev, [key]: value })),
    [],
  )
  const clearTextFilters = useCallback(
    () => setTextFilters(createInitialTextFilters()),
    [],
  )
  const textChips = useMemo(
    () =>
      buildTextChips({
        filters: textFilters,
        sortKey: textSortKey,
        sortLabel: textSortActive ? activeTextSort.label : null,
        onClearSort: () => setTextSortKey(DEFAULT_TEXT_SORT_KEY),
        updateFilter: updateTextFilter,
      }),
    [textFilters, textSortKey, textSortActive, activeTextSort, updateTextFilter],
  )

  // ── Debounced backend fuzzy-search effects ──
  // Each section issues a debounced /X/search call scoped by projectCode.
  // The AbortController cancels in-flight requests when the user keeps
  // typing or clears the box. A null `*SearchResults` means "no active
  // search; render the full project list". Errors are silent — empty
  // results render naturally rather than spamming a toast on every keystroke.
  useEffect(() => {
    const term = searchTerm.trim()
    if (!term) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setAudioSearchResults(null)
      setIsAudioSearching(false)
      return undefined
    }
    const controller = new AbortController()
    const timer = setTimeout(async () => {
      setIsAudioSearching(true)
      try {
        const data = await searchAudios(term, {
          limit: 50,
          projectCode,
          signal: controller.signal,
        })
        if (!controller.signal.aborted) setAudioSearchResults(data || [])
      } catch {
        if (!controller.signal.aborted) setAudioSearchResults([])
      } finally {
        if (!controller.signal.aborted) setIsAudioSearching(false)
      }
    }, 220)
    return () => {
      clearTimeout(timer)
      controller.abort()
    }
  }, [searchTerm, projectCode])

  useEffect(() => {
    const term = videoSearchTerm.trim()
    if (!term) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setVideoSearchResults(null)
      setIsVideoSearching(false)
      return undefined
    }
    const controller = new AbortController()
    const timer = setTimeout(async () => {
      setIsVideoSearching(true)
      try {
        const data = await searchVideos(term, {
          limit: 50,
          projectCode,
          signal: controller.signal,
        })
        if (!controller.signal.aborted) setVideoSearchResults(data || [])
      } catch {
        if (!controller.signal.aborted) setVideoSearchResults([])
      } finally {
        if (!controller.signal.aborted) setIsVideoSearching(false)
      }
    }, 220)
    return () => {
      clearTimeout(timer)
      controller.abort()
    }
  }, [videoSearchTerm, projectCode])

  useEffect(() => {
    const term = imageSearchTerm.trim()
    if (!term) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setImageSearchResults(null)
      setIsImageSearching(false)
      return undefined
    }
    const controller = new AbortController()
    const timer = setTimeout(async () => {
      setIsImageSearching(true)
      try {
        const data = await searchImages(term, {
          limit: 50,
          projectCode,
          signal: controller.signal,
        })
        if (!controller.signal.aborted) setImageSearchResults(data || [])
      } catch {
        if (!controller.signal.aborted) setImageSearchResults([])
      } finally {
        if (!controller.signal.aborted) setIsImageSearching(false)
      }
    }, 220)
    return () => {
      clearTimeout(timer)
      controller.abort()
    }
  }, [imageSearchTerm, projectCode])

  useEffect(() => {
    const term = textSearchTerm.trim()
    if (!term) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setTextSearchResults(null)
      setIsTextSearching(false)
      return undefined
    }
    const controller = new AbortController()
    const timer = setTimeout(async () => {
      setIsTextSearching(true)
      try {
        const data = await searchTexts(term, {
          limit: 50,
          projectCode,
          signal: controller.signal,
        })
        if (!controller.signal.aborted) setTextSearchResults(data || [])
      } catch {
        if (!controller.signal.aborted) setTextSearchResults([])
      } finally {
        if (!controller.signal.aborted) setIsTextSearching(false)
      }
    }, 220)
    return () => {
      clearTimeout(timer)
      controller.abort()
    }
  }, [textSearchTerm, projectCode])

  const handleOpenCreateAudio = () => {
    setCurrentAudio(null)
    setForm(createInitialAudioForm())
    setAudioFile(null)
    setFolderCandidates([])
    setFormError('')
    setSavedThisSession([])
    submitModeRef.current = 'finish'
    setPendingSubmitMode('finish')
    lastAutoFilledRef.current = {}
    setView('create')
  }

  const handleOpenEditAudio = (audio) => {
    setCurrentAudio(audio)
    setForm(populateAudioFormFromAudio(audio))
    setAudioFile(null)
    setFolderCandidates([])
    setFormError('')
    setSavedThisSession([])
    submitModeRef.current = 'finish'
    setPendingSubmitMode('finish')
    lastAutoFilledRef.current = {}
    setView('edit')
  }

  const handleCloseAudioForm = () => {
    setView('list')
    setCurrentAudio(null)
    setAudioFile(null)
    setFolderCandidates([])
    setFormError('')
    setSavedThisSession([])
    lastAutoFilledRef.current = {}
  }

  const handleAudioFolderPicked = (fileList) => {
    const all = Array.from(fileList || [])
    if (all.length === 0) return
    // Filter to anything the browser thinks is audio — fall back to extension
    // sniffing for files where the OS didn't supply a mime type.
    const audioExt = /\.(wav|mp3|flac|ogg|m4a|aac|aiff|aif|wma|opus)$/i
    const audios = all.filter((f) => (f.type && f.type.startsWith('audio/')) || audioExt.test(f.name))
    if (audios.length === 0) {
      toast.error('No audio in that folder', 'Browse a folder that contains an audio file.')
      return
    }
    if (audios.length === 1) {
      handleAudioFilePicked(audios[0])
      setFolderCandidates([])
      return
    }
    setFolderCandidates(audios)
  }

  const handleAudioFilePicked = (file) => {
    if (!file) {
      // Clearing the file: also clear any technical fields that still match what
      // we auto-filled, so the user isn't left with stale extension/size/path
      // values from a removed file.
      const previousAuto = lastAutoFilledRef.current
      setForm((prev) => {
        const next = { ...prev }
        for (const [key, value] of Object.entries(previousAuto)) {
          if (value && prev[key] === value) next[key] = ''
        }
        return next
      })
      lastAutoFilledRef.current = {}
      setAudioFile(null)
      return
    }

    const auto = deriveAutoFieldsFromFile(file)
    setAudioFile(file)
    setForm((prev) => {
      const next = { ...prev }
      const previousAuto = lastAutoFilledRef.current
      for (const [key, newValue] of Object.entries(auto)) {
        const previousAutoValue = previousAuto[key]
        const wasEmpty = !prev[key]
        const matchesPreviousAuto =
          previousAutoValue && prev[key] === previousAutoValue
        if (wasEmpty || matchesPreviousAuto) {
          next[key] = newValue || ''
        }
      }
      return next
    })
    lastAutoFilledRef.current = auto
  }

  const handleAudioSubmit = async (event) => {
    event.preventDefault()
    setFormError('')

    if (!AUDIO_VERSIONS.includes((form.audioVersion || '').toUpperCase())) {
      setFormError('Audio version must be RAW or MASTER.')
      return
    }
    const versionNumber = Number(form.versionNumber)
    if (!Number.isInteger(versionNumber) || versionNumber < 1) {
      setFormError('Version number must be an integer ≥ 1.')
      return
    }
    const copyNumber = Number(form.copyNumber)
    if (!Number.isInteger(copyNumber) || copyNumber < 1) {
      setFormError('Copy number must be an integer ≥ 1.')
      return
    }
    if (
      form.audioQualityOutOf10 !== '' &&
      (Number.isNaN(Number(form.audioQualityOutOf10)) ||
        Number(form.audioQualityOutOf10) < 0 ||
        Number(form.audioQualityOutOf10) > 10)
    ) {
      setFormError('Audio quality must be a number between 0 and 10.')
      return
    }

    if (view === 'create' && !audioFile) {
      setFormError('Please choose an audio file to upload.')
      return
    }

    setIsSaving(true)
    try {
      if (view === 'create') {
        const payload = buildAudioPayload(form, projectCode)
        const saved = await createAudio(payload, audioFile)
        toast.success('Audio created', `${saved.audioCode} has been added to ${projectCode}.`)
        await loadAudios()

        if (submitModeRef.current === 'add-another') {
          // Reset just the variable parts of the form — keep the version/copy
          // numbers as a hint about where the user was so they can adjust.
          setSavedThisSession((prev) => [...prev, saved.audioCode])
          setForm((prev) => ({
            ...createInitialAudioForm(),
            audioVersion: prev.audioVersion,
            versionNumber: prev.versionNumber,
            copyNumber: String((Number(prev.copyNumber) || 1) + 1),
          }))
          setAudioFile(null)
          setFormError('')
          submitModeRef.current = 'finish'
          setPendingSubmitMode('finish')
          lastAutoFilledRef.current = {}
          setFolderCandidates([])
          // stay in 'create' view
          // scroll back to the top so the user can see the success banner
          if (typeof window !== 'undefined') {
            window.scrollTo({ top: 0, behavior: 'smooth' })
          }
          return
        }

        handleCloseAudioForm()
        return
      }

      const payload = buildAudioPayload(form, projectCode)
      // Backend forbids changing the project on update — the audio's project is
      // already fixed.
      delete payload.projectCode
      const saved = await updateAudio(currentAudio.audioCode, payload, audioFile)
      toast.success('Audio updated', `${saved.audioCode} changes were saved.`)
      await loadAudios()
      handleCloseAudioForm()
    } catch (err) {
      // Optimistic-locking conflict — another user (or an admin's
      // cascade trash/restore) bumped this audio's version since we
      // loaded it. Surface the backend's friendly message and bounce
      // back to the list so re-opening fetches the latest.
      if (isStaleVersionError(err)) {
        toast.apiError(err, 'Reload required')
        await loadAudios()
        handleCloseAudioForm()
        return
      }
      const formatted = formatApiError(err, 'Failed to save audio')
      setFormError(formatted)
      toast.apiError(err, 'Unable to save audio')
    } finally {
      setIsSaving(false)
    }
  }

  const handleDeleteAudio = async () => {
    if (!deleteTarget) return
    setIsDeleting(true)
    try {
      await deleteAudio(deleteTarget.audioCode)
      toast.success(
        'Sent to trash',
        `${deleteTarget.audioCode} can be restored by an admin from Trash.`,
      )
      setDeleteTarget(null)
      await loadAudios()
    } catch (err) {
      toast.apiError(err, 'Unable to send audio to trash')
    } finally {
      setIsDeleting(false)
    }
  }

  /* ── Video handlers (parallel to the audio ones above) ───── */

  const handleOpenCreateVideo = () => {
    setCurrentVideo(null)
    setVideoForm(createInitialVideoForm())
    setVideoFile(null)
    setVideoFolderCandidates([])
    setFormError('')
    setSavedVideosThisSession([])
    submitModeRef.current = 'finish'
    setPendingSubmitMode('finish')
    lastAutoFilledRef.current = {}
    setView('create')
  }

  const handleOpenEditVideo = (video) => {
    setCurrentVideo(video)
    setVideoForm(populateVideoFormFromVideo(video))
    setVideoFile(null)
    setVideoFolderCandidates([])
    setFormError('')
    setSavedVideosThisSession([])
    submitModeRef.current = 'finish'
    setPendingSubmitMode('finish')
    lastAutoFilledRef.current = {}
    setView('edit')
  }

  const handleCloseVideoForm = () => {
    setView('list')
    setCurrentVideo(null)
    setVideoFile(null)
    setVideoFolderCandidates([])
    setFormError('')
    setSavedVideosThisSession([])
    lastAutoFilledRef.current = {}
  }

  const handleVideoFolderPicked = (fileList) => {
    const all = Array.from(fileList || [])
    if (all.length === 0) return
    const videoExt = /\.(mp4|mov|mkv|webm|avi|m4v|mpg|mpeg|wmv|flv|3gp|ogv)$/i
    const vids = all.filter((f) => (f.type && f.type.startsWith('video/')) || videoExt.test(f.name))
    if (vids.length === 0) {
      toast.error('No video in that folder', 'Browse a folder that contains a video file.')
      return
    }
    if (vids.length === 1) {
      handleVideoFilePicked(vids[0])
      setVideoFolderCandidates([])
      return
    }
    setVideoFolderCandidates(vids)
  }

  const handleVideoFilePicked = (file) => {
    if (!file) {
      const previousAuto = lastAutoFilledRef.current
      setVideoForm((prev) => {
        const next = { ...prev }
        for (const [key, value] of Object.entries(previousAuto)) {
          if (value && prev[key] === value) next[key] = ''
        }
        return next
      })
      lastAutoFilledRef.current = {}
      setVideoFile(null)
      return
    }

    const auto = deriveVideoAutoFieldsFromFile(file)
    setVideoFile(file)
    setVideoForm((prev) => {
      const next = { ...prev }
      const previousAuto = lastAutoFilledRef.current
      for (const [key, newValue] of Object.entries(auto)) {
        const previousAutoValue = previousAuto[key]
        const wasEmpty = !prev[key]
        const matchesPreviousAuto =
          previousAutoValue && prev[key] === previousAutoValue
        if (wasEmpty || matchesPreviousAuto) {
          next[key] = newValue || ''
        }
      }
      return next
    })
    lastAutoFilledRef.current = auto
  }

  const handleVideoSubmit = async (event) => {
    event.preventDefault()
    setFormError('')

    if (!VIDEO_VERSIONS.includes((videoForm.videoVersion || '').toUpperCase())) {
      setFormError(`Video version must be one of ${VIDEO_VERSIONS.join(', ')}.`)
      return
    }
    const versionNumber = Number(videoForm.versionNumber)
    if (!Number.isInteger(versionNumber) || versionNumber < 1) {
      setFormError('Version number must be an integer ≥ 1.')
      return
    }
    const copyNumber = Number(videoForm.copyNumber)
    if (!Number.isInteger(copyNumber) || copyNumber < 1) {
      setFormError('Copy number must be an integer ≥ 1.')
      return
    }
    if (view === 'create' && !videoFile) {
      setFormError('Please choose a video file to upload.')
      return
    }

    setIsSaving(true)
    try {
      if (view === 'create') {
        const payload = buildVideoPayload(videoForm, projectCode)
        const saved = await createVideo(payload, videoFile)
        toast.success('Video created', `${saved.videoCode} has been added to ${projectCode}.`)
        await loadVideos()

        if (submitModeRef.current === 'add-another') {
          setSavedVideosThisSession((prev) => [...prev, saved.videoCode])
          setVideoForm((prev) => ({
            ...createInitialVideoForm(),
            videoVersion: prev.videoVersion,
            versionNumber: prev.versionNumber,
            copyNumber: String((Number(prev.copyNumber) || 1) + 1),
          }))
          setVideoFile(null)
          setFormError('')
          submitModeRef.current = 'finish'
          setPendingSubmitMode('finish')
          lastAutoFilledRef.current = {}
          setVideoFolderCandidates([])
          if (typeof window !== 'undefined') {
            window.scrollTo({ top: 0, behavior: 'smooth' })
          }
          return
        }

        handleCloseVideoForm()
        return
      }

      const payload = buildVideoPayload(videoForm, projectCode)
      // projectCode is immutable on update — backend silently ignores it.
      delete payload.projectCode
      const saved = await updateVideo(currentVideo.videoCode, payload, videoFile)
      toast.success('Video updated', `${saved.videoCode} changes were saved.`)
      await loadVideos()
      handleCloseVideoForm()
    } catch (err) {
      if (isStaleVersionError(err)) {
        toast.apiError(err, 'Reload required')
        await loadVideos()
        handleCloseVideoForm()
        return
      }
      const formatted = formatApiError(err, 'Failed to save video')
      setFormError(formatted)
      toast.apiError(err, 'Unable to save video')
    } finally {
      setIsSaving(false)
    }
  }

  const handleDeleteVideo = async () => {
    if (!videoDeleteTarget) return
    setIsVideoDeleting(true)
    try {
      await deleteVideo(videoDeleteTarget.videoCode)
      toast.success(
        'Sent to trash',
        `${videoDeleteTarget.videoCode} can be restored by an admin from Trash.`,
      )
      setVideoDeleteTarget(null)
      await loadVideos()
    } catch (err) {
      toast.apiError(err, 'Unable to send video to trash')
    } finally {
      setIsVideoDeleting(false)
    }
  }

  /* ── Image handlers (parallel to the audio/video ones above) ─ */

  const handleOpenCreateImage = () => {
    setCurrentImage(null)
    setImageForm(createInitialImageForm())
    setImageFile(null)
    setImageFolderCandidates([])
    setFormError('')
    setSavedImagesThisSession([])
    submitModeRef.current = 'finish'
    setPendingSubmitMode('finish')
    lastAutoFilledRef.current = {}
    setView('create')
  }

  const handleOpenEditImage = (image) => {
    setCurrentImage(image)
    setImageForm(populateImageFormFromImage(image))
    setImageFile(null)
    setImageFolderCandidates([])
    setFormError('')
    setSavedImagesThisSession([])
    submitModeRef.current = 'finish'
    setPendingSubmitMode('finish')
    lastAutoFilledRef.current = {}
    setView('edit')
  }

  const handleCloseImageForm = () => {
    setView('list')
    setCurrentImage(null)
    setImageFile(null)
    setImageFolderCandidates([])
    setFormError('')
    setSavedImagesThisSession([])
    lastAutoFilledRef.current = {}
  }

  const handleImageFolderPicked = (fileList) => {
    const all = Array.from(fileList || [])
    if (all.length === 0) return
    const imageExt = /\.(jpe?g|png|gif|tiff?|bmp|webp|heic|heif|raw|cr2|cr3|nef|arw|dng|svg)$/i
    const imgs = all.filter((f) => (f.type && f.type.startsWith('image/')) || imageExt.test(f.name))
    if (imgs.length === 0) {
      toast.error('No image in that folder', 'Browse a folder that contains an image file.')
      return
    }
    if (imgs.length === 1) {
      handleImageFilePicked(imgs[0])
      setImageFolderCandidates([])
      return
    }
    setImageFolderCandidates(imgs)
  }

  const handleImageFilePicked = (file) => {
    if (!file) {
      const previousAuto = lastAutoFilledRef.current
      setImageForm((prev) => {
        const next = { ...prev }
        for (const [key, value] of Object.entries(previousAuto)) {
          if (value && prev[key] === value) next[key] = ''
        }
        return next
      })
      lastAutoFilledRef.current = {}
      setImageFile(null)
      return
    }

    const auto = deriveImageAutoFieldsFromFile(file)
    setImageFile(file)
    setImageForm((prev) => {
      const next = { ...prev }
      const previousAuto = lastAutoFilledRef.current
      for (const [key, newValue] of Object.entries(auto)) {
        const previousAutoValue = previousAuto[key]
        const wasEmpty = !prev[key]
        const matchesPreviousAuto =
          previousAutoValue && prev[key] === previousAutoValue
        if (wasEmpty || matchesPreviousAuto) {
          next[key] = newValue || ''
        }
      }
      return next
    })
    lastAutoFilledRef.current = auto
  }

  const handleImageSubmit = async (event) => {
    event.preventDefault()
    setFormError('')

    if (!IMAGE_VERSIONS.includes((imageForm.imageVersion || '').toUpperCase())) {
      setFormError(`Image version must be one of ${IMAGE_VERSIONS.join(', ')}.`)
      return
    }
    const versionNumber = Number(imageForm.versionNumber)
    if (!Number.isInteger(versionNumber) || versionNumber < 1) {
      setFormError('Version number must be an integer ≥ 1.')
      return
    }
    const copyNumber = Number(imageForm.copyNumber)
    if (!Number.isInteger(copyNumber) || copyNumber < 1) {
      setFormError('Copy number must be an integer ≥ 1.')
      return
    }
    if (view === 'create' && !imageFile) {
      setFormError('Please choose an image file to upload.')
      return
    }

    setIsSaving(true)
    try {
      if (view === 'create') {
        const payload = buildImagePayload(imageForm, projectCode)
        const saved = await createImage(payload, imageFile)
        toast.success('Image created', `${saved.imageCode} has been added to ${projectCode}.`)
        await loadImages()

        if (submitModeRef.current === 'add-another') {
          setSavedImagesThisSession((prev) => [...prev, saved.imageCode])
          setImageForm((prev) => ({
            ...createInitialImageForm(),
            imageVersion: prev.imageVersion,
            versionNumber: prev.versionNumber,
            copyNumber: String((Number(prev.copyNumber) || 1) + 1),
          }))
          setImageFile(null)
          setFormError('')
          submitModeRef.current = 'finish'
          setPendingSubmitMode('finish')
          lastAutoFilledRef.current = {}
          setImageFolderCandidates([])
          if (typeof window !== 'undefined') {
            window.scrollTo({ top: 0, behavior: 'smooth' })
          }
          return
        }

        handleCloseImageForm()
        return
      }

      const payload = buildImagePayload(imageForm, projectCode)
      delete payload.projectCode
      const saved = await updateImage(currentImage.imageCode, payload, imageFile)
      toast.success('Image updated', `${saved.imageCode} changes were saved.`)
      await loadImages()
      handleCloseImageForm()
    } catch (err) {
      if (isStaleVersionError(err)) {
        toast.apiError(err, 'Reload required')
        await loadImages()
        handleCloseImageForm()
        return
      }
      const formatted = formatApiError(err, 'Failed to save image')
      setFormError(formatted)
      toast.apiError(err, 'Unable to save image')
    } finally {
      setIsSaving(false)
    }
  }

  const handleDeleteImage = async () => {
    if (!imageDeleteTarget) return
    setIsImageDeleting(true)
    try {
      await deleteImage(imageDeleteTarget.imageCode)
      toast.success(
        'Sent to trash',
        `${imageDeleteTarget.imageCode} can be restored by an admin from Trash.`,
      )
      setImageDeleteTarget(null)
      await loadImages()
    } catch (err) {
      toast.apiError(err, 'Unable to send image to trash')
    } finally {
      setIsImageDeleting(false)
    }
  }

  /* ── Text handlers (parallel to the audio/video ones above) ── */

  const handleOpenCreateText = () => {
    setCurrentText(null)
    setTextForm(createInitialTextForm())
    setTextFile(null)
    setTextFolderCandidates([])
    setFormError('')
    setSavedTextsThisSession([])
    submitModeRef.current = 'finish'
    setPendingSubmitMode('finish')
    lastAutoFilledRef.current = {}
    setView('create')
  }

  const handleOpenEditText = (text) => {
    setCurrentText(text)
    setTextForm(populateTextFormFromText(text))
    setTextFile(null)
    setTextFolderCandidates([])
    setFormError('')
    setSavedTextsThisSession([])
    submitModeRef.current = 'finish'
    setPendingSubmitMode('finish')
    lastAutoFilledRef.current = {}
    setView('edit')
  }

  const handleCloseTextForm = () => {
    setView('list')
    setCurrentText(null)
    setTextFile(null)
    setTextFolderCandidates([])
    setFormError('')
    setSavedTextsThisSession([])
    lastAutoFilledRef.current = {}
  }

  const handleTextFolderPicked = (fileList) => {
    const all = Array.from(fileList || [])
    if (all.length === 0) return
    const textExt = /\.(pdf|docx?|odt|rtf|txt|md|tex|epub|mobi|xml|html?|csv|tsv)$/i
    const docs = all.filter((f) => textExt.test(f.name) || (f.type && (f.type.startsWith('text/') || f.type === 'application/pdf' || f.type.includes('word') || f.type.includes('opendocument'))))
    if (docs.length === 0) {
      toast.error('No text in that folder', 'Browse a folder that contains a text or document file.')
      return
    }
    if (docs.length === 1) {
      handleTextFilePicked(docs[0])
      setTextFolderCandidates([])
      return
    }
    setTextFolderCandidates(docs)
  }

  const handleTextFilePicked = (file) => {
    if (!file) {
      const previousAuto = lastAutoFilledRef.current
      setTextForm((prev) => {
        const next = { ...prev }
        for (const [key, value] of Object.entries(previousAuto)) {
          if (value && prev[key] === value) next[key] = ''
        }
        return next
      })
      lastAutoFilledRef.current = {}
      setTextFile(null)
      return
    }

    const auto = deriveTextAutoFieldsFromFile(file)
    setTextFile(file)
    setTextForm((prev) => {
      const next = { ...prev }
      const previousAuto = lastAutoFilledRef.current
      for (const [key, newValue] of Object.entries(auto)) {
        const previousAutoValue = previousAuto[key]
        const wasEmpty = !prev[key]
        const matchesPreviousAuto =
          previousAutoValue && prev[key] === previousAutoValue
        if (wasEmpty || matchesPreviousAuto) {
          next[key] = newValue || ''
        }
      }
      return next
    })
    lastAutoFilledRef.current = auto
  }

  const handleTextSubmit = async (event) => {
    event.preventDefault()
    setFormError('')

    if (!TEXT_VERSIONS.includes((textForm.textVersion || '').toUpperCase())) {
      setFormError(`Text version must be one of ${TEXT_VERSIONS.join(', ')}.`)
      return
    }
    const versionNumber = Number(textForm.versionNumber)
    if (!Number.isInteger(versionNumber) || versionNumber < 1) {
      setFormError('Version number must be an integer ≥ 1.')
      return
    }
    const copyNumber = Number(textForm.copyNumber)
    if (!Number.isInteger(copyNumber) || copyNumber < 1) {
      setFormError('Copy number must be an integer ≥ 1.')
      return
    }
    if (
      textForm.pageCount !== '' &&
      textForm.pageCount != null &&
      (Number.isNaN(Number(textForm.pageCount)) || Number(textForm.pageCount) < 0)
    ) {
      setFormError('Page count must be a non-negative integer.')
      return
    }
    if (view === 'create' && !textFile) {
      setFormError('Please choose a text file to upload.')
      return
    }

    setIsSaving(true)
    try {
      if (view === 'create') {
        const payload = buildTextPayload(textForm, projectCode)
        const saved = await createText(payload, textFile)
        toast.success('Text created', `${saved.textCode} has been added to ${projectCode}.`)
        await loadTexts()

        if (submitModeRef.current === 'add-another') {
          setSavedTextsThisSession((prev) => [...prev, saved.textCode])
          setTextForm((prev) => ({
            ...createInitialTextForm(),
            textVersion: prev.textVersion,
            versionNumber: prev.versionNumber,
            copyNumber: String((Number(prev.copyNumber) || 1) + 1),
          }))
          setTextFile(null)
          setFormError('')
          submitModeRef.current = 'finish'
          setPendingSubmitMode('finish')
          lastAutoFilledRef.current = {}
          setTextFolderCandidates([])
          if (typeof window !== 'undefined') {
            window.scrollTo({ top: 0, behavior: 'smooth' })
          }
          return
        }

        handleCloseTextForm()
        return
      }

      const payload = buildTextPayload(textForm, projectCode)
      delete payload.projectCode
      const saved = await updateText(currentText.textCode, payload, textFile)
      toast.success('Text updated', `${saved.textCode} changes were saved.`)
      await loadTexts()
      handleCloseTextForm()
    } catch (err) {
      if (isStaleVersionError(err)) {
        toast.apiError(err, 'Reload required')
        await loadTexts()
        handleCloseTextForm()
        return
      }
      const formatted = formatApiError(err, 'Failed to save text')
      setFormError(formatted)
      toast.apiError(err, 'Unable to save text')
    } finally {
      setIsSaving(false)
    }
  }

  const handleDeleteText = async () => {
    if (!textDeleteTarget) return
    setIsTextDeleting(true)
    try {
      await deleteText(textDeleteTarget.textCode)
      toast.success(
        'Sent to trash',
        `${textDeleteTarget.textCode} can be restored by an admin from Trash.`,
      )
      setTextDeleteTarget(null)
      await loadTexts()
    } catch (err) {
      toast.apiError(err, 'Unable to send text to trash')
    } finally {
      setIsTextDeleting(false)
    }
  }

  // Switch tabs cleanly — close any open form, clear any session counters so
  // the user doesn't lose orientation.
  const handleSwitchMediaType = (next) => {
    if (next === mediaType) return
    if (view !== 'list') {
      if (mediaType === 'audio') handleCloseAudioForm()
      else if (mediaType === 'video') handleCloseVideoForm()
      else if (mediaType === 'image') handleCloseImageForm()
      else if (mediaType === 'text') handleCloseTextForm()
    }
    setMediaType(next)
  }

  /* ── image form view ────────────────────────────────────────── */
  if ((view === 'create' || view === 'edit') && mediaType === 'image') {
    const isEdit = view === 'edit'
    return (
      <EmployeeEntityPage
        eyebrow={isEdit ? 'Editing' : 'New image'}
        title={isEdit ? 'Edit Image' : 'Add Image to Project'}
        description={
          project
            ? `Inside project "${project.projectName}" (${project.projectCode}).`
            : 'Inside project.'
        }
      >
        <form id="image-form" onSubmit={handleImageSubmit} className="mx-auto block w-full max-w-4xl">
          <div className="space-y-6">
            {!isEdit && savedImagesThisSession.length > 0 ? (
              <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/5 p-4 shadow-sm dark:bg-emerald-500/10">
                <div className="flex items-start gap-3">
                  <div className="mt-0.5 flex size-8 items-center justify-center rounded-full bg-emerald-500/15 text-emerald-600 dark:text-emerald-300">
                    <CheckCircle2 className="size-4" />
                  </div>
                  <div className="min-w-0 flex-1 space-y-1.5">
                    <p className="text-sm font-semibold text-foreground">
                      {savedImagesThisSession.length === 1
                        ? '1 image added so far in this session'
                        : `${savedImagesThisSession.length} images added so far in this session`}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Form has been reset for the next one. Version & copy numbers carried over (copy auto-incremented).
                    </p>
                    <div className="flex flex-wrap gap-1.5 pt-0.5">
                      {savedImagesThisSession.slice(-6).map((c) => (
                        <span key={c} className="inline-flex items-center rounded-full border border-emerald-500/30 bg-background/60 px-2 py-0.5 font-mono text-[10px] tracking-wide text-foreground/80">
                          {c}
                        </span>
                      ))}
                      {savedImagesThisSession.length > 6 ? (
                        <span className="text-[10px] font-medium text-muted-foreground">
                          +{savedImagesThisSession.length - 6} earlier
                        </span>
                      ) : null}
                    </div>
                  </div>
                  <button type="button" onClick={handleCloseImageForm} className="text-xs font-medium text-emerald-700 underline-offset-2 hover:underline dark:text-emerald-300">
                    Finish & view list
                  </button>
                </div>
              </div>
            ) : null}

            <Card className="border-border bg-card shadow-sm shadow-black/5">
              <CardHeader className="border-b border-border pb-4">
                <CardTitle className="text-base font-semibold">Identity</CardTitle>
                <CardDescription className="text-xs">Version, copy and the auto-generated image code.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-5 pt-5">
                <div className="grid gap-5 sm:grid-cols-3">
                  <div className="space-y-1.5">
                    <Label htmlFor="imageVersion">
                      Version <span className="text-destructive">*</span>
                    </Label>
                    <select
                      id="imageVersion"
                      value={imageForm.imageVersion}
                      onChange={(e) => setImageForm({ ...imageForm, imageVersion: e.target.value })}
                      className={SELECT_CLASS}
                      required
                    >
                      {IMAGE_VERSIONS.map((v) => (
                        <option key={v} value={v}>
                          {v}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="imageVersionNumber">
                      Version # <span className="text-destructive">*</span>
                    </Label>
                    <Input id="imageVersionNumber" type="number" min="1" step="1" value={imageForm.versionNumber} onChange={(e) => setImageForm({ ...imageForm, versionNumber: e.target.value })} required />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="imageCopyNumber">
                      Copy # <span className="text-destructive">*</span>
                    </Label>
                    <Input id="imageCopyNumber" type="number" min="1" step="1" value={imageForm.copyNumber} onChange={(e) => setImageForm({ ...imageForm, copyNumber: e.target.value })} required />
                  </div>
                </div>

                {isEdit && currentImage?.imageCode ? (
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <span>Code:</span>
                    <CodeBadge code={currentImage.imageCode} variant="subtle" />
                  </div>
                ) : (
                  <p className="text-xs text-muted-foreground">
                    Auto-generated as{' '}
                    <span className="font-mono font-semibold text-foreground">
                      {project?.personCode
                        ? `${(project.personName || project.personCode).replace(/\s+/g, '').toUpperCase().slice(0, 8)}_IMG_${imageForm.imageVersion || 'RAW'}_V${imageForm.versionNumber || '1'}_Copy(${imageForm.copyNumber || '1'})_000001`
                        : `${(project?.categories?.[0]?.categoryName || project?.categories?.[0]?.categoryCode || 'CATEGORY').replace(/\s+/g, '').toUpperCase().slice(0, 8)}_IMG_${imageForm.imageVersion || 'RAW'}_V${imageForm.versionNumber || '1'}_Copy(${imageForm.copyNumber || '1'})_000001`}
                    </span>
                  </p>
                )}
              </CardContent>
            </Card>

            <Card className="border-border bg-card shadow-sm shadow-black/5">
              <CardHeader className="border-b border-border pb-4">
                <CardTitle className="text-base font-semibold">Image File</CardTitle>
                <CardDescription className="text-xs">
                  {isEdit
                    ? 'Upload a replacement file to overwrite the current image. Leave empty to keep it.'
                    : 'A single image file is required.'}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4 pt-5">
                {isEdit && currentImage?.imageFileUrl ? (
                  <div className="space-y-2">
                    <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">Current file</p>
                    <div className="overflow-hidden rounded-lg border bg-muted/20">
                      <img
                        src={currentImage.imageFileUrl}
                        alt={currentImage.originalTitle || currentImage.imageCode}
                        className="block max-h-72 w-auto max-w-full object-contain"
                      />
                    </div>
                  </div>
                ) : null}

                {imageFile ? (
                  <div className="flex items-center gap-3 rounded-lg border bg-muted/20 p-3">
                    <ImageIcon className="size-5 text-muted-foreground" />
                    <div className="min-w-0 flex-1 space-y-0.5">
                      <p className="truncate text-sm font-medium">{imageFile.name}</p>
                      {imageFile.webkitRelativePath ? (
                        <p className="truncate font-mono text-[11px] text-muted-foreground" title={imageFile.webkitRelativePath}>
                          {imageFile.webkitRelativePath}
                        </p>
                      ) : null}
                      <p className="text-xs text-muted-foreground">
                        {formatFileSize(imageFile.size)} · extension, size{' '}
                        {imageFile.webkitRelativePath ? 'and full folder path ' : 'and path '}
                        auto-filled below
                      </p>
                    </div>
                    <Button type="button" variant="ghost" size="icon-xs" onClick={() => handleImageFilePicked(null)}>
                      <X className="size-3.5" />
                      <span className="sr-only">Remove selected file</span>
                    </Button>
                  </div>
                ) : imageFolderCandidates.length > 0 ? (
                  <div className="space-y-2 rounded-xl border bg-muted/20 p-3">
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-xs font-semibold text-foreground">
                        {imageFolderCandidates.length} image files in that folder — pick one to upload
                      </p>
                      <button type="button" onClick={() => setImageFolderCandidates([])} className="text-xs text-muted-foreground hover:text-foreground">
                        Cancel
                      </button>
                    </div>
                    <ul className="max-h-64 space-y-1 overflow-y-auto pr-1">
                      {imageFolderCandidates.map((f) => (
                        <li key={f.webkitRelativePath || f.name}>
                          <button
                            type="button"
                            onClick={() => {
                              handleImageFilePicked(f)
                              setImageFolderCandidates([])
                            }}
                            className="flex w-full items-center gap-2 rounded-md border bg-background px-2.5 py-1.5 text-left text-xs transition hover:border-primary/40 hover:bg-muted/40"
                          >
                            <ImageIcon className="size-3.5 shrink-0 text-muted-foreground" />
                            <span className="min-w-0 flex-1 truncate font-mono">
                              {f.webkitRelativePath || f.name}
                            </span>
                            <span className="shrink-0 text-[10px] text-muted-foreground">
                              {formatFileSize(f.size)}
                            </span>
                          </button>
                        </li>
                      ))}
                    </ul>
                  </div>
                ) : (
                  <div className="grid gap-3 sm:grid-cols-2">
                    <label htmlFor="imageFile" className="flex cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-border bg-muted/20 px-4 py-6 text-center transition-colors hover:border-primary/50 hover:bg-muted/40">
                      <Upload className="size-5 text-muted-foreground" />
                      <div>
                        <p className="text-sm font-medium text-foreground">{isEdit ? 'Replace single file' : 'Browse a single file'}</p>
                        <p className="text-xs text-muted-foreground">JPG, PNG, TIFF, RAW…</p>
                      </div>
                    </label>
                    <label htmlFor="imageFolder" className="flex cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-border bg-muted/20 px-4 py-6 text-center transition-colors hover:border-primary/50 hover:bg-muted/40">
                      <FolderOpen className="size-5 text-muted-foreground" />
                      <div>
                        <p className="text-sm font-medium text-foreground">Browse from folder</p>
                        <p className="text-xs text-muted-foreground">Captures the directory path</p>
                      </div>
                    </label>
                  </div>
                )}
                <input
                  id="imageFile"
                  type="file"
                  accept="image/*"
                  onChange={(e) => {
                    handleImageFilePicked(e.target.files?.[0] || null)
                    e.target.value = ''
                  }}
                  className="sr-only"
                />
                <input
                  id="imageFolder"
                  type="file"
                  webkitdirectory=""
                  directory=""
                  multiple
                  onChange={(e) => {
                    handleImageFolderPicked(e.target.files)
                    e.target.value = ''
                  }}
                  className="sr-only"
                />
              </CardContent>
            </Card>

            <ImageFormSections
              form={imageForm}
              setForm={setImageForm}
              projectCategories={project?.categories || []}
            />

            <FormErrorBox error={formError} />

            <div className="sticky bottom-0 z-10 -mx-1 flex flex-col gap-2 rounded-xl border border-border bg-card/95 px-4 py-3 shadow-lg backdrop-blur sm:flex-row sm:items-center sm:justify-between">
              <p className="text-xs text-muted-foreground">
                {isEdit
                  ? 'Update this image entry.'
                  : savedImagesThisSession.length > 0
                  ? `${savedImagesThisSession.length} added in this session — keep going or finish.`
                  : 'Pick an image, fill the metadata, then save.'}
              </p>
              <div className="flex items-center justify-end gap-2">
                <Button type="button" variant="outline" onClick={handleCloseImageForm} disabled={isSaving}>
                  Cancel
                </Button>
                {isEdit ? (
                  <Button type="submit" disabled={isSaving} className="gap-2">
                    {isSaving ? <Loader2 className="size-4 animate-spin" /> : null}
                    {isSaving ? 'Saving…' : 'Save Changes'}
                  </Button>
                ) : (
                  <>
                    <Button
                      type="submit"
                      variant="outline"
                      disabled={isSaving}
                      className="gap-2"
                      onClick={() => {
                        submitModeRef.current = 'add-another'
                        setPendingSubmitMode('add-another')
                      }}
                    >
                      {isSaving && pendingSubmitMode === 'add-another' ? <Loader2 className="size-4 animate-spin" /> : <Plus className="size-4" />}
                      Save &amp; Add Another
                    </Button>
                    <Button
                      type="submit"
                      disabled={isSaving}
                      className="gap-2"
                      onClick={() => {
                        submitModeRef.current = 'finish'
                        setPendingSubmitMode('finish')
                      }}
                    >
                      {isSaving && pendingSubmitMode === 'finish' ? <Loader2 className="size-4 animate-spin" /> : null}
                      Save &amp; Finish
                    </Button>
                  </>
                )}
              </div>
            </div>
          </div>
        </form>
      </EmployeeEntityPage>
    )
  }

  /* ── text form view ─────────────────────────────────────────── */
  if ((view === 'create' || view === 'edit') && mediaType === 'text') {
    const isEdit = view === 'edit'
    return (
      <EmployeeEntityPage
        eyebrow={isEdit ? 'Editing' : 'New text'}
        title={isEdit ? 'Edit Text' : 'Add Text to Project'}
        description={
          project
            ? `Inside project "${project.projectName}" (${project.projectCode}).`
            : 'Inside project.'
        }
      >
        <form id="text-form" onSubmit={handleTextSubmit} className="mx-auto block w-full max-w-4xl">
          <div className="space-y-6">
            {!isEdit && savedTextsThisSession.length > 0 ? (
              <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/5 p-4 shadow-sm dark:bg-emerald-500/10">
                <div className="flex items-start gap-3">
                  <div className="mt-0.5 flex size-8 items-center justify-center rounded-full bg-emerald-500/15 text-emerald-600 dark:text-emerald-300">
                    <CheckCircle2 className="size-4" />
                  </div>
                  <div className="min-w-0 flex-1 space-y-1.5">
                    <p className="text-sm font-semibold text-foreground">
                      {savedTextsThisSession.length === 1
                        ? '1 text added so far in this session'
                        : `${savedTextsThisSession.length} texts added so far in this session`}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Form has been reset for the next one. Version & copy numbers carried over (copy auto-incremented).
                    </p>
                    <div className="flex flex-wrap gap-1.5 pt-0.5">
                      {savedTextsThisSession.slice(-6).map((c) => (
                        <span key={c} className="inline-flex items-center rounded-full border border-emerald-500/30 bg-background/60 px-2 py-0.5 font-mono text-[10px] tracking-wide text-foreground/80">
                          {c}
                        </span>
                      ))}
                      {savedTextsThisSession.length > 6 ? (
                        <span className="text-[10px] font-medium text-muted-foreground">
                          +{savedTextsThisSession.length - 6} earlier
                        </span>
                      ) : null}
                    </div>
                  </div>
                  <button type="button" onClick={handleCloseTextForm} className="text-xs font-medium text-emerald-700 underline-offset-2 hover:underline dark:text-emerald-300">
                    Finish & view list
                  </button>
                </div>
              </div>
            ) : null}

            <Card className="border-border bg-card shadow-sm shadow-black/5">
              <CardHeader className="border-b border-border pb-4">
                <CardTitle className="text-base font-semibold">Identity</CardTitle>
                <CardDescription className="text-xs">Version, copy and the auto-generated text code.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-5 pt-5">
                <div className="grid gap-5 sm:grid-cols-3">
                  <div className="space-y-1.5">
                    <Label htmlFor="textVersion">
                      Version <span className="text-destructive">*</span>
                    </Label>
                    <select
                      id="textVersion"
                      value={textForm.textVersion}
                      onChange={(e) => setTextForm({ ...textForm, textVersion: e.target.value })}
                      className={SELECT_CLASS}
                      required
                    >
                      {TEXT_VERSIONS.map((v) => (
                        <option key={v} value={v}>
                          {v}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="textVersionNumber">
                      Version # <span className="text-destructive">*</span>
                    </Label>
                    <Input id="textVersionNumber" type="number" min="1" step="1" value={textForm.versionNumber} onChange={(e) => setTextForm({ ...textForm, versionNumber: e.target.value })} required />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="textCopyNumber">
                      Copy # <span className="text-destructive">*</span>
                    </Label>
                    <Input id="textCopyNumber" type="number" min="1" step="1" value={textForm.copyNumber} onChange={(e) => setTextForm({ ...textForm, copyNumber: e.target.value })} required />
                  </div>
                </div>

                {isEdit && currentText?.textCode ? (
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <span>Code:</span>
                    <CodeBadge code={currentText.textCode} variant="subtle" />
                  </div>
                ) : (
                  <p className="text-xs text-muted-foreground">
                    Auto-generated as{' '}
                    <span className="font-mono font-semibold text-foreground">
                      {project?.personCode
                        ? `${(project.personName || project.personCode).replace(/\s+/g, '').toUpperCase().slice(0, 8)}_TXT_${textForm.textVersion || 'RAW'}_V${textForm.versionNumber || '1'}_Copy(${textForm.copyNumber || '1'})_000001`
                        : `${(project?.categories?.[0]?.categoryName || project?.categories?.[0]?.categoryCode || 'CATEGORY').replace(/\s+/g, '').toUpperCase().slice(0, 8)}_TXT_${textForm.textVersion || 'RAW'}_V${textForm.versionNumber || '1'}_Copy(${textForm.copyNumber || '1'})_000001`}
                    </span>
                  </p>
                )}
              </CardContent>
            </Card>

            <Card className="border-border bg-card shadow-sm shadow-black/5">
              <CardHeader className="border-b border-border pb-4">
                <CardTitle className="text-base font-semibold">Text File</CardTitle>
                <CardDescription className="text-xs">
                  {isEdit
                    ? 'Upload a replacement file to overwrite the current document. Leave empty to keep it.'
                    : 'A single document file is required.'}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4 pt-5">
                {isEdit && currentText?.textFileUrl ? (
                  <div className="flex items-center gap-3 rounded-lg border bg-muted/20 p-3">
                    <FileText className="size-5 text-muted-foreground" />
                    <div className="min-w-0 flex-1 space-y-0.5">
                      <p className="truncate text-sm font-medium">{currentText.fileName || currentText.textCode}</p>
                      <p className="text-xs text-muted-foreground">
                        Current file. Pick a new one below to replace it.
                      </p>
                    </div>
                    <a
                      href={currentText.textFileUrl}
                      download
                      className="inline-flex items-center gap-1.5 rounded-md border px-2.5 py-1 text-[11px] font-medium text-foreground transition hover:bg-muted"
                    >
                      Download
                    </a>
                  </div>
                ) : null}

                {textFile ? (
                  <div className="flex items-center gap-3 rounded-lg border bg-muted/20 p-3">
                    <FileText className="size-5 text-muted-foreground" />
                    <div className="min-w-0 flex-1 space-y-0.5">
                      <p className="truncate text-sm font-medium">{textFile.name}</p>
                      {textFile.webkitRelativePath ? (
                        <p className="truncate font-mono text-[11px] text-muted-foreground" title={textFile.webkitRelativePath}>
                          {textFile.webkitRelativePath}
                        </p>
                      ) : null}
                      <p className="text-xs text-muted-foreground">
                        {formatFileSize(textFile.size)} · extension, size{' '}
                        {textFile.webkitRelativePath ? 'and full folder path ' : 'and path '}
                        auto-filled below
                      </p>
                    </div>
                    <Button type="button" variant="ghost" size="icon-xs" onClick={() => handleTextFilePicked(null)}>
                      <X className="size-3.5" />
                      <span className="sr-only">Remove selected file</span>
                    </Button>
                  </div>
                ) : textFolderCandidates.length > 0 ? (
                  <div className="space-y-2 rounded-xl border bg-muted/20 p-3">
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-xs font-semibold text-foreground">
                        {textFolderCandidates.length} text files in that folder — pick one to upload
                      </p>
                      <button type="button" onClick={() => setTextFolderCandidates([])} className="text-xs text-muted-foreground hover:text-foreground">
                        Cancel
                      </button>
                    </div>
                    <ul className="max-h-64 space-y-1 overflow-y-auto pr-1">
                      {textFolderCandidates.map((f) => (
                        <li key={f.webkitRelativePath || f.name}>
                          <button
                            type="button"
                            onClick={() => {
                              handleTextFilePicked(f)
                              setTextFolderCandidates([])
                            }}
                            className="flex w-full items-center gap-2 rounded-md border bg-background px-2.5 py-1.5 text-left text-xs transition hover:border-primary/40 hover:bg-muted/40"
                          >
                            <FileText className="size-3.5 shrink-0 text-muted-foreground" />
                            <span className="min-w-0 flex-1 truncate font-mono">
                              {f.webkitRelativePath || f.name}
                            </span>
                            <span className="shrink-0 text-[10px] text-muted-foreground">
                              {formatFileSize(f.size)}
                            </span>
                          </button>
                        </li>
                      ))}
                    </ul>
                  </div>
                ) : (
                  <div className="grid gap-3 sm:grid-cols-2">
                    <label htmlFor="textFile" className="flex cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-border bg-muted/20 px-4 py-6 text-center transition-colors hover:border-primary/50 hover:bg-muted/40">
                      <Upload className="size-5 text-muted-foreground" />
                      <div>
                        <p className="text-sm font-medium text-foreground">{isEdit ? 'Replace single file' : 'Browse a single file'}</p>
                        <p className="text-xs text-muted-foreground">PDF, DOCX, TXT, MD, EPUB…</p>
                      </div>
                    </label>
                    <label htmlFor="textFolder" className="flex cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-border bg-muted/20 px-4 py-6 text-center transition-colors hover:border-primary/50 hover:bg-muted/40">
                      <FolderOpen className="size-5 text-muted-foreground" />
                      <div>
                        <p className="text-sm font-medium text-foreground">Browse from folder</p>
                        <p className="text-xs text-muted-foreground">Captures the directory path</p>
                      </div>
                    </label>
                  </div>
                )}
                <input
                  id="textFile"
                  type="file"
                  accept=".pdf,.doc,.docx,.odt,.rtf,.txt,.md,.tex,.epub,.mobi,.xml,.html,.htm,.csv,.tsv,application/pdf,text/*"
                  onChange={(e) => {
                    handleTextFilePicked(e.target.files?.[0] || null)
                    e.target.value = ''
                  }}
                  className="sr-only"
                />
                <input
                  id="textFolder"
                  type="file"
                  webkitdirectory=""
                  directory=""
                  multiple
                  onChange={(e) => {
                    handleTextFolderPicked(e.target.files)
                    e.target.value = ''
                  }}
                  className="sr-only"
                />
              </CardContent>
            </Card>

            <TextFormSections
              form={textForm}
              setForm={setTextForm}
              projectCategories={project?.categories || []}
            />

            <FormErrorBox error={formError} />

            <div className="sticky bottom-0 z-10 -mx-1 flex flex-col gap-2 rounded-xl border border-border bg-card/95 px-4 py-3 shadow-lg backdrop-blur sm:flex-row sm:items-center sm:justify-between">
              <p className="text-xs text-muted-foreground">
                {isEdit
                  ? 'Update this text entry.'
                  : savedTextsThisSession.length > 0
                  ? `${savedTextsThisSession.length} added in this session — keep going or finish.`
                  : 'Pick a document, fill the metadata, then save.'}
              </p>
              <div className="flex items-center justify-end gap-2">
                <Button type="button" variant="outline" onClick={handleCloseTextForm} disabled={isSaving}>
                  Cancel
                </Button>
                {isEdit ? (
                  <Button type="submit" disabled={isSaving} className="gap-2">
                    {isSaving ? <Loader2 className="size-4 animate-spin" /> : null}
                    {isSaving ? 'Saving…' : 'Save Changes'}
                  </Button>
                ) : (
                  <>
                    <Button
                      type="submit"
                      variant="outline"
                      disabled={isSaving}
                      className="gap-2"
                      onClick={() => {
                        submitModeRef.current = 'add-another'
                        setPendingSubmitMode('add-another')
                      }}
                    >
                      {isSaving && pendingSubmitMode === 'add-another' ? <Loader2 className="size-4 animate-spin" /> : <Plus className="size-4" />}
                      Save &amp; Add Another
                    </Button>
                    <Button
                      type="submit"
                      disabled={isSaving}
                      className="gap-2"
                      onClick={() => {
                        submitModeRef.current = 'finish'
                        setPendingSubmitMode('finish')
                      }}
                    >
                      {isSaving && pendingSubmitMode === 'finish' ? <Loader2 className="size-4 animate-spin" /> : null}
                      Save &amp; Finish
                    </Button>
                  </>
                )}
              </div>
            </div>
          </div>
        </form>
      </EmployeeEntityPage>
    )
  }

  /* ── audio form view ────────────────────────────────────────── */
  if ((view === 'create' || view === 'edit') && mediaType === 'video') {
    const isEdit = view === 'edit'
    return (
      <EmployeeEntityPage
        eyebrow={isEdit ? 'Editing' : 'New video'}
        title={isEdit ? 'Edit Video' : 'Add Video to Project'}
        description={
          project
            ? `Inside project "${project.projectName}" (${project.projectCode}).`
            : 'Inside project.'
        }
      >
        <form id="video-form" onSubmit={handleVideoSubmit} className="mx-auto block w-full max-w-4xl">
          <div className="space-y-6">
            {!isEdit && savedVideosThisSession.length > 0 ? (
              <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/5 p-4 shadow-sm dark:bg-emerald-500/10">
                <div className="flex items-start gap-3">
                  <div className="mt-0.5 flex size-8 items-center justify-center rounded-full bg-emerald-500/15 text-emerald-600 dark:text-emerald-300">
                    <CheckCircle2 className="size-4" />
                  </div>
                  <div className="min-w-0 flex-1 space-y-1.5">
                    <p className="text-sm font-semibold text-foreground">
                      {savedVideosThisSession.length === 1
                        ? '1 video added so far in this session'
                        : `${savedVideosThisSession.length} videos added so far in this session`}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Form has been reset for the next one. Version & copy numbers carried over (copy auto-incremented).
                    </p>
                    <div className="flex flex-wrap gap-1.5 pt-0.5">
                      {savedVideosThisSession.slice(-6).map((c) => (
                        <span key={c} className="inline-flex items-center rounded-full border border-emerald-500/30 bg-background/60 px-2 py-0.5 font-mono text-[10px] tracking-wide text-foreground/80">
                          {c}
                        </span>
                      ))}
                      {savedVideosThisSession.length > 6 ? (
                        <span className="text-[10px] font-medium text-muted-foreground">
                          +{savedVideosThisSession.length - 6} earlier
                        </span>
                      ) : null}
                    </div>
                  </div>
                  <button type="button" onClick={handleCloseVideoForm} className="text-xs font-medium text-emerald-700 underline-offset-2 hover:underline dark:text-emerald-300">
                    Finish & view list
                  </button>
                </div>
              </div>
            ) : null}

            <Card className="border-border bg-card shadow-sm shadow-black/5">
              <CardHeader className="border-b border-border pb-4">
                <CardTitle className="text-base font-semibold">Identity</CardTitle>
                <CardDescription className="text-xs">Version, copy and the auto-generated video code.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-5 pt-5">
                <div className="grid gap-5 sm:grid-cols-3">
                  <div className="space-y-1.5">
                    <Label htmlFor="videoVersion">
                      Version <span className="text-destructive">*</span>
                    </Label>
                    <select
                      id="videoVersion"
                      value={videoForm.videoVersion}
                      onChange={(e) => setVideoForm({ ...videoForm, videoVersion: e.target.value })}
                      className={SELECT_CLASS}
                      required
                    >
                      {VIDEO_VERSIONS.map((v) => (
                        <option key={v} value={v}>
                          {v}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="videoVersionNumber">
                      Version # <span className="text-destructive">*</span>
                    </Label>
                    <Input id="videoVersionNumber" type="number" min="1" step="1" value={videoForm.versionNumber} onChange={(e) => setVideoForm({ ...videoForm, versionNumber: e.target.value })} required />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="videoCopyNumber">
                      Copy # <span className="text-destructive">*</span>
                    </Label>
                    <Input id="videoCopyNumber" type="number" min="1" step="1" value={videoForm.copyNumber} onChange={(e) => setVideoForm({ ...videoForm, copyNumber: e.target.value })} required />
                  </div>
                </div>

                {isEdit && currentVideo?.videoCode ? (
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <span>Code:</span>
                    <CodeBadge code={currentVideo.videoCode} variant="subtle" />
                  </div>
                ) : (
                  <p className="text-xs text-muted-foreground">
                    Auto-generated as{' '}
                    <span className="font-mono font-semibold text-foreground">
                      {project?.personCode
                        ? `${(project.personName || project.personCode).replace(/\s+/g, '').toUpperCase().slice(0, 8)}_VID_${videoForm.videoVersion || 'RAW'}_V${videoForm.versionNumber || '1'}_Copy(${videoForm.copyNumber || '1'})_000001`
                        : `${(project?.categories?.[0]?.categoryName || project?.categories?.[0]?.categoryCode || 'CATEGORY').replace(/\s+/g, '').toUpperCase().slice(0, 8)}_VID_${videoForm.videoVersion || 'RAW'}_V${videoForm.versionNumber || '1'}_Copy(${videoForm.copyNumber || '1'})_000001`}
                    </span>
                  </p>
                )}
              </CardContent>
            </Card>

            <Card className="border-border bg-card shadow-sm shadow-black/5">
              <CardHeader className="border-b border-border pb-4">
                <CardTitle className="text-base font-semibold">Video File</CardTitle>
                <CardDescription className="text-xs">
                  {isEdit
                    ? 'Upload a replacement file to overwrite the current video. Leave empty to keep it.'
                    : 'A single video file is required.'}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4 pt-5">
                {isEdit && currentVideo?.videoFileUrl ? (
                  <div className="space-y-2">
                    <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">Current file</p>
                    <VideoPlayer
                      src={currentVideo.videoFileUrl}
                      title={currentVideo.originalTitle || currentVideo.videoCode}
                      subtitle={[currentVideo.videoVersion, currentVideo.extension, currentVideo.resolution]
                        .filter(Boolean)
                        .join(' • ')}
                    />
                  </div>
                ) : null}

                {videoFile ? (
                  <div className="flex items-center gap-3 rounded-lg border bg-muted/20 p-3">
                    <FileAudio className="size-5 text-muted-foreground" />
                    <div className="min-w-0 flex-1 space-y-0.5">
                      <p className="truncate text-sm font-medium">{videoFile.name}</p>
                      {videoFile.webkitRelativePath ? (
                        <p className="truncate font-mono text-[11px] text-muted-foreground" title={videoFile.webkitRelativePath}>
                          {videoFile.webkitRelativePath}
                        </p>
                      ) : null}
                      <p className="text-xs text-muted-foreground">
                        {formatFileSize(videoFile.size)} · extension, size{' '}
                        {videoFile.webkitRelativePath ? 'and full folder path ' : 'and path '}
                        auto-filled below
                      </p>
                    </div>
                    <Button type="button" variant="ghost" size="icon-xs" onClick={() => handleVideoFilePicked(null)}>
                      <X className="size-3.5" />
                      <span className="sr-only">Remove selected file</span>
                    </Button>
                  </div>
                ) : videoFolderCandidates.length > 0 ? (
                  <div className="space-y-2 rounded-xl border bg-muted/20 p-3">
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-xs font-semibold text-foreground">
                        {videoFolderCandidates.length} video files in that folder — pick one to upload
                      </p>
                      <button type="button" onClick={() => setVideoFolderCandidates([])} className="text-xs text-muted-foreground hover:text-foreground">
                        Cancel
                      </button>
                    </div>
                    <ul className="max-h-64 space-y-1 overflow-y-auto pr-1">
                      {videoFolderCandidates.map((f) => (
                        <li key={f.webkitRelativePath || f.name}>
                          <button
                            type="button"
                            onClick={() => {
                              handleVideoFilePicked(f)
                              setVideoFolderCandidates([])
                            }}
                            className="flex w-full items-center gap-2 rounded-md border bg-background px-2.5 py-1.5 text-left text-xs transition hover:border-primary/40 hover:bg-muted/40"
                          >
                            <FileAudio className="size-3.5 shrink-0 text-muted-foreground" />
                            <span className="min-w-0 flex-1 truncate font-mono">
                              {f.webkitRelativePath || f.name}
                            </span>
                            <span className="shrink-0 text-[10px] text-muted-foreground">
                              {formatFileSize(f.size)}
                            </span>
                          </button>
                        </li>
                      ))}
                    </ul>
                  </div>
                ) : (
                  <div className="grid gap-3 sm:grid-cols-2">
                    <label htmlFor="videoFile" className="flex cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-border bg-muted/20 px-4 py-6 text-center transition-colors hover:border-primary/50 hover:bg-muted/40">
                      <Upload className="size-5 text-muted-foreground" />
                      <div>
                        <p className="text-sm font-medium text-foreground">{isEdit ? 'Replace single file' : 'Browse a single file'}</p>
                        <p className="text-xs text-muted-foreground">MP4, MOV, MKV, WEBM…</p>
                      </div>
                    </label>
                    <label htmlFor="videoFolder" className="flex cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-border bg-muted/20 px-4 py-6 text-center transition-colors hover:border-primary/50 hover:bg-muted/40">
                      <FolderOpen className="size-5 text-muted-foreground" />
                      <div>
                        <p className="text-sm font-medium text-foreground">Browse from folder</p>
                        <p className="text-xs text-muted-foreground">Captures the directory path</p>
                      </div>
                    </label>
                  </div>
                )}
                <input
                  id="videoFile"
                  type="file"
                  accept="video/*"
                  onChange={(e) => {
                    handleVideoFilePicked(e.target.files?.[0] || null)
                    e.target.value = ''
                  }}
                  className="sr-only"
                />
                <input
                  id="videoFolder"
                  type="file"
                  webkitdirectory=""
                  directory=""
                  multiple
                  onChange={(e) => {
                    handleVideoFolderPicked(e.target.files)
                    e.target.value = ''
                  }}
                  className="sr-only"
                />
              </CardContent>
            </Card>

            <VideoFormSections
              form={videoForm}
              setForm={setVideoForm}
              projectCategories={project?.categories || []}
            />

            <FormErrorBox error={formError} />

            <div className="sticky bottom-0 z-10 -mx-1 flex flex-col gap-2 rounded-xl border border-border bg-card/95 px-4 py-3 shadow-lg backdrop-blur sm:flex-row sm:items-center sm:justify-between">
              <p className="text-xs text-muted-foreground">
                {isEdit
                  ? 'Update this video entry.'
                  : savedVideosThisSession.length > 0
                  ? `${savedVideosThisSession.length} added in this session — keep going or finish.`
                  : 'Pick a video, fill the metadata, then save.'}
              </p>
              <div className="flex items-center justify-end gap-2">
                <Button type="button" variant="outline" onClick={handleCloseVideoForm} disabled={isSaving}>
                  Cancel
                </Button>
                {isEdit ? (
                  <Button type="submit" disabled={isSaving} className="gap-2">
                    {isSaving ? <Loader2 className="size-4 animate-spin" /> : null}
                    {isSaving ? 'Saving…' : 'Save Changes'}
                  </Button>
                ) : (
                  <>
                    <Button
                      type="submit"
                      variant="outline"
                      disabled={isSaving}
                      className="gap-2"
                      onClick={() => {
                        submitModeRef.current = 'add-another'
                        setPendingSubmitMode('add-another')
                      }}
                    >
                      {isSaving && pendingSubmitMode === 'add-another' ? <Loader2 className="size-4 animate-spin" /> : <Plus className="size-4" />}
                      Save &amp; Add Another
                    </Button>
                    <Button
                      type="submit"
                      disabled={isSaving}
                      className="gap-2"
                      onClick={() => {
                        submitModeRef.current = 'finish'
                        setPendingSubmitMode('finish')
                      }}
                    >
                      {isSaving && pendingSubmitMode === 'finish' ? <Loader2 className="size-4 animate-spin" /> : null}
                      Save &amp; Finish
                    </Button>
                  </>
                )}
              </div>
            </div>
          </div>
        </form>
      </EmployeeEntityPage>
    )
  }

  if (view === 'create' || view === 'edit') {
    const isEdit = view === 'edit'

    return (
      <EmployeeEntityPage
        eyebrow={isEdit ? 'Editing' : 'New audio'}
        title={isEdit ? 'Edit Audio' : 'Add Audio to Project'}
        description={
          project
            ? `Inside project "${project.projectName}" (${project.projectCode}).`
            : 'Inside project.'
        }
      >
        <form id="audio-form" onSubmit={handleAudioSubmit} className="mx-auto block w-full max-w-4xl">
          <div className="space-y-6">
            {!isEdit && savedThisSession.length > 0 ? (
              <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/5 p-4 shadow-sm dark:bg-emerald-500/10">
                <div className="flex items-start gap-3">
                  <div className="mt-0.5 flex size-8 items-center justify-center rounded-full bg-emerald-500/15 text-emerald-600 dark:text-emerald-300">
                    <CheckCircle2 className="size-4" />
                  </div>
                  <div className="min-w-0 flex-1 space-y-1.5">
                    <p className="text-sm font-semibold text-foreground">
                      {savedThisSession.length === 1
                        ? '1 audio added so far in this session'
                        : `${savedThisSession.length} audios added so far in this session`}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Form has been reset for the next one. Version & copy numbers carried over (copy auto-incremented).
                    </p>
                    <div className="flex flex-wrap gap-1.5 pt-0.5">
                      {savedThisSession.slice(-6).map((c) => (
                        <span
                          key={c}
                          className="inline-flex items-center rounded-full border border-emerald-500/30 bg-background/60 px-2 py-0.5 font-mono text-[10px] tracking-wide text-foreground/80"
                        >
                          {c}
                        </span>
                      ))}
                      {savedThisSession.length > 6 ? (
                        <span className="text-[10px] font-medium text-muted-foreground">
                          +{savedThisSession.length - 6} earlier
                        </span>
                      ) : null}
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={handleCloseAudioForm}
                    className="text-xs font-medium text-emerald-700 underline-offset-2 hover:underline dark:text-emerald-300"
                  >
                    Finish & view list
                  </button>
                </div>
              </div>
            ) : null}

            <Card className="border-border bg-card shadow-sm shadow-black/5">
              <CardHeader className="border-b border-border pb-4">
                <CardTitle className="text-base font-semibold">Identity</CardTitle>
                <CardDescription className="text-xs">
                  Version, copy and the auto-generated audio code.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-5 pt-5">
                <div className="grid gap-5 sm:grid-cols-3">
                  <div className="space-y-1.5">
                    <Label htmlFor="audioVersion">
                      Version <span className="text-destructive">*</span>
                    </Label>
                    <select
                      id="audioVersion"
                      value={form.audioVersion}
                      onChange={(e) => setForm({ ...form, audioVersion: e.target.value })}
                      className={SELECT_CLASS}
                      required
                    >
                      {AUDIO_VERSIONS.map((v) => (
                        <option key={v} value={v}>
                          {v}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="versionNumber">
                      Version # <span className="text-destructive">*</span>
                    </Label>
                    <Input
                      id="versionNumber"
                      type="number"
                      min="1"
                      step="1"
                      value={form.versionNumber}
                      onChange={(e) => setForm({ ...form, versionNumber: e.target.value })}
                      required
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="copyNumber">
                      Copy # <span className="text-destructive">*</span>
                    </Label>
                    <Input
                      id="copyNumber"
                      type="number"
                      min="1"
                      step="1"
                      value={form.copyNumber}
                      onChange={(e) => setForm({ ...form, copyNumber: e.target.value })}
                      required
                    />
                  </div>
                </div>

                {isEdit && currentAudio?.audioCode ? (
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <span>Code:</span>
                    <CodeBadge code={currentAudio.audioCode} variant="subtle" />
                  </div>
                ) : (
                  <p className="text-xs text-muted-foreground">
                    Auto-generated as{' '}
                    <span className="font-mono font-semibold text-foreground">
                      {project?.personCode
                        ? `${(project.personName || project.personCode).replace(/\s+/g, '').toUpperCase().slice(0, 8)}_AUD_${form.audioVersion || 'RAW'}_V${form.versionNumber || '1'}_Copy(${form.copyNumber || '1'})_000001`
                        : `${(project?.categories?.[0]?.categoryName || project?.categories?.[0]?.categoryCode || 'CATEGORY').replace(/\s+/g, '').toUpperCase().slice(0, 8)}_AUD_${form.audioVersion || 'RAW'}_V${form.versionNumber || '1'}_Copy(${form.copyNumber || '1'})_000001`}
                    </span>
                  </p>
                )}
              </CardContent>
            </Card>

            <Card className="border-border bg-card shadow-sm shadow-black/5">
              <CardHeader className="border-b border-border pb-4">
                <CardTitle className="text-base font-semibold">Audio File</CardTitle>
                <CardDescription className="text-xs">
                  {isEdit
                    ? 'Upload a replacement file to overwrite the current recording. Leave empty to keep it.'
                    : 'A single audio file is required.'}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4 pt-5">
                {isEdit && currentAudio?.audioFileUrl ? (
                  <div className="space-y-2">
                    <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                      Current file
                    </p>
                    <AudioPlayer
                      src={currentAudio.audioFileUrl}
                      title={currentAudio.originTitle || currentAudio.audioCode}
                      subtitle={[currentAudio.audioVersion, currentAudio.fileExtension, currentAudio.bitRate]
                        .filter(Boolean)
                        .join(' • ')}
                    />
                  </div>
                ) : null}

                {audioFile ? (
                  <div className="space-y-2">
                    <div className="flex items-center gap-3 rounded-lg border bg-muted/20 p-3">
                      <FileAudio className="size-5 text-muted-foreground" />
                      <div className="min-w-0 flex-1 space-y-0.5">
                        <p className="truncate text-sm font-medium">{audioFile.name}</p>
                        {audioFile.webkitRelativePath ? (
                          <p
                            className="truncate font-mono text-[11px] text-muted-foreground"
                            title={audioFile.webkitRelativePath}
                          >
                            {audioFile.webkitRelativePath}
                          </p>
                        ) : null}
                        <p className="text-xs text-muted-foreground">
                          {formatFileSize(audioFile.size)} · extension, size{' '}
                          {audioFile.webkitRelativePath ? 'and full folder path ' : 'and path '}
                          auto-filled below
                        </p>
                      </div>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon-xs"
                        onClick={() => handleAudioFilePicked(null)}
                      >
                        <X className="size-3.5" />
                        <span className="sr-only">Remove selected file</span>
                      </Button>
                    </div>
                  </div>
                ) : folderCandidates.length > 0 ? (
                  <div className="space-y-2 rounded-xl border bg-muted/20 p-3">
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-xs font-semibold text-foreground">
                        {folderCandidates.length} audio files in that folder — pick one to upload
                      </p>
                      <button
                        type="button"
                        onClick={() => setFolderCandidates([])}
                        className="text-xs text-muted-foreground hover:text-foreground"
                      >
                        Cancel
                      </button>
                    </div>
                    <ul className="max-h-64 space-y-1 overflow-y-auto pr-1">
                      {folderCandidates.map((f) => (
                        <li key={f.webkitRelativePath || f.name}>
                          <button
                            type="button"
                            onClick={() => {
                              handleAudioFilePicked(f)
                              setFolderCandidates([])
                            }}
                            className="flex w-full items-center gap-2 rounded-md border bg-background px-2.5 py-1.5 text-left text-xs transition hover:border-primary/40 hover:bg-muted/40"
                          >
                            <FileAudio className="size-3.5 shrink-0 text-muted-foreground" />
                            <span className="min-w-0 flex-1 truncate font-mono">
                              {f.webkitRelativePath || f.name}
                            </span>
                            <span className="shrink-0 text-[10px] text-muted-foreground">
                              {formatFileSize(f.size)}
                            </span>
                          </button>
                        </li>
                      ))}
                    </ul>
                  </div>
                ) : (
                  <div className="grid gap-3 sm:grid-cols-2">
                    <label
                      htmlFor="audioFile"
                      className="flex cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-border bg-muted/20 px-4 py-6 text-center transition-colors hover:border-primary/50 hover:bg-muted/40"
                    >
                      <Upload className="size-5 text-muted-foreground" />
                      <div>
                        <p className="text-sm font-medium text-foreground">
                          {isEdit ? 'Replace single file' : 'Browse a single file'}
                        </p>
                        <p className="text-xs text-muted-foreground">WAV, MP3, FLAC, OGG…</p>
                      </div>
                    </label>
                    <label
                      htmlFor="audioFolder"
                      className="flex cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-border bg-muted/20 px-4 py-6 text-center transition-colors hover:border-primary/50 hover:bg-muted/40"
                    >
                      <FolderOpen className="size-5 text-muted-foreground" />
                      <div>
                        <p className="text-sm font-medium text-foreground">Browse from folder</p>
                        <p className="text-xs text-muted-foreground">
                          Captures the directory path
                        </p>
                      </div>
                    </label>
                  </div>
                )}
                <input
                  id="audioFile"
                  type="file"
                  accept="audio/*"
                  onChange={(e) => {
                    handleAudioFilePicked(e.target.files?.[0] || null)
                    e.target.value = ''
                  }}
                  className="sr-only"
                />
                <input
                  id="audioFolder"
                  type="file"
                  // The two attribute names cover Chromium-based browsers and older
                  // Safari/Firefox; both fall back gracefully if unsupported.
                  webkitdirectory=""
                  directory=""
                  multiple
                  onChange={(e) => {
                    handleAudioFolderPicked(e.target.files)
                    e.target.value = ''
                  }}
                  className="sr-only"
                />
              </CardContent>
            </Card>

            <AudioFormSections
              form={form}
              setForm={setForm}
              projectCategories={project?.categories || []}
            />

            <FormErrorBox error={formError} />

            <div className="sticky bottom-0 z-10 -mx-1 flex flex-col gap-2 rounded-xl border border-border bg-card/95 px-4 py-3 shadow-lg backdrop-blur sm:flex-row sm:items-center sm:justify-between">
              <p className="text-xs text-muted-foreground">
                {isEdit
                  ? 'Update this audio entry.'
                  : savedThisSession.length > 0
                  ? `${savedThisSession.length} added in this session — keep going or finish.`
                  : 'Pick a recording, fill the metadata, then save.'}
              </p>
              <div className="flex items-center justify-end gap-2">
                <Button type="button" variant="outline" onClick={handleCloseAudioForm} disabled={isSaving}>
                  Cancel
                </Button>
                {isEdit ? (
                  <Button type="submit" disabled={isSaving} className="gap-2">
                    {isSaving ? <Loader2 className="size-4 animate-spin" /> : null}
                    {isSaving ? 'Saving…' : 'Save Changes'}
                  </Button>
                ) : (
                  <>
                    <Button
                      type="submit"
                      variant="outline"
                      disabled={isSaving}
                      className="gap-2"
                      onClick={() => {
                        submitModeRef.current = 'add-another'
                        setPendingSubmitMode('add-another')
                      }}
                    >
                      {isSaving && pendingSubmitMode === 'add-another' ? (
                        <Loader2 className="size-4 animate-spin" />
                      ) : (
                        <Plus className="size-4" />
                      )}
                      Save &amp; Add Another
                    </Button>
                    <Button
                      type="submit"
                      disabled={isSaving}
                      className="gap-2"
                      onClick={() => {
                        submitModeRef.current = 'finish'
                        setPendingSubmitMode('finish')
                      }}
                    >
                      {isSaving && pendingSubmitMode === 'finish' ? (
                        <Loader2 className="size-4 animate-spin" />
                      ) : null}
                      Save &amp; Finish
                    </Button>
                  </>
                )}
              </div>
            </div>
          </div>
        </form>
      </EmployeeEntityPage>
    )
  }

  /* ── detail / list view ─────────────────────────────────────── */

  if (isLoading) {
    return (
      <EmployeeEntityPage eyebrow="Project" title="Loading…">
        <div className="space-y-3">
          <Skeleton className="h-32 w-full rounded-xl" />
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-64 w-full rounded-xl" />
        </div>
      </EmployeeEntityPage>
    )
  }

  if (error || !project) {
    return (
      <EmployeeEntityPage eyebrow="Project" title="Not found">
        <Card className="border-border bg-card shadow-sm shadow-black/5">
          <CardContent className="space-y-4 px-6 py-8">
            <p className="text-sm text-destructive">{error || `Project ${projectCode} not found.`}</p>
            <Button variant="outline" size="lg" onClick={() => navigate(`${sectionBase}/project`)} className="group h-10 gap-2.5 px-4">
              <ArrowLeft className="size-5 transition-transform group-hover:-translate-x-0.5" />
              Back to projects
            </Button>
          </CardContent>
        </Card>
      </EmployeeEntityPage>
    )
  }

  return (
    <div className="space-y-4">
      <Button
        type="button"
        variant="outline"
        size="lg"
        className="group h-10 gap-2.5 px-4 text-sm font-medium"
        onClick={() => navigate(`${sectionBase}/project`)}
      >
        <ArrowLeft className="size-5 transition-transform group-hover:-translate-x-0.5" />
        Back to projects
      </Button>

    <EmployeeEntityPage
      title={project.projectName}
      badge={project.removedAt ? 'Removed' : undefined}
      description={project.description || undefined}
      action={
        <div className="flex items-center gap-2 shrink-0">
          {mediaType === 'audio' ? (
            <Button onClick={handleOpenCreateAudio} className="gap-2">
              <Plus className="size-4" />
              Add Audio
            </Button>
          ) : mediaType === 'video' ? (
            <Button onClick={handleOpenCreateVideo} className="gap-2">
              <Plus className="size-4" />
              Add Video
            </Button>
          ) : mediaType === 'image' ? (
            <Button onClick={handleOpenCreateImage} className="gap-2">
              <Plus className="size-4" />
              Add Image
            </Button>
          ) : (
            <Button onClick={handleOpenCreateText} className="gap-2">
              <Plus className="size-4" />
              Add Text
            </Button>
          )}
        </div>
      }
    >
      <Card className="border-border bg-card shadow-sm shadow-black/5">
        <CardContent className="grid gap-6 px-6 py-5 sm:grid-cols-[auto_1fr_auto]">
          <div className="flex size-12 items-center justify-center rounded-xl border bg-background text-muted-foreground">
            <FolderOpen className="size-5" />
          </div>
          <div className="space-y-2 min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <CodeBadge code={project.projectCode} />
              <span
                className={cn(
                  'inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-medium',
                  project.personCode ? 'bg-muted/40 text-foreground' : 'bg-muted/20 italic text-muted-foreground',
                )}
              >
                {project.personCode ? (
                  <>
                    {project.personName || project.personCode}
                    <span className="font-mono text-[10px] text-muted-foreground">{project.personCode}</span>
                  </>
                ) : (
                  'Untitled (no person)'
                )}
              </span>
            </div>

            {(project.categories?.length ?? 0) > 0 && (
              <div className="flex flex-wrap gap-1">
                {project.categories.map((cat) => (
                  <span
                    key={cat.categoryCode || cat.id}
                    className="inline-flex items-center gap-1 rounded-full border bg-background px-2 py-0.5 text-[11px] text-foreground/80"
                  >
                    {cat.categoryName || cat.name || cat.categoryCode}
                    <span className="font-mono text-[10px] text-muted-foreground">
                      {cat.categoryCode}
                    </span>
                  </span>
                ))}
              </div>
            )}

            {((project.tags?.length ?? 0) > 0 || (project.keywords?.length ?? 0) > 0) && (
              <div className="flex flex-wrap gap-1 text-[11px] text-muted-foreground">
                {(project.tags || []).map((t) => (
                  <span key={`t-${t}`} className="inline-flex items-center rounded-full bg-muted/40 px-2 py-0.5">
                    #{t}
                  </span>
                ))}
                {(project.keywords || []).map((k) => (
                  <span key={`k-${k}`} className="inline-flex items-center rounded-full bg-muted/20 px-2 py-0.5">
                    {k}
                  </span>
                ))}
              </div>
            )}
          </div>
          <div className="flex flex-col items-end gap-1 self-center text-[11px] text-muted-foreground">
            <p>
              {audios.length} audio · {videos.length} video · {images.length} image · {texts.length} text
            </p>
          </div>
        </CardContent>
      </Card>

      <MediaTypeTabs
        mediaType={mediaType}
        onChange={handleSwitchMediaType}
        audioCount={visibleAudios.length}
        videoCount={visibleVideos.length}
        imageCount={visibleImages.length}
        textCount={visibleTexts.length}
      />

      {mediaType === 'audio' ? (
        <EntityToolbar
          filteredCount={filteredAudios.length}
          totalCount={visibleAudios.length}
          searchValue={searchTerm}
          onSearchChange={setSearchTerm}
          searchPlaceholder="Search audios — code, title, lyrics, genre, contributors, tags…"
          onRefresh={() => loadAudios()}
          isRefreshing={isLoadingAudios || isAudioSearching}
          trailing={
            // Sort + filter live in the trailing slot so they sit
            // alongside the refresh button. Both are disabled while
            // a fuzzy search is active because /audio/search has its
            // own ranking and bypasses the filter model server-side.
            <div className="flex flex-wrap items-center gap-2">
              <SortSelect
                value={audioSortKey}
                onChange={setAudioSortKey}
                options={AUDIO_SORT_OPTIONS}
                ascIcon={ArrowUpAZ}
                descIcon={ArrowDownAZ}
                disabled={Boolean(searchTerm.trim())}
                title="Sort audios"
                width="sm:w-[16rem]"
              />
              <FilterTriggerButton
                active={audioFiltersActive}
                count={audioFilterCount}
                open={isAudioFilterPanelOpen}
                onClick={() => setIsAudioFilterPanelOpen((v) => !v)}
                disabled={Boolean(searchTerm.trim())}
                disabledReason="Clear search to use filters"
              />
            </div>
          }
        />
      ) : mediaType === 'video' ? (
        <EntityToolbar
          filteredCount={filteredVideos.length}
          totalCount={visibleVideos.length}
          searchValue={videoSearchTerm}
          onSearchChange={setVideoSearchTerm}
          searchPlaceholder="Search videos — code, title, location, subjects, tags…"
          onRefresh={() => loadVideos()}
          isRefreshing={isLoadingVideos || isVideoSearching}
          trailing={
            <div className="flex flex-wrap items-center gap-2">
              <SortSelect
                value={videoSortKey}
                onChange={setVideoSortKey}
                options={VIDEO_SORT_OPTIONS}
                ascIcon={ArrowUpAZ}
                descIcon={ArrowDownAZ}
                disabled={Boolean(videoSearchTerm.trim())}
                title="Sort videos"
                width="sm:w-[16rem]"
              />
              <FilterTriggerButton
                active={videoFiltersActive}
                count={videoFilterCount}
                open={isVideoFilterPanelOpen}
                onClick={() => setIsVideoFilterPanelOpen((v) => !v)}
                disabled={Boolean(videoSearchTerm.trim())}
                disabledReason="Clear search to use filters"
              />
            </div>
          }
        />
      ) : mediaType === 'image' ? (
        <EntityToolbar
          filteredCount={filteredImages.length}
          totalCount={visibleImages.length}
          searchValue={imageSearchTerm}
          onSearchChange={setImageSearchTerm}
          searchPlaceholder="Search images — code, title, creator, location, subjects, tags…"
          onRefresh={() => loadImages()}
          isRefreshing={isLoadingImages || isImageSearching}
          trailing={
            <div className="flex flex-wrap items-center gap-2">
              <SortSelect
                value={imageSortKey}
                onChange={setImageSortKey}
                options={IMAGE_SORT_OPTIONS}
                ascIcon={ArrowUpAZ}
                descIcon={ArrowDownAZ}
                disabled={Boolean(imageSearchTerm.trim())}
                title="Sort images"
                width="sm:w-[16rem]"
              />
              <FilterTriggerButton
                active={imageFiltersActive}
                count={imageFilterCount}
                open={isImageFilterPanelOpen}
                onClick={() => setIsImageFilterPanelOpen((v) => !v)}
                disabled={Boolean(imageSearchTerm.trim())}
                disabledReason="Clear search to use filters"
              />
            </div>
          }
        />
      ) : (
        <EntityToolbar
          filteredCount={filteredTexts.length}
          totalCount={visibleTexts.length}
          searchValue={textSearchTerm}
          onSearchChange={setTextSearchTerm}
          searchPlaceholder="Search texts — code, title, author, ISBN, transcription, tags…"
          onRefresh={() => loadTexts()}
          isRefreshing={isLoadingTexts || isTextSearching}
          trailing={
            <div className="flex flex-wrap items-center gap-2">
              <SortSelect
                value={textSortKey}
                onChange={setTextSortKey}
                options={TEXT_SORT_OPTIONS}
                ascIcon={ArrowUpAZ}
                descIcon={ArrowDownAZ}
                disabled={Boolean(textSearchTerm.trim())}
                title="Sort texts"
                width="sm:w-[16rem]"
              />
              <FilterTriggerButton
                active={textFiltersActive}
                count={textFilterCount}
                open={isTextFilterPanelOpen}
                onClick={() => setIsTextFilterPanelOpen((v) => !v)}
                disabled={Boolean(textSearchTerm.trim())}
                disabledReason="Clear search to use filters"
              />
            </div>
          }
        />
      )}

      {mediaType === 'audio' && !searchTerm.trim() ? (
        <AudioFilterPanel
          open={isAudioFilterPanelOpen}
          filters={audioFilters}
          onChange={updateAudioFilter}
          onClear={clearAudioFilters}
          onClose={() => setIsAudioFilterPanelOpen(false)}
          isAnyActive={audioFiltersActive}
          activeCount={audioFilterCount}
        />
      ) : null}

      {mediaType === 'audio' && audioChips.length > 0 ? (
        <FilterChips
          chips={audioChips}
          onClearAll={
            audioFiltersActive || audioSortActive
              ? () => {
                  clearAudioFilters()
                  setAudioSortKey(DEFAULT_AUDIO_SORT_KEY)
                }
              : null
          }
        />
      ) : null}

      {mediaType === 'image' && !imageSearchTerm.trim() ? (
        <ImageFilterPanel
          open={isImageFilterPanelOpen}
          filters={imageFilters}
          onChange={updateImageFilter}
          onClear={clearImageFilters}
          onClose={() => setIsImageFilterPanelOpen(false)}
          isAnyActive={imageFiltersActive}
          activeCount={imageFilterCount}
        />
      ) : null}

      {mediaType === 'image' && imageChips.length > 0 ? (
        <FilterChips
          chips={imageChips}
          onClearAll={
            imageFiltersActive || imageSortActive
              ? () => {
                  clearImageFilters()
                  setImageSortKey(DEFAULT_IMAGE_SORT_KEY)
                }
              : null
          }
        />
      ) : null}

      {mediaType === 'video' && !videoSearchTerm.trim() ? (
        <VideoFilterPanel
          open={isVideoFilterPanelOpen}
          filters={videoFilters}
          onChange={updateVideoFilter}
          onClear={clearVideoFilters}
          onClose={() => setIsVideoFilterPanelOpen(false)}
          isAnyActive={videoFiltersActive}
          activeCount={videoFilterCount}
        />
      ) : null}

      {mediaType === 'video' && videoChips.length > 0 ? (
        <FilterChips
          chips={videoChips}
          onClearAll={
            videoFiltersActive || videoSortActive
              ? () => {
                  clearVideoFilters()
                  setVideoSortKey(DEFAULT_VIDEO_SORT_KEY)
                }
              : null
          }
        />
      ) : null}

      {mediaType === 'text' && !textSearchTerm.trim() ? (
        <TextFilterPanel
          open={isTextFilterPanelOpen}
          filters={textFilters}
          onChange={updateTextFilter}
          onClear={clearTextFilters}
          onClose={() => setIsTextFilterPanelOpen(false)}
          isAnyActive={textFiltersActive}
          activeCount={textFilterCount}
        />
      ) : null}

      {mediaType === 'text' && textChips.length > 0 ? (
        <FilterChips
          chips={textChips}
          onClearAll={
            textFiltersActive || textSortActive
              ? () => {
                  clearTextFilters()
                  setTextSortKey(DEFAULT_TEXT_SORT_KEY)
                }
              : null
          }
        />
      ) : null}

      {mediaType === 'audio' ? (
      <>{isLoadingAudios ? (
        <Card className="border-border bg-card shadow-sm shadow-black/5">
          <div className="divide-y divide-border">
            {[1, 2, 3].map((i) => (
              <div key={i} className="flex items-center gap-4 px-4 py-3">
                <Skeleton className="h-4 w-6" />
                <Skeleton className="h-6 w-52 rounded-md" />
                <Skeleton className="h-4 w-40" />
                <Skeleton className="h-5 w-24 rounded-full" />
                <Skeleton className="ml-auto h-7 w-20" />
              </div>
            ))}
          </div>
        </Card>
      ) : audios.length === 0 ? (
        <EmptyState
          icon={AudioLines}
          title="No audios in this project yet"
          description="Upload field recordings, interviews, or performances and they will be coded under this project."
          action={
            <Button onClick={handleOpenCreateAudio} className="gap-2">
              <Plus className="size-4" />
              Add Audio
            </Button>
          }
        />
      ) : (
        <div className="overflow-hidden rounded-xl border border-border bg-card shadow-sm shadow-black/5">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/40 hover:bg-muted/40">
                <TableHead className="w-[52px] text-center">#</TableHead>
                <TableHead className="w-[280px]">Code</TableHead>
                <TableHead className="w-[280px]">Title</TableHead>
                <TableHead className="w-[120px]">Version</TableHead>
                <TableHead>Genre</TableHead>
                <TableHead className="w-[180px] text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredAudios.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="h-24 text-center text-muted-foreground">
                    {audioFiltersActive || audioSortActive ? (
                      <span className="inline-flex items-center gap-2">
                        No audios match the current filters.
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            clearAudioFilters()
                            setAudioSortKey(DEFAULT_AUDIO_SORT_KEY)
                          }}
                          className="h-7 gap-1 px-2 text-xs"
                        >
                          <X className="size-3" />
                          Clear filters
                        </Button>
                      </span>
                    ) : (
                      'No matching audios.'
                    )}
                  </TableCell>
                </TableRow>
              ) : (
                filteredAudios.map((audio, index) => {
                  const title =
                    audio.originTitle ||
                    audio.alterTitle ||
                    audio.romanizedTitle ||
                    audio.fullName ||
                    audio.audioCode
                  return (
                    <TableRow
                      key={audio.audioCode}
                      className={`group transition-colors ${audio.removedAt ? 'opacity-60' : ''}`}
                    >
                      <TableCell className="text-center text-xs tabular-nums text-muted-foreground">
                        {index + 1}
                      </TableCell>
                      <TableCell>
                        <CodeBadge code={audio.audioCode} variant="subtle" highlightQuery={searchTerm} />
                      </TableCell>
                      <TableCell>
                        <button
                          type="button"
                          onClick={() => setDetailsTarget(audio)}
                          className="block max-w-[280px] truncate text-left font-semibold leading-tight text-foreground hover:text-primary focus-visible:outline-none focus-visible:underline"
                          title={title}
                        >
                          <Highlight text={title} query={searchTerm} />
                        </button>
                        {audio.removedAt && (
                          <span className="inline-flex items-center rounded-full border border-amber-500/30 bg-amber-500/10 px-2 py-0.5 text-[10px] font-medium text-amber-700 dark:text-amber-300">
                            Removed
                          </span>
                        )}
                      </TableCell>
                      <TableCell>
                        <span className="inline-flex items-center gap-1 rounded-full border bg-background px-2 py-0.5 text-[11px] font-medium">
                          {audio.audioVersion ? (
                            <Highlight text={audio.audioVersion} query={searchTerm} />
                          ) : (
                            '—'
                          )}
                          {audio.versionNumber != null ? (
                            <span className="text-muted-foreground">v{audio.versionNumber}</span>
                          ) : null}
                          {audio.copyNumber != null ? (
                            <span className="text-muted-foreground">c{audio.copyNumber}</span>
                          ) : null}
                        </span>
                      </TableCell>
                      <TableCell>
                        {(() => {
                          const genres = Array.isArray(audio.genre)
                            ? audio.genre
                            : audio.genre
                            ? [audio.genre]
                            : []
                          if (genres.length === 0) {
                            return <span className="text-sm text-muted-foreground">—</span>
                          }
                          const visible = genres.slice(0, 2)
                          const extra = genres.length - visible.length
                          return (
                            <div className="flex flex-wrap gap-1">
                              {visible.map((g) => (
                                <span
                                  key={g}
                                  className="inline-flex items-center rounded-full border bg-muted/40 px-2 py-0.5 text-[11px] font-medium text-foreground/80"
                                >
                                  <Highlight text={g} query={searchTerm} />
                                </span>
                              ))}
                              {extra > 0 ? (
                                <span className="text-[11px] font-medium text-muted-foreground">
                                  +{extra}
                                </span>
                              ) : null}
                            </div>
                          )
                        })()}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            className="h-7 gap-1 px-2 text-xs"
                            onClick={() => setDetailsTarget(audio)}
                          >
                            <Eye className="size-3.5" />
                            Details
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon-xs"
                            className="text-muted-foreground hover:text-foreground"
                            onClick={() => handleOpenEditAudio(audio)}
                            title="Edit audio"
                          >
                            <Pencil className="size-3.5" />
                            <span className="sr-only">Edit</span>
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon-xs"
                            className="text-destructive/70 hover:bg-destructive/10 hover:text-destructive"
                            onClick={() => setDeleteTarget(audio)}
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

      </>
      ) : mediaType === 'video' ? (
        <VideoListSection
          isLoading={isLoadingVideos}
          videos={videos}
          filteredVideos={filteredVideos}
          searchQuery={videoSearchTerm}
          filtersOrSortActive={videoFiltersActive || videoSortActive}
          onClearFiltersAndSort={() => {
            clearVideoFilters()
            setVideoSortKey(DEFAULT_VIDEO_SORT_KEY)
          }}
          onAdd={handleOpenCreateVideo}
          onEdit={handleOpenEditVideo}
          onDetails={(v) => setVideoDetailsTarget(v)}
          onDelete={(v) => setVideoDeleteTarget(v)}
        />
      ) : mediaType === 'image' ? (
        <ImageListSection
          isLoading={isLoadingImages}
          images={images}
          filteredImages={filteredImages}
          searchQuery={imageSearchTerm}
          filtersOrSortActive={imageFiltersActive || imageSortActive}
          onClearFiltersAndSort={() => {
            clearImageFilters()
            setImageSortKey(DEFAULT_IMAGE_SORT_KEY)
          }}
          onAdd={handleOpenCreateImage}
          onEdit={handleOpenEditImage}
          onDetails={(i) => setImageDetailsTarget(i)}
          onDelete={(i) => setImageDeleteTarget(i)}
        />
      ) : (
        <TextListSection
          isLoading={isLoadingTexts}
          texts={texts}
          filteredTexts={filteredTexts}
          searchQuery={textSearchTerm}
          filtersOrSortActive={textFiltersActive || textSortActive}
          onClearFiltersAndSort={() => {
            clearTextFilters()
            setTextSortKey(DEFAULT_TEXT_SORT_KEY)
          }}
          onAdd={handleOpenCreateText}
          onEdit={handleOpenEditText}
          onDetails={(t) => setTextDetailsTarget(t)}
          onDelete={(t) => setTextDeleteTarget(t)}
        />
      )}

      <TypedConfirmDialog
        open={Boolean(deleteTarget)}
        title="Send audio to trash"
        description="The audio file will be moved to trash. An admin can restore it from the Trash page."
        codeToConfirm={deleteTarget?.audioCode}
        promptLabel="To confirm, type the audio code"
        confirmLabel="Send to Trash"
        cancelLabel="Cancel"
        confirmVariant="destructive"
        isProcessing={isDeleting}
        onConfirm={handleDeleteAudio}
        onOpenChange={(nextOpen) => {
          if (!nextOpen) setDeleteTarget(null)
        }}
      />

      <TypedConfirmDialog
        open={Boolean(videoDeleteTarget)}
        title="Send video to trash"
        description="The video file will be moved to trash. An admin can restore it from the Trash page."
        codeToConfirm={videoDeleteTarget?.videoCode}
        promptLabel="To confirm, type the video code"
        confirmLabel="Send to Trash"
        cancelLabel="Cancel"
        confirmVariant="destructive"
        isProcessing={isVideoDeleting}
        onConfirm={handleDeleteVideo}
        onOpenChange={(nextOpen) => {
          if (!nextOpen) setVideoDeleteTarget(null)
        }}
      />

      <AudioDetailsModal
        open={Boolean(detailsTarget)}
        audio={detailsTarget}
        searchQuery={searchTerm}
        onOpenChange={(nextOpen) => {
          if (!nextOpen) setDetailsTarget(null)
        }}
      />

      <VideoDetailsModal
        open={Boolean(videoDetailsTarget)}
        video={videoDetailsTarget}
        searchQuery={videoSearchTerm}
        onOpenChange={(nextOpen) => {
          if (!nextOpen) setVideoDetailsTarget(null)
        }}
      />

      <TypedConfirmDialog
        open={Boolean(imageDeleteTarget)}
        title="Send image to trash"
        description="The image file will be moved to trash. An admin can restore it from the Trash page."
        codeToConfirm={imageDeleteTarget?.imageCode}
        promptLabel="To confirm, type the image code"
        confirmLabel="Send to Trash"
        cancelLabel="Cancel"
        confirmVariant="destructive"
        isProcessing={isImageDeleting}
        onConfirm={handleDeleteImage}
        onOpenChange={(nextOpen) => {
          if (!nextOpen) setImageDeleteTarget(null)
        }}
      />

      <ImageDetailsModal
        open={Boolean(imageDetailsTarget)}
        image={imageDetailsTarget}
        searchQuery={imageSearchTerm}
        onOpenChange={(nextOpen) => {
          if (!nextOpen) setImageDetailsTarget(null)
        }}
      />

      <TypedConfirmDialog
        open={Boolean(textDeleteTarget)}
        title="Send text to trash"
        description="The text record will be moved to trash. An admin can restore it from the Trash page."
        codeToConfirm={textDeleteTarget?.textCode}
        promptLabel="To confirm, type the text code"
        confirmLabel="Send to Trash"
        cancelLabel="Cancel"
        confirmVariant="destructive"
        isProcessing={isTextDeleting}
        onConfirm={handleDeleteText}
        onOpenChange={(nextOpen) => {
          if (!nextOpen) setTextDeleteTarget(null)
        }}
      />

      <TextDetailsModal
        open={Boolean(textDetailsTarget)}
        text={textDetailsTarget}
        searchQuery={textSearchTerm}
        onOpenChange={(nextOpen) => {
          if (!nextOpen) setTextDetailsTarget(null)
        }}
      />
    </EmployeeEntityPage>
    </div>
  )
}

function MediaTypeTabs({ mediaType, onChange, audioCount, videoCount, imageCount, textCount }) {
  const types = [
    { key: 'audio', label: 'Audio', icon: AudioLines, count: audioCount, enabled: true },
    { key: 'video', label: 'Video', icon: VideoIcon, count: videoCount, enabled: true },
    { key: 'image', label: 'Image', icon: ImageIcon, count: imageCount, enabled: true },
    { key: 'text', label: 'Text', icon: FileText, count: textCount, enabled: true },
  ]
  return (
    <div className="flex flex-wrap items-center gap-1 rounded-xl border border-border bg-card/60 p-1 shadow-sm">
      {types.map((t) => {
        const Icon = t.icon
        const isActive = t.enabled && mediaType === t.key
        if (!t.enabled) {
          return (
            <button
              key={t.key}
              type="button"
              disabled
              title={`${t.label} support coming soon`}
              className="inline-flex cursor-not-allowed items-center gap-2 rounded-lg px-3 py-1.5 text-sm text-muted-foreground/60"
            >
              <Icon className="size-4" />
              {t.label}
              <span className="inline-flex items-center rounded-full border border-dashed border-border px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wider text-muted-foreground/70">
                soon
              </span>
            </button>
          )
        }
        return (
          <button
            key={t.key}
            type="button"
            onClick={() => onChange(t.key)}
            aria-pressed={isActive}
            className={cn(
              'inline-flex items-center gap-2 rounded-lg px-3 py-1.5 text-sm font-medium transition-colors',
              isActive
                ? 'bg-primary/10 font-semibold text-primary'
                : 'text-muted-foreground hover:bg-muted/50 hover:text-foreground',
            )}
          >
            <Icon className="size-4" />
            {t.label}
            {typeof t.count === 'number' ? (
              <span
                className={cn(
                  'inline-flex items-center rounded-full px-1.5 py-0.5 text-[10px] font-bold tabular-nums',
                  isActive ? 'bg-primary/20' : 'bg-muted text-muted-foreground',
                )}
              >
                {t.count}
              </span>
            ) : null}
          </button>
        )
      })}
    </div>
  )
}

function VideoListSection({ isLoading, videos, filteredVideos, searchQuery, filtersOrSortActive, onClearFiltersAndSort, onAdd, onEdit, onDetails, onDelete }) {
  if (isLoading) {
    return (
      <Card className="border-border bg-card shadow-sm shadow-black/5">
        <div className="divide-y divide-border">
          {[1, 2, 3].map((i) => (
            <div key={i} className="flex items-center gap-4 px-4 py-3">
              <Skeleton className="h-4 w-6" />
              <Skeleton className="h-6 w-52 rounded-md" />
              <Skeleton className="h-4 w-40" />
              <Skeleton className="h-5 w-24 rounded-full" />
              <Skeleton className="ml-auto h-7 w-20" />
            </div>
          ))}
        </div>
      </Card>
    )
  }
  if (videos.length === 0) {
    return (
      <EmptyState
        icon={VideoIcon}
        title="No videos in this project yet"
        description="Upload films, footage, or interviews and they will be coded under this project."
        action={
          <Button onClick={onAdd} className="gap-2">
            <Plus className="size-4" />
            Add Video
          </Button>
        }
      />
    )
  }
  return (
    <div className="overflow-hidden rounded-xl border border-border bg-card shadow-sm shadow-black/5">
      <Table>
        <TableHeader>
          <TableRow className="bg-muted/40 hover:bg-muted/40">
            <TableHead className="w-[52px] text-center">#</TableHead>
            <TableHead className="w-[260px]">Code</TableHead>
            <TableHead className="w-[280px]">Title</TableHead>
            <TableHead className="w-[140px]">Version</TableHead>
            <TableHead className="w-[140px]">Resolution</TableHead>
            <TableHead>Genre</TableHead>
            <TableHead className="w-[180px] text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {filteredVideos.length === 0 ? (
            <TableRow>
              <TableCell colSpan={7} className="h-24 text-center text-muted-foreground">
                {filtersOrSortActive ? (
                  <span className="inline-flex items-center gap-2">
                    No videos match the current filters.
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={onClearFiltersAndSort}
                      className="h-7 gap-1 px-2 text-xs"
                    >
                      <X className="size-3" />
                      Clear filters
                    </Button>
                  </span>
                ) : (
                  'No matching videos.'
                )}
              </TableCell>
            </TableRow>
          ) : (
            filteredVideos.map((video, index) => {
              const title =
                video.originalTitle ||
                video.alternativeTitle ||
                video.romanizedTitle ||
                video.fileName ||
                video.videoCode
              const genres = Array.isArray(video.genre) ? video.genre : video.genre ? [video.genre] : []
              const visibleGenres = genres.slice(0, 2)
              const extraGenres = genres.length - visibleGenres.length
              return (
                <TableRow
                  key={video.videoCode}
                  className={`group transition-colors ${video.removedAt ? 'opacity-60' : ''}`}
                >
                  <TableCell className="text-center text-xs tabular-nums text-muted-foreground">
                    {index + 1}
                  </TableCell>
                  <TableCell>
                    <CodeBadge code={video.videoCode} variant="subtle" highlightQuery={searchQuery} />
                  </TableCell>
                  <TableCell>
                    <button
                      type="button"
                      onClick={() => onDetails(video)}
                      className="block max-w-[280px] truncate text-left font-semibold leading-tight text-foreground hover:text-primary focus-visible:outline-none focus-visible:underline"
                      title={title}
                    >
                      <Highlight text={title} query={searchQuery} />
                    </button>
                    {video.removedAt && (
                      <span className="inline-flex items-center rounded-full border border-amber-500/30 bg-amber-500/10 px-2 py-0.5 text-[10px] font-medium text-amber-700 dark:text-amber-300">
                        Removed
                      </span>
                    )}
                  </TableCell>
                  <TableCell>
                    <span className="inline-flex items-center gap-1 rounded-full border bg-background px-2 py-0.5 text-[11px] font-medium">
                      {video.videoVersion ? (
                        <Highlight text={video.videoVersion} query={searchQuery} />
                      ) : (
                        '—'
                      )}
                      {video.versionNumber != null ? (
                        <span className="text-muted-foreground">v{video.versionNumber}</span>
                      ) : null}
                      {video.copyNumber != null ? (
                        <span className="text-muted-foreground">c{video.copyNumber}</span>
                      ) : null}
                    </span>
                  </TableCell>
                  <TableCell>
                    <span className="text-sm text-muted-foreground">
                      {video.resolution || video.dimension ? (
                        <Highlight text={video.resolution || video.dimension} query={searchQuery} />
                      ) : (
                        '—'
                      )}
                    </span>
                  </TableCell>
                  <TableCell>
                    {genres.length === 0 ? (
                      <span className="text-sm text-muted-foreground">—</span>
                    ) : (
                      <div className="flex flex-wrap gap-1">
                        {visibleGenres.map((g) => (
                          <span key={g} className="inline-flex items-center rounded-full border bg-muted/40 px-2 py-0.5 text-[11px] font-medium text-foreground/80">
                            <Highlight text={g} query={searchQuery} />
                          </span>
                        ))}
                        {extraGenres > 0 ? (
                          <span className="text-[11px] font-medium text-muted-foreground">+{extraGenres}</span>
                        ) : null}
                      </div>
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-1">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="h-7 gap-1 px-2 text-xs"
                        onClick={() => onDetails(video)}
                      >
                        <Eye className="size-3.5" />
                        Details
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon-xs"
                        className="text-muted-foreground hover:text-foreground"
                        onClick={() => onEdit(video)}
                        title="Edit video"
                      >
                        <Pencil className="size-3.5" />
                        <span className="sr-only">Edit</span>
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon-xs"
                        className="text-destructive/70 hover:bg-destructive/10 hover:text-destructive"
                        onClick={() => onDelete(video)}
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
  )
}

function ImageListSection({ isLoading, images, filteredImages, searchQuery, filtersOrSortActive, onClearFiltersAndSort, onAdd, onEdit, onDetails, onDelete }) {
  if (isLoading) {
    return (
      <Card className="border-border bg-card shadow-sm shadow-black/5">
        <div className="divide-y divide-border">
          {[1, 2, 3].map((i) => (
            <div key={i} className="flex items-center gap-4 px-4 py-3">
              <Skeleton className="h-4 w-6" />
              <Skeleton className="size-12 rounded-md" />
              <Skeleton className="h-6 w-52 rounded-md" />
              <Skeleton className="h-4 w-40" />
              <Skeleton className="ml-auto h-7 w-20" />
            </div>
          ))}
        </div>
      </Card>
    )
  }
  if (images.length === 0) {
    return (
      <EmptyState
        icon={ImageIcon}
        title="No images in this project yet"
        description="Upload photos, scans, or artwork and they will be coded under this project."
        action={
          <Button onClick={onAdd} className="gap-2">
            <Plus className="size-4" />
            Add Image
          </Button>
        }
      />
    )
  }
  return (
    <div className="overflow-hidden rounded-xl border border-border bg-card shadow-sm shadow-black/5">
      <Table>
        <TableHeader>
          <TableRow className="bg-muted/40 hover:bg-muted/40">
            <TableHead className="w-[52px] text-center">#</TableHead>
            <TableHead className="w-[80px]">Preview</TableHead>
            <TableHead className="w-[260px]">Code</TableHead>
            <TableHead className="w-[280px]">Title</TableHead>
            <TableHead className="w-[140px]">Version</TableHead>
            <TableHead className="w-[140px]">Dimension</TableHead>
            <TableHead>Genre</TableHead>
            <TableHead className="w-[180px] text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {filteredImages.length === 0 ? (
            <TableRow>
              <TableCell colSpan={8} className="h-24 text-center text-muted-foreground">
                {filtersOrSortActive ? (
                  <span className="inline-flex items-center gap-2">
                    No images match the current filters.
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={onClearFiltersAndSort}
                      className="h-7 gap-1 px-2 text-xs"
                    >
                      <X className="size-3" />
                      Clear filters
                    </Button>
                  </span>
                ) : (
                  'No matching images.'
                )}
              </TableCell>
            </TableRow>
          ) : (
            filteredImages.map((image, index) => {
              const title =
                image.originalTitle ||
                image.alternativeTitle ||
                image.romanizedTitle ||
                image.fileName ||
                image.imageCode
              const genres = Array.isArray(image.genre) ? image.genre : image.genre ? [image.genre] : []
              const visibleGenres = genres.slice(0, 2)
              const extraGenres = genres.length - visibleGenres.length
              return (
                <TableRow
                  key={image.imageCode}
                  className={`group transition-colors ${image.removedAt ? 'opacity-60' : ''}`}
                >
                  <TableCell className="text-center text-xs tabular-nums text-muted-foreground">
                    {index + 1}
                  </TableCell>
                  <TableCell>
                    {image.imageFileUrl ? (
                      <button
                        type="button"
                        onClick={() => onDetails(image)}
                        className="block size-12 overflow-hidden rounded-md border bg-muted/40 transition hover:ring-2 hover:ring-primary/30"
                        title="Open preview"
                      >
                        <img
                          src={image.imageFileUrl}
                          alt={title}
                          className="h-full w-full object-cover"
                          loading="lazy"
                        />
                      </button>
                    ) : (
                      <div className="flex size-12 items-center justify-center rounded-md border bg-muted/40 text-muted-foreground">
                        <ImageIcon className="size-4" />
                      </div>
                    )}
                  </TableCell>
                  <TableCell>
                    <CodeBadge code={image.imageCode} variant="subtle" highlightQuery={searchQuery} />
                  </TableCell>
                  <TableCell>
                    <button
                      type="button"
                      onClick={() => onDetails(image)}
                      className="block max-w-[280px] truncate text-left font-semibold leading-tight text-foreground hover:text-primary focus-visible:outline-none focus-visible:underline"
                      title={title}
                    >
                      <Highlight text={title} query={searchQuery} />
                    </button>
                    {image.removedAt && (
                      <span className="inline-flex items-center rounded-full border border-amber-500/30 bg-amber-500/10 px-2 py-0.5 text-[10px] font-medium text-amber-700 dark:text-amber-300">
                        Removed
                      </span>
                    )}
                  </TableCell>
                  <TableCell>
                    <span className="inline-flex items-center gap-1 rounded-full border bg-background px-2 py-0.5 text-[11px] font-medium">
                      {image.imageVersion ? (
                        <Highlight text={image.imageVersion} query={searchQuery} />
                      ) : (
                        '—'
                      )}
                      {image.versionNumber != null ? (
                        <span className="text-muted-foreground">v{image.versionNumber}</span>
                      ) : null}
                      {image.copyNumber != null ? (
                        <span className="text-muted-foreground">c{image.copyNumber}</span>
                      ) : null}
                    </span>
                  </TableCell>
                  <TableCell>
                    <span className="text-sm text-muted-foreground">
                      {image.dimension ? <Highlight text={image.dimension} query={searchQuery} /> : '—'}
                    </span>
                  </TableCell>
                  <TableCell>
                    {genres.length === 0 ? (
                      <span className="text-sm text-muted-foreground">—</span>
                    ) : (
                      <div className="flex flex-wrap gap-1">
                        {visibleGenres.map((g) => (
                          <span key={g} className="inline-flex items-center rounded-full border bg-muted/40 px-2 py-0.5 text-[11px] font-medium text-foreground/80">
                            <Highlight text={g} query={searchQuery} />
                          </span>
                        ))}
                        {extraGenres > 0 ? (
                          <span className="text-[11px] font-medium text-muted-foreground">+{extraGenres}</span>
                        ) : null}
                      </div>
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-1">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="h-7 gap-1 px-2 text-xs"
                        onClick={() => onDetails(image)}
                      >
                        <Eye className="size-3.5" />
                        Details
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon-xs"
                        className="text-muted-foreground hover:text-foreground"
                        onClick={() => onEdit(image)}
                        title="Edit image"
                      >
                        <Pencil className="size-3.5" />
                        <span className="sr-only">Edit</span>
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon-xs"
                        className="text-destructive/70 hover:bg-destructive/10 hover:text-destructive"
                        onClick={() => onDelete(image)}
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
  )
}

function TextListSection({ isLoading, texts, filteredTexts, searchQuery, filtersOrSortActive, onClearFiltersAndSort, onAdd, onEdit, onDetails, onDelete }) {
  if (isLoading) {
    return (
      <Card className="border-border bg-card shadow-sm shadow-black/5">
        <div className="divide-y divide-border">
          {[1, 2, 3].map((i) => (
            <div key={i} className="flex items-center gap-4 px-4 py-3">
              <Skeleton className="h-4 w-6" />
              <Skeleton className="h-6 w-52 rounded-md" />
              <Skeleton className="h-4 w-40" />
              <Skeleton className="h-5 w-24 rounded-full" />
              <Skeleton className="ml-auto h-7 w-20" />
            </div>
          ))}
        </div>
      </Card>
    )
  }
  if (texts.length === 0) {
    return (
      <EmptyState
        icon={FileText}
        title="No texts in this project yet"
        description="Upload books, manuscripts, or documents and they will be coded under this project."
        action={
          <Button onClick={onAdd} className="gap-2">
            <Plus className="size-4" />
            Add Text
          </Button>
        }
      />
    )
  }
  return (
    <div className="overflow-hidden rounded-xl border border-border bg-card shadow-sm shadow-black/5">
      <Table>
        <TableHeader>
          <TableRow className="bg-muted/40 hover:bg-muted/40">
            <TableHead className="w-[52px] text-center">#</TableHead>
            <TableHead className="w-[260px]">Code</TableHead>
            <TableHead className="w-[280px]">Title</TableHead>
            <TableHead className="w-[140px]">Version</TableHead>
            <TableHead className="w-[160px]">Author</TableHead>
            <TableHead className="w-[100px] text-right">Pages</TableHead>
            <TableHead>Genre</TableHead>
            <TableHead className="w-[180px] text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {filteredTexts.length === 0 ? (
            <TableRow>
              <TableCell colSpan={8} className="h-24 text-center text-muted-foreground">
                {filtersOrSortActive ? (
                  <span className="inline-flex items-center gap-2">
                    No texts match the current filters.
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={onClearFiltersAndSort}
                      className="h-7 gap-1 px-2 text-xs"
                    >
                      <X className="size-3" />
                      Clear filters
                    </Button>
                  </span>
                ) : (
                  'No matching texts.'
                )}
              </TableCell>
            </TableRow>
          ) : (
            filteredTexts.map((text, index) => {
              const title =
                text.originalTitle ||
                text.alternativeTitle ||
                text.romanizedTitle ||
                text.fileName ||
                text.textCode
              const genres = Array.isArray(text.genre) ? text.genre : text.genre ? [text.genre] : []
              const visibleGenres = genres.slice(0, 2)
              const extraGenres = genres.length - visibleGenres.length
              return (
                <TableRow
                  key={text.textCode}
                  className={`group transition-colors ${text.removedAt ? 'opacity-60' : ''}`}
                >
                  <TableCell className="text-center text-xs tabular-nums text-muted-foreground">
                    {index + 1}
                  </TableCell>
                  <TableCell>
                    <CodeBadge code={text.textCode} variant="subtle" highlightQuery={searchQuery} />
                  </TableCell>
                  <TableCell>
                    <button
                      type="button"
                      onClick={() => onDetails(text)}
                      className="block max-w-[280px] truncate text-left font-semibold leading-tight text-foreground hover:text-primary focus-visible:outline-none focus-visible:underline"
                      title={title}
                    >
                      <Highlight text={title} query={searchQuery} />
                    </button>
                    {text.removedAt && (
                      <span className="inline-flex items-center rounded-full border border-amber-500/30 bg-amber-500/10 px-2 py-0.5 text-[10px] font-medium text-amber-700 dark:text-amber-300">
                        Removed
                      </span>
                    )}
                  </TableCell>
                  <TableCell>
                    <span className="inline-flex items-center gap-1 rounded-full border bg-background px-2 py-0.5 text-[11px] font-medium">
                      {text.textVersion ? (
                        <Highlight text={text.textVersion} query={searchQuery} />
                      ) : (
                        '—'
                      )}
                      {text.versionNumber != null ? (
                        <span className="text-muted-foreground">v{text.versionNumber}</span>
                      ) : null}
                      {text.copyNumber != null ? (
                        <span className="text-muted-foreground">c{text.copyNumber}</span>
                      ) : null}
                    </span>
                  </TableCell>
                  <TableCell>
                    <span className="block max-w-[160px] truncate text-sm text-muted-foreground" title={text.author || ''}>
                      {text.author ? <Highlight text={text.author} query={searchQuery} /> : '—'}
                    </span>
                  </TableCell>
                  <TableCell className="text-right tabular-nums text-sm text-muted-foreground">
                    {text.pageCount != null ? text.pageCount : '—'}
                  </TableCell>
                  <TableCell>
                    {genres.length === 0 ? (
                      <span className="text-sm text-muted-foreground">—</span>
                    ) : (
                      <div className="flex flex-wrap gap-1">
                        {visibleGenres.map((g) => (
                          <span key={g} className="inline-flex items-center rounded-full border bg-muted/40 px-2 py-0.5 text-[11px] font-medium text-foreground/80">
                            <Highlight text={g} query={searchQuery} />
                          </span>
                        ))}
                        {extraGenres > 0 ? (
                          <span className="text-[11px] font-medium text-muted-foreground">+{extraGenres}</span>
                        ) : null}
                      </div>
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-1">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="h-7 gap-1 px-2 text-xs"
                        onClick={() => onDetails(text)}
                      >
                        <Eye className="size-3.5" />
                        Details
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon-xs"
                        className="text-muted-foreground hover:text-foreground"
                        onClick={() => onEdit(text)}
                        title="Edit text"
                      >
                        <Pencil className="size-3.5" />
                        <span className="sr-only">Edit</span>
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon-xs"
                        className="text-destructive/70 hover:bg-destructive/10 hover:text-destructive"
                        onClick={() => onDelete(text)}
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
  )
}

function GenreChips({ categories, value, onChange }) {
  const selected = Array.isArray(value) ? value : []
  const selectedLower = new Set(selected.map((s) => s.toLowerCase()))

  const categoryNames = (categories || [])
    .map((c) => c.categoryName || c.name || c.categoryCode)
    .filter(Boolean)
  const suggestions = categoryNames.filter((name) => !selectedLower.has(name.toLowerCase()))

  const addOne = (name) => {
    if (!name || selectedLower.has(name.toLowerCase())) return
    onChange([...selected, name])
  }

  return (
    <div className="space-y-2">
      <TagsInput
        value={selected}
        onChange={onChange}
        placeholder="Type a genre and press Enter, or pick a suggestion below"
      />
      {categoryNames.length === 0 ? (
        <p className="text-[11px] text-muted-foreground">
          Tip: add categories to this project to get one-click genre suggestions here.
        </p>
      ) : suggestions.length > 0 ? (
        <div className="flex flex-wrap items-center gap-1.5">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
            From categories:
          </p>
          {suggestions.map((name) => (
            <button
              type="button"
              key={name}
              onClick={() => addOne(name)}
              className="inline-flex items-center gap-1 rounded-full border border-dashed border-border bg-background px-2 py-0.5 text-[11px] font-medium text-muted-foreground transition hover:border-primary/40 hover:bg-primary/5 hover:text-foreground"
            >
              <Plus className="size-3" />
              {name}
            </button>
          ))}
        </div>
      ) : (
        <p className="text-[11px] text-muted-foreground">
          All of this project's categories are already used as genres.
        </p>
      )}
    </div>
  )
}

function AudioFormSections({ form, setForm, projectCategories = [] }) {
  return (
    <>
      <Card className="border-border bg-card shadow-sm shadow-black/5">
        <CardHeader className="border-b border-border pb-4">
          <CardTitle className="text-base font-semibold">Titles</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-5 pt-5 sm:grid-cols-2">
          <div className="space-y-1.5 sm:col-span-2">
            <Label htmlFor="fullName">Full Name</Label>
            <Input id="fullName" value={form.fullName} onChange={(e) => setForm({ ...form, fullName: e.target.value })} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="originTitle">Origin Title</Label>
            <Input id="originTitle" value={form.originTitle} onChange={(e) => setForm({ ...form, originTitle: e.target.value })} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="alterTitle">Alternate Title</Label>
            <Input id="alterTitle" value={form.alterTitle} onChange={(e) => setForm({ ...form, alterTitle: e.target.value })} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="centralKurdishTitle">Central Kurdish Title</Label>
            <Input id="centralKurdishTitle" value={form.centralKurdishTitle} onChange={(e) => setForm({ ...form, centralKurdishTitle: e.target.value })} dir="rtl" />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="romanizedTitle">Romanized Title</Label>
            <Input id="romanizedTitle" value={form.romanizedTitle} onChange={(e) => setForm({ ...form, romanizedTitle: e.target.value })} />
          </div>
        </CardContent>
      </Card>

      <Card className="border-border bg-card shadow-sm shadow-black/5">
        <CardHeader className="border-b border-border pb-4">
          <CardTitle className="text-base font-semibold">Description</CardTitle>
          <CardDescription className="text-xs">Abstract and full description.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-5 pt-5 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="abstractText">Abstract</Label>
            <textarea id="abstractText" className={TEXTAREA_CLASS} value={form.abstractText} onChange={(e) => setForm({ ...form, abstractText: e.target.value })} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="description">Description</Label>
            <textarea id="description" className={TEXTAREA_CLASS} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
          </div>
        </CardContent>
      </Card>

      <Card className="border-border bg-card shadow-sm shadow-black/5">
        <CardHeader className="border-b border-border pb-4">
          <CardTitle className="text-base font-semibold">Music & Form</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-5 pt-5 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="form">Form</Label>
            <Input id="form" value={form.form} onChange={(e) => setForm({ ...form, form: e.target.value })} />
          </div>
          <div className="space-y-1.5 sm:col-span-2">
            <Label>
              Genres{' '}
              <span className="font-normal text-muted-foreground">
                (pick from this project's categories)
              </span>
            </Label>
            <GenreChips
              categories={projectCategories}
              value={form.genre}
              onChange={(next) => setForm({ ...form, genre: next })}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="typeOfBasta">Type of Basta</Label>
            <Input id="typeOfBasta" value={form.typeOfBasta} onChange={(e) => setForm({ ...form, typeOfBasta: e.target.value })} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="typeOfMaqam">Type of Maqam</Label>
            <Input id="typeOfMaqam" value={form.typeOfMaqam} onChange={(e) => setForm({ ...form, typeOfMaqam: e.target.value })} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="typeOfComposition">Type of Composition</Label>
            <Input id="typeOfComposition" value={form.typeOfComposition} onChange={(e) => setForm({ ...form, typeOfComposition: e.target.value })} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="typeOfPerformance">Type of Performance</Label>
            <Input id="typeOfPerformance" value={form.typeOfPerformance} onChange={(e) => setForm({ ...form, typeOfPerformance: e.target.value })} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="poet">Poet</Label>
            <Input id="poet" value={form.poet} onChange={(e) => setForm({ ...form, poet: e.target.value })} />
          </div>
          <div className="space-y-1.5 sm:col-span-2">
            <Label htmlFor="lyrics">Lyrics</Label>
            <textarea id="lyrics" className={TEXTAREA_CLASS} value={form.lyrics} onChange={(e) => setForm({ ...form, lyrics: e.target.value })} />
          </div>
        </CardContent>
      </Card>

      <Card className="border-border bg-card shadow-sm shadow-black/5">
        <CardHeader className="border-b border-border pb-4">
          <CardTitle className="text-base font-semibold">Credits</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-5 pt-5 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="speaker">Speaker</Label>
            <Input id="speaker" value={form.speaker} onChange={(e) => setForm({ ...form, speaker: e.target.value })} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="producer">Producer</Label>
            <Input id="producer" value={form.producer} onChange={(e) => setForm({ ...form, producer: e.target.value })} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="composer">Composer</Label>
            <Input id="composer" value={form.composer} onChange={(e) => setForm({ ...form, composer: e.target.value })} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="contributors">Contributors</Label>
            <TagsInput id="contributors" value={form.contributors} onChange={(next) => setForm({ ...form, contributors: next })} placeholder="Name, role…" />
          </div>
        </CardContent>
      </Card>

      <Card className="border-border bg-card shadow-sm shadow-black/5">
        <CardHeader className="border-b border-border pb-4">
          <CardTitle className="text-base font-semibold">Context</CardTitle>
          <CardDescription className="text-xs">Language, recording location, and dates.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-5 pt-5 sm:grid-cols-3">
          <div className="space-y-1.5">
            <Label htmlFor="language">Language</Label>
            <Input id="language" value={form.language} onChange={(e) => setForm({ ...form, language: e.target.value })} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="dialect">Dialect</Label>
            <Input id="dialect" value={form.dialect} onChange={(e) => setForm({ ...form, dialect: e.target.value })} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="audience">Audience</Label>
            <Input id="audience" value={form.audience} onChange={(e) => setForm({ ...form, audience: e.target.value })} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="recordingVenue">Recording Venue</Label>
            <Input id="recordingVenue" value={form.recordingVenue} onChange={(e) => setForm({ ...form, recordingVenue: e.target.value })} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="city">City</Label>
            <Input id="city" value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="region">Region</Label>
            <Input id="region" value={form.region} onChange={(e) => setForm({ ...form, region: e.target.value })} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="dateCreated">Date Created</Label>
            <Input id="dateCreated" type="date" value={form.dateCreated} onChange={(e) => setForm({ ...form, dateCreated: e.target.value })} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="datePublished">Date Published</Label>
            <Input id="datePublished" type="date" value={form.datePublished} onChange={(e) => setForm({ ...form, datePublished: e.target.value })} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="dateModified">Date Modified</Label>
            <Input id="dateModified" type="date" value={form.dateModified} onChange={(e) => setForm({ ...form, dateModified: e.target.value })} />
          </div>
        </CardContent>
      </Card>

      <Card className="border-border bg-card shadow-sm shadow-black/5">
        <CardHeader className="border-b border-border pb-4">
          <CardTitle className="text-base font-semibold">Tags & Keywords</CardTitle>
          <CardDescription className="text-xs">Discovery tags and keywords for researchers.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-5 pt-5 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="audioTags">Tags</Label>
            <TagsInput id="audioTags" value={form.tags} onChange={(next) => setForm({ ...form, tags: next })} placeholder="folk, 1962…" />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="audioKeywords">Keywords</Label>
            <TagsInput id="audioKeywords" value={form.keywords} onChange={(next) => setForm({ ...form, keywords: next })} placeholder="maqam, lament…" />
          </div>
        </CardContent>
      </Card>

      <Card className="border-border bg-card shadow-sm shadow-black/5">
        <CardHeader className="border-b border-border pb-4">
          <CardTitle className="text-base font-semibold">Archival</CardTitle>
          <CardDescription className="text-xs">Physical copy availability, archive location, and digitization details.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-5 pt-5 sm:grid-cols-2">
          <div className="flex items-center gap-2 sm:col-span-2">
            <input
              id="physicalAvailability"
              type="checkbox"
              checked={Boolean(form.physicalAvailability)}
              onChange={(e) => setForm({ ...form, physicalAvailability: e.target.checked })}
              className="size-4 rounded border-input"
            />
            <Label htmlFor="physicalAvailability" className="cursor-pointer">
              A physical copy is available
            </Label>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="physicalLabel">Physical Label</Label>
            <Input id="physicalLabel" value={form.physicalLabel} onChange={(e) => setForm({ ...form, physicalLabel: e.target.value })} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="locationArchive">Archive Location</Label>
            <Input id="locationArchive" value={form.locationArchive} onChange={(e) => setForm({ ...form, locationArchive: e.target.value })} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="degitizedBy">Digitized By</Label>
            <Input id="degitizedBy" value={form.degitizedBy} onChange={(e) => setForm({ ...form, degitizedBy: e.target.value })} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="degitizationEquipment">Digitization Equipment</Label>
            <Input id="degitizationEquipment" value={form.degitizationEquipment} onChange={(e) => setForm({ ...form, degitizationEquipment: e.target.value })} />
          </div>
        </CardContent>
      </Card>

      <Card className="border-border bg-card shadow-sm shadow-black/5">
        <CardHeader className="border-b border-border pb-4">
          <CardTitle className="text-base font-semibold">Technical</CardTitle>
          <CardDescription className="text-xs">Channel, bit-rate, sample-rate, etc. — extension and file size auto-fill from the picked file.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-5 pt-5 sm:grid-cols-3">
          <div className="space-y-1.5">
            <Label htmlFor="audioChannel">Channel</Label>
            <Input id="audioChannel" value={form.audioChannel} onChange={(e) => setForm({ ...form, audioChannel: e.target.value })} placeholder="Mono, Stereo…" />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="fileExtension">File Extension</Label>
            <Input id="fileExtension" value={form.fileExtension} onChange={(e) => setForm({ ...form, fileExtension: e.target.value })} placeholder="auto-filled from file (wav, mp3…)" />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="fileSize">File Size</Label>
            <Input id="fileSize" value={form.fileSize} onChange={(e) => setForm({ ...form, fileSize: e.target.value })} placeholder="auto-filled from file (e.g. 45.2 MB)" />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="bitRate">Bit Rate</Label>
            <Input id="bitRate" value={form.bitRate} onChange={(e) => setForm({ ...form, bitRate: e.target.value })} placeholder="e.g. 320 kbps" />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="bitDepth">Bit Depth</Label>
            <Input id="bitDepth" value={form.bitDepth} onChange={(e) => setForm({ ...form, bitDepth: e.target.value })} placeholder="e.g. 24-bit" />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="sampleRate">Sample Rate</Label>
            <Input id="sampleRate" value={form.sampleRate} onChange={(e) => setForm({ ...form, sampleRate: e.target.value })} placeholder="e.g. 48 kHz" />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="audioQualityOutOf10">Quality (0–10)</Label>
            <Input id="audioQualityOutOf10" type="number" min="0" max="10" step="1" value={form.audioQualityOutOf10} onChange={(e) => setForm({ ...form, audioQualityOutOf10: e.target.value })} />
          </div>
        </CardContent>
      </Card>

      <Card className="border-border bg-card shadow-sm shadow-black/5">
        <CardHeader className="border-b border-border pb-4">
          <CardTitle className="text-base font-semibold">Storage</CardTitle>
          <CardDescription className="text-xs">Volume, directory, and file paths.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-5 pt-5 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="volumeName">Volume</Label>
            <Input id="volumeName" value={form.volumeName} onChange={(e) => setForm({ ...form, volumeName: e.target.value })} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="directoryName">Directory</Label>
            <Input id="directoryName" value={form.directoryName} onChange={(e) => setForm({ ...form, directoryName: e.target.value })} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="pathInExternal">External Path</Label>
            <Input id="pathInExternal" value={form.pathInExternal} onChange={(e) => setForm({ ...form, pathInExternal: e.target.value })} placeholder="auto-filled from file" />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="autoPath">Auto Path</Label>
            <Input id="autoPath" value={form.autoPath} onChange={(e) => setForm({ ...form, autoPath: e.target.value })} placeholder="auto-filled from file" />
          </div>
          <div className="space-y-1.5 sm:col-span-2">
            <Label htmlFor="audioFileNote">File Note</Label>
            <textarea id="audioFileNote" className={TEXTAREA_CLASS} value={form.audioFileNote} onChange={(e) => setForm({ ...form, audioFileNote: e.target.value })} />
          </div>
        </CardContent>
      </Card>

      <Card className="border-border bg-card shadow-sm shadow-black/5">
        <CardHeader className="border-b border-border pb-4">
          <CardTitle className="text-base font-semibold">Rights & Provenance</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-5 pt-5 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="copyright">Copyright</Label>
            <Input id="copyright" value={form.copyright} onChange={(e) => setForm({ ...form, copyright: e.target.value })} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="rightOwner">Right Owner</Label>
            <Input id="rightOwner" value={form.rightOwner} onChange={(e) => setForm({ ...form, rightOwner: e.target.value })} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="dateCopyrighted">Date Copyrighted</Label>
            <Input id="dateCopyrighted" type="date" value={form.dateCopyrighted} onChange={(e) => setForm({ ...form, dateCopyrighted: e.target.value })} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="availability">Availability</Label>
            <Input id="availability" value={form.availability} onChange={(e) => setForm({ ...form, availability: e.target.value })} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="licenseType">License Type</Label>
            <Input id="licenseType" value={form.licenseType} onChange={(e) => setForm({ ...form, licenseType: e.target.value })} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="usageRights">Usage Rights</Label>
            <Input id="usageRights" value={form.usageRights} onChange={(e) => setForm({ ...form, usageRights: e.target.value })} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="owner">Owner</Label>
            <Input id="owner" value={form.owner} onChange={(e) => setForm({ ...form, owner: e.target.value })} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="publisher">Publisher</Label>
            <Input id="publisher" value={form.publisher} onChange={(e) => setForm({ ...form, publisher: e.target.value })} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="provenance">Provenance</Label>
            <Input id="provenance" value={form.provenance} onChange={(e) => setForm({ ...form, provenance: e.target.value })} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="accrualMethod">Accrual Method</Label>
            <Input id="accrualMethod" value={form.accrualMethod} onChange={(e) => setForm({ ...form, accrualMethod: e.target.value })} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="lccClassification">LCC Classification</Label>
            <Input id="lccClassification" value={form.lccClassification} onChange={(e) => setForm({ ...form, lccClassification: e.target.value })} />
          </div>
          <div className="space-y-1.5 sm:col-span-2">
            <Label htmlFor="archiveLocalNote">Archive Local Note</Label>
            <textarea id="archiveLocalNote" className={TEXTAREA_CLASS} value={form.archiveLocalNote} onChange={(e) => setForm({ ...form, archiveLocalNote: e.target.value })} />
          </div>
        </CardContent>
      </Card>
    </>
  )
}

export { EmployeeProjectDetailPage }
