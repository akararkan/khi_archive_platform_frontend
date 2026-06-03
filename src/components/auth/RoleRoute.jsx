import { useEffect, useState } from 'react'
import { Outlet, useNavigate } from 'react-router-dom'

import { PageLoader } from '@/components/ui/page-loader'
import { getAccountArea, getAccountHomePath } from '@/lib/account-role'
import { logout } from '@/services/auth'
import { getMyProfile } from '@/services/user-profile'

function RoleRoute({ allowedRole }) {
  const navigate = useNavigate()
  const [isReady, setIsReady] = useState(false)

  useEffect(() => {
    let cancelled = false

    const verifyRole = async () => {
      try {
        const profile = await getMyProfile()

        if (cancelled) {
          return
        }

        const accountArea = getAccountArea(profile?.role)

        // Send a mismatched user to their OWN workspace home rather than a
        // fixed fallback. This keeps the redirect correct for every role
        // (admin / employee / teacher / guest) and avoids the admin↔employee
        // bounce that a fixed cross-fallback would cause for a teacher.
        if (accountArea !== allowedRole) {
          navigate(getAccountHomePath(profile), { replace: true })
          return
        }

        setIsReady(true)
      } catch {
        if (!cancelled) {
          logout()
          navigate('/login', { replace: true })
        }
      }
    }

    verifyRole()

    return () => {
      cancelled = true
    }
  }, [allowedRole, navigate])

  if (!isReady) {
    const workspaceTitle =
      allowedRole === 'admin'
        ? 'Loading admin workspace'
        : allowedRole === 'teacher'
          ? 'Loading teacher workspace'
          : 'Loading employee workspace'
    return <PageLoader title={workspaceTitle} description="Checking access." />
  }

  return <Outlet />
}

export { RoleRoute }