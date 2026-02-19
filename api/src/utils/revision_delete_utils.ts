import {
    AquaTree,
} from 'aqua-js-sdk';
import { prisma } from '../database/db';
import { FileIndex, Revision as DBRevision, WitnessEvent } from '@prisma/client';
import { getGenesisHash } from './aqua_tree_utils';
import { deleteFile } from './file_utils';
import Logger from './logger';
import { orderUserChain } from './quick_revision_utils';
import { usageService } from '../services/usageService';
import { findAquaTreeRevision } from './revision_query_utils';

// Utility function to generate pubkey hash
function generatePubkeyHash(walletAddress: string, hash: string): string {
    if (hash.includes("_")) {
        return hash
    }
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
        Logger.info(`Deleted ${deletedLatest.count} Latest entries`);
    }
}

// Utility function to delete related table entries
async function deleteRelatedTableEntries(tx: any, revisionHashes: string[]) {
    Logger.info(`Deleting related entries for ${revisionHashes.length} revisions`);

    // Delete AquaForms entries
    // Check if any of these are contracts (aqua_sign)
    const formsToDelete = await tx.aquaForms.findMany({
        where: {
            hash: { in: revisionHashes }
        }
    });

    let contractsCountToDelete = 0;
    let formsSignerCount = 0;

    for (const form of formsToDelete) {
        if (form.key === 'forms_signers') {
            contractsCountToDelete++;
        }
    }

    const deletedAquaForms = await tx.aquaForms.deleteMany({
        where: {
            hash: { in: revisionHashes }
        }
    });
    Logger.info(`Deleted ${deletedAquaForms.count} AquaForms entries`);

    // Delete Signature entries
    const deletedSignatures = await tx.signature.deleteMany({
        where: {
            hash: { in: revisionHashes }
        }
    });
    Logger.info(`Deleted ${deletedSignatures.count} Signature entries`);

    // Delete Link entries
    const deletedLinks = await tx.link.deleteMany({
        where: {
            hash: { in: revisionHashes }
        }
    });
    Logger.info(`Deleted ${deletedLinks.count} Link entries`);

    return {
        aquaForms: deletedAquaForms.count,
        signatures: deletedSignatures.count,
        links: deletedLinks.count,
        contracts: contractsCountToDelete
    };
}

// Utility function to handle witness cleanup
async function handleWitnessCleanup(tx: any, revisionHashes: string[]) {
    // Find witnesses to delete
    const witnesses: WitnessEvent[] = await tx.witness.findMany({
        where: {
            hash: { in: revisionHashes }
        }
    });

    const witnessRoots = witnesses
        .map((w: WitnessEvent) => w.Witness_merkle_root)
        .filter(Boolean) as string[];

    Logger.info(`Found ${witnesses.length} Witness entries with ${witnessRoots.length} unique merkle roots`);

    // Delete witnesses
    const deletedWitnesses = await tx.witness.deleteMany({
        where: {
            hash: { in: revisionHashes }
        }
    });
    Logger.info(`Deleted ${deletedWitnesses.count} Witness entries`);

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
    Logger.info(`Deleted ${deletedWitnessEvents} WitnessEvent entries`);

    return {
        witnesses: deletedWitnesses.count,
        witnessEvents: deletedWitnessEvents
    };
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

            // Decrement usage logic
            const userAddress = pubkeyHash.split('_')[0];
            const fileToDelete = await tx.file.findUnique({ where: { file_hash: fileIndex.file_hash } });
            if (userAddress && fileToDelete) {
                await usageService.decrementFiles(userAddress, 1);
                if (fileToDelete.file_size) {
                    await usageService.decrementStorage(userAddress, fileToDelete.file_size);
                }
            }

            // Delete corresponding file
            const file = await tx.file.findFirst({
                where: { file_hash: fileIndex.file_hash }
            });

            if (file && file.file_location) {
                try {
                    await deleteFile(file.file_location)
                    Logger.info(`Deleted file from filesystem: ${file.file_location}`);
                } catch (error: any) {
                    Logger.error("Error deleting file from filesystem:", error);
                }

                await tx.file.delete({
                    where: { file_hash: file.file_hash }
                });

                // Decrement usage logic
                const userAddress = pubkeyHash.split('_')[0];
                if (userAddress) {
                    await usageService.decrementFiles(userAddress, 1);
                    if (file.file_size) {
                        await usageService.decrementStorage(userAddress, file.file_size);
                    }
                }
            }
        } else {
            // Update FileIndex
            await tx.fileIndex.update({
                where: { file_hash: fileIndex.file_hash },
                data: { pubkey_hash: updatedPubkeyHashes }
            });

            // Decrement usage for the user who was removed
            const userAddress = pubkeyHash.split('_')[0];
            if (userAddress) {
                const fileRecord = await tx.file.findUnique({ where: { file_hash: fileIndex.file_hash } });
                await usageService.decrementFiles(userAddress, 1);
                if (fileRecord && fileRecord.file_size) {
                    await usageService.decrementStorage(userAddress, fileRecord.file_size);
                }
            }
        }
    }
}

