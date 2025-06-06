import { prisma } from '../database/db';
import { AquaTree, FileObject, Revision as AquaRevision, OrderRevisionInAquaTree } from 'aqua-js-sdk';
import { Revision, Link, Signature, WitnessEvent, AquaForms, FileIndex } from '@prisma/client';
import * as fs from "fs"
import { ExtendedAquaTree, ExtendedAquaTreeData } from '../models/types';



// --- Internal Helper Functions --- //
 
/**
 * Recursively fetches all ancestor revisions starting from a given hash.
 * @param revisionHash The starting revision hash (including user address prefix).
 * @returns A Promise resolving to an array of Revision objects.
 */
async function _findAquaTreeRevision(revisionHash: string): Promise<Array<Revision>> {
    let revisions: Array<Revision> = [];

    // Fetch latest revision 
    let latestRevionData = await prisma.revision.findFirst({
        where: {
            pubkey_hash: revisionHash
        }
    });

    if (latestRevionData == null) {
        // If the initial hash isn't found, log an error or throw
        console.error(`Unable to get revision with hash ${revisionHash}`);
        return [];
    }

    console.log(`Found revision: ${latestRevionData.pubkey_hash}, type: ${latestRevionData.revision_type}`);
    revisions.push(latestRevionData);


    // Recursively fetch previous revisions if a previous hash exists
    if (latestRevionData?.previous) {
        let previousWithPubKey = latestRevionData.previous; // Assume previous already includes pubkey

        // Defensive check: add pubKey prefix if somehow missing
        if (!previousWithPubKey.includes('_')) {
            const pubKey = revisionHash.split("_")[0];
            if (pubKey) { // Ensure pubKey was found
                previousWithPubKey = `${pubKey}_${latestRevionData.previous}`;
            } else {
                console.error(`Could not extract pubKey from ${revisionHash} to prepend to previous hash ${latestRevionData.previous}`);
                return revisions; // Return what we have so far
            }
        }

        // Fetch the ancestor chain recursively
        try {
            const ancestorRevisions = await _findAquaTreeRevision(previousWithPubKey);
            revisions.push(...ancestorRevisions);
        } catch (error) {
            console.error(`Error fetching ancestor revision chain for ${previousWithPubKey}:`, error);
            return revisions; // Return what we have so far
        }
    }

    return revisions;
}

/**
 * Fetches specific data associated with a non-"file" revision type.
 * @param hash The revision hash (including user address prefix).
 * @param revision The Revision object itself.
 * @returns A Promise resolving to the specific data (Signature, WitnessEvent, etc.) or null.
 */
async function _FetchRevisionInfo(hash: string, revision: Revision): Promise<Signature | WitnessEvent | AquaForms[] | Link | null> {
    console.log(`Fetching revision info for type: ${revision.revision_type}, hash: ${hash}`);

    switch (revision.revision_type) {
        case "signature":
            return await prisma.signature.findFirst({ where: { hash: hash } });
        case "witness":
            const witnessLink = await prisma.witness.findFirst({ where: { hash: hash } });
            if (!witnessLink || !witnessLink.Witness_merkle_root) {
                console.error(`Witness link or merkle root not found for witness revision ${hash}`);
                return null; // Or throw error
            }
            return await prisma.witnessEvent.findFirst({ where: { Witness_merkle_root: witnessLink.Witness_merkle_root } });
        case "form":
            return await prisma.aquaForms.findMany({ where: { hash: hash } });
        case "link":
            // Simplify link fetching based on the working implementation
            console.log(`Querying link table for hash: ${hash}`);
            const linkData = await prisma.link.findFirst({
                where: { hash: hash }
            });

            console.log(`Link data found:`, linkData);
            return linkData;
        case "file": // File revisions don't fetch extra info here
            return null;
        default:
            console.warn(`Unknown revision type encountered: ${revision.revision_type} for hash ${hash}`);
            return null;
    }
}

/**
 * Estimates the size in bytes that a string would occupy if saved to a file
 * Uses UTF-8 encoding rules where ASCII chars take 1 byte and others take 2-4 bytes
 * @param str Input string to estimate size for
 * @returns Estimated size in bytes
 */
