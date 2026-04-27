import axios from 'axios'

import { getStoredToken } from '@/lib/auth-storage'

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

export { apiClient }
