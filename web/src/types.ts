import { IconType } from "react-icons/lib";

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


export interface WorkFlowTimeLine {

  id: number,
  title: string,
  icon: IconType,
  completed: boolean,
  content: JSX.Element


}