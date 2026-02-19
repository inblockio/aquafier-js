import { FilePreviewAquaTreeFromTemplate } from '../file_preview_aqua_tree_from_template'

interface JsonPreviewProps {
      textContent: string
}

export function JsonPreview({ textContent }: JsonPreviewProps) {
      return (
            <div className="p-2 h-full overflow-y-auto">
                  <FilePreviewAquaTreeFromTemplate formData={JSON.parse(textContent)} />
            </div>
      )
}
