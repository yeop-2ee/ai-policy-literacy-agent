import { Link, useLocation } from 'react-router-dom'
import { Home, MessageCircle, Bookmark, User } from 'lucide-react'

const NAV = [
  { path: '/dashboard', icon: Home,          label: '홈' },
  { path: '/simulator', icon: MessageCircle, label: '연습' },
  { path: '/bookmarks', icon: Bookmark,      label: '저장' },
  { path: '/profile',   icon: User,          label: '내정보' },
]

interface Props {
  children: React.ReactNode
  title?: string
  right?: React.ReactNode
  left?: React.ReactNode
}

export default function Layout({ children, title, right, left }: Props) {
  const { pathname } = useLocation()

  return (
    <div className="app-shell">
      <header className="sticky top-0 z-30 bg-white border-b border-ink-100/80">
        <div className="flex items-center justify-between px-5 h-14">
          <div className="flex items-center gap-2">
            {left}
            {title ? (
              <h1 className="text-lg font-extrabold text-ink-900">{title}</h1>
            ) : (
              <span className="text-md font-extrabold text-ink-900 tracking-tight">정책 도우미</span>
            )}
          </div>
          {right && <div>{right}</div>}
        </div>
      </header>

      <main className="flex-1 overflow-y-auto scrollbar-hide">
        {children}
      </main>

      <nav className="sticky bottom-0 z-30 bg-white border-t border-ink-100/80 pb-[env(safe-area-inset-bottom)]">
        <div className="flex h-16">
          {NAV.map(({ path, icon: Icon, label }) => {
            const active = pathname === path
            return (
              <Link key={path} to={path}
                className={[
                  'flex-1 flex flex-col items-center justify-center gap-1 transition-colors',
                  active ? 'text-brand' : 'text-ink-300 hover:text-ink-500',
                ].join(' ')}>
                <span
                  className={[
                    'w-9 h-9 rounded-2xl flex items-center justify-center transition-all',
                    active ? 'bg-brand/10 border border-brand/20' : 'bg-transparent',
                  ].join(' ')}
                >
                  <Icon size={18} strokeWidth={active ? 2.4 : 1.8} />
                </span>
                <span className="text-2xs font-bold">{label}</span>
              </Link>
            )
          })}
        </div>
      </nav>
    </div>
  )
}
