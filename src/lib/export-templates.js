// Archive-template layout for the "Excel + statistics" export.
//
// The institute's hand-made inventory workbooks (e.g. "Audio 2026.xlsx") open
// with a five-row header: a colour-banded section-group row (Identification /
// Content / Technical / Rights & Publication), sparse explanation rows in
// English and Sorani, the Sorani column names, and finally the English column
// names — then every record. This module rebuilds that layout on top of the
// flattened DTO export: each entity declares which DTO keys belong to which
// group, the Sorani titles/explanations come from the same
// `<entity>-fields-metadata.js` files that power the form field-help buttons,
// and anything the template doesn't know still lands in a fallback group so
// no column is ever dropped.
//
//   resolveExportTemplate(pathname) → template | null
//   buildArchiveSheet({ keys, columns, rows, template })
//     → { columns, rows, rtl?, archiveHeader? }   (pass-through when no template)

import { audioFieldsMetadata } from '@/lib/audio-fields-metadata'
import { categoryFieldsMetadata } from '@/lib/category-fields-metadata'
import { imageFieldsMetadata } from '@/lib/image-fields-metadata'
import { maqamFieldsMetadata } from '@/lib/maqam-fields-metadata'
import { personFieldsMetadata } from '@/lib/person-fields-metadata'
import { physicalMediaFieldsMetadata } from '@/lib/physical-media-fields-metadata'
import { projectFieldsMetadata } from '@/lib/project-fields-metadata'
import { textFieldsMetadata } from '@/lib/text-fields-metadata'
import { videoFieldsMetadata } from '@/lib/video-fields-metadata'

// ── groups ─────────────────────────────────────────────────────────────────
// Canonical order mirrors the reference workbook. Each group carries a
// saturated banner colour (white text, merged group row) and a light tint
// (the Sorani/English title rows beneath it). Only groups a sheet actually
// uses appear in it.
const GROUP_DEFS = {
  identification: { en: 'Identification', ku: 'ناسنامە', color: 'FF2F6B54', tint: 'FFDDEBD9' },
  content: { en: 'Content', ku: 'ناوەڕۆک', color: 'FF2E5F8A', tint: 'FFDCE8F4' },
  technical: { en: 'Technical', ku: 'تەکنیکی', color: 'FFB68A37', tint: 'FFF4E8CB' },
  rights: { en: 'Rights & Publication', ku: 'ماف و بڵاوکردنەوە', color: 'FFAE5A3C', tint: 'FFF5E1D6' },
  access: { en: 'Role & Access', ku: 'ڕۆڵ و دەسەڵاتەکان', color: 'FFB68A37', tint: 'FFF4E8CB' },
  notes: { en: 'Notes', ku: 'تێبینییەکان', color: 'FFAE5A3C', tint: 'FFF5E1D6' },
  details: { en: 'Details', ku: 'وردەکارییەکان', color: 'FF6B5B95', tint: 'FFE7E2F1' },
  system: { en: 'System & Audit', ku: 'سیستەم و تۆمارکاری', color: 'FF5F6B64', tint: 'FFE5E9E6' },
}

const GROUP_ORDER = Object.keys(GROUP_DEFS)

