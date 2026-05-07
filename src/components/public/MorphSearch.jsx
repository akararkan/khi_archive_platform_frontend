import { useEffect, useRef, useState } from 'react'
import { CornerDownLeft, Search, Sparkles, X } from 'lucide-react'

import { cn } from '@/lib/utils'

// ── MorphSearch ─────────────────────────────────────────────────────────
//
// The "search experience" the user wanted — not a vanilla input. Visual
// language at a glance:
//
//   - A tall (h-14) glass card with a SLOWLY ANIMATED CONIC-GRADIENT
//     border that subtly rotates so the search always feels alive.
//   - On focus the border tightens, the glow halo behind the card blooms,
//     and the placeholder pauses cycling.
//   - When the input is empty, the placeholder cycles through a series of
//     domain-specific prompts ("Search audios…", "Find Hesen Zirek…",
//     "Browse manuscripts…") so the user always has a hint, never a void.
//   - On the right: a sparkle pill that triggers a "lucky" callback when
//     present (e.g. "Surprise me — random record"); otherwise an Enter
//     hint.
//   - Below the card: a horizontally scrollable strip of suggestion
//     chips (popular searches / recent searches) that the parent can
//     pass in. Tapping a chip submits that query immediately.
//
// All visuals are pure CSS variables + Tailwind so it inherits the
// theme-token palette, including dark mode.

const DEFAULT_PROMPTS = [
  'Search audios…',
  'Find a person, e.g. Hesen Zirek',
  'Browse manuscripts…',
  'Look up a project',
  'Try “Sulaymaniyah”',
  'Try “maqam”',
]