function _estimateStringFileSize(str: string): number {
    if (!str) return 0;
    return Buffer.byteLength(str, 'utf8'); // Use Buffer for efficiency
}

// --- Main Public Function --- //


/**
 * Fetches the complete revision chain starting from a given hash,
 * including traversing linked revisions recursively.
 *
 * @param latestHash The starting revision hash (without the user address prefix).
 * @param userAddress The address of the user owning the revision chain.
 * @param url The base URL for constructing file links (currently unused in this version but kept for potential future use).
 * @param _processedHashes Internal set to prevent infinite loops in case of circular links.
 * @param _includeLinkedChains Whether to include full linked chains in the response (default: true).
 * @param _depth Current recursion depth for debugging (default: 0).
 * @param includeFileObjects Whether to include fileObjects in the response (default: false).
 * @returns A Promise resolving to the ExtendedAquaTreeData containing the complete revision chain and optionally fileObjects.
 */
export async function fetchCompleteRevisionChain(
    latestHash: string,
    userAddress: string,
    url: string, // Keep url param for potential future file link generation
    _processedHashes: Set<string> = new Set(), // Add cycle detection
    _includeLinkedChains: boolean = true,
    _depth: number = 0,
    includeFileObjects: boolean = false
): Promise<ExtendedAquaTreeData> {
    const fullLatestHash = `${userAddress}_${latestHash}`;
    const indent = "  ".repeat(_depth); // For prettier logging

    console.log(`${indent}[Depth:${_depth}] Fetching chain for ${fullLatestHash}`);

    // Check if we've already processed this hash
    if (_processedHashes.has(fullLatestHash)) {
        console.warn(`${indent}[Depth:${_depth}] Already processed hash: ${fullLatestHash}. Stopping recursion.`);
        return { revisions: {}, file_index: {}, linkedChains: {} }; // Return empty tree to prevent infinite recursion
    }

    // Mark this hash as processed IMMEDIATELY to prevent recursive calls
    _processedHashes.add(fullLatestHash);

    // Fixed type annotation to match the return type
    const anAquaTree: ExtendedAquaTreeData = {
        revisions: {},
        file_index: {},
        linkedChains: _includeLinkedChains ? {} : undefined
    };
    let fileObjects: FileObject[] = []; // Keep track of associated files

    let allRevisionData: any[] = []; // Changed from Revision[] to any[] to match usage
    try {
        console.log(`${indent}[Depth:${_depth}] Fetching chain for ${fullLatestHash}`);
        // Fetch the main chain starting from the latest hash
        allRevisionData = await _findAquaTreeRevision(fullLatestHash);

        if (allRevisionData.length === 0) {
            console.warn(`${indent}[Depth:${_depth}] No revisions found for initial hash: ${fullLatestHash}`);
            return anAquaTree; // Return empty tree if no revisions found
        }

        // Also check for "forward" revisions (revisions that reference this one as their previous)
        // This ensures we get the complete chain including newer revisions
        // let forwardRevisions: Revision[] = [];
        // let queryHash = fullLatestHash;

        // while (true) {
        //     console.log(`${indent}[Depth:${_depth}] Checking for forward revisions from ${queryHash}`);
        //     const nextRevision = await prisma.revision.findFirst({
        //         where: {
        //             previous: queryHash
        //         }
        //     });

        //     if (!nextRevision) {
        //         console.log(`${indent}[Depth:${_depth}] No more forward revisions from ${queryHash}`);
        //         break;
        //     }

        //     console.log(`${indent}[Depth:${_depth}] Found forward revision: ${nextRevision.pubkey_hash}, type: ${nextRevision.revision_type}`);
        //     forwardRevisions.push(nextRevision);
        //     queryHash = nextRevision.pubkey_hash;
        // }

        // // If we found forward revisions, add them to the beginning of our list
        // // so they're processed first (in chronological order)
        // if (forwardRevisions.length > 0) {
        //     console.log(`${indent}[Depth:${_depth}] Found ${forwardRevisions.length} forward revisions`);
        //     allRevisionData = [...forwardRevisions, ...allRevisionData];
        // }

        // console.log(`${indent}[Depth:${_depth}] Total ${allRevisionData.length} revisions in full chain for ${fullLatestHash}`);
        // allRevisionData.forEach(rev => {
        //     console.log(`${indent}[Depth:${_depth}] Chain item: ${rev.pubkey_hash}, type: ${rev.revision_type}`);
        // });
    } catch (error) {
        console.error(`${indent}[Depth:${_depth}] Error fetching initial revision chain for ${fullLatestHash}:`, error);
        throw error; // Re-throw error if initial fetch fails
    }

    // const result = allRevisionData.reduce((acc: any, item) => {
    //     acc[item.pubkey_hash] = item;
    //     return acc;
    //   }, {});

    const revisionsObjects: Record<string, any> = {};

    for (const rev of allRevisionData) {
        revisionsObjects[rev.pubkey_hash] = {
            ...rev,
            previous_verification_hash: rev.previous
        };
    }

    // Determine the hash of the earliest revision in this chain (potential genesis)
    const orderedRevisionData = OrderRevisionInAquaTree({
        revisions: revisionsObjects,
        file_index: {}
    })
    
    const orderedRevisionsData = Object.values(orderedRevisionData.revisions)
    const genesisRevisionInChain = orderedRevisionsData[0];
    const genesisHashInChain = genesisRevisionInChain.pubkey_hash.split('_')[1];

    // Find associated file indexes based on the genesis hash of this chain
    let fileIndexes: any[] = []; // Changed from FileIndex[] to any[]
    if (genesisHashInChain) {
        try {
            console.log(`${indent}[Depth:${_depth}] Finding FileIndexes for chain with genesis hash: ${genesisHashInChain}`);

            // Find FileIndex entries where the genesis hash (prefixed) is present in the `hash` array
            // Note: This logic assumes FileIndex.hash stores prefixed hashes.
            fileIndexes = await prisma.fileIndex.findMany({
                where: {
                    pubkey_hash: {
                        has: genesisRevisionInChain.pubkey_hash // Check if the prefixed hash exists in the array
                    }
                }
            });

            if (fileIndexes.length > 0) {
                console.log(`${indent}[Depth:${_depth}] Found ${fileIndexes.length} FileIndexes for genesis hash ${genesisHashInChain}`);
                for (const fi of fileIndexes) {
                    console.log(`${indent}[Depth:${_depth}] FileIndex: ${fi.file_hash}`, fi.pubkey_hash);
                }
            } else {
                console.log(`${indent}[Depth:${_depth}] No FileIndexes found for genesis hash, trying non-prefixed hash`);
                throw Error(`No FileIndexes found for genesis hash ${genesisHashInChain}`);
                // Try with non-prefixed hash as fallback
                // fileIndexes = await prisma.fileIndex.findMany({
                //     where: {
                //         pubkey_hash: {
                //             has: genesisHashInChain
                //         }
                //     }
                // });

                // if (fileIndexes.length > 0) {
                //     console.log(`${indent}[Depth:${_depth}] Found ${fileIndexes.length} FileIndexes for non-prefixed genesis hash`);
                // }
            }

            // If still no fileIndexes found, try a more general approach for any revision hash
            if (fileIndexes.length === 0) {
                console.log(`${indent}[Depth:${_depth}] No FileIndexes found via genesis hash, checking all revisions`);

                // Try looking for FileIndex for any revision in this chain
                for (const rev of allRevisionData) {
                    const foundIndexes = await prisma.fileIndex.findMany({
                        where: {
                            pubkey_hash: {
                                has: rev.pubkey_hash
                            }
                        }
                    });

                    if (foundIndexes.length > 0) {
                        console.log(`${indent}[Depth:${_depth}] Found ${foundIndexes.length} FileIndexes for revision: ${rev.pubkey_hash}`);
                        fileIndexes.push(...foundIndexes);
                        break; // Found some indexes, so stop searching
                    }
                }
            }

        } catch (error) {
            console.error(`${indent}[Depth:${_depth}] Error fetching file indexes for genesis hash ${genesisHashInChain} (full: ${genesisRevisionInChain.pubkey_hash}):`, error);
            // Decide how to handle: continue without index info, or throw?
        }
    }


    // Process each revision in the fetched chain
    for (const revisionItem of orderedRevisionsData) {
        console.log(`${indent}[Depth:${_depth}] Revision item: `, revisionItem)
        const hashOnly = revisionItem.pubkey_hash.split('_')[1];
        if (!hashOnly) {
            console.error(`${indent}[Depth:${_depth}] Could not extract hashOnly from pubkey_hash: ${revisionItem.pubkey_hash}`);
            continue; // Skip this revision if hash is malformed
        }

        const previousHashOnly = revisionItem.previous
            ? revisionItem.previous.split('_')[1] ?? ""
            : "";

        let revisionWithData: any = { // Changed from AquaRevision to any
            revision_type: revisionItem.revision_type,
            previous_verification_hash: previousHashOnly,
            local_timestamp: revisionItem.local_timestamp ?? new Date(0).toISOString(), // Use string directly, provide default ISO string
            version: "https://aqua-protocol.org/docs/v3/schema_2 | SHA256 | Method: scalar", // Example version
            // Include leaves if they exist
            ...(revisionItem.verification_leaves && revisionItem.verification_leaves.length > 0 && { leaves: revisionItem.verification_leaves as string[] }),
        };

        // --- Handle different revision types --- 

        if (revisionItem.revision_type === "file") {
            // For file revisions, add file_hash and file_nonce
            revisionWithData.file_nonce = revisionItem.nonce ?? "--error--"; // Use nonce from revision
            // Find the associated FileIndex to get the definitive file_hash and uri
            const fileIndexForFileRev = fileIndexes.find(fi => fi.pubkey_hash.includes(revisionItem.pubkey_hash) || fi.file_hash === hashOnly);
            if (fileIndexForFileRev) {
                revisionWithData.file_hash = fileIndexForFileRev.file_hash ?? "--error--";
                // Optionally add the file index URI to the main tree's index
                if (!anAquaTree.file_index[hashOnly]) { // Add only if not already present (genesis might add it later)
                    anAquaTree.file_index[hashOnly] = fileIndexForFileRev.file_hash ?? "--error--";
                }
                
                // If we're including fileObjects, create and add a FileObject for this file revision
                if (includeFileObjects) {
                    // Create a FileObject based on the file revision information
                    const fileItem = await prisma.file.findFirst({
                        where: {
                            file_hash: fileIndexForFileRev.file_hash,
                        }
                    });
                    const stats = fs.statSync(fileItem!!.file_location!!);
                    const fileSizeInBytes = stats.size;
                    const fileObject: FileObject = {
                        fileName: fileIndexForFileRev.file_hash ?? "--error_uri--",
                        fileContent: `${url}/files/${fileIndexForFileRev.file_hash}`, // Using file_hash as content reference
                        path: "./",
                        // fileSize: fileIndexForFileRev.reference_count ? Number(fileIndexForFileRev.reference_count) : 0 // Using reference_count as a fallback for size
                        fileSize: fileSizeInBytes
                    };
                    
                    // Add to our fileObjects array
                    fileObjects.push(fileObject);
                }
            } else {
                console.warn(`${indent}[Depth:${_depth}] FileIndex not found for file revision: ${revisionItem.pubkey_hash}. File hash might be missing.`);
                revisionWithData.file_hash = "--error_no_index--";
            }
        } else {
            // For non-file types, fetch additional info
            const revisionInfoData = await _FetchRevisionInfo(revisionItem.pubkey_hash, revisionItem as any);

            if (!revisionInfoData && revisionItem?.revision_type !== 'file' as any) { // file type handled above
                // Log warning if info is expected but not found
                console.warn(`${indent}[Depth:${_depth}] Revision info not found for ${revisionItem.revision_type} revision: ${revisionItem.pubkey_hash}`);
                // Continue processing the revision with available data
            } else if (revisionInfoData) {

                switch (revisionItem.revision_type) {
                    case "form":
                        const formItems = revisionInfoData as any[]; // Changed from AquaForms[]
                        formItems.forEach(item => {
                            if (item.key) {
                                revisionWithData[item.key] = item.value; // Add form key-value pairs
                            }
                        });
                        break;
                    case "witness":
                        const witnessData = revisionInfoData as any; // Changed from WitnessEvent
                        revisionWithData.witness_merkle_root = witnessData.Witness_merkle_root;
                        revisionWithData.witness_timestamp = witnessData.Witness_timestamp ? parseInt(witnessData.Witness_timestamp, 10) : 0;
                        revisionWithData.witness_network = witnessData.Witness_network ?? undefined;
                        revisionWithData.witness_smart_contract_address = witnessData.Witness_smart_contract_address ?? undefined;
                        revisionWithData.witness_transaction_hash = witnessData.Witness_transaction_hash ?? undefined;
                        revisionWithData.witness_sender_account_address = witnessData.Witness_sender_account_address ?? undefined;
                        // revisionWithData.witness_merkle_proof = []; // Merkle proof needs separate handling if required
                        break;
                    case "signature":
                        const signatureData = revisionInfoData as any; // Changed from Signature
                        try {
                            // Attempt to parse if it's JSON (e.g., DID signature)
                            revisionWithData.signature = JSON.parse(signatureData.signature_digest ?? '""');
                        } catch (e) {
                            // Otherwise, treat as a plain string
                            revisionWithData.signature = signatureData.signature_digest ?? "";
                        }
                        revisionWithData.signature_public_key = signatureData.signature_public_key ?? undefined;
                        revisionWithData.signature_wallet_address = signatureData.signature_wallet_address ?? undefined;
                        revisionWithData.signature_type = signatureData.signature_type ?? undefined;
                        break;
                    case "link":
                        const linkData = revisionInfoData as any; // Changed from Link
                        revisionWithData.link_type = linkData.link_type ?? undefined;
                        revisionWithData.link_verification_hashes = linkData.link_verification_hashes as string[];
                        revisionWithData.link_file_hashes = linkData.link_file_hashes as string[];

                        console.log(`${indent}[Depth:${_depth}] Processing LINK revision: ${revisionItem.pubkey_hash}`);
                        console.log(`${indent}[Depth:${_depth}] Link verification hashes:`, linkData.link_verification_hashes);
                        console.log(`${indent}[Depth:${_depth}] Link file hashes:`, linkData.link_file_hashes);

                        // --- Recursively fetch linked chains --- 
                        if (linkData.link_verification_hashes && linkData.link_verification_hashes.length > 0) {
                            for (const linkedHash of linkData.link_verification_hashes) {
                                if (typeof linkedHash === 'string' && linkedHash.length > 0) {
                                    console.log(`${indent}[Depth:${_depth}] Processing linked hash: ${linkedHash}`);

                                    // Find FileIndex for the linked hash (by pubkey_hash or file_hash)
                                    let linkedFileIndex = await prisma.fileIndex.findFirst({
                                        where: { pubkey_hash: { has: linkedHash } }
                                    });
                                    if (!linkedFileIndex) {
                                        linkedFileIndex = await prisma.fileIndex.findFirst({
                                            where: { file_hash: linkedHash }
                                        });
                                    }
                                    // Find FileName for user-friendly name
                                    let fileNameEntry = await prisma.fileName.findFirst({ where: { pubkey_hash: linkedHash } });
                                    anAquaTree.file_index[linkedHash] = fileNameEntry?.file_name ?? linkedFileIndex?.file_hash ?? '--error--';

                                    // For linkedChains feature, we need to recursively fetch each linked chain as a complete tree
                                    if (_includeLinkedChains && anAquaTree.linkedChains) {
                                        try {
                                            // Skip if already processed to prevent infinite recursion
                                            if (_processedHashes.has(linkedHash)) {
                                                console.log(`${indent}[Depth:${_depth}] Skipping already processed linked chain: ${linkedHash}`);
                                                continue;
                                            }

                                            console.log(`${indent}[Depth:${_depth}] Building complete linked chain for ${linkedHash} to add to linkedChains`);

                                            // First try to find the file index for this linked hash
                                            // We need this for the genesis revision in the linked chain
                                            try {
                                                // Check if we can find a file index for this linked hash
                                                // This will help populate the file_index for the linked chain's genesis

                                                let pubHash = anAquaTree.linkedChains?.[linkedHash]?.revisions?.[linkedHash]?.link_verification_hashes?.[0] ?? linkedHash
                                              
                                                console.log(`${indent}[Depth:${_depth}] Pre-fetching FileIndex for linked chain's genesis: ${pubHash}`);
                                                const linkedFileIndex = await prisma.fileIndex.findFirst({
                                                    where: {
                                                        pubkey_hash: {
                                                            has: pubHash
                                                        }
                                                    }
                                                });

                                                if (linkedFileIndex) {
                                                    console.log(`${indent}[Depth:${_depth}] Found FileIndex for linked chain's genesis: ${linkedFileIndex.file_hash}`);
                                                }
                                            } catch (indexError) {
                                                console.warn(`${indent}[Depth:${_depth}] Error pre-fetching FileIndex for linked chain: ${indexError}`);
                                            }

                                            // Create a new set of processed hashes for this chain to avoid conflicts
                                            // We use a new Set that INCLUDES all the currently processed hashes
                                            // to avoid revisiting any already processed revision
                                            const linkedProcessedHashes = new Set<string>(_processedHashes);

                                            // Fetch the complete chain for this link as a separate tree
                                            const completeLinkedTree = await fetchCompleteRevisionChain(
                                                linkedHash,
                                                userAddress,  // Use the original user address
                                                url,
                                                linkedProcessedHashes,
                                                true, // Include nested chains
                                                _depth + 1,
                                                includeFileObjects // Pass down the includeFileObjects parameter
                                            );

                                            if (Object.keys(completeLinkedTree.revisions).length > 0) {
                                                console.log(`${indent}[Depth:${_depth}] Adding linked tree to linkedChains with ${Object.keys(completeLinkedTree.revisions).length} revisions`);
                                                // Store the complete tree in the linkedChains object
                                                // Extract hashOnly from revisionItem.pubkey_hash
                                                const parentHashOnly = revisionItem.pubkey_hash.split('_')[1] || '';
                                                // Create compound key with parent hash and linked hash
                                                const compoundKey = `${parentHashOnly}_${linkedHash}`;
                                                // Store with the compound key instead of just linkedHash
                                                anAquaTree.linkedChains[compoundKey] = completeLinkedTree;
                                                console.log(`${indent}[Depth:${_depth}] Using compound key: ${compoundKey} for linkedChains`);
                                                
                                                // Merge fileObjects from linked chains if they exist
                                                if (includeFileObjects && completeLinkedTree.fileObjects && completeLinkedTree.fileObjects.length > 0) {
                                                    fileObjects.push(...completeLinkedTree.fileObjects);
                                                }
                                            } else {
                                                console.warn(`${indent}[Depth:${_depth}] Linked tree for linkedChains is empty: ${linkedHash}`);
                                            }
                                        } catch (linkError) {
                                            console.error(`${indent}[Depth:${_depth}] Error building linked chain for linkedChains: ${linkedHash}`, linkError);
                                        }
                                    }
                                }
                            }
                        }
                        break;
                } // end switch
            } // end else if (revisionInfoData)
        } // end else (non-file type)

        // --- Finalize revision processing --- 

        // Add file index for the genesis revision of the current chain segment
        if (!previousHashOnly) { // Check if it's a genesis revision (no previous)
            console.log(`${indent}[Depth:${_depth}] Found genesis revision: ${revisionItem.pubkey_hash}, hash: ${hashOnly}`);

            // Try to find the file index for this genesis hash
            const genesisFileIndex = fileIndexes.find(item => item.pubkey_hash.includes(revisionItem.pubkey_hash) || item.file_hash === hashOnly);

            if (genesisFileIndex) {
                console.log(`${indent}[Depth:${_depth}] Found FileIndex for genesis with file_hash: ${genesisFileIndex.file_hash}`);
                anAquaTree.file_index[hashOnly] = genesisFileIndex.file_hash ?? "--error--";
                // Add file_hash to the genesis revision itself if it's a file type (might be redundant but ensures presence)
                if (revisionWithData.revision_type === 'file') {
                    revisionWithData.file_hash = genesisFileIndex.file_hash ?? "--error--";
                }
            } else {
                // If we didn't find the file index in our initial lookup, try a direct query
                console.log(`${indent}[Depth:${_depth}] FileIndex not found in pre-fetched indexes, trying direct query for genesis revision: ${revisionItem.pubkey_hash}`);

                // Try to find by exact pubkey_hash first
                try {
                    const directFileIndex = await prisma.fileIndex.findFirst({
                        where: {
                            pubkey_hash: {
                                has: revisionItem.pubkey_hash
                            }
                        }
                    });

                    if (directFileIndex) {
                        console.log(`${indent}[Depth:${_depth}] Found FileIndex for genesis with direct query: ${directFileIndex.file_hash}`);
                        anAquaTree.file_index[hashOnly] = directFileIndex.file_hash ?? "--error--";
                        if (revisionWithData.revision_type === 'file') {
                            revisionWithData.file_hash = directFileIndex.file_hash ?? "--error--";
                        }
                    } else {
                        // Try by a more fuzzy match if needed
                        const fuzzyFileIndex = await prisma.fileIndex.findFirst({
                            where: {
                                pubkey_hash: {
                                    has: hashOnly
                                }
                            }
                        });

                        if (fuzzyFileIndex) {
                            console.log(`${indent}[Depth:${_depth}] Found FileIndex for genesis with fuzzy query: ${fuzzyFileIndex.file_hash}`);
                            anAquaTree.file_index[hashOnly] = fuzzyFileIndex.file_hash ?? "--error--";
                            if (revisionWithData.revision_type === 'file') {
                                revisionWithData.file_hash = fuzzyFileIndex.file_hash ?? "--error--";
                            }
                        } else {
                            console.warn(`${indent}[Depth:${_depth}] FileIndex not found for genesis revision: ${revisionItem.pubkey_hash}`);
                            // Add placeholder URI if index is missing for genesis
                            anAquaTree.file_index[hashOnly] = "--error_missing_genesis_uri--";
                            if (revisionWithData.revision_type === 'file') {
                                revisionWithData.file_hash = "--error_missing_genesis_hash--";
                            }
                        }
                    }
                } catch (error) {
                    console.error(`${indent}[Depth:${_depth}] Error querying for genesis FileIndex: ${error}`);
                    anAquaTree.file_index[hashOnly] = "--error_missing_genesis_uri--";
                    if (revisionWithData.revision_type === 'file') {
                        revisionWithData.file_hash = "--error_missing_genesis_hash--";
                    }
                }
            }
        }

        // Add the processed revision to the tree, avoiding duplicates from linked chains
        if (!anAquaTree.revisions[hashOnly]) {
            anAquaTree.revisions[hashOnly] = revisionWithData;
        } else {
            // If already present (likely from a link), maybe log or decide if merge logic is needed
            // console.log(`Revision ${hashOnly} already exists in tree, likely from a link. Skipping add.`);
        }
    } // end for loop over allRevisionData

    // Add fileObjects to the result if requested
    if (includeFileObjects) {
        anAquaTree.fileObjects = fileObjects;
    }

    // Return the populated AquaTree
    return anAquaTree;
}


