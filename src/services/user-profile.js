import { apiClient } from '@/lib/api-client'
import { normalizeUserProfile } from '@/lib/profile-image'

async function getMyProfile() {
  const { data } = await apiClient.get('/user/me')
  return normalizeUserProfile(data)
}

async function updateMyProfile(payload = {}) {
  const { data } = await apiClient.put('/user/profile', payload)
  return normalizeUserProfile(data)
}

async function changeMyPassword(payload = {}) {
  const { data } = await apiClient.put('/user/password', payload)
  return data
}

async function uploadMyProfileImage(file) {
  const formData = new FormData()
  formData.append('file', file)

  const { data } = await apiClient.post('/user/profile-image', formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  })

  return normalizeUserProfile(data)
}

async function removeMyProfileImage() {
  const { data } = await apiClient.delete('/user/profile-image')
  return normalizeUserProfile(data)
}

export {
  changeMyPassword,
  getMyProfile,
  removeMyProfileImage,
  updateMyProfile,
  uploadMyProfileImage,
}