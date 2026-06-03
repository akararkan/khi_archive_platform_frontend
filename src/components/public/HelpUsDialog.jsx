import { useEffect, useRef, useState } from 'react'
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
  Send,
  Tag,
  Users,
  X,
} from 'lucide-react'
import { Link } from 'react-router-dom'

import { useCurrentProfile } from '@/hooks/use-current-profile'
import { getMyCorrections, submitCorrection } from '@/services/corrections'

// ── Field groups ──────────────────────────────────────────────────────────────
const FIELD_GROUPS = {
  AUDIO: [
    { section: 'Content', color: 'bg-blue-500', Icon: FileText, fields: [
      { key: 'title',         label: 'Title'         },
      { key: 'description',   label: 'Description'   },
      { key: 'transcription', label: 'Transcription' },
      { key: 'lyrics',        label: 'Lyrics'        },
    ]},
    { section: 'Music & Form', color: 'bg-violet-500', Icon: Music, fields: [
      { key: 'form',              label: 'Form'                },
      { key: 'typeOfBasta',       label: 'Type of basta'       },
      { key: 'typeOfMaqam',       label: 'Type of maqam'       },
      { key: 'typeOfComposition', label: 'Type of composition' },
      { key: 'typeOfPerformance', label: 'Type of performance' },
      { key: 'poet',              label: 'Poet'                },
      { key: 'genre',             label: 'Genre'               },
    ]},
    { section: 'Credits', color: 'bg-orange-500', Icon: Users, fields: [
      { key: 'composer', label: 'Composer' },
      { key: 'speaker',  label: 'Speaker'  },
      { key: 'producer', label: 'Producer' },
    ]},
    { section: 'Language & Audience', color: 'bg-teal-500', Icon: Globe, fields: [
      { key: 'language', label: 'Language' },
      { key: 'dialect',  label: 'Dialect'  },
      { key: 'audience', label: 'Audience' },
    ]},
    { section: 'Recording Location', color: 'bg-rose-500', Icon: MapPin, fields: [
      { key: 'recordingVenue', label: 'Venue'  },
      { key: 'city',           label: 'City'   },
      { key: 'region',         label: 'Region' },
    ]},
    { section: 'Rights', color: 'bg-amber-500', Icon: Scale, fields: [
      { key: 'copyright',    label: 'Copyright'    },
      { key: 'rightOwner',   label: 'Right owner'  },
      { key: 'availability', label: 'Availability' },
      { key: 'licenseType',  label: 'License'      },
      { key: 'owner',        label: 'Owner'        },
      { key: 'publisher',    label: 'Publisher'    },
    ]},
    { section: 'Tags & Keywords', color: 'bg-green-500', Icon: Tag, fields: [
      { key: 'tags',     label: 'Tags'     },
      { key: 'keywords', label: 'Keywords' },
    ]},
  ],
  VIDEO: [
    { section: 'Content', color: 'bg-blue-500', Icon: FileText, fields: [
      { key: 'title',         label: 'Title'         },
      { key: 'description',   label: 'Description'   },
      { key: 'transcription', label: 'Transcription' },
    ]},
    { section: 'Subject & Form', color: 'bg-violet-500', Icon: Music, fields: [
      { key: 'event',              label: 'Event'        },
      { key: 'location',           label: 'Location'     },
      { key: 'subject',            label: 'Subject'      },
      { key: 'genre',              label: 'Genre'        },
      { key: 'personShownInVideo', label: 'People shown' },
      { key: 'colorOfVideo',       label: 'Color'        },
    ]},
    { section: 'Credits', color: 'bg-orange-500', Icon: Users, fields: [
      { key: 'creatorArtistDirector', label: 'Creator / Director' },
      { key: 'producer',              label: 'Producer'            },
      { key: 'audience',              label: 'Audience'            },
    ]},
    { section: 'Language', color: 'bg-teal-500', Icon: Globe, fields: [
      { key: 'language', label: 'Language'          },
      { key: 'dialect',  label: 'Dialect'           },
      { key: 'subtitle', label: 'Subtitle language' },
    ]},
    { section: 'Rights', color: 'bg-amber-500', Icon: Scale, fields: [
      { key: 'copyright',    label: 'Copyright'    },
      { key: 'rightOwner',   label: 'Right owner'  },
      { key: 'availability', label: 'Availability' },
      { key: 'licenseType',  label: 'License'      },
      { key: 'owner',        label: 'Owner'        },
      { key: 'publisher',    label: 'Publisher'    },
    ]},
    { section: 'Tags & Keywords', color: 'bg-green-500', Icon: Tag, fields: [
      { key: 'tags', label: 'Tags' }, { key: 'keywords', label: 'Keywords' },
    ]},
  ],
  IMAGE: [
    { section: 'Content', color: 'bg-blue-500', Icon: FileText, fields: [
      { key: 'title', label: 'Title' }, { key: 'description', label: 'Description' },
    ]},
    { section: 'Subject & Form', color: 'bg-violet-500', Icon: Music, fields: [
      { key: 'form',                      label: 'Form'                   },
      { key: 'event',                     label: 'Event'                  },
      { key: 'location',                  label: 'Location'               },
      { key: 'subject',                   label: 'Subject'                },
      { key: 'genre',                     label: 'Genre'                  },
      { key: 'personShownInImage',        label: 'People shown'           },
      { key: 'creatorArtistPhotographer', label: 'Creator / Photographer' },
      { key: 'audience',                  label: 'Audience'               },
    ]},
    { section: 'Rights', color: 'bg-amber-500', Icon: Scale, fields: [
      { key: 'copyright',    label: 'Copyright'    },
      { key: 'rightOwner',   label: 'Right owner'  },
      { key: 'availability', label: 'Availability' },
      { key: 'licenseType',  label: 'License'      },
      { key: 'owner',        label: 'Owner'        },
      { key: 'publisher',    label: 'Publisher'    },
    ]},
    { section: 'Tags & Keywords', color: 'bg-green-500', Icon: Tag, fields: [
      { key: 'tags', label: 'Tags' }, { key: 'keywords', label: 'Keywords' },
    ]},
  ],
  TEXT: [
    { section: 'Content', color: 'bg-blue-500', Icon: FileText, fields: [
      { key: 'title',       label: 'Title'       },
      { key: 'description', label: 'Description' },
      { key: 'summary',     label: 'Summary'     },
      { key: 'bodyText',    label: 'Body text'   },
    ]},
    { section: 'Document', color: 'bg-indigo-500', Icon: FileText, fields: [
      { key: 'documentType', label: 'Document type' },
      { key: 'subject',      label: 'Subject'       },
      { key: 'genre',        label: 'Genre'         },
      { key: 'script',       label: 'Script'        },
      { key: 'isbn',         label: 'ISBN'          },
      { key: 'edition',      label: 'Edition'       },
      { key: 'volume',       label: 'Volume'        },
      { key: 'series',       label: 'Series'        },
    ]},
    { section: 'Credits', color: 'bg-orange-500', Icon: Users, fields: [
      { key: 'author',        label: 'Author'         },
      { key: 'printingHouse', label: 'Printing house' },
      { key: 'audience',      label: 'Audience'       },
    ]},
    { section: 'Language', color: 'bg-teal-500', Icon: Globe, fields: [
      { key: 'language', label: 'Language' }, { key: 'dialect', label: 'Dialect' },
    ]},
    { section: 'Rights', color: 'bg-amber-500', Icon: Scale, fields: [
      { key: 'copyright',    label: 'Copyright'    },
      { key: 'rightOwner',   label: 'Right owner'  },
      { key: 'availability', label: 'Availability' },
      { key: 'licenseType',  label: 'License'      },
      { key: 'owner',        label: 'Owner'        },
      { key: 'publisher',    label: 'Publisher'    },
    ]},
    { section: 'Tags & Keywords', color: 'bg-green-500', Icon: Tag, fields: [
      { key: 'tags', label: 'Tags' }, { key: 'keywords', label: 'Keywords' },
    ]},
  ],
}

