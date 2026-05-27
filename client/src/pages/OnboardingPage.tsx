import { useState, useEffect, useRef } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import type { LucideIcon } from 'lucide-react'
import {
  ChevronLeft, ChevronRight, Check,
  Cake, Briefcase, MapPin, Heart, Users,
  GraduationCap, FileText, Store, Home, Accessibility, Globe, PersonStanding, Baby,
} from 'lucide-react'
import { apiClient } from '../api/client'
import { userApi } from '../api/user.api'
import { profileApi } from '../api/profile.api'
import { useOnboardingStore } from '../store/onboardingStore'
import type { OnboardingProfile } from '../types/user.types'
import { SERVICE_FIELD_CATEGORIES } from '../types/policy.types'

const TOTAL = 5
const STEPS = ['나이', '현황', '지역', '관심사', '가구정보']
const REGIONS = ['서울','부산','대구','인천','광주','대전','울산','세종','경기','강원','충북','충남','전북','전남','경북','경남','제주']
const GENDER_OPTIONS = [
  { value: '남성', label: '남성' },
  { value: '여성', label: '여성' },
  { value: '기타', label: '기타 / 선택 안 함' },
]
const JOBS: { value: string; Icon: LucideIcon; desc: string }[] = [
  { value: '학생',       Icon: GraduationCap, desc: '재학 중' },
  { value: '취업준비생', Icon: FileText,       desc: '구직 활동 중' },
  { value: '직장인',     Icon: Briefcase,      desc: '재직 중' },
  { value: '자영업자',   Icon: Store,          desc: '사업 운영 중' },
  { value: '무직',       Icon: Home,           desc: '현재 미취업' },
]
// 2025 기준 중위소득 (월, 원)
const MEDIAN_INCOME: Record<number, number> = {
  1: 2392013, 2: 3932658, 3: 5025353,
  4: 6097773, 5: 7108192, 6: 8064805,
}

function calcIncomeBracket(monthlyWon: number, hhSize: number): string {
  const base = MEDIAN_INCOME[Math.min(hhSize, 6)]
  const pct = (monthlyWon / base) * 100
  if (pct <= 50)  return '차상위계층'
  if (pct <= 75)  return '중위소득75'
  if (pct <= 100) return '중위소득100'
  if (pct <= 150) return '중위소득150'
  return '제한없음'
}

function getIncomePct(monthlyWon: number, hhSize: number): number {
  return Math.round((monthlyWon / MEDIAN_INCOME[Math.min(hhSize, 6)]) * 100)
}

function getBracketLabel(v: string): string {
  const m: Record<string, string> = {
    '차상위계층':  '중위소득 50% 이하 (차상위계층)',
    '중위소득75':  '중위소득 75% 이하',
    '중위소득100': '중위소득 100% 이하',
    '중위소득150': '중위소득 150% 이하',
    '제한없음':    '소득 무관',
  }
  return m[v] ?? v
}

// 편집 개요 섹션 정보
const EDIT_SECTIONS = [
  { stepNum: 1, title: '나이 / 생년월일', Icon: Cake,      getSummary: (p: Partial<OnboardingProfile>) => p.birth_date ? `${p.birth_date} · 만 ${p.age}세` : '미입력' },
  { stepNum: 2, title: '현재 상황',       Icon: Briefcase,  getSummary: (p: Partial<OnboardingProfile>) => {
    const parts = []
    if (p.employment_status) parts.push(p.employment_status)
    if (p.marital_status) parts.push(p.marital_status)
    if (p.military_status) parts.push(p.military_status)
    return parts.length ? parts.join(' · ') : '미입력'
  }},
  { stepNum: 3, title: '지역 / 특성',    Icon: MapPin,     getSummary: (p: Partial<OnboardingProfile>) => p.region ? `${p.region}${p.district ? ' ' + p.district : ''}` : '미입력' },
  { stepNum: 4, title: '관심 분야',      Icon: Heart,      getSummary: (p: Partial<OnboardingProfile>) => p.interests?.length ? p.interests.slice(0, 3).join(', ') : '미입력' },
  { stepNum: 5, title: '가구 정보',      Icon: Users,      getSummary: (p: Partial<OnboardingProfile>) => {
    const parts = []
    if (p.household_income) parts.push(p.household_income)
    if (p.children_count !== undefined && p.children_count !== null) parts.push(`자녀 ${p.children_count === 0 ? '없음' : `${p.children_count}명`}`)
    if (p.is_pregnant) parts.push('임산부')
    if (p.is_single_parent) parts.push('한부모')
    return parts.length ? parts.join(' · ') : '선택 안 함'
  }},
]

function calcAge(birthDate: string): number {
  const today = new Date()
  const birth = new Date(birthDate)
  let age = today.getFullYear() - birth.getFullYear()
  const m = today.getMonth() - birth.getMonth()
  if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age--
  return age
}

const THIS_YEAR = new Date().getFullYear()

