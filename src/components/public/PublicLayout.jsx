import { useEffect, useState } from 'react'
import { Link, NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom'
import {
  Archive,
  AudioLines,
  BookOpen,
  FileText,
  FolderOpen,
  Image as ImageIcon,
  LogIn,
  LogOut,
  Menu,
  Search,
  Tags,
  User as UserIcon,
  Users,
  Video as VideoIcon,
  X,
} from 'lucide-react'

import { Button } from '@/components/ui/button'
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

const NAV_ITEMS = [
  { label: 'Home', to: '/public', icon: BookOpen, end: true },
  { label: 'Audios', to: '/public/browse?type=audio', icon: AudioLines },
  { label: 'Videos', to: '/public/browse?type=video', icon: VideoIcon },
  { label: 'Texts', to: '/public/browse?type=text', icon: FileText },
  { label: 'Images', to: '/public/browse?type=image', icon: ImageIcon },
  { label: 'Projects', to: '/public/browse?type=project', icon: FolderOpen },
  { label: 'Persons', to: '/public/browse?type=person', icon: Users },
  { label: 'Categories', to: '/public/browse?type=category', icon: Tags },
]

// The page-level search experience lives inside the BrowseSidebar (the
// `MorphSearch` component). The header just exposes a small affordance
// that takes the user to /public/browse, where the sidebar's morph
// search has full focus.
function HeaderSearchTrigger() {
  return (
    <Link
      to="/public/browse"
      className={cn(
        'group flex h-10 w-full max-w-md items-center gap-2 rounded-full border border-border bg-background/70 px-3 shadow-sm transition-all',
        'hover:border-primary/40 hover:bg-background hover:shadow-md',
      )}
    >
      <Search className="size-4 shrink-0 text-muted-foreground transition-colors group-hover:text-primary" />
      <span className="flex-1 text-sm text-muted-foreground/80">
        Search the archive…
      </span>
      <kbd className="hidden rounded-md border border-border bg-muted/60 px-1.5 py-0.5 text-[10px] font-medium tracking-wider text-muted-foreground sm:inline">
        Open
      </kbd>
    </Link>
  )
}

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
      {/* ── Top bar (sticky) ─────────────────────────────────────── */}
      <header className="sticky top-0 z-40 border-b border-border/70 bg-background/80 backdrop-blur-xl">
        <div className="mx-auto flex h-16 w-full max-w-7xl items-center gap-3 px-4 sm:gap-5 sm:px-6 lg:px-8">
          <Link to="/public" className="flex items-center gap-2.5">
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

          <div className="ml-auto flex flex-1 justify-end sm:flex-initial sm:ml-0 lg:ml-6 lg:max-w-md lg:flex-1">
            <HeaderSearchTrigger />
          </div>

          <div className="hidden items-center gap-1 lg:flex">
            {isAuthed ? (
              <>
                <Button asChild variant="ghost" size="sm" className="gap-1.5">
                  <Link to="/dashboard">
                    <UserIcon className="size-4" />
                    Workspace
                  </Link>
                </Button>
                <Button variant="outline" size="sm" className="gap-1.5" onClick={handleLogout}>
                  <LogOut className="size-4" />
                  Sign out
                </Button>
              </>
            ) : (
              <>
                <Button asChild variant="ghost" size="sm">
                  <Link to="/register">Register</Link>
                </Button>
                <Button asChild size="sm" className="gap-1.5 shadow-sm">
                  <Link to="/login">
                    <LogIn className="size-4" />
                    Sign in
                  </Link>
                </Button>
              </>
            )}
          </div>

          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            aria-label="Toggle navigation"
            aria-expanded={open}
            className="flex size-9 items-center justify-center rounded-xl border border-border bg-background text-foreground transition hover:bg-muted lg:hidden"
          >
            {open ? <X className="size-4" /> : <Menu className="size-4" />}
          </button>
        </div>

        {/* ── Section nav (desktop) ─────────────────────────────── */}
        <nav className="hidden border-t border-border/60 bg-background/60 lg:block">
          <ul className="mx-auto flex w-full max-w-7xl items-center gap-1 overflow-x-auto px-4 sm:px-6 lg:px-8">
            {NAV_ITEMS.map((item) => {
              const Icon = item.icon
              const active = isNavItemActive(item, location)
              return (
                <li key={item.to}>
                  <NavLink
                    to={item.to}
                    end={item.end}
                    className={cn(
                      'relative flex items-center gap-1.5 px-3 py-3 text-[13px] font-medium transition-colors',
                      active
                        ? 'text-foreground'
                        : 'text-muted-foreground hover:text-foreground',
                    )}
                  >
                    <Icon className="size-3.5" />
                    {item.label}
                    {active ? (
                      <span
                        aria-hidden="true"
                        className="absolute inset-x-2 -bottom-px h-0.5 rounded-full bg-primary"
                      />
                    ) : null}
                  </NavLink>
                </li>
              )
            })}
          </ul>
        </nav>

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
                  <Button asChild variant="outline" size="sm" className="flex-1 gap-1.5">
                    <Link to="/dashboard">
                      <UserIcon className="size-4" />
                      Workspace
                    </Link>
                  </Button>
                  <Button variant="outline" size="sm" className="flex-1 gap-1.5" onClick={handleLogout}>
                    <LogOut className="size-4" />
                    Sign out
                  </Button>
                </>
              ) : (
                <>
                  <Button asChild variant="ghost" size="sm" className="flex-1">
                    <Link to="/register">Register</Link>
                  </Button>
                  <Button asChild size="sm" className="flex-1 gap-1.5">
                    <Link to="/login">
                      <LogIn className="size-4" />
                      Sign in
                    </Link>
                  </Button>
                </>
              )}
            </div>
          </div>
        ) : null}
      </header>

      <main className="flex-1">
        <Outlet />
      </main>

      {/* ── Footer ──────────────────────────────────────────────── */}
      <footer className="mt-16 border-t border-border/70 bg-card/40">
        <div className="mx-auto grid w-full max-w-7xl gap-10 px-4 py-12 sm:px-6 lg:grid-cols-[2fr_1fr_1fr_1fr] lg:px-8">
          <div className="max-w-sm">
            <Link to="/public" className="flex items-center gap-2.5">
              <span className="flex size-9 items-center justify-center rounded-xl bg-gradient-to-br from-primary to-primary/70 text-primary-foreground shadow-md shadow-primary/20 ring-1 ring-primary/30">
                <Archive className="size-4.5" />
              </span>
              <span className="font-heading text-base font-semibold tracking-tight text-foreground">
                KHI Archive
              </span>
            </Link>
            <p className="mt-4 text-sm leading-6 text-muted-foreground">
              An open digital archive of audio, video, image, and textual heritage. Browse the
              collection — full-text search, person and category indexes, and rich descriptive
              metadata are available to everyone.
            </p>
          </div>
          <FooterColumn
            title="Browse"
            links={[
              { to: '/public/projects', label: 'Projects' },
              { to: '/public/categories', label: 'Categories' },
              { to: '/public/persons', label: 'Persons' },
            ]}
          />
          <FooterColumn
            title="Media"
            links={[
              { to: '/public/audios', label: 'Audios' },
              { to: '/public/videos', label: 'Videos' },
              { to: '/public/texts', label: 'Texts' },
              { to: '/public/images', label: 'Images' },
            ]}
          />
          <FooterColumn
            title="Account"
            links={
              isAuthed
                ? [
                    { to: '/dashboard', label: 'My workspace' },
                  ]
                : [
                    { to: '/login', label: 'Sign in' },
                    { to: '/register', label: 'Create an account' },
                    { to: '/forgot-password', label: 'Forgot password' },
                  ]
            }
          />
        </div>
        <div className="border-t border-border/60">
          <div className="mx-auto flex w-full max-w-7xl flex-col items-center justify-between gap-2 px-4 py-5 text-xs text-muted-foreground sm:flex-row sm:px-6 lg:px-8">
            <p>© {new Date().getFullYear()} KHI Archive. All rights reserved.</p>
            <p>
              Public read-only catalogue · Internal cataloguing requires an
              {' '}
              <Link to="/login" className="font-medium text-foreground underline-offset-2 hover:underline">
                authorised account
              </Link>
              .
            </p>
          </div>
        </div>
      </footer>
    </div>
  )
}

function FooterColumn({ title, links }) {
  return (
    <div>
      <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
        {title}
      </p>
      <ul className="mt-3 space-y-2">
        {links.map((link) => (
          <li key={link.to}>
            <Link
              to={link.to}
              className="text-sm text-foreground/80 transition-colors hover:text-primary"
            >
              {link.label}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  )
}

export { PublicLayout }
