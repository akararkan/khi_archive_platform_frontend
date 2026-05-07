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

  // Sibling DTOs disagree on the id field name: UserAdminDTO returns
  // both `id` and `userId`, but `/user/me` (UserResponseDTO) returns
  // only `userId`. Callers expect `profile.id` to work everywhere
  // (`useIsSelf`, audit-log row keys, etc.), so we backfill it here so
  // the rest of the FE doesn't have to know the difference.
  const normalized = {
    ...profile,
    profileImageSource: resolveProfileImageSource(profile),
  }
  if (normalized.id == null && normalized.userId != null) {
    normalized.id = normalized.userId
  }
  return normalized
}

export { normalizeUserProfile, resolveProfileImageSource }