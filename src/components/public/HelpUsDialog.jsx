import { memo, useCallback, useEffect, useId, useMemo, useRef, useState } from 'react'
import {
  AlertCircle,
  ArrowRight,
  Check,
  CheckCircle2,
  FileText,
  Globe,
  Loader2,
  LogIn,
  MapPin,
  MessageSquarePlus,
  Music,
  Scale,
  Search,
  Send,
  Tag,
  Users,
  X,
} from 'lucide-react'
import { Link } from 'react-router-dom'

import '@/styles/khi-theme.css'
import { useCurrentProfile } from '@/hooks/use-current-profile'
import { pickMediaTitle } from '@/components/public/public-helpers'
import { getMyCorrections, submitCorrection } from '@/services/corrections'

// ── Kurdish (Sorani) UI strings ────────────────────────────────────────────────
const KU = {
  title: 'یارمەتیمان بدە بۆ باشترکردن',
  subtitle: 'خانەیەک هەڵبژێرە و نرخی ڕاست بنووسە',
  signInTitle: 'بۆ بەشداری بچۆرە ژوورەوە',
  signInBody: 'پێویستە بچیتە ژوورەوە بۆ پێشنیارکردنی ڕاستکردنەوە. یارمەتیت گەنجینەکە بۆ هەمووان ورد ڕادەگرێت.',
  signIn: 'چوونەژوورەوە',
  later: 'دواتر',
  thanks: 'سوپاس بۆ یارمەتیت!',
  thanksBody: (n) => `${n} ڕاستکردنەوە بە سەرکەوتوویی نێردرا. تیمەکەمان پێداچوونەوەی بۆ دەکات و جێبەجێی دەکات.`,
  done: 'تەواو',
  searchFields: 'گەڕان بەناو خانەکان…',
  searchLabel: 'گەڕان بەناو خانەکان',
  clearSearch: 'پاککردنەوەی گەڕان',
  currentValue: 'نرخی ئێستا لە گەنجینەکەدا',
  noValue: 'هیچ نرخێک بۆ ئەم خانەیە دانەنراوە',
  yourCorrection: 'ڕاستکردنەوەکەت',
  clear: 'پاککردنەوە',
  enterCorrect: (label) => `نرخی ڕاستی «${label}» لێرە بنووسە…`,
  savedHint: 'ڕاستکردنەوە پاشەکەوتکرا — دەتوانیت خانەکانی تر دەستکاری بکەیت پێش ناردن.',
  blankHint: 'ئەگەر نرخی ئێستا ڕاستە، بەتاڵی بهێڵەرەوە.',
  queued: 'ڕاستکردنەوە ئامادەکراوەکان',
  mySubs: 'ناردراوەکانی من',
  noSubs: 'هێشتا هیچ ناردراوێک نییە',
  loading: 'بارکردن…',
  ready: (n) => `${n} خانە ئامادەی ناردنە`,
  cancel: 'هەڵوەشاندنەوە',
  submit: 'ناردن',
  submitting: 'ناردن…',
  noMatch: 'هیچ خانەیەک نەدۆزرایەوە',
  ctrlEnter: 'بۆ ناردن',
  genericError: 'هەڵەیەک ڕوویدا. تکایە دووبارە هەوڵبدەرەوە.',
  fieldsList: 'خانەکان',
  chooseField: 'گۆڕینی خانە',
  backToFields: 'گەڕانەوە بۆ خانەکان',
  corrected: 'ڕاستکراوەتەوە',
  chars: (n) => `${n} پیت`,
  discardTitle: 'ڕاستکردنەوە نەنێردراوەکان دەفەوتێن',
  discardBody: (n) => `${n} ڕاستکردنەوەت ئامادەکردووە بەڵام هێشتا نەتناردووە. ئەگەر دەربچیت لەدەست دەچن.`,
  discardConfirm: 'دەرچوون بەبێ ناردن',
  discardCancel: 'گەڕانەوە',
  close: 'داخستن',
  statusPending: 'چاوەڕوانی پێداچوونەوە',
  statusForwarded: 'ڕەوانەکراوە',
  statusResolved: 'جێبەجێکراوە',
  statusRejected: 'ڕەتکراوەتەوە',
}

// ── Section tones ──────────────────────────────────────────────────────────────
// One accessible hue per section (all ≥ 4.5:1 on the dialog's white card, so the
// tone can safely tint TEXT as well as the dot). Colour is never the only cue —
// every section also carries its own icon and its name.
const TONE = {
  content: '#1f3a31',
  form: '#5b3f86',
  people: '#8f5314',
  language: '#0f5f57',
  place: '#9c3b4d',
  rights: '#7d6117',
  tags: '#2c6b39',
  document: '#3a4c8c',
}

