import { prisma } from '../database/db';
import { AquaTree, FileObject, Revision as AquaRevision } from 'aqua-js-sdk';
import { Revision, Link, Signature, WitnessEvent, AquaForms, FileIndex } from '@prisma/client';

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
        // Depending on how you want to handle potentially broken links
        console.error(`Unable to get revision with hash ${revisionHash}`);
        // Returning empty array might be safer than throwing if links can be broken
        return [];
        // throw new Error(`Unable to get revision with hash ${revisionHash}`);
    }

    revisions.push(latestRevionData);

    // Recursively fetch previous revisions if a previous hash exists
    if (latestRevionData?.previous) {
        let previousWithPubKey = latestRevionData.previous; // Assume previous already includes pubkey

        // Defensive check: add pubKey prefix if somehow missing (though it shouldn't be based on save logic)
        if (!previousWithPubKey.includes('_')) {
            const pubKey = revisionHash.split("_")[0];
            if (pubKey) { // Ensure pubKey was found
                previousWithPubKey = `${pubKey}_${latestRevionData.previous}`;
            } else {
                console.error(`Could not extract pubKey from ${revisionHash} to prepend to previous hash ${latestRevionData.previous}`);
                // Decide how to proceed: throw error, or stop recursion here?
                // Stopping recursion might be safer for potentially corrupt data.
                return revisions; // Return what we have so far
            }
        }

        // Fetch the ancestor chain recursively
        try {
            const ancestorRevisions = await _findAquaTreeRevision(previousWithPubKey);
            revisions.push(...ancestorRevisions);
        } catch (error) {
            console.error(`Error fetching ancestor revision chain for ${previousWithPubKey}:`, error);
            // Decide how to proceed: re-throw, or return partial chain?
            // Returning partial chain might be preferable in some scenarios.
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
            return await prisma.link.findFirst({ where: { hash: hash } });
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
 * @returns A Promise resolving to the AquaTree containing the complete revision chain.
 */
export async function fetchCompleteRevisionChain(
    latestHash: string,
    userAddress: string,
    url: string, // Keep url param for potential future file link generation
    _processedHashes: Set<string> = new Set() // Add cycle detection
): Promise<AquaTree> {
    const fullLatestHash = `${userAddress}_${latestHash}`;

    // Prevent infinite loops with circular links
    if (_processedHashes.has(fullLatestHash)) {
        console.warn(`Circular link detected or revision already processed: ${fullLatestHash}. Stopping recursion for this branch.`);
        return { revisions: {}, file_index: {} }; // Return empty tree for this branch
    }
    _processedHashes.add(fullLatestHash);

    const anAquaTree: AquaTree = {
        revisions: {},
        file_index: {}
    };
    let fileObjects: FileObject[] = []; // Keep track of associated files

    let allRevisionData: Revision[] = [];
    try {
        // Fetch the main chain starting from the latest hash
        allRevisionData = await _findAquaTreeRevision(fullLatestHash);
        if (allRevisionData.length === 0) {
            console.warn(`No revisions found for initial hash: ${fullLatestHash}`);
            return anAquaTree; // Return empty tree if no revisions found
        }
    } catch (error) {
        console.error(`Error fetching initial revision chain for ${fullLatestHash}:`, error);
        throw error; // Re-throw error if initial fetch fails
    }

    // Determine the hash of the earliest revision in this chain (potential genesis)
    const genesisRevisionInChain = allRevisionData[allRevisionData.length - 1];
    const genesisHashInChain = genesisRevisionInChain.pubkey_hash.split('_')[1];

    // Find associated file indexes based on the genesis hash of this chain
    let fileIndexes: FileIndex[] = [];
    if (genesisHashInChain) {
        try {
            // Find FileIndex entries where the genesis hash (prefixed) is present in the `hash` array
            // Note: This logic assumes FileIndex.hash stores prefixed hashes.
            // Adjust if FileIndex.hash stores non-prefixed hashes.
            fileIndexes = await prisma.fileIndex.findMany({
                 where: {
                     hash: {
                         has: genesisRevisionInChain.pubkey_hash // Check if the prefixed hash exists in the array
                     }
                 }
            });
            // Alternative if FileIndex.hash stores non-prefixed hashes:
            // fileIndexes = await prisma.fileIndex.findMany({
            //     where: {
            //         hash: {
            //             has: genesisHashInChain // Check for non-prefixed hash
            //         },
            //          id: { // Assuming FileIndex.id might relate to userAddress indirectly? Or filter differently
            //             startsWith: userAddress + '_' // Example if ID structure allows filtering by user
            //          }
            //     }
            // });

        } catch (error) {
             console.error(`Error fetching file indexes for genesis hash ${genesisHashInChain} (full: ${genesisRevisionInChain.pubkey_hash}):`, error);
             // Decide how to handle: continue without index info, or throw?
        }
    }


    // Process each revision in the fetched chain
    for (const revisionItem of allRevisionData) {
        const hashOnly = revisionItem.pubkey_hash.split('_')[1];
        if (!hashOnly) {
            console.error(`Could not extract hashOnly from pubkey_hash: ${revisionItem.pubkey_hash}`);
            continue; // Skip this revision if hash is malformed
        }

        const previousHashOnly = revisionItem.previous
            ? revisionItem.previous.split('_')[1] ?? ""
            : "";

        let revisionWithData: AquaRevision = {
            revision_type: revisionItem.revision_type as AquaRevision['revision_type'],
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
             const fileIndexForFileRev = fileIndexes.find(fi => fi.hash.includes(revisionItem.pubkey_hash));
             if (fileIndexForFileRev) {
                 revisionWithData.file_hash = fileIndexForFileRev.file_hash ?? "--error--";
                 // Optionally add the file index URI to the main tree's index
                 if (!anAquaTree.file_index[hashOnly]) { // Add only if not already present (genesis might add it later)
                     anAquaTree.file_index[hashOnly] = fileIndexForFileRev.uri ?? "--error_uri--";
                 }
             } else {
                 console.warn(`FileIndex not found for file revision: ${revisionItem.pubkey_hash}. File hash might be missing.`);
                 revisionWithData.file_hash = "--error_no_index--";
             }
        } else {
            // For non-file types, fetch additional info
            const revisionInfoData = await _FetchRevisionInfo(revisionItem.pubkey_hash, revisionItem);

            if (!revisionInfoData && revisionItem.revision_type !== 'file') { // file type handled above
                // Log warning if info is expected but not found
                 console.warn(`Revision info not found for ${revisionItem.revision_type} revision: ${revisionItem.pubkey_hash}`);
                 // Continue processing the revision with available data
            } else if (revisionInfoData) {
                switch (revisionItem.revision_type) {
                    case "form":
                        const formItems = revisionInfoData as AquaForms[];
                        formItems.forEach(item => {
                            if (item.key) {
                                revisionWithData[item.key] = item.value; // Add form key-value pairs
                            }
                        });
                        break;
                    case "witness":
                        const witnessData = revisionInfoData as WitnessEvent;
                        revisionWithData.witness_merkle_root = witnessData.Witness_merkle_root;
                        revisionWithData.witness_timestamp = witnessData.Witness_timestamp ? parseInt(witnessData.Witness_timestamp, 10) : 0;
                        revisionWithData.witness_network = witnessData.Witness_network ?? undefined;
                        revisionWithData.witness_smart_contract_address = witnessData.Witness_smart_contract_address ?? undefined;
                        revisionWithData.witness_transaction_hash = witnessData.Witness_transaction_hash ?? undefined;
                        revisionWithData.witness_sender_account_address = witnessData.Witness_sender_account_address ?? undefined;
                        // revisionWithData.witness_merkle_proof = []; // Merkle proof needs separate handling if required
                        break;
                    case "signature":
                        const signatureData = revisionInfoData as Signature;
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
                        const linkData = revisionInfoData as Link;
                        revisionWithData.link_type = linkData.link_type ?? undefined;
                        revisionWithData.link_verification_hashes = linkData.link_verification_hashes as string[];
                        revisionWithData.link_file_hashes = linkData.link_file_hashes as string[];

                        // --- Recursively fetch linked chains --- 
                        if (linkData.link_verification_hashes && linkData.link_verification_hashes.length > 0) {
                            for (const linkedHash of linkData.link_verification_hashes) {
                                if (typeof linkedHash === 'string' && linkedHash.length > 0) {
                                    // Extract user address and hash from the linked hash (assuming format user_hash)
                                    const parts = linkedHash.split('_');
                                    if (parts.length === 2) {
                                        const linkedUserAddress = parts[0];
                                        const linkedHashOnly = parts[1];

                                         // Check if we have FileIndex info for this linked hash
                                         const linkedFileIndex = await prisma.fileIndex.findFirst({ where: { id: linkedHash } }); // Assuming FileIndex.id is the full prefixed hash
                                         if (linkedFileIndex && linkedFileIndex.uri) {
                                             anAquaTree.file_index[linkedHashOnly] = linkedFileIndex.uri;
                                         } else {
                                             console.warn(`FileIndex URI not found for linked hash: ${linkedHash}`);
                                             // Optionally provide a default or error placeholder
                                             // anAquaTree.file_index[linkedHashOnly] = "--error_missing_linked_uri--";
                                         }

                                        // Recursively call fetchCompleteRevisionChain for the linked hash
                                        try {
                                             const linkedTree = await fetchCompleteRevisionChain(
                                                 linkedHashOnly,
                                                 linkedUserAddress,
                                                 url, // Pass URL along
                                                 _processedHashes // Pass the set to detect cycles across links
                                             );

                                             // Merge the linked tree into the current tree
                                             Object.assign(anAquaTree.revisions, linkedTree.revisions);
                                             Object.assign(anAquaTree.file_index, linkedTree.file_index);

                                        } catch(linkError) {
                                            console.error(`Error fetching linked revision chain for ${linkedHash}:`, linkError);
                                             // Decide how to handle link errors: skip, add placeholder, re-throw?
                                             // Skipping for now.
                                        }
                                    } else {
                                        console.error(`Invalid linked hash format encountered: ${linkedHash}`);
                                    }
                                } else {
                                     console.warn(`Invalid or empty hash found in link_verification_hashes for revision ${revisionItem.pubkey_hash}`);
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
            const genesisFileIndex = fileIndexes.find(item => item.hash.includes(revisionItem.pubkey_hash));
            if (genesisFileIndex) {
                anAquaTree.file_index[hashOnly] = genesisFileIndex.uri ?? "--error_uri--";
                // Add file_hash to the genesis revision itself if it's a file type (might be redundant but ensures presence)
                 if (revisionWithData.revision_type === 'file') {
                     revisionWithData.file_hash = genesisFileIndex.file_hash ?? "--error_hash--";
                 }
            } else {
                console.warn(`FileIndex not found for genesis revision: ${revisionItem.pubkey_hash}`);
                 // Add placeholder URI if index is missing for genesis
                 anAquaTree.file_index[hashOnly] = "--error_missing_genesis_uri--";
                 if (revisionWithData.revision_type === 'file') {
                     revisionWithData.file_hash = "--error_missing_genesis_hash--";
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
        console.log('----------------------------------------');

    } catch (error) {
        console.error('Error in example usage:', error);
    }
}

// example(); // Uncomment to run the example
*/

