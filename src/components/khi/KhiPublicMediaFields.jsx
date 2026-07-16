import React from 'react'

import {
  IconAudio,
  IconBook,
  IconImage,
  IconLanguage,
  IconLayers,
  IconMic,
  IconTag,
  IconText,
  IconVideo,
} from '@/components/khi/icons'
import { audioFieldsMetadata } from '@/lib/audio-fields-metadata'
import { imageFieldsMetadata } from '@/lib/image-fields-metadata'
import { textFieldsMetadata } from '@/lib/text-fields-metadata'
import { videoFieldsMetadata } from '@/lib/video-fields-metadata'
import {
  buildCompleteMediaFieldGroups,
  isEmptyValue,
  safeStringify,
  valueFrom,
} from '@/components/items/full-media-inventory'

const EMPTY_VALUE = '—'

const FIELD_METADATA_BY_KIND = {
  audio: audioFieldsMetadata,
  image: imageFieldsMetadata,
  text: textFieldsMetadata,
  video: videoFieldsMetadata,
}

const LONG_FIELDS = new Set([
  'abstractText',
  'copyright',
  'lyrics',
  'photostory',
  'provenance',
  'transcription',
  'usageRights',
  'archiveLocalNote',
  'audioFileNote',
  'autoPath',
  'bodyText',
  'categories',
  'categoryCodes',
  'note',
  'pathInExternal',
  'pathInExternalVolume',
  'project',
  'person',
  'summary',
])

// Keep a long value in one deliberate place. The hero and content cards are
// easier to read than repeating the same prose inside the metadata sections.
const DISPLAYED_OUTSIDE_FIELDS = {
  image: new Set(['description', 'photostory']),
  audio: new Set(['description', 'lyrics']),
  video: new Set(['description']),
  text: new Set(['description']),
}

const FIELD_LABELS_KU = {
  abstractText: 'کورتەی دەق',
  alternativeTitle: 'ناونیشانی جێگرەوە',
  assignmentNumber: 'ژمارەی تەرخانکردن',
  audience: 'بینەر/گوێگر',
  author: 'نووسەر',
  centralKurdishTitle: 'ناونیشانی کوردیی ناوەندی',
  city: 'شار',
  colorOfImage: 'ڕەنگی وێنە',
  colorOfVideo: 'ڕەنگی ڤیدیۆ',
  composer: 'ئاوازدانەر',
  contributor: 'بەشداربوو',
  contributors: 'بەشداربووان',
  copyright: 'مافی چاپ و بڵاوکردنەوە',
  creatorArtistDirector: 'دروستکەر/هونەرمەند/دەرهێنەر',
  creatorArtistPhotographer: 'دروستکەر/هونەرمەند/وێنەگر',
  description: 'وەسف',
  dialect: 'زاراوە',
  documentType: 'جۆری بەڵگەنامە',
  edition: 'چاپ',
  event: 'بۆنە',
  form: 'فۆڕم',
  genre: 'ژانر',
  isbn: 'ISBN',
  language: 'زمان',
  location: 'شوێن',
  lyrics: 'هۆنراوە/گۆرانی',
  originTitle: 'ناونیشانی سەرچاوە',
  originalTitle: 'ناونیشانی ڕەسەن',
  owner: 'خاوەن',
  personShownInImage: 'کەسی دیار لە وێنە',
  personShownInVideo: 'کەسی دیار لە ڤیدیۆ',
  photostory: 'چیرۆکی وێنە',
  poet: 'شاعیر',
  printingHouse: 'چاپخانە',
  producer: 'بەرهەمهێنەر',
  provenance: 'سەرچاوە',
  publisher: 'بڵاوکەرەوە',
  recordingVenue: 'شوێنی تۆمارکردن',
  region: 'ناوچە',
  rightOwner: 'خاوەنی ماف',
  romanizedTitle: 'ناونیشانی ڕۆمانکراو',
  script: 'ڕێنووس',
  series: 'زنجیرە',
  speaker: 'قسەکەر',
  subject: 'بابەت',
  subtitle: 'ژێرنووس',
  titleInCentralKurdish: 'ناونیشان بە کوردیی ناوەندی',
  transcription: 'نووسینەوە',
  typeOfBasta: 'جۆری بەستە',
  typeOfComposition: 'جۆری ئاوازدانان',
  typeOfMaqam: 'جۆری مەقام',
  typeOfPerformance: 'جۆری پێشکەشکردن',
  usageRights: 'مافی بەکارهێنان',
  volume: 'بەرگ',
  whereThisImageUsed: 'شوێنی بەکارهێنانی وێنە',
  whereThisVideoUsed: 'شوێنی بەکارهێنانی ڤیدیۆ',
}

