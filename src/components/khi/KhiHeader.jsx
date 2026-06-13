import React, { useEffect, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'

import { getStoredToken, logout } from '@/services/auth'
import { useCurrentProfile } from '@/hooks/use-current-profile'
import { getAccountArea, getAccountHomePath } from '@/lib/account-role'
import { IconBook, IconSearch, IconSignout, IconSignin, IconPerson, IconDashboard } from './icons'
import { UI } from './khi-data'

// Sticky public header: brand → home, a global search that lands on the unified
// results feed, and auth actions (workspace/sign-out when logged in, else
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

  // Keep the box in sync when the URL query changes via chips or navigation.
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setQ(searchParams.get('q') || '')
  }, [searchParams])

  const submit = (event) => {
    event?.preventDefault()
    const term = q.trim()
    navigate(`/public/browse?type=all${term ? `&q=${encodeURIComponent(term)}` : ''}`)
  }

  const onSignout = () => {
    logout()
    navigate('/public', { replace: true })
  }

  return (
    <header className="nav">
      <div className="wrap">
        <Link className="brand" to="/public">
          <span className="mark"><IconBook /></span>
          <span className="txt">
            <b>{UI.brand}</b>
            <span>{UI.brandSub}</span>
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
          {isAuthed ? (
            <>
              {showDashboard && (
                <Link className="btn btn-ghost" to={dashboardPath}><IconDashboard /><span>{UI.dashboard}</span></Link>
              )}
              <Link className="btn btn-ghost" to="/account"><IconPerson /><span>{UI.profile}</span></Link>
              <button className="btn btn-line" type="button" onClick={onSignout}><IconSignout /><span>{UI.signout}</span></button>
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
