import { apiClient } from '@/lib/api-client'
import { clearStoredToken, getStoredToken, storeToken } from '@/lib/auth-storage'

const LOGIN_ENDPOINT = '/auth/login'
const REGISTER_ENDPOINT = '/auth/register'

function buildLoginPayload(credentials = {}) {
  return {
    username: typeof credentials.username === 'string' ? credentials.username.trim() : '',
    password: typeof credentials.password === 'string' ? credentials.password : '',
  }
}

function buildRegisterPayload(payload = {}) {
  return {
    name: typeof payload.name === 'string' ? payload.name.trim() : '',
    username: typeof payload.username === 'string' ? payload.username.trim() : '',
    email: typeof payload.email === 'string' ? payload.email.trim().toLowerCase() : '',
    password: typeof payload.password === 'string' ? payload.password : '',
  }
}

function getTokenFromResponse(responseData) {
  if (typeof responseData?.token === 'string') {
    return responseData.token
  }

  if (typeof responseData?.accessToken === 'string') {
    return responseData.accessToken
  }

  return null
}

async function login(credentials) {
  const { data } = await apiClient.post(LOGIN_ENDPOINT, buildLoginPayload(credentials))
  const token = getTokenFromResponse(data)

  if (token) {
    storeToken(token)
  }

  return data
}

async function register(payload) {
  const { data } = await apiClient.post(REGISTER_ENDPOINT, buildRegisterPayload(payload))
  const token = getTokenFromResponse(data)

  if (token) {
    storeToken(token)
  }

  return data
}

function logout() {
  clearStoredToken()
}

export { getStoredToken, login, logout, register }
