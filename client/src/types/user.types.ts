export interface Profile {
  id: string
  name: string
  birth_date?: string
  age?: number
  gender?: string
  region?: string
  district?: string
  employment_status?: string
  disability: boolean
  multicultural: boolean
  interests: string[]
  household_income?: string
  children_count?: number
  children_ages?: number[]
  is_pregnant?: boolean
  is_single_parent?: boolean
  marital_status?: string
  military_status?: string
}

export interface User {
  _id: string
  email: string
  name?: string
  birth_date?: string
  age?: number
  gender?: string
  region?: string
  district?: string
  employment_status?: string
  household_income?: string
  children_count?: number
  children_ages?: number[]
  is_pregnant?: boolean
  is_single_parent?: boolean
  marital_status?: string
  military_status?: string
  disability: boolean
  multicultural: boolean
  interests: string[]
  onboarding_completed: boolean
  profiles?: Profile[]
  active_profile_id?: string
}

export interface OnboardingProfile {
  birth_date?: string
  age?: number
  gender?: string
  region?: string
  district?: string
  employment_status?: string
  household_income?: string
  children_count?: number
  children_ages?: number[]
  is_pregnant?: boolean
  is_single_parent?: boolean
  marital_status?: string
  military_status?: string
  disability: boolean
  multicultural: boolean
  interests: string[]
}
