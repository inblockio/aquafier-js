import { AquaTree, FileObject, OrderRevisionInAquaTree, reorderAquaTreeRevisionsProperties } from 'aqua-js-sdk';
import { prisma } from '../database/db';
// For specific model types
import { Signature, Revision, AquaForms, WitnessEvent, Link, FileIndex } from '@prisma/client';
import * as fs from "fs"
import { AquaJsonInZip, SaveRevision, SaveRevisionForUser } from '../models/request_models';
import { getAquaTreeFileName } from './api_utils';
import { createAquaTreeFromRevisions } from './revisions_operations_utils';
import { getGenesisHash } from './aqua_tree_utils';
import JSZip from 'jszip';
import { getFileUploadDirectory } from './file_utils';
import { hash, randomUUID } from 'crypto';
import path from 'path';
import { systemTemplateHashes } from '../models/constants';

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

export const isWorkFlowData = (aquaTree: AquaTree, systemAndUserWorkFlow: string[]): { isWorkFlow: boolean; workFlow: string } => {
    let falseResponse = {
        isWorkFlow: false,
        workFlow: ""
    }
    console.log("System workflows: ", systemAndUserWorkFlow)

    //order revision in aqua tree 
    let aquaTreeRevisionsOrderd = OrderRevisionInAquaTree(aquaTree)
    let allHashes = Object.keys(aquaTreeRevisionsOrderd.revisions)
    if (allHashes.length <= 1) {
        // console.log(`Aqua tree has one revision`)
        return falseResponse
    }
    let secondRevision = aquaTreeRevisionsOrderd.revisions[allHashes[1]]
    if (!secondRevision) {
        console.log(`Aqua tree has second revision not found`)
        return falseResponse
    }
    if (secondRevision.revision_type == 'link') {

        //get the  system aqua tree name 
        let secondRevision = aquaTreeRevisionsOrderd.revisions[allHashes[1]]
        console.log(` second hash used ${allHashes[1]}  second revision ${JSON.stringify(secondRevision, null, 4)} tree ${JSON.stringify(aquaTreeRevisionsOrderd, null, 4)}`)

        if (secondRevision.link_verification_hashes == undefined) {
            // console.log(`link verification hash is undefined`)
            return falseResponse
        }
        let revisionHash = secondRevision.link_verification_hashes[0]
        let name = aquaTreeRevisionsOrderd.file_index[revisionHash]
        // console.log(`--  name ${name}  all hashes ${revisionHash}  second revision ${JSON.stringify(secondRevision, null, 4)} tree ${JSON.stringify(aquaTreeRevisionsOrderd, null, 4)}`)

        // if (systemAndUserWorkFlow.map((e)=>e.replace(".json", "")).includes(name)) {

        // try with hash
        if (systemAndUserWorkFlow.includes(revisionHash)) {
            return {
                isWorkFlow: true,
                workFlow: name
            }
        }

        // trye with name
        let nameWithoutJson = "--error--";
        if (name) {
            nameWithoutJson = name.replace(".json", "")
            if (systemAndUserWorkFlow.map((e) => e.replace(".json", "")).includes(nameWithoutJson)) {
                return {
                    isWorkFlow: true,
                    workFlow: nameWithoutJson
                }
            }
        }
        return {
            isWorkFlow: false,
            workFlow: ""
        }


    }
    console.log(`Aqua tree has second revision is of type ${secondRevision.revision_type}`)


    return falseResponse
}

export function isAquaTree(content: any): boolean {
    // Check if content has the properties of an AquaTree
    return content &&
        typeof content === 'object' &&
        'revisions' in content &&
        'file_index' in content;
}



