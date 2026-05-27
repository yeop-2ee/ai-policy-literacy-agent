import { UserRound, Landmark } from 'lucide-react'
import type { Message } from '../../types/simulator.types'
import { SCENARIOS } from '../../types/simulator.types'

function TypingDots() {
  return (
    <div className="flex items-center gap-1 px-1 py-0.5">
      {[0, 1, 2].map(i => (
        <span
          key={i}
          className="w-2 h-2 rounded-full bg-ink-300 animate-bounce"
          style={{ animationDelay: `${i * 0.15}s`, animationDuration: '0.8s' }}
        />
      ))}
    </div>
  )
}

export function TypingBubble({ scenario }: { scenario?: string }) {
  const ScenarioIcon = SCENARIOS.find(s => s.value === scenario)?.Icon ?? Landmark
  return (
    <div className="flex justify-start mb-3 fade-in">
      <div className="w-9 h-9 rounded-2xl bg-brand flex items-center justify-center mr-2 flex-shrink-0 self-end mb-0.5 rotate-3">
        <ScenarioIcon size={16} className="text-white" />
      </div>
      <div className="bg-white rounded-2xl rounded-tl-sm border border-ink-100 px-4 py-3">
        <TypingDots />
      </div>
    </div>
  )
}

export default function ChatBubble({ message, scenario }: { message: Message; scenario?: string }) {
  const isUser = message.role === 'user'
  const ScenarioIcon = SCENARIOS.find(s => s.value === scenario)?.Icon ?? Landmark

  return (
    <div className={`flex fade-in ${isUser ? 'justify-end' : 'justify-start'} mb-3`}>
      {!isUser && (
        <div className="w-9 h-9 rounded-2xl bg-brand flex items-center justify-center mr-2 flex-shrink-0 self-end mb-0.5 rotate-3">
          <ScenarioIcon size={16} className="text-white" />
        </div>
      )}
      <div
        className={[
          'max-w-[78%] px-4 py-3 text-sm leading-relaxed font-medium',
          isUser
            ? 'bg-brand text-white rounded-2xl rounded-tr-sm'
            : 'bg-white text-ink-900 rounded-2xl rounded-tl-sm border border-ink-100',
        ].join(' ')}
      >
        {message.content}
      </div>
      {isUser && (
        <div className="w-9 h-9 rounded-2xl bg-gradient-to-br from-ink-100 to-white border border-ink-100 flex items-center justify-center ml-2 flex-shrink-0 self-end mb-0.5">
          <UserRound size={16} className="text-ink-500" />
        </div>
      )}
    </div>
  )
}