function YMDPicker({ value, onChange, minYear, maxYear = THIS_YEAR }: {
  value: string
  onChange: (v: string) => void
  minYear: number
  maxYear?: number
}) {
  const toNum = (s?: string) => s ? Number(s) : 0
  const parts = value ? value.split('-') : []

  // 로컬 state로 중간 선택값 유지 (년만 선택 시 사라지는 문제 방지)
  const [y, setY] = useState(toNum(parts[0]))
  const [m, setM] = useState(toNum(parts[1]))
  const [d, setD] = useState(toNum(parts[2]))

  // 부모가 value를 외부에서 바꿀 때(선택 안 함 등) 동기화
  const prevValue = useRef(value)
  useEffect(() => {
    if (prevValue.current !== value) {
      prevValue.current = value
      const p = value ? value.split('-') : []
      setY(toNum(p[0])); setM(toNum(p[1])); setD(toNum(p[2]))
    }
  }, [value])

  const daysInMonth = y && m ? new Date(y, m, 0).getDate() : 31

  const emit = (ny: number, nm: number, nd: number) => {
    if (ny && nm && nd)
      onChange(`${ny}-${String(nm).padStart(2, '0')}-${String(nd).padStart(2, '0')}`)
    else
      onChange('')
  }

  return (
    <div className="flex gap-2">
      <select
        value={y || ''}
        onChange={e => {
          const ny = Number(e.target.value)
          const nd = d ? Math.min(d, ny && m ? new Date(ny, m, 0).getDate() : 31) : d
          setY(ny); setD(nd)
          emit(ny, m, nd)
        }}
        className="field flex-[2] text-sm font-bold"
      >
        <option value="">년도</option>
        {Array.from({ length: maxYear - minYear + 1 }, (_, i) => maxYear - i).map(yr => (
          <option key={yr} value={yr}>{yr}년</option>
        ))}
      </select>
      <select
        value={m || ''}
        onChange={e => {
          const nm = Number(e.target.value)
          const nd = d ? Math.min(d, y && nm ? new Date(y, nm, 0).getDate() : 31) : d
          setM(nm); setD(nd)
          emit(y, nm, nd)
        }}
        className="field flex-1 text-sm font-bold"
      >
        <option value="">월</option>
        {Array.from({ length: 12 }, (_, i) => i + 1).map(mo => (
          <option key={mo} value={mo}>{mo}월</option>
        ))}
      </select>
      <select
        value={d || ''}
        onChange={e => {
          const nd = Number(e.target.value)
          setD(nd)
          emit(y, m, nd)
        }}
        className="field flex-1 text-sm font-bold"
      >
        <option value="">일</option>
        {Array.from({ length: daysInMonth }, (_, i) => i + 1).map(day => (
          <option key={day} value={day}>{day}일</option>
        ))}
      </select>
    </div>
  )
}

const MARITAL_OPTIONS = [
  { value: '미혼', label: '미혼' },
  { value: '기혼', label: '기혼' },
  { value: '이혼·사별', label: '이혼·사별' },
]

const MILITARY_OPTIONS = [
  { value: '미필', label: '미필', desc: '아직 복무하지 않음' },
  { value: '현역', label: '현역', desc: '현재 복무 중' },
  { value: '군필', label: '군필', desc: '복무 완료' },
]