const PUBLIC_MEDIA_FIELDS = {
  image: [
    'originalTitle',
    'titleInCentralKurdish',
    'romanizedTitle',
    'subject',
    'form',
    'genre',
    'event',
    'location',
    'description',
    'personShownInImage',
    'colorOfImage',
    'whereThisImageUsed',
    'creatorArtistPhotographer',
    'contributor',
    'audience',
    'provenance',
    'photostory',
    'copyright',
    'rightOwner',
    'usageRights',
    'owner',
    'publisher',
  ],
  audio: [
    'originTitle',
    'centralKurdishTitle',
    'romanizedTitle',
    'form',
    'typeOfBasta',
    'typeOfMaqam',
    'genre',
    'abstractText',
    'description',
    'speaker',
    'producer',
    'composer',
    'contributors',
    'language',
    'dialect',
    'typeOfComposition',
    'typeOfPerformance',
    'lyrics',
    'poet',
    'recordingVenue',
    'city',
    'region',
    'audience',
    'provenance',
    'copyright',
    'rightOwner',
    'usageRights',
    'owner',
    'publisher',
  ],
  video: [
    'originalTitle',
    'alternativeTitle',
    'titleInCentralKurdish',
    'romanizedTitle',
    'subject',
    'genre',
    'event',
    'location',
    'description',
    'personShownInVideo',
    'colorOfVideo',
    'whereThisVideoUsed',
    'language',
    'dialect',
    'subtitle',
    'creatorArtistDirector',
    'producer',
    'contributor',
    'audience',
    'copyright',
    'rightOwner',
    'usageRights',
    'owner',
    'publisher',
  ],
  text: [
    'originalTitle',
    'titleInCentralKurdish',
    'romanizedTitle',
    'subject',
    'genre',
    'documentType',
    'description',
    'script',
    'transcription',
    'isbn',
    'assignmentNumber',
    'edition',
    'volume',
    'series',
    'language',
    'dialect',
    'author',
    'contributors',
    'printingHouse',
    'audience',
    'provenance',
    'copyright',
    'rightOwner',
    'usageRights',
    'owner',
    'publisher',
  ],
}

