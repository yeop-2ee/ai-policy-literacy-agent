import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery, useQueryClient, useMutation } from '@tanstack/react-query'
import { ChevronRight, Edit3, Bell, Shield, HelpCircle, LogOut, MapPin, Briefcase, Heart, Cake, Wallet, Baby, Users, UserRound, Trash2, Check, Plus } from 'lucide-react'
import Layout from '../components/layout/Layout'
import { userApi } from '../api/user.api'
import { profileApi } from '../api/profile.api'
import { apiClient } from '../api/client'
import type { Profile } from '../types/user.types'

const GROUPS = [
  {
    title: '기타',
    items: [
      { icon: Bell,       label: '알림 설정',        desc: '정책 마감 알림',     path: null },
      { icon: Shield,     label: '개인정보 처리방침', desc: '', path: null },
      { icon: HelpCircle, label: '도움말 및 문의',   desc: '', path: null },
    ],
  },
]

function profileSummary(p: Profile): string {
  const parts: string[] = []
  if (p.age) parts.push(`만 ${p.age}세`)
  if (p.region) parts.push(p.region)
  if (p.employment_status) parts.push(p.employment_status)
  if (p.marital_status) parts.push(p.marital_status)
  if (p.military_status) parts.push(p.military_status)
  return parts.length ? parts.join(' · ') : '정보 없음'
}

