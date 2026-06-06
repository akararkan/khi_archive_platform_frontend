import { useEffect, useState } from 'react'
import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import { GraduationCap, History, LogOut, Music4 } from 'lucide-react'

import '@/styles/khi-theme.css'
import { Button } from '@/components/ui/button'
import { KhiToneSlider } from '@/components/khi/KhiToneSlider'
import { Skeleton } from '@/components/ui/skeleton'
import { clearCurrentProfile, setCurrentProfile } from '@/lib/current-profile'
import { ku } from '@/lib/maqam-i18n'
import { cn } from '@/lib/utils'
import { logout } from '@/services/auth'
import { getMyProfile } from '@/services/user-profile'

function getInitials(name, username) {
  const source = (name || username || 'مامۆستا').trim()
  const parts = source.split(/\s+/).filter(Boolean)
  return parts.slice(0, 2).map((p) => p.charAt(0).toUpperCase()).join('') || 'م'
}

// The teacher workspace is intentionally single-purpose: a teacher only ever
// sees their assigned maqam records. The whole area is rendered right-to-left
// in Central Kurdish (Sorani).
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

  return (
    <section
      dir="rtl"
      lang="ckb"
      className="khi-teacher mx-auto grid min-h-dvh w-full max-w-none gap-5 bg-background px-4 py-4 lg:grid-cols-[288px_minmax(0,1fr)] lg:px-6 lg:py-6"
    >
      <aside className="flex min-h-0 flex-col rounded-3xl border border-border bg-card p-4 shadow-sm shadow-black/5 lg:sticky lg:top-6 lg:h-[calc(100dvh-3rem)]">
        {/* brand */}
        <div className="flex items-center gap-3 px-2 py-2">
          <div className="khi-mark flex size-10 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-sm">
            <GraduationCap className="size-5" />
          </div>
          <div className="min-w-0">
            <p className="font-heading text-sm font-semibold tracking-tight text-foreground">{ku.brand}</p>
            <p className="text-[11px] text-muted-foreground">{ku.workspace}</p>
          </div>
        </div>

        <div className="my-3 h-px bg-border" />

        {/* Reading-tone control — lives at the top of the sidebar (no floating overlay). */}
        <div className="mb-3 flex justify-center">
          <KhiToneSlider />
        </div>

        {/* profile card (display only — the teacher area is single-page) */}
        <div className="rounded-2xl border border-border bg-background p-3">
          <div className="flex items-center gap-3">
            <div className="flex size-11 shrink-0 items-center justify-center overflow-hidden rounded-xl border bg-muted font-heading text-sm font-semibold text-foreground">
              {isProfileLoading ? (
                <Skeleton className="size-full rounded-xl" />
              ) : profileImage ? (
                <img alt={profileName} className="size-full object-cover" src={profileImage} />
              ) : (
                <span>{profileInitials}</span>
              )}
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold text-foreground">{profileName}</p>
              {profileEmail ? (
                <p className="truncate text-xs text-muted-foreground">{profileEmail}</p>
              ) : null}
              <span className="mt-1 inline-flex items-center rounded-full border bg-background px-1.5 py-px text-[10px] font-semibold tracking-wide text-foreground">
                {ku.myProfile}
              </span>
            </div>
          </div>
        </div>

        {/* nav */}
        <div className="mt-5 space-y-1 lg:flex-1 lg:overflow-y-auto">
          <NavLink
            to="/teacher"
            end
            className={({ isActive }) =>
              cn(
                'group relative flex items-center gap-3 rounded-xl px-2.5 py-2.5 text-sm font-medium transition-colors',
                isActive
                  ? 'bg-primary/10 text-primary'
                  : 'text-foreground/80 hover:bg-muted hover:text-foreground',
              )
            }
          >
            {({ isActive }) => (
              <>
                {isActive && (
                  <span
                    aria-hidden="true"
                    className="absolute inset-y-0 end-0 my-auto h-6 w-0.5 rounded-s-full bg-primary"
                  />
                )}
                <span
                  className={cn(
                    'flex size-8 shrink-0 items-center justify-center rounded-lg transition-colors',
                    isActive
                      ? 'bg-primary/15 text-primary'
                      : 'bg-muted/60 text-muted-foreground group-hover:bg-muted group-hover:text-foreground',
                  )}
                >
                  <Music4 className="size-4" />
                </span>
                <span className="min-w-0 flex-1">{ku.navMaqam}</span>
              </>
            )}
          </NavLink>

          <NavLink
            to="/teacher/recent"
            className={({ isActive }) =>
              cn(
                'group relative flex items-center gap-3 rounded-xl px-2.5 py-2.5 text-sm font-medium transition-colors',
                isActive
                  ? 'bg-primary/10 text-primary'
                  : 'text-foreground/80 hover:bg-muted hover:text-foreground',
              )
            }
          >
            {({ isActive }) => (
              <>
                {isActive && (
                  <span
                    aria-hidden="true"
                    className="absolute inset-y-0 end-0 my-auto h-6 w-0.5 rounded-s-full bg-primary"
                  />
                )}
                <span
                  className={cn(
                    'flex size-8 shrink-0 items-center justify-center rounded-lg transition-colors',
                    isActive
                      ? 'bg-primary/15 text-primary'
                      : 'bg-muted/60 text-muted-foreground group-hover:bg-muted group-hover:text-foreground',
                  )}
                >
                  <History className="size-4" />
                </span>
                <span className="min-w-0 flex-1">{ku.navRecent}</span>
              </>
            )}
          </NavLink>
        </div>

        {/* logout */}
        <div className="mt-5">
          <Button className="w-full gap-2" variant="outline" type="button" onClick={handleLogout}>
            <LogOut className="size-4" />
            {ku.signOut}
          </Button>
        </div>
      </aside>

      <main className="min-w-0 rounded-3xl border border-border bg-card p-4 shadow-sm shadow-black/5 sm:p-6 xl:p-8">
        <Outlet />
      </main>
    </section>
  )
}

export { TeacherLayout }