function displayValue(val) {
  if (val == null || val === '') return null
  if (Array.isArray(val)) { const s = val.filter(Boolean).join(', '); return s || null }
  if (typeof val === 'boolean') return val ? 'Yes' : 'No'
  return String(val)
}

// Returns the section color for a given field key
function getSectionColor(groups, key) {
  for (const g of groups) {
    if (g.fields.some((f) => f.key === key)) return g.color
  }
  return 'bg-primary'
}

// ── Main component ────────────────────────────────────────────────────────────
function HelpUsDialog({ open, onOpenChange, mediaType, mediaCode, mediaTitle, mediaData }) {
  const profile    = useCurrentProfile()
  const isLoggedIn = Boolean(profile)

  const groups    = FIELD_GROUPS[mediaType] ?? []
  const allFields = groups.flatMap((g) => g.fields)

  const [selectedKey,    setSelectedKey]    = useState(allFields[0]?.key ?? '')
  const [corrections,    setCorrections]    = useState({})
  const [submitting,     setSubmitting]     = useState(false)
  const [submitError,    setSubmitError]    = useState('')
  const [submitted,      setSubmitted]      = useState(false)
  const [submittedCount, setSubmittedCount] = useState(0)
  const [pastCorrections, setPastCorrections] = useState([])
  const [pastLoading,     setPastLoading]     = useState(false)
  const textareaRef = useRef(null)

  useEffect(() => {
    if (open) {
      setSelectedKey(allFields[0]?.key ?? '')
      setCorrections({})
      setSubmitting(false)
      setSubmitError('')
      setSubmitted(false)
      setSubmittedCount(0)
      setPastCorrections([])
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open])

  useEffect(() => {
    if (!open || !isLoggedIn || !mediaCode) return
    let cancelled = false
    setPastLoading(true)
    getMyCorrections({ mediaCode, size: 50 })
      .then((data) => {
        if (cancelled) return
        const items = Array.isArray(data?.items)   ? data.items
                    : Array.isArray(data?.content) ? data.content
                    : Array.isArray(data)           ? data
                    : []
        setPastCorrections(items)
      })
      .catch(() => { if (!cancelled) setPastCorrections([]) })
      .finally(() => { if (!cancelled) setPastLoading(false) })
    return () => { cancelled = true }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, isLoggedIn, mediaCode])

  useEffect(() => {
    if (open && isLoggedIn && !submitted) {
      const t = setTimeout(() => textareaRef.current?.focus(), 60)
      return () => clearTimeout(t)
    }
  }, [selectedKey, open, isLoggedIn, submitted])

  useEffect(() => {
    if (!open) return undefined
    const fn = (e) => { if (e.key === 'Escape' && !submitting) onOpenChange(false) }
    window.addEventListener('keydown', fn)
    return () => window.removeEventListener('keydown', fn)
  }, [open, submitting, onOpenChange])

  if (!open) return null

  const filledFields   = allFields.filter((f) => corrections[f.key]?.trim())
  const canSubmit      = filledFields.length > 0
  const selectedDef    = allFields.find((f) => f.key === selectedKey)
  const selectedGroup  = groups.find((g) => g.fields.some((f) => f.key === selectedKey))
  const currentVal     = displayValue(mediaData?.[selectedKey])
  const correctionVal  = corrections[selectedKey] ?? ''
  const isLong         = ['description','transcription','lyrics','summary','bodyText'].includes(selectedKey)
  const sectionColor   = getSectionColor(groups, selectedKey)

  const setFieldValue = (key, val) => setCorrections((p) => ({ ...p, [key]: val }))

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!canSubmit) return
    setSubmitting(true)
    setSubmitError('')
    try {
      const results = await Promise.all(
        filledFields.map((f) =>
          submitCorrection({ mediaType, mediaCode, targetField: f.key, suggestedValue: corrections[f.key].trim() })
        )
      )
      setPastCorrections((prev) => [...(Array.isArray(results) ? results.filter(Boolean) : []), ...prev])
      setSubmittedCount(filledFields.length)
      setSubmitted(true)
    } catch (err) {
      setSubmitError(err?.response?.data?.message || err?.response?.data?.error || 'Something went wrong. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div
      className="fixed inset-0 z-[95] flex items-center justify-center bg-black/60 p-4 backdrop-blur-md"
      onMouseDown={(e) => { if (e.target === e.currentTarget && !submitting) onOpenChange(false) }}
      role="dialog"
      aria-modal="true"
    >
      <div
        className="flex w-full max-w-[900px] flex-col overflow-hidden rounded-2xl bg-card shadow-2xl ring-1 ring-black/10"
        style={{ height: 'min(88vh, 700px)' }}
      >

        {/* ═══ HEADER ════════════════════════════════════════════════════ */}
        <div className="flex shrink-0 items-center justify-between gap-4 border-b border-border px-6 py-4">
          <div className="flex items-center gap-3 min-w-0">
            <div className="grid size-9 shrink-0 place-items-center rounded-xl bg-primary text-primary-foreground">
              <MessageSquarePlus className="size-4.5" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-[14px] font-bold text-foreground">Help Us Improve</span>
                <span className="rounded-md bg-muted px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-widest text-muted-foreground">
                  {mediaType}
                </span>
              </div>
              {mediaTitle ? (
                <p className="truncate text-[11px] text-muted-foreground" style={{ maxWidth: '480px' }}>
                  {mediaTitle}
                </p>
              ) : null}
            </div>
          </div>
          <button
            type="button"
            onClick={() => !submitting && onOpenChange(false)}
            className="grid size-8 shrink-0 place-items-center rounded-lg text-muted-foreground transition hover:bg-muted hover:text-foreground"
            aria-label="Close"
          >
            <X className="size-4" />
          </button>
        </div>

        {/* ═══ BODY ══════════════════════════════════════════════════════ */}
        {!isLoggedIn ? (

          /* ── Sign-in ─────────────────────────────────────────────────── */
          <div className="flex flex-1 items-center justify-center p-8">
            <div className="w-full max-w-sm text-center">
              <div className="mx-auto mb-6 grid size-16 place-items-center rounded-2xl bg-primary/10 text-primary">
                <LogIn className="size-7" />
              </div>
              <h3 className="text-lg font-bold text-foreground">Sign in to contribute</h3>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">
                You need to sign in to suggest corrections. Your help keeps our archive accurate for everyone.
              </p>
              <div className="mt-8 flex flex-col gap-2">
                <Link
                  to="/login"
                  onClick={() => onOpenChange(false)}
                  className="flex w-full items-center justify-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground transition hover:bg-primary/90"
                >
                  <LogIn className="size-4" /> Sign in
                </Link>
                <button
                  type="button"
                  onClick={() => onOpenChange(false)}
                  className="w-full rounded-xl border border-border px-4 py-2.5 text-sm font-medium text-muted-foreground transition hover:bg-muted"
                >
                  Maybe later
                </button>
              </div>
            </div>
          </div>

        ) : submitted ? (

          /* ── Success ─────────────────────────────────────────────────── */
          <div className="flex flex-1 items-center justify-center p-8">
            <div className="w-full max-w-sm text-center">
              <div className="mx-auto mb-6 grid size-16 place-items-center rounded-2xl bg-green-500/10 text-green-600">
                <CheckCircle2 className="size-7" />
              </div>
              <h3 className="text-lg font-bold text-foreground">Thank you!</h3>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">
                {submittedCount === 1 ? '1 correction' : `${submittedCount} corrections`} submitted
                successfully. Our team will review and apply the fixes.
              </p>
              <button
                type="button"
                onClick={() => onOpenChange(false)}
                className="mt-8 flex w-full items-center justify-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground transition hover:bg-primary/90"
              >
                <CheckCircle2 className="size-4" /> Done
              </button>
            </div>
          </div>

        ) : (

          /* ── Two-panel form ───────────────────────────────────────────── */
          <form onSubmit={handleSubmit} className="flex min-h-0 flex-1">

            {/* ─── LEFT RAIL ──────────────────────────────────────────── */}
            <div className="flex w-[240px] shrink-0 flex-col border-r border-border bg-muted/30">
              <div className="flex-1 overflow-y-auto py-2">
                {groups.map(({ section, color, Icon, fields }) => (
                  <div key={section} className="mb-1">
                    {/* section label */}
                    <div className="flex items-center gap-2 px-3 py-2">
                      <span className={`size-1.5 rounded-full ${color}`} />
                      <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/60">
                        {section}
                      </span>
                    </div>

                    {/* fields */}
                    {fields.map((field) => {
                      const isActive = field.key === selectedKey
                      const hasCorr  = Boolean(corrections[field.key]?.trim())
                      const preview  = displayValue(mediaData?.[field.key])

                      return (
                        <button
                          key={field.key}
                          type="button"
                          onClick={() => setSelectedKey(field.key)}
                          className={[
                            'relative w-full px-3 py-2.5 text-left transition-colors',
                            isActive ? 'bg-background' : 'hover:bg-muted/60',
                          ].join(' ')}
                        >
                          {/* active left bar */}
                          {isActive && (
                            <span className={`absolute inset-y-1 left-0 w-[3px] rounded-r-full ${color}`} />
                          )}

                          <div className="flex items-start justify-between gap-1.5">
                            <div className="min-w-0 flex-1">
                              <p className={[
                                'text-[13px] font-semibold leading-snug',
                                isActive ? 'text-foreground' : 'text-foreground/80',
                              ].join(' ')}>
                                {field.label}
                              </p>
                              <p className={[
                                'mt-0.5 truncate text-[11px] leading-tight',
                                preview ? 'text-muted-foreground' : 'italic text-muted-foreground/40',
                              ].join(' ')}>
                                {preview ?? 'No value'}
                              </p>
                            </div>

                            {hasCorr ? (
                              <span className="mt-0.5 shrink-0 rounded-full bg-green-500 px-1.5 py-0.5 text-[8px] font-bold uppercase text-white">
                                ✓
                              </span>
                            ) : null}
                          </div>
                        </button>
                      )
                    })}
                  </div>
                ))}
              </div>

              {/* bottom strip: queued + past submissions */}
              <div className="shrink-0 border-t border-border px-3 py-3 space-y-2">
                {filledFields.length > 0 ? (
                  <div className="flex items-center gap-2 rounded-lg bg-green-500/10 px-3 py-2">
                    <span className="size-2 rounded-full bg-green-500" />
                    <span className="text-[11px] font-semibold text-green-700 dark:text-green-400">
                      {filledFields.length} ready to submit
                    </span>
                  </div>
                ) : null}

                {/* Past submitted corrections for this item */}
                <div>
                  <p className="mb-1.5 px-1 text-[9px] font-bold uppercase tracking-widest text-muted-foreground/50">
                    My submissions
                  </p>
                  {pastLoading ? (
                    <div className="flex items-center gap-2 px-1 py-1">
                      <Loader2 className="size-3 animate-spin text-muted-foreground/40" />
                      <span className="text-[10px] text-muted-foreground/40">Loading…</span>
                    </div>
                  ) : pastCorrections.length === 0 ? (
                    <p className="px-1 text-[10px] italic text-muted-foreground/35">No submissions yet</p>
                  ) : (
                    <div className="max-h-[120px] overflow-y-auto space-y-1 pr-0.5">
                      {pastCorrections.map((c) => {
                        const STATUS_DOT = {
                          PENDING:   'bg-amber-500',
                          FORWARDED: 'bg-blue-500',
                          RESOLVED:  'bg-green-500',
                          REJECTED:  'bg-rose-500',
                        }
                        const dot = STATUS_DOT[String(c.status ?? '').toUpperCase()] ?? 'bg-muted-foreground'
                        return (
                          <div
                            key={c.id}
                            className="flex items-start gap-1.5 rounded-md px-2 py-1.5 hover:bg-muted/40"
                          >
                            <span className={`mt-1 size-1.5 shrink-0 rounded-full ${dot}`} />
                            <div className="min-w-0 flex-1">
                              <p className="truncate text-[10px] font-semibold text-foreground/80">
                                {c.targetField}
                              </p>
                              <p className="truncate text-[10px] text-muted-foreground/60"
                                style={{ overflowWrap: 'anywhere' }}>
                                {c.suggestedValue}
                              </p>
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* ─── RIGHT PANEL ────────────────────────────────────────── */}
            <div className="flex min-w-0 flex-1 flex-col overflow-y-auto">
              {selectedDef ? (
                <div className="flex flex-1 flex-col px-8 py-6 gap-5">

                  {/* field breadcrumb + title */}
                  <div>
                    <div className="flex items-center gap-1.5 mb-1">
                      {selectedGroup ? (
                        <>
                          <span className={`size-2 rounded-full ${selectedGroup.color}`} />
                          <span className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/70">
                            {selectedGroup.section}
                          </span>
                        </>
                      ) : null}
                    </div>
                    <h3 className="text-xl font-bold text-foreground">{selectedDef.label}</h3>
                  </div>

                  {/* Current value */}
                  <div>
                    <p className="mb-2 text-[10px] font-bold uppercase tracking-widest text-muted-foreground/70">
                      Current value in the archive
                    </p>
                    {currentVal ? (
                      <div className={`rounded-xl border-l-4 ${sectionColor} border-l-[3px] bg-muted/40 px-4 py-3 text-sm leading-6 text-foreground break-words`}
                        style={{ overflowWrap: 'anywhere' }}>
                        {currentVal}
                      </div>
                    ) : (
                      <div className="flex items-center gap-2 rounded-xl border border-dashed border-border px-4 py-3">
                        <span className="text-xs italic text-muted-foreground/50">
                          No value is currently set for this field
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Your correction */}
                  <div className="flex flex-1 flex-col">
                    <div className="flex items-center justify-between mb-2">
                      <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/70">
                        Your correction
                      </p>
                      {correctionVal.trim() ? (
                        <button
                          type="button"
                          onClick={() => setFieldValue(selectedKey, '')}
                          className="text-[11px] text-muted-foreground/50 transition hover:text-destructive"
                        >
                          Clear
                        </button>
                      ) : null}
                    </div>

                    <textarea
                      ref={textareaRef}
                      key={selectedKey}
                      value={correctionVal}
                      onChange={(e) => setFieldValue(selectedKey, e.target.value)}
                      placeholder={`Enter the correct ${selectedDef.label.toLowerCase()} here…`}
                      rows={isLong ? 6 : 4}
                      className={[
                        'w-full flex-1 resize-none rounded-xl border-2 bg-background px-4 py-3 text-sm leading-6 text-foreground placeholder:text-muted-foreground/40 outline-none transition-colors',
                        correctionVal.trim()
                          ? 'border-green-400 focus:border-green-500'
                          : 'border-border focus:border-primary',
                      ].join(' ')}
                    />

                    <p className={[
                      'mt-2 text-[11px] leading-4',
                      correctionVal.trim() ? 'text-green-600 dark:text-green-400' : 'text-muted-foreground/50',
                    ].join(' ')}>
                      {correctionVal.trim()
                        ? 'Correction saved — you can edit other fields before submitting.'
                        : 'Leave blank if the current value is already accurate.'}
                    </p>
                  </div>

                  {/* Queued corrections */}
                  {filledFields.length > 0 ? (
                    <div className="rounded-xl border border-border bg-muted/20 px-4 py-3">
                      <p className="mb-2.5 text-[10px] font-bold uppercase tracking-widest text-muted-foreground/60">
                        Queued corrections
                      </p>
                      <div className="flex flex-wrap gap-1.5">
                        {filledFields.map((f) => {
                          const fColor = getSectionColor(groups, f.key)
                          return (
                            <button
                              key={f.key}
                              type="button"
                              onClick={() => setSelectedKey(f.key)}
                              className={[
                                'inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-semibold transition hover:opacity-80',
                                f.key === selectedKey
                                  ? 'border-green-400/40 bg-green-500/15 text-green-700 dark:text-green-400'
                                  : 'border-border bg-background text-foreground/80',
                              ].join(' ')}
                            >
                              <span className={`size-1.5 rounded-full ${fColor}`} />
                              {f.label}
                            </button>
                          )
                        })}
                      </div>
                    </div>
                  ) : null}

                  {/* error */}
                  {submitError ? (
                    <p className="rounded-xl border border-destructive/20 bg-destructive/5 px-4 py-3 text-xs text-destructive">
                      {submitError}
                    </p>
                  ) : null}
                </div>
              ) : null}

              {/* ── FOOTER ────────────────────────────────────────────── */}
              <div className="shrink-0 flex items-center justify-between gap-3 border-t border-border bg-muted/10 px-8 py-4">
                <div className="flex items-center gap-2 min-w-0">
                  <div className="grid size-7 shrink-0 place-items-center rounded-full bg-primary/15 text-[11px] font-bold text-primary">
                    {(profile?.username || profile?.name || '?')[0].toUpperCase()}
                  </div>
                  <p className="truncate text-[12px] text-muted-foreground">
                    <span className="font-semibold text-foreground">
                      {profile?.username || profile?.name}
                    </span>
                    <span className="hidden sm:inline"> · corrections go to admin review</span>
                  </p>
                </div>

                <div className="flex shrink-0 items-center gap-2">
                  <button
                    type="button"
                    onClick={() => onOpenChange(false)}
                    disabled={submitting}
                    className="rounded-lg border border-border bg-background px-4 py-2 text-[13px] font-medium text-foreground transition hover:bg-muted disabled:opacity-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={submitting || !canSubmit}
                    className={[
                      'flex items-center gap-2 rounded-lg px-4 py-2 text-[13px] font-semibold transition',
                      canSubmit && !submitting
                        ? 'bg-primary text-primary-foreground hover:bg-primary/90 active:scale-95'
                        : 'bg-muted text-muted-foreground cursor-not-allowed',
                    ].join(' ')}
                  >
                    {submitting
                      ? <><Loader2 className="size-3.5 animate-spin" /> Submitting…</>
                      : <><Send className="size-3.5" />
                          {canSubmit
                            ? `Submit${filledFields.length > 1 ? ` ${filledFields.length}` : ''}`
                            : 'Submit'}
                        </>
                    }
                  </button>
                </div>
              </div>
            </div>
          </form>
        )}
      </div>
    </div>
  )
}

export { HelpUsDialog }
