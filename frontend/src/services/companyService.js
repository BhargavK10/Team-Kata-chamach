import { apiRequest } from './apiClient.js'

export async function getCompanies() {
  const result = await apiRequest('/companies')
  return result.companies
}

export async function getCompanyById(companyId) {
  const result = await apiRequest(`/companies/${encodeURIComponent(companyId)}`)
  return result.company
}
