import { useEffect, useState } from 'react'
import { Link, NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom'
import {
  Archive,
  AudioLines,
  FileText,
  FolderOpen,
  Image as ImageIcon,
  LogIn,
  LogOut,
  Menu,
  Tags,
  User as UserIcon,
  Users,
  Video as VideoIcon,
  X,
} from 'lucide-react'

import { SearchCommand } from '@/components/public/SearchCommand'
import { Button, buttonVariants } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { getStoredToken, logout } from '@/services/auth'

// Top nav points at the unified browse page with a type filter pre-applied.
// This keeps "no tabs" — every item lands on the same page; only the
// sidebar's Type picker switches the dataset, so users always see the same
// search box, filter rail and result grid.
//
// `isNavItemActive` does the work that NavLink's `isActive` won't: when an
// entry's `to` carries a query string (e.g. `/public/browse?type=audio`),
// we consider it active only when both the path AND the `type` parameter
// match the current URL — otherwise switching from Audios to Videos in the
// sidebar would leave both nav links lit up.
function isNavItemActive(item, location) {
  const [path, query = ''] = String(item.to).split('?')
  const matchesPath = item.end
    ? location.pathname === path
    : location.pathname === path || location.pathname.startsWith(`${path}/`)
  if (!matchesPath) return false
  if (!query) {
    if (path === '/public/browse') {
      // bare browse link only matches when no `type` is set
      const currentType = new URLSearchParams(location.search).get('type')
      return !currentType
    }
    return true
  }
  const expected = new URLSearchParams(query)
  const actual = new URLSearchParams(location.search)
  for (const [k, v] of expected.entries()) {
    if (actual.get(k) !== v) return false
  }
  return true
}

// Header nav points at the unified browse page with `?type=` deep-links.
// Each entry lands on the same surface — the browse page's left rail
// switches between datasets without reloading. There's no Home item; the
// brand mark on the left of the header is the home link.
const NAV_ITEMS = [
  { label: 'Audios', to: '/public/browse?type=audio', icon: AudioLines },
  { label: 'Videos', to: '/public/browse?type=video', icon: VideoIcon },
  { label: 'Texts', to: '/public/browse?type=text', icon: FileText },
  { label: 'Images', to: '/public/browse?type=image', icon: ImageIcon },
  { label: 'Projects', to: '/public/browse?type=project', icon: FolderOpen },
  { label: 'Persons', to: '/public/browse?type=person', icon: Users },
  { label: 'Categories', to: '/public/browse?type=category', icon: Tags },
]

function PublicLayout() {
  const navigate = useNavigate()
  const location = useLocation()
  const [open, setOpen] = useState(false)
  const isAuthed = Boolean(getStoredToken())

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setOpen(false)
  }, [location.pathname])

  const handleLogout = () => {
    logout()
    navigate('/public', { replace: true })
  }

  return (
    <div className="flex min-h-dvh flex-col bg-gradient-to-b from-background via-background to-muted/30">
      {/* ── Top bar (sticky) ──────────────────────────────────────────
          Header now hosts the global SearchCommand — there is no
          per-page search hero any more, and no compact "open search"
          trigger. The bar's autocomplete dropdown floats below it and
          spans the same width, so the search is always one keystroke
          away from anywhere on the public surface. */}
      <header className="sticky top-0 z-40 border-b border-border/70 bg-background/85 backdrop-blur-xl">
        <div className="mx-auto flex h-16 w-full max-w-7xl items-center gap-3 px-4 sm:gap-5 sm:px-6 lg:px-8">
          <Link to="/public" className="flex shrink-0 items-center gap-2.5">
            <span className="flex size-9 items-center justify-center rounded-xl bg-gradient-to-br from-primary to-primary/70 text-primary-foreground shadow-md shadow-primary/20 ring-1 ring-primary/30">
              <Archive className="size-4.5" />
            </span>
            <span className="hidden flex-col leading-none sm:flex">
              <span className="font-heading text-[15px] font-semibold tracking-tight text-foreground">
                KHI Archive
              </span>
              <span className="mt-0.5 text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
                Public Catalogue
              </span>
            </span>
          </Link>

          <div className="min-w-0 flex-1 sm:ml-2 lg:mx-4 lg:max-w-2xl">
            <SearchCommand />
          </div>

          <div className="hidden items-center gap-1 lg:flex">
            {isAuthed ? (
              <>
                <Link
                  to="/dashboard"
                  className={cn(buttonVariants({ variant: 'ghost', size: 'sm' }), 'gap-1.5')}
                >
                  <UserIcon className="size-4" />
                  Workspace
                </Link>
                <Button variant="outline" size="sm" className="gap-1.5" onClick={handleLogout}>
                  <LogOut className="size-4" />
                  Sign out
                </Button>
              </>
            ) : (
              <>
                <Link
                  to="/register"
                  className={cn(buttonVariants({ variant: 'ghost', size: 'sm' }))}
                >
                  Register
                </Link>
                <Link
                  to="/login"
                  className={cn(buttonVariants({ size: 'sm' }), 'gap-1.5 shadow-sm')}
                >
                  <LogIn className="size-4" />
                  Sign in
                </Link>
              </>
            )}
          </div>

          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            aria-label="Toggle navigation"
            aria-expanded={open}
            className="flex size-9 shrink-0 items-center justify-center rounded-xl border border-border bg-background text-foreground transition hover:bg-muted lg:hidden"
          >
            {open ? <X className="size-4" /> : <Menu className="size-4" />}
          </button>
        </div>

        {/* The desktop nav strip is gone — the browse page's left rail
            handles entity navigation. The header stays a single-row 64px
            bar so the sidebar can sit flush below it (top: 4rem). */}

        {/* ── Mobile drawer ─────────────────────────────────────── */}
        {open ? (
          <div className="border-t border-border/60 bg-background lg:hidden">
            <ul className="mx-auto grid w-full max-w-7xl grid-cols-2 gap-1 px-4 py-3 sm:grid-cols-3">
              {NAV_ITEMS.map((item) => {
                const Icon = item.icon
                const active = isNavItemActive(item, location)
                return (
                  <li key={item.to}>
                    <NavLink
                      to={item.to}
                      end={item.end}
                      className={cn(
                        'flex items-center gap-2 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors',
                        active
                          ? 'bg-primary/10 text-primary'
                          : 'text-foreground/80 hover:bg-muted',
                      )}
                    >
                      <Icon className="size-4" />
                      {item.label}
                    </NavLink>
                  </li>
                )
              })}
            </ul>
            <div className="flex flex-wrap items-center gap-2 border-t border-border/60 px-4 py-3">
              {isAuthed ? (
                <>
                  <Link
                    to="/dashboard"
                    className={cn(
                      buttonVariants({ variant: 'outline', size: 'sm' }),
                      'flex-1 gap-1.5',
                    )}
                  >
                    <UserIcon className="size-4" />
                    Workspace
                  </Link>
                  <Button variant="outline" size="sm" className="flex-1 gap-1.5" onClick={handleLogout}>
                    <LogOut className="size-4" />
                    Sign out
                  </Button>
                </>
              ) : (
                <>
                  <Link
                    to="/register"
                    className={cn(buttonVariants({ variant: 'ghost', size: 'sm' }), 'flex-1')}
                  >
                    Register
                  </Link>
                  <Link
                    to="/login"
                    className={cn(buttonVariants({ size: 'sm' }), 'flex-1 gap-1.5')}
                  >
                    <LogIn className="size-4" />
                    Sign in
                  </Link>
                </>
              )}
            </div>
          </div>
        ) : null}
      </header>

      <main className="flex-1">
        <Outlet />
      </main>
    </div>
  )
}

export { PublicLayout }
