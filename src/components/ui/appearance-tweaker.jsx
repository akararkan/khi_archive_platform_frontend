// AppearanceTweaker — single floating control mounted once at the
// app root. Lets the user retune the entire UI without leaving the
// page they're on:
//
//   - Mode      Light / System / Dark
//   - Accent    Eight curated oklch swatches (primary + ring + sidebar)
//   - Font      Five system-friendly stacks (no extra downloads)
//   - Radius    Four corner stops, sharp → round
//
// All four controls write through the same useAppearance() store, so
// changes land instantly and persist to localStorage. The Reset link
// sets every dimension back to the bundled default.
//
// Visually it's a floating circular trigger pinned to the top-right
// of the viewport. The trigger wears a small chip in the colour of
// the current accent so users can see what's active without opening
// the panel. Clicking opens a Base UI popover anchored below.

import { useId } from 'react'
import {
  Check,
  Monitor,
  Moon,
  Palette,
  RotateCcw,
  Sun,
  Type,
} from 'lucide-react'
import { Popover } from '@base-ui/react/popover'

import { Button } from '@/components/ui/button'
import { useAppearance } from '@/lib/appearance-context.js'
import { cn } from '@/lib/utils'

const MODE_OPTIONS = [
  { key: 'light',  label: 'Light',  icon: Sun     },
  { key: 'system', label: 'System', icon: Monitor },
  { key: 'dark',   label: 'Dark',   icon: Moon    },
]

// ─────────────────────────────────────────────────────────────────
// Sub-controls
// ─────────────────────────────────────────────────────────────────

function Section({ icon: Icon, label, children }) {
  return (
    <section className="space-y-2">
      <div className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
        {Icon ? <Icon className="size-3" /> : null}
        <span>{label}</span>
      </div>
      {children}
    </section>
  )
}

function ModeSegmented({ value, onChange }) {
  const groupId = useId()
  return (
    <div
      role="radiogroup"
      aria-label="Theme mode"
      className="relative grid grid-cols-3 gap-1 rounded-xl border border-border/70 bg-muted/40 p-1 shadow-inner shadow-black/5"
    >
      {MODE_OPTIONS.map((option) => {
        const ModeIcon = option.icon
        const selected = value === option.key
        return (
          <button
            key={option.key}
            id={`${groupId}-${option.key}`}
            type="button"
            role="radio"
            aria-checked={selected}
            onClick={() => onChange(option.key)}
            className={cn(
              'inline-flex items-center justify-center gap-1.5 rounded-lg px-2 py-1.5 text-xs font-medium transition-all duration-200',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50',
              selected
                ? 'bg-background text-foreground shadow-sm shadow-black/10 ring-1 ring-border/60'
                : 'text-muted-foreground hover:bg-background/60 hover:text-foreground',
            )}
          >
            <ModeIcon className="size-3.5" />
            {option.label}
          </button>
        )
      })}
    </div>
  )
}

function AccentSwatches({ palette, value, onChange }) {
  return (
    <div role="radiogroup" aria-label="Accent colour" className="grid grid-cols-8 gap-2">
      {palette.map((accent) => {
        const selected = accent.key === value
        return (
          <button
            key={accent.key}
            type="button"
            role="radio"
            aria-checked={selected}
            aria-label={accent.label}
            title={accent.label}
            onClick={() => onChange(accent.key)}
            className={cn(
              'group relative inline-flex aspect-square items-center justify-center rounded-full transition-all duration-200',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-background',
              selected ? 'scale-110' : 'hover:scale-110',
            )}
            style={selected ? { '--tw-ring-color': accent.swatch } : undefined}
          >
            <span
              aria-hidden
              className={cn(
                'block size-7 rounded-full border shadow-sm shadow-black/15 transition-all',
                selected
                  ? 'border-background ring-2 ring-offset-2 ring-offset-background'
                  : 'border-black/10 dark:border-white/10',
              )}
              style={{
                backgroundColor: accent.swatch,
                ...(selected ? { '--tw-ring-color': accent.swatch } : null),
              }}
            />
            {selected ? (
              <Check
                aria-hidden
                className="pointer-events-none absolute size-3.5 text-white drop-shadow-[0_1px_1px_rgba(0,0,0,0.4)]"
                strokeWidth={3}
              />
            ) : null}
          </button>
        )
      })}
    </div>
  )
}

