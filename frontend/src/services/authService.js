import { apiRequest, getAuthToken, storeAuthToken } from './apiClient.js'

async function authenticate(endpoint, credentials) {
  const result = await apiRequest(`/auth/${endpoint}`, {
    method: 'POST',
    body: JSON.stringify(credentials),
  })
  storeAuthToken(result.token)
  return result.user
}

export async function signup({ name, email, password }) {
  const result = await apiRequest('/auth/signup', {
    method: 'POST',
    body: JSON.stringify({ name, email, password }),
  })
  return result.user
}

export function login({ email, password }) {
  return authenticate('login', { email, password })
}

export async function getSession() {
  if (!getAuthToken()) return null
  try {
    const result = await apiRequest('/auth/me')
    return result.user
  } catch (error) {
    if (error.message === 'Sign in to continue.') {
      storeAuthToken(null)
      return null
    }
    throw error
  }
}

export async function logout() {
  if (!getAuthToken()) return
  try {
    await apiRequest('/auth/logout', { method: 'POST' })
  } finally {
    storeAuthToken(null)
  }
}
