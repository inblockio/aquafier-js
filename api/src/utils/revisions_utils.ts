import Aquafier, { AquaTree, FileObject, Revision as AquaRevision, OrderRevisionInAquaTree, reorderAquaTreeRevisionsProperties, reorderRevisionsProperties } from 'aqua-js-sdk';
import { prisma } from '../database/db';
// For specific model types
import { Latest, Signature, Revision, Witness, AquaForms, WitnessEvent, FileIndex, Link } from '@prisma/client';
import * as fs from "fs"
import path from 'path';
import { SaveRevision } from '../models/request_models';


export async function deleteAquaTree(currentHash: string, userAddress: string, url: string): Promise<[number, string]> {


    try {

        let pubkeyhash = `${userAddress}_${currentHash}`;
        console.log(`Public_key_hash_to_delete: ${pubkeyhash}`)

        // fetch specific revision 
        let latestRevionData = await prisma.revision.findFirst({
            where: {
                pubkey_hash: pubkeyhash
            }
        });

        if (latestRevionData == null) {
            return [500, `revision with hash ${currentHash} not found in system`]
        }


        //
        const latestExist = await prisma.latest.findUnique({
            where: { hash: pubkeyhash }
        });

        if (latestExist != null) {

            if (latestRevionData.previous != null) {
                await prisma.latest.update({
                    where: {
                        hash: pubkeyhash
                    },
                    data: {
                        hash: latestRevionData.previous
                    }
                })
            }
        }

        // Use Prisma transaction to ensure all or nothing execution
        await prisma.$transaction(async (tx) => {
            // const revisionPubkeyHashes = revisionData.map(rev => rev.pubkey_hash);
            const revisionPubkeyHashes = [pubkeyhash]

            // Step 1: First delete all entries in related tables that reference our revisions
            // We need to delete child records before parent records to avoid foreign key constraints

            // Delete AquaForms entries
            await tx.aquaForms.deleteMany({
                where: {
                    hash: {
                        in: revisionPubkeyHashes
                    }
                }
            });

            // Delete Signature entries
            await tx.signature.deleteMany({
                where: {
                    hash: {
                        in: revisionPubkeyHashes
                    }
                }
            });

            // Delete Witness entries (note: we need to handle WitnessEvent separately)
            const witnesses = await tx.witness.findMany({
                where: {
                    hash: {
                        in: revisionPubkeyHashes
                    }
                }
            });

            const witnessRoots = witnesses.map(w => w.Witness_merkle_root).filter(Boolean);

            await tx.witness.deleteMany({
                where: {
                    hash: {
                        in: revisionPubkeyHashes
                    }
                }
            });

            // Check if any WitnessEvents are no longer referenced
            for (const root of witnessRoots) {
                const remainingWitnesses = await tx.witness.count({
                    where: {
                        Witness_merkle_root: root
                    }
                });

                if (remainingWitnesses === 0 && root) {
                    await tx.witnessEvent.delete({
                        where: {
                            Witness_merkle_root: root
                        }
                    });
                }
            }

            // Delete Link entries
            await tx.link.deleteMany({
                where: {
                    hash: {
                        in: revisionPubkeyHashes
                    }
                }
            });

            // Handle File entries
            // First, find all files related to our revisions
            const files = await tx.file.findMany({
                where: {
                    hash: {
                        in: revisionPubkeyHashes
                    }
                }
            });

            // Handle FileIndex entries first (as they reference files)
            for (const file of files) {
                // Find FileIndex entries that reference this file
                const fileIndexEntries = await tx.fileIndex.findMany({
                    where: {
                        hash: {
                            has: file.hash
                        }
                    }
                });

                for (const fileIndex of fileIndexEntries) {
                    if ((fileIndex.reference_count || 0) <= 1) {
                        // If this is the last reference, delete the FileIndex entry
                        await tx.fileIndex.delete({
                            where: {
                                id: fileIndex.id
                            }
                        });
                    } else {
                        // Otherwise, remove the reference and decrement the count
                        await tx.fileIndex.update({
                            where: {
                                id: fileIndex.id
                            },
                            data: {
                                hash: fileIndex.hash.filter(h => h !== file.hash),
                                reference_count: (fileIndex.reference_count || 0) - 1
                            }
                        });
                    }
                }

                // Now we can safely handle the file itself
                if ((file.reference_count || 0) <= 1) {
                    // If this is the last reference, delete the file
                    if (file.content) {
                        try {
                            fs.unlinkSync(file.content);
                        } catch (er) {
                            //  console.log("Error deleting file from filesystem:", er);
                            // Continue even if file deletion fails
                        }
                    }

                    await tx.file.delete({
                        where: {
                            hash: file.hash
                        }
                    });
                } else {
                    // Otherwise, decrement the reference count
                    await tx.file.update({
                        where: {
                            hash: file.hash
                        },
                        data: {
                            reference_count: (file.reference_count || 0) - 1
                        }
                    });
                }
            }

            // Step 2: Remove any references to our revisions from other revisions
            await tx.revision.updateMany({
                where: {
                    previous: {
                        in: revisionPubkeyHashes
                    }
                },
                data: {
                    previous: null
                }
            });



            // Step 4: Finally, delete all revisions
            await tx.revision.delete({
                where: {
                    pubkey_hash: pubkeyhash
                }
            });
        });

        return [200, "File and revisions deleted successfully"];
    } catch (error: any) {
        console.error("Error in delete operation:", error);
        return [500, `Error deleting file: ${error.message}`];
    }
}

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
export async function deleteAquaTreeFromSystem(walletAddress: string, hash: string): Promise<[number, string]> {

    let filepubkeyhash = `${walletAddress}_${hash}`;

    //fetch all the revisions 
    let revisionData = [];
    // fetch latest revision 
    let latestRevionData = await prisma.revision.findFirst({
        where: {
            pubkey_hash: filepubkeyhash
        }
    });

    if (latestRevionData == null) {
        return [500, `revision with hash ${hash} not found in system`];
    }
    revisionData.push(latestRevionData);

    try {
        console.log(`Processing revision chain starting with: ${filepubkeyhash}`);
        //if previous verification hash is not empty find the previous one
        if (latestRevionData?.previous !== null && latestRevionData?.previous?.length !== 0) {
            let aquaTreerevision = await findAquaTreeRevision(latestRevionData?.previous!!);
            revisionData.push(...aquaTreerevision);
        }
        console.log(`Found ${revisionData.length} revisions in the chain`);
    } catch (e: any) {
        return [500, `Error fetching a revision ${JSON.stringify(e, null, 4)}`];
    }

    try {
        // Use Prisma transaction to ensure all or nothing execution
        await prisma.$transaction(async (tx) => {
            console.log('Starting revision chain deletion transaction');
            const revisionPubkeyHashes = revisionData.map(rev => rev.pubkey_hash);
            console.log(`Revisions to delete: ${revisionPubkeyHashes.join(', ')}`);

            // Step 1: First delete all entries in related tables that reference our revisions
            // We need to delete child records before parent records to avoid foreign key constraints

            // 1a. Delete AquaForms entries
            const deletedAquaForms = await tx.aquaForms.deleteMany({
                where: {
                    hash: {
                        in: revisionPubkeyHashes
                    }
                }
            });
            console.log(`Deleted ${deletedAquaForms.count} AquaForms entries`);

            // 1b. Delete Witness entries (note: we need to handle WitnessEvent separately)
            // We need to handle this first because Witness has a foreign key to Revision
            const witnesses = await tx.witness.findMany({
                where: {
                    hash: {
                        in: revisionPubkeyHashes
                    }
                }
            });

            const witnessRoots = witnesses.map(w => w.Witness_merkle_root).filter(Boolean) as string[];
            console.log(`Found ${witnesses.length} Witness entries with ${witnessRoots.length} unique merkle roots`);

            const deletedWitnesses = await tx.witness.deleteMany({
                where: {
                    hash: {
                        in: revisionPubkeyHashes
                    }
                }
            });
            console.log(`Deleted ${deletedWitnesses.count} Witness entries`);

            // Check if any WitnessEvents are no longer referenced
            let deletedWitnessEvents = 0;
            for (const root of witnessRoots) {
                const remainingWitnesses = await tx.witness.count({
                    where: {
                        Witness_merkle_root: root
                    }
                });

                if (remainingWitnesses === 0) {
                    await tx.witnessEvent.delete({
                        where: {
                            Witness_merkle_root: root
                        }
                    });
                    deletedWitnessEvents++;
                }
            }
            console.log(`Deleted ${deletedWitnessEvents} WitnessEvent entries`);

            // 1c. Delete Link entries
            const deletedLinks = await tx.link.deleteMany({
                where: {
                    hash: {
                        in: revisionPubkeyHashes
                    }
                }
            });
            console.log(`Deleted ${deletedLinks.count} Link entries`);

            // 1d. Delete Signature entries
            const deletedSignatures = await tx.signature.deleteMany({
                where: {
                    hash: {
                        in: revisionPubkeyHashes
                    }
                }
            });
            console.log(`Deleted ${deletedSignatures.count} Signature entries`);

            // Step 2: Handle File and FileIndex entries
            // First, find all fileIndexes that reference our revisions
            console.log('Finding FileIndex entries that reference the revisions to delete');

            // Start with exact matches using hasSome
            const fileIndexesToProcess = await tx.fileIndex.findMany({
                where: {
                    hash: {
                        hasSome: revisionPubkeyHashes
                    }
                },
                select: {
                    id: true,
                    file_hash: true,
                    reference_count: true,
                    hash: true
                }
            });

            // If few or no matches, try a more flexible search with case-insensitive partial matching
            if (fileIndexesToProcess.length < revisionPubkeyHashes.length) {
                console.log(`Found only ${fileIndexesToProcess.length} exact matches, trying partial matching`);

                // For each revision hash, try to find partial matches
                for (const revHash of revisionPubkeyHashes) {
                    // This is a complex query to find any FileIndex where any element in the hash array
                    // contains the revision hash as a substring
                    // Build the SQL query differently based on whether we have existing IDs
                    let rawQuery;
                    if (fileIndexesToProcess.length > 0) {
                        // If we have existing IDs, exclude them from the query
                        const existingIdsFormatted = fileIndexesToProcess.map(fi => `'${fi.id}'`).join(',');
                        rawQuery = await tx.$queryRaw`
                            SELECT id, file_hash, reference_count, hash 
                            FROM file_index 
                            WHERE EXISTS (
                                SELECT 1 FROM unnest(hash) AS h 
                                WHERE LOWER(h) LIKE LOWER('%' || ${revHash} || '%')
                            )
                            AND id NOT IN (${existingIdsFormatted})
                        `;
                    } else {
                        // If no existing IDs, just run the query without the NOT IN clause
                        rawQuery = await tx.$queryRaw`
                            SELECT id, file_hash, reference_count, hash 
                            FROM file_index 
                            WHERE EXISTS (
                                SELECT 1 FROM unnest(hash) AS h 
                                WHERE LOWER(h) LIKE LOWER('%' || ${revHash} || '%')
                            )
                        `;
                    }

                    // Convert raw query results and add to our list
                    const rawResults = rawQuery as { id: string, file_hash: string, reference_count: number | null, hash: string[] }[];
                    if (rawResults.length > 0) {
                        console.log(`Found ${rawResults.length} additional matches with partial matching for ${revHash}`);
                        fileIndexesToProcess.push(...rawResults);
                    }
                }
            }

            console.log(`Found total of ${fileIndexesToProcess.length} FileIndex entries to process`);

            // Track which file indexes to delete and which to update
            const fileIndexesToDelete = [];
            const fileIndexesToUpdate = [];
            const fileHashesToUpdate = new Set<string>();
            const fileHashesToDelete = new Set<string>();

            // Process each file index based on its reference count
            for (const fileIndex of fileIndexesToProcess) {
                const refCount = fileIndex.reference_count;

                if (refCount === null || refCount <= 1) {
                    // If reference count is null or ≤ 1, mark for deletion
                    fileIndexesToDelete.push(fileIndex.id);
                    if (fileIndex.file_hash) {
                        fileHashesToDelete.add(fileIndex.file_hash);
                    }
                } else if (refCount >= 2) {
                    // If reference count is >= 2, mark for update
                    fileIndexesToUpdate.push(fileIndex.id);
                    if (fileIndex.file_hash) {
                        fileHashesToUpdate.add(fileIndex.file_hash);
                    }

                    // If it's exactly 2, it will become 1 after decrementing, so mark for deletion too
                    // if (refCount === 2) {
                    //     fileIndexesToDelete.push(fileIndex.id);
                    //     if (fileIndex.file_hash) {
                    //         fileHashesToDelete.add(fileIndex.file_hash);
                    //     }
                    // }
                }
            }

            console.log(`FileIndex operations planned: ${fileIndexesToUpdate.length} to update, ${fileIndexesToDelete.length} to delete`);
            console.log(`File operations planned: ${fileHashesToUpdate.size} to update, ${fileHashesToDelete.size} to delete`);

            // Step 2a: Update reference counts for file indexes that need updating
            if (fileIndexesToUpdate.length > 0) {
                // Decrement reference count for file indexes
                const updatedFileIndexes = await tx.fileIndex.updateMany({
                    where: {
                        id: {
                            in: fileIndexesToUpdate
                        }
                    },
                    data: {
                        reference_count: {
                            decrement: 1
                        }
                    }
                });
                console.log(`Updated ${updatedFileIndexes.count} FileIndex entries`);

                // Update files linked to these file indexes
                if (fileHashesToUpdate.size > 0) {
                    const updatedFiles = await tx.file.updateMany({
                        where: {
                            file_hash: {
                                in: Array.from(fileHashesToUpdate) as string[]
                            }
                        },
                        data: {
                            reference_count: {
                                decrement: 1
                            }
                        }
                    });
                    console.log(`Updated ${updatedFiles.count} File entries`);
                }
            }

            // Step 2b: Delete file indexes with reference count <= 1
            if (fileIndexesToDelete.length > 0) {
                const deletedFileIndexes = await tx.fileIndex.deleteMany({
                    where: {
                        id: {
                            in: fileIndexesToDelete
                        }
                    }
                });
                console.log(`Deleted ${deletedFileIndexes.count} FileIndex entries`);

                // Delete the files if they exist
                if (fileHashesToDelete.size > 0) {
                    const uniqueFileHashes = Array.from(fileHashesToDelete).filter(Boolean) as string[];
                    console.log(`File hashes to delete: ${uniqueFileHashes.length}`);

                    // First get the files to delete so we can handle filesystem files
                    const filesToDelete = await tx.file.findMany({
                        where: {
                            file_hash: {
                                in: uniqueFileHashes
                            }
                        }
                    });

                    // Delete any filesystem files
                    for (const file of filesToDelete) {
                        if (file.content) {
                            try {
                                fs.unlinkSync(file.content);
                                console.log(`Deleted file from filesystem: ${file.content}`);
                            } catch (er) {
                                console.log(`Error deleting file from filesystem: ${file.content}`, er);
                                // Continue even if file deletion fails
                            }
                        }
                    }

                    // Delete the database records
                    const deletedFiles = await tx.file.deleteMany({
                        where: {
                            file_hash: {
                                in: uniqueFileHashes
                            }
                        }
                    });
                    console.log(`Deleted ${deletedFiles.count} File entries`);
                }
            }

            // Step 3: Remove any references to our revisions from other revisions
            const updatedRevisions = await tx.revision.updateMany({
                where: {
                    previous: {
                        in: revisionPubkeyHashes
                    }
                },
                data: {
                    previous: null
                }
            });
            console.log(`Updated ${updatedRevisions.count} revisions that referenced the deleted revisions`);

            // Step 4: Delete the latest entry - we need to do this before deleting revisions
            const deletedLatest = await tx.latest.deleteMany({
                where: {
                    hash: {
                        in: revisionPubkeyHashes
                    }
                }
            });
            console.log(`Deleted ${deletedLatest.count} Latest entries`);

            // Step 5: Finally, delete all revisions
            let deletedRevisionCount = 0;
            for (let item of revisionData) {
                await tx.revision.delete({
                    where: {
                        pubkey_hash: item.pubkey_hash
                    }
                });
                deletedRevisionCount++;
            }
            console.log(`Deleted ${deletedRevisionCount} Revision entries`);
            console.log('Revision chain deletion completed successfully');

            let hashOnly: string[] = []

            revisionPubkeyHashes.forEach((data) => {
                if (data.includes("_")) {
                    let data2 = data.split("_")[1]
                    hashOnly.push(data2)
                } else {
                    hashOnly.push(data)
                }
            })
            console.log(`B4 revisionPubkeyHashes ${revisionPubkeyHashes} \n After hashOnly -- ${JSON.stringify(hashOnly)}`);

            //delete contract
            const deletedContract = await tx.contract.deleteMany({
                where: {
                    OR: [
                        {
                            latest: {
                                in: hashOnly
                            },
                        },
                        {
                            genesis_hash: {
                                in: hashOnly
                            }
                        }
                    ],
                    AND: [
                        {
                            sender: walletAddress
                        }
                    ]
                }
            });
            console.log(`Deleted ${deletedContract.count} contract entries`);

        });

        return [200, "File and revisions deleted successfully"];
    } catch (error: any) {
        console.error("Error in delete operation:", error);
        return [500, `Error deleting file: ${error.message}`]
    }
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

export function removeFilePathFromFileIndex(aquaTree: AquaTree): AquaTree {


    // Create a new file_index object
    const processedFileIndex: FileIndex | any = {};

    // Loop through each entry in the file_index
    for (const [hash, value] of Object.entries(aquaTree.file_index)) {
        // Check if the value looks like a path (contains / or \)
        if (typeof value === 'string' && (value.includes('/') || value.includes('\\'))) {
            // Extract just the base filename without path
            const baseName = value.split(/[\/\\]/).pop() || value;
            processedFileIndex[hash] = baseName;
        } else {
            // Keep the original value if it's not a path
            processedFileIndex[hash] = value;
        }
    }

    // Return a new AquaTree with the processed file_index
    return {
        ...aquaTree,
        file_index: processedFileIndex
    };
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

    // for(let userAquaTree of displayData){
    //     let filaname = getAquaTreeFileName(userAquaTree.aquaTree)
    //     //todod
    // }

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

export async function saveAquaTree(aquaTree: AquaTree, userAddress: string, templateId: string | null = null, isWorkFlow: boolean = false) {


    // Reorder revisions to ensure proper order
    let orderedAquaTree = reorderAquaTreeRevisionsProperties(aquaTree);
    let aquaTreeWithOrderdRevision = OrderRevisionInAquaTree(orderedAquaTree);

    // Get all revision hashes in the chain
    let allHash = Object.keys(aquaTreeWithOrderdRevision.revisions);

    // The last hash in the sorted array is the latest
    if (allHash.length === 0) {
        throw Error("No revisions found in the aqua tree");
    }

    let latestHash = allHash[allHash.length - 1];
    let lastPubKeyHash = `${userAddress}_${latestHash}`;

    // Only register the latest hash for the user
    await prisma.latest.upsert({
        where: {
            hash: lastPubKeyHash
        },
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

    // insert the revisions
    for (const revisinHash of allHash) {
        let revisionData = aquaTreeWithOrderdRevision.revisions[revisinHash];
        let pubKeyHash = `${userAddress}_${revisinHash}`
        let pubKeyPrevious = ""
        if (revisionData.previous_verification_hash.length > 0) {
            pubKeyPrevious = `${userAddress}_${revisionData.previous_verification_hash}`
        }

        // Insert new revision into the database
        await prisma.revision.upsert({
            where: {
                pubkey_hash: pubKeyHash
            },
            create: {
                pubkey_hash: pubKeyHash,
                nonce: revisionData.file_nonce ?? "",
                shared: [],
                previous: pubKeyPrevious,
                local_timestamp: revisionData.local_timestamp,
                revision_type: revisionData.revision_type,
                verification_leaves: revisionData.leaves ?? [],
            },
            update: {
                pubkey_hash: pubKeyHash,
                nonce: revisionData.file_nonce ?? "",
                shared: [],
                previous: pubKeyPrevious,
                local_timestamp: revisionData.local_timestamp,
                revision_type: revisionData.revision_type,
                verification_leaves: revisionData.leaves ?? [],
            },
        });


        if (revisionData.revision_type == "form") {
            let revisioValue = Object.keys(revisionData);
            for (let formItem of revisioValue) {
                if (formItem.startsWith("forms_")) {
                    await prisma.aquaForms.create({
                        data: {
                            hash: pubKeyHash,
                            key: formItem,
                            value: revisionData[formItem],
                            type: typeof revisionData[formItem]
                        }
                    });
                }
            }
        }

        // if(revisionData.leaves && revisionData.leaves.length > 0) {

        // }

        if (revisionData.revision_type == "signature") {
            let signature = "";
            if (typeof revisionData.signature == "string") {
                signature = revisionData.signature
            } else {
                signature = JSON.stringify(revisionData.signature)
            }


            //todo consult dalmas if signature_public_key needs tobe stored
            await prisma.signature.upsert({
                where: {
                    hash: pubKeyHash
                },
                update: {
                    reference_count: {
                        increment: 1
                    }
                },
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


        if (revisionData.revision_type == "witness") {

            await prisma.witness.upsert({
                where: {
                    hash: pubKeyHash
                },
                update: {
                    reference_count: {
                        increment: 1
                    }
                },
                create: {
                    hash: pubKeyHash,
                    Witness_merkle_root: revisionData.witness_merkle_root,
                    reference_count: 1  // Starting with 1 since this is the first reference
                }
            });

            // const witnessTimestamp = new Date(!);
            await prisma.witnessEvent.upsert({
                where: {
                    Witness_merkle_root: revisionData.witness_merkle_root!,
                },
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



        if (revisionData.revision_type == "file" || revisionData.revision_type == "form") {
            if (revisionData.file_hash == null || revisionData.file_hash == undefined) {
                throw Error(`revision with hash ${revisinHash} is detected to be a file but file_hash is mising`);
            }

            let fileResult = await prisma.file.findFirst({
                where: {
                    hash: {
                        contains: revisinHash,
                        mode: 'insensitive' // Case-insensitive matching
                    }
                }
            })

            if (fileResult == null) {
                console.log(`-- > file data should be in database but is not found.hash  ${revisinHash}`);
                throw Error(`file data should be in database but is not found.`);
            }

            await prisma.file.updateMany({
                where: {

                    OR: [
                        { hash: fileResult.hash },
                        { hash: { contains: fileResult.hash, mode: 'insensitive' } }
                    ]

                },
                data: {
                    reference_count: fileResult.reference_count! + 1
                }
            })


            // update  file index
            let existingFileIndex = await prisma.fileIndex.findFirst({
                where: { id: fileResult.hash },
            });

            if (existingFileIndex) {
                // existingFileIndex.hash = [...existingFileIndex.hash, pubKeyHash]
                await prisma.fileIndex.update({
                    data: {
                        hash: [...existingFileIndex.hash, pubKeyHash],
                        reference_count: existingFileIndex.reference_count! + 1
                    },
                    where: {
                        id: existingFileIndex.id
                    }
                })
            } else {
                throw Error(`file index data should be in database but is not found.`);
            }
        }

        if (revisionData.revision_type == "link") {
            await prisma.link.upsert({
                where: {
                    hash: pubKeyHash,
                },
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

            // For link revisions, recursively process linked chains
            if (revisionData.link_verification_hashes && revisionData.link_verification_hashes.length > 0) {
                for (const linkedHash of revisionData.link_verification_hashes) {
                    const linkedRevision = await prisma.revision.findFirst({
                        where: {
                            pubkey_hash: {
                                contains: linkedHash,
                                mode: 'insensitive'
                            }
                        }
                    });

                    if (linkedRevision) {
                        // Instead of creating new chains for linked revisions, 
                        // we just process them independently
                        // They'll form their own chains with their own latest hash
                        console.log(`Found linked revision chain with hash ${linkedHash}`);
                    }
                }
            }
        }




        if (revisionData.previous_verification_hash == null || revisionData.previous_verification_hash == "") {

            let fileHash = revisionData.file_hash;

            if (fileHash == null) {
                throw Error(`revision with hash ${revisinHash} is detected to be a genesis but the file hash is null.`)
            }
            // file and file indexes
            // Check if file already exists in the database
            let existingFile = await prisma.file.findFirst({ //todo
                where: { file_hash: fileHash },
            });

            let existingFileIndex = await prisma.fileIndex.findFirst({
                where: { file_hash: fileHash },
            });

            if (existingFileIndex) {
                existingFileIndex.hash = [...existingFileIndex.hash, allHash[0]]
                await prisma.fileIndex.update({
                    data: existingFileIndex,
                    where: {
                        id: existingFileIndex.id
                    }
                })
            }
        }



    }
}

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

/**
 * Estimates the size in bytes that a string would occupy if saved to a file
 * Uses UTF-8 encoding rules where ASCII chars take 1 byte and others take 2-4 bytes
 * @param str Input string to estimate size for
 * @returns Estimated size in bytes
 */
export function estimateStringFileSize(str: string): number {
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

export async function createAquaTreeFromRevisions(latestRevisionHash: string, url: string): Promise<[AquaTree, FileObject[]]> {

    // construct the return data
    let anAquaTree: AquaTree = {
        revisions: {},
        file_index: {}
    };


    ////  console.log(`Find ${JSON.stringify(revisonLatetsItem, null, 4)}.`)
    let revisionData = [];
    let fileObject: FileObject[] = [];

    // fetch latest revision 
    let latestRevionData = await prisma.revision.findFirst({
        where: {
            pubkey_hash: {
                contains: latestRevisionHash,
                mode: 'insensitive' // Case-insensitive matching
            },
        }
    });

    if (latestRevionData == null) {
        // return reply.code(500).send({ success: false, message: `` });
        console.error(`.revision with hash ${latestRevisionHash} not found in system`);

    } else {
        revisionData.push(latestRevionData);

        try {
            // console.log(`%%%%%%%%%%%%%%%%%%%%%%%%%%% previous ${latestRevionData?.previous} \n ${JSON.stringify(latestRevionData, null, 4)}`)
            // let pubKey = latestRevisionHash.split("_")[0];
            let previousWithPubKey = latestRevionData?.previous!!;



            //if previosu verification hash is not empty find the previous one
            if (latestRevionData?.previous !== null && latestRevionData?.previous?.length !== 0) {
                let aquaTreerevision = await findAquaTreeRevision(previousWithPubKey);
                console.log("Genesis revision: ", aquaTreerevision)
                revisionData.push(...aquaTreerevision)
            }
        } catch (e: any) {
            throw Error(`💣💣💣 Error fetching a revision ${JSON.stringify(e, null, 4)}`);
        }

        // file object 
        let lastRevision = revisionData[revisionData.length - 1];
        let lastRevisionHash = lastRevision.pubkey_hash.split("_")[1];

        // files 

        // let  = await prisma.file.findMany({
        //     where: {
        //         hash: lastRevision.pubkey_hash
        //     }
        // })

        let files = await prisma.file.findMany({
            where: {
                hash: {
                    contains: lastRevisionHash,
                    mode: 'insensitive' // Case-insensitive matching
                }
            }

        })


        let fileIndexes: FileIndex[] = [];
        if (files != null) {
            //  console.log("#### file is not null ")

            for (let fileItem of files) {
                //  console.log("=================================================")
                //  console.log(`reading ${JSON.stringify(fileItem, null, 4)}`)
                // let fileContent = fs.readFileSync(fileItem.content!!);

                const stats = fs.statSync(fileItem.content!!);
                const fileSizeInBytes = stats.size;
                //  console.log(`File size: ${fileSizeInBytes} bytes`);

                // Extract just the original filename (without the UUID prefix)
                const fullFilename = path.basename(fileItem.content!!) // Gets filename.ext from full path
                const originalFilename = fullFilename.substring(fullFilename.indexOf('-') + 1) // Removes UUID-
                //  console.log(`Original filename: ${originalFilename}`)



                let fileIndex = await prisma.fileIndex.findFirst({
                    where: {
                        file_hash: fileItem.file_hash!!
                    }
                })

                //  console.log("File index: ", fileIndex)


                if (fileIndex == null) {
                    console.log(`💣💣💣💣 Error file  ${originalFilename} not found in index`)
                } else {


                    fileIndexes.push(fileIndex)


                    if (!fs.existsSync(fileItem.content!!)) {
                        // return reply.code(500).send({ success: false, message: `Error file  ${originalFilename} not found` });
                        console.log(`💣💣💣💣 error file not found {originalFilename} `)
                    } else {



                        // Path you want to add
                        const urlPath = `/files/${fileItem.file_hash}`;

                        // Construct the full URL
                        const fullUrl = `${url}${urlPath}`;
                        fileObject.push({
                            fileContent: fullUrl,//fileContent.toString(),
                            fileName: fileIndex.uri!!,
                            path: "...here...",
                            fileSize: fileSizeInBytes
                        })
                    }
                }
            }
        }

        //  console.log(`File indexes for hash: ${lastRevisionHash}\n${JSON.stringify(fileIndexes, null, 4)}`)

        for (let revisionItem of revisionData) {
            let hashOnly = revisionItem.pubkey_hash.split("_")[1]
            let previousHashOnly = revisionItem.previous == null || revisionItem.previous == undefined || revisionItem.previous == "" ? "" : revisionItem.previous.split("_")[1]
            //  console.log(`previousHashOnly == > ${previousHashOnly} RAW ${revisionItem.previous}`)
            let revisionWithData: AquaRevision = {
                revision_type: revisionItem.revision_type!! as "link" | "file" | "witness" | "signature" | "form",
                previous_verification_hash: previousHashOnly,
                local_timestamp: revisionItem.local_timestamp?.toString() ?? "",
                leaves: revisionItem.verification_leaves,

                "version": "https://aqua-protocol.org/docs/v3/schema_2 | SHA256 | Method: scalar",
            }

            // if (revisionItem.revision_type == "file" || revisionItem.revision_type == "form") {
            //     revisionWithData.file_nonce = revisionItem.nonce as string
            // }

            if (revisionItem.has_content) {
                let fileItem = files.find((e) => e.hash == revisionItem.pubkey_hash)
                let fileContent = fs.readFileSync(fileItem?.content ?? "--error--", 'utf8');
                revisionWithData["content"] = fileContent
            }

            if (revisionItem.revision_type == "file" || revisionItem.revision_type == "form") {
                // console.log("Hash only: ", hashOnly)
                let fileResult = await prisma.file.findFirst({
                    where: {
                        hash: {
                            contains: hashOnly,
                            mode: 'insensitive' // Case-insensitive matching
                        }
                    }
                })
                // console.log("File result: ", fileResult)
                if (fileResult == null) {
                    // throw Error("Revision file data  not found")
                    console.log("We fail here")
                    console.error(`💣💣💣💣 hash not found in file hash => ${hashOnly}`)
                } else {

                    revisionWithData["file_nonce"] = revisionItem.nonce ?? "--error--"
                    revisionWithData["file_hash"] = fileResult?.file_hash ?? "--error--"
                }
            }
            let revisionInfoData = await FetchRevisionInfo(revisionItem.pubkey_hash, revisionItem)

            if (revisionInfoData == null) {
                console.log(`Revision data ${JSON.stringify(revisionItem, null, 4)} not found foir revision item`)
                // throw Error("Revision info not found")
            } else {
                if (revisionItem.revision_type == "form") {

                    let fileFormData = revisionInfoData as AquaForms[];
                    for (let formItem of fileFormData) {
                        revisionWithData[formItem.key!!] = formItem.value
                    }

                } else if (revisionItem.revision_type == "witness") {
                    let witnessData = revisionInfoData as WitnessEvent;
                    revisionWithData.witness_merkle_root = witnessData.Witness_merkle_root;
                    revisionWithData.witness_timestamp = Number.parseInt(witnessData.Witness_timestamp!);
                    revisionWithData.witness_network = witnessData.Witness_network!;
                    revisionWithData.witness_smart_contract_address = witnessData.Witness_smart_contract_address!;
                    revisionWithData.witness_transaction_hash = witnessData.Witness_transaction_hash!;
                    revisionWithData.witness_sender_account_address = witnessData.Witness_sender_account_address!;
                    revisionWithData.witness_merkle_proof = [witnessData.Witness_merkle_root];// todo fix me from db 


                } else if (revisionItem.revision_type == "signature") {
                    let signatureData = revisionInfoData as Signature;
                    let sig: string | Object = signatureData.signature_digest!
                    try {
                        if (signatureData.signature_type?.includes("did")) {
                            sig = JSON.parse(signatureData.signature_digest!)
                        }
                    } catch (error) {
                        //  console.log("======================================")
                        //  console.log(`Error fix me ${error} `)
                    }
                    revisionWithData.signature = sig;

                    revisionWithData.signature_public_key = signatureData.signature_public_key!;
                    revisionWithData.signature_wallet_address = signatureData.signature_wallet_address!;
                    revisionWithData.signature_type = signatureData.signature_type!;

                } else if (revisionItem.revision_type == "link") {
                    //  console.log("link revision goes here ")
                    let linkData = revisionInfoData as Link;

                    revisionWithData.link_type = linkData.link_type ?? ""
                    revisionWithData.link_verification_hashes = linkData.link_verification_hashes
                    revisionWithData.link_file_hashes = linkData.link_file_hashes



                    // let linkedAquaTree = await createAquaTreeFromRevisions(linkData.link_verification_hashes[0], url)
                    // console.log("Linked Aqua Tree: ", JSON.stringify(linkedAquaTree, null, 4))
                    // Check the revision type from revisions
                    let revisionData = await prisma.revision.findFirst({
                        where: {
                            pubkey_hash: {
                                contains: linkData.link_verification_hashes[0],
                                mode: 'insensitive' // Case-insensitive matching
                            }
                        }
                    })
                    if (revisionData == null) {
                        console.log(`💣💣💣💣 Revision data not found for hash ${linkData.link_verification_hashes[0]}`)
                    } else {
                        if (revisionData.revision_type == "file" || revisionData.revision_type == "form") {


                            // throw Error("Revision data not found for hash ..............." + revisionData.revision_type)
                            let hashSearchText = linkData.link_verification_hashes[0]
                            //  console.log(`link ....search for ${hashSearchText} --> `)
                            let filesData = await prisma.fileIndex.findFirst({
                                where: {
                                    id: {
                                        contains: hashSearchText,
                                        mode: 'insensitive' // Case-insensitive matching
                                    }
                                }
                            })

                            if (filesData == null) {
                                console.log(` 💣💣💣💣  File index with hash ${hashSearchText} not found `)
                            } else {
                                anAquaTree.file_index[hashSearchText] = filesData!.uri!! //?? "--error--."



                                // let [aquaTreeLinked, fileObjectLinked] = await createAquaTreeFromRevisions(filesData.id, url);
                                let [aquaTreeLinked, fileObjectLinked] = await createAquaTreeFromRevisions(hashSearchText, url);

                                // let name = Object.values(aquaTreeLinked.file_index)[0] ?? "--error--"
                                let genesisHash = getGenesisHash(aquaTreeLinked) ?? ""

                                // throw Error(`Data  aquaTreeLinked ${JSON.stringify(aquaTreeLinked)} -- genesisHash ${genesisHash}`)
                                let name = aquaTreeLinked.file_index[genesisHash]
                                fileObject.push({
                                    fileContent: aquaTreeLinked,
                                    fileName: `${name}.aqua.json`,
                                    path: `genesisHash ${genesisHash} hashSearchText ${hashSearchText}`,
                                    fileSize: estimateStringFileSize(JSON.stringify(aquaTreeLinked, null, 4))
                                })


                                fileObject.push(...fileObjectLinked)

                            }


                        } else {
                            // let linkedAquaTree = await createAquaTreeFromRevisions(linkData.link_verification_hashes[0], url)
                            let [aquaTreeLinked, fileObjectLinked] = await createAquaTreeFromRevisions(linkData.link_verification_hashes[0], url)
                            // console.log("Linked Aqua Tree: ", JSON.stringify(aquaTreeLinked, null, 4))
                            // console.log("Linked Aqua Tree: ", linkedAquaTree)
                            fileObject.push(...fileObjectLinked)
                            let genesisHash = getGenesisHash(aquaTreeLinked) ?? ""
                            fileObject.push({
                                fileContent: aquaTreeLinked,
                                fileName: `${aquaTreeLinked.file_index[genesisHash]}.aqua.json`,
                                path: `linkData.link_verification_hashes[0] ${linkData.link_verification_hashes[0]}`,
                                fileSize: estimateStringFileSize(JSON.stringify(aquaTreeLinked, null, 4))
                            })
                            // throw Error("Revision data not found for hash ${linkData.link_verification_hashes[0]}")
                        }

                    }
                } else {
                    console.log(`💣💣💣💣 Revision of type ${revisionItem.revision_type} is unknown`)
                }
            }





            // update file index for genesis revision 
            if (previousHashOnly == null || previousHashOnly.length == 0) {
                //  console.log("****************************************************************")
                //  console.log(`fileIndexes ${JSON.stringify(fileIndexes)} -- hash ${revisionItem.pubkey_hash}`)
                let name = fileIndexes.find((item) => {
                    // return item.hash.includes(revisionItem.pubkey_hash) || item.hash.map((item) => item.includes(hashOnly)).length > 0

                    // Check if the full pubkey_hash is in the array
                    if (item.hash.includes(revisionItem.pubkey_hash)) {
                        return true;
                    }

                    // Check if any hash in the array contains the hashOnly part
                    return item.hash.some((hashItem: string) => hashItem.includes(hashOnly));
                })
                if (name) {
                    //  console.log(`----------  name ${JSON.stringify(name, null, 4)}`)
                    anAquaTree.file_index[hashOnly] = name.uri!
                    revisionWithData["file_hash"] = name.file_hash

                } else {

                    let data = await prisma.fileIndex.findFirst({
                        where: {
                            hash: {
                                has: revisionItem.pubkey_hash
                            }
                        }
                    });

                    if(data){
                        anAquaTree.file_index[hashOnly] = data.uri!
                        revisionWithData["file_hash"] = data.file_hash
                    }

                }
            }
            let aquaTreeWithOrderdRevisionProperties = reorderRevisionsProperties(revisionWithData)
            anAquaTree.revisions[hashOnly] = aquaTreeWithOrderdRevisionProperties;
        }
    }



    //  console.log(`YOU should see me ${JSON.stringify(anAquaTree, null, 4)}`)

    return [anAquaTree, fileObject]
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


export const readFileContent = async (file: File): Promise<string | Uint8Array> => {
    if (isTextFile(file)) {
        // If it's a text file, read as text
        return await readFileAsText(file);
    } else {
        console.log("binary data....")
        // Otherwise for binary files, read as ArrayBuffer
        const res = await readFileAsArrayBuffer(file)
        return new Uint8Array(res);

    }
};


// More comprehensive function to check if a file is text-based
export const isTextFile = (file: File): boolean => {
    // Check by MIME type first (most reliable when available)
    if (file.type) {
        // Common text MIME types
        if (file.type.startsWith('text/')) return true;

        // Text-based formats with application/ prefix
        if (/^application\/(json|xml|javascript|x-javascript|ecmascript|x-ecmascript|typescript|x-typescript|ld\+json|graphql|yaml|x-yaml|x-www-form-urlencoded)/.test(file.type)) {
            return true;
        }

        // Some markdown types
        if (/^text\/(markdown|x-markdown|md)/.test(file.type)) {
            return true;
        }
    }

    // Check by file extension as fallback
    const textExtensions = [
        // Programming languages
        '.txt', '.csv', '.json', '.xml', '.html', '.htm', '.css', '.js', '.jsx', '.ts', '.tsx',
        '.md', '.markdown', '.rs', '.py', '.rb', '.c', '.cpp', '.h', '.hpp', '.cs', '.java',
        '.kt', '.kts', '.swift', '.php', '.go', '.pl', '.pm', '.lua', '.sh', '.bash', '.zsh',
        '.sql', '.r', '.dart', '.scala', '.groovy', '.m', '.mm',

        // Config files
        '.yml', '.yaml', '.toml', '.ini', '.cfg', '.conf', '.config', '.properties',
        '.env', '.gitignore', '.gitattributes', '.editorconfig', '.babelrc', '.eslintrc',
        '.prettierrc', '.stylelintrc', '.npmrc', '.yarnrc',

        // Documentation
        '.rst', '.adoc', '.tex', '.latex', '.rtf', '.log', '.svg',

        // Data formats
        '.csv', '.tsv', '.plist', '.graphql', '.gql'
    ];

    return textExtensions.some(ext => file.name.toLowerCase().endsWith(ext));
};


export function getGenesisHash(aquaTree: AquaTree): string | null {
    let aquaTreeGenesisHash: string | null = null;
    let allAquuaTreeHashes = Object.keys(aquaTree!.revisions);

    for (let hash of allAquuaTreeHashes) {
        let revisionItem = aquaTree!.revisions[hash];
        if (revisionItem.previous_verification_hash == "" || revisionItem.previous_verification_hash == null || revisionItem.previous_verification_hash == undefined) {

            aquaTreeGenesisHash = hash //revisionItem.previous_verification_hash
            break;

        }
    }

    return aquaTreeGenesisHash
}

/**
 * Validates an AquaTree object to ensure all required properties exist and are valid
 * @param tree The AquaTree object to validate
 * @returns boolean indicating whether the tree is valid
 */
export function validateAquaTree(tree: AquaTree): [boolean, string] {
    // Check if tree is null or undefined
    if (!tree) {
        return [false, "aqua tree is null"];
    }

    // Check if required top-level properties exist
    if (!tree.revisions || !tree.file_index) {
        return [false, "revsions and file index must exist in an aqua tree"];
    }

    // Check if revisions is a valid object
    if (typeof tree.revisions !== 'object' || Array.isArray(tree.revisions)) {
        return [false, "revision does not contain revisions"];
    }

    // Check if file_index is a valid object
    if (typeof tree.file_index !== 'object' || Array.isArray(tree.file_index)) {
        return [false, "file index does not contain values "];
    }

    // Validate each revision
    for (const hash in tree.revisions) {
        const revision = tree.revisions[hash];

        console.log(`Revision --  ${JSON.stringify(revision)}`)
        // Check required fields for all revisions
        if (revision.previous_verification_hash === undefined || revision.previous_verification_hash === null) {
            return [false, "A revision must contain previous_verification_hash"];
        }
        if (revision.local_timestamp === undefined || revision.local_timestamp === null) {
            return [false, "A revision must contain local_timestamp "];
        }
        if (!revision.revision_type === undefined || revision.local_timestamp === null) {
            return [false, "A revision must contain  revision_type"];
        }

        // Validate revision_type is one of the allowed values
        const validRevisionTypes = ['file', 'witness', 'signature', 'form', 'link'];
        if (!validRevisionTypes.includes(revision.revision_type)) {
            return [false, `unknown revision type ${revision.revision_type}`];
        }

        // Check type-specific required fields
        // Check type-specific required fields
        switch (revision.revision_type) {
            case 'file':
                if (revision.file_hash === undefined || revision.file_hash === null) {
                    return [false, "file revision must contain file_hash"];
                }
                if (revision.file_nonce === undefined || revision.file_nonce === null) {
                    return [false, "file revision must contain file_nonce"];
                }
                break;
            case 'witness':
                if (revision.witness_merkle_root === undefined || revision.witness_merkle_root === null) {
                    return [false, "witness revision must contain witness_merkle_root"];
                }
                if (revision.witness_timestamp === undefined || revision.witness_timestamp === null) {
                    return [false, "witness revision must contain witness_timestamp"];
                }
                if (revision.witness_network === undefined || revision.witness_network === null) {
                    return [false, "witness revision must contain witness_network"];
                }
                if (revision.witness_smart_contract_address === undefined || revision.witness_smart_contract_address === null) {
                    return [false, "witness revision must contain witness_smart_contract_address"];
                }
                if (revision.witness_transaction_hash === undefined || revision.witness_transaction_hash === null) {
                    return [false, "witness revision must contain witness_transaction_hash"];
                }
                if (revision.witness_sender_account_address === undefined || revision.witness_sender_account_address === null) {
                    return [false, "witness revision must contain witness_sender_account_address"];
                }
                break;
            case 'signature':
                if (revision.signature === undefined || revision.signature === null) {
                    return [false, "signature revision must contain signature"];
                }
                if (revision.signature_public_key === undefined || revision.signature_public_key === null) {
                    return [false, "signature revision must contain signature_public_key"];
                }
                if (revision.signature_type === undefined || revision.signature_type === null) {
                    return [false, "signature revision must contain signature_type"];
                }
                break;
            case 'link':
                if (revision.link_type === undefined || revision.link_type === null) {
                    return [false, "link revision must contain link_type"];
                }
                if (revision.link_verification_hashes === undefined || revision.link_verification_hashes === null) {
                    return [false, "link revision must contain link_verification_hashes"];
                }
                if (!Array.isArray(revision.link_verification_hashes)) {
                    return [false, "link revision's link_verification_hashes must be an array"];
                }
                if (revision.link_verification_hashes.length === 0) {
                    return [false, "link revision's link_verification_hashes must not be empty"];
                }
                break;
        }
    }

    // Check if the file_index contains at least one entry
    if (Object.keys(tree.file_index).length === 0) {
        return [false, "file_index is empty"];
    }

    // If all checks pass, return true
    return [true, "valid aqua tree"];
}

/**
 * Reads a File object as text
 * @param file The File object to read
 * @returns Promise that resolves with the file contents as string
 */
export function readFileAsText(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();

        reader.onload = (event) => {
            if (event.target?.result) {
                resolve(event.target.result as string);
            } else {
                reject(new Error("Failed to read file content"));
            }
        };

        reader.onerror = (error) => {
            reject(error);
        };

        reader.readAsText(file);
    });
}

/**
 * Reads a File object as ArrayBuffer
 * @param file The File object to read
 * @returns Promise that resolves with the file contents as ArrayBuffer
 */
export function readFileAsArrayBuffer(file: File): Promise<ArrayBuffer> {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();

        reader.onload = (event) => {
            if (event.target?.result) {
                resolve(event.target.result as ArrayBuffer);
            } else {
                reject(new Error("Failed to read file content"));
            }
        };

        reader.onerror = (error) => {
            reject(error);
        };

        reader.readAsArrayBuffer(file);
    });
}


export function getAquaTreeFileName(aquaTree: AquaTree): string {

    let mainAquaHash = "";
    // fetch the genesis 
    let revisionHashes = Object.keys(aquaTree!.revisions!)
    for (let revisionHash of revisionHashes) {
        let revisionData = aquaTree!.revisions![revisionHash];
        if (revisionData.previous_verification_hash == null || revisionData.previous_verification_hash == "") {
            mainAquaHash = revisionHash;
            break;
        }
    }


    return aquaTree!.file_index[mainAquaHash] ?? "";

}