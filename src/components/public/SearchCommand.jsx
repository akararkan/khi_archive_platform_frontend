import { useEffect, useMemo, useRef, useState } from 'react'
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom'
import {
  AudioLines,
  CornerDownLeft,
  FileText,
  FolderOpen,
  Image as ImageIcon,
  Loader2,
  Search,
  Tag,
  Tags,
  TrendingUp,
  User as UserIcon,
  Video as VideoIcon,
  X,
} from 'lucide-react'

import { Highlight, HighlightProvider } from '@/components/ui/highlight'
import { cn } from '@/lib/utils'
import { guestSuggest } from '@/services/guest'

// ── SearchCommand ───────────────────────────────────────────────────────
//
// The single global search bar. Lives in the public header (PublicLayout)
// and is the *only* search entry point on the site — there's no per-page
// scope picker any more, no in-page search hero, no separate "open search"
// trigger. Always navigates to /public/browse?type=all&q=<q>, which is the
// unified ranked feed across audio/video/text/image. The destination page's
// sidebar still narrows by category/person/date/etc; this bar's only job
// is "I want to search the archive for X".
//
// Three pieces:
//
//   1. Bar           Search glyph + input + clear/loader/⌘K + Search CTA.
//                    Subtle floating shadow that intensifies on focus.
//   2. Suggestions   Floats below the bar. While typing, live results from
//                    /api/guest/suggest grouped by kind. While focused-but-
//                    empty, a "Trending" chip set so the user has a one-tap
//                    starting point. Keyboard-navigable.
//   3. Sync          Reads `?q=` off the URL whenever the route changes so
//                    the bar reflects the page the user is currently on
//                    (typing "hasan" → submit → land on /public/browse?…
//                    →q=hasan stays in the bar).

const SUGGEST_DEBOUNCE_MS = 180
const SUGGEST_MIN_CHARS = 2
const SUGGEST_LIMIT = 8

// Per-kind icon + label + how to act on a click (navigate vs. submit).
// `entity` kinds resolve to a public detail route via the suggestion's
// `code`; `tag` (the only `query` kind) just becomes the search term.
// Keyword suggestions are intentionally not exposed on the public
// surface — they're a backend cataloguing concept, not something
// readers should see or browse by.
const SUGGEST_KINDS = {
  project: { icon: FolderOpen, label: 'Project', mode: 'entity', path: 'projects' },
  category: { icon: Tags, label: 'Category', mode: 'entity', path: 'categories' },
  person: { icon: UserIcon, label: 'Person', mode: 'entity', path: 'persons' },
  audio: { icon: AudioLines, label: 'Audio', mode: 'entity', path: 'audios' },
  video: { icon: VideoIcon, label: 'Video', mode: 'entity', path: 'videos' },
  text: { icon: FileText, label: 'Text', mode: 'entity', path: 'texts' },
  image: { icon: ImageIcon, label: 'Image', mode: 'entity', path: 'images' },
  tag: { icon: Tag, label: 'Tag', mode: 'query' },
}

// Display order for grouped suggestion buckets. Entity kinds come first
// because they jump straight to a record; tags trail because they just
// narrow the next search.
const SUGGEST_ORDER = [
  'person', 'project', 'audio', 'video', 'text', 'image', 'category', 'tag',
]

// One-tap starter chips shown in the dropdown when the input is focused
// but empty. Hand-picked queries that anchor the archive's most browsed
// terms — a cheap "I don't know what to search" fallback that keeps the
// bar useful before the user has typed anything.
const TRENDING = [
  { label: 'Hesen Zirek' },
  { label: 'maqam' },
  { label: 'Sulaymaniyah' },
  { label: 'Hawraman' },
  { label: 'Kalhori dialect' },
  { label: 'manuscript' },
]

function groupSuggestions(list) {
  const buckets = new Map()
  for (const s of list || []) {
    const kind = s?.kind || 'tag'
    // Keywords are not surfaced on the public catalogue. Strip them
    // before they ever reach the suggestion dropdown.
    if (kind === 'keyword') continue
    const arr = buckets.get(kind) || []
    arr.push(s)
    buckets.set(kind, arr)
  }
  const ordered = []
  for (const k of SUGGEST_ORDER) {
    const arr = buckets.get(k)
    if (arr && arr.length > 0) ordered.push({ kind: k, items: arr })
  }
  for (const [k, arr] of buckets) {
    if (!SUGGEST_ORDER.includes(k) && arr.length > 0) {
      ordered.push({ kind: k, items: arr })
    }
  }
  return ordered
}

function flattenGroups(groups) {
  const flat = []
  for (const g of groups) {
    for (const item of g.items) flat.push({ ...item, kind: item.kind || g.kind })
  }
  return flat
}

