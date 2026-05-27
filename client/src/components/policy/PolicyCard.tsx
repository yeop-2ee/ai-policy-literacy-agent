import { Link } from 'react-router-dom'
import { MapPin, Clock, Bookmark, ArrowRight, ExternalLink, CheckCircle2 } from 'lucide-react'

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
import { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import type { Policy } from '../../types/policy.types'
import { bookmarkApi } from '../../api/policy.api'


const SOURCE_INFO: Record<string, { label: string; home: string }> = {
  onyouth:      { label: '온통청년',  home: 'https://www.youthcenter.go.kr' },
  mois:         { label: '정부24',    home: 'https://www.gov.kr' },
  bokjiro:      { label: '복지로',    home: 'https://www.bokjiro.go.kr' },
  bokjiro_local:{ label: '복지로',    home: 'https://www.bokjiro.go.kr' },
}

function calcDday(deadline?: string): { label: string; cls: string } | null {
  if (!deadline) return null
  const diff = Math.ceil(
    (new Date(deadline).setHours(0, 0, 0, 0) - new Date().setHours(0, 0, 0, 0)) / 86400000
  )
  if (diff < 0)  return { label: '마감',       cls: 'bg-red-100 text-red-400' }
  if (diff === 0) return { label: 'D-Day',     cls: 'bg-red-500 text-white shadow-sm shadow-red-200' }
  if (diff <= 7)  return { label: `D-${diff}`, cls: 'bg-red-500 text-white shadow-sm shadow-red-200' }
  if (diff <= 30) return { label: `D-${diff}`, cls: 'bg-red-200 text-red-700' }
  return { label: `D-${diff}`,                 cls: 'bg-red-50 text-red-400' }
}

interface Props {
  policy: Policy
  initialSaved?: boolean
  eligibilityStatus?: 'yes' | 'partial' | 'no'
}

export default function PolicyCard({ policy, initialSaved = false, eligibilityStatus }: Props) {
  const [saved, setSaved] = useState(initialSaved)
  const queryClient = useQueryClient()
  const chip = getServiceFieldChip(policy.service_field_label)
  const dday = calcDday(policy.deadline)
  const sourceInfo = SOURCE_INFO[policy.source] ?? { label: policy.source, home: '#' }
  const linkUrl = policy.apply_url || sourceInfo.home

  const { mutate: toggleBookmark, isPending } = useMutation({
    mutationFn: () => bookmarkApi.toggle(policy._id),
    onSuccess: (res) => {
      setSaved(res.data.saved)
      queryClient.invalidateQueries({ queryKey: ['bookmarks'] })
    },
  })

  return (
    <div className="card-press overflow-hidden">
      <div className="p-4">
        {/* 태그 행 */}
        <div className="flex items-start justify-between mb-2.5">
          <div className="flex gap-1.5 flex-wrap">
            {policy.lifecycle_label     && <span className="chip chip-green">{policy.lifecycle_label}</span>}
            {policy.service_field_label && <span className={`chip ${chip}`}>{policy.service_field_label}</span>}
            {dday && (
              <span className={`chip ${dday.cls} font-extrabold`}>{dday.label}</span>
            )}
            {eligibilityStatus === 'yes' && (
              <span className="chip bg-green-100 text-green-700">✓ 자격 충족</span>
            )}
            {eligibilityStatus === 'partial' && (
              <span className="chip bg-amber-100 text-amber-700">△ 부분 충족</span>
            )}
            {eligibilityStatus === 'no' && (
              <span className="chip bg-red-100 text-red-600">✗ 미충족</span>
            )}
          </div>
          <button
            onClick={e => { e.preventDefault(); if (!isPending) toggleBookmark() }}
            className="p-1 -mr-1 -mt-1 transition-transform active:scale-90 text-ink-300 hover:text-amber-500 disabled:opacity-50"
            disabled={isPending}
          >
            <Bookmark
              size={16}
              strokeWidth={2}
              className={saved ? 'text-amber-500 fill-amber-500' : 'fill-none'}
            />
          </button>
        </div>

        {/* 제목 */}
        <h3 className="text-md font-extrabold text-ink-900 line-clamp-2 mb-2">{policy.title}</h3>

        {/* 쉬운 요약 or 일반 요약 */}
        {policy.easy_summary ? (
          <div className="rounded-2xl bg-brand/5 border border-brand/20 px-3.5 py-3 mb-3">
            <p className="text-2xs font-bold text-brand mb-1">✦ AI 한줄 요약</p>
            <p className="text-xs text-ink-700 line-clamp-2 leading-relaxed">{policy.easy_summary}</p>
          </div>
        ) : policy.summary ? (
          <p className="text-sm text-ink-500 line-clamp-2 mb-3 leading-relaxed">{policy.summary}</p>
        ) : null}

        {/* 자격요건 */}
        {policy.target && (
          <div className="rounded-2xl bg-surface border border-ink-100 px-3.5 py-3 mb-3">
            <p className="flex items-center gap-1 text-2xs font-bold text-ink-500 mb-1.5">
              <CheckCircle2 size={11} className="text-ink-400" />
              지원 자격
            </p>
            <p className="text-xs text-ink-600 line-clamp-2 leading-relaxed">{policy.target}</p>
          </div>
        )}

        {/* 메타 정보 */}
        <div className="flex items-center gap-3 mb-4">
          {policy.region && (
            <span className="flex items-center gap-1 text-2xs font-semibold text-ink-300">
              <MapPin size={10} />{policy.region}
            </span>
          )}
          {policy.deadline ? (
            <span className={`flex items-center gap-1 text-2xs font-semibold ${
              dday && !dday.label.includes('D-') && dday.label !== '마감'
                ? 'text-ink-300'
                : dday?.cls.includes('red') ? 'text-red-500'
                : dday?.cls.includes('amber') ? 'text-amber-500'
                : 'text-ink-300'
            }`}>
              <Clock size={10} />
              {new Date(policy.deadline).toLocaleDateString('ko-KR', { month: 'long', day: 'numeric' })} 마감
            </span>
          ) : policy.apply_period ? (
            <span className="flex items-center gap-1 text-2xs font-semibold text-ink-300">
              <Clock size={10} />{policy.apply_period}
            </span>
          ) : null}
        </div>

        {/* 출처 + 원문 바로가기 */}
        <div className="flex items-center justify-between mb-3">
          <span className="text-2xs font-semibold text-ink-300">
            출처 · {sourceInfo.label}
          </span>
          <a
            href={linkUrl}
            target="_blank"
            rel="noopener noreferrer"
            onClick={e => e.stopPropagation()}
            className="flex items-center gap-1 text-2xs font-bold text-brand hover:text-brand-dark transition-colors"
          >
            원문 보기 <ExternalLink size={10} />
          </a>
        </div>

        {/* CTA */}
        <Link to={`/policies/${policy._id}`}
          className="flex items-center justify-between w-full px-4 py-3 rounded-2xl bg-white border-2 border-ink-100 text-ink-900 text-sm font-bold group transition-all hover:border-brand/40 hover:text-brand">
          자세히 보기
          <ArrowRight size={14} className="group-hover:translate-x-0.5 transition-transform" />
        </Link>
      </div>
    </div>
  )
}
