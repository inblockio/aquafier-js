

import { prisma } from '../database/db';
import { AquaTree, FileObject, Revision as AquaRevision, OrderRevisionInAquaTree } from 'aqua-js-sdk';
import { Revision, Link, Signature, WitnessEvent, AquaForms, FileIndex } from '@prisma/client';
import * as fs from "fs"
import { ExtendedAquaTree, ExtendedAquaTreeData } from 'src/models/types';
import { createAquaTreeFromRevisions } from './revisions_operations_utils';



/**
 * Fetches the complete revision chain starting from a given hash,
 * including traversing linked revisions recursively.
 * 
 * Refactored to use the modular helper functions from the working implementation.
 */
export async function fetchCompleteRevisionChain(
    latestHash: string,
    userAddress: string,
    url: string,
    _processedHashes: Set<string> = new Set(),
    _includeLinkedChains: boolean = true,
    _depth: number = 0,
    includeFileObjects: boolean = false
): Promise<ExtendedAquaTreeData> {
    const fullLatestHash = `${userAddress}_${latestHash}`;
    const indent = "  ".repeat(_depth);

    console.log(`${indent}[Depth:${_depth}] Fetching chain for ${fullLatestHash}`);

    // Check for circular references
    if (_processedHashes.has(fullLatestHash)) {
        console.warn(`${indent}[Depth:${_depth}] Already processed hash: ${fullLatestHash}. Stopping recursion.`);
        return { revisions: {}, file_index: {}, linkedChains: {} };
    }

    _processedHashes.add(fullLatestHash);

    try {
        // Use the working createAquaTreeFromRevisions function as the base
        const [baseAquaTree, baseFileObjects] = await createAquaTreeFromRevisions(fullLatestHash, url);
        
        // Convert to ExtendedAquaTreeData format
        let extendedAquaTree: ExtendedAquaTreeData = {
            revisions: baseAquaTree.revisions,
            file_index: baseAquaTree.file_index,
            linkedChains: _includeLinkedChains ? {} : undefined,
            fileObjects: includeFileObjects ? baseFileObjects : undefined
        };

        // Process linked chains if enabled
        if (_includeLinkedChains && extendedAquaTree.linkedChains) {
            extendedAquaTree = await processLinkedChains(
                extendedAquaTree,
                userAddress,
                url,
                _processedHashes,
                _depth,
                includeFileObjects,
                indent
            );
        }

        console.log(`${indent}[Depth:${_depth}] Successfully processed chain for ${fullLatestHash}`);
        return extendedAquaTree;

    } catch (error) {
        console.error(`${indent}[Depth:${_depth}] Error fetching revision chain for ${fullLatestHash}:`, error);
        throw error;
    }
}

/**
 * Process linked chains recursively using the existing helper functions
 */
async function processLinkedChains(
    aquaTree: ExtendedAquaTreeData,
    userAddress: string,
    url: string,
    processedHashes: Set<string>,
    depth: number,
    includeFileObjects: boolean,
    indent: string
): Promise<ExtendedAquaTreeData> {
    const updatedAquaTree = { ...aquaTree };
    let allFileObjects = [...(aquaTree.fileObjects || [])];

    // Find all link revisions in the current tree
    const linkRevisions = Object.entries(aquaTree.revisions).filter(
        ([_, revision]) => revision.revision_type === 'link'
    );

    for (const [hashOnly, linkRevision] of linkRevisions) {
        console.log(`${indent}[Depth:${depth}] Processing link revision: ${hashOnly}`);
        
        if (linkRevision.link_verification_hashes && linkRevision.link_verification_hashes.length > 0) {
            for (const linkedHash of linkRevision.link_verification_hashes) {
                if (typeof linkedHash === 'string' && linkedHash.length > 0) {
                    console.log(`${indent}[Depth:${depth}] Processing linked hash: ${linkedHash}`);

                    // Skip if already processed
                    const fullLinkedHash = linkedHash.includes('_') ? linkedHash : `${userAddress}_${linkedHash}`;
                    if (processedHashes.has(fullLinkedHash)) {
                        console.log(`${indent}[Depth:${depth}] Skipping already processed linked hash: ${linkedHash}`);
                        continue;
                    }

                    try {
                        // Update file index for the linked hash using existing helper
                        const fileIndexValue = await updateFileIndexForLinkedHash(linkedHash);
                        updatedAquaTree.file_index[linkedHash] = fileIndexValue;

                        // Recursively fetch the linked chain
                        const linkedProcessedHashes = new Set<string>(processedHashes);
                        const completeLinkedTree = await fetchCompleteRevisionChain(
                            linkedHash,
                            userAddress,
                            url,
                            linkedProcessedHashes,
                            true,
                            depth + 1,
                            includeFileObjects
                        );

                        if (Object.keys(completeLinkedTree.revisions).length > 0) {
                            console.log(`${indent}[Depth:${depth}] Adding linked tree with ${Object.keys(completeLinkedTree.revisions).length} revisions`);
                            
                            // Create compound key for linked chains
                            const compoundKey = `${hashOnly}_${linkedHash}`;
                            if (updatedAquaTree.linkedChains) {
                                updatedAquaTree.linkedChains[compoundKey] = completeLinkedTree;
                            }

                            // Merge file objects if requested
                            if (includeFileObjects && completeLinkedTree.fileObjects) {
                                allFileObjects.push(...completeLinkedTree.fileObjects);
                            }
                        }
                    } catch (linkError) {
                        console.error(`${indent}[Depth:${depth}] Error processing linked hash ${linkedHash}:`, linkError);
                        // Set error value for this linked hash
                        updatedAquaTree.file_index[linkedHash] = '--error--';
                    }
                }
            }
        }
    }

    // Update file objects if requested
    if (includeFileObjects) {
        updatedAquaTree.fileObjects = allFileObjects;
    }

    return updatedAquaTree;
}