const FIELD_GROUPS = {
  image: [
    {
      title: 'Titles (ناونیشان)',
      icon: IconText,
      fields: ['originalTitle', 'titleInCentralKurdish', 'romanizedTitle'],
    },
    {
      title: 'Subject & Form (بابەت و فۆڕم)',
      icon: IconImage,
      fields: ['subject', 'form', 'genre', 'event', 'location', 'personShownInImage', 'colorOfImage', 'whereThisImageUsed'],
    },
    {
      title: 'Credits (بەشداربووان)',
      icon: IconMic,
      fields: ['creatorArtistPhotographer', 'contributor', 'audience'],
    },
    {
      title: 'Provenance (سەرچاوە)',
      icon: IconLayers,
      fields: ['provenance'],
    },
    {
      title: 'Rights & Ownership (ماف و خاوەندارێتی)',
      icon: IconTag,
      fields: ['copyright', 'rightOwner', 'usageRights', 'owner', 'publisher'],
    },
  ],
  audio: [
    {
      title: 'Titles (ناونیشان)',
      icon: IconText,
      fields: ['originTitle', 'centralKurdishTitle', 'romanizedTitle'],
    },
    {
      title: 'Music & Form (مۆسیقا و فۆڕم)',
      icon: IconAudio,
      fields: ['form', 'typeOfBasta', 'typeOfMaqam', 'genre', 'typeOfComposition', 'typeOfPerformance'],
    },
    {
      title: 'Abstract (کورتەی ناوەڕۆک)',
      icon: IconText,
      fields: ['abstractText'],
    },
    {
      title: 'Credits (بەشداربووان)',
      icon: IconMic,
      fields: ['speaker', 'producer', 'composer', 'contributors', 'poet', 'audience'],
    },
    {
      title: 'Language & Place (زمان و شوێن)',
      icon: IconLanguage,
      fields: ['language', 'dialect', 'recordingVenue', 'city', 'region'],
    },
    {
      title: 'Rights & Ownership (ماف و خاوەندارێتی)',
      icon: IconTag,
      fields: ['provenance', 'copyright', 'rightOwner', 'usageRights', 'owner', 'publisher'],
    },
  ],
  video: [
    {
      title: 'Titles (ناونیشان)',
      icon: IconText,
      fields: ['originalTitle', 'alternativeTitle', 'titleInCentralKurdish', 'romanizedTitle'],
    },
    {
      title: 'Subject & Form (بابەت و فۆڕم)',
      icon: IconVideo,
      fields: ['subject', 'genre', 'event', 'location', 'personShownInVideo', 'colorOfVideo', 'whereThisVideoUsed'],
    },
    {
      title: 'Language (زمان)',
      icon: IconLanguage,
      fields: ['language', 'dialect', 'subtitle'],
    },
    {
      title: 'Credits (بەشداربووان)',
      icon: IconMic,
      fields: ['creatorArtistDirector', 'producer', 'contributor', 'audience'],
    },
    {
      title: 'Rights & Ownership (ماف و خاوەندارێتی)',
      icon: IconTag,
      fields: ['copyright', 'rightOwner', 'usageRights', 'owner', 'publisher'],
    },
  ],
  text: [
    {
      title: 'Titles (ناونیشان)',
      icon: IconText,
      fields: ['originalTitle', 'titleInCentralKurdish', 'romanizedTitle'],
    },
    {
      title: 'Document (بەڵگەنامە)',
      icon: IconBook,
      fields: ['subject', 'genre', 'documentType', 'script', 'isbn', 'assignmentNumber', 'edition', 'volume', 'series'],
    },
    {
      title: 'Content (ناوەڕۆک)',
      icon: IconText,
      fields: ['transcription'],
    },
    {
      title: 'Language (زمان)',
      icon: IconLanguage,
      fields: ['language', 'dialect'],
    },
    {
      title: 'Credits (بەشداربووان)',
      icon: IconMic,
      fields: ['author', 'contributors', 'printingHouse', 'audience'],
    },
    {
      title: 'Rights & Ownership (ماف و خاوەندارێتی)',
      icon: IconTag,
      fields: ['provenance', 'copyright', 'rightOwner', 'usageRights', 'owner', 'publisher'],
    },
  ],
}

