import {
  AudioLines,
  FileText,
  FolderOpen,
  Image as ImageIcon,
  Play,
  Tags,
  Video as VideoIcon,
} from 'lucide-react'

import { cn } from '@/lib/utils'
import { personImageSrc, personInitials } from '@/components/public/public-helpers'

// ── MediaCover ──────────────────────────────────────────────────────────
//
// Adaptive thumbnail rendered above every public-archive card. Each kind
// gets a distinct visual language so the user can tell types apart at a
// glance even when two cards sit side-by-side. Style choices:
//
//   audio    Vinyl record — concentric grooves, label disc with the audio
//            title in tiny type, a play button bloom, a soft warm gradient
//            background. The whole disc rotates *very* slowly on hover.
//   video    Film strip — perforated edges over a deep slate gradient,
//            with a centered play badge.
//   text     Manuscript page — paper stack with ruled lines and a ribbon
//            stamp; a kufi-style accent corner.
//   image    The actual photo (or a gradient placeholder when missing).
//   project  Stack of cards with the project's mediakind counts.
//   category Two-tone tag with the category's first letter as a monogram.
//   person   Large circular avatar (image when available, initials otherwise).
//
// Every variant is purely SVG/CSS — no extra assets to ship. The aspect
// ratio is the same across kinds (3:4 portrait, KCAC-style) so the result
// grid stays even.

function MediaCover({
  kind,
  title,
  subtitle,
  image,
  person,
  audioCount,
  videoCount,
  textCount,
  imageCount,
}) {
  switch (kind) {
    case 'audio':
      return <AudioCover title={title} subtitle={subtitle} />
    case 'video':
      return <VideoCover />
    case 'text':
      return <TextCover />
    case 'image':
      return <ImageCover image={image} title={title} />
    case 'project':
      return (
        <ProjectCover
          audioCount={audioCount}
          videoCount={videoCount}
          textCount={textCount}
          imageCount={imageCount}
        />
      )
    case 'category':
      return <CategoryCover title={title} />
    case 'person':
      // Persons get their actual profile photo (from any common field
      // name) when one is available; otherwise we render a coloured
      // initials avatar.
      return <PersonCover image={image || personImageSrc(person)} title={title} />
    default:
      return <DefaultCover />
  }
}

// ── Audio: vinyl record ─────────────────────────────────────────────────
function AudioCover({ title, subtitle }) {
  const hue = stableHue(title || subtitle || 'audio')
  return (
    <div
      className="relative size-full overflow-hidden"
      style={{
        background: `radial-gradient(ellipse at 50% 30%, oklch(0.85 0.06 ${hue}) 0%, oklch(0.62 0.08 ${hue}) 60%, oklch(0.42 0.06 ${hue}) 100%)`,
      }}
    >
      {/* warm haze */}
      <div
        aria-hidden="true"
        className="absolute inset-0 opacity-40"
        style={{
          background:
            'radial-gradient(ellipse at 30% 20%, rgba(255,255,255,0.4), transparent 60%)',
        }}
      />
      {/* vinyl disc */}
      <div className="absolute left-1/2 top-1/2 aspect-square w-[78%] -translate-x-1/2 -translate-y-1/2 transition-transform duration-[2400ms] ease-out group-hover:rotate-[18deg]">
        <svg viewBox="0 0 200 200" className="size-full drop-shadow-2xl">
          <defs>
            <radialGradient id="vinyl-disc" cx="50%" cy="48%" r="55%">
              <stop offset="0%" stopColor="#1a1a1a" />
              <stop offset="60%" stopColor="#0a0a0a" />
              <stop offset="100%" stopColor="#000" />
            </radialGradient>
            <radialGradient id="vinyl-shine" cx="34%" cy="28%" r="40%">
              <stop offset="0%" stopColor="rgba(255,255,255,0.55)" />
              <stop offset="60%" stopColor="rgba(255,255,255,0.05)" />
              <stop offset="100%" stopColor="rgba(255,255,255,0)" />
            </radialGradient>
            <radialGradient id="vinyl-label" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor={`oklch(0.78 0.12 ${hue})`} />
              <stop offset="100%" stopColor={`oklch(0.55 0.14 ${hue})`} />
            </radialGradient>
          </defs>
          {/* disc */}
          <circle cx="100" cy="100" r="98" fill="url(#vinyl-disc)" />
          {/* grooves */}
          {Array.from({ length: 22 }).map((_, i) => (
            <circle
              key={i}
              cx="100"
              cy="100"
              r={36 + i * 2.6}
              fill="none"
              stroke="rgba(255,255,255,0.05)"
              strokeWidth="0.4"
            />
          ))}
          {/* highlight */}
          <circle cx="100" cy="100" r="98" fill="url(#vinyl-shine)" />
          {/* label */}
          <circle cx="100" cy="100" r="34" fill="url(#vinyl-label)" />
          <circle cx="100" cy="100" r="34" fill="none" stroke="rgba(0,0,0,0.15)" strokeWidth="0.6" />
          {/* spindle */}
          <circle cx="100" cy="100" r="2.6" fill="#000" />
          <circle cx="100" cy="100" r="1" fill="rgba(255,255,255,0.6)" />
        </svg>
      </div>
      {/* play badge */}
      <div className="absolute bottom-3 right-3 flex size-10 items-center justify-center rounded-full bg-white/95 text-foreground shadow-lg shadow-black/30 ring-1 ring-black/10 transition-transform group-hover:scale-110">
        <Play className="ml-0.5 size-4 fill-current" />
      </div>
      {/* wave hint */}
      <div className="absolute inset-x-3 bottom-3 flex items-end gap-0.5 pr-12">
        {Array.from({ length: 26 }).map((_, i) => (
          <span
            key={i}
            className="block w-0.5 rounded-full bg-white/55"
            style={{ height: `${4 + Math.abs(Math.sin((i + 3) * 0.7)) * 18}px` }}
          />
        ))}
      </div>
    </div>
  )
}

