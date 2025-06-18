import { LogData, Revision } from "aqua-js-sdk";
import { IconType } from "react-icons/lib";
import { ApiFileInfo } from "../models/FileInfo";

export interface Session {
  id: number;
  address: string;
  nonce: string;
  issuedAt: string; // ISO 8601 string format
  expirationTime: string; // ISO 8601 string format
}

export interface IShareButton {
    item: ApiFileInfo
    nonce: string

}

export interface ApiFileData {
  fileHash: string,
  fileData: string | ArrayBuffer
}


export interface SummaryDetailsDisplayData {

  revisionHashWithSignaturePositionCount: number
  revisionHashWithSignaturePosition: string
  revisionHashWithSinatureRevision: string,
  revisionHashMetamask : string,
  walletAddress : string
}


export interface WebSocketMessage {
  action: string;
  type: string;
  // data: any;
  // timestamp: string;
  // connectedClients?: number;
  // userId?: string;
  // targetUserId?: string;
  // targetUserIds?: string[];
  // sender?: string;
}

 
export interface WorkFlowTimeLine {

  id: number,
  title: string,
  icon: IconType,
  completed: boolean,
  content: JSX.Element,
  revisionHash: string,

}

export interface RevisionVerificationStatus {
  revision: Revision,
  revisionHash: string,
  verficationStatus: boolean | null
  isVerified: boolean,
  logData: LogData[]
}


export interface UploadLinkAquaTreeExpectedData {
        expectedFileName: string,
        displayText: string,
        exectedFileHash: string,
        itemRevisionHash: string,
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
    fileIndex: number
    uploadedIndexes: number[]
    updateUploadedIndex: (fileIndex: number) => void
    autoUpload: boolean
}


export interface ImportChainFromChainProps { fileInfo: ApiFileInfo, isVerificationSuccessful: boolean | null, contractData?: any }

export interface BtnContent {
    text: string
    color: string
}
export interface SignatureData {
    type: 'signature';
   id: string;
    height: number;
    width: number;
    x: number;
    y: number;
    imageWidth: number;
    imageHeight : number;
    imageAlt:string;
    page: number;
    name: string;
    walletAddress: string;
    hash: string;
    createdAt: Date;
    dataUrl: string;
    rotation: number
    isDragging?: boolean;
    signatureId?: string; 
    walletAddressFontSize?: string; 
    nameColor?: string; 
    nameFontSize?: string; 
    walletAddressColor?: string; 
}



export interface ContractDocumentViewProps {
    setActiveStep: (step: number) => void
}