// The public catalogue intentionally uses the compact groups above. Staff need
// a different contract: every field that can be edited in the four media forms
// must remain visible, including empty values. Keep these lists explicit rather
// than deriving them from the metadata maps; a few backend/form keys have legacy
// aliases that are not represented by those maps (for example video `tags`).
const FULL_MEDIA_FIELD_GROUPS = {
  audio: [
    {
      title: 'Record Identity (ناسنامەی تۆمار)',
      icon: IconAudio,
      fields: ['audioCode', 'audioVersion', 'versionNumber', 'copyNumber', 'fileName', 'audioFileUrl'],
    },
    {
      title: 'Titles (ناونیشان)',
      icon: IconText,
      fields: ['originTitle', 'alterTitle', 'centralKurdishTitle', 'romanizedTitle'],
    },
    {
      title: 'Content (ناوەڕۆک)',
      icon: IconText,
      fields: ['abstractText', 'description', 'transcription', 'lyrics'],
    },
    {
      title: 'Music & Form (مۆسیقا و فۆڕم)',
      icon: IconAudio,
      fields: ['form', 'genre', 'typeOfBasta', 'typeOfMaqam', 'typeOfComposition', 'typeOfPerformance', 'poet'],
    },
    {
      title: 'Credits (بەشداربووان)',
      icon: IconMic,
      fields: ['speaker', 'producer', 'composer', 'contributors'],
    },
    {
      title: 'Language & Place (زمان و شوێن)',
      icon: IconLanguage,
      fields: ['language', 'dialect', 'recordingVenue', 'city', 'region'],
    },
    {
      title: 'Dates (بەروارەکان)',
      icon: IconLayers,
      fields: ['dateCreated', 'datePublished', 'dateModified'],
    },
    {
      title: 'Classification (پۆلێنکردن)',
      icon: IconTag,
      fields: ['audience', 'tags', 'keywords'],
    },
    {
      title: 'Physical Archive (ئەرشیفی فیزیکی)',
      icon: IconLayers,
      fields: ['physicalAvailability', 'physicalLabel', 'locationArchive', 'degitizedBy', 'degitizationEquipment'],
    },
    {
      title: 'Technical (تەکنیکی)',
      icon: IconAudio,
      fields: ['audioChannel', 'fileExtension', 'fileSize', 'bitRate', 'bitDepth', 'sampleRate', 'audioQualityOutOf10'],
    },
    {
      title: 'Storage (هەڵگرتن)',
      icon: IconLayers,
      fields: ['volumeName', 'directoryName', 'pathInExternal', 'autoPath', 'audioFileNote'],
    },
    {
      title: 'Rights & Provenance (ماف و سەرچاوە)',
      icon: IconTag,
      fields: [
        'copyright', 'rightOwner', 'dateCopyrighted', 'availability', 'licenseType',
        'usageRights', 'owner', 'publisher', 'provenance', 'accrualMethod',
        'lccClassification', 'archiveLocalNote',
      ],
    },
  ],
  image: [
    {
      title: 'Record Identity (ناسنامەی تۆمار)',
      icon: IconImage,
      fields: ['imageCode', 'imageVersion', 'versionNumber', 'copyNumber', 'fileName', 'imageFileUrl'],
    },
    {
      title: 'Titles (ناونیشان)',
      icon: IconText,
      fields: ['originalTitle', 'alternativeTitle', 'titleInCentralKurdish', 'romanizedTitle'],
    },
    {
      title: 'Subject & Form (بابەت و فۆڕم)',
      icon: IconImage,
      fields: ['description', 'subject', 'form', 'genre', 'event', 'location'],
    },
    {
      title: 'Image Details (وردەکاریی وێنە)',
      icon: IconImage,
      fields: ['personShownInImage', 'colorOfImage', 'whereThisImageUsed', 'photostory'],
    },
    {
      title: 'Equipment (ئامێرەکان)',
      icon: IconLayers,
      fields: ['manufacturer', 'model', 'lens'],
    },
    {
      title: 'Credits (بەشداربووان)',
      icon: IconMic,
      fields: ['creatorArtistPhotographer', 'contributor', 'audience'],
    },
    {
      title: 'Technical (تەکنیکی)',
      icon: IconImage,
      fields: ['fileSize', 'extension', 'orientation', 'dimension', 'bitDepth', 'dpi'],
    },
    {
      title: 'Classification (پۆلێنکردن)',
      icon: IconTag,
      fields: ['tags', 'keywords'],
    },
    {
      title: 'Dates (بەروارەکان)',
      icon: IconLayers,
      fields: ['dateCreated', 'dateModified', 'datePublished'],
    },
    {
      title: 'Storage (هەڵگرتن)',
      icon: IconLayers,
      fields: ['volumeName', 'directory', 'pathInExternalVolume', 'autoPath'],
    },
    {
      title: 'Archival (ئەرشیفی)',
      icon: IconLayers,
      fields: [
        'accrualMethod', 'provenance', 'imageStatus', 'archiveCataloging',
        'physicalAvailability', 'physicalLabel', 'locationInArchiveRoom',
        'lccClassification', 'note',
      ],
    },
    {
      title: 'Rights & Ownership (ماف و خاوەندارێتی)',
      icon: IconTag,
      fields: [
        'copyright', 'rightOwner', 'dateCopyrighted', 'licenseType', 'usageRights',
        'availability', 'owner', 'publisher',
      ],
    },
  ],
  video: [
    {
      title: 'Record Identity (ناسنامەی تۆمار)',
      icon: IconVideo,
      fields: ['videoCode', 'videoVersion', 'versionNumber', 'copyNumber', 'fileName', 'videoFileUrl'],
    },
    {
      title: 'Titles (ناونیشان)',
      icon: IconText,
      fields: ['originalTitle', 'alternativeTitle', 'titleInCentralKurdish', 'romanizedTitle'],
    },
    {
      title: 'Subject & Form (بابەت و فۆڕم)',
      icon: IconVideo,
      fields: ['description', 'subject', 'genre', 'event', 'location'],
    },
    {
      title: 'Video Details (وردەکاریی ڤیدیۆ)',
      icon: IconVideo,
      fields: ['personShownInVideo', 'colorOfVideo', 'whereThisVideoUsed'],
    },
    {
      title: 'Language (زمان)',
      icon: IconLanguage,
      fields: ['language', 'dialect', 'subtitle'],
    },
    {
      title: 'Credits (بەشداربووان)',
      icon: IconMic,
      fields: ['creatorArtistDirector', 'producer', 'contributor', 'audience'],
    },
    {
      title: 'Technical (تەکنیکی)',
      icon: IconVideo,
      fields: [
        'fileSize', 'extension', 'orientation', 'dimension', 'resolution', 'duration',
        'bitDepth', 'frameRate', 'overallBitRate', 'videoCodec', 'audioCodec', 'audioChannels',
      ],
    },
    {
      title: 'Classification (پۆلێنکردن)',
      icon: IconTag,
      fields: ['tags', 'keywords'],
    },
    {
      title: 'Dates (بەروارەکان)',
      icon: IconLayers,
      fields: ['dateCreated', 'dateModified', 'datePublished'],
    },
    {
      title: 'Storage (هەڵگرتن)',
      icon: IconLayers,
      fields: ['volumeName', 'directory', 'pathInExternalVolume', 'autoPath'],
    },
    {
      title: 'Archival (ئەرشیفی)',
      icon: IconLayers,
      fields: [
        'accrualMethod', 'provenance', 'videoStatus', 'archiveCataloging',
        'physicalAvailability', 'physicalLabel', 'locationInArchiveRoom',
        'lccClassification', 'note',
      ],
    },
    {
      title: 'Rights & Ownership (ماف و خاوەندارێتی)',
      icon: IconTag,
      fields: [
        'copyright', 'rightOwner', 'dateCopyrighted', 'licenseType', 'usageRights',
        'availability', 'owner', 'publisher',
      ],
    },
  ],
  text: [
    {
      title: 'Record Identity (ناسنامەی تۆمار)',
      icon: IconBook,
      fields: ['textCode', 'textVersion', 'versionNumber', 'copyNumber', 'fileName', 'textFileUrl', 'coverImageUrl'],
    },
    {
      title: 'Titles (ناونیشان)',
      icon: IconText,
      fields: ['originalTitle', 'alternativeTitle', 'titleInCentralKurdish', 'romanizedTitle'],
    },
    {
      title: 'Document (بەڵگەنامە)',
      icon: IconBook,
      fields: ['description', 'documentType', 'subject', 'genre', 'script', 'transcription', 'isbn', 'assignmentNumber', 'edition', 'volume', 'series'],
    },
    {
      title: 'Language (زمان)',
      icon: IconLanguage,
      fields: ['language', 'dialect'],
    },
    {
      title: 'Credits (بەشداربووان)',
      icon: IconMic,
      fields: ['author', 'contributors', 'printingHouse', 'audience'],
    },
    {
      title: 'Physical & Technical (فیزیکی و تەکنیکی)',
      icon: IconBook,
      fields: ['fileSize', 'extension', 'orientation', 'pageCount', 'size', 'physicalDimensions'],
    },
    {
      title: 'Classification (پۆلێنکردن)',
      icon: IconTag,
      fields: ['tags', 'keywords'],
    },
    {
      title: 'Dates (بەروارەکان)',
      icon: IconLayers,
      fields: ['dateCreated', 'printDate', 'dateModified', 'datePublished'],
    },
    {
      title: 'Storage (هەڵگرتن)',
      icon: IconLayers,
      fields: ['volumeName', 'directory', 'pathInExternalVolume', 'autoPath'],
    },
    {
      title: 'Archival (ئەرشیفی)',
      icon: IconLayers,
      fields: [
        'accrualMethod', 'provenance', 'textStatus', 'archiveCataloging',
        'physicalAvailability', 'physicalLabel', 'locationInArchiveRoom',
        'lccClassification', 'note',
      ],
    },
    {
      title: 'Rights & Ownership (ماف و خاوەندارێتی)',
      icon: IconTag,
      fields: [
        'copyright', 'rightOwner', 'dateCopyrighted', 'licenseType', 'usageRights',
        'availability', 'owner', 'publisher',
      ],
    },
  ],
}