// ── Video: film strip ──────────────────────────────────────────────────
function VideoCover() {
  return (
    <div className="relative size-full overflow-hidden bg-gradient-to-br from-slate-700 via-slate-900 to-black">
      {/* film perforations */}
      {[0, 1].map((side) => (
        <div
          key={side}
          className={cn(
            'absolute inset-y-0 flex w-3 flex-col items-center justify-around bg-black/60',
            side === 0 ? 'left-0' : 'right-0',
          )}
        >
          {Array.from({ length: 8 }).map((_, i) => (
            <span key={i} className="block size-1.5 rounded-sm bg-slate-300/90" />
          ))}
        </div>
      ))}
      {/* frames */}
      <div className="absolute inset-y-0 left-3 right-3 grid grid-rows-3 gap-1.5 py-2">
        {Array.from({ length: 3 }).map((_, i) => (
          <div
            key={i}
            className="rounded-sm bg-gradient-to-br from-slate-500/30 to-slate-800/50 ring-1 ring-white/5"
          />
        ))}
      </div>
      {/* play button */}
      <div className="absolute inset-0 flex items-center justify-center">
        <div className="flex size-14 items-center justify-center rounded-full bg-white/95 text-foreground shadow-2xl shadow-black/40 ring-2 ring-black/20 transition-transform group-hover:scale-110">
          <Play className="ml-1 size-6 fill-current" />
        </div>
      </div>
      {/* corner kind chip */}
      <span className="absolute right-5 top-2 inline-flex items-center gap-1 rounded-full bg-white/15 px-2 py-0.5 text-[9px] font-semibold uppercase tracking-wider text-white/90 ring-1 ring-white/25 backdrop-blur-sm">
        <VideoIcon className="size-2.5" />
        Video
      </span>
    </div>
  )
}

// ── Text: manuscript page ──────────────────────────────────────────────
function TextCover() {
  return (
    <div className="relative size-full overflow-hidden bg-gradient-to-br from-amber-50 via-amber-100 to-amber-200/80">
      {/* paper grain */}
      <div
        aria-hidden="true"
        className="absolute inset-0 opacity-30 mix-blend-multiply"
        style={{
          backgroundImage:
            'radial-gradient(circle at 20% 25%, rgba(120,80,40,.18), transparent 40%), radial-gradient(circle at 80% 75%, rgba(120,80,40,.12), transparent 40%)',
        }}
      />
      {/* page stack */}
      <div className="absolute inset-3">
        <div className="absolute inset-0 translate-x-1 translate-y-1 rounded-sm bg-amber-100/80 shadow-md" />
        <div className="absolute inset-0 -translate-x-0.5 translate-y-0.5 rounded-sm bg-amber-50 shadow-sm" />
        <div className="absolute inset-0 rounded-sm bg-white shadow-md ring-1 ring-amber-200/60">
          <div className="space-y-1.5 px-4 pt-4">
            {Array.from({ length: 9 }).map((_, i) => (
              <div
                key={i}
                className="h-1 rounded-full bg-amber-900/15"
                style={{ width: `${[88, 76, 92, 70, 84, 68, 78, 60, 50][i] ?? 70}%` }}
              />
            ))}
          </div>
          {/* drop cap */}
          <div className="absolute right-3 top-2 font-heading text-3xl font-bold text-amber-700/80">
            ﺑ
          </div>
          {/* stamp */}
          <div className="absolute bottom-2 left-2 flex size-9 items-center justify-center rounded-full border-2 border-amber-700/50 text-amber-700/70">
            <FileText className="size-3.5" />
          </div>
        </div>
      </div>
    </div>
  )
}

// ── Image: actual photo or hue placeholder ─────────────────────────────
function ImageCover({ image, title }) {
  if (image) {
    return (
      <img
        src={image}
        alt={title || ''}
        loading="lazy"
        className="size-full object-cover transition-transform duration-500 group-hover:scale-[1.04]"
      />
    )
  }
  const hue = stableHue(title || 'image')
  return (
    <div
      className="relative size-full"
      style={{
        background: `linear-gradient(160deg, oklch(0.78 0.04 ${hue}) 0%, oklch(0.50 0.06 ${hue}) 100%)`,
      }}
    >
      <div className="absolute inset-0 flex items-center justify-center">
        <ImageIcon className="size-10 text-white/70" />
      </div>
    </div>
  )
}

