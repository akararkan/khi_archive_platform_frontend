import axios from 'axios'

import { clearStoredToken, getStoredToken } from '@/lib/auth-storage'
import { TOKEN_REJECTED_CODES } from '@/lib/error-i18n'

const withCredentials = (import.meta.env.VITE_API_WITH_CREDENTIALS ?? 'false') === 'true'

const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:8080/api',
  timeout: 15000,
  withCredentials,
  headers: {
    'Content-Type': 'application/json',
  },
})

apiClient.interceptors.request.use((config) => {
  const token = getStoredToken()

  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }

  return config
})

// Global session-expiry handling. When the server rejects a token we DID send
// (expired / revoked / tampered), the stored token is dead — clear it and bounce
// to /login with a reason the login page can explain. We deliberately do NOT
// react to:
//   - BAD_CREDENTIALS  → the login form keeps the user in place.
//   - TOKEN_MISSING    → no token was sent; route guards handle anonymous access.
// The original error still rejects so per-call handlers (toasts, form boxes)
// run as usual.
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    const code = error?.response?.data?.error
    if (code && TOKEN_REJECTED_CODES.has(code) && getStoredToken()) {
      clearStoredToken()

      if (typeof window !== 'undefined') {
        const { pathname, search } = window.location
        if (!pathname.startsWith('/login')) {
          const reason = code === 'TOKEN_EXPIRED' ? 'expired' : 'invalid'
          const next = encodeURIComponent(`${pathname}${search}`)
          window.location.assign(`/login?reason=${reason}&next=${next}`)
        }
      }
    }

    return Promise.reject(error)
  },
)

export { apiClient }
