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


export interface IAccountContracts {
  inline: boolean
  open: boolean
  updateOpenStatus: (open: boolean) => void
}

export interface IDialogSettings {
  inline?: boolean
  open?: boolean
  updateOpenStatus?: (open: boolean) => void
}

export interface IVersionAndDisclaimer {
  inline?: boolean
  open?: boolean
  updateOpenStatus?: (open: boolean) => void
}

export interface ISidebarNavItem {
  icon: React.ReactNode
  label: string
  onClick?: () => void
  href?: string
}