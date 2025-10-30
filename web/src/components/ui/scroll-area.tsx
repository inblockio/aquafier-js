import { Component, ComponentProps, splitProps } from 'solid-js';
import { cn } from '../../lib/utils';

type ScrollAreaProps = ComponentProps<'div'> & {
  orientation?: 'vertical' | 'horizontal' | 'both';
};

const ScrollArea: Component<ScrollAreaProps> = (props) => {
  const [local, others] = splitProps(props, ['class', 'children', 'orientation']);
  const orientation = () => local.orientation ?? 'vertical';
  
  return (
    <div 
      class={cn(
        'relative overflow-auto',
        orientation() === 'vertical' && 'overflow-y-auto overflow-x-hidden',
        orientation() === 'horizontal' && 'overflow-x-auto overflow-y-hidden',
        // Custom scrollbar styles
        '[&::-webkit-scrollbar]:w-2.5',
        '[&::-webkit-scrollbar-track]:bg-transparent',
        '[&::-webkit-scrollbar-thumb]:bg-border',
        '[&::-webkit-scrollbar-thumb]:rounded-full',
        '[&::-webkit-scrollbar-thumb]:border',
        '[&::-webkit-scrollbar-thumb]:border-transparent',
        local.class
      )}
      {...others}
    >
      {local.children}
    </div>
  );
};

export { ScrollArea };