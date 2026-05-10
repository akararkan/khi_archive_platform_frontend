import {
  AudioLines,
  Camera,
  Film,
  FolderOpen,
  Layers,
  Play,
  ScrollText,
} from 'lucide-react'

import { cn } from '@/lib/utils'
import { personImageSrc, personInitials } from '@/components/public/public-helpers'

// ── MediaCover ──────────────────────────────────────────────────────────
//
// One adaptive thumbnail used by every result card. Each kind speaks a
// distinct visual language so users can tell types apart at a glance:
//
//   audio    Hatched secondary surface, label pill ("audio · 4:18"),
//            translucent waveform bars across the bottom, primary play
//            button bottom-right.
//   video    Hatched surface, label pill, primary play button.
//   text     Manuscript page — stacked ruled lines in the muted token,
//            the way a transcribed page looks at thumbnail size.
//   image    Hatched placeholder with a "photograph" pill (we substitute
//            the real image at the ResultCard level when one exists).
//   project  Quartered grid of the four media-type icons with their
//            counts — a project's content profile at a glance.
//   category Bold initial letter on a tinted gradient.
//   person   Centered circular avatar (real photo or initials) on a
//            soft secondary→muted gradient.
//
// All variants use only theme tokens (--primary/--muted/--secondary/...)
// so dark mode, the appearance tweaker, and any future paper aesthetic
// keep working.

const KIND_LABEL = {
  audio: 'audio',
  video: 'video',
  text: 'text',
  image: 'photograph',
  project: 'project',
  category: 'category',
  person: 'person',
}

function MediaCover({
  kind,
  title,
  image,
  person,
  duration,
  audioCount,
  videoCount,
  textCount,
  imageCount,
}) {
  switch (kind) {
    case 'audio':
      return <AudioCover duration={duration} />
    case 'video':
      return <VideoCover duration={duration} />
    case 'text':
      return <TextCover />
    case 'image':
      return <ImageCover image={image} title={title} />
    case 'project':
      return (
        <ProjectCover
          title={title}
          audioCount={audioCount}
          videoCount={videoCount}
          textCount={textCount}
          imageCount={imageCount}
        />
      )
    case 'category':
      return <CategoryCover title={title} />
    case 'person':
      return <PersonCover image={image || personImageSrc(person)} title={title} />
    default:
      return <Hatch />
  }
}

// ── KindGlyph ──────────────────────────────────────────────────────────
//
// Small primary-tinted icon tile pinned to the bottom-left of every
// non-person cover. Gives each card a consistent kind anchor regardless
// of what's painted behind it (waveform, film strip, page, photo, …) —
// audio's waveform was the only kind doing this before; now every kind
// carries the same visual language.
function KindGlyph({ Icon, label }) {
  return (
    <span
      className="absolute bottom-2.5 left-2.5 z-[5] inline-flex items-center gap-1.5 rounded-full border border-border/80 bg-background/85 py-0.5 pl-1.5 pr-2 text-[10px] font-semibold uppercase tracking-[0.12em] text-foreground shadow-sm backdrop-blur-sm"
      title={label}
    >
      <span className="grid size-4 place-items-center rounded-full bg-primary/15 text-primary">
        {Icon ? <Icon className="size-2.5" strokeWidth={2.5} /> : null}
      </span>
      {label}
    </span>
  )
}

// ── Shared backdrop ────────────────────────────────────────────────────

// Diagonal hatch pattern that anchors the audio/video/image placeholders.
// Uses theme tokens so it behaves under any aesthetic.
function Hatch({ className }) {
  return (
    <div
      className={cn('absolute inset-0', className)}
      aria-hidden="true"
      style={{
        backgroundImage:
          'repeating-linear-gradient(45deg, var(--secondary) 0 6px, var(--muted) 6px 12px)',
      }}
    />
  )
}

function PhPill({ children }) {
  return (
    <span className="rounded-md border border-border bg-background px-2 py-1 font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
      {children}
    </span>
  )
}

