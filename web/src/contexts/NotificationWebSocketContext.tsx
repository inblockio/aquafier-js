import React, { createContext, useCallback, useContext, useRef } from 'react';
import { useNotificationWebSocket } from '../hooks/useNotificationWebSocket';
import appStore from '../store';
import { useStore } from 'zustand';
import axios from 'axios';
import { API_ENDPOINTS } from '@/utils/constants';
import { toast } from 'sonner';
import { ensureDomainUrlHasSSL } from '@/utils/functions';
import { RELOAD_KEYS, triggerWorkflowReload } from '@/utils/reloadDatabase';

interface NotificationWebSocketContextType {
  isConnected: boolean;
  connectionError: string | null;
  forceReconnect: () => void;
  subscribe: (callback: (message: any) => void) => () => void;
  triggerWebsockets: (receiver: string, content: Object) => void;
}

const NotificationWebSocketContext = createContext<NotificationWebSocketContextType | null>(null);

export const NotificationWebSocketProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const subscribersRef = useRef<Set<(message: any) => void>>(new Set());
  const { session, backend_url } = useStore(appStore);

  // Single WebSocket connection
  const wsHook = useNotificationWebSocket({
    walletAddress: session?.address,
    userId: session?.address,
    onMessage: async (message) => {
      console.log("WEbsocket message: ", message)
      // Broadcast to all subscribers
      subscribersRef.current.forEach(callback => callback(message));
      if (message.action) {
        await triggerWorkflowReload(message.action ?? RELOAD_KEYS.contacts, true)
      }
    },
    onNotificationReload: () => {
      // Broadcast reload event
      subscribersRef.current.forEach(callback => callback({ type: 'notification_reload' }));
    }
  });

  const subscribe = useCallback((callback: (message: any) => void) => {
    subscribersRef.current.add(callback);

    // Return unsubscribe function
    return () => {
      subscribersRef.current.delete(callback);
    };
  }, []);

  const triggerWebsockets = async (receiver: string, content: Object) => {
    try {
      await axios.post(ensureDomainUrlHasSSL(`${backend_url}/${API_ENDPOINTS.TRIGGER_WEBSOCKET}`), {
        receiver,
        content
      }, {
        headers: {
          "Content-Type": "application/json",
          "nonce": `${session?.nonce}`
        }
      })

    } catch (error) {
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
