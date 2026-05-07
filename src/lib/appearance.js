// Appearance store — single source of truth for theme mode, accent
// colour, font family, and corner radius. Pure JS so the same code
// can run inside the inline FOUC-prevention script in index.html as
// well as inside React.
//
// Why a custom store and not a context-only solution: the values
// must be applied to <html> *before* the first paint to avoid the
// classic FOUC where the page flashes the default light/neutral
// theme for one frame. The inline init in index.html duplicates the
// same logic so the server-rendered HTML is correct from byte zero.
//
// Persisted shape:
//   {
//     mode:   'system' | 'light' | 'dark',
//     accent: '<accent key>',
//     font:   '<font key>',
//     radius: '<radius key>',
//   }
//
// We never store derived values (resolved oklch, css strings); the
// store holds keys only and the apply pass resolves them. That keeps
// the persisted blob forward-compatible if the palette is tweaked.

const STORAGE_KEY = 'khi:appearance'
const SYSTEM_DARK_QUERY = '(prefers-color-scheme: dark)'

// ─────────────────────────────────────────────────────────────────
// Palettes
// ─────────────────────────────────────────────────────────────────

// Each accent ships its own light/dark resolution of:
//   - primary           (the main fill)
//   - primary-foreground (text/icon on top of primary)
//   - ring              (focus halo, sidebar accent halo)
//
// The first entry, "default", reproduces the existing neutral theme
// 1:1 so users who never open the tweaker see no change. Coloured
// accents share a hue across modes but bump lightness so the chip is
// readable against the surface in both light and dark.
//
// All values are oklch so chroma is perceptually uniform — no muddy
// "blue looks fine but pink looks wrong" at the same numeric chroma.
export const ACCENT_PALETTE = [
  {
    key: 'default',
    label: 'Slate',
    swatch: 'oklch(0.22 0 0)',
    light: { primary: 'oklch(0.22 0 0)',     primaryForeground: 'oklch(0.985 0 0)', ring: 'oklch(0.7 0 0)' },
    dark:  { primary: 'oklch(0.95 0 0)',     primaryForeground: 'oklch(0.18 0 0)',  ring: 'oklch(0.82 0 0)' },
  },
  {
    key: 'blue',
    label: 'Blue',
    swatch: 'oklch(0.58 0.18 250)',
    light: { primary: 'oklch(0.55 0.18 250)', primaryForeground: 'oklch(0.99 0 0)',  ring: 'oklch(0.65 0.16 250)' },
    dark:  { primary: 'oklch(0.70 0.17 250)', primaryForeground: 'oklch(0.18 0 0)',  ring: 'oklch(0.78 0.13 250)' },
  },
  {
    key: 'indigo',
    label: 'Indigo',
    swatch: 'oklch(0.52 0.22 275)',
    light: { primary: 'oklch(0.50 0.22 275)', primaryForeground: 'oklch(0.99 0 0)',  ring: 'oklch(0.62 0.20 275)' },
    dark:  { primary: 'oklch(0.68 0.20 275)', primaryForeground: 'oklch(0.16 0 0)',  ring: 'oklch(0.76 0.16 275)' },
  },
  {
    key: 'violet',
    label: 'Violet',
    swatch: 'oklch(0.58 0.22 300)',
    light: { primary: 'oklch(0.55 0.22 300)', primaryForeground: 'oklch(0.99 0 0)',  ring: 'oklch(0.66 0.20 300)' },
    dark:  { primary: 'oklch(0.72 0.18 300)', primaryForeground: 'oklch(0.16 0 0)',  ring: 'oklch(0.78 0.14 300)' },
  },
  {
    key: 'rose',
    label: 'Rose',
    swatch: 'oklch(0.62 0.22 15)',
    light: { primary: 'oklch(0.60 0.22 15)',  primaryForeground: 'oklch(0.99 0 0)',  ring: 'oklch(0.72 0.18 15)' },
    dark:  { primary: 'oklch(0.72 0.20 15)',  primaryForeground: 'oklch(0.16 0 0)',  ring: 'oklch(0.80 0.16 15)' },
  },
  {
    key: 'amber',
    label: 'Amber',
    swatch: 'oklch(0.78 0.16 75)',
    light: { primary: 'oklch(0.72 0.18 75)',  primaryForeground: 'oklch(0.16 0 0)',  ring: 'oklch(0.78 0.16 75)' },
    dark:  { primary: 'oklch(0.80 0.16 75)',  primaryForeground: 'oklch(0.16 0 0)',  ring: 'oklch(0.86 0.13 75)' },
  },
  {
    key: 'emerald',
    label: 'Emerald',
    swatch: 'oklch(0.62 0.16 155)',
    light: { primary: 'oklch(0.55 0.16 155)', primaryForeground: 'oklch(0.99 0 0)',  ring: 'oklch(0.66 0.14 155)' },
    dark:  { primary: 'oklch(0.72 0.14 155)', primaryForeground: 'oklch(0.16 0 0)',  ring: 'oklch(0.80 0.11 155)' },
  },
  {
    key: 'teal',
    label: 'Teal',
    swatch: 'oklch(0.62 0.13 195)',
    light: { primary: 'oklch(0.55 0.13 195)', primaryForeground: 'oklch(0.99 0 0)',  ring: 'oklch(0.66 0.11 195)' },
    dark:  { primary: 'oklch(0.72 0.12 195)', primaryForeground: 'oklch(0.16 0 0)',  ring: 'oklch(0.80 0.09 195)' },
  },
]

