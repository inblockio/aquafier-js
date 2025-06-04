import { AquaTree, FileObject, OrderRevisionInAquaTree, reorderAquaTreeRevisionsProperties } from 'aqua-js-sdk';
import { prisma } from '../database/db';
// For specific model types
import { Signature, Revision, AquaForms, WitnessEvent, Link } from '@prisma/client';
import * as fs from "fs"
import { AquaJsonInZip, SaveRevision } from '../models/request_models';
import { getAquaTreeFileName } from './api_utils';
import { createAquaTreeFromRevisions } from './revisions_operations_utils';
import { getGenesisHash } from './aqua_tree_utils';
import JSZip from 'jszip';
import { getFileUploadDirectory } from './file_utils';
import { randomUUID } from 'crypto';
import path from 'path';

// import { PrismaClient } from '@prisma/client';


export async function getSignatureAquaTrees(userAddress: string, url: string): Promise<Array<{
    aquaTree: AquaTree,
    fileObject: FileObject[]
}>> {

    let latest = await prisma.latest.findMany({
        where: {
            user: userAddress
        }
    });

    let signatureAquaTrees: Array<{
        aquaTree: AquaTree,
        fileObject: FileObject[]
    }> = []
    if (latest.length != 0) {
        let systemAquaTrees = await fetchAquatreeFoUser(url, latest);
        for (let item of systemAquaTrees) {


            //get the second revision
            // check if it a link to signature
            let aquaTreeRevisionsOrderd = OrderRevisionInAquaTree(item.aquaTree)
            let allHashes = Object.keys(aquaTreeRevisionsOrderd.revisions)

            if (allHashes.length >= 1) {
                let secondRevision = aquaTreeRevisionsOrderd.revisions[allHashes[1]]

                if (secondRevision != undefined && secondRevision.revision_type == 'link') {
                    let secondRevision = aquaTreeRevisionsOrderd.revisions[allHashes[1]]

                    if (secondRevision.link_verification_hashes != undefined) {
                        let revisionHash = secondRevision.link_verification_hashes[0]
                        let name = aquaTreeRevisionsOrderd.file_index[revisionHash]

                        if (name == "user_signature.json") {
                            signatureAquaTrees.push(item)
                        }

                    }
                }
            }


        }
    }

    return signatureAquaTrees
}

export async function getUserApiFileInfo(url: string, address: string): Promise<Array<{
    aquaTree: AquaTree,
    fileObject: FileObject[]
}>> {

    let latest = await prisma.latest.findMany({
        where: {
            AND: {
                user: address,
                template_id: null,
                is_workflow: false
            }
        }
    });

    if (latest.length == 0) {

        return []
    }

    return await fetchAquatreeFoUser(url, latest)
}

export async function fetchAquatreeFoUser(url: string, latest: Array<{
    hash: string;
    user: string;
}>): Promise<Array<{
    aquaTree: AquaTree,
    fileObject: FileObject[]
}>> {
    // This function fetches and processes aqua trees for a user
    // based on their latest revision hashes

    let displayData: Array<{
        aquaTree: AquaTree,
        fileObject: FileObject[]
    }> = [];

    // Process each latest revision entry
    for (let revisionLatestItem of latest) {
        // Retrieve the tree starting from the latest hash
        let [anAquaTree, fileObject] = await createAquaTreeFromRevisions(revisionLatestItem.hash, url);

        // Ensure the tree is properly ordered
        let orderedRevisionProperties = reorderAquaTreeRevisionsProperties(anAquaTree);
        let aquaTreeWithOrderdRevision = OrderRevisionInAquaTree(orderedRevisionProperties);

        // Each latest hash represents a complete chain
        displayData.push({
            aquaTree: aquaTreeWithOrderdRevision,
            fileObject: fileObject
        });
    }

    //rearrange displayData based on filaname in aqua tree 
    // Sort displayData based on filenames in the aqua tree
    displayData.sort((a, b) => {
        const filenameA = getAquaTreeFileName(a.aquaTree);
        const filenameB = getAquaTreeFileName(b.aquaTree);
        return filenameA.localeCompare(filenameB);
    });



    return displayData;
}

