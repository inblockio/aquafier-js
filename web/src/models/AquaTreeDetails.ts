import { Session } from "../types"
import { ApiFileInfo } from "./FileInfo"

export interface AquaTreeDetails {
    fileInfo: ApiFileInfo
    session: Session
    callBack: (res: Array<boolean>, revisionCount: number) => void
}
