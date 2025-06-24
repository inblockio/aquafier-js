import { prisma } from '../database/db';
import { Revision, Link, Signature, WitnessEvent, AquaForms } from '@prisma/client';
import * as fs from 'fs';

/**
 * Recursively deletes a revision and all its child revisions (revisions that reference this as their previous hash)
 * 
 * @param revisionHash The hash of the revision to delete (including user address prefix if applicable)
 * @param userAddress Optional user address to filter revisions (if not included in the hash)
 * @returns A summary of the delete operation
 */
export async function deleteRevisionAndChildren(
    revisionHash: string,
    userAddress?: string
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
    
    console.log(`Starting deletion process for revision: ${fullRevisionHash}`);
    
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
        console.log(`Collected ${revisionsToProcess.length} revisions to process`);
        
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
                    console.log(`Revision ${hash} not found, skipping`);
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
                                hash: {
                                    has: hash
                                }
                            }
                        });
                        
                        for (const fileIndex of fileIndexEntries) {
                            if ((fileIndex.reference_count || 1) <= 1) {
                                // If this is the last reference, delete the FileIndex entry
                                await tx.fileIndex.delete({
                                    where: {
                                        id: fileIndex.id
                                    }
                                });
                                deletedFileIndexes++;
                                
                                // If a file record exists for this file, handle it
                                const file = await tx.file.findUnique({
                                    where: { hash: fileIndex.id }
                                });
                                
                                if (file) {
                                    if ((file.reference_count || 1) <= 1) {
                                        // If this is the last reference to the file, delete the actual file if it exists
                                        if (file.content && fs.existsSync(file.content)) {
                                            try {
                                                fs.unlinkSync(file.content);
                                            } catch (e) {
                                                console.error(`Error deleting file from filesystem: ${file.content}`, e);
                                            }
                                        }
                                        
                                        // Delete the file record
                                        await tx.file.delete({
                                            where: { hash: file.hash }
                                        });
                                        deletedFiles++;
                                    } else {
                                        // Decrement the reference count
                                        await tx.file.update({
                                            where: { hash: file.hash },
                                            data: { 
                                                reference_count: (file.reference_count || 1) - 1 
                                            }
                                        });
                                    }
                                }
                            } else {
                                // Otherwise, remove this hash from the hash array and decrement count
                                await tx.fileIndex.update({
                                    where: {
                                        id: fileIndex.id
                                    },
                                    data: {
                                        hash: fileIndex.hash.filter(h => h !== hash),
                                        reference_count: (fileIndex.reference_count || 1) - 1
                                    }
                                });
                            }
                        }
                        break;
                        
                    default:
                        console.warn(`Unknown revision type encountered: ${revision.revision_type} for ${hash}`);
                }
                
                // Before deleting the revision, check if it's in Latest table
                const latestEntry = await tx.latest.findUnique({
                    where: { hash: hash }
                });
                
                if (latestEntry) {
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
                
                // Finally delete the revision itself
                await tx.revision.delete({
                    where: { pubkey_hash: hash }
                });
                
                deletedRevisions.push(hash);
                console.log(`Deleted revision: ${hash}`);
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
    } catch (error) {
        console.error(`Error deleting revision chain: ${error}`);
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
            console.log(`Revision ${hashToQuery} not found`);
            return false;
        }
        
        // If the hash had an address, check if it matches the requester
        if (addressFromHash && addressFromHash !== requesterAddress) {
            console.log(`Unauthorized: Hash address ${addressFromHash} doesn't match requester ${requesterAddress}`);
            return false;
        }
        
        // Additional checks can be added here (e.g., admin privileges, time limits)
        
        return true;
    } catch (error) {
        console.error(`Error checking revision deletability: ${error}`);
        return false;
    }
}

/**
 * Transfers a complete revision chain from one user to another
 * 
 * @param entireChain The complete revision chain data from fetchCompleteRevisionChain
 * @param targetUserAddress The address of the user to transfer the chain to
 * @param sourceUserAddress The original owner of the chain
 * @returns A summary of the transfer operation
 */
