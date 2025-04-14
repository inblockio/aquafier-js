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
