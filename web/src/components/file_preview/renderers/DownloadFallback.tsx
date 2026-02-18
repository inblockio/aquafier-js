interface DownloadFallbackProps {
      fileURL: string
      fileType: string
      fileName: string
}

export function DownloadFallback({ fileURL, fileType, fileName }: DownloadFallbackProps) {
      return (
            <div
                  style={{
                        padding: '20px',
                        border: '1px solid #ddd',
                        borderRadius: '4px',
                        textAlign: 'center',
                  }}
            >
                  <div style={{ marginBottom: '20px' }}>
                        <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="#666" strokeWidth="2">
                              <path d="M13 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z"></path>
                              <polyline points="13 2 13 9 20 9"></polyline>
                        </svg>
                        <h3 style={{ margin: '10px 0', fontSize: '18px' }}>File: {fileName || 'Unknown'}</h3>
                        <p>Type: {fileType}</p>
                  </div>
                  <a
                        href={fileURL}
                        download={fileName || 'file'}
                        style={{
                              color: '#fff',
                              backgroundColor: '#4285f4',
                              padding: '10px 15px',
                              borderRadius: '4px',
                              textDecoration: 'none',
                              display: 'inline-block',
                        }}
                  >
                        Download File
                  </a>
            </div>
      )
}
