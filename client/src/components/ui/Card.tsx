import { cn } from './cn'

export function Card({
  className,
  children,
}: {
  className?: string
  children: React.ReactNode
}) {
  return <div className={cn('card', className)}>{children}</div>
}

export function CardPress({
  className,
  children,
}: {
  className?: string
  children: React.ReactNode
}) {
  return <div className={cn('card-press', className)}>{children}</div>
}

