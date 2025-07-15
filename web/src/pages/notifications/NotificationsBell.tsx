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

const NotificationsBell = () => {
  const [notifications, setNotifications] = useState<INotification[]>([])
  const [unreadCount, setUnreadCount] = useState<number>(0)
  const [isLoading, setIsLoading] = useState<boolean>(false)
  const [isOpen, setIsOpen] = useState<boolean>(false)
  const { backend_url, session } = appStore.getState()

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
      await axios.patch(`${backend_url}${API_ENDPOINTS.NOTIFICATIONS_READ_ALL}`, {}, {
        headers: {
          nonce: session.nonce,
        },
      })
      
      // Update local state
      setNotifications(prevNotifications => 
        prevNotifications.map(notification => ({
          ...notification,
          is_read: true
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

  // Poll for new notifications every minute
  useEffect(() => {
    const interval = setInterval(() => {
      if (session?.address) {
        fetchNotifications()
      }
    }, 60000) // 1 minute
    
    return () => clearInterval(interval)
  }, [session?.address])

  // Initial fetch
  useEffect(() => {
    if (session?.address) {
      fetchNotifications()
    }
  }, [session?.address])

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen} modal>
      <PopoverTrigger asChild>
        <Button 
          variant="ghost" 
          size="icon" 
          className="relative"
          aria-label="Notifications"
        >
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <Badge 
              className="absolute -top-1 -right-1 px-1 min-w-[18px] h-[18px] flex items-center justify-center bg-red-500 text-white text-xs"
              variant="destructive"
            >
              {unreadCount > 99 ? '99+' : unreadCount}
            </Badge>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-74 p-0 rounded-md" align="end">
        <NotificationsHolder 
          notifications={notifications}
          isLoading={isLoading}
          markAllAsRead={markAllAsRead}
          onNotificationRead={fetchNotifications}
        />
      </PopoverContent>
    </Popover>
  )
}

export default NotificationsBell