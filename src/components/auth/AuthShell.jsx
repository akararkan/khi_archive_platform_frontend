import { AudioLines, Image as ImageIcon, ScrollText, ShieldCheck, Video } from 'lucide-react'

import { KhiLogo } from '@/components/brand/KhiLogo'
import { cn } from '@/lib/utils'
import '@/styles/khi-theme.css'
import '@/styles/khi-auth.css'

const amiri = { fontFamily: "'Amiri', serif" }

// 21 sun rays (Kurdish-flag count) + a field of stars, computed once.
const RAYS = Array.from({ length: 21 }, (_, i) => {
  const a = (i / 21) * Math.PI * 2
  return {
    x1: 100 + Math.cos(a) * 58, y1: 100 + Math.sin(a) * 58,
    x2: 100 + Math.cos(a) * 92, y2: 100 + Math.sin(a) * 92,
  }
})
const STARS = Array.from({ length: 30 }, (_, i) => ({
  left: (i * 53) % 100,
  top: (i * 31) % 60,
  delay: ((i * 7) % 40) / 10,
}))

const CHIPS = [
  { icon: AudioLines, label: 'دەنگ' },
  { icon: Video, label: 'ڤیدیۆ' },
  { icon: ImageIcon, label: 'وێنە' },
  { icon: ScrollText, label: 'دەستنووس' },
]

// The cinematic heritage brand panel (left on desktop). Always the dark-pine
// night scene with a rising sun — independent of light/dark so it stays
// striking. RTL Sorani identity, paired with the English form on the right.
function BrandPanel() {
  return (
    <aside className="auth-scene relative hidden min-h-dvh flex-col justify-between p-10 lg:flex xl:p-12" dir="rtl">
      {/* stars */}
      <div className="pointer-events-none absolute inset-0">
        {STARS.map((s, i) => (
          <i key={i} className="auth-star" style={{ left: `${s.left}%`, top: `${s.top}%`, animationDelay: `${s.delay}s` }} />
        ))}
      </div>

      {/* sun + rays, just above the ridge */}
      <div className="pointer-events-none absolute bottom-[20%] left-1/2 w-[clamp(220px,30vw,340px)] -translate-x-1/2">
        <svg className="auth-sun w-full" viewBox="0 0 200 200" fill="none" stroke="#e7d3a0" strokeWidth="1.1">
          {RAYS.map((r, i) => (
            <line key={i} x1={r.x1.toFixed(1)} y1={r.y1.toFixed(1)} x2={r.x2.toFixed(1)} y2={r.y2.toFixed(1)} strokeLinecap="round" opacity=".75" />
          ))}
          <circle cx="100" cy="100" r="44" fill="#e7d3a0" opacity=".16" />
          <circle cx="100" cy="100" r="44" strokeWidth="1.5" opacity=".9" />
          <circle cx="100" cy="100" r="58" strokeDasharray="2 7" opacity=".5" />
        </svg>
      </div>

      {/* mountain range anchored to the bottom */}
      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-[36%]">
        <svg className="size-full" viewBox="0 0 1440 360" preserveAspectRatio="none">
          <path fill="#2a4a3c" opacity=".5" d="M0 360 V230 L120 180 L240 220 L360 160 L520 210 L680 150 L840 200 L1000 145 L1160 195 L1300 155 L1440 190 V360 Z" />
          <path fill="#1d362c" opacity=".85" d="M0 360 V270 L160 215 L300 255 L440 195 L600 250 L780 185 L960 245 L1140 195 L1300 240 L1440 205 V360 Z" />
          <path fill="none" stroke="#d6b25e" strokeWidth="2.4" strokeLinejoin="round" d="M0 318 L140 262 L280 300 L420 238 L560 292 L700 228 L880 296 L1040 248 L1220 300 L1360 256 L1440 286" />
          <path fill="#102018" d="M0 360 V330 L140 262 L280 300 L420 238 L560 292 L700 228 L880 296 L1040 248 L1220 300 L1360 256 L1440 286 V360 Z" />
        </svg>
      </div>

      {/* ── content (above the scene) ── */}
      <div className="relative z-10 flex items-center gap-3.5 text-right">
        <KhiLogo className="size-14 shadow-lg shadow-[#0e211a]/40 ring-[#d6b25e]/45" priority />
        <div>
          <b className="block text-[22px] leading-tight text-[#f3ead4]" style={amiri}>ئەرشیفی KHI</b>
          <span className="text-[11px] font-semibold tracking-[0.22em] text-[#e7d3a0]/80">KHI ARCHIVE PLATFORM</span>
        </div>
      </div>

      <div className="relative z-10 max-w-md text-right">
        <p className="text-[13px] font-semibold tracking-wide text-[#e7d3a0]">
          کۆکراوەی دیجیتاڵی · کەلەپووری کوردی
        </p>
        <h2 className="mt-3 text-[clamp(32px,3.6vw,46px)] leading-[1.3] text-[#f6eeda]" style={amiri}>
          گەنجینەی زیندووی یادەوەری
        </h2>
        <p className="mt-4 text-[15px] leading-8 text-[#f3ead4]/80">
          چوونەژوورەوە بۆ ئەرشیفی زیندووی کەلەپووری کورد — دەنگ، ڤیدیۆ، وێنە و دەستنووس،
          لەگەڵ ئەو کەسانەی دروستیان کردوون.
        </p>
        <div className="mt-6 flex flex-wrap justify-end gap-2.5">
          {CHIPS.map((c) => {
            const Ico = c.icon
            return (
              <span key={c.label} className="auth-chip">
                <Ico />
                {c.label}
              </span>
            )
          })}
        </div>
      </div>

      <div className="relative z-10">
        <div className="auth-rule mb-3" />
        <p className="flex items-center justify-end gap-2 text-[12px] text-[#f3ead4]/65">
          <ShieldCheck className="size-3.5 text-[#e7d3a0]" />
          پاراستن، گەڕان و هاوبەشکردنی کەلەپوور
        </p>
      </div>
    </aside>
  )
}