// ── shared field knowledge ─────────────────────────────────────────────────
// DTO keys that appear across entities but have no form-metadata entry:
// ids, entity links, file URLs, visibility flags, audit stamps.
const COMMON_KU = {
  id: 'ئای دی',
  type: 'جۆری میدیا',
  code: 'کۆد',
  title: 'ناونیشان',
  projectId: 'ئای دی پڕۆژە',
  projectCode: 'کۆدی پڕۆژە',
  projectName: 'ناوی پڕۆژە',
  personId: 'ئای دی کەس',
  personCode: 'کۆدی کەس',
  personName: 'ناوی کەس',
  categories: 'پۆلێنەکان',
  categoryCodes: 'کۆدی پۆلێنەکان',
  fileUrl: 'بەستەری فایل',
  audioFileUrl: 'بەستەری فایلی دەنگ',
  videoFileUrl: 'بەستەری فایلی ڤیدیۆ',
  imageFileUrl: 'بەستەری فایلی وێنە',
  textFileUrl: 'بەستەری فایلی دەق',
  coverImageUrl: 'بەستەری وێنەی بەرگ',
  fileExtension: 'پاشگری فایل',
  fileSize: 'قەبارەی فایل',
  fileName: 'ناوی فایل',
  language: 'زمان',
  dialect: 'زاراوە',
  duration: 'ماوە',
  audioCode: 'کۆدی دەنگ',
  videoCode: 'کۆدی ڤیدیۆ',
  imageCode: 'کۆدی وێنە',
  textCode: 'کۆدی دەق',
  isPublic: 'بەردەستە بۆ گشتی',
  isVisibleToPublic: 'بەردەستە بۆ گشتی',
  visibleToPublic: 'بەردەستە بۆ گشتی',
  projectVisibleToPublic: 'پڕۆژەکە بەردەستە بۆ گشتی',
  createdAt: 'ڕێکەوتی دروستکردن',
  updatedAt: 'ڕێکەوتی نوێکردنەوە',
  createdBy: 'دروستکراوە لەلایەن',
  updatedBy: 'نوێکراوەتەوە لەلایەن',
  trashedAt: 'ڕێکەوتی سڕینەوە',
  trashedBy: 'سڕاوەتەوە لەلایەن',
  deletedAt: 'ڕێکەوتی سڕینەوە',
  deletedBy: 'سڕاوەتەوە لەلایەن',
  version: 'ژمارەی وەشانی تۆمار',
  username: 'ناوی بەکارهێنەر',
  email: 'ئیمەیڵ',
  fullName: 'ناوی تەواو',
  role: 'ڕۆڵ',
  roles: 'ڕۆڵەکان',
  active: 'چالاک',
  enabled: 'چالاک',
  permissions: 'دەسەڵاتەکان',
  extraPermissions: 'دەسەڵاتە زیادەکان',
  effectiveAuthorities: 'دەسەڵاتە کارپێکراوەکان',
  lastLoginAt: 'دوایین چوونەژوورەوە',
}

// English titles where the automatic Title Case of the DTO key reads wrong.
const EN_TITLES = {
  id: 'ID',
  type: 'Media Type',
  originTitle: 'Original Title',
  alterTitle: 'Alternative Title',
  centralKurdishTitle: 'Title in Central Kurdish',
  titleInCentralKurdish: 'Title in Central Kurdish',
  abstractText: 'Abstract',
  pathInExternal: 'Path in External Volume',
  pathInExternalVolume: 'Path in External Volume',
  autoPath: 'Auto Path (Cloud)',
  degitizedBy: 'Digitized By',
  degitizationEquipment: 'Digitization Equipment',
  lccClassification: 'LCC Classification',
  audioQualityOutOf10: 'Audio Quality / 10',
  audioChannel: 'Audio Channels',
  dpi: 'DPI',
  sizeGB: 'Size (GB)',
  durationMin: 'Duration (min)',
  isPublic: 'Visible to Public',
  isVisibleToPublic: 'Visible to Public',
  visibleToPublic: 'Visible to Public',
  projectVisibleToPublic: 'Project Visible to Public',
  locationArchive: 'Location in Archive Room',
  locationInArchiveRoom: 'Location in Archive Room',
}