// Reads the `q` param off the URL only on the browse routes. Anywhere
// else (a detail page, login, etc.) the bar starts empty so it doesn't
// look like a stale search has been remembered.
function useUrlQuery() {
  const location = useLocation()
  const [searchParams] = useSearchParams()
  const onBrowse =
    location.pathname === '/public' ||
    location.pathname === '/public/browse' ||
    location.pathname === '/public/search'
  return onBrowse ? searchParams.get('q') || '' : ''
}

function SearchCommand({ className, autoFocus = false }) {
  const navigate = useNavigate()
  const inputRef = useRef(null)
  const containerRef = useRef(null)

  const urlQuery = useUrlQuery()
  const [value, setValue] = useState(urlQuery)

  // Keep the bar in sync with the URL whenever the route or its query
  // string changes (e.g. user clicks a trending chip on the browse page,
  // a deep-link, or browser back).
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setValue(urlQuery)
  }, [urlQuery])

  // ── Suggestions state ──────────────────────────────────────────────
  const [suggestions, setSuggestions] = useState([])
  const [suggestLoading, setSuggestLoading] = useState(false)
  const [suggestOpen, setSuggestOpen] = useState(false)
  const [highlightIdx, setHighlightIdx] = useState(-1)
  const [suggestQuery, setSuggestQuery] = useState('')

  // Cmd/Ctrl-K focuses the bar from anywhere on the page.
  useEffect(() => {
    const onKey = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault()
        inputRef.current?.focus()
        inputRef.current?.select()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  // Click-outside the bar (or its floating dropdown) closes the panel.
  useEffect(() => {
    if (!suggestOpen) return undefined
    const onClick = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setSuggestOpen(false)
      }
    }
    document.addEventListener('mousedown', onClick)
    return () => document.removeEventListener('mousedown', onClick)
  }, [suggestOpen])

  // Debounced fetch as the user types. AbortController guarantees that
  // a stale response from an earlier keystroke can never overwrite a
  // fresher one.
  useEffect(() => {
    const trimmed = (value || '').trim()
    if (trimmed.length < SUGGEST_MIN_CHARS) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setSuggestions([])
      setSuggestLoading(false)
      setSuggestQuery('')
      return undefined
    }
    const ctrl = new AbortController()
    setSuggestLoading(true)
    const t = setTimeout(() => {
      guestSuggest({ q: trimmed, limit: SUGGEST_LIMIT, signal: ctrl.signal })
        .then((data) => {
          if (ctrl.signal.aborted) return
          const list = Array.isArray(data) ? data : []
          setSuggestions(list)
          setSuggestQuery(trimmed)
          setHighlightIdx(-1)
        })
        .catch((err) => {
          if (err?.code === 'ERR_CANCELED') return
          setSuggestions([])
        })
        .finally(() => {
          if (!ctrl.signal.aborted) setSuggestLoading(false)
        })
    }, SUGGEST_DEBOUNCE_MS)
    return () => {
      clearTimeout(t)
      ctrl.abort()
    }
  }, [value])

  const grouped = useMemo(() => groupSuggestions(suggestions), [suggestions])
  const flatRows = useMemo(() => flattenGroups(grouped), [grouped])

  // Submit always goes to the unified results page. The destination
  // resets the type to `all` and drops any prior filters so the user
  // sees a clean ranked feed for the new query — what they expect
  // when they hit Enter on a search bar.
  const submitWith = (raw) => {
    const trimmed = (raw ?? value ?? '').trim()
    setSuggestOpen(false)
    const target = trimmed
      ? `/public/browse?type=all&q=${encodeURIComponent(trimmed)}`
      : '/public/browse?type=all'
    navigate(target)
  }

  const submitFromForm = (e) => {
    e?.preventDefault?.()
    submitWith(value)
  }

  const activateSuggestion = (s) => {
    if (!s) return
    const meta = SUGGEST_KINDS[s.kind] || SUGGEST_KINDS.tag
    setSuggestOpen(false)
    if (meta.mode === 'entity' && meta.path && s.code) {
      navigate(`/public/${meta.path}/${encodeURIComponent(s.code)}`)
      return
    }
    submitWith(s.value)
  }

  const onInputKeyDown = (e) => {
    if (!suggestOpen) {
      if (e.key === 'ArrowDown' && flatRows.length > 0) {
        e.preventDefault()
        setSuggestOpen(true)
        setHighlightIdx(0)
      }
      return
    }
    if (flatRows.length === 0) return
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setHighlightIdx((i) => (i + 1) % flatRows.length)
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setHighlightIdx((i) => (i <= 0 ? flatRows.length - 1 : i - 1))
    } else if (e.key === 'Enter') {
      if (highlightIdx >= 0 && highlightIdx < flatRows.length) {
        e.preventDefault()
        activateSuggestion(flatRows[highlightIdx])
      }
    } else if (e.key === 'Escape') {
      e.preventDefault()
      setSuggestOpen(false)
      setHighlightIdx(-1)
    }
  }

  const trimmed = (value || '').trim()
  const hasInput = trimmed.length >= SUGGEST_MIN_CHARS
  const showSuggestions = suggestOpen && hasInput
  const showTrending = suggestOpen && !hasInput && TRENDING.length > 0

  return (
    <div ref={containerRef} className={cn('relative w-full', className)}>
      <form
        onSubmit={submitFromForm}
        className={cn(
          'group/search relative flex h-11 items-center gap-2 overflow-hidden rounded-xl border border-border bg-card pl-3.5 pr-1 shadow-sm shadow-black/[0.04] transition-all',
          'focus-within:border-ring focus-within:bg-background',
          'focus-within:shadow-[0_0_0_4px_color-mix(in_oklch,var(--ring)_18%,transparent),0_8px_24px_-12px_oklch(0_0_0_/_0.18)]',
        )}
      >
        <Search className="size-4 shrink-0 text-muted-foreground transition-colors group-focus-within/search:text-primary" />
        <input
          ref={inputRef}
          type="search"
          value={value || ''}
          autoFocus={autoFocus}
          onChange={(e) => {
            setValue(e.target.value)
            setSuggestOpen(true)
          }}
          onFocus={() => setSuggestOpen(true)}
          onKeyDown={onInputKeyDown}
          placeholder="Search the archive — title, person, region, language, tag…"
          className="h-full min-w-0 flex-1 bg-transparent text-[14px] font-medium tracking-tight text-foreground outline-none placeholder:text-muted-foreground/80"
          aria-label="Search the archive"
          aria-autocomplete="list"
          aria-expanded={showSuggestions || showTrending}
          aria-controls="search-command-suggestions"
          aria-activedescendant={
            highlightIdx >= 0 && flatRows[highlightIdx]
              ? `suggest-${highlightIdx}`
              : undefined
          }
          role="combobox"
        />
        {suggestLoading ? (
          <Loader2 className="size-3.5 shrink-0 animate-spin text-muted-foreground" />
        ) : null}
        {value ? (
          <button
            type="button"
            onClick={() => {
              setValue('')
              setSuggestOpen(false)
              inputRef.current?.focus()
            }}
            aria-label="Clear search"
            className="grid size-7 shrink-0 place-items-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
          >
            <X className="size-3.5" />
          </button>
        ) : (
          <kbd className="hidden shrink-0 rounded-md border border-border bg-muted px-1.5 py-0.5 font-mono text-[10px] font-medium text-muted-foreground sm:inline">
            ⌘K
          </kbd>
        )}
        <button
          type="submit"
          aria-label="Search"
          className="ml-1 inline-flex h-9 shrink-0 items-center gap-1.5 rounded-lg bg-primary px-3 text-[13px] font-semibold text-primary-foreground shadow-sm shadow-primary/20 transition-colors hover:bg-primary/90 sm:px-3.5"
        >
          <Search className="size-3.5 sm:hidden" />
          <span className="hidden sm:inline">Search</span>
        </button>
      </form>

      {/* ── Floating dropdown ─────────────────────────────────────────── */}
      {showSuggestions || showTrending ? (
        <div
          id="search-command-suggestions"
          role="listbox"
          className="absolute left-0 right-0 top-[calc(100%+8px)] z-40 max-h-[440px] overflow-auto rounded-2xl border border-border bg-popover text-popover-foreground shadow-2xl shadow-black/15"
        >
          {showSuggestions ? (
            <SuggestionsList
              query={suggestQuery || trimmed}
              groups={grouped}
              flatRows={flatRows}
              highlightIdx={highlightIdx}
              loading={suggestLoading}
              onHover={(i) => setHighlightIdx(i)}
              onPick={activateSuggestion}
              onSearchAll={() => submitWith(trimmed)}
            />
          ) : (
            <TrendingPanel
              items={TRENDING}
              onPick={(label) => submitWith(label)}
            />
          )}
        </div>
      ) : null}
    </div>
  )
}

