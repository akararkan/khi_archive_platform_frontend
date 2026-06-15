import { useEffect, useMemo, useRef, useState } from 'react'
import {
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
  signInTitle: 'بۆ بەشداری بچۆرە ژوورەوە',
  signInBody: 'پێویستە بچیتە ژوورەوە بۆ پێشنیارکردنی ڕاستکردنەوە. یارمەتیت گەنجینەکە بۆ هەمووان ورد ڕادەگرێت.',
  signIn: 'چوونەژوورەوە',
  later: 'دواتر',
  thanks: 'سوپاس بۆ یارمەتیت!',
  thanksBody: (n) => `${n} ڕاستکردنەوە بە سەرکەوتوویی نێردرا. تیمەکەمان پێداچوونەوەی بۆ دەکات و جێبەجێی دەکات.`,
  done: 'تەواو',
  searchFields: 'گەڕان بەناو خانەکان…',
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
  ready: (n) => `${n} ئامادەی ناردنە`,
  cancel: 'هەڵوەشاندنەوە',
  submit: 'ناردن',
  submitting: 'ناردن…',
  noMatch: 'هیچ خانەیەک نەدۆزرایەوە',
  ctrlEnter: 'Ctrl+Enter بۆ ناردن',
  genericError: 'هەڵەیەک ڕوویدا. تکایە دووبارە هەوڵبدەرەوە.',
}

