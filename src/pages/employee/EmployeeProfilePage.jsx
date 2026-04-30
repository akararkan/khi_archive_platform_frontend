import { useEffect, useState } from 'react'
import {
  CheckCircle2,
  KeyRound,
  Loader2,
  Save,
  Trash2,
  Upload,
  UserRound,
} from 'lucide-react'

import { EmployeeEntityPage } from '@/components/employee/EmployeeEntityPage'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Skeleton } from '@/components/ui/skeleton'
import { FormErrorBox } from '@/components/ui/form-error'
import { cn } from '@/lib/utils'
import { formatApiError } from '@/lib/get-error-message'
import { resolveProfileImageSource } from '@/lib/profile-image'
import {
  changeMyPassword,
  getMyProfile,
  removeMyProfileImage,
  updateMyProfile,
  uploadMyProfileImage,
} from '@/services/user-profile'

function formatDateTime(value) {
  if (!value) return 'Not available'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return 'Not available'
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(date)
}

function getInitials(name, username) {
  const source = (name || username || 'User').trim()
  const parts = source.split(/\s+/).filter(Boolean)
  return parts.slice(0, 2).map((part) => part.charAt(0).toUpperCase()).join('') || 'U'
}

function Banner({ kind, children }) {
  if (!children) return null
  return (
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
  )
}

