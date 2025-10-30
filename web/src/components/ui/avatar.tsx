import { JSX, splitProps } from "solid-js"
import { Avatar as AvatarRoot, AvatarImage, AvatarFallback } from "kobalte"
import { cn } from "../../lib/utils"

export function Avatar(props: JSX.HTMLAttributes<HTMLSpanElement>) {
  const [local, others] = splitProps(props, ["class"])
  return (
    <AvatarRoot
      data-slot="avatar"
      class={cn("relative flex size-8 shrink-0 overflow-hidden rounded-full", local.class)}
      {...others}
    />
  )
}

export function AvatarImageComponent(props: JSX.HTMLAttributes<HTMLImageElement>) {
  const [local, others] = splitProps(props, ["class"])
  return (
    <AvatarImage
      data-slot="avatar-image"
      class={cn("aspect-square size-full", local.class)}
      {...others}
    />
  )
}

export function AvatarFallbackComponent(props: JSX.HTMLAttributes<HTMLSpanElement>) {
  const [local, others] = splitProps(props, ["class"])
  return (
    <AvatarFallback
      data-slot="avatar-fallback"
      class={cn("bg-muted flex size-full items-center justify-center rounded-full", local.class)}
      {...others}
    />
  )
}
