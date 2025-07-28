import { Alert, AlertDescription, AlertTitle } from './alert'
import { AlertCircleIcon, InfoIcon, CheckCircleIcon } from 'lucide-react'

type CustomAlertProps = {
      type?: 'error' | 'info' | 'success'
      title: React.ReactNode
      description: React.ReactNode
}

export const CustomAlert = ({ type = 'info', title, description }: CustomAlertProps) => {
      const alertConfig = {
            error: {
                  className: 'border-red-500 bg-red-50 text-red-900 dark:bg-red-900/10 dark:text-red-400',
                  iconClassName: 'text-red-500',
                  icon: AlertCircleIcon,
                  variant: 'destructive',
            },
            info: {
                  className: 'border-blue-500 bg-blue-50 text-blue-900 dark:bg-blue-900/10 dark:text-blue-400',
                  iconClassName: 'text-blue-500',
                  icon: InfoIcon,
                  variant: 'default',
            },
            success: {
                  className: 'border-green-500 bg-green-50 text-green-900 dark:bg-green-900/10 dark:text-green-400',
                  iconClassName: 'text-green-500',
                  icon: CheckCircleIcon,
                  variant: 'default',
            },
      }

      const config = alertConfig[type]
      const IconComponent = config.icon

      return (
            <Alert className={config.className}>
                  <IconComponent className={config.iconClassName} />
                  <AlertTitle>{title}</AlertTitle>
                  <AlertDescription>{description}</AlertDescription>
            </Alert>
      )
}

// Usage
