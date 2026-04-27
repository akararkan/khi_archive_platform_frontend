import { useEffect, useState } from 'react'
import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import { Archive, AudioLines, Boxes, LogOut, Tags, Users } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { cn } from '@/lib/utils'
import { logout } from '@/services/auth'
import { getMyProfile } from '@/services/user-profile'

const PROFILE_UPDATED_EVENT = 'employee-profile-updated'

const navigationItems = [
  {
    label: 'Category',
    to: '/employee/category',
    icon: Tags,
  },
  {
    label: 'Person',
    to: '/employee/person',
    icon: Users,
  },
  {
    label: 'Object',
    to: '/employee/object',
    icon: Boxes,
  },
  {
    label: 'Audio',
    to: '/employee/audio',
    icon: AudioLines,
  },
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

        if (!cancelled) {
          setProfile(data)
        }
      } catch {
        if (!cancelled) {
          setProfile(null)
        }
      } finally {
        if (!cancelled) {
          setIsProfileLoading(false)
        }
      }
    }

    const handleProfileUpdate = (event) => {
      if (!cancelled) {
        setProfile(event.detail || null)
      }
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
    navigate('/login', { replace: true })
  }

  return (
    <section className="mx-auto grid min-h-dvh w-full max-w-none gap-5 px-4 py-4 lg:grid-cols-[300px_minmax(0,1fr)] lg:px-6 lg:py-6">
      <aside className="flex min-h-0 flex-col rounded-3xl border border-border bg-card p-4 shadow-sm shadow-black/5 lg:sticky lg:top-6 lg:h-[calc(100dvh-3rem)]">
        <div className="flex items-center gap-3 rounded-2xl border border-border bg-background px-4 py-4">
          <div className="flex size-11 items-center justify-center rounded-2xl bg-primary text-primary-foreground">
            <Archive className="size-5" />
          </div>
          <div className="min-w-0">
            <p className="text-sm font-semibold text-foreground">KHI Archive</p>
            <p className="text-xs text-muted-foreground">Employee area</p>
          </div>
        </div>

        <NavLink
          to="/employee/profile"
          className={({ isActive }) =>
            cn(
              'mt-4 block rounded-3xl border p-4 transition-all duration-200',
              isActive
                ? 'border-primary bg-primary/5 shadow-sm shadow-primary/10'
                : 'border-border bg-background hover:border-primary/30 hover:bg-muted/50',
            )
          }
        >
            <div className="flex items-center gap-4">
              <div className="flex size-14 shrink-0 items-center justify-center overflow-hidden rounded-2xl border border-border bg-muted text-lg font-semibold text-foreground">
                {isProfileLoading ? (
                  <Skeleton className="size-full rounded-2xl" />
                ) : profileImage ? (
                  <img alt={profileName} className="size-full object-cover" src={profileImage} />
                ) : (
                  <span>{profileInitials}</span>
                )}
              </div>

              <div className="min-w-0 flex-1 space-y-1">
                <p className="truncate text-sm font-semibold text-foreground">{profileName}</p>
                <p className="truncate text-xs text-muted-foreground">{profileEmail}</p>
              </div>
            </div>

            <div className="mt-4 flex items-center justify-between gap-3">
              <span className="rounded-full border border-border bg-background px-2.5 py-1 text-xs font-medium text-foreground">
                {profileRole}
              </span>
              <span className="text-xs font-medium text-primary">View profile</span>
            </div>
        </NavLink>

        <nav className="mt-5 space-y-1.5 lg:flex-1 lg:overflow-y-auto lg:pr-1">
          {navigationItems.map((item) => {
            const Icon = item.icon

            return (
              <NavLink
                key={item.to}
                to={item.to}
                className={({ isActive }) =>
                  cn(
                    'group flex items-center gap-3 rounded-2xl border px-3 py-3 transition-colors duration-200',
                    isActive
                      ? 'border-primary bg-primary/5 text-primary'
                      : 'border-transparent bg-transparent text-foreground hover:bg-muted',
                  )
                }
              >
                {({ isActive }) => (
                  <>
                    <span
                      className={cn(
                        'flex size-10 shrink-0 items-center justify-center rounded-xl transition-colors',
                        isActive ? 'bg-primary/10 text-primary' : 'bg-muted text-muted-foreground',
                      )}
                    >
                      <Icon className="size-4" />
                    </span>
                    <span className="min-w-0 flex-1 text-left text-sm font-medium">{item.label}</span>
                  </>
                )}
              </NavLink>
            )
          })}
        </nav>

        <div className="mt-5 rounded-2xl border border-border bg-background p-4">
          <Button className="w-full gap-2" variant="outline" type="button" onClick={handleLogout}>
            <LogOut className="size-4" />
            Logout
          </Button>
        </div>
      </aside>

      <main className="min-w-0 rounded-3xl border border-border bg-card p-4 shadow-sm shadow-black/5 sm:p-6 xl:p-8">
        <Outlet />
      </main>
    </section>
  )
}

export { EmployeeLayout }