// ── Field groups (Sorani labels) ────────────────────────────────────────────────
const FIELD_GROUPS = {
  AUDIO: [
    { section: 'ناوەڕۆک', color: 'bg-blue-500', Icon: FileText, fields: [
      { key: 'title',         label: 'ناونیشان'      },
      { key: 'description',   label: 'پێناسە'         },
      { key: 'transcription', label: 'نووسینەوە'      },
      { key: 'lyrics',        label: 'دەقی گۆرانی'    },
    ]},
    { section: 'مۆسیقا و فۆڕم', color: 'bg-violet-500', Icon: Music, fields: [
      { key: 'form',              label: 'فۆڕم'             },
      { key: 'typeOfBasta',       label: 'جۆری بەستە'       },
      { key: 'typeOfMaqam',       label: 'جۆری مقام'        },
      { key: 'typeOfComposition', label: 'جۆری داڕشتن'      },
      { key: 'typeOfPerformance', label: 'جۆری پێشکەشکردن'  },
      { key: 'poet',              label: 'شاعیر'            },
      { key: 'genre',             label: 'ژانر'             },
    ]},
    { section: 'ئەرک و بەشداران', color: 'bg-orange-500', Icon: Users, fields: [
      { key: 'composer', label: 'مۆسیقاژەن' },
      { key: 'speaker',  label: 'قسەکەر'    },
      { key: 'producer', label: 'بەرهەمهێنەر' },
    ]},
    { section: 'زمان و بینەر', color: 'bg-teal-500', Icon: Globe, fields: [
      { key: 'language', label: 'زمان'          },
      { key: 'dialect',  label: 'زاراوە'        },
      { key: 'audience', label: 'گرووپی ئامانج' },
    ]},
    { section: 'شوێنی تۆمارکردن', color: 'bg-rose-500', Icon: MapPin, fields: [
      { key: 'recordingVenue', label: 'شوێنی تۆمار' },
      { key: 'city',           label: 'شار'         },
      { key: 'region',         label: 'ناوچە'       },
    ]},
    { section: 'مافەکان', color: 'bg-amber-500', Icon: Scale, fields: [
      { key: 'copyright',    label: 'مافی چاپ'   },
      { key: 'rightOwner',   label: 'خاوەنی ماف' },
      { key: 'availability', label: 'بەردەستی'   },
      { key: 'licenseType',  label: 'مۆڵەت'      },
      { key: 'owner',        label: 'خاوەن'      },
      { key: 'publisher',    label: 'بڵاوکەرەوە' },
    ]},
    { section: 'تاگ و کلیلەوشە', color: 'bg-green-500', Icon: Tag, fields: [
      { key: 'tags',     label: 'تاگەکان'     },
      { key: 'keywords', label: 'کلیلەوشەکان' },
    ]},
  ],
  VIDEO: [
    { section: 'ناوەڕۆک', color: 'bg-blue-500', Icon: FileText, fields: [
      { key: 'title',         label: 'ناونیشان'  },
      { key: 'description',   label: 'پێناسە'     },
      { key: 'transcription', label: 'نووسینەوە'  },
    ]},
    { section: 'بابەت و فۆڕم', color: 'bg-violet-500', Icon: Music, fields: [
      { key: 'event',              label: 'بۆنە'             },
      { key: 'location',           label: 'شوێن'             },
      { key: 'subject',            label: 'بابەت'            },
      { key: 'genre',              label: 'ژانر'             },
      { key: 'personShownInVideo', label: 'کەسانی دەرکەوتوو' },
      { key: 'colorOfVideo',       label: 'ڕەنگ'             },
    ]},
    { section: 'ئەرک و بەشداران', color: 'bg-orange-500', Icon: Users, fields: [
      { key: 'creatorArtistDirector', label: 'دروستکەر / دەرهێنەر' },
      { key: 'producer',              label: 'بەرهەمهێنەر'         },
      { key: 'audience',              label: 'گرووپی ئامانج'       },
    ]},
    { section: 'زمان', color: 'bg-teal-500', Icon: Globe, fields: [
      { key: 'language', label: 'زمان'          },
      { key: 'dialect',  label: 'زاراوە'        },
      { key: 'subtitle', label: 'زمانی ژێرنووس' },
    ]},
    { section: 'مافەکان', color: 'bg-amber-500', Icon: Scale, fields: [
      { key: 'copyright',    label: 'مافی چاپ'   },
      { key: 'rightOwner',   label: 'خاوەنی ماف' },
      { key: 'availability', label: 'بەردەستی'   },
      { key: 'licenseType',  label: 'مۆڵەت'      },
      { key: 'owner',        label: 'خاوەن'      },
      { key: 'publisher',    label: 'بڵاوکەرەوە' },
    ]},
    { section: 'تاگ و کلیلەوشە', color: 'bg-green-500', Icon: Tag, fields: [
      { key: 'tags', label: 'تاگەکان' }, { key: 'keywords', label: 'کلیلەوشەکان' },
    ]},
  ],
  IMAGE: [
    { section: 'ناوەڕۆک', color: 'bg-blue-500', Icon: FileText, fields: [
      { key: 'title', label: 'ناونیشان' }, { key: 'description', label: 'پێناسە' },
    ]},
    { section: 'بابەت و فۆڕم', color: 'bg-violet-500', Icon: Music, fields: [
      { key: 'form',                      label: 'فۆڕم'                },
      { key: 'event',                     label: 'بۆنە'                },
      { key: 'location',                  label: 'شوێن'                },
      { key: 'subject',                   label: 'بابەت'               },
      { key: 'genre',                     label: 'ژانر'                },
      { key: 'personShownInImage',        label: 'کەسانی دەرکەوتوو'    },
      { key: 'creatorArtistPhotographer', label: 'دروستکەر / وێنەگر'   },
      { key: 'audience',                  label: 'گرووپی ئامانج'       },
    ]},
    { section: 'مافەکان', color: 'bg-amber-500', Icon: Scale, fields: [
      { key: 'copyright',    label: 'مافی چاپ'   },
      { key: 'rightOwner',   label: 'خاوەنی ماف' },
      { key: 'availability', label: 'بەردەستی'   },
      { key: 'licenseType',  label: 'مۆڵەت'      },
      { key: 'owner',        label: 'خاوەن'      },
      { key: 'publisher',    label: 'بڵاوکەرەوە' },
    ]},
    { section: 'تاگ و کلیلەوشە', color: 'bg-green-500', Icon: Tag, fields: [
      { key: 'tags', label: 'تاگەکان' }, { key: 'keywords', label: 'کلیلەوشەکان' },
    ]},
  ],
  TEXT: [
    { section: 'ناوەڕۆک', color: 'bg-blue-500', Icon: FileText, fields: [
      { key: 'title',       label: 'ناونیشان'    },
      { key: 'description', label: 'پێناسە'       },
      { key: 'summary',     label: 'کورتە'        },
      { key: 'bodyText',    label: 'دەقی سەرەکی'  },
    ]},
    { section: 'دۆکیومێنت', color: 'bg-indigo-500', Icon: FileText, fields: [
      { key: 'documentType', label: 'جۆری دۆکیومێنت' },
      { key: 'subject',      label: 'بابەت'          },
      { key: 'genre',        label: 'ژانر'           },
      { key: 'script',       label: 'ڕێنووس'         },
      { key: 'isbn',         label: 'ISBN'           },
      { key: 'edition',      label: 'چاپ'            },
      { key: 'volume',       label: 'بەرگ'           },
      { key: 'series',       label: 'زنجیرە'         },
    ]},
    { section: 'ئەرک و بەشداران', color: 'bg-orange-500', Icon: Users, fields: [
      { key: 'author',        label: 'نووسەر'   },
      { key: 'printingHouse', label: 'چاپخانە'  },
      { key: 'audience',      label: 'گرووپی ئامانج' },
    ]},
    { section: 'زمان', color: 'bg-teal-500', Icon: Globe, fields: [
      { key: 'language', label: 'زمان' }, { key: 'dialect', label: 'زاراوە' },
    ]},
    { section: 'مافەکان', color: 'bg-amber-500', Icon: Scale, fields: [
      { key: 'copyright',    label: 'مافی چاپ'   },
      { key: 'rightOwner',   label: 'خاوەنی ماف' },
      { key: 'availability', label: 'بەردەستی'   },
      { key: 'licenseType',  label: 'مۆڵەت'      },
      { key: 'owner',        label: 'خاوەن'      },
      { key: 'publisher',    label: 'بڵاوکەرەوە' },
    ]},
    { section: 'تاگ و کلیلەوشە', color: 'bg-green-500', Icon: Tag, fields: [
      { key: 'tags', label: 'تاگەکان' }, { key: 'keywords', label: 'کلیلەوشەکان' },
    ]},
  ],
}

