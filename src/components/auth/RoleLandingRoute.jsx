import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'

import { PageLoader } from '@/components/ui/page-loader'
import { getAccountHomePath } from '@/lib/account-role'
import { logout } from '@/services/auth'
import { getMyProfile } from '@/services/user-profile'

function RoleLandingRoute() {
  const navigate = useNavigate()

  useEffect(() => {
    let cancelled = false

    const resolveLanding = async () => {
      try {
        const profile = await getMyProfile()

        if (!cancelled) {
          navigate(getAccountHomePath(profile), { replace: true })
        }
      } catch {
        if (!cancelled) {
          logout()
          navigate('/login', { replace: true })
        }
      }
    }

    resolveLanding()

    return () => {
      cancelled = true
    }
  }, [navigate])

  return <PageLoader title="Opening workspace" description="Routing you to the right area." />
}

export { RoleLandingRoute }