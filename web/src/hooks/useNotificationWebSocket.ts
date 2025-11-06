import { useEffect, useRef, useState, useCallback, useMemo } from 'react';
import appStore from '../store';
import { API_ENDPOINTS } from '../utils/constants';

interface WebSocketMessage {
  type: string;
  action: string;
  data?: any;
  timestamp: number;
  targetWallet?: string;
}

interface UseNotificationWebSocketProps {
  walletAddress?: string;
  userId?: string;
  onNotificationReload?: () => void;
  onMessage?: (message: WebSocketMessage) => void;
}

export const useNotificationWebSocket = ({
  walletAddress,
  userId,
  onNotificationReload,
  onMessage
}: UseNotificationWebSocketProps) => {
  const [isConnected, setIsConnected] = useState(false);
  const [connectionError, setConnectionError] = useState<string | null>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const reconnectAttempts = useRef(0);
  const maxReconnectAttempts = 10; // Increased attempts
  const reconnectDelay = 2000; // Fixed 2-second delay

  // Memoize backend_url to prevent unnecessary reconnections
  const backend_url = useMemo(() => appStore.getState().backend_url, []);

  // Stable references for callbacks to prevent reconnection loops
  const onNotificationReloadRef = useRef(onNotificationReload);
  const onMessageRef = useRef(onMessage);
  
  // Update refs when callbacks change
  useEffect(() => {
    onNotificationReloadRef.current = onNotificationReload;
  }, [onNotificationReload]);
  
  useEffect(() => {
    onMessageRef.current = onMessage;
  }, [onMessage]);

  const connect = useCallback(() => {
    if (!walletAddress || !userId) {
      console.warn('WebSocket connection requires walletAddress and userId');
      return;
    }

    // Prevent multiple connections
    if (wsRef.current && wsRef.current.readyState === WebSocket.CONNECTING) {
      console.log('WebSocket connection already in progress');
      return;
    }

    // Close existing connection if any
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      console.log('Closing existing WebSocket connection before reconnecting');
      wsRef.current.close(1000, 'Reconnecting');
    }

    // Convert HTTP URL to WebSocket URL properly
    let wsUrl = backend_url;
    
    // Fix 0.0.0.0 to localhost for browser compatibility
    wsUrl = wsUrl.replace('0.0.0.0', 'localhost');
    
    if (wsUrl.startsWith('https://')) {
      wsUrl = wsUrl.replace('https://', 'wss://');
    } else if (wsUrl.startsWith('http://')) {
      wsUrl = wsUrl.replace('http://', 'ws://');
    } else {
      // If no protocol, assume ws for localhost development
      wsUrl = `ws://${wsUrl}`;
    }
    
    // Remove trailing slash
    wsUrl = wsUrl.replace(/\/$/, '');
    
    const websocketUrl = `${wsUrl}/ws/notifications/${walletAddress}?userId=${userId}`;
    
    // console.log('Backend URL:', backend_url);
    // console.log('WebSocket URL:', websocketUrl);
    // console.log('Wallet Address:', walletAddress);
    // console.log('User ID:', userId);

    try {
      wsRef.current = new WebSocket(websocketUrl);

      wsRef.current.onopen = () => {
        console.log('WebSocket connected successfully');
        setIsConnected(true);
        setConnectionError(null);
        reconnectAttempts.current = 0; // Reset attempts on successful connection
        
        // Clear any pending reconnection attempts
        if (reconnectTimeoutRef.current) {
          clearTimeout(reconnectTimeoutRef.current);
          reconnectTimeoutRef.current = null;
        }
      };

      wsRef.current.onmessage = (event) => {
        try {
          const message: WebSocketMessage = JSON.parse(event.data);
          console.log('WebSocket message received:', message);

          // Call the general message handler if provided
          if (onMessageRef.current) {
            onMessageRef.current(message);
          }

          // Handle notification reload specifically
          if (message.type === 'notification_reload' || 
              (message.data && message.data.target === 'notifications')) {
            console.log('Notification reload requested');
            if (onNotificationReloadRef.current) {
              onNotificationReloadRef.current();
            }
          }

          // Handle other message types
          switch (message.type) {
            case 'wallet_update':
              console.log('Wallet update received:', message.data);
              break;
            case 'contract_update':
              console.log('Contract update received:', message.data);
              break;
            case 'system_message':
              console.log('System message received:', message.data);
              break;
            case 'subscription_confirm':
              console.log('Subscription confirmed:', message.data);
              break;
            case 'error':
              console.error('WebSocket error message:', message.data);
              setConnectionError(message.data?.error || 'Unknown error');
              break;
          }
        } catch (error) {
          console.error('Error parsing WebSocket message:', error);
        }
      };

      wsRef.current.onclose = (event) => {
        console.log('WebSocket connection closed:', event.code, event.reason);
        console.log('WebSocket URL that closed:', websocketUrl);
        console.log('Close event details:', {
          code: event.code,
          reason: event.reason,
          wasClean: event.wasClean
        });
        setIsConnected(false);

        // Set specific error messages based on close codes
        if (event.code === 1006) {
          setConnectionError('Connection failed - server may be unreachable');
        } else if (event.code === 1008) {
          setConnectionError('Connection rejected by server');
        } else if (event.code !== 1000) {
          setConnectionError(`Connection closed unexpectedly (${event.code})`);
        }

        // Only attempt to reconnect if not a normal closure and not manually disconnected
        // Exception: reconnect if server closed due to "New connection established"
        if ((event.code !== 1000 || event.reason === 'New connection established') && 
            event.reason !== 'Reconnecting' && 
            event.reason !== 'Client disconnecting') {
          console.log('Reconnecting due to server-initiated closure:', event.reason);
          attemptReconnect();
        }
      };

      wsRef.current.onerror = (error) => {
        console.error('WebSocket error:', error);
        console.error('WebSocket URL that failed:', websocketUrl);
        console.error('WebSocket readyState:', wsRef.current?.readyState);
        setIsConnected(false);
        setConnectionError(`Connection error: ${error}`);
      };

    } catch (error) {
      console.error('Error creating WebSocket connection:', error);
      setConnectionError('Failed to create WebSocket connection');
    }
  }, [walletAddress, userId, backend_url]);

  const attemptReconnect = useCallback(() => {
    // Clear any existing timeout first
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }

    if (reconnectAttempts.current >= maxReconnectAttempts) {
      console.log(`Max reconnection attempts reached (${maxReconnectAttempts})`);
      setConnectionError(`Failed to reconnect after ${maxReconnectAttempts} attempts`);
      return;
    }

    reconnectAttempts.current++;
    console.log(`Attempting to reconnect in ${reconnectDelay / 1000}s (${reconnectAttempts.current}/${maxReconnectAttempts})...`);
    
    setConnectionError(`Reconnecting... (${reconnectAttempts.current}/${maxReconnectAttempts})`);

    reconnectTimeoutRef.current = setTimeout(() => {
      console.log(`Reconnection attempt ${reconnectAttempts.current} starting...`);
      connect();
    }, reconnectDelay);
  }, []); // Removed connect dependency to prevent recreation loops

  const disconnect = useCallback(() => {
    // Clear any pending reconnection attempts
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }

    // Reset reconnection attempts
    reconnectAttempts.current = 0;

    if (wsRef.current) {
      wsRef.current.close(1000, 'Client disconnecting');
      wsRef.current = null;
    }

    setIsConnected(false);
    setConnectionError(null);
  }, []);

  const forceReconnect = useCallback(() => {
    console.log('Force reconnecting WebSocket...');
    reconnectAttempts.current = 0; // Reset attempts for manual reconnect
    disconnect();
    setTimeout(() => {
      if (walletAddress && userId) {
        connect();
      }
    }, 100); // Small delay to ensure cleanup
  }, [walletAddress, userId]);

  const subscribe = useCallback((topic: string) => {
    if (wsRef.current && isConnected) {
      const message = {
        action: 'subscribe',
        topic: topic,
        timestamp: Date.now()
      };
      wsRef.current.send(JSON.stringify(message));
      console.log(`Subscribed to topic: ${topic}`);
    }
  }, [isConnected]);

  const unsubscribe = useCallback((topic: string) => {
    if (wsRef.current && isConnected) {
      const message = {
        action: 'unsubscribe',
        topic: topic,
        timestamp: Date.now()
      };
      wsRef.current.send(JSON.stringify(message));
      console.log(`Unsubscribed from topic: ${topic}`);
    }
  }, [isConnected]);

  // Connect when walletAddress and userId are available
  useEffect(() => {
    console.log('WebSocket useEffect triggered:', { 
      walletAddress, 
      userId, 
      hasWallet: !!walletAddress, 
      hasUserId: !!userId 
    });
    
    if (walletAddress && userId) {
      console.log('Attempting WebSocket connection...');
      connect();
    } else {
      console.log('WebSocket connection skipped - missing credentials:', {
        walletAddress: walletAddress ? 'present' : 'missing',
        userId: userId ? 'present' : 'missing'
      });
    }

    return () => {
      disconnect();
    };
  }, [walletAddress, userId]); // Removed connect and disconnect from dependencies

  return {
    isConnected,
    connectionError,
    connect,
    disconnect,
    forceReconnect,
    subscribe,
    unsubscribe,
    reconnectAttempts: reconnectAttempts.current,
    maxReconnectAttempts
  };
};


export async function sendNotification(
  walletAddress: string, 
  type: string = 'notification_reload', 
  target: string = 'notifications',
  additionalData?: any
) {
  try {
    let { backend_url } = appStore.getState();
    
    // Fix 0.0.0.0 to localhost for browser compatibility
    backend_url = backend_url.replace('0.0.0.0', 'localhost');
    
    // Replace :wallet_address placeholder with actual wallet address
    const endpoint = API_ENDPOINTS.SEND_NOTIFICATION.replace(':wallet_address', walletAddress);
    const url = `${backend_url}${endpoint}`;
    
    const body = {
      type,
      data: {
        target,
        ...additionalData
      },
      timestamp: Date.now()
    };

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body)
    });

    if (!response.ok) {
      throw new Error(`Failed to send notification: ${response.status} ${response.statusText}`);
    }

    const result = await response.json();
    // console.log('Notification sent successfully:', result);
    return result;
    
  } catch (error) {
    // console.error('Error sending notification:', error);
    throw error;
  }
}