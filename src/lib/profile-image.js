import { apiClient } from '@/lib/api-client'

const PROFILE_IMAGE_FIELDS = [
  'profileImage',
  'profileImageUrl',
  'profileImageURL',
  'imageUrl',
  'imageURL',
  'image',
  'avatar',
  'avatarUrl',
  'avatarURL',
  'picture',
  'pictureUrl',
  'pictureURL',
]

const PROFILE_IMAGE_OBJECT_KEYS = ['url', 'src', 'path', 'location', 'href']

function extractProfileImageCandidate(profile) {
  for (const field of PROFILE_IMAGE_FIELDS) {
    const value = profile?.[field]

    if (typeof value === 'string' && value.trim()) {
      return value.trim()
    }

    if (value && typeof value === 'object') {
      for (const key of PROFILE_IMAGE_OBJECT_KEYS) {
        const nestedValue = value[key]

        if (typeof nestedValue === 'string' && nestedValue.trim()) {
          return nestedValue.trim()
        }
      }
    }
  }

  return ''
}

function resolveProfileImageSource(profile) {
  const candidate = extractProfileImageCandidate(profile)

  if (!candidate) {
    return ''
  }

  if (/^(data:|blob:|https?:\/\/)/i.test(candidate)) {
    return candidate
  }

  const baseUrl = apiClient.defaults.baseURL ?? import.meta.env.VITE_API_BASE_URL ?? ''

  if (!baseUrl) {
    return candidate
  }

  try {
    const resolvedBaseUrl = baseUrl.endsWith('/') ? baseUrl : `${baseUrl}/`
    return new URL(candidate, resolvedBaseUrl).toString()
  } catch {
    return candidate
  }
}

function normalizeUserProfile(profile) {
  if (!profile || typeof profile !== 'object') {
    return profile
  }

  return {
    ...profile,
    profileImageSource: resolveProfileImageSource(profile),
  }
}

export { normalizeUserProfile, resolveProfileImageSource }