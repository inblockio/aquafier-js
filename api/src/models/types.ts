import { AquaTree, FileObject, Revision as AquaRevision, Revision, FileIndex, } from 'aqua-js-sdk';
import { WebSocket as WSWebSocket } from 'ws';


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
  };
  files: {
    total: number;
    newToday: number;
    growth: string;
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
    averages: {
      revisionsPerContract: string;
      filesPerRevision: string;
      contractsPerUser: string;
    };
  };
  timestamp: string;
}

export interface AquaTemplatesFields {

  name: string,
  label: string,
  type: string,
  required: boolean,
  isArray: boolean,
  isHidden: boolean,
  isEditable: boolean,
  isVerifiable: boolean,
  description : string,
  placeholder : string
  supportText : string
  defaultValue? : string
}


// Interface for client connection with user ID
export interface ClientConnection {
  socket: WSWebSocket;
  userId: string;
  connectedAt: Date;
}

export interface LinkedRevisionResult {
    aquaTree: AquaTree;
    fileObjects: FileObject[];
}

// Fixed interfaces to match the actual implementation
export interface ExtendedAquaTreeData {
  revisions: Record<string, any>; // Changed from Revision to any to match implementation
  file_index: Record<string, string>; // Changed from FileIndex to Record<string, string>
  linkedChains?: { [key: string]: ExtendedAquaTreeData }; // Made optional and self-referencing
  fileObjects?: FileObject[]; // Added optional fileObjects property
}

// Extend AquaTree interface to include linkedChains
export interface ExtendedAquaTree extends AquaTree {
  linkedChains?: { [key: string]: ExtendedAquaTreeData }; // Changed to reference ExtendedAquaTreeData
  fileObjects?: FileObject[]; // Added optional fileObjects property
}

export interface AquaTreeFileData {
  name: string;
  fileHash: string;
  fileLocation: string;
  referenceCount: Number;
  pubKeyHash: string;
}

// Return type for updateGenesisFileIndex function
export interface UpdateGenesisResult {
  aquaTree: AquaTree;
  fileObjects: FileObject[];
  revisionData: AquaRevision;
}
// Return type for processRevision function
export interface ProcessRevisionResult {
    aquaTree: AquaTree;
    fileObjects: FileObject[];
}

export interface ServerWalletInformation {
    mnemonic: string;
    walletAddress: string;
    privateKey: string;
    publicKey: string;
}

export interface ScrapedData {
    title: string;
    headings: string[];
    links: Array<{ text: string; href: string }>;
    paragraphs: string[];
    images: Array<{ src: string; alt: string }>;
    tradeNameDetails?: TradeNameDetails;
}

export interface TradeNameDetails {
    county: string;
    status: string;
    trade_name: string;
    file_number: string;
    formation_date: string;
    filed_date: string;
    address_1: string;
    address_2: string;
    city: string;
    state: string;
    zip_code: string;
    phone: string;
    affiant: string;
    affiant_title: string;
    parent_company: string;
    nature_of_business: string;
    termination_date: string;
    last_updated_on: string;
}
