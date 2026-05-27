import { useRef, useEffect, useState } from 'react'
import { Send, ArrowLeft, Info, UserRound, Star } from 'lucide-react'
import { useSimulator } from '../hooks/useSimulator'
import ChatBubble, { TypingBubble } from '../components/simulator/ChatBubble'
import type { Scenario } from '../types/simulator.types'
import { SCENARIOS } from '../types/simulator.types'
import Layout from '../components/layout/Layout'

const QUICK: Record<string, string[]> = {
  '주민센터': ['전입신고 하러 왔어요', '주민등록등본 발급 원해요', '처음 방문이에요'],
  '고용센터': ['실업급여 신청하고 싶어요', '취업 상담 받고 싶어요', '구직확인서 필요해요'],
  '은행':     ['통장 만들고 싶어요', '대출 상담 원해요', '공과금 납부 방법 궁금해요'],
}

export default function SimulatorPage() {
  const { messages, scenario, connStatus, isTyping, selectScenario, sendMessage, goBack } = useSimulator()
  const [input, setInput] = useState('')
  const bottomRef = useRef<HTMLDivElement>(null)
  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [messages])

  /* ── 시나리오 선택 ── */
  if (!scenario) {
    return (
      <Layout title="사회생활 연습">
        <div className="px-4 py-4 space-y-4">
          {/* 안내 */}
          <div className="card p-4 flex gap-3 items-start">
            <div className="w-9 h-9 rounded-2xl bg-brand flex items-center justify-center flex-shrink-0 rotate-3">
              <Info size={16} className="text-white" />
            </div>
            <div>
              <p className="text-sm font-bold text-ink-900">AI와 실전 연습</p>
              <p className="text-xs text-ink-500 mt-0.5 leading-relaxed">
                실제 방문 전 AI 담당자와 대화를 미리 연습해보세요.
              </p>
            </div>
          </div>

          {/* 시나리오 목록 */}
          <div className="space-y-2.5">
            {SCENARIOS.map(s => (
              <button key={s.value} onClick={() => selectScenario(s.value as Scenario)}
                className="card-press w-full flex items-center gap-4 p-4 text-left">
                <div className="w-12 h-12 rounded-2xl bg-white border border-ink-100 flex items-center justify-center flex-shrink-0">
                  <s.Icon size={22} className="text-brand" />
                </div>
                <div className="flex-1">
                  <p className="font-extrabold text-ink-900">{s.label}</p>
                  <p className="text-xs text-ink-500 mt-0.5">{s.description}</p>
                </div>
                <ArrowLeft size={15} className="text-ink-300 rotate-180 flex-shrink-0" />
              </button>
            ))}
          </div>

          {/* 통계 */}
          <div className="grid grid-cols-2 gap-2.5">
            {[
              { label: '누적 연습', value: '1,240회', Icon: UserRound },
              { label: '만족도',   value: '4.8 / 5', Icon: Star },
            ].map(({ label, value, Icon }) => (
              <div key={label} className="card p-4 text-center">
                <Icon size={20} className="text-brand mx-auto mb-1" />
                <p className="text-lg font-extrabold text-ink-900">{value}</p>
                <p className="text-2xs font-semibold text-ink-500 mt-0.5">{label}</p>
              </div>
            ))}
          </div>
        </div>
      </Layout>
    )
  }

  /* ── 채팅 화면 ── */
  const cur = SCENARIOS.find(s => s.value === scenario)

  return (
    <div className="app-shell flex flex-col">

      {/* 헤더 */}
      <div className="sticky top-0 z-10 bg-white border-b border-ink-100/80">
        <div className="flex items-center gap-3 px-4 h-14">
          <button onClick={goBack}
            className="w-9 h-9 rounded-2xl bg-white border border-ink-100 flex items-center justify-center hover:border-brand/30 transition-colors">
            <ArrowLeft size={16} className="text-ink-700" />
          </button>
          <div className="w-10 h-10 rounded-2xl bg-brand flex items-center justify-center rotate-3">
            {cur && <cur.Icon size={18} className="text-white" />}
          </div>
          <div>
            <p className="text-sm font-extrabold text-ink-900">{scenario} 담당자</p>
            <div className="flex items-center gap-1.5">
              <span className={[
                'w-1.5 h-1.5 rounded-full transition-colors',
                connStatus === 'connected' ? 'bg-emerald-500 animate-pulse' :
                connStatus === 'failed'    ? 'bg-red-500' :
                'bg-ink-300 animate-pulse'
              ].join(' ')} />
              <span className={[
                'text-2xs font-semibold',
                connStatus === 'connected' ? 'text-ink-500' :
                connStatus === 'failed'    ? 'text-red-500' :
                'text-ink-500'
              ].join(' ')}>
                {connStatus === 'connected' ? '연결됨' :
                 connStatus === 'failed'    ? '연결 안됨' :
                 '연결 중...'}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* 메시지 */}
      <div className="flex-1 overflow-y-auto px-4 py-4 scrollbar-hide">
        <div className="text-center py-8">
          <div className="w-16 h-16 rounded-2xl bg-brand-light flex items-center justify-center mx-auto mb-4">
            {cur && <cur.Icon size={30} className="text-brand" />}
          </div>
          <p className="font-extrabold text-ink-900">{scenario} 연습 시작</p>
          <p className="text-xs text-ink-500 mt-1">아래 예시 질문을 눌러보세요</p>
        </div>
        {messages.map((msg, i) => <ChatBubble key={i} message={msg} scenario={scenario ?? undefined} />)}
        {isTyping && <TypingBubble scenario={scenario ?? undefined} />}
        <div ref={bottomRef} />
      </div>

      {/* 입력 영역 */}
      <div className="sticky bottom-0 bg-white border-t border-ink-100/80 pb-[env(safe-area-inset-bottom)]">
        <div className="px-4 pt-3 pb-1 flex gap-2 overflow-x-auto scrollbar-hide">
          {(QUICK[scenario] ?? []).map(q => (
            <button key={q} onClick={() => sendMessage(q)}
              className="flex-shrink-0 px-3 py-2 rounded-full text-xs font-bold border border-ink-100 bg-white text-ink-700 hover:border-brand/40 hover:text-brand transition-colors whitespace-nowrap">
              {q}
            </button>
          ))}
        </div>
        <div className="px-4 py-3 flex gap-2 items-end">
          <textarea
            className="field flex-1 resize-none max-h-24 text-sm leading-relaxed"
            rows={1} placeholder="메시지를 입력하세요..."
            value={input} onChange={e => setInput(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); if (input.trim()) { sendMessage(input.trim()); setInput('') } } }} />
          <button
            onClick={() => { if (input.trim()) { sendMessage(input.trim()); setInput('') } }}
            disabled={!input.trim() || connStatus !== 'connected'}
            className="w-11 h-11 rounded-2xl bg-brand text-white flex items-center justify-center flex-shrink-0 transition-all disabled:opacity-40 hover:brightness-95">
            <Send size={15} />
          </button>
        </div>
      </div>
    </div>
  )
}
