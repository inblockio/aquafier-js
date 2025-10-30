import { Tabs } from "@kobalte/core";
import { cn } from '../../lib/utils';
import type { ComponentProps } from 'solid-js';

function TabsRoot(props: ComponentProps<typeof Tabs.Root> & { class?: string }) {
  return (
    <Tabs.Root 
      class={cn('flex flex-col gap-2', props.class)} 
      {...props} 
    />
  );
}

function TabsList(props: ComponentProps<typeof Tabs.List> & { class?: string }) {
  return (
    <Tabs.List 
      class={cn(
        'bg-muted text-muted-foreground inline-flex h-9 w-fit items-center justify-center rounded-lg p-[3px]', 
        props.class
      )} 
      {...props} 
    />
  );
}

function TabsTrigger(props: ComponentProps<typeof Tabs.Trigger> & { class?: string }) {
  return (
    <Tabs.Trigger
      class={cn(
        "data-[selected]:bg-background dark:data-[selected]:text-foreground focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:outline-ring dark:data-[selected]:border-input dark:data-[selected]:bg-input/30 text-foreground dark:text-muted-foreground inline-flex h-[calc(100%-1px)] flex-1 items-center justify-center gap-1.5 rounded-md border border-transparent px-2 py-1 text-sm font-medium whitespace-nowrap transition-[color,box-shadow] focus-visible:ring-[3px] focus-visible:outline-1 disabled:pointer-events-none disabled:opacity-50 data-[selected]:shadow-sm [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
        props.class
      )}
      {...props}
    />
  );
}

function TabsContent(props: ComponentProps<typeof Tabs.Content> & { class?: string }) {
  return (
    <Tabs.Content 
      class={cn('flex-1 outline-none', props.class)} 
      {...props} 
    />
  );
}

export { TabsRoot as Tabs, TabsList, TabsTrigger, TabsContent };