function PlayBadge({ size = 'md' }) {
  return (
    <button
      type="button"
      onClick={(e) => e.stopPropagation()}
      aria-label="Play"
      className={cn(
        'absolute bottom-2.5 right-2.5 grid place-items-center rounded-full bg-primary text-primary-foreground shadow-[0_4px_12px_oklch(0_0_0_/_0.18)] transition-transform group-hover/card:scale-110',
        size === 'lg' ? 'size-12' : 'size-9',
      )}
    >
      <Play className="ml-0.5 size-3.5 fill-current" />
    </button>
  )
}

// ── Audio: waveform + duration pill + glyph + play ─────────────────────
//
// Stable, deterministic bars (no per-render randomness) so the card
// doesn't twitch on re-render. The waveform is the audio cover's
// signature visual — audible-shape-without-sound.
function AudioCover({ duration }) {
  const bars = []
  const N = 32
  for (let i = 0; i < N; i += 1) {
    const h =
      20 +
      Math.abs(Math.sin(i * 0.7)) * 60 +
      Math.abs(Math.sin(i * 1.9)) * 18
    bars.push(Math.min(98, h))
  }
  return (
    <>
      <Hatch />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-3.5 top-1/2 flex h-2/5 -translate-y-1/2 items-end gap-[2px]"
      >
        {bars.map((h, i) => (
          <i
            key={i}
            className="block flex-1 rounded-[1px] bg-primary/45"
            style={{ height: `${h}%`, minHeight: '3px' }}
          />
        ))}
      </div>
      {duration ? (
        <DurationPill kind="audio" duration={duration} />
      ) : (
        <KindGlyph Icon={AudioLines} label="Audio" />
      )}
      <PlayBadge />
    </>
  )
}

// ── Video: cinematic gradient + halo'd play badge + timeline ───────────
//
// Soft cinematic gradient (warm shadow → light highlight) creates a
// sense of depth without going dark. The play badge sits centered with
// a soft primary halo behind it — that's the only play affordance on
// the cover; the corner PlayBadge is intentionally not used here so
// there's a single, confident focal point. A thin progress-style
// timeline runs along the bottom with three position ticks, hinting at
// "this has a runtime" without claiming a specific frame as the cover.
function VideoCover({ duration }) {
  return (
    <div
      className="relative size-full overflow-hidden"
      style={{
        background:
          'linear-gradient(160deg, oklch(0.94 0.015 230) 0%, oklch(0.86 0.04 220) 55%, oklch(0.78 0.06 215) 100%)',
      }}
    >
      {/* Soft vignette that focuses the eye on the centre play badge. */}
      <span
        aria-hidden="true"
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            'radial-gradient(circle at 50% 42%, oklch(1 0 0 / 0.55) 0%, transparent 60%)',
        }}
      />
      {/* Play affordance — large halo behind a clean primary disc. */}
      <div className="absolute inset-0 grid place-items-center">
        <span
          aria-hidden="true"
          className="absolute size-[55%] rounded-full bg-primary/15 blur-2xl"
        />
        <button
          type="button"
          onClick={(e) => e.stopPropagation()}
          aria-label="Play"
          className="relative grid size-14 place-items-center rounded-full bg-primary text-primary-foreground shadow-[0_8px_22px_-4px_oklch(0_0_0_/_0.28)] ring-4 ring-background/70 transition-transform group-hover/card:scale-[1.06]"
        >
          <Play className="ml-0.5 size-6 fill-current" />
        </button>
      </div>
      {/* Timeline strip — three ticks on a soft bar, gives the card a
          "this is a video with a runtime" cue without specifics. */}
      <div
        aria-hidden="true"
        className="absolute inset-x-5 bottom-3.5 flex items-center gap-1"
      >
        <span className="h-[3px] flex-1 rounded-full bg-foreground/15" />
        <span className="size-1.5 rounded-full bg-primary/70" />
        <span className="h-[3px] w-2 rounded-full bg-foreground/15" />
        <span className="size-1.5 rounded-full bg-foreground/30" />
        <span className="h-[3px] w-1.5 rounded-full bg-foreground/15" />
      </div>
      {duration ? (
        <DurationPill kind="video" duration={duration} />
      ) : (
        <KindGlyph Icon={Film} label="Video" />
      )}
    </div>
  )
}

