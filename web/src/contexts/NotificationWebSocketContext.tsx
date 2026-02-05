import React, { createContext, useContext, useState } from 'react';
import { useNotificationWebSocket } from '../hooks/useNotificationWebSocket';
import appStore from '../store';
import { useStore } from 'zustand';
import apiClient from '@/api/axiosInstance'
import { API_ENDPOINTS } from '@/utils/constants';
import { toast } from 'sonner';
import { ensureDomainUrlHasSSL } from '@/utils/functions';

interface NotificationWebSocketContextType {
  isConnected: boolean;
  connectionError: string | null;
  forceReconnect: () => void;
  subscribe: (callback: (message: any) => void) => () => void;
  triggerWebsockets: (receiver: string, content: Object) => void;
}

const NotificationWebSocketContext = createContext<NotificationWebSocketContextType | null>(null);

export const NotificationWebSocketProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [subscribers, setSubscribers] = useState<Set<(message: any) => void>>(new Set());
  const { session, backend_url } = useStore(appStore);

  // Single WebSocket connection
  const wsHook = useNotificationWebSocket({
    walletAddress: session?.address,
    userId: session?.address,
    onMessage: (message) => {
      console.log("WEbsocket message: ", message)
      // Broadcast to all subscribers
      subscribers.forEach(callback => callback(message));
    },
    onNotificationReload: () => {
      // Broadcast reload event
      subscribers.forEach(callback => callback({ type: 'notification_reload' }));
    }
  });

  const subscribe = (callback: (message: any) => void) => {
    setSubscribers(prev => new Set([...prev, callback]));
    
    // Return unsubscribe function
    return () => {
      setSubscribers(prev => {
        const newSet = new Set(prev);
        newSet.delete(callback);
        return newSet;
      });
    };
  };

  const triggerWebsockets = async (receiver: string, content: Object) => {
    try {
      await apiClient.post(ensureDomainUrlHasSSL(`${backend_url}/${API_ENDPOINTS.TRIGGER_WEBSOCKET}`), {
        receiver,
        content
      }, {
        headers: {
          "Content-Type": "application/json",
          "nonce": `${session?.nonce}`
        }
      })

    }catch (error) {
      toast.error('Error triggering websockets');
      console.error('Error triggering websockets:', error);
    }
  }

  return (
    <NotificationWebSocketContext.Provider value={{
      isConnected: wsHook.isConnected,
      connectionError: wsHook.connectionError,
      forceReconnect: wsHook.forceReconnect,
      subscribe,
      triggerWebsockets,
    }}>
      {children}
    </NotificationWebSocketContext.Provider>
  );
};

export const useNotificationWebSocketContext = () => {
  const context = useContext(NotificationWebSocketContext);
  if (!context) {
    throw new Error('useNotificationWebSocketContext must be used within NotificationWebSocketProvider');
  }
  return context;
};
