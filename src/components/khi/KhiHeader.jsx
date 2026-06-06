import React, { useEffect, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'

import { getStoredToken, logout } from '@/services/auth'
import { IconBook, IconSearch, IconWorkspace, IconSignout, IconSignin, IconPerson } from './icons'
import { KhiToneSlider } from './KhiToneSlider'
import { UI } from './khi-data'

// Sticky public header: brand → home, a global search that lands on the unified
// results feed, and auth actions (workspace/sign-out when logged in, else
// sign-in/register). Search seeds from the current ?q so it stays in sync.
export default function KhiHeader() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const [q, setQ] = useState(searchParams.get('q') || '')
  const isAuthed = Boolean(getStoredToken())

  // Keep the box in sync when the URL query changes (e.g. via hero / chips).
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setQ(searchParams.get('q') || '')
  }, [searchParams])

  const submit = () => {
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

        <div className="search">
          <span className="ico"><IconSearch /></span>
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') submit() }}
            placeholder={UI.searchPlaceholder}
          />
        </div>

        <div className="nav-actions">
          <KhiToneSlider />
          {isAuthed ? (
            <>
              <Link className="btn btn-ghost" to="/dashboard"><IconWorkspace /><span>{UI.workspace}</span></Link>
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
