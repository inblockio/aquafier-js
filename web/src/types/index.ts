// Define types for the application

// Type for file data cache
export interface ApiFileDataItem {
  fileHash: string;
  fileData: string | ArrayBuffer;
}

export type ApiFileData = ApiFileDataItem[];

// Export session type
export interface Session {
  address: string;
  nonce: string;
  chainId?: string;
}
