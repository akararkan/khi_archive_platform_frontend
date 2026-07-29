import { useEffect, useState } from 'react'
import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import { History, House, LogOut, Music4 } from 'lucide-react'

import '@/styles/khi-theme.css'
import { KhiLogo } from '@/components/brand/KhiLogo'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { clearCurrentProfile, setCurrentProfile } from '@/lib/current-profile'
import { ku } from '@/lib/maqam-i18n'
import { cn } from '@/lib/utils'
import { logout } from '@/services/auth'
import { getMyProfile } from '@/services/user-profile'

const NAV_ITEMS = [
  { to: '/teacher', end: true, icon: Music4, label: ku.navMaqam },
  { to: '/teacher/recent', end: false, icon: History, label: ku.navRecent },
]

function getInitials(name, username) {
  const source = (name || username || 'مامۆستا').trim()
  const parts = source.split(/\s+/).filter(Boolean)
  return parts.slice(0, 2).map((p) => p.charAt(0).toUpperCase()).join('') || 'م'
}

function Avatar({ loading, image, name, initials, className }) {
  return (
    <span
      className={cn(
        'flex shrink-0 items-center justify-center overflow-hidden rounded-xl border border-border bg-muted text-sm font-semibold text-foreground',
        className,
      )}
    >
      {loading ? (
        <Skeleton className="size-full rounded-xl" />
      ) : image ? (
        <img alt={name} className="size-full object-cover" src={image} />
      ) : (
        <span aria-hidden="true">{initials}</span>
      )}
    </span>
  )
}