export async function transferRevisionChainData(userAddress: string, chainData: {
    aquaTree: AquaTree; fileObject: FileObject[]
}, templateId: string | null = null, isWorkFlow: boolean = false): Promise<{ success: boolean, message: string }> {
    try {


        let allAquaTrees: AquaTree[] = [];
        let allHashes = Object.keys(chainData.aquaTree.revisions);
        if (allHashes.length == 0) {
            throw new Error("No revisions found in the aqua tree");
        }

        console.log(`🎈🎈 aquaTree  ${JSON.stringify(chainData.aquaTree, null, 4)}`)
        let hashName = new Map<string, string>();
        // Save the aqua tree
        await saveAquaTree(chainData.aquaTree, userAddress, templateId, isWorkFlow);
        allAquaTrees.push(chainData.aquaTree);

        for (let key in chainData.aquaTree.file_index) {
            const value = chainData.aquaTree.file_index[key];
            console.log(`a 🎈🎈 file_index key ${key} vs Value ${value} `)

            hashName.set(key, value);
        }


        // save aquatree in file objects
        for (let fileObject of chainData.fileObject) {
            // Ensure the file object has a valid hashe
            let isAquaTreeData = isAquaTree(fileObject.fileContent);
            if (isAquaTreeData) {
                let aquaTree = fileObject.fileContent as AquaTree
                await saveAquaTree(aquaTree, userAddress, null, true);
                allAquaTrees.push(aquaTree);
                for (let key in chainData.aquaTree.file_index) {
                    // Ensure the file object has a valid hashe
                    const value = chainData.aquaTree.file_index[key];
                    console.log(`b 🎈🎈 file_index key ${key} vs Value ${value} `)
                    hashName.set(key, value);
                }
            } else {

                console.log(`File object is not an AquaTree: ${JSON.stringify(fileObject, null, 2)}`);
            }
        }

        console.log(`🎈🎈 hashName Map: ${JSON.stringify(Array.from(hashName.entries()), null, 2)}`);
        // throw new Error(`here `)
        for (const [key, value] of hashName) {
            console.log(`🎈🎈 Key: ${key}, Value: ${value}`);

            // fetch file hash from file object
            let fileObjectItem = chainData.fileObject.find(obj => obj.fileName === value);
            if (!fileObjectItem) {
                throw new Error(`File hash not found for key: ${key}`);
            }

            // Extract the hash from fileContent URL
            const fileUrl = fileObjectItem.fileContent as string;
            const fileHash = fileUrl.split('/').pop(); // Gets the last segment of the URL
            if (!fileHash) {
                throw new Error(`Invalid file URL (no file hash found): ${fileUrl}`);
            }
            let hash = key

            for (let aquaTree of allAquaTrees) {
                let allHashes = Object.keys(aquaTree.revisions);
                if (allHashes.includes(hash)) {
                    let selectedRevion = aquaTree.revisions[hash];
                    if (selectedRevion.revision_type == "file" || selectedRevion.revision_type == "form") {
                        console.log(`OK: Revision type is ${selectedRevion.revision_type} for hash ${hash} in aqua tree ${aquaTree.file_index[hash]}`);
                    } else {
                        let genesisHash = getGenesisHash(aquaTree);
                        hash = genesisHash ?? "genesis_hash_error";
                    }
                }

                const userAddressHash = `${userAddress}_${hash}`;

                let existingFileIndex = await prisma.fileIndex.findFirst({
                    where: { file_hash: fileHash }
                });

                if (!existingFileIndex) {
                    throw new Error(`File index  not found for key: ${value}  with file hash: ${fileHash}`);
                }

                // Update existing file index
                if (!existingFileIndex.pubkey_hash.includes(userAddressHash)) {
                    existingFileIndex.pubkey_hash.push(userAddressHash);
                }

                await prisma.fileIndex.update({
                    data: { pubkey_hash: existingFileIndex.pubkey_hash },
                    where: { file_hash: existingFileIndex.file_hash }
                });

                await prisma.fileName.upsert({
                    where: { pubkey_hash: userAddressHash },
                    create: {
                        pubkey_hash: userAddressHash,
                        file_name: fileObjectItem.fileName
                    },
                    update: {}
                });
            }
        }
        return { success: true, message: "This function is not implemented yet" };
    } catch (error: any) {
        console.error("Error in function transfer:", error);
        return { success: false, message: `Error transferring data: ${error.message}` };
    }

}
/**
 * Fetches aqua trees for a user based on their latest revision hashes.
 * @param url - The base URL for the API.
 * @param latest - An array of objects containing the latest revision hashes and user addresses.
 * @returns An array of objects containing the aqua tree and associated file objects.
 */
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
        // let userAddress = revisionLatestItem.user
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

