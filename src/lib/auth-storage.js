const AUTH_TOKEN_KEY = 'auth_token'

function getStorage() {
  if (typeof window === 'undefined') {
    return null
  }

  return window.localStorage
}

function storeToken(token) {
  const storage = getStorage()

  if (!storage || !token) {
    return
  }

  storage.setItem(AUTH_TOKEN_KEY, token)
}

function getStoredToken() {
  const storage = getStorage()

  if (!storage) {
    return null
  }

  return storage.getItem(AUTH_TOKEN_KEY)
}

function clearStoredToken() {
  const storage = getStorage()

  if (!storage) {
    return
  }

  storage.removeItem(AUTH_TOKEN_KEY)
}

export { AUTH_TOKEN_KEY, clearStoredToken, getStoredToken, storeToken }