// ── Text: open book — two facing pages with margins + dog-ear ──────────
//
// Two pages side-by-side suggest a bound book opened in the reader's
// hands. Each page has a slim margin rule on its outer edge and a
// stack of ruled lines that simulate transcribed text. A faint shadow
// runs down the spine (centre); a small dog-eared corner on the top-
// right gives the page tactility. Reads as "text" instantly without
// needing words.
function TextCover() {
  return (
    <div
      className="relative size-full overflow-hidden"
      style={{
        background:
          'linear-gradient(to right, oklch(0.99 0.003 90) 0%, oklch(0.97 0.008 88) 100%)',
      }}
    >
      {/* Spine shadow — gives the two pages a slight inward fold. */}
      <span
        aria-hidden="true"
        className="pointer-events-none absolute inset-y-0 left-1/2 w-3 -translate-x-1/2"
        style={{
          background:
            'linear-gradient(to right, transparent 0%, oklch(0 0 0 / 0.07) 50%, transparent 100%)',
        }}
      />
      {/* Two pages */}
      <div className="absolute inset-2 grid grid-cols-2 gap-2">
        <BookPage side="left" />
        <BookPage side="right" />
      </div>
      {/* Dog-eared corner top-right — folded triangle illusion. */}
      <span
        aria-hidden="true"
        className="absolute right-0 top-0 size-5"
        style={{
          background: 'oklch(0.94 0.005 88)',
          clipPath: 'polygon(100% 0, 0 0, 100% 100%)',
          boxShadow: '-1px 1px 2px oklch(0 0 0 / 0.07)',
        }}
      />
      <KindGlyph Icon={ScrollText} label="Text" />
    </div>
  )
}

// One half of the open-book TextCover. Slim margin rule on the outer
// edge + 6 ruled lines whose lengths follow a deliberate paragraph
// rhythm so the page looks alive without being a wall of identical
// strokes.
function BookPage({ side }) {
  const isLeft = side === 'left'
  return (
    <div className="relative h-full rounded-sm bg-background/60 px-2.5 py-3">
      {/* Margin rule on the outer edge of the page (where binding holes
          would be on a notebook). */}
      <span
        aria-hidden="true"
        className={cn(
          'absolute inset-y-3 w-px bg-rose-300/35',
          isLeft ? 'left-2' : 'right-2',
        )}
      />
      <div className={cn('flex h-full flex-col gap-[5px]', isLeft ? 'pl-3' : 'pr-3')}>
        {Array.from({ length: 6 }).map((_, i) => {
          const width =
            i === 0 ? 65 : i % 4 === 3 ? 40 : i % 2 === 0 ? 88 : 75
          const muted = i === 3
          return (
            <i
              key={i}
              className={cn(
                'block h-[4px] rounded-[1px]',
                muted ? 'bg-muted-foreground/35' : 'bg-border',
              )}
              style={{ width: `${width}%` }}
            />
          )
        })}
      </div>
    </div>
  )
}

// ── Image: photo edge-to-edge OR tilted polaroid placeholder ───────────
//
// With a real image we render it edge-to-edge with a subtle hover zoom
// and the kind glyph anchored in the corner. Without one we paint a
// soft tinted gradient and centre a slightly-tilted polaroid frame
// holding a camera icon — reads as "photograph not yet uploaded"
// without looking broken or generic.
function ImageCover({ image, title }) {
  if (image) {
    return (
      <>
        <img
          src={image}
          alt={title || ''}
          loading="lazy"
          className="size-full object-cover transition-transform duration-500 group-hover/card:scale-[1.03]"
        />
        <KindGlyph Icon={Camera} label="Photo" />
      </>
    )
  }
  return (
    <div
      className="relative size-full overflow-hidden"
      style={{
        background:
          'linear-gradient(140deg, oklch(0.95 0.025 60) 0%, oklch(0.86 0.05 50) 100%)',
      }}
    >
      {/* Soft warm highlight upper-left so the gradient feels lit. */}
      <span
        aria-hidden="true"
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            'radial-gradient(circle at 28% 22%, oklch(1 0 0 / 0.45) 0%, transparent 55%)',
        }}
      />
      {/* Polaroid frame — slightly tilted, centred. The wider
          bottom margin is the polaroid's signature handwriting space. */}
      <div className="absolute inset-0 grid place-items-center">
        <div
          className="relative aspect-[3/4] w-[58%] rounded-[3px] bg-background p-2 pb-7 shadow-[0_10px_24px_-8px_oklch(0_0_0_/_0.25),0_2px_6px_oklch(0_0_0_/_0.12)] ring-1 ring-border/70 transition-transform duration-300 group-hover/card:rotate-0"
          style={{ transform: 'rotate(-4deg)' }}
        >
          <div
            className="grid size-full place-items-center rounded-[2px]"
            style={{
              background:
                'linear-gradient(135deg, oklch(0.96 0.01 60) 0%, oklch(0.9 0.02 60) 100%)',
            }}
          >
            <Camera
              className="size-7 text-primary/70"
              strokeWidth={1.6}
            />
          </div>
        </div>
      </div>
      <KindGlyph Icon={Camera} label="Photo" />
    </div>
  )
}