// ── Field groups (Sorani labels) ───────────────────────────────────────────────
const FIELD_GROUPS = {
  AUDIO: [
    { section: 'ناوەڕۆک', tone: TONE.content, Icon: FileText, fields: [
      { key: 'title',         label: 'ناونیشان'      },
      { key: 'description',   label: 'پێناسە'         },
      { key: 'transcription', label: 'نووسینەوە'      },
      { key: 'lyrics',        label: 'دەقی گۆرانی'    },
    ]},
    { section: 'مۆسیقا و فۆڕم', tone: TONE.form, Icon: Music, fields: [
      { key: 'form',              label: 'فۆڕم'             },
      { key: 'typeOfBasta',       label: 'جۆری بەستە'       },
      { key: 'typeOfMaqam',       label: 'جۆری مقام'        },
      { key: 'typeOfComposition', label: 'جۆری داڕشتن'      },
      { key: 'typeOfPerformance', label: 'جۆری پێشکەشکردن'  },
      { key: 'poet',              label: 'شاعیر'            },
      { key: 'genre',             label: 'ژانر'             },
    ]},
    { section: 'ئەرک و بەشداران', tone: TONE.people, Icon: Users, fields: [
      { key: 'composer', label: 'مۆسیقاژەن' },
      { key: 'speaker',  label: 'قسەکەر'    },
      { key: 'producer', label: 'بەرهەمهێنەر' },
    ]},
    { section: 'زمان و بینەر', tone: TONE.language, Icon: Globe, fields: [
      { key: 'language', label: 'زمان'          },
      { key: 'dialect',  label: 'زاراوە'        },
      { key: 'audience', label: 'گرووپی ئامانج' },
    ]},
    { section: 'شوێنی تۆمارکردن', tone: TONE.place, Icon: MapPin, fields: [
      { key: 'recordingVenue', label: 'شوێنی تۆمار' },
      { key: 'city',           label: 'شار'         },
      { key: 'region',         label: 'ناوچە'       },
    ]},
    { section: 'مافەکان', tone: TONE.rights, Icon: Scale, fields: [
      { key: 'copyright',    label: 'مافی چاپ'   },
      { key: 'rightOwner',   label: 'خاوەنی ماف' },
      { key: 'availability', label: 'بەردەستی'   },
      { key: 'licenseType',  label: 'مۆڵەت'      },
      { key: 'owner',        label: 'خاوەن'      },
      { key: 'publisher',    label: 'بڵاوکەرەوە' },
    ]},
    { section: 'تاگەکان', tone: TONE.tags, Icon: Tag, fields: [
      { key: 'tags',     label: 'تاگەکان'     },
    ]},
  ],
  VIDEO: [
    { section: 'ناوەڕۆک', tone: TONE.content, Icon: FileText, fields: [
      { key: 'title',         label: 'ناونیشان'  },
      { key: 'description',   label: 'پێناسە'     },
      { key: 'transcription', label: 'نووسینەوە'  },
    ]},
    { section: 'بابەت و فۆڕم', tone: TONE.form, Icon: Music, fields: [
      { key: 'event',              label: 'بۆنە'             },
      { key: 'location',           label: 'شوێن'             },
      { key: 'subject',            label: 'بابەت'            },
      { key: 'genre',              label: 'ژانر'             },
      { key: 'personShownInVideo', label: 'کەسانی دەرکەوتوو' },
      { key: 'colorOfVideo',       label: 'ڕەنگ'             },
    ]},
    { section: 'ئەرک و بەشداران', tone: TONE.people, Icon: Users, fields: [
      { key: 'creatorArtistDirector', label: 'دروستکەر / دەرهێنەر' },
      { key: 'producer',              label: 'بەرهەمهێنەر'         },
      { key: 'audience',              label: 'گرووپی ئامانج'       },
    ]},
    { section: 'زمان', tone: TONE.language, Icon: Globe, fields: [
      { key: 'language', label: 'زمان'          },
      { key: 'dialect',  label: 'زاراوە'        },
      { key: 'subtitle', label: 'زمانی ژێرنووس' },
    ]},
    { section: 'مافەکان', tone: TONE.rights, Icon: Scale, fields: [
      { key: 'copyright',    label: 'مافی چاپ'   },
      { key: 'rightOwner',   label: 'خاوەنی ماف' },
      { key: 'availability', label: 'بەردەستی'   },
      { key: 'licenseType',  label: 'مۆڵەت'      },
      { key: 'owner',        label: 'خاوەن'      },
      { key: 'publisher',    label: 'بڵاوکەرەوە' },
    ]},
    { section: 'تاگەکان', tone: TONE.tags, Icon: Tag, fields: [
      { key: 'tags', label: 'تاگەکان' },
    ]},
  ],
  IMAGE: [
    { section: 'ناوەڕۆک', tone: TONE.content, Icon: FileText, fields: [
      { key: 'title', label: 'ناونیشان' }, { key: 'description', label: 'پێناسە' },
    ]},
    { section: 'بابەت و فۆڕم', tone: TONE.form, Icon: Music, fields: [
      { key: 'form',                      label: 'فۆڕم'                },
      { key: 'event',                     label: 'بۆنە'                },
      { key: 'location',                  label: 'شوێن'                },
      { key: 'subject',                   label: 'بابەت'               },
      { key: 'genre',                     label: 'ژانر'                },
      { key: 'personShownInImage',        label: 'کەسانی دەرکەوتوو'    },
      { key: 'creatorArtistPhotographer', label: 'دروستکەر / وێنەگر'   },
      { key: 'audience',                  label: 'گرووپی ئامانج'       },
    ]},
    { section: 'مافەکان', tone: TONE.rights, Icon: Scale, fields: [
      { key: 'copyright',    label: 'مافی چاپ'   },
      { key: 'rightOwner',   label: 'خاوەنی ماف' },
      { key: 'availability', label: 'بەردەستی'   },
      { key: 'licenseType',  label: 'مۆڵەت'      },
      { key: 'owner',        label: 'خاوەن'      },
      { key: 'publisher',    label: 'بڵاوکەرەوە' },
    ]},
    { section: 'تاگەکان', tone: TONE.tags, Icon: Tag, fields: [
      { key: 'tags', label: 'تاگەکان' },
    ]},
  ],
  TEXT: [
    { section: 'ناوەڕۆک', tone: TONE.content, Icon: FileText, fields: [
      { key: 'title',       label: 'ناونیشان'    },
      { key: 'description', label: 'پێناسە'       },
      { key: 'summary',     label: 'کورتە'        },
      { key: 'bodyText',    label: 'دەقی سەرەکی'  },
    ]},
    { section: 'دۆکیومێنت', tone: TONE.document, Icon: FileText, fields: [
      { key: 'documentType', label: 'جۆری دۆکیومێنت' },
      { key: 'subject',      label: 'بابەت'          },
      { key: 'genre',        label: 'ژانر'           },
      { key: 'script',       label: 'ڕێنووس'         },
      { key: 'isbn',         label: 'ISBN'           },
      { key: 'edition',      label: 'چاپ'            },
      { key: 'volume',       label: 'بەرگ'           },
      { key: 'series',       label: 'زنجیرە'         },
    ]},
    { section: 'ئەرک و بەشداران', tone: TONE.people, Icon: Users, fields: [
      { key: 'author',        label: 'نووسەر'   },
      { key: 'printingHouse', label: 'چاپخانە'  },
      { key: 'audience',      label: 'گرووپی ئامانج' },
    ]},
    { section: 'زمان', tone: TONE.language, Icon: Globe, fields: [
      { key: 'language', label: 'زمان' }, { key: 'dialect', label: 'زاراوە' },
    ]},
    { section: 'مافەکان', tone: TONE.rights, Icon: Scale, fields: [
      { key: 'copyright',    label: 'مافی چاپ'   },
      { key: 'rightOwner',   label: 'خاوەنی ماف' },
      { key: 'availability', label: 'بەردەستی'   },
      { key: 'licenseType',  label: 'مۆڵەت'      },
      { key: 'owner',        label: 'خاوەن'      },
      { key: 'publisher',    label: 'بڵاوکەرەوە' },
    ]},
    { section: 'تاگەکان', tone: TONE.tags, Icon: Tag, fields: [
      { key: 'tags', label: 'تاگەکان' },
    ]},
  ],
}

