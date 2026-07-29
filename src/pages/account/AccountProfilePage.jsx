import { useEffect, useMemo, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import {
  AtSign,
  Camera,
  CheckCircle2,
  Clock3,
  Eye,
  EyeOff,
  ImagePlus,
  KeyRound,
  Library,
  Loader2,
  LogOut,
  Mail,
  RotateCcw,
  Save,
  ShieldAlert,
  ShieldCheck,
  Trash2,
  Upload,
  User,
  UserRound,
} from 'lucide-react'

import '@/styles/khi-archive.css'
import '@/styles/khi-account.css'

import KhiHeader from '@/components/khi/KhiHeader'
import { KhiBreadcrumb } from '@/components/khi/KhiDetail'
import { DETAIL } from '@/components/khi/khi-data'
import { scorePassword } from '@/lib/password-strength'
import { FormErrorBox } from '@/components/ui/form-error'
import { TypedConfirmDialog } from '@/components/ui/typed-confirm-dialog'
import { getAccountArea } from '@/lib/account-role'
import { clearCurrentProfile, setCurrentProfile } from '@/lib/current-profile'
import { formatApiError } from '@/lib/get-error-message'
import { resolveProfileImageSource } from '@/lib/profile-image'
import { logout } from '@/services/auth'
import {
  changeMyPassword,
  deleteMyAccount,
  getMyProfile,
  removeMyProfileImage,
  updateMyProfile,
  uploadMyProfileImage,
} from '@/services/user-profile'

const MAX_IMAGE_BYTES = 5 * 1024 * 1024
const ACCEPTED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp']

const STRENGTH_LEVELS = ['زۆر کورتە', 'لاوازە', 'مامناوەندە', 'باشە', 'بەهێزە']

// The four sections of the account. Each is a tab in the rail; only one panel
// is mounted at a time so the page never becomes the endless scroll it was.
const SECTIONS = [
  { id: 'profile', icon: UserRound, title: 'زانیاری گشتی', hint: 'ناو، ناوی بەکارهێنەر و ئیمەیڵ' },
  { id: 'photo', icon: Camera, title: 'وێنەی پرۆفایل', hint: 'وێنەی هەژمارەکەت' },
  { id: 'security', icon: KeyRound, title: 'پاراستن', hint: 'گۆڕینی وشەی نهێنی' },
  { id: 'danger', icon: Trash2, title: 'سڕینەوەی هەژمار', hint: 'کارێکی نەگەڕاوە', danger: true },
]

function getInitials(name, username) {
  const source = (name || username || 'هەژمار').trim()
  const parts = source.split(/\s+/).filter(Boolean)
  return parts.slice(0, 2).map((part) => part.charAt(0).toUpperCase()).join('') || 'هـ'
}

// Numeric, language-neutral date — the ledger stays free of English month names.
function formatDay(value) {
  if (!value) return '—'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return '—'
  return new Intl.DateTimeFormat('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' }).format(date)
}

// Always-mounted live region (`.acc-live:empty` collapses it) — a role="status"
// node inserted together with its text is announced unreliably by screen
// readers, whereas a persistent one announces the change when it appears.
function Notice({ children }) {
  return (
    <div role="status" aria-live="polite" className="acc-live">
      {children ? (
        <p className="acc-note ok">
          <CheckCircle2 width="17" height="17" />
          <span>{children}</span>
        </p>
      ) : null}
    </div>
  )
}

function Field({ id, label, icon: Icon, hint, ltr = false, ...props }) {
  return (
    <div className="acc-field">
      <label className="acc-label" htmlFor={id}>{label}</label>
      <div className="acc-input-wrap" {...(ltr ? { dir: 'ltr' } : {})}>
        {Icon ? <Icon className="acc-input-ic" width="17" height="17" /> : null}
        <input id={id} className={`acc-input${Icon ? ' has-ic' : ''}`} {...props} />
      </div>
      {hint ? <p className="acc-hint">{hint}</p> : null}
    </div>
  )
}

