import React, { Component, ErrorInfo, ReactNode } from 'react'
import { useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { AlertTriangle, Home, RefreshCw, Copy, ChevronDown, ChevronUp, Bug } from 'lucide-react'

interface Props {
      children: ReactNode
      fallback?: ReactNode
}

// ErrorFallbackProps interface for the ErrorFallback component
interface ErrorFallbackProps {
      error: Error | null
      resetErrorBoundary: () => void
}

interface State {
      hasError: boolean
      error: Error | null
}

class ErrorBoundary extends Component<Props, State> {
      constructor(props: Props) {
            super(props)
            this.state = {
                  hasError: false,
                  error: null,
            }
      }

      static getDerivedStateFromError(error: Error): State {
            // Update the state so the next render will show the fallback UI
            return { hasError: true, error }
      }

      componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
            // You can log the error to an error reporting service
            console.error('Error caught by ErrorBoundary:', error, errorInfo)
      }

      render(): ReactNode {
            if (this.state.hasError) {
                  // You can render any custom fallback UI
                  if (this.props.fallback) {
                        return this.props.fallback
                  }

                  return (
                        <ErrorFallback
                              error={this.state.error}
                              resetErrorBoundary={() => {
                                    this.setState({ hasError: false, error: null })
                              }}
                        />
                  )
            }

            return this.props.children
      }
}

// ErrorFallback component that displays a dialog with options to go home or reload
const ErrorFallback = ({ error, resetErrorBoundary }: ErrorFallbackProps) => {
      const [showDetails, setShowDetails] = React.useState(false)
      const [copied, setCopied] = React.useState(false)
      const [open, setOpen] = React.useState(true)

      const navigate = useNavigate()

      const handleGoHome = () => {
            resetErrorBoundary()
            setOpen(false)
            navigate('/')
      }

      const handleReload = () => {
            window.location.reload()
      }

      const copyErrorDetails = async () => {
            const errorText = `Error: ${error?.message}\n\nStack Trace:\n${error?.stack}`
            try {
                  await navigator.clipboard.writeText(errorText)
                  setCopied(true)
                  setTimeout(() => setCopied(false), 2000)
            } catch (err) {
                  console.error('Failed to copy error details:', err)
            }
      }

      const getErrorType = (error: Error | null) => {
            if (!error) return 'Unknown Error'
            if (error.name) return error.name
            return 'Runtime Error'
      }

      return (
            <Dialog
                  open={open}
                  onOpenChange={isOpen => {
                        if (!isOpen) {
                              handleGoHome()
                        }
                  }}
            >
                  <DialogContent className="max-w-lg overflow-x-hidden">
                        <DialogHeader className="pb-4">
                              <div className="flex items-center gap-4">
                                    <div className="flex-shrink-0">
                                          <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center">
                                                <AlertTriangle className="w-6 h-6 text-red-600" />
                                          </div>
                                    </div>
                                    <div className="flex-1">
                                          <DialogTitle className="text-xl font-semibold text-gray-900 mb-1">Oops! Something went wrong</DialogTitle>
                                          <DialogDescription className="text-gray-600 text-sm">We encountered an unexpected error. Don't worry, your data is safe.</DialogDescription>
                                    </div>
                              </div>
                        </DialogHeader>

                        <Separator />

                        {/* Error Details */}
                        <div className="space-y-4 overflow-y-auto">
                              {/* Error Type Badge */}
                              <div className="flex items-center gap-2">
                                    <Badge variant="destructive" className="bg-red-50 text-red-700 border-red-200">
                                          <Bug className="w-4 h-4 mr-1" />
                                          {getErrorType(error)}
                                    </Badge>
                                    <span className="text-xs text-gray-500">{new Date().toLocaleString()}</span>
                              </div>

                              {/* Error Message */}
                              <Card className="border-red-200 bg-red-50/50">
                                    <CardContent className="p-4">
                                          <p className="text-sm text-red-800 font-medium leading-relaxed">{error?.message || 'An unexpected error occurred in the application.'}</p>
                                    </CardContent>
                              </Card>

                              {/* Expandable Stack Trace */}
                              {error?.stack && (
                                    <div className="space-y-2">
                                          <Button variant="ghost" size="sm" onClick={() => setShowDetails(!showDetails)} className="h-8 px-2 text-gray-600 hover:text-gray-900 cursor-pointer">
                                                {showDetails ? (
                                                      <>
                                                            <ChevronUp className="w-4 h-4 mr-1" />
                                                            Hide Details
                                                      </>
                                                ) : (
                                                      <>
                                                            <ChevronDown className="w-4 h-4 mr-1" />
                                                            Show Technical Details
                                                      </>
                                                )}
                                          </Button>

                                          {showDetails && (
                                                <Card className="border-gray-200 py-0">
                                                      <CardContent className="p-0">
                                                            <div className="flex items-center rounded-t-lg justify-between p-3 bg-gray-50 border-b border-gray-200">
                                                                  <span className="text-xs font-medium text-gray-700">Stack Trace</span>
                                                                  <Button variant="ghost" size="sm" onClick={copyErrorDetails} className="h-6 px-2 text-xs cursor-pointer">
                                                                        <Copy className="w-4 h-4 mr-1" />
                                                                        {copied ? 'Copied!' : 'Copy'}
                                                                  </Button>
                                                            </div>
                                                            <div className="p-3 max-h-40 overflow-auto">
                                                                  <pre className="text-xs text-gray-600 whitespace-pre-wrap font-mono leading-relaxed">{error.stack}</pre>
                                                            </div>
                                                      </CardContent>
                                                </Card>
                                          )}
                                    </div>
                              )}

                              {/* Help Text */}
                              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                                    <div className="flex items-start gap-3">
                                          <div className="w-5 h-5 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                                                <span className="text-blue-600 text-xs font-bold">?</span>
                                          </div>
                                          <div className="text-sm text-blue-800">
                                                <p className="font-medium mb-1">What can you do?</p>
                                                <ul className="text-xs space-y-1 text-blue-700">
                                                      <li>• Try reloading the page to see if the issue resolves</li>
                                                      <li>• Go back to the home page and try again</li>
                                                      <li>• If the problem persists, contact support with the error details</li>
                                                </ul>
                                          </div>
                                    </div>
                              </div>
                        </div>

                        <Separator />

                        {/* Action Buttons */}
                        <div className="flex justify-end gap-3 pt-2">
                              <Button variant="outline" onClick={handleGoHome} className="hover:bg-gray-50 cursor-pointer">
                                    <Home className="w-4 h-4 mr-2" />
                                    Go to Home
                              </Button>
                              <Button onClick={handleReload} className="bg-blue-600 hover:bg-blue-700 text-white cursor-pointer">
                                    <RefreshCw className="w-4 h-4 mr-2" />
                                    Reload Page
                              </Button>
                        </div>
                  </DialogContent>
            </Dialog>
      )
}

export default ErrorBoundary
