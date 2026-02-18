interface MediaPreviewProps {
      fileURL: string
      fileType: string
      fileName: string
}

export function MediaPreview({ fileURL, fileType, fileName }: MediaPreviewProps) {
      // Audio files
      if (fileType.startsWith('audio/')) {
            return (
                  <div>
                        <audio controls style={{ width: '100%' }}>
                              <source src={fileURL} type={fileType} />
                              Your browser does not support the audio element.
                        </audio>
                        <div style={{ marginTop: '10px' }}>
                              <a href={fileURL} download={fileName || 'audio'} style={{ color: 'blue', textDecoration: 'underline' }}>
                                    Download audio file
                              </a>
                        </div>
                  </div>
            )
      }

      // Video files
      const videoType = fileType.startsWith('video/') ? fileType : 'video/mp4'

      return (
            <div>
                  <video
                        controls
                        style={{
                              maxWidth: '100%',
                              height: 'auto',
                              backgroundColor: '#000',
                              borderRadius: '4px',
                        }}
                  >
                        <source src={fileURL} type={videoType} />
                        Your browser does not support the video element.
                  </video>
                  <div style={{ marginTop: '10px' }}>
                        <a href={fileURL} download={fileName || 'video'} style={{ color: 'blue', textDecoration: 'underline' }}>
                              Download video file
                        </a>
                  </div>
            </div>
      )
}
