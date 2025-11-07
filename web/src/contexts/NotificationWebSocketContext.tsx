import React, { createContext, useContext, useState } from 'react';
import { useNotificationWebSocket } from '../hooks/useNotificationWebSocket';
import appStore from '../store';
import { useStore } from 'zustand';

interface NotificationWebSocketContextType {
  isConnected: boolean;
  connectionError: string | null;
  forceReconnect: () => void;
  subscribe: (callback: (message: any) => void) => () => void;
}

const NotificationWebSocketContext = createContext<NotificationWebSocketContextType | null>(null);

export const NotificationWebSocketProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [subscribers, setSubscribers] = useState<Set<(message: any) => void>>(new Set());
  const { session } = useStore(appStore);

  console.log('NotificationWebSocketProvider session:', session?.address);

  // Single WebSocket connection
  const wsHook = useNotificationWebSocket({
    walletAddress: session?.address,
    userId: session?.address,
    onMessage: (message) => {
      // Broadcast to all subscribers
      console.log('WebSocket message received in mmmmmmms:', message);
      subscribers.forEach(callback => callback(message));
    },
    onNotificationReload: () => {
      // Broadcast reload event
      console.log('WebSocket reload event received in NotificationWebSocketProvider');
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

  return (
    <NotificationWebSocketContext.Provider value={{
      isConnected: wsHook.isConnected,
      connectionError: wsHook.connectionError,
      forceReconnect: wsHook.forceReconnect,
      subscribe
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
