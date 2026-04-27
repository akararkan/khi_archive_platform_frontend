import { Navigate, Outlet } from 'react-router-dom'

import { getStoredToken } from '@/services/auth'

function GuestRoute() {
  if (getStoredToken()) {
    return <Navigate to="/dashboard" replace />
  }

  return <Outlet />
}

export { GuestRoute }
