import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { X } from 'lucide-react'

import { useAnchoredPosition } from '@/hooks/use-anchored-position'
import { cn } from '@/lib/utils'

/**
 * Chip-style tag input.
 * - Type and press Enter, or use a separator (`,` `;` `،`) or Tab, to commit a
 *   chip. Enter ALWAYS commits the typed draft (and, when `suggest` is enabled,
 *   picks the highlighted suggestion instead). Enter never submits the
 *   surrounding form — the entity is saved via its own button, so Enter inside a
 *   multi-value field only ever adds a value.
 * - Backspace on empty input removes the last chip
 * - Pasting "a, b, c" splits into multiple chips
 * - Blurring the field also commits whatever's in the draft
 * - Duplicates are ignored (case-insensitive)
 *
 * Value is an array of strings; onChange receives the new array.
 *
 * Optional autocomplete (used for the canonical `tags` field):
 *   suggest?    async (q, { limit, signal }) => [{ value, usageCount, matchRank }]
 *               When provided, a portaled suggestion dropdown appears as you
 *               type. The portal means no `overflow:hidden` ancestor clips it.
 *   transform?  (raw) => string   — normalise each token before commit/dedupe
 *               (e.g. canonicalizeTag). Default: trim only.
 *   maxLength?  caps the input length (tags are capped at 64 server-side).
 *   suggestLimit? rows to request (default 10).
 */
