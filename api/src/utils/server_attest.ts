import Aquafier, {AquaTree, AquaTreeWrapper, FileObject} from "aqua-js-sdk";
import path from 'path';
import {getAquaAssetDirectory} from "./file_utils";
import {getGenesisHash} from "./aqua_tree_utils";
import fs from "fs";
import {dummyCredential, getRandomNumber, getServerWalletInformation} from "./server_utils";
import {getAquaTreeFileName} from "./api_utils";
import Logger from "./Logger";

interface TemplateInformation {
    templateAquaTreeData: string;
    templateAquaTreeDataContent: string;
    templateAquaTree: AquaTree;
    genHash: string;
}

export function getTemplateInformation(templateItem: string): TemplateInformation {

    let templateAquaTreeData = path.join(getAquaAssetDirectory(), `${templateItem}.json.aqua.json`);

    let templateAquaTreeDataContent = fs.readFileSync(templateAquaTreeData, 'utf8')
    let templateAquaTree: AquaTree = JSON.parse(templateAquaTreeDataContent)
    let genHash = getGenesisHash(templateAquaTree);

    if (!genHash) {
        throw new Error(`Genesis hash for template ${templateItem} is not defined`);
    }

    return {
        templateAquaTreeData,
        templateAquaTreeDataContent,
        templateAquaTree,
        genHash
    }
}


export async function serverAttestation(identityClaimId: string,  walletAddress: string): Promise<{
    aquaTree : AquaTree,
    attestationJSONfileData : Object, 
    attestationJSONfileName : string
} | null> {

    const aquafier = new Aquafier()
    const templateItem = "identity_attestation"

    const templateInformation = getTemplateInformation(templateItem)

    const serverWalletInformation = await getServerWalletInformation()

    if (!serverWalletInformation) {
        // throw new Error("Server wallet information is not defined");
        Logger.info("Server wallet information is not defined");
        return null;
    }

    const attestationForm = {
        "identity_claim_id": identityClaimId,
        "context": "I hereby attest that this identity claim has been verified and validated by the Aqua Protocol server. The claim holder has successfully completed all required verification processes, including but not limited to email verification, identity validation, and compliance checks. This attestation is issued automatically upon successful completion of the verification workflow and serves as cryptographic proof of the server's validation of the presented identity credentials.",
        "wallet_address": serverWalletInformation.walletAddress,
        "forms_claim_wallet_address": walletAddress,
    }



    let randomNum = getRandomNumber(999, 9999)
    let fileName = `identity_attestation_server_${randomNum}.json`

    const fileObject: FileObject = {
        fileName: fileName,
        fileContent: JSON.stringify(attestationForm),
        path: ""
    }

    const genesisAquaTreeResult = await aquafier.createGenesisRevision(fileObject, true, false, false)

    if (genesisAquaTreeResult.isErr()) {
        Logger.error(`Error creating genesis aqua tree ${genesisAquaTreeResult.data}`)
        return null;
    }
    const genesisAquaTree = genesisAquaTreeResult.data.aquaTree

    const aquatreeWrapperToWrapTo: AquaTreeWrapper = {
        aquaTree: genesisAquaTree!,
        fileObject: fileObject,
        revision: ""
    }

    let name =  getAquaTreeFileName(templateInformation.templateAquaTree);
    if(name.length==0){
        name="identity_attestation.json"
    }

    const templateFileObject: FileObject = {
        fileName:name,
        fileContent: templateInformation.templateAquaTreeDataContent,
        path: ""
    }

    const wrapThis: AquaTreeWrapper = {
        aquaTree: templateInformation.templateAquaTree,
        fileObject: templateFileObject,
        revision: ""
    }

    const linkedAquaTreeResult = await aquafier.linkAquaTree(aquatreeWrapperToWrapTo, wrapThis, false)

    Logger.info(`linkedAquaTreeResult: isErr=${linkedAquaTreeResult.isErr()}`)

    if (linkedAquaTreeResult.isErr()) {
        Logger.error(`Error linking aqua tree ${linkedAquaTreeResult.data}`)
        return null;
    }
    const creds = dummyCredential()
    creds.mnemonic = serverWalletInformation.mnemonic
    const linkedAquaTree = linkedAquaTreeResult.data.aquaTree
    const aquaTreeWrapper: AquaTreeWrapper = {
        aquaTree: linkedAquaTree!,
        fileObject: fileObject,
        revision: ""
    }
    const signAquaTreeResult = await aquafier.signAquaTree(aquaTreeWrapper, "cli", creds)

    if (signAquaTreeResult.isErr()) {
        Logger.error(`Error signing aqua tree ${signAquaTreeResult.data}`)
        return null;
    }

    const signedAttestation = signAquaTreeResult.data.aquaTree

    return {
        aquaTree: signedAttestation!!,
        attestationJSONfileData : attestationForm,
        attestationJSONfileName : fileName
    }
}