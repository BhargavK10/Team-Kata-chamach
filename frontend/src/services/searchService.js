import { apiRequest } from './apiClient.js'

export async function searchCompanies(query) {
  return apiRequest(`/search?q=${encodeURIComponent(query.trim())}`)
}
