// Video-form helpers — kept in a sibling module so the project detail page stays
// readable. Mirrors the audio-form shape but with video-specific field names
// (originalTitle vs originTitle, videoCode vs audioCode, extension vs
// fileExtension, etc.) and the wider videoVersion enum.

export const VIDEO_VERSIONS = [
  'RAW',
  'MASTER',
  'RESTORED',
  'ARCHIVE',
  'ORIGINAL',
  '4K_MASTER',
  'PROFESSIONAL',
]

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

export function createInitialVideoForm() {
  return {
    videoVersion: 'RAW',
    versionNumber: '1',
    copyNumber: '1',

    fileName: '',
    originalTitle: '',
    alternativeTitle: '',
    titleInCentralKurdish: '',
    romanizedTitle: '',

    description: '',
    event: '',
    location: '',
    subject: [],
    genre: [],

    personShownInVideo: '',
    colorOfVideo: [],
    whereThisVideoUsed: [],

    fileSize: '',
    extension: '',
    orientation: '',
    dimension: '',
    resolution: '',
    duration: '',
    bitDepth: '',
    frameRate: '',
    overallBitRate: '',
    videoCodec: '',
    audioCodec: '',
    audioChannels: '',

    language: '',
    dialect: '',
    subtitle: '',

    creatorArtistDirector: '',
    producer: '',
    contributor: '',
    audience: '',

    accrualMethod: '',
    provenance: '',
    videoStatus: '',
    archiveCataloging: '',
    physicalAvailability: false,
    physicalLabel: '',
    locationInArchiveRoom: '',
    lccClassification: '',
    note: '',

    tags: [],
    keywords: [],

    dateCreated: '',
    dateModified: '',
    datePublished: '',

    copyright: '',
    rightOwner: '',
    dateCopyrighted: '',
    licenseType: '',
    usageRights: '',
    availability: '',
    owner: '',
    publisher: '',

    volumeName: '',
    directory: '',
    pathInExternalVolume: '',
    autoPath: '',
  }
}

export function buildVideoPayload(form, projectCode) {
  return {
    projectCode,
    videoVersion: form.videoVersion ? form.videoVersion.toUpperCase() : null,
    versionNumber: form.versionNumber ? Number(form.versionNumber) : null,
    copyNumber: form.copyNumber ? Number(form.copyNumber) : null,

    fileName: trimOrNull(form.fileName),
    originalTitle: trimOrNull(form.originalTitle),
    alternativeTitle: trimOrNull(form.alternativeTitle),
    titleInCentralKurdish: trimOrNull(form.titleInCentralKurdish),
    romanizedTitle: trimOrNull(form.romanizedTitle),

    description: trimOrNull(form.description),
    event: trimOrNull(form.event),
    location: trimOrNull(form.location),
    subject: toArray(form.subject),
    genre: toArray(form.genre),

    personShownInVideo: trimOrNull(form.personShownInVideo),
    colorOfVideo: toArray(form.colorOfVideo),
    whereThisVideoUsed: toArray(form.whereThisVideoUsed),

    fileSize: trimOrNull(form.fileSize),
    extension: trimOrNull(form.extension),
    orientation: trimOrNull(form.orientation),
    dimension: trimOrNull(form.dimension),
    resolution: trimOrNull(form.resolution),
    duration: trimOrNull(form.duration),
    bitDepth: trimOrNull(form.bitDepth),
    frameRate: trimOrNull(form.frameRate),
    overallBitRate: trimOrNull(form.overallBitRate),
    videoCodec: trimOrNull(form.videoCodec),
    audioCodec: trimOrNull(form.audioCodec),
    audioChannels: trimOrNull(form.audioChannels),

    language: trimOrNull(form.language),
    dialect: trimOrNull(form.dialect),
    subtitle: trimOrNull(form.subtitle),

    creatorArtistDirector: trimOrNull(form.creatorArtistDirector),
    producer: trimOrNull(form.producer),
    contributor: trimOrNull(form.contributor),
    audience: trimOrNull(form.audience),

    accrualMethod: trimOrNull(form.accrualMethod),
    provenance: trimOrNull(form.provenance),
    videoStatus: trimOrNull(form.videoStatus),
    archiveCataloging: trimOrNull(form.archiveCataloging),
    physicalAvailability: Boolean(form.physicalAvailability),
    physicalLabel: trimOrNull(form.physicalLabel),
    locationInArchiveRoom: trimOrNull(form.locationInArchiveRoom),
    lccClassification: trimOrNull(form.lccClassification),
    note: trimOrNull(form.note),

    tags: toArray(form.tags),
    keywords: toArray(form.keywords),

    dateCreated: fromDateInputValue(form.dateCreated),
    dateModified: fromDateInputValue(form.dateModified),
    datePublished: fromDateInputValue(form.datePublished),

    copyright: trimOrNull(form.copyright),
    rightOwner: trimOrNull(form.rightOwner),
    dateCopyrighted: fromDateInputValue(form.dateCopyrighted),
    licenseType: trimOrNull(form.licenseType),
    usageRights: trimOrNull(form.usageRights),
    availability: trimOrNull(form.availability),
    owner: trimOrNull(form.owner),
    publisher: trimOrNull(form.publisher),

    volumeName: trimOrNull(form.volumeName),
    directory: trimOrNull(form.directory),
    pathInExternalVolume: trimOrNull(form.pathInExternalVolume),
    autoPath: trimOrNull(form.autoPath),
  }
}