// ── Project: tinted gradient + big monogram + media count strip ────────
//
// Each project gets its own colour, derived from a stable hue of the
// project name — so a wall of project cards reads as a varied,
// inviting collection rather than a grid of identical tiles. The
// monogram is the project's title initials, painted as a soft serif-
// weight watermark (high opacity, low contrast) so it sits behind any
// secondary content without dominating. The bottom strip surfaces the
// media-type counts only when they're non-zero — empty projects no
// longer display "0 0 0 0", which made every project look anaemic.
function ProjectCover({ title, audioCount, videoCount, textCount, imageCount }) {
  const hue = stableHue(title || 'project')
  const initials = projectInitials(title)
  const counts = [
    { kind: 'audio', icon: AudioLines, count: Number(audioCount) || 0 },
    { kind: 'video', icon: Film, count: Number(videoCount) || 0 },
    { kind: 'text', icon: ScrollText, count: Number(textCount) || 0 },
    { kind: 'image', icon: Camera, count: Number(imageCount) || 0 },
  ]
  const populated = counts.filter((c) => c.count > 0)

  return (
    <div
      className="relative size-full overflow-hidden"
      style={{
        background: `linear-gradient(140deg, oklch(0.96 0.03 ${hue}) 0%, oklch(0.86 0.07 ${hue}) 100%)`,
      }}
    >
      {/* Subtle radial highlight on the upper-left so the gradient
          reads as lit-from-above rather than flat colour. */}
      <span
        aria-hidden="true"
        className="pointer-events-none absolute inset-0"
        style={{
          background: `radial-gradient(circle at 25% 20%, oklch(1 0 0 / 0.55) 0%, transparent 55%)`,
        }}
      />
      {/* Monogram — sits dead-centre behind everything else as the
          card's signature visual. Slightly inset and softened so it
          plays nice with the bottom strip and the kind glyph. */}
      <span
        aria-hidden="true"
        className="absolute inset-0 grid place-items-center font-heading font-semibold tracking-tight"
        style={{
          color: `oklch(0.32 0.12 ${hue} / 0.85)`,
          fontSize: 'clamp(48px, 22%, 96px)',
          textShadow: '0 1px 0 oklch(1 0 0 / 0.4)',
        }}
      >
        {initials}
      </span>
      {/* Media-count strip — only kinds with content. Frosted-glass
          chips so they remain legible over any backdrop hue. */}
      {populated.length > 0 ? (
        <div className="absolute inset-x-3 bottom-9 flex flex-wrap items-center gap-1.5">
          {populated.map((entry) => {
            const ChipIcon = entry.icon
            return (
              <span
                key={entry.kind}
                className="inline-flex items-center gap-1 rounded-full border border-border/70 bg-background/80 px-2 py-0.5 text-[10.5px] font-semibold tabular-nums text-foreground shadow-sm backdrop-blur-sm"
              >
                {ChipIcon ? <ChipIcon className="size-2.5 text-primary" strokeWidth={2.5} /> : null}
                {entry.count.toLocaleString()}
              </span>
            )
          })}
        </div>
      ) : null}
      <KindGlyph Icon={FolderOpen} label="Project" />
    </div>
  )
}

