import { SignatureData } from "../../../../types/types";

export interface BaseAnnotation {
  id: string;
  page: number;
  x: number; // percentage
  y: number; // percentage
  // width & height are type-specific
  rotation: number; // degrees
}

export interface TextAnnotation extends BaseAnnotation {
  type: 'text';
  text: string;
  fontSize: string; // in pixels relative to a default PDF page size, or PDF points
  fontFamily: string;
  color: string;
  width: number; // percentage
  height: number; // percentage
}

export interface ImageAnnotation extends BaseAnnotation {
  type: 'image';
  src: string; // data URL
  alt: string;
  width: string; // e.g., "100px", "25%", "5em"
  height: string; // e.g., "80px", "15%", "3em"
}

export interface ProfileAnnotation extends BaseAnnotation {
  type: 'profile';
  name: string;
  walletAddress: string;
  
  imageSrc: string; // data URL for the image
  imageAlt: string;
  imageWidth: string; // e.g., "50px", "25%"
  imageHeight: string; // e.g., "50px", "15%"

  nameFontSize?: string; // e.g., "12pt", "16px"
  nameColor?: string; // hex color
  walletAddressFontSize?: string; // e.g., "10pt", "14px"
  walletAddressColor?: string; // hex color
}

export type Annotation = TextAnnotation | ImageAnnotation | ProfileAnnotation | SignatureData;
