import { useEffect, useState } from 'react'
import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import { Archive, ChevronRight, FolderOpen, LogOut, Tags, Users } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { GuestActivationBanner } from '@/components/ui/guest-activation-banner'
import { Skeleton } from '@/components/ui/skeleton'
import { WarningBell } from '@/components/warning/WarningBell'
import { clearCurrentProfile, setCurrentProfile } from '@/lib/current-profile'
import { cn } from '@/lib/utils'
import { logout } from '@/services/auth'
import { getMyProfile } from '@/services/user-profile'

const PROFILE_UPDATED_EVENT = 'employee-profile-updated'

const navigationItems = [
  { label: 'Category', to: '/employee/category', icon: Tags },
  { label: 'Person', to: '/employee/person', icon: Users },
  { label: 'Project', to: '/employee/project', icon: FolderOpen }
]

function getInitials(name, username) {
  const source = (name || username || 'Employee').trim()
  const parts = source.split(/\s+/).filter(Boolean)
  return parts.slice(0, 2).map((part) => part.charAt(0).toUpperCase()).join('') || 'E'
}

function EmployeeLayout() {
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

    const handleProfileUpdate = (event) => {
      const next = event.detail || null
      if (!cancelled) setProfile(next)
      if (next) setCurrentProfile(next)
    }

    loadProfile()
    window.addEventListener(PROFILE_UPDATED_EVENT, handleProfileUpdate)

    return () => {
      cancelled = true
      window.removeEventListener(PROFILE_UPDATED_EVENT, handleProfileUpdate)
    }
  }, [])

  const profileImage = profile?.profileImageSource || ''
  const profileInitials = getInitials(profile?.name, profile?.username)
  const profileName = profile?.name || profile?.username || 'My profile'
  const profileEmail = profile?.email || 'Open your profile'
  const profileRole = profile?.role || 'USER'

  const handleLogout = () => {
    logout()
    clearCurrentProfile()
    navigate('/login', { replace: true })
  }

  return (
    <section className="mx-auto grid min-h-dvh w-full max-w-none gap-5 px-4 py-4 lg:grid-cols-[288px_minmax(0,1fr)] lg:px-6 lg:py-6">
      <aside className="flex min-h-0 flex-col rounded-3xl border border-border bg-card p-4 shadow-sm shadow-black/5 lg:sticky lg:top-6 lg:h-[calc(100dvh-3rem)]">
        {/* brand */}
        <div className="flex items-center gap-3 px-2 py-2">
          <div className="flex size-10 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-sm">
            <Archive className="size-5" />
          </div>
          <div className="min-w-0">
            <p className="font-heading text-sm font-semibold tracking-tight text-foreground">KHI Archive</p>
            <p className="text-[11px] uppercase tracking-[0.14em] text-muted-foreground">Employee Workspace</p>
          </div>
        </div>

        <div className="my-3 h-px bg-border" />

        {/* profile card */}
        <NavLink
          to="/employee/profile"
          className={({ isActive }) =>
            cn(
              'group block rounded-2xl border p-3 transition-all',
              isActive
                ? 'border-primary/40 bg-primary/5'
                : 'border-border bg-background hover:border-primary/30 hover:bg-muted/40',
            )
          }
        >
          {({ isActive }) => (
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
                <p className="truncate text-xs text-muted-foreground">{profileEmail}</p>
                <span className="mt-1 inline-flex items-center rounded-full border bg-background px-1.5 py-px text-[10px] font-semibold tracking-wide text-foreground">
                  {profileRole}
                </span>
              </div>

              <ChevronRight
                className={cn(
                  'size-4 shrink-0 text-muted-foreground/60 transition-all',
                  isActive
                    ? 'text-primary'
                    : 'group-hover:translate-x-0.5 group-hover:text-foreground',
                )}
              />
            </div>
          )}
        </NavLink>

        {/* warning bell — sits between the profile card and the nav so
            it stays visible regardless of which page the employee is on. */}
        <div className="mt-3">
          <WarningBell />
        </div>

        {/* nav */}
        <div className="mt-5 space-y-1.5 lg:flex-1 lg:overflow-y-auto lg:pr-1">
          <p className="px-2 pb-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
            Collections
          </p>
          <nav className="space-y-1">
            {navigationItems.map((item) => {
              const Icon = item.icon

              return (
                <NavLink
                  key={item.to}
                  to={item.to}
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
                          className="absolute left-0 top-1/2 h-6 w-0.5 -translate-y-1/2 rounded-r-full bg-primary"
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
                        <Icon className="size-4" />
                      </span>
                      <span className="min-w-0 flex-1">{item.label}</span>
                    </>
                  )}
                </NavLink>
              )
            })}
          </nav>
        </div>

        {/* logout */}
        <div className="mt-5">
          <Button className="w-full gap-2" variant="outline" type="button" onClick={handleLogout}>
            <LogOut className="size-4" />
            Sign out
          </Button>
        </div>
      </aside>

      <main className="min-w-0 rounded-3xl border border-border bg-card p-4 shadow-sm shadow-black/5 sm:p-6 xl:p-8">
        <GuestActivationBanner role={profileRole} />
        <Outlet />
      </main>
    </section>
  )
}

export { EmployeeLayout }