export function populateVideoFormFromVideo(video) {
  return {
    ...createInitialVideoForm(),
    videoVersion: video.videoVersion || 'RAW',
    versionNumber: video.versionNumber != null ? String(video.versionNumber) : '1',
    copyNumber: video.copyNumber != null ? String(video.copyNumber) : '1',

    fileName: video.fileName || '',
    originalTitle: video.originalTitle || '',
    alternativeTitle: video.alternativeTitle || '',
    titleInCentralKurdish: video.titleInCentralKurdish || '',
    romanizedTitle: video.romanizedTitle || '',

    description: video.description || '',
    event: video.event || '',
    location: video.location || '',
    subject: toArray(video.subject),
    genre: toArray(video.genre),

    personShownInVideo: video.personShownInVideo || '',
    colorOfVideo: toArray(video.colorOfVideo),
    whereThisVideoUsed: toArray(video.whereThisVideoUsed),

    fileSize: video.fileSize || '',
    extension: video.extension || '',
    orientation: video.orientation || '',
    dimension: video.dimension || '',
    resolution: video.resolution || '',
    duration: video.duration || '',
    bitDepth: video.bitDepth || '',
    frameRate: video.frameRate || '',
    overallBitRate: video.overallBitRate || '',
    videoCodec: video.videoCodec || '',
    audioCodec: video.audioCodec || '',
    audioChannels: video.audioChannels || '',

    language: video.language || '',
    dialect: video.dialect || '',
    subtitle: video.subtitle || '',

    creatorArtistDirector: video.creatorArtistDirector || '',
    producer: video.producer || '',
    contributor: video.contributor || '',
    audience: video.audience || '',

    accrualMethod: video.accrualMethod || '',
    provenance: video.provenance || '',
    videoStatus: video.videoStatus || '',
    archiveCataloging: video.archiveCataloging || '',
    physicalAvailability: Boolean(video.physicalAvailability),
    physicalLabel: video.physicalLabel || '',
    locationInArchiveRoom: video.locationInArchiveRoom || '',
    lccClassification: video.lccClassification || '',
    note: video.note || '',

    tags: toArray(video.tags),
    keywords: toArray(video.keywords),

    dateCreated: toDateInputValue(video.dateCreated),
    dateModified: toDateInputValue(video.dateModified),
    datePublished: toDateInputValue(video.datePublished),

    copyright: video.copyright || '',
    rightOwner: video.rightOwner || '',
    dateCopyrighted: toDateInputValue(video.dateCopyrighted),
    licenseType: video.licenseType || '',
    usageRights: video.usageRights || '',
    availability: video.availability || '',
    owner: video.owner || '',
    publisher: video.publisher || '',

    volumeName: video.volumeName || '',
    directory: video.directory || '',
    pathInExternalVolume: video.pathInExternalVolume || '',
    autoPath: video.autoPath || '',
  }
}

export function deriveVideoAutoFieldsFromFile(file) {
  if (!file) return null
  const name = file.name || ''
  const dot = name.lastIndexOf('.')
  const ext = dot > -1 ? name.slice(dot + 1).toLowerCase() : ''
  // See comment in EmployeeProjectDetailPage's deriveAutoFieldsFromFile:
  // these path/volume/directory fields describe the SOURCE folder the
  // file came from. The browser only exposes that when the user picks a
  // folder via <input webkitdirectory>; for single-file pickers the
  // absolute path is hidden, so we leave these blank rather than guess.
  const relativePath = file.webkitRelativePath || ''

  let volumeName = ''
  let directory = ''
  let path = ''
  if (relativePath) {
    const parts = relativePath.split('/').filter(Boolean)
    if (parts.length >= 2) {
      volumeName = parts[0]
      directory = parts[parts.length - 2]
    }
    path = relativePath
  }

  return {
    fileName: name,
    extension: ext,
    fileSize: formatFileSize(file.size),
    pathInExternalVolume: path,
    autoPath: path,
    volumeName,
    directory,
  }
}