/**
 * Update file index for a linked hash using existing database queries
 * Returns the file index value instead of mutating the object
 */
async function updateFileIndexForLinkedHash(linkedHash: string): Promise<string> {
    try {
        // Use the same logic as the working implementation
        let linkedFileIndex = await prisma.fileIndex.findFirst({
            where: { pubkey_hash: { has: linkedHash } }
        });
        
        if (!linkedFileIndex) {
            linkedFileIndex = await prisma.fileIndex.findFirst({
                where: { file_hash: linkedHash }
            });
        }

        // Find FileName for user-friendly name
        let fileNameEntry = await prisma.fileName.findFirst({ 
            where: { pubkey_hash: linkedHash } 
        });

        return fileNameEntry?.file_name ?? linkedFileIndex?.file_hash ?? '--error--';
    } catch (error) {
        console.error(`Error updating file index for linked hash ${linkedHash}:`, error);
        return '--error--';
    }
}

/**
 * Diagnostic function to check link table structure and data
 * Can be called from API routes to debug link issues
 */
export async function diagnoseLinks(): Promise<void> {
    console.log('===== LINK TABLE DIAGNOSTIC =====');

    try {
        // 1. First check if any link-type revisions exist
        const linkRevisions = await prisma.revision.findMany({
            where: { revision_type: 'link' },
            take: 10 // Increased to 10 for more diagnostic data
        });

        console.log(`Found ${linkRevisions.length} link revisions`);

        if (linkRevisions.length === 0) {
            console.log('No link revisions found in database');
            return;
        }

        // 2. For each link revision, check both implementations
        for (const linkRev of linkRevisions) {
            console.log(`\n=== Analyzing link revision: ${linkRev.pubkey_hash} ===`);

            // 2.1 Test using revisions_utils approach
            console.log('Testing with revisions_utils approach:');
            try {
                const linkData = await prisma.link.findFirst({
                    where: { hash: linkRev.pubkey_hash }
                });

                if (linkData) {
                    console.log('✅ Found link using revisions_utils approach');
                    console.log('Link data structure:', Object.keys(linkData));
                    console.log('Link type:', linkData.link_type);
                    console.log('Link verification hashes:', linkData.link_verification_hashes);
                    console.log('Link file hashes:', linkData.link_file_hashes);

                    // Test recursive lookup
                    if (linkData.link_verification_hashes && linkData.link_verification_hashes.length > 0) {
                        const linkedHash = linkData.link_verification_hashes[0];
                        console.log(`Testing linked hash: ${linkedHash}`);

                        // Try to fetch the linked revision
                        const linkedRev = await prisma.revision.findFirst({
                            where: { pubkey_hash: { equals: linkedHash } }
                        });

                        console.log(`Linked revision exists: ${!!linkedRev}`);
                        if (linkedRev) {
                            console.log('Linked revision type:', linkedRev.revision_type);

                            // throw Error(`PLEASELinked revision found: ${linkedRev.pubkey_hash}, type: ${linkedRev.revision_type}`);
                           
                            // Check if FileIndex exists for this link
                            const linkedFileIndex = await prisma.fileIndex.findFirst({
                                where: { pubkey_hash: { has: linkedHash } }
                            });

                            console.log(`FileIndex exists for linked hash: ${!!linkedFileIndex}`);
                            if (linkedFileIndex) {
                                // Removed logging of .uri for FileIndex (not present in schema)
                            } else {
                                // Try alternate approach with fuzzy match
                                const parts = linkedHash.split('_');
                                if (parts.length === 2) {
                                    const linkedHashOnly = parts[1];
                                    const fuzzyFileIndex = await prisma.fileIndex.findFirst({
                                        where: {
                                            pubkey_hash: {
                                                has: linkedHashOnly,
                                                
                                            }
                                        }
                                    });

                                    console.log(`FileIndex exists via fuzzy match: ${!!fuzzyFileIndex}`);
                                    if (fuzzyFileIndex) {
                                        // Removed logging of .uri for FileIndex (not present in schema)
                                    }
                                }
                            }
                        }
                    } else {
                        console.log('❌ No link verification hashes found');
                    }
                } else {
                    console.log('❌ Link not found using revisions_utils approach');
                }
            } catch (err) {
                console.error(`Error in revisions_utils approach:`, err);
            }

            console.log('\n');
        }

        // 3. Check Link table structure
        try {
            const tableInfo = await prisma.$queryRaw`
                SELECT column_name, data_type 
                FROM information_schema.columns 
                WHERE table_name = 'Link'
            `;

            console.log('\nLink table structure:');
            console.log(tableInfo);
        } catch (err) {
            console.error('Could not retrieve Link table structure:', err);
        }

    } catch (error) {
        console.error('Error in diagnoseLinks:', error);
    }

    console.log('===== END DIAGNOSTIC =====');
}

