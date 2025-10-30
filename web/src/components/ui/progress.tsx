import { Progress as KProgress } from "@kobalte/core";
import { cn } from "../../lib/utils";
import { splitProps } from "solid-js";
import type { ComponentProps } from "solid-js";

interface ProgressProps extends ComponentProps<"div"> {
  value?: number;
  class?: string;
}

export function Progress(props: ProgressProps) {
  const [local, others] = splitProps(props, ["value", "class"]);
  const value = () => local.value ?? 0;

  return (
    <KProgress.Root
      data-slot="progress"
      value={value()}
      class={cn("bg-primary/20 relative h-2 w-full overflow-hidden rounded-full", local.class)}
      // We omit spreading "others" to prevent extra attrs like aria-valuenow="string"
    >
      <KProgress.Fill
        data-slot="progress-indicator"
        class="bg-primary h-full transition-all"
        style={{ transform: `translateX(-${100 - value()}%)` }}
      />
    </KProgress.Root>
  );
}
