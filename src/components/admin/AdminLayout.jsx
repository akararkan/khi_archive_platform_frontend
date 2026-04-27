import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import { LayoutDashboard, LogOut, Settings2, ShieldCheck, Users } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { logout } from '@/services/auth'

const navigationItems = [
  {
    label: 'Dashboard',
    to: '/admin/dashboard',
    icon: LayoutDashboard,
  },
  {
    label: 'Users',
    to: '/admin/users',
    icon: Users,
  },
  {
    label: 'Roles',
    to: '/admin/roles',
    icon: ShieldCheck,
  },
  {
    label: 'Settings',
    to: '/admin/settings',
    icon: Settings2,
  },
]

function AdminLayout() {
  const navigate = useNavigate()

  const handleLogout = () => {
    logout()
    navigate('/login', { replace: true })
  }

  return (
    <section className="mx-auto grid min-h-dvh w-full max-w-7xl gap-5 px-4 py-4 lg:grid-cols-[272px_minmax(0,1fr)] lg:px-6 lg:py-6">
      <aside className="flex min-h-0 flex-col rounded-3xl border border-border bg-card p-4 shadow-sm shadow-black/5 lg:sticky lg:top-6 lg:h-[calc(100dvh-3rem)]">
        <div className="flex items-center gap-3 rounded-2xl border border-border bg-background px-4 py-4">
          <div className="flex size-11 items-center justify-center rounded-2xl bg-primary text-primary-foreground">
            <ShieldCheck className="size-5" />
          </div>
          <div className="min-w-0">
            <p className="text-sm font-semibold text-foreground">KHI Archive Admin</p>
            <p className="text-xs text-muted-foreground">Admin area</p>
          </div>
        </div>

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

      <main className="min-w-0 rounded-3xl border border-border bg-card p-4 shadow-sm shadow-black/5 sm:p-6">
        <Outlet />
      </main>
    </section>
  )
}

export { AdminLayout }