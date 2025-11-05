import { useEffect, useCallback } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { reloadDB, clearReload } from '@/utils/reloadDatabase';

interface UseReloadWatcherOptions {
  key: string;
  onReload: () => void | Promise<void>;
  autoReset?: boolean; // Automatically reset the flag after triggering reload
}

export const useReloadWatcher = ({ 
  key, 
  onReload, 
  autoReset = true 
}: UseReloadWatcherOptions) => {
  
  // Watch for changes to the specific reload key
  const reloadConfig = useLiveQuery(
    () => reloadDB.reloadConfigs.where('key').equals(key).first(),
    [key]
  );

  const handleReload = useCallback(async () => {
    try {
      await onReload();
      
      if (autoReset) {
        await clearReload(key);
      }
    } catch (error) {
      console.error(`Error during reload for ${key}:`, error);
      
      // Still clear the flag even if reload failed to prevent infinite loops
      if (autoReset) {
        await clearReload(key);
      }
    }
  }, [key, onReload, autoReset]);

  useEffect(() => {
    if (reloadConfig?.value === true) {
      handleReload();
    }
  }, [reloadConfig?.value, reloadConfig?.timestamp]);

  return {
    isReloadPending: reloadConfig?.value || false,
    lastReloadTimestamp: reloadConfig?.timestamp,
    manualReset: () => clearReload(key)
  };
};