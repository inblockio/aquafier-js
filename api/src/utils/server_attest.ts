import Aquafier, {AquaTree, AquaTreeWrapper, FileObject} from "aqua-js-sdk";
import path from 'path';
import {getAquaAssetDirectory} from "./file_utils";
import {getGenesisHash} from "./aqua_tree_utils";
import fs from "fs";
import {dummyCredential, getRandomNumber, getServerWalletInformation} from "./server_utils";
import {getAquaTreeFileName} from "./api_utils";
import Logger from "./logger";

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


export async function serverAttestation(identityClaimId: string,  walletAddress: string, workflowName: "email_claim" | "phone_number_claim"): Promise<{
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

    let context = ""
    if(workflowName === "email_claim"){
        context = "The Aqua Server hereby attests that a one-time password (OTP) challenge for the specified email address was successfully sent and verified using the Twilio Verify API. This confirms possession of the email address at the time of verification."
    }else if(workflowName === "phone_number_claim"){
        context = "The Aqua Server hereby attests that a one-time password (OTP) challenge for the specified phone number was successfully sent and verified using the Twilio Verify API. This confirms possession of the phone number at the time of verification."
    }

    const attestationForm = {
        "identity_claim_id": identityClaimId,
        "context": context,
        "attestion_type":"server",
        "wallet_address": serverWalletInformation.walletAddress,
        "claim_wallet_address": walletAddress,
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