// ── Project: media-kind collage ────────────────────────────────────────
function ProjectCover({ audioCount, videoCount, textCount, imageCount }) {
  const tiles = [
    { kind: 'audio', icon: AudioLines, count: audioCount, accent: 'from-rose-500 to-rose-700' },
    { kind: 'video', icon: VideoIcon, count: videoCount, accent: 'from-sky-500 to-sky-700' },
    { kind: 'text', icon: FileText, count: textCount, accent: 'from-emerald-500 to-emerald-700' },
    { kind: 'image', icon: ImageIcon, count: imageCount, accent: 'from-amber-500 to-amber-700' },
  ]
  return (
    <div className="relative size-full overflow-hidden bg-gradient-to-br from-stone-100 to-stone-200">
      <div className="grid size-full grid-cols-2 grid-rows-2 gap-1 p-1">
        {tiles.map((tile) => {
          const Icon = tile.icon
          const has = Number(tile.count) > 0
          return (
            <div
              key={tile.kind}
              className={cn(
                'flex flex-col items-center justify-center rounded-lg p-2 text-white shadow-inner',
                has
                  ? `bg-gradient-to-br ${tile.accent}`
                  : 'bg-stone-300/60 text-stone-500 shadow-none',
              )}
            >
              <Icon className={cn('size-5', has ? 'text-white' : 'text-stone-500')} />
              <span
                className={cn(
                  'mt-1 font-mono text-[11px] font-bold tabular-nums',
                  has ? 'text-white' : 'text-stone-500',
                )}
              >
                {Number(tile.count) > 0 ? Number(tile.count).toLocaleString() : '0'}
              </span>
            </div>
          )
        })}
      </div>
      <span className="absolute left-2 top-2 inline-flex items-center gap-1 rounded-full bg-white/95 px-2 py-0.5 text-[9px] font-semibold uppercase tracking-wider text-foreground shadow-sm">
        <FolderOpen className="size-2.5" />
        Project
      </span>
    </div>
  )
}

// ── Category: two-tone tag with monogram ───────────────────────────────
function CategoryCover({ title }) {
  const initial = (title || '·').trim().charAt(0).toUpperCase()
  const hue = stableHue(title || 'category')
  return (
    <div
      className="relative size-full overflow-hidden"
      style={{
        background: `linear-gradient(135deg, oklch(0.92 0.04 ${hue}) 0%, oklch(0.74 0.08 ${hue}) 100%)`,
      }}
    >
      {/* corner cut like a tag */}
      <svg
        aria-hidden="true"
        className="absolute right-0 top-0 size-12 text-black/15"
        viewBox="0 0 60 60"
        fill="currentColor"
      >
        <polygon points="0,0 60,0 60,60" />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center gap-1">
        <span
          className="font-heading text-6xl font-bold tracking-tight text-foreground/85"
          style={{ textShadow: '0 2px 0 rgba(255,255,255,.4)' }}
        >
          {initial}
        </span>
        <span className="inline-flex items-center gap-1 rounded-full bg-white/85 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-foreground shadow-sm">
          <Tags className="size-2.5" />
          Category
        </span>
      </div>
    </div>
  )
}

// ── Person: large circular avatar ──────────────────────────────────────
function PersonCover({ image, title }) {
  const hue = stableHue(title || 'person')
  return (
    <div
      className="relative size-full overflow-hidden"
      style={{
        background: `radial-gradient(ellipse at 50% 35%, oklch(0.95 0.03 ${hue}), oklch(0.78 0.06 ${hue}) 60%, oklch(0.55 0.08 ${hue}) 100%)`,
      }}
    >
      <div className="absolute inset-0 flex items-center justify-center">
        <div className="relative">
          <div
            className="absolute -inset-3 rounded-full opacity-60 blur-xl"
            style={{ background: `oklch(0.85 0.1 ${hue})` }}
            aria-hidden="true"
          />
          <div className="relative flex aspect-square w-[58%] min-w-[110px] items-center justify-center overflow-hidden rounded-full bg-white shadow-2xl shadow-black/30 ring-4 ring-white/80">
            {image ? (
              <img
                src={image}
                alt={title || ''}
                loading="lazy"
                className="size-full object-cover"
              />
            ) : (
              <span
                className="font-heading text-5xl font-bold tracking-tight"
                style={{ color: `oklch(0.42 0.12 ${hue})` }}
              >
                {getInitials(title)}
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

// ── Default: subtle neutral ────────────────────────────────────────────
function DefaultCover() {
  return (
    <div className="size-full bg-gradient-to-br from-stone-200 to-stone-300" />
  )
}

// ── Helpers ────────────────────────────────────────────────────────────
function getInitials(name) {
  return personInitials(name)
}

function stableHue(seed) {
  let h = 0
  for (let i = 0; i < String(seed).length; i += 1) {
    h = (h * 31 + String(seed).charCodeAt(i)) >>> 0
  }
  return h % 360
}

export { MediaCover }
