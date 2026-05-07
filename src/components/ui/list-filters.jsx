// Shared building blocks for the list-page sort/filter toolbars.
// Composed by EmployeeCategoryPage, EmployeePersonPage, and any other
// list page that wires up the backend's filter+sort cache pass-through.
//
// The vocabulary is intentionally small and orthogonal:
//   - SortSelect / FilterTriggerButton  → toolbar controls
//   - FilterPanel / FilterSection / FilterField → panel scaffolding
//   - TextFilter / DateRangeField / SegmentedControl
//     / MatchModeToggle / MultiValueFilter → individual inputs
//   - FilterChips → the active-filter strip below the toolbar
//
// Visual contract: every input shares the same label typography
// (uppercase 10px tracking-wider muted), the same focus ring
// (primary at 30% alpha), and the same 8px corner radius. Sections
// share a single layout grid so columns stay aligned across panels.

import { useEffect, useRef, useState } from 'react'
import {
  CalendarRange,
  Check,
  ChevronDown,
  Filter,
  Search,
  SlidersHorizontal,
  X,
} from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardFooter } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { TagsInput } from '@/components/ui/tags-input'
import { cn } from '@/lib/utils'

// ─────────────────────────────────────────────────────────────────
// Sort dropdown
// ─────────────────────────────────────────────────────────────────

// Native <select> styled as an outline button. Native is intentional:
// keyboard search, screen-reader semantics, and mobile picker
// integration come for free.
//
// `options` shape: [{ key, label, sortBy, sortDirection, icon? }]
//   - key:           identifier (used as <option value>)
//   - label:         user-visible string
//   - sortBy/Dir:    the page reads these via options.find(o => o.key === value)
//   - icon:          optional lucide component for the left edge;
//                    falls back to an asc/desc arrow inferred from
//                    sortDirection.
export function SortSelect({
  value,
  onChange,
  options,
  disabled,
  className,
  ascIcon,
  descIcon,
  width = 'sm:w-[14rem]',
  title = 'Sort',
}) {
  const active = options.find((opt) => opt.key === value) ?? options[0]
  const Icon =
    active?.icon ??
    (active?.sortDirection === 'desc' ? descIcon : ascIcon) ??
    null
  return (
    <label
      className={cn(
        'relative inline-flex items-center gap-2',
        disabled && 'opacity-60',
        className,
      )}
      title={disabled ? 'Clear search to change sort' : title}
    >
      {Icon ? (
        <span className="pointer-events-none absolute left-2.5 z-10 text-muted-foreground">
          <Icon className="size-3.5" />
        </span>
      ) : null}
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        disabled={disabled}
        className={cn(
          'h-8 w-full appearance-none rounded-lg border border-input bg-background text-[0.8rem] font-medium text-foreground shadow-sm transition-colors',
          'hover:bg-muted/40 focus-visible:border-ring focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/40',
          'disabled:cursor-not-allowed',
          Icon ? 'pl-8' : 'pl-2.5',
          'pr-7',
          width,
        )}
      >
        {options.map((opt) => (
          <option key={opt.key} value={opt.key}>
            {opt.label}
          </option>
        ))}
      </select>
      <ChevronDown className="pointer-events-none absolute right-2.5 size-3.5 text-muted-foreground" />
    </label>
  )
}

// ─────────────────────────────────────────────────────────────────
// Filter trigger button (lives in the toolbar)
// ─────────────────────────────────────────────────────────────────

// Polished trigger with active count and rotation chevron. Shows a
// pulsing dot when filters are active to draw the eye even when the
// count badge is only "1".
export function FilterTriggerButton({
  active,
  count = 0,
  open,
  onClick,
  disabled,
  disabledReason,
  label = 'Filters',
}) {
  return (
    <Button
      type="button"
      variant={active ? 'default' : 'outline'}
      className={cn(
        'h-8 gap-1.5 px-2.5 shrink-0 transition-shadow',
        active && 'shadow-sm shadow-primary/20',
      )}
      onClick={onClick}
      disabled={disabled}
      aria-expanded={open}
      title={disabled ? disabledReason : 'Show filter panel'}
    >
      <SlidersHorizontal className="size-3.5" />
      <span>{label}</span>
      {active ? (
        <span className="inline-flex items-center gap-1 rounded-full bg-primary-foreground/20 px-1.5 py-0.5 text-[10px] font-semibold tabular-nums leading-none">
          <span className="relative flex size-1.5">
            <span className="absolute inline-flex size-full animate-ping rounded-full bg-primary-foreground/60 opacity-75" />
            <span className="relative inline-flex size-1.5 rounded-full bg-primary-foreground" />
          </span>
          {count}
        </span>
      ) : null}
      <ChevronDown
        className={cn(
          'size-3.5 transition-transform duration-200',
          open && 'rotate-180',
        )}
      />
    </Button>
  )
}