// Sparse English explanations, matching the reference workbook's hint row —
// only the columns an archivist tends to ask about carry one.
const EN_HINTS = {
  typeOfComposition: 'Singing only, Music only, or both',
  typeOfPerformance: 'Solo, Duet, Trio, Orchestra…',
  lyrics: 'Full text of the song, when available',
  poet: 'Individual(s) who wrote the lyrics',
  recordingVenue: 'Where the recording was made',
  tags: 'Only important WORDS',
  keywords: 'Those words are important to find the subject',
  videoTags: 'Only important WORDS',
  videoKeywords: 'Those words are important to find the subject',
  physicalAvailability: 'Is this item available physically? Ex: CD, Cassette, Reel…',
  locationArchive: 'In which shelf and where is it stored in the archive room?',
  locationInArchiveRoom: 'In which shelf and where is it stored in the archive room?',
  degitizedBy: 'Place / person who digitized it',
  audioVersion: 'Is it the first version of the audio or another version?',
  videoVersion: 'Is it the first version of the video or another version?',
  imageVersion: 'Is it the first version of the image or another version?',
  textVersion: 'Is it the first version of the document or another version?',
  pathInExternal: 'Path of the file inside the external volume',
  pathInExternalVolume: 'Path of the file inside the external volume',
  autoPath: 'Cloud path — the system assigns it',
}

// Audit keys any entity may carry; they always close the sheet.
const SYSTEM_KEYS = [
  'isPublic',
  'isVisibleToPublic',
  'visibleToPublic',
  'projectVisibleToPublic',
  'createdAt',
  'updatedAt',
  'createdBy',
  'updatedBy',
  'trashedAt',
  'trashedBy',
  'deletedAt',
  'deletedBy',
  'version',
]

// ── per-entity templates ───────────────────────────────────────────────────
// groups: DTO keys per group, in the column order the workbook should use.
// ku: metadata sources (form field-help files) for Sorani titles + hints.
const MEDIA_GROUPS = {
  identification: [
    'type', 'id', 'code', 'title', 'audioCode', 'videoCode', 'imageCode',
    'textCode', 'fileName', 'projectId', 'projectCode', 'projectName',
    'personId', 'personCode', 'personName', 'categories', 'categoryCodes',
    'volumeName', 'directoryName', 'directory', 'pathInExternal',
    'pathInExternalVolume', 'autoPath', 'fileUrl', 'audioFileUrl',
    'videoFileUrl', 'imageFileUrl', 'textFileUrl', 'coverImageUrl',
  ],
  content: [
    'originTitle', 'originalTitle', 'alterTitle', 'alternativeTitle',
    'centralKurdishTitle', 'titleInCentralKurdish', 'romanizedTitle',
    'abstractText', 'description', 'form', 'typeOfBasta', 'typeOfMaqam',
    'genre', 'subject', 'event', 'location', 'documentType', 'script', 'isbn',
    'assignmentNumber', 'edition', 'volume', 'series', 'transcription',
    'speaker', 'producer', 'composer', 'contributors', 'contributor',
    'creatorArtistPhotographer', 'creatorArtistDirector', 'personShownInImage',
    'personShownInVideo', 'author', 'printingHouse', 'poet', 'lyrics',
    'language', 'dialect', 'subtitle', 'typeOfComposition',
    'typeOfPerformance', 'recordingVenue', 'city', 'region', 'dateCreated',
    'dateModified', 'datePublished', 'printDate', 'audience', 'tags',
    'keywords', 'videoTags', 'videoKeywords', 'photostory',
    'whereThisImageUsed', 'whereThisVideoUsed', 'colorOfImage', 'colorOfVideo',
    'physicalAvailability', 'physicalLabel', 'locationArchive',
    'locationInArchiveRoom', 'degitizedBy', 'degitizationEquipment',
    'audioFileNote',
  ],
  technical: [
    'audioChannel', 'audioChannels', 'duration', 'fileExtension', 'extension',
    'fileSize', 'bitRate', 'overallBitRate', 'bitDepth', 'sampleRate',
    'frameRate', 'resolution', 'dimension', 'orientation', 'dpi', 'size',
    'physicalDimensions', 'pageCount', 'manufacturer', 'model', 'lens',
    'videoCodec', 'audioCodec', 'audioQualityOutOf10', 'audioVersion',
    'videoVersion', 'imageVersion', 'textVersion', 'versionNumber',
    'copyNumber', 'imageStatus', 'videoStatus', 'textStatus',
    'archiveCataloging', 'lccClassification',
  ],
  rights: [
    'accrualMethod', 'provenance', 'copyright', 'rightOwner',
    'dateCopyrighted', 'availability', 'licenseType', 'usageRights', 'owner',
    'publisher', 'note', 'archiveLocalNote',
  ],
}