// Up-to-3-letter initials from the project title — strips common
// "Collection" / "Vol" filler so a project named "Hasan Zirek
// Collection 2" reads as "HZ" not "HC".
function projectInitials(title) {
  if (!title) return '·'
  const filler = new Set([
    'collection', 'collections', 'coll',
    'vol', 'volume', 'vols',
    'archive', 'archives',
    'the', 'of', 'a', 'an',
    'and',
  ])
  const parts = String(title)
    .replace(/[()[\]{}]/g, ' ')
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .filter((p) => !filler.has(p.toLowerCase()))
    .filter((p) => /[\p{L}]/u.test(p))
  if (parts.length === 0) return String(title).trim().charAt(0).toUpperCase() || '·'
  return parts
    .slice(0, 2)
    .map((p) => p.charAt(0).toUpperCase())
    .join('') || '·'
}

// ── DurationPill ───────────────────────────────────────────────────────
// Tighter alternative to KindGlyph used by audio/video when a duration
// is known — packs the kind label with the runtime in one chip so we
// don't lose either signal.
function DurationPill({ kind, duration }) {
  const Icon = kind === 'video' ? Film : AudioLines
  const label = kind === 'video' ? 'Video' : 'Audio'
  return (
    <span
      className="absolute bottom-2.5 left-2.5 z-[5] inline-flex items-center gap-1.5 rounded-full border border-border/80 bg-background/85 py-0.5 pl-1.5 pr-2 text-[10.5px] font-semibold tracking-tight text-foreground shadow-sm backdrop-blur-sm"
      title={`${label} · ${duration}`}
    >
      <span className="grid size-4 place-items-center rounded-full bg-primary/15 text-primary">
        <Icon className="size-2.5" strokeWidth={2.5} />
      </span>
      <span className="uppercase tracking-[0.12em]">{label}</span>
      <span className="font-mono tabular-nums opacity-70">·</span>
      <span className="font-mono tabular-nums">{duration}</span>
    </span>
  )
}

// ── Category: monogram on tinted gradient ──────────────────────────────
function CategoryCover({ title }) {
  const initial = (title || '·').trim().charAt(0).toUpperCase()
  const hue = stableHue(title || 'category')
  return (
    <div
      className="relative size-full"
      style={{
        background: `linear-gradient(135deg, oklch(0.95 0.02 ${hue}) 0%, oklch(0.82 0.05 ${hue}) 100%)`,
      }}
    >
      <span
        className="absolute inset-0 grid place-items-center font-heading text-7xl font-semibold tracking-tight text-foreground/85"
        style={{ textShadow: '0 2px 0 rgba(255,255,255,.4)' }}
      >
        {initial}
      </span>
      <span className="absolute right-2.5 top-2.5">
        <PhPill>category</PhPill>
      </span>
    </div>
  )
}

// ── Person: centered circular avatar with subtle stage backdrop ────────
//
// When the backend serves a real profile image we render it big and
// circular, framed by a soft halo. Otherwise we paint a colored
// monogram tile keyed off the person's name so the same person always
// gets the same backdrop.
function PersonCover({ image, title }) {
  const hue = stableHue(title || 'person')
  return (
    <div
      className="absolute inset-0 grid place-items-center"
      style={{
        background: `radial-gradient(ellipse at 50% 35%, oklch(0.97 0.015 ${hue}) 0%, oklch(0.88 0.03 ${hue}) 55%, oklch(0.78 0.04 ${hue}) 100%)`,
      }}
    >
      {/* soft halo behind the avatar */}
      <span
        aria-hidden="true"
        className="absolute size-[68%] rounded-full opacity-50 blur-2xl"
        style={{ background: `oklch(0.8 0.1 ${hue})` }}
      />
      <div className="relative grid aspect-square w-[64%] min-w-[110px] place-items-center overflow-hidden rounded-full bg-background font-heading text-4xl font-semibold tracking-tight text-foreground shadow-lg shadow-black/10 ring-4 ring-background">
        {image ? (
          <img
            src={image}
            alt={title || ''}
            loading="lazy"
            className="size-full object-cover"
          />
        ) : (
          <span style={{ color: `oklch(0.42 0.12 ${hue})` }}>
            {personInitials(title)}
          </span>
        )}
      </div>
    </div>
  )
}

// ── Helpers ────────────────────────────────────────────────────────────
function stableHue(seed) {
  let h = 0
  for (let i = 0; i < String(seed).length; i += 1) {
    h = (h * 31 + String(seed).charCodeAt(i)) >>> 0
  }
  return h % 360
}

export { MediaCover, KIND_LABEL }
