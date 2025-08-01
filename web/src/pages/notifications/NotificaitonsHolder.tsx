import { INotification, NotificationsHolderProps } from '../../types/index'
import { useState } from 'react'
import { Button } from '../../components/ui/button'
import {
    Card,
    CardContent,
    CardHeader,
    CardTitle,
} from '../../components/ui/card'
import { Check, Loader2 } from 'lucide-react'
import { ScrollArea } from '../../components/ui/scroll-area'
import { formatDistanceToNow } from 'date-fns'
import axios from 'axios'
import appStore from '../../store'
import { API_ENDPOINTS } from '../../utils/constants'
import { formatCryptoAddress } from '../../utils/functions'
import { Badge } from '../../components/ui/badge'
import { useNavigate } from 'react-router-dom'
import { toast } from 'sonner'

interface NotificationItemProps {
    notification: INotification
    onRead: () => void
}

const NotificationItem = ({ notification, onRead }: NotificationItemProps) => {
    const [isMarking, setIsMarking] = useState(false)
    const { backend_url, session } = appStore.getState()
    const navigate = useNavigate()

    const navigateToPage = () => {
        if (notification.navigate_to) {
            console.log('one..', notification.navigate_to)
            if (notification.navigate_to.length > 0) {
                console.log('two..', 'navigating to:', notification.navigate_to)
                navigate(notification.navigate_to)
            }
        } else {
            console.log('no navigate_to found:', notification.navigate_to)
        }
    }
    const markAsRead = async () => {
        if (notification.is_read) {
            navigateToPage()
            return
        }

        setIsMarking(true)
        try {
            await axios.patch(
                `${backend_url}${API_ENDPOINTS.MARK_NOTIFICATION_AS_READ.replace(':id', notification.id)}`,
                {},
                {
                    headers: {
                        nonce: session?.nonce,
                    },
                }
            )
            onRead()
        } catch (error) {
            console.error('Failed to mark notification as read:', error)
            toast.error(`an error occured.`)
        } finally {
            setIsMarking(false)
            navigateToPage()
        }
    }

    // Format the date to be more readable
    const formattedDate = notification.created_on
        ? formatDistanceToNow(new Date(notification.created_on), {
              addSuffix: true,
          })
        : ''

    return (
        <div
            className={`p-4 border-b last:border-b-0 ${notification.is_read ? 'bg-white' : 'bg-blue-50'}`}
            onClick={markAsRead}
        >
            <div className="flex justify-between items-start">
                <div className="flex-1">
                    <div className="flex items-center gap-1 mb-1">
                        <Badge
                            className={`text-xs px-2 py-0.5 ${notification.sender === 'system' ? 'bg-blue-100 text-blue-700 hover:bg-blue-100' : 'bg-gray-100 text-gray-700 hover:bg-gray-100'}`}
                            variant="outline"
                        >
                            {notification.sender === 'system'
                                ? 'System'
                                : formatCryptoAddress(
                                      notification.sender,
                                      4,
                                      4
                                  )}
                        </Badge>
                    </div>
                    <p className="text-xs font-medium">
                        {notification.content}
                    </p>
                    <p className="text-xs text-gray-500 mt-1">
                        {formattedDate}
                    </p>
                </div>
                <div className="flex items-center space-x-2">
                    {!notification.is_read && (
                        <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6 cursor-pointer"
                            onClick={e => {
                                e.stopPropagation()
                                markAsRead()
                            }}
                            disabled={isMarking}
                        >
                            {isMarking ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                                <Check className="h-4 w-4" />
                            )}
                        </Button>
                    )}
                </div>
            </div>
        </div>
    )
}

const NotificaitonsHolder = ({
    notifications,
    isLoading,
    markAllAsRead,
    onNotificationRead,
}: NotificationsHolderProps) => {
    const hasUnread = notifications.some(notification => !notification.is_read)

    return (
        <Card className="border-0 shadow-none py-2 gap-0">
            <CardHeader className="py-2 px-4 flex flex-row items-center justify-between">
                <CardTitle className="text-lg">Notifications</CardTitle>
                {hasUnread && (
                    <Button
                        variant="ghost"
                        size="sm"
                        className="text-xs"
                        onClick={markAllAsRead}
                    >
                        Mark all as read
                    </Button>
                )}
            </CardHeader>
            <CardContent className="p-0 mt-0">
                <ScrollArea className="h-[300px]">
                    {isLoading ? (
                        <div className="flex justify-center items-center h-[100px]">
                            <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
                        </div>
                    ) : notifications.length > 0 ? (
                        notifications.map(notification => (
                            <NotificationItem
                                key={notification.id}
                                notification={notification}
                                onRead={onNotificationRead}
                            />
                        ))
                    ) : (
                        <div className="flex flex-col items-center justify-center h-[100px] text-center p-4">
                            <p className="text-sm text-gray-500">
                                No notifications yet
                            </p>
                            <p className="text-xs text-gray-400 mt-1">
                                You'll see notifications here when you receive
                                them
                            </p>
                        </div>
                    )}
                </ScrollArea>
            </CardContent>
        </Card>
    )
}

export default NotificaitonsHolder
