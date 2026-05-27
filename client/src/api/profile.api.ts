import { apiClient } from './client'
import type { Profile, OnboardingProfile } from '../types/user.types'

export const profileApi = {
  list: () =>
    apiClient.get<{ profiles: Profile[]; active_id: string | null }>('/api/v1/profiles'),

  create: (data: Partial<OnboardingProfile> & { name?: string }) =>
    apiClient.post<Profile>('/api/v1/profiles', data),

  update: (id: string, data: Partial<OnboardingProfile> & { name?: string }) =>
    apiClient.put<Profile>(`/api/v1/profiles/${id}`, data),

  delete: (id: string) =>
    apiClient.delete(`/api/v1/profiles/${id}`),

  activate: (id: string) =>
    apiClient.post(`/api/v1/profiles/${id}/activate`),
}