export default function ProfilePage() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [showWithdraw, setShowWithdraw] = useState(false)
  const [withdrawing, setWithdrawing] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null)

  const { data: user, isLoading } = useQuery({
    queryKey: ['me'],
    queryFn: userApi.getMe,
  })

  const { data: profilesData, isLoading: profilesLoading } = useQuery({
    queryKey: ['profiles'],
    queryFn: () => profileApi.list(),
  })
  const profiles = profilesData?.data.profiles ?? []
  const activeId = profilesData?.data.active_id

  const activateMut = useMutation({
    mutationFn: (id: string) => profileApi.activate(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['profiles'] })
      queryClient.invalidateQueries({ queryKey: ['me'] })
      queryClient.invalidateQueries({ queryKey: ['recommendations'] })
    },
  })

  const deleteMut = useMutation({
    mutationFn: (id: string) => profileApi.delete(id),
    onSuccess: () => {
      setDeleteTarget(null)
      queryClient.invalidateQueries({ queryKey: ['profiles'] })
      queryClient.invalidateQueries({ queryKey: ['me'] })
      queryClient.invalidateQueries({ queryKey: ['recommendations'] })
    },
  })

  return (
    <Layout title="내 정보">
      <div className="px-4 py-4 space-y-4">

        {/* 계정 카드 */}
        <div className="card p-5 overflow-hidden">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-brand flex items-center justify-center flex-shrink-0 text-white rotate-3">
              <UserRound size={26} className="text-white" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-lg font-extrabold text-ink-900 tracking-tight truncate">
                {user?.name ?? user?.email ?? '로딩 중...'}
              </p>
              <p className="text-xs text-ink-500 mt-0.5">
                {user?.email ?? ''}
              </p>
            </div>
          </div>
        </div>

        {/* 내 프로필 목록 */}
        <div>
          <div className="sec">
            <span className="sec-title">내 프로필</span>
            <button
              onClick={() => navigate('/onboarding?new=true')}
              className="sec-link flex items-center gap-0.5"
            >
              <Plus size={12} /> 추가
            </button>
          </div>

          {profilesLoading ? (
            <div className="space-y-2">
              {[...Array(2)].map((_, i) => <div key={i} className="skel h-16 rounded-2xl" />)}
            </div>
          ) : profiles.length === 0 ? (
            <button
              onClick={() => navigate('/onboarding')}
              className="w-full card py-5 border-2 border-dashed border-brand/30 text-sm font-bold text-brand hover:bg-brand/5 transition-colors flex items-center justify-center gap-2"
            >
              <Plus size={16} /> 프로필 생성하기
            </button>
          ) : (
            <div className="card overflow-hidden">
              {profiles.map((p, idx) => {
                const isActive = p.id === activeId
                return (
                  <div
                    key={p.id}
                    className={[
                      'flex items-center gap-3 px-4 py-3.5',
                      idx < profiles.length - 1 ? 'border-b border-ink-100' : '',
                      isActive ? 'bg-brand/[0.04]' : '',
                    ].join(' ')}
                  >
                    {/* 프로필 아이콘 + 정보 */}
                    <button
                      className="flex items-center gap-3 flex-1 text-left min-w-0"
                      onClick={() => { if (!isActive) activateMut.mutate(p.id) }}
                      disabled={isActive || activateMut.isPending}
                    >
                      <div className={[
                        'w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0',
                        isActive ? 'bg-brand' : 'bg-ink-100',
                      ].join(' ')}>
                        {isActive
                          ? <Check size={15} className="text-white" strokeWidth={3} />
                          : <UserRound size={15} className="text-ink-500" />
                        }
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-bold text-ink-900 truncate">{p.name}</p>
                        <p className="text-xs text-ink-400 truncate">{profileSummary(p)}</p>
                      </div>
                    </button>

                    {isActive && (
                      <span className="chip chip-brand flex-shrink-0">사용 중</span>
                    )}

                    {/* 수정 버튼 */}
                    <button
                      onClick={() => navigate(`/onboarding?profileId=${p.id}`)}
                      className="w-8 h-8 rounded-xl bg-white border border-ink-100 flex items-center justify-center flex-shrink-0 hover:border-brand/30 transition-colors"
                    >
                      <Edit3 size={13} className="text-ink-400" />
                    </button>

                    {/* 삭제 버튼 */}
                    <button
                      onClick={() => setDeleteTarget(p.id)}
                      className="w-8 h-8 rounded-xl bg-white border border-ink-100 flex items-center justify-center flex-shrink-0 hover:border-red-300 hover:text-red-400 transition-colors"
                    >
                      <Trash2 size={13} className="text-ink-400" />
                    </button>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* 활성 프로필 정보 */}
        {profiles.length > 0 && (
          <div className="card p-5 overflow-hidden">
            <div className="flex items-center justify-between mb-3">
              <p className="text-xs font-bold text-ink-500">활성 프로필 정보</p>
              {activeId && (
                <button
                  onClick={() => navigate(`/onboarding?profileId=${activeId}`)}
                  className="w-8 h-8 rounded-xl bg-white/70 border border-ink-100/60 flex items-center justify-center hover:border-brand/25 transition-colors"
                >
                  <Edit3 size={14} className="text-ink-700" />
                </button>
              )}
            </div>

            {isLoading ? (
              <div className="space-y-2">
                {[...Array(3)].map((_, i) => <div key={i} className="skel h-6 rounded-xl" />)}
              </div>
            ) : user?.onboarding_completed ? (
              <div className="space-y-2.5">
                {user.age && (
                  <div className="flex items-center gap-2.5 text-sm">
                    <Cake size={16} className="text-brand flex-shrink-0" />
                    <span className="font-semibold text-ink-700">만 {user.age}세</span>
                    {user.birth_date && <span className="text-xs text-ink-400">({user.birth_date})</span>}
                    {user.gender && <span className="chip chip-slate ml-1">{user.gender}</span>}
                  </div>
                )}
                {user.region && (
                  <div className="flex items-center gap-2.5 text-sm">
                    <MapPin size={16} className="text-brand flex-shrink-0" />
                    <span className="font-semibold text-ink-700">{user.region}{user.district ? ` ${user.district}` : ''}</span>
                  </div>
                )}
                {user.employment_status && (
                  <div className="flex items-center gap-2.5 text-sm">
                    <Briefcase size={16} className="text-brand flex-shrink-0" />
                    <span className="font-semibold text-ink-700">{user.employment_status}</span>
                  </div>
                )}
                {user.interests && user.interests.length > 0 && (
                  <div className="flex items-start gap-2.5 text-sm">
                    <Heart size={16} className="text-brand flex-shrink-0 mt-0.5" />
                    <div className="flex flex-wrap gap-1">
                      {user.interests.map(i => (
                        <span key={i} className="chip chip-brand">{i}</span>
                      ))}
                    </div>
                  </div>
                )}
                {user.household_income && (
                  <div className="flex items-center gap-2.5 text-sm">
                    <Wallet size={16} className="text-brand flex-shrink-0" />
                    <span className="font-semibold text-ink-700">{user.household_income}</span>
                  </div>
                )}
                {user.children_count !== undefined && user.children_count !== null && (
                  <div className="flex items-center gap-2.5 text-sm">
                    <Baby size={16} className="text-brand flex-shrink-0" />
                    <span className="font-semibold text-ink-700">자녀 {user.children_count === 0 ? '없음' : `${user.children_count}명`}</span>
                  </div>
                )}
                {(user.marital_status || user.military_status) && (
                  <div className="flex items-center gap-2.5 text-sm">
                    <Briefcase size={16} className="text-brand flex-shrink-0" />
                    <div className="flex gap-1.5 flex-wrap">
                      {user.marital_status && <span className="chip chip-slate">{user.marital_status}</span>}
                      {user.military_status && <span className="chip chip-slate">{user.military_status}</span>}
                    </div>
                  </div>
                )}
                {(user.disability || user.multicultural || user.is_single_parent) && (
                  <div className="flex items-center gap-2.5 text-sm">
                    <Users size={16} className="text-brand flex-shrink-0" />
                    <div className="flex gap-1.5 flex-wrap">
                      {user.disability    && <span className="chip chip-slate">장애인</span>}
                      {user.multicultural && <span className="chip chip-slate">다문화</span>}
                      {user.is_single_parent && <span className="chip chip-slate">한부모</span>}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <button
                onClick={() => navigate('/onboarding')}
                className="w-full py-3 rounded-2xl border-2 border-dashed border-brand/30 text-sm font-bold text-brand hover:bg-brand/5 transition-colors">
                + 프로필 설정하기
              </button>
            )}
          </div>
        )}

        {/* 메뉴 그룹 */}
        {GROUPS.map(group => (
          <div key={group.title}>
            <p className="text-xs font-bold text-ink-500 mb-2 px-1">{group.title}</p>
            <div className="card overflow-hidden">
              {group.items.map(({ icon: Icon, label, desc, path }) => (
                <button key={label} onClick={() => path && navigate(path)}
                  className="w-full flex items-center gap-3.5 px-4 py-4 text-left transition-all duration-150 hover:bg-brand/[0.06] active:bg-brand/10 group">
                  <div className="w-10 h-10 rounded-2xl bg-white/70 border border-ink-100/60 flex items-center justify-center flex-shrink-0 transition-all duration-150 group-hover:bg-brand group-hover:border-brand">
                    <Icon size={16} className="text-brand transition-colors duration-150 group-hover:text-white" />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-bold text-ink-900 transition-colors duration-150 group-hover:text-brand">{label}</p>
                    {desc && <p className="text-xs text-ink-500 mt-0.5">{desc}</p>}
                  </div>
                  <ChevronRight size={14} className="text-ink-300 flex-shrink-0 transition-transform duration-150 group-hover:translate-x-0.5 group-hover:text-brand" />
                </button>
              ))}
            </div>
          </div>
        ))}

        {/* 로그아웃 */}
        <button onClick={() => { localStorage.removeItem('access_token'); navigate('/login') }}
          className="card-press w-full flex items-center justify-center gap-2 py-4 rounded-2xl text-sm font-bold text-ink-700 hover:bg-red-500 hover:text-white hover:border-red-500 transition-colors">
          <LogOut size={15} /> 로그아웃
        </button>

        {/* 회원탈퇴 */}
        <button onClick={() => setShowWithdraw(true)}
          className="w-full text-center text-xs font-semibold text-ink-300 hover:text-red-400 transition-colors pb-1">
          회원탈퇴
        </button>

        <p className="text-center text-2xs text-ink-300 pb-2">v1.0.0 · 사다리</p>

        {/* 프로필 삭제 확인 모달 */}
        {deleteTarget && (
          <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40" onClick={() => setDeleteTarget(null)}>
            <div className="w-full max-w-[480px] bg-white rounded-t-3xl p-6 pb-[calc(env(safe-area-inset-bottom)+24px)]"
                 onClick={e => e.stopPropagation()}>
              <p className="text-lg font-extrabold text-ink-900 mb-1">프로필을 삭제할까요?</p>
              <p className="text-sm text-ink-500 mb-6">삭제한 프로필은 복구할 수 없어요.</p>
              <div className="flex gap-2">
                <button onClick={() => setDeleteTarget(null)}
                  className="flex-1 py-4 rounded-2xl border border-ink-100 text-sm font-bold text-ink-700">
                  취소
                </button>
                <button
                  disabled={deleteMut.isPending}
                  onClick={() => deleteMut.mutate(deleteTarget)}
                  className="flex-1 py-4 rounded-2xl bg-red-500 text-sm font-bold text-white disabled:opacity-50">
                  {deleteMut.isPending ? '삭제 중...' : '삭제하기'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* 회원탈퇴 확인 모달 */}
        {showWithdraw && (
          <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40" onClick={() => setShowWithdraw(false)}>
            <div className="w-full max-w-[480px] bg-white rounded-t-3xl p-6 pb-[calc(env(safe-area-inset-bottom)+24px)]"
                 onClick={e => e.stopPropagation()}>
              <p className="text-lg font-extrabold text-ink-900 mb-1">정말 탈퇴하시겠어요?</p>
              <p className="text-sm text-ink-500 mb-6">탈퇴 시 모든 프로필과 저장 정보가 삭제되며 복구할 수 없습니다.</p>
              <div className="flex gap-2">
                <button onClick={() => setShowWithdraw(false)}
                  className="flex-1 py-4 rounded-2xl border border-ink-100 text-sm font-bold text-ink-700">
                  취소
                </button>
                <button
                  disabled={withdrawing}
                  onClick={async () => {
                    setWithdrawing(true)
                    try {
                      await apiClient.delete('/api/v1/auth/withdraw')
                      localStorage.removeItem('access_token')
                      navigate('/login')
                    } finally {
                      setWithdrawing(false)
                    }
                  }}
                  className="flex-1 py-4 rounded-2xl bg-red-500 text-sm font-bold text-white disabled:opacity-50">
                  {withdrawing ? '처리 중...' : '탈퇴하기'}
                </button>
              </div>
            </div>
          </div>
        )}

      </div>
    </Layout>
  )
}
