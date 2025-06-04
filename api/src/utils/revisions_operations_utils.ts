import { AquaTree, FileObject, Revision as AquaRevision, reorderRevisionsProperties, OrderRevisionInAquaTree } from 'aqua-js-sdk';

import { prisma } from '../database/db';
// For specific model types
import { Link, Revision, Prisma, WitnessEvent, Signature, AquaForms } from '@prisma/client';
import * as fs from "fs"
import path from 'path';
import { getGenesisHash } from './aqua_tree_utils';

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
            console.error(`Revision with hash ${latestRevisionHash} not found in system`);
            return [aquaTree, []];
        }

        // Step 2: Get all associated files
        const files = await getAssociatedFiles(revisionData); 
        console.log("Associated files: ", files)
        const fileIndexes = await getFileIndexes(revisionData);
        console.log("File indexes: ", fileIndexes)

        // Step 3: Create file objects for download
        fileObjects = await createFileObjects(files, fileIndexes, url);

        // Step 4: Process each revision
        for (const revision of revisionData) {
            const processResult = await processRevision(revision, aquaTree, fileObjects, files, fileIndexes, url);
            aquaTree = processResult.aquaTree;
            fileObjects = processResult.fileObjects;
        }

        const aquaTreeWithOrderdRevision = OrderRevisionInAquaTree(aquaTree);

        return [aquaTreeWithOrderdRevision, fileObjects];

    } catch (error) {
        console.error('Error creating AquaTree:', error);
        throw new Error(`Failed to create AquaTree: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
}

// Helper functions

async function getRevisionChain(latestRevisionHash: string): Promise<Revision[]> {
    // Get the latest revision
    const latestRevision = await prisma.revision.findFirst({
        where: {
            pubkey_hash: {
                contains: latestRevisionHash,
                mode: 'insensitive'
            }
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
            console.log("Genesis revision: ", previousRevisions);
            revisionData.push(...previousRevisions);
        } catch (error) {
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
        console.log("Witness: ", res);
        if (res == null) {
            throw new Error(`witness is null ${revision.revision_type}`);
        }
        return await prisma.witnessEvent.findFirst({
            where: {
                Witness_merkle_root: res.Witness_merkle_root!
            }
        });
    } else if (revision.revision_type == "form") {
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
        console.log(`type ${revision.revision_type} with hash ${hash}`);
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

async function getAssociatedFiles(revisionData: Revision[]): Promise<any[]> {
    let allFiles = [];

    for (const revision of revisionData) {
        const revisionPubKeyHash = revision.pubkey_hash
        const hashOnly = extractHashOnly(revisionPubKeyHash);

        // Try to find files directly by file_hash
        // const files = await prisma.file.findMany({
        //     where: {
        //         file_hash: {
        //             contains: hashOnly,
        //             mode: 'insensitive'
        //         }
        //     }
        // });

        const files = await prisma.file.findMany({
            where: {
                file_hash: {
                    contains: hashOnly,
                    mode: 'insensitive'
                }
            }
        });
        
        if (files.length > 0) {
            allFiles.push(...files);
        } else {
            // Try to find via file index
            const filesViaIndex = await getFilesViaIndex(hashOnly, revisionPubKeyHash);
            allFiles.push(...filesViaIndex);
        }
    }

    return allFiles;
}

async function getFilesViaIndex(hashOnly: string, pubkey_hash: string): Promise<any[]> {
    // FileIndex: file_hash (PK), pubkey_hash (String[])
    const fileIndexResult = await prisma.fileIndex.findFirst({
        where: {
            pubkey_hash: {
                has: hashOnly
            }
        },
        
    });

    const fileName = await prisma.fileName.findFirst({
        where: {
            pubkey_hash: pubkey_hash,
        }
    })

    if (!fileIndexResult) {
        return [];
    }

    // return await prisma.file.findMany({
    //     where: {
    //         file_hash: fileIndexResult.file_hash
    //     }
    // });
    let actualFile = await prisma.file.findMany({
        where: {
            file_hash: fileIndexResult.file_hash
        }
    });
    let actualFileWithAllInfo = {
        ...actualFile,
        fileName: fileName?.file_name ?? "File name not found",
    }
    return [actualFileWithAllInfo]
}


async function getFileIndexes(revisionData: Revision[]): Promise<any[]> {
    const fileIndexes = [];

    for (const revision of revisionData) {
        console.log(` revision  pubkey_hash ${revision.pubkey_hash}`)
        const hashOnly = extractHashOnly(revision.pubkey_hash);
        const fileIndex = await prisma.fileIndex.findFirst({
            where: {
                OR: [
                    { pubkey_hash: { has: revision.pubkey_hash } },
                    { pubkey_hash: { has: hashOnly } }
                ]
            }
        });
        if (fileIndex) {
            fileIndexes.push(fileIndex);
        } else {
            console.log(`File index not found ..`)
        }
    }
    return fileIndexes;
}

async function createFileObjects(files: any[], fileIndexes: any[], url: string): Promise<FileObject[]> {
    const fileObjects: FileObject[] = [];
    for (const file of files) {
        try {
            const fileStats = getFileStats(file.file_location);
            if (!fileStats) continue;
            const fileIndex = await getFileIndexForFile(file.file_hash);
            if (!fileIndex) {
                console.log(`File ${fileStats.originalFilename} not found in index`);
                continue;
            }
            const fullUrl = `${url}/files/${file.file_hash}`;
            fileObjects.push({
                fileContent: fullUrl,
                fileName: fileIndex.file_hash, // No uri in schema, use file_hash
                path: file.file_location,
                fileSize: fileStats.fileSizeInBytes
            });
        } catch (error) {
            console.error(`Error processing file ${file.file_hash}:`, error);
        }
    }
    return fileObjects;
}

async function getFileIndexForFile(fileHash: string): Promise<any> {
    return await prisma.fileIndex.findFirst({
        where: {
            file_hash: fileHash
        }
    });
}

// Return type for processRevision function
interface ProcessRevisionResult {
    aquaTree: AquaTree;
    fileObjects: FileObject[];
}

async function processRevision(
    revision: Revision,
    aquaTree: AquaTree,
    fileObjects: FileObject[],
    files: any[],
    fileIndexes: any[],
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
        revisionData = await addRevisionContent(revision, revisionData, files);
    }

    // Process based on revision type
    const processResult = await processRevisionByType(revision, revisionData, aquaTree, fileObjects, url);
    revisionData = processResult.revisionData;
    let updatedAquaTree = processResult.aquaTree;
    let updatedFileObjects = processResult.fileObjects;

    // Update file index for genesis revision
    if (!previousHashOnly) {
        const genesisResult = await updateGenesisFileIndex(revision, revisionData, updatedAquaTree, updatedFileObjects, fileIndexes, url);
        updatedAquaTree = genesisResult.aquaTree;
        updatedFileObjects = genesisResult.fileObjects;
        revisionData = genesisResult.revisionData;
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

    if (!revisionInfo && revision.revision_type !== "file") {
        console.log(`Revision info not found for ${revision.pubkey_hash}`);
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
            console.log(`Unknown revision type: ${revision.revision_type}`);
            return { revisionData, aquaTree, fileObjects };
    }
}

async function processFileRevision(revision: Revision, revisionData: AquaRevision, revisionInfo: any): Promise<AquaRevision> {
    const hashOnly = extractHashOnly(revision.pubkey_hash);
    const updatedRevisionData = {
        ...revisionData,
        file_nonce: revision.nonce ?? "--error--"
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
            console.error(`Hash not found in file index: ${hashOnly}`);
        }
    } else {
        updatedRevisionData.file_hash = fileResult.file_hash ?? "--error--";
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
    } catch (error) {
        console.log("Error parsing signature digest:", error);
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
        console.error("No link verification hash found");
        return { revisionData: updatedRevisionData, aquaTree, fileObjects };
    }

    const linkedHash = linkData.link_verification_hashes[0];
    const linkedRevision = await getRevisionByHash(linkedHash);

    if (!linkedRevision) {
        console.log(`Linked revision not found for hash ${linkedHash}`);
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

// Return type for linked revision processing functions
interface LinkedRevisionResult {
    aquaTree: AquaTree;
    fileObjects: FileObject[];
}

// Utility functions

function extractHashOnly(pubkeyHash: string): string {
    if (!pubkeyHash) return "";
    const parts = pubkeyHash.split("_");
    return parts.length > 1 ? parts[1] : pubkeyHash;
}

function getFileStats(filePath: string): { fileSizeInBytes: number; originalFilename: string } | null {
    try {
        if (!fs.existsSync(filePath)) {
            console.log(`File not found: ${filePath}`);
            return null;
        }

        const stats = fs.statSync(filePath);
        const fullFilename = path.basename(filePath);
        const originalFilename = fullFilename.substring(fullFilename.indexOf('-') + 1);

        return {
            fileSizeInBytes: stats.size,
            originalFilename
        };
    } catch (error) {
        console.error(`Error getting file stats for ${filePath}:`, error);
        return null;
    }
}

async function updateGenesisFileIndex(
    revision: Revision,
    revisionData: AquaRevision,
    aquaTree: AquaTree,
    fileObjects: FileObject[],
    fileIndexes: any[],
    url: string
): Promise<UpdateGenesisResult> {
    const hashOnly = extractHashOnly(revision.pubkey_hash);
    let fileIndex = fileIndexes.find(item =>
        item.pubkey_hash.includes(revision.pubkey_hash) ||
        item.pubkey_hash.some((hashItem: string) => hashItem.includes(hashOnly))
    );
    if (!fileIndex) {
        fileIndex = await prisma.fileIndex.findFirst({
            where: {
                OR: [
                    { pubkey_hash: { has: revision.pubkey_hash } },
                    { pubkey_hash: { has: hashOnly } }
                ]
            }
        });
    }
    if (fileIndex) {
        const updatedAquaTree: AquaTree = {
            ...aquaTree,
            file_index: {
                ...aquaTree.file_index,
                [hashOnly]: fileIndex.file_hash // file_hash is the PK and identifier
            }
        };
        const updatedRevisionData = {
            ...revisionData,
            file_hash: fileIndex.file_hash
        };
        // Add to file objects
        const fileItem = await prisma.file.findFirst({
            where: {
                file_hash: fileIndex.file_hash
            }
        });
        let updatedFileObjects = [...fileObjects];
        if (fileItem) {
            if (fileItem.file_location) {
                const fileStats = getFileStats(fileItem.file_location);
                if (fileStats) {
                    const fullUrl = `${url}/files/${fileIndex.file_hash}`;
                    updatedFileObjects = [
                        ...fileObjects,
                        {
                            fileContent: fullUrl,
                            fileName: fileIndex.file_hash, // file_hash as identifier
                            path: fileItem.file_location,
                            fileSize: fileStats.fileSizeInBytes
                        }
                    ];
                }
            }
        }
        return {
            aquaTree: updatedAquaTree,
            fileObjects: updatedFileObjects,
            revisionData: updatedRevisionData
        };
    }
    return { aquaTree, fileObjects, revisionData };
}

async function processLinkedFileRevision(
    linkedHash: string,
    aquaTree: AquaTree,
    fileObjects: FileObject[],
    url: string
): Promise<LinkedRevisionResult> {
    // FileIndex: file_hash (PK), pubkey_hash (String[])
    const filesData = await prisma.fileIndex.findFirst({
        where: {
            file_hash: {
                contains: linkedHash,
                mode: 'insensitive'
            }
        }
    });
    if (!filesData) {
        console.log(`File index with hash ${linkedHash} not found`);
        return { aquaTree, fileObjects };
    }
    const updatedAquaTree: AquaTree = {
        ...aquaTree,
        file_index: {
            ...aquaTree.file_index,
            [linkedHash]: filesData.file_hash
        }
    };
    const [linkedAquaTree, linkedFileObjects] = await createAquaTreeFromRevisions(linkedHash, url);
    const name = linkedAquaTree.file_index[linkedHash];
    const newFileObjects = [
        ...fileObjects,
        {
            fileContent: linkedAquaTree,
            fileName: `${name}.aqua.json`,
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

// Return type for updateGenesisFileIndex function
interface UpdateGenesisResult {
    aquaTree: AquaTree;
    fileObjects: FileObject[];
    revisionData: AquaRevision;
}

async function addRevisionContent(revision: Revision, revisionData: AquaRevision, files: any[]): Promise<AquaRevision> {
    const fileItem = files.find(f => f.file_hash === revision.pubkey_hash);
    if (fileItem?.file_location) {
        try {
            const fileContent = fs.readFileSync(fileItem.file_location, 'utf8');
            return { ...revisionData, content: fileContent };
        } catch (error) {
            console.error(`Error reading file content: ${error}`);
            return { ...revisionData, content: "--error--" };
        }
    }
    return revisionData;
}

async function getRevisionByHash(hash: string): Promise<any> {
    return await prisma.revision.findFirst({
        where: {
            pubkey_hash: {
                contains: hash,
                mode: 'insensitive'
            }
        }
    });
}