// ─────────────────────────────────────────────────────────────────
// Panel scaffolding
// ─────────────────────────────────────────────────────────────────

// Outer card that wraps a filter form. Animates open with a
// content-visible transition so it doesn't pop. Renders the header
// row (title + summary + clear-all) and a footer slot for actions.
export function FilterPanel({
  open,
  title = 'Filter results',
  description,
  count = 0,
  onClear,
  onClose,
  footer,
  children,
}) {
  if (!open) return null
  return (
    <Card className="overflow-hidden border-border/70 bg-gradient-to-b from-card to-muted/30 shadow-sm shadow-black/5 ring-1 ring-foreground/5 animate-in fade-in slide-in-from-top-1 duration-200">
      <div className="flex items-start justify-between gap-3 border-b border-border/60 bg-card/40 px-4 py-3">
        <div className="flex items-center gap-2.5">
          <span className="flex size-7 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <Filter className="size-3.5" />
          </span>
          <div>
            <p className="text-sm font-semibold leading-tight text-foreground">{title}</p>
            {description ? (
              <p className="mt-0.5 text-[11px] leading-tight text-muted-foreground">
                {description}
              </p>
            ) : null}
          </div>
        </div>
        <div className="flex items-center gap-1">
          {count > 0 ? (
            <span className="hidden items-center gap-1 rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-primary sm:inline-flex">
              {count} active
            </span>
          ) : null}
          {onClear ? (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={onClear}
              disabled={count === 0}
              className="h-7 gap-1 px-2 text-xs text-muted-foreground hover:text-foreground"
            >
              <X className="size-3" />
              Clear
            </Button>
          ) : null}
          {onClose ? (
            <Button
              type="button"
              variant="ghost"
              size="icon-xs"
              onClick={onClose}
              className="text-muted-foreground hover:text-foreground"
              title="Close filter panel"
            >
              <X className="size-3.5" />
              <span className="sr-only">Close filter panel</span>
            </Button>
          ) : null}
        </div>
      </div>
      <CardContent className="px-4 py-4">
        <div className="flex flex-col gap-5">{children}</div>
      </CardContent>
      {footer ? (
        <CardFooter className="flex items-center justify-end gap-2 border-t border-border/60 bg-muted/20 px-4 py-2.5">
          {footer}
        </CardFooter>
      ) : null}
    </Card>
  )
}

// Section grouping inside FilterPanel. Pass an icon + label to give
// the user a sense of "where am I" while scanning a long panel. The
// children render in a responsive grid so adjacent fields line up.
//
// `columns` controls the inner grid width (1, 2, 3). Most sections
// want 2 on tablet+ and 3 on lg.
export function FilterSection({
  icon: Icon,
  label,
  hint,
  columns = 2,
  children,
  className,
}) {
  const colClass =
    columns === 3
      ? 'sm:grid-cols-2 lg:grid-cols-3'
      : columns === 2
        ? 'sm:grid-cols-2'
        : ''
  return (
    <section className={cn('space-y-2.5', className)}>
      <header className="flex items-center gap-2">
        {Icon ? (
          <Icon className="size-3 text-muted-foreground/80" />
        ) : null}
        <span className="text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground/90">
          {label}
        </span>
        <span className="h-px flex-1 bg-gradient-to-r from-border/80 to-transparent" />
        {hint ? (
          <span className="text-[10px] font-normal normal-case tracking-normal text-muted-foreground/70">
            {hint}
          </span>
        ) : null}
      </header>
      <div className={cn('grid gap-3', colClass)}>{children}</div>
    </section>
  )
}

