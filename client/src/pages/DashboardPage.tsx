import { useQuery } from '@tanstack/react-query'
import { useState, useRef, useEffect } from 'react'
import { Search, Bell, ChevronRight, Zap, ArrowUpRight, Sparkles, Home, Briefcase, GraduationCap, SlidersHorizontal, UserCircle, Loader2 } from 'lucide-react'
import { Link, useNavigate } from 'react-router-dom'
import { policyApi, bookmarkApi } from '../api/policy.api'
import { userApi } from '../api/user.api'
import PolicyCard from '../components/policy/PolicyCard'
import { SERVICE_FIELD_CATEGORIES, LIFECYCLE_CATEGORIES } from '../types/policy.types'
import Layout from '../components/layout/Layout'

import type { LucideIcon } from 'lucide-react'

const BANNERS: { Icon: LucideIcon; label: string; chip: string; title: string; sub: string }[] = [
  { Icon: Home,          label: '신규',     chip: 'chip-red',    title: '청년 주거급여',   sub: '무주택 청년 월세 최대 20만원' },
  { Icon: Briefcase,     label: 'HOT',      chip: 'chip-amber',  title: '취업성공패키지',  sub: '구직수당 + 취업연계 지원' },
  { Icon: GraduationCap, label: '마감임박', chip: 'chip-brand',  title: '국가장학금',      sub: '소득 8구간까지 최대 570만원' },
]

// 카드 3개 정확히 + 다음 카드 살짝 노출 (p-4 32 + 태그 34 + 제목 56 + 요약 54 + 메타 32 + 출처 32 + CTA 46 = 286px × 3 + gap 24)
const SCROLL_HEIGHT = 900