const TEMPLATES = {
  items: {
    groups: MEDIA_GROUPS,
    ku: [audioFieldsMetadata, videoFieldsMetadata, imageFieldsMetadata, textFieldsMetadata],
  },
  project: {
    groups: {
      identification: ['id', 'projectCode', 'projectName', 'personId', 'personCode', 'personName', 'categories', 'categoryCodes'],
      content: ['description', 'tags', 'keywords'],
    },
    ku: [projectFieldsMetadata],
  },
  person: {
    groups: {
      identification: ['id', 'personCode', 'fullName', 'nickname', 'romanizedName', 'mediaPortrait', 'portraitUrl'],
      content: [
        'gender', 'personType', 'region', 'placeOfBirth', 'dateOfBirthYear',
        'dateOfBirthMonth', 'dateOfBirthDay', 'placeOfDeath', 'dateOfDeathYear',
        'dateOfDeathMonth', 'dateOfDeathDay', 'description', 'tag', 'tags',
        'keywords', 'note',
      ],
    },
    ku: [personFieldsMetadata],
  },
  category: {
    groups: {
      identification: ['id', 'categoryCode', 'name'],
      content: ['description', 'keywords', 'tags'],
    },
    ku: [categoryFieldsMetadata],
  },
  physicalMedia: {
    groups: {
      identification: ['id', 'rowNumber', 'inventoryNumber', 'physicalMediaType', 'mediaCategory', 'title', 'physicalLabel'],
      content: ['physicalSize', 'content', 'owner', 'year', 'durationMin', 'trackNumbers', 'trackName', 'tags'],
      technical: [
        'digitization', 'digitizeDate', 'needToClear', 'extension', 'sizeGB',
        'bitOrColorDepth', 'sampleOrFrameRate', 'channelsOrResolution',
        'playbackModel', 'captureInterface', 'signalInterface',
        'ingestSoftware', 'formatCodec',
      ],
      notes: ['archiveDepNote', 'captureDepNote'],
    },
    ku: [physicalMediaFieldsMetadata],
  },
  maqam: {
    groups: {
      identification: ['id', 'songName', 'fileName', 'audioUrl', 'audioFile'],
      content: ['producer', 'archiveNote', 'duration', 'status', 'teachers', 'votes'],
    },
    ku: [maqamFieldsMetadata],
  },
  users: {
    groups: {
      identification: ['id', 'username', 'email', 'fullName'],
      access: ['role', 'roles', 'active', 'enabled', 'permissions', 'extraPermissions', 'effectiveAuthorities', 'lastLoginAt'],
    },
    ku: [],
  },
  // Pages with a records provider but no curated map (e.g. the mixed trash
  // list) still get the archive layout: known common/system keys are grouped,
  // the rest flows into Details.
  generic: {
    groups: {
      identification: ['id', 'type', 'code', 'title', 'name'],
    },
    ku: [],
  },
}

const PATH_TEMPLATES = [
  ['/items', 'items'],
  ['/project', 'project'],
  ['/person', 'person'],
  ['/category', 'category'],
  ['/physical-media', 'physicalMedia'],
  ['/maqam', 'maqam'],
  ['/users', 'users'],
]

function resolveExportTemplate(pathname) {
  const path = String(pathname || '')
  const match = PATH_TEMPLATES.find(([suffix]) => path.includes(suffix))
  return TEMPLATES[match ? match[1] : 'generic']
}

