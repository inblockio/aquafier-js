import { JSX } from "solid-js"
import { Alert, AlertDescription, AlertTitle } from "./alert"
import { AlertCircle, Info, CheckCircle } from "lucide-solid"

type CustomAlertProps = {
  type?: "error" | "info" | "success"
  title: JSX.Element | string
  description: JSX.Element | string
}

export function CustomAlert(props: CustomAlertProps) {
  const alertConfig = {
    error: {
      class: "border-red-500 bg-red-50 text-red-900 dark:bg-red-900/10 dark:text-red-400",
      iconClass: "text-red-500",
      icon: AlertCircle,
    },
    info: {
      class: "border-blue-500 bg-blue-50 text-blue-900 dark:bg-blue-900/10 dark:text-blue-400",
      iconClass: "text-blue-500",
      icon: Info,
    },
    success: {
      class: "border-green-500 bg-green-50 text-green-900 dark:bg-green-900/10 dark:text-green-400",
      iconClass: "text-green-500",
      icon: CheckCircle,
    },
  }

  const config = alertConfig[props.type || "info"]
  const IconComponent = config.icon

  return (
    <Alert class={config.class}>
      <IconComponent class={config.iconClass} />
      <AlertTitle>{props.title}</AlertTitle>
      <AlertDescription>{props.description}</AlertDescription>
    </Alert>
  )
}
