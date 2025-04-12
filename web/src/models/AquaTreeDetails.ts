import { Revision } from "aqua-js-sdk"
import { Session } from "../types"
import { ApiFileInfo } from "./FileInfo"

export interface IItemDetailData {
    label: string
    value: string
    displayValue: string
    showCopyIcon: boolean
}


export interface RevisionDetailsSummaryData {
    fileInfo: ApiFileInfo,
    isVerificationComplete: boolean,
    isVerificationSuccess: boolean,
    callBack?: (res: boolean) => void,
}

export interface AquaTreeDetailsViewData {
    fileInfo: ApiFileInfo,
    isVerificationComplete: boolean,
    verificationResults: VerificationHashAndResult[],
}
export interface AquaTreeDetailsData {
    fileInfo: ApiFileInfo,
    isVerificationComplete: boolean,
    verificationResults: VerificationHashAndResult[],
    revision: Revision
    revisionHash: string

}

export interface IChainDetailsBtn {
    callBack: () => void
}

export interface AquaTreeDetails {
    fileInfo: ApiFileInfo
    session: Session
    callBack: (res: Array<boolean>, revisionCount: number) => void
}


export interface ICompleteChainView {
    callBack: (_drawerStatus: IDrawerStatus) => void
}

export interface IDrawerStatus {
    colorLight: string
    colorDark: string
    fileName: string
    isVerificationSuccessful: boolean
}


export interface VerificationHashAndResult {
    hash: string,
    isSuccessful: boolean | null
}