function TagsInput({
  value = [],
  onChange,
  placeholder = 'Type and press Enter or comma…',
  id,
  maxTags,
  disabled = false,
  className,
  suggest,
  transform,
  maxLength,
  suggestLimit = 10,
}) {
  const [draft, setDraft] = useState('')
  const [suggestions, setSuggestions] = useState([])
  // -1 = nothing pre-highlighted, so Enter commits the TYPED text (creates a
  // new tag). Arrowing down moves into the suggestion list.
  const [activeIndex, setActiveIndex] = useState(-1)
  const inputRef = useRef(null)
  const rootRef = useRef(null)
  const listRef = useRef(null)

  const normalize = transform || ((s) => s.trim())

  // Suggestions not already chosen. Derived (not stored) so adding a chip
  // instantly drops it from the menu without refetching.
  const selectedKeys = new Set(value.map((v) => v.toLowerCase()))
  const visible = suggestions.filter(
    (s) => s && s.value != null && !selectedKeys.has(String(s.value).toLowerCase()),
  )
  const showSuggest = Boolean(suggest) && draft.trim().length >= 1 && visible.length > 0
  const active = Math.min(activeIndex, visible.length - 1)

  const { floatingRef, style } = useAnchoredPosition(rootRef, showSuggest)

  const resetSuggest = () => {
    setSuggestions([])
    setActiveIndex(-1)
  }

  const commit = (raw) => {
    const parts = String(raw)
      .split(/[,،;]/)
      .map((s) => normalize(s))
      .filter(Boolean)

    if (parts.length === 0) {
      setDraft('')
      resetSuggest()
      return
    }

    const seen = new Set(value.map((v) => v.toLowerCase()))
    const next = [...value]

    for (const part of parts) {
      if (maxTags && next.length >= maxTags) break
      const key = part.toLowerCase()
      if (!seen.has(key)) {
        seen.add(key)
        next.push(part)
      }
    }

    if (next.length !== value.length) onChange(next)
    setDraft('')
    resetSuggest()
  }

  const removeAt = (index) => {
    onChange(value.filter((_, i) => i !== index))
  }

  // Debounced suggestion fetch. Aborts in-flight requests on rapid keystrokes.
  // setState happens only inside the async callback (never synchronously in the
  // effect body) so it doesn't trigger cascading-render warnings.
  useEffect(() => {
    if (!suggest) return undefined
    const q = draft.trim()
    if (!q) return undefined

    const controller = new AbortController()
    const timer = setTimeout(async () => {
      try {
        const results = await suggest(q, { limit: suggestLimit, signal: controller.signal })
        if (controller.signal.aborted) return
        setSuggestions(Array.isArray(results) ? results : [])
        setActiveIndex(-1)
      } catch {
        if (!controller.signal.aborted) setSuggestions([])
      }
    }, 150)

    return () => {
      clearTimeout(timer)
      controller.abort()
    }
  }, [suggest, draft, suggestLimit])

  // Close the portaled menu on outside pointer-down.
  useEffect(() => {
    if (!showSuggest) return undefined
    const onDown = (e) => {
      if (rootRef.current?.contains(e.target)) return
      if (floatingRef.current?.contains(e.target)) return
      resetSuggest()
    }
    document.addEventListener('mousedown', onDown)
    return () => document.removeEventListener('mousedown', onDown)
  }, [showSuggest, floatingRef])

  // Keep the highlighted suggestion scrolled into view.
  useEffect(() => {
    if (!showSuggest) return
    listRef.current?.querySelector(`[data-idx="${active}"]`)?.scrollIntoView({ block: 'nearest' })
  }, [showSuggest, active])

  const handleKeyDown = (event) => {
    // Autocomplete navigation takes priority while the menu is open.
    if (showSuggest) {
      if (event.key === 'ArrowDown') {
        event.preventDefault()
        setActiveIndex((i) => Math.min(i + 1, visible.length - 1))
        return
      }
      if (event.key === 'ArrowUp') {
        event.preventDefault()
        // -1 returns focus to the typed text (deselects the suggestion list).
        setActiveIndex((i) => Math.max(i - 1, -1))
        return
      }
      if (event.key === 'Enter') {
        event.preventDefault()
        const pick = visible[active]
        if (pick) commit(pick.value)
        else if (draft.trim()) commit(draft)
        return
      }
      if (event.key === 'Escape') {
        event.preventDefault()
        resetSuggest()
        return
      }
    }

    if (event.key === 'Enter') {
      // Enter commits the typed draft as a chip in BOTH plain and suggest modes
      // and always blocks the surrounding form from submitting — the entity is
      // saved via its own button, never by Enter inside a multi-value field.
      event.preventDefault()
      if (draft.trim()) commit(draft)
      return
    }
    if (event.key === ',' || event.key === ';' || event.key === 'Tab') {
      if (!draft.trim()) return
      if (event.key === 'Tab' && event.shiftKey) return
      event.preventDefault()
      commit(draft)
    } else if (event.key === 'Backspace' && !draft && value.length > 0) {
      event.preventDefault()
      removeAt(value.length - 1)
    }
  }

  const handlePaste = (event) => {
    const text = event.clipboardData.getData('text')
    if (/[,;،]/.test(text)) {
      event.preventDefault()
      commit(text)
    }
  }

  const handleBlur = () => {
    if (draft.trim()) commit(draft)
  }

  return (
    <div
      ref={rootRef}
      role="group"
      onClick={() => inputRef.current?.focus()}
      className={cn(
        'flex min-h-9 w-full flex-wrap items-center gap-1.5 rounded-lg border border-input bg-background px-2 py-1.5 text-sm shadow-sm transition-colors',
        'focus-within:border-ring focus-within:ring-2 focus-within:ring-ring/30',
        disabled && 'pointer-events-none opacity-60',
        className,
      )}
    >
      {value.map((tag, index) => (
        <span
          key={`${tag}-${index}`}
          className="group/chip inline-flex items-center gap-0.5 rounded-md border border-border bg-muted/60 py-0.5 pl-2 pr-0.5 text-xs font-medium text-foreground animate-in fade-in-0 zoom-in-95 duration-150"
        >
          <span className="max-w-[20ch] truncate">{tag}</span>
          <button
            type="button"
            onClick={(event) => {
              event.stopPropagation()
              removeAt(index)
            }}
            disabled={disabled}
            className="ml-0.5 inline-flex size-4 shrink-0 items-center justify-center rounded-sm text-muted-foreground transition-colors hover:bg-foreground/10 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            aria-label={`Remove ${tag}`}
          >
            <X className="size-3" />
          </button>
        </span>
      ))}

      <input
        ref={inputRef}
        id={id}
        type="text"
        disabled={disabled || Boolean(maxTags && value.length >= maxTags)}
        value={draft}
        maxLength={maxLength}
        onChange={(event) => setDraft(event.target.value)}
        onKeyDown={handleKeyDown}
        onPaste={handlePaste}
        onBlur={handleBlur}
        placeholder={value.length === 0 ? placeholder : ''}
        role={suggest ? 'combobox' : undefined}
        aria-expanded={suggest ? showSuggest : undefined}
        aria-autocomplete={suggest ? 'list' : undefined}
        autoComplete={suggest ? 'off' : undefined}
        className="flex-1 min-w-[10ch] bg-transparent px-1 py-0.5 text-sm outline-none placeholder:text-muted-foreground/70"
      />

      {showSuggest
        ? createPortal(
            <div
              ref={floatingRef}
              style={style || { position: 'fixed', visibility: 'hidden' }}
              className="overflow-hidden rounded-lg border border-border bg-popover text-popover-foreground shadow-xl shadow-black/20 animate-in fade-in-0 zoom-in-95 duration-100"
            >
              <ul
                ref={listRef}
                role="listbox"
                className="max-h-[inherit] overflow-y-auto overscroll-contain py-1"
              >
                {visible.map((s, idx) => {
                  const isActive = idx === active
                  return (
                    <li key={String(s.value)} role="option" aria-selected={isActive} data-idx={idx}>
                      <button
                        type="button"
                        // mousedown (not click) so it fires before the input's blur.
                        onMouseDown={(e) => {
                          e.preventDefault()
                          commit(s.value)
                          inputRef.current?.focus()
                        }}
                        onMouseEnter={() => setActiveIndex(idx)}
                        className={cn(
                          'flex w-full items-center gap-2 px-3 py-2 text-left text-sm transition-colors',
                          isActive ? 'bg-accent text-accent-foreground' : 'hover:bg-accent/60',
                        )}
                      >
                        <span className="min-w-0 flex-1 truncate font-medium">{s.value}</span>
                        {s.matchRank === 0 ? (
                          <span className="shrink-0 rounded-full border border-primary/30 bg-primary/10 px-1.5 py-0 text-[10px] font-semibold uppercase tracking-wide text-primary">
                            exact
                          </span>
                        ) : null}
                        {typeof s.usageCount === 'number' ? (
                          <span className="shrink-0 font-mono text-[11px] tabular-nums text-muted-foreground">
                            {s.usageCount}
                          </span>
                        ) : null}
                      </button>
                    </li>
                  )
                })}
              </ul>
            </div>,
            document.body,
          )
        : null}
    </div>
  )
}

export { TagsInput }