const FULL_SHARED_FIELD_GROUPS = [
  {
    title: 'Relationships (پەیوەندییەکان)',
    icon: IconLayers,
    fields: [
      'project', 'projectCode', 'projectName', 'person', 'personCode', 'personName',
      'categories', 'categoryCodes',
    ],
  },
  {
    title: 'Visibility & Access (دیاربوون و دەستڕاگەیشتن)',
    icon: IconTag,
    fields: ['isPublic', 'projectVisibleToPublic', 'isVisibleToPublic', 'visibleToPublic', 'fileUrl'],
  },
  {
    title: 'Audit (پشکنین)',
    icon: IconLayers,
    fields: [
      'version', 'createdAt', 'createdBy', 'updatedAt', 'updatedBy',
      'removedAt', 'removedBy', 'deletedAt', 'deletedBy',
    ],
  },
]

const FIELD_ALIASES = {
  centralKurdishTitle: ['centralKurdishTitle', 'titleInCentralKurdish'],
  contributor: ['contributor', 'contributors'],
  contributors: ['contributors', 'contributor'],
  keywords: ['keywords', 'videoKeywords'],
  originTitle: ['originTitle', 'originalTitle'],
  subject: ['subject', 'subjects'],
  tags: ['tags', 'videoTags'],
}

