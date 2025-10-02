import { AquaTree } from "aqua-js-sdk";
import { prisma } from "../database/db";
import { ExtendedAquaTreeData } from "../models/types";
import Logger from '../utils/Logger';
import { getLastRevisionVerificationHash } from "./aqua_tree_utils";
import { fetchCompleteRevisionChain } from "./quick_utils";
import { deleteFile } from "./file_utils";
import * as fs from 'fs';


/**
 * Transfers a complete revision chain from one user to another
 * 
 * @param entireChain The complete revision chain data from fetchCompleteRevisionChain
 * @param targetUserAddress The address of the user to transfer the chain to
 * @param sourceUserAddress The original owner of the chain
 * @returns A summary of the transfer operation
 */
export async function transferRevisionChain(
    entireChain: ExtendedAquaTreeData,
    targetUserAddress: string,
    sourceUserAddress: string,
    url: string
): Promise<{
    success: boolean;
    message: string;
    transferredRevisions: number;
    linkedChainsTransferred: number;
    latestHashes: string[];
}> {
    if (!entireChain || !entireChain.revisions || Object.keys(entireChain.revisions).length === 0) {
        return {
            success: false,
            message: "No revisions found in the provided chain data",
            transferredRevisions: 0,
            linkedChainsTransferred: 0,
            latestHashes: []
        };
    }

    // Track statistics
    let transferredRevisions = 0;
    let linkedChainsTransferred = 0;
    let latestHashes: string[] = [];

    try {
        // Process the main chain revisions
        for (const [hash, revision] of Object.entries(entireChain.revisions)) {
            // Create a new hash with the target user's address
            const sourceFullHash = `${sourceUserAddress}_${hash}`;
            const targetFullHash = `${targetUserAddress}_${hash}`;

            // Check if the revision already exists for the target user
            const existingRevision = await prisma.revision.findUnique({
                where: { pubkey_hash: targetFullHash }
            });

            if (existingRevision) {
                Logger.warn(`Revision already exists for target user: ${targetFullHash}`);
                continue;
            }

            // Get the original revision from the database
            const originalRevision = await prisma.revision.findUnique({
                where: { pubkey_hash: sourceFullHash }
            });

            if (!originalRevision) {
                Logger.warn(`Original revision not found in database: ${sourceFullHash}`);
                continue;
            }

            // Create a new revision for the target user with modified previous hash
            let previousHash = "";
            if (originalRevision.previous && originalRevision.previous.startsWith(sourceUserAddress)) {
                // If the previous hash belongs to the same chain, update it to point to the target user's version
                const prevHashParts = originalRevision.previous.split('_');
                if (prevHashParts.length > 1) {
                    previousHash = `${targetUserAddress}_${prevHashParts[1]}`;
                }
            } else if (originalRevision.previous) {
                // If it's an external reference, keep it as is
                previousHash = originalRevision.previous;
            }

            // Insert the new revision
            await prisma.revision.create({
                data: {
                    pubkey_hash: targetFullHash,
                    nonce: originalRevision.nonce,
                    shared: originalRevision.shared,
                    contract: originalRevision.contract,
                    previous: previousHash,
                    children: originalRevision.children,
                    local_timestamp: originalRevision.local_timestamp,
                    revision_type: originalRevision.revision_type,
                    has_content: originalRevision.has_content,
                    verification_leaves: originalRevision.verification_leaves
                }
            });

            transferredRevisions++;

            // Handle related data based on revision type
            switch (originalRevision.revision_type) {
                case "signature":
                    const signature = await prisma.signature.findUnique({
                        where: { hash: sourceFullHash }
                    });

                    if (signature) {
                        await prisma.signature.create({
                            data: {
                                hash: targetFullHash,
                                signature_digest: signature.signature_digest,
                                signature_wallet_address: signature.signature_wallet_address,
                                signature_public_key: signature.signature_public_key,
                                signature_type: signature.signature_type,
                                reference_count: 1
                            }
                        });
                    }
                    break;

                case "witness":
                    const witness = await prisma.witness.findUnique({
                        where: { hash: sourceFullHash }
                    });

                    if (witness) {
                        await prisma.witness.create({
                            data: {
                                hash: targetFullHash,
                                Witness_merkle_root: witness.Witness_merkle_root,
                                reference_count: 1
                            }
                        });
                    }
                    break;

                case "form":
                    const formItems = await prisma.aquaForms.findMany({
                        where: { hash: sourceFullHash }
                    });

                    for (const formItem of formItems) {
                        await prisma.aquaForms.create({
                            data: {
                                hash: targetFullHash,
                                key: formItem.key,
                                value: formItem.value ?? undefined,
                                type: formItem.type,
                                reference_count: 1
                            }
                        });
                    }
                    break;

                case "link":
                    const link = await prisma.link.findUnique({
                        where: { hash: sourceFullHash }
                    });

                    if (link) {
                        await prisma.link.create({
                            data: {
                                hash: targetFullHash,
                                link_type: link.link_type,
                                link_require_indepth_verification: link.link_require_indepth_verification,
                                link_verification_hashes: link.link_verification_hashes,
                                link_file_hashes: link.link_file_hashes,
                                reference_count: 1
                            }
                        });
                    }


                    // Fetch the entire chain from the source user
                    let latestRevisionHash = getLastRevisionVerificationHash(entireChain as AquaTree);
                    const entireChainInLink = await fetchCompleteRevisionChain(latestRevisionHash, sourceUserAddress, url);
                    transferRevisionChain(
                        entireChainInLink,
                        targetUserAddress,
                        sourceUserAddress,
                        url
                    )
                    break;

                case "file":
                case "form":
                    if (originalRevision.file_hash === null) {
                        throw Error("File hash is null for file/form revision, cannot transfer");
                    }
                    // For file revisions, handle file indexes
                    const fileIndexes = await prisma.fileIndex.findFirst({
                        where: {
                            file_hash: originalRevision.file_hash
                        }
                    });

                    if (fileIndexes === null) {
                        throw Error("File index is null for file revision, cannot transfer");
                    }

                    // Update file index to include the new hash
                    await prisma.fileIndex.update({
                        where: { file_hash: originalRevision.file_hash },
                        data: {
                            pubkey_hash: [...fileIndexes.pubkey_hash, targetFullHash]
                        }
                    });

                    await prisma.fileName.create({

                        data: {
                            pubkey_hash: targetFullHash,
                            file_name: entireChain.file_index[hash] || "+ Unknown File",
                        }
                    });

                    break;
            }
        }

        // Add a single latest hash entry for the whole chain
        // The latest hash will be the one provided in entireChain.latestHash or the last one in the chain
        if (Object.keys(entireChain.revisions).length > 0) {
            // Get the latest hash - either from the provided value or determine it from the chain
            // let latestHashValue = //entireChain.latestHash;

            // if (!latestHashValue) {
            // If no specific latestHash was provided, find the last revision in the chain
            // (the one that has no children pointing to it)
            const allHashes = Object.keys(entireChain.revisions);
            const allPrevious = Object.values(entireChain.revisions)
                .map(rev => (rev as any).previous_verification_hash)
                .filter(Boolean);

            // The latest hash is the one that isn't in the previous list of any other revision
            let latestHashValue = allHashes.find(hash => !allPrevious.includes(hash));
            // }

            if (latestHashValue) {
                const targetLatestHash = `${targetUserAddress}_${latestHashValue}`;
                let latestRevision = await prisma.latest.findFirst({
                    where: {
                        hash: {
                            contains: latestHashValue,
                            mode: "insensitive"
                        }
                    }
                })

                if (!latestRevision) {
                    throw Error("Latest revision not found")
                }

                // Add to latest table for the target user
                await prisma.latest.upsert({
                    where: {
                        hash: targetLatestHash,
                    },
                    update: {

                    },
                    create: {
                        hash: targetLatestHash,
                        user: targetUserAddress,
                        is_workflow: latestRevision.is_workflow,
                        template_id: latestRevision.template_id,
                    }
                });

                latestHashes.push(targetLatestHash);
            }
        }

        // Handle linked chains if they exist
        if (entireChain.linkedChains) {
            for (const [linkedHash, linkedChain] of Object.entries(entireChain.linkedChains)) {
                // Recursively transfer each linked chain
                const linkedResult = await transferRevisionChain(
                    linkedChain,
                    targetUserAddress,
                    sourceUserAddress,
                    url
                );

                if (linkedResult.success) {
                    linkedChainsTransferred++;
                    latestHashes = [...latestHashes, ...linkedResult.latestHashes];
                }
            }
        }

        return {
            success: true,
            message: `Successfully transferred ${transferredRevisions} revisions and ${linkedChainsTransferred} linked chains`,
            transferredRevisions,
            linkedChainsTransferred,
            latestHashes
        };
    } catch (error: any) {
        Logger.error("Error in transferRevisionChain:", error);
        return {
            success: false,
            message: `Error transferring chain: ${error.message}`,
            transferredRevisions,
            linkedChainsTransferred,
            latestHashes
        };
    }
}


