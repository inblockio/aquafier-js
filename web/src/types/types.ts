import { LogData, Revision } from "aqua-js-sdk";
import { IconType } from "react-icons/lib";

export interface Session {
  id: number;
  address: string;
  nonce: string;
  issuedAt: string; // ISO 8601 string format
  expirationTime: string; // ISO 8601 string format
}



export interface ApiFileData {
  fileHash: string,
  fileData: string | ArrayBuffer
}


export interface SummaryDetailsDisplayData {

  revisionHashWithSignaturePositionCount: number
  revisionHashWithSignaturePosition: String
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


// Interface for signature position
export interface SignaturePosition {
  id: string;
  pageIndex: number;
  x: number;
  y: number;
  width: number;
  height: number;
  isDragging?: boolean;
  signatureId?: string; // Reference to the signature that was placed
}

// Interface for signature data
export interface SignatureData {
  id: string;
  hash: string;
  dataUrl: string;
  walletAddress: string;
  name: string;
  createdAt: Date;
}

// export interface IQuickSignature {
//     x: string,
//     y: string,
//     width: string,
//     height: string,
//     image: string,
//     name: string,
//     walletAddress: string,
//     page: string | number
// }


export interface ContractDocumentViewProps {
    setActiveStep: (step: number) => void
    updateDocumentIconInWorkflowTabs: (isWorkFlowOk: boolean) => void
}

export interface SignatureRichData {
   id: string;
    height: any;
    width: any;
    x: any;
    y: any;
    page: any;
    name: string;
    walletAddress: string;
    image: string;
  createdAt: Date;
    dataUrl: string;
}