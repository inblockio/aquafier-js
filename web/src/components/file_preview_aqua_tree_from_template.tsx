import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Copy, Check, Sun, Moon, Calendar } from 'lucide-react'

// Utility function to make words readable
const makeProperReadableWord = (word: string) => {
      return word
            .replace(/([A-Z])/g, ' $1')
            .replace(/^./, str => str.toUpperCase())
            .replace(/_/g, ' ')
            .trim()
}

export const FilePreviewAquaTreeFromTemplateOne = ({ userData }: { userData: Record<string, string> }) => {
      const [isDarkMode, setIsDarkMode] = useState(false)

      useEffect(() => {
            injectGlobalStyles()
      }, [])

      // Check local storage for theme on component mount
      useEffect(() => {
            const savedTheme = localStorage.getItem('theme')
            if (savedTheme === 'dark') {
                  setIsDarkMode(true)
            }
      }, [])

      // Update local storage when theme changes
      useEffect(() => {
            localStorage.setItem('theme', isDarkMode ? 'dark' : 'light')
      }, [isDarkMode])

      // Toggle dark mode
      const toggleDarkMode = () => {
            setIsDarkMode(prev => !prev)
      }

      return (
            <div className={`min-h-screen flex items-center justify-center p-4 transition-colors ${isDarkMode ? 'bg-slate-900' : 'bg-slate-50'}`}>
                  <Button
                        variant="outline"
                        size="icon"
                        className={`fixed top-4 right-4 transition-colors ${isDarkMode ? 'bg-slate-700 hover:bg-slate-600 border-slate-600' : 'bg-slate-200 hover:bg-slate-300'}`}
                        onClick={toggleDarkMode}
                  >
                        {isDarkMode ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
                  </Button>

                  <div className="p-6">
                        {Object.keys(userData).map(keyItem => (
                              <div key={keyItem} className={`p-4 rounded-xl mb-4 transition-transform hover:scale-101 ${isDarkMode ? 'bg-slate-700' : 'bg-slate-50'}`}>
                                    <div className="flex items-center gap-2 text-xs font-medium mb-2">
                                          <Calendar className="h-4 w-4 text-green-500" />
                                          <span className={isDarkMode ? 'text-slate-300' : 'text-slate-500'}>{keyItem}</span>
                                    </div>
                                    <div className={`font-medium ${isDarkMode ? 'text-slate-50' : 'text-slate-800'}`}>{userData[keyItem]}</div>
                              </div>
                        ))}
                  </div>
            </div>
      )
}

// Clipboard component using /components/ patterns
const ClipboardButton = ({ value, visible }: { value: string; visible: boolean }) => {
      const [copied, setCopied] = useState(false)

      const handleCopy = async () => {
            try {
                  await navigator.clipboard.writeText(value)
                  setCopied(true)
                  setTimeout(() => setCopied(false), 2000)
            } catch (err) {
                  console.error('Failed to copy text: ', err)
            }
      }

      if (!visible) return null

      return (
            <Button variant="ghost" size="sm" className="h-6 w-6 p-0 ml-2" onClick={handleCopy}>
                  {copied ? <Check className="h-3 w-3 text-green-500" /> : <Copy className="h-3 w-3" />}
            </Button>
      )
}

export const FilePreviewAquaTreeFromTemplate = ({ formData }: { formData: Record<string, string> }) => {
      const keys = Object.keys(formData)

      const checkCopyButtonVisibility = (formKey: string) => {
            const fieldsToWatch = ['address', 'hash']
            let isVisible = false

            for (const field of fieldsToWatch) {
                  if (formKey.toLowerCase().includes(field)) {
                        isVisible = true
                        break
                  }
            }
            return isVisible
      }

      const renderItemValue = (value: any) => {
            if (typeof value === 'object') {
                  return (
                        <span key={JSON.stringify(value)} className="text-sm">
                              {JSON.stringify(value)}
                        </span>
                  )
            } else if (typeof value === 'string' && value.includes(',')) {
                  return value.split(',').map((item: string) => (
                        <span key={item} className="text-sm block">
                              {item}
                        </span>
                  ))
            } else if (typeof value === 'number') {
                  return (
                        <span key={value} className="text-sm break-all whitespace-pre-wrap">
                              {value}
                        </span>
                  )
            }
            return (
                  <span key={value} className="text-sm break-all whitespace-pre-wrap">
                        {value}
                  </span>
            )
      }

      return (
            <div className="rounded-xl border overflow-hidden">
                  <table className="w-full">
                        <thead className="bg-muted/50">
                              <tr className="border-b">
                                    <th className="text-left p-3 font-semibold">Field</th>
                                    <th className="text-left p-3 font-semibold">Value</th>
                              </tr>
                        </thead>
                        <tbody>
                              {keys.sort().map((keyItem, index: number) => (
                                    <tr key={`item_${index}_${keyItem}`} className="border-b hover:bg-muted/50">
                                          <td className="p-3 font-medium">{makeProperReadableWord(keyItem)}</td>
                                          <td className="p-3">
                                                <div className="flex items-start justify-between">
                                                      <div className="flex-1">{renderItemValue(formData[keyItem])}</div>
                                                      <ClipboardButton value={formData[keyItem]} visible={checkCopyButtonVisibility(keyItem)} />
                                                </div>
                                          </td>
                                    </tr>
                              ))}
                        </tbody>
                  </table>
            </div>
      )
}

// Add keyframes for fadeIn animation
const injectGlobalStyles = () => {
      const style = document.createElement('style')
      style.textContent = `
    @keyframes fadeIn {
      from {
        opacity: 0;
        transform: translateY(10px);
      }
      to {
        opacity: 1;
        transform: translateY(0);
      }
    }
    
    .animate-fadeIn {
      animation: fadeIn 0.6s ease-out;
    }
    
    .hover\\:scale-101:hover {
      transform: scale(1.01);
    }
  `
      document.head.appendChild(style)
}

// Example usage with sample data
const ExampleUsage = () => {
      const userData = {
            name: 'kenn',
            surname: 'kamau',
            type: 'awesome',
            date_of_birth: '11.05.2024',
            wallet_address: '0x677e5E9a3badb280d7393464C09490F813d6d6ef',
            email: 'kamaukenn11@gmail.com',
      }

      return (
            <div className="p-8 space-y-8">
                  <div>
                        <h2 className="text-2xl font-bold mb-4">Template One</h2>
                        <FilePreviewAquaTreeFromTemplateOne userData={userData} />
                  </div>

                  <div>
                        <h2 className="text-2xl font-bold mb-4">Template Two</h2>
                        <FilePreviewAquaTreeFromTemplate formData={userData} />
                  </div>
            </div>
      )
}

export default ExampleUsage