export default function OnboardingPage() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [searchParams] = useSearchParams()
  const urlProfileId = searchParams.get('profileId')
  const isNewProfile = searchParams.get('new') === 'true'
  const { step, profile, nextStep, prevStep, goToStep, updateProfile, setProfile, reset } = useOnboardingStore()
  const [loading, setLoading] = useState(false)

  // 프로필 이름 (새 프로필 생성 / 특정 프로필 편집 시)
  const [profileName, setProfileName] = useState('')

  // 소득 계산기 로컬 상태
  const [salaryMode, setSalaryMode] = useState<'월' | '연'>('월')
  const [salaryInput, setSalaryInput] = useState('')
  const [hhSize, setHhSize] = useState(1)

  // 자녀 생년월일 로컬 상태
  const [childBirthDates, setChildBirthDates] = useState<string[]>([])

  // 정확도 애니메이션
  const [animPct, setAnimPct] = useState(0)
  const completenessPercent = Math.round(
    [
      !!profile.birth_date,
      !!profile.employment_status,
      !!profile.region,
      (profile.interests?.length ?? 0) > 0,
      !!profile.household_income,
    ].filter(Boolean).length / 5 * 100
  )
  useEffect(() => {
    if (step !== 0) return
    setAnimPct(0)
    const target = completenessPercent
    const duration = 900
    const startTime = performance.now()
    let rafId: number
    const tick = (now: number) => {
      const elapsed = now - startTime
      const t = Math.min(elapsed / duration, 1)
      const eased = 1 - Math.pow(1 - t, 3) // ease-out cubic
      setAnimPct(Math.round(eased * target))
      if (t < 1) rafId = requestAnimationFrame(tick)
    }
    rafId = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(rafId)
  }, [step, completenessPercent])

  const { data: existingUser } = useQuery({
    queryKey: ['me'],
    queryFn: userApi.getMe,
  })

  // 마운트 시 스토어 초기화 (이전 세션 데이터 방지)
  useEffect(() => {
    if (isNewProfile) {
      reset()           // 새 프로필: 항상 step 1부터 깨끗하게 시작
      setProfileName('')
    } else if (urlProfileId) {
      setProfile({})    // 다른 프로필 편집 시 이전 데이터 클리어 → existingUser 로드 시 재주입
      setProfileName('')
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // 편집 모드 뒤로가기: DB 상태로 복원 (저장하지 않은 변경 취소)
  const revertToDb = () => {
    if (urlProfileId) {
      const targetProfile = existingUser?.profiles?.find(p => p.id === urlProfileId)
      if (!targetProfile) return
      setProfile({
        birth_date:        targetProfile.birth_date,
        age:               targetProfile.age,
        gender:            targetProfile.gender,
        region:            targetProfile.region,
        district:          targetProfile.district,
        employment_status: targetProfile.employment_status,
        household_income:  targetProfile.household_income,
        children_count:    targetProfile.children_count,
        children_ages:     targetProfile.children_ages ?? [],
        is_pregnant:       targetProfile.is_pregnant ?? false,
        is_single_parent:  targetProfile.is_single_parent ?? false,
        disability:        targetProfile.disability ?? false,
        multicultural:     targetProfile.multicultural ?? false,
        interests:         targetProfile.interests ?? [],
        marital_status:    targetProfile.marital_status,
        military_status:   targetProfile.military_status,
      })
    } else {
      if (!existingUser) return
      setProfile({
        birth_date:        existingUser.birth_date,
        age:               existingUser.age,
        gender:            existingUser.gender,
        region:            existingUser.region,
        district:          existingUser.district,
        employment_status: existingUser.employment_status,
        household_income:  existingUser.household_income,
        children_count:    existingUser.children_count,
        children_ages:     existingUser.children_ages ?? [],
        is_pregnant:       existingUser.is_pregnant ?? false,
        is_single_parent:  existingUser.is_single_parent ?? false,
        disability:        existingUser.disability ?? false,
        multicultural:     existingUser.multicultural ?? false,
        interests:         existingUser.interests ?? [],
      })
    }
    setSalaryInput('')
    setSalaryMode('월')
    setHhSize(1)
    setChildBirthDates([])
  }

  // 편집 모드: 기존 프로필 로드 + 개요 화면(step 0)으로 시작
  useEffect(() => {
    if (!existingUser) return

    if (urlProfileId) {
      // 특정 프로필 편집 모드
      const targetProfile = existingUser.profiles?.find(p => p.id === urlProfileId)
      if (targetProfile) {
        if (!profileName) setProfileName(targetProfile.name)
        if (Object.keys(profile).length === 0) {
          updateProfile({
            birth_date:        targetProfile.birth_date,
            age:               targetProfile.age,
            gender:            targetProfile.gender,
            region:            targetProfile.region,
            district:          targetProfile.district,
            employment_status: targetProfile.employment_status,
            household_income:  targetProfile.household_income,
            children_count:    targetProfile.children_count,
            children_ages:     targetProfile.children_ages ?? [],
            is_pregnant:       targetProfile.is_pregnant ?? false,
            is_single_parent:  targetProfile.is_single_parent ?? false,
            disability:        targetProfile.disability ?? false,
            multicultural:     targetProfile.multicultural ?? false,
            interests:         targetProfile.interests ?? [],
            marital_status:    targetProfile.marital_status,
            military_status:   targetProfile.military_status,
          })
        }
      }
      if (step === 1) goToStep(0)
    } else if (!isNewProfile && existingUser.onboarding_completed) {
      // 기본 사용자 편집 모드
      if (Object.keys(profile).length === 0) {
        updateProfile({
          birth_date:        existingUser.birth_date,
          age:               existingUser.age,
          region:            existingUser.region,
          district:          existingUser.district,
          employment_status: existingUser.employment_status,
          household_income:  existingUser.household_income,
          children_count:    existingUser.children_count,
          children_ages:     existingUser.children_ages ?? [],
          is_pregnant:       existingUser.is_pregnant ?? false,
          is_single_parent:  existingUser.is_single_parent ?? false,
          disability:        existingUser.disability ?? false,
          multicultural:     existingUser.multicultural ?? false,
          interests:         existingUser.interests ?? [],
        })
      }
      if (step === 1) goToStep(0)
    }
    // isNewProfile: 프리로드 없이 step 1부터 시작
  }, [existingUser])

  // isEdit = 개요 화면(step 0)을 보여줄지 여부
  const isEdit = !!urlProfileId || (!isNewProfile && !!existingUser?.onboarding_completed)

  const handleBirthDate = (date: string) => {
    const age = date ? calcAge(date) : undefined
    updateProfile({ birth_date: date, age })
  }

  // 모든 스텝에서 "선택 안 함"이 가능하므로 항상 다음 진행 허용
  const canNext = step >= 1 && step <= 5

  // 저장 후 동작: 편집모드 → 개요(step 0), 최초 → 대시보드
  const save = async (goToOverview = false) => {
    setLoading(true)
    try {
      if (urlProfileId) {
        // 특정 프로필 업데이트
        await profileApi.update(urlProfileId, { ...(profile as OnboardingProfile), name: profileName || undefined })
        await queryClient.invalidateQueries({ queryKey: ['profiles'] })
        await queryClient.invalidateQueries({ queryKey: ['me'] })
        await queryClient.invalidateQueries({ queryKey: ['recommendations'] })
      } else if (isNewProfile) {
        // 새 프로필 생성
        await profileApi.create({ ...(profile as OnboardingProfile), name: profileName || undefined })
        await queryClient.invalidateQueries({ queryKey: ['profiles'] })
        await queryClient.invalidateQueries({ queryKey: ['me'] })
        await queryClient.invalidateQueries({ queryKey: ['recommendations'] })
      } else {
        // 기본 사용자 온보딩
        await apiClient.post('/api/v1/users/onboarding', profile as OnboardingProfile)
        await queryClient.invalidateQueries({ queryKey: ['me'] })
        await queryClient.invalidateQueries({ queryKey: ['profiles'] })
        await queryClient.invalidateQueries({ queryKey: ['recommendations'] })
      }

      if (goToOverview) {
        goToStep(0)
      } else {
        reset()
        if (isNewProfile || urlProfileId) {
          navigate('/profile')
        } else {
          navigate(isEdit ? '/profile' : '/dashboard')
        }
      }
    } finally {
      setLoading(false)
    }
  }

  const showHeader = step > 0

  return (
    <div className="app-shell flex flex-col">

      {/* 헤더 */}
      {showHeader && (
        <div className="sticky top-0 bg-white z-10 px-5 pt-5 pb-3 border-b border-ink-100/80">
          <div className="flex items-center gap-3 mb-4">
            <button
              onClick={() => {
                if (isEdit) { revertToDb(); goToStep(0) }
                else if (step === 1 && isNewProfile) { reset(); navigate('/profile') }
                else if (step === 1) { /* 최초 온보딩 step 1에서는 뒤로 안 감 */ }
                else prevStep()
              }}
              className="w-9 h-9 rounded-2xl bg-white border border-ink-100 flex items-center justify-center hover:border-brand/30 transition-colors"
            >
              <ChevronLeft size={18} className="text-ink-700" />
            </button>

            {/* 스텝 바 */}
            <div className="flex-1 flex gap-1">
              {STEPS.map((_, i) => (
                <div key={i} className="flex-1 h-1.5 rounded-full overflow-hidden bg-ink-100">
                  <div className="h-full bg-brand transition-all duration-400 rounded-full"
                       style={{ width: i < step ? '100%' : '0%' }} />
                </div>
              ))}
            </div>
            <span className="text-xs font-bold text-ink-300">{step}/{TOTAL}</span>
          </div>
          <p className="text-xs font-bold text-brand">{STEPS[step - 1]}</p>
        </div>
      )}

      {/* 편집 모드 개요 헤더 (step 0) */}
      {step === 0 && (
        <div className="sticky top-0 bg-white z-10 px-5 pt-5 pb-4 border-b border-ink-100/80">
          <div className="flex items-center gap-3">
            <button
              onClick={() => { reset(); navigate('/profile') }}
              className="w-9 h-9 rounded-2xl bg-white border border-ink-100 flex items-center justify-center hover:border-brand/30 transition-colors"
            >
              <ChevronLeft size={18} className="text-ink-700" />
            </button>
            <p className="text-base font-extrabold text-ink-900">
              {urlProfileId
                ? (existingUser?.profiles?.find(p => p.id === urlProfileId)?.name ?? '프로필') + ' 수정'
                : '프로필 수정'}
            </p>
          </div>
        </div>
      )}

      {/* 콘텐츠 */}
      <div className="flex-1 overflow-y-auto px-5 pt-6 pb-32">

        {/* ── 편집 개요 (step 0) ── */}
        {step === 0 && (
          <div>
            <h2 className="text-xl font-extrabold text-ink-900 mb-1.5">어떤 정보를 수정할까요?</h2>
            <p className="text-sm text-ink-500 mb-4">수정할 항목을 선택하세요</p>

            {/* 프로필 이름 편집 (프로필 편집 모드에서만) */}
            {urlProfileId && (
              <div className="mb-4">
                <label className="text-xs font-bold text-ink-500 block mb-1.5">프로필 이름</label>
                <input
                  className="field text-sm font-bold"
                  placeholder="예) 본인, 배우자, 자녀..."
                  value={profileName}
                  onChange={e => setProfileName(e.target.value)}
                  maxLength={20}
                />
              </div>
            )}

            {/* 맞춤 추천 정확도 */}
            <div className="p-3.5 rounded-2xl bg-brand/5 border border-brand/20 mb-5">
              <div className="flex items-center justify-between mb-1.5">
                <p className="text-xs font-bold text-brand">맞춤 추천 정확도</p>
                <span className="text-xs font-extrabold text-brand tabular-nums">{animPct}%</span>
              </div>
              <div className="h-2 rounded-full bg-white/60 overflow-hidden mb-1.5">
                <div
                  className="h-full bg-brand rounded-full"
                  style={{ width: `${animPct}%`, transition: 'none' }}
                />
              </div>
              <p className="text-2xs text-ink-500">
                {completenessPercent < 60
                  ? '정보를 더 채울수록 나에게 맞는 정책을 더 잘 찾아드려요'
                  : completenessPercent < 100
                    ? '좋아요! 나머지 정보도 채우면 더 정확해져요'
                    : '완벽해요! 모든 정보가 입력됐어요'}
              </p>
            </div>

            <div className="space-y-2.5">
              {EDIT_SECTIONS.map(({ stepNum, title, Icon, getSummary }) => (
                <button key={stepNum}
                  onClick={() => goToStep(stepNum)}
                  className="w-full flex items-center gap-4 p-4 rounded-2xl border-2 border-ink-100 bg-white hover:border-brand/40 hover:bg-brand/[0.02] transition-all group text-left">
                  <div className="w-10 h-10 rounded-2xl bg-ink-100/80 flex items-center justify-center flex-shrink-0 group-hover:bg-brand/10 transition-colors">
                    <Icon size={18} className="text-ink-400 group-hover:text-brand transition-colors" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold text-ink-900">{title}</p>
                    <p className="text-xs text-ink-400 mt-0.5 truncate">{getSummary(profile)}</p>
                  </div>
                  <ChevronRight size={16} className="text-ink-300 flex-shrink-0 group-hover:text-brand group-hover:translate-x-0.5 transition-all" />
                </button>
              ))}
            </div>
          </div>
        )}

        {/* ── Step 1: 나이 ── */}
        {step === 1 && (
          <div>
            <h2 className="text-2xl font-extrabold text-ink-900 mb-1">생년월일이 어떻게 되세요?</h2>
            <p className="text-sm text-ink-500 mb-6">생년월일로 만 나이를 자동으로 계산해드려요</p>

            {/* 새 프로필 생성 시 이름 입력 */}
            {isNewProfile && (
              <div className="card p-4 mb-5">
                <div className="flex items-center justify-between mb-2">
                  <label className="text-xs font-bold text-ink-500">프로필 이름</label>
                  <span className="text-2xs text-ink-400">나중에 변경 가능</span>
                </div>
                <input
                  className="field text-sm font-bold"
                  placeholder="예) 본인, 배우자, 자녀..."
                  value={profileName}
                  onChange={e => setProfileName(e.target.value)}
                  maxLength={20}
                />
              </div>
            )}
            <div className="card p-4 mb-5">
              <div className="flex items-center justify-between mb-2">
                <label className="text-xs font-bold text-ink-500">생년월일</label>
                <button
                  onClick={() => updateProfile({ birth_date: null as any, age: null as any })}
                  className="text-xs font-bold text-ink-400 hover:text-ink-600 transition-colors"
                >
                  선택 안 함
                </button>
              </div>
              <YMDPicker
                value={profile.birth_date || ''}
                onChange={handleBirthDate}
                minYear={1924}
              />
            </div>
            {profile.birth_date && (profile.age ?? 0) > 0 && (
              <div className="flex items-center justify-center gap-3 py-6 card bg-brand/5 border-brand/20 mb-5">
                <span className="text-5xl font-extrabold text-brand">{profile.age}</span>
                <div>
                  <p className="text-lg font-bold text-ink-900">세</p>
                  <p className="text-xs text-ink-500">만 나이</p>
                </div>
              </div>
            )}

            {/* 성별 선택 */}
            <p className="text-xs font-bold text-ink-500 mb-2">성별 <span className="font-normal text-ink-400">(선택)</span></p>
            <div className="flex gap-2">
              {GENDER_OPTIONS.map(g => {
                const sel = profile.gender === g.value
                return (
                  <button key={g.value}
                    onClick={() => updateProfile({ gender: sel ? undefined : g.value })}
                    className={[
                      'flex-1 py-3 rounded-2xl border-2 font-bold text-sm transition-all',
                      sel ? 'border-brand bg-brand text-white shadow-brand' : 'border-ink-100 bg-white text-ink-700 hover:border-brand/40',
                    ].join(' ')}>
                    {g.label}
                  </button>
                )
              })}
            </div>
          </div>
        )}

        {/* ── Step 2: 현황 ── */}
        {step === 2 && (
          <div>
            <h2 className="text-2xl font-extrabold text-ink-900 mb-1">현재 어떤 상황이세요?</h2>
            <p className="text-sm text-ink-500 mb-6">해당하는 것을 골라주세요</p>
            <div className="space-y-2.5">
              {JOBS.map(j => {
                const sel = profile.employment_status === j.value
                return (
                  <button key={j.value} onClick={() => updateProfile({ employment_status: j.value })}
                    className={[
                      'w-full flex items-center gap-4 p-4 rounded-2xl border-2 text-left transition-all',
                      sel ? 'border-brand bg-brand-light' : 'border-ink-100 bg-white hover:border-brand/40',
                    ].join(' ')}>
                    <div className="w-10 h-10 rounded-2xl bg-ink-100/80 flex items-center justify-center flex-shrink-0">
                      <j.Icon size={20} className="text-brand" />
                    </div>
                    <div className="flex-1">
                      <p className="font-extrabold text-ink-900">{j.value}</p>
                      <p className="text-xs text-ink-500 mt-0.5">{j.desc}</p>
                    </div>
                    <div className={['w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0', sel ? 'bg-brand border-brand' : 'border-ink-100'].join(' ')}>
                      {sel && <Check size={11} className="text-white" strokeWidth={3} />}
                    </div>
                  </button>
                )
              })}
              <button
                onClick={() => updateProfile({ employment_status: null as any })}
                className="w-full py-3 rounded-2xl border-2 border-dashed border-ink-200 text-sm font-bold text-ink-400 hover:border-ink-300 transition-colors"
              >
                선택 안 함
              </button>
            </div>

            {/* 혼인 여부 */}
            <div className="mt-6">
              <div className="flex items-center justify-between mb-2">
                <p className="text-xs font-bold text-ink-500">혼인 여부 <span className="font-normal text-ink-400">(선택)</span></p>
                {profile.marital_status && (
                  <button onClick={() => updateProfile({ marital_status: null as any })}
                    className="text-xs font-bold text-ink-400 hover:text-ink-600 transition-colors">
                    선택 안 함
                  </button>
                )}
              </div>
              <div className="flex gap-2">
                {MARITAL_OPTIONS.map(opt => {
                  const sel = profile.marital_status === opt.value
                  return (
                    <button key={opt.value}
                      onClick={() => updateProfile({ marital_status: sel ? null as any : opt.value })}
                      className={[
                        'flex-1 py-3 rounded-2xl border-2 font-bold text-sm transition-all',
                        sel ? 'border-brand bg-brand text-white' : 'border-ink-100 bg-white text-ink-700 hover:border-brand/40',
                      ].join(' ')}>
                      {opt.label}
                    </button>
                  )
                })}
              </div>
            </div>

            {/* 병역 여부 (남성만) */}
            {(profile.gender === '남성' || !profile.gender) && (
              <div className="mt-6">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-xs font-bold text-ink-500">
                    병역 여부 <span className="font-normal text-ink-400">(남성만 선택)</span>
                  </p>
                  {profile.military_status && (
                    <button onClick={() => updateProfile({ military_status: null as any })}
                      className="text-xs font-bold text-ink-400 hover:text-ink-600 transition-colors">
                      선택 안 함
                    </button>
                  )}
                </div>
                <div className="grid grid-cols-3 gap-2">
                  {MILITARY_OPTIONS.map(opt => {
                    const sel = profile.military_status === opt.value
                    return (
                      <button key={opt.value}
                        onClick={() => updateProfile({ military_status: sel ? null as any : opt.value })}
                        className={[
                          'flex flex-col items-center py-3 px-2 rounded-2xl border-2 text-center transition-all',
                          sel ? 'border-brand bg-brand-light' : 'border-ink-100 bg-white hover:border-brand/40',
                        ].join(' ')}>
                        <span className={['font-extrabold text-sm', sel ? 'text-brand' : 'text-ink-900'].join(' ')}>
                          {opt.label}
                        </span>
                        <span className="text-2xs text-ink-400 mt-0.5 leading-tight">{opt.desc}</span>
                      </button>
                    )
                  })}
                </div>
              </div>
            )}
          </div>
        )}

        {/* ── Step 3: 지역 ── */}
        {step === 3 && (
          <div>
            <h2 className="text-2xl font-extrabold text-ink-900 mb-1">어디에 사세요?</h2>
            <p className="text-sm text-ink-500 mb-6">지역 맞춤 정책을 찾아드려요</p>
            <div className="grid grid-cols-4 gap-2 mb-3">
              {REGIONS.map(r => {
                const sel = profile.region === r
                return (
                  <button key={r} onClick={() => updateProfile({ region: r })}
                    className={[
                      'py-2.5 rounded-xl text-sm font-bold border-2 transition-all',
                      sel ? 'bg-brand text-white border-brand shadow-brand' : 'bg-white text-ink-700 border-ink-100 hover:border-brand/40',
                    ].join(' ')}>
                    {r}
                  </button>
                )
              })}
            </div>
            <button
              onClick={() => updateProfile({ region: null as any, district: null as any })}
              className="w-full py-3 mb-4 rounded-2xl border-2 border-dashed border-ink-200 text-sm font-bold text-ink-400 hover:border-ink-300 transition-colors"
            >
              선택 안 함
            </button>
            <div className="space-y-2">
              {[
                { key: 'disability',    label: '장애가 있어요',    desc: '장애인 전용 정책 추가 추천', Icon: Accessibility },
                { key: 'multicultural', label: '다문화가정이에요', desc: '다문화 지원 정책 추가 안내', Icon: Globe },
              ].map(({ key, label, desc, Icon }) => (
                <label key={key}
                  className="flex items-center gap-3 p-4 rounded-2xl border-2 border-ink-100 bg-white cursor-pointer hover:border-brand/30 transition-colors">
                  <div className="w-9 h-9 rounded-2xl bg-ink-100/80 flex items-center justify-center flex-shrink-0">
                    <Icon size={18} className="text-brand" />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-bold text-ink-900">{label}</p>
                    <p className="text-xs text-ink-500 mt-0.5">{desc}</p>
                  </div>
                  <input type="checkbox" className="w-4 h-4 accent-brand flex-shrink-0"
                    checked={!!(profile as any)[key]}
                    onChange={e => updateProfile({ [key]: e.target.checked } as any)} />
                </label>
              ))}
            </div>
          </div>
        )}

        {/* ── Step 4: 관심사 ── */}
        {step === 4 && (
          <div>
            <h2 className="text-2xl font-extrabold text-ink-900 mb-1">어떤 정보가 필요하세요?</h2>
            <p className="text-sm text-ink-500 mb-6">여러 개 선택할 수 있어요</p>
            <div className="grid grid-cols-2 gap-3">
              {SERVICE_FIELD_CATEGORIES.map(c => {
                const sel = (profile.interests ?? []).includes(c.label)
                return (
                  <button key={c.code}
                    onClick={() => {
                      const cur = profile.interests ?? []
                      updateProfile({ interests: sel ? cur.filter(x => x !== c.label) : [...cur, c.label] })
                    }}
                    className={[
                      'relative p-5 rounded-2xl border-2 text-left transition-all',
                      sel ? 'border-brand bg-brand-light' : 'border-ink-100 bg-white hover:border-brand/40',
                    ].join(' ')}>
                    {sel && (
                      <div className="absolute top-3 right-3 w-5 h-5 rounded-full bg-brand flex items-center justify-center">
                        <Check size={11} className="text-white" strokeWidth={3} />
                      </div>
                    )}
                    <div className="w-10 h-10 rounded-2xl bg-ink-100/80 flex items-center justify-center mb-2.5">
                      <c.Icon size={20} className="text-brand" />
                    </div>
                    <p className="font-extrabold text-ink-900 text-sm">{c.label}</p>
                  </button>
                )
              })}
            </div>
          </div>
        )}

        {/* ── Step 5: 가구정보 ── */}
        {step === 5 && (
          <div>
            <h2 className="text-2xl font-extrabold text-ink-900 mb-1">가구 정보를 알려주세요</h2>
            <p className="text-sm text-ink-500 mb-6">모두 선택 사항이에요 — 건너뛰어도 괜찮아요</p>

            {/* 소득 수준 */}
            <p className="text-xs font-bold text-ink-500 mb-2">소득 수준</p>
            <div className="flex gap-2 mb-3 flex-wrap">
              {[
                { value: '기초생활수급자', label: '기초생활수급자' },
                { value: '제한없음',      label: '소득 무관' },
              ].map(opt => {
                const sel = profile.household_income === opt.value
                return (
                  <button key={opt.value}
                    onClick={() => { updateProfile({ household_income: sel ? undefined : opt.value }); setSalaryInput('') }}
                    className={[
                      'flex-1 py-3 rounded-2xl border-2 font-bold text-sm transition-all',
                      sel ? 'border-brand bg-brand text-white' : 'border-ink-100 bg-white text-ink-700 hover:border-brand/40',
                    ].join(' ')}>
                    {opt.label}
                  </button>
                )
              })}
              <button
                onClick={() => { updateProfile({ household_income: null as any }); setSalaryInput('') }}
                className="flex-1 py-3 rounded-2xl border-2 border-dashed border-ink-200 text-sm font-bold text-ink-400 hover:border-ink-300 transition-colors"
              >
                선택 안 함
              </button>
            </div>

            {/* 소득 계산기 */}
            {!['기초생활수급자', '제한없음'].includes(profile.household_income ?? '') && (
              <div className="card p-4 mb-6">
                <p className="text-xs font-bold text-ink-500 mb-3">월급 · 연봉으로 계산하기</p>

                {/* 가구원 수 */}
                <p className="text-2xs font-bold text-ink-400 mb-1.5">가구원 수</p>
                <div className="flex gap-1.5 mb-4">
                  {[1, 2, 3, 4, 5, 6].map(n => (
                    <button key={n} onClick={() => setHhSize(n)}
                      className={[
                        'flex-1 py-2 rounded-xl border-2 font-bold text-xs transition-all',
                        hhSize === n ? 'border-brand bg-brand text-white' : 'border-ink-100 bg-white text-ink-700',
                      ].join(' ')}>
                      {n < 6 ? `${n}인` : '6인+'}
                    </button>
                  ))}
                </div>

                {/* 월급 / 연봉 탭 */}
                <div className="flex gap-1.5 mb-2">
                  {(['월', '연'] as const).map(m => (
                    <button key={m} onClick={() => setSalaryMode(m)}
                      className={[
                        'px-3 py-1.5 rounded-xl border-2 text-xs font-bold transition-all',
                        salaryMode === m ? 'border-brand bg-brand text-white' : 'border-ink-100 text-ink-500',
                      ].join(' ')}>
                      {m === '월' ? '월급' : '연봉'}
                    </button>
                  ))}
                </div>
                <div className="relative">
                  <input
                    type="text"
                    inputMode="numeric"
                    className="field pr-14 text-sm font-bold"
                    placeholder={salaryMode === '월' ? '예) 250' : '예) 3000'}
                    value={salaryInput}
                    onChange={e => {
                      const raw = e.target.value.replace(/[^0-9]/g, '')
                      setSalaryInput(raw ? Number(raw).toLocaleString() : '')
                      const manwon = Number(raw)
                      const monthlyWon = salaryMode === '월' ? manwon * 10000 : manwon * 10000 / 12
                      if (monthlyWon > 0) {
                        updateProfile({ household_income: calcIncomeBracket(monthlyWon, hhSize) })
                      } else {
                        updateProfile({ household_income: undefined })
                      }
                    }}
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-ink-400 font-semibold">만원</span>
                </div>

                {/* 계산 결과 */}
                {salaryInput && profile.household_income && (
                  <div className="mt-3 p-3 rounded-xl bg-brand/5 border border-brand/20">
                    <p className="text-xs text-brand font-bold">
                      ✦ {getBracketLabel(profile.household_income)} 해당
                    </p>
                    <p className="text-2xs text-ink-500 mt-0.5">
                      중위소득 기준 약 {getIncomePct(
                        (salaryMode === '월'
                          ? Number(salaryInput.replace(/,/g, ''))
                          : Number(salaryInput.replace(/,/g, '')) / 12) * 10000,
                        hhSize
                      )}% 수준 ({hhSize}인 가구 기준)
                    </p>
                  </div>
                )}
              </div>
            )}

            {/* 자녀 수 */}
            <p className="text-xs font-bold text-ink-500 mb-2">자녀 수</p>
            <div className="flex items-center gap-2 mb-3">
              <button
                onClick={() => { setChildBirthDates([]); updateProfile({ children_count: 0, children_ages: [] }) }}
                className={[
                  'px-5 py-3 rounded-2xl border-2 font-bold text-sm transition-all flex-shrink-0',
                  profile.children_count === 0 ? 'border-brand bg-brand text-white' : 'border-ink-100 bg-white text-ink-700 hover:border-brand/40',
                ].join(' ')}>
                없음
              </button>
              <div className={[
                'flex items-center gap-2 flex-1 px-3 py-2 rounded-2xl border-2 transition-all',
                (profile.children_count ?? 0) > 0 ? 'border-brand bg-brand/5' : 'border-ink-100 bg-white',
              ].join(' ')}>
                <button
                  onClick={() => {
                    const n = Math.max(1, (profile.children_count ?? 1) - 1)
                    const dates = childBirthDates.slice(0, n)
                    setChildBirthDates(dates)
                    updateProfile({ children_count: n, children_ages: dates.map(d => d ? calcAge(d) : 0) })
                  }}
                  disabled={(profile.children_count ?? 0) <= 0}
                  className="w-8 h-8 rounded-xl bg-white border border-ink-100 font-bold text-lg flex items-center justify-center disabled:opacity-30 flex-shrink-0">
                  −
                </button>
                <span className="flex-1 text-center font-extrabold text-base text-ink-900">
                  {(profile.children_count ?? 0) > 0 ? `${profile.children_count}명` : '—'}
                </span>
                <button
                  onClick={() => {
                    const n = (profile.children_count ?? 0) + 1
                    const dates = [...childBirthDates, '']
                    setChildBirthDates(dates)
                    updateProfile({ children_count: n, children_ages: dates.map(d => d ? calcAge(d) : 0) })
                  }}
                  className="w-8 h-8 rounded-xl bg-white border border-ink-100 font-bold text-lg flex items-center justify-center flex-shrink-0">
                  +
                </button>
              </div>
            </div>

            {/* 자녀 생년월일 */}
            {(profile.children_count ?? 0) > 0 && (
              <div className="card p-4 mb-4">
                <p className="text-xs font-bold text-ink-500 mb-3">
                  자녀 생년월일 <span className="font-normal text-ink-400">(선택 — 더 정확한 추천)</span>
                </p>
                <div className="space-y-2.5">
                  {Array.from({ length: profile.children_count ?? 0 }).map((_, i) => (
                    <div key={i}>
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs font-bold text-ink-400">{i + 1}째 자녀</span>
                        {childBirthDates[i] && (
                          <span className="text-xs font-bold text-brand">
                            만 {calcAge(childBirthDates[i])}세
                          </span>
                        )}
                      </div>
                      <YMDPicker
                        value={childBirthDates[i] ?? ''}
                        onChange={date => {
                          const dates = [...childBirthDates]
                          dates[i] = date
                          setChildBirthDates(dates)
                          updateProfile({ children_ages: dates.map(d => d ? calcAge(d) : 0) })
                        }}
                        minYear={THIS_YEAR - 25}
                      />
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="space-y-2">
              {(profile.gender === '여성' || !profile.gender) && (
                <label className="flex items-center gap-3 p-4 rounded-2xl border-2 border-ink-100 bg-white cursor-pointer hover:border-brand/30 transition-colors">
                  <div className="w-9 h-9 rounded-2xl bg-ink-100/80 flex items-center justify-center flex-shrink-0">
                    <Baby size={18} className="text-brand" />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-bold text-ink-900">임산부예요</p>
                    <p className="text-xs text-ink-500 mt-0.5">임신·출산 지원 정책 추가 추천</p>
                  </div>
                  <input type="checkbox" className="w-4 h-4 accent-brand flex-shrink-0"
                    checked={!!profile.is_pregnant}
                    onChange={e => updateProfile({ is_pregnant: e.target.checked })} />
                </label>
              )}
              <label className="flex items-center gap-3 p-4 rounded-2xl border-2 border-ink-100 bg-white cursor-pointer hover:border-brand/30 transition-colors">
                <div className="w-9 h-9 rounded-2xl bg-ink-100/80 flex items-center justify-center flex-shrink-0">
                  <PersonStanding size={18} className="text-brand" />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-bold text-ink-900">한부모 가정이에요</p>
                  <p className="text-xs text-ink-500 mt-0.5">한부모 가족 지원 정책 추가 추천</p>
                </div>
                <input type="checkbox" className="w-4 h-4 accent-brand flex-shrink-0"
                  checked={!!profile.is_single_parent}
                  onChange={e => updateProfile({ is_single_parent: e.target.checked })} />
              </label>
            </div>
          </div>
        )}
      </div>

      {/* 하단 버튼 */}
      <div className="sticky bottom-0 bg-white border-t border-ink-100/80 px-5 py-4 pb-[calc(env(safe-area-inset-bottom)+16px)]">

        {/* 개요 화면 버튼 */}
        {step === 0 && (
          <button className="btn-solid" onClick={async () => {
            setLoading(true)
            try {
              await apiClient.post('/api/v1/users/onboarding', profile as OnboardingProfile)
              await queryClient.invalidateQueries({ queryKey: ['me'] })
              await queryClient.invalidateQueries({ queryKey: ['recommendations'] })
              reset()
              navigate('/profile')
            } finally {
              setLoading(false)
            }
          }} disabled={loading}>
            {loading ? '저장 중...' : '완료'}
          </button>
        )}

        {/* 최초 온보딩 / 새 프로필 생성 — 선형 진행 */}
        {step > 0 && !isEdit && (
          step < TOTAL
            ? <button className="btn-solid flex items-center justify-center gap-2" onClick={nextStep} disabled={!canNext}>
                다음 <ChevronRight size={16} />
              </button>
            : <button className="btn-solid" onClick={() => save(false)} disabled={loading}>
                {loading ? '저장 중...' : isNewProfile ? '프로필 저장하기' : '완료! 정책 보러가기'}
              </button>
        )}

        {/* 편집 모드 — 각 스텝에서 "저장하기" */}
        {step > 0 && isEdit && (
          <button className="btn-solid" onClick={() => save(true)} disabled={loading}>
            {loading ? '저장 중...' : '저장하기'}
          </button>
        )}
      </div>
    </div>
  )
}