export async function saveARevisionInAquaTree(revisionData: SaveRevisionForUser, userAddress: string, url: string): Promise<[number, string]> {

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
        return [405, `previous  hash  not found ${oldFilePubKeyHash}`] ///reply.code(401).send({ success: false, message: `previous  hash  not found ${oldFilePubKeyHash}` });

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
            file_hash: revisionData.revision.file_hash,

        },
    });

    if (revisionData.revision.revision_type == "form") {
        let revisioValue = Object.keys(revisionData);
        for (let formItem in revisioValue) {
            if (formItem.startsWith("forms_")) {
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
        if (typeof revisionData.revision.signature === "string") {
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
        // fetch the other entire chain and bring it to the current user scope
        if (revisionData.orginAddress != userAddress) {
            if (revisionData.revision.link_verification_hashes?.length == 0) {
                throw Error(`Linke verification hashes length cannot be 0`)

            }
            let hash = (revisionData.revision.link_verification_hashes && revisionData.revision.link_verification_hashes.length > 0)
                ? revisionData.revision.link_verification_hashes[0]
                : undefined;
            if (!hash) {
                throw Error(`Linke verification hashes  cannot be undefined`)
            }
            let pubKeyHash = `${revisionData.orginAddress}_${hash}`

            console.log(`pubKeyHash ${pubKeyHash}`)
            let [anAquaTree, fileObject] = await createAquaTreeFromRevisions(pubKeyHash, url);

            console.log(`anAquaTree ${JSON.stringify(anAquaTree, null, 4)}  fileObject  ${JSON.stringify(fileObject, null, 4)}`)



            let response = await transferRevisionChainData(userAddress, {
                aquaTree: anAquaTree,
                fileObject: fileObject
            }, null, true)
            if (response.success == false) {
                throw Error(`An error occured transfering chain ${response.message}`)
            }

        }
    }

    if (revisionData.revision.revision_type == "file" || revisionData.revision.revision_type == "form") {

        let existingFileIndex = await prisma.fileIndex.findFirst({
            where: {
                file_hash: revisionData.revision.file_hash
            }
        })

        if (!existingFileIndex) {
            throw Error(`File index not found for ${revisionData.revision.file_hash} this should exist are you are saving for another user.`)
        }
        await prisma.fileIndex.update({
            where: {
                file_hash: filePubKeyHash,
            },

            data: {
                pubkey_hash: [...existingFileIndex.pubkey_hash, filePubKeyHash]
            }
        });

        let existingFileName = await prisma.fileName.findFirst({

            where: {
                pubkey_hash: {
                    contains: revisionData.revisionHash,
                    mode: 'insensitive'
                }
            }
        })

        if (!existingFileIndex) {
            throw Error(`File name not found for hash ${revisionData.revisionHash} this should exist are you are saving for another user.`)
        }

        await prisma.fileName.upsert({
            where: {
                pubkey_hash: filePubKeyHash,
            },
            create: {

                pubkey_hash: filePubKeyHash,
                file_name: existingFileName!.file_name,

            },
            update: {
                pubkey_hash: filePubKeyHash,
                file_name: existingFileName!.file_name
            }
        })
    }

    return [200, ""]
}

// start of delete


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
    const witnesses: WitnessEvent[] = await tx.witness.findMany({
        where: {
            hash: { in: revisionHashes }
        }
    });

    const witnessRoots = witnesses
        .map((w: WitnessEvent) => w.Witness_merkle_root)
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


    // Start with exact matches
    let fileIndexesToProcess: FileIndex[] = await tx.fileIndex.findMany({
        where: {
            pubkey_hash: {
                hasSome: revisionHashes
            }
        },

    });

    if (fileIndexesToProcess.length === 0) {
        console.log("No FileIndex entries found for the provided revision hashes");
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
                        fs.unlinkSync(file.file_location);
                        console.log(`Deleted file from filesystem: ${file.file_location}`);
                    } catch (error) {
                        console.log(`Error deleting file from filesystem: ${file.file_location}`, error);
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
    console.log(`Updated ${updatedRevisions.count} revisions that referenced the deleted revisions`);
    return updatedRevisions.count;
}

// Utility function to delete revisions
async function deleteRevisions(tx: any, revisions: Revision[]) {
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
async function deleteFileNames(tx: any, pubkeyHashes: string | string[]): Promise<void> {
    const hashes = Array.isArray(pubkeyHashes) ? pubkeyHashes : [pubkeyHashes];
    hashes.forEach(async (hash, index) => {

        const deletedFileNames = await tx.fileName.deleteMany({
            where: {
                pubkey_hash: hash
            }
        });
        console.log(`Deleted ${deletedFileNames.count} FileName entries`);
        return deletedFileNames.count;
    });
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
        const revisionData: Revision[] = [];

        const latestRevisionData: Revision | null = await prisma.revision.findFirst({
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

        await prisma.fileName.upsert({
            where: { pubkey_hash: pubKeyHash },
            create: {
                pubkey_hash: pubKeyHash,
                file_name: fileName,
            },
            update: {
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

    // First, create or update the WitnessEvent (the referenced table)
    await prisma.witnessEvent.upsert({
        where: { Witness_merkle_root: revisionData.witness_merkle_root },
        update: {
            Witness_timestamp: revisionData.witness_timestamp?.toString(),
            Witness_network: revisionData.witness_network,
            Witness_smart_contract_address: revisionData.witness_smart_contract_address,
            Witness_transaction_hash: revisionData.witness_transaction_hash,
            Witness_sender_account_address: revisionData.witness_sender_account_address
        },
        create: {
            Witness_merkle_root: revisionData.witness_merkle_root,
            Witness_timestamp: revisionData.witness_timestamp?.toString(),
            Witness_network: revisionData.witness_network,
            Witness_smart_contract_address: revisionData.witness_smart_contract_address,
            Witness_transaction_hash: revisionData.witness_transaction_hash,
            Witness_sender_account_address: revisionData.witness_sender_account_address
        }
    });

    // Then, create or update the Witness record
    await prisma.witness.upsert({
        where: { hash: pubKeyHash },
        update: { reference_count: { increment: 1 } },
        create: {
            hash: pubKeyHash,
            Witness_merkle_root: revisionData.witness_merkle_root,
            reference_count: 1
        }
    });
    // await prisma.witness.upsert({
    //     where: { hash: pubKeyHash },
    //     update: { reference_count: { increment: 1 } },
    //     create: {
    //         hash: pubKeyHash,
    //         Witness_merkle_root: revisionData.witness_merkle_root,
    //         reference_count: 1
    //     }
    // });

    // await prisma.witnessEvent.upsert({
    //     where: { Witness_merkle_root: revisionData.witness_merkle_root! },
    //     update: {
    //         Witness_merkle_root: revisionData.witness_merkle_root!,
    //         Witness_timestamp: revisionData.witness_timestamp?.toString(),
    //         Witness_network: revisionData.witness_network,
    //         Witness_smart_contract_address: revisionData.witness_smart_contract_address,
    //         Witness_transaction_hash: revisionData.witness_transaction_hash,
    //         Witness_sender_account_address: revisionData.witness_sender_account_address
    //     },
    //     create: {
    //         Witness_merkle_root: revisionData.witness_merkle_root!,
    //         Witness_timestamp: revisionData.witness_timestamp?.toString(),
    //         Witness_network: revisionData.witness_network,
    //         Witness_smart_contract_address: revisionData.witness_smart_contract_address,
    //         Witness_transaction_hash: revisionData.witness_transaction_hash,
    //         Witness_sender_account_address: revisionData.witness_sender_account_address
    //     }
    // });
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
            // hash: pubKeyHash,
            // link_type: "aqua",
            // link_require_indepth_verification: false,
            // link_verification_hashes: revisionData.link_verification_hashes,
            // link_file_hashes: revisionData.link_file_hashes,
            // reference_count: 0
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
    //not sure about the following code
    if (revisionData.link_verification_hashes?.length > 0) {
        for (const linkedHash of revisionData.link_verification_hashes) {
            const linkedRevision = await prisma.revision.findFirst({
                where: {
                    pubkey_hash: linkedHash
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
    let inserRes = await prisma.latest.upsert({
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
            template_id: templateId,
            is_workflow: isWorkFlow
        }
    });

    // console.log(`latest insert res ${JSON.stringify(inserRes, null, 4)}`)

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
    // Helper function to decode filename if it's in ASCII format
    const decodeFileName = (fileName: string): string => {
        if (fileName.includes(',') && /^\d+,/.test(fileName)) {
            return fileName.split(',').map(code => String.fromCharCode(parseInt(code))).join('');
        }
        return fileName;
    };

    // Create a map of decoded filenames to original keys
    const fileMap = new Map();
    for (const originalKey in zipData.files) {
        const decodedKey = decodeFileName(originalKey);
        console.log(`Decoded key: ${decodedKey} for original key: ${originalKey}`);
        fileMap.set(decodedKey.trim(), originalKey.trim());
    }

    const aquaJsonOriginalKey = fileMap.get('aqua.json');
    if (!aquaJsonOriginalKey) return;

    const aquaJsonFile = zipData.files[aquaJsonOriginalKey];
    const fileContent = await aquaJsonFile.async('text');
    const aquaData: AquaJsonInZip = JSON.parse(fileContent);

    for (const nameHash of aquaData.name_with_hash) {
        let aquaFileName = "";
        if (nameHash.name.endsWith('.aqua.json')) {
            aquaFileName = nameHash.name;
        } else {
            aquaFileName = `${nameHash.name}.aqua.json`;
        }
        const aquaFileOriginalKey = fileMap.get(aquaFileName);

        if (!aquaFileOriginalKey) {
            throw new Error(`Expected to find ${aquaFileName} as defined in aqua.json but file not found`);
        }

        const aquaFile = zipData.files[aquaFileOriginalKey];
        const aquaFileDataText = await aquaFile.async('text');
        const aquaTreeData: AquaTree = JSON.parse(aquaFileDataText);

        const genesisHash = getGenesisHash(aquaTreeData);
        if (!genesisHash) {
            throw new Error(`Genesis hash cannot be null`);
        }

        const filePubKeyHash = `${userAddress}_${genesisHash}`;
        const fileAssetOriginalKey = fileMap.get(nameHash.name);
        const fileAsset = zipData.files[fileAssetOriginalKey];

        await processFileData(
            nameHash.hash,
            userAddress,
            genesisHash,
            fileAsset,
            nameHash.name
        );
    }
}


// read zip file and create AquaTree from revisions


export async function processAquaFiles(
    zipData: JSZip,
    userAddress: string,
    templateId: string | null = null,
    isWorkFlow: boolean = false
) {
    try {
        const aquaConfig = await getAquaConfiguration(zipData);
        console.log(`config Aqua Tree: ${JSON.stringify(aquaConfig, null, 2)}`);
        const mainAquaTree = await getMainAquaTree(zipData, aquaConfig);
        console.log(`Main Aqua Tree: ${JSON.stringify(mainAquaTree, null, 2)}`);
        const actualIsWorkFlow = determineWorkFlowStatus(mainAquaTree, isWorkFlow);
        console.log(`actualIsWorkFlow: ${actualIsWorkFlow}`);


        await processAllAquaFiles(zipData, userAddress, templateId, aquaConfig, mainAquaTree, actualIsWorkFlow);
    } catch (error) {
        console.error('Error processing aqua files:', error);
        // Fallback: process all aqua files without special workflow handling
        await processAllAquaFilesGeneric(zipData, userAddress, templateId, isWorkFlow);
    }
}

async function getAquaConfiguration(zipData: JSZip): Promise<AquaJsonInZip | null> {
    const aquaJson = zipData.files['aqua.json'];
    if (!aquaJson) return null;

    const fileContent = await aquaJson.async('text');
    const aquaData: AquaJsonInZip = JSON.parse(fileContent);
    console.log(`Processing aqua files with genesis: ${aquaData.genesis}`);
    return aquaData;
}

async function getMainAquaTree(zipData: JSZip, aquaConfig: AquaJsonInZip | null): Promise<AquaTree | null> {
    if (!aquaConfig) return null;

    const mainAquaFile = zipData.files[`${aquaConfig.genesis}.aqua.json`];
    if (!mainAquaFile) return null;

    const aquaTreeContent = await mainAquaFile.async('text');

    if (!aquaTreeContent) return null;

    return JSON.parse(aquaTreeContent);
}

function determineWorkFlowStatus(mainAquaTree: AquaTree | null, fallbackStatus: boolean): boolean {
    if (!mainAquaTree) return fallbackStatus;
    return isWorkFlowData(mainAquaTree, systemTemplateHashes).isWorkFlow || fallbackStatus;
}

async function processAllAquaFiles(
    zipData: JSZip,
    userAddress: string,
    templateId: string | null,
    aquaConfig: AquaJsonInZip | null,
    mainAquaTree: AquaTree | null,
    isWorkFlow: boolean
) {
    const aquaFiles = getAquaFiles(zipData);

    if (isWorkFlow && mainAquaTree && aquaConfig) {
        // Process workflow: save non-main files first, then main file
        await processWorkflowFiles(aquaFiles, aquaConfig.genesis, userAddress, templateId);
        await saveAquaTree(mainAquaTree, userAddress, templateId, false);
    } else {
        // Process regular files
        await processRegularFiles(aquaFiles, userAddress, templateId, isWorkFlow);
    }
}

async function processWorkflowFiles(
    aquaFiles: Array<{ fileName: string; file: JSZip.JSZipObject }>,
    genesisFileName: string,
    userAddress: string,
    templateId: string | null
) {
    const nonMainFiles = aquaFiles.filter(({ fileName }) => fileName !== genesisFileName);

    for (const { file } of nonMainFiles) {
        const aquaTree = await parseAquaFile(file);
        await saveAquaTree(aquaTree, userAddress, templateId, true);
    }
}

async function processRegularFiles(
    aquaFiles: Array<{ fileName: string; file: JSZip.JSZipObject }>,
    userAddress: string,
    templateId: string | null,
    isWorkFlow: boolean
) {
    for (const { file } of aquaFiles) {
        const aquaTree = await parseAquaFile(file);
        await saveAquaTree(aquaTree, userAddress, templateId, isWorkFlow);
    }
}

async function processAllAquaFilesGeneric(
    zipData: JSZip,
    userAddress: string,
    templateId: string | null,
    isWorkFlow: boolean
) {
    const aquaFiles = getAquaFiles(zipData);
    await processRegularFiles(aquaFiles, userAddress, templateId, isWorkFlow);
}

function getAquaFiles(zipData: JSZip): Array<{ fileName: string; file: JSZip.JSZipObject }> {
    return Object.entries(zipData.files)
        .filter(([fileName]) => fileName.endsWith(".aqua.json") && fileName !== 'aqua.json')
        .map(([fileName, file]) => ({ fileName, file }));
}

async function parseAquaFile(file: JSZip.JSZipObject): Promise<AquaTree> {
    const fileContent = await file.async('text');
    return JSON.parse(fileContent);
}

//end of read zip file and create AquaTree from revisions



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

