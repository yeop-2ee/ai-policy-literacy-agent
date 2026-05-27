import type { LucideIcon } from 'lucide-react'
import {
  Briefcase, Home, HandHeart, BookOpen, HeartPulse, Palette,
  Baby, GraduationCap, UserRound, PersonStanding, Users, Accessibility, Globe,
} from 'lucide-react'

export interface Policy {
  _id: string
  policy_id: string
  source: string
  title: string
  summary?: string
  detail?: string
  target?: string
  lifecycle_label?: string
  service_field_label?: string
  region?: string
  apply_url?: string
  apply_period?: string
  deadline?: string
  easy_summary?: string
  simplified_content?: string
  updated_at: string
}

export interface EligibilityResult {
  eligible: 'yes' | 'partial' | 'no'
  summary: string
  checks: { category: string; status: 'pass' | 'fail' | 'unknown'; reason: string }[]
}

export interface PolicyFilter {
  lifecycle?: string
  service_field?: string
  region?: string
  keyword?: string
  limit?: number
  offset?: number
}

export const LIFECYCLE_CATEGORIES: { code: string; label: string; Icon: LucideIcon }[] = [
  { code: '영유아',       label: '영유아 (0~8세)',   Icon: Baby },
  { code: '아동|청소년',  label: '어린이·청소년',   Icon: GraduationCap },
  { code: '청년',         label: '청년 (19~34세)',   Icon: UserRound },
  { code: '중장년',       label: '중장년 (35~64세)', Icon: PersonStanding },
  { code: '노인|노년',    label: '어르신 (65세+)',   Icon: Users },
  { code: '장애인',       label: '장애인',           Icon: Accessibility },
  { code: '다문화',       label: '다문화가정',       Icon: Globe },
]

export const SERVICE_FIELD_CATEGORIES: { code: string; label: string; Icon: LucideIcon }[] = [
  { code: '고용',         label: '취업·창업', Icon: Briefcase },
  { code: '주거',         label: '집·주거',   Icon: Home },
  { code: '생활|보육|서민금융|돌봄', label: '복지', Icon: HandHeart },
  { code: '교육',         label: '교육',      Icon: BookOpen },
  { code: '보건|의료|건강', label: '건강·의료', Icon: HeartPulse },
  { code: '문화',         label: '문화·여가', Icon: Palette },
]
