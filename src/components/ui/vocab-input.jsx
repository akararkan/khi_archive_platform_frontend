import { useCallback, useEffect, useId, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { Check, ChevronDown, PenLine, X } from 'lucide-react'

import { useAnchoredPosition } from '@/hooks/use-anchored-position'
import {
  getVocabularyOptions,
  normalizeVocabularyValue as norm,
} from '@/lib/controlled-vocabulary'
import { cn } from '@/lib/utils'

/**
 * Creatable combobox — a free-text input with a preset dropdown attached.
 *
 * The archive's rights/language/provenance fields have an agreed list of
 * values (see lib/controlled-vocabulary.js) but must stay open-ended: a new
 * collection can always need wording nobody anticipated. So this is NOT a
 * <select>. It is the field itself, plus a menu that fills it in:
 *
 *   • Typing writes straight through to `onChange` — nothing is swallowed,
 *     nothing needs confirming, and the typed string is what gets sent.
 *   • The menu offers the presets, filtered by what's typed.
 *   • A value that isn't a preset is flagged "new" rather than rejected.
 *
 * The menu is portaled to <body> and positioned with useAnchoredPosition, so
 * no `overflow:hidden` ancestor (Card, dialog, table wrapper) can clip it —
 * same rule as ui/select.jsx and ui/search-select.jsx.
 *
 * Values are Sorani Kurdish for most fields and Latin for others
 * (CC BY-NC-ND, M1706.K87, KHI), so the input and every menu row use
 * dir="auto" and let the browser pick the direction per string.
 *
 * Props:
 *   value       current string (free text)
 *   onChange    (nextValue: string) => void   — value, not an event
 *   options     [{ value, hint? }]            — presets; empty ⇒ plain input
 *   id? name? placeholder? disabled? required? className? ariaLabel?
 *   inputMode? dir?  passed through to the inner <input>
 */
function ComboInput({
  value,
  onChange,
  options = [],
  id,
  name,
  placeholder = 'Select or type…',
  disabled = false,
  required = false,
  className,
  ariaLabel,
}) {
  const reactId = useId()
  const baseId = id || reactId
  const listboxId = `${baseId}-listbox`

  const [open, setOpen] = useState(false)
  const [activeIndex, setActiveIndex] = useState(-1)

  const wrapRef = useRef(null)
  const inputRef = useRef(null)
  const listRef = useRef(null)

  const { floatingRef, style } = useAnchoredPosition(wrapRef, open)

  const text = value ?? ''
  const hasOptions = options.length > 0

  const exact = useMemo(
    () => options.find((opt) => norm(opt.value) === norm(text)) || null,
    [options, text],
  )

  // Filter by what's typed. Once the text IS a preset we show the full list
  // again — otherwise switching "سۆرانی" → "کورمانجی" would need clearing the
  // field first, since the exact match filters every sibling out.
  const filtered = useMemo(() => {
    const q = norm(text)
    if (!q || exact) return options
    return options.filter((opt) => norm(opt.value).includes(q) || norm(opt.hint).includes(q))
  }, [options, text, exact])

  const isCustom = Boolean(norm(text)) && !exact

  const openMenu = useCallback(() => {
    if (disabled || !hasOptions) return
    setOpen(true)
  }, [disabled, hasOptions])

  const closeMenu = useCallback((refocus = false) => {
    setOpen(false)
    if (refocus) requestAnimationFrame(() => inputRef.current?.focus())
  }, [])

  const commit = useCallback(
    (opt) => {
      if (!opt) return
      onChange(opt.value)
      closeMenu(true)
    },
    [onChange, closeMenu],
  )

  // Close on outside pointer-down. The menu lives in a portal, so it is not a
  // DOM descendant of the wrapper — both refs have to be checked.
  useEffect(() => {
    if (!open) return undefined
    const onDown = (e) => {
      if (wrapRef.current?.contains(e.target)) return
      if (floatingRef.current?.contains(e.target)) return
      setOpen(false)
    }
    document.addEventListener('mousedown', onDown)
    return () => document.removeEventListener('mousedown', onDown)
  }, [open, floatingRef])

  // Re-seed the highlight whenever the menu opens or the list changes under
  // it: land on the current value if it's a preset, else the first row.
  useEffect(() => {
    if (!open) return
    const at = exact ? filtered.findIndex((opt) => opt.value === exact.value) : -1
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setActiveIndex(at >= 0 ? at : filtered.length > 0 ? 0 : -1)
  }, [open, filtered, exact])

  useEffect(() => {
    if (!open || activeIndex < 0) return
    listRef.current?.querySelector(`[data-idx="${activeIndex}"]`)?.scrollIntoView({ block: 'nearest' })
  }, [open, activeIndex])

  const step = (dir) => {
    if (filtered.length === 0) return
    setActiveIndex((i) => (i + dir + filtered.length) % filtered.length)
  }

  const onKeyDown = (e) => {
    if (disabled) return
    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault()
        if (!open) openMenu()
        else step(1)
        break
      case 'ArrowUp':
        if (!open) return
        e.preventDefault()
        step(-1)
        break
      case 'Enter':
        // Only intercept while a preset is highlighted; otherwise leave Enter
        // alone so the surrounding form can still submit.
        if (open && activeIndex >= 0 && filtered[activeIndex]) {
          e.preventDefault()
          commit(filtered[activeIndex])
        }
        break
      case 'Escape':
        // Swallow it while the menu is up so a parent dialog doesn't close too.
        if (open) {
          e.preventDefault()
          e.stopPropagation()
          closeMenu()
        }
        break
      case 'Tab':
        setOpen(false)
        break
      default:
        break
    }
  }

  return (
    <div ref={wrapRef} className="relative w-full">
      <div
        className={cn(
          'flex h-8 w-full min-w-0 items-center gap-1 rounded-lg border border-input bg-transparent px-2.5 py-1 text-base transition-colors md:text-sm dark:bg-input/30',
          'focus-within:border-ring focus-within:ring-3 focus-within:ring-ring/50',
          disabled && 'pointer-events-none bg-input/50 opacity-50 dark:bg-input/80',
          className,
        )}
        onClick={() => {
          if (disabled) return
          inputRef.current?.focus()
          openMenu()
        }}
      >
        <input
          ref={inputRef}
          id={baseId}
          name={name}
          type="text"
          dir="auto"
          value={text}
          onChange={(e) => {
            onChange(e.target.value)
            openMenu()
          }}
          onKeyDown={onKeyDown}
          disabled={disabled}
          placeholder={hasOptions ? placeholder : undefined}
          autoComplete="off"
          role={hasOptions ? 'combobox' : undefined}
          aria-expanded={hasOptions ? open : undefined}
          aria-controls={open ? listboxId : undefined}
          aria-autocomplete={hasOptions ? 'list' : undefined}
          aria-activedescendant={open && activeIndex >= 0 ? `${listboxId}-opt-${activeIndex}` : undefined}
          aria-required={required ? 'true' : undefined}
          aria-label={ariaLabel}
          className="min-w-0 flex-1 bg-transparent outline-none placeholder:text-muted-foreground disabled:cursor-not-allowed"
        />

        {isCustom && hasOptions ? (
          <span
            title="Not one of the preset values — it will be saved exactly as typed."
            className="hidden shrink-0 items-center gap-1 rounded-full border border-dashed border-amber-500/50 px-1.5 py-px text-[10px] font-medium text-amber-600 sm:inline-flex dark:text-amber-400"
          >
            <PenLine className="size-2.5" aria-hidden="true" />
            new
          </span>
        ) : null}

        {text && !disabled ? (
          <button
            type="button"
            tabIndex={-1}
            onClick={(e) => {
              e.stopPropagation()
              onChange('')
              inputRef.current?.focus()
              openMenu()
            }}
            aria-label="Clear value"
            className="shrink-0 text-muted-foreground transition-colors hover:text-foreground"
          >
            <X className="size-3.5" />
          </button>
        ) : null}

        {hasOptions ? (
          <button
            type="button"
            tabIndex={-1}
            disabled={disabled}
            onClick={(e) => {
              e.stopPropagation()
              if (open) closeMenu(true)
              else {
                inputRef.current?.focus()
                openMenu()
              }
            }}
            aria-label={open ? 'Hide preset values' : 'Show preset values'}
            className="shrink-0 text-muted-foreground transition-colors hover:text-foreground"
          >
            <ChevronDown
              className={cn('size-3.5 transition-transform duration-200', open && 'rotate-180')}
              aria-hidden="true"
            />
          </button>
        ) : null}
      </div>

      {open && hasOptions
        ? createPortal(
            <div
              ref={floatingRef}
              style={style || { position: 'fixed', visibility: 'hidden' }}
              className="flex flex-col overflow-hidden rounded-lg border border-border bg-popover text-popover-foreground shadow-xl shadow-black/20 animate-in fade-in-0 zoom-in-95 duration-100"
            >
              {filtered.length > 0 ? (
                <ul
                  ref={listRef}
                  id={listboxId}
                  role="listbox"
                  aria-label="Preset values"
                  className="min-h-0 flex-1 overflow-y-auto overscroll-contain py-1"
                >
                  {filtered.map((opt, idx) => {
                    const isSelected = exact?.value === opt.value
                    const isActive = idx === activeIndex
                    return (
                      <li
                        key={opt.value}
                        id={`${listboxId}-opt-${idx}`}
                        role="option"
                        aria-selected={isSelected}
                        data-idx={idx}
                        onMouseEnter={() => setActiveIndex(idx)}
                        onClick={() => commit(opt)}
                        className={cn(
                          'flex cursor-pointer items-center gap-2 px-3 py-2 text-sm transition-colors',
                          isActive && 'bg-accent text-accent-foreground',
                        )}
                      >
                        <span dir="auto" className="min-w-0 flex-1 truncate">
                          {opt.value}
                        </span>
                        {opt.hint ? (
                          <span className="shrink-0 text-[11px] text-muted-foreground">
                            {opt.hint}
                          </span>
                        ) : null}
                        {isSelected ? (
                          <Check className="size-3.5 shrink-0 text-primary" aria-hidden="true" />
                        ) : null}
                      </li>
                    )
                  })}
                </ul>
              ) : (
                <p className="px-3 pt-2 text-sm text-muted-foreground">No preset matches.</p>
              )}

              {/* Reassurance, not a prompt: the typed text is already the value.
                  This just makes it obvious the field accepts new terms. */}
              {isCustom ? (
                <p className="flex shrink-0 items-center gap-1.5 border-t border-border bg-muted/40 px-3 py-2 text-[11px] leading-snug text-muted-foreground">
                  <PenLine className="size-3 shrink-0" aria-hidden="true" />
                  <span className="min-w-0">
                    <span dir="auto" className="font-medium text-foreground">
                      {text}
                    </span>{' '}
                    will be saved as a new value.
                  </span>
                </p>
              ) : null}
            </div>,
            document.body,
          )
        : null}
    </div>
  )
}

/**
 * ComboInput bound to a controlled vocabulary by field name.
 *
 *   <VocabInput id="txt-licenseType" field="licenseType"
 *               value={form.licenseType}
 *               onChange={(v) => setForm({ ...form, licenseType: v })} />
 *
 * `field` is the bare metadata name (licenseType, dialect, region…) — pass it
 * even when the DOM id carries a per-media prefix, so all four media types
 * share one list. An unknown field degrades to a plain text input.
 */
function VocabInput({ field, options, ...props }) {
  return <ComboInput options={options || getVocabularyOptions(field)} {...props} />
}

export { ComboInput, VocabInput }
