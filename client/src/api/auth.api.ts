import { apiClient } from './client'

export const authApi = {
  register: (email: string, password: string, name: string) =>
    apiClient.post<{ access_token: string }>('/api/v1/auth/register', { email, password, name }),

  login: (email: string, password: string) => {
    const form = new URLSearchParams({ username: email, password })
    return apiClient.post<{ access_token: string }>('/api/v1/auth/login', form, {
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    })
  },
}
