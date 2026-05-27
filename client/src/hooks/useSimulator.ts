import { useRef, useState } from 'react'
import { WS_BASE_URL } from '../api/client'
import type { Message, Scenario } from '../types/simulator.types'

type ConnStatus = 'connecting' | 'connected' | 'failed'

export function useSimulator() {
  const [messages, setMessages] = useState<Message[]>([])
  const [scenario, setScenario] = useState<Scenario | null>(null)
  const [connStatus, setConnStatus] = useState<ConnStatus>('connecting')
  const [isTyping, setIsTyping] = useState(false)
  const wsRef = useRef<WebSocket | null>(null)

  const connect = (sc: Scenario) => {
    wsRef.current?.close()
    setConnStatus('connecting')

    const sessionId = crypto.randomUUID()
    const ws = new WebSocket(`${WS_BASE_URL}/ws/simulator/${sessionId}`)
    wsRef.current = ws

    ws.onopen = () => {
      setTimeout(() => setConnStatus('connected'), 800)
      ws.send(JSON.stringify({ type: 'select_scenario', scenario: sc }))
    }
    ws.onclose = () => setConnStatus(prev => prev === 'connecting' ? 'failed' : prev)
    ws.onerror = () => setConnStatus('failed')

    ws.onmessage = (e) => {
      const data = JSON.parse(e.data)
      if (data.type === 'message' || data.type === 'scenario_started') {
        setIsTyping(false)
        setMessages(prev => [
          ...prev,
          { role: 'assistant', content: data.message || data.content, timestamp: new Date() },
        ])
      }
    }
  }

  const selectScenario = (sc: Scenario) => {
    if (sc !== scenario) {
      setMessages([])
      connect(sc)
    }
    setScenario(sc)
  }

  const goBack = () => {
    wsRef.current?.close()
    wsRef.current = null
    setConnStatus('connecting')
    setScenario(null)
  }

  const sendMessage = (content: string) => {
    if (!wsRef.current || connStatus !== 'connected') return
    setMessages(prev => [...prev, { role: 'user', content, timestamp: new Date() }])
    setIsTyping(true)
    wsRef.current.send(JSON.stringify({ type: 'message', message: content }))
  }

  return { messages, scenario, connStatus, isTyping, selectScenario, sendMessage, goBack }
}
