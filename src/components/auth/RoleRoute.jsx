import { useEffect, useState } from 'react'
import { Outlet, useNavigate } from 'react-router-dom'

import { PageLoader } from '@/components/ui/page-loader'
import { getAccountArea } from '@/lib/account-role'
import { logout } from '@/services/auth'
import { getMyProfile } from '@/services/user-profile'

function RoleRoute({ allowedRole, fallbackPath }) {
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

        if (accountArea !== allowedRole) {
          navigate(fallbackPath, { replace: true })
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
  }, [allowedRole, fallbackPath, navigate])

  if (!isReady) {
    return (
      <PageLoader
        title={allowedRole === 'admin' ? 'Loading admin workspace' : 'Loading employee workspace'}
        description="Checking access."
      />
    )
  }

  return <Outlet />
}

export { RoleRoute }