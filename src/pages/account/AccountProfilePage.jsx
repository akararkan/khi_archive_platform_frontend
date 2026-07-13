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
  const source = (name || username || 'هەژمار').trim()
  const parts = source.split(/\s+/).filter(Boolean)
  return parts.slice(0, 2).map((part) => part.charAt(0).toUpperCase()).join('') || 'هـ'
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

const KU_PASSWORD_STRENGTH = {
  prefix: 'هێزی وشەی نهێنی:',
  levels: ['زۆر کورتە', 'لاوازە', 'مامناوەندە', 'باشە', 'بەهێزە'],
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
        if (!cancelled) setLoadError(formatApiError(error, 'ئێستا ناتوانرێت هەژمارەکەت باربکرێت.'))
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
  const profileName = profile?.name || profile?.username || 'هەژمارەکەم'
  const profileStatus = profile?.isActivated ? 'چالاک' : 'چاوەڕێی چالاککردنەوە'
  const roleLabel = isGuest ? 'میوان' : role

  // Only the human-facing essentials — the technical fields (User ID, Role,
  // Status, Provider, Created/Updated, Password expiry) are intentionally
  // hidden here; role + status already show as badges in the hero above.
  const accountStats = [
    { label: 'ناوی بەکارهێنەر', value: profile?.username || 'بەردەست نییە', dir: profile?.username ? 'ltr' : 'rtl' },
    { label: 'ئیمەیڵ', value: profile?.email || 'بەردەست نییە', dir: profile?.email ? 'ltr' : 'rtl' },
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
      setProfileMessage('پرۆفایلەکەت بەسەرکەوتوویی نوێکرایەوە.')
    } catch (error) {
      setProfileSaveError(formatApiError(error, 'نەتوانرا پرۆفایلەکەت نوێبکرێتەوە.'))
    } finally {
      setIsSavingProfile(false)
    }
  }

  const handlePasswordSubmit = async (event) => {
    event.preventDefault()
    setPasswordError(null)
    setPasswordMessage('')

    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      setPasswordError('وشەی نهێنی نوێ و پشتڕاستکردنەوە دەبێت وەک یەک بن.')
      return
    }

    setIsSavingPassword(true)

    try {
      await changeMyPassword(passwordForm)
      setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' })
      setPasswordMessage('وشەی نهێنی بەسەرکەوتوویی گۆڕدرا. بۆ ٩٠ ڕۆژی داهاتوو کارا دەبێت.')
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
      setPasswordError(formatApiError(error, 'نەتوانرا وشەی نهێنی بگۆڕدرێت.'))
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
      setImageMessage('وێنەی پرۆفایل نوێکرایەوە.')
    } catch (error) {
      setImageError(formatApiError(error, 'نەتوانرا وێنەکە باربکرێت.'))
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
      setImageMessage('وێنەی پرۆفایل سڕایەوە.')
    } catch (error) {
      setImageError(formatApiError(error, 'نەتوانرا وێنەکە بسڕدرێتەوە.'))
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
      setDeleteError(formatApiError(error, 'ئێستا ناتوانرێت هەژمارەکەت بسڕدرێتەوە.'))
      setIsDeleting(false)
      setConfirmDeleteOpen(false)
    }
  }

  const passwordsMatch =
    passwordForm.confirmPassword.length > 0 &&
    passwordForm.newPassword === passwordForm.confirmPassword

  return (
    <div
      lang="ckb"
      dir="rtl"
      className="min-h-dvh bg-[linear-gradient(180deg,var(--background),color-mix(in_oklab,var(--muted)_48%,var(--background)))]"
    >
      <header className="sticky top-0 z-20 border-b border-border/70 bg-background/85 backdrop-blur-xl">
        <div className="mx-auto flex w-full max-w-7xl items-center gap-3 px-4 py-3 sm:px-6">
          <KhiLogo className="size-11 shadow-sm" priority />
          <div className="min-w-0 flex-1">
            <p className="font-heading text-sm font-semibold tracking-tight text-foreground">ئەرشیفی KHI</p>
            <p className="text-[11px] font-semibold tracking-[0.08em] text-muted-foreground">پرۆفایلی میوان</p>
          </div>
          <Link to="/public" className={cn(buttonVariants({ variant: 'outline', size: 'sm' }), 'gap-2')}>
            <Library className="size-4" />
            <span className="hidden sm:inline">گەڕان لە ئەرشیف</span>
          </Link>
          <Button variant="ghost" size="sm" className="gap-2" onClick={handleSignOut}>
            <LogOut className="size-4" />
            <span className="hidden sm:inline">چوونەدەرەوە</span>
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
                دووبارە بچۆ ژوورەوە
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
                      <p className="text-xs font-semibold tracking-[0.08em] text-white/65">هەژماری میوانی ئەرشیف</p>
                      <h1 className="font-heading text-3xl font-semibold tracking-tight text-white sm:text-4xl">{profileName}</h1>
                      <p className="max-w-2xl text-sm leading-6 text-white/72">
                        پەڕەی تایبەت بۆ بەڕێوەبردنی هەژماری گشتیی ئەرشیفەکەت.
                      </p>
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="inline-flex items-center rounded-full border border-white/20 bg-white/10 px-2.5 py-0.5 text-xs font-semibold text-white">
                          {roleLabel}
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
                          <span dir="ltr" className="inline-flex max-w-full items-center truncate rounded-full border border-white/20 bg-white/10 px-2.5 py-0.5 text-xs font-medium text-white/72">
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
                        <p dir={item.dir} className="mt-1 truncate text-sm font-semibold text-white">{item.value}</p>
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
                      <CardTitle className="text-base font-semibold">وێنەی پرۆفایل</CardTitle>
                    </div>
                    <CardDescription>JPEG، PNG، GIF یان WebP تا ٥ مێگابایت.</CardDescription>
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
                        {isUpdatingImage ? 'بارکردن…' : 'وێنەی نوێ باربکە'}
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
                        سڕینەوە
                      </Button>
                    </div>

                    <Banner kind="success">{imageMessage}</Banner>
                    <FormErrorBox error={imageError} />
                  </CardContent>
                </Card>

                {/* account details */}
                <Card className="overflow-hidden border-border/80 bg-card/95 shadow-sm shadow-black/5 backdrop-blur">
                  <CardHeader className="border-b border-border pb-4">
                    <CardTitle className="text-base font-semibold">زانیاری هەژمار</CardTitle>
                    <CardDescription>ناسنامەی هەژماری میوانەکەت.</CardDescription>
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
                          <p dir={item.dir} className="truncate text-sm font-medium text-foreground">{item.value}</p>
                        </div>
                      ))}
                      <div className="flex flex-col gap-1 rounded-xl border bg-muted/20 px-4 py-3">
                        <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                          ڕۆڵ
                        </p>
                        <p className="truncate text-sm font-medium text-foreground">{roleLabel}</p>
                      </div>
                      <div className="flex flex-col gap-1 rounded-xl border bg-muted/20 px-4 py-3">
                        <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                          دۆخ
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
                      <CardTitle className="text-base font-semibold">زانیاری گشتی</CardTitle>
                    </div>
                    <CardDescription>ناو، ناوی بەکارهێنەر و ئیمەیڵت نوێبکەرەوە.</CardDescription>
                  </CardHeader>
                  <CardContent className="pt-5">
                    <form className="space-y-4" onSubmit={handleProfileSubmit}>
                      <IconField
                        id="name"
                        name="name"
                        label="ناوی تەواو"
                        icon={User}
                        autoComplete="name"
                        maxLength={120}
                        value={profileForm.name}
                        onChange={handleProfileChange}
                      />
                      <IconField
                        id="username"
                        name="username"
                        label="ناوی بەکارهێنەر"
                        icon={AtSign}
                        autoComplete="username"
                        minLength={3}
                        maxLength={80}
                        pattern="[A-Za-z0-9_]+"
                        title="تەنها پیت، ژمارە و هێمای ژێرهێڵ بەکاربهێنە"
                        dir="ltr"
                        className="text-left"
                        value={profileForm.username}
                        onChange={handleProfileChange}
                      />
                      <IconField
                        id="email"
                        name="email"
                        label="ئیمەیڵ"
                        icon={Mail}
                        type="email"
                        autoComplete="email"
                        maxLength={160}
                        dir="ltr"
                        className="text-left"
                        value={profileForm.email}
                        onChange={handleProfileChange}
                        hint={
                          isGuest
                            ? 'وەک میوان، ئیمەیڵەکەت دەبێت ڕاست و گەیشتوو بێت؛ دۆمەینی ساختە ڕەتدەکرێتەوە.'
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
                        پاشەکەوتکردنی گۆڕانکارییەکان
                      </Button>
                    </form>
                  </CardContent>
                </Card>

                {/* security */}
                <Card className="border-border bg-card/95 shadow-sm shadow-black/5">
                  <CardHeader className="border-b border-border pb-4">
                    <div className="flex items-center gap-2">
                      <KeyRound className="size-4 text-muted-foreground" />
                      <CardTitle className="text-base font-semibold">گۆڕینی وشەی نهێنی</CardTitle>
                    </div>
                    <CardDescription>
                      وشەی نهێنی ئێستا بنووسە، پاشان وشەیەکی نوێ. ئەگەر لەبیرت چووە،
                      داوای یارمەتی لە بەڕێوەبەر بکە.
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="pt-5">
                    <form className="space-y-4" onSubmit={handlePasswordSubmit}>
                      <PasswordField
                        id="currentPassword"
                        name="currentPassword"
                        label="وشەی نهێنی ئێستا"
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
                          label="وشەی نهێنی نوێ"
                          icon={KeyRound}
                          autoComplete="new-password"
                          minLength={6}
                          maxLength={128}
                          value={passwordForm.newPassword}
                          onChange={handlePasswordChange}
                          required
                        />
                        <PasswordStrength value={passwordForm.newPassword} labels={KU_PASSWORD_STRENGTH} />
                      </div>
                      <div className="space-y-1.5">
                        <PasswordField
                          id="confirmPassword"
                          name="confirmPassword"
                          label="پشتڕاستکردنەوەی وشەی نهێنی نوێ"
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
                              {passwordsMatch ? 'وشە نهێنییەکان وەک یەکن' : 'هێشتا وەک یەک نین'}
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
                        گۆڕینی وشەی نهێنی
                      </Button>
                    </form>
                  </CardContent>
                </Card>

                {/* danger zone */}
                <Card className="border-destructive/30 bg-card/95 shadow-sm shadow-black/5">
                  <CardHeader className="border-b border-destructive/20 pb-4">
                    <div className="flex items-center gap-2">
                      <Trash2 className="size-4 text-destructive" />
                      <CardTitle className="text-base font-semibold text-destructive">سڕینەوەی هەژمار</CardTitle>
                    </div>
                    <CardDescription>
                      هەژمار، دانیشتنەکان و وێنەی پرۆفایل بە هەمیشەیی دەسڕدرێنەوە.
                      ئەمە ناگەڕێتەوە.
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
                      هەژمارەکەم بسڕەوە
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
        title="هەژمارەکەت بسڕدرێتەوە؟"
        description="ئەم کارە هەژمارەکەت، هەموو دانیشتنەکان و وێنەی پرۆفایل بە هەمیشەیی دەسڕێتەوە. ئەمە ناگەڕێتەوە."
        codeToConfirm={profile?.username || ''}
        promptLabel="ناوی بەکارهێنەرەکەت بنووسە بۆ پشتڕاستکردنەوە"
        confirmLabel="سڕینەوەی هەژمار"
        cancelLabel="پاشگەزبوونەوە"
        caseSensitive={false}
        isProcessing={isDeleting}
        onConfirm={handleDeleteAccount}
        onOpenChange={setConfirmDeleteOpen}
      />
    </div>
  )
}

export { AccountProfilePage }
