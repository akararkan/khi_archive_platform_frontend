import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import {
  AtSign,
  CheckCircle2,
  KeyRound,
  Library,
  LogOut,
  Loader2,
  Mail,
  Save,
  Trash2,
  Upload,
  User,
  UserRound,
} from 'lucide-react'

import { KhiLogo } from '@/components/brand/KhiLogo'
import { GuestActivationBanner } from '@/components/ui/guest-activation-banner'
import { IconField, PasswordField, PasswordStrength } from '@/components/auth/auth-fields'
import { Button, buttonVariants } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { FormErrorBox } from '@/components/ui/form-error'
import { Skeleton } from '@/components/ui/skeleton'
import { TypedConfirmDialog } from '@/components/ui/typed-confirm-dialog'
import { getAccountArea } from '@/lib/account-role'
import { clearCurrentProfile, setCurrentProfile } from '@/lib/current-profile'
import { formatApiError } from '@/lib/get-error-message'
import { resolveProfileImageSource } from '@/lib/profile-image'
import { cn } from '@/lib/utils'
import { logout } from '@/services/auth'
import {
  changeMyPassword,
  deleteMyAccount,
  getMyProfile,
  removeMyProfileImage,
  updateMyProfile,
  uploadMyProfileImage,
} from '@/services/user-profile'

function getInitials(name, username) {
  const source = (name || username || 'User').trim()
  const parts = source.split(/\s+/).filter(Boolean)
  return parts.slice(0, 2).map((part) => part.charAt(0).toUpperCase()).join('') || 'U'
}

// The live region is always mounted (and `empty:hidden` so it takes no layout
// when blank) — a role="status" node inserted together with its text is
// announced unreliably by screen readers, whereas a persistent one announces
// the change when the message appears.
function Banner({ kind, children }) {
  return (
    <div role="status" aria-live="polite" className="empty:hidden">
      {children ? (
        <p
          className={cn(
            'rounded-md border px-3 py-2 text-sm',
            kind === 'success' &&
              'border-emerald-500/25 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400',
            kind === 'error' && 'border-destructive/25 bg-destructive/10 text-destructive',
          )}
        >
          {children}
        </p>
      ) : null}
    </div>
  )
}