export async function saveARevisionInAquaTree(revisionData: SaveRevision, userAddress: string): Promise<[number, string]> {

    if (!revisionData.revision) {
        return [400, "revision Data is required"]//reply.code(400).send({ success: false, message: "revision Data is required" });
    }
    if (!revisionData.revisionHash) {
        return [400, "revision hash is required"]  //reply.code(400).send({ success: false, message: "revision hash is required" });
    }

    if (!revisionData.revision.revision_type) {
        return [400, "revision type is required"] // reply.code(400).send({ success: false, message: "revision type is required" });
    }

    if (!revisionData.revision.local_timestamp) {
        return [400, "revision timestamp is required"] //reply.code(400).send({ success: false, message: "revision timestamp is required" });
    }

    if (!revisionData.revision.previous_verification_hash) {
        return [400, "previous revision hash  is required"] // reply.code(400).send({ success: false, message: "previous revision hash  is required" });
    }




    let oldFilePubKeyHash = `${userAddress}_${revisionData.revision.previous_verification_hash}`


    let existData = await prisma.latest.findFirst({
        where: {
            hash: oldFilePubKeyHash
        }
    });

    if (existData == null) {
        return [407, `previous  hash  not found ${oldFilePubKeyHash}`] ///reply.code(401).send({ success: false, message: `previous  hash  not found ${oldFilePubKeyHash}` });

    }

    let filePubKeyHash = `${userAddress}_${revisionData.revisionHash}`


    await prisma.latest.updateMany({
        where: {
            OR: [
                { hash: oldFilePubKeyHash },
                {
                    hash: {
                        contains: oldFilePubKeyHash,
                        mode: 'insensitive'
                    }
                }
            ]
        },
        data: {
            hash: filePubKeyHash
        }
    });

    const existingRevision = await prisma.revision.findUnique({
        where: {
            pubkey_hash: filePubKeyHash
        }
    });

    if (existingRevision) {
        // Handle the case where the revision already exists
        // Maybe return an error or update the existing record
        return [409, "Revision with this hash already exists"]//reply.code(409).send({ success: false, message: "Revision with this hash already exists" });
    }

    // Insert new revision into the database
    await prisma.revision.create({
        data: {
            pubkey_hash: filePubKeyHash,
            nonce: revisionData.revision.file_nonce || "",
            shared: [],
            // contract: revisionData.witness_smart_contract_address
            //     ? [{ address: revisionData.witness_smart_contract_address }]
            //     : [],
            previous: `${userAddress}_${revisionData.revision.previous_verification_hash}`,
            // children: {},
            local_timestamp: revisionData.revision.local_timestamp, // revisionData.revision.local_timestamp,
            revision_type: revisionData.revision.revision_type,
            verification_leaves: revisionData.revision.leaves || [],

        },
    });

    if (revisionData.revision.revision_type == "form") {
        let revisioValue = Object.keys(revisionData);
        for (let formItem in revisioValue) {
            if (formItem.startsWith("form_")) {
                await prisma.aquaForms.create({
                    data: {
                        hash: filePubKeyHash,
                        key: formItem,
                        value: revisioValue[formItem],
                        type: typeof revisioValue[formItem]
                    }
                });
            }
        }
    }

    if (revisionData.revision.revision_type == "signature") {
        let signature = "";
        if (typeof revisionData.revision.signature == "string") {
            signature = revisionData.revision.signature
        } else {
            signature = JSON.stringify(revisionData.revision.signature)
        }


        console.log(`Data stringify  ${JSON.stringify(revisionData.revision, null, 4)}`)
        // process.exit(1);
        await prisma.signature.upsert({
            where: {
                hash: filePubKeyHash
            },
            update: {
                reference_count: {
                    increment: 1
                }
            },
            create: {
                hash: filePubKeyHash,
                signature_digest: signature,
                signature_wallet_address: revisionData.revision.signature_wallet_address,
                signature_type: revisionData.revision.signature_type,
                signature_public_key: revisionData.revision.signature_public_key,
                reference_count: 1
            }
        });

    }


    if (revisionData.revision.revision_type == "witness") {

        // const witnessTimestamp = new Date();
        await prisma.witnessEvent.upsert({
            where: {
                Witness_merkle_root: revisionData.revision.witness_merkle_root!
            },
            update: {
                Witness_merkle_root: revisionData.revision.witness_merkle_root!,
                Witness_timestamp: revisionData.revision.witness_timestamp!.toString(),
                Witness_network: revisionData.revision.witness_network,
                Witness_smart_contract_address: revisionData.revision.witness_smart_contract_address,
                Witness_transaction_hash: revisionData.revision.witness_transaction_hash,
                Witness_sender_account_address: revisionData.revision.witness_sender_account_address
            },
            create: {
                Witness_merkle_root: revisionData.revision.witness_merkle_root!,
                Witness_timestamp: revisionData.revision.witness_timestamp!.toString(),
                Witness_network: revisionData.revision.witness_network,
                Witness_smart_contract_address: revisionData.revision.witness_smart_contract_address,
                Witness_transaction_hash: revisionData.revision.witness_transaction_hash,
                Witness_sender_account_address: revisionData.revision.witness_sender_account_address

            }
        });


        await prisma.witness.upsert({
            where: {
                hash: filePubKeyHash
            },
            update: {
                reference_count: {
                    increment: 1
                }
            },
            create: {
                hash: filePubKeyHash,
                Witness_merkle_root: revisionData.revision.witness_merkle_root,
                reference_count: 1  // Starting with 1 since this is the first reference
            }
        });
    }


    if (revisionData.revision.revision_type == "link") {
        await prisma.link.create({
            data: {
                hash: filePubKeyHash,
                link_type: "aqua",
                link_require_indepth_verification: false,
                link_verification_hashes: revisionData.revision.link_verification_hashes,
                link_file_hashes: revisionData.revision.link_file_hashes,
                reference_count: 0
            }
        })
    }

    if (revisionData.revision.revision_type == "file") {

        return [500, "not implemented"]
        // return reply.code(500).send({
        //     message: "not implemented",
        // });
    }

    return [200, ""]
}

// start of delete


// const prisma = new PrismaClient();

// Types for better type safety
interface RevisionData {
    pubkey_hash: string;
    previous: string | null;
    // Add other revision properties as needed
}

interface FileIndexData {
    id: string;
    file_hash: string;
    pubkey_hash: string[];
}

interface FileIndexDataWithRefCount extends FileIndexData {
    reference_count: number | null;
}

interface WitnessData {
    hash: string;
    Witness_merkle_root: string | null;
}

// Utility function to generate pubkey hash
function generatePubkeyHash(walletAddress: string, hash: string): string {
    return `${walletAddress}_${hash}`;
}

// Utility function to extract hash from pubkey hash
function extractHashFromPubkey(pubkeyHash: string): string {
    return pubkeyHash.includes("_") ? pubkeyHash.split("_")[1] : pubkeyHash;
}

// Utility function to handle latest table operations
async function handleLatestTableOperation(
    tx: any,
    pubkeyHash: string | string[],
    previousHash: string | null,
    deleteMode: 'single' | 'multiple' = 'single'
) {
    if (deleteMode === 'single') {
        const singleHash = Array.isArray(pubkeyHash) ? pubkeyHash[0] : pubkeyHash;
        const latestExist = await tx.latest.findUnique({
            where: { hash: singleHash }
        });

        if (latestExist) {
            if (previousHash) {
                await tx.latest.update({
                    where: { hash: singleHash },
                    data: { hash: previousHash }
                });
            } else {
                await tx.latest.delete({
                    where: { hash: singleHash }
                });
            }
        }
    } else {
        // For multiple deletions, just delete all matching entries
        const hashArray = Array.isArray(pubkeyHash) ? pubkeyHash : [pubkeyHash];
        const deletedLatest = await tx.latest.deleteMany({
            where: {
                hash: {
                    in: hashArray
                }
            }
        });
        console.log(`Deleted ${deletedLatest.count} Latest entries`);
    }
}

// Utility function to delete related table entries
async function deleteRelatedTableEntries(tx: any, revisionHashes: string[]) {
    console.log(`Deleting related entries for ${revisionHashes.length} revisions`);

    // Delete AquaForms entries
    const deletedAquaForms = await tx.aquaForms.deleteMany({
        where: {
            hash: { in: revisionHashes }
        }
    });
    console.log(`Deleted ${deletedAquaForms.count} AquaForms entries`);

    // Delete Signature entries
    const deletedSignatures = await tx.signature.deleteMany({
        where: {
            hash: { in: revisionHashes }
        }
    });
    console.log(`Deleted ${deletedSignatures.count} Signature entries`);

    // Delete Link entries
    const deletedLinks = await tx.link.deleteMany({
        where: {
            hash: { in: revisionHashes }
        }
    });
    console.log(`Deleted ${deletedLinks.count} Link entries`);

    return {
        aquaForms: deletedAquaForms.count,
        signatures: deletedSignatures.count,
        links: deletedLinks.count
    };
}