export default function DashboardPage() {
  const navigate = useNavigate()
  const [bannerIdx, setBannerIdx] = useState(0)
  const lifecycleScrollRef = useRef<HTMLDivElement>(null)
  const [thumbStyle, setThumbStyle] = useState({ left: '0%', width: '40%' })

  const { data: userData } = useQuery({ queryKey: ['me'], queryFn: userApi.getMe })
  const hasProfile = userData?.onboarding_completed === true

  const { data, isLoading, isFetching } = useQuery({
    queryKey: ['recommendations'],
    queryFn: () => policyApi.getRecommendations(),
    staleTime: 0,
  })
  const policies = data?.data.policies ?? []
  const noProfile = data?.data.no_profile === true
  const noMatch = data?.data.no_match === true
  const profileComplete = data?.data.profile_complete === true

  const { data: bookmarkData } = useQuery({
    queryKey: ['bookmarks'],
    queryFn: () => bookmarkApi.list(),
  })
  const savedIds = new Set((bookmarkData?.data.policies ?? []).map(p => p._id))

  // 가로 스크롤바 thumb 위치/크기 계산
  const updateThumb = () => {
    const el = lifecycleScrollRef.current
    if (!el) return
    const ratio = el.scrollLeft / (el.scrollWidth - el.clientWidth)
    const thumbW = (el.clientWidth / el.scrollWidth) * 100
    setThumbStyle({
      width: `${thumbW}%`,
      left: `${ratio * (100 - thumbW)}%`,
    })
  }

  useEffect(() => {
    updateThumb()
    window.addEventListener('resize', updateThumb)
    return () => window.removeEventListener('resize', updateThumb)
  }, [])

  return (
    <Layout right={
      <button className="relative w-9 h-9 flex items-center justify-center rounded-2xl bg-white border border-ink-100 hover:border-brand/30 transition-colors">
        <Bell size={18} className="text-ink-700" />
        <span className="absolute top-1 right-1 w-1.5 h-1.5 rounded-full bg-brand" />
      </button>
    }>
      <div className="px-4 py-4 space-y-6">

        {/* 인사 */}
        <div className="card overflow-hidden">
          <div className="p-6 bg-gradient-to-r from-white to-surface">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-sm text-ink-500 font-medium flex items-center gap-2">
                  <span className="inline-flex items-center justify-center w-7 h-7 rounded-xl bg-brand rotate-3">
                    <Sparkles size={14} className="text-white" />
                  </span>
                  안녕하세요
                </p>
                <h2 className="text-2xl font-black text-ink-900 mt-2 tracking-tight leading-tight">
                  오늘 받을 수 있는 정책을<br />빠르게 찾아볼까요?
                </h2>
                <p className="text-sm text-ink-500 mt-2 leading-relaxed">
                  프로필 기반 추천 + 키워드 검색으로 바로 확인하세요
                </p>
              </div>
              <Link
                to="/profile"
                className="flex items-center gap-1.5 px-4 py-2.5 rounded-2xl text-xs font-bold bg-brand text-white flex-shrink-0"
              >
                프로필 <ArrowUpRight size={14} />
              </Link>
            </div>
          </div>
        </div>

        {/* 검색 */}
        <div className="relative">
          <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-ink-300" />
          <input className="field pl-9 text-sm" placeholder="정책 키워드 검색" />
        </div>

        {/* 배너 */}
        <div>
          <div className="card overflow-hidden">
            {/* 배너 본문 */}
            <div className="p-6 bg-gradient-to-r from-white to-surface">
              <span className={`chip ${BANNERS[bannerIdx].chip} mb-3`}>{BANNERS[bannerIdx].label}</span>
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-brand flex items-center justify-center rotate-3">
                  {(() => { const I = BANNERS[bannerIdx].Icon; return <I size={22} className="text-white" /> })()}
                </div>
                <div className="min-w-0">
                  <p className="text-lg font-black text-ink-900 truncate">{BANNERS[bannerIdx].title}</p>
                  <p className="text-sm text-ink-500 mt-0.5">{BANNERS[bannerIdx].sub}</p>
                </div>
              </div>
              <div className="mt-4 flex items-center justify-between">
                <button className="flex items-center gap-1 text-xs font-bold text-brand">
                  신청 방법 보기 <ChevronRight size={12} />
                </button>
                <span className="text-2xs font-semibold text-ink-300">추천</span>
              </div>
            </div>

            {/* 인디케이터 탭 */}
            <div className="flex border-t border-ink-100 bg-white">
              {BANNERS.map((b, i) => (
                <button key={i} onClick={() => setBannerIdx(i)}
                  className={[
                    'flex-1 py-3 text-xs font-bold transition-colors border-b-2',
                    i === bannerIdx
                      ? 'text-brand border-brand'
                      : 'text-ink-300 border-transparent hover:text-ink-500',
                  ].join(' ')}>
                  {b.title}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* 분야별 */}
        <div>
          <div className="sec">
            <span className="sec-title">분야별</span>
            <button className="sec-link flex items-center gap-0.5" onClick={() => navigate('/policies')}>전체 <ChevronRight size={12} /></button>
          </div>
          <div className="grid grid-cols-3 gap-2">
            {SERVICE_FIELD_CATEGORIES.map((c) => (
              <button
                key={c.code}
                onClick={() => navigate(`/policies?type=field&code=${encodeURIComponent(c.code)}`)}
                className="card-press flex flex-col items-center gap-2 py-4 text-center"
              >
                <span className="inline-flex items-center justify-center w-10 h-10 rounded-2xl bg-gradient-to-br from-white to-surface border border-ink-100">
                  <c.Icon size={18} className="text-brand" />
                </span>
                <span className="text-2xs font-bold text-ink-700">{c.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* 대상별 */}
        <div>
          <div className="sec"><span className="sec-title">대상별</span></div>

          {/* 스크롤 컨테이너 */}
          <div className="relative">
            <div
              ref={lifecycleScrollRef}
              onScroll={updateThumb}
              className="flex gap-2 overflow-x-auto scrollbar-hide pb-1"
            >
              {LIFECYCLE_CATEGORIES.map((c) => (
                <button key={c.code}
                  onClick={() => navigate(`/policies?type=lifecycle&code=${encodeURIComponent(c.code)}`)}
                  className="flex-shrink-0 flex items-center gap-1.5 px-3 py-2 rounded-full border border-ink-100 bg-white text-xs font-bold text-ink-700 hover:border-brand/40 hover:text-brand transition-colors whitespace-nowrap">
                  <c.Icon size={12} /> {c.label.split('(')[0].trim()}
                </button>
              ))}
              <div className="w-2 flex-shrink-0" />
            </div>
            {/* 우측 페이드 */}
            <div className="pointer-events-none absolute inset-y-0 right-0 w-8 bg-gradient-to-l from-surface to-transparent" />
          </div>

          {/* 커스텀 가로 스크롤바 */}
          <div className="mt-2.5 h-[3px] rounded-full bg-ink-100 relative overflow-hidden">
            <div
              className="absolute top-0 h-full rounded-full bg-brand"
              style={thumbStyle}
            />
          </div>
        </div>

        {/* 맞춤 추천 */}
        <div>
          <div className="sec">
            <div className="flex items-center gap-1.5">
              <Zap size={14} className="text-brand" />
              <span className="sec-title">맞춤 추천</span>
            </div>
            <span className="chip chip-brand">AI 기반</span>
          </div>

          {/* 첫 로드 스켈레톤 */}
          {isLoading && <div className="space-y-3">{[...Array(3)].map((_, i) => <div key={i} className="skel h-36" />)}</div>}

          {/* 프로필 변경 후 재조회 중 */}
          {!isLoading && isFetching && (
            <div className="card p-8 text-center">
              <Loader2 size={32} className="text-brand mx-auto mb-3 animate-spin" />
              <p className="text-md font-extrabold text-ink-900">맞춤 정책을 비교하는 중이에요</p>
              <p className="text-sm text-ink-500 mt-1.5 leading-relaxed">
                입력하신 프로필 정보를 바탕으로<br />AI가 적합한 정책을 찾고 있어요
              </p>
            </div>
          )}

          {!isLoading && !isFetching && policies.length === 0 && (
            <div className="card p-8 text-center">
              {noProfile ? (
                <>
                  <UserCircle size={36} className="text-ink-300 mx-auto mb-3" />
                  <p className="text-md font-extrabold text-ink-900">프로필을 먼저 만들어주세요</p>
                  <p className="text-sm text-ink-500 mt-1.5 leading-relaxed">
                    나이·지역·관심 분야를 입력하면<br />AI가 딱 맞는 정책을 추천해드려요
                  </p>
                  <Link to="/onboarding"
                    className="inline-flex mt-5 px-6 py-3 rounded-2xl text-sm font-bold text-white bg-brand transition-all hover:brightness-95">
                    프로필 생성하기
                  </Link>
                </>
              ) : noMatch && profileComplete ? (
                <>
                  <SlidersHorizontal size={32} className="text-ink-300 mx-auto mb-3" />
                  <p className="text-md font-extrabold text-ink-900">현재 본인에게 맞는 정책이 없어요</p>
                  <p className="text-sm text-ink-500 mt-1.5 leading-relaxed">
                    입력하신 프로필 기준으로 AI가 분석했지만<br />현재 해당되는 정책을 찾지 못했어요
                  </p>
                  <p className="text-xs text-ink-400 mt-2">정책 데이터는 주기적으로 업데이트됩니다</p>
                </>
              ) : (
                <>
                  <SlidersHorizontal size={32} className="text-brand mx-auto mb-3" />
                  <p className="text-md font-extrabold text-ink-900">프로필 정보를 더 채워보세요</p>
                  <p className="text-sm text-ink-500 mt-1.5 leading-relaxed">
                    나이·지역·소득·관심분야를 입력할수록<br />AI가 더 정확한 맞춤 정책을 찾아드려요
                  </p>
                  <Link to="/profile"
                    className="inline-flex mt-5 px-6 py-3 rounded-2xl text-sm font-bold text-white bg-brand transition-all hover:brightness-95">
                    프로필 채우기
                  </Link>
                </>
              )}
            </div>
          )}

          {!isLoading && !isFetching && policies.length > 0 && (
            <div
              className="scroll-y-thin space-y-3 pr-2"
              style={{ maxHeight: SCROLL_HEIGHT }}
            >
              {policies.map(p => (
                <PolicyCard key={p._id} policy={p} initialSaved={savedIds.has(p._id)} />
              ))}
            </div>
          )}
        </div>
      </div>
    </Layout>
  )
}
