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




export interface SignatureData {
   id: string;
    height: number;
    width: number;
    x: number;
    y: number;
    page: number;
    name: string;
    walletAddress: string;
    hash: string;
    createdAt: Date;
    dataUrl: string;
    isDragging?: boolean;
    signatureId?: string; 
}



export interface ContractDocumentViewProps {
    setActiveStep: (step: number) => void
    updateDocumentIconInWorkflowTabs: (isWorkFlowOk: boolean) => void
}