// Utility function to handle witness cleanup
async function handleWitnessCleanup(tx: any, revisionHashes: string[]) {
    // Find witnesses to delete
    const witnesses = await tx.witness.findMany({
        where: {
            hash: { in: revisionHashes }
        }
    });

    const witnessRoots = witnesses
        .map((w: WitnessData) => w.Witness_merkle_root)
        .filter(Boolean) as string[];

    console.log(`Found ${witnesses.length} Witness entries with ${witnessRoots.length} unique merkle roots`);

    // Delete witnesses
    const deletedWitnesses = await tx.witness.deleteMany({
        where: {
            hash: { in: revisionHashes }
        }
    });
    console.log(`Deleted ${deletedWitnesses.count} Witness entries`);

    // Clean up orphaned WitnessEvents
    let deletedWitnessEvents = 0;
    for (const root of witnessRoots) {
        const remainingWitnesses = await tx.witness.count({
            where: { Witness_merkle_root: root }
        });

        if (remainingWitnesses === 0) {
            await tx.witnessEvent.delete({
                where: { Witness_merkle_root: root }
            });
            deletedWitnessEvents++;
        }
    }
    console.log(`Deleted ${deletedWitnessEvents} WitnessEvent entries`);

    return {
        witnesses: deletedWitnesses.count,
        witnessEvents: deletedWitnessEvents
    };
}

// Utility function to find file indexes with flexible matching
async function findFileIndexesToProcess(tx: any, revisionHashes: string[]): Promise<FileIndexData[]> {
    console.log('Finding FileIndex entries that reference the revisions to delete');

    // Start with exact matches
    let fileIndexesToProcess: FileIndexData[] = await tx.fileIndex.findMany({
        where: {
            pubkey_hash: {
                hasSome: revisionHashes
            }
        },
        select: {
            id: true,
            file_hash: true,
            pubkey_hash: true
        }
    });

    // If few matches, try partial matching for complex scenarios
    if (fileIndexesToProcess.length < revisionHashes.length) {
        console.log(`Found only ${fileIndexesToProcess.length} exact matches, trying partial matching`);

        for (const revHash of revisionHashes) {
            const existingIds = fileIndexesToProcess.map(fi => fi.id);

            let additionalMatches: any[];
            if (existingIds.length > 0) {
                additionalMatches = await tx.$queryRaw`
                    SELECT id, file_hash, pubkey_hash 
                    FROM file_index 
                    WHERE EXISTS (
                        SELECT 1 FROM unnest(pubkey_hash) AS h 
                        WHERE LOWER(h) LIKE LOWER('%' || ${revHash} || '%')
                    )
                    AND id NOT IN (${existingIds.join(',')})
                ` as any[];
            } else {
                additionalMatches = await tx.$queryRaw`
                    SELECT id, file_hash, pubkey_hash 
                    FROM file_index 
                    WHERE EXISTS (
                        SELECT 1 FROM unnest(pubkey_hash) AS h 
                        WHERE LOWER(h) LIKE LOWER('%' || ${revHash} || '%')
                    )
                ` as any[];
            }

            if (additionalMatches && Array.isArray(additionalMatches) && additionalMatches.length > 0) {
                console.log(`Found ${additionalMatches.length} additional matches for ${revHash}`);
                // Type cast the raw query results to FileIndexData
                const typedMatches = additionalMatches.map(match => ({
                    id: match.id as string,
                    file_hash: match.file_hash as string,
                    pubkey_hash: match.pubkey_hash as string[]
                }));
                fileIndexesToProcess.push(...typedMatches);
            }
        }
    }

    console.log(`Found total of ${fileIndexesToProcess.length} FileIndex entries to process`);
    return fileIndexesToProcess;
}

// Utility function to handle file cleanup (simplified version for single file)
async function handleSingleFileCleanup(tx: any, pubkeyHash: string) {
    const fileIndexEntries = await tx.fileIndex.findMany({
        where: {
            pubkey_hash: { has: pubkeyHash }
        }
    });

    for (const fileIndex of fileIndexEntries) {
        const updatedPubkeyHashes = fileIndex.pubkey_hash.filter((hash: string) => hash !== pubkeyHash);

        if (updatedPubkeyHashes.length === 0) {
            // Delete FileIndex entry
            await tx.fileIndex.delete({
                where: { file_hash: fileIndex.file_hash }
            });

            // Delete corresponding file
            const file = await tx.file.findFirst({
                where: { file_hash: fileIndex.file_hash }
            });

            if (file && file.file_location) {
                try {
                    fs.unlinkSync(file.file_location);
                    console.log(`Deleted file from filesystem: ${file.file_location}`);
                } catch (error) {
                    console.log("Error deleting file from filesystem:", error);
                }

                await tx.file.delete({
                    where: { file_hash: file.file_hash }
                });
            }
        } else {
            // Update FileIndex
            await tx.fileIndex.update({
                where: { file_hash: fileIndex.file_hash },
                data: { pubkey_hash: updatedPubkeyHashes }
            });
        }
    }
}

// Utility function to handle complex file cleanup for multiple files
async function handleMultipleFileCleanup(tx: any, revisionHashes: string[]) {
    const fileIndexesToProcess = await findFileIndexesToProcess(tx, revisionHashes);

    const fileIndexesToDelete: string[] = [];
    const fileHashesToDelete = new Set<string>();

    // Process each file index - simplified logic focusing on deletion
    for (const fileIndex of fileIndexesToProcess) {
        // For bulk deletion, we'll be more aggressive and delete file indexes
        // that reference any of our revisions
        const hasReferencesToDelete = fileIndex.pubkey_hash.some((hash: string) =>
            revisionHashes.some(revHash => hash.includes(revHash))
        );

        if (hasReferencesToDelete) {
            fileIndexesToDelete.push(fileIndex.id);
            if (fileIndex.file_hash) {
                fileHashesToDelete.add(fileIndex.file_hash);
            }
        }
    }

    console.log(`FileIndex operations: ${fileIndexesToDelete.length} to delete`);

    // Delete file indexes
    if (fileIndexesToDelete.length > 0) {
        const deletedFileIndexes = await tx.fileIndex.deleteMany({
            where: { id: { in: fileIndexesToDelete } }
        });
        console.log(`Deleted ${deletedFileIndexes.count} FileIndex entries`);

        // Delete associated files
        if (fileHashesToDelete.size > 0) {
            const uniqueFileHashes = Array.from(fileHashesToDelete);

            const filesToDelete = await tx.file.findMany({
                where: { file_hash: { in: uniqueFileHashes } }
            });

            // Delete filesystem files
            for (const file of filesToDelete) {
                if (file.file_location) {
                    try {
                        fs.unlinkSync(file.file_location);
                        console.log(`Deleted file from filesystem: ${file.file_location}`);
                    } catch (error) {
                        console.log(`Error deleting file from filesystem: ${file.file_location}`, error);
                    }
                }
            }

            // Delete database records
            const deletedFiles = await tx.file.deleteMany({
                where: { file_hash: { in: uniqueFileHashes } }
            });
            console.log(`Deleted ${deletedFiles.count} File entries`);
        }
    }
}