export async function orderUserChainByGenesis(genesisHash: string): Promise<string[]> {
    try {
        const orderedChain: string[] = [genesisHash];
        let currentHash = genesisHash;

        // Starting from genesis, follow the chain by finding revisions that point to the current one
        while (true) {
            const nextRevision = await prisma.revision.findFirst({
                where: {
                    previous: {
                        equals: currentHash,
                        mode: 'insensitive'
                    }
                }
            });

            // console.log(cliYellowfy(`previous hash: ${currentHash} -- Current Revision: ${nextRevision?.pubkey_hash}`))

            if (!nextRevision) {
                break;  // End of chain
            }

            orderedChain.push(nextRevision.pubkey_hash);
            currentHash = nextRevision.pubkey_hash;
        }

        return orderedChain;
    } catch (error: any) {
        Logger.error("Error ordering user chain:", error);
        return [];
    }
}

export async function orderUserChainByLatest(startingHash: string): Promise<string[]> {
    try {
        const orderedChain: string[] = [startingHash];
        let currentHash = startingHash;

        // Starting from the given hash, follow the chain backwards by finding the previous revision
        while (true) {
            const currentRevision = await prisma.revision.findFirst({
                where: {
                    pubkey_hash: {
                        equals: currentHash,
                        mode: 'insensitive'
                    }
                }
            });

            // console.log(cliYellowfy(`Current hash: ${currentHash} -- Previous hash: ${currentRevision?.previous}`))

            if (!currentRevision || !currentRevision.previous) {
                break;  // Reached genesis or revision not found
            }

            orderedChain.push(currentRevision.previous);
            currentHash = currentRevision.previous;
        }

        return orderedChain;
    } catch (error: any) {
        Logger.error("Error ordering user chain by latest:", error);
        return [];
    }
}


