import { apiClient } from './client'
import type { User } from '../types/user.types'

export const userApi = {
  getMe: async (): Promise<User> => {
    const res = await apiClient.get('/api/v1/users/me')
    return res.data
  },
}