// Shared wrapper for the auth pages (login, register).
// `.khi-surface` re-skins the form's Button/Input/Card to the pine·gold·paper
// palette (with a dark variant) and `.khi-auth` adds the page backdrop + scene.
function AuthShell({ title, description, children, footer, className }) {
  return (
    <div className="khi-surface khi-auth grid grid-cols-1 lg:grid-cols-[1.05fr_minmax(440px,520px)]">
      <BrandPanel />

      <div className="flex min-h-dvh items-center justify-center px-5 py-10 sm:px-8">
        <div className="w-full max-w-md">
          {/* compact brand row — shown when the panel is hidden (mobile) */}
          <div className="mb-7 flex items-center gap-3 lg:hidden">
            <KhiLogo className="size-12 shadow-md" priority />
            <div>
              <b className="block text-xl leading-tight text-foreground" style={amiri}>ئەرشیفی KHI</b>
              <span className="text-[10px] font-semibold tracking-[0.2em] text-muted-foreground">KHI ARCHIVE PLATFORM</span>
            </div>
          </div>

          <div
            className={cn(
              'relative overflow-hidden rounded-3xl border border-border bg-card p-7 shadow-2xl shadow-black/10 sm:p-9 dark:shadow-black/40',
              className,
            )}
          >
            {/* Fixed pine→gold→pine so the brand accent reads the same in light
                and dark (the dark --accent middle would otherwise look muddy). */}
            <div className="pointer-events-none absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-[#1f3a31] via-[#d6b25e] to-[#1f3a31]" />

            <header className="space-y-2">
              <h1 className="text-[1.7rem] font-semibold leading-tight tracking-tight text-foreground">{title}</h1>
              {description ? <p className="text-sm leading-6 text-muted-foreground">{description}</p> : null}
            </header>

            <div className="mt-6">{children}</div>

            {footer ? (
              <div className="mt-6 border-t border-border/70 pt-5 text-center text-sm text-muted-foreground">{footer}</div>
            ) : null}
          </div>

          <p className="mt-5 flex items-center justify-center gap-1.5 text-center text-xs text-muted-foreground">
            <ShieldCheck className="size-3.5" />
            Secured access · your session stays private
          </p>
        </div>
      </div>
    </div>
  )
}

export { AuthShell }
