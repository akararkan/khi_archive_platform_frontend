import { ShieldAlert } from 'lucide-react'

import { cn } from '@/lib/utils'

// Backend assigns ROLE_GUEST to every self-registration. A GUEST user
// has no permissions, so every API call they try lands in 403. This
// banner sits at the top of any layout that may host a GUEST and
// tells them why nothing works yet — without it, the page just looks
// broken until they get an "ask an admin" toast on first interaction.
//
// Renders nothing when the role is anything other than 'GUEST', so
// the layout can mount it unconditionally and let the role drive
// visibility.
function GuestActivationBanner({ role, className }) {
  if (String(role || '').toUpperCase() !== 'GUEST') return null
  return (
    <div
      role="status"
      className={cn(
        'mb-5 flex items-start gap-3 rounded-2xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-900 shadow-sm shadow-black/5 dark:bg-amber-500/10 dark:text-amber-100',
        className,
      )}
    >
      <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-amber-500/20 text-amber-600 dark:text-amber-400">
        <ShieldAlert className="size-5" />
      </span>
      <div className="min-w-0 flex-1">
        <p className="font-semibold">Your account is awaiting admin activation.</p>
        <p className="mt-0.5 text-xs leading-relaxed text-amber-900/80 dark:text-amber-100/80">
          You can sign in, but you don&rsquo;t have any permissions yet — most pages
          will look empty or return errors until an admin grants you the
          permissions you need (e.g. <span className="font-mono">audio:read</span>,{' '}
          <span className="font-mono">category:create</span>). Granting any
          permission will also promote your account from Guest to Employee.
        </p>
      </div>
    </div>
  )
}

export { GuestActivationBanner }
