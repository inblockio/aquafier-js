export interface Session {
    id: number;
    address: string;
    nonce: string;
    issuedAt: string; // ISO 8601 string format
    expirationTime: string; // ISO 8601 string format
  }


  export interface ApiFileData {
    fileHash : string,
    fileData :  string | ArrayBuffer
  }