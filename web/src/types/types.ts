import { AquaTree, LogData, Revision } from 'aqua-js-sdk'
import { IconType } from 'react-icons/lib'
import { ApiFileInfo, ClaimInformation, IAttestationEntry } from '../models/FileInfo'

export interface ApiFilePaginationData {
      currentPage: number
      totalPages: number
      totalItems: number
      itemsPerPage: number
      hasNextPage: boolean
      hasPreviousPage: boolean
      startIndex: number;
      endIndex: number;
}

export interface ApiFileInfoState {
      fileData: ApiFileInfo[],
      status: 'loading' | 'loaded' | 'error' | 'idle'
      error?: string
      pagination?: ApiFilePaginationData
}


export interface AquaJsonNameWithHash {
      name: string,
      hash: string
}
export interface AquaJsonManifestFileInZip {
      type: "aqua_workspace_backup" | "aqua_file_backup",
      version: string,
      createdAt: string,
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
      AUTH_PROVIDER?: "wallet_connect" | "metamask"
      ENABLE_CRYPTO_PAYMENTS?: boolean
      ENABLE_STRIPE_PAYMENTS?: boolean
      DEFAULT_PAYMENT_METHOD?: "CRYPTO" | "STRIPE"
}
export interface DNSProof {
      walletAddress: string;
      domainName: string;
      timestamp: string;
      expiration: string;
      signature: string;
}

export interface Session {
      id: number
      address: string
      nonce: string
      issuedAt: string // ISO 8601 string format
      expirationTime: string // ISO 8601 string format
}

export interface ApiFileData {
      fileHash: string
      fileData: string | ArrayBuffer
}

export interface IProfileClaim {
      name: string;
      claimValues: string[];
}

export interface ContactProfile {
      walletAddress: string
      files: Array<ApiFileInfo>

      // Extra fields
      name?: string;
      phone?: string;
      email?: string;
      ensName?: string;
      // A construction of all searchable details
      searchString?: string;
      claims: Record<string, string[]>
}



export interface FilesListProps {
      showHeader?: boolean
      showCheckbox?: boolean
      showFileActions: boolean
      activeFile: ApiFileInfo | null
      selectedFiles: Array<ApiFileInfo>
      onFileDeSelected: (file: ApiFileInfo) => void
      onFileSelected: (file: ApiFileInfo) => void
      hideAllFilesAndUserAquaFiles?: boolean // Hide "All Files" and "User Aqua files" tabs
      allowedWorkflows?: string[] // Only show these specific workflow tabs (if provided, filters all workflows)
}

export interface OpenDialog {
      dialogType: 'share_dialog' | 'form_template_editor' | 'aqua_file_details' | 'identity_claim' | 'dns_claim' | 'dba_claim' | 'aqua_sign' | 'identity_attestation' | 'early_bird_offer' | 'user_signature' | 'email_claim' | 'phone_number_claim' | 'explorer_workspace_download' | 'identity_card' | 'aqua_certificate' | 'aquafier_licence',//'file' | 'folder' | 'contract' | 'claim' | 'claim-attestation'
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
      nonce?: string
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
      description: string
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
      showButtonOnly: boolean
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
      selectedFileInfo: ApiFileInfo
}

export interface DateRangeQuery {
      startDate?: string;
      endDate?: string;
      tables?: string; // comma-separated list of table names
}

export interface TableMetrics {
      tableName: string;
      total: number;
      inRange: number;
      percentage: string;
}

export interface AdvancedMetricsResponse {
      dateRange: {
            start: string;
            end: string;
      };
      tables: TableMetrics[];
      summary: {
            totalRecordsAcrossAllTables: number;
            totalRecordsInRange: number;
      };
      timestamp: string;
}

export interface MetricsResponse {
      users: {
            total: number;
            newToday: number;
            growth: string;
      };
      contracts: {
            total: number;
            newToday: number;
            growth: string;
      };
      revisions: {
            total: number;
            newToday: number;
            growth: string;
            breakdown: Array<{ type: string | null; count: number }>;
      };
      files: {
            total: number;
            newToday: number;
            growth: string;
      };
      payments: {
            total: number;
            totalAmount: string;
            newToday: number;
            growth: string;
            breakdown: Array<{ status: string; count: number }>;
      };
      additionalMetrics: {
            activeUsers: {
                  last24Hours: number;
                  last7Days: number;
                  last30Days: number;
            };
            templates: {
                  total: number;
                  publicTemplates: number;
            };
            signatures: {
                  total: number;
                  newToday: number;
            };
            witnesses: {
                  total: number;
                  newToday: number;
            };
            notifications: {
                  total: number;
                  unread: number;
                  newToday: number;
            };
            revisionStats: {
                  form: { total: number; newToday: number };
                  link: { total: number; newToday: number };
                  file: { total: number; newToday: number };
            };
            averages: {
                  revisionsPerContract: string;
                  filesPerRevision: string;
                  contractsPerUser: string;
            };
      };
      timestamp: string;
}

export interface IWorkflowItem {
      workflowName: string
      apiFileInfo: ApiFileInfo
      index?: number
      openDrawer?: (fileInfo: ApiFileInfo, attestors: ICertificateAttestor[]) => void
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

export interface IUserStats {
      filesCount: number,
      storageUsed: number,
      claimTypeCounts: {
            user_files: number,
            access_agreement: number,
            aqua_sign: number,
            cheque: number,
            dba_claim: number,
            identity_attestation: number,
            identity_claim: number,
            user_signature: number,
            domain_claim: number,
            email_claim: number,
            phone_number_claim: number,
            user_profile: number
      }
}

export const emptyUserStats: IUserStats = {
      filesCount: 0,
      storageUsed: 0,
      claimTypeCounts: {
            user_files: 0,
            access_agreement: 0,
            aqua_sign: 0,
            cheque: 0,
            dba_claim: 0,
            identity_attestation: 0,
            identity_claim: 0,
            user_signature: 0,
            domain_claim: 0,
            email_claim: 0,
            phone_number_claim: 0,
            user_profile: 0
      }
}


export interface ICertificateAttestor {
      context: string
      walletAddress: string
}

export interface IAquaCertWorkflowDrawer {
      open: boolean
      onClose?: () => void
      attestors: ICertificateAttestor[]
      fileInfo?: ApiFileInfo
}


export interface IAquaCertFileInfoProcessResult {
      error?: string, data: {
            genesisRevision: Revision,
            linkedRevisions: Revision[],
            linkedVerificationHashes: string[]
      }
}