// Font families — every entry is a plain CSS stack so nothing has to
// be downloaded except Geist (already bundled). System / Serif /
// Mono / Rounded use whatever the OS provides, which is the most
// reliable way to ship alternative typefaces without bloating the
// bundle.
export const FONT_PALETTE = [
  {
    key: 'geist',
    label: 'Geist',
    sample: 'Aa',
    stack: '"Geist Variable", ui-sans-serif, system-ui, sans-serif',
  },
  {
    key: 'system',
    label: 'System',
    sample: 'Aa',
    stack: 'ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif',
  },
  {
    key: 'rounded',
    label: 'Rounded',
    sample: 'Aa',
    stack: '"SF Pro Rounded", "Hiragino Maru Gothic ProN", "Quicksand", "Comfortaa", "Manjari", ui-rounded, system-ui, sans-serif',
  },
  {
    key: 'serif',
    label: 'Serif',
    sample: 'Aa',
    stack: '"Iowan Old Style", "Apple Garamond", Georgia, "Times New Roman", ui-serif, serif',
  },
  {
    key: 'mono',
    label: 'Mono',
    sample: 'Aa',
    stack: 'ui-monospace, "SF Mono", "JetBrains Mono", Menlo, Consolas, monospace',
  },
]

// Corner radius stops. Keep these named, not numeric — the chip
// labels are the contract, the rem values can shift later without
// breaking persisted preferences.
export const RADIUS_PALETTE = [
  { key: 'sharp',  label: 'Sharp',  value: '0.25rem' },
  { key: 'subtle', label: 'Subtle', value: '0.5rem'  },
  { key: 'normal', label: 'Normal', value: '0.625rem' }, // current CSS default
  { key: 'round',  label: 'Round',  value: '1rem'    },
]

export const DEFAULT_APPEARANCE = Object.freeze({
  mode: 'system',
  accent: 'default',
  font: 'geist',
  radius: 'normal',
})

// ─────────────────────────────────────────────────────────────────
// Resolution + apply
// ─────────────────────────────────────────────────────────────────

function findOrFirst(palette, key) {
  return palette.find((entry) => entry.key === key) ?? palette[0]
}

function prefersDark() {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
    return false
  }
  return window.matchMedia(SYSTEM_DARK_QUERY).matches
}

