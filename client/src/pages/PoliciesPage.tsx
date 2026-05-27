import { useState, useEffect, useRef } from 'react'
import { useSearchParams, useNavigate } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import { useQuery } from '@tanstack/react-query'
import { Search, X, ChevronLeft, ChevronRight } from 'lucide-react'

import Layout from '../components/layout/Layout'
import PolicyCard from '../components/policy/PolicyCard'
import { policyApi, bookmarkApi } from '../api/policy.api'
import { SERVICE_FIELD_CATEGORIES, LIFECYCLE_CATEGORIES } from '../types/policy.types'

type TabType = 'all' | 'field' | 'lifecycle'

const LIMIT = 7

export default function PoliciesPage() {
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()

  const initType = searchParams.get('type') as TabType | null
  const initCode = searchParams.get('code') ?? ''

  const [tab, setTab] = useState<TabType>(initType ?? 'all')
  const [selectedCode, setSelectedCode] = useState(initCode)
  const [keyword, setKeyword] = useState('')
  const [inputValue, setInputValue] = useState('')
  const [page, setPage] = useState(1)
  const filterScrollRef = useRef<HTMLDivElement>(null)
  const [thumbStyle, setThumbStyle] = useState({ left: '0%', width: '40%' })

  const updateThumb = () => {
    const el = filterScrollRef.current
    if (!el) return
    const ratio = el.scrollLeft / (el.scrollWidth - el.clientWidth) || 0
    const thumbW = (el.clientWidth / el.scrollWidth) * 100
    setThumbStyle({ width: `${thumbW}%`, left: `${ratio * (100 - thumbW)}%` })
  }

  useEffect(() => {
    updateThumb()
    window.addEventListener('resize', updateThumb)
    return () => window.removeEventListener('resize', updateThumb)
  }, [tab, selectedCode])

  // 탭/필터 변경 시 페이지 초기화
  useEffect(() => {
    setPage(1)
  }, [tab, selectedCode, keyword])

  const offset = (page - 1) * LIMIT

  const filter = {
    ...(tab === 'field' && selectedCode ? { service_field: selectedCode } : {}),
    ...(tab === 'lifecycle' && selectedCode ? { lifecycle: selectedCode } : {}),
    ...(keyword ? { keyword } : {}),
    limit: LIMIT,
    offset,
  }

  const { data, isFetching } = useQuery({
    queryKey: ['policies-list', tab, selectedCode, keyword, page],
    queryFn: () => policyApi.list(filter),
  })

  const policies = data?.data.policies ?? []
  const { data: bookmarkData } = useQuery({ queryKey: ['bookmarks'], queryFn: () => bookmarkApi.list() })
  const savedIds = new Set((bookmarkData?.data.policies ?? []).map((p: any) => p._id))

  const total = data?.data.total ?? 0
  const totalPages = Math.ceil(total / LIMIT)

  function selectTab(t: TabType) {
    setTab(t)
    setSelectedCode('')
    setSearchParams(t === 'all' ? {} : { type: t })
  }

  function selectCode(code: string) {
    const next = selectedCode === code ? '' : code
    setSelectedCode(next)
    setSearchParams(next ? { type: tab, code: next } : { type: tab })
  }

  function handleSearch() {
    setKeyword(inputValue.trim())
  }

  const isLoading = isFetching

  // 탭 라벨
  const tabLabel = (t: TabType) => {
    const cats = tab === 'field' ? SERVICE_FIELD_CATEGORIES : LIFECYCLE_CATEGORIES
    if (!selectedCode) return t === 'all' ? '전체 정책' : t === 'field' ? '분야별' : '대상별'
    return cats.find(c => c.code === selectedCode)?.label ?? '정책 목록'
  }

  // 페이지 번호 배열 (첫/마지막 항상 표시, 중간 ... 처리)
  function getPageItems(): (number | '...')[] {
    if (totalPages <= 7) return Array.from({ length: totalPages }, (_, i) => i + 1)
    const items: (number | '...')[] = [1]
    if (page > 3) items.push('...')
    for (let n = Math.max(2, page - 1); n <= Math.min(totalPages - 1, page + 1); n++) items.push(n)
    if (page < totalPages - 2) items.push('...')
    items.push(totalPages)
    return items
  }

  return (
    <Layout
      title={tabLabel(tab)}
      left={
        <button
          onClick={() => navigate('/dashboard')}
          className="w-9 h-9 rounded-2xl bg-white border border-ink-100 flex items-center justify-center hover:border-brand/30 transition-colors"
        >
          <ArrowLeft size={16} className="text-ink-700" />
        </button>
      }
    >
      <div className="px-4 py-4 space-y-4">

        {/* 검색바 */}
        <div className="relative flex gap-2">
          <div className="relative flex-1">
            <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-ink-300" />
            <input
              className="field pl-9 text-sm w-full"
              placeholder="정책 키워드 검색"
              value={inputValue}
              onChange={e => setInputValue(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleSearch()}
            />
            {inputValue && (
              <button
                onClick={() => { setInputValue(''); setKeyword('') }}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-ink-300 hover:text-ink-500"
              >
                <X size={14} />
              </button>
            )}
          </div>
          <button
            onClick={handleSearch}
            className="px-4 py-2.5 rounded-2xl bg-brand text-white text-sm font-bold hover:brightness-95 transition-all flex-shrink-0"
          >
            검색
          </button>
        </div>

        {/* 탭 */}
        <div className="flex gap-1.5">
          {(['all', 'field', 'lifecycle'] as TabType[]).map(t => (
            <button
              key={t}
              onClick={() => selectTab(t)}
              className={[
                'px-4 py-2 rounded-full text-xs font-bold transition-colors',
                tab === t
                  ? 'bg-brand text-white'
                  : 'bg-white border border-ink-100 text-ink-500 hover:border-brand/40 hover:text-brand',
              ].join(' ')}
            >
              {t === 'all' ? '전체' : t === 'field' ? '분야별' : '대상별'}
            </button>
          ))}
        </div>

        {/* 필터 chips */}
        {tab !== 'all' && (
          <div>
            <div className="relative">
              <div
                ref={filterScrollRef}
                onScroll={updateThumb}
                className="flex gap-2 overflow-x-auto scrollbar-hide pb-1"
              >
                {(tab === 'field' ? SERVICE_FIELD_CATEGORIES : LIFECYCLE_CATEGORIES).map(c => (
                  <button
                    key={c.code}
                    onClick={() => selectCode(c.code)}
                    className={[
                      'flex-shrink-0 flex items-center gap-1.5 px-3 py-2 rounded-full border text-xs font-bold transition-colors whitespace-nowrap',
                      selectedCode === c.code
                        ? 'bg-brand border-brand text-white'
                        : 'bg-white border-ink-100 text-ink-700 hover:border-brand/40 hover:text-brand',
                    ].join(' ')}
                  >
                    <c.Icon size={12} />
                    {c.label.split('(')[0].trim()}
                  </button>
                ))}
                <div className="w-2 flex-shrink-0" />
              </div>
              <div className="pointer-events-none absolute inset-y-0 right-0 w-8 bg-gradient-to-l from-surface to-transparent" />
            </div>
            <div className="mt-2.5 h-[3px] rounded-full bg-ink-100 relative overflow-hidden">
              <div className="absolute top-0 h-full rounded-full bg-brand" style={thumbStyle} />
            </div>
          </div>
        )}

        {/* 결과 수 */}
        {!isLoading && (
          <p className="text-xs font-semibold text-ink-400">
            총 <span className="text-ink-700 font-bold">{total.toLocaleString()}</span>건
          </p>
        )}

        {/* 목록 */}
        {isLoading ? (
          <div className="space-y-3">
            {[...Array(3)].map((_, i) => <div key={i} className="skel h-36" />)}
          </div>
        ) : policies.length === 0 ? (
          <div className="card p-10 text-center">
            <p className="text-md font-extrabold text-ink-900">해당하는 정책이 없어요</p>
            <p className="text-sm text-ink-400 mt-1.5">다른 조건으로 검색해보세요</p>
          </div>
        ) : (
          <div className="space-y-3">
            {policies.map((p: any) => (
              <PolicyCard key={p._id} policy={p} initialSaved={savedIds.has(p._id)} />
            ))}
          </div>
        )}

        {/* 페이지네이션 */}
        {totalPages > 1 && !isLoading && (
          <div className="flex items-center justify-center gap-1 pt-2 pb-4">
            <button
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={page === 1}
              className="w-8 h-8 flex items-center justify-center rounded-xl border border-ink-100 text-ink-400 hover:border-brand/40 hover:text-brand transition-colors disabled:opacity-30"
            >
              <ChevronLeft size={14} />
            </button>

            {getPageItems().map((n, i) =>
              n === '...' ? (
                <span key={`ellipsis-${i}`} className="w-8 h-8 flex items-center justify-center text-xs text-ink-300">...</span>
              ) : (
                <button
                  key={n}
                  onClick={() => setPage(n)}
                  className={[
                    'w-8 h-8 rounded-xl text-xs font-bold transition-colors',
                    n === page
                      ? 'bg-brand text-white'
                      : 'border border-ink-100 text-ink-500 hover:border-brand/40 hover:text-brand',
                  ].join(' ')}
                >
                  {n}
                </button>
              )
            )}

            <button
              onClick={() => setPage(p => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
              className="w-8 h-8 flex items-center justify-center rounded-xl border border-ink-100 text-ink-400 hover:border-brand/40 hover:text-brand transition-colors disabled:opacity-30"
            >
              <ChevronRight size={14} />
            </button>
          </div>
        )}

      </div>
    </Layout>
  )
}
