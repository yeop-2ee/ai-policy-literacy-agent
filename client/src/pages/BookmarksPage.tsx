import { Bookmark, ClipboardList, Bell } from 'lucide-react'
import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import Layout from '../components/layout/Layout'
import PolicyCard from '../components/policy/PolicyCard'
import { bookmarkApi } from '../api/policy.api'

function isDeadlineSoon(deadline?: string): boolean {
  if (!deadline) return false
  const diff = Math.ceil(
    (new Date(deadline).setHours(0, 0, 0, 0) - new Date().setHours(0, 0, 0, 0)) / 86400000
  )
  return diff >= 0 && diff <= 7
}

export default function BookmarksPage() {
  const { data, isLoading } = useQuery({
    queryKey: ['bookmarks'],
    queryFn: () => bookmarkApi.list(),
  })

  const rawPolicies = data?.data.policies ?? []
  const total = data?.data.total ?? 0
  const soonCount = rawPolicies.filter(p => isDeadlineSoon(p.deadline)).length

  // 마감일 빠른 순 정렬 (deadline 없는 건 맨 뒤)
  const policies = [...rawPolicies].sort((a, b) => {
    if (!a.deadline && !b.deadline) return 0
    if (!a.deadline) return 1
    if (!b.deadline) return -1
    return new Date(a.deadline).getTime() - new Date(b.deadline).getTime()
  })

  return (
    <Layout title="저장한 정책">
      <div className="px-4 py-4">
        <div className="grid grid-cols-2 gap-2.5 mb-6">
          <div className="rounded-[28px] p-4 bg-brand text-white">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold text-green-100">저장된 정책</p>
                <p className="text-2xl font-extrabold mt-1 text-white">
                  {isLoading ? '...' : `${total}개`}
                </p>
              </div>
              <div className="w-10 h-10 rounded-2xl flex items-center justify-center bg-white/20">
                <ClipboardList size={18} className="text-white" />
              </div>
            </div>
          </div>
          <div className="card p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold text-ink-500">마감 임박</p>
                <p className="text-2xl font-extrabold mt-1 text-ink-900">
                  {isLoading ? '...' : `${soonCount}개`}
                </p>
              </div>
              <div className="w-10 h-10 rounded-2xl flex items-center justify-center bg-white/80 border border-ink-100/60">
                <Bell size={18} className="text-brand" />
              </div>
            </div>
          </div>
        </div>

        {isLoading && (
          <div className="space-y-3">
            {[...Array(3)].map((_, i) => <div key={i} className="skel h-36 rounded-3xl" />)}
          </div>
        )}

        {!isLoading && policies.length === 0 && (
          <div className="card p-8 overflow-hidden">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-2xl bg-brand flex items-center justify-center flex-shrink-0 text-white rotate-3">
                <Bookmark size={22} className="text-white" strokeWidth={2.2} />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-md font-extrabold text-ink-900">아직 저장된 정책이 없어요</p>
                <p className="text-sm text-ink-500 leading-relaxed mt-1">
                  마음에 드는 정책을 저장해두면<br />여기서 모아볼 수 있어요
                </p>
                <div className="mt-5">
                  <Link to="/dashboard" className="btn-solid inline-flex w-auto px-5">
                    정책 둘러보기
                  </Link>
                </div>
              </div>
            </div>
          </div>
        )}

        {!isLoading && policies.length > 0 && (
          <div className="space-y-3">
            {policies.map(p => (
              <PolicyCard key={p._id} policy={p} initialSaved={true} />
            ))}
          </div>
        )}
      </div>
    </Layout>
  )
}
