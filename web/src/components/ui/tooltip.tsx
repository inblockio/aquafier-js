import { Tooltip as KobalteTooltip } from "@kobalte/core";
import { JSX, mergeProps, splitProps } from "solid-js";
import { cn } from "../../lib/utils";

type TooltipRootProps = {
  delayDuration?: number;
  children: JSX.Element;
} & KobalteTooltip.TooltipRootProps;

function Tooltip(props: TooltipRootProps) {
  const merged = mergeProps({ delayDuration: 0 }, props);
  
  return (
    <KobalteTooltip.Root
      openDelay={merged.delayDuration}
      closeDelay={merged.delayDuration}
      data-slot="tooltip"
      {...merged}
    />
  );
}

// type TooltipTriggerProps = KobalteTooltip.TooltipTriggerProps;

// function TooltipTrigger(props: TooltipTriggerProps) {
//   return <KobalteTooltip.Trigger data-slot="tooltip-trigger" {...props} />;
// }

type TooltipTriggerProps = {
  asChild?: boolean;
  children: JSX.Element;
} & KobalteTooltip.TooltipTriggerProps;

function TooltipTrigger(props: TooltipTriggerProps) {
  return (
    <KobalteTooltip.Trigger 
      data-slot="tooltip-trigger" 
      as={props.asChild ? "div" : undefined}
      {...props}
    >
      {props.children}
    </KobalteTooltip.Trigger>
  );
}

type TooltipContentProps = {
  class?: string;
  sideOffset?: number;
  children: JSX.Element;
} & KobalteTooltip.TooltipContentProps;

function TooltipContent(props: TooltipContentProps) {
  const [local, others] = splitProps(props, ["class", "sideOffset", "children"]);
  const merged = mergeProps({ sideOffset: 0 }, local);

  return (
    <KobalteTooltip.Portal>
      <KobalteTooltip.Content
        data-slot="tooltip-content"
        gutter={merged.sideOffset}
        class={cn(
          "bg-primary text-primary-foreground animate-in fade-in-0 zoom-in-95 data-[closed]:animate-out data-[closed]:fade-out-0 data-[closed]:zoom-out-95 data-[placement^=bottom]:slide-in-from-top-2 data-[placement^=left]:slide-in-from-right-2 data-[placement^=right]:slide-in-from-left-2 data-[placement^=top]:slide-in-from-bottom-2 z-50 w-fit origin-[var(--kb-popper-content-transform-origin)] rounded-md px-3 py-1.5 text-xs text-balance",
          merged.class
        )}
        {...others}
      >
        {merged.children}
        <KobalteTooltip.Arrow class="bg-primary fill-primary z-50 size-2.5 translate-y-[calc(-50%_-_2px)] rotate-45 rounded-[2px]" />
      </KobalteTooltip.Content>
    </KobalteTooltip.Portal>
  );
}

export { Tooltip, TooltipTrigger, TooltipContent };