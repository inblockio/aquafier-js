import { AquaTree, FileObject, Revision as AquaRevision, } from 'aqua-js-sdk';
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