// --- Optional Example Usage --- //
/*
async function example() {
    try {
        const latestHash = 'your_latest_revision_hash_here'; // Replace with an actual hash
        const userAddress = 'user_address_here'; // Replace with the user's address
        const apiUrl = 'http://localhost:3000'; // Replace with your API URL

        console.log(`Fetching complete chain for ${userAddress}_${latestHash}...`);
        const completeTree = await fetchCompleteRevisionChain(latestHash, userAddress, apiUrl);
        console.log('----------------------------------------');
        console.log('Complete Revision Tree:');
        console.log(JSON.stringify(completeTree, null, 2));
        
        // The result will include:
        // 1. A "revisions" object with all revisions flattened into one map
        // 2. A "file_index" mapping verification hashes to URIs
        // 3. A "linkedChains" object containing complete trees for each linked document
        //    This creates a nested structure where each linked document has its full chain
        
        // To access linked chains:
        if (completeTree.linkedChains) {
            for (const hashOnly in completeTree.linkedChains) {
                const linkedTree = completeTree.linkedChains[hashOnly];
                console.log(`Linked chain with hash ${hashOnly} has ${Object.keys(linkedTree.revisions).length} revisions`);
                
                // Each linked tree may itself have more linked chains (nested structure)
                if (linkedTree.linkedChains) {
                    console.log(`This linked chain also has ${Object.keys(linkedTree.linkedChains).length} of its own linked chains`);
                }
            }
        }
        
        console.log('----------------------------------------');
    } catch (error) {
        console.error('Error in example usage:', error);
    }
}

// example(); // Uncomment to run the example
*/

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

