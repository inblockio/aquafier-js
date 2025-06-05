import { AquaTree, FileObject, Revision as AquaRevision, Revision, FileIndex, } from 'aqua-js-sdk';
import { WebSocket as WSWebSocket } from 'ws';

export interface AquaTemplatesFields {

  name: string,
  label: string,
  type: string,
  required: boolean,
  isArray: boolean
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