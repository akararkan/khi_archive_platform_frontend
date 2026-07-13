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

const EMPTY_VALUE = '—'

const LONG_FIELDS = new Set([
  'abstractText',
  'copyright',
  'lyrics',
  'photostory',
  'provenance',
  'transcription',
  'usageRights',
])

const SHOWN_IN_HERO_FIELDS = new Set(['description'])

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
      title: 'Story & Provenance (چیرۆک و سەرچاوە)',
      icon: IconLayers,
      fields: ['provenance', 'photostory'],
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
      title: 'Content (ناوەڕۆک)',
      icon: IconText,
      fields: ['abstractText', 'lyrics'],
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

const FIELD_ALIASES = {
  centralKurdishTitle: ['centralKurdishTitle', 'titleInCentralKurdish'],
  contributor: ['contributor', 'contributors'],
  contributors: ['contributors', 'contributor'],
  originTitle: ['originTitle', 'originalTitle'],
  subject: ['subject', 'subjects'],
}

function isEmptyValue(value) {
  if (value == null || value === '' || value === false) return true
  if (Array.isArray(value)) return value.length === 0 || value.every(isEmptyValue)
  return false
}

function valueFrom(item, key) {
  const keys = FIELD_ALIASES[key] || [key]
  for (const candidate of keys) {
    const value = item?.[candidate]
    if (!isEmptyValue(value)) return value
  }
  return null
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

function normalizeValue(value) {
  if (isEmptyValue(value)) return []
  if (Array.isArray(value)) {
    return value
      .map((entry) => normalizeValue(entry))
      .flat()
      .filter(Boolean)
  }
  if (typeof value === 'object') {
    const label = objectLabel(value)
    return label ? [String(label)] : [JSON.stringify(value)]
  }
  if (typeof value === 'boolean') return [value ? 'بەڵێ' : 'نەخێر']
  return [String(value)]
}

function BilingualFieldLabel({ field }) {
  const ku = FIELD_LABELS_KU[field] || field
  return (
    <span className="full-field-label">
      <span dir="ltr" className="full-field-label-en">{field}</span>
      <span className="full-field-label-ku">({ku})</span>
    </span>
  )
}

function PublicFieldValue({ value }) {
  const values = normalizeValue(value)
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

function KhiPublicMediaFields({ kind, item }) {
  const groups = FIELD_GROUPS[kind] || []
  if (!groups.length) return null

  return (
    <>
      {groups.map((group) => {
        const fields = group.fields.filter((field) => !SHOWN_IN_HERO_FIELDS.has(field))
        if (!fields.length) return null
        const Icon = group.icon || IconLayers
        return (
          <div className="meta-panel media-field-group" key={group.title}>
            <p className="meta-panel-title">
              <Icon width="16" height="16" />
              <span>{group.title}</span>
            </p>
            <dl className="meta-rows">
              {fields.map((field) => (
                <div className={`meta-row full-field-row${LONG_FIELDS.has(field) ? ' is-long' : ''}`} key={field}>
                  <dt><BilingualFieldLabel field={field} /></dt>
                  <dd><PublicFieldValue value={valueFrom(item, field)} /></dd>
                </div>
              ))}
            </dl>
          </div>
        )
      })}
    </>
  )
}

export { KhiPublicMediaFields, PUBLIC_MEDIA_FIELDS }