/**
 * Checks if a revision exists and is deletable (only by the owner)
 * 
 * @param revisionHash The hash of the revision to check
 * @param requesterAddress The address of the user requesting deletion
 * @returns Boolean indicating if the revision can be deleted
 */
export async function canDeleteRevision(
    revisionHash: string,
    requesterAddress: string
): Promise<boolean> {
    // Extract the address part if the hash includes it
    const addressFromHash = revisionHash.includes('_')
        ? revisionHash.split('_')[0]
        : null;

    // Hash might either contain the address or not
    const hashToQuery = revisionHash.includes('_')
        ? revisionHash
        : `${requesterAddress}_${revisionHash}`;

    try {
        // Try to find the revision
        const revision = await prisma.revision.findUnique({
            where: {
                pubkey_hash: hashToQuery
            }
        });

        if (!revision) {
            Logger.error(`Revision ${hashToQuery} not found`);
            return false;
        }

        // If the hash had an address, check if it matches the requester
        if (addressFromHash && addressFromHash !== requesterAddress) {
            Logger.error(`Unauthorized: Hash address ${addressFromHash} doesn't match requester ${requesterAddress}`);
            return false;
        }

        // Additional checks can be added here (e.g., admin privileges, time limits)

        return true;
    } catch (error: any) {
        Logger.error(`Error checking revision deletability: ${error}`);
        return false;
    }
}


/**
 * Recursively deletes a revision and all its child revisions (revisions that reference this as their previous hash)
 * 
 * @param revisionHash The hash of the revision to delete (including user address prefix if applicable)
 * @param userAddress Optional user address to filter revisions (if not included in the hash)
 * @returns A summary of the delete operation
 */
