import React from 'react'
import { LogData, LogType, LogTypeEmojis } from 'aqua-js-sdk/web'
import { Card, CardContent, CardFooter, CardHeader } from '@/components/ui/card'
import { ScrollArea } from '@/components/ui/scroll-area'
import { cn } from '@/lib/utils'

interface LogViewerProps {
      logs: LogData[]
      title?: string
      className?: string
}

const getLogTypeStyles = (logType: LogType) => {
      const baseStyles = 'px-4 py-2 mb-1 border-l-4 rounded-r-lg font-mono text-sm leading-relaxed transition-all hover:shadow-sm'

      switch (logType) {
            case LogType.SUCCESS:
                  return `${baseStyles} text-green-700 bg-green-50 border-green-400 dark:bg-green-950/30 dark:text-green-300`
            case LogType.ERROR:
            case LogType.FINAL_ERROR:
                  return `${baseStyles} text-red-700 bg-red-50 border-red-400 dark:bg-red-950/30 dark:text-red-300`
            case LogType.WARNING:
                  return `${baseStyles} text-orange-700 bg-orange-50 border-orange-400 dark:bg-orange-950/30 dark:text-orange-300`
            case LogType.INFO:
                  return `${baseStyles} text-blue-700 bg-blue-50 border-blue-400 dark:bg-blue-950/30 dark:text-blue-300`
            case LogType.HINT:
                  return `${baseStyles} text-purple-700 bg-purple-50 border-purple-400 dark:bg-purple-950/30 dark:text-purple-300`
            case LogType.DEBUGDATA:
                  return `${baseStyles} text-gray-600 bg-gray-50 border-gray-300 dark:bg-gray-800/50 dark:text-gray-300`
            case LogType.ARROW:
                  return `${baseStyles} text-indigo-700 bg-indigo-50 border-indigo-400 dark:bg-indigo-950/30 dark:text-indigo-300`
            case LogType.FILE:
                  return `${baseStyles} text-teal-700 bg-teal-50 border-teal-400 dark:bg-teal-950/30 dark:text-teal-300`
            case LogType.LINK:
                  return `${baseStyles} text-cyan-700 bg-cyan-50 border-cyan-400 dark:bg-cyan-950/30 dark:text-cyan-300`
            case LogType.SIGNATURE:
                  return `${baseStyles} text-violet-700 bg-violet-50 border-violet-400 dark:bg-violet-950/30 dark:text-violet-300`
            case LogType.WITNESS:
                  return `${baseStyles} text-pink-700 bg-pink-50 border-pink-400 dark:bg-pink-950/30 dark:text-pink-300`
            case LogType.FORM:
                  return `${baseStyles} text-orange-700 bg-orange-50 border-orange-400 dark:bg-orange-950/30 dark:text-orange-300`
            case LogType.SCALAR:
                  return `${baseStyles} text-gray-700 bg-gray-50 border-gray-400 dark:bg-gray-800/50 dark:text-gray-300`
            case LogType.TREE:
                  return `${baseStyles} text-green-700 bg-green-50 border-green-400 dark:bg-green-950/30 dark:text-green-300`
            case LogType.EMPTY:
                  return 'h-2'
            default:
                  return `${baseStyles} text-gray-700 bg-gray-50 border-gray-300 dark:bg-gray-800/50 dark:text-gray-300`
      }
}

const LogLine: React.FC<{ entry: LogData; index: number }> = ({ entry, index }) => {
      const { log, logType, ident = '' } = entry
      const emoji = LogTypeEmojis[logType]
      const styles = getLogTypeStyles(logType)

      // Handle empty logs
      if (logType === LogType.EMPTY) {
            return <div key={index} className="h-[10px]" />
      }

      // Calculate indentation level
      const indentLevel = (ident ?? '').length / 4 // Assuming 4 spaces per indent level
      const paddingLeft = Math.max(12 + indentLevel * 16, 12)

      return (
            <div key={index} className={styles} style={{ paddingLeft: `${paddingLeft}px` }}>
                  <div className="flex items-start gap-2">
                        {emoji && <span className="text-md flex-shrink-0 mt-0.5">{emoji}</span>}
                        <span className="whitespace-pre-wrap break-words flex-1">
                              {log} {index}
                        </span>
                  </div>
            </div>
      )
}

export const LogViewer: React.FC<LogViewerProps> = ({ logs, title = 'Execution Logs', className }) => {
      return (
            <Card className={cn('w-full shadow-lg py-0 rounded-2xl', className)}>
                  {/* Header */}
                  <CardHeader className="!px-6 !py-2 border-b bg-gray-50 dark:bg-gray-900 rounded-t-2xl">
                        <div className="flex items-center gap-2">
                              <span className="text-blue-600">📋</span>
                              <h3 className="text-lg font-semibold">{title}</h3>
                        </div>
                        <p className="text-sm text-gray-600 dark:text-gray-400">
                              {logs.length} log {logs.length === 1 ? 'entry' : 'entries'}
                        </p>
                  </CardHeader>

                  {/* Log Content */}
                  <CardContent className="h-[350px] py-0">
                        <ScrollArea className="h-full bg-gray-50 dark:bg-gray-900 py-0">
                              {logs.length === 0 ? (
                                    <div className="text-center py-8 text-gray-500">
                                          <div className="text-4xl mb-2">📝</div>
                                          <div>No logs to display</div>
                                    </div>
                              ) : (
                                    logs.map((entry, index) => <LogLine key={index} entry={entry} index={index} />)
                              )}
                        </ScrollArea>
                  </CardContent>

                  {/* Footer */}
                  <CardFooter className="!px-6 !py-3 border-t bg-gray-50 dark:bg-gray-900 h-[50px] rounded-b-2xl">
                        <div className="flex justify-between items-center text-xs text-gray-500 dark:text-gray-400 w-full">
                              <span>Execution completed</span>
                              <span>{new Date().toLocaleTimeString()}</span>
                        </div>
                  </CardFooter>
            </Card>
      )
}