// Utility function to clean up revision references
async function cleanUpRevisionReferences(tx: any, revisionHashes: string[]) {
    const updatedRevisions = await tx.revision.updateMany({
        where: {
            previous: { in: revisionHashes }
        },
        data: {
            previous: null
        }
    });
    console.log(`Updated ${updatedRevisions.count} revisions that referenced the deleted revisions`);
    return updatedRevisions.count;
}

// Utility function to delete revisions
async function deleteRevisions(tx: any, revisions: RevisionData[]) {
    let deletedCount = 0;
    for (const revision of revisions) {
        await tx.revision.delete({
            where: { pubkey_hash: revision.pubkey_hash }
        });
        deletedCount++;
    }
    console.log(`Deleted ${deletedCount} Revision entries`);
    return deletedCount;
}

// Utility function to handle contract deletion
async function deleteContracts(tx: any, revisionHashes: string[], walletAddress: string) {
    const hashOnly = revisionHashes.map(hash => extractHashFromPubkey(hash));

    const deletedContract = await tx.contract.deleteMany({
        where: {
            OR: [
                { latest: { in: hashOnly } },
                { genesis_hash: { in: hashOnly } }
            ],
            AND: [
                { sender: walletAddress }
            ]
        }
    });
    console.log(`Deleted ${deletedContract.count} contract entries`);
    return deletedContract.count;
}

// Utility function to delete FileName entries
async function deleteFileNames(tx: any, pubkeyHashes: string | string[]) {
    const hashes = Array.isArray(pubkeyHashes) ? pubkeyHashes : [pubkeyHashes];
    const deletedFileNames = await tx.fileName.deleteMany({
        where: {
            pubkey_hash: { in: hashes }
        }
    });
    console.log(`Deleted ${deletedFileNames.count} FileName entries`);
    return deletedFileNames.count;
}

// Main function: Delete single aqua tree (refactored)
export async function deleteAquaTree(currentHash: string, userAddress: string, url: string): Promise<[number, string]> {
    try {
        const pubkeyHash = generatePubkeyHash(userAddress, currentHash);
        console.log(`Public_key_hash_to_delete: ${pubkeyHash}`);

        // Fetch specific revision
        const latestRevisionData = await prisma.revision.findFirst({
            where: { pubkey_hash: pubkeyHash }
        });

        if (!latestRevisionData) {
            return [500, `revision with hash ${currentHash} not found in system`];
        }

        // Handle latest table update/deletion (outside transaction)
        await handleLatestTableOperation(
            prisma,
            pubkeyHash,
            latestRevisionData.previous,
            'single'
        );

        // Use transaction for the main deletion logic
        await prisma.$transaction(async (tx) => {
            const revisionHashes = [pubkeyHash];

            // Delete related table entries
            await deleteRelatedTableEntries(tx, revisionHashes);

            // Handle witness cleanup
            await handleWitnessCleanup(tx, revisionHashes);

            // Handle file cleanup (single file version)
            await handleSingleFileCleanup(tx, pubkeyHash);

            // Handle FileName entries
            await deleteFileNames(tx, pubkeyHash);

            // Clean up revision references
            await cleanUpRevisionReferences(tx, revisionHashes);

            // Delete the revision
            await deleteRevisions(tx, [latestRevisionData]);
        });

        return [200, "File and revisions deleted successfully"];
    } catch (error: any) {
        console.error("Error in delete operation:", error);
        return [500, `Error deleting file: ${error.message}`];
    }
}

// Main function: Delete entire aqua tree from system (refactored)
export async function deleteAquaTreeFromSystem(walletAddress: string, hash: string): Promise<[number, string]> {
    const filepubkeyHash = generatePubkeyHash(walletAddress, hash);

    try {
        // Fetch all revisions in the chain
        const revisionData: RevisionData[] = [];

        const latestRevisionData = await prisma.revision.findFirst({
            where: { pubkey_hash: filepubkeyHash }
        });

        if (!latestRevisionData) {
            return [500, `revision with hash ${hash} not found in system`];
        }

        revisionData.push(latestRevisionData);

        console.log(`Processing revision chain starting with: ${filepubkeyHash}`);

        // Fetch previous revisions if they exist
        if (latestRevisionData?.previous !== null && latestRevisionData?.previous?.length !== 0) {
            const aquaTreeRevisions = await findAquaTreeRevision(latestRevisionData.previous);
            revisionData.push(...aquaTreeRevisions);
        }

        console.log(`Found ${revisionData.length} revisions in the chain`);

        // Use transaction for all deletion operations
        await prisma.$transaction(async (tx) => {
            console.log('Starting revision chain deletion transaction');
            const revisionPubkeyHashes = revisionData.map(rev => rev.pubkey_hash);
            console.log(`Revisions to delete: ${revisionPubkeyHashes.join(', ')}`);

            // Delete related table entries
            await deleteRelatedTableEntries(tx, revisionPubkeyHashes);

            // Handle witness cleanup
            await handleWitnessCleanup(tx, revisionPubkeyHashes);

            // Handle complex file cleanup
            await handleMultipleFileCleanup(tx, revisionPubkeyHashes);

            // Handle FileName entries
            await deleteFileNames(tx, revisionPubkeyHashes);

            // Clean up revision references
            await cleanUpRevisionReferences(tx, revisionPubkeyHashes);

            // Handle latest table (multiple mode)
            await handleLatestTableOperation(tx, revisionPubkeyHashes, null, 'multiple');

            // Delete all revisions
            await deleteRevisions(tx, revisionData);

            // Delete contracts
            await deleteContracts(tx, revisionPubkeyHashes, walletAddress);

            console.log('Revision chain deletion completed successfully');
        });

        return [200, "File and revisions deleted successfully"];
    } catch (error: any) {
        console.error("Error in delete operation:", error);
        return [500, `Error deleting file: ${error.message}`];
    }
}



