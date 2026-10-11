export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '/api'

export function getAuthToken() {
  return localStorage.getItem('risk-radar-api-token')
}

export function storeAuthToken(token) {
  if (token) localStorage.setItem('risk-radar-api-token', token)
  else localStorage.removeItem('risk-radar-api-token')
}

export async function apiRequest(path, options = {}) {
  const headers = new Headers(options.headers ?? {})
  if (options.body && !headers.has('Content-Type')) headers.set('Content-Type', 'application/json')
  const token = getAuthToken()
  if (token && !headers.has('Authorization')) headers.set('Authorization', `Bearer ${token}`)
  let response
  try {
    response = await fetch(`${API_BASE_URL}${path}`, { ...options, headers })
  } catch (error) {
    throw new Error('Could not reach the COR.P ANALYSIS API. Start the backend with npm run dev.')
  }
  const contentType = response.headers.get('content-type') ?? ''
  const result = contentType.includes('application/json') ? await response.json() : await response.text()
  if (!response.ok) {
    const message = typeof result === 'object' && result?.error ? result.error : `API request failed (${response.status}).`
    throw new Error(message)
  }
  return result
}
