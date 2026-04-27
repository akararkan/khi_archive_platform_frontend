import { useEffect, useState } from 'react'
import {
  Camera,
  KeyRound,
  Loader2,
  Mail,
  Save,
  Shield,
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
import { getErrorMessage } from '@/lib/get-error-message'
import { resolveProfileImageSource } from '@/lib/profile-image'
import {
  changeMyPassword,
  getMyProfile,
  removeMyProfileImage,
  updateMyProfile,
  uploadMyProfileImage,
} from '@/services/user-profile'

function formatDateTime(value) {
  if (!value) {
    return 'Not available'
  }

  const date = new Date(value)

  if (Number.isNaN(date.getTime())) {
    return 'Not available'
  }

  return new Intl.DateTimeFormat(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(date)
}

function getInitials(name, username) {
  const source = (name || username || 'User').trim()
  const parts = source.split(/\s+/).filter(Boolean)
  const initials = parts.slice(0, 2).map((part) => part.charAt(0).toUpperCase()).join('')
  return initials || 'U'
}

function EmployeeProfilePage() {
  const [profile, setProfile] = useState(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isSavingProfile, setIsSavingProfile] = useState(false)
  const [isSavingPassword, setIsSavingPassword] = useState(false)
  const [isUpdatingImage, setIsUpdatingImage] = useState(false)
  const [isRemovingImage, setIsRemovingImage] = useState(false)
  const [profileError, setProfileError] = useState('')
  const [profileMessage, setProfileMessage] = useState('')
  const [profileSaveError, setProfileSaveError] = useState('')
  const [passwordError, setPasswordError] = useState('')
  const [passwordMessage, setPasswordMessage] = useState('')
  const [imageError, setImageError] = useState('')
  const [imageMessage, setImageMessage] = useState('')
  const [imageLoadError, setImageLoadError] = useState(false)
  const [profileForm, setProfileForm] = useState({
    name: '',
    username: '',
  })
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  })

  useEffect(() => {
    let cancelled = false

    const loadProfile = async () => {
      setIsLoading(true)
      setProfileError('')

      try {
        const data = await getMyProfile()

        if (cancelled) {
          return
        }

        setProfile(data)
        setImageLoadError(false)
        setProfileForm({
          name: data?.name ?? '',
          username: data?.username ?? '',
        })
      } catch (error) {
        if (!cancelled) {
          setProfileError(getErrorMessage(error, 'Unable to load your profile right now.'))
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false)
        }
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
  const profileName = profile?.name || profile?.fullName || profile?.displayName || profile?.username || 'User profile'
  const profileRole = profile?.role || 'USER'
  const profileStatus = profile?.isActivated ? 'Active' : 'Inactive'
  const accountStats = [
    {
      label: 'User ID',
      value: profile?.id || profile?.userId || profile?.uuid || 'Not available',
    },
    {
      label: 'Username',
      value: profile?.username || 'Not available',
    },
    {
      label: 'Email',
      value: profile?.email || 'Not available',
    },
    {
      label: 'Role',
      value: profileRole,
    },
    {
      label: 'Status',
      value: profileStatus,
    },
    {
      label: 'Provider',
      value: profile?.provider || 'local',
    },
    {
      label: 'Created',
      value: formatDateTime(profile?.createdAt),
    },
    {
      label: 'Updated',
      value: formatDateTime(profile?.updatedAt),
    },
    {
      label: 'Password expiry',
      value: formatDateTime(profile?.passwordExpiryDate),
    },
  ]

  const handleProfileChange = (event) => {
    const { name, value } = event.target

    setProfileForm((previous) => ({
      ...previous,
      [name]: value,
    }))
  }

  const handlePasswordChange = (event) => {
    const { name, value } = event.target

    setPasswordForm((previous) => ({
      ...previous,
      [name]: value,
    }))
  }

  const handleProfileSubmit = async (event) => {
    event.preventDefault()
    setProfileSaveError('')
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
      setProfileSaveError(getErrorMessage(error, 'Unable to update your profile.'))
    } finally {
      setIsSavingProfile(false)
    }
  }

  const handlePasswordSubmit = async (event) => {
    event.preventDefault()
    setPasswordError('')
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
      setPasswordError(getErrorMessage(error, 'Unable to change your password.'))
    } finally {
      setIsSavingPassword(false)
    }
  }

  const handleImageUpload = async (event) => {
    const file = event.target.files?.[0]

    if (!file) {
      return
    }

    setImageError('')
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
      setImageError(getErrorMessage(error, 'Unable to upload the image.'))
    } finally {
      setIsUpdatingImage(false)
    }
  }

  const handleImageRemove = async () => {
    setImageError('')
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
      setImageError(getErrorMessage(error, 'Unable to remove the image.'))
    } finally {
      setIsRemovingImage(false)
    }
  }

  return (
    <EmployeeEntityPage title="Profile" description="View and update your account details.">
      {isLoading ? (
        <div className="space-y-6">
          <Card className="border-border bg-card shadow-sm shadow-black/5">
            <CardContent className="p-6 sm:p-8">
              <div className="flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-center gap-5">
                  <Skeleton className="size-24 rounded-full" />
                  <div className="space-y-3">
                    <Skeleton className="h-8 w-48" />
                    <div className="flex gap-2">
                      <Skeleton className="h-5 w-16 px-2.5 py-0.5 rounded-full" />
                      <Skeleton className="h-5 w-16 px-2.5 py-0.5 rounded-full" />
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <div className="grid gap-6 xl:grid-cols-[1fr_400px]">
            <Card className="border-border bg-card shadow-sm shadow-black/5 h-fit">
              <CardHeader>
                <Skeleton className="h-6 w-32" />
                <Skeleton className="h-4 w-64 mt-2" />
              </CardHeader>
              <CardContent>
                <div className="grid gap-4 sm:grid-cols-2">
                  <Skeleton className="h-16 rounded-xl" />
                  <Skeleton className="h-16 rounded-xl" />
                  <Skeleton className="h-16 rounded-xl" />
                  <Skeleton className="h-16 rounded-xl" />
                  <Skeleton className="h-16 rounded-xl" />
                  <Skeleton className="h-16 rounded-xl" />
                </div>
              </CardContent>
            </Card>

            <div className="space-y-6">
              <Card className="border-border bg-card shadow-sm shadow-black/5">
                <CardHeader>
                  <Skeleton className="h-5 w-40" />
                  <Skeleton className="h-4 w-56 mt-2" />
                </CardHeader>
                <CardContent className="space-y-4">
                  <Skeleton className="h-10 w-full rounded-md" />
                  <Skeleton className="h-10 w-full rounded-md" />
                  <Skeleton className="h-10 w-full rounded-md" />
                </CardContent>
              </Card>

              <Card className="border-border bg-card shadow-sm shadow-black/5">
                <CardHeader>
                  <Skeleton className="h-5 w-44" />
                  <Skeleton className="h-4 w-60 mt-2" />
                </CardHeader>
                <CardContent className="space-y-4">
                   <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-4">
                     <Skeleton className="h-10 w-full sm:w-32 rounded-md" />
                     <Skeleton className="h-10 w-full sm:w-24 rounded-md" />
                   </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      ) : profileError ? (
        <Card className="border-border bg-card shadow-sm shadow-black/5">
          <CardContent className="px-6 py-8 text-sm text-destructive">{profileError}</CardContent>
        </Card>
      ) : (
        <div className="space-y-6">
          <Card className="relative overflow-hidden border-border bg-card shadow-sm shadow-black/5">
            <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-primary/70 to-transparent" />
            
            <CardContent className="relative p-6 sm:p-8">
              <div className="flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-center gap-5">
                  <div className="relative shrink-0">
                    <div className="flex size-24 items-center justify-center overflow-hidden rounded-full border-4 border-background bg-muted text-3xl font-semibold text-foreground shadow-sm">
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
                  </div>

                  <div className="space-y-1.5">
                    <h2 className="text-2xl font-semibold tracking-tight">{profileName}</h2>
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="inline-flex items-center rounded-full border border-border bg-muted/50 px-2.5 py-0.5 text-xs font-semibold text-foreground">
                        {profileRole}
                      </span>
                      <span className="inline-flex items-center rounded-full border border-border bg-background px-2.5 py-0.5 text-xs font-medium text-muted-foreground">
                        {profileStatus}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <div className="grid gap-6 xl:grid-cols-[1fr_400px]">
            <Card className="border-border bg-card shadow-sm shadow-black/5 h-fit">
              <CardHeader>
                <CardTitle className="text-xl font-semibold">Account details</CardTitle>
                <CardDescription>Comprehensive overview of your profile information.</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid gap-4 sm:grid-cols-2">
                  {accountStats.map((item) => (
                    <div key={item.label} className="flex flex-col gap-1 rounded-xl border border-border bg-muted/20 px-4 py-3">
                      <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                        {item.label}
                      </p>
                      <p className="text-sm font-medium text-foreground">{item.value}</p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <div className="space-y-6">
              <Card className="border-border bg-card shadow-sm shadow-black/5">
                <CardHeader>
                  <CardTitle className="text-lg font-semibold">General Information</CardTitle>
                  <CardDescription>Update your personal details.</CardDescription>
                </CardHeader>
                <CardContent>
                  <form className="space-y-4" onSubmit={handleProfileSubmit}>
                    <div className="space-y-2">
                      <Label htmlFor="name">Name</Label>
                      <Input
                        id="name"
                        name="name"
                        value={profileForm.name}
                        onChange={handleProfileChange}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="username">Username</Label>
                      <Input
                        id="username"
                        name="username"
                        value={profileForm.username}
                        onChange={handleProfileChange}
                      />
                    </div>

                    {profileMessage ? (
                      <p className="rounded-md bg-emerald-500/10 px-3 py-2 text-sm text-emerald-600 dark:text-emerald-400">
                        {profileMessage}
                      </p>
                    ) : null}

                    {profileSaveError ? (
                      <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
                        {profileSaveError}
                      </p>
                    ) : null}

                    <Button className="w-full gap-2" type="submit" disabled={isSavingProfile}>
                      {isSavingProfile ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />}
                      Save changes
                    </Button>
                  </form>
                </CardContent>
              </Card>

              <Card className="border-border bg-card shadow-sm shadow-black/5">
                <CardHeader>
                  <CardTitle className="text-lg font-semibold">Profile Photo</CardTitle>
                  <CardDescription>Update or remove your current photo.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-4">
                    <label className="flex h-10 w-full cursor-pointer items-center justify-center gap-2 rounded-md border border-input bg-background px-4 py-2 text-sm font-medium transition-colors hover:bg-accent hover:text-accent-foreground sm:w-auto">
                      {isUpdatingImage ? (
                        <Loader2 className="size-4 animate-spin text-muted-foreground" />
                      ) : (
                        <Upload className="size-4 text-muted-foreground" />
                      )}
                      Upload photo
                      <input accept="image/*" className="hidden" type="file" onChange={handleImageUpload} />
                    </label>

                    <Button
                      className="w-full gap-2 sm:w-auto"
                      variant="outline"
                      type="button"
                      disabled={isRemovingImage || !displayImage}
                      onClick={handleImageRemove}
                    >
                      {isRemovingImage ? <Loader2 className="size-4 animate-spin" /> : <Trash2 className="size-4" />}
                      Remove
                    </Button>
                  </div>

                  {imageMessage ? (
                    <p className="rounded-md bg-emerald-500/10 px-3 py-2 text-sm text-emerald-600 dark:text-emerald-400">
                      {imageMessage}
                    </p>
                  ) : null}

                  {imageError ? (
                    <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
                      {imageError}
                    </p>
                  ) : null}
                </CardContent>
              </Card>

              <Card className="border-border bg-card shadow-sm shadow-black/5">
                <CardHeader>
                  <CardTitle className="text-lg font-semibold">Security</CardTitle>
                  <CardDescription>Update your password.</CardDescription>
                </CardHeader>
                <CardContent>
                  <form className="space-y-4" onSubmit={handlePasswordSubmit}>
                    <div className="space-y-1.5">
                      <Label htmlFor="currentPassword">Current password</Label>
                      <Input
                        id="currentPassword"
                        name="currentPassword"
                        type="password"
                        value={passwordForm.currentPassword}
                        onChange={handlePasswordChange}
                        className="h-11"
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
                        className="h-11"
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
                        className="h-11"
                      />
                    </div>

                    {passwordMessage ? (
                      <p className="rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
                        {passwordMessage}
                      </p>
                    ) : null}

                    {passwordError ? (
                      <p className="rounded-xl border border-destructive/20 bg-destructive/10 px-3 py-2 text-sm text-destructive">
                        {passwordError}
                      </p>
                    ) : null}

                    <Button className="w-full gap-2" type="submit" disabled={isSavingPassword}>
                      {isSavingPassword ? <Loader2 className="size-4 animate-spin" /> : <KeyRound className="size-4" />}
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