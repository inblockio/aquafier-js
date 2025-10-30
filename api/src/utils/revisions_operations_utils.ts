import {
    AquaTree,
    FileObject,
    OrderRevisionInAquaTree,
    reorderRevisionsProperties,
    Revision as AquaRevision
} from 'aqua-js-sdk';

import {prisma} from '../database/db';
// For specific model types
import {AquaForms, Link, Prisma, Revision, Signature, WitnessEvent} from '@prisma/client';
import * as fs from "fs"
import path from 'path';
import {getGenesisHash, getAquaTreeFileName} from './aqua_tree_utils';
import {AquaTreeFileData, LinkedRevisionResult, ProcessRevisionResult, UpdateGenesisResult} from '../models/types';
import {SYSTEM_WALLET_ADDRESS, systemTemplateHashes} from '../models/constants';
import {getFileSize} from "./file_utils";
import Logger from "./logger";
// import { getAquaTreeFileName } from '../../../web/src/utils/functions';

// Main refactored function
export async function createAquaTreeFromRevisions(
    latestRevisionHash: string,
    url: string
): Promise<[AquaTree, FileObject[]]> {
    let aquaTree: AquaTree = {
        revisions: {},
        file_index: {}
    };
    let fileObjects: FileObject[] = [];

    try {
        // Step 1: Get all revisions in the chain
        const revisionData = await getRevisionChain(latestRevisionHash);

        if (revisionData.length === 0) {
            Logger.error(`Revision with hash ${latestRevisionHash} not found in system`);
            return [aquaTree, []];
        }

        // Logger.debug(`All revisions: ${JSON.stringify(revisionData, null, 4)}`)

        let revisionPubKeyHashes = revisionData.map(revision => revision.pubkey_hash);

        let userAddress = "";

        let first = revisionPubKeyHashes[0];
        if (first) {
            let items = first.split('_')
            userAddress = items[0]
        }
        let linkedPubKeyHashes = revisionData
            .filter(revision => revision.revision_type == 'link');


        for (const revision of linkedPubKeyHashes) {
            let linkHash = await prisma.link.findFirst({
                where: { hash: revision.pubkey_hash }
            });
            if (linkHash && linkHash.link_verification_hashes && linkHash.link_verification_hashes.length > 0) {

                let linkedPubKeyHash = linkHash.link_verification_hashes.map((hashDataItem) => {
                    if (systemTemplateHashes.includes(hashDataItem)) {
                        userAddress = SYSTEM_WALLET_ADDRESS
                    } else {
                        let first = revision.pubkey_hash
                        if (first) {
                            let items = first.split('_')
                            userAddress = items[0]
                        }
                    }

                    return `${userAddress}_${hashDataItem}`
                })

                revisionPubKeyHashes.push(...linkedPubKeyHash);
            }
        }

        let fileOrFormPubKeyHashes: string[] = []
        // sometimes a revision could be linked to another revision that is not a file or form
        // so we need to filter out those pubkey hashes
        for (let item of revisionPubKeyHashes) {
            let revData = revisionData.find(revision => revision.pubkey_hash == item);
            if (revData && (revData.revision_type == 'file' || revData.revision_type == 'form')) {
                fileOrFormPubKeyHashes.push(item);
            }
        }

        // Logger.info(`🎇🎇 All revision pubkey hashes ${JSON.stringify(fileOrFormPubKeyHashes, null, 4)}`)


        // Step 2: Get all associated files
        const aquaTreeFileData = await fetchAquaTreeFileData(revisionPubKeyHashes);
        console.log("aquaTreeFileData -- File indexes: ->", aquaTreeFileData.length)
        
        // Step 3: Create file objects for download
        fileObjects = await createFileObjects(aquaTreeFileData, url);
       console.log("aquaTreeFileData -- fileObjects : ->", fileObjects.length)


        
        // Logger.info("File indexe----: ", JSON.stringify(fileObjects, null, 4))

        // Step 4: Process each revision
        for (const revision of revisionData) {
            const processResult = await processRevision(revision, aquaTree, fileObjects, aquaTreeFileData, url);
            aquaTree = processResult.aquaTree;
            fileObjects = processResult.fileObjects;
        }

        const aquaTreeWithOrderdRevision = OrderRevisionInAquaTree(aquaTree);


        fileObjects.push(
            {
                fileContent: aquaTree,
                fileName: getAquaTreeFileName(aquaTree),
                path: '',
            }
        );

        return [aquaTreeWithOrderdRevision, fileObjects];

    } catch (error : any) {
        Logger.error('Error creating AquaTree:', error);
        throw new Error(`Failed to create AquaTree: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
}

// Helper functions

async function getRevisionChain(latestRevisionHash: string): Promise<Revision[]> {


    const latestRevision = await prisma.revision.findFirst({
        where: {
            pubkey_hash: latestRevisionHash
        }
    });



    if (!latestRevision) {
        return [];
    }

    const revisionData = [latestRevision];

    // Get previous revisions if they exist
    if (latestRevision.previous && latestRevision.previous.length > 0) {
        try {
            const previousRevisions = await findAquaTreeRevision(latestRevision.previous);
            revisionData.push(...previousRevisions);
        } catch (error : any) {
            throw new Error(`Error fetching previous revisions: ${JSON.stringify(error, null, 4)}`);
        }
    }

    return revisionData;
}

// Your existing helper functions
export async function findAquaTreeRevision(revisionHash: string): Promise<Array<Revision>> {
    let revisions: Array<Revision> = [];

    // fetch latest revision 
    let latestRevionData = await prisma.revision.findFirst({
        where: {
            pubkey_hash: revisionHash
        }
    });

    if (latestRevionData == null) {
        throw new Error(`Unable to get revision with hash ${revisionHash}`);
    }

    revisions.push(latestRevionData);

    if (latestRevionData?.previous) {
        let pubKey = revisionHash.split("_")[0];
        let previousWithPubKey = latestRevionData?.previous!!;

        if (!latestRevionData?.previous!!.includes("_")) {
            previousWithPubKey = `${pubKey}_${latestRevionData?.previous!!}`
        }
        let aquaTreerevision = await findAquaTreeRevision(previousWithPubKey);
        revisions.push(...aquaTreerevision)
    }

    return revisions;
}

// Define a union type for all possible return types
type RevisionInfo =
    | Prisma.SignatureGetPayload<{}>
    | Prisma.WitnessEventGetPayload<{}>
    | Prisma.LinkGetPayload<{}>
    | Prisma.AquaFormsGetPayload<{}>[]
    | null;

export async function FetchRevisionInfo(hash: string, revision: Revision): Promise<RevisionInfo> {
    // Logger.info(`⚠️⚠️ hash ${hash} `)
    if (revision.revision_type == "signature") {
        return await prisma.signature.findFirst({
            where: {
                hash: hash
            }
        });
    } else if (revision.revision_type == "witness") {
        let res = await prisma.witness.findFirst({
            where: {
                hash: hash
            }
        });
        // Logger.info("Witness: ", res);
        if (res == null) {
            // throw new Error(`witness is null ${revision.revision_type}`);
            Logger.info(`☢️☢️ witness is null with hash ${hash}`);
            return null;
        }
        return await prisma.witnessEvent.findFirst({
            where: {
                Witness_merkle_root: res.Witness_merkle_root!
            }
        });
    } else if (revision.revision_type == "form") {
        // Logger.info(`form where hash is ${hash}`)
        return await prisma.aquaForms.findMany({
            where: {
                hash: hash
            }
        });
    } else if (revision.revision_type == "link") {
        return await prisma.link.findFirst({
            where: {
                hash: hash
            }
        });
    } else {
        Logger.info(`type ${revision.revision_type} with hash ${hash}`);
        return null;
    }
}

function estimateStringFileSize(str: string): number {
    if (!str) return 0;

    return str.split('').reduce((acc, char) => {
        const code = char.charCodeAt(0);
        // UTF-8 encoding rules:
        // 1 byte for ASCII (0-127)
        // 2 bytes for extended ASCII (128-2047)
        // 3 bytes for most other characters (2048-65535)
        // 4 bytes for remaining Unicode (65536+)
        if (code < 128) return acc + 1;
        if (code < 2048) return acc + 2;
        if (code < 65536) return acc + 3;
        return acc + 4;
    }, 0);
}




async function fetchAquaTreeFileData(pubKeyHashes: string[]): Promise<AquaTreeFileData[]> {
    let allData: AquaTreeFileData[] = [];

    for (const pubKeyHash of pubKeyHashes) {

        const hashOnly = extractHashOnly(pubKeyHash);
        const fileIndex = await prisma.fileIndex.findFirst({
            where: {
                OR: [
                    { pubkey_hash: { has: pubKeyHash } },
                    { pubkey_hash: { has: hashOnly } }
                ]
            }
        });
        if (fileIndex) {

            let hashOnly = pubKeyHash.split("_")[1]
            const fileNameData = await prisma.fileName.findFirst({
                where: {
                    OR: [
                        { pubkey_hash: pubKeyHash },
                        {
                            pubkey_hash: {
                                contains: hashOnly,
                                mode: 'insensitive' // Makes the search case-insensitive
                            }
                        }
                    ]
                }
            });
            const fileData = await prisma.file.findFirst({
                where: {
                    file_hash: fileIndex.file_hash
                },
            });


            let data: AquaTreeFileData = {
                name: fileNameData?.file_name ?? "File name not found",
                fileHash: fileIndex.file_hash,
                referenceCount: fileIndex.pubkey_hash.length,
                fileLocation: fileData?.file_location ?? "File location not found",
                pubKeyHash: pubKeyHash

            }

            allData.push(data);
        } else {
            Logger.error(`💣💣💣 File index not found ..pubKeyHash ${pubKeyHash} --  ${hashOnly}`)


            
        }
    }

    return allData;
}

async function createFileObjects(aquaTreesFileData: AquaTreeFileData[], url: string): Promise<FileObject[]> {
    const fileObjects: FileObject[] = [];
    for (const item of aquaTreesFileData) {
        try {
            const fileStats = await getFileStats(item.fileLocation);
            if (!fileStats) continue;
            const fullUrl = `${url}/files/${item.fileHash}`;

            fileObjects.push({
                fileContent: fullUrl,
                fileName: item.name, // No uri in schema, use file_hash
                path: "",//item.fileLocation,
                fileSize: fileStats.fileSizeInBytes
            });
        } catch (error : any) {
            Logger.error(`Error processing file with hash ${item.fileHash} pub key hash ${item.pubKeyHash} :`, error);
        }
    }
    return fileObjects;
}




async function processRevision(
    revision: Revision,
    aquaTree: AquaTree,
    fileObjects: FileObject[],
    aquaTreeFileData: AquaTreeFileData[],
    url: string
): Promise<ProcessRevisionResult> {
    const hashOnly = extractHashOnly(revision.pubkey_hash);
    const previousHashOnly = extractHashOnly(revision.previous || "");

    // Create base revision data
    let revisionData: AquaRevision = {
        revision_type: revision.revision_type as "link" | "file" | "witness" | "signature" | "form",
        previous_verification_hash: previousHashOnly,
        local_timestamp: revision.local_timestamp?.toString() ?? "",
        leaves: revision.verification_leaves,
        version: "https://aqua-protocol.org/docs/v3/schema_2 | SHA256 | Method: scalar"
    };

    // Add content if revision has it
    if (revision.has_content) {
        revisionData = await addRevisionContent(revision, revisionData, aquaTreeFileData);
    }

    // Process based on revision type
    const processResult = await processRevisionByType(revision, revisionData, aquaTree, fileObjects, url);
    revisionData = processResult.revisionData;
    let updatedAquaTree = processResult.aquaTree;
    let updatedFileObjects = processResult.fileObjects;

    // Update file index for genesis revision
    if (previousHashOnly == "") {
        const genesisResult = await updateGenesisFileIndex(revision, revisionData, updatedAquaTree, updatedFileObjects, aquaTreeFileData, url);
        updatedAquaTree = genesisResult.aquaTree;
        updatedFileObjects = genesisResult.fileObjects;
        revisionData = genesisResult.revisionData;
    }

    if (revision.revision_type == "link") {
        const linkedRevisionResult = await updateLinkRevisionFileIndex(revision, revisionData, updatedAquaTree, updatedFileObjects, aquaTreeFileData, url);
        if (!linkedRevisionResult) {
            Logger.error(`Error processing link revision with hash ${revision.pubkey_hash}`);
            return { aquaTree, fileObjects };
        }
        updatedAquaTree = linkedRevisionResult.aquaTree;
        updatedFileObjects = linkedRevisionResult.fileObjects;
        revisionData = linkedRevisionResult.revisionData
    }

    // Add to aqua tree - create new tree with updated revisions
    const orderedRevision = reorderRevisionsProperties(revisionData);
    const newAquaTree: AquaTree = {
        ...updatedAquaTree,
        revisions: {
            ...updatedAquaTree.revisions,
            [hashOnly]: orderedRevision
        }
    };

    return {
        aquaTree: newAquaTree,
        fileObjects: updatedFileObjects
    };
}

// Return type for processRevisionByType function
interface ProcessRevisionByTypeResult {
    revisionData: AquaRevision;
    aquaTree: AquaTree;
    fileObjects: FileObject[];
}

async function processRevisionByType(
    revision: Revision,
    revisionData: AquaRevision,
    aquaTree: AquaTree,
    fileObjects: FileObject[],
    url: string
): Promise<ProcessRevisionByTypeResult> {
    const revisionInfo = await FetchRevisionInfo(revision.pubkey_hash, revision);
    // Logger.info(`revisionInfo = ${JSON.stringify(revisionInfo)}`)
    if (!revisionInfo && revision.revision_type !== "file") {
        Logger.warn(`Revision info not found for ${revision.pubkey_hash}`);
        return { revisionData, aquaTree, fileObjects };
    }

    switch (revision.revision_type) {
        case "file":
        case "form":
            const fileRevisionData = await processFileRevision(revision, revisionData, revisionInfo);
            return { revisionData: fileRevisionData, aquaTree, fileObjects };
        case "witness":
            const witnessRevisionData = processWitnessRevision(revisionData, revisionInfo as WitnessEvent);
            return { revisionData: witnessRevisionData, aquaTree, fileObjects };
        case "signature":
            const signatureRevisionData = processSignatureRevision(revisionData, revisionInfo as Signature);
            return { revisionData: signatureRevisionData, aquaTree, fileObjects };
        case "link":
            return await processLinkRevision(revisionData, revisionInfo as Link, aquaTree, fileObjects, url);
        default:
            Logger.warn(`Unknown revision type: ${revision.revision_type}`);
            return { revisionData, aquaTree, fileObjects };
    }
}

async function processFileRevision(revision: Revision, revisionData: AquaRevision, revisionInfo: RevisionInfo): Promise<AquaRevision> {
    const hashOnly = extractHashOnly(revision.pubkey_hash);
    const updatedRevisionData = {
        ...revisionData,
        file_nonce: revision.nonce ?? "--error--!"
    };

    // Try to find file directly
    let fileResult = await prisma.file.findFirst({
        where: {
            file_hash: {
                contains: hashOnly,
                mode: 'insensitive'
            }
        }
    });

    if (!fileResult) {
        // Try via file index
        const fileIndexResult = await prisma.fileIndex.findFirst({
            where: {
                pubkey_hash: {
                    has: hashOnly
                }
            }
        });

        if (fileIndexResult) {
            updatedRevisionData.file_hash = fileIndexResult.file_hash;
        } else {
            Logger.error(`Hash not found in file index: ${hashOnly}`);
        }
    } else {
        updatedRevisionData.file_hash = fileResult.file_hash ?? "**--error--***";
    }

    // Process form data if it's a form revision
    if (revision.revision_type === "form" && revisionInfo) {
        const formData = revisionInfo as AquaForms[];
        const formFields: Record<string, any> = {};
        for (const formItem of formData) {
            if (formItem.key) {
                formFields[formItem.key] = formItem.value;
            }
        }
        return { ...updatedRevisionData, ...formFields };
    }

    return updatedRevisionData;
}

function processWitnessRevision(revisionData: AquaRevision, witnessData: WitnessEvent): AquaRevision {
    return {
        ...revisionData,
        witness_merkle_root: witnessData.Witness_merkle_root,
        witness_timestamp: Number.parseInt(witnessData.Witness_timestamp!),
        witness_network: witnessData.Witness_network!,
        witness_smart_contract_address: witnessData.Witness_smart_contract_address!,
        witness_transaction_hash: witnessData.Witness_transaction_hash!,
        witness_sender_account_address: witnessData.Witness_sender_account_address!,
        witness_merkle_proof: [witnessData.Witness_merkle_root]
    };
}

function processSignatureRevision(revisionData: AquaRevision, signatureData: Signature): AquaRevision {
    let sig: string | Object = signatureData.signature_digest!;

    try {
        if (signatureData.signature_type?.includes("did")) {
            sig = JSON.parse(signatureData.signature_digest!);
        }
    } catch (error : any) {
        Logger.warn("Error parsing signature digest:", error);
    }

    return {
        ...revisionData,
        signature: sig,
        signature_public_key: signatureData.signature_public_key!,
        signature_wallet_address: signatureData.signature_wallet_address!,
        signature_type: signatureData.signature_type!
    };
}

async function processLinkRevision(
    revisionData: AquaRevision,
    linkData: Link,
    aquaTree: AquaTree,
    fileObjects: FileObject[],
    url: string
): Promise<ProcessRevisionByTypeResult> {
    const updatedRevisionData = {
        ...revisionData,
        link_type: linkData.link_type ?? "",
        link_verification_hashes: linkData.link_verification_hashes,
        link_file_hashes: linkData.link_file_hashes
    };

    if (!linkData.link_verification_hashes?.[0]) {
        Logger.error("No link verification hash found");
        return { revisionData: updatedRevisionData, aquaTree, fileObjects };
    }

    const linkedHash = linkData.link_verification_hashes[0];
    const linkedRevision = await prisma.revision.findFirst({
        where: {
            pubkey_hash: linkedHash
        }
    });

    if (!linkedRevision) {
        Logger.warn(`Linked revision not found for hash ${linkedHash}`);
        return { revisionData: updatedRevisionData, aquaTree, fileObjects };
    }

    if (linkedRevision.revision_type === "file" || linkedRevision.revision_type === "form") {
        const result = await processLinkedFileRevision(linkedHash, aquaTree, fileObjects, url);
        return {
            revisionData: updatedRevisionData,
            aquaTree: result.aquaTree,
            fileObjects: result.fileObjects
        };
    } else {
        const result = await processLinkedNonFileRevision(linkedHash, aquaTree, fileObjects, url);
        return {
            revisionData: updatedRevisionData,
            aquaTree: result.aquaTree,
            fileObjects: result.fileObjects
        };
    }
}


// Utility functions
function extractHashOnly(pubkeyHash: string): string {
    if (!pubkeyHash) return "";
    const parts = pubkeyHash.split("_");
    return parts.length > 1 ? parts[1] : pubkeyHash;
}

async function getFileStats(filePath: string): Promise<{ fileSizeInBytes: number; originalFilename: string; } | null> {
    try {
        const fullFilename = path.basename(filePath);
        const originalFilename = fullFilename.substring(fullFilename.indexOf('-') + 1);

        let size = await getFileSize(filePath);
        if (!size) {
            size = -1
        }
        return {
            fileSizeInBytes: size,
            originalFilename
        };
    } catch (error : any) {
        Logger.error(`Error getting file stats for ${filePath}:`, error);
        return null;
    }
}

async function updateLinkRevisionFileIndex(revision: Revision,
    revisionData: AquaRevision,
    aquaTree: AquaTree,
    fileObjects: FileObject[],
    aquaTreeFileData: AquaTreeFileData[],
    url: string
): Promise<UpdateGenesisResult | null> {
    //   const hashOnly = extractHashOnly(revision.);

    let linkData = await prisma.link.findFirst({
        where: {
            hash: revision.pubkey_hash
        }
    })

    if (linkData == null) {
        return { aquaTree, fileObjects, revisionData };
    }

    let userAddress = "";
    let newHash = linkData.link_verification_hashes[0]

    if (newHash == undefined) {
        throw Error(`Expected linked revision to have alteast one verification hash ${JSON.stringify(linkData)}`)

    }

    if (systemTemplateHashes.includes(newHash)) {
        userAddress = SYSTEM_WALLET_ADDRESS
    } else {
        let first = revision.pubkey_hash
        if (first) {
            let items = first.split('_')
            userAddress = items[0]
        }
    }


    let newPubKeyHash = `${userAddress}_${newHash}`


    let [linkedAquaTreeData, linkedFileObjects] = await createAquaTreeFromRevisions(newPubKeyHash, url);
    // Logger.info(` ✨✨ linkedAquaTreeData ${JSON.stringify(linkedAquaTreeData, null, 4)}`)
    let linkedAquaTreeDataGenesisHash = getGenesisHash(linkedAquaTreeData);

    if (linkedAquaTreeDataGenesisHash == null) {

        // throw Error(`Expected genesis hash ${newPubKeyHash}  not to be null ${JSON.stringify(linkedAquaTreeData, null, 4)}`)
        // Logger.error(`Expected genesis hash ${newPubKeyHash}  not to be null ${JSON.stringify(linkedAquaTreeData, null, 4)}`)
        return {
            aquaTree: aquaTree,
            fileObjects: fileObjects,
            revisionData: revisionData
        };

    }
    let genesisPubKeyHash = newPubKeyHash
    if (newHash != linkedAquaTreeDataGenesisHash) {
        // genesisHash = linkedAquaTreeDataGenesisHash
        genesisPubKeyHash = `${userAddress}_${linkedAquaTreeDataGenesisHash}`
    }


    // Logger.info(`🎇🎇 updateLinkRevisionFileIndex All revision pubkey hashes ${JSON.stringify(genesisPubKeyHash, null, 4)}`)
    const newAquaTreeFileData = await fetchAquaTreeFileData([genesisPubKeyHash]);

    let fileData = newAquaTreeFileData[0]
    if (fileData == undefined) {
        // throw Error(`Expected file in linked revision to  exist genesisPubKeyHash ${genesisPubKeyHash} newPubKeyHash ${newPubKeyHash} newAquaTreeFileData ${newAquaTreeFileData.length}`)
        Logger.error(`Expected file in linked revision to  exist genesisPubKeyHash ${genesisPubKeyHash} newPubKeyHash ${newPubKeyHash} newAquaTreeFileData ${newAquaTreeFileData.length}`)
        return null
    }

    // if it exist is okay to ovewrite in index
    const updatedAquaTree: AquaTree = {
        ...aquaTree,
        file_index: {
            ...aquaTree.file_index,
            [newHash]: fileData.name
        }
    };

    let updatedFileObjects = [...fileObjects];

    const fileStats = await getFileStats(fileData.fileLocation);
    if (fileStats) {
        const fullUrl = `${url}/files/${fileData.fileHash}`;
        let existInFileObjects = updatedFileObjects.find((e) => e.fileName == fileData.name)
        // add it to file objects array if it does not exist to avoid large payloads
        if (!existInFileObjects) {
            updatedFileObjects = [
                ...fileObjects,
                {
                    fileContent: fullUrl,
                    fileName: fileData.name, // file_hash as identifier
                    path: fileData.fileLocation,
                    fileSize: fileStats.fileSizeInBytes
                }
            ];
        }
    } else {
        Logger.error(`Expected file not found  fileData.fileLocation`)
        return null
    }

    let aquaJsonFile = `${fileData.name}.aqua.json`

    // let existInFileObjects = updatedFileObjects.find((e) => e.fileName == aquaJsonFile)
    // if (!existInFileObjects) {
    updatedFileObjects.push(
        {
            fileContent: linkedAquaTreeData,
            fileName: aquaJsonFile, // file_hash as identifier
            path: '',
            fileSize: 0
        }
    )
    // }


    // add the extra file objects only if the dont exist
    for (const newFileObject of linkedFileObjects) {
        let existInFileObjects = updatedFileObjects.find((e) => e.fileName == newFileObject.fileName)
        if (!existInFileObjects) {
            updatedFileObjects.push(newFileObject)
        }
    }


    return {
        aquaTree: updatedAquaTree,
        fileObjects: updatedFileObjects,
        revisionData: revisionData
    };
}


async function updateGenesisFileIndex(
    revision: Revision,
    revisionData: AquaRevision,
    aquaTree: AquaTree,
    fileObjects: FileObject[],
    aquaTreeFileData: AquaTreeFileData[],
    url: string
): Promise<UpdateGenesisResult> {
    const hashOnly = extractHashOnly(revision.pubkey_hash);
    let aquaTreeFileItemData = aquaTreeFileData.find(item =>
        item.pubKeyHash.includes(revision.pubkey_hash)
    );

    if (!aquaTreeFileItemData) {
        let allData = await fetchAquaTreeFileData([revision.pubkey_hash])
        if (allData.length == 0) {
            // throw Error(`Expectde revision file data found none ${revision.pubkey_hash}`)
            return { aquaTree, fileObjects, revisionData };
        } else if (allData.length > 1) {
            throw Error(`Expectd 1 revision file data found ${allData.length} `)
        } else {
            aquaTreeFileItemData = allData[0]
        }
    }

    const updatedAquaTree: AquaTree = {
        ...aquaTree,
        file_index: {
            ...aquaTree.file_index,
            [hashOnly]: aquaTreeFileItemData.name
        }
    };
    const updatedRevisionData = {
        ...revisionData,
        file_hash: aquaTreeFileItemData.fileHash
    };

    let updatedFileObjects = [...fileObjects];

    const fileStats = await getFileStats(aquaTreeFileItemData.fileLocation);
    if (fileStats) {
        const fullUrl = `${url}/files/${aquaTreeFileItemData.fileHash}`;

        let existInFileObjects = fileObjects.find((e) => e.fileName == aquaTreeFileItemData.name)
        // add it to file objects array if it does not exist to avoid large payloads
        if (!existInFileObjects) {

            updatedFileObjects = [
                ...fileObjects,
                {
                    fileContent: fullUrl,
                    fileName: aquaTreeFileItemData.name, // file_hash as identifier
                    path: "..",
                    fileSize: fileStats.fileSizeInBytes
                }
            ];
        }
    }

    return {
        aquaTree: updatedAquaTree,
        fileObjects: updatedFileObjects,
        revisionData: updatedRevisionData
    };

    
}

async function processLinkedFileRevision(
    linkedHash: string,
    aquaTree: AquaTree,
    fileObjects: FileObject[],
    url: string
): Promise<LinkedRevisionResult> {

    let aquaTreeFileData = await fetchAquaTreeFileData([linkedHash]);
    if (aquaTreeFileData.length === 0) {
        Logger.warn(`File index with hash ${linkedHash} not found`);
        return { aquaTree, fileObjects };
    }

    if (aquaTreeFileData.length > 1) {
        Logger.warn(`Multiple file entries found for hash ${linkedHash}, using the first one.`);
        throw new Error(`Multiple file entries found for hash ${linkedHash}`);

    }
    const updatedAquaTree: AquaTree = {
        ...aquaTree,
        file_index: {
            ...aquaTree.file_index,
            [linkedHash]: aquaTreeFileData[0].name
        }
    };
    const [linkedAquaTree, linkedFileObjects] = await createAquaTreeFromRevisions(linkedHash, url);
    const name = linkedAquaTree.file_index[linkedHash];
    const newFileObjects = [
        ...fileObjects,
        {
            fileContent: linkedAquaTree,
            fileName: `${name}.aqua.json+++`,
            path: `genesisHash ${linkedHash}`,
            fileSize: estimateStringFileSize(JSON.stringify(linkedAquaTree, null, 4))
        },
        ...linkedFileObjects
    ];
    return {
        aquaTree: updatedAquaTree,
        fileObjects: newFileObjects
    };
}

async function processLinkedNonFileRevision(
    linkedHash: string,
    aquaTree: AquaTree,
    fileObjects: FileObject[],
    url: string
): Promise<LinkedRevisionResult> {
    const [linkedAquaTree, linkedFileObjects] = await createAquaTreeFromRevisions(linkedHash, url);
    const genesisHash = getGenesisHash(linkedAquaTree) ?? "";

    const updatedAquaTree: AquaTree = {
        ...aquaTree,
        file_index: {
            ...aquaTree.file_index,
            [linkedHash]: linkedAquaTree.file_index[genesisHash]
        }
    };

    const newFileObjects = [
        ...fileObjects,
        ...linkedFileObjects,
        {
            fileContent: linkedAquaTree,
            fileName: `${linkedAquaTree.file_index[genesisHash]}.aqua.json`,
            path: "",
            fileSize: estimateStringFileSize(JSON.stringify(linkedAquaTree, null, 4))
        }
    ];

    return {
        aquaTree: updatedAquaTree,
        fileObjects: newFileObjects
    };
}

async function addRevisionContent(revision: Revision, revisionData: AquaRevision, aquaTreeFiledata: AquaTreeFileData[]): Promise<AquaRevision> {
    const fileItem = aquaTreeFiledata.find(f => f.fileHash === revision.pubkey_hash);
    if (fileItem?.fileLocation) {
        try {
            const fileContent = fs.readFileSync(fileItem.fileLocation, 'utf8');
            return { ...revisionData, content: fileContent };
        } catch (error : any) {
            Logger.error(`Error reading file content: ${error}`);
            return { ...revisionData, content: "--error--&" };
        }
    }
    return revisionData;
}
