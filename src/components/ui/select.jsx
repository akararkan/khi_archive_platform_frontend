import { useCallback, useEffect, useId, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { Check, ChevronDown } from 'lucide-react'

import { useAnchoredPosition } from '@/hooks/use-anchored-position'
import { cn } from '@/lib/utils'

/**
 * Styled, accessible dropdown — a drop-in replacement for a native <select>.
 *
 * Why not native? Native <option> popups can't be themed to match the design
 * system, and they look out of place in the app. This renders a styled menu in
 * a PORTAL at <body>, so it matches the rest of the UI AND is never clipped by
 * an `overflow:hidden` ancestor (Card, table wrapper, scrollable dialog). The
 * menu caps its height to the available viewport space and scrolls inside when
 * the list is long, so every option stays reachable.
 *
 * Props:
 *   value        currently selected value (string)
 *   onChange     (nextValue: string) => void
 *   options      [{ value, label, hint?, icon?, disabled? }]
 *   placeholder? shown when nothing is selected (default "Select…")
 *   size?        'sm' (h-8) | 'md' (h-9, default)
 *   disabled?    required?  id?  name?
 *   className?   extra classes on the trigger (e.g. width)
 *   menuClassName? extra classes on the menu
 *   align?       'start' (default) | 'end' — menu edge aligned to the trigger
 *   leadingIcon? lucide component shown at the trigger's left edge; falls back
 *                to the selected option's `icon`
 *   ariaLabel?   accessible name when there's no visible <label htmlFor>
 */
function Select({
  value,
  onChange,
  options = [],
  placeholder = 'Select…',
  size = 'md',
  disabled = false,
  required = false,
  id,
  name,
  className,
  menuClassName,
  align = 'start',
  leadingIcon,
  ariaLabel,
}) {
  const reactId = useId()
  const baseId = id || reactId
  const listboxId = `${baseId}-listbox`

  const [open, setOpen] = useState(false)
  const [activeIndex, setActiveIndex] = useState(-1)

  const triggerRef = useRef(null)
  const listRef = useRef(null)
  const typeaheadRef = useRef({ buffer: '', timer: 0 })

  const { floatingRef, style } = useAnchoredPosition(triggerRef, open, { align })

  const selectedIndex = useMemo(
    () => options.findIndex((opt) => opt.value === value),
    [options, value],
  )
  const selected = selectedIndex >= 0 ? options[selectedIndex] : null

  const firstEnabled = useCallback(
    (from, dir) => {
      if (options.length === 0) return -1
      let i = from
      for (let step = 0; step < options.length; step += 1) {
        i = (i + dir + options.length) % options.length
        if (!options[i]?.disabled) return i
      }
      return -1
    },
    [options],
  )

  const openMenu = useCallback(() => {
    if (disabled) return
    setActiveIndex(selectedIndex >= 0 && !options[selectedIndex]?.disabled ? selectedIndex : firstEnabled(-1, 1))
    setOpen(true)
  }, [disabled, selectedIndex, options, firstEnabled])

  const closeMenu = useCallback((refocus = true) => {
    setOpen(false)
    if (refocus) requestAnimationFrame(() => triggerRef.current?.focus())
  }, [])

  const commit = useCallback(
    (index) => {
      const opt = options[index]
      if (!opt || opt.disabled) return
      onChange(opt.value)
      closeMenu()
    },
    [options, onChange, closeMenu],
  )

  // Close on outside pointer-down. The menu is portaled, so it isn't a DOM
  // descendant of the trigger — check both refs.
  useEffect(() => {
    if (!open) return undefined
    const onDown = (e) => {
      if (triggerRef.current?.contains(e.target)) return
      if (floatingRef.current?.contains(e.target)) return
      setOpen(false)
    }
    document.addEventListener('mousedown', onDown)
    return () => document.removeEventListener('mousedown', onDown)
  }, [open, floatingRef])

  // Keep the active option scrolled into view.
  useEffect(() => {
    if (!open || activeIndex < 0) return
    const node = listRef.current?.querySelector(`[data-idx="${activeIndex}"]`)
    node?.scrollIntoView({ block: 'nearest' })
  }, [open, activeIndex])

  const handleTypeahead = useCallback(
    (char) => {
      const state = typeaheadRef.current
      window.clearTimeout(state.timer)
      state.buffer += char.toLowerCase()
      state.timer = window.setTimeout(() => {
        state.buffer = ''
      }, 500)
      const match = options.findIndex(
        (opt) => !opt.disabled && String(opt.label).toLowerCase().startsWith(state.buffer),
      )
      if (match >= 0) {
        if (open) setActiveIndex(match)
        else onChange(options[match].value)
      }
    },
    [options, open, onChange],
  )

  const onKeyDown = (e) => {
    if (disabled) return

    if (!open) {
      if (e.key === 'ArrowDown' || e.key === 'ArrowUp' || e.key === 'Enter' || e.key === ' ') {
        e.preventDefault()
        openMenu()
        return
      }
      if (e.key.length === 1 && !e.metaKey && !e.ctrlKey && !e.altKey) {
        handleTypeahead(e.key)
      }
      return
    }

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault()
        setActiveIndex((i) => firstEnabled(i, 1))
        break
      case 'ArrowUp':
        e.preventDefault()
        setActiveIndex((i) => firstEnabled(i, -1))
        break
      case 'Home':
        e.preventDefault()
        setActiveIndex(firstEnabled(-1, 1))
        break
      case 'End':
        e.preventDefault()
        setActiveIndex(firstEnabled(0, -1))
        break
      case 'Enter':
      case ' ':
        e.preventDefault()
        if (activeIndex >= 0) commit(activeIndex)
        break
      case 'Escape':
        e.preventDefault()
        closeMenu()
        break
      case 'Tab':
        setOpen(false)
        break
      default:
        if (e.key.length === 1 && !e.metaKey && !e.ctrlKey && !e.altKey) handleTypeahead(e.key)
    }
  }

  const TriggerIcon = leadingIcon || selected?.icon || null
  const heightClass = size === 'sm' ? 'h-8 text-[0.8rem]' : 'h-9 text-sm'

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        id={baseId}
        role="combobox"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={open ? listboxId : undefined}
        aria-required={required ? 'true' : undefined}
        aria-label={ariaLabel}
        disabled={disabled}
        onClick={() => (open ? closeMenu(false) : openMenu())}
        onKeyDown={onKeyDown}
        className={cn(
          'flex w-full items-center gap-2 rounded-lg border border-input bg-background px-2.5 font-medium text-foreground shadow-sm transition-colors',
          'hover:bg-muted/40 focus-visible:border-ring focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40',
          'disabled:cursor-not-allowed disabled:opacity-60',
          heightClass,
          className,
        )}
      >
        {TriggerIcon ? (
          <TriggerIcon className="size-3.5 shrink-0 text-muted-foreground" aria-hidden="true" />
        ) : null}
        <span
          className={cn(
            'min-w-0 flex-1 truncate text-left',
            !selected && 'font-normal text-muted-foreground',
          )}
        >
          {selected ? selected.label : placeholder}
        </span>
        <ChevronDown
          className={cn(
            'size-3.5 shrink-0 text-muted-foreground transition-transform duration-200',
            open && 'rotate-180',
          )}
          aria-hidden="true"
        />
      </button>

      {/* Hidden mirror so the control still posts inside a plain <form>. */}
      {name ? <input type="hidden" name={name} value={value ?? ''} /> : null}

      {open
        ? createPortal(
            <div
              ref={floatingRef}
              style={style || { position: 'fixed', visibility: 'hidden' }}
              className={cn(
                'overflow-hidden rounded-lg border border-border bg-popover text-popover-foreground shadow-xl shadow-black/20',
                'animate-in fade-in-0 zoom-in-95 duration-100',
                menuClassName,
              )}
            >
              <ul
                ref={listRef}
                id={listboxId}
                role="listbox"
                aria-labelledby={baseId}
                className="max-h-[inherit] overflow-y-auto overscroll-contain py-1"
              >
                {options.length === 0 ? (
                  <li className="px-3 py-2 text-sm text-muted-foreground">No options</li>
                ) : (
                  options.map((opt, idx) => {
                    const isSelected = opt.value === value
                    const isActive = idx === activeIndex
                    const OptIcon = opt.icon
                    return (
                      <li
                        key={opt.value ?? `opt-${idx}`}
                        role="option"
                        aria-selected={isSelected}
                        aria-disabled={opt.disabled || undefined}
                        data-idx={idx}
                        onMouseEnter={() => !opt.disabled && setActiveIndex(idx)}
                        onClick={() => commit(idx)}
                        className={cn(
                          'flex cursor-pointer items-center gap-2 px-3 py-2 text-sm transition-colors',
                          opt.disabled && 'cursor-not-allowed opacity-50',
                          isActive && !opt.disabled && 'bg-accent text-accent-foreground',
                        )}
                      >
                        {OptIcon ? (
                          <OptIcon className="size-3.5 shrink-0 text-muted-foreground" aria-hidden="true" />
                        ) : null}
                        <span className="min-w-0 flex-1 truncate">{opt.label}</span>
                        {opt.hint ? (
                          <span className="shrink-0 font-mono text-[11px] text-muted-foreground">
                            {opt.hint}
                          </span>
                        ) : null}
                        {isSelected ? (
                          <Check className="size-3.5 shrink-0 text-primary" aria-hidden="true" />
                        ) : null}
                      </li>
                    )
                  })
                )}
              </ul>
            </div>,
            document.body,
          )
        : null}
    </>
  )
}

export { Select }
