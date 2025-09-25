import { AquaTree, LogData, Revision } from 'aqua-js-sdk'
import { IconType } from 'react-icons/lib'
import { ApiFileInfo, ClaimInformation, IAttestationEntry } from '../models/FileInfo'

export interface ApiFileInfoState {
      fileData: ApiFileInfo[],
      status: 'loading' | 'loaded' | 'error' | 'idle'
      error?: string
}


export interface AquaJsonNameWithHash      {
            name : string,
            hash: string
        }
export interface AquaJsonManifestFileInZip       {
      
    genesis: string,
    name_with_hash: Array<AquaJsonNameWithHash>
       
}
export interface ImportZipAquaTreeConflictResolutionDialogProps {
      localFile: ApiFileInfo,
      incomingFileName: string,
      incomingFileAquaTree: AquaTree
}

export interface ApiInfoData {
      status: 'ok',
      isTwilioEnabled: boolean,
      isS3Enabled: boolean,
      isDbCOnnectionOk: boolean
}
export interface WebConfig {
      SENTRY_DSN?: string
      CUSTOM_LANDING_PAGE_URL?: string | boolean
      CUSTOM_LOGO_URL?: string | boolean
      BACKEND_URL?: string
      CUSTOM_NAME?: string
      CUSTOM_DESCRIPTION?: string
}
export interface DNSProof {
      walletAddress: string;
      domainName: string;
      timestamp: string;
      expiration: string;
      signature: string;
}


export interface FilesListProps {

      showHeader?: boolean
      showCheckbox?: boolean
      showFileActions: boolean
      activeFile: ApiFileInfo | null
      selectedFiles: Array<ApiFileInfo>
      onFileDeSelected: (file: ApiFileInfo) => void
      onFileSelected: (file: ApiFileInfo) => void
}
export interface OpenDialog {
      dialogType: 'share_dialog' | 'form_template_editor' | 'aqua_file_details' | 'identity_claim' | 'dns_claim' | 'dba_claim' | 'aqua_sign' | 'identity_attestation' | 'early_bird_offer' | 'user_signature' | 'email_claim' | 'phone_number_claim',//'file' | 'folder' | 'contract' | 'claim' | 'claim-attestation'
      isOpen: boolean
      onClose: () => void
      onConfirm: (data: any) => void
}
export interface Session {
      id: number
      address: string
      nonce: string
      issuedAt: string // ISO 8601 string format
      expirationTime: string // ISO 8601 string format
}

export interface IShareButton {
      item: ApiFileInfo
      nonce: string
      children?: React.ReactNode
      index?: number,
      autoOpenShareDialog?: boolean
}

export interface ApiFileData {
      fileHash: string
      fileData: string | ArrayBuffer
}

export interface UploadStatus {
      file: File
      status: 'pending' | 'uploading' | 'success' | 'error'
      progress: number
      error?: string
      isJson?: boolean
      isZip?: boolean
      isJsonForm?: boolean
      isJsonAquaTreeData?: boolean
}

export interface SummaryDetailsDisplayData {
      revisionHashWithSignaturePositionCount: number
      revisionHashWithSignaturePosition: string
      revisionHashWithSinatureRevision: string
      revisionHashMetamask: string
      walletAddress: string
}

export interface FileSelectEvent extends React.ChangeEvent<HTMLInputElement> { }
export interface DropEvent extends React.DragEvent<HTMLDivElement> { }
// interface ChangeEvent extends React.ChangeEvent<HTMLInputElement> {}

export interface FileItemWrapper {
      status: 'pending' | 'uploading' | 'success' | 'error'
      file: File
      isJson: boolean
      isLoading: boolean
      isZip: boolean
      isJsonForm: boolean
      isJsonAquaTreeData: boolean
}

export interface WebSocketMessage {
      action: string
      type: string
      // data: any;
      // timestamp: string;
      // connectedClients?: number;
      // userId?: string;
      // targetUserId?: string;
      // targetUserIds?: string[];
      // sender?: string;
}
export interface Contract {
      hash: string
      genesis_hash?: string
      latest?: string
      sender?: string
      // receiver?: string
      recipients: string[]
      option?: string
      reference_count?: number
      file_name?: string
      created_at?: string
}

export interface WorkFlowTimeLine {
      id: number
      title: string
      icon: IconType
      completed: boolean
      content: React.JSX.Element
      revisionHash: string
}

export interface RevisionVerificationStatus {
      revision: Revision
      revisionHash: string
      verficationStatus: boolean | null
      isVerified: boolean
      logData: LogData[]
}

export interface UploadLinkAquaTreeExpectedData {
      expectedFileName: string
      displayText: string
      exectedFileHash: string
      itemRevisionHash: string
      isAquaFile: boolean
}
export interface IDropzoneAction2 {
      aquaFile: File
      fileIndex: number
      uploadedIndexes: number[]
      updateUploadedIndex: (fileIndex: number) => void
      autoUpload: boolean
}
export interface IDropzoneAction {
      file: File
      // fileIndex: number,
      filesWrapper: FileItemWrapper,
      removeFilesListForUpload: (file: FileItemWrapper) => void
      // uploadedIndexes: number[]
      // updateUploadedIndex: (fileIndex: number) => void
      autoUpload: boolean
}

export interface ImportChainFromChainProps {
      fileInfo: ApiFileInfo
      isVerificationSuccessful: boolean | null
      contractData?: any
}

export interface BtnContent {
      text: string
      color: string
}
export interface SignatureData {
      type: 'signature'
      id: string
      height: number
      width: number
      x: number
      y: number
      imageWidth: number
      imageHeight: number
      imageAlt: string
      page: number
      name: string
      walletAddress: string
      hash: string
      createdAt: Date
      dataUrl: string
      rotation: number
      isDragging?: boolean
      signatureId?: string
      walletAddressFontSize?: string
      nameColor?: string
      nameFontSize?: string
      walletAddressColor?: string
}

export interface ContractDocumentViewProps {
      setActiveStep: (step: number) => void
}

export interface IWorkflowItem {
      workflowName: string
      apiFileInfo: ApiFileInfo
      index?: number
}


export interface IIdentityClaimDetails {
      name: string
}

export interface ICompleteClaimInformation {
      file: ApiFileInfo,
      processedInfo: ClaimInformation,
      attestations: Array<IAttestationEntry>,
      sharedContracts: Contract[]
}