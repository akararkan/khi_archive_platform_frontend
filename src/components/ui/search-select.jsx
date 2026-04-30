import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Check, Loader2, Search, X } from 'lucide-react'

import { cn } from '@/lib/utils'

/**
 * Typeahead combobox. Swap in for a <select> when the list is too long to scan.
 *
 * Props:
 *   items         array of option objects (used as the seed list / fallback)
 *   value         currently selected key (string)
 *   onChange      (nextKey: string) => void
 *   getKey        (item) => string                              — unique code
 *   getLabel      (item) => string                              — main label
 *   getSubtitle?  (item) => string | null                       — secondary label (e.g. code)
 *   placeholder?  input placeholder
 *   emptyHint?    text shown when no matches
 *   loading?      shows a spinner in the menu
 *   disabled?
 *   required?     surfaces aria-required
 *   id?
 *   maxResults?   cap items rendered (default 50)
 *   fallbackLabel displayed next to the chip when the selected code isn't in `items`
 *   asyncSearch?  optional (query, { signal }) => Promise<items[]>. When given,
 *                 typing triggers a debounced backend call instead of client-side
 *                 substring filtering. Empty query falls back to `items`.
 *   debounceMs?   debounce delay for asyncSearch (default 220ms)
 */
function SearchSelect({
  items,
  value,
  onChange,
  getKey,
  getLabel,
  getSubtitle,
  placeholder = 'Type to search…',
  emptyHint = 'No matches',
  loading = false,
  disabled = false,
  required = false,
  id,
  maxResults = 50,
  fallbackLabel,
  asyncSearch,
  debounceMs = 220,
}) {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [highlight, setHighlight] = useState(0)
  const [asyncResults, setAsyncResults] = useState(null)
  const [asyncLoading, setAsyncLoading] = useState(false)
  const rootRef = useRef(null)
  const inputRef = useRef(null)
  const listRef = useRef(null)

  // Selected lookup: prefer items, but fall back to a stale asyncResults entry
  // so the chip stays correct after the menu has moved on.
  const selected = useMemo(() => {
    if (!value) return null
    const fromItems = items.find((item) => getKey(item) === value)
    if (fromItems) return fromItems
    if (asyncResults) {
      return asyncResults.find((item) => getKey(item) === value) || null
    }
    return null
  }, [items, value, getKey, asyncResults])

  // Debounced async search. Aborts in-flight requests on rapid keystrokes.
  useEffect(() => {
    if (!asyncSearch) return undefined
    const q = query.trim()
    if (!q) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setAsyncResults(null)
      setAsyncLoading(false)
      return undefined
    }

    const controller = new AbortController()
    const timer = setTimeout(async () => {
      setAsyncLoading(true)
      try {
        const data = await asyncSearch(q, { signal: controller.signal })
        if (!controller.signal.aborted) {
          setAsyncResults(Array.isArray(data) ? data : [])
        }
      } catch {
        if (!controller.signal.aborted) setAsyncResults([])
      } finally {
        if (!controller.signal.aborted) setAsyncLoading(false)
      }
    }, debounceMs)

    return () => {
      clearTimeout(timer)
      controller.abort()
    }
  }, [asyncSearch, query, debounceMs])

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()

    // Async mode: defer to whatever the backend returned for non-empty queries;
    // for empty queries, show the seed items so the user gets a starting list.
    if (asyncSearch) {
      if (!q) return items.slice(0, maxResults)
      return (asyncResults || []).slice(0, maxResults)
    }

    if (!q) return items.slice(0, maxResults)
    return items
      .filter((item) => {
        const label = String(getLabel(item) || '').toLowerCase()
        const sub = String(getSubtitle ? getSubtitle(item) || '' : '').toLowerCase()
        const key = String(getKey(item) || '').toLowerCase()
        return label.includes(q) || sub.includes(q) || key.includes(q)
      })
      .slice(0, maxResults)
  }, [items, query, getLabel, getSubtitle, getKey, maxResults, asyncSearch, asyncResults])

  useEffect(() => {
    if (!open) return undefined
    const onDocMouseDown = (e) => {
      if (rootRef.current && !rootRef.current.contains(e.target)) setOpen(false)
    }
    document.addEventListener('mousedown', onDocMouseDown)
    return () => document.removeEventListener('mousedown', onDocMouseDown)
  }, [open])

  useEffect(() => {
    if (!open) return
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setHighlight(0)
  }, [open, query])

  const commit = useCallback(
    (item) => {
      onChange(getKey(item))
      setQuery('')
      setOpen(false)
    },
    [getKey, onChange],
  )

  const clear = useCallback(() => {
    onChange('')
    setQuery('')
    setOpen(true)
    requestAnimationFrame(() => inputRef.current?.focus())
  }, [onChange])

  const handleKeyDown = (e) => {
    if (disabled) return
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setOpen(true)
      setHighlight((h) => Math.min(h + 1, filtered.length - 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setHighlight((h) => Math.max(h - 1, 0))
    } else if (e.key === 'Enter') {
      if (open && filtered[highlight]) {
        e.preventDefault()
        commit(filtered[highlight])
      }
    } else if (e.key === 'Escape') {
      setOpen(false)
    } else if (e.key === 'Backspace' && !query && selected) {
      // quick-clear on empty input
      e.preventDefault()
      clear()
    }
  }

  // scroll highlighted option into view
  useEffect(() => {
    if (!open) return
    const list = listRef.current
    if (!list) return
    const node = list.querySelector(`[data-idx="${highlight}"]`)
    if (node) {
      const nodeTop = node.offsetTop
      const nodeBottom = nodeTop + node.offsetHeight
      if (nodeTop < list.scrollTop) list.scrollTop = nodeTop
      else if (nodeBottom > list.scrollTop + list.clientHeight)
        list.scrollTop = nodeBottom - list.clientHeight
    }
  }, [highlight, open])

  const showChip = Boolean(selected) || Boolean(value && !selected)
  const chipLabel = selected ? getLabel(selected) : fallbackLabel || value
  const chipSub = selected && getSubtitle ? getSubtitle(selected) : selected ? null : value

  return (
    <div ref={rootRef} className={cn('relative w-full', disabled && 'opacity-60')}>
      <div
        className={cn(
          'flex h-9 w-full items-center gap-2 rounded-lg border border-input bg-background px-2.5 shadow-sm transition-colors',
          'focus-within:border-ring focus-within:ring-2 focus-within:ring-ring/30',
          disabled && 'cursor-not-allowed',
        )}
        onClick={() => {
          if (disabled) return
          setOpen(true)
          requestAnimationFrame(() => inputRef.current?.focus())
        }}
      >
        <Search className="size-3.5 shrink-0 text-muted-foreground" aria-hidden="true" />

        {showChip && !open ? (
          <span className="flex min-w-0 flex-1 items-center gap-2">
            <span className="truncate text-sm font-medium text-foreground">{chipLabel}</span>
            {chipSub && chipSub !== chipLabel ? (
              <span className="truncate font-mono text-[11px] text-muted-foreground">
                {chipSub}
              </span>
            ) : null}
          </span>
        ) : (
          <input
            ref={inputRef}
            id={id}
            type="text"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value)
              setOpen(true)
            }}
            onFocus={() => setOpen(true)}
            onKeyDown={handleKeyDown}
            placeholder={
              showChip ? `${chipLabel}${chipSub && chipSub !== chipLabel ? ` — ${chipSub}` : ''}` : placeholder
            }
            disabled={disabled}
            aria-required={required ? 'true' : undefined}
            aria-expanded={open}
            aria-autocomplete="list"
            role="combobox"
            autoComplete="off"
            className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground/70 disabled:cursor-not-allowed"
          />
        )}

        {showChip && !disabled ? (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation()
              clear()
            }}
            aria-label="Clear selection"
            className="text-muted-foreground transition hover:text-foreground"
          >
            <X className="size-3.5" />
          </button>
        ) : null}
      </div>

      {open && !disabled ? (
        <div className="absolute left-0 right-0 top-[calc(100%+4px)] z-50 overflow-hidden rounded-lg border border-border bg-popover shadow-xl shadow-black/10">
          {loading || asyncLoading ? (
            <div className="flex items-center gap-2 px-3 py-3 text-sm text-muted-foreground">
              <Loader2 className="size-3.5 animate-spin" />
              {asyncLoading ? 'Searching…' : 'Loading…'}
            </div>
          ) : filtered.length === 0 ? (
            <div className="px-3 py-3 text-sm text-muted-foreground">{emptyHint}</div>
          ) : (
            <ul ref={listRef} className="max-h-64 overflow-y-auto py-1" role="listbox">
              {filtered.map((item, idx) => {
                const key = getKey(item)
                const isActive = idx === highlight
                const isSelected = key === value
                const label = getLabel(item)
                const sub = getSubtitle ? getSubtitle(item) : null
                return (
                  <li key={key} role="option" aria-selected={isSelected} data-idx={idx}>
                    <button
                      type="button"
                      onMouseEnter={() => setHighlight(idx)}
                      onClick={() => commit(item)}
                      className={cn(
                        'flex w-full items-center justify-between gap-3 px-3 py-2 text-left text-sm transition-colors',
                        isActive ? 'bg-accent text-accent-foreground' : 'hover:bg-accent/60',
                      )}
                    >
                      <span className="min-w-0 flex-1 truncate font-medium text-foreground">
                        {label}
                      </span>
                      <span className="flex items-center gap-2">
                        {sub ? (
                          <span className="font-mono text-[11px] text-muted-foreground">{sub}</span>
                        ) : null}
                        {isSelected ? <Check className="size-3.5 text-primary" /> : null}
                      </span>
                    </button>
                  </li>
                )
              })}
            </ul>
          )}
        </div>
      ) : null}
    </div>
  )
}

export { SearchSelect }