function objectLabel(value) {
  if (!value || typeof value !== 'object') return ''
  return (
    value.label ||
    value.value ||
    value.name ||
    value.fullName ||
    value.title ||
    value.projectName ||
    value.categoryName ||
    value.personName ||
    value.code ||
    value.projectCode ||
    value.categoryCode ||
    value.personCode ||
    ''
  )
}

function normalizeValue(value, { detailed = false } = {}) {
  if (isEmptyValue(value)) return []
  if (Array.isArray(value)) {
    return value
      .map((entry) => normalizeValue(entry, { detailed }))
      .flat()
      .filter(Boolean)
  }
  if (typeof value === 'object') {
    if (detailed) return [safeStringify(value, 2)]
    const label = objectLabel(value)
    return label ? [String(label)] : [safeStringify(value)]
  }
  if (typeof value === 'boolean') return [value ? 'بەڵێ' : 'نەخێر']
  return [String(value)]
}

function metadataTitle(kind, field) {
  const metadata = FIELD_METADATA_BY_KIND[kind] || {}
  const metadataKey = kind === 'video' && field === 'tags'
    ? 'videoTags'
    : kind === 'video' && field === 'keywords'
      ? 'videoKeywords'
      : field
  return metadata[metadataKey]?.title || null
}

function BilingualFieldLabel({ field, kind }) {
  const ku = FIELD_LABELS_KU[field] || metadataTitle(kind, field) || field
  return (
    <span className="full-field-label">
      <span dir="ltr" className="full-field-label-en">{field}</span>
      <span className="full-field-label-ku">({ku})</span>
    </span>
  )
}

