import { cn } from './cn'

export function Badge({
  variant = 'brand',
  className,
  children,
}: {
  variant?: 'brand' | 'green' | 'amber' | 'red' | 'slate' | 'violet'
  className?: string
  children: React.ReactNode
}) {
  const cls =
    variant === 'brand' ? 'chip chip-brand'
    : variant === 'green' ? 'chip chip-green'
    : variant === 'amber' ? 'chip chip-amber'
    : variant === 'red' ? 'chip chip-red'
    : variant === 'slate' ? 'chip chip-slate'
    : 'chip chip-brand'

  return <span className={cn(cls, className)}>{children}</span>
}