// ── sheet builder ──────────────────────────────────────────────────────────
const HINT_LIMIT = 180

function clipHint(text) {
  const value = String(text || '').trim()
  return value.length > HINT_LIMIT ? `${value.slice(0, HINT_LIMIT - 1)}…` : value
}

function kurdishEntry(template, key) {
  for (const source of template.ku) {
    const entry = source?.[key]
    if (entry?.title) return entry
  }
  if (COMMON_KU[key]) return { title: COMMON_KU[key] }
  return null
}

// keys/columns/rows come from flattenRecords; the result feeds buildXlsxBlob.
// `title` labels the masthead (sheet name + record count + generation date).
function buildArchiveSheet({ keys, columns, rows, template, title }) {
  if (!template || !Array.isArray(keys) || keys.length === 0) {
    return { columns, rows }
  }

  const groupByKey = new Map()
  const rankByKey = new Map()
  for (const [groupKey, groupKeys] of Object.entries(template.groups)) {
    groupKeys.forEach((key, index) => {
      if (!groupByKey.has(key)) {
        groupByKey.set(key, groupKey)
        rankByKey.set(key, index)
      }
    })
  }
  SYSTEM_KEYS.forEach((key, index) => {
    if (!groupByKey.has(key)) {
      groupByKey.set(key, 'system')
      rankByKey.set(key, index)
    }
  })

  // Unknown keys keep their flatten order, after the curated ones, inside
  // Details — nothing the backend adds later ever falls off the export.
  const entries = keys.map((key, index) => ({
    key,
    index,
    group: groupByKey.get(key) || 'details',
    rank: rankByKey.has(key) ? rankByKey.get(key) : 10000 + index,
  }))
  entries.sort((a, b) => {
    const groupDelta = GROUP_ORDER.indexOf(a.group) - GROUP_ORDER.indexOf(b.group)
    if (groupDelta !== 0) return groupDelta
    if (a.rank !== b.rank) return a.rank - b.rank
    return a.index - b.index
  })

  const outColumns = entries.map(({ key, index }) => EN_TITLES[key] || columns[index])
  const outRows = rows.map((row) => entries.map(({ index }) => row[index]))
  const titlesKu = entries.map(({ key }) => kurdishEntry(template, key)?.title || '')
  const hintsKu = entries.map(({ key }) => clipHint(kurdishEntry(template, key)?.description))
  const hintsEn = entries.map(({ key }) => EN_HINTS[key] || '')

  const groups = []
  for (const entry of entries) {
    const def = GROUP_DEFS[entry.group]
    const last = groups[groups.length - 1]
    if (last && last.groupKey === entry.group) {
      last.span += 1
    } else {
      groups.push({
        groupKey: entry.group,
        title: `${def.en} / ${def.ku}`,
        span: 1,
        color: def.color,
        tint: def.tint,
      })
    }
  }

  const hintRows = []
  if (hintsEn.some(Boolean)) hintRows.push(hintsEn)
  if (hintsKu.some(Boolean)) hintRows.push(hintsKu)

  const generated = new Intl.DateTimeFormat('en-GB', {
    dateStyle: 'long',
    timeStyle: 'short',
  }).format(new Date())

  return {
    columns: outColumns,
    rows: outRows,
    // The reference workbooks read right-to-left — most content is Sorani.
    rtl: true,
    archiveHeader: {
      masthead: {
        brand: 'Kurdish Heritage Institute · ئینستیتیوتی کەلەپووری کورد',
        subtitle: `${title || 'Archive'} · ${rows.length.toLocaleString()} records · Generated ${generated}`,
      },
      groups: groups.map(({ title: groupTitle, span, color, tint }) => ({
        title: groupTitle,
        span,
        color,
        tint,
      })),
      hintRows,
      titleRows: titlesKu.some(Boolean) ? [titlesKu] : [],
    },
  }
}

export { buildArchiveSheet, resolveExportTemplate }
