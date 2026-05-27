import { create } from 'zustand'
import type { OnboardingProfile } from '../types/user.types'

interface OnboardingState {
  step: number
  profile: Partial<OnboardingProfile>
  nextStep: () => void
  prevStep: () => void
  goToStep: (n: number) => void
  updateProfile: (data: Partial<OnboardingProfile>) => void
  setProfile: (data: Partial<OnboardingProfile>) => void   // 전체 교체 (뒤로가기 복원용)
  reset: () => void
}

export const useOnboardingStore = create<OnboardingState>((set) => ({
  step: 1,
  profile: {},

  nextStep:      () => set((s) => ({ step: s.step + 1 })),
  prevStep:      () => set((s) => ({ step: Math.max(1, s.step - 1) })),
  goToStep:      (n) => set({ step: n }),
  updateProfile: (data) => set((s) => ({ profile: { ...s.profile, ...data } })),
  setProfile:    (data) => set({ profile: data }),
  reset:         () => set({ step: 1, profile: {} }),
}))
