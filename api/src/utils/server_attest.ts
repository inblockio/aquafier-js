import Aquafier, { AquaTree, AquaTreeWrapper, FileObject } from "aqua-js-sdk";
import path from 'path';
import { getAquaAssetDirectory, getFileUploadDirectory } from "./file_utils";
import { getGenesisHash } from "./aqua_tree_utils";
import fs from "fs";
import { dummyCredential, getRandomNumber, getServerWalletInformation } from "./server_utils";
import { getAquaTreeFileName, getPort } from "./api_utils";
import Logger from "./logger";
import { prisma } from "../database/db";
import { saveAquaTree, transferRevisionChainData } from "./revisions_utils";
import { createAquaTreeFromRevisions } from "./revisions_operations_utils";
import { getAddress } from "ethers";

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


export async function serverAttestation(identityClaimId: string, walletAddress: string, workflowName: "email_claim" | "phone_number_claim"): Promise<{
    aquaTree: AquaTree,
    attestationJSONfileData: Object,
    attestationJSONfileName: string
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

    // Step 1: Query for server identity claim (simple_claim)
    const serverWalletAddr = getAddress(serverWalletInformation.walletAddress)
    const url = `http://localhost:${getPort()}`

    const serverLatestEntries = await prisma.latest.findMany({
        where: { user: serverWalletAddr }
    })

    let serverIdentityAquaTree: AquaTree | null = null
    let serverIdentityFileObjects: FileObject[] = []

    for (const entry of serverLatestEntries) {
        try {
            const [aquaTree, fileObjects] = await createAquaTreeFromRevisions(entry.hash, url)
            const genHash = getGenesisHash(aquaTree)
            if (genHash) {
                const genRevision = aquaTree.revisions[genHash]
                if (genRevision && genRevision["forms_type"] === "simple_claim") {
                    serverIdentityAquaTree = aquaTree
                    serverIdentityFileObjects = fileObjects
                    break
                }
            }
        } catch (error) {
            Logger.error(`Error reconstructing aqua tree for latest entry ${entry.hash}: ${error}`)
        }
    }

    if (!serverIdentityAquaTree) {
        Logger.info("Server identity claim not found, proceeding without identity link")
    }

    // Step 2: Create server attestation
    let context = ""
    if (workflowName === "email_claim") {
        context = "The Aqua Server hereby attests that a one-time password (OTP) challenge for the specified email address was successfully sent and verified using the Twilio Verify API. This confirms possession of the email address at the time of verification."
    } else if (workflowName === "phone_number_claim") {
        context = "The Aqua Server hereby attests that a one-time password (OTP) challenge for the specified phone number was successfully sent and verified using the Twilio Verify API. This confirms possession of the phone number at the time of verification."
    }

    const attestationForm = {
        "identity_claim_id": identityClaimId,
        "context": context,
        "attestion_type": "server",
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

    let name = getAquaTreeFileName(templateInformation.templateAquaTree);
    if (name.length == 0) {
        name = "identity_attestation.json"
    }

    const templateFileObject: FileObject = {
        fileName: name,
        fileContent: templateInformation.templateAquaTreeDataContent,
        path: ""
    }

    const wrapThis: AquaTreeWrapper = {
        aquaTree: templateInformation.templateAquaTree,
        fileObject: templateFileObject,
        revision: ""
    }

    const linkedAquaTreeResult = await aquafier.linkAquaTree(aquatreeWrapperToWrapTo, wrapThis, false)

    // Logger.info(`linkedAquaTreeResult: isErr=${linkedAquaTreeResult.isErr()}`)

    if (linkedAquaTreeResult.isErr()) {
        Logger.error(`Error linking aqua tree ${linkedAquaTreeResult.data}`)
        return null;
    }

    let currentAquaTree = linkedAquaTreeResult.data.aquaTree!

    // Step 3: Link server identity into the attestation
    if (serverIdentityAquaTree) {
        let identityName = getAquaTreeFileName(serverIdentityAquaTree);
        if (identityName.length === 0) {
            identityName = "identity_claim.json"
        }

        const serverIdentityFileObject: FileObject = {
            fileName: identityName,
            fileContent: JSON.stringify(serverIdentityAquaTree),
            path: ""
        }

        const serverIdentityWrapper: AquaTreeWrapper = {
            aquaTree: serverIdentityAquaTree,
            fileObject: serverIdentityFileObject,
            revision: ""
        }

        const attestationWrapperForIdentityLink: AquaTreeWrapper = {
            aquaTree: currentAquaTree,
            fileObject: fileObject,
            revision: ""
        }

        const identityLinkedResult = await aquafier.linkAquaTree(attestationWrapperForIdentityLink, serverIdentityWrapper, false)

        if (identityLinkedResult.isErr()) {
            Logger.error(`Error linking server identity: ${identityLinkedResult.data}`)
        } else {
            currentAquaTree = identityLinkedResult.data.aquaTree!
            Logger.info("Server identity linked into attestation successfully")
        }

        // Step 4: Transfer server identity to user context
        await prisma.users.upsert({
            where: { address: walletAddress },
            create: { address: walletAddress },
            update: {}
        });

        const transferResult = await transferRevisionChainData(
            walletAddress,
            { aquaTree: serverIdentityAquaTree, fileObject: serverIdentityFileObjects },
            null,
            true
        )

        if (!transferResult.success) {
            Logger.error(`Error transferring server identity to user: ${transferResult.message}`)
        } else {
            Logger.info(`Server identity transferred to user ${walletAddress}`)
        }
    }

    // Step 5: Sign the attestation
    const creds = dummyCredential()
    creds.mnemonic = serverWalletInformation.mnemonic
    const aquaTreeWrapper: AquaTreeWrapper = {
        aquaTree: currentAquaTree,
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
        attestationJSONfileData: attestationForm,
        attestationJSONfileName: fileName
    }
}

export async function createServerIdentity() {

    const aquafier = new Aquafier()
    const templateItem = "identity_claim"

    const templateInformation = getTemplateInformation(templateItem)

    const serverWalletInformation = await getServerWalletInformation()

    if (!serverWalletInformation) {
        // throw new Error("Server wallet information is not defined");
        Logger.info("Server wallet information is not defined");
        return null;
    }

    let walletAddress = getAddress(serverWalletInformation.walletAddress)

    // First check if this claim already exists in the server

    const res = await prisma.revision.findFirst({
        where: {
            AND: {
                previous: {
                    equals: ""
                },
                revision_type: {
                    equals: "form"
                },
                pubkey_hash: {
                    startsWith: walletAddress
                }
            },
        },
        select: {
            AquaForms: {
                where: {
                    AND: {
                        key: {
                            equals: "forms_type"
                        },
                        value: {
                            equals: "simple_claim"
                        }
                    }
                }
            }
        }
    })

    console.log("Res: ", res)

    if (res) {
        return
    }

    const identityClaimForm = {
        "name": "AquaFire Server",
        "claim_context": "Self issued server identity",
        "type": "simple_claim",
        "wallet_address": walletAddress,
    }



    let randomNum = getRandomNumber(999, 9999)
    let fileName = `identity_claim_server_${randomNum}.json`

    const fileObject: FileObject = {
        fileName: fileName,
        fileContent: JSON.stringify(identityClaimForm),
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

    let name = getAquaTreeFileName(templateInformation.templateAquaTree);
    if (name.length == 0) {
        name = "identity_claim.json"
    }

    const templateFileObject: FileObject = {
        fileName: name,
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

    const signedIdentityClaimAquaTree = signAquaTreeResult.data.aquaTree

    // Save the file

    let genesisHash = getGenesisHash(signedIdentityClaimAquaTree!)

    if (genesisHash == null) {
        throw Error(`genesis hash of attested aqua tree casnnot be null`)
    }

    // let filepubkeyhash = `${session.address}_${genesisHash}`
    let filepubkeyhash = `${walletAddress}_${genesisHash}`


    let fileData = JSON.stringify(identityClaimForm)
    let fileHash = aquafier.getFileHash(fileData)

    let genRevision = signedIdentityClaimAquaTree!.revisions[genesisHash]
    if (!genRevision) {
        throw Error(`genesis revision of attested aqua tree casnnot be null`)
    }
    let aquaTreeFilehash = genRevision[`file_hash`]
    if (fileHash != aquaTreeFilehash) {
        throw Error(`file hash doo not match aquaTreeFilehash ${aquaTreeFilehash} == generated ${fileHash}`)
    }

    let existingFileIndex = await prisma.fileIndex.findFirst({
        where: { file_hash: fileHash },
    });

    // Create unique filename
    await prisma.fileName.upsert({
        where: {
            pubkey_hash: filepubkeyhash,
        },
        create: {
            pubkey_hash: filepubkeyhash,
            file_name: fileName,
        },
        update: {
            file_name: fileName,
        }
    })

    if (existingFileIndex != null) {
        Logger.info(`Update file index counter`)

        await prisma.fileIndex.update({
            where: { file_hash: existingFileIndex.file_hash },
            data: {
                pubkey_hash: [...existingFileIndex.pubkey_hash, filepubkeyhash]//`${session.address}_${genesisHash}`]
            }
        });


    } else {
        const UPLOAD_DIR = getFileUploadDirectory();


        let aquaTreeName = await aquafier.getFileByHash(signedIdentityClaimAquaTree!, genesisHash);
        if (aquaTreeName.isOk()) {
            fileName = aquaTreeName.data
        }
        // const filename = `${randomUUID()}-${fileName}`;
        const filePath = path.join(UPLOAD_DIR, fileName);

        // Save the file
        // await pump(data.file, fs.createWriteStream(filePath))
        await fs.promises.writeFile(filePath, fileData);


        await prisma.file.create({
            data: {

                file_hash: fileHash,
                file_location: filePath,

            }
        })

        await prisma.fileIndex.create({
            data: {

                pubkey_hash: [filepubkeyhash],
                file_hash: fileHash,

            }
        })


    }

    // Ensure the server wallet address exists in the users table
    // to satisfy the foreign key constraint on the latest table
    await prisma.users.upsert({
        where: { address: walletAddress },
        create: { address: walletAddress },
        update: {}
    });

    await saveAquaTree(signedIdentityClaimAquaTree!, walletAddress, null, true)

    // return {
    //     aquaTree: signedAttestation!!,
    //     attestationJSONfileData : attestationForm,
    //     attestationJSONfileName : fileName
    // }
}


export async function generateENSClaim(ensName: string, ensExpiry: string, walletAddress: string): Promise<{
    aquaTree: AquaTree,
    ensJSONfileData: Object,
    ensJSONfileName: string
} | null> {

    const aquafier = new Aquafier()
    const templateItem = "ens_claim"

    const templateInformation = getTemplateInformation(templateItem)

    const serverWalletInformation = await getServerWalletInformation()

    if (!serverWalletInformation) {
        // throw new Error("Server wallet information is not defined");
        Logger.info("Server wallet information is not defined");
        return null;
    }


    const ensForm = {
        "ens_name": ensName,
        "wallet_address": walletAddress,
        "expiry": ensExpiry
    }

    // console.log(ensForm)

    let randomNum = getRandomNumber(999, 9999)
    let fileName = `ens_claim_${randomNum}.json`

    const fileObject: FileObject = {
        fileName: fileName,
        fileContent: Buffer.from(JSON.stringify(ensForm)),
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

    let name = getAquaTreeFileName(templateInformation.templateAquaTree);
    if (name.length == 0) {
        name = "ens_claim.json"
    }

    const templateFileObject: FileObject = {
        fileName: name,
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
        ensJSONfileData: ensForm,
        ensJSONfileName: fileName
    }
}