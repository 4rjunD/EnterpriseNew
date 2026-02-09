import * as React from 'react'
import * as AvatarPrimitive from '@radix-ui/react-avatar'
import { cn } from './utils'

const Avatar = React.forwardRef<
  React.ElementRef<typeof AvatarPrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof AvatarPrimitive.Root>
>(({ className, ...props }, ref) => (
  <AvatarPrimitive.Root
    ref={ref}
    className={cn('relative flex h-10 w-10 shrink-0 overflow-hidden rounded-full', className)}
    {...props}
  />
))
Avatar.displayName = AvatarPrimitive.Root.displayName

const AvatarImage = React.forwardRef<
  React.ElementRef<typeof AvatarPrimitive.Image>,
  React.ComponentPropsWithoutRef<typeof AvatarPrimitive.Image>
>(({ className, ...props }, ref) => (
  <AvatarPrimitive.Image
    ref={ref}
    className={cn('aspect-square h-full w-full', className)}
    {...props}
  />
))
AvatarImage.displayName = AvatarPrimitive.Image.displayName

const AvatarFallback = React.forwardRef<
  React.ElementRef<typeof AvatarPrimitive.Fallback>,
  React.ComponentPropsWithoutRef<typeof AvatarPrimitive.Fallback>
>(({ className, ...props }, ref) => (
  <AvatarPrimitive.Fallback
    ref={ref}
    className={cn(
      'flex h-full w-full items-center justify-center rounded-full bg-background-secondary text-foreground-secondary text-sm font-medium',
      className
    )}
    {...props}
  />
))
AvatarFallback.displayName = AvatarPrimitive.Fallback.displayName

// Avatar with status indicator
interface AvatarWithStatusProps extends React.ComponentPropsWithoutRef<typeof Avatar> {
  status?: 'online' | 'busy' | 'away' | 'offline'
  src?: string
  fallback?: string
}

const AvatarWithStatus = React.forwardRef<HTMLSpanElement, AvatarWithStatusProps>(
  ({ status, src, fallback, className, ...props }, ref) => {
    const statusColors = {
      online: 'bg-status-healthy',
      busy: 'bg-status-critical',
      away: 'bg-status-warning',
      offline: 'bg-foreground-muted',
    }

    return (
      <div className="relative inline-block">
        <Avatar ref={ref} className={className} {...props}>
          {src && <AvatarImage src={src} alt={fallback} />}
          <AvatarFallback>{fallback}</AvatarFallback>
        </Avatar>
        {status && (
          <span
            className={cn(
              'absolute bottom-0 right-0 h-3 w-3 rounded-full border-2 border-background',
              statusColors[status]
            )}
          />
        )}
      </div>
    )
  }
)
AvatarWithStatus.displayName = 'AvatarWithStatus'

export { Avatar, AvatarImage, AvatarFallback, AvatarWithStatus }
