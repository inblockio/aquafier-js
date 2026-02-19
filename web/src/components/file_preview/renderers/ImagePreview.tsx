interface ImagePreviewProps {
      fileURL: string
      isHeic: boolean
      convertedHeicUrl: string | null
}

export function ImagePreview({ fileURL, isHeic, convertedHeicUrl }: ImagePreviewProps) {
      if (isHeic && convertedHeicUrl == null) {
            return <p>Loading Heic Image...</p>
      }

      const previewUrl = convertedHeicUrl || fileURL
      return (
            <div className='p-2 max-h-[100%] overflow-y-auto'>
                  <img src={previewUrl} alt="File preview" style={{ maxWidth: '100%', height: 'auto' }} />
            </div>
      )
}
