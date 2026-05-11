// Text-form helpers — mirrors video-form, with text-specific fields
// (textVersion enum, isbn/edition/series, language/dialect, pageCount, etc.).

export const TEXT_VERSIONS = [
  'RAW',
  'MASTER',
  'RESTORED',
  'ARCHIVE',
  'ORIGINAL',
  'DIGITIZED',
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

export function createInitialTextForm() {
  return {
    textVersion: 'RAW',
    versionNumber: '1',
    copyNumber: '1',

    fileName: '',
    originalTitle: '',
    alternativeTitle: '',
    titleInCentralKurdish: '',
    romanizedTitle: '',

    description: '',
    documentType: '',
    subject: [],
    genre: [],

    script: '',
    transcription: '',
    isbn: '',
    assignmentNumber: '',
    edition: '',
    volume: '',
    series: '',

    fileSize: '',
    extension: '',
    orientation: '',
    pageCount: '',
    size: '',
    physicalDimensions: '',

    language: '',
    dialect: '',

    author: '',
    contributors: '',
    printingHouse: '',
    audience: '',

    accrualMethod: '',
    provenance: '',
    textStatus: '',
    archiveCataloging: '',
    physicalAvailability: false,
    physicalLabel: '',
    locationInArchiveRoom: '',
    lccClassification: '',
    note: '',

    tags: [],
    keywords: [],

    dateCreated: '',
    printDate: '',
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

export function buildTextPayload(form, projectCode) {
  return {
    projectCode,
    textVersion: form.textVersion ? form.textVersion.toUpperCase() : null,
    versionNumber: form.versionNumber ? Number(form.versionNumber) : null,
    copyNumber: form.copyNumber ? Number(form.copyNumber) : null,

    fileName: trimOrNull(form.fileName),
    originalTitle: trimOrNull(form.originalTitle),
    alternativeTitle: trimOrNull(form.alternativeTitle),
    titleInCentralKurdish: trimOrNull(form.titleInCentralKurdish),
    romanizedTitle: trimOrNull(form.romanizedTitle),

    description: trimOrNull(form.description),
    documentType: trimOrNull(form.documentType),
    subject: toArray(form.subject),
    genre: toArray(form.genre),

    script: trimOrNull(form.script),
    transcription: trimOrNull(form.transcription),
    isbn: trimOrNull(form.isbn),
    assignmentNumber: trimOrNull(form.assignmentNumber),
    edition: trimOrNull(form.edition),
    volume: trimOrNull(form.volume),
    series: trimOrNull(form.series),

    fileSize: trimOrNull(form.fileSize),
    extension: trimOrNull(form.extension),
    orientation: trimOrNull(form.orientation),
    pageCount: form.pageCount === '' || form.pageCount == null ? null : Number(form.pageCount),
    size: trimOrNull(form.size),
    physicalDimensions: trimOrNull(form.physicalDimensions),

    language: trimOrNull(form.language),
    dialect: trimOrNull(form.dialect),

    author: trimOrNull(form.author),
    contributors: trimOrNull(form.contributors),
    printingHouse: trimOrNull(form.printingHouse),
    audience: trimOrNull(form.audience),

    accrualMethod: trimOrNull(form.accrualMethod),
    provenance: trimOrNull(form.provenance),
    textStatus: trimOrNull(form.textStatus),
    archiveCataloging: trimOrNull(form.archiveCataloging),
    physicalAvailability: Boolean(form.physicalAvailability),
    physicalLabel: trimOrNull(form.physicalLabel),
    locationInArchiveRoom: trimOrNull(form.locationInArchiveRoom),
    lccClassification: trimOrNull(form.lccClassification),
    note: trimOrNull(form.note),

    tags: toArray(form.tags),
    keywords: toArray(form.keywords),

    dateCreated: fromDateInputValue(form.dateCreated),
    printDate: fromDateInputValue(form.printDate),
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

export function populateTextFormFromText(text) {
  return {
    ...createInitialTextForm(),
    textVersion: text.textVersion || 'RAW',
    versionNumber: text.versionNumber != null ? String(text.versionNumber) : '1',
    copyNumber: text.copyNumber != null ? String(text.copyNumber) : '1',

    fileName: text.fileName || '',
    originalTitle: text.originalTitle || '',
    alternativeTitle: text.alternativeTitle || '',
    titleInCentralKurdish: text.titleInCentralKurdish || '',
    romanizedTitle: text.romanizedTitle || '',

    description: text.description || '',
    documentType: text.documentType || '',
    subject: toArray(text.subject),
    genre: toArray(text.genre),

    script: text.script || '',
    transcription: text.transcription || '',
    isbn: text.isbn || '',
    assignmentNumber: text.assignmentNumber || '',
    edition: text.edition || '',
    volume: text.volume || '',
    series: text.series || '',

    fileSize: text.fileSize || '',
    extension: text.extension || '',
    orientation: text.orientation || '',
    pageCount: text.pageCount != null ? String(text.pageCount) : '',
    size: text.size || '',
    physicalDimensions: text.physicalDimensions || '',

    language: text.language || '',
    dialect: text.dialect || '',

    author: text.author || '',
    contributors: text.contributors || '',
    printingHouse: text.printingHouse || '',
    audience: text.audience || '',

    accrualMethod: text.accrualMethod || '',
    provenance: text.provenance || '',
    textStatus: text.textStatus || '',
    archiveCataloging: text.archiveCataloging || '',
    physicalAvailability: Boolean(text.physicalAvailability),
    physicalLabel: text.physicalLabel || '',
    locationInArchiveRoom: text.locationInArchiveRoom || '',
    lccClassification: text.lccClassification || '',
    note: text.note || '',

    tags: toArray(text.tags),
    keywords: toArray(text.keywords),

    dateCreated: toDateInputValue(text.dateCreated),
    printDate: toDateInputValue(text.printDate),
    dateModified: toDateInputValue(text.dateModified),
    datePublished: toDateInputValue(text.datePublished),

    copyright: text.copyright || '',
    rightOwner: text.rightOwner || '',
    dateCopyrighted: toDateInputValue(text.dateCopyrighted),
    licenseType: text.licenseType || '',
    usageRights: text.usageRights || '',
    availability: text.availability || '',
    owner: text.owner || '',
    publisher: text.publisher || '',

    volumeName: text.volumeName || '',
    directory: text.directory || '',
    pathInExternalVolume: text.pathInExternalVolume || '',
    autoPath: text.autoPath || '',
  }
}

export function deriveTextAutoFieldsFromFile(file) {
  if (!file) return null
  const name = file.name || ''
  const dot = name.lastIndexOf('.')
  const ext = dot > -1 ? name.slice(dot + 1).toLowerCase() : ''
  // See video-form for the reasoning: source-path fields can only be
  // auto-filled when the user picks a folder. Single-file pickers leave
  // them blank by design.
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
