import React, { useEffect, useRef, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'

import { KhiLogo } from '@/components/brand/KhiLogo'
import { getStoredToken, logout } from '@/services/auth'
import { useCurrentProfile } from '@/hooks/use-current-profile'
import { getAccountArea, getAccountHomePath } from '@/lib/account-role'
import { resolveProfileImageSource } from '@/lib/profile-image'
import { IconSearch, IconSignout, IconSignin, IconPerson, IconDashboard, IconLanguage, IconChevron } from './icons'
import { GoogleTranslateWidget } from '@/components/ui/google-translate'
import { UI } from './khi-data'

// Sticky public header: brand → home, a global search that lands on the public
// media grid, and auth actions (workspace/sign-out when logged in, else
// sign-in/register). Search seeds from the current ?q so it stays in sync.
export default function KhiHeader() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const [q, setQ] = useState(searchParams.get('q') || '')
  const isAuthed = Boolean(getStoredToken())
  const profile = useCurrentProfile()
  const accountArea = isAuthed ? getAccountArea(profile?.role) : 'guest'
  const dashboardPath = isAuthed && profile ? getAccountHomePath(profile) : null
  const showDashboard = dashboardPath && ['admin', 'employee', 'teacher'].includes(accountArea)
  const showGuestAccount = isAuthed && profile && accountArea === 'guest'
  const accountName = profile?.name || profile?.username || UI.profile
  const accountUsername = profile?.username
  const accountImage = profile?.profileImageSource || resolveProfileImageSource(profile)
  const accountInitial = accountName.charAt(0).toUpperCase()

  // Keep the box in sync when the URL query changes via chips or navigation.
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setQ(searchParams.get('q') || '')
  }, [searchParams])

  const [translateOpen, setTranslateOpen] = useState(false)
  const [profileOpen, setProfileOpen] = useState(false)
  const profileButtonRef = useRef(null)
  const profileMenuRef = useRef(null)

  const submit = (event) => {
    event?.preventDefault()
    const term = q.trim()
    navigate(`/public/browse?type=all${term ? `&q=${encodeURIComponent(term)}` : ''}`)
  }

  const toggleTranslate = () => setTranslateOpen((open) => !open)
  const toggleProfileMenu = () => setProfileOpen((open) => !open)
  const closeProfileMenu = () => setProfileOpen(false)

  const onSignout = () => {
    logout()
    closeProfileMenu()
    navigate('/public', { replace: true })
  }

  useEffect(() => {
    if (!profileOpen) return undefined

    const handleClickOutside = (event) => {
      if (
        profileMenuRef.current?.contains(event.target) ||
        profileButtonRef.current?.contains(event.target)
      ) {
        return
      }
      closeProfileMenu()
    }

    const handleEscape = (event) => {
      if (event.key === 'Escape') closeProfileMenu()
    }

    document.addEventListener('mousedown', handleClickOutside)
    document.addEventListener('keydown', handleEscape)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
      document.removeEventListener('keydown', handleEscape)
    }
  }, [profileOpen])

  return (
    <header className="nav">
      <div className="wrap">
        <Link className="brand" to="/public">
          <KhiLogo className="mark" priority />
          <span className="txt">
            <b>{UI.brand}</b>
            {/* <span>{UI.brandSub}</span> */}
          </span>
        </Link>

        <form className="search" onSubmit={submit}>
          <button type="submit" className="ico" aria-label={UI.go}><IconSearch /></button>
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder={UI.searchPlaceholder}
          />
        </form>

        <div className="nav-actions">
          <button type="button" className="btn btn-translate" onClick={toggleTranslate} aria-label="وەرگێڕان">
            <IconLanguage />
          </button>
          {translateOpen ? (
            <div className="translate-popover">
              <GoogleTranslateWidget />
            </div>
          ) : null}
          {isAuthed ? (
            <>
              {showDashboard && (
                <Link className="btn btn-ghost" to={dashboardPath}><IconDashboard /><span>{UI.dashboard}</span></Link>
              )}
              {showGuestAccount ? (
                <Link className="account-identity" to="/account">
                  <span className="account-avatar">
                    {accountImage ? <img src={accountImage} alt="" /> : accountInitial}
                  </span>
                  <span className="account-copy">
                    <strong>{accountName}</strong>
                    <small>{accountUsername ? `@${accountUsername}` : UI.profile}</small>
                  </span>
                  <IconPerson className="account-identity-chevron" />
                </Link>
              ) : (
                <button
                  ref={profileButtonRef}
                  type="button"
                  className="account-identity"
                  aria-haspopup="dialog"
                  aria-expanded={profileOpen}
                  onClick={toggleProfileMenu}
                >
                  <span className="account-avatar">
                    {accountImage ? <img src={accountImage} alt="" /> : accountInitial}
                  </span>
                  <span className="account-copy">
                    <strong>{accountName}</strong>
                    <small>{accountUsername ? `@${accountUsername}` : UI.profile}</small>
                  </span>
                  <IconChevron className={`account-identity-chevron${profileOpen ? ' open' : ''}`} />
                </button>
              )}
              {profileOpen && !showGuestAccount ? (
                <div ref={profileMenuRef} className="account-dropdown" role="dialog" aria-label="Account menu">
                  <div className="account-dropdown-hero">
                    <div className="account-avatar account-dropdown-avatar">
                      {accountImage ? <img src={accountImage} alt={accountName} /> : accountInitial}
                    </div>
                    <div className="account-dropdown-hero-copy">
                      <p className="account-dropdown-name">{accountName}</p>
                      <p className="account-dropdown-meta">{accountUsername ? `@${accountUsername}` : UI.profile}</p>
                      {profile?.email ? <p className="account-dropdown-email">{profile.email}</p> : null}
                    </div>
                  </div>
                  <div className="account-dropdown-row">
                    <span>Role</span>
                    <strong>{profile?.role || 'Guest'}</strong>
                  </div>
                  <div className="account-dropdown-actions">
                    {showDashboard && (
                      <Link className="btn btn-ghost" to={dashboardPath} onClick={closeProfileMenu}>
                        <IconDashboard className="size-4" />
                        Dashboard
                      </Link>
                    )}
                    <button className="btn btn-line w-full" type="button" onClick={onSignout}>
                      <IconSignout className="size-4" />
                      {UI.signout}
                    </button>
                  </div>
                </div>
              ) : null}
            </>
          ) : (
            <>
              <Link className="btn btn-ghost" to="/register"><IconPerson /><span>{UI.register}</span></Link>
              <Link className="btn btn-line" to="/login"><IconSignin /><span>{UI.signin}</span></Link>
            </>
          )}
        </div>
      </div>
    </header>
  )
}
