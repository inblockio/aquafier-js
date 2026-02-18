import { useEffect } from 'react'

interface MarkdownPreviewProps {
      renderMarkdown: () => Promise<void>
      markdownContainerRef: React.RefObject<HTMLDivElement | null>
}

export function MarkdownPreview({ renderMarkdown, markdownContainerRef }: MarkdownPreviewProps) {
      useEffect(() => {
            renderMarkdown()
      }, [])

      return (
            <div className="p-4 max-h-[600px] overflow-auto">
                  <div
                        ref={markdownContainerRef}
                        className="markdown-preview prose prose-sm max-w-none"
                        style={{
                              fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
                              lineHeight: '1.6',
                              color: '#333',
                        }}
                  >
                        {/* Markdown will be rendered here */}
                  </div>
                  <style>{`
                        .markdown-preview h1 { font-size: 2em; font-weight: bold; margin: 0.67em 0; border-bottom: 1px solid #eee; padding-bottom: 0.3em; }
                        .markdown-preview h2 { font-size: 1.5em; font-weight: bold; margin: 0.75em 0; border-bottom: 1px solid #eee; padding-bottom: 0.3em; }
                        .markdown-preview h3 { font-size: 1.17em; font-weight: bold; margin: 0.83em 0; }
                        .markdown-preview h4 { font-size: 1em; font-weight: bold; margin: 1em 0; }
                        .markdown-preview h5 { font-size: 0.83em; font-weight: bold; margin: 1.17em 0; }
                        .markdown-preview h6 { font-size: 0.67em; font-weight: bold; margin: 1.33em 0; }
                        .markdown-preview p { margin: 1em 0; }
                        .markdown-preview ul, .markdown-preview ol { margin: 1em 0; padding-left: 2em; }
                        .markdown-preview li { margin: 0.5em 0; }
                        .markdown-preview code { background-color: #f6f8fa; padding: 0.2em 0.4em; border-radius: 3px; font-family: monospace; font-size: 0.9em; }
                        .markdown-preview pre { background-color: #f6f8fa; padding: 1em; border-radius: 3px; overflow-x: auto; }
                        .markdown-preview pre code { background-color: transparent; padding: 0; }
                        .markdown-preview blockquote { border-left: 4px solid #ddd; padding-left: 1em; color: #666; margin: 1em 0; }
                        .markdown-preview a { color: #0366d6; text-decoration: none; }
                        .markdown-preview a:hover { text-decoration: underline; }
                        .markdown-preview table { border-collapse: collapse; width: 100%; margin: 1em 0; }
                        .markdown-preview th, .markdown-preview td { border: 1px solid #ddd; padding: 0.5em; text-align: left; }
                        .markdown-preview th { background-color: #f6f8fa; font-weight: bold; }
                        .markdown-preview img { max-width: 100%; height: auto; }
                        .markdown-preview hr { border: none; border-top: 1px solid #eee; margin: 2em 0; }
                  `}</style>
            </div>
      )
}
