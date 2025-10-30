import { createSignal, createEffect, Show } from 'solid-js';
import { cn } from '../../lib/utils';

interface AvatarProps {
  class?: string;
  children?: any;
    onClick?: () => void;
}

interface AvatarImageProps {
  src?: string;
  srcset?: string;
  alt?: string;
  class?: string;
  onClick?: () => void;
  onLoadingStatusChange?: (status: 'loading' | 'loaded' | 'error') => void;
}

interface AvatarFallbackProps {
  class?: string;
  children?: any;
  delayMs?: number;
}

function Avatar(props: AvatarProps) {
  return (
    <div 
      class={cn(
        'relative flex size-8 shrink-0 overflow-hidden rounded-full', 
        props.class
      )} 
      {...props} 
    />
  );
}

function AvatarImage(props: AvatarImageProps & { class?: string }) {
  const [loadingStatus, setLoadingStatus] = createSignal<'loading' | 'loaded' | 'error'>('loading');

  createEffect(() => {
    props.onLoadingStatusChange?.(loadingStatus());
  });

  const handleLoad = () => {
    setLoadingStatus('loaded');
  };

  const handleError = () => {
    setLoadingStatus('error');
  };

  return (
    <Show when={loadingStatus() !== 'error'}>
      <img
        class={cn('aspect-square size-full', props.class)}
        src={props.src}
        srcset={props.srcset}
        alt={props.alt}
        onLoad={handleLoad}
        onError={handleError}
      />
    </Show>
  );
}

function AvatarFallback(props: AvatarFallbackProps & { class?: string }) {
  const [isVisible, setIsVisible] = createSignal(false);

  createEffect(() => {
    if (props.delayMs) {
      const timer = setTimeout(() => {
        setIsVisible(true);
      }, props.delayMs);
      return () => clearTimeout(timer);
    } else {
      setIsVisible(true);
    }
  });

  return (
    <Show when={isVisible()}>
      <div 
        class={cn(
          'bg-muted flex size-full items-center justify-center rounded-full', 
          props.class
        )} 
        {...props} 
      />
    </Show>
  );
}

export { Avatar, AvatarImage, AvatarFallback };