function MorphSearch({
  value,
  onChange,
  onSubmit,
  onSurprise,
  prompts = DEFAULT_PROMPTS,
  suggestions,
  recentSearches,
}) {
  const inputRef = useRef(null)
  const [focused, setFocused] = useState(false)
  const [promptIdx, setPromptIdx] = useState(0)

  useEffect(() => {
    if (focused || (value || '').length > 0) return undefined
    const id = setInterval(() => {
      setPromptIdx((i) => (i + 1) % prompts.length)
    }, 2400)
    return () => clearInterval(id)
  }, [focused, value, prompts.length])

  const submit = (e) => {
    e?.preventDefault?.()
    onSubmit?.((value || '').trim())
  }

  const submitWith = (q) => {
    onChange(q)
    // Submit on the next tick so React commits the value first.
    requestAnimationFrame(() => onSubmit?.(q))
  }

  return (
    <div className="space-y-3">
      <form onSubmit={submit} className="relative isolate">
        {/* Halo: a soft blurred bloom beneath the bar that intensifies on focus. */}
        <div
          aria-hidden="true"
          className={cn(
            'pointer-events-none absolute -inset-3 rounded-[28px] blur-2xl transition-opacity duration-500',
            focused ? 'opacity-80' : 'opacity-40',
          )}
          style={{
            background:
              'conic-gradient(from var(--morph-angle, 0deg), oklch(0.75 0.18 280) 0%, oklch(0.78 0.16 200) 25%, oklch(0.78 0.18 140) 50%, oklch(0.78 0.18 60) 75%, oklch(0.75 0.18 280) 100%)',
          }}
        />

        {/* Animated conic border. The wrapper paints the gradient; the
            inner card masks the middle so only a 1.5px ring shows. */}
        <div
          className={cn(
            'morph-search-border relative rounded-2xl p-[1.5px] transition-shadow duration-300',
            focused ? 'shadow-2xl shadow-primary/20' : 'shadow-md shadow-black/10',
          )}
        >
          <div className="relative flex h-14 items-center gap-2 rounded-[14px] bg-card/95 px-3 backdrop-blur">
            <span
              className={cn(
                'flex size-9 shrink-0 items-center justify-center rounded-xl transition-colors',
                focused
                  ? 'bg-primary/15 text-primary'
                  : 'bg-muted text-muted-foreground',
              )}
            >
              <Search className="size-4" />
            </span>

            <div className="relative flex-1">
              <input
                ref={inputRef}
                type="search"
                value={value || ''}
                onChange={(e) => onChange(e.target.value)}
                onFocus={() => setFocused(true)}
                onBlur={() => setFocused(false)}
                placeholder=" "
                aria-label="Search the archive"
                className="peer h-10 w-full bg-transparent text-[15px] font-medium tracking-tight outline-none"
              />
              {/* Cycling placeholder — only visible when the field is empty
                  and unfocused. We render our own so we can crossfade
                  between prompts. */}
              {!value ? (
                <span
                  aria-hidden="true"
                  className={cn(
                    'pointer-events-none absolute inset-y-0 left-0 flex items-center text-[15px] font-medium tracking-tight transition-opacity duration-300',
                    focused ? 'text-muted-foreground/40' : 'text-muted-foreground',
                  )}
                >
                  {prompts[promptIdx]}
                </span>
              ) : null}
            </div>

            {value ? (
              <button
                type="button"
                onClick={() => {
                  onChange('')
                  inputRef.current?.focus()
                }}
                aria-label="Clear search"
                className="flex size-7 items-center justify-center rounded-full text-muted-foreground hover:bg-muted hover:text-foreground"
              >
                <X className="size-3.5" />
              </button>
            ) : null}

            {onSurprise ? (
              <button
                type="button"
                onClick={() => onSurprise?.()}
                title="Surprise me with a random record"
                aria-label="Surprise me"
                className="flex h-9 items-center gap-1 rounded-xl border border-border bg-background/80 px-2.5 text-xs font-medium text-foreground transition hover:border-primary/30 hover:bg-primary/5 hover:text-primary"
              >
                <Sparkles className="size-3.5" />
                Lucky
              </button>
            ) : null}

            <button
              type="submit"
              title="Search (Enter)"
              aria-label="Search"
              className={cn(
                'flex h-9 items-center gap-1 rounded-xl px-2.5 text-xs font-semibold transition',
                value
                  ? 'bg-primary text-primary-foreground shadow-sm hover:bg-primary/90'
                  : 'bg-muted text-muted-foreground',
              )}
            >
              Search
              <CornerDownLeft className="size-3.5" />
            </button>
          </div>
        </div>
      </form>

      {/* Suggestion chips — popular / recent. Horizontal scroll when wide. */}
      {Array.isArray(suggestions) && suggestions.length > 0 ? (
        <div>
          <p className="mb-1.5 px-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
            Popular
          </p>
          <div className="-mx-1 flex flex-wrap gap-1.5 px-1">
            {suggestions.map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => submitWith(s)}
                className="inline-flex items-center rounded-full border border-border bg-card-foreground/[0.04] px-2.5 py-1 text-[11px] font-medium text-foreground/85 transition hover:border-primary/30 hover:bg-primary/10 hover:text-primary"
              >
                {s}
              </button>
            ))}
          </div>
        </div>
      ) : null}
      {Array.isArray(recentSearches) && recentSearches.length > 0 ? (
        <div>
          <p className="mb-1.5 px-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
            Recent
          </p>
          <div className="-mx-1 flex flex-wrap gap-1.5 px-1">
            {recentSearches.map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => submitWith(s)}
                className="inline-flex items-center rounded-full border border-dashed border-border bg-transparent px-2.5 py-1 text-[11px] font-medium text-foreground/70 transition hover:border-primary/30 hover:bg-primary/5 hover:text-primary"
              >
                {s}
              </button>
            ))}
          </div>
        </div>
      ) : null}

      {/* Animation: rotate the conic-gradient angle continuously. */}
      <style>{`
        @property --morph-angle {
          syntax: '<angle>';
          initial-value: 0deg;
          inherits: false;
        }
        @keyframes morph-spin {
          to { --morph-angle: 360deg; }
        }
        .morph-search-border {
          background:
            conic-gradient(
              from var(--morph-angle, 0deg),
              oklch(0.78 0.18 280) 0%,
              oklch(0.78 0.16 200) 25%,
              oklch(0.78 0.18 140) 50%,
              oklch(0.78 0.18 60) 75%,
              oklch(0.78 0.18 280) 100%
            );
          animation: morph-spin 8s linear infinite;
        }
        @media (prefers-reduced-motion: reduce) {
          .morph-search-border { animation: none; }
        }
      `}</style>
    </div>
  )
}

export { MorphSearch }