function PasswordInput({ id, label, hint, children, ...props }) {
  const [show, setShow] = useState(false)
  return (
    <div className="acc-field">
      <label className="acc-label" htmlFor={id}>{label}</label>
      <div className="acc-input-wrap" dir="ltr">
        <KeyRound className="acc-input-ic" width="17" height="17" />
        <input
          id={id}
          type={show ? 'text' : 'password'}
          className="acc-input has-ic has-eye"
          {...props}
        />
        <button
          type="button"
          className="acc-eye"
          onClick={() => setShow((value) => !value)}
          aria-label={show ? 'شاردنەوەی وشەی نهێنی' : 'پیشاندانی وشەی نهێنی'}
          aria-pressed={show}
        >
          {show ? <EyeOff width="17" height="17" /> : <Eye width="17" height="17" />}
        </button>
      </div>
      {hint ? <p className="acc-hint">{hint}</p> : null}
      {children}
    </div>
  )
}

// Self-contained account workspace. It wears the public "Living Archive" skin
// (same header, palette and fonts as /public) so a GUEST — who has no role
// workspace to land in — stays inside one continuous archive, instead of being
// dropped into a dashboard shell that belongs to staff.
function AccountProfilePage() {
  const navigate = useNavigate()

  const [profile, setProfile] = useState(null)
  const [isLoading, setIsLoading] = useState(true)
  const [loadError, setLoadError] = useState(null)
  const [section, setSection] = useState('profile')

  const [isSavingProfile, setIsSavingProfile] = useState(false)
  const [isSavingPassword, setIsSavingPassword] = useState(false)
  const [isUpdatingImage, setIsUpdatingImage] = useState(false)
  const [isRemovingImage, setIsRemovingImage] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false)
  const [isDragging, setIsDragging] = useState(false)

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

  const tabRefs = useRef([])

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
  const isActivated = Boolean(profile?.isActivated)
  const roleLabel = isGuest ? 'میوان' : role

  // Only what a visitor actually needs to recognise their own card. The
  // technical fields (user id, provider, password expiry) stay hidden.
  const cardStats = [
    { label: 'ناوی بەکارهێنەر', value: profile?.username || '—', ltr: Boolean(profile?.username) },
    { label: 'ئیمەیڵ', value: profile?.email || '—', ltr: Boolean(profile?.email) },
    { label: 'ڕۆڵ', value: roleLabel },
    { label: 'بەشداربوو لە', value: formatDay(profile?.createdAt), ltr: Boolean(profile?.createdAt) },
  ]

  const isProfileDirty =
    profileForm.name !== (profile?.name ?? '') ||
    profileForm.username !== (profile?.username ?? '') ||
    profileForm.email !== (profile?.email ?? '')

  const passwordScore = scorePassword(passwordForm.newPassword)
  const passwordsMatch =
    passwordForm.confirmPassword.length > 0 &&
    passwordForm.newPassword === passwordForm.confirmPassword

  const passwordChecks = useMemo(() => {
    const value = passwordForm.newPassword
    return [
      { label: '٦ پیت یان زیاتر', met: value.length >= 6 },
      { label: 'پیتی گەورە و بچووک', met: /[a-z]/.test(value) && /[A-Z]/.test(value) },
      { label: 'ژمارە', met: /\d/.test(value) },
      { label: 'هێمای تایبەت', met: /[^A-Za-z0-9]/.test(value) },
    ]
  }, [passwordForm.newPassword])

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

  const handleProfileReset = () => {
    setProfileSaveError(null)
    setProfileMessage('')
    setProfileForm({
      name: profile?.name ?? '',
      username: profile?.username ?? '',
      email: profile?.email ?? '',
    })
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
      // Refresh the displayed profile — NOT profileForm — so any unsaved edits
      // in the general-information panel aren't silently wiped.
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

  // Validate locally first: a wrong type or an oversized file is a round-trip
  // (and a 4xx) the visitor never needs to wait for.
  const uploadImageFile = async (file) => {
    if (!file) return

    setImageError(null)
    setImageMessage('')

    if (!ACCEPTED_IMAGE_TYPES.includes(file.type)) {
      setImageError('تەنها فۆرماتەکانی JPEG، PNG، GIF یان WebP پەسەندکراون.')
      return
    }
    if (file.size > MAX_IMAGE_BYTES) {
      setImageError('قەبارەی وێنەکە دەبێت لە ٥ مێگابایت کەمتر بێت.')
      return
    }

    setIsUpdatingImage(true)
    try {
      const data = await uploadMyProfileImage(file)
      applyProfile(data)
      setImageMessage('وێنەی پرۆفایل نوێکرایەوە.')
    } catch (error) {
      setImageError(formatApiError(error, 'نەتوانرا وێنەکە باربکرێت.'))
    } finally {
      setIsUpdatingImage(false)
    }
  }

  const handleImageInput = async (event) => {
    const input = event.target
    await uploadImageFile(input.files?.[0])
    // Always clear (not just on success) so re-selecting the SAME file after an
    // error still fires onChange — a file input won't fire when value is unchanged.
    input.value = ''
  }

  const handleDrop = async (event) => {
    event.preventDefault()
    setIsDragging(false)
    if (isUpdatingImage) return
    await uploadImageFile(event.dataTransfer?.files?.[0])
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

  // Roving arrow-key navigation across the section rail (WAI-ARIA tabs).
  const handleTabKeyDown = (event, index) => {
    const forward = event.key === 'ArrowDown' || event.key === 'ArrowLeft'
    const backward = event.key === 'ArrowUp' || event.key === 'ArrowRight'
    let next = null

    if (forward) next = (index + 1) % SECTIONS.length
    else if (backward) next = (index - 1 + SECTIONS.length) % SECTIONS.length
    else if (event.key === 'Home') next = 0
    else if (event.key === 'End') next = SECTIONS.length - 1
    if (next === null) return

    event.preventDefault()
    setSection(SECTIONS[next].id)
    tabRefs.current[next]?.focus()
  }

  const activeSection = SECTIONS.find((item) => item.id === section) || SECTIONS[0]

  const portrait = hasProfileImage ? (
    <img src={displayImage} alt={profileName} onError={() => setImageLoadError(true)} />
  ) : (
    <span className="acc-portrait-initials">{initials}</span>
  )

  return (
    <div className="khi-root" dir="rtl" lang="ckb">
      <KhiHeader />

      <main className="khi-account">
        {isLoading ? (
          <div aria-busy="true" aria-label="بارکردنی هەژمار">
            <div className="acc-skel" style={{ height: 268, borderRadius: 28 }} />
            <div className="acc-body">
              <div className="acc-skel" style={{ height: 260 }} />
              <div className="acc-skel" style={{ height: 420, borderRadius: 22 }} />
            </div>
          </div>
        ) : loadError ? (
          <div className="acc-panel is-danger">
            <div className="acc-panel-head">
              <h2>ناتوانرێت هەژمارەکەت باربکرێت</h2>
              <p>پەیوەندییەکەت پشکنە و دووبارە هەوڵبدەرەوە، یان سەرلەنوێ بچۆ ژوورەوە.</p>
            </div>
            <div className="acc-panel-body">
              <FormErrorBox error={loadError} />
              <div className="acc-actions">
                <button type="button" className="detail-btn" onClick={handleSignOut}>
                  <LogOut width="17" height="17" />
                  دووبارە بچۆ ژوورەوە
                </button>
              </div>
            </div>
          </div>
        ) : (
          <>
            <KhiBreadcrumb items={[{ label: DETAIL.home, to: '/public' }, { label: 'هەژمارەکەم' }]} />

            {/* ── the reader's card ── */}
            <section className="acc-hero">
              <div className="acc-hero-grid">
                <button
                  type="button"
                  className="acc-portrait"
                  onClick={() => setSection('photo')}
                  aria-label="گۆڕینی وێنەی پرۆفایل"
                >
                  {portrait}
                  <span className="acc-portrait-cap" aria-hidden="true">
                    <Camera width="14" height="14" />
                    گۆڕین
                  </span>
                  {isActivated ? (
                    <span className="acc-portrait-check" aria-hidden="true">
                      <CheckCircle2 width="17" height="17" />
                    </span>
                  ) : null}
                </button>

                <div className="acc-id">
                  <p className="acc-id-kicker">هەژماری میوانی ئەرشیف</p>
                  <h1 className="acc-id-name">{profileName}</h1>
                  {profile?.username ? <span className="acc-id-handle">@{profile.username}</span> : null}
                  <div className="acc-id-actions">
                    <Link className="detail-btn primary" to="/public/browse?type=all">
                      <Library width="17" height="17" />
                      گەڕان لە ئەرشیف
                    </Link>
                    <button type="button" className="detail-btn" onClick={handleSignOut}>
                      <LogOut width="17" height="17" />
                      چوونەدەرەوە
                    </button>
                  </div>
                </div>

                <div className={`acc-seal${isActivated ? ' is-live' : ''}`}>
                  <span className="acc-seal-disc" aria-hidden="true">
                    {isActivated ? <ShieldCheck width="34" height="34" /> : <Clock3 width="32" height="32" />}
                  </span>
                  <span className="acc-seal-label">
                    {isActivated ? 'هەژماری چالاک' : 'چاوەڕێی چالاککردنی بەڕێوەبەر'}
                  </span>
                </div>
              </div>

              <dl className="acc-hero-stats">
                {cardStats.map((stat) => (
                  <div className="acc-stat" key={stat.label}>
                    <dt>{stat.label}</dt>
                    <dd
                      className={stat.ltr ? 'ltr' : undefined}
                      {...(stat.ltr ? { dir: 'ltr' } : {})}
                      title={String(stat.value)}
                    >
                      {stat.value}
                    </dd>
                  </div>
                ))}
              </dl>
            </section>

            {!isActivated ? (
              <p className="acc-note warn" style={{ marginTop: 18 }}>
                <ShieldAlert width="18" height="18" />
                <span>
                  هەژمارەکەت چاوەڕێی چالاککردنی بەڕێوەبەرە. دەتوانیت بگەڕێیت بەناو ئەرشیفی
                  گشتیدا و هەژمارەکەت بەڕێوەببەیت، بەڵام تا مۆڵەتت پێنەدرێت لاپەڕەکانی
                  کارکردن بەردەست نابن.
                </span>
              </p>
            ) : null}

            {/* ── rail + panel ── */}
            <div className="acc-body">
              <div>
                <div className="acc-rail" role="tablist" aria-orientation="vertical" aria-label="بەشەکانی هەژمار">
                  {SECTIONS.map((item, index) => {
                    const Icon = item.icon
                    const selected = item.id === section
                    return (
                      <button
                        key={item.id}
                        ref={(node) => { tabRefs.current[index] = node }}
                        type="button"
                        role="tab"
                        id={`acc-tab-${item.id}`}
                        aria-selected={selected}
                        aria-controls={`acc-panel-${item.id}`}
                        tabIndex={selected ? 0 : -1}
                        className={`acc-tab${selected ? ' on' : ''}${item.danger ? ' danger' : ''}`}
                        onClick={() => setSection(item.id)}
                        onKeyDown={(event) => handleTabKeyDown(event, index)}
                      >
                        <span className="acc-tab-ic"><Icon width="18" height="18" /></span>
                        <span className="acc-tab-copy">
                          <strong>{item.title}</strong>
                          <small>{item.hint}</small>
                        </span>
                      </button>
                    )
                  })}
                </div>

                <div className="acc-hint-card">
                  <h3>ئەرشیف بۆ هەمووان</h3>
                  <p>
                    وەک میوان دەتوانیت هەموو کۆگا گشتییەکان ببینیت. ئەگەر پێویستت بە
                    دەستگەیشتنی زیاترە، پەیوەندی بە بەڕێوەبەری ئەرشیفەوە بکە.
                  </p>
                </div>
              </div>

              <section
                className={`acc-panel${activeSection.danger ? ' is-danger' : ''}`}
                role="tabpanel"
                id={`acc-panel-${activeSection.id}`}
                aria-labelledby={`acc-tab-${activeSection.id}`}
                tabIndex={-1}
              >
                {section === 'profile' ? (
                  <>
                    <div className="acc-panel-head">
                      <h2>زانیاری گشتی</h2>
                      <p>ئەم زانیارییانە ناسنامەی تۆن لەناو ئەرشیفدا. هەر کاتێک بتەوێت دەتوانیت بیانگۆڕیت.</p>
                    </div>
                    <div className="acc-panel-body">
                      <form onSubmit={handleProfileSubmit}>
                        <div className="acc-fields">
                          <Field
                            id="acc-name"
                            name="name"
                            label="ناوی تەواو"
                            icon={User}
                            autoComplete="name"
                            maxLength={120}
                            placeholder="ناوی تەواوت بنووسە"
                            value={profileForm.name}
                            onChange={handleProfileChange}
                          />
                          <Field
                            id="acc-username"
                            name="username"
                            label="ناوی بەکارهێنەر"
                            icon={AtSign}
                            autoComplete="username"
                            minLength={3}
                            maxLength={80}
                            pattern="[A-Za-z0-9_]+"
                            title="تەنها پیت، ژمارە و هێمای ژێرهێڵ بەکاربهێنە"
                            ltr
                            hint="تەنها پیتی ئینگلیزی، ژمارە و هێمای ژێرهێڵ (_)."
                            value={profileForm.username}
                            onChange={handleProfileChange}
                          />
                          <Field
                            id="acc-email"
                            name="email"
                            label="ئیمەیڵ"
                            icon={Mail}
                            type="email"
                            autoComplete="email"
                            maxLength={160}
                            ltr
                            hint={
                              isGuest
                                ? 'ئیمەیڵەکەت دەبێت ڕاست و گەیشتوو بێت؛ دۆمەینی ساختە ڕەتدەکرێتەوە.'
                                : undefined
                            }
                            value={profileForm.email}
                            onChange={handleProfileChange}
                          />
                        </div>

                        <Notice>{profileMessage}</Notice>
                        {profileSaveError ? (
                          <div style={{ marginTop: 16 }}><FormErrorBox error={profileSaveError} /></div>
                        ) : null}

                        <div className="acc-actions">
                          <button className="detail-btn primary" type="submit" disabled={isSavingProfile || !isProfileDirty}>
                            {isSavingProfile ? (
                              <Loader2 className="acc-spin" width="17" height="17" />
                            ) : (
                              <Save width="17" height="17" />
                            )}
                            پاشەکەوتکردن
                          </button>
                          <button
                            className="detail-btn"
                            type="button"
                            onClick={handleProfileReset}
                            disabled={isSavingProfile || !isProfileDirty}
                          >
                            <RotateCcw width="17" height="17" />
                            پاشگەزبوونەوە
                          </button>
                          {isProfileDirty ? <span className="acc-dirty">گۆڕانکاری پاشەکەوت نەکراو</span> : null}
                        </div>
                      </form>
                    </div>
                  </>
                ) : null}

                {section === 'photo' ? (
                  <>
                    <div className="acc-panel-head">
                      <h2>وێنەی پرۆفایل</h2>
                      <p>وێنەکە لە سەرەوەی ئەرشیف و لەسەر کارتی هەژمارەکەت دەردەکەوێت.</p>
                    </div>
                    <div className="acc-panel-body">
                      <div className="acc-photo">
                        <label
                          className={`acc-drop${isDragging ? ' is-dragging' : ''}`}
                          onDragOver={(event) => { event.preventDefault(); setIsDragging(true) }}
                          onDragLeave={() => setIsDragging(false)}
                          onDrop={handleDrop}
                        >
                          {hasProfileImage ? (
                            <img src={displayImage} alt={profileName} onError={() => setImageLoadError(true)} />
                          ) : (
                            <span className="acc-drop-initials">{initials}</span>
                          )}
                          <span className="acc-drop-veil">
                            {isUpdatingImage ? (
                              <Loader2 className="acc-spin" width="24" height="24" />
                            ) : (
                              <ImagePlus width="24" height="24" />
                            )}
                            {isUpdatingImage ? 'بارکردن…' : 'وێنە دابنێ یان هەڵبژێرە'}
                          </span>
                          <input
                            type="file"
                            className="sr-only"
                            accept={ACCEPTED_IMAGE_TYPES.join(',')}
                            disabled={isUpdatingImage}
                            onChange={handleImageInput}
                          />
                        </label>

                        <div className="acc-photo-copy">
                          <h3>وێنەیەکی ڕوون هەڵبژێرە</h3>
                          <p>
                            JPEG، PNG، GIF یان WebP — تا ٥ مێگابایت. وێنەی چوارگۆشە باشترین
                            ئەنجام دەدات، چونکە بە بازنەیی پیشان دەدرێت.
                          </p>

                          <Notice>{imageMessage}</Notice>
                          {imageError ? (
                            <div style={{ marginTop: 16 }}>
                              {typeof imageError === 'string'
                                ? <p className="acc-note bad"><ShieldAlert width="17" height="17" /><span>{imageError}</span></p>
                                : <FormErrorBox error={imageError} />}
                            </div>
                          ) : null}

                          <div className="acc-actions">
                            <label className="detail-btn primary" style={{ cursor: 'pointer' }}>
                              {isUpdatingImage ? (
                                <Loader2 className="acc-spin" width="17" height="17" />
                              ) : (
                                <Upload width="17" height="17" />
                              )}
                              {isUpdatingImage ? 'بارکردن…' : 'وێنەی نوێ باربکە'}
                              <input
                                type="file"
                                className="sr-only"
                                accept={ACCEPTED_IMAGE_TYPES.join(',')}
                                disabled={isUpdatingImage}
                                onChange={handleImageInput}
                              />
                            </label>
                            <button
                              type="button"
                              className="detail-btn danger"
                              disabled={isRemovingImage || !displayImage}
                              onClick={handleImageRemove}
                            >
                              {isRemovingImage ? (
                                <Loader2 className="acc-spin" width="17" height="17" />
                              ) : (
                                <Trash2 width="17" height="17" />
                              )}
                              سڕینەوەی وێنە
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  </>
                ) : null}

                {section === 'security' ? (
                  <>
                    <div className="acc-panel-head">
                      <h2>گۆڕینی وشەی نهێنی</h2>
                      <p>
                        وشەی نهێنی ئێستا بنووسە، پاشان وشەیەکی نوێ. ئەگەر لەبیرت چووە،
                        داوای یارمەتی لە بەڕێوەبەر بکە.
                      </p>
                    </div>
                    <div className="acc-panel-body">
                      <form onSubmit={handlePasswordSubmit}>
                        <div className="acc-fields">
                          <PasswordInput
                            id="acc-current-password"
                            name="currentPassword"
                            label="وشەی نهێنی ئێستا"
                            autoComplete="current-password"
                            value={passwordForm.currentPassword}
                            onChange={handlePasswordChange}
                            required
                          />

                          <PasswordInput
                            id="acc-new-password"
                            name="newPassword"
                            label="وشەی نهێنی نوێ"
                            autoComplete="new-password"
                            minLength={6}
                            maxLength={128}
                            value={passwordForm.newPassword}
                            onChange={handlePasswordChange}
                            required
                          >
                            {passwordForm.newPassword ? (
                              <div className="acc-strength" data-score={passwordScore}>
                                <div className="acc-strength-bars" aria-hidden="true">
                                  {[0, 1, 2, 3].map((index) => (
                                    <span key={index} className={index < passwordScore ? 'on' : undefined} />
                                  ))}
                                </div>
                                <p className="acc-strength-label">
                                  هێزی وشەی نهێنی: <b>{STRENGTH_LEVELS[passwordScore]}</b>
                                </p>
                                <ul className="acc-reqs">
                                  {passwordChecks.map((check) => (
                                    <li key={check.label} className={check.met ? 'met' : undefined}>{check.label}</li>
                                  ))}
                                </ul>
                              </div>
                            ) : null}
                          </PasswordInput>

                          <PasswordInput
                            id="acc-confirm-password"
                            name="confirmPassword"
                            label="پشتڕاستکردنەوەی وشەی نهێنی نوێ"
                            autoComplete="new-password"
                            minLength={6}
                            maxLength={128}
                            value={passwordForm.confirmPassword}
                            onChange={handlePasswordChange}
                            required
                          >
                            <div role="status" aria-live="polite">
                              {passwordForm.confirmPassword.length > 0 ? (
                                <p className="acc-hint" style={passwordsMatch ? { color: '#2f7d4f', fontWeight: 700 } : undefined}>
                                  {passwordsMatch ? 'وشە نهێنییەکان وەک یەکن ✓' : 'هێشتا وەک یەک نین'}
                                </p>
                              ) : null}
                            </div>
                          </PasswordInput>
                        </div>

                        <Notice>{passwordMessage}</Notice>
                        {passwordError ? (
                          <div style={{ marginTop: 16 }}>
                            {typeof passwordError === 'string'
                              ? <p className="acc-note bad"><ShieldAlert width="17" height="17" /><span>{passwordError}</span></p>
                              : <FormErrorBox error={passwordError} />}
                          </div>
                        ) : null}

                        <div className="acc-actions">
                          <button className="detail-btn primary" type="submit" disabled={isSavingPassword}>
                            {isSavingPassword ? (
                              <Loader2 className="acc-spin" width="17" height="17" />
                            ) : (
                              <KeyRound width="17" height="17" />
                            )}
                            گۆڕینی وشەی نهێنی
                          </button>
                        </div>
                      </form>
                    </div>
                  </>
                ) : null}

                {section === 'danger' ? (
                  <>
                    <div className="acc-panel-head">
                      <h2>سڕینەوەی هەژمار</h2>
                      <p>ئەم کارە ناگەڕێتەوە. پێش ئەنجامدانی دڵنیابە.</p>
                    </div>
                    <div className="acc-panel-body">
                      <div className="acc-danger-box">
                        <h3>ئەمانە بە هەمیشەیی دەسڕدرێنەوە:</h3>
                        <ul>
                          <li>هەژمارەکەت و هەموو زانیارییە کەسییەکانت</li>
                          <li>وێنەی پرۆفایل</li>
                          <li>هەموو دانیشتنە کراوەکان لە هەموو ئامێرەکاندا</li>
                        </ul>
                      </div>

                      {deleteError ? (
                        <div style={{ marginTop: 16 }}><FormErrorBox error={deleteError} /></div>
                      ) : null}

                      <div className="acc-actions">
                        <button
                          type="button"
                          className="detail-btn danger solid"
                          onClick={() => {
                            setDeleteError(null)
                            setConfirmDeleteOpen(true)
                          }}
                        >
                          <Trash2 width="17" height="17" />
                          هەژمارەکەم بسڕەوە
                        </button>
                      </div>
                    </div>
                  </>
                ) : null}
              </section>
            </div>
          </>
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