function BilingualGroupTitle({ title }) {
  const match = String(title || '').match(/^(.+?)\s*\((.+)\)$/)
  if (!match) return <span className="meta-panel-title-main">{title}</span>
  return (
    <span className="meta-panel-title-copy">
      <span dir="ltr" className="meta-panel-title-main">{match[1]}</span>
      <span className="meta-panel-title-local">{match[2]}</span>
    </span>
  )
}

function PublicFieldValue({ value, detailed = false }) {
  const values = normalizeValue(value, { detailed })
  if (!values.length) return <span className="full-field-empty">{EMPTY_VALUE}</span>
  if (values.length > 1) {
    return (
      <div className="full-field-pills">
        {values.map((entry, index) => (
          <span key={`${entry}-${index}`} className="full-field-pill">{entry}</span>
        ))}
      </div>
    )
  }
  return <span className="full-field-text">{values[0]}</span>
}

function KhiPublicMediaFields({ kind, item, full = false }) {
  const normalizedKind = String(kind || '').trim().toLowerCase()
  const groups = full
    ? buildCompleteMediaFieldGroups(normalizedKind, item, {
        aliases: FIELD_ALIASES,
        fieldGroups: FULL_MEDIA_FIELD_GROUPS,
        sharedGroups: FULL_SHARED_FIELD_GROUPS,
      })
    : FIELD_GROUPS[normalizedKind] || []
  const displayedOutside = DISPLAYED_OUTSIDE_FIELDS[normalizedKind] || new Set()
  if (!groups.length) return null

  return (
    <>
      {groups.map((group) => {
        const fields = group.fields.filter((field) => full || !displayedOutside.has(field))
        if (!fields.length) return null
        const Icon = group.icon || IconLayers
        return (
          <div className="meta-panel media-field-group" key={group.title}>
            <p className="meta-panel-title">
              <span className="meta-panel-title-icon"><Icon width="17" height="17" /></span>
              <BilingualGroupTitle title={group.title} />
              <span className="meta-panel-count" aria-label={`${fields.length} fields`}>{fields.length}</span>
            </p>
            <dl className="meta-rows">
              {fields.map((field) => {
                const value = valueFrom(item, field, { aliases: FIELD_ALIASES, keepEmpty: full })
                const isLong = LONG_FIELDS.has(field) || (
                  !isEmptyValue(value) && (
                    typeof value === 'object' || String(value).length > 160
                  )
                )
                return (
                  <div className={`meta-row full-field-row${isLong ? ' is-long' : ''}${isEmptyValue(value) ? ' is-empty-value' : ''}`} key={field}>
                    <dt><BilingualFieldLabel field={field} kind={normalizedKind} /></dt>
                    <dd><PublicFieldValue value={value} detailed={full} /></dd>
                  </div>
                )
              })}
            </dl>
          </div>
        )
      })}
    </>
  )
}

export {
  FIELD_ALIASES,
  FULL_MEDIA_FIELD_GROUPS,
  FULL_SHARED_FIELD_GROUPS,
  KhiPublicMediaFields,
  PUBLIC_MEDIA_FIELDS,
}
