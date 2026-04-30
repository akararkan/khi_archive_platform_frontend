// Image-form helpers — mirrors video-form, with image-specific fields
// (imageVersion enum, dpi, manufacturer/model/lens, photostory, etc.).

export const IMAGE_VERSIONS = [
  'RAW',
  'MASTER',
  'RESTORED',
  'ARCHIVE',
  'ORIGINAL',
  'HIGH_RES',
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

export function createInitialImageForm() {
  return {
    imageVersion: 'RAW',
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
    form: '',
    genre: [],

    personShownInImage: '',
    colorOfImage: [],
    whereThisImageUsed: [],

    fileSize: '',
    extension: '',
    orientation: '',
    dimension: '',
    bitDepth: '',
    dpi: '',

    manufacturer: '',
    model: '',
    lens: '',

    creatorArtistPhotographer: '',
    contributor: '',
    audience: '',

    accrualMethod: '',
    provenance: '',
    photostory: '',
    imageStatus: '',
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

export function buildImagePayload(form, projectCode) {
  return {
    projectCode,
    imageVersion: form.imageVersion ? form.imageVersion.toUpperCase() : null,
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
    form: trimOrNull(form.form),
    genre: toArray(form.genre),

    personShownInImage: trimOrNull(form.personShownInImage),
    colorOfImage: toArray(form.colorOfImage),
    whereThisImageUsed: toArray(form.whereThisImageUsed),

    fileSize: trimOrNull(form.fileSize),
    extension: trimOrNull(form.extension),
    orientation: trimOrNull(form.orientation),
    dimension: trimOrNull(form.dimension),
    bitDepth: trimOrNull(form.bitDepth),
    dpi: trimOrNull(form.dpi),

    manufacturer: trimOrNull(form.manufacturer),
    model: trimOrNull(form.model),
    lens: trimOrNull(form.lens),

    creatorArtistPhotographer: trimOrNull(form.creatorArtistPhotographer),
    contributor: trimOrNull(form.contributor),
    audience: trimOrNull(form.audience),

    accrualMethod: trimOrNull(form.accrualMethod),
    provenance: trimOrNull(form.provenance),
    photostory: trimOrNull(form.photostory),
    imageStatus: trimOrNull(form.imageStatus),
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

export function populateImageFormFromImage(image) {
  return {
    ...createInitialImageForm(),
    imageVersion: image.imageVersion || 'RAW',
    versionNumber: image.versionNumber != null ? String(image.versionNumber) : '1',
    copyNumber: image.copyNumber != null ? String(image.copyNumber) : '1',

    fileName: image.fileName || '',
    originalTitle: image.originalTitle || '',
    alternativeTitle: image.alternativeTitle || '',
    titleInCentralKurdish: image.titleInCentralKurdish || '',
    romanizedTitle: image.romanizedTitle || '',

    description: image.description || '',
    event: image.event || '',
    location: image.location || '',
    subject: toArray(image.subject),
    form: image.form || '',
    genre: toArray(image.genre),

    personShownInImage: image.personShownInImage || '',
    colorOfImage: toArray(image.colorOfImage),
    whereThisImageUsed: toArray(image.whereThisImageUsed),

    fileSize: image.fileSize || '',
    extension: image.extension || '',
    orientation: image.orientation || '',
    dimension: image.dimension || '',
    bitDepth: image.bitDepth || '',
    dpi: image.dpi || '',

    manufacturer: image.manufacturer || '',
    model: image.model || '',
    lens: image.lens || '',

    creatorArtistPhotographer: image.creatorArtistPhotographer || '',
    contributor: image.contributor || '',
    audience: image.audience || '',

    accrualMethod: image.accrualMethod || '',
    provenance: image.provenance || '',
    photostory: image.photostory || '',
    imageStatus: image.imageStatus || '',
    archiveCataloging: image.archiveCataloging || '',
    physicalAvailability: Boolean(image.physicalAvailability),
    physicalLabel: image.physicalLabel || '',
    locationInArchiveRoom: image.locationInArchiveRoom || '',
    lccClassification: image.lccClassification || '',
    note: image.note || '',

    tags: toArray(image.tags),
    keywords: toArray(image.keywords),

    dateCreated: toDateInputValue(image.dateCreated),
    dateModified: toDateInputValue(image.dateModified),
    datePublished: toDateInputValue(image.datePublished),

    copyright: image.copyright || '',
    rightOwner: image.rightOwner || '',
    dateCopyrighted: toDateInputValue(image.dateCopyrighted),
    licenseType: image.licenseType || '',
    usageRights: image.usageRights || '',
    availability: image.availability || '',
    owner: image.owner || '',
    publisher: image.publisher || '',

    volumeName: image.volumeName || '',
    directory: image.directory || '',
    pathInExternalVolume: image.pathInExternalVolume || '',
    autoPath: image.autoPath || '',
  }
}

export function deriveImageAutoFieldsFromFile(file) {
  if (!file) return null
  const name = file.name || ''
  const dot = name.lastIndexOf('.')
  const ext = dot > -1 ? name.slice(dot + 1).toLowerCase() : ''
  const relativePath = file.webkitRelativePath || ''
  const path = relativePath || name

  let volumeName = ''
  let directory = ''
  if (relativePath) {
    const parts = relativePath.split('/').filter(Boolean)
    if (parts.length >= 2) {
      volumeName = parts[0]
      directory = parts[parts.length - 2]
    }
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
