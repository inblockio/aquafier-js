import { useState, useEffect } from 'react'
import { Bell } from 'lucide-react'

import NotificationsHolder from './NotificaitonsHolder'
import axios from 'axios'
import { INotification } from '../../types/index'
import appStore from '../../store'
import { API_ENDPOINTS } from '../../utils/constants'
import { Popover, PopoverContent, PopoverTrigger } from '../../components/ui/popover'
import { Badge } from '../../components/ui/badge'
import { Button } from '../../components/ui/button'
// import { useNotificationWebSocket } from '../../hooks/useNotificationWebSocket'
import { useNotificationWebSocketContext } from '@/contexts/NotificationWebSocketContext'

const NotificationsBell = () => {
      const [notifications, setNotifications] = useState<INotification[]>([])
      const [unreadCount, setUnreadCount] = useState<number>(0)
      const [isLoading, setIsLoading] = useState<boolean>(false)
      const [isOpen, setIsOpen] = useState<boolean>(false)
      const { backend_url, session } = appStore.getState()
      // In any component that needs notifications
      const { isConnected, subscribe, connectionError } = useNotificationWebSocketContext();


      const fetchNotifications = async () => {
            if (!session?.address) return

            setIsLoading(true)
            try {
                  const response = await axios.get(`${backend_url}${API_ENDPOINTS.NOTIFICATIONS}`, {
                        headers: {
                              nonce: session.nonce,
                        },
                  })

                  setNotifications(response.data)
                  setUnreadCount(response.data.filter((notification: INotification) => !notification.is_read).length)
            } catch (error) {
                  console.error('Failed to fetch notifications:', error)
            } finally {
                  setIsLoading(false)
            }
      }

      const markAllAsRead = async () => {
            if (!session?.address) return

            try {
                  await axios.patch(
                        `${backend_url}${API_ENDPOINTS.NOTIFICATIONS_READ_ALL}`,
                        {},
                        {
                              headers: {
                                    nonce: session.nonce,
                              },
                        }
                  )

                  // Update local state
                  setNotifications(prevNotifications =>
                        prevNotifications.map(notification => ({
                              ...notification,
                              is_read: true,
                        }))
                  )
                  setUnreadCount(0)
            } catch (error) {
                  console.error('Failed to mark notifications as read:', error)
            }
      }

      useEffect(() => {
            if (isOpen) {
                  fetchNotifications()
            }
      }, [isOpen, session?.address])

      // WebSocket connection for real-time notifications
      // const { isConnected, connectionError } = useNotificationWebSocket({
      //       walletAddress: session?.address,
      //       userId: session?.address, // Using wallet address as userId for now
      //       onNotificationReload: () => {
      //             // console.log('WebSocket notification reload triggered');
      //             fetchNotifications();
      //       },
      //       onMessage: (message) => {
      //             // console.log('WebSocket message received in NotificationsBell:', message);
      //             // Handle other message types if needed
      //             if (message.type === 'wallet_update' || message.type === 'contract_update') {
      //                   // Optionally reload notifications for these events too
      //                   fetchNotifications();
      //             }
      //             // if(message.data && message.data.target === 'notifications') {
      //             //       fetchNotifications();
      //             // }
      //       }
      // });

      // Initial fetch
      useEffect(() => {
            if (session?.address) {
                  fetchNotifications()
            }
      }, [])

      useEffect(() => {
            const unsubscribe = subscribe((message) => {
                  // Handle message
                  console.log('WebSocket message received in NotificationsBell:', message);
                  
                  // Handle notification reload specifically
                  if (message.type === 'notification_reload' || 
                      (message.data && message.data.target === 'notifications')) {
                        fetchNotifications();
                  }
                  
                  // Handle other message types
                  if (message.type === 'wallet_update' || message.type === 'contract_update') {
                        // Optionally reload notifications for these events too
                        fetchNotifications();
                  }
            });
            return unsubscribe;
      }, []);

      return (
            <Popover open={isOpen} onOpenChange={setIsOpen} modal>
                  <PopoverTrigger asChild>
                        <Button variant="ghost" size="icon" className="relative" aria-label="Notifications">
                              <Bell className={`h-5 w-5 ${isConnected ? 'text-green-600' : connectionError ? 'text-red-600' : 'text-gray-600'}`} />
                              {unreadCount > 0 && (
                                    <Badge className="absolute -top-1 -right-1 px-1 min-w-[18px] h-[18px] flex items-center justify-center bg-red-500 text-white text-xs" variant="destructive">
                                          {unreadCount > 99 ? '99+' : unreadCount}
                                    </Badge>
                              )}
                              {/* WebSocket connection indicator */}
                              <div className={`absolute -bottom-1 -right-1 w-2 h-2 rounded-full ${isConnected ? 'bg-green-500' : connectionError ? 'bg-red-500' : 'bg-gray-400'
                                    }`} title={isConnected ? 'Connected' : connectionError ? 'Connection Error' : 'Connecting...'} />
                        </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-74 p-0 rounded-md" align="end">
                        <NotificationsHolder notifications={notifications} isLoading={isLoading} markAllAsRead={markAllAsRead} onNotificationRead={fetchNotifications} />
                  </PopoverContent>
            </Popover>
      )
}

export default NotificationsBell