const LONG_FIELDS = ['description', 'transcription', 'lyrics', 'summary', 'bodyText']

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

function getSectionColor(groups, key) {
  for (const g of groups) {
    if (g.fields.some((f) => f.key === key)) return g.color
  }
  return 'bg-primary'
}

// ── Main component (export name + props unchanged for callers) ───────────────────
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
  const textareaRef = useRef(null)

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
    if (open && isLoggedIn && !submitted) {
      const t = setTimeout(() => textareaRef.current?.focus(), 60)
      return () => clearTimeout(t)
    }
    return undefined
  }, [selectedKey, open, isLoggedIn, submitted])

  useEffect(() => {
    if (!open) return undefined
    const fn = (e) => { if (e.key === 'Escape' && !submitting) onOpenChange(false) }
    window.addEventListener('keydown', fn)
    return () => window.removeEventListener('keydown', fn)
  }, [open, submitting, onOpenChange])

  if (!open) return null

  const filledFields = allFields.filter((f) => corrections[f.key]?.trim())
  const canSubmit = filledFields.length > 0
  const selectedDef = allFields.find((f) => f.key === selectedKey)
  const selectedGroup = groups.find((g) => g.fields.some((f) => f.key === selectedKey))
  const currentVal = displayFieldValue(mediaData, mediaTitle, selectedKey)
  const correctionVal = corrections[selectedKey] ?? ''
  const isLong = LONG_FIELDS.includes(selectedKey)

  const nq = fieldQuery.trim().toLowerCase()
  const visibleGroups = nq
    ? groups.map((g) => ({ ...g, fields: g.fields.filter((f) => f.label.toLowerCase().includes(nq)) })).filter((g) => g.fields.length)
    : groups

  const setFieldValue = (key, val) => setCorrections((p) => ({ ...p, [key]: val }))

  const doSubmit = async () => {
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
  }

  const handleSubmit = (e) => { e.preventDefault(); doSubmit() }

  return (
    <div
      className="khi-surface khi-help-dialog fixed inset-0 z-[95] flex items-center justify-center bg-black/65 p-3 backdrop-blur-md sm:p-4"
      dir="rtl"
      lang="ckb"
      onMouseDown={(e) => { if (e.target === e.currentTarget && !submitting) onOpenChange(false) }}
      role="dialog"
      aria-modal="true"
    >
      <div
        className="khi-help-shell flex w-full max-w-[980px] flex-col overflow-hidden rounded-2xl border border-border bg-card text-card-foreground shadow-2xl ring-1 ring-black/10"
        style={{ height: 'min(92vh, 760px)' }}
      >
        {/* ═══ HEADER ═══ */}
        <div className="khi-help-head flex shrink-0 items-center justify-between gap-4 border-b border-border px-4 py-4 sm:px-6">
          <div className="flex min-w-0 items-center gap-3">
            <div className="khi-help-mark grid size-11 shrink-0 place-items-center rounded-xl text-primary-foreground shadow-sm">
              <MessageSquarePlus className="size-5" />
            </div>
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-heading text-[18px] font-bold text-foreground">{KU.title}</span>
                <span className="rounded-md border border-border bg-secondary px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-widest text-secondary-foreground">{mediaType}</span>
              </div>
              {mediaTitle ? <p className="mt-0.5 truncate text-[12px] font-medium text-muted-foreground" style={{ maxWidth: 560 }}>{mediaTitle}</p> : null}
            </div>
          </div>
          <button
            type="button"
            onClick={() => !submitting && onOpenChange(false)}
            className="grid size-8 shrink-0 place-items-center rounded-lg text-muted-foreground transition hover:bg-muted hover:text-foreground"
            aria-label="داخستن"
          >
            <X className="size-4" />
          </button>
        </div>

        {/* ═══ BODY ═══ */}
        {!isLoggedIn ? (
          <div className="flex flex-1 items-center justify-center p-8">
            <div className="w-full max-w-sm text-center">
              <div className="mx-auto mb-6 grid size-16 place-items-center rounded-2xl bg-primary/10 text-primary"><LogIn className="size-7" /></div>
              <h3 className="font-heading text-xl font-bold text-foreground">{KU.signInTitle}</h3>
              <p className="mt-2 text-sm leading-7 text-muted-foreground">{KU.signInBody}</p>
              <div className="mt-8 flex flex-col gap-2">
                <Link to="/login" onClick={() => onOpenChange(false)} className="flex w-full items-center justify-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground transition hover:opacity-90">
                  <LogIn className="size-4" /> {KU.signIn}
                </Link>
                <button type="button" onClick={() => onOpenChange(false)} className="w-full rounded-xl border border-border px-4 py-2.5 text-sm font-medium text-muted-foreground transition hover:bg-muted">{KU.later}</button>
              </div>
            </div>
          </div>
        ) : submitted ? (
          <div className="flex flex-1 items-center justify-center p-8">
            <div className="w-full max-w-sm text-center">
              <div className="mx-auto mb-6 grid size-16 place-items-center rounded-2xl bg-green-500/10 text-green-600"><CheckCircle2 className="size-7" /></div>
              <h3 className="font-heading text-xl font-bold text-foreground">{KU.thanks}</h3>
              <p className="mt-2 text-sm leading-7 text-muted-foreground">{KU.thanksBody(submittedCount)}</p>
              <button type="button" onClick={() => onOpenChange(false)} className="mt-8 flex w-full items-center justify-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground transition hover:opacity-90">
                <CheckCircle2 className="size-4" /> {KU.done}
              </button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="flex min-h-0 flex-1 flex-col md:flex-row">
            {/* ─── RAIL (start side / right in RTL) ─── */}
            <div className="flex max-h-[42vh] w-full shrink-0 flex-col border-b border-border bg-secondary/45 md:max-h-none md:w-[272px] md:border-b-0 md:border-e">
              <div className="shrink-0 border-b border-border p-2.5">
                <div className="relative">
                  <Search className="pointer-events-none absolute inset-y-0 end-2.5 my-auto size-3.5 text-muted-foreground" />
                  <input
                    value={fieldQuery}
                    onChange={(e) => setFieldQuery(e.target.value)}
                    placeholder={KU.searchFields}
                    className="w-full rounded-lg border border-border bg-background py-2 pe-8 ps-3 text-[13px] text-foreground outline-none transition focus:border-primary"
                  />
                </div>
              </div>

              <div className="flex-1 overflow-y-auto py-2">
                {visibleGroups.length === 0 ? (
                  <p className="px-3 py-4 text-center text-[12px] italic text-muted-foreground/50">{KU.noMatch}</p>
                ) : visibleGroups.map(({ section, color, fields }) => (
                  <div key={section} className="mb-1">
                    <div className="flex items-center gap-2 px-3 py-2">
                      <span className={`size-1.5 rounded-full ${color}`} />
                      <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/60">{section}</span>
                    </div>
                    {fields.map((field) => {
                      const isActive = field.key === selectedKey
                      const hasCorr = Boolean(corrections[field.key]?.trim())
                      const preview = displayFieldValue(mediaData, mediaTitle, field.key)
                      return (
                        <button
                          key={field.key}
                          type="button"
                          onClick={() => setSelectedKey(field.key)}
                          className={['relative w-full px-3 py-2.5 text-start transition-colors', isActive ? 'bg-card shadow-sm ring-1 ring-border/70' : 'hover:bg-card/70'].join(' ')}
                        >
                          {isActive && <span className={`absolute inset-y-1 start-0 w-[3px] rounded-e-full ${color}`} />}
                          <div className="flex items-start justify-between gap-1.5">
                            <div className="min-w-0 flex-1">
                              <p className={['text-[13px] font-semibold leading-snug', isActive ? 'text-foreground' : 'text-foreground/80'].join(' ')}>{field.label}</p>
                              <p className={['mt-0.5 truncate text-[11px] leading-tight', preview ? 'text-muted-foreground' : 'italic text-muted-foreground/40'].join(' ')}>{preview ?? KU.noValue}</p>
                            </div>
                            {hasCorr ? <span className="mt-0.5 shrink-0 rounded-full bg-green-500 px-1.5 py-0.5 text-[8px] font-bold text-white">✓</span> : null}
                          </div>
                        </button>
                      )
                    })}
                  </div>
                ))}
              </div>

              <div className="shrink-0 space-y-2 border-t border-border px-3 py-3">
                {filledFields.length > 0 ? (
                  <div className="flex items-center gap-2 rounded-lg bg-green-500/10 px-3 py-2">
                    <span className="size-2 rounded-full bg-green-500" />
                    <span className="text-[11px] font-semibold text-green-700">{KU.ready(filledFields.length)}</span>
                  </div>
                ) : null}
                <div className="hidden md:block">
                  <p className="mb-1.5 px-1 text-[9px] font-bold uppercase tracking-widest text-muted-foreground/50">{KU.mySubs}</p>
                  {pastLoading ? (
                    <div className="flex items-center gap-2 px-1 py-1"><Loader2 className="size-3 animate-spin text-muted-foreground/40" /><span className="text-[10px] text-muted-foreground/40">{KU.loading}</span></div>
                  ) : pastCorrections.length === 0 ? (
                    <p className="px-1 text-[10px] italic text-muted-foreground/35">{KU.noSubs}</p>
                  ) : (
                    <div className="max-h-[120px] space-y-1 overflow-y-auto pe-0.5">
                      {pastCorrections.map((c) => {
                        const STATUS_DOT = { PENDING: 'bg-amber-500', FORWARDED: 'bg-blue-500', RESOLVED: 'bg-green-500', REJECTED: 'bg-rose-500' }
                        const dot = STATUS_DOT[String(c.status ?? '').toUpperCase()] ?? 'bg-muted-foreground'
                        return (
                          <div key={c.id} className="flex items-start gap-1.5 rounded-md px-2 py-1.5 hover:bg-muted/40">
                            <span className={`mt-1 size-1.5 shrink-0 rounded-full ${dot}`} />
                            <div className="min-w-0 flex-1">
                              <p className="truncate text-[10px] font-semibold text-foreground/80">{c.targetField}</p>
                              <p className="truncate text-[10px] text-muted-foreground/60" style={{ overflowWrap: 'anywhere' }}>{c.suggestedValue}</p>
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* ─── PANEL ─── */}
            <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-y-auto">
              {selectedDef ? (
                <div className="flex flex-1 flex-col gap-5 px-4 py-5 sm:px-6 md:px-8 md:py-6">
                  <div>
                    <div className="mb-1 flex items-center gap-1.5">
                      {selectedGroup ? (<><span className={`size-2 rounded-full ${selectedGroup.color}`} /><span className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/70">{selectedGroup.section}</span></>) : null}
                    </div>
                    <h3 className="font-heading text-xl font-bold text-foreground">{selectedDef.label}</h3>
                  </div>

                  <div>
                    <p className="mb-2 text-[10px] font-bold uppercase tracking-widest text-muted-foreground/70">{KU.currentValue}</p>
                    {currentVal ? (
                      <div className="rounded-lg border border-border border-s-[3px] border-s-primary bg-secondary/50 px-4 py-3 text-sm leading-7 text-foreground" style={{ overflowWrap: 'anywhere' }}>{currentVal}</div>
                    ) : (
                      <div className="flex items-center gap-2 rounded-lg border border-dashed border-border bg-secondary/35 px-4 py-3"><span className="text-xs italic text-muted-foreground/50">{KU.noValue}</span></div>
                    )}
                  </div>

                  <div className="flex flex-1 flex-col">
                    <div className="mb-2 flex items-center justify-between">
                      <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/70">{KU.yourCorrection}</p>
                      {correctionVal.trim() ? <button type="button" onClick={() => setFieldValue(selectedKey, '')} className="text-[11px] text-muted-foreground/50 transition hover:text-destructive">{KU.clear}</button> : null}
                    </div>
                    <textarea
                      ref={textareaRef}
                      key={selectedKey}
                      value={correctionVal}
                      onChange={(e) => setFieldValue(selectedKey, e.target.value)}
                      onKeyDown={(e) => { if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) { e.preventDefault(); doSubmit() } }}
                      placeholder={KU.enterCorrect(selectedDef.label)}
                      rows={isLong ? 6 : 4}
                      className={['w-full flex-1 resize-none rounded-lg border-2 bg-background px-4 py-3 text-sm leading-7 text-foreground shadow-inner outline-none transition-colors placeholder:text-muted-foreground/40', correctionVal.trim() ? 'border-green-400 focus:border-green-500' : 'border-border focus:border-primary'].join(' ')}
                    />
                    <p className={['mt-2 text-[11px] leading-5', correctionVal.trim() ? 'text-green-600' : 'text-muted-foreground/50'].join(' ')}>{correctionVal.trim() ? KU.savedHint : KU.blankHint}</p>
                  </div>

                  {filledFields.length > 0 ? (
                    <div className="rounded-lg border border-border bg-secondary/35 px-4 py-3">
                      <p className="mb-2.5 text-[10px] font-bold uppercase tracking-widest text-muted-foreground/60">{KU.queued}</p>
                      <div className="flex flex-wrap gap-1.5">
                        {filledFields.map((f) => {
                          const fColor = getSectionColor(groups, f.key)
                          return (
                            <button key={f.key} type="button" onClick={() => setSelectedKey(f.key)} className={['inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-semibold transition hover:opacity-80', f.key === selectedKey ? 'border-green-400/40 bg-green-500/15 text-green-700' : 'border-border bg-background text-foreground/80'].join(' ')}>
                              <span className={`size-1.5 rounded-full ${fColor}`} />{f.label}
                            </button>
                          )
                        })}
                      </div>
                    </div>
                  ) : null}

                  {submitError ? <p className="rounded-xl border border-destructive/20 bg-destructive/5 px-4 py-3 text-xs text-destructive">{submitError}</p> : null}
                </div>
              ) : null}

              <div className="flex shrink-0 flex-wrap items-center justify-end gap-2 border-t border-border bg-secondary/35 px-4 py-4 sm:px-6 md:px-8">
                <span className="hidden text-[10px] text-muted-foreground/50 md:inline">{KU.ctrlEnter}</span>
                <button type="button" onClick={() => onOpenChange(false)} disabled={submitting} className="rounded-lg border border-border bg-background px-4 py-2 text-[13px] font-medium text-foreground transition hover:bg-muted disabled:opacity-50">{KU.cancel}</button>
                <button type="submit" disabled={submitting || !canSubmit} className={['khi-help-submit flex items-center gap-2 rounded-xl px-5 py-2 text-[13px] font-bold transition', canSubmit && !submitting ? 'text-primary-foreground active:scale-95' : 'cursor-not-allowed bg-muted text-muted-foreground'].join(' ')}>
                  {submitting ? <><Loader2 className="size-3.5 animate-spin" /> {KU.submitting}</> : <><Send className="size-3.5" /> {KU.submit}{canSubmit && filledFields.length > 1 ? ` ${filledFields.length}` : ''}</>}
                </button>
              </div>
            </div>
          </form>
        )}
      </div>
    </div>
  )
}

export { HelpUsDialog }