// =====================================================
// EXTRACTED HELPER FUNCTIONS
// =====================================================

interface FileProcessingResult {
    fileExists: boolean;
    fileData?: any;
    fileIndexData?: any;
}

/**
 * Processes file data and ensures file exists in database
 */
async function processFileData(
    fileHash: string,
    userAddress: string,
    revisionHash: string,
    fileAsset?: any,
    fileName?: string
): Promise<FileProcessingResult> {
    const pubKeyHash = `${userAddress}_${revisionHash}`;

    let fileResult = await prisma.file.findFirst({
        where: { file_hash: fileHash }
    });

    let existingFileIndex = await prisma.fileIndex.findFirst({
        where: { file_hash: fileHash }
    });

    if (!fileResult && fileAsset && fileName) {
        // Create new file
        const fileContent = await fileAsset.async('nodebuffer');
        const UPLOAD_DIR = getFileUploadDirectory();
        await fs.promises.mkdir(UPLOAD_DIR, { recursive: true });
        const uniqueFileName = `${randomUUID()}-${path.basename(fileName)}`;
        const filePath = path.join(UPLOAD_DIR, uniqueFileName);
        await fs.promises.writeFile(filePath, fileContent);

        await prisma.file.create({
            data: {
                file_hash: fileHash,
                file_location: filePath,
            }
        });

        await prisma.fileIndex.create({
            data: {
                pubkey_hash: [pubKeyHash],
                file_hash: fileHash,
            }
        });

        await prisma.fileName.create({
            data: {
                pubkey_hash: pubKeyHash,
                file_name: fileName,
            }
        });

        return { fileExists: true };
    }

    if (fileResult && existingFileIndex) {
        // Update existing file index
        if (!existingFileIndex.pubkey_hash.includes(pubKeyHash)) {
            existingFileIndex.pubkey_hash.push(pubKeyHash);
        }

        await prisma.fileIndex.update({
            data: { pubkey_hash: existingFileIndex.pubkey_hash },
            where: { file_hash: existingFileIndex.file_hash }
        });

        await prisma.fileName.upsert({
            where: { pubkey_hash: pubKeyHash },
            create: {
                pubkey_hash: pubKeyHash,
                file_name: fileName || fileHash
            },
            update: {
                file_name: fileName || fileHash
            }
        });

        return {
            fileExists: true,
            fileData: fileResult,
            fileIndexData: existingFileIndex
        };
    }

    return { fileExists: false };
}

/**
 * Processes revision data based on revision type
 */
async function processRevisionByType(
    revisionData: any,
    pubKeyHash: string,
    userAddress: string,
    aquaTree: AquaTree
) {
    const { revision_type } = revisionData;

    switch (revision_type) {
        case "form":
            await processFormRevision(revisionData, pubKeyHash);
            break;

        case "signature":
            await processSignatureRevision(revisionData, pubKeyHash);
            break;

        case "witness":
            await processWitnessRevision(revisionData, pubKeyHash);
            break;

        case "file":
            await processFileRevision(revisionData, pubKeyHash, userAddress);
            break;

        case "link":
            await processLinkRevision(revisionData, pubKeyHash);
            break;
    }

    // Handle genesis revision file setup
    if (!revisionData.previous_verification_hash) {
        await processGenesisRevision(revisionData, userAddress, aquaTree);
    }
}

async function processFormRevision(revisionData: any, pubKeyHash: string) {
    const formKeys = Object.keys(revisionData).filter(key => key.startsWith("forms_"));

    for (const formKey of formKeys) {
        await prisma.aquaForms.create({
            data: {
                hash: pubKeyHash,
                key: formKey,
                value: revisionData[formKey],
                type: typeof revisionData[formKey]
            }
        });
    }
}

async function processSignatureRevision(revisionData: any, pubKeyHash: string) {
    const signature = typeof revisionData.signature === "string"
        ? revisionData.signature
        : JSON.stringify(revisionData.signature);

    await prisma.signature.upsert({
        where: { hash: pubKeyHash },
        update: { reference_count: { increment: 1 } },
        create: {
            hash: pubKeyHash,
            signature_digest: signature,
            signature_wallet_address: revisionData.signature_wallet_address,
            signature_type: revisionData.signature_type,
            signature_public_key: revisionData.signature_public_key,
            reference_count: 1
        }
    });
}

async function processWitnessRevision(revisionData: any, pubKeyHash: string) {
    await prisma.witness.upsert({
        where: { hash: pubKeyHash },
        update: { reference_count: { increment: 1 } },
        create: {
            hash: pubKeyHash,
            Witness_merkle_root: revisionData.witness_merkle_root,
            reference_count: 1
        }
    });

    await prisma.witnessEvent.upsert({
        where: { Witness_merkle_root: revisionData.witness_merkle_root! },
        update: {
            Witness_merkle_root: revisionData.witness_merkle_root!,
            Witness_timestamp: revisionData.witness_timestamp?.toString(),
            Witness_network: revisionData.witness_network,
            Witness_smart_contract_address: revisionData.witness_smart_contract_address,
            Witness_transaction_hash: revisionData.witness_transaction_hash,
            Witness_sender_account_address: revisionData.witness_sender_account_address
        },
        create: {
            Witness_merkle_root: revisionData.witness_merkle_root!,
            Witness_timestamp: revisionData.witness_timestamp?.toString(),
            Witness_network: revisionData.witness_network,
            Witness_smart_contract_address: revisionData.witness_smart_contract_address,
            Witness_transaction_hash: revisionData.witness_transaction_hash,
            Witness_sender_account_address: revisionData.witness_sender_account_address
        }
    });
}

async function processFileRevision(revisionData: any, pubKeyHash: string, userAddress: string) {
    if (!revisionData.file_hash) {
        throw new Error(`Revision is detected to be a file but file_hash is missing`);
    }

    let fileResult = await prisma.file.findFirst({
        where: {
            file_hash: { contains: revisionData.file_hash, mode: 'insensitive' }
        }
    });

    if (!fileResult) {
        throw new Error(`File data should be in database but is not found.`);
    }

    //   await prisma.file.updateMany({
    //     where: {
    //         file_hash : fileResult.file_hash
    //     //   OR: [
    //     //     { hash: fileResult.hash },
    //     //     { hash: { contains: fileResult.hash, mode: 'insensitive' } }
    //     //   ]
    //     },
    //     data: { reference_count: fileResult.reference_count! + 1 }
    //   });

    // Update file index
    const existingFileIndex = await prisma.fileIndex.findFirst({
        where: { file_hash: fileResult.file_hash }
    });

    if (existingFileIndex) {
        if (!existingFileIndex.pubkey_hash.includes(pubKeyHash)) {
            existingFileIndex.pubkey_hash.push(pubKeyHash);
        }

        await prisma.fileIndex.update({
            data: { pubkey_hash: existingFileIndex.pubkey_hash },
            where: { file_hash: existingFileIndex.file_hash }
        });
    } else {
        throw new Error(`File index data should be in database but is not found.`);
    }


}