// Translates the persisted state into the actual values that should
// land on <html> right now. Pure — no DOM access — so the same
// resolver is reused by the inline boot script.
export function resolveAppearance(state) {
  const merged = { ...DEFAULT_APPEARANCE, ...(state || {}) }
  const accent = findOrFirst(ACCENT_PALETTE, merged.accent)
  const font = findOrFirst(FONT_PALETTE, merged.font)
  const radius = findOrFirst(RADIUS_PALETTE, merged.radius)
  const isDark = merged.mode === 'dark' || (merged.mode === 'system' && prefersDark())
  const tones = isDark ? accent.dark : accent.light
  return {
    state: merged,
    isDark,
    cssVars: {
      '--primary': tones.primary,
      '--primary-foreground': tones.primaryForeground,
      '--ring': tones.ring,
      '--sidebar-primary': tones.primary,
      '--sidebar-primary-foreground': tones.primaryForeground,
      '--sidebar-ring': tones.ring,
      '--font-sans': font.stack,
      '--font-heading': font.stack,
      '--radius': radius.value,
    },
    accent,
    font,
    radius,
  }
}

// Pushes the resolved values onto <html>. Idempotent: calling it
// twice with the same state is a no-op visually.
export function applyAppearance(state) {
  if (typeof document === 'undefined') return
  const root = document.documentElement
  const resolved = resolveAppearance(state)
  root.classList.toggle('dark', resolved.isDark)
  root.style.colorScheme = resolved.isDark ? 'dark' : 'light'
  root.dataset.accent = resolved.accent.key
  root.dataset.font = resolved.font.key
  root.dataset.radius = resolved.radius.key
  for (const [name, value] of Object.entries(resolved.cssVars)) {
    root.style.setProperty(name, value)
  }
}

// ─────────────────────────────────────────────────────────────────
// Persistence
// ─────────────────────────────────────────────────────────────────

export function readAppearance() {
  if (typeof window === 'undefined') return { ...DEFAULT_APPEARANCE }
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    if (!raw) return { ...DEFAULT_APPEARANCE }
    const parsed = JSON.parse(raw)
    if (!parsed || typeof parsed !== 'object') return { ...DEFAULT_APPEARANCE }
    return { ...DEFAULT_APPEARANCE, ...parsed }
  } catch {
    return { ...DEFAULT_APPEARANCE }
  }
}

export function writeAppearance(state) {
  if (typeof window === 'undefined') return
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
  } catch {
    // localStorage can throw in private mode / over quota; ignore —
    // the runtime state is still correct, we just won't persist.
  }
}

// ─────────────────────────────────────────────────────────────────
// Subscriptions — system-mode follow + cross-tab sync
// ─────────────────────────────────────────────────────────────────

// Fires `onChange` whenever something outside this tab caused the
// effective appearance to shift: the OS flipped its dark-mode
// preference (only matters when `mode === 'system'`), or another tab
// wrote a new persisted blob. Returns an unsubscribe.
export function subscribeAppearance(getState, onChange) {
  if (typeof window === 'undefined') return () => {}

  const mq = window.matchMedia(SYSTEM_DARK_QUERY)
  const handleSystem = () => {
    if (getState().mode === 'system') onChange()
  }
  const handleStorage = (event) => {
    if (event.key === STORAGE_KEY) onChange()
  }

  if (typeof mq.addEventListener === 'function') {
    mq.addEventListener('change', handleSystem)
  } else {
    mq.addListener(handleSystem)
  }
  window.addEventListener('storage', handleStorage)

  return () => {
    if (typeof mq.removeEventListener === 'function') {
      mq.removeEventListener('change', handleSystem)
    } else {
      mq.removeListener(handleSystem)
    }
    window.removeEventListener('storage', handleStorage)
  }
}

// Convenience for boot — read + apply in one shot. Used by main.jsx
// (and re-exported as the replacement for the old syncThemeWithSystem
// helper so existing imports keep working during the swap).
export function bootAppearance() {
  const state = readAppearance()
  applyAppearance(state)
  return state
}
