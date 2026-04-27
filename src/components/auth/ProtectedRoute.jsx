import { Navigate, Outlet } from 'react-router-dom'

import { getStoredToken } from '@/services/auth'

function ProtectedRoute() {
  if (!getStoredToken()) {
    return <Navigate to="/login" replace />
  }

  return <Outlet />
}

export { ProtectedRoute }