// Utility function to handle complex file cleanup for multiple files
async function handleMultipleFileCleanup(tx: any, revisionHashes: string[]) {


    // Start with exact matches
    let fileIndexesToProcess: FileIndex[] = await tx.fileIndex.findMany({
        where: {
            pubkey_hash: {
                hasSome: revisionHashes
            }
        },

    });

    if (fileIndexesToProcess.length === 0) {
        Logger.info("No FileIndex entries found for the provided revision hashes");
        return;
    }

    for (const fileIndex of fileIndexesToProcess) {


        if (fileIndex.pubkey_hash.length === 1) {


            // If the file index only has one pubkey hash, we can safely delete it
            await tx.fileIndex.delete({
                where: {
                    file_hash: fileIndex.file_hash
                }
            });

            // Delete the associated file if it exists
            if (fileIndex.file_hash) {
                const file = await tx.file.findFirst({
                    where: { file_hash: fileIndex.file_hash }
                });


                if (file && file.file_location) {
                    try {
                        await deleteFile(file.file_location)
                        Logger.info(`Deleted file from filesystem: ${file.file_location}`);
                    } catch (error: any) {
                        Logger.error(`Error deleting file from filesystem: ${file.file_location}`, error);
                    }
                }

                await tx.file.delete({
                    where: { file_hash: fileIndex.file_hash }
                });
            }
        } else {
            await tx.fileIndex.update({
                where: {
                    file_hash: fileIndex.file_hash
                },
                data: {
                    pubkey_hash: fileIndex.pubkey_hash.filter((hash: string) => !revisionHashes.includes(hash))
                }

            });
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
    Logger.info(`Updated ${updatedRevisions.count} revisions that referenced the deleted revisions`);
    return updatedRevisions.count;
}

// Utility function to delete revisions
async function deleteRevisions(tx: any, revisions: DBRevision[]) {
    let deletedCount = 0;
    for (const revision of revisions) {
        await tx.revision.delete({
            where: { pubkey_hash: revision.pubkey_hash }
        });
        deletedCount++;
    }
    Logger.info(`Deleted ${deletedCount} DBRevision entries`);
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
    Logger.info(`Deleted ${deletedContract.count} contract entries`);
    return deletedContract.count;
}

// Utility function to delete FileName entries
async function deleteFileNames(tx: any, pubkeyHashes: string | string[]): Promise<void> {
    const hashes = Array.isArray(pubkeyHashes) ? pubkeyHashes : [pubkeyHashes];
    hashes.forEach(async (hash, index) => {

        const deletedFileNames = await tx.fileName.deleteMany({
            where: {
                pubkey_hash: hash
            }
        });
        Logger.info(`Deleted ${deletedFileNames.count} FileName entries`);
        return deletedFileNames.count;
    });
}

// Main function: Delete single aqua tree (refactored)
export async function deleteAquaTree(currentHash: string, userAddress: string, url: string): Promise<[number, string]> {
    try {
        const pubkeyHash = generatePubkeyHash(userAddress, currentHash);
        Logger.info(`Public_key_hash_to_delete: ${pubkeyHash}`);

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
        Logger.error("Error in delete operation:", error);
        return [500, `Error deleting file: ${error.message}`];
    }
}

// Main function: Delete entire aqua tree from system (refactored)
export async function deleteAquaTreeFromSystem(walletAddress: string, hash: string): Promise<[number, string]> {
    const filepubkeyHash = generatePubkeyHash(walletAddress, hash);

    Logger.info(`filepubkeyHash ${filepubkeyHash} hash ${hash} walletAddress ${walletAddress}`)
    try {
        // Fetch all revisions in the chain
        const revisionData: DBRevision[] = [];

        const latestRevisionData: DBRevision | null = await prisma.revision.findFirst({
            where: { pubkey_hash: filepubkeyHash }
        });

        if (!latestRevisionData) {
            return [500, `revision with hash ${hash} not found in system`];
        }

        revisionData.push(latestRevisionData);

        // Logger.info(`Processing revision chain starting with: ${filepubkeyHash}`);

        // Fetch previous revisions if they exist
        if (latestRevisionData?.previous !== null && latestRevisionData?.previous?.length !== 0) {
            const aquaTreeRevisions = await findAquaTreeRevision(latestRevisionData.previous);
            revisionData.push(...aquaTreeRevisions);
        }

        // Logger.info(`Found ${revisionData.length} revisions in the chain`);

        // Use transaction for all deletion operations
        await prisma.$transaction(async (tx) => {
            // Logger.info('Starting revision chain deletion transaction');
            const revisionPubkeyHashes = revisionData.map(rev => rev.pubkey_hash);
            // Logger.info(`Revisions to delete: ${revisionPubkeyHashes.join(', ')}`);

            // Delete related tables (creates recursion effectively)
            const deletedRelated = await deleteRelatedTableEntries(tx, revisionPubkeyHashes);

            // Handle witness cleanup
            await handleWitnessCleanup(tx, revisionPubkeyHashes);

            // Decrement usage
            if (deletedRelated.contracts > 0) {
                await usageService.decrementContracts(walletAddress, deletedRelated.contracts);
            }

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

            Logger.info('DBRevision chain deletion completed successfully');
        });

        return [200, "File and revisions deleted successfully"];
    } catch (error: any) {
        Logger.error("Error in delete operation:", error);
        return [500, `Error deleting file: ${error.message}`];
    }
}

export async function deletLatestIfExistsForAquaTree(aquaTree: AquaTree, userAddress: string) {
    const allHash = Object.keys(aquaTree.revisions);

    if (allHash.length === 0) {
        return;
    }

    const allHashPubKeyHash = allHash.map(hash => `${userAddress}_${hash}`);
    // Logger.info(`Before Extended allHashPubKeyHash to be deleted ${allHashPubKeyHash}`)
    /// assuiming forking does not happen
    /// use the genesis hash to fetch the aqua tree
    /// if its not null then delete the aqua tree
    let genesisHashOfAquaTreeToBeImported = getGenesisHash(aquaTree);
    if (genesisHashOfAquaTreeToBeImported) {

        let genPubKeyHash = `${userAddress}_${genesisHashOfAquaTreeToBeImported}`
        // check if hash exist in revisions
        let existingRevision = await prisma.revision.findFirst({
            where: { pubkey_hash: genPubKeyHash }
        });

        if (existingRevision) {
            let aquaTreeHashes = await orderUserChain(genPubKeyHash)
            allHashPubKeyHash.push(...aquaTreeHashes)

        }

    }

    // Logger.info(`Extended allHashPubKeyHash to be deleted ${allHashPubKeyHash}`)


    try {
        // Use a transaction to ensure data integrity
        await prisma.$transaction(async (tx) => {
            // 1. Delete related AquaForms first
            const deleteAquaFormsResult = await tx.aquaForms.deleteMany({
                where: {
                    hash: {
                        in: allHashPubKeyHash
                    }
                }
            });
            Logger.info(`Deleted ${deleteAquaFormsResult.count} AquaForms entries`);

            // 2. Delete related Links
            const deleteLinksResult = await tx.link.deleteMany({
                where: {
                    hash: {
                        in: allHashPubKeyHash
                    }
                }
            });
            Logger.info(`Deleted ${deleteLinksResult.count} Link entries`);

            // 3. Delete related Signatures
            const deleteSignaturesResult = await tx.signature.deleteMany({
                where: {
                    hash: {
                        in: allHashPubKeyHash
                    }
                }
            });
            Logger.info(`Deleted ${deleteSignaturesResult.count} Signature entries`);

            // 4. Delete related Witnesses (but keep WitnessEvent as it might be shared)
            const deleteWitnessesResult = await tx.witness.deleteMany({
                where: {
                    hash: {
                        in: allHashPubKeyHash
                    }
                }
            });
            Logger.info(`Deleted ${deleteWitnessesResult.count} Witness entries`);

            // 5. Delete Latest entries
            const deleteLatestResult = await tx.latest.deleteMany({
                where: {
                    hash: {
                        in: allHashPubKeyHash
                    }
                }
            });
            Logger.info(`Deleted ${deleteLatestResult.count} Latest entries`);

            // 6. Finally, delete Revision entries
            const deleteRevisionResult = await tx.revision.deleteMany({
                where: {
                    pubkey_hash: {
                        in: allHashPubKeyHash
                    }
                }
            });
            Logger.info(`Deleted ${deleteRevisionResult.count} Revision entries`);
        });

        Logger.info('Successfully deleted all related records');
    } catch (error) {
        console.error('Error deleting records:', error);
        throw error;
    }
}
