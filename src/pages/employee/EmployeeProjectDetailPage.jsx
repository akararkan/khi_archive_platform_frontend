import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useLocation, useNavigate, useParams } from 'react-router-dom'
import {
  ArrowDownAZ,
  ArrowLeft,
  ArrowUpAZ,
  AudioLines,
  CheckCircle2,
  Eye,
  EyeOff,
  FileAudio,
  FileText,
  FolderOpen,
  Globe,
  Image as ImageIcon,
  Loader2,
  Pencil,
  Plus,
  Trash2,
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
import { Select } from '@/components/ui/select'
import { FolderSourcePicker } from '@/components/ui/folder-source-picker'
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
import { FieldHelpButton } from '@/components/ui/field-help'
import { getAudioFieldMetadata } from '@/lib/audio-fields-metadata'
import { getVideoFieldMetadata } from '@/lib/video-fields-metadata'
import { getImageFieldMetadata } from '@/lib/image-fields-metadata'
import { getTextFieldMetadata } from '@/lib/text-fields-metadata'
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
import { useToast } from '@/hooks/use-toast'
import { FormErrorBox } from '@/components/ui/form-error'
import { SingleMediaFilePicker } from '@/components/ui/single-media-file-picker'
import { formatApiError, getErrorMessage, isStaleVersionError } from '@/lib/get-error-message'
import { cn } from '@/lib/utils'
import { parseFileSourcePath, isElectronRuntime } from '@/lib/file-source-path'
import {
  createAudio, deleteAudio, getAudios, searchAudios, updateAudio,
} from '@/services/audio'
import { getProject } from '@/services/project'
import {
  createVideo, deleteVideo, getVideos, searchVideos, updateVideo,
} from '@/services/video'
import {
  createImage, deleteImage, getImages, searchImages, updateImage,
} from '@/services/image'
import {
  createText, deleteText, getTexts, searchTexts, updateText,
} from '@/services/text'
import {
  AUDIO_VERSIONS, buildAudioPayload, createInitialAudioForm,
  deriveAudioAutoFieldsFromFile, populateAudioFormFromAudio,
} from '@/lib/audio-form'
import {
  VIDEO_VERSIONS, buildVideoPayload, createInitialVideoForm,
  deriveVideoAutoFieldsFromFile, populateVideoFormFromVideo,
} from '@/lib/video-form'
import {
  IMAGE_VERSIONS, buildImagePayload, createInitialImageForm,
  deriveImageAutoFieldsFromFile, populateImageFormFromImage,
} from '@/lib/image-form'
import {
  TEXT_VERSIONS, buildTextPayload, createInitialTextForm,
  deriveTextAutoFieldsFromFile, populateTextFormFromText,
} from '@/lib/text-form'
import {
  audioMetadataToForm, extractAudioMetadata,
  extractImageMetadata, extractTextMetadata, extractVideoMetadata,
  imageMetadataToForm, textMetadataToForm, videoMetadataToForm,
} from '@/lib/media-metadata'

// ── File type guards ──────────────────────────────────────────────────────────

const AUDIO_FILE_PATTERN = /\.(wav|mp3|flac|ogg|m4a|aac|aiff|aif|wma|opus)$/i
const VIDEO_FILE_PATTERN = /\.(mp4|mov|mkv|webm|avi|m4v|mpg|mpeg|wmv|flv|3gp|ogv)$/i
const IMAGE_FILE_PATTERN = /\.(jpe?g|png|gif|tiff?|bmp|webp|heic|heif|raw|cr2|cr3|nef|arw|dng|svg)$/i
const TEXT_FILE_PATTERN  = /\.(pdf|docx?|odt|rtf|txt|md|tex|epub|mobi|xml|html?|csv|tsv)$/i

const isAudioFile = (f) => Boolean((f.type && f.type.startsWith('audio/')) || AUDIO_FILE_PATTERN.test(f.name))
const isVideoFile = (f) => Boolean((f.type && f.type.startsWith('video/')) || VIDEO_FILE_PATTERN.test(f.name))
const isImageFile = (f) => Boolean((f.type && f.type.startsWith('image/')) || IMAGE_FILE_PATTERN.test(f.name))
const isTextFile  = (f) => Boolean(
  TEXT_FILE_PATTERN.test(f.name) ||
  (f.type && (f.type.startsWith('text/') || f.type === 'application/pdf' || f.type.includes('word') || f.type.includes('opendocument'))),
)

// ── Path auto-fill helper ─────────────────────────────────────────────────────

/**
 * Extract storage metadata fields from a File object.
 *
 * Returns a partial form object that can be merged via mergeAutoFilled().
 * Fields are only set when the runtime actually provides the information:
 *   • Electron:            volumeName + directoryName + pathInExternal + autoPath
 *   • Browser folder pick: directoryName + pathInExternal + autoPath  (no volume)
 *   • Browser file pick:   {}  (nothing — browser hides the path)
 *
 * @param {File} file
 * @param {string} [existingDir] – if already set in the form, used to build
 *   externalPath in plain-browser mode when webkitRelativePath is absent.
 * @returns {Record<string, string>}
 */
function buildPathAutoFields(file, existingDir = '') {
  const { volumeName, directoryName, externalPath, autoPath } = parseFileSourcePath(file)

  const fields = {}

  if (volumeName)    fields.volumeName     = volumeName
  if (directoryName) fields.directoryName  = directoryName

  if (externalPath) {
    // Electron or webkitdirectory: full relative/absolute path known.
    fields.pathInExternal = externalPath
    fields.autoPath       = autoPath
  } else if (!externalPath && existingDir && file.name) {
    // Plain browser picker: the user already selected the source folder earlier
    // (via FolderSourcePicker) so we can construct the path from it.
    const constructed = `${existingDir}/${file.name}`
    fields.pathInExternal = constructed
    fields.autoPath       = constructed
  }

  return fields
}

// ── Form merge helper ─────────────────────────────────────────────────────────

/**
 * Only overwrite a field when it is still blank OR its value matches what
 * a previous auto-fill pass wrote — preserving any manual edits.
 */
function mergeAutoFilled(prev, newAuto, previousAuto) {
  const next = { ...prev }
  for (const [key, newValue] of Object.entries(newAuto)) {
    const isArr = Array.isArray(newValue)
    const prevValue = prev[key]
    const wasEmpty = isArr
      ? !Array.isArray(prevValue) || prevValue.length === 0
      : !prevValue
    const previousAutoValue = previousAuto?.[key]
    const matchesPreviousAuto =
      previousAutoValue !== undefined &&
      previousAutoValue !== '' &&
      JSON.stringify(prevValue) === JSON.stringify(previousAutoValue)
    if (wasEmpty || matchesPreviousAuto) {
      next[key] = isArr ? newValue : (newValue || '')
    }
  }
  return next
}

const TEXTAREA_CLASS =
  'min-h-[96px] w-full resize-y rounded-lg border border-input bg-background px-3 py-2 text-sm shadow-sm transition-colors placeholder:text-muted-foreground/70 focus-visible:border-ring focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/30'

// ─────────────────────────────────────────────────────────────────────────────
// Page component
// ─────────────────────────────────────────────────────────────────────────────

function EmployeeProjectDetailPage() {
  const { code: projectCode } = useParams()
  const toast   = useToast()
  const navigate = useNavigate()
  const location = useLocation()

  const sectionBase = location.pathname.startsWith('/admin') ? '/admin' : '/employee'

  const [project,   setProject]   = useState(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error,     setError]     = useState('')

  const [mediaType, setMediaType] = useState('audio')

  // ── Audio ──────────────────────────────────────────────────────────────────
  const [audios,          setAudios]          = useState([])
  const [isLoadingAudios, setIsLoadingAudios] = useState(false)
  const [currentAudio,    setCurrentAudio]    = useState(null)
  const [form,            setForm]            = useState(createInitialAudioForm)
  const [audioFile,       setAudioFile]       = useState(null)

  // ── Video ──────────────────────────────────────────────────────────────────
  const [videos,          setVideos]          = useState([])
  const [isLoadingVideos, setIsLoadingVideos] = useState(false)
  const [currentVideo,    setCurrentVideo]    = useState(null)
  const [videoForm,       setVideoForm]       = useState(createInitialVideoForm)
  const [videoFile,       setVideoFile]       = useState(null)

  // ── Image ──────────────────────────────────────────────────────────────────
  const [images,          setImages]          = useState([])
  const [isLoadingImages, setIsLoadingImages] = useState(false)
  const [currentImage,    setCurrentImage]    = useState(null)
  const [imageForm,       setImageForm]       = useState(createInitialImageForm)
  const [imageFile,       setImageFile]       = useState(null)

  // ── Text ───────────────────────────────────────────────────────────────────
  const [texts,          setTexts]          = useState([])
  const [isLoadingTexts, setIsLoadingTexts] = useState(false)
  const [currentText,    setCurrentText]    = useState(null)
  const [textForm,       setTextForm]       = useState(createInitialTextForm)
  const [textFile,       setTextFile]       = useState(null)

  // ── Shared form state ──────────────────────────────────────────────────────
  const [view,             setView]             = useState('list')
  const [isSaving,         setIsSaving]         = useState(false)
  const [formError,        setFormError]        = useState('')
  const [savedThisSession, setSavedThisSession] = useState([])
  const submitModeRef    = useRef('finish')
  const [pendingSubmitMode, setPendingSubmitMode] = useState('finish')
  const lastAutoFilledRef  = useRef({})
  const metaSessionRef     = useRef(0)

  // ── Audio search/filter/sort ───────────────────────────────────────────────
  const [searchTerm,         setSearchTerm]         = useState('')
  const [audioSearchResults, setAudioSearchResults] = useState(null)
  const [isAudioSearching,   setIsAudioSearching]   = useState(false)
  const [detailsTarget,      setDetailsTarget]      = useState(null)
  const [deleteTarget,       setDeleteTarget]       = useState(null)
  const [isDeleting,         setIsDeleting]         = useState(false)
  const [audioSortKey,       setAudioSortKey]       = useState(DEFAULT_AUDIO_SORT_KEY)
  const [audioFilters,       setAudioFilters]       = useState(createInitialAudioFilters)
  const [isAudioFilterPanelOpen, setIsAudioFilterPanelOpen] = useState(false)

  // ── Video search/filter/sort ───────────────────────────────────────────────
  const [videoSearchTerm,         setVideoSearchTerm]         = useState('')
  const [videoSearchResults,      setVideoSearchResults]      = useState(null)
  const [isVideoSearching,        setIsVideoSearching]        = useState(false)
  const [videoDetailsTarget,      setVideoDetailsTarget]      = useState(null)
  const [videoDeleteTarget,       setVideoDeleteTarget]       = useState(null)
  const [isVideoDeleting,         setIsVideoDeleting]         = useState(false)
  const [savedVideosThisSession,  setSavedVideosThisSession]  = useState([])
  const [videoSortKey,            setVideoSortKey]            = useState(DEFAULT_VIDEO_SORT_KEY)
  const [videoFilters,            setVideoFilters]            = useState(createInitialVideoFilters)
  const [isVideoFilterPanelOpen,  setIsVideoFilterPanelOpen]  = useState(false)

  // ── Image search/filter/sort ───────────────────────────────────────────────
  const [imageSearchTerm,         setImageSearchTerm]         = useState('')
  const [imageSearchResults,      setImageSearchResults]      = useState(null)
  const [isImageSearching,        setIsImageSearching]        = useState(false)
  const [imageDetailsTarget,      setImageDetailsTarget]      = useState(null)
  const [imageDeleteTarget,       setImageDeleteTarget]       = useState(null)
  const [isImageDeleting,         setIsImageDeleting]         = useState(false)
  const [savedImagesThisSession,  setSavedImagesThisSession]  = useState([])
  const [imageSortKey,            setImageSortKey]            = useState(DEFAULT_IMAGE_SORT_KEY)
  const [imageFilters,            setImageFilters]            = useState(createInitialImageFilters)
  const [isImageFilterPanelOpen,  setIsImageFilterPanelOpen]  = useState(false)

  // ── Text search/filter/sort ────────────────────────────────────────────────
  const [textSearchTerm,         setTextSearchTerm]         = useState('')
  const [textSearchResults,      setTextSearchResults]      = useState(null)
  const [isTextSearching,        setIsTextSearching]        = useState(false)
  const [textDetailsTarget,      setTextDetailsTarget]      = useState(null)
  const [textDeleteTarget,       setTextDeleteTarget]       = useState(null)
  const [isTextDeleting,         setIsTextDeleting]         = useState(false)
  const [savedTextsThisSession,  setSavedTextsThisSession]  = useState([])
  const [textSortKey,            setTextSortKey]            = useState(DEFAULT_TEXT_SORT_KEY)
  const [textFilters,            setTextFilters]            = useState(createInitialTextFilters)
  const [isTextFilterPanelOpen,  setIsTextFilterPanelOpen]  = useState(false)

  // ── Data loaders ───────────────────────────────────────────────────────────

  const loadProject = useCallback(async () => {
    setIsLoading(true); setError('')
    try { setProject(await getProject(projectCode)) }
    catch (err) { setError(getErrorMessage(err, 'Failed to load project.')) }
    finally { setIsLoading(false) }
  }, [projectCode])

  const loadAudios = useCallback(async () => {
    setIsLoadingAudios(true)
    try { const all = await getAudios(); setAudios((all || []).filter((a) => a.projectCode === projectCode)) }
    catch (err) { toast.apiError(err, 'Could not load audios') }
    finally { setIsLoadingAudios(false) }
  }, [projectCode, toast])

  const loadVideos = useCallback(async () => {
    setIsLoadingVideos(true)
    try { const all = await getVideos(); setVideos((all || []).filter((v) => v.projectCode === projectCode)) }
    catch (err) { toast.apiError(err, 'Could not load videos') }
    finally { setIsLoadingVideos(false) }
  }, [projectCode, toast])

  const loadImages = useCallback(async () => {
    setIsLoadingImages(true)
    try { const all = await getImages(); setImages((all || []).filter((i) => i.projectCode === projectCode)) }
    catch (err) { toast.apiError(err, 'Could not load images') }
    finally { setIsLoadingImages(false) }
  }, [projectCode, toast])

  const loadTexts = useCallback(async () => {
    setIsLoadingTexts(true)
    try { const all = await getTexts(); setTexts((all || []).filter((t) => t.projectCode === projectCode)) }
    catch (err) { toast.apiError(err, 'Could not load texts') }
    finally { setIsLoadingTexts(false) }
  }, [projectCode, toast])

  useEffect(() => {
    loadProject(); loadAudios(); loadVideos(); loadImages(); loadTexts()
  }, [loadProject, loadAudios, loadVideos, loadImages, loadTexts])

  // ── Derived lists ──────────────────────────────────────────────────────────

  const visibleAudios = audios
  const audioFiltersActive = useMemo(() => !isAudioFilterEmpty(audioFilters), [audioFilters])
  const audioSortActive    = audioSortKey !== DEFAULT_AUDIO_SORT_KEY
  const audioFilterCount   = useMemo(() => countAudioFilters(audioFilters), [audioFilters])
  const activeAudioSort    = useMemo(() => AUDIO_SORT_OPTIONS.find((o) => o.key === audioSortKey) ?? AUDIO_SORT_OPTIONS[0], [audioSortKey])
  const filteredAudios     = useMemo(() => {
    const term = searchTerm.trim()
    if (term) { if (!audioSearchResults) return []; return audioSearchResults.filter((a) => !a.projectCode || a.projectCode === projectCode) }
    return applyAudioSort(applyAudioFilters(visibleAudios, audioFilters), audioSortKey)
  }, [visibleAudios, searchTerm, audioSearchResults, projectCode, audioFilters, audioSortKey])

  const updateAudioFilter = useCallback((k, v) => setAudioFilters((p) => ({ ...p, [k]: v })), [])
  const clearAudioFilters = useCallback(() => setAudioFilters(createInitialAudioFilters()), [])
  const audioChips = useMemo(() => buildAudioChips({ filters: audioFilters, sortKey: audioSortKey, sortLabel: audioSortActive ? activeAudioSort.label : null, onClearSort: () => setAudioSortKey(DEFAULT_AUDIO_SORT_KEY), updateFilter: updateAudioFilter }), [audioFilters, audioSortKey, audioSortActive, activeAudioSort, updateAudioFilter])

  const visibleVideos   = videos
  const videoFiltersActive = useMemo(() => !isVideoFilterEmpty(videoFilters), [videoFilters])
  const videoSortActive    = videoSortKey !== DEFAULT_VIDEO_SORT_KEY
  const videoFilterCount   = useMemo(() => countVideoFilters(videoFilters), [videoFilters])
  const activeVideoSort    = useMemo(() => VIDEO_SORT_OPTIONS.find((o) => o.key === videoSortKey) ?? VIDEO_SORT_OPTIONS[0], [videoSortKey])
  const filteredVideos     = useMemo(() => {
    const term = videoSearchTerm.trim()
    if (term) { if (!videoSearchResults) return []; return videoSearchResults.filter((v) => !v.projectCode || v.projectCode === projectCode) }
    return applyVideoSort(applyVideoFilters(visibleVideos, videoFilters), videoSortKey)
  }, [visibleVideos, videoSearchTerm, videoSearchResults, projectCode, videoFilters, videoSortKey])

  const updateVideoFilter = useCallback((k, v) => setVideoFilters((p) => ({ ...p, [k]: v })), [])
  const clearVideoFilters = useCallback(() => setVideoFilters(createInitialVideoFilters()), [])
  const videoChips = useMemo(() => buildVideoChips({ filters: videoFilters, sortKey: videoSortKey, sortLabel: videoSortActive ? activeVideoSort.label : null, onClearSort: () => setVideoSortKey(DEFAULT_VIDEO_SORT_KEY), updateFilter: updateVideoFilter }), [videoFilters, videoSortKey, videoSortActive, activeVideoSort, updateVideoFilter])

  const visibleImages   = images
  const imageFiltersActive = useMemo(() => !isImageFilterEmpty(imageFilters), [imageFilters])
  const imageSortActive    = imageSortKey !== DEFAULT_IMAGE_SORT_KEY
  const imageFilterCount   = useMemo(() => countImageFilters(imageFilters), [imageFilters])
  const activeImageSort    = useMemo(() => IMAGE_SORT_OPTIONS.find((o) => o.key === imageSortKey) ?? IMAGE_SORT_OPTIONS[0], [imageSortKey])
  const filteredImages     = useMemo(() => {
    const term = imageSearchTerm.trim()
    if (term) { if (!imageSearchResults) return []; return imageSearchResults.filter((i) => !i.projectCode || i.projectCode === projectCode) }
    return applyImageSort(applyImageFilters(visibleImages, imageFilters), imageSortKey)
  }, [visibleImages, imageSearchTerm, imageSearchResults, projectCode, imageFilters, imageSortKey])

  const updateImageFilter = useCallback((k, v) => setImageFilters((p) => ({ ...p, [k]: v })), [])
  const clearImageFilters = useCallback(() => setImageFilters(createInitialImageFilters()), [])
  const imageChips = useMemo(() => buildImageChips({ filters: imageFilters, sortKey: imageSortKey, sortLabel: imageSortActive ? activeImageSort.label : null, onClearSort: () => setImageSortKey(DEFAULT_IMAGE_SORT_KEY), updateFilter: updateImageFilter }), [imageFilters, imageSortKey, imageSortActive, activeImageSort, updateImageFilter])

  const visibleTexts    = texts
  const textFiltersActive = useMemo(() => !isTextFilterEmpty(textFilters), [textFilters])
  const textSortActive    = textSortKey !== DEFAULT_TEXT_SORT_KEY
  const textFilterCount   = useMemo(() => countTextFilters(textFilters), [textFilters])
  const activeTextSort    = useMemo(() => TEXT_SORT_OPTIONS.find((o) => o.key === textSortKey) ?? TEXT_SORT_OPTIONS[0], [textSortKey])
  const filteredTexts     = useMemo(() => {
    const term = textSearchTerm.trim()
    if (term) { if (!textSearchResults) return []; return textSearchResults.filter((t) => !t.projectCode || t.projectCode === projectCode) }
    return applyTextSort(applyTextFilters(visibleTexts, textFilters), textSortKey)
  }, [visibleTexts, textSearchTerm, textSearchResults, projectCode, textFilters, textSortKey])

  const updateTextFilter = useCallback((k, v) => setTextFilters((p) => ({ ...p, [k]: v })), [])
  const clearTextFilters = useCallback(() => setTextFilters(createInitialTextFilters()), [])
  const textChips = useMemo(() => buildTextChips({ filters: textFilters, sortKey: textSortKey, sortLabel: textSortActive ? activeTextSort.label : null, onClearSort: () => setTextSortKey(DEFAULT_TEXT_SORT_KEY), updateFilter: updateTextFilter }), [textFilters, textSortKey, textSortActive, activeTextSort, updateTextFilter])

  // ── Debounced search effects ───────────────────────────────────────────────

  useEffect(() => {
    const term = searchTerm.trim()
    if (!term) { setAudioSearchResults(null); setIsAudioSearching(false); return }
    const ctrl = new AbortController()
    const t = setTimeout(async () => {
      setIsAudioSearching(true)
      try { const d = await searchAudios(term, { limit: 50, projectCode, signal: ctrl.signal }); if (!ctrl.signal.aborted) setAudioSearchResults(d || []) }
      catch { if (!ctrl.signal.aborted) setAudioSearchResults([]) }
      finally { if (!ctrl.signal.aborted) setIsAudioSearching(false) }
    }, 220)
    return () => { clearTimeout(t); ctrl.abort() }
  }, [searchTerm, projectCode])

  useEffect(() => {
    const term = videoSearchTerm.trim()
    if (!term) { setVideoSearchResults(null); setIsVideoSearching(false); return }
    const ctrl = new AbortController()
    const t = setTimeout(async () => {
      setIsVideoSearching(true)
      try { const d = await searchVideos(term, { limit: 50, projectCode, signal: ctrl.signal }); if (!ctrl.signal.aborted) setVideoSearchResults(d || []) }
      catch { if (!ctrl.signal.aborted) setVideoSearchResults([]) }
      finally { if (!ctrl.signal.aborted) setIsVideoSearching(false) }
    }, 220)
    return () => { clearTimeout(t); ctrl.abort() }
  }, [videoSearchTerm, projectCode])

  useEffect(() => {
    const term = imageSearchTerm.trim()
    if (!term) { setImageSearchResults(null); setIsImageSearching(false); return }
    const ctrl = new AbortController()
    const t = setTimeout(async () => {
      setIsImageSearching(true)
      try { const d = await searchImages(term, { limit: 50, projectCode, signal: ctrl.signal }); if (!ctrl.signal.aborted) setImageSearchResults(d || []) }
      catch { if (!ctrl.signal.aborted) setImageSearchResults([]) }
      finally { if (!ctrl.signal.aborted) setIsImageSearching(false) }
    }, 220)
    return () => { clearTimeout(t); ctrl.abort() }
  }, [imageSearchTerm, projectCode])

  useEffect(() => {
    const term = textSearchTerm.trim()
    if (!term) { setTextSearchResults(null); setIsTextSearching(false); return }
    const ctrl = new AbortController()
    const t = setTimeout(async () => {
      setIsTextSearching(true)
      try { const d = await searchTexts(term, { limit: 50, projectCode, signal: ctrl.signal }); if (!ctrl.signal.aborted) setTextSearchResults(d || []) }
      catch { if (!ctrl.signal.aborted) setTextSearchResults([]) }
      finally { if (!ctrl.signal.aborted) setIsTextSearching(false) }
    }, 220)
    return () => { clearTimeout(t); ctrl.abort() }
  }, [textSearchTerm, projectCode])

  // ── Audio handlers ─────────────────────────────────────────────────────────

  const handleOpenCreateAudio = () => {
    setCurrentAudio(null); setForm(createInitialAudioForm()); setAudioFile(null)
    setFormError(''); setSavedThisSession([])
    submitModeRef.current = 'finish'; setPendingSubmitMode('finish')
    lastAutoFilledRef.current = {}; setView('create')
  }

  const handleOpenEditAudio = (audio) => {
    setCurrentAudio(audio); setForm(populateAudioFormFromAudio(audio)); setAudioFile(null)
    setFormError(''); setSavedThisSession([])
    submitModeRef.current = 'finish'; setPendingSubmitMode('finish')
    lastAutoFilledRef.current = {}; setView('edit')
  }

  const handleCloseAudioForm = () => {
    setView('list'); setCurrentAudio(null); setAudioFile(null)
    setFormError(''); setSavedThisSession([]); lastAutoFilledRef.current = {}
  }

  const handleAudioFilePicked = (file) => {
    const sessionId = ++metaSessionRef.current
    if (!file) {
      const prev = lastAutoFilledRef.current
      setForm((p) => {
        const n = { ...p }
        for (const [k, v] of Object.entries(prev)) {
          if (v && JSON.stringify(p[k]) === JSON.stringify(v)) n[k] = Array.isArray(v) ? [] : ''
        }
        return n
      })
      lastAutoFilledRef.current = {}; setAudioFile(null); return
    }

    // Derive file-intrinsic fields (extension, size, etc.)
    const auto = deriveAudioAutoFieldsFromFile(file)

    // ── PATH AUTO-DETECTION ───────────────────────────────────────────────────
    // In Electron: file.path → volume + directory + external path all filled.
    // In browser with webkitdirectory: webkitRelativePath → directory + path.
    // In plain browser: nothing — fields stay blank.
    //
    // buildPathAutoFields also handles the hybrid case: if the user already
    // selected the source folder via FolderSourcePicker (directoryName set),
    // external path is constructed as "<dir>/<filename>" automatically.
    setForm((prevForm) => {
      const pathFields = buildPathAutoFields(file, prevForm.directoryName)
      const combined   = { ...auto, ...pathFields }
      const next       = mergeAutoFilled(prevForm, combined, lastAutoFilledRef.current)
      lastAutoFilledRef.current = combined
      return next
    })
    setAudioFile(file)

    // Async: read embedded ID3 metadata + playback duration.
    extractAudioMetadata(file)
      .then((meta) => {
        if (sessionId !== metaSessionRef.current) return
        const extra = audioMetadataToForm(meta)
        if (!Object.keys(extra).length) return
        setForm((p) => {
          const next = mergeAutoFilled(p, extra, lastAutoFilledRef.current)
          lastAutoFilledRef.current = { ...lastAutoFilledRef.current, ...extra }
          return next
        })
      })
      .catch(() => {})
  }

  const handleAudioSubmit = async (event) => {
    event.preventDefault(); setFormError('')
    if (!AUDIO_VERSIONS.includes((form.audioVersion || '').toUpperCase())) { setFormError('Audio version must be RAW or MASTER.'); return }
    const vn = Number(form.versionNumber)
    if (!Number.isInteger(vn) || vn < 1) { setFormError('Version number must be an integer ≥ 1.'); return }
    const cn = Number(form.copyNumber)
    if (!Number.isInteger(cn) || cn < 1) { setFormError('Copy number must be an integer ≥ 1.'); return }
    if (form.audioQualityOutOf10 !== '' && (Number.isNaN(Number(form.audioQualityOutOf10)) || Number(form.audioQualityOutOf10) < 0 || Number(form.audioQualityOutOf10) > 10)) { setFormError('Audio quality must be 0–10.'); return }
    if (view === 'create' && !audioFile) { setFormError('Please choose an audio file to upload.'); return }
    setIsSaving(true)
    try {
      if (view === 'create') {
        const saved = await createAudio(buildAudioPayload(form, projectCode), audioFile)
        toast.success('Audio created', `${saved.audioCode} added to ${projectCode}.`)
        await loadAudios()
        if (submitModeRef.current === 'add-another') {
          setSavedThisSession((p) => [...p, saved.audioCode])
          setForm((p) => ({ ...createInitialAudioForm(), audioVersion: p.audioVersion, versionNumber: p.versionNumber, copyNumber: String((Number(p.copyNumber) || 1) + 1) }))
          setAudioFile(null); setFormError(''); submitModeRef.current = 'finish'; setPendingSubmitMode('finish'); lastAutoFilledRef.current = {}
          if (typeof window !== 'undefined') window.scrollTo({ top: 0, behavior: 'smooth' }); return
        }
        handleCloseAudioForm(); return
      }
      const payload = buildAudioPayload(form, projectCode); delete payload.projectCode
      const saved = await updateAudio(currentAudio.audioCode, payload, audioFile)
      toast.success('Audio updated', `${saved.audioCode} saved.`)
      await loadAudios(); handleCloseAudioForm()
    } catch (err) {
      if (isStaleVersionError(err)) { toast.apiError(err, 'Reload required'); await loadAudios(); handleCloseAudioForm(); return }
      setFormError(formatApiError(err, 'Failed to save audio')); toast.apiError(err, 'Unable to save audio')
    } finally { setIsSaving(false) }
  }

  const handleDeleteAudio = async () => {
    if (!deleteTarget) return; setIsDeleting(true)
    try { await deleteAudio(deleteTarget.audioCode); toast.success('Sent to trash', `${deleteTarget.audioCode} can be restored from Trash.`); setDeleteTarget(null); await loadAudios() }
    catch (err) { toast.apiError(err, 'Unable to send audio to trash') }
    finally { setIsDeleting(false) }
  }

  // ── Video handlers ─────────────────────────────────────────────────────────

  const handleOpenCreateVideo = () => {
    setCurrentVideo(null); setVideoForm(createInitialVideoForm()); setVideoFile(null)
    setFormError(''); setSavedVideosThisSession([])
    submitModeRef.current = 'finish'; setPendingSubmitMode('finish'); lastAutoFilledRef.current = {}; setView('create')
  }

  const handleOpenEditVideo = (video) => {
    setCurrentVideo(video); setVideoForm(populateVideoFormFromVideo(video)); setVideoFile(null)
    setFormError(''); setSavedVideosThisSession([])
    submitModeRef.current = 'finish'; setPendingSubmitMode('finish'); lastAutoFilledRef.current = {}; setView('edit')
  }

  const handleCloseVideoForm = () => {
    setView('list'); setCurrentVideo(null); setVideoFile(null); setFormError(''); setSavedVideosThisSession([]); lastAutoFilledRef.current = {}
  }

  const handleVideoFilePicked = (file) => {
    const sessionId = ++metaSessionRef.current
    if (!file) {
      const prev = lastAutoFilledRef.current
      setVideoForm((p) => { const n = { ...p }; for (const [k, v] of Object.entries(prev)) { if (v && JSON.stringify(p[k]) === JSON.stringify(v)) n[k] = Array.isArray(v) ? [] : '' }; return n })
      lastAutoFilledRef.current = {}; setVideoFile(null); return
    }
    const auto = deriveVideoAutoFieldsFromFile(file)
    setVideoForm((prevForm) => {
      const pathFields = buildPathAutoFields(file, prevForm.directoryName)
      const combined   = { ...auto, ...pathFields }
      const next       = mergeAutoFilled(prevForm, combined, lastAutoFilledRef.current)
      lastAutoFilledRef.current = combined; return next
    })
    setVideoFile(file)
    extractVideoMetadata(file)
      .then((meta) => {
        if (sessionId !== metaSessionRef.current) return
        const extra = videoMetadataToForm(meta); if (!Object.keys(extra).length) return
        setVideoForm((p) => { const next = mergeAutoFilled(p, extra, lastAutoFilledRef.current); lastAutoFilledRef.current = { ...lastAutoFilledRef.current, ...extra }; return next })
      }).catch(() => {})
  }

  const handleVideoSubmit = async (event) => {
    event.preventDefault(); setFormError('')
    if (!VIDEO_VERSIONS.includes((videoForm.videoVersion || '').toUpperCase())) { setFormError(`Video version must be one of ${VIDEO_VERSIONS.join(', ')}.`); return }
    const vn = Number(videoForm.versionNumber); if (!Number.isInteger(vn) || vn < 1) { setFormError('Version number must be an integer ≥ 1.'); return }
    const cn = Number(videoForm.copyNumber);    if (!Number.isInteger(cn) || cn < 1) { setFormError('Copy number must be an integer ≥ 1.'); return }
    if (view === 'create' && !videoFile) { setFormError('Please choose a video file.'); return }
    setIsSaving(true)
    try {
      if (view === 'create') {
        const saved = await createVideo(buildVideoPayload(videoForm, projectCode), videoFile)
        toast.success('Video created', `${saved.videoCode} added to ${projectCode}.`)
        await loadVideos()
        if (submitModeRef.current === 'add-another') {
          setSavedVideosThisSession((p) => [...p, saved.videoCode])
          setVideoForm((p) => ({ ...createInitialVideoForm(), videoVersion: p.videoVersion, versionNumber: p.versionNumber, copyNumber: String((Number(p.copyNumber) || 1) + 1) }))
          setVideoFile(null); setFormError(''); submitModeRef.current = 'finish'; setPendingSubmitMode('finish'); lastAutoFilledRef.current = {}
          if (typeof window !== 'undefined') window.scrollTo({ top: 0, behavior: 'smooth' }); return
        }
        handleCloseVideoForm(); return
      }
      const payload = buildVideoPayload(videoForm, projectCode); delete payload.projectCode
      const saved = await updateVideo(currentVideo.videoCode, payload, videoFile)
      toast.success('Video updated', `${saved.videoCode} saved.`)
      await loadVideos(); handleCloseVideoForm()
    } catch (err) {
      if (isStaleVersionError(err)) { toast.apiError(err, 'Reload required'); await loadVideos(); handleCloseVideoForm(); return }
      setFormError(formatApiError(err, 'Failed to save video')); toast.apiError(err, 'Unable to save video')
    } finally { setIsSaving(false) }
  }

  const handleDeleteVideo = async () => {
    if (!videoDeleteTarget) return; setIsVideoDeleting(true)
    try { await deleteVideo(videoDeleteTarget.videoCode); toast.success('Sent to trash', `${videoDeleteTarget.videoCode} can be restored.`); setVideoDeleteTarget(null); await loadVideos() }
    catch (err) { toast.apiError(err, 'Unable to send video to trash') }
    finally { setIsVideoDeleting(false) }
  }

  // ── Image handlers ─────────────────────────────────────────────────────────

  const handleOpenCreateImage = () => {
    setCurrentImage(null); setImageForm(createInitialImageForm()); setImageFile(null)
    setFormError(''); setSavedImagesThisSession([])
    submitModeRef.current = 'finish'; setPendingSubmitMode('finish'); lastAutoFilledRef.current = {}; setView('create')
  }

  const handleOpenEditImage = (image) => {
    setCurrentImage(image); setImageForm(populateImageFormFromImage(image)); setImageFile(null)
    setFormError(''); setSavedImagesThisSession([])
    submitModeRef.current = 'finish'; setPendingSubmitMode('finish'); lastAutoFilledRef.current = {}; setView('edit')
  }

  const handleCloseImageForm = () => {
    setView('list'); setCurrentImage(null); setImageFile(null); setFormError(''); setSavedImagesThisSession([]); lastAutoFilledRef.current = {}
  }

  const handleImageFilePicked = (file) => {
    const sessionId = ++metaSessionRef.current
    if (!file) {
      const prev = lastAutoFilledRef.current
      setImageForm((p) => { const n = { ...p }; for (const [k, v] of Object.entries(prev)) { if (v && JSON.stringify(p[k]) === JSON.stringify(v)) n[k] = Array.isArray(v) ? [] : '' }; return n })
      lastAutoFilledRef.current = {}; setImageFile(null); return
    }
    const auto = deriveImageAutoFieldsFromFile(file)
    setImageForm((prevForm) => {
      const pathFields = buildPathAutoFields(file, prevForm.directoryName)
      const combined   = { ...auto, ...pathFields }
      const next       = mergeAutoFilled(prevForm, combined, lastAutoFilledRef.current)
      lastAutoFilledRef.current = combined; return next
    })
    setImageFile(file)
    extractImageMetadata(file)
      .then((meta) => {
        if (sessionId !== metaSessionRef.current) return
        const extra = imageMetadataToForm(meta); if (!Object.keys(extra).length) return
        setImageForm((p) => { const next = mergeAutoFilled(p, extra, lastAutoFilledRef.current); lastAutoFilledRef.current = { ...lastAutoFilledRef.current, ...extra }; return next })
      }).catch(() => {})
  }

  const handleImageSubmit = async (event) => {
    event.preventDefault(); setFormError('')
    if (!IMAGE_VERSIONS.includes((imageForm.imageVersion || '').toUpperCase())) { setFormError(`Image version must be one of ${IMAGE_VERSIONS.join(', ')}.`); return }
    const vn = Number(imageForm.versionNumber); if (!Number.isInteger(vn) || vn < 1) { setFormError('Version number must be an integer ≥ 1.'); return }
    const cn = Number(imageForm.copyNumber);    if (!Number.isInteger(cn) || cn < 1) { setFormError('Copy number must be an integer ≥ 1.'); return }
    if (view === 'create' && !imageFile) { setFormError('Please choose an image file.'); return }
    setIsSaving(true)
    try {
      if (view === 'create') {
        const saved = await createImage(buildImagePayload(imageForm, projectCode), imageFile)
        toast.success('Image created', `${saved.imageCode} added to ${projectCode}.`)
        await loadImages()
        if (submitModeRef.current === 'add-another') {
          setSavedImagesThisSession((p) => [...p, saved.imageCode])
          setImageForm((p) => ({ ...createInitialImageForm(), imageVersion: p.imageVersion, versionNumber: p.versionNumber, copyNumber: String((Number(p.copyNumber) || 1) + 1) }))
          setImageFile(null); setFormError(''); submitModeRef.current = 'finish'; setPendingSubmitMode('finish'); lastAutoFilledRef.current = {}
          if (typeof window !== 'undefined') window.scrollTo({ top: 0, behavior: 'smooth' }); return
        }
        handleCloseImageForm(); return
      }
      const payload = buildImagePayload(imageForm, projectCode); delete payload.projectCode
      const saved = await updateImage(currentImage.imageCode, payload, imageFile)
      toast.success('Image updated', `${saved.imageCode} saved.`)
      await loadImages(); handleCloseImageForm()
    } catch (err) {
      if (isStaleVersionError(err)) { toast.apiError(err, 'Reload required'); await loadImages(); handleCloseImageForm(); return }
      setFormError(formatApiError(err, 'Failed to save image')); toast.apiError(err, 'Unable to save image')
    } finally { setIsSaving(false) }
  }

  const handleDeleteImage = async () => {
    if (!imageDeleteTarget) return; setIsImageDeleting(true)
    try { await deleteImage(imageDeleteTarget.imageCode); toast.success('Sent to trash', `${imageDeleteTarget.imageCode} can be restored.`); setImageDeleteTarget(null); await loadImages() }
    catch (err) { toast.apiError(err, 'Unable to send image to trash') }
    finally { setIsImageDeleting(false) }
  }

  // ── Text handlers ──────────────────────────────────────────────────────────

  const handleOpenCreateText = () => {
    setCurrentText(null); setTextForm(createInitialTextForm()); setTextFile(null)
    setFormError(''); setSavedTextsThisSession([])
    submitModeRef.current = 'finish'; setPendingSubmitMode('finish'); lastAutoFilledRef.current = {}; setView('create')
  }

  const handleOpenEditText = (text) => {
    setCurrentText(text); setTextForm(populateTextFormFromText(text)); setTextFile(null)
    setFormError(''); setSavedTextsThisSession([])
    submitModeRef.current = 'finish'; setPendingSubmitMode('finish'); lastAutoFilledRef.current = {}; setView('edit')
  }

  const handleCloseTextForm = () => {
    setView('list'); setCurrentText(null); setTextFile(null); setFormError(''); setSavedTextsThisSession([]); lastAutoFilledRef.current = {}
  }

  const handleTextFilePicked = (file) => {
    const sessionId = ++metaSessionRef.current
    if (!file) {
      const prev = lastAutoFilledRef.current
      setTextForm((p) => { const n = { ...p }; for (const [k, v] of Object.entries(prev)) { if (v && JSON.stringify(p[k]) === JSON.stringify(v)) n[k] = Array.isArray(v) ? [] : '' }; return n })
      lastAutoFilledRef.current = {}; setTextFile(null); return
    }
    const auto = deriveTextAutoFieldsFromFile(file)
    setTextForm((prevForm) => {
      const pathFields = buildPathAutoFields(file, prevForm.directoryName)
      const combined   = { ...auto, ...pathFields }
      const next       = mergeAutoFilled(prevForm, combined, lastAutoFilledRef.current)
      lastAutoFilledRef.current = combined; return next
    })
    setTextFile(file)
    extractTextMetadata(file)
      .then((meta) => {
        if (sessionId !== metaSessionRef.current) return
        const extra = textMetadataToForm(meta); if (!Object.keys(extra).length) return
        setTextForm((p) => { const next = mergeAutoFilled(p, extra, lastAutoFilledRef.current); lastAutoFilledRef.current = { ...lastAutoFilledRef.current, ...extra }; return next })
      }).catch(() => {})
  }

  const handleTextSubmit = async (event) => {
    event.preventDefault(); setFormError('')
    if (!TEXT_VERSIONS.includes((textForm.textVersion || '').toUpperCase())) { setFormError(`Text version must be one of ${TEXT_VERSIONS.join(', ')}.`); return }
    const vn = Number(textForm.versionNumber); if (!Number.isInteger(vn) || vn < 1) { setFormError('Version number must be an integer ≥ 1.'); return }
    const cn = Number(textForm.copyNumber);    if (!Number.isInteger(cn) || cn < 1) { setFormError('Copy number must be an integer ≥ 1.'); return }
    if (textForm.pageCount !== '' && textForm.pageCount != null && (Number.isNaN(Number(textForm.pageCount)) || Number(textForm.pageCount) < 0)) { setFormError('Page count must be a non-negative integer.'); return }
    if (view === 'create' && !textFile) { setFormError('Please choose a text file.'); return }
    setIsSaving(true)
    try {
      if (view === 'create') {
        const saved = await createText(buildTextPayload(textForm, projectCode), textFile)
        toast.success('Text created', `${saved.textCode} added to ${projectCode}.`)
        await loadTexts()
        if (submitModeRef.current === 'add-another') {
          setSavedTextsThisSession((p) => [...p, saved.textCode])
          setTextForm((p) => ({ ...createInitialTextForm(), textVersion: p.textVersion, versionNumber: p.versionNumber, copyNumber: String((Number(p.copyNumber) || 1) + 1) }))
          setTextFile(null); setFormError(''); submitModeRef.current = 'finish'; setPendingSubmitMode('finish'); lastAutoFilledRef.current = {}
          if (typeof window !== 'undefined') window.scrollTo({ top: 0, behavior: 'smooth' }); return
        }
        handleCloseTextForm(); return
      }
      const payload = buildTextPayload(textForm, projectCode); delete payload.projectCode
      const saved = await updateText(currentText.textCode, payload, textFile)
      toast.success('Text updated', `${saved.textCode} saved.`)
      await loadTexts(); handleCloseTextForm()
    } catch (err) {
      if (isStaleVersionError(err)) { toast.apiError(err, 'Reload required'); await loadTexts(); handleCloseTextForm(); return }
      setFormError(formatApiError(err, 'Failed to save text')); toast.apiError(err, 'Unable to save text')
    } finally { setIsSaving(false) }
  }

  const handleDeleteText = async () => {
    if (!textDeleteTarget) return; setIsTextDeleting(true)
    try { await deleteText(textDeleteTarget.textCode); toast.success('Sent to trash', `${textDeleteTarget.textCode} can be restored.`); setTextDeleteTarget(null); await loadTexts() }
    catch (err) { toast.apiError(err, 'Unable to send text to trash') }
    finally { setIsTextDeleting(false) }
  }

  // ── Tab switch ─────────────────────────────────────────────────────────────

  const handleSwitchMediaType = (next) => {
    if (next === mediaType) return
    if (view !== 'list') {
      if      (mediaType === 'audio') handleCloseAudioForm()
      else if (mediaType === 'video') handleCloseVideoForm()
      else if (mediaType === 'image') handleCloseImageForm()
      else if (mediaType === 'text')  handleCloseTextForm()
    }
    setMediaType(next)
  }

  // ── Session banner (shared) ────────────────────────────────────────────────

  function SessionBanner({ codes, onFinish }) {
    if (!codes.length) return null
    return (
      <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/5 p-4 shadow-sm dark:bg-emerald-500/10">
        <div className="flex items-start gap-3">
          <div className="mt-0.5 flex size-8 items-center justify-center rounded-full bg-emerald-500/15 text-emerald-600 dark:text-emerald-300">
            <CheckCircle2 className="size-4" />
          </div>
          <div className="min-w-0 flex-1 space-y-1.5">
            <p className="text-sm font-semibold text-foreground">
              {codes.length === 1 ? `1 item added` : `${codes.length} items added`} in this session
            </p>
            <p className="text-xs text-muted-foreground">Form reset. Version & copy numbers carried over (copy auto-incremented).</p>
            <div className="flex flex-wrap gap-1.5 pt-0.5">
              {codes.slice(-6).map((c) => (
                <span key={c} className="inline-flex items-center rounded-full border border-emerald-500/30 bg-background/60 px-2 py-0.5 font-mono text-[10px] tracking-wide text-foreground/80">{c}</span>
              ))}
              {codes.length > 6 && <span className="text-[10px] font-medium text-muted-foreground">+{codes.length - 6} earlier</span>}
            </div>
          </div>
          <button type="button" onClick={onFinish} className="text-xs font-medium text-emerald-700 underline-offset-2 hover:underline dark:text-emerald-300">
            Finish & view list
          </button>
        </div>
      </div>
    )
  }

  // ── Sticky form footer (shared) ────────────────────────────────────────────

  function FormFooter({ isEdit, sessionCount, label, onCancel }) {
    return (
      <div className="sticky bottom-0 z-10 -mx-1 flex flex-col gap-2 rounded-xl border border-border bg-card/95 px-4 py-3 shadow-lg backdrop-blur sm:flex-row sm:items-center sm:justify-between">
        <p className="text-xs text-muted-foreground">
          {isEdit ? `Update this ${label}.` : sessionCount > 0 ? `${sessionCount} added — keep going or finish.` : `Pick a file, fill metadata, then save.`}
        </p>
        <div className="flex items-center justify-end gap-2">
          <Button type="button" variant="outline" onClick={onCancel} disabled={isSaving}>Cancel</Button>
          {isEdit ? (
            <Button type="submit" disabled={isSaving} className="gap-2">
              {isSaving ? <Loader2 className="size-4 animate-spin" /> : null}
              {isSaving ? 'Saving…' : 'Save Changes'}
            </Button>
          ) : (
            <>
              <Button type="submit" variant="outline" disabled={isSaving} className="gap-2" onClick={() => { submitModeRef.current = 'add-another'; setPendingSubmitMode('add-another') }}>
                {isSaving && pendingSubmitMode === 'add-another' ? <Loader2 className="size-4 animate-spin" /> : <Plus className="size-4" />}
                Save &amp; Add Another
              </Button>
              <Button type="submit" disabled={isSaving} className="gap-2" onClick={() => { submitModeRef.current = 'finish'; setPendingSubmitMode('finish') }}>
                {isSaving && pendingSubmitMode === 'finish' ? <Loader2 className="size-4 animate-spin" /> : null}
                Save &amp; Finish
              </Button>
            </>
          )}
        </div>
      </div>
    )
  }

  // ── Image form ─────────────────────────────────────────────────────────────

  if ((view === 'create' || view === 'edit') && mediaType === 'image') {
    const isEdit = view === 'edit'
    return (
      <EmployeeEntityPage eyebrow={isEdit ? 'Editing' : 'New image'} title={isEdit ? 'Edit Image' : 'Add Image to Project'} description={project ? `Inside "${project.projectName}" (${project.projectCode}).` : undefined}>
        <form id="image-form" onSubmit={handleImageSubmit} className="mx-auto block w-full max-w-4xl">
          <div className="space-y-6">
            <SessionBanner codes={savedImagesThisSession} onFinish={handleCloseImageForm} />
            <IdentityCard mediaLabel="image" versionKey="imageVersion" versions={IMAGE_VERSIONS} form={imageForm} setForm={setImageForm} currentCode={isEdit ? currentImage?.imageCode : null} project={project} isEdit={isEdit} getFieldMetadata={getImageFieldMetadata} />
            <MediaFileCard isEdit={isEdit} currentFileUrl={isEdit ? currentImage?.imageFileUrl : null} currentCode={isEdit ? currentImage?.imageCode : null} currentTitle={isEdit ? (currentImage?.originalTitle || currentImage?.imageCode) : null} mediaType="image" file={imageFile} onFileChange={handleImageFilePicked} isAcceptedFile={isImageFile} />
            <ImageFormSections form={imageForm} setForm={setImageForm} projectCategories={project?.categories || []} currentFile={imageFile} />
            <FormErrorBox error={formError} />
            <FormFooter isEdit={isEdit} sessionCount={savedImagesThisSession.length} label="image" onCancel={handleCloseImageForm} />
          </div>
        </form>
      </EmployeeEntityPage>
    )
  }

  // ── Text form ──────────────────────────────────────────────────────────────

  if ((view === 'create' || view === 'edit') && mediaType === 'text') {
    const isEdit = view === 'edit'
    return (
      <EmployeeEntityPage eyebrow={isEdit ? 'Editing' : 'New text'} title={isEdit ? 'Edit Text' : 'Add Text to Project'} description={project ? `Inside "${project.projectName}" (${project.projectCode}).` : undefined}>
        <form id="text-form" onSubmit={handleTextSubmit} className="mx-auto block w-full max-w-4xl">
          <div className="space-y-6">
            <SessionBanner codes={savedTextsThisSession} onFinish={handleCloseTextForm} />
            <IdentityCard mediaLabel="text" versionKey="textVersion" versions={TEXT_VERSIONS} form={textForm} setForm={setTextForm} currentCode={isEdit ? currentText?.textCode : null} project={project} isEdit={isEdit} getFieldMetadata={getTextFieldMetadata} />
            <MediaFileCard isEdit={isEdit} currentFileUrl={isEdit ? currentText?.textFileUrl : null} currentCode={isEdit ? currentText?.textCode : null} currentTitle={isEdit ? (currentText?.fileName || currentText?.textCode) : null} mediaType="text" file={textFile} onFileChange={handleTextFilePicked} isAcceptedFile={isTextFile} />
            <TextFormSections form={textForm} setForm={setTextForm} projectCategories={project?.categories || []} currentFile={textFile} />
            <FormErrorBox error={formError} />
            <FormFooter isEdit={isEdit} sessionCount={savedTextsThisSession.length} label="text" onCancel={handleCloseTextForm} />
          </div>
        </form>
      </EmployeeEntityPage>
    )
  }

  // ── Video form ─────────────────────────────────────────────────────────────

  if ((view === 'create' || view === 'edit') && mediaType === 'video') {
    const isEdit = view === 'edit'
    return (
      <EmployeeEntityPage eyebrow={isEdit ? 'Editing' : 'New video'} title={isEdit ? 'Edit Video' : 'Add Video to Project'} description={project ? `Inside "${project.projectName}" (${project.projectCode}).` : undefined}>
        <form id="video-form" onSubmit={handleVideoSubmit} className="mx-auto block w-full max-w-4xl">
          <div className="space-y-6">
            <SessionBanner codes={savedVideosThisSession} onFinish={handleCloseVideoForm} />
            <IdentityCard mediaLabel="video" versionKey="videoVersion" versions={VIDEO_VERSIONS} form={videoForm} setForm={setVideoForm} currentCode={isEdit ? currentVideo?.videoCode : null} project={project} isEdit={isEdit} getFieldMetadata={getVideoFieldMetadata} />
            <MediaFileCard isEdit={isEdit} currentFileUrl={isEdit ? currentVideo?.videoFileUrl : null} currentCode={isEdit ? currentVideo?.videoCode : null} currentTitle={isEdit ? (currentVideo?.originalTitle || currentVideo?.videoCode) : null} mediaType="video" file={videoFile} onFileChange={handleVideoFilePicked} isAcceptedFile={isVideoFile} />
            <VideoFormSections form={videoForm} setForm={setVideoForm} projectCategories={project?.categories || []} currentFile={videoFile} />
            <FormErrorBox error={formError} />
            <FormFooter isEdit={isEdit} sessionCount={savedVideosThisSession.length} label="video" onCancel={handleCloseVideoForm} />
          </div>
        </form>
      </EmployeeEntityPage>
    )
  }

  // ── Audio form ─────────────────────────────────────────────────────────────

  if (view === 'create' || view === 'edit') {
    const isEdit = view === 'edit'
    return (
      <EmployeeEntityPage eyebrow={isEdit ? 'Editing' : 'New audio'} title={isEdit ? 'Edit Audio' : 'Add Audio to Project'} description={project ? `Inside "${project.projectName}" (${project.projectCode}).` : undefined}>
        <form id="audio-form" onSubmit={handleAudioSubmit} className="mx-auto block w-full max-w-4xl">
          <div className="space-y-6">
            <SessionBanner codes={savedThisSession} onFinish={handleCloseAudioForm} />
            <IdentityCard mediaLabel="audio" versionKey="audioVersion" versions={AUDIO_VERSIONS} form={form} setForm={setForm} currentCode={isEdit ? currentAudio?.audioCode : null} project={project} isEdit={isEdit} getFieldMetadata={getAudioFieldMetadata} />
            <MediaFileCard isEdit={isEdit} currentFileUrl={isEdit ? currentAudio?.audioFileUrl : null} currentCode={isEdit ? currentAudio?.audioCode : null} currentTitle={isEdit ? (currentAudio?.originTitle || currentAudio?.audioCode) : null} mediaType="audio" file={audioFile} onFileChange={handleAudioFilePicked} isAcceptedFile={isAudioFile} />
            <AudioFormSections form={form} setForm={setForm} projectCategories={project?.categories || []} currentFile={audioFile} />
            <FormErrorBox error={formError} />
            <FormFooter isEdit={isEdit} sessionCount={savedThisSession.length} label="audio" onCancel={handleCloseAudioForm} />
          </div>
        </form>
      </EmployeeEntityPage>
    )
  }

  // ── Loading / error states ─────────────────────────────────────────────────

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

  // ── List view ──────────────────────────────────────────────────────────────

  return (
    <div className="space-y-4">
      <Button type="button" variant="outline" size="lg" className="group h-10 gap-2.5 px-4 text-sm font-medium" onClick={() => navigate(`${sectionBase}/project`)}>
        <ArrowLeft className="size-5 transition-transform group-hover:-translate-x-0.5" />
        Back to projects
      </Button>

      <EmployeeEntityPage
        title={project.projectName}
        badge={project.removedAt ? 'Removed' : undefined}
        description={project.description || undefined}
        action={
          <div className="flex items-center gap-2 shrink-0">
            {mediaType === 'audio' ? <Button onClick={handleOpenCreateAudio} className="gap-2"><Plus className="size-4" />Add Audio</Button>
            : mediaType === 'video' ? <Button onClick={handleOpenCreateVideo} className="gap-2"><Plus className="size-4" />Add Video</Button>
            : mediaType === 'image' ? <Button onClick={handleOpenCreateImage} className="gap-2"><Plus className="size-4" />Add Image</Button>
            : <Button onClick={handleOpenCreateText} className="gap-2"><Plus className="size-4" />Add Text</Button>}
          </div>
        }
      >
        {/* Project summary card */}
        <Card className="border-border bg-card shadow-sm shadow-black/5">
          <CardContent className="grid gap-6 px-6 py-5 sm:grid-cols-[auto_1fr_auto]">
            <div className="flex size-12 items-center justify-center rounded-xl border bg-background text-muted-foreground"><FolderOpen className="size-5" /></div>
            <div className="space-y-2 min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <CodeBadge code={project.projectCode} />
                <span className={cn('inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-medium', project.personCode ? 'bg-muted/40 text-foreground' : 'bg-muted/20 italic text-muted-foreground')}>
                  {project.personCode ? <>{project.personName || project.personCode}<span className="font-mono text-[10px] text-muted-foreground">{project.personCode}</span></> : 'Untitled (no person)'}
                </span>
              </div>
              {(project.categories?.length ?? 0) > 0 && (
                <div className="flex flex-wrap gap-1">
                  {project.categories.map((cat) => (
                    <span key={cat.categoryCode || cat.id} className="inline-flex items-center gap-1 rounded-full border bg-background px-2 py-0.5 text-[11px] text-foreground/80">
                      {cat.categoryName || cat.name || cat.categoryCode}
                      <span className="font-mono text-[10px] text-muted-foreground">{cat.categoryCode}</span>
                    </span>
                  ))}
                </div>
              )}
            </div>
            <div className="flex flex-col items-end gap-1 self-center text-[11px] text-muted-foreground">
              <p>{audios.length} audio · {videos.length} video · {images.length} image · {texts.length} text</p>
            </div>
          </CardContent>
        </Card>

        <MediaTypeTabs mediaType={mediaType} onChange={handleSwitchMediaType} audioCount={visibleAudios.length} videoCount={visibleVideos.length} imageCount={visibleImages.length} textCount={visibleTexts.length} />

        {/* Toolbars */}
        {mediaType === 'audio' && <EntityToolbar filteredCount={filteredAudios.length} totalCount={visibleAudios.length} searchValue={searchTerm} onSearchChange={setSearchTerm} searchPlaceholder="Search audios…" onRefresh={loadAudios} isRefreshing={isLoadingAudios || isAudioSearching} trailing={<div className="flex flex-wrap items-center gap-2"><SortSelect value={audioSortKey} onChange={setAudioSortKey} options={AUDIO_SORT_OPTIONS} ascIcon={ArrowUpAZ} descIcon={ArrowDownAZ} disabled={Boolean(searchTerm.trim())} title="Sort audios" width="sm:w-[16rem]" /><FilterTriggerButton active={audioFiltersActive} count={audioFilterCount} open={isAudioFilterPanelOpen} onClick={() => setIsAudioFilterPanelOpen((v) => !v)} disabled={Boolean(searchTerm.trim())} disabledReason="Clear search to use filters" /></div>} />}
        {mediaType === 'video' && <EntityToolbar filteredCount={filteredVideos.length} totalCount={visibleVideos.length} searchValue={videoSearchTerm} onSearchChange={setVideoSearchTerm} searchPlaceholder="Search videos…" onRefresh={loadVideos} isRefreshing={isLoadingVideos || isVideoSearching} trailing={<div className="flex flex-wrap items-center gap-2"><SortSelect value={videoSortKey} onChange={setVideoSortKey} options={VIDEO_SORT_OPTIONS} ascIcon={ArrowUpAZ} descIcon={ArrowDownAZ} disabled={Boolean(videoSearchTerm.trim())} title="Sort videos" width="sm:w-[16rem]" /><FilterTriggerButton active={videoFiltersActive} count={videoFilterCount} open={isVideoFilterPanelOpen} onClick={() => setIsVideoFilterPanelOpen((v) => !v)} disabled={Boolean(videoSearchTerm.trim())} disabledReason="Clear search to use filters" /></div>} />}
        {mediaType === 'image' && <EntityToolbar filteredCount={filteredImages.length} totalCount={visibleImages.length} searchValue={imageSearchTerm} onSearchChange={setImageSearchTerm} searchPlaceholder="Search images…" onRefresh={loadImages} isRefreshing={isLoadingImages || isImageSearching} trailing={<div className="flex flex-wrap items-center gap-2"><SortSelect value={imageSortKey} onChange={setImageSortKey} options={IMAGE_SORT_OPTIONS} ascIcon={ArrowUpAZ} descIcon={ArrowDownAZ} disabled={Boolean(imageSearchTerm.trim())} title="Sort images" width="sm:w-[16rem]" /><FilterTriggerButton active={imageFiltersActive} count={imageFilterCount} open={isImageFilterPanelOpen} onClick={() => setIsImageFilterPanelOpen((v) => !v)} disabled={Boolean(imageSearchTerm.trim())} disabledReason="Clear search to use filters" /></div>} />}
        {mediaType === 'text'  && <EntityToolbar filteredCount={filteredTexts.length} totalCount={visibleTexts.length} searchValue={textSearchTerm} onSearchChange={setTextSearchTerm} searchPlaceholder="Search texts…" onRefresh={loadTexts} isRefreshing={isLoadingTexts || isTextSearching} trailing={<div className="flex flex-wrap items-center gap-2"><SortSelect value={textSortKey} onChange={setTextSortKey} options={TEXT_SORT_OPTIONS} ascIcon={ArrowUpAZ} descIcon={ArrowDownAZ} disabled={Boolean(textSearchTerm.trim())} title="Sort texts" width="sm:w-[16rem]" /><FilterTriggerButton active={textFiltersActive} count={textFilterCount} open={isTextFilterPanelOpen} onClick={() => setIsTextFilterPanelOpen((v) => !v)} disabled={Boolean(textSearchTerm.trim())} disabledReason="Clear search to use filters" /></div>} />}

        {/* Filter panels */}
        {mediaType === 'audio' && !searchTerm.trim()      && <AudioFilterPanel open={isAudioFilterPanelOpen} filters={audioFilters} onChange={updateAudioFilter} onClear={clearAudioFilters} onClose={() => setIsAudioFilterPanelOpen(false)} isAnyActive={audioFiltersActive} activeCount={audioFilterCount} />}
        {mediaType === 'audio' && audioChips.length > 0   && <FilterChips chips={audioChips} onClearAll={audioFiltersActive || audioSortActive ? () => { clearAudioFilters(); setAudioSortKey(DEFAULT_AUDIO_SORT_KEY) } : null} />}
        {mediaType === 'video' && !videoSearchTerm.trim() && <VideoFilterPanel open={isVideoFilterPanelOpen} filters={videoFilters} onChange={updateVideoFilter} onClear={clearVideoFilters} onClose={() => setIsVideoFilterPanelOpen(false)} isAnyActive={videoFiltersActive} activeCount={videoFilterCount} />}
        {mediaType === 'video' && videoChips.length > 0   && <FilterChips chips={videoChips} onClearAll={videoFiltersActive || videoSortActive ? () => { clearVideoFilters(); setVideoSortKey(DEFAULT_VIDEO_SORT_KEY) } : null} />}
        {mediaType === 'image' && !imageSearchTerm.trim() && <ImageFilterPanel open={isImageFilterPanelOpen} filters={imageFilters} onChange={updateImageFilter} onClear={clearImageFilters} onClose={() => setIsImageFilterPanelOpen(false)} isAnyActive={imageFiltersActive} activeCount={imageFilterCount} />}
        {mediaType === 'image' && imageChips.length > 0   && <FilterChips chips={imageChips} onClearAll={imageFiltersActive || imageSortActive ? () => { clearImageFilters(); setImageSortKey(DEFAULT_IMAGE_SORT_KEY) } : null} />}
        {mediaType === 'text'  && !textSearchTerm.trim()  && <TextFilterPanel open={isTextFilterPanelOpen} filters={textFilters} onChange={updateTextFilter} onClear={clearTextFilters} onClose={() => setIsTextFilterPanelOpen(false)} isAnyActive={textFiltersActive} activeCount={textFilterCount} />}
        {mediaType === 'text'  && textChips.length > 0    && <FilterChips chips={textChips} onClearAll={textFiltersActive || textSortActive ? () => { clearTextFilters(); setTextSortKey(DEFAULT_TEXT_SORT_KEY) } : null} />}

        {/* List sections */}
        {mediaType === 'audio' && <AudioListSection isLoading={isLoadingAudios} audios={audios} filteredAudios={filteredAudios} searchQuery={searchTerm} filtersOrSortActive={audioFiltersActive || audioSortActive} onClearFiltersAndSort={() => { clearAudioFilters(); setAudioSortKey(DEFAULT_AUDIO_SORT_KEY) }} onAdd={handleOpenCreateAudio} onEdit={handleOpenEditAudio} onDetails={setDetailsTarget} onDelete={setDeleteTarget} />}
        {mediaType === 'video' && <VideoListSection  isLoading={isLoadingVideos} videos={videos}   filteredVideos={filteredVideos}   searchQuery={videoSearchTerm} filtersOrSortActive={videoFiltersActive || videoSortActive}   onClearFiltersAndSort={() => { clearVideoFilters(); setVideoSortKey(DEFAULT_VIDEO_SORT_KEY) }}   onAdd={handleOpenCreateVideo} onEdit={handleOpenEditVideo} onDetails={setVideoDetailsTarget} onDelete={setVideoDeleteTarget} />}
        {mediaType === 'image' && <ImageListSection  isLoading={isLoadingImages} images={images}   filteredImages={filteredImages}   searchQuery={imageSearchTerm} filtersOrSortActive={imageFiltersActive || imageSortActive}   onClearFiltersAndSort={() => { clearImageFilters(); setImageSortKey(DEFAULT_IMAGE_SORT_KEY) }}   onAdd={handleOpenCreateImage} onEdit={handleOpenEditImage} onDetails={setImageDetailsTarget} onDelete={setImageDeleteTarget} />}
        {mediaType === 'text'  && <TextListSection   isLoading={isLoadingTexts}  texts={texts}     filteredTexts={filteredTexts}     searchQuery={textSearchTerm}  filtersOrSortActive={textFiltersActive  || textSortActive}    onClearFiltersAndSort={() => { clearTextFilters();  setTextSortKey(DEFAULT_TEXT_SORT_KEY) }}    onAdd={handleOpenCreateText}  onEdit={handleOpenEditText}  onDetails={setTextDetailsTarget}  onDelete={setTextDeleteTarget} />}

        {/* Dialogs */}
        <TypedConfirmDialog open={Boolean(deleteTarget)}      title="Send audio to trash" description="Trashed items can be restored by an admin." codeToConfirm={deleteTarget?.audioCode}      promptLabel="Type audio code to confirm"  confirmLabel="Send to Trash" cancelLabel="Cancel" confirmVariant="destructive" isProcessing={isDeleting}      onConfirm={handleDeleteAudio} onOpenChange={(o) => { if (!o) setDeleteTarget(null) }} />
        <TypedConfirmDialog open={Boolean(videoDeleteTarget)} title="Send video to trash" description="Trashed items can be restored by an admin." codeToConfirm={videoDeleteTarget?.videoCode} promptLabel="Type video code to confirm"  confirmLabel="Send to Trash" cancelLabel="Cancel" confirmVariant="destructive" isProcessing={isVideoDeleting} onConfirm={handleDeleteVideo} onOpenChange={(o) => { if (!o) setVideoDeleteTarget(null) }} />
        <TypedConfirmDialog open={Boolean(imageDeleteTarget)} title="Send image to trash" description="Trashed items can be restored by an admin." codeToConfirm={imageDeleteTarget?.imageCode} promptLabel="Type image code to confirm"  confirmLabel="Send to Trash" cancelLabel="Cancel" confirmVariant="destructive" isProcessing={isImageDeleting} onConfirm={handleDeleteImage} onOpenChange={(o) => { if (!o) setImageDeleteTarget(null) }} />
        <TypedConfirmDialog open={Boolean(textDeleteTarget)}  title="Send text to trash"  description="Trashed items can be restored by an admin." codeToConfirm={textDeleteTarget?.textCode}   promptLabel="Type text code to confirm"   confirmLabel="Send to Trash" cancelLabel="Cancel" confirmVariant="destructive" isProcessing={isTextDeleting}  onConfirm={handleDeleteText}  onOpenChange={(o) => { if (!o) setTextDeleteTarget(null) }} />
        <AudioDetailsModal open={Boolean(detailsTarget)}      audio={detailsTarget}      searchQuery={searchTerm}      onOpenChange={(o) => { if (!o) setDetailsTarget(null) }} />
        <VideoDetailsModal open={Boolean(videoDetailsTarget)} video={videoDetailsTarget} searchQuery={videoSearchTerm}  onOpenChange={(o) => { if (!o) setVideoDetailsTarget(null) }} />
        <ImageDetailsModal open={Boolean(imageDetailsTarget)} image={imageDetailsTarget} searchQuery={imageSearchTerm}  onOpenChange={(o) => { if (!o) setImageDetailsTarget(null) }} />
        <TextDetailsModal  open={Boolean(textDetailsTarget)}  text={textDetailsTarget}   searchQuery={textSearchTerm}   onOpenChange={(o) => { if (!o) setTextDetailsTarget(null) }} />
      </EmployeeEntityPage>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Shared form sub-components (used by all four media-type forms)
// ─────────────────────────────────────────────────────────────────────────────

/** Identity card: version + version number + copy number + auto-generated code preview. */
function IdentityCard({ mediaLabel, versionKey, versions, form, setForm, currentCode, project, isEdit, getFieldMetadata }) {
  const shortLabel = mediaLabel.toUpperCase().slice(0, 3)
  const prefix = project?.personCode
    ? (project.personName || project.personCode).replace(/\s+/g, '').toUpperCase().slice(0, 8)
    : (project?.categories?.[0]?.categoryName || project?.categories?.[0]?.categoryCode || 'CATEGORY').replace(/\s+/g, '').toUpperCase().slice(0, 8)
  const previewCode = `${prefix}_${shortLabel}_${form[versionKey] || 'RAW'}_V${form.versionNumber || '1'}_Copy(${form.copyNumber || '1'})_000001`

  return (
    <Card className="border-border bg-card shadow-sm shadow-black/5">
      <CardHeader className="border-b border-border pb-4">
        <CardTitle className="text-base font-semibold">Identity</CardTitle>
        <CardDescription className="text-xs">Version, copy and the auto-generated {mediaLabel} code.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-5 pt-5">
        <div className="grid gap-5 sm:grid-cols-3">
          <div className="space-y-1.5">
            <div className="flex items-center justify-between gap-2">
              <Label htmlFor={versionKey}>Version <span className="text-destructive">*</span></Label>
              <FieldHelpButton metadata={getFieldMetadata(versionKey)} />
            </div>
            <Select id={versionKey} value={form[versionKey]} onChange={(v) => setForm({ ...form, [versionKey]: v })} required className="w-full" options={versions.map((v) => ({ value: v, label: v }))} />
          </div>
          <div className="space-y-1.5">
            <div className="flex items-center justify-between gap-2">
              <Label htmlFor="versionNumber">Version # <span className="text-destructive">*</span></Label>
              <FieldHelpButton metadata={getFieldMetadata('versionNumber')} />
            </div>
            <Input id="versionNumber" type="number" min="1" step="1" value={form.versionNumber} onChange={(e) => setForm({ ...form, versionNumber: e.target.value })} required />
          </div>
          <div className="space-y-1.5">
            <div className="flex items-center justify-between gap-2">
              <Label htmlFor="copyNumber">Copy # <span className="text-destructive">*</span></Label>
              <FieldHelpButton metadata={getFieldMetadata('copyNumber')} />
            </div>
            <Input id="copyNumber" type="number" min="1" step="1" value={form.copyNumber} onChange={(e) => setForm({ ...form, copyNumber: e.target.value })} required />
          </div>
        </div>
        {isEdit && currentCode ? (
          <div className="flex items-center gap-2 text-xs text-muted-foreground"><span>Code:</span><CodeBadge code={currentCode} variant="subtle" /></div>
        ) : (
          <p className="text-xs text-muted-foreground">Auto-generated as <span className="font-mono font-semibold text-foreground">{previewCode}</span></p>
        )}
      </CardContent>
    </Card>
  )
}

/** File card: shows current file (edit mode) + the file picker. */
function MediaFileCard({ isEdit, currentFileUrl, currentCode, currentTitle, mediaType, file, onFileChange, isAcceptedFile }) {
  const acceptMap = {
    audio: { accept: 'audio/*,.wav,.mp3,.flac,.ogg,.m4a,.aac,.aiff,.aif,.wma,.opus', formats: 'WAV, MP3, FLAC, OGG…', icon: FileAudio },
    video: { accept: 'video/*,.mp4,.mov,.mkv,.webm,.avi,.m4v,.mpg,.mpeg,.wmv,.flv,.3gp,.ogv', formats: 'MP4, MOV, MKV, WEBM…', icon: VideoIcon },
    image: { accept: 'image/*,.tif,.tiff,.heic,.heif,.raw,.cr2,.cr3,.nef,.arw,.dng', formats: 'JPG, PNG, TIFF, RAW…', icon: ImageIcon },
    text:  { accept: '.pdf,.doc,.docx,.odt,.rtf,.txt,.md,.tex,.epub,.mobi,.xml,.html,.htm,.csv,.tsv,application/pdf,text/*', formats: 'PDF, DOCX, TXT, MD, EPUB…', icon: FileText },
  }
  const { accept, formats, icon: Icon } = acceptMap[mediaType] ?? acceptMap.audio

  return (
    <Card className="border-border bg-card shadow-sm shadow-black/5">
      <CardHeader className="border-b border-border pb-4">
        <CardTitle className="text-base font-semibold">{mediaType.charAt(0).toUpperCase() + mediaType.slice(1)} File</CardTitle>
        <CardDescription className="text-xs">{isEdit ? `Upload a replacement file to overwrite the current ${mediaType}. Leave empty to keep it.` : `A single ${mediaType} file is required.`}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4 pt-5">
        {isEdit && currentFileUrl && (
          <div className="space-y-2">
            <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">Current file</p>
            {mediaType === 'audio' && <AudioPlayer src={currentFileUrl} title={currentTitle} />}
            {mediaType === 'video' && <VideoPlayer src={currentFileUrl} title={currentTitle} />}
            {mediaType === 'image' && <div className="overflow-hidden rounded-lg border bg-muted/20"><img src={currentFileUrl} alt={currentTitle} className="block max-h-72 w-auto max-w-full object-contain" /></div>}
            {mediaType === 'text'  && (
              <div className="flex items-center gap-3 rounded-lg border bg-muted/20 p-3">
                <FileText className="size-5 text-muted-foreground" />
                <div className="min-w-0 flex-1"><p className="truncate text-sm font-medium">{currentCode}</p></div>
                <a href={currentFileUrl} download className="inline-flex items-center gap-1.5 rounded-md border px-2.5 py-1 text-[11px] font-medium text-foreground transition hover:bg-muted">Download</a>
              </div>
            )}
          </div>
        )}
        <SingleMediaFilePicker id={`${mediaType}File`} file={file} onFileChange={onFileChange} mediaLabel={mediaType} accept={accept} acceptedFormats={formats} isEdit={isEdit} icon={Icon} isAcceptedFile={isAcceptedFile} />
      </CardContent>
    </Card>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// AudioFormSections — includes the Storage card with FolderSourcePicker
// ─────────────────────────────────────────────────────────────────────────────

function AudioFieldLabel({ htmlFor, fieldKey, className, children }) {
  return (
    <div className="flex items-center justify-between gap-2">
      <Label htmlFor={htmlFor} className={className}>{children}</Label>
      <FieldHelpButton metadata={getAudioFieldMetadata(fieldKey || htmlFor)} />
    </div>
  )
}

function GenreChips({ categories, value, onChange }) {
  const selected = Array.isArray(value) ? value : []
  const selectedLower = new Set(selected.map((s) => s.toLowerCase()))
  const categoryNames = (categories || []).map((c) => c.categoryName || c.name || c.categoryCode).filter(Boolean)
  const suggestions = categoryNames.filter((name) => !selectedLower.has(name.toLowerCase()))
  return (
    <div className="space-y-2">
      <TagsInput value={selected} onChange={onChange} placeholder="Type a genre and press Enter, or pick a suggestion" />
      {suggestions.length > 0 && (
        <div className="flex flex-wrap items-center gap-1.5">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">From categories:</p>
          {suggestions.map((name) => (
            <button key={name} type="button" onClick={() => onChange([...selected, name])} className="inline-flex items-center gap-1 rounded-full border border-dashed border-border bg-background px-2 py-0.5 text-[11px] font-medium text-muted-foreground transition hover:border-primary/40 hover:bg-primary/5 hover:text-foreground">
              <Plus className="size-3" />{name}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

/**
 * All audio form sections.
 *
 * @param {{ form: object, setForm: Function, projectCategories: any[], currentFile: File|null }} props
 *   currentFile – the File object currently staged for upload; used by
 *   FolderSourcePicker to pre-build externalPath when a folder is selected
 *   before the file is picked.
 */
function AudioFormSections({ form, setForm, projectCategories = [], currentFile = null }) {
  const isPublic = form.isPublic === true

  return (
    <>
      {/* Visibility toggle */}
      <div className={cn('flex items-center justify-between rounded-2xl border px-5 py-4', isPublic ? 'border-green-200 bg-green-50/40 dark:border-green-900/30 dark:bg-green-950/10' : 'border-amber-200 bg-amber-50/40 dark:border-amber-900/30 dark:bg-amber-950/10')}>
        <div className="flex items-center gap-3">
          <span className={cn('grid size-9 shrink-0 place-items-center rounded-xl', isPublic ? 'bg-green-500/15 text-green-600' : 'bg-amber-500/15 text-amber-600')}>
            {isPublic ? <Globe className="size-4.5" /> : <EyeOff className="size-4.5" />}
          </span>
          <div>
            <p className="text-sm font-semibold text-foreground">{isPublic ? 'Public — visible in the catalogue' : 'Private — hidden from guests'}</p>
            <p className="text-xs text-muted-foreground">{isPublic ? 'Visible to all public visitors.' : 'Only archive staff can access this record.'}</p>
          </div>
        </div>
        <label className="relative cursor-pointer select-none">
          <input type="checkbox" className="sr-only peer" checked={isPublic} onChange={(e) => setForm({ ...form, isPublic: e.target.checked })} />
          <div className={cn('flex h-6 w-11 items-center rounded-full px-0.5 transition-colors', isPublic ? 'bg-green-500' : 'bg-input')}>
            <div className={cn('size-5 rounded-full bg-white shadow-sm transition-transform', isPublic ? 'translate-x-5' : 'translate-x-0')} />
          </div>
        </label>
      </div>

      {/* Titles */}
      <Card className="border-border bg-card shadow-sm shadow-black/5">
        <CardHeader className="border-b border-border pb-4"><CardTitle className="text-base font-semibold">Titles</CardTitle></CardHeader>
        <CardContent className="grid gap-5 pt-5 sm:grid-cols-2">
          <div className="space-y-1.5 sm:col-span-2"><AudioFieldLabel htmlFor="fullName">Full Name</AudioFieldLabel><Input id="fullName" value={form.fullName} onChange={(e) => setForm({ ...form, fullName: e.target.value })} /></div>
          <div className="space-y-1.5"><AudioFieldLabel htmlFor="originTitle">Origin Title</AudioFieldLabel><Input id="originTitle" value={form.originTitle} onChange={(e) => setForm({ ...form, originTitle: e.target.value })} /></div>
          <div className="space-y-1.5"><AudioFieldLabel htmlFor="alterTitle">Alternate Title</AudioFieldLabel><Input id="alterTitle" value={form.alterTitle} onChange={(e) => setForm({ ...form, alterTitle: e.target.value })} /></div>
          <div className="space-y-1.5"><AudioFieldLabel htmlFor="centralKurdishTitle">Central Kurdish Title</AudioFieldLabel><Input id="centralKurdishTitle" value={form.centralKurdishTitle} onChange={(e) => setForm({ ...form, centralKurdishTitle: e.target.value })} dir="rtl" /></div>
          <div className="space-y-1.5"><AudioFieldLabel htmlFor="romanizedTitle">Romanized Title</AudioFieldLabel><Input id="romanizedTitle" value={form.romanizedTitle} onChange={(e) => setForm({ ...form, romanizedTitle: e.target.value })} /></div>
        </CardContent>
      </Card>

      {/* Description */}
      <Card className="border-border bg-card shadow-sm shadow-black/5">
        <CardHeader className="border-b border-border pb-4"><CardTitle className="text-base font-semibold">Description</CardTitle></CardHeader>
        <CardContent className="grid gap-5 pt-5 sm:grid-cols-2">
          <div className="space-y-1.5"><AudioFieldLabel htmlFor="abstractText">Abstract</AudioFieldLabel><textarea id="abstractText" className={TEXTAREA_CLASS} value={form.abstractText} onChange={(e) => setForm({ ...form, abstractText: e.target.value })} /></div>
          <div className="space-y-1.5"><AudioFieldLabel htmlFor="description">Description</AudioFieldLabel><textarea id="description" className={TEXTAREA_CLASS} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} /></div>
        </CardContent>
      </Card>

      {/* Music & Form */}
      <Card className="border-border bg-card shadow-sm shadow-black/5">
        <CardHeader className="border-b border-border pb-4"><CardTitle className="text-base font-semibold">Music & Form</CardTitle></CardHeader>
        <CardContent className="grid gap-5 pt-5 sm:grid-cols-2">
          <div className="space-y-1.5"><AudioFieldLabel htmlFor="form">Form</AudioFieldLabel><Input id="form" value={form.form} onChange={(e) => setForm({ ...form, form: e.target.value })} /></div>
          <div className="space-y-1.5 sm:col-span-2">
            <div className="flex items-center justify-between gap-2"><Label>Genres</Label><FieldHelpButton metadata={getAudioFieldMetadata('genre')} /></div>
            <GenreChips categories={projectCategories} value={form.genre} onChange={(next) => setForm({ ...form, genre: next })} />
          </div>
          <div className="space-y-1.5"><AudioFieldLabel htmlFor="typeOfBasta">Type of Basta</AudioFieldLabel><Input id="typeOfBasta" value={form.typeOfBasta} onChange={(e) => setForm({ ...form, typeOfBasta: e.target.value })} /></div>
          <div className="space-y-1.5"><AudioFieldLabel htmlFor="typeOfMaqam">Type of Maqam</AudioFieldLabel><Input id="typeOfMaqam" value={form.typeOfMaqam} onChange={(e) => setForm({ ...form, typeOfMaqam: e.target.value })} /></div>
          <div className="space-y-1.5"><AudioFieldLabel htmlFor="typeOfComposition">Type of Composition</AudioFieldLabel><Input id="typeOfComposition" value={form.typeOfComposition} onChange={(e) => setForm({ ...form, typeOfComposition: e.target.value })} /></div>
          <div className="space-y-1.5"><AudioFieldLabel htmlFor="typeOfPerformance">Type of Performance</AudioFieldLabel><Input id="typeOfPerformance" value={form.typeOfPerformance} onChange={(e) => setForm({ ...form, typeOfPerformance: e.target.value })} /></div>
          <div className="space-y-1.5"><AudioFieldLabel htmlFor="poet">Poet</AudioFieldLabel><Input id="poet" value={form.poet} onChange={(e) => setForm({ ...form, poet: e.target.value })} /></div>
          <div className="space-y-1.5 sm:col-span-2"><AudioFieldLabel htmlFor="lyrics">Lyrics</AudioFieldLabel><textarea id="lyrics" className={TEXTAREA_CLASS} value={form.lyrics} onChange={(e) => setForm({ ...form, lyrics: e.target.value })} /></div>
        </CardContent>
      </Card>

      {/* Credits */}
      <Card className="border-border bg-card shadow-sm shadow-black/5">
        <CardHeader className="border-b border-border pb-4"><CardTitle className="text-base font-semibold">Credits</CardTitle></CardHeader>
        <CardContent className="grid gap-5 pt-5 sm:grid-cols-2">
          <div className="space-y-1.5"><AudioFieldLabel htmlFor="speaker">Speaker</AudioFieldLabel><Input id="speaker" value={form.speaker} onChange={(e) => setForm({ ...form, speaker: e.target.value })} /></div>
          <div className="space-y-1.5"><AudioFieldLabel htmlFor="producer">Producer</AudioFieldLabel><Input id="producer" value={form.producer} onChange={(e) => setForm({ ...form, producer: e.target.value })} /></div>
          <div className="space-y-1.5"><AudioFieldLabel htmlFor="composer">Composer</AudioFieldLabel><Input id="composer" value={form.composer} onChange={(e) => setForm({ ...form, composer: e.target.value })} /></div>
          <div className="space-y-1.5"><AudioFieldLabel htmlFor="contributors">Contributors</AudioFieldLabel><TagsInput id="contributors" value={form.contributors} onChange={(next) => setForm({ ...form, contributors: next })} placeholder="Name, role…" /></div>
        </CardContent>
      </Card>

      {/* Context */}
      <Card className="border-border bg-card shadow-sm shadow-black/5">
        <CardHeader className="border-b border-border pb-4"><CardTitle className="text-base font-semibold">Context</CardTitle><CardDescription className="text-xs">Language, recording location, and dates.</CardDescription></CardHeader>
        <CardContent className="grid gap-5 pt-5 sm:grid-cols-3">
          <div className="space-y-1.5"><AudioFieldLabel htmlFor="language">Language</AudioFieldLabel><Input id="language" value={form.language} onChange={(e) => setForm({ ...form, language: e.target.value })} /></div>
          <div className="space-y-1.5"><AudioFieldLabel htmlFor="dialect">Dialect</AudioFieldLabel><Input id="dialect" value={form.dialect} onChange={(e) => setForm({ ...form, dialect: e.target.value })} /></div>
          <div className="space-y-1.5"><AudioFieldLabel htmlFor="audience">Audience</AudioFieldLabel><Input id="audience" value={form.audience} onChange={(e) => setForm({ ...form, audience: e.target.value })} /></div>
          <div className="space-y-1.5"><AudioFieldLabel htmlFor="recordingVenue">Recording Venue</AudioFieldLabel><Input id="recordingVenue" value={form.recordingVenue} onChange={(e) => setForm({ ...form, recordingVenue: e.target.value })} /></div>
          <div className="space-y-1.5"><AudioFieldLabel htmlFor="city">City</AudioFieldLabel><Input id="city" value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} /></div>
          <div className="space-y-1.5"><AudioFieldLabel htmlFor="region">Region</AudioFieldLabel><Input id="region" value={form.region} onChange={(e) => setForm({ ...form, region: e.target.value })} /></div>
          <div className="space-y-1.5"><AudioFieldLabel htmlFor="dateCreated">Date Created</AudioFieldLabel><Input id="dateCreated" type="date" value={form.dateCreated} onChange={(e) => setForm({ ...form, dateCreated: e.target.value })} /></div>
          <div className="space-y-1.5"><AudioFieldLabel htmlFor="datePublished">Date Published</AudioFieldLabel><Input id="datePublished" type="date" value={form.datePublished} onChange={(e) => setForm({ ...form, datePublished: e.target.value })} /></div>
          <div className="space-y-1.5"><AudioFieldLabel htmlFor="dateModified">Date Modified</AudioFieldLabel><Input id="dateModified" type="date" value={form.dateModified} onChange={(e) => setForm({ ...form, dateModified: e.target.value })} /></div>
        </CardContent>
      </Card>

      {/* Tags & Keywords */}
      <Card className="border-border bg-card shadow-sm shadow-black/5">
        <CardHeader className="border-b border-border pb-4"><CardTitle className="text-base font-semibold">Tags & Keywords</CardTitle></CardHeader>
        <CardContent className="grid gap-5 pt-5 sm:grid-cols-2">
          <div className="space-y-1.5"><AudioFieldLabel htmlFor="audioTags" fieldKey="tags">Tags</AudioFieldLabel><TagSuggestInput id="audioTags" value={form.tags} onChange={(next) => setForm({ ...form, tags: next })} /></div>
          <div className="space-y-1.5"><AudioFieldLabel htmlFor="audioKeywords" fieldKey="keywords">Keywords</AudioFieldLabel><KeywordSuggestInput id="audioKeywords" value={form.keywords} onChange={(next) => setForm({ ...form, keywords: next })} /></div>
        </CardContent>
      </Card>

      {/* Archival */}
      <Card className="border-border bg-card shadow-sm shadow-black/5">
        <CardHeader className="border-b border-border pb-4"><CardTitle className="text-base font-semibold">Archival</CardTitle></CardHeader>
        <CardContent className="grid gap-5 pt-5 sm:grid-cols-2">
          <div className="flex items-center gap-2 sm:col-span-2">
            <input id="physicalAvailability" type="checkbox" checked={Boolean(form.physicalAvailability)} onChange={(e) => setForm({ ...form, physicalAvailability: e.target.checked })} className="size-4 rounded border-input" />
            <Label htmlFor="physicalAvailability" className="cursor-pointer">A physical copy is available</Label>
            <FieldHelpButton metadata={getAudioFieldMetadata('physicalAvailability')} />
          </div>
          <div className="space-y-1.5"><AudioFieldLabel htmlFor="physicalLabel">Physical Label</AudioFieldLabel><Input id="physicalLabel" value={form.physicalLabel} onChange={(e) => setForm({ ...form, physicalLabel: e.target.value })} /></div>
          <div className="space-y-1.5"><AudioFieldLabel htmlFor="locationArchive">Archive Location</AudioFieldLabel><Input id="locationArchive" value={form.locationArchive} onChange={(e) => setForm({ ...form, locationArchive: e.target.value })} /></div>
          <div className="space-y-1.5"><AudioFieldLabel htmlFor="degitizedBy">Digitized By</AudioFieldLabel><Input id="degitizedBy" value={form.degitizedBy} onChange={(e) => setForm({ ...form, degitizedBy: e.target.value })} /></div>
          <div className="space-y-1.5"><AudioFieldLabel htmlFor="degitizationEquipment">Digitization Equipment</AudioFieldLabel><Input id="degitizationEquipment" value={form.degitizationEquipment} onChange={(e) => setForm({ ...form, degitizationEquipment: e.target.value })} /></div>
        </CardContent>
      </Card>

      {/* Technical */}
      <Card className="border-border bg-card shadow-sm shadow-black/5">
        <CardHeader className="border-b border-border pb-4"><CardTitle className="text-base font-semibold">Technical</CardTitle><CardDescription className="text-xs">Extension and file size auto-fill from the picked file.</CardDescription></CardHeader>
        <CardContent className="grid gap-5 pt-5 sm:grid-cols-3">
          <div className="space-y-1.5"><AudioFieldLabel htmlFor="audioChannel">Channel</AudioFieldLabel><Input id="audioChannel" value={form.audioChannel} onChange={(e) => setForm({ ...form, audioChannel: e.target.value })} placeholder="Mono, Stereo…" /></div>
          <div className="space-y-1.5"><AudioFieldLabel htmlFor="fileExtension">File Extension</AudioFieldLabel><Input id="fileExtension" value={form.fileExtension} onChange={(e) => setForm({ ...form, fileExtension: e.target.value })} placeholder="auto-filled (wav, mp3…)" /></div>
          <div className="space-y-1.5"><AudioFieldLabel htmlFor="fileSize">File Size</AudioFieldLabel><Input id="fileSize" value={form.fileSize} onChange={(e) => setForm({ ...form, fileSize: e.target.value })} placeholder="auto-filled (e.g. 45.2 MB)" /></div>
          <div className="space-y-1.5"><AudioFieldLabel htmlFor="bitRate">Bit Rate</AudioFieldLabel><Input id="bitRate" value={form.bitRate} onChange={(e) => setForm({ ...form, bitRate: e.target.value })} placeholder="e.g. 320 kbps" /></div>
          <div className="space-y-1.5"><AudioFieldLabel htmlFor="bitDepth">Bit Depth</AudioFieldLabel><Input id="bitDepth" value={form.bitDepth} onChange={(e) => setForm({ ...form, bitDepth: e.target.value })} placeholder="e.g. 24-bit" /></div>
          <div className="space-y-1.5"><AudioFieldLabel htmlFor="sampleRate">Sample Rate</AudioFieldLabel><Input id="sampleRate" value={form.sampleRate} onChange={(e) => setForm({ ...form, sampleRate: e.target.value })} placeholder="e.g. 48 kHz" /></div>
          <div className="space-y-1.5"><AudioFieldLabel htmlFor="audioQualityOutOf10">Quality (0–10)</AudioFieldLabel><Input id="audioQualityOutOf10" type="number" min="0" max="10" step="1" value={form.audioQualityOutOf10} onChange={(e) => setForm({ ...form, audioQualityOutOf10: e.target.value })} /></div>
        </CardContent>
      </Card>

      {/* ── Storage ─────────────────────────────────────────────────────────── */}
      {/*
       * Auto-fill matrix (what populates automatically when a file is picked):
       *
       *  Runtime              │ Volume Name │ Directory │ External Path │ Auto Path
       *  ─────────────────────┼─────────────┼───────────┼───────────────┼──────────
       *  Electron             │  ✓ Hard1    │  ✓ 1 MP3  │ ✓ 1 MP3/f.mp3 │  ✓
       *  Browser folder pick* │  ✗ (blank)  │  ✓ 1 MP3  │ ✓ 1 MP3/f.mp3 │  ✓
       *  Browser file pick    │  ✗ (blank)  │  ✗ (blank)│ ✗ (blank)     │  ✗
       *
       *  *) "Browser folder pick" = user clicks "Select Source Folder" below,
       *     then separately picks the file with the regular file picker above.
       *     External Path is constructed as "<folder>/<filename>" automatically
       *     when both the folder and the file have been selected.
       *
       * All fields remain fully editable after auto-fill.
       * Volume Name can always be typed manually regardless of runtime.
       */}
      <Card className="border-border bg-card shadow-sm shadow-black/5">
        <CardHeader className="border-b border-border pb-4">
          <CardTitle className="text-base font-semibold">Storage</CardTitle>
          <CardDescription className="text-xs">
            {isElectronRuntime()
              ? 'Volume, Directory, and External Path auto-fill from the file you pick above (Electron).'
              : 'In Electron: all fields auto-fill. In browser: use "Select Source Folder" to fill Directory and External Path; Volume Name must be typed.'}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-5 pt-5">
          {/* FolderSourcePicker — hidden in Electron, shown in browser */}
          <FolderSourcePicker
            currentFile={currentFile}
            onParsed={(result) => {
              setForm((prev) => ({
                ...prev,
                ...(result.directoryName && !prev.directoryName  ? { directoryName: result.directoryName }   : {}),
                ...(result.externalPath  && !prev.pathInExternal ? { pathInExternal: result.externalPath, autoPath: result.autoPath } : {}),
              }))
            }}
          />

          <div className="grid gap-5 sm:grid-cols-2">
            {/* Volume Name — auto-fills in Electron, manual otherwise */}
            <div className="space-y-1.5">
              <AudioFieldLabel htmlFor="volumeName">Volume Name</AudioFieldLabel>
              <Input
                id="volumeName"
                value={form.volumeName}
                onChange={(e) => setForm({ ...form, volumeName: e.target.value })}
                placeholder={isElectronRuntime() ? 'Auto-filled from file path (e.g. Hard1)' : 'Type the device name — e.g. Hard1, My Passport'}
              />
            </div>

            {/* Directory — auto-fills from file path OR folder picker */}
            <div className="space-y-1.5">
              <AudioFieldLabel htmlFor="directoryName">Directory</AudioFieldLabel>
              <Input
                id="directoryName"
                value={form.directoryName}
                onChange={(e) => setForm({ ...form, directoryName: e.target.value })}
                placeholder="Auto-filled from source folder (e.g. 1 MP3)"
              />
            </div>

            {/* External Path — drives Auto Path derivation */}
            <div className="space-y-1.5 sm:col-span-2">
              <AudioFieldLabel htmlFor="pathInExternal">External Path</AudioFieldLabel>
              <Input
                id="pathInExternal"
                value={form.pathInExternal}
                onChange={(e) => {
                  const raw = e.target.value
                  // Strip Windows drive letter / leading slash; normalise separators.
                  const withoutDisk = raw
                    .replace(/^[A-Za-z]:[\\\/]+/, '')
                    .replace(/^\/+/, '')
                    .replace(/\\/g, '/')
                  const segs = withoutDisk.split('/').filter(Boolean)
                  const parentDir = segs.length >= 2 ? segs[segs.length - 2] : ''
                  setForm((prev) => ({
                    ...prev,
                    pathInExternal: raw,
                    autoPath: withoutDisk,
                    ...(parentDir && !prev.directoryName ? { directoryName: parentDir } : {}),
                  }))
                }}
                placeholder={isElectronRuntime() ? 'Auto-filled (e.g. بۆ پلاتفۆرمەکە/دەنگ/سێوە/1 MP3/track.mp3)' : 'e.g. 1 MP3/track.mp3  (auto-filled after folder selection)'}
              />
            </div>

            {/* Auto Path — synced from External Path; always editable */}
            <div className="space-y-1.5 sm:col-span-2">
              <div className="flex items-center justify-between gap-2">
                <Label htmlFor="autoPath" className="flex items-center gap-1.5">
                  Auto Path
                  <span className="rounded-full border border-border bg-muted/50 px-1.5 py-0.5 text-[10px] font-normal text-muted-foreground">
                    synced · editable
                  </span>
                </Label>
                <FieldHelpButton metadata={getAudioFieldMetadata('autoPath')} />
              </div>
              <Input
                id="autoPath"
                value={form.autoPath}
                onChange={(e) => setForm({ ...form, autoPath: e.target.value })}
                placeholder="Synced from External Path without drive letter"
                className="font-mono text-xs"
              />
            </div>

            <div className="space-y-1.5 sm:col-span-2">
              <AudioFieldLabel htmlFor="audioFileNote">File Note</AudioFieldLabel>
              <textarea id="audioFileNote" className={TEXTAREA_CLASS} value={form.audioFileNote} onChange={(e) => setForm({ ...form, audioFileNote: e.target.value })} />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Rights & Provenance */}
      <Card className="border-border bg-card shadow-sm shadow-black/5">
        <CardHeader className="border-b border-border pb-4"><CardTitle className="text-base font-semibold">Rights & Provenance</CardTitle></CardHeader>
        <CardContent className="grid gap-5 pt-5 sm:grid-cols-2">
          <div className="space-y-1.5"><AudioFieldLabel htmlFor="copyright">Copyright</AudioFieldLabel><Input id="copyright" value={form.copyright} onChange={(e) => setForm({ ...form, copyright: e.target.value })} /></div>
          <div className="space-y-1.5"><AudioFieldLabel htmlFor="rightOwner">Right Owner</AudioFieldLabel><Input id="rightOwner" value={form.rightOwner} onChange={(e) => setForm({ ...form, rightOwner: e.target.value })} /></div>
          <div className="space-y-1.5"><AudioFieldLabel htmlFor="dateCopyrighted">Date Copyrighted</AudioFieldLabel><Input id="dateCopyrighted" type="date" value={form.dateCopyrighted} onChange={(e) => setForm({ ...form, dateCopyrighted: e.target.value })} /></div>
          <div className="space-y-1.5"><AudioFieldLabel htmlFor="availability">Availability</AudioFieldLabel><Input id="availability" value={form.availability} onChange={(e) => setForm({ ...form, availability: e.target.value })} /></div>
          <div className="space-y-1.5"><AudioFieldLabel htmlFor="licenseType">License Type</AudioFieldLabel><Input id="licenseType" value={form.licenseType} onChange={(e) => setForm({ ...form, licenseType: e.target.value })} /></div>
          <div className="space-y-1.5"><AudioFieldLabel htmlFor="usageRights">Usage Rights</AudioFieldLabel><Input id="usageRights" value={form.usageRights} onChange={(e) => setForm({ ...form, usageRights: e.target.value })} /></div>
          <div className="space-y-1.5"><AudioFieldLabel htmlFor="owner">Owner</AudioFieldLabel><Input id="owner" value={form.owner} onChange={(e) => setForm({ ...form, owner: e.target.value })} /></div>
          <div className="space-y-1.5"><AudioFieldLabel htmlFor="publisher">Publisher</AudioFieldLabel><Input id="publisher" value={form.publisher} onChange={(e) => setForm({ ...form, publisher: e.target.value })} /></div>
          <div className="space-y-1.5"><AudioFieldLabel htmlFor="provenance">Provenance</AudioFieldLabel><Input id="provenance" value={form.provenance} onChange={(e) => setForm({ ...form, provenance: e.target.value })} /></div>
          <div className="space-y-1.5"><AudioFieldLabel htmlFor="accrualMethod">Accrual Method</AudioFieldLabel><Input id="accrualMethod" value={form.accrualMethod} onChange={(e) => setForm({ ...form, accrualMethod: e.target.value })} /></div>
          <div className="space-y-1.5"><AudioFieldLabel htmlFor="lccClassification">LCC Classification</AudioFieldLabel><Input id="lccClassification" value={form.lccClassification} onChange={(e) => setForm({ ...form, lccClassification: e.target.value })} /></div>
          <div className="space-y-1.5 sm:col-span-2"><AudioFieldLabel htmlFor="archiveLocalNote">Archive Local Note</AudioFieldLabel><textarea id="archiveLocalNote" className={TEXTAREA_CLASS} value={form.archiveLocalNote} onChange={(e) => setForm({ ...form, archiveLocalNote: e.target.value })} /></div>
        </CardContent>
      </Card>
    </>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Media type tabs
// ─────────────────────────────────────────────────────────────────────────────

function MediaTypeTabs({ mediaType, onChange, audioCount, videoCount, imageCount, textCount }) {
  const types = [
    { key: 'audio', label: 'Audio', icon: AudioLines, count: audioCount },
    { key: 'video', label: 'Video', icon: VideoIcon,  count: videoCount },
    { key: 'image', label: 'Image', icon: ImageIcon,  count: imageCount },
    { key: 'text',  label: 'Text',  icon: FileText,   count: textCount  },
  ]
  return (
    <div className="flex flex-wrap items-center gap-1 rounded-xl border border-border bg-card/60 p-1 shadow-sm">
      {types.map(({ key, label, icon: Icon, count }) => {
        const active = mediaType === key
        return (
          <button key={key} type="button" onClick={() => onChange(key)} aria-pressed={active}
            className={cn('inline-flex items-center gap-2 rounded-lg px-3 py-1.5 text-sm font-medium transition-colors', active ? 'bg-primary/10 font-semibold text-primary' : 'text-muted-foreground hover:bg-muted/50 hover:text-foreground')}>
            <Icon className="size-4" />{label}
            {typeof count === 'number' && <span className={cn('inline-flex items-center rounded-full px-1.5 py-0.5 text-[10px] font-bold tabular-nums', active ? 'bg-primary/20' : 'bg-muted text-muted-foreground')}>{count}</span>}
          </button>
        )
      })}
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// List sections (Audio / Video / Image / Text)
// ─────────────────────────────────────────────────────────────────────────────

function AudioListSection({ isLoading, audios, filteredAudios, searchQuery, filtersOrSortActive, onClearFiltersAndSort, onAdd, onEdit, onDetails, onDelete }) {
  if (isLoading) return <SkeletonList />
  if (!audios.length) return <EmptyState icon={AudioLines} title="No audios yet" description="Upload recordings and they will be coded here." action={<Button onClick={onAdd} className="gap-2"><Plus className="size-4" />Add Audio</Button>} />
  return (
    <div className="overflow-hidden rounded-xl border border-border bg-card shadow-sm shadow-black/5">
      <Table>
        <TableHeader><TableRow className="bg-muted/40 hover:bg-muted/40"><TableHead className="w-[52px] text-center">#</TableHead><TableHead className="w-[280px]">Code</TableHead><TableHead className="w-[280px]">Title</TableHead><TableHead className="w-[120px]">Version</TableHead><TableHead>Genre</TableHead><TableHead className="w-[180px] text-right">Actions</TableHead></TableRow></TableHeader>
        <TableBody>
          {filteredAudios.length === 0 ? <EmptyFilterRow colSpan={6} active={filtersOrSortActive} onClear={onClearFiltersAndSort} label="audios" /> : filteredAudios.map((audio, i) => {
            const title = audio.originTitle || audio.alterTitle || audio.romanizedTitle || audio.fullName || audio.audioCode
            return (
              <TableRow key={audio.audioCode} className={cn('group transition-colors', audio.removedAt && 'opacity-60')}>
                <TableCell className="text-center text-xs tabular-nums text-muted-foreground">{i + 1}</TableCell>
                <TableCell><CodeBadge code={audio.audioCode} variant="subtle" highlightQuery={searchQuery} /></TableCell>
                <TableCell>
                  <button type="button" onClick={() => onDetails(audio)} className="block max-w-[280px] truncate text-left font-semibold leading-tight text-foreground hover:text-primary"><Highlight text={title} query={searchQuery} /></button>
                  {audio.removedAt && <RemovedBadge />}
                </TableCell>
                <TableCell><VersionBadge version={audio.audioVersion} vNum={audio.versionNumber} cNum={audio.copyNumber} query={searchQuery} /></TableCell>
                <TableCell><GenrePills genres={audio.genre} query={searchQuery} /></TableCell>
                <TableCell className="text-right"><RowActions onDetails={() => onDetails(audio)} onEdit={() => onEdit(audio)} onDelete={() => onDelete(audio)} /></TableCell>
              </TableRow>
            )
          })}
        </TableBody>
      </Table>
    </div>
  )
}

function VideoListSection({ isLoading, videos, filteredVideos, searchQuery, filtersOrSortActive, onClearFiltersAndSort, onAdd, onEdit, onDetails, onDelete }) {
  if (isLoading) return <SkeletonList />
  if (!videos.length) return <EmptyState icon={VideoIcon} title="No videos yet" description="Upload footage and it will be coded here." action={<Button onClick={onAdd} className="gap-2"><Plus className="size-4" />Add Video</Button>} />
  return (
    <div className="overflow-hidden rounded-xl border border-border bg-card shadow-sm shadow-black/5">
      <Table>
        <TableHeader><TableRow className="bg-muted/40 hover:bg-muted/40"><TableHead className="w-[52px] text-center">#</TableHead><TableHead className="w-[260px]">Code</TableHead><TableHead className="w-[280px]">Title</TableHead><TableHead className="w-[140px]">Version</TableHead><TableHead className="w-[140px]">Resolution</TableHead><TableHead>Genre</TableHead><TableHead className="w-[180px] text-right">Actions</TableHead></TableRow></TableHeader>
        <TableBody>
          {filteredVideos.length === 0 ? <EmptyFilterRow colSpan={7} active={filtersOrSortActive} onClear={onClearFiltersAndSort} label="videos" /> : filteredVideos.map((v, i) => {
            const title = v.originalTitle || v.alternativeTitle || v.romanizedTitle || v.fileName || v.videoCode
            return (
              <TableRow key={v.videoCode} className={cn('group transition-colors', v.removedAt && 'opacity-60')}>
                <TableCell className="text-center text-xs tabular-nums text-muted-foreground">{i + 1}</TableCell>
                <TableCell><CodeBadge code={v.videoCode} variant="subtle" highlightQuery={searchQuery} /></TableCell>
                <TableCell>
                  <button type="button" onClick={() => onDetails(v)} className="block max-w-[280px] truncate text-left font-semibold leading-tight text-foreground hover:text-primary"><Highlight text={title} query={searchQuery} /></button>
                  {v.removedAt && <RemovedBadge />}
                </TableCell>
                <TableCell><VersionBadge version={v.videoVersion} vNum={v.versionNumber} cNum={v.copyNumber} query={searchQuery} /></TableCell>
                <TableCell><span className="text-sm text-muted-foreground">{v.resolution || v.dimension ? <Highlight text={v.resolution || v.dimension} query={searchQuery} /> : '—'}</span></TableCell>
                <TableCell><GenrePills genres={v.genre} query={searchQuery} /></TableCell>
                <TableCell className="text-right"><RowActions onDetails={() => onDetails(v)} onEdit={() => onEdit(v)} onDelete={() => onDelete(v)} /></TableCell>
              </TableRow>
            )
          })}
        </TableBody>
      </Table>
    </div>
  )
}

function ImageListSection({ isLoading, images, filteredImages, searchQuery, filtersOrSortActive, onClearFiltersAndSort, onAdd, onEdit, onDetails, onDelete }) {
  if (isLoading) return <SkeletonList />
  if (!images.length) return <EmptyState icon={ImageIcon} title="No images yet" description="Upload photos and they will be coded here." action={<Button onClick={onAdd} className="gap-2"><Plus className="size-4" />Add Image</Button>} />
  return (
    <div className="overflow-hidden rounded-xl border border-border bg-card shadow-sm shadow-black/5">
      <Table>
        <TableHeader><TableRow className="bg-muted/40 hover:bg-muted/40"><TableHead className="w-[52px] text-center">#</TableHead><TableHead className="w-[80px]">Preview</TableHead><TableHead className="w-[260px]">Code</TableHead><TableHead className="w-[280px]">Title</TableHead><TableHead className="w-[140px]">Version</TableHead><TableHead className="w-[140px]">Dimension</TableHead><TableHead>Genre</TableHead><TableHead className="w-[180px] text-right">Actions</TableHead></TableRow></TableHeader>
        <TableBody>
          {filteredImages.length === 0 ? <EmptyFilterRow colSpan={8} active={filtersOrSortActive} onClear={onClearFiltersAndSort} label="images" /> : filteredImages.map((img, i) => {
            const title = img.originalTitle || img.alternativeTitle || img.romanizedTitle || img.fileName || img.imageCode
            return (
              <TableRow key={img.imageCode} className={cn('group transition-colors', img.removedAt && 'opacity-60')}>
                <TableCell className="text-center text-xs tabular-nums text-muted-foreground">{i + 1}</TableCell>
                <TableCell>{img.imageFileUrl ? (<button type="button" onClick={() => onDetails(img)} className="block size-12 overflow-hidden rounded-md border bg-muted/40 transition hover:ring-2 hover:ring-primary/30"><img src={img.imageFileUrl} alt={title} className="h-full w-full object-cover" loading="lazy" /></button>) : <div className="flex size-12 items-center justify-center rounded-md border bg-muted/40 text-muted-foreground"><ImageIcon className="size-4" /></div>}</TableCell>
                <TableCell><CodeBadge code={img.imageCode} variant="subtle" highlightQuery={searchQuery} /></TableCell>
                <TableCell>
                  <button type="button" onClick={() => onDetails(img)} className="block max-w-[280px] truncate text-left font-semibold leading-tight text-foreground hover:text-primary"><Highlight text={title} query={searchQuery} /></button>
                  {img.removedAt && <RemovedBadge />}
                </TableCell>
                <TableCell><VersionBadge version={img.imageVersion} vNum={img.versionNumber} cNum={img.copyNumber} query={searchQuery} /></TableCell>
                <TableCell><span className="text-sm text-muted-foreground">{img.dimension ? <Highlight text={img.dimension} query={searchQuery} /> : '—'}</span></TableCell>
                <TableCell><GenrePills genres={img.genre} query={searchQuery} /></TableCell>
                <TableCell className="text-right"><RowActions onDetails={() => onDetails(img)} onEdit={() => onEdit(img)} onDelete={() => onDelete(img)} /></TableCell>
              </TableRow>
            )
          })}
        </TableBody>
      </Table>
    </div>
  )
}

function TextListSection({ isLoading, texts, filteredTexts, searchQuery, filtersOrSortActive, onClearFiltersAndSort, onAdd, onEdit, onDetails, onDelete }) {
  if (isLoading) return <SkeletonList />
  if (!texts.length) return <EmptyState icon={FileText} title="No texts yet" description="Upload documents and they will be coded here." action={<Button onClick={onAdd} className="gap-2"><Plus className="size-4" />Add Text</Button>} />
  return (
    <div className="overflow-hidden rounded-xl border border-border bg-card shadow-sm shadow-black/5">
      <Table>
        <TableHeader><TableRow className="bg-muted/40 hover:bg-muted/40"><TableHead className="w-[52px] text-center">#</TableHead><TableHead className="w-[260px]">Code</TableHead><TableHead className="w-[280px]">Title</TableHead><TableHead className="w-[140px]">Version</TableHead><TableHead className="w-[160px]">Author</TableHead><TableHead className="w-[100px] text-right">Pages</TableHead><TableHead>Genre</TableHead><TableHead className="w-[180px] text-right">Actions</TableHead></TableRow></TableHeader>
        <TableBody>
          {filteredTexts.length === 0 ? <EmptyFilterRow colSpan={8} active={filtersOrSortActive} onClear={onClearFiltersAndSort} label="texts" /> : filteredTexts.map((t, i) => {
            const title = t.originalTitle || t.alternativeTitle || t.romanizedTitle || t.fileName || t.textCode
            return (
              <TableRow key={t.textCode} className={cn('group transition-colors', t.removedAt && 'opacity-60')}>
                <TableCell className="text-center text-xs tabular-nums text-muted-foreground">{i + 1}</TableCell>
                <TableCell><CodeBadge code={t.textCode} variant="subtle" highlightQuery={searchQuery} /></TableCell>
                <TableCell>
                  <button type="button" onClick={() => onDetails(t)} className="block max-w-[280px] truncate text-left font-semibold leading-tight text-foreground hover:text-primary"><Highlight text={title} query={searchQuery} /></button>
                  {t.removedAt && <RemovedBadge />}
                </TableCell>
                <TableCell><VersionBadge version={t.textVersion} vNum={t.versionNumber} cNum={t.copyNumber} query={searchQuery} /></TableCell>
                <TableCell><span className="block max-w-[160px] truncate text-sm text-muted-foreground">{t.author ? <Highlight text={t.author} query={searchQuery} /> : '—'}</span></TableCell>
                <TableCell className="text-right tabular-nums text-sm text-muted-foreground">{t.pageCount ?? '—'}</TableCell>
                <TableCell><GenrePills genres={t.genre} query={searchQuery} /></TableCell>
                <TableCell className="text-right"><RowActions onDetails={() => onDetails(t)} onEdit={() => onEdit(t)} onDelete={() => onDelete(t)} /></TableCell>
              </TableRow>
            )
          })}
        </TableBody>
      </Table>
    </div>
  )
}

// ── Tiny shared UI atoms ──────────────────────────────────────────────────────

function SkeletonList() {
  return (
    <Card className="border-border bg-card shadow-sm shadow-black/5">
      <div className="divide-y divide-border">
        {[1, 2, 3].map((i) => (
          <div key={i} className="flex items-center gap-4 px-4 py-3">
            <Skeleton className="h-4 w-6" /><Skeleton className="h-6 w-52 rounded-md" />
            <Skeleton className="h-4 w-40" /><Skeleton className="h-5 w-24 rounded-full" />
            <Skeleton className="ml-auto h-7 w-20" />
          </div>
        ))}
      </div>
    </Card>
  )
}

function EmptyFilterRow({ colSpan, active, onClear, label }) {
  return (
    <TableRow>
      <TableCell colSpan={colSpan} className="h-24 text-center text-muted-foreground">
        {active ? (
          <span className="inline-flex items-center gap-2">
            No {label} match the current filters.
            <Button type="button" variant="ghost" size="sm" onClick={onClear} className="h-7 gap-1 px-2 text-xs">
              <X className="size-3" />Clear filters
            </Button>
          </span>
        ) : `No matching ${label}.`}
      </TableCell>
    </TableRow>
  )
}

function RemovedBadge() {
  return <span className="inline-flex items-center rounded-full border border-amber-500/30 bg-amber-500/10 px-2 py-0.5 text-[10px] font-medium text-amber-700 dark:text-amber-300">Removed</span>
}

function VersionBadge({ version, vNum, cNum, query }) {
  return (
    <span className="inline-flex items-center gap-1 rounded-full border bg-background px-2 py-0.5 text-[11px] font-medium">
      {version ? <Highlight text={version} query={query} /> : '—'}
      {vNum != null && <span className="text-muted-foreground">v{vNum}</span>}
      {cNum != null && <span className="text-muted-foreground">c{cNum}</span>}
    </span>
  )
}

function GenrePills({ genres, query }) {
  const list = Array.isArray(genres) ? genres : genres ? [genres] : []
  if (!list.length) return <span className="text-sm text-muted-foreground">—</span>
  const visible = list.slice(0, 2); const extra = list.length - visible.length
  return (
    <div className="flex flex-wrap gap-1">
      {visible.map((g) => <span key={g} className="inline-flex items-center rounded-full border bg-muted/40 px-2 py-0.5 text-[11px] font-medium text-foreground/80"><Highlight text={g} query={query} /></span>)}
      {extra > 0 && <span className="text-[11px] font-medium text-muted-foreground">+{extra}</span>}
    </div>
  )
}

function RowActions({ onDetails, onEdit, onDelete }) {
  return (
    <div className="flex items-center justify-end gap-1">
      <Button type="button" variant="outline" size="sm" className="h-7 gap-1 px-2 text-xs" onClick={onDetails}><Eye className="size-3.5" />Details</Button>
      <Button variant="ghost" size="icon-xs" className="text-muted-foreground hover:text-foreground" onClick={onEdit}><Pencil className="size-3.5" /><span className="sr-only">Edit</span></Button>
      <Button variant="ghost" size="icon-xs" className="text-destructive/70 hover:bg-destructive/10 hover:text-destructive" onClick={onDelete}><Trash2 className="size-3.5" /><span className="sr-only">Send to trash</span></Button>
    </div>
  )
}

export { EmployeeProjectDetailPage }
