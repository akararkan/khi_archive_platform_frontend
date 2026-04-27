import { apiClient } from '@/lib/api-client'

export async function getPersons() {
  const { data } = await apiClient.get('/person')
  return data
}

export async function getPerson(code) {
  const { data } = await apiClient.get(`/person/${code}`)
  return data
}

export async function createPerson(payload, mediaPortrait) {
  const formData = new FormData()
  formData.append('data', new Blob([JSON.stringify(payload)], { type: 'application/json' }))
  if (mediaPortrait) formData.append('mediaPortrait', mediaPortrait)

  const { data } = await apiClient.post('/person', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  })
  return data
}

export async function updatePerson(code, payload, mediaPortrait) {
  const formData = new FormData()
  formData.append('data', new Blob([JSON.stringify(payload)], { type: 'application/json' }))
  if (mediaPortrait) formData.append('mediaPortrait', mediaPortrait)

  const { data } = await apiClient.patch(`/person/${code}`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  })
  return data
}

export async function deletePerson(code) {
  const { data } = await apiClient.delete(`/person/${code}`)
  return data
}
