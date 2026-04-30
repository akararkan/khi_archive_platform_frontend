// Lightweight global cache for the signed-in user's profile so role-gated UI
// (admin-only "Delete permanently" actions) doesn't have to refetch /user/me on
// every page mount. EmployeeLayout / AdminLayout seed the cache via setCurrentProfile;
// pages read it through useCurrentProfile / useIsAdmin.

let cachedProfile = null
let inflight = null
const subscribers = new Set()

export function getCurrentProfile() {
  return cachedProfile
}

export function setCurrentProfile(profile) {
  cachedProfile = profile
  for (const fn of subscribers) fn(profile)
}

export function subscribeProfile(fn) {
  subscribers.add(fn)
  return () => {
    subscribers.delete(fn)
  }
}

export function ensureCurrentProfile(loader) {
  if (cachedProfile) return Promise.resolve(cachedProfile)
  if (!inflight) {
    inflight = Promise.resolve()
      .then(() => loader())
      .then((profile) => {
        setCurrentProfile(profile)
        return profile
      })
      .catch((err) => {
        inflight = null
        throw err
      })
  }
  return inflight
}

export function clearCurrentProfile() {
  cachedProfile = null
  inflight = null
  for (const fn of subscribers) fn(null)
}
