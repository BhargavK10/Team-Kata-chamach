import { apiRequest } from './apiClient.js'

export async function getCompanyReport(companyId) {
  return apiRequest(`/companies/${encodeURIComponent(companyId)}/report`)
}