export async function deleteRevisionAndChildren(
    revisionHash: string,
    userAddress?: string,
    deleteFromLatest: boolean = false
): Promise<{
    success: boolean;
    deleted: number;
    details: { revisions: string[]; related: { signatures: number; links: number; witnesses: number; forms: number; files: number; fileIndexes: number } }
}> {
    // Create a full hash if needed (userAddress_revisionHash format)
    const fullRevisionHash = revisionHash.includes('_')
        ? revisionHash
        : userAddress
            ? `${userAddress}_${revisionHash}`
            : revisionHash;

    Logger.info(`Starting deletion process for revision: ${fullRevisionHash}`);

    // To track all deleted items
    const deletedRevisions: string[] = [];
    let deletedSignatures = 0;
    let deletedLinks = 0;
    let deletedWitnesses = 0;
    let deletedForms = 0;
    let deletedFiles = 0;
    let deletedFileIndexes = 0;

    // Find all revisions in the deletion chain to process in a single transaction
    const revisionsToProcess: string[] = [];

    // Helper function to identify all affected revisions
    async function collectRevisionsToDelete(hash: string): Promise<void> {
        // If we've already processed this revision, skip it
        if (revisionsToProcess.includes(hash)) return;

        // Add this revision to the list
        revisionsToProcess.push(hash);

        // Find all child revisions that reference this hash as their previous
        const childRevisions = await prisma.revision.findMany({
            where: { previous: hash }
        });

        // Recursively collect all child revisions
        for (const child of childRevisions) {
            await collectRevisionsToDelete(child.pubkey_hash);
        }
    }

    try {
        // First collect all revisions that need to be deleted
        await collectRevisionsToDelete(fullRevisionHash);
        Logger.info(`Collected ${revisionsToProcess.length} revisions to process`);

        // Process all revisions in a single transaction for data consistency
        await prisma.$transaction(async (tx) => {
            // Process revisions in reverse order (children first, then parents)
            for (let i = revisionsToProcess.length - 1; i >= 0; i--) {
                const hash = revisionsToProcess[i];

                // Get the revision
                const revision = await tx.revision.findUnique({
                    where: { pubkey_hash: hash }
                });

                if (!revision) {
                    Logger.info(`Revision ${hash} not found, skipping`);
                    continue;
                }

                // Handle related data based on revision type
                switch (revision.revision_type) {
                    case "signature":
                        const signature = await tx.signature.findFirst({
                            where: { hash: hash }
                        });

                        if (signature) {
                            if ((signature.reference_count || 1) <= 1) {
                                // Delete if this is the last reference
                                await tx.signature.delete({
                                    where: { hash: hash }
                                });
                                deletedSignatures++;
                            } else {
                                // Otherwise decrement the count
                                await tx.signature.update({
                                    where: { hash: hash },
                                    data: {
                                        reference_count: (signature.reference_count || 1) - 1
                                    }
                                });
                            }
                        }
                        break;

                    case "witness":
                        // First find the witness record to get the merkle root
                        const witnessRecord = await tx.witness.findFirst({
                            where: { hash: hash }
                        });

                        if (witnessRecord) {
                            if ((witnessRecord.reference_count || 1) <= 1) {
                                // If this is the last reference to this witness, check if the witness event
                                // is still referenced by other witnesses
                                if (witnessRecord.Witness_merkle_root) {
                                    const otherWitnesses = await tx.witness.count({
                                        where: {
                                            Witness_merkle_root: witnessRecord.Witness_merkle_root,
                                            hash: { not: hash }
                                        }
                                    });

                                    if (otherWitnesses === 0) {
                                        // If no other witnesses reference this event, delete it
                                        await tx.witnessEvent.deleteMany({
                                            where: { Witness_merkle_root: witnessRecord.Witness_merkle_root }
                                        });
                                    }
                                }

                                // Delete the witness record
                                await tx.witness.delete({
                                    where: { hash: hash }
                                });
                                deletedWitnesses++;
                            } else {
                                // Decrement the reference count
                                await tx.witness.update({
                                    where: { hash: hash },
                                    data: {
                                        reference_count: (witnessRecord.reference_count || 1) - 1
                                    }
                                });
                            }
                        }
                        break;

                    case "form":
                        const deletedFormItems = await tx.aquaForms.deleteMany({
                            where: { hash: hash }
                        });
                        deletedForms += deletedFormItems.count;
                        break;

                    case "link":
                        const link = await tx.link.findFirst({
                            where: { hash: hash }
                        });

                        if (link) {
                            if ((link.reference_count || 1) <= 1) {
                                // Delete if this is the last reference
                                await tx.link.delete({
                                    where: { hash: hash }
                                });
                                deletedLinks++;
                            } else {
                                // Otherwise decrement the count
                                await tx.link.update({
                                    where: { hash: hash },
                                    data: {
                                        reference_count: (link.reference_count || 1) - 1
                                    }
                                });
                            }
                        }
                        break;

                    case "file":
                        // For file revisions, handle file and fileIndex entries
                        // First check if this revision is referenced in any FileIndex
                        const fileIndexEntries = await tx.fileIndex.findMany({
                            where: {
                                pubkey_hash: {
                                    has: fullRevisionHash
                                }
                            }
                        });

                        for (const fileIndex of fileIndexEntries) {
                            if (fileIndex.pubkey_hash.length <= 1) {
                                // If this is the last reference, delete the FileIndex entry
                                await tx.fileIndex.delete({
                                    where: {
                                        file_hash: fileIndex.file_hash
                                    }
                                });
                                deletedFileIndexes++;

                                // If a file record exists for this file, handle it
                                const file = await tx.file.findUnique({
                                    where: { file_hash: fileIndex.file_hash }
                                });

                                if (file) {

                                    // If this is the last reference to the file, delete the actual file if it exists
                                    if (file.file_location && fs.existsSync(file.file_location)) {
                                        try {
                                            await deleteFile(file.file_location)
                                        } catch (e) {
                                            Logger.error(`Error deleting file from filesystem: ${file.file_location}`, e);
                                        }
                                    }

                                    // Delete the file record
                                    await tx.file.delete({
                                        where: { file_hash: file.file_hash }
                                    });
                                    deletedFiles++;

                                }
                            } else {
                                // Otherwise, remove this hash from the hash array and decrement count
                                await tx.fileIndex.update({
                                    where: {
                                        file_hash: fileIndex.file_hash
                                    },
                                    data: {
                                        pubkey_hash: fileIndex.pubkey_hash.filter(h => h !== hash),

                                    }
                                });
                            }
                        }
                        break;

                    default:
                        Logger.warn(`Unknown revision type encountered: ${revision.revision_type} for ${hash}`);
                }

                // Before deleting the revision, check if it's in Latest table
                const latestEntry = await tx.latest.findUnique({
                    where: { hash: hash }
                });

                if (latestEntry) {
                    if (deleteFromLatest) {
                        // If flag is enabled, simply delete it from latest
                        await tx.latest.delete({
                            where: { hash: hash }
                        });
                    }
                    else {
                        // If this is a latest entry, update it to point to previous revision
                        if (revision.previous) {
                            await tx.latest.update({
                                where: { hash: hash },
                                data: { hash: revision.previous }
                            });
                        } else {
                            // If no previous revision, delete the latest entry
                            await tx.latest.delete({
                                where: { hash: hash }
                            });
                        }
                    }
                }

                // Finally delete the revision itself
                await tx.revision.delete({
                    where: { pubkey_hash: hash }
                });

                deletedRevisions.push(hash);
                Logger.info(`Deleted revision: ${hash}`);
            }
        });

        return {
            success: true,
            deleted: deletedRevisions.length,
            details: {
                revisions: deletedRevisions,
                related: {
                    signatures: deletedSignatures,
                    links: deletedLinks,
                    witnesses: deletedWitnesses,
                    forms: deletedForms,
                    files: deletedFiles,
                    fileIndexes: deletedFileIndexes
                }
            }
        };
    } catch (error: any) {
        Logger.error(`Error deleting revision chain: ${error}`);
        return {
            success: false,
            deleted: deletedRevisions.length,
            details: {
                revisions: deletedRevisions,
                related: {
                    signatures: deletedSignatures,
                    links: deletedLinks,
                    witnesses: deletedWitnesses,
                    forms: deletedForms,
                    files: deletedFiles,
                    fileIndexes: deletedFileIndexes
                }
            }
        };
    }
}