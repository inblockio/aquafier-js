import { JSX, splitProps, ComponentProps } from 'solid-js'
import { Dynamic } from 'solid-js/web'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '../../lib/utils'

// --- Variants ---
export const badgeVariants = cva(
  'inline-flex items-center justify-center rounded-md border px-2 py-0.5 text-xs font-medium w-fit whitespace-nowrap shrink-0 [&>svg]:size-3 gap-1 [&>svg]:pointer-events-none focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px] aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive transition-[color,box-shadow] overflow-hidden',
  {
    variants: {
      variant: {
        default: 'border-transparent bg-primary text-primary-foreground hover:bg-primary/90',
        secondary: 'border-transparent bg-secondary text-secondary-foreground hover:bg-secondary/90',
        destructive:
          'border-transparent bg-destructive text-white hover:bg-destructive/90 focus-visible:ring-destructive/20 dark:focus-visible:ring-destructive/40 dark:bg-destructive/60',
        outline: 'text-foreground hover:bg-accent hover:text-accent-foreground',
      },
    },
    defaultVariants: {
      variant: 'default',
    },
  }
)

interface BadgeProps
  extends ComponentProps<'span'>,
    VariantProps<typeof badgeVariants> {
  as?: keyof JSX.IntrinsicElements // allows dynamic tag like <a> or <div>
}

/**
 * SolidJS Badge Component
 */
export function Badge(props: BadgeProps) {
  const [local, others] = splitProps(props, ['class', 'variant', 'as'])
  const Comp = local.as || 'span'

  return (
    <Dynamic
      component={Comp}
      data-slot="badge"
      class={cn(badgeVariants({ variant: local.variant }), local.class)}
      {...others}
    />
  )
}
