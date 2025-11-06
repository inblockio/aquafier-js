import { useState, useEffect } from 'react';
import { AquaSystemNamesService } from '@/storage/databases/aquaSystemNames';
import { liveQuery } from 'dexie';

export const useAquaSystemNames = () => {
  const [systemNames, setSystemNames] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const aquaSystemNamesService = AquaSystemNamesService.getInstance();
    
    // Use liveQuery to watch for database changes
    const subscription = liveQuery(() => aquaSystemNamesService.getSystemNames()).subscribe({
      next: (result) => {
        setSystemNames(result);
        setLoading(false);
      },
      error: (error) => {
        console.error('Error loading system names:', error);
        setLoading(false);
      }
    });

    // Cleanup subscription on unmount
    return () => subscription.unsubscribe();
  }, []);

  return {
    systemNames,
    loading
  };
};

// Hook to get system names service instance
export const useAquaSystemNamesService = () => {
  return AquaSystemNamesService.getInstance();
};
