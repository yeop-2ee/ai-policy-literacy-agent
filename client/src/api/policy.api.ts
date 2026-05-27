import { apiClient } from './client'
import type { Policy, PolicyFilter, EligibilityResult } from '../types/policy.types'

export const policyApi = {
  getRecommendations: () =>
    apiClient.get<{ policies: Policy[]; no_profile?: boolean; no_match?: boolean; message?: string }>('/api/v1/policies/recommendations'),

  list: (filter: PolicyFilter) =>
    apiClient.get<{ policies: Policy[]; total: number }>('/api/v1/policies', { params: filter }),

  getById: (id: string) =>
    apiClient.get<Policy>(`/api/v1/policies/${id}`),

  eligibility: (id: string) =>
    apiClient.get<EligibilityResult>(`/api/v1/policies/${id}/eligibility`),
}

export const bookmarkApi = {
  /** 북마크 토글 — 저장 여부 반환 */
  toggle: (policyId: string) =>
    apiClient.post<{ saved: boolean }>(`/api/v1/bookmarks/${policyId}`),

  /** 저장한 정책 전체 목록 */
  list: () =>
    apiClient.get<{ policies: Policy[]; total: number }>('/api/v1/bookmarks'),

  /** 여러 정책의 북마크 여부 한 번에 조회 */
  statuses: (policyIds: string[]) =>
    apiClient.get<Record<string, boolean>>('/api/v1/bookmarks/status', {
      params: { policy_ids: policyIds.join(',') },
    }),
}
