import { Revision } from 'aqua-js-sdk'
import { ReactNode } from 'react'
import { SummaryDetailsDisplayData } from './types'

export interface Signer {
      address: string
      status: 'signed' | 'pending' | 'rejected' // Added other potential statuses
}

export interface Activity {
      type: 'created' | 'signed' | 'completed' | 'rejected' // Added other potential types
      address?: string // Optional since 'completed' activity doesn't have it
      timestamp: string
      details?: ReactNode // Optional since not all activities have it
}

export interface ContractWorkflowData {
      name: string
      creationDate: string // Could also use Date type if you parse it
      creatorAddress: string
      documentUrl: string
      status: 'completed' | 'pending' | 'draft' | 'rejected' // Added other potential statuses
      pendingSignatures: number
      signers: Signer[]
      activities: Activity[]
      isValid?: boolean
      footerMsg?: string
}

export interface IContractWorkFlowFirstPage {
      data: ContractWorkflowData
      goToSecondPage: () => void
      enableNameResolution: boolean
      isValidTree: 'pending' | 'successful' | 'failed'
}

export interface IContractInformation {
      firstRevisionData: Revision
      fileNameData: string
      creatorEthereumSignatureRevisionData: Revision | undefined
      contractCreatorAddress: string
      isWorkFlowComplete: string[]
      signatureRevisionHashes: SummaryDetailsDisplayData[]
}
