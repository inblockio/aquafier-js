import { AquaTree, FileObject, OrderRevisionInAquaTree } from "aqua-js-sdk"
import { ensureDomainUrlHasSSL } from "./url.utils"

export async function loadSignatureImage(aquaTree: AquaTree, fileObject: FileObject[], nonce: string): Promise<string | null | Uint8Array> {
    try {
        const signatureAquaTree = OrderRevisionInAquaTree(aquaTree)
        const fileobjects = fileObject

        const allHashes = Object.keys(signatureAquaTree!.revisions!)

        const thirdRevision = signatureAquaTree?.revisions[allHashes[2]]

        if (!thirdRevision) {
            return null
        }

        if (!thirdRevision.link_verification_hashes) {
            return null
        }

        const signatureHash = thirdRevision.link_verification_hashes[0]
        const signatureImageName = signatureAquaTree?.file_index[signatureHash]

        const signatureImageObject = fileobjects.find(e => e.fileName == signatureImageName)

        const fileContentUrl = signatureImageObject?.fileContent

        if (typeof fileContentUrl === 'string' && fileContentUrl.startsWith('http')) {
            let url = ensureDomainUrlHasSSL(fileContentUrl)
            let dataUrl = await fetchImage(url, `${nonce}`)

            if (!dataUrl) {
                dataUrl = `${window.location.origin}/images/placeholder-img.png`
            }

            return dataUrl
        } else if (fileContentUrl instanceof Uint8Array) {

            return fileContentUrl
        }
    }
    catch (error) {
        return `${window.location.origin}/images/placeholder-img.png`
    }
    return null
}




export const fetchImage = async (fileUrl: string, nonce: string) => {
      try {
          (`fetchImage fileUrl ${fileUrl}`)
            const actualUrlToFetch = ensureDomainUrlHasSSL(fileUrl)
            const response = await fetch(actualUrlToFetch, {
                  headers: {
                        nonce: `${nonce}`,
                  },
            })

            if (!response.ok) {
                  console.error('FFFailed to fetch file:', response.status, response.statusText)
                  return null
            }

            // Get content type from headers
            let contentType = response.headers.get('Content-Type') || ''

            // If content type is missing or generic, try to detect from URL
            if (contentType === 'application/octet-stream' || contentType === '') {
                  contentType = 'image/png'
            }

            if (contentType.startsWith('image')) {
                  const arrayBuffer = await response.arrayBuffer()
                  // Ensure we use the PDF content type
                  const blob = new Blob([arrayBuffer], { type: contentType })
                  return URL.createObjectURL(blob)
            }

            return null
      } catch (error) {
            console.error('Error fetching file:', error)
            return null
      }
}