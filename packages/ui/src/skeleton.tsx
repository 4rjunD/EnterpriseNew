import { cn } from './utils'

function Skeleton({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn('animate-pulse rounded-input bg-background-secondary', className)}
      {...props}
    />
  )
}

export { Skeleton }