function EmployeeProfilePage() {
  const [profile, setProfile] = useState(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isSavingProfile, setIsSavingProfile] = useState(false)
  const [isSavingPassword, setIsSavingPassword] = useState(false)
  const [isUpdatingImage, setIsUpdatingImage] = useState(false)
  const [isRemovingImage, setIsRemovingImage] = useState(false)
  const [profileError, setProfileError] = useState(null)
  const [profileMessage, setProfileMessage] = useState('')
  const [profileSaveError, setProfileSaveError] = useState(null)
  const [passwordError, setPasswordError] = useState(null)
  const [passwordMessage, setPasswordMessage] = useState('')
  const [imageError, setImageError] = useState(null)
  const [imageMessage, setImageMessage] = useState('')
  const [imageLoadError, setImageLoadError] = useState(false)
  const [profileForm, setProfileForm] = useState({ name: '', username: '' })
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  })

  useEffect(() => {
    let cancelled = false

    const loadProfile = async () => {
      setIsLoading(true)
      setProfileError(null)

      try {
        const data = await getMyProfile()
        if (cancelled) return
        setProfile(data)
        setImageLoadError(false)
        setProfileForm({
          name: data?.name ?? '',
          username: data?.username ?? '',
        })
      } catch (error) {
        if (!cancelled) {
          setProfileError(formatApiError(error, 'Unable to load your profile right now.'))
        }
      } finally {
        if (!cancelled) setIsLoading(false)
      }
    }

    loadProfile()

    return () => {
      cancelled = true
    }
  }, [])

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
  const profileName =
    profile?.name || profile?.fullName || profile?.displayName || profile?.username || 'User profile'
  const profileRole = profile?.role || 'USER'
  const profileStatus = profile?.isActivated ? 'Active' : 'Inactive'
  const accountStats = [
    { label: 'User ID', value: profile?.id || profile?.userId || profile?.uuid || 'Not available' },
    { label: 'Username', value: profile?.username || 'Not available' },
    { label: 'Email', value: profile?.email || 'Not available' },
    { label: 'Role', value: profileRole },
    { label: 'Status', value: profileStatus },
    { label: 'Provider', value: profile?.provider || 'local' },
    { label: 'Created', value: formatDateTime(profile?.createdAt) },
    { label: 'Updated', value: formatDateTime(profile?.updatedAt) },
    { label: 'Password expiry', value: formatDateTime(profile?.passwordExpiryDate) },
  ]

  const handleProfileChange = (event) => {
    const { name, value } = event.target
    setProfileForm((previous) => ({ ...previous, [name]: value }))
  }

  const handlePasswordChange = (event) => {
    const { name, value } = event.target
    setPasswordForm((previous) => ({ ...previous, [name]: value }))
  }

  const handleProfileSubmit = async (event) => {
    event.preventDefault()
    setProfileSaveError(null)
    setProfileMessage('')
    setIsSavingProfile(true)

    try {
      const data = await updateMyProfile(profileForm)
      setProfile(data)
      setImageLoadError(false)
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('employee-profile-updated', { detail: data }))
      }
      setProfileForm({
        name: data?.name ?? '',
        username: data?.username ?? '',
      })
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
      setPasswordForm({
        currentPassword: '',
        newPassword: '',
        confirmPassword: '',
      })
      setPasswordMessage('Password changed successfully.')
    } catch (error) {
      setPasswordError(formatApiError(error, 'Unable to change your password.'))
    } finally {
      setIsSavingPassword(false)
    }
  }

  const handleImageUpload = async (event) => {
    const file = event.target.files?.[0]
    if (!file) return

    setImageError(null)
    setImageMessage('')
    setIsUpdatingImage(true)

    try {
      const data = await uploadMyProfileImage(file)
      setProfile(data)
      setImageLoadError(false)
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('employee-profile-updated', { detail: data }))
      }
      setImageMessage('Profile image updated.')
      event.target.value = ''
    } catch (error) {
      setImageError(formatApiError(error, 'Unable to upload the image.'))
    } finally {
      setIsUpdatingImage(false)
    }
  }

  const handleImageRemove = async () => {
    setImageError(null)
    setImageMessage('')
    setIsRemovingImage(true)

    try {
      const data = await removeMyProfileImage()
      setProfile(data)
      setImageLoadError(false)
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('employee-profile-updated', { detail: data }))
      }
      setImageMessage('Profile image removed.')
    } catch (error) {
      setImageError(formatApiError(error, 'Unable to remove the image.'))
    } finally {
      setIsRemovingImage(false)
    }
  }

  return (
    <EmployeeEntityPage
      eyebrow="Account"
      title="Profile"
      description="Manage your personal details, photo, and security settings."
    >
      {isLoading ? (
        <div className="space-y-6">
          <Card className="border-border bg-card shadow-sm shadow-black/5">
            <CardContent className="p-6 sm:p-8">
              <div className="flex items-center gap-5">
                <Skeleton className="size-24 rounded-full" />
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
            <Card className="border-border bg-card shadow-sm shadow-black/5 h-fit">
              <CardHeader>
                <Skeleton className="h-6 w-32" />
                <Skeleton className="mt-2 h-4 w-64" />
              </CardHeader>
              <CardContent>
                <div className="grid gap-4 sm:grid-cols-2">
                  {[1, 2, 3, 4, 5, 6].map((i) => (
                    <Skeleton key={i} className="h-16 rounded-xl" />
                  ))}
                </div>
              </CardContent>
            </Card>

            <div className="space-y-6">
              {[1, 2, 3].map((i) => (
                <Card key={i} className="border-border bg-card shadow-sm shadow-black/5">
                  <CardHeader>
                    <Skeleton className="h-5 w-40" />
                    <Skeleton className="mt-2 h-4 w-56" />
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <Skeleton className="h-10 w-full rounded-md" />
                    <Skeleton className="h-10 w-full rounded-md" />
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </div>
      ) : profileError ? (
        <Card className="border-border bg-card shadow-sm shadow-black/5">
          <CardContent className="px-6 py-8">
            <FormErrorBox error={profileError} />
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-6">
          {/* hero */}
          <Card className="relative overflow-hidden border-border bg-card shadow-sm shadow-black/5">
            <div className="pointer-events-none absolute inset-x-0 top-0 h-24 bg-gradient-to-b from-primary/5 to-transparent" />
            <CardContent className="relative p-6 sm:p-8">
              <div className="flex flex-col gap-5 sm:flex-row sm:items-center">
                <div className="relative shrink-0">
                  <div className="flex size-24 items-center justify-center overflow-hidden rounded-2xl border-4 border-background bg-muted font-heading text-3xl font-semibold text-foreground shadow-md">
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
                  {profile?.isActivated ? (
                    <span className="absolute -bottom-1 -right-1 flex size-7 items-center justify-center rounded-full border-2 border-card bg-emerald-500/20 text-emerald-600 dark:text-emerald-400">
                      <CheckCircle2 className="size-4" />
                    </span>
                  ) : null}
                </div>

                <div className="space-y-2">
                  <h2 className="font-heading text-2xl font-semibold tracking-tight">{profileName}</h2>
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="inline-flex items-center rounded-full border bg-muted/50 px-2.5 py-0.5 text-xs font-semibold text-foreground">
                      {profileRole}
                    </span>
                    <span
                      className={cn(
                        'inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium',
                        profile?.isActivated
                          ? 'border-emerald-500/25 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400'
                          : 'border-border bg-background text-muted-foreground',
                      )}
                    >
                      {profileStatus}
                    </span>
                    {profile?.email ? (
                      <span className="inline-flex items-center rounded-full border bg-background px-2.5 py-0.5 text-xs font-medium text-muted-foreground">
                        {profile.email}
                      </span>
                    ) : null}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <div className="grid gap-6 xl:grid-cols-[1fr_400px]">
            {/* account details */}
            <Card className="border-border bg-card shadow-sm shadow-black/5 h-fit">
              <CardHeader className="border-b border-border pb-4">
                <CardTitle className="text-base font-semibold">Account details</CardTitle>
                <CardDescription>Comprehensive overview of your profile information.</CardDescription>
              </CardHeader>
              <CardContent className="pt-5">
                <div className="grid gap-3 sm:grid-cols-2">
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
                </div>
              </CardContent>
            </Card>

            <div className="space-y-6">
              {/* general info */}
              <Card className="border-border bg-card shadow-sm shadow-black/5">
                <CardHeader className="border-b border-border pb-4">
                  <div className="flex items-center gap-2">
                    <UserRound className="size-4 text-muted-foreground" />
                    <CardTitle className="text-base font-semibold">General information</CardTitle>
                  </div>
                  <CardDescription>Update your personal details.</CardDescription>
                </CardHeader>
                <CardContent className="pt-5">
                  <form className="space-y-4" onSubmit={handleProfileSubmit}>
                    <div className="space-y-1.5">
                      <Label htmlFor="name">Name</Label>
                      <Input
                        id="name"
                        name="name"
                        value={profileForm.name}
                        onChange={handleProfileChange}
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="username">Username</Label>
                      <Input
                        id="username"
                        name="username"
                        value={profileForm.username}
                        onChange={handleProfileChange}
                      />
                    </div>

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

              {/* photo */}
              <Card className="border-border bg-card shadow-sm shadow-black/5">
                <CardHeader className="border-b border-border pb-4">
                  <div className="flex items-center gap-2">
                    <Upload className="size-4 text-muted-foreground" />
                    <CardTitle className="text-base font-semibold">Profile photo</CardTitle>
                  </div>
                  <CardDescription>Upload or remove your current photo.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4 pt-5">
                  <div className="flex flex-col gap-2 sm:flex-row">
                    <label className="flex h-9 w-full cursor-pointer items-center justify-center gap-2 rounded-lg border border-input bg-background px-3 py-2 text-sm font-medium transition-colors hover:bg-muted sm:flex-1">
                      {isUpdatingImage ? (
                        <Loader2 className="size-4 animate-spin text-muted-foreground" />
                      ) : (
                        <Upload className="size-4 text-muted-foreground" />
                      )}
                      {isUpdatingImage ? 'Uploading…' : 'Upload new'}
                      <input accept="image/*" className="sr-only" type="file" onChange={handleImageUpload} />
                    </label>

                    <Button
                      className="w-full gap-2 sm:w-auto"
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

              {/* security */}
              <Card className="border-border bg-card shadow-sm shadow-black/5">
                <CardHeader className="border-b border-border pb-4">
                  <div className="flex items-center gap-2">
                    <KeyRound className="size-4 text-muted-foreground" />
                    <CardTitle className="text-base font-semibold">Security</CardTitle>
                  </div>
                  <CardDescription>Update your password.</CardDescription>
                </CardHeader>
                <CardContent className="pt-5">
                  <form className="space-y-4" onSubmit={handlePasswordSubmit}>
                    <div className="space-y-1.5">
                      <Label htmlFor="currentPassword">Current password</Label>
                      <Input
                        id="currentPassword"
                        name="currentPassword"
                        type="password"
                        value={passwordForm.currentPassword}
                        onChange={handlePasswordChange}
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="newPassword">New password</Label>
                      <Input
                        id="newPassword"
                        name="newPassword"
                        type="password"
                        value={passwordForm.newPassword}
                        onChange={handlePasswordChange}
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="confirmPassword">Confirm password</Label>
                      <Input
                        id="confirmPassword"
                        name="confirmPassword"
                        type="password"
                        value={passwordForm.confirmPassword}
                        onChange={handlePasswordChange}
                      />
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
            </div>
          </div>
        </div>
      )}
    </EmployeeEntityPage>
  )
}

export { EmployeeProfilePage }