// Standardised label + control wrapper. Use this for every field in
// a FilterSection so labels, spacing, and required-state styling
// stay consistent across panels.
export function FilterField({ label, hint, span, htmlFor, children, className }) {
  const spanClass =
    span === 'full'
      ? 'sm:col-span-2 lg:col-span-3'
      : span === 'wide'
        ? 'lg:col-span-2'
        : ''
  return (
    <div className={cn('space-y-1.5', spanClass, className)}>
      {label ? (
        <Label
          htmlFor={htmlFor}
          className="flex items-center justify-between gap-2 text-[11px] font-medium leading-none text-foreground/80"
        >
          <span>{label}</span>
          {hint ? (
            <span className="text-[10px] font-normal text-muted-foreground/70">
              {hint}
            </span>
          ) : null}
        </Label>
      ) : null}
      {children}
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────
// Inputs
// ─────────────────────────────────────────────────────────────────

// Free-text filter input. Shows a leading search icon, a clear button
// when there's content, and debounces commits so the filter only
// re-queries the backend after the user stops typing.
//
// `value` is the committed value (what the parent shows in the URL
// or sends to the server). `onCommit` fires after `debounceMs` of
// quiet, or immediately on Enter / blur / clear. Internal state
// resets when the parent value changes externally (e.g. Clear all).
export function TextFilter({
  id,
  value,
  onCommit,
  placeholder,
  debounceMs = 280,
  className,
}) {
  const [draft, setDraft] = useState(value ?? '')
  const lastCommittedRef = useRef(value ?? '')

  useEffect(() => {
    if ((value ?? '') !== lastCommittedRef.current) {
      lastCommittedRef.current = value ?? ''
      setDraft(value ?? '')
    }
  }, [value])

  useEffect(() => {
    if (draft === lastCommittedRef.current) return undefined
    const handle = setTimeout(() => {
      lastCommittedRef.current = draft
      onCommit(draft)
    }, debounceMs)
    return () => clearTimeout(handle)
  }, [draft, debounceMs, onCommit])

  const commitNow = (next) => {
    lastCommittedRef.current = next
    setDraft(next)
    onCommit(next)
  }

  return (
    <div className={cn('relative', className)}>
      <Search className="pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground/80" />
      <Input
        id={id}
        value={draft}
        onChange={(event) => setDraft(event.target.value)}
        onBlur={() => {
          if (draft !== lastCommittedRef.current) commitNow(draft)
        }}
        onKeyDown={(event) => {
          if (event.key === 'Enter') {
            event.preventDefault()
            commitNow(draft)
          }
          if (event.key === 'Escape' && draft) {
            event.preventDefault()
            commitNow('')
          }
        }}
        placeholder={placeholder}
        className="h-8 pl-8 pr-7 text-sm"
      />
      {draft ? (
        <button
          type="button"
          onClick={() => commitNow('')}
          className="absolute right-1.5 top-1/2 inline-flex size-5 -translate-y-1/2 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          aria-label="Clear"
        >
          <X className="size-3" />
        </button>
      ) : null}
    </div>
  )
}

// Two date inputs side-by-side. Inline-validates from > to so the
// user notices before submitting. The label gets a small calendar
// icon by default; pass `icon={null}` to omit it.
export function DateRangeField({
  label,
  from,
  to,
  onFromChange,
  onToChange,
  icon = CalendarRange,
  hint,
}) {
  const isInvalid = from && to && from > to
  const IconComp = icon
  return (
    <div className="space-y-1.5">
      {label ? (
        <Label className="flex items-center justify-between gap-2 text-[11px] font-medium leading-none text-foreground/80">
          <span className="flex items-center gap-1.5">
            {IconComp ? (
              <IconComp className="size-3 text-muted-foreground/80" />
            ) : null}
            {label}
          </span>
          {hint ? (
            <span className="text-[10px] font-normal text-muted-foreground/70">
              {hint}
            </span>
          ) : null}
        </Label>
      ) : null}
      <div className="group relative grid grid-cols-[1fr_auto_1fr] items-center gap-1.5 rounded-lg border border-input bg-background px-1 py-1 transition-colors focus-within:border-ring focus-within:ring-3 focus-within:ring-ring/30">
        <Input
          type="date"
          value={from}
          onChange={(event) => onFromChange(event.target.value)}
          className="h-7 border-0 bg-transparent px-1.5 text-xs shadow-none focus-visible:ring-0"
          aria-label={`${label || 'Range'} from`}
        />
        <span className="text-[11px] font-medium text-muted-foreground/70">→</span>
        <Input
          type="date"
          value={to}
          onChange={(event) => onToChange(event.target.value)}
          className="h-7 border-0 bg-transparent px-1.5 text-xs shadow-none focus-visible:ring-0"
          aria-label={`${label || 'Range'} to`}
        />
      </div>
      {isInvalid ? (
        <p className="text-[11px] text-destructive">From date is after To date.</p>
      ) : null}
    </div>
  )
}

// Generic pill segmented control. Use for short, mutually-exclusive
// option sets (gender, match mode, view toggles). Renders as a row
// of tabs inside a single rounded shell. Keyboard navigation comes
// from native button + role="radio".
//
// `options` shape: [{ value, label, icon? }]
// `fullWidth` makes each segment flex-1 (good for in-panel use).
export function SegmentedControl({
  value,
  onChange,
  options,
  ariaLabel = 'Segmented control',
  fullWidth = false,
  size = 'sm',
}) {
  const heightClass = size === 'sm' ? 'h-7' : 'h-8'
  const paddingClass = size === 'sm' ? 'px-2.5' : 'px-3'
  return (
    <div
      role="radiogroup"
      aria-label={ariaLabel}
      className={cn(
        'inline-flex shrink-0 items-stretch rounded-lg border border-input bg-muted/30 p-0.5 text-xs',
        fullWidth && 'flex w-full',
      )}
    >
      {options.map((opt) => {
        const isActive = value === opt.value
        const Icon = opt.icon
        return (
          <button
            key={opt.value || 'any'}
            type="button"
            role="radio"
            aria-checked={isActive}
            onClick={() => onChange(opt.value)}
            className={cn(
              'inline-flex items-center justify-center gap-1 rounded-md font-medium transition-all',
              heightClass,
              paddingClass,
              fullWidth && 'flex-1',
              isActive
                ? 'bg-background text-foreground shadow-sm ring-1 ring-foreground/10'
                : 'text-muted-foreground hover:text-foreground',
            )}
          >
            {isActive ? <Check className="size-3" /> : null}
            {Icon ? <Icon className="size-3" /> : null}
            {opt.label}
          </button>
        )
      })}
    </div>
  )
}

// Any/all match mode toggle. Wraps SegmentedControl with the
// project-standard option set so the styling stays uniform.
export function MatchModeToggle({
  value,
  onChange,
  ariaLabel = 'Match mode',
  options = [
    { value: 'any', label: 'Match any' },
    { value: 'all', label: 'Match all' },
  ],
}) {
  return (
    <SegmentedControl
      value={value}
      onChange={onChange}
      options={options}
      ariaLabel={ariaLabel}
    />
  )
}

// Tag-style filter row: TagsInput + any/all toggle + a help line.
// Used for tags, keywords, person types — anything where the user
// picks several values and needs to choose between any/all match.
export function MultiValueFilter({
  label,
  placeholder,
  values,
  matchMode,
  onValuesChange,
  onMatchChange,
  helpText,
  span = 'full',
}) {
  return (
    <FilterField label={label} span={span}>
      <div className="flex flex-col gap-2 sm:flex-row sm:items-start">
        <div className="flex-1">
          <TagsInput
            value={values}
            onChange={onValuesChange}
            placeholder={placeholder}
          />
        </div>
        <MatchModeToggle
          value={matchMode}
          onChange={onMatchChange}
          ariaLabel={`${label} match mode`}
        />
      </div>
      {helpText ? (
        <p className="text-[11px] leading-snug text-muted-foreground/80">{helpText}</p>
      ) : null}
    </FilterField>
  )
}

// ─────────────────────────────────────────────────────────────────
// Active-filter chips strip
// ─────────────────────────────────────────────────────────────────

// `chips` shape: [{ key, label, value?, tone?, onRemove }]
//   - tone: 'default' | 'sort' | 'date' | 'tag' | 'choice' — colours
//           the chip so the user can visually group what's filtering
//           at a glance.
//   - label: a short prefix ("Tag", "Created", "Sort")
//   - value: the actual value; if omitted, the label stands alone
//
// `onClearAll` shows an extra "Clear all" pill at the end.
const TONE_CLASSES = {
  default: 'border-border/70 bg-muted/40 text-foreground hover:bg-muted/60',
  sort: 'border-blue-500/30 bg-blue-500/10 text-blue-700 dark:text-blue-300 hover:bg-blue-500/15',
  date: 'border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-300 hover:bg-amber-500/15',
  tag: 'border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-500/15',
  choice: 'border-violet-500/30 bg-violet-500/10 text-violet-700 dark:text-violet-300 hover:bg-violet-500/15',
  text: 'border-sky-500/30 bg-sky-500/10 text-sky-700 dark:text-sky-300 hover:bg-sky-500/15',
}

export function FilterChips({ chips, onClearAll, className }) {
  if (!chips || chips.length === 0) return null
  return (
    <div
      className={cn(
        'flex flex-wrap items-center gap-1.5 animate-in fade-in duration-150',
        className,
      )}
    >
      {chips.map((chip) => {
        const tone = TONE_CLASSES[chip.tone] ?? TONE_CLASSES.default
        const fullLabel = chip.value ? `${chip.label}: ${chip.value}` : chip.label
        return (
          <span
            key={chip.key}
            className={cn(
              'group/chip inline-flex max-w-[260px] items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-medium transition-colors',
              tone,
            )}
          >
            <span className="truncate">
              {chip.value ? (
                <>
                  <span className="opacity-70">{chip.label}:</span>{' '}
                  <span className="font-semibold">{chip.value}</span>
                </>
              ) : (
                chip.label
              )}
            </span>
            <button
              type="button"
              onClick={chip.onRemove}
              className="-mr-1 inline-flex size-4 shrink-0 items-center justify-center rounded-full text-current/70 transition-colors hover:bg-foreground/10 hover:text-current"
              aria-label={`Clear ${fullLabel}`}
            >
              <X className="size-2.5" />
            </button>
          </span>
        )
      })}
      {onClearAll ? (
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={onClearAll}
          className="h-6 gap-1 px-2 text-[11px] text-muted-foreground hover:text-foreground"
        >
          <X className="size-3" />
          Clear all
        </Button>
      ) : null}
    </div>
  )
}
