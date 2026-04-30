import { useEffect, useState } from 'react'

import {
  ensureCurrentProfile,
  getCurrentProfile,
  subscribeProfile,
} from '@/lib/current-profile'
import { getMyProfile } from '@/services/user-profile'

export function useCurrentProfile() {
  const [profile, setProfile] = useState(() => getCurrentProfile())

  useEffect(() => {
    const unsubscribe = subscribeProfile(setProfile)
    if (!getCurrentProfile()) {
      ensureCurrentProfile(getMyProfile).catch(() => {})
    }
    return unsubscribe
  }, [])

  return profile
}

export function useIsAdmin() {
  const profile = useCurrentProfile()
  const role = (profile?.role || '').toString().toUpperCase()
  return role === 'ADMIN' || role === 'SUPER_ADMIN'
}

export function useIsSuperAdmin() {
  const profile = useCurrentProfile()
  const role = (profile?.role || '').toString().toUpperCase()
  return role === 'SUPER_ADMIN'
}