const LONG_FIELDS = ['description', 'transcription', 'lyrics', 'summary', 'bodyText']

const STATUS_META = {
  PENDING: { tone: '#8a6a1c', label: KU.statusPending },
  FORWARDED: { tone: '#3a4c8c', label: KU.statusForwarded },
  RESOLVED: { tone: '#2c6b39', label: KU.statusResolved },
  REJECTED: { tone: '#9c3b4d', label: KU.statusRejected },
}

const FOCUSABLE = 'a[href],button:not([disabled]),textarea,input,select,[tabindex]:not([tabindex="-1"])'

function displayValue(val) {
  if (val == null || val === '') return null
  if (Array.isArray(val)) { const s = val.filter(Boolean).join('، '); return s || null }
  if (typeof val === 'boolean') return val ? 'بەڵێ' : 'نەخێر'
  return String(val)
}

function displayFieldValue(mediaData, mediaTitle, key) {
  if (key === 'title') {
    return (
      displayValue(mediaTitle) ||
      displayValue(pickMediaTitle(mediaData)) ||
      displayValue(mediaData?.title) ||
      displayValue(mediaData?.titleEnglish) ||
      displayValue(mediaData?.titleOriginal) ||
      displayValue(mediaData?.originalTitle) ||
      displayValue(mediaData?.originTitle) ||
      displayValue(mediaData?.titleInCentralKurdish) ||
      displayValue(mediaData?.centralKurdishTitle)
    )
  }
  return displayValue(mediaData?.[key])
}

// ── Field option ───────────────────────────────────────────────────────────────
// Memoised: typing a correction re-renders only the row it belongs to, not the
// whole list (some media types carry ~30 fields).
const FieldOption = memo(function FieldOption({
  fieldKey, label, preview, tone, active, done, optionId, onSelect,
}) {
  return (
    <button
      type="button"
      id={optionId}
      role="option"
      aria-selected={active}
      tabIndex={active ? 0 : -1}
      onClick={() => onSelect(fieldKey)}
      className={[
        'khi-help-option relative flex w-full items-start gap-2.5 px-3 py-2.5 text-start',
        'min-h-[52px] transition-colors focus-visible:outline-none focus-visible:ring-2',
        'focus-visible:ring-[var(--ring)] focus-visible:ring-offset-1 focus-visible:ring-offset-[var(--secondary)]',
        active ? 'bg-card shadow-sm ring-1 ring-border' : 'hover:bg-card/70',
      ].join(' ')}
      style={active ? { '--sec': tone } : undefined}
    >
      {active ? <span aria-hidden="true" className="absolute inset-y-1.5 start-0 w-[3px] rounded-e-full" style={{ background: tone }} /> : null}
      <span className="min-w-0 flex-1">
        <span className={['block text-[14px] leading-snug', active ? 'font-bold text-foreground' : 'font-semibold text-foreground/90'].join(' ')}>
          {label}
        </span>
        <span className={['mt-0.5 block truncate text-[12px] leading-tight', preview ? 'text-muted-foreground' : 'italic text-muted-foreground/80'].join(' ')}>
          {preview ?? KU.noValue}
        </span>
      </span>
      {done ? (
        <span
          className="mt-0.5 inline-flex shrink-0 items-center gap-1 rounded-full bg-[#2c6b39]/12 px-1.5 py-0.5 text-[11px] font-bold text-[#2c6b39]"
          title={KU.corrected}
        >
          <Check className="size-3" aria-hidden="true" />
          <span className="sr-only">{KU.corrected}</span>
        </span>
      ) : null}
    </button>
  )
})