// Self-contained account workspace. Unlike the admin/employee profile (which
// lives inside a full sidebar layout), this page carries its own slim chrome so
// a freshly-registered GUEST — who has no role workspace yet — still has a real
// home after login/register: edit profile, change password (the only recovery
// path now that the reset-token flow is gone), and a clear activation warning.
function AccountProfilePage() {
  const navigate = useNavigate()

  const [profile, setProfile] = useState(null)
  const [isLoading, setIsLoading] = useState(true)
  const [loadError, setLoadError] = useState(null)

  const [isSavingProfile, setIsSavingProfile] = useState(false)
  const [isSavingPassword, setIsSavingPassword] = useState(false)
  const [isUpdatingImage, setIsUpdatingImage] = useState(false)
  const [isRemovingImage, setIsRemovingImage] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false)

  const [profileMessage, setProfileMessage] = useState('')
  const [profileSaveError, setProfileSaveError] = useState(null)
  const [passwordError, setPasswordError] = useState(null)
  const [passwordMessage, setPasswordMessage] = useState('')
  const [imageError, setImageError] = useState(null)
  const [imageMessage, setImageMessage] = useState('')
  const [imageLoadError, setImageLoadError] = useState(false)
  const [deleteError, setDeleteError] = useState(null)

  const [profileForm, setProfileForm] = useState({ name: '', username: '', email: '' })
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  })

  const applyProfile = (data) => {
    setProfile(data)
    setCurrentProfile(data)
    setImageLoadError(false)
    setProfileForm({
      name: data?.name ?? '',
      username: data?.username ?? '',
      email: data?.email ?? '',
    })
  }

  useEffect(() => {
    let cancelled = false

    const loadProfile = async () => {
      setIsLoading(true)
      setLoadError(null)

      try {
        const data = await getMyProfile()
        if (cancelled) return
        applyProfile(data)
      } catch (error) {
        if (!cancelled) setLoadError(formatApiError(error, 'Unable to load your account right now.'))
      } finally {
        if (!cancelled) setIsLoading(false)
      }
    }

    loadProfile()

    return () => {
      cancelled = true
    }
  }, [])

  const role = profile?.role || 'GUEST'
  const isGuest = getAccountArea(role) === 'guest'

  const displayImage =
    profile?.profileImageSource ||
    resolveProfileImageSource(profile) ||
    profile?.profileImage ||
    profile?.profileImageUrl ||
    profile?.imageUrl ||
    profile?.image ||
    ''
  const hasProfileImage = Boolean(displayImage) && !imageLoadError
  const initials = getInitials(profile?.name, profile?.username)
  const profileName = profile?.name || profile?.username || 'My account'
  const profileStatus = profile?.isActivated ? 'Active' : 'Inactive'

  // Only the human-facing essentials — the technical fields (User ID, Role,
  // Status, Provider, Created/Updated, Password expiry) are intentionally
  // hidden here; role + status already show as badges in the hero above.
  const accountStats = [
    { label: 'Username', value: profile?.username || 'Not available' },
    { label: 'Email', value: profile?.email || 'Not available' },
  ]

  const handleProfileChange = (event) => {
    const { name, value } = event.target
    setProfileForm((previous) => ({ ...previous, [name]: value }))
  }

  const handlePasswordChange = (event) => {
    const { name, value } = event.target
    setPasswordForm((previous) => ({ ...previous, [name]: value }))
  }

  const handleSignOut = () => {
    logout()
    clearCurrentProfile()
    navigate('/login', { replace: true })
  }

  const handleProfileSubmit = async (event) => {
    event.preventDefault()
    setProfileSaveError(null)
    setProfileMessage('')
    setIsSavingProfile(true)

    try {
      const data = await updateMyProfile({
        name: profileForm.name,
        username: profileForm.username,
        email: profileForm.email,
      })
      applyProfile(data)
      setProfileMessage('Profile updated successfully.')
    } catch (error) {
      setProfileSaveError(formatApiError(error, 'Unable to update your profile.'))
    } finally {
      setIsSavingProfile(false)
    }
  }

  const handlePasswordSubmit = async (event) => {
    event.preventDefault()
    setPasswordError(null)
    setPasswordMessage('')

    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      setPasswordError('New password and confirmation must match.')
      return
    }

    setIsSavingPassword(true)

    try {
      await changeMyPassword(passwordForm)
      setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' })
      setPasswordMessage('Password changed successfully. It is valid for the next 90 days.')
      // Refresh so the "Password expiry" stat reflects the new +90-day window.
      // Update only the displayed profile/cache — NOT profileForm — so any
      // unsaved edits in the (separate, simultaneously-visible) General
      // information form aren't silently wiped.
      try {
        const data = await getMyProfile()
        setProfile(data)
        setCurrentProfile(data)
      } catch {
        /* non-fatal — the password change itself already succeeded */
      }
    } catch (error) {
      setPasswordError(formatApiError(error, 'Unable to change your password.'))
    } finally {
      setIsSavingPassword(false)
    }
  }

  const handleImageUpload = async (event) => {
    const input = event.target
    const file = input.files?.[0]
    if (!file) return

    setImageError(null)
    setImageMessage('')
    setIsUpdatingImage(true)

    try {
      const data = await uploadMyProfileImage(file)
      applyProfile(data)
      setImageMessage('Profile photo updated.')
    } catch (error) {
      setImageError(formatApiError(error, 'Unable to upload the image.'))
    } finally {
      setIsUpdatingImage(false)
      // Always clear the value (not just on success) so re-selecting the SAME
      // file after an error still fires onChange — a file input won't fire when
      // its value is unchanged.
      input.value = ''
    }
  }

  const handleImageRemove = async () => {
    setImageError(null)
    setImageMessage('')
    setIsRemovingImage(true)

    try {
      const data = await removeMyProfileImage()
      applyProfile(data)
      setImageMessage('Profile photo removed.')
    } catch (error) {
      setImageError(formatApiError(error, 'Unable to remove the image.'))
    } finally {
      setIsRemovingImage(false)
    }
  }

  const handleDeleteAccount = async () => {
    setDeleteError(null)
    setIsDeleting(true)

    try {
      await deleteMyAccount()
      logout()
      clearCurrentProfile()
      navigate('/public', { replace: true })
    } catch (error) {
      setDeleteError(formatApiError(error, 'Unable to delete your account right now.'))
      setIsDeleting(false)
      setConfirmDeleteOpen(false)
    }
  }

  const passwordsMatch =
    passwordForm.confirmPassword.length > 0 &&
    passwordForm.newPassword === passwordForm.confirmPassword

  return (
    <div className="min-h-dvh bg-[linear-gradient(180deg,var(--background),color-mix(in_oklab,var(--muted)_48%,var(--background)))]">
      <header className="sticky top-0 z-20 border-b border-border/70 bg-background/85 backdrop-blur-xl">
        <div className="mx-auto flex w-full max-w-7xl items-center gap-3 px-4 py-3 sm:px-6">
          <KhiLogo className="size-11 shadow-sm" priority />
          <div className="min-w-0 flex-1">
            <p className="font-heading text-sm font-semibold tracking-tight text-foreground">KHI Archive</p>
            <p className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">Guest profile</p>
          </div>
          <Link to="/public" className={cn(buttonVariants({ variant: 'outline', size: 'sm' }), 'gap-2')}>
            <Library className="size-4" />
            <span className="hidden sm:inline">Browse the archive</span>
          </Link>
          <Button variant="ghost" size="sm" className="gap-2" onClick={handleSignOut}>
            <LogOut className="size-4" />
            <span className="hidden sm:inline">Sign out</span>
          </Button>
        </div>
      </header>

      <main className="mx-auto w-full max-w-7xl px-4 py-6 sm:px-6 sm:py-8">
        {isLoading ? (
          <div className="space-y-6">
            <Card className="border-border bg-card shadow-sm shadow-black/5">
              <CardContent className="p-6 sm:p-8">
                <div className="flex items-center gap-5">
                  <Skeleton className="size-24 rounded-2xl" />
                  <div className="space-y-3">
                    <Skeleton className="h-7 w-48" />
                    <div className="flex gap-2">
                      <Skeleton className="h-5 w-16 rounded-full" />
                      <Skeleton className="h-5 w-16 rounded-full" />
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
            <div className="grid gap-6 xl:grid-cols-[1fr_400px]">
              <Skeleton className="h-72 rounded-2xl" />
              <div className="space-y-6">
                {[1, 2, 3].map((i) => (
                  <Skeleton key={i} className="h-52 rounded-2xl" />
                ))}
              </div>
            </div>
          </div>
        ) : loadError ? (
          <Card className="border-border bg-card shadow-sm shadow-black/5">
            <CardContent className="space-y-4 px-6 py-8">
              <FormErrorBox error={loadError} />
              <Button type="button" variant="outline" className="gap-2" onClick={handleSignOut}>
                <LogOut className="size-4" />
                Sign in again
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-6">
            <GuestActivationBanner role={role} />

            <Card className="relative overflow-hidden border-0 bg-[linear-gradient(135deg,#0f2f26,#1f5b47_58%,#10241d)] text-primary-foreground shadow-2xl shadow-primary/20">
              <CardContent className="relative p-6 sm:p-8">
                <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_360px] lg:items-end">
                  <div className="flex flex-col gap-5 sm:flex-row sm:items-center">
                    <div className="relative shrink-0">
                      <div className="flex size-28 items-center justify-center overflow-hidden rounded-3xl border border-white/25 bg-white/10 font-heading text-4xl font-semibold text-white shadow-2xl shadow-black/25 backdrop-blur">
                        {hasProfileImage ? (
                          <img
                            alt={profileName}
                            className="size-full bg-white/10 object-cover"
                            src={displayImage}
                            onError={() => setImageLoadError(true)}
                          />
                        ) : (
                          <span>{initials}</span>
                        )}
                      </div>
                      {profile?.isActivated ? (
                        <span className="absolute -bottom-1 -right-1 flex size-7 items-center justify-center rounded-full border-2 border-white bg-emerald-500 text-white">
                          <CheckCircle2 className="size-4" />
                        </span>
                      ) : null}
                    </div>

                    <div className="space-y-2">
                      <p className="text-xs font-semibold uppercase tracking-[0.22em] text-white/65">Guest archive account</p>
                      <h1 className="font-heading text-3xl font-semibold tracking-tight text-white sm:text-4xl">{profileName}</h1>
                      <p className="max-w-2xl text-sm leading-6 text-white/72">
                        A dedicated profile page for your public archive account.
                      </p>
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="inline-flex items-center rounded-full border border-white/20 bg-white/10 px-2.5 py-0.5 text-xs font-semibold text-white">
                          {role}
                        </span>
                        <span
                          className={cn(
                            'inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium',
                            profile?.isActivated
                              ? 'border-emerald-200/35 bg-emerald-300/15 text-emerald-50'
                              : 'border-white/20 bg-white/10 text-white/72',
                          )}
                        >
                          {profileStatus}
                        </span>
                        {profile?.email ? (
                          <span className="inline-flex max-w-full items-center truncate rounded-full border border-white/20 bg-white/10 px-2.5 py-0.5 text-xs font-medium text-white/72">
                            {profile.email}
                          </span>
                        ) : null}
                      </div>
                    </div>
                  </div>

                  <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-1">
                    {accountStats.map((item) => (
                      <div
                        key={item.label}
                        className="rounded-2xl border border-white/12 bg-white/[0.08] px-4 py-3 backdrop-blur"
                      >
                        <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-white/50">
                          {item.label}
                        </p>
                        <p className="mt-1 truncate text-sm font-semibold text-white">{item.value}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>

            <div className="grid gap-6 xl:grid-cols-[minmax(320px,0.85fr)_minmax(0,1.15fr)]">
              <aside className="space-y-6 xl:sticky xl:top-24 xl:self-start">
                {/* photo */}
                <Card className="overflow-hidden border-border/80 bg-card/95 shadow-sm shadow-black/5 backdrop-blur">
                  <CardHeader className="border-b border-border pb-4">
                    <div className="flex items-center gap-2">
                      <Upload className="size-4 text-muted-foreground" />
                      <CardTitle className="text-base font-semibold">Profile photo</CardTitle>
                    </div>
                    <CardDescription>JPEG, PNG, GIF, or WebP up to 5&nbsp;MB.</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-5 pt-5">
                    <div className="mx-auto flex size-44 items-center justify-center overflow-hidden rounded-[2rem] border border-border bg-muted/40 font-heading text-5xl font-semibold text-muted-foreground shadow-inner sm:size-56">
                      {hasProfileImage ? (
                        <img
                          alt={profileName}
                          className="size-full object-cover"
                          src={displayImage}
                          onError={() => setImageLoadError(true)}
                        />
                      ) : (
                        <span>{initials}</span>
                      )}
                    </div>

                    <div className="flex flex-col gap-2 sm:flex-row xl:flex-col 2xl:flex-row">
                      <label className="flex h-10 w-full cursor-pointer items-center justify-center gap-2 rounded-lg border border-input bg-background px-3 py-2 text-sm font-medium transition-colors hover:bg-muted sm:flex-1">
                        {isUpdatingImage ? (
                          <Loader2 className="size-4 animate-spin text-muted-foreground" />
                        ) : (
                          <Upload className="size-4 text-muted-foreground" />
                        )}
                        {isUpdatingImage ? 'Uploading…' : 'Upload new'}
                        <input accept="image/*" className="sr-only" type="file" onChange={handleImageUpload} />
                      </label>

                      <Button
                        className="w-full gap-2 2xl:w-auto"
                        variant="outline"
                        type="button"
                        disabled={isRemovingImage || !displayImage}
                        onClick={handleImageRemove}
                      >
                        {isRemovingImage ? (
                          <Loader2 className="size-4 animate-spin" />
                        ) : (
                          <Trash2 className="size-4" />
                        )}
                        Remove
                      </Button>
                    </div>

                    <Banner kind="success">{imageMessage}</Banner>
                    <FormErrorBox error={imageError} />
                  </CardContent>
                </Card>

                {/* account details */}
                <Card className="overflow-hidden border-border/80 bg-card/95 shadow-sm shadow-black/5 backdrop-blur">
                  <CardHeader className="border-b border-border pb-4">
                    <CardTitle className="text-base font-semibold">Account details</CardTitle>
                    <CardDescription>Your guest account identity.</CardDescription>
                  </CardHeader>
                  <CardContent className="pt-5">
                    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-1 2xl:grid-cols-2">
                      {accountStats.map((item) => (
                        <div
                          key={item.label}
                          className="flex flex-col gap-1 rounded-xl border bg-muted/20 px-4 py-3"
                        >
                          <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                            {item.label}
                          </p>
                          <p className="truncate text-sm font-medium text-foreground">{item.value}</p>
                        </div>
                      ))}
                      <div className="flex flex-col gap-1 rounded-xl border bg-muted/20 px-4 py-3">
                        <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                          Role
                        </p>
                        <p className="truncate text-sm font-medium text-foreground">{role}</p>
                      </div>
                      <div className="flex flex-col gap-1 rounded-xl border bg-muted/20 px-4 py-3">
                        <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                          Status
                        </p>
                        <p className="truncate text-sm font-medium text-foreground">{profileStatus}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </aside>

              <div className="space-y-6">
                {/* general info */}
                <Card className="border-border bg-card/95 shadow-sm shadow-black/5">
                  <CardHeader className="border-b border-border pb-4">
                    <div className="flex items-center gap-2">
                      <UserRound className="size-4 text-muted-foreground" />
                      <CardTitle className="text-base font-semibold">General information</CardTitle>
                    </div>
                    <CardDescription>Update your name, username, and email.</CardDescription>
                  </CardHeader>
                  <CardContent className="pt-5">
                    <form className="space-y-4" onSubmit={handleProfileSubmit}>
                      <IconField
                        id="name"
                        name="name"
                        label="Full name"
                        icon={User}
                        autoComplete="name"
                        maxLength={120}
                        value={profileForm.name}
                        onChange={handleProfileChange}
                      />
                      <IconField
                        id="username"
                        name="username"
                        label="Username"
                        icon={AtSign}
                        autoComplete="username"
                        minLength={3}
                        maxLength={80}
                        pattern="[A-Za-z0-9_]+"
                        title="Use only letters, numbers, and underscores"
                        value={profileForm.username}
                        onChange={handleProfileChange}
                      />
                      <IconField
                        id="email"
                        name="email"
                        label="Email"
                        icon={Mail}
                        type="email"
                        autoComplete="email"
                        maxLength={160}
                        value={profileForm.email}
                        onChange={handleProfileChange}
                        hint={
                          isGuest
                            ? 'As a guest, your email must be a real, reachable address — bogus domains are rejected.'
                            : undefined
                        }
                      />

                      <Banner kind="success">{profileMessage}</Banner>
                      <FormErrorBox error={profileSaveError} />

                      <Button className="w-full gap-2" type="submit" disabled={isSavingProfile}>
                        {isSavingProfile ? (
                          <Loader2 className="size-4 animate-spin" />
                        ) : (
                          <Save className="size-4" />
                        )}
                        Save changes
                      </Button>
                    </form>
                  </CardContent>
                </Card>

                {/* security */}
                <Card className="border-border bg-card/95 shadow-sm shadow-black/5">
                  <CardHeader className="border-b border-border pb-4">
                    <div className="flex items-center gap-2">
                      <KeyRound className="size-4 text-muted-foreground" />
                      <CardTitle className="text-base font-semibold">Change password</CardTitle>
                    </div>
                    <CardDescription>
                      Enter your current password, then a new one. This is the only way to change your
                      password — if you have forgotten it, ask an administrator to reset it.
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="pt-5">
                    <form className="space-y-4" onSubmit={handlePasswordSubmit}>
                      <PasswordField
                        id="currentPassword"
                        name="currentPassword"
                        label="Current password"
                        icon={KeyRound}
                        autoComplete="current-password"
                        value={passwordForm.currentPassword}
                        onChange={handlePasswordChange}
                        required
                      />
                      <div className="space-y-1.5">
                        <PasswordField
                          id="newPassword"
                          name="newPassword"
                          label="New password"
                          icon={KeyRound}
                          autoComplete="new-password"
                          minLength={6}
                          maxLength={128}
                          value={passwordForm.newPassword}
                          onChange={handlePasswordChange}
                          required
                        />
                        <PasswordStrength value={passwordForm.newPassword} />
                      </div>
                      <div className="space-y-1.5">
                        <PasswordField
                          id="confirmPassword"
                          name="confirmPassword"
                          label="Confirm new password"
                          icon={KeyRound}
                          autoComplete="new-password"
                          minLength={6}
                          maxLength={128}
                          value={passwordForm.confirmPassword}
                          onChange={handlePasswordChange}
                          required
                        />
                        <div role="status" aria-live="polite">
                          {passwordForm.confirmPassword.length > 0 ? (
                            <p
                              className={
                                passwordsMatch
                                  ? 'flex items-center gap-1.5 text-xs font-medium text-green-600 dark:text-green-500'
                                  : 'text-xs text-muted-foreground'
                              }
                            >
                              {passwordsMatch ? <CheckCircle2 className="size-3.5" /> : null}
                              {passwordsMatch ? 'Passwords match' : "Passwords don't match yet"}
                            </p>
                          ) : null}
                        </div>
                      </div>

                      <Banner kind="success">{passwordMessage}</Banner>
                      <FormErrorBox error={passwordError} />

                      <Button className="w-full gap-2" type="submit" disabled={isSavingPassword}>
                        {isSavingPassword ? (
                          <Loader2 className="size-4 animate-spin" />
                        ) : (
                          <KeyRound className="size-4" />
                        )}
                        Change password
                      </Button>
                    </form>
                  </CardContent>
                </Card>

                {/* danger zone */}
                <Card className="border-destructive/30 bg-card/95 shadow-sm shadow-black/5">
                  <CardHeader className="border-b border-destructive/20 pb-4">
                    <div className="flex items-center gap-2">
                      <Trash2 className="size-4 text-destructive" />
                      <CardTitle className="text-base font-semibold text-destructive">Delete account</CardTitle>
                    </div>
                    <CardDescription>
                      Permanently remove your account, sessions, and profile photo. This cannot be undone.
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4 pt-5">
                    <FormErrorBox error={deleteError} />
                    <Button
                      type="button"
                      variant="destructive"
                      className="w-full gap-2"
                      onClick={() => {
                        setDeleteError(null)
                        setConfirmDeleteOpen(true)
                      }}
                    >
                      <Trash2 className="size-4" />
                      Delete my account
                    </Button>
                  </CardContent>
                </Card>
              </div>
            </div>
          </div>
        )}
      </main>

      <TypedConfirmDialog
        open={confirmDeleteOpen}
        title="Delete your account?"
        description="This permanently deletes your account, ends all sessions, and removes your profile photo. This action cannot be undone."
        codeToConfirm={profile?.username || ''}
        promptLabel="Type your username to confirm"
        confirmLabel="Delete account"
        caseSensitive={false}
        isProcessing={isDeleting}
        onConfirm={handleDeleteAccount}
        onOpenChange={setConfirmDeleteOpen}
      />
    </div>
  )
}

export { AccountProfilePage }
