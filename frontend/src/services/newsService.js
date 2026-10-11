import { apiRequest } from './apiClient.js'

export async function getCompanyNews(companyId) {
  return apiRequest(`/companies/${encodeURIComponent(companyId)}/news`)
}

export async function getNewsStatus() {
  return apiRequest('/news/status')
}