// ── Main component (export name + props unchanged for callers) ─────────────────
function HelpUsDialog({ open, onOpenChange, mediaType, mediaCode, mediaTitle, mediaData }) {
  const profile = useCurrentProfile()
  const isLoggedIn = Boolean(profile)

  const groups = useMemo(() => FIELD_GROUPS[mediaType] ?? [], [mediaType])
  const allFields = useMemo(() => groups.flatMap((g) => g.fields), [groups])

  const [selectedKey, setSelectedKey] = useState(allFields[0]?.key ?? '')
  const [corrections, setCorrections] = useState({})
  const [fieldQuery, setFieldQuery] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState('')
  const [submitted, setSubmitted] = useState(false)
  const [submittedCount, setSubmittedCount] = useState(0)
  const [pastCorrections, setPastCorrections] = useState([])
  const [pastLoading, setPastLoading] = useState(false)
  // Phones show one pane at a time: the field list, then the editor.
  const [pickerOpen, setPickerOpen] = useState(false)
  const [confirmDiscard, setConfirmDiscard] = useState(false)

  const textareaRef = useRef(null)
  const shellRef = useRef(null)
  const listRef = useRef(null)
  const uid = useId()
  const titleId = `${uid}-title`
  const descId = `${uid}-desc`
  const searchId = `${uid}-search`
  const editorId = `${uid}-editor`
  const listId = `${uid}-list`
  const optionId = (key) => `${uid}-opt-${key}`

  const filledFields = useMemo(
    () => allFields.filter((f) => corrections[f.key]?.trim()),
    [allFields, corrections],
  )
  const canSubmit = filledFields.length > 0
  const hasUnsent = canSubmit && !submitted

  // Every field's current archive value, computed once per record instead of on
  // every keystroke (the list re-read all ~30 of them on each render before).
  const previews = useMemo(() => {
    const map = {}
    for (const f of allFields) map[f.key] = displayFieldValue(mediaData, mediaTitle, f.key)
    return map
  }, [allFields, mediaData, mediaTitle])

  const toneByKey = useMemo(() => {
    const map = {}
    for (const g of groups) for (const f of g.fields) map[f.key] = g.tone
    return map
  }, [groups])

  const visibleGroups = useMemo(() => {
    const nq = fieldQuery.trim().toLowerCase()
    if (!nq) return groups
    return groups
      .map((g) => ({ ...g, fields: g.fields.filter((f) => f.label.toLowerCase().includes(nq)) }))
      .filter((g) => g.fields.length)
  }, [groups, fieldQuery])

  const visibleKeys = useMemo(
    () => visibleGroups.flatMap((g) => g.fields.map((f) => f.key)),
    [visibleGroups],
  )

  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    if (open) {
      setSelectedKey(allFields[0]?.key ?? '')
      setCorrections({})
      setFieldQuery('')
      setSubmitting(false)
      setSubmitError('')
      setSubmitted(false)
      setSubmittedCount(0)
      setPastCorrections([])
      setPickerOpen(false)
      setConfirmDiscard(false)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open])
  /* eslint-enable react-hooks/set-state-in-effect */

  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    if (!open || !isLoggedIn || !mediaCode) return undefined
    let cancelled = false
    setPastLoading(true)
    getMyCorrections({ mediaCode, size: 50 })
      .then((data) => {
        if (cancelled) return
        const items = Array.isArray(data?.items) ? data.items
          : Array.isArray(data?.content) ? data.content
            : Array.isArray(data) ? data : []
        setPastCorrections(items)
      })
      .catch(() => { if (!cancelled) setPastCorrections([]) })
      .finally(() => { if (!cancelled) setPastLoading(false) })
    return () => { cancelled = true }
  }, [open, isLoggedIn, mediaCode])
  /* eslint-enable react-hooks/set-state-in-effect */

  useEffect(() => {
    if (open && isLoggedIn && !submitted && !pickerOpen) {
      const t = setTimeout(() => textareaRef.current?.focus(), 60)
      return () => clearTimeout(t)
    }
    return undefined
  }, [selectedKey, open, isLoggedIn, submitted, pickerOpen])

  // Lock the page behind the modal and hand focus back where it came from.
  useEffect(() => {
    if (!open) return undefined
    const opener = document.activeElement
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = previousOverflow
      if (opener instanceof HTMLElement) opener.focus()
    }
  }, [open])

  const doSubmit = useCallback(async () => {
    if (!canSubmit || submitting) return
    setSubmitting(true)
    setSubmitError('')
    try {
      const results = await Promise.all(
        filledFields.map((f) =>
          submitCorrection({ mediaType, mediaCode, targetField: f.key, suggestedValue: corrections[f.key].trim() }),
        ),
      )
      setPastCorrections((prev) => [...(Array.isArray(results) ? results.filter(Boolean) : []), ...prev])
      setSubmittedCount(filledFields.length)
      setSubmitted(true)
    } catch (err) {
      setSubmitError(err?.response?.data?.message || err?.response?.data?.error || KU.genericError)
    } finally {
      setSubmitting(false)
    }
  }, [canSubmit, submitting, filledFields, corrections, mediaType, mediaCode])

  // Closing with queued-but-unsent corrections asks first — they used to vanish.
  const requestClose = useCallback(() => {
    if (submitting) return
    if (hasUnsent) { setConfirmDiscard(true); return }
    onOpenChange(false)
  }, [submitting, hasUnsent, onOpenChange])

  // Escape closes, Ctrl/Cmd+Enter submits (the hint promised this but nothing
  // implemented it), and Tab is trapped inside the dialog.
  useEffect(() => {
    if (!open) return undefined
    const onKeyDown = (e) => {
      if (e.key === 'Escape') {
        e.stopPropagation()
        if (confirmDiscard) setConfirmDiscard(false)
        else requestClose()
        return
      }
      if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
        e.preventDefault()
        doSubmit()
        return
      }
      if (e.key !== 'Tab') return
      const root = shellRef.current
      if (!root) return
      const nodes = Array.from(root.querySelectorAll(FOCUSABLE))
        .filter((el) => el.offsetParent !== null || el === document.activeElement)
      if (!nodes.length) return
      const first = nodes[0]
      const last = nodes[nodes.length - 1]
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus() }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus() }
    }
    window.addEventListener('keydown', onKeyDown, true)
    return () => window.removeEventListener('keydown', onKeyDown, true)
  }, [open, confirmDiscard, requestClose, doSubmit])

  const selectField = useCallback((key) => {
    setSelectedKey(key)
    setPickerOpen(false)
  }, [])

  // Arrow-key navigation across the field listbox (roving tabindex).
  const onListKeyDown = useCallback((e) => {
    const keys = visibleKeys
    if (!keys.length) return
    const i = keys.indexOf(selectedKey)
    let next = null
    if (e.key === 'ArrowDown') next = keys[Math.min(keys.length - 1, i + 1)]
    else if (e.key === 'ArrowUp') next = keys[Math.max(0, i - 1)]
    else if (e.key === 'Home') next = keys[0]
    else if (e.key === 'End') next = keys[keys.length - 1]
    if (!next) return
    e.preventDefault()
    setSelectedKey(next)
    requestAnimationFrame(() => {
      listRef.current?.querySelector(`#${CSS.escape(optionId(next))}`)?.focus()
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visibleKeys, selectedKey, uid])

  const setFieldValue = useCallback((key, val) => {
    setCorrections((p) => ({ ...p, [key]: val }))
  }, [])

  if (!open) return null

  const selectedDef = allFields.find((f) => f.key === selectedKey)
  const selectedGroup = groups.find((g) => g.fields.some((f) => f.key === selectedKey))
  const currentVal = previews[selectedKey] ?? null
  const correctionVal = corrections[selectedKey] ?? ''
  const isLong = LONG_FIELDS.includes(selectedKey)
  const tone = toneByKey[selectedKey] || TONE.content

  const handleSubmit = (e) => { e.preventDefault(); doSubmit() }

  return (
    <div
      className="khi-surface khi-help-dialog fixed inset-0 z-[95] flex items-end justify-center bg-black/65 backdrop-blur-md sm:items-center sm:p-4"
      dir="rtl"
      lang="ckb"
      onMouseDown={(e) => { if (e.target === e.currentTarget) requestClose() }}
    >
      <div
        ref={shellRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={descId}
        className="khi-help-shell relative flex w-full max-w-[1020px] flex-col overflow-hidden rounded-t-3xl border border-border bg-card text-card-foreground sm:rounded-2xl"
        style={{ height: 'min(94dvh, 780px)' }}
      >
        {/* ═══ HEADER ═══ */}
        <header className="khi-help-head flex shrink-0 items-start justify-between gap-4 border-b border-border px-4 py-4 sm:px-6">
          <div className="flex min-w-0 items-center gap-3">
            <span aria-hidden="true" className="khi-help-mark grid size-11 shrink-0 place-items-center rounded-xl text-primary-foreground">
              <MessageSquarePlus className="size-5" />
            </span>
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                <h2 id={titleId} className="font-heading text-[19px] font-bold leading-tight text-foreground">{KU.title}</h2>
                <span className="rounded-md border border-border bg-secondary px-1.5 py-0.5 text-[11px] font-bold uppercase tracking-wider text-secondary-foreground">{mediaType}</span>
              </div>
              <p id={descId} className="mt-1 line-clamp-1 text-[13px] text-muted-foreground">
                {mediaTitle || KU.subtitle}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={requestClose}
            className="grid size-9 shrink-0 place-items-center rounded-lg text-muted-foreground transition hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)]"
            aria-label={KU.close}
          >
            <X className="size-4" />
          </button>
        </header>

        {/* ═══ BODY ═══ */}
        {!isLoggedIn ? (
          <div className="flex flex-1 items-center justify-center overflow-y-auto p-8">
            <div className="w-full max-w-sm text-center">
              <div aria-hidden="true" className="mx-auto mb-6 grid size-16 place-items-center rounded-2xl bg-primary/10 text-primary"><LogIn className="size-7" /></div>
              <h3 className="font-heading text-xl font-bold text-foreground">{KU.signInTitle}</h3>
              <p className="mt-2 text-[14px] leading-7 text-muted-foreground">{KU.signInBody}</p>
              <div className="mt-8 flex flex-col gap-2">
                <Link to="/login" onClick={() => onOpenChange(false)} className="khi-help-submit flex w-full items-center justify-center gap-2 rounded-xl px-4 py-3 text-[14px] font-bold text-primary-foreground transition">
                  <LogIn className="size-4" /> {KU.signIn}
                </Link>
                <button type="button" onClick={() => onOpenChange(false)} className="w-full rounded-xl border border-border px-4 py-3 text-[14px] font-semibold text-foreground transition hover:bg-muted">{KU.later}</button>
              </div>
            </div>
          </div>
        ) : submitted ? (
          <div className="flex flex-1 items-center justify-center overflow-y-auto p-8">
            <div className="w-full max-w-sm text-center" role="status">
              <div aria-hidden="true" className="mx-auto mb-6 grid size-16 place-items-center rounded-2xl bg-[#2c6b39]/12 text-[#2c6b39]"><CheckCircle2 className="size-7" /></div>
              <h3 className="font-heading text-xl font-bold text-foreground">{KU.thanks}</h3>
              <p className="mt-2 text-[14px] leading-7 text-muted-foreground">{KU.thanksBody(submittedCount)}</p>
              <button type="button" onClick={() => onOpenChange(false)} className="khi-help-submit mt-8 flex w-full items-center justify-center gap-2 rounded-xl px-4 py-3 text-[14px] font-bold text-primary-foreground transition">
                <CheckCircle2 className="size-4" /> {KU.done}
              </button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="flex min-h-0 flex-1 flex-col md:flex-row">
            {/* ─── FIELD RAIL — a full pane on phones, a fixed rail from md up ─── */}
            <div
              className={[
                'khi-help-rail min-h-0 w-full shrink-0 flex-col border-border md:flex md:w-[288px] md:border-e',
                pickerOpen ? 'flex flex-1' : 'hidden',
              ].join(' ')}
            >
              <div className="shrink-0 border-b border-border p-3">
                <label htmlFor={searchId} className="sr-only">{KU.searchLabel}</label>
                <div className="relative">
                  <Search aria-hidden="true" className="pointer-events-none absolute inset-y-0 end-3 my-auto size-4 text-muted-foreground" />
                  <input
                    id={searchId}
                    type="search"
                    value={fieldQuery}
                    onChange={(e) => setFieldQuery(e.target.value)}
                    placeholder={KU.searchFields}
                    className="h-11 w-full rounded-lg border border-border bg-background pe-10 ps-3 text-[14px] text-foreground outline-none transition focus:border-primary focus:ring-2 focus:ring-[var(--ring)]/25"
                  />
                </div>
              </div>

              <div
                ref={listRef}
                id={listId}
                role="listbox"
                aria-label={KU.fieldsList}
                onKeyDown={onListKeyDown}
                className="min-h-0 flex-1 overflow-y-auto py-2"
              >
                {visibleGroups.length === 0 ? (
                  <p className="px-3 py-6 text-center text-[13px] italic text-muted-foreground">{KU.noMatch}</p>
                ) : visibleGroups.map(({ section, tone: sectionTone, Icon, fields }) => {
                  const SectionIcon = Icon
                  return (
                    <div key={section} role="group" aria-label={section} className="mb-1.5">
                      <div className="flex items-center gap-2 px-3 pb-1.5 pt-2.5">
                        <SectionIcon aria-hidden="true" className="size-3.5 shrink-0" style={{ color: sectionTone }} />
                        <span className="text-[11px] font-bold uppercase tracking-wider" style={{ color: sectionTone }}>{section}</span>
                        <span aria-hidden="true" className="h-px flex-1 bg-border" />
                      </div>
                      {fields.map((field) => (
                        <FieldOption
                          key={field.key}
                          fieldKey={field.key}
                          label={field.label}
                          preview={previews[field.key]}
                          tone={sectionTone}
                          active={field.key === selectedKey}
                          done={Boolean(corrections[field.key]?.trim())}
                          optionId={optionId(field.key)}
                          onSelect={selectField}
                        />
                      ))}
                    </div>
                  )
                })}
              </div>

              {/* Past submissions — now available on phones too. */}
              <div className="shrink-0 border-t border-border px-3 py-3">
                <p className="mb-2 text-[11px] font-bold uppercase tracking-wider text-muted-foreground">{KU.mySubs}</p>
                {pastLoading ? (
                  <p className="flex items-center gap-2 text-[12px] text-muted-foreground">
                    <Loader2 aria-hidden="true" className="size-3.5 animate-spin" />{KU.loading}
                  </p>
                ) : pastCorrections.length === 0 ? (
                  <p className="text-[12px] italic text-muted-foreground">{KU.noSubs}</p>
                ) : (
                  <ul className="max-h-[132px] space-y-1 overflow-y-auto pe-0.5">
                    {pastCorrections.map((c) => {
                      const meta = STATUS_META[String(c.status ?? '').toUpperCase()]
                      return (
                        <li key={c.id} className="flex items-start gap-2 rounded-md px-1.5 py-1.5 hover:bg-muted/50">
                          <span aria-hidden="true" className="mt-1.5 size-1.5 shrink-0 rounded-full" style={{ background: meta?.tone || 'var(--muted-foreground)' }} />
                          <span className="min-w-0 flex-1">
                            <span className="block truncate text-[12px] font-semibold text-foreground">{c.targetField}</span>
                            <span className="block truncate text-[12px] text-muted-foreground" style={{ overflowWrap: 'anywhere' }}>{c.suggestedValue}</span>
                          </span>
                          {meta ? <span className="sr-only">{meta.label}</span> : null}
                        </li>
                      )
                    })}
                  </ul>
                )}
              </div>
            </div>

            {/* ─── EDITOR ─── */}
            <div className={['min-h-0 min-w-0 flex-1 flex-col md:flex', pickerOpen ? 'hidden' : 'flex'].join(' ')}>
              <div id={editorId} className="min-h-0 flex-1 overflow-y-auto">
                {selectedDef ? (
                  <div className="flex flex-col gap-5 px-4 py-5 sm:px-6 md:px-8 md:py-7">
                    {/* Phone-only: which field am I editing, and how do I switch? */}
                    <button
                      type="button"
                      onClick={() => setPickerOpen(true)}
                      className="flex items-center justify-between gap-3 rounded-xl border border-border bg-secondary/60 px-3 py-2.5 text-start md:hidden"
                    >
                      <span className="min-w-0">
                        <span className="block text-[11px] font-bold uppercase tracking-wider text-muted-foreground">{KU.chooseField}</span>
                        <span className="block truncate text-[14px] font-bold text-foreground">{selectedDef.label}</span>
                      </span>
                      <ArrowRight aria-hidden="true" className="size-4 shrink-0 rotate-180 text-muted-foreground" />
                    </button>

                    <div>
                      {selectedGroup ? (
                        <p className="mb-1.5 flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider" style={{ color: tone }}>
                          <span aria-hidden="true" className="size-2 rounded-full" style={{ background: tone }} />
                          {selectedGroup.section}
                        </p>
                      ) : null}
                      <h3 className="font-heading text-[22px] font-bold leading-tight text-foreground">{selectedDef.label}</h3>
                    </div>

                    <section aria-label={KU.currentValue}>
                      <p className="mb-2 text-[11px] font-bold uppercase tracking-wider text-muted-foreground">{KU.currentValue}</p>
                      {currentVal ? (
                        <div className="khi-help-current rounded-xl border border-border px-4 py-3 text-[14px] leading-7 text-foreground" style={{ overflowWrap: 'anywhere' }}>{currentVal}</div>
                      ) : (
                        <p className="rounded-xl border border-dashed border-border bg-secondary/40 px-4 py-3 text-[13px] italic text-muted-foreground">{KU.noValue}</p>
                      )}
                    </section>

                    <section className="flex flex-col">
                      <div className="mb-2 flex items-center justify-between gap-3">
                        <label htmlFor={`${uid}-correction`} className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                          {KU.yourCorrection}
                        </label>
                        {correctionVal.trim() ? (
                          <button type="button" onClick={() => setFieldValue(selectedKey, '')} className="rounded px-1 text-[12px] font-semibold text-muted-foreground transition hover:text-destructive focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)]">
                            {KU.clear}
                          </button>
                        ) : null}
                      </div>
                      <textarea
                        id={`${uid}-correction`}
                        ref={textareaRef}
                        key={selectedKey}
                        value={correctionVal}
                        onChange={(e) => setFieldValue(selectedKey, e.target.value)}
                        placeholder={KU.enterCorrect(selectedDef.label)}
                        rows={isLong ? 7 : 4}
                        aria-describedby={`${uid}-hint`}
                        className={[
                          'khi-help-textarea w-full resize-y rounded-xl border-2 bg-background px-4 py-3 text-[14px] leading-7 text-foreground outline-none transition-colors placeholder:text-muted-foreground/70',
                          correctionVal.trim() ? 'border-[#2c6b39]' : 'border-border focus:border-primary',
                        ].join(' ')}
                      />
                      <p id={`${uid}-hint`} className={['mt-2 flex items-center gap-1.5 text-[12px] leading-5', correctionVal.trim() ? 'text-[#2c6b39]' : 'text-muted-foreground'].join(' ')}>
                        {correctionVal.trim() ? <Check aria-hidden="true" className="size-3.5 shrink-0" /> : null}
                        <span>{correctionVal.trim() ? KU.savedHint : KU.blankHint}</span>
                        {isLong && correctionVal ? <span className="ms-auto tabular-nums text-muted-foreground">{KU.chars(correctionVal.length)}</span> : null}
                      </p>
                    </section>

                    {filledFields.length > 0 ? (
                      <section aria-label={KU.queued} className="rounded-xl border border-border bg-secondary/40 px-4 py-3">
                        <p className="mb-2.5 text-[11px] font-bold uppercase tracking-wider text-muted-foreground">{KU.queued}</p>
                        <div className="flex flex-wrap gap-2">
                          {filledFields.map((f) => {
                            const isCurrent = f.key === selectedKey
                            return (
                              <button
                                key={f.key}
                                type="button"
                                onClick={() => selectField(f.key)}
                                aria-current={isCurrent ? 'true' : undefined}
                                className={[
                                  'inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-[12px] font-semibold transition',
                                  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)]',
                                  isCurrent ? 'border-[#2c6b39]/45 bg-[#2c6b39]/12 text-[#2c6b39]' : 'border-border bg-background text-foreground hover:bg-muted',
                                ].join(' ')}
                              >
                                <span aria-hidden="true" className="size-1.5 rounded-full" style={{ background: toneByKey[f.key] }} />
                                {f.label}
                              </button>
                            )
                          })}
                        </div>
                      </section>
                    ) : null}

                    {submitError ? (
                      <p role="alert" className="flex items-start gap-2 rounded-xl border border-destructive/25 bg-destructive/8 px-4 py-3 text-[13px] leading-6 text-destructive">
                        <AlertCircle aria-hidden="true" className="mt-0.5 size-4 shrink-0" />
                        {submitError}
                      </p>
                    ) : null}
                  </div>
                ) : null}
              </div>

              {/* ─── FOOTER ─── */}
              <div className="flex shrink-0 flex-wrap items-center gap-2 border-t border-border bg-secondary/40 px-4 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] sm:px-6 md:px-8 md:py-4">
                <p aria-live="polite" className="me-auto text-[12px] font-semibold text-foreground">
                  {canSubmit ? (
                    <span className="inline-flex items-center gap-1.5 text-[#2c6b39]">
                      <Check aria-hidden="true" className="size-3.5" />{KU.ready(filledFields.length)}
                    </span>
                  ) : (
                    <span className="hidden text-muted-foreground md:inline">
                      <kbd className="rounded border border-border bg-background px-1.5 py-0.5 font-mono text-[11px]">Ctrl</kbd>
                      {' + '}
                      <kbd className="rounded border border-border bg-background px-1.5 py-0.5 font-mono text-[11px]">Enter</kbd>
                      {' '}{KU.ctrlEnter}
                    </span>
                  )}
                </p>
                <button
                  type="button"
                  onClick={requestClose}
                  disabled={submitting}
                  className="h-11 rounded-xl border border-border bg-background px-4 text-[14px] font-semibold text-foreground transition hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)] disabled:opacity-50"
                >
                  {KU.cancel}
                </button>
                <button
                  type="submit"
                  disabled={submitting || !canSubmit}
                  className={[
                    'khi-help-submit inline-flex h-11 items-center gap-2 rounded-xl px-5 text-[14px] font-bold transition',
                    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)] focus-visible:ring-offset-2',
                    canSubmit && !submitting ? 'text-primary-foreground active:scale-[.98]' : 'cursor-not-allowed bg-muted text-muted-foreground',
                  ].join(' ')}
                >
                  {submitting
                    ? <><Loader2 aria-hidden="true" className="size-4 animate-spin" />{KU.submitting}</>
                    : <><Send aria-hidden="true" className="size-4" />{KU.submit}{canSubmit && filledFields.length > 1 ? ` (${filledFields.length})` : ''}</>}
                </button>
              </div>
            </div>
          </form>
        )}

        {/* ═══ DISCARD GUARD — unsent corrections used to vanish silently ═══ */}
        {confirmDiscard ? (
          <div className="absolute inset-0 z-10 grid place-items-center bg-black/45 p-6 backdrop-blur-sm">
            <div role="alertdialog" aria-modal="true" aria-labelledby={`${uid}-discard`} className="w-full max-w-sm rounded-2xl border border-border bg-card p-5 shadow-xl">
              <h3 id={`${uid}-discard`} className="font-heading text-[17px] font-bold text-foreground">{KU.discardTitle}</h3>
              <p className="mt-2 text-[13px] leading-6 text-muted-foreground">{KU.discardBody(filledFields.length)}</p>
              <div className="mt-5 flex gap-2">
                <button type="button" onClick={() => setConfirmDiscard(false)} className="h-11 flex-1 rounded-xl border border-border bg-background text-[14px] font-semibold text-foreground transition hover:bg-muted">
                  {KU.discardCancel}
                </button>
                <button type="button" onClick={() => { setConfirmDiscard(false); onOpenChange(false) }} className="h-11 flex-1 rounded-xl bg-destructive text-[14px] font-bold text-white transition hover:opacity-90">
                  {KU.discardConfirm}
                </button>
              </div>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  )
}

export { HelpUsDialog }
