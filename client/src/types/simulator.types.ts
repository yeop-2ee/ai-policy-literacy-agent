import type { LucideIcon } from 'lucide-react'
import { Landmark, Briefcase, Building2 } from 'lucide-react'

export type MessageRole = 'user' | 'assistant'

export interface Message {
  role: MessageRole
  content: string
  timestamp: Date
}

export type Scenario = '주민센터' | '고용센터' | '은행'

export const SCENARIOS: { value: Scenario; label: string; Icon: LucideIcon; description: string }[] = [
  { value: '주민센터', label: '주민센터', Icon: Landmark,  description: '전입신고, 주민등록증 발급 등' },
  { value: '고용센터', label: '고용센터', Icon: Briefcase, description: '실업급여, 취업 지원 서비스 등' },
  { value: '은행',     label: '은행',     Icon: Building2, description: '통장 개설, 대출 상담 등' },
]
