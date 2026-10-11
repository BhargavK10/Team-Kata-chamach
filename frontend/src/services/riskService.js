import { apiRequest } from './apiClient.js'

export async function getRiskOverview(companyIds = []) {
  const query = companyIds.length ? `?companyIds=${encodeURIComponent(companyIds.join(','))}` : ''
  return apiRequest(`/risk/overview${query}`)
}
