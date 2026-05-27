const BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000'

/**
 * SSE 스트리밍으로 AI 요약을 받아 onChunk 콜백으로 전달
 */
export async function streamSummary(
  policyId: string,
  onChunk: (text: string) => void,
  onDone: () => void
) {
  const token = localStorage.getItem('access_token')
  const res = await fetch(`${BASE}/api/v1/agent/summarize/${policyId}`, {
    headers: { Authorization: `Bearer ${token}` },
  })
  const reader = res.body!.getReader()
  const decoder = new TextDecoder()

  while (true) {
    const { done, value } = await reader.read()
    if (done) break
    const text = decoder.decode(value)
    const lines = text.split('\n').filter((l) => l.startsWith('data: '))
    for (const line of lines) {
      const data = line.replace('data: ', '')
      if (data === '[DONE]') { onDone(); return }
      onChunk(data)
    }
  }
}

export async function streamSimplify(
  policyId: string,
  onChunk: (text: string) => void,
  onDone: () => void
) {
  const token = localStorage.getItem('access_token')
  const res = await fetch(`${BASE}/api/v1/agent/simplify/${policyId}`, {
    headers: { Authorization: `Bearer ${token}` },
  })
  const reader = res.body!.getReader()
  const decoder = new TextDecoder()

  while (true) {
    const { done, value } = await reader.read()
    if (done) break
    const text = decoder.decode(value)
    const lines = text.split('\n').filter((l) => l.startsWith('data: '))
    for (const line of lines) {
      const data = line.replace('data: ', '')
      if (data === '[DONE]') { onDone(); return }
      onChunk(data)
    }
  }
}
