import { getLanguageFromType } from '../constants'

interface CodePreviewProps {
      textContent: string
      fileType: string
}

export function CodePreview({ textContent, fileType }: CodePreviewProps) {
      const language = getLanguageFromType(fileType)

      return (
            <div
                  style={{
                        whiteSpace: 'pre-wrap',
                        wordBreak: 'break-word',
                        fontFamily: 'Consolas, Monaco, "Courier New", monospace',
                        fontSize: '14px',
                        padding: '15px',
                        backgroundColor: '#f6f8fa',
                        border: '1px solid #d1d5da',
                        borderRadius: '6px',
                        maxHeight: '600px',
                        overflow: 'auto',
                        lineHeight: '1.5',
                  }}
            >
                  {language && (
                        <div style={{
                              fontSize: '12px',
                              color: '#6a737d',
                              marginBottom: '10px',
                              fontWeight: 'bold'
                        }}>
                              {language.toUpperCase()}
                        </div>
                  )}
                  <code>{textContent}</code>
            </div>
      )
}