function FontPicker({ palette, value, onChange }) {
  return (
    <div role="radiogroup" aria-label="Font" className="grid grid-cols-5 gap-1.5">
      {palette.map((font) => {
        const selected = font.key === value
        return (
          <button
            key={font.key}
            type="button"
            role="radio"
            aria-checked={selected}
            title={font.label}
            onClick={() => onChange(font.key)}
            className={cn(
              'group flex flex-col items-center justify-center gap-1 rounded-xl border px-1 pb-1.5 pt-2 transition-all duration-200',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50',
              selected
                ? 'border-primary/60 bg-primary/10 text-foreground shadow-sm shadow-black/5'
                : 'border-border/70 bg-background text-muted-foreground hover:-translate-y-0.5 hover:border-foreground/30 hover:text-foreground',
            )}
          >
            <span
              className={cn(
                'text-lg font-semibold leading-none transition-colors',
                selected ? 'text-primary' : 'text-foreground',
              )}
              style={{ fontFamily: font.stack }}
            >
              {font.sample}
            </span>
            <span className="text-[9px] font-semibold uppercase tracking-wider">
              {font.label}
            </span>
          </button>
        )
      })}
    </div>
  )
}

function RadiusPicker({ palette, value, onChange }) {
  return (
    <div role="radiogroup" aria-label="Corner radius" className="grid grid-cols-4 gap-1.5">
      {palette.map((radius) => {
        const selected = radius.key === value
        return (
          <button
            key={radius.key}
            type="button"
            role="radio"
            aria-checked={selected}
            title={radius.label}
            onClick={() => onChange(radius.key)}
            className={cn(
              'group flex flex-col items-center justify-center gap-1.5 rounded-xl border px-1 pb-1.5 pt-2 transition-all duration-200',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50',
              selected
                ? 'border-primary/60 bg-primary/10 text-foreground shadow-sm shadow-black/5'
                : 'border-border/70 bg-background text-muted-foreground hover:-translate-y-0.5 hover:border-foreground/30 hover:text-foreground',
            )}
          >
            <span
              aria-hidden
              className={cn(
                'block h-5 w-7 border-2 transition-colors',
                selected ? 'border-primary' : 'border-current',
              )}
              style={{ borderRadius: radius.value }}
            />
            <span className="text-[9px] font-semibold uppercase tracking-wider">
              {radius.label}
            </span>
          </button>
        )
      })}
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────
// The trigger + panel
// ─────────────────────────────────────────────────────────────────

export function AppearanceTweaker() {
  const { state, update, reset, accents, fonts, radii, resolved } = useAppearance()
  const currentAccent = accents.find((a) => a.key === state.accent) ?? accents[0]
  const currentMode = MODE_OPTIONS.find((m) => m.key === state.mode) ?? MODE_OPTIONS[1]
  const ModeIcon = currentMode.icon

  return (
    <Popover.Root>
      <Popover.Trigger
        type="button"
        aria-label="Customise appearance"
        title="Customise appearance"
        className={cn(
          'fixed right-4 top-4 z-[110] inline-flex size-10 items-center justify-center rounded-full border border-border/80 bg-card/90 text-foreground shadow-md shadow-black/5 backdrop-blur transition-all',
          'hover:scale-105 hover:bg-card hover:shadow-lg hover:shadow-black/10',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/60 focus-visible:ring-offset-2 focus-visible:ring-offset-background',
          'active:scale-95 data-[popup-open]:scale-95 data-[popup-open]:ring-2 data-[popup-open]:ring-offset-2 data-[popup-open]:ring-offset-background',
        )}
        style={{ '--tw-ring-color': currentAccent.swatch }}
      >
        <Palette className="size-[18px]" />
        {/* Live accent dot — sits on the bottom-right corner of the
            trigger so the user can see at a glance which colour is
            currently set without opening the panel. */}
        <span
          aria-hidden
          className="absolute -bottom-0.5 -right-0.5 block size-3 rounded-full border-2 border-card shadow-sm"
          style={{ backgroundColor: currentAccent.swatch }}
        />
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Positioner sideOffset={12} side="bottom" align="end" className="z-[120]">
          <Popover.Popup
            className={cn(
              'w-[22rem] origin-[var(--transform-origin)] overflow-hidden rounded-2xl border border-border/80 bg-popover text-popover-foreground shadow-2xl shadow-black/25 outline-none ring-1 ring-black/5',
              'data-[starting-style]:scale-[0.96] data-[starting-style]:opacity-0',
              'data-[ending-style]:scale-[0.96] data-[ending-style]:opacity-0',
              'transition-[opacity,transform] duration-200 ease-out',
            )}
          >
            {/* Header */}
            <div className="flex items-start justify-between gap-2 px-4 pb-3 pt-4">
              <div className="flex items-center gap-2.5">
                <div
                  className="flex size-9 items-center justify-center rounded-xl text-white shadow-sm shadow-black/20"
                  style={{ backgroundColor: currentAccent.swatch }}
                >
                  <Palette className="size-[18px]" />
                </div>
                <div className="flex flex-col">
                  <Popover.Title className="text-sm font-semibold leading-none tracking-tight">
                    Appearance
                  </Popover.Title>
                  <Popover.Description className="mt-1 text-[11px] leading-snug text-muted-foreground">
                    Personalise the workspace.
                  </Popover.Description>
                </div>
              </div>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={reset}
                className="-mr-1 h-7 gap-1 px-2 text-[11px] text-muted-foreground hover:text-foreground"
                title="Reset to defaults"
              >
                <RotateCcw className="size-3" />
                Reset
              </Button>
            </div>

            {/* Live preview chip strip — at-a-glance summary of current
                values; hidden on the smallest popover widths. */}
            <div className="mx-4 mb-3 flex flex-wrap items-center gap-1 rounded-lg border border-border/60 bg-muted/30 px-2 py-1.5 text-[10px] font-medium text-muted-foreground">
              <span className="inline-flex items-center gap-1 text-foreground/80">
                <ModeIcon className="size-3" />
                {currentMode.label}
              </span>
              <span className="text-border">•</span>
              <span className="inline-flex items-center gap-1 text-foreground/80">
                <span
                  aria-hidden
                  className="block size-2.5 rounded-full"
                  style={{ backgroundColor: currentAccent.swatch }}
                />
                {currentAccent.label}
              </span>
              <span className="text-border">•</span>
              <span className="text-foreground/80" style={{ fontFamily: resolved.font.stack }}>
                {resolved.font.label}
              </span>
              <span className="text-border">•</span>
              <span className="text-foreground/80">{resolved.radius.label}</span>
            </div>

            {/* Sections separated by hairline gradients so the layout
                reads as one continuous panel rather than four boxed
                cards stacked together. */}
            <div className="space-y-4 px-4 pb-4">
              <Section icon={Sun} label="Mode">
                <ModeSegmented value={state.mode} onChange={(v) => update({ mode: v })} />
              </Section>

              <div className="h-px bg-gradient-to-r from-transparent via-border/70 to-transparent" />

              <Section icon={Palette} label="Accent">
                <AccentSwatches
                  palette={accents}
                  value={state.accent}
                  onChange={(v) => update({ accent: v })}
                />
              </Section>

              <div className="h-px bg-gradient-to-r from-transparent via-border/70 to-transparent" />

              <Section icon={Type} label="Font">
                <FontPicker palette={fonts} value={state.font} onChange={(v) => update({ font: v })} />
              </Section>

              <div className="h-px bg-gradient-to-r from-transparent via-border/70 to-transparent" />

              <Section label="Radius">
                <RadiusPicker palette={radii} value={state.radius} onChange={(v) => update({ radius: v })} />
              </Section>
            </div>
          </Popover.Popup>
        </Popover.Positioner>
      </Popover.Portal>
    </Popover.Root>
  )
}
