import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { authApi } from '../api/auth.api'

export default function LoginPage() {
  const navigate = useNavigate()
  const [mode, setMode] = useState<'login' | 'register'>('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [name, setName] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handle = async () => {
    if (!email || !password || (mode === 'register' && !name)) {
      setError('필수 항목을 입력해주세요.'); return
    }
    setLoading(true); setError('')
    try {
      if (mode === 'login') {
        const res = await authApi.login(email, password)
        localStorage.setItem('access_token', res.data.access_token)
        navigate('/dashboard')
      } else {
        const res = await authApi.register(email, password, name)
        localStorage.setItem('access_token', res.data.access_token)
        navigate('/dashboard')
      }
    } catch {
      setError(mode === 'login' ? '이메일 또는 비밀번호를 확인해주세요.' : '이미 사용 중인 이메일입니다.')
    } finally { setLoading(false) }
  }

  const switchMode = () => {
    setMode(m => m === 'login' ? 'register' : 'login')
    setError('')
  }

  return (
    <div className="app-shell flex flex-col">
      <div className="flex-1 flex flex-col justify-center px-6 pt-12 pb-8 overflow-y-auto">

        {/* 로고 */}
        <div className="mb-8">
          <div className="flex items-end gap-2 mb-5">
            {[
              { delay: '0s' },
              { delay: '0.12s' },
              { delay: '0.24s' },
              { delay: '0.36s' },
              { delay: '0.48s' },
            ].map((b, i) => (
              <div
                key={i}
                className="w-5 h-5 rounded-lg bg-brand animate-wave"
                style={{ animationDelay: b.delay }}
              />
            ))}
          </div>
          <h1 className="text-3xl font-extrabold text-ink-900 leading-tight tracking-tight">
            나에게 맞는<br />정책을 찾아드려요
          </h1>
          <p className="text-sm text-ink-500 mt-2">복잡한 정부 지원, 쉽게 찾고 쉽게 이해해요</p>
        </div>

        {/* 폼 */}
        <div className="card p-4 space-y-3">

          {/* ── 기본 정보 ── */}
          {mode === 'register' && (
            <div>
              <label className="block text-xs font-bold text-ink-500 mb-1.5">이름 <span className="text-red-400">*</span></label>
              <input className="field" placeholder="홍길동" value={name} onChange={e => setName(e.target.value)} />
            </div>
          )}
          <div>
            <label className="block text-xs font-bold text-ink-500 mb-1.5">이메일 <span className="text-red-400">*</span></label>
            <input type="email" className="field" placeholder="example@email.com"
              value={email} onChange={e => setEmail(e.target.value)} />
          </div>
          <div>
            <label className="block text-xs font-bold text-ink-500 mb-1.5">비밀번호 <span className="text-red-400">*</span></label>
            <input type="password" className="field" placeholder="8자 이상"
              value={password} onChange={e => setPassword(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && !mode.includes('register') && handle()} />
          </div>

          {error && (
            <div className="text-xs font-semibold text-red-600 bg-red-50 border border-red-100 px-4 py-3 rounded-xl">
              {error}
            </div>
          )}
          <button className="btn-solid mt-1" onClick={handle} disabled={loading}>
            {loading ? '처리 중...' : mode === 'login' ? '로그인' : '시작하기'}
          </button>
        </div>

        <p className="text-center text-xs text-ink-500 mt-4">
          {mode === 'login' ? '아직 계정이 없으신가요?' : '이미 계정이 있으신가요?'}{' '}
          <button className="font-bold text-brand" onClick={switchMode}>
            {mode === 'login' ? '회원가입' : '로그인'}
          </button>
        </p>
      </div>
    </div>
  )
}
