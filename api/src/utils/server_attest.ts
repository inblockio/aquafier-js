import Aquafier, { AquaTreeWrapper, FileObject } from "aqua-js-sdk";
import path from 'path';
import { getAquaAssetDirectory } from "./file_utils";
import { getGenesisHash } from "./aqua_tree_utils";
import fs from "fs";
import { AquaTree } from "aqua-js-sdk";
import { dummyCredential, getServerWalletInformation } from "./server_utils";
import { getAquaTreeFileName } from "./api_utils";

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
    // console.log(`Template ${templateItem} with genesis hash ${genHash}`)

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



export async function serverAttestation(identityClaimId: string) {

    const aquafier = new Aquafier()
    const templateItem = "identity_attestation"

    const templateInformation = getTemplateInformation(templateItem)

    const serverWalletInformation = await getServerWalletInformation()

    // console.log("Server wallet information", serverWalletInformation)

    if (!serverWalletInformation) {
        throw new Error("Server wallet information is not defined");
    }

    const attestationForm = {
        "identity_claim_id": identityClaimId,
        "context": "This identity claim is automatically attested by the server.",
        "wallet_address": serverWalletInformation.walletAddress
    }

    const fileObject: FileObject = {
        fileName: `identity_attestation_server_${identityClaimId.substring(0, 4)}.json`,
        fileContent: JSON.stringify(attestationForm),
        path: ""
    }

    const genesisAquaTreeResult = await aquafier.createGenesisRevision(fileObject, true, false, false)

    // console.log(`\n ## genesisAquaTreeResult ${JSON.stringify(genesisAquaTreeResult)}`)

    if (genesisAquaTreeResult.isErr()) {
        throw new Error(`Error creating genesis aqua tree ${genesisAquaTreeResult.data}`)
    }
    const genesisAquaTree = genesisAquaTreeResult.data.aquaTree

    const aquatreeWrapperToWrapTo: AquaTreeWrapper = {
        aquaTree: genesisAquaTree!,
        fileObject: fileObject,
        revision: ""
    }

    const templateFileObject: FileObject = {
        fileName: getAquaTreeFileName(templateInformation.templateAquaTree),
        fileContent: templateInformation.templateAquaTreeDataContent,
        path: ""
    }

    const wrapThis: AquaTreeWrapper = {
        aquaTree: templateInformation.templateAquaTree,
        fileObject: templateFileObject,
        revision: ""
    }

    const linkedAquaTreeResult = await aquafier.linkAquaTree(aquatreeWrapperToWrapTo, wrapThis, false)

    // console.log(`\n ## linkedAquaTreeResult ${JSON.stringify(linkedAquaTreeResult)}`)

    if (linkedAquaTreeResult.isErr()) {
        throw new Error(`Error linking aqua tree ${linkedAquaTreeResult.data}`)
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

    // console.log(`\n ## signAquaTreeResult ${JSON.stringify(signAquaTreeResult)}`)

    if (signAquaTreeResult.isErr()) {
        throw new Error(`Error signing aqua tree ${signAquaTreeResult.data}`)
    }

    const signedAttestation = signAquaTreeResult.data.aquaTree

    //   console.log(`\n ## signedAttestation: `, JSON.stringify(signedAttestation, null, 4))

    return signedAttestation
}