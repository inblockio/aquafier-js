import { ApiFileInfo } from './FileInfo'

export interface RevionOperation {
      apiFileInfo: ApiFileInfo
      backendUrl: string
      revision: string
      nonce: string
      index: number
      children?: React.ReactNode
}
