import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ArrowLeft, MapPin, Clock, ExternalLink, CheckCircle2, XCircle, HelpCircle, Loader2, BookOpen } from 'lucide-react'

const SOURCE_INFO: Record<string, { label: string; home: string }> = {
  onyouth:       { label: '온통청년',  home: 'https://www.youthcenter.go.kr' },
  mois:          { label: '정부24',    home: 'https://www.gov.kr' },
  bokjiro:       { label: '복지로',    home: 'https://www.bokjiro.go.kr' },
  bokjiro_local: { label: '복지로',    home: 'https://www.bokjiro.go.kr' },
}
import { useQuery } from '@tanstack/react-query'
import Layout from '../components/layout/Layout'
import { policyApi } from '../api/policy.api'
import type { EligibilityResult } from '../types/policy.types'

function EligibilityBadge({ eligible }: { eligible: EligibilityResult['eligible'] }) {
  if (eligible === 'yes') {
    return (
      <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-green-100 text-green-700 text-sm font-extrabold">
        <CheckCircle2 size={15} />
        자격 충족
      </span>
    )
  }
  if (eligible === 'partial') {
    return (
      <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-amber-100 text-amber-700 text-sm font-extrabold">
        <HelpCircle size={15} />
        부분 충족
      </span>
    )
  }
  if (eligible === 'no') {
    return (
      <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-red-100 text-red-600 text-sm font-extrabold">
        <XCircle size={15} />
        미충족
      </span>
    )
  }
  return null
}

function CheckStatusIcon({ status }: { status: 'pass' | 'fail' | 'unknown' }) {
  if (status === 'pass') return <CheckCircle2 size={16} className="text-green-600 flex-shrink-0" />
  if (status === 'fail') return <XCircle size={16} className="text-red-500 flex-shrink-0" />
  return <HelpCircle size={16} className="text-ink-400 flex-shrink-0" />
}

function calcDday(deadline?: string): { label: string; cls: string } | null {
  if (!deadline) return null
  const diff = Math.ceil(
    (new Date(deadline).setHours(0, 0, 0, 0) - new Date().setHours(0, 0, 0, 0)) / 86400000
  )
  if (diff < 0)   return { label: '마감',       cls: 'bg-red-100 text-red-400' }
  if (diff === 0) return { label: 'D-Day',      cls: 'bg-red-500 text-white shadow-sm shadow-red-200' }
  if (diff <= 7)  return { label: `D-${diff}`,  cls: 'bg-red-500 text-white shadow-sm shadow-red-200' }
  if (diff <= 30) return { label: `D-${diff}`,  cls: 'bg-red-200 text-red-700' }
  return { label: `D-${diff}`,                  cls: 'bg-red-50 text-red-400' }
}

function getServiceFieldChip(label?: string) {
  if (!label) return 'chip-amber'
  if (label.includes('고용') || label.includes('창업') || label.includes('일자리')) return 'chip-violet'
  if (label.includes('주거'))          return 'chip-slate'
  if (label.includes('복지') || label.includes('돌봄') || label.includes('서민')) return 'chip-amber'
  if (label.includes('교육'))          return 'chip-blue'
  if (label.includes('보건') || label.includes('의료') || label.includes('건강')) return 'chip-red'
  if (label.includes('문화') || label.includes('여가')) return 'chip-teal'
  return 'chip-amber'
}

export default function PolicyDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [detailExpanded, setDetailExpanded] = useState(false)

  const { data: policyRes, isLoading: policyLoading } = useQuery({
    queryKey: ['policy', id],
    queryFn: () => policyApi.getById(id!),
    enabled: !!id,
  })

  const { data: eligibilityRes, isLoading: eligibilityLoading } = useQuery({
    queryKey: ['policy-eligibility', id],
    queryFn: () => policyApi.eligibility(id!),
    enabled: !!id,
    staleTime: 0,
    gcTime: 0,
  })

  const policy = policyRes?.data
  const eligibility = eligibilityRes?.data
  const dday = calcDday(policy?.deadline)

  const DETAIL_LIMIT = 300

  return (
    <Layout
      title="정책 상세"
      left={
        <button
          onClick={() => navigate(-1)}
          className="w-9 h-9 rounded-2xl bg-white border border-ink-100 flex items-center justify-center hover:border-brand/30 transition-colors"
        >
          <ArrowLeft size={16} className="text-ink-700" />
        </button>
      }
    >
      <div className="px-4 py-4 space-y-4 pb-8">

        {/* 자격 분석 카드 */}
        <div className="card p-4">
          <p className="text-xs font-extrabold text-brand mb-3">✦ AI 자격 분석</p>

          {eligibilityLoading ? (
            <div className="flex flex-col items-center justify-center py-6 gap-3">
              <Loader2 size={28} className="text-brand animate-spin" />
              <p className="text-sm font-extrabold text-ink-900">자격요건 분석중...</p>
              <p className="text-xs text-ink-400">프로필 정보를 바탕으로 AI가 분석하고 있어요</p>
            </div>
          ) : eligibility ? (
            <>
              <div className="flex items-center gap-3 mb-2">
                <EligibilityBadge eligible={eligibility.eligible as EligibilityResult['eligible']} />
                <p className="text-sm text-ink-700 font-semibold">{eligibility.summary}</p>
              </div>

              {eligibility.checks && eligibility.checks.length > 0 && (
                <div className="mt-3 space-y-2">
                  {eligibility.checks.map((check, i) => (
                    <div
                      key={i}
                      className={[
                        'flex items-start gap-2.5 rounded-xl px-3 py-2.5',
                        check.status === 'pass'    ? 'bg-green-50'  :
                        check.status === 'fail'    ? 'bg-red-50'    :
                        'bg-surface',
                      ].join(' ')}
                    >
                      <CheckStatusIcon status={check.status} />
                      <div className="flex-1 min-w-0">
                        <span className={[
                          'text-xs font-extrabold mr-1.5',
                          check.status === 'pass'    ? 'text-green-700' :
                          check.status === 'fail'    ? 'text-red-600'   :
                          'text-ink-500',
                        ].join(' ')}>
                          {check.category}
                        </span>
                        <span className="text-xs text-ink-600">{check.reason}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </>
          ) : (
            <p className="text-sm text-ink-400">분석 결과를 가져올 수 없습니다.</p>
          )}
        </div>

        {/* 정책 정보 */}
        {policyLoading ? (
          <div className="card p-4 space-y-3">
            <div className="flex gap-2">
              <div className="skel h-5 w-16 rounded-full" />
              <div className="skel h-5 w-16 rounded-full" />
            </div>
            <div className="skel h-7 w-full" />
            <div className="skel h-4 w-full" />
            <div className="skel h-4 w-3/4" />
          </div>
        ) : policy ? (
          <div className="card p-4 space-y-4">

            {/* 태그 행 */}
            <div className="flex gap-1.5 flex-wrap">
              {policy.lifecycle_label     && <span className="chip chip-green">{policy.lifecycle_label}</span>}
              {policy.service_field_label && <span className={`chip ${getServiceFieldChip(policy.service_field_label)}`}>{policy.service_field_label}</span>}
              {dday && (
                <span className={`chip ${dday.cls} font-extrabold`}>{dday.label}</span>
              )}
            </div>

            {/* 제목 */}
            <h2 className="text-lg font-extrabold text-ink-900 leading-snug">{policy.title}</h2>

            {/* 쉬운 요약 */}
            {policy.easy_summary && (
              <div className="rounded-2xl bg-brand/5 border border-brand/20 px-3.5 py-3">
                <p className="text-2xs font-bold text-brand mb-1">✦ AI 한줄 요약</p>
                <p className="text-sm text-ink-700 leading-relaxed">{policy.easy_summary}</p>
              </div>
            )}

            {/* 상세 설명 */}
            {policy.summary && (
              <div>
                <p className="text-xs font-extrabold text-ink-500 mb-2">설명</p>
                <p className="text-sm text-ink-600 leading-relaxed">{policy.summary}</p>
              </div>
            )}

            {/* 지원 대상 원문 */}
            {policy.target && (
              <div>
                <p className="flex items-center gap-1 text-xs font-extrabold text-ink-500 mb-2">
                  <CheckCircle2 size={12} className="text-ink-400" />
                  지원 대상 원문
                </p>
                <div className="rounded-2xl bg-surface border border-ink-100 px-3.5 py-3">
                  <p className="text-sm text-ink-600 leading-relaxed whitespace-pre-line">{policy.target}</p>
                </div>
              </div>
            )}

            {/* 정책 상세 */}
            {policy.detail && (
              <div>
                <p className="text-xs font-extrabold text-ink-500 mb-2">상세 내용</p>
                <p className="text-sm text-ink-600 leading-relaxed whitespace-pre-line">
                  {detailExpanded || policy.detail.length <= DETAIL_LIMIT
                    ? policy.detail
                    : policy.detail.slice(0, DETAIL_LIMIT) + '…'}
                </p>
                {policy.detail.length > DETAIL_LIMIT && (
                  <button
                    onClick={() => setDetailExpanded(v => !v)}
                    className="mt-1.5 text-xs font-bold text-brand hover:text-brand/80 transition-colors"
                  >
                    {detailExpanded ? '접기' : '더보기'}
                  </button>
                )}
              </div>
            )}

            {/* 신청 기간 / 마감 */}
            {(policy.apply_period || policy.deadline) && (
              <div className="flex items-center gap-2">
                <Clock size={13} className="text-ink-400 flex-shrink-0" />
                <span className="text-sm text-ink-600">
                  {policy.deadline
                    ? `${new Date(policy.deadline).toLocaleDateString('ko-KR', { year: 'numeric', month: 'long', day: 'numeric' })} 마감`
                    : policy.apply_period}
                </span>
              </div>
            )}

            {/* 지역 */}
            {policy.region && (
              <div className="flex items-center gap-2">
                <MapPin size={13} className="text-ink-400 flex-shrink-0" />
                <span className="text-sm text-ink-600">{policy.region}</span>
              </div>
            )}

            {/* 출처 */}
            <div className="flex items-center justify-between pt-1 border-t border-ink-100">
              <div className="flex items-center gap-1.5 text-xs text-ink-400">
                <BookOpen size={12} />
                <span className="font-semibold">출처 · {SOURCE_INFO[policy.source]?.label ?? policy.source}</span>
              </div>
              <a
                href={SOURCE_INFO[policy.source]?.home ?? '#'}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs font-bold text-brand hover:text-brand/80 transition-colors flex items-center gap-1"
              >
                사이트 바로가기 <ExternalLink size={10} />
              </a>
            </div>

            {/* 신청 버튼 */}
            {policy.apply_url && (
              <a
                href={policy.apply_url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-center gap-2 w-full px-4 py-3.5 rounded-2xl bg-brand text-white text-sm font-extrabold hover:brightness-95 transition-all"
              >
                신청하러 가기
                <ExternalLink size={14} />
              </a>
            )}
          </div>
        ) : (
          <div className="card p-10 text-center">
            <p className="text-md font-extrabold text-ink-900">정책을 찾을 수 없습니다.</p>
          </div>
        )}

      </div>
    </Layout>
  )
}
