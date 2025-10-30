import { HoverCard as HoverCardPrimitive } from "@kobalte/core/hover-card"
import { type ComponentProps, splitProps } from "solid-js"

import { cn } from "../../lib/utils"

function HoverCard(props: ComponentProps<typeof HoverCardPrimitive>) {
  return <HoverCardPrimitive data-slot="hover-card" {...props} />
}

function HoverCardTrigger(props: ComponentProps<typeof HoverCardPrimitive.Trigger>) {
  return (
    <HoverCardPrimitive.Trigger data-slot="hover-card-trigger" {...props} />
  )
}

function HoverCardContent(props: ComponentProps<typeof HoverCardPrimitive.Content>) {
  const [local, others] = splitProps(props, ["class"])
  
  return (
    <HoverCardPrimitive.Portal>
      <HoverCardPrimitive.Content
        data-slot="hover-card-content"
        class={cn(
          "bg-popover text-popover-foreground data-[expanded]:animate-in data-[closed]:animate-out data-[closed]:fade-out-0 data-[expanded]:fade-in-0 data-[closed]:zoom-out-95 data-[expanded]:zoom-in-95 z-50 w-64 origin-[var(--kb-hover-card-content-transform-origin)] rounded-md border p-4 shadow-md outline-hidden",
          local.class
        )}
        {...others}
      />
    </HoverCardPrimitive.Portal>
  )
}

export { HoverCard, HoverCardTrigger, HoverCardContent }