async function processLinkRevision(revisionData: any, pubKeyHash: string) {
    await prisma.link.upsert({
        where: { hash: pubKeyHash },
        update: {
            hash: pubKeyHash,
            link_type: "aqua",
            link_require_indepth_verification: false,
            link_verification_hashes: revisionData.link_verification_hashes,
            link_file_hashes: revisionData.link_file_hashes,
            reference_count: 0
        },
        create: {
            hash: pubKeyHash,
            link_type: "aqua",
            link_require_indepth_verification: false,
            link_verification_hashes: revisionData.link_verification_hashes,
            link_file_hashes: revisionData.link_file_hashes,
            reference_count: 0
        }
    });

    // Process linked hashes
    if (revisionData.link_verification_hashes?.length > 0) {
        for (const linkedHash of revisionData.link_verification_hashes) {
            const linkedRevision = await prisma.revision.findFirst({
                where: {
                    pubkey_hash: { contains: linkedHash, mode: 'insensitive' }
                }
            });

            if (linkedRevision) {
                console.log(`Found linked revision chain with hash ${linkedHash}`);
            }
        }
    }
}

async function processGenesisRevision(revisionData: any, userAddress: string, aquaTree: AquaTree) {
    const fileHash = revisionData.file_hash;
    if (!fileHash) {
        throw new Error(`Genesis revision detected but file hash is null.`);
    }

    const existingFileIndex = await prisma.fileIndex.findFirst({
        where: { file_hash: fileHash }
    });

    if (existingFileIndex) {
        const genHash = getGenesisHash(aquaTree);
        if (!genHash) {
            throw new Error(`Genesis hash cannot be null`);
        }

        const pubKeyHash = `${userAddress}_${genHash}`;

        if (!existingFileIndex.pubkey_hash.includes(pubKeyHash)) {
            existingFileIndex.pubkey_hash.push(pubKeyHash);
        }

        await prisma.fileIndex.update({
            data: { pubkey_hash: existingFileIndex.pubkey_hash },
            where: { file_hash: existingFileIndex.file_hash }
        });
    }
}

// =====================================================
// REFACTORED MAIN FUNCTIONS
// =====================================================

/**
 * Refactored saveAquaTree function with improved modularity
 */
export async function saveAquaTree(
    aquaTree: AquaTree,
    userAddress: string,
    templateId: string | null = null,
    isWorkFlow: boolean = false
) {
    // Reorder revisions to ensure proper order
    const orderedAquaTree = reorderAquaTreeRevisionsProperties(aquaTree);
    const aquaTreeWithOrderdRevision = OrderRevisionInAquaTree(orderedAquaTree);

    // Get all revision hashes in the chain
    const allHash = Object.keys(aquaTreeWithOrderdRevision.revisions);

    if (allHash.length === 0) {
        throw new Error("No revisions found in the aqua tree");
    }

    // The last hash in the sorted array is the latest
    const latestHash = allHash[allHash.length - 1];
    const lastPubKeyHash = `${userAddress}_${latestHash}`;

    // Only register the latest hash for the user
    await prisma.latest.upsert({
        where: { hash: lastPubKeyHash },
        create: {
            hash: lastPubKeyHash,
            user: userAddress,
            template_id: templateId,
            is_workflow: isWorkFlow
        },
        update: {
            hash: lastPubKeyHash,
            user: userAddress,
            template_id: templateId
        }
    });

    // Process each revision
    for (const revisionHash of allHash) {
        const revisionData = aquaTreeWithOrderdRevision.revisions[revisionHash];
        const pubKeyHash = `${userAddress}_${revisionHash}`;
        const pubKeyPrevious = revisionData.previous_verification_hash.length > 0
            ? `${userAddress}_${revisionData.previous_verification_hash}`
            : "";

        // Insert/update revision in the database
        await prisma.revision.upsert({
            where: { pubkey_hash: pubKeyHash },
            create: {
                pubkey_hash: pubKeyHash,
                file_hash: revisionData.file_hash,
                nonce: revisionData.file_nonce ?? "",
                shared: [],
                previous: pubKeyPrevious,
                local_timestamp: revisionData.local_timestamp,
                revision_type: revisionData.revision_type,
                verification_leaves: revisionData.leaves ?? [],
            },
            update: {
                pubkey_hash: pubKeyHash,
                file_hash: revisionData.file_hash,
                nonce: revisionData.file_nonce ?? "",
                shared: [],
                previous: pubKeyPrevious,
                local_timestamp: revisionData.local_timestamp,
                revision_type: revisionData.revision_type,
                verification_leaves: revisionData.leaves ?? [],
            },
        });

        // Process revision based on type
        await processRevisionByType(revisionData, pubKeyHash, userAddress, aquaTreeWithOrderdRevision);
    }
}



// =====================================================
// ADDITIONAL HELPER FUNCTIONS
// =====================================================

export async function streamToBuffer(stream: any): Promise<Buffer> {
    const chunks = [];
    for await (const chunk of stream) {
        chunks.push(chunk);
    }
    return Buffer.concat(chunks);
}

export async function processAquaMetadata(zipData: JSZip, userAddress: string) {
    const aquaJsonFile = zipData.files['aqua.json'];
    if (!aquaJsonFile) return;

    const fileContent = await aquaJsonFile.async('text');
    const aquaData: AquaJsonInZip = JSON.parse(fileContent);

    for (const nameHash of aquaData.name_with_hash) {
        const aquaFileName = `${nameHash.name}.aqua.json`;
        const aquaFile = zipData.files[aquaFileName];

        if (!aquaFile) {
            throw new Error(`Expected to find ${aquaFileName} as defined in aqua.json but file not found`);
        }

        const aquaFileDataText = await aquaFile.async('text');
        const aquaTreeData: AquaTree = JSON.parse(aquaFileDataText);

        const genesisHash = getGenesisHash(aquaTreeData);
        if (!genesisHash) {
            throw new Error(`Genesis hash cannot be null`);
        }

        const filePubKeyHash = `${userAddress}_${genesisHash}`;
        const fileAsset = zipData.files[nameHash.name];

        await processFileData(
            nameHash.hash,
            userAddress,
            genesisHash,
            fileAsset,
            nameHash.name
        );
    }
}

export async function processAquaFiles(zipData: JSZip, userAddress: string) {
    for (const fileName in zipData.files) {
        if (fileName.endsWith(".aqua.json") && fileName !== 'aqua.json') {
            const file = zipData.files[fileName];
            const fileContent = await file.async('text');
            const aquaTree: AquaTree = JSON.parse(fileContent);

            await saveAquaTree(aquaTree, userAddress);
        }
    }
}
// export async function saveAquaTree(aquaTree: AquaTree, userAddress: string, templateId: string | null = null, isWorkFlow: boolean = false) {
//     // Reorder revisions to ensure proper order
//     let orderedAquaTree = reorderAquaTreeRevisionsProperties(aquaTree);
//     let aquaTreeWithOrderdRevision = OrderRevisionInAquaTree(orderedAquaTree);

//     // Get all revision hashes in the chain
//     let allHash = Object.keys(aquaTreeWithOrderdRevision.revisions);

//     // The last hash in the sorted array is the latest
//     if (allHash.length === 0) {
//         throw Error("No revisions found in the aqua tree");
//     }

//     let latestHash = allHash[allHash.length - 1];
//     let lastPubKeyHash = `${userAddress}_${latestHash}`;

//     // Only register the latest hash for the user
//     await prisma.latest.upsert({
//         where: {
//             hash: lastPubKeyHash
//         },
//         create: {
//             hash: lastPubKeyHash,
//             user: userAddress,
//             template_id: templateId,
//             is_workflow: isWorkFlow
//         },
//         update: {
//             hash: lastPubKeyHash,
//             user: userAddress,
//             template_id: templateId
//         }
//     });

//     // insert the revisions
//     for (const revisinHash of allHash) {
//         let revisionData = aquaTreeWithOrderdRevision.revisions[revisinHash];
//         let pubKeyHash = `${userAddress}_${revisinHash}`
//         let pubKeyPrevious = ""
//         if (revisionData.previous_verification_hash.length > 0) {
//             pubKeyPrevious = `${userAddress}_${revisionData.previous_verification_hash}`
//         }

//         // Insert new revision into the database
//         await prisma.revision.upsert({
//             where: {
//                 pubkey_hash: pubKeyHash
//             },
//             create: {
//                 pubkey_hash: pubKeyHash,
//                 nonce: revisionData.file_nonce ?? "",
//                 shared: [],
//                 previous: pubKeyPrevious,
//                 local_timestamp: revisionData.local_timestamp,
//                 revision_type: revisionData.revision_type,
//                 verification_leaves: revisionData.leaves ?? [],
//             },
//             update: {
//                 pubkey_hash: pubKeyHash,
//                 nonce: revisionData.file_nonce ?? "",
//                 shared: [],
//                 previous: pubKeyPrevious,
//                 local_timestamp: revisionData.local_timestamp,
//                 revision_type: revisionData.revision_type,
//                 verification_leaves: revisionData.leaves ?? [],
//             },
//         });


//         if (revisionData.revision_type == "form") {
//             let revisioValue = Object.keys(revisionData);
//             for (let formItem of revisioValue) {
//                 if (formItem.startsWith("forms_")) {
//                     await prisma.aquaForms.create({
//                         data: {
//                             hash: pubKeyHash,
//                             key: formItem,
//                             value: revisionData[formItem],
//                             type: typeof revisionData[formItem]
//                         }
//                     });
//                 }
//             }
//         }

//         // if(revisionData.leaves && revisionData.leaves.length > 0) {

//         // }

//         if (revisionData.revision_type == "signature") {
//             let signature = "";
//             if (typeof revisionData.signature == "string") {
//                 signature = revisionData.signature
//             } else {
//                 signature = JSON.stringify(revisionData.signature)
//             }


//             //todo consult dalmas if signature_public_key needs tobe stored
//             await prisma.signature.upsert({
//                 where: {
//                     hash: pubKeyHash
//                 },
//                 update: {
//                     reference_count: {
//                         increment: 1
//                     }
//                 },
//                 create: {
//                     hash: pubKeyHash,
//                     signature_digest: signature,
//                     signature_wallet_address: revisionData.signature_wallet_address,
//                     signature_type: revisionData.signature_type,
//                     signature_public_key: revisionData.signature_public_key,
//                     reference_count: 1
//                 }
//             });

//         }


//         if (revisionData.revision_type == "witness") {

//             await prisma.witness.upsert({
//                 where: {
//                     hash: pubKeyHash
//                 },
//                 update: {
//                     reference_count: {
//                         increment: 1
//                     }
//                 },
//                 create: {
//                     hash: pubKeyHash,
//                     Witness_merkle_root: revisionData.witness_merkle_root,
//                     reference_count: 1  // Starting with 1 since this is the first reference
//                 }
//             });

//             // const witnessTimestamp = new Date(!);
//             await prisma.witnessEvent.upsert({
//                 where: {
//                     Witness_merkle_root: revisionData.witness_merkle_root!,
//                 },
//                 update: {
//                     Witness_merkle_root: revisionData.witness_merkle_root!,
//                     Witness_timestamp: revisionData.witness_timestamp?.toString(),
//                     Witness_network: revisionData.witness_network,
//                     Witness_smart_contract_address: revisionData.witness_smart_contract_address,
//                     Witness_transaction_hash: revisionData.witness_transaction_hash,
//                     Witness_sender_account_address: revisionData.witness_sender_account_address

//                 },
//                 create: {
//                     Witness_merkle_root: revisionData.witness_merkle_root!,
//                     Witness_timestamp: revisionData.witness_timestamp?.toString(),
//                     Witness_network: revisionData.witness_network,
//                     Witness_smart_contract_address: revisionData.witness_smart_contract_address,
//                     Witness_transaction_hash: revisionData.witness_transaction_hash,
//                     Witness_sender_account_address: revisionData.witness_sender_account_address

//                 }
//             });
//         }



//         if (revisionData.revision_type == "file" || revisionData.revision_type == "form") {
//             if (revisionData.file_hash == null || revisionData.file_hash == undefined) {
//                 throw Error(`revision with hash ${revisinHash} is detected to be a file but file_hash is mising`);
//             }

//             let fileResult = await prisma.file.findFirst({
//                 where: {
//                     hash: {
//                         contains: revisinHash,
//                         mode: 'insensitive' // Case-insensitive matching
//                     }
//                 }
//             })

//             if (fileResult == null) {
//                 console.log(`-- > file data should be in database but is not found.hash  ${revisinHash}`);
//                 throw Error(`file data should be in database but is not found.`);
//             }

//             await prisma.file.updateMany({
//                 where: {

//                     OR: [
//                         { hash: fileResult.hash },
//                         { hash: { contains: fileResult.hash, mode: 'insensitive' } }
//                     ]

//                 },
//                 data: {
//                     reference_count: fileResult.reference_count! + 1
//                 }
//             })


//             // update  file index
//             let existingFileIndex = await prisma.fileIndex.findFirst({
//                 where: { id: fileResult.hash },
//             });

//             if (existingFileIndex) {
//                 // existingFileIndex.hash = [...existingFileIndex.hash, pubKeyHash]
//                 if(!existingFileIndex.pubkey_hash.includes(pubKeyHash)){
//                     existingFileIndex.pubkey_hash.push(pubKeyHash)
//                 }
//                 await prisma.fileIndex.update({
//                     data: {
//                         pubkey_hash: existingFileIndex.pubkey_hash,

//                     },
//                     where: {
//                         file_hash: existingFileIndex.file_hash
//                     }
//                 })
//             } else {
//                 throw Error(`file index data should be in database but is not found.`);
//             }
//         }

//         if (revisionData.revision_type == "link") {
//             await prisma.link.upsert({
//                 where: {
//                     hash: pubKeyHash,
//                 },
//                 update: {
//                     hash: pubKeyHash,
//                     link_type: "aqua",
//                     link_require_indepth_verification: false,
//                     link_verification_hashes: revisionData.link_verification_hashes,
//                     link_file_hashes: revisionData.link_file_hashes,
//                     reference_count: 0
//                 },
//                 create: {
//                     hash: pubKeyHash,
//                     link_type: "aqua",
//                     link_require_indepth_verification: false,
//                     link_verification_hashes: revisionData.link_verification_hashes,
//                     link_file_hashes: revisionData.link_file_hashes,
//                     reference_count: 0
//                 }
//             });

//             // For link revisions, recursively process linked chains
//             if (revisionData.link_verification_hashes && revisionData.link_verification_hashes.length > 0) {
//                 for (const linkedHash of revisionData.link_verification_hashes) {
//                     const linkedRevision = await prisma.revision.findFirst({
//                         where: {
//                             pubkey_hash: {
//                                 contains: linkedHash,
//                                 mode: 'insensitive'
//                             }
//                         }
//                     });

//                     if (linkedRevision) {
//                         // Instead of creating new chains for linked revisions, 
//                         // we just process them independently
//                         // They'll form their own chains with their own latest hash
//                         console.log(`Found linked revision chain with hash ${linkedHash}`);
//                     }
//                 }
//             }
//         }




//         if (revisionData.previous_verification_hash == null || revisionData.previous_verification_hash == "") {

//             let fileHash = revisionData.file_hash;

//             if (fileHash == null) {
//                 throw Error(`revision with hash ${revisinHash} is detected to be a genesis but the file hash is null.`)
//             }
//             // file and file indexes
//             // Check if file already exists in the database
//             let existingFile = await prisma.file.findFirst({ //todo
//                 where: { file_hash: fileHash },
//             });

//             let existingFileIndex = await prisma.fileIndex.findFirst({
//                 where: { file_hash: fileHash },
//             });

//             if (existingFileIndex) {

//                 let genHash = getGenesisHash(aquaTree)
//                 if(genHash==null){
//                     throw Error(`an error occured , genesis hash cvannot be null`)
//                 }
//                 let pubKeyHash = `${userAddress}_${genHash}`


//                 if(!existingFileIndex.pubkey_hash.includes(pubKeyHash)){
//                     existingFileIndex.pubkey_hash.push(pubKeyHash)
//                 }
//                 await prisma.fileIndex.update({
//                     data: {
//                         pubkey_hash: existingFileIndex.pubkey_hash,

//                     },
//                     where: {
//                         file_hash: existingFileIndex.file_hash
//                     }
//                 })
//             }
//         }
//     }
// }

export async function fetchAquaTreeWithForwardRevisions(latestRevisionHash: string, url: string): Promise<[AquaTree, FileObject[]]> {
    // Fetch the revision chain starting from the latest hash
    const [anAquaTree, fileObject] = await createAquaTreeFromRevisions(latestRevisionHash, url);

    // Reorder the revisions to ensure proper sequence
    let orderRevisionPrpoerties = reorderAquaTreeRevisionsProperties(anAquaTree);
    let aquaTreeWithOrderdRevision = OrderRevisionInAquaTree(orderRevisionPrpoerties);

    // Now check if there are any forward revisions (newer revisions that point to our current latest)
    let revisionData = [];
    let queryHash = latestRevisionHash;

    while (true) {
        // Fetch revision that points to our current latest as its previous
        let forwardRevision = await prisma.revision.findFirst({
            where: {
                previous: queryHash,
            }
        });

        if (forwardRevision == null) {
            break;
        }

        revisionData.push(forwardRevision);
        queryHash = forwardRevision.pubkey_hash;
    }

    // If we found forward revisions, we need to reconstruct the tree with the new latest
    if (revisionData.length > 0) {
        // The last item in revisionData is the newest revision
        const newLatestHash = revisionData[revisionData.length - 1].pubkey_hash;
        console.log(`Found newer revisions. New latest hash: ${newLatestHash}`);

        // Reconstruct the tree from the new latest hash
        const [updatedAquaTree, updatedFileObject] = await createAquaTreeFromRevisions(newLatestHash, url);

        // Reorder the updated tree
        let updatedOrderedTree = reorderAquaTreeRevisionsProperties(updatedAquaTree);
        let updatedSortedTree = OrderRevisionInAquaTree(updatedOrderedTree);

        return [updatedSortedTree, updatedFileObject];
    }

    return [aquaTreeWithOrderdRevision, fileObject];
}


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


export async function FetchRevisionInfo(hash: string, revision: Revision): Promise<Signature | WitnessEvent | AquaForms[] | Link | null> {

    if (revision.revision_type == "signature") {
        //  console.log(`signature with hash ${hash}`)
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
        console.log("Witness: ", res)
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
        })

    } else if (revision.revision_type == "link") {

        return await prisma.link.findFirst({
            where: {
                hash: hash
            }
        })
    } else {

        console.log(`type ${revision.revision_type} with hash ${hash}`)
        return null
        // throw new Error(`implment for ${revision.revision_type}`);

    }
}