// The teacher workspace is intentionally single-purpose: a teacher only ever
// sees their assigned maqam records. The whole area is rendered right-to-left
// in Central Kurdish (Sorani).
//
// Layout: a persistent rail from `lg` up; below that the same controls collapse
// into a sticky top bar with a segmented nav, so a phone user lands on the work
// itself instead of scrolling past a full-height sidebar to reach it.
function TeacherLayout() {
  const navigate = useNavigate()
  const [profile, setProfile] = useState(null)
  const [isProfileLoading, setIsProfileLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    const loadProfile = async () => {
      setIsProfileLoading(true)
      try {
        const data = await getMyProfile()
        if (!cancelled) setProfile(data)
        setCurrentProfile(data)
      } catch {
        if (!cancelled) setProfile(null)
        clearCurrentProfile()
      } finally {
        if (!cancelled) setIsProfileLoading(false)
      }
    }
    loadProfile()
    return () => {
      cancelled = true
    }
  }, [])

  const profileImage = profile?.profileImageSource || ''
  const profileInitials = getInitials(profile?.name, profile?.username)
  const profileName = profile?.name || profile?.username || 'مامۆستا'
  const profileEmail = profile?.email || ''

  const handleLogout = () => {
    logout()
    clearCurrentProfile()
    navigate('/login', { replace: true })
  }

  const handleHome = () => {
    navigate('/public')
  }

  const railLink = ({ isActive }) =>
    cn(
      'group relative flex items-center gap-3 rounded-xl px-3 py-3 text-[15px] font-medium transition-colors',
      'focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50',
      isActive ? 'bg-primary/12 text-primary' : 'text-foreground hover:bg-muted',
    )

  const renderRailLink = (item) => {
    const Icon = item.icon
    return (
      <NavLink key={item.to} to={item.to} end={item.end} className={railLink}>
        {({ isActive }) => (
          <>
            {isActive ? (
              <span aria-hidden="true" className="absolute inset-y-2 end-0 w-1 rounded-s-full bg-primary" />
            ) : null}
            <span
              className={cn(
                'flex size-9 shrink-0 items-center justify-center rounded-lg transition-colors',
                isActive ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground group-hover:text-foreground',
              )}
            >
              <Icon className="size-4" />
            </span>
            <span className="min-w-0 flex-1 truncate">{item.label}</span>
          </>
        )}
      </NavLink>
    )
  }

  return (
    <div dir="rtl" lang="ckb" className="khi-teacher min-h-dvh bg-background">
      <a
        href="#teacher-content"
        className="sr-only focus:not-sr-only focus:fixed focus:top-3 focus:start-3 focus:z-50 focus:rounded-lg focus:bg-primary focus:px-4 focus:py-2 focus:text-sm focus:font-semibold focus:text-primary-foreground"
      >
        {ku.skipToContent}
      </a>

      {/* ── Mobile / tablet top bar ─────────────────────────────────────── */}
      <header className="sticky top-0 z-30 border-b border-border bg-card/95 backdrop-blur-sm lg:hidden">
        <div className="flex items-center gap-3 px-4 py-2.5">
          <KhiLogo className="khi-mark size-10 shadow-sm" priority />
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold text-foreground">{ku.brand}</p>
            <p className="truncate text-xs text-muted-foreground">{profileName}</p>
          </div>
          <Avatar
            loading={isProfileLoading}
            image={profileImage}
            name={profileName}
            initials={profileInitials}
            className="size-9"
          />
          <Button type="button" variant="ghost" size="icon-lg" className="size-10" onClick={handleHome} aria-label={ku.home}>
            <House className="size-4" />
          </Button>
          <Button type="button" variant="ghost" size="icon-lg" className="size-10" onClick={handleLogout} aria-label={ku.signOut}>
            <LogOut className="size-4" />
          </Button>
        </div>
        <nav aria-label={ku.workspace} className="flex gap-2 px-4 pb-2.5">
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon
            return (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.end}
                className={({ isActive }) =>
                  cn(
                    'flex h-10 flex-1 items-center justify-center gap-2 rounded-xl border text-sm font-semibold transition-colors',
                    'focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50',
                    isActive
                      ? 'border-primary bg-primary text-primary-foreground'
                      : 'border-border bg-background text-foreground hover:bg-muted',
                  )
                }
              >
                <Icon className="size-4" />
                {item.label}
              </NavLink>
            )
          })}
        </nav>
      </header>

      <div className="mx-auto flex w-full max-w-[112rem] gap-5 px-4 py-4 lg:px-6 lg:py-6">
        {/* ── Desktop rail ──────────────────────────────────────────────── */}
        <aside className="sticky top-6 hidden h-[calc(100dvh-3rem)] w-72 shrink-0 flex-col rounded-3xl border border-border bg-card p-4 shadow-sm shadow-black/5 lg:flex">
          <div className="flex items-center gap-3 px-1 py-1">
            <KhiLogo className="khi-mark size-11 shadow-sm" priority />
            <div className="min-w-0">
              <p className="truncate text-[15px] font-semibold tracking-tight text-foreground">{ku.brand}</p>
              <p className="truncate text-xs text-muted-foreground">{ku.workspace}</p>
            </div>
          </div>

          <div className="my-4 h-px bg-border" />

          {/* Profile card (display only — the teacher area is single-page) */}
          <div className="rounded-2xl border border-border bg-background p-3">
            <div className="flex items-center gap-3">
              <Avatar
                loading={isProfileLoading}
                image={profileImage}
                name={profileName}
                initials={profileInitials}
                className="size-11"
              />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold text-foreground">{profileName}</p>
                {profileEmail ? (
                  <p className="truncate text-xs text-muted-foreground" dir="ltr">{profileEmail}</p>
                ) : null}
                <span className="mt-1.5 inline-flex items-center rounded-full border border-border bg-muted px-2 py-0.5 text-[11px] font-semibold text-muted-foreground">
                  {ku.myProfile}
                </span>
              </div>
            </div>
          </div>

          <nav aria-label={ku.workspace} className="mt-5 flex-1 space-y-1.5 overflow-y-auto">
            {NAV_ITEMS.map(renderRailLink)}
          </nav>

          <div className="mt-5 space-y-2">
            <Button className="h-11 w-full gap-2 text-sm" variant="secondary" type="button" onClick={handleHome}>
              <House className="size-4" />
              {ku.home}
            </Button>
            <Button className="h-11 w-full gap-2 text-sm" variant="outline" type="button" onClick={handleLogout}>
              <LogOut className="size-4" />
              {ku.signOut}
            </Button>
          </div>
        </aside>

        <main
          id="teacher-content"
          tabIndex={-1}
          className="min-w-0 flex-1 rounded-3xl border border-border bg-card p-4 shadow-sm shadow-black/5 focus:outline-none sm:p-6 xl:p-8"
        >
          <Outlet />
        </main>
      </div>
    </div>
  )
}

export { TeacherLayout }
