import { apiClient } from '@/lib/api-client'

export async function getCategories() {
  const { data } = await apiClient.get('/category')
  return data
}

export async function getCategory(code) {
  const { data } = await apiClient.get(`/category/${code}`)
  return data
}

export async function createCategory(payload) {
  const { data } = await apiClient.post('/category', payload)
  return data
}

export async function updateCategory(code, payload) {
  const { data } = await apiClient.patch(`/category/${code}`, payload)
  return data
}

export async function deleteCategory(code) {
  const { data } = await apiClient.delete(`/category/${code}`)
  return data
}
