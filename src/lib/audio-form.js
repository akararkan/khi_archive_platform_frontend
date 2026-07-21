import { getFileSourcePath } from '@/lib/file-source-path'

// Audio-form helpers — extracted from EmployeeProjectDetailPage so the audio
// create/edit form can be reused outside the project-detail page (e.g. the
// unified "List of Items" edit view). Mirrors the video-form / image-form /
// text-form shape with audio-specific field names (originTitle vs
// originalTitle, audioCode vs videoCode, fileExtension vs extension, etc.).
//
// NOTE: this is a verbatim lift of the helpers that previously lived inline in
// EmployeeProjectDetailPage.jsx — behavior is identical so both surfaces build
// the exact same payload.

export const AUDIO_VERSIONS = ['RAW', 'MASTER']

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

export function createInitialAudioForm() {
  return {
    audioVersion: 'RAW',
    versionNumber: '1',
    copyNumber: '1',

    fileName: '',
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
    duration: '',
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
    isPublic: false,
  }
}

export function buildAudioPayload(form, projectCode) {
  return {
    projectCode,

    audioVersion: form.audioVersion ? form.audioVersion.toUpperCase() : null,
    versionNumber: form.versionNumber ? Number(form.versionNumber) : null,
    copyNumber: form.copyNumber ? Number(form.copyNumber) : null,

    fileName: trimOrNull(form.fileName),
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
    duration: trimOrNull(form.duration),
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
    isPublic: form.isPublic === true,
  }
}

export function populateAudioFormFromAudio(audio) {
  return {
    ...createInitialAudioForm(),
    audioVersion: audio.audioVersion || 'RAW',
    versionNumber: audio.versionNumber != null ? String(audio.versionNumber) : '1',
    copyNumber: audio.copyNumber != null ? String(audio.copyNumber) : '1',

    fileName: audio.fileName || '',
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
    duration: audio.duration || '',
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
    isPublic: audio.isPublic === true,
  }
}

// Derive the file-bound technical fields from a freshly picked File. Mirrors
// the video/image/text deriveAutoFieldsFromFile helpers but with audio field
// names (fileExtension, pathInExternal, directoryName). Source path / volume /
// directory can only be read when the user begins at a folder
// (webkitRelativePath); the UI then attaches one file from that tree.
export function deriveAudioAutoFieldsFromFile(file) {
  if (!file) return null
  const name = file.name || ''
  const dot = name.lastIndexOf('.')
  const ext = dot > -1 ? name.slice(dot + 1).toLowerCase() : ''
  const { path, volumeName, directory: directoryName } = getFileSourcePath(file)

  return {
    fileName: name,
    fileExtension: ext,
    fileSize: formatFileSize(file.size),
    // Never overwrite manually entered storage information with empty values
    // when a standard browser hides the source path.
    ...(path ? { pathInExternal: path } : {}),
    ...(volumeName ? { volumeName } : {}),
    ...(directoryName ? { directoryName } : {}),
  }
}