export async function transferRevisionChain(
    entireChain: any,
    targetUserAddress: string,
    sourceUserAddress: string
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
                console.log(`Revision already exists for target user: ${targetFullHash}`);
                continue;
            }
            
            // Get the original revision from the database
            const originalRevision = await prisma.revision.findUnique({
                where: { pubkey_hash: sourceFullHash }
            });
            
            if (!originalRevision) {
                console.warn(`Original revision not found in database: ${sourceFullHash}`);
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
                    break;
                    
                case "file":
                    // For file revisions, handle file indexes
                    const fileIndexes = await prisma.fileIndex.findMany({
                        where: {
                            hash: {
                                has: sourceFullHash
                            }
                        }
                    });
                    
                    for (const fileIndex of fileIndexes) {
                        // Update file index to include the new hash
                        await prisma.fileIndex.update({
                            where: { id: fileIndex.id },
                            data: {
                                hash: [...fileIndex.hash, targetFullHash],
                                reference_count: (fileIndex.reference_count || 0) + 1
                            }
                        });
                    }
                    break;
            }
        }
        
        // Add a single latest hash entry for the whole chain
        // The latest hash will be the one provided in entireChain.latestHash or the last one in the chain
        if (Object.keys(entireChain.revisions).length > 0) {
            // Get the latest hash - either from the provided value or determine it from the chain
            let latestHashValue = entireChain.latestHash;
            
            if (!latestHashValue) {
                // If no specific latestHash was provided, find the last revision in the chain
                // (the one that has no children pointing to it)
                const allHashes = Object.keys(entireChain.revisions);
                const allPrevious = Object.values(entireChain.revisions)
                    .map(rev => (rev as any).previous_verification_hash)
                    .filter(Boolean);
                
                // The latest hash is the one that isn't in the previous list of any other revision
                latestHashValue = allHashes.find(hash => !allPrevious.includes(hash));
            }
            
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

                if(!latestRevision){
                    throw Error("Latest revision not found")
                }
                
                // Add to latest table for the target user
                await prisma.latest.create({
                    data: {
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
                    sourceUserAddress
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
        console.error("Error in transferRevisionChain:", error);
        return {
            success: false,
            message: `Error transferring chain: ${error.message}`,
            transferredRevisions,
            linkedChainsTransferred,
            latestHashes
        };
    }
}

/**
 * Merges a revision chain from source user to target user, handling different merge scenarios
 * 
 * @param entireChain The complete revision chain data from fetchCompleteRevisionChain
 * @param targetUserAddress The address of the user to merge the chain into
 * @param sourceUserAddress The original owner of the chain
 * @param mergeStrategy Strategy to use when chains diverge: "replace" (discard target's divergent revisions) or "fork" (keep both branches)
 * @returns A summary of the merge operation
 */
export async function mergeRevisionChain(
    entireChain: any,
    targetUserAddress: string,
    sourceUserAddress: string,
    mergeStrategy: "replace" | "fork" = "fork"
): Promise<{ 
    success: boolean; 
    message: string;
    transferredRevisions: number;
    linkedChainsTransferred: number;
    latestHashes: string[];
    mergePoint?: string;
    strategy: string;
}> {
    if (!entireChain || !entireChain.revisions || Object.keys(entireChain.revisions).length === 0) {
        return {
            success: false,
            message: "No revisions found in the provided chain data",
            transferredRevisions: 0,
            linkedChainsTransferred: 0,
            latestHashes: [],
            strategy: "none"
        };
    }

    // Track statistics
    let transferredRevisions = 0;
    let linkedChainsTransferred = 0;
    let latestHashes: string[] = [];
    let appliedStrategy = "none"; // Track which strategy was actually applied
    let mergePoint: string | undefined = undefined;
    
    try {
        // First, order the incoming chain to understand its structure
        const orderedIncomingChain = orderRevisionsInChain(entireChain);
        if (!orderedIncomingChain || orderedIncomingChain.length === 0) {
            return {
                success: false,
                message: "Failed to order incoming chain revisions",
                transferredRevisions: 0,
                linkedChainsTransferred: 0,
                latestHashes: [],
                strategy: "none"
            };
        }
        
        // Find the latest hash of the incoming chain
        const incomingLatestHash = orderedIncomingChain[orderedIncomingChain.length - 1];
        console.log(`Incoming chain latest hash: ${incomingLatestHash}`);
        
        // Now examine target user's existing chains that might match or overlap with this chain
        // Start by checking if the genesis revision of the incoming chain exists for the target user
        const incomingGenesisHash = orderedIncomingChain[0];
        const targetGenesisHash = `${targetUserAddress}_${incomingGenesisHash}`;
        
        console.log(`Checking if target user has genesis revision: ${targetGenesisHash}`);
        const existingGenesis = await prisma.revision.findUnique({
            where: { pubkey_hash: targetGenesisHash }
        });
        
        if (!existingGenesis) {
            console.log("No matching genesis found, performing a simple transfer");
            // No overlap, so we just do a standard transfer (simplest case)
            const transferResult = await transferRevisionChain(
                entireChain,
                targetUserAddress,
                sourceUserAddress
            );
            
            appliedStrategy = "full_transfer";
            return {
                ...transferResult,
                strategy: appliedStrategy
            };
        }
        
        // Target user has the genesis, so we need to find where chains diverge (if they do)
        console.log("Found matching genesis, analyzing chains to find merge point");
        
        // Order target user's chain starting from the same genesis
        const targetUserChain = await orderUserChain(targetGenesisHash);
        if (!targetUserChain || targetUserChain.length === 0) {
            console.log("Failed to order target user's chain, fallback to transfer");
            // Something went wrong with ordering, fallback to transfer
            const transferResult = await transferRevisionChain(
                entireChain,
                targetUserAddress,
                sourceUserAddress
            );
            
            appliedStrategy = "full_transfer_fallback";
            return {
                ...transferResult,
                strategy: appliedStrategy
            };
        }
        
        console.log(`Target user chain has ${targetUserChain.length} revisions`);
        console.log(`Incoming chain has ${orderedIncomingChain.length} revisions`);
        
        // Find last common revision (divergence point)
        let lastCommonIndex = -1;
        let lastCommonHash = "";
        
        for (let i = 0; i < Math.min(targetUserChain.length, orderedIncomingChain.length); i++) {
            if (targetUserChain[i].split('_')[1] === orderedIncomingChain[i]) {
                lastCommonIndex = i;
                lastCommonHash = targetUserChain[i];
            } else {
                break; // Chains diverge at this point
            }
        }
        
        console.log(`Last common revision index: ${lastCommonIndex}, hash: ${lastCommonHash}`);
        mergePoint = lastCommonHash;
        
        if (lastCommonIndex === targetUserChain.length - 1) {
            // Target chain is a subset of incoming chain - simple addition case
            console.log("Target chain is a subset of incoming chain, adding new revisions");
            appliedStrategy = "simple_addition";
            
            // Transfer only the new revisions (from lastCommonIndex+1 onward)
            const newRevisions = orderedIncomingChain.slice(lastCommonIndex + 1);
            
            for (const hash of newRevisions) {
                const sourceFullHash = `${sourceUserAddress}_${hash}`;
                const targetFullHash = `${targetUserAddress}_${hash}`;
                
                // Get the original revision
                const originalRevision = await prisma.revision.findUnique({
                    where: { pubkey_hash: sourceFullHash }
                });
                
                if (!originalRevision) {
                    console.warn(`Original revision not found in database: ${sourceFullHash}`);
                    continue;
                }
                
                // Determine previous hash
                let previousHashFromSource = originalRevision.previous;
                let previousHash = "";
                
                if (previousHashFromSource) {
                    if (previousHashFromSource.startsWith(sourceUserAddress)) {
                        // If previous is from same source user, update to target user
                        const prevHashParts = previousHashFromSource.split('_');
                        if (prevHashParts.length > 1) {
                            previousHash = `${targetUserAddress}_${prevHashParts[1]}`;
                        }
                    } else {
                        // If it's an external reference, keep it as is
                        previousHash = previousHashFromSource;
                    }
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
                await transferRevisionAssociatedData(originalRevision, sourceFullHash, targetFullHash);
            }
            
            // Update latest hash to the new tip
            const latestHashValue = orderedIncomingChain[orderedIncomingChain.length - 1];
            const targetLatestHash = `${targetUserAddress}_${latestHashValue}`;
            
            // Remove the old latest entry and add a new one
            await updateLatestHash(targetUserAddress, targetUserChain[targetUserChain.length - 1], targetLatestHash);
            latestHashes.push(targetLatestHash);
            
        } else if (lastCommonIndex < targetUserChain.length - 1 && lastCommonIndex < orderedIncomingChain.length - 1) {
            // Chains have diverged - handle according to merge strategy
            console.log(`Chains diverge after index ${lastCommonIndex}, applying ${mergeStrategy} strategy`);
            appliedStrategy = mergeStrategy;
            
            if (mergeStrategy === "replace") {
                // Replace target's divergent revisions with incoming revisions
                
                // 1. Mark the divergent target revisions as obsolete (could soft-delete or add metadata)
                const divergentTargetRevisions = targetUserChain.slice(lastCommonIndex + 1);
                for (const obsoleteHash of divergentTargetRevisions) {
                    // You might want to mark these as obsolete rather than deleting
                    console.log(`Marking ${obsoleteHash} as obsolete due to replace strategy`);
                    // For example, add metadata or move to an "obsolete" status
                    // await prisma.revision.update({
                    //     where: { pubkey_hash: obsoleteHash },
                    //     data: { is_obsolete: true }
                    // });
                }
                
                // 2. Import the incoming chain's divergent revisions
                const newRevisions = orderedIncomingChain.slice(lastCommonIndex + 1);
                
                for (const hash of newRevisions) {
                    const sourceFullHash = `${sourceUserAddress}_${hash}`;
                    const targetFullHash = `${targetUserAddress}_${hash}`;
                    
                    // Get the original revision
                    const originalRevision = await prisma.revision.findUnique({
                        where: { pubkey_hash: sourceFullHash }
                    });
                    
                    if (!originalRevision) {
                        console.warn(`Original revision not found in database: ${sourceFullHash}`);
                        continue;
                    }
                    
                    // Determine previous hash
                    let previousHashFromSource = originalRevision.previous;
                    let previousHash = "";
                    
                    if (previousHashFromSource) {
                        if (previousHashFromSource.startsWith(sourceUserAddress)) {
                            // If previous is from same source user, update to target user
                            const prevHashParts = previousHashFromSource.split('_');
                            if (prevHashParts.length > 1) {
                                previousHash = `${targetUserAddress}_${prevHashParts[1]}`;
                            }
                        } else {
                            // If it's an external reference, keep it as is
                            previousHash = previousHashFromSource;
                        }
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
                    await transferRevisionAssociatedData(originalRevision, sourceFullHash, targetFullHash);
                }
                
                // 3. Update latest hash to the new tip from incoming chain
                const latestHashValue = orderedIncomingChain[orderedIncomingChain.length - 1];
                const targetLatestHash = `${targetUserAddress}_${latestHashValue}`;
                
                // Remove the old latest entry and add a new one
                await updateLatestHash(targetUserAddress, targetUserChain[targetUserChain.length - 1], targetLatestHash);
                latestHashes.push(targetLatestHash);
                
            } else { // "fork" strategy
                // Keep both branches (target's existing chain and import the divergent part as a separate branch)
                
                // 1. Import only the divergent part of the incoming chain
                const newRevisions = orderedIncomingChain.slice(lastCommonIndex + 1);
                
                for (const hash of newRevisions) {
                    const sourceFullHash = `${sourceUserAddress}_${hash}`;
                    const targetFullHash = `${targetUserAddress}_${hash}`;
                    
                    // Skip if revision already exists
                    const existingRev = await prisma.revision.findUnique({
                        where: { pubkey_hash: targetFullHash }
                    });
                    
                    if (existingRev) {
                        console.log(`Revision ${targetFullHash} already exists, skipping`);
                        continue;
                    }
                    
                    // Get the original revision
                    const originalRevision = await prisma.revision.findUnique({
                        where: { pubkey_hash: sourceFullHash }
                    });
                    
                    if (!originalRevision) {
                        console.warn(`Original revision not found in database: ${sourceFullHash}`);
                        continue;
                    }
                    
                    // Determine previous hash
                    let previousHashFromSource = originalRevision.previous;
                    let previousHash = "";
                    
                    if (previousHashFromSource) {
                        if (previousHashFromSource.startsWith(sourceUserAddress)) {
                            // If previous is from same source user, update to target user
                            const prevHashParts = previousHashFromSource.split('_');
                            if (prevHashParts.length > 1) {
                                previousHash = `${targetUserAddress}_${prevHashParts[1]}`;
                            }
                        } else {
                            // If it's an external reference, keep it as is
                            previousHash = previousHashFromSource;
                        }
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
                    await transferRevisionAssociatedData(originalRevision, sourceFullHash, targetFullHash);
                }
                
                // 2. Add the new tip as another "latest" entry, keeping the existing one
                // This creates a fork with two current tips
                const latestHashValue = orderedIncomingChain[orderedIncomingChain.length - 1];
                const targetLatestHash = `${targetUserAddress}_${latestHashValue}`;
                
                // Add a new latest entry without removing the existing one
                await prisma.latest.create({
                    data: {
                        hash: targetLatestHash,
                        user: targetUserAddress
                    }
                });
                
                latestHashes.push(targetLatestHash);
                // Also retain the existing latest hash
                latestHashes.push(targetUserChain[targetUserChain.length - 1]);
            }
        } else if (lastCommonIndex === orderedIncomingChain.length - 1) {
            // Incoming chain is a subset of target chain - nothing to add
            console.log("Incoming chain is a subset of target's chain, nothing to add");
            appliedStrategy = "no_change_needed";
            // The target user already has all these revisions and more
            latestHashes.push(targetUserChain[targetUserChain.length - 1]);
        }
        
        // Handle linked chains if they exist
        if (entireChain.linkedChains) {
            for (const [linkedHash, linkedChain] of Object.entries(entireChain.linkedChains)) {
                // Recursively merge each linked chain
                const linkedResult = await mergeRevisionChain(
                    linkedChain,
                    targetUserAddress,
                    sourceUserAddress,
                    mergeStrategy
                );
                
                if (linkedResult.success) {
                    linkedChainsTransferred++;
                    latestHashes = [...latestHashes, ...linkedResult.latestHashes];
                }
            }
        }
        
        return {
            success: true,
            message: `Successfully merged chain using "${appliedStrategy}" strategy: ${transferredRevisions} revisions and ${linkedChainsTransferred} linked chains`,
            transferredRevisions,
            linkedChainsTransferred,
            latestHashes,
            mergePoint,
            strategy: appliedStrategy
        };
    } catch (error: any) {
        console.error("Error in mergeRevisionChain:", error);
        return {
            success: false,
            message: `Error merging chain: ${error.message}`,
            transferredRevisions,
            linkedChainsTransferred,
            latestHashes,
            mergePoint,
            strategy: appliedStrategy
        };
    }
}

/**
 * Orders revisions in a chain from genesis to latest
 */
async function orderUserChain(genesisHash: string): Promise<string[]> {
    try {
        const orderedChain: string[] = [genesisHash];
        let currentHash = genesisHash;
        
        // Starting from genesis, follow the chain by finding revisions that point to the current one
        while (true) {
            const nextRevision = await prisma.revision.findFirst({
                where: {
                    previous: currentHash
                }
            });
            
            if (!nextRevision) {
                break;  // End of chain
            }
            
            orderedChain.push(nextRevision.pubkey_hash);
            currentHash = nextRevision.pubkey_hash;
        }
        
        return orderedChain;
    } catch (error) {
        console.error("Error ordering user chain:", error);
        return [];
    }
}

/**
 * Orders revisions in the incoming chain data
 */
function orderRevisionsInChain(chainData: any): string[] {
    try {
        const revisions = chainData.revisions || {};
        const ordered: string[] = [];
        
        // Find genesis (revision with no previous_verification_hash)
        let genesisHash = "";
        for (const [hash, revision] of Object.entries(revisions)) {
            if (!(revision as any).previous_verification_hash) {
                genesisHash = hash;
                break;
            }
        }
        
        if (!genesisHash) {
            // Fallback: look for revision not referenced as previous by any other
            const allHashes = new Set(Object.keys(revisions));
            const allPrevious = new Set();
            
            for (const revision of Object.values(revisions)) {
                const prevHash = (revision as any).previous_verification_hash;
                if (prevHash) {
                    allPrevious.add(prevHash);
                }
            }
            
            for (const hash of allHashes) {
                if (!allPrevious.has(hash)) {
                    genesisHash = hash;
                    break;
                }
            }
        }
        
        if (!genesisHash) {
            console.error("Could not find genesis revision");
            return [];
        }
        
        // Build ordered chain from genesis
        ordered.push(genesisHash);
        let currentHash = genesisHash;
        
        while (true) {
            // Find revision that refers to current hash as its previous
            let found = false;
            for (const [hash, revision] of Object.entries(revisions)) {
                if ((revision as any).previous_verification_hash === currentHash) {
                    ordered.push(hash);
                    currentHash = hash;
                    found = true;
                    break;
                }
            }
            
            if (!found) {
                break;  // End of chain reached
            }
        }
        
        return ordered;
    } catch (error) {
        console.error("Error ordering revisions:", error);
        return [];
    }
}

/**
 * Updates the latest hash entry for a user
 */
async function updateLatestHash(userAddress: string, oldHash: string, newHash: string): Promise<void> {
    try {
        // First check if old hash is in the latest table
        const existingLatest = await prisma.latest.findFirst({
            where: {
                hash: oldHash,
                user: userAddress
            }
        });
        
        if (existingLatest) {
            // Update existing entry to point to new hash
            await prisma.latest.update({
                where: {
                    hash: oldHash
                },
                data: {
                    hash: newHash
                }
            });
        } else {
            // Create new latest entry
            await prisma.latest.create({
                data: {
                    hash: newHash,
                    user: userAddress
                }
            });
        }
    } catch (error) {
        console.error("Error updating latest hash:", error);
        throw error;
    }
}

/**
 * Transfers associated data for a revision (signatures, forms, etc.)
 */
async function transferRevisionAssociatedData(
    originalRevision: Revision,
    sourceFullHash: string,
    targetFullHash: string
): Promise<void> {
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
            break;
            
        case "file":
            // For file revisions, handle file indexes
            const fileIndexes = await prisma.fileIndex.findMany({
                where: {
                    hash: {
                        has: sourceFullHash
                    }
                }
            });
            
            for (const fileIndex of fileIndexes) {
                // Update file index to include the new hash
                await prisma.fileIndex.update({
                    where: { id: fileIndex.id },
                    data: {
                        hash: [...fileIndex.hash, targetFullHash],
                        reference_count: (fileIndex.reference_count || 0) + 1
                    }
                });
            }
            break;
    }
}
