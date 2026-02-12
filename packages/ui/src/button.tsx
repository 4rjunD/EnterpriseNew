import * as React from 'react'
import { Slot } from '@radix-ui/react-slot'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from './utils'
import { Loader2 } from 'lucide-react'

const buttonVariants = cva(
  'inline-flex items-center justify-center whitespace-nowrap text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-foreground focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50',
  {
    variants: {
      variant: {
        default: 'bg-foreground text-white hover:bg-foreground/90',
        destructive: 'bg-status-critical text-white hover:bg-status-critical/90',
        outline: 'border border-foreground bg-transparent text-foreground hover:bg-foreground hover:text-white',
        secondary: 'bg-background-secondary text-foreground border border-border hover:bg-background-tertiary',
        ghost: 'text-foreground hover:bg-background-secondary',
        link: 'text-foreground underline-offset-4 hover:underline',
      },
      size: {
        default: 'h-10 px-4 py-2 rounded-button',
        sm: 'h-8 px-3 text-xs rounded-button',
        lg: 'h-12 px-8 text-base rounded-button',
        icon: 'h-10 w-10 rounded-button',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  }
)

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean
  loading?: boolean
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, loading, children, disabled, ...props }, ref) => {
    if (asChild) {
      return (
        <Slot
          className={cn(buttonVariants({ variant, size, className }))}
          ref={ref}
          {...props}
        >
          {children}
        </Slot>
      )
    }

    return (
      <button
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        disabled={disabled || loading}
        {...props}
      >
        {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
        {children}
      </button>
    )
  }
)
Button.displayName = 'Button'

export { Button, buttonVariants }
