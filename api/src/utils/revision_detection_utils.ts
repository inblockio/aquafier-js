import {
    AquaTree,
    OrderRevisionInAquaTree,
} from 'aqua-js-sdk';
import Logger from './logger';

export const isWorkFlowData = (aquaTree: AquaTree, systemAndUserWorkFlow: string[]): { isWorkFlow: boolean; workFlow: string } => {
    let falseResponse = {
        isWorkFlow: false,
        workFlow: ""
    }
    // Logger.info("System workflows: ", systemAndUserWorkFlow)

    //order revision in aqua tree
    let aquaTreeRevisionsOrderd = OrderRevisionInAquaTree(aquaTree)
    let allHashes = Object.keys(aquaTreeRevisionsOrderd.revisions)
    if (allHashes.length <= 1) {
        return falseResponse
    }
    let secondRevision = aquaTreeRevisionsOrderd.revisions[allHashes[1]]
    if (!secondRevision) {
        Logger.warn(`Aqua tree has second revision not found`)
        return falseResponse
    }
    if (secondRevision.revision_type == 'link') {

        //get the  system aqua tree name
        let secondRevision = aquaTreeRevisionsOrderd.revisions[allHashes[1]]
        // Logger.info(` second hash used ${allHashes[1]}  second revision ${JSON.stringify(secondRevision, null, 4)} tree ${JSON.stringify(aquaTreeRevisionsOrderd, null, 4)}`)

        if (secondRevision.link_verification_hashes == undefined) {
            return falseResponse
        }
        let revisionHash = secondRevision.link_verification_hashes[0]
        let name = aquaTreeRevisionsOrderd.file_index[revisionHash]

        // if (systemAndUserWorkFlow.map((e)=>e.replace(".json", "")).includes(name)) {

        // try with hash
        if (systemAndUserWorkFlow.includes(revisionHash)) {
            return {
                isWorkFlow: true,
                workFlow: name
            }
        }

        // trye with name
        let nameWithoutJson = "--error--";
        if (name) {
            nameWithoutJson = name.replace(".json", "")
            if (systemAndUserWorkFlow.map((e) => e.replace(".json", "")).includes(nameWithoutJson)) {
                return {
                    isWorkFlow: true,
                    workFlow: nameWithoutJson
                }
            }
        }
        return {
            isWorkFlow: false,
            workFlow: ""
        }


    }
    // Logger.info(`Aqua tree has second revision is of type ${secondRevision.revision_type}`)


    return falseResponse
}

export function isAquaTree(content: any): boolean {
    let json = null
    let isJsonAlready = true
    if (typeof content === 'string') {
        isJsonAlready = false
    }
    if (isJsonAlready) {
        json = content
    } else {
        try {
            json = JSON.parse(content)
        } catch (e) {
            return false
        }
    }
    // Check if content has the properties of an AquaTree
    return json && typeof json === 'object' && 'revisions' in json && 'file_index' in json
}


export function getAquatreeObject(content: any): AquaTree {
    let isJsonAlready = true
    if (typeof content === 'string') {
        isJsonAlready = false
        return JSON.parse(content)
    }
    return content
}

export function replaceWalletInPubKeyHash(pubKeyHash: string, newWallet: string): string | null {
    const regex = /_(\w+)$/;
    const match = pubKeyHash.match(regex);
    if (match) {
        return pubKeyHash.replace(match[1], newWallet);
    }
    return null;
}