// ── SuggestionsList ─────────────────────────────────────────────────────
function SuggestionsList({ query, groups, flatRows, loading, highlightIdx, onHover, onPick, onSearchAll }) {
  const indexOf = useMemo(() => {
    const m = new Map()
    flatRows.forEach((r, i) => {
      const id = r.code != null ? `${r.kind}:${r.code}` : `${r.kind}:${r.value}`
      m.set(id, i)
    })
    return m
  }, [flatRows])

  const empty = !loading && groups.length === 0

  return (
    <HighlightProvider query={query}>
      {empty ? (
        <div className="px-4 py-6 text-center text-[13px] text-muted-foreground">
          No suggestions for{' '}
          <span className="font-medium text-foreground">“{query}”</span>.{' '}
          <button
            type="button"
            onMouseDown={(e) => e.preventDefault()}
            onClick={onSearchAll}
            className="ml-0.5 font-medium text-primary hover:underline"
          >
            Search anyway →
          </button>
        </div>
      ) : (
        <ul className="py-1.5">
          {groups.map((g) => {
            const meta = SUGGEST_KINDS[g.kind]
            return (
              <li key={g.kind} className="border-b border-border/60 last:border-b-0">
                <p className="flex items-center gap-1.5 px-3.5 pb-1 pt-2 text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                  {meta?.icon ? <meta.icon className="size-3" /> : null}
                  {meta?.label || g.kind}
                </p>
                <ul>
                  {g.items.map((s) => {
                    const id = s.code != null ? `${s.kind}:${s.code}` : `${s.kind}:${s.value}`
                    const idx = indexOf.get(id) ?? -1
                    const active = idx === highlightIdx
                    return (
                      <SuggestionRow
                        key={id}
                        id={`suggest-${idx}`}
                        suggestion={s}
                        active={active}
                        onMouseEnter={() => onHover(idx)}
                        onMouseDown={(e) => e.preventDefault()}
                        onClick={() => onPick(s)}
                      />
                    )
                  })}
                </ul>
              </li>
            )
          })}
        </ul>
      )}
      {!empty ? (
        <div className="flex items-center justify-between gap-2 border-t border-border bg-secondary/40 px-3.5 py-2 text-[11px] text-muted-foreground">
          <button
            type="button"
            onMouseDown={(e) => e.preventDefault()}
            onClick={onSearchAll}
            className="inline-flex items-center gap-1.5 font-medium text-foreground hover:text-primary"
          >
            <Search className="size-3" />
            Search for{' '}
            <span className="rounded bg-background px-1.5 py-0.5 font-mono text-[10.5px]">
              “{query}”
            </span>
          </button>
          <span className="hidden items-center gap-1.5 sm:inline-flex">
            <kbd className="rounded border border-border bg-background px-1 py-0.5 font-mono text-[10px]">
              ↑↓
            </kbd>
            navigate
            <kbd className="ml-1 inline-flex items-center gap-1 rounded border border-border bg-background px-1 py-0.5 font-mono text-[10px]">
              <CornerDownLeft className="size-2.5" />
              select
            </kbd>
          </span>
        </div>
      ) : null}
    </HighlightProvider>
  )
}

// ── TrendingPanel ───────────────────────────────────────────────────────
// Shown when the bar is focused but empty. Replaces the always-visible
// trending strip the bar used to carry below the input — now the chips
// only appear when the user actually opens the search.
function TrendingPanel({ items, onPick }) {
  return (
    <div className="px-3.5 pb-3 pt-3">
      <p className="mb-2 inline-flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
        <TrendingUp className="size-3" />
        Trending searches
      </p>
      <div className="flex flex-wrap gap-1.5">
        {items.map((t) => (
          <button
            key={t.label}
            type="button"
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => onPick(t.label)}
            className="inline-flex items-center gap-1 rounded-full border border-border bg-background px-3 py-1 text-[12px] font-medium text-foreground transition-colors hover:border-primary/40 hover:bg-accent"
          >
            {t.label}
          </button>
        ))}
      </div>
    </div>
  )
}

// ── SuggestionRow ───────────────────────────────────────────────────────
function SuggestionRow({ id, suggestion, active, onMouseEnter, onMouseDown, onClick }) {
  const meta = SUGGEST_KINDS[suggestion.kind] || SUGGEST_KINDS.tag
  const Icon = meta.icon
  return (
    <li>
      <button
        type="button"
        id={id}
        role="option"
        aria-selected={active}
        onMouseEnter={onMouseEnter}
        onMouseDown={onMouseDown}
        onClick={onClick}
        className={cn(
          'flex w-full items-center gap-2.5 px-3.5 py-2 text-left text-[13px] transition-colors',
          active ? 'bg-accent text-foreground' : 'text-foreground hover:bg-accent/60',
        )}
      >
        <span
          className={cn(
            'grid size-7 shrink-0 place-items-center rounded-lg border transition-colors',
            active
              ? 'border-primary/40 bg-primary/10 text-primary'
              : 'border-border bg-background text-muted-foreground',
          )}
        >
          <Icon className="size-3.5" />
        </span>
        <span className="min-w-0 flex-1 truncate">
          <Highlight text={suggestion.value || ''} />
        </span>
        <span
          className={cn(
            'shrink-0 rounded-full border px-1.5 py-px text-[10px] font-medium uppercase tracking-[0.08em]',
            active
              ? 'border-primary/30 bg-primary/10 text-primary'
              : 'border-border bg-secondary text-muted-foreground',
          )}
        >
          {meta.label}
        </span>
      </button>
    </li>
  )
}

export { SearchCommand }
