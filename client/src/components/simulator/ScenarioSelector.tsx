import { ChevronRight } from 'lucide-react'
import { SCENARIOS, type Scenario } from '../../types/simulator.types'

interface Props {
  onSelect: (scenario: Scenario) => void
}

export default function ScenarioSelector({ onSelect }: Props) {
  return (
    <div className="p-6">
      <h2 className="text-xl font-bold text-gray-900 mb-2">어떤 상황을 연습할까요?</h2>
      <p className="text-gray-500 text-sm mb-6">실제 상황처럼 대화하며 미리 연습해보세요.</p>
      <div className="grid grid-cols-1 gap-4">
        {SCENARIOS.map((s) => (
          <button
            key={s.value}
            onClick={() => onSelect(s.value)}
            className="flex items-center gap-4 p-4 border-2 border-ink-100 rounded-2xl transition-all duration-150 text-left group hover:border-brand hover:bg-brand/[0.06] hover:shadow-brand active:scale-[0.98]"
          >
            <span className="w-14 h-14 flex items-center justify-center rounded-xl bg-surface transition-all duration-150 group-hover:bg-brand/10 flex-shrink-0">
              <s.Icon size={24} className="text-ink-500 group-hover:text-brand transition-colors" />
            </span>
            <div className="flex-1">
              <div className="font-bold text-ink-900 transition-colors duration-150 group-hover:text-brand">{s.label}</div>
              <div className="text-sm text-ink-500 mt-0.5">{s.description}</div>
            </div>
            <ChevronRight size={16} className="text-ink-300 flex-shrink-0 transition-all duration-150 group-hover:translate-x-0.5 group-hover:text-brand" />
          </button>
        ))}
      </div>
    </div>
  )
}
