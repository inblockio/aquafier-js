import {
    AquaTree,
    FileObject,
    OrderRevisionInAquaTree,
    reorderAquaTreeRevisionsProperties,
    Revision as AquaTreeRevision,
    cliRedify
} from 'aqua-js-sdk';
import { prisma } from '../database/db';
import { AquaForms, FileIndex, Link, Revision as DBRevision, Signature, WitnessEvent, FileName } from '@prisma/client';
import * as fs from "fs"
import { SaveRevisionForUser } from '../models/request_models';
import { getAquaTreeFileName, getHost, getPort } from './api_utils';
import { InvoiceUtils } from './invoice_utils';
import { InvoiceData } from '../models/invoice';
import { createAquaTreeFromRevisions } from './revisions_operations_utils';
import { getGenesisHash } from './aqua_tree_utils';
import JSZip from 'jszip';
import { deleteFile, getFileUploadDirectory } from './file_utils';
import { randomUUID } from 'crypto';
import path from 'path';
import { systemTemplateHashes } from '../models/constants';
import Logger from './logger';
import { usageService } from '../services/usageService';
import { createNotificationAndSendWebSocketNotification } from './notification_utils';
import { isWorkFlowData, isAquaTree, getAquatreeObject } from './revision_detection_utils';


export async function transferRevisionChainData(
    userAddress: string,
    chainData: {
        aquaTree: AquaTree; fileObject: FileObject[]
    },
    templateId: string | null = null, isWorkFlow: boolean = false): Promise<{ success: boolean, message: string }> {

    try {
        let allAquaTrees: AquaTree[] = [];

        let allHashes = Object.keys(chainData.aquaTree.revisions);
        if (allHashes.length == 0) {
            throw new Error("🎈🎈No revisions found in the aqua tree");
        }

        // Logger.info(`🎈🎈 aquaTree  ${JSON.stringify(chainData.aquaTree, null, 4)}`)
        let hashName = new Map<string, string>();

        await saveAquaTree(chainData.aquaTree, userAddress, templateId, isWorkFlow);
        allAquaTrees.push(chainData.aquaTree);

        for (let key in chainData.aquaTree.file_index) {
            const value = chainData.aquaTree.file_index[key];
            hashName.set(key, value);
        }


        let workFlowData = isWorkFlowData(chainData.aquaTree, systemTemplateHashes);
        let workflowDataToBeseparated = ""
        if (workFlowData.isWorkFlow && (workFlowData.workFlow.includes("phone_number_claim") || workFlowData.workFlow.includes("email_claim"))) {
            let aquaTreereorder = reorderAquaTreeRevisionsProperties(chainData.aquaTree)
            let revisionServerSign = Object.values(aquaTreereorder.revisions)[3]

            if (revisionServerSign && revisionServerSign.revision_type == "link") {
                workflowDataToBeseparated = revisionServerSign.link_verification_hashes![0] ?? ""
            }
        }

        // save aquatree in file objects
        for (let i = 0; i < chainData.fileObject.length; i++) {
            // Ensure the file object has a valid hashe
            let fileObject = chainData.fileObject[i]
            let isAquaTreeData = isAquaTree(fileObject.fileContent);
            if (isAquaTreeData) {
                let aquaTree = getAquatreeObject(fileObject.fileContent)

                let shouldAquaTreeBeSavedAsPartOfWorkflow = workFlowData.isWorkFlow

                let allHashesOfCurrentAquaTreeInLoop = Object.keys(aquaTree.revisions)

                // for claims email and phone number save the  server attesation as a seperate file
                if (workflowDataToBeseparated.length > 0 && allHashesOfCurrentAquaTreeInLoop.includes(workflowDataToBeseparated)) {
                    shouldAquaTreeBeSavedAsPartOfWorkflow = false
                }

                // hide system templates from user view
                // Only set to true for system templates; never override to false
                // when the parent is already a workflow (child trees of workflows
                // should remain hidden even if their genesis hash isn't a system template)
                let genhash = getGenesisHash(aquaTree);
                if (genhash && systemTemplateHashes.includes(genhash.trim())) {
                    shouldAquaTreeBeSavedAsPartOfWorkflow = true
                }


                //    await deletLatestIfExistsForAquaTree(aquaTree, userAddress)
                for (let key of Object.keys(aquaTree.file_index)) {
                    // Ensure the file object has a valid hashes
                    const value = aquaTree.file_index[key];
                    hashName.set(key, value);
                }

                await saveAquaTree(aquaTree, userAddress, null, shouldAquaTreeBeSavedAsPartOfWorkflow);
                allAquaTrees.push(aquaTree);
            } else {
                Logger.info(`File object is not an AquaTree: ${JSON.stringify(fileObject, null, 2)}`);
            }
        }

        // Logger.info(`🎈🎈 hashName Map: ${JSON.stringify(Array.from(hashName.entries()), null, 2)}`);

        for (const [key, value] of hashName) {
            Logger.info(`🎈🎈 Key: ${key}, Value: ${value}`);

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
                        Logger.info(`OK: Revision type is ${selectedRevion.revision_type} for hash ${hash} in aqua tree ${aquaTree.file_index[hash]}`);
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
        Logger.error("Error in function transfer:", error);
        console.log(cliRedify(error))
        return { success: false, message: `Error transferring data: ${error.message}` };
    }

}

export async function saveMyRevisionInAquaTree(revisionData: SaveRevisionForUser, userAddress: string, url: string): Promise<[number, string]> {

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
    if (revisionData.originAddress != userAddress) {
        return [400, "Cannot save revision for another user"] // reply.code(400).send({ success: false, message: "Cannot save revision for another user" });
    }

    let oldFilePubKeyHash = `${revisionData.originAddress}_${revisionData.revision.previous_verification_hash}`

    let existData = await prisma.latest.findFirst({
        where: {
            hash: oldFilePubKeyHash
        }
    });

    // If not found in latest, check if the revision exists and rebuild the chain
    if (existData == null) {
        console.log(` Latest entry not found for hash ${oldFilePubKeyHash}, checking revisions...`);
        return [405, `previous  hash  not found ${oldFilePubKeyHash}`] ///reply.code(401).send({ success: false, message: `previous  hash  not found ${oldFilePubKeyHash}` });

    }
    let filePubKeyHash = `${revisionData.originAddress}_${revisionData.revisionHash}`

    try {
        await updateLatestAndInsertRevision(revisionData, filePubKeyHash, oldFilePubKeyHash, userAddress, url);

        return [200, ""]
    } catch (error) {

        console.log("Error saving revision: ", error);
        return [500, "Internal server error while saving revision"]
    }


}


export async function saveForOtherUserRevisionInAquaTree(revisionData: SaveRevisionForUser, url: string): Promise<[number, string]> {
    let userAddressToHaveNewRevision: string = revisionData.address!

    if (!revisionData.revision) {
        return [400, "revision Data is required"]
    }
    if (!revisionData.revisionHash) {
        return [400, "revision hash is required"]
    }

    if (!revisionData.revision.revision_type) {
        return [400, "revision type is required"]
    }

    if (!revisionData.revision.local_timestamp) {
        return [400, "revision timestamp is required"]
    }

    if (!revisionData.revision.previous_verification_hash) {
        return [400, "previous revision hash  is required"]
    }
    if (revisionData.originAddress == userAddressToHaveNewRevision) {
        return [400, "Cannot save revision for same user"]
    }


    // get previous revision to prevent saving broken chain for other users
    let previousOriginAddessPubkeyhash = `${revisionData.originAddress}_${revisionData.revision.previous_verification_hash}`
    let originAddessPreviousRevision = await prisma.revision.findFirst({
        where: {
            pubkey_hash: {
                equals: previousOriginAddessPubkeyhash
            }
        }
    })



    if (!originAddessPreviousRevision) {
        console.log(` Previous revision not found in user ${revisionData.originAddress} cannot save for user ${userAddressToHaveNewRevision}`);
        return [404, `Previous revision not found in user ${revisionData.originAddress} cannot save for user ${userAddressToHaveNewRevision}`] // reply.code(400).send({ success: false, message: `Previous revision not found in user ${revisionData.originAddress} cannot save for user ${userAddressToHaveNewRevision}` });
    }


    // prevent saving revision for other users and you do not have the new revision
    let originAddessNewRevisionPubkeyhash = `${revisionData.originAddress}_${revisionData.revisionHash}`
    let originAddessNewRevision = await prisma.revision.findFirst({
        where: {
            pubkey_hash: {
                equals: originAddessNewRevisionPubkeyhash
            }
        }
    })

    if (!originAddessNewRevision) {
        console.log(` New revision not found in user ${revisionData.originAddress} cannot save for user ${userAddressToHaveNewRevision}`);
        return [404, `New revision not found in user ${revisionData.originAddress} cannot save for new user ${userAddressToHaveNewRevision}`] // reply.code(400).send({ success: false, message: `New revision not found in user ${revisionData.originAddress} cannot save for user ${userAddressToHaveNewRevision}` });
    }


    // target user does he have the previous revision
    let previousPubkeyhashTargetUser = `${userAddressToHaveNewRevision}_${revisionData.revision.previous_verification_hash}`
    let targetUserHasPreviousRevision = await prisma.revision.findFirst({
        where: {
            pubkey_hash: {
                equals: previousPubkeyhashTargetUser
            }
        }
    })

    if (!targetUserHasPreviousRevision) {

        console.log(` Previous revision not found in user ${revisionData.originAddress} cannot save for user ${revisionData.address}`);
        console.log(` This can be caused by the other not importing an aqua sign `);
        console.log(` This can also be caused by  the user in local scope extending the aqua tree without sharing the previous revision `);
        // to attempt to reconcile this we check if the  entire aqua tree  is a workflow of type aqua sign
        // else we throw an error

        const [baseAquaTree, baseFileObjects] = await createAquaTreeFromRevisions(originAddessNewRevisionPubkeyhash, url);

        const { workFlow, isWorkFlow } = isWorkFlowData(baseAquaTree, systemTemplateHashes)
        console.log("Workflow check on workflow endpoint isWorkFlow = " + isWorkFlow + " name " + workFlow)

        if (isWorkFlow && workFlow.includes("aqua_sign")) {

            // check if the target user has genessis revision if not we cannot transfer the chain as it will be orphaned and we will have no way to link it to the user
            let genesisHash = getGenesisHash(baseAquaTree)
            let genesisPubkeyHashForTargetUser = `${userAddressToHaveNewRevision}_${genesisHash}`
            let targetUserHasGenesisRevision = await prisma.revision.findFirst({
                where: {
                    pubkey_hash: {
                        equals: genesisPubkeyHashForTargetUser
                    }
                }
            })
            if (!targetUserHasGenesisRevision) {
                console.log(` Target user ${userAddressToHaveNewRevision} does not have the genesis revision of the chain cannot save revision and the aqua tree is an aqua sign workflow `);
                return [404, `Target user ${userAddressToHaveNewRevision} does not have the genesis revision of the chain cannot save revision and the aqua tree is an aqua sign workflow`] // reply.code(400).send({ success: false, message: `Target user ${userAddressToHaveNewRevision} does not have the genesis revision of the chain cannot save revision and the aqua tree is an aqua sign workflow` });
            }

            // proceed to transfer the entire chain
            let response = await transferRevisionChainData(userAddressToHaveNewRevision, {
                aquaTree: baseAquaTree,
                fileObject: baseFileObjects
            }, null, true)
            if (response.success == false) {
                throw Error(`An error occured transfering chain ${response.message}`)
            }
            // after transferring the chain we check again if the previous revision now exist
            targetUserHasPreviousRevision = await prisma.revision.findFirst({
                where: {
                    pubkey_hash: {
                        equals: previousPubkeyhashTargetUser
                    }
                }
            })
            if (!targetUserHasPreviousRevision) {
                console.log(` Target user ${userAddressToHaveNewRevision} still does not have the previous revision cannot save revision even after transferring aqua sign workflow`);
                return [404, `Target user ${userAddressToHaveNewRevision} still does not have the previous revision cannot save revision even after transferring aqua sign workflow`] // reply.code(400).send({ success: false, message: `Target user ${userAddressToHaveNewRevision} still does not have the previous revision cannot save revision even after transferring aqua sign workflow` });
            }

            // else proceed to save the revision in updateLatestAndInsertRevision
        } else {
            console.log(` Target user ${userAddressToHaveNewRevision} does not have the previous revision cannot save revision and the aqua tree is not an aqua sign workflow `);
            return [404, `Target user ${userAddressToHaveNewRevision} does not have the previous revision cannot save revision`] // reply.code(400).send({ success: false, message: `Target user ${userAddressToHaveNewRevision} does not have the previous revision cannot save revision` });
        }
    }

    try {


        await updateLatestAndInsertRevision(revisionData, `${userAddressToHaveNewRevision}_${revisionData.revisionHash}`, previousPubkeyhashTargetUser, userAddressToHaveNewRevision, url);

        return [200, ""]
    } catch (error) {

        console.log("Error saving revision: ", error);
        return [500, "Internal server error while saving revision"]
    }

}

async function updateLatestAndInsertRevision(revisionData: SaveRevisionForUser, filePubKeyHash: string, oldFilePubKeyHash: string, userAddressToHaveNewRevision: string, url: string) {
    // Wrap all database operations in a transaction to ensure atomicity
    // This prevents race conditions where getUserApiFileInfo reads stale data
    console.log(`🤫🤫 Starting transaction to update latest and insert revision for user ${userAddressToHaveNewRevision} with new hash ${filePubKeyHash} replacing old hash ${oldFilePubKeyHash}`);
    await prisma.$transaction(async (tx) => {
        await tx.latest.updateMany({
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
                hash: filePubKeyHash,
                // is_workflow: revisionData.isWorkflow,
                updatedAt: new Date(),

            }
        });


        //save the revision

        // Insert new revision into the database
        await tx.revision.upsert({
            where: {
                pubkey_hash: filePubKeyHash
            },
            create: {
                pubkey_hash: filePubKeyHash,
                nonce: revisionData.revision.file_nonce || "",
                shared: [],
                previous: `${userAddressToHaveNewRevision}_${revisionData.revision.previous_verification_hash}`,
                children: [],
                local_timestamp: revisionData.revision.local_timestamp, // revisionData.revision.local_timestamp,
                revision_type: revisionData.revision.revision_type,
                verification_leaves: revisionData.revision.leaves || [],
                file_hash: revisionData.revision.file_hash,

            },
            update: {

            }

        });

        // Update the previous revision's children to include this new revision
        await tx.revision.update({
            where: {
                pubkey_hash: `${userAddressToHaveNewRevision}_${revisionData.revision.previous_verification_hash}`
            },
            data: {
                children: {
                    push: filePubKeyHash
                }
            }
        });

        // Process form data - iterate over revisionData keys that start with "forms_"
        if (revisionData.revision.revision_type == "form") {
            const formKeys = Object.keys(revisionData).filter(key => key.startsWith("forms_"));
            for (const formKey of formKeys) {
                await tx.aquaForms.create({
                    data: {
                        hash: filePubKeyHash,
                        key: formKey,
                        value: (revisionData as any)[formKey],
                        type: typeof (revisionData as any)[formKey]
                    }
                });
            }
        }

        if (revisionData.revision.revision_type == "signature") {
            let signature = "";
            if (typeof revisionData.revision.signature === "string") {
                signature = revisionData.revision.signature
            } else {
                signature = JSON.stringify(revisionData.revision.signature)
            }



            // process.exit(1);
            await tx.signature.upsert({
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


            await tx.witnessEvent.upsert({
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


            await tx.witness.upsert({
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

            console.log(`Saving link revision with hash ${filePubKeyHash} for user ${userAddressToHaveNewRevision}...`)
            await tx.link.upsert({
                where: {
                    hash: filePubKeyHash
                },
                update: {
                    hash: filePubKeyHash,
                    link_type: "aqua",
                    link_require_indepth_verification: false,
                    link_verification_hashes: revisionData.revision.link_verification_hashes,
                    link_file_hashes: revisionData.revision.link_file_hashes,
                    reference_count: {
                        increment: 1
                    }
                } ,
                create: {
                    hash: filePubKeyHash,
                    link_type: "aqua",
                    link_require_indepth_verification: false,
                    link_verification_hashes: revisionData.revision.link_verification_hashes,
                    link_file_hashes: revisionData.revision.link_file_hashes,
                    reference_count: 1
                }
            })

            // Check if this link revision makes the aqua tree a workflow
            // by checking if any of the link_verification_hashes are known workflow template hashes
            const linkVerificationHashes = revisionData.revision.link_verification_hashes || [];
            const isLinkingToWorkflow = linkVerificationHashes.some(
                (hash: string) => systemTemplateHashes.includes(hash)
            );

            if (isLinkingToWorkflow) {
                // Update the is_workflow flag in Latest table
                await tx.latest.updateMany({
                    where: {
                        hash: filePubKeyHash
                    },
                    data: {
                        is_workflow: true
                    }
                });
            }

            //  fetch the aqua tree in the link and recusively save the aqua tree if not exists
            for (let linkedHash of linkVerificationHashes) {
                let existingLatest = await tx.latest.findFirst({
                    where: {
                        hash: {
                            contains: `${revisionData.originAddress}_${linkedHash}`,
                            mode: 'insensitive'
                        }
                    }


                });

                if (!existingLatest) {
                    Logger.info(`🤯Linked aqua tree with hash ${revisionData.originAddress}_${linkedHash} not found for user ${revisionData.originAddress}, fetching and saving...`);
                    throw Error(`🤯 Linked aqua tree with hash ${revisionData.originAddress}_${linkedHash} not found for user ${revisionData.originAddress}, cannot save link revision for ${userAddressToHaveNewRevision}.`);

                } else {

                    Logger.info(`✅ Linked aqua tree with hash ${revisionData.originAddress}_${linkedHash} found for user ${revisionData.originAddress}, fetching and saving...`);
                    const [linkedAquaTree, linkedFileObjects] = await createAquaTreeFromRevisions(`${revisionData.originAddress}_${linkedHash}`, url);

                    console.log(`🐐 Fetched linked aqua tree: ${JSON.stringify(linkedAquaTree, null, 2)}`);
                    console.log(`🐐🐐 Fetched linked aqua tree fileobjects : ${JSON.stringify(linkedFileObjects, null, 2)}`);

                    await transferRevisionChainData(
                        userAddressToHaveNewRevision,
                        {
                            aquaTree: linkedAquaTree,
                            fileObject: linkedFileObjects
                        },
                        null,
                        true // Mark linked trees as workflow if the parent link revision is a workflow, this will hide the linked tree from user view and only show the parent link revision in the UI
                    );

                    // add  recursive function if linkedAquaTree contains link revisions fetch the aqua tree and save it to userAddressToHaveNewRevision
                    recusivelySaveLinkedAquaTrees(linkedAquaTree, url, userAddressToHaveNewRevision, revisionData.originAddress);
                }
            }


        }

        if (revisionData.revision.revision_type == "file" || revisionData.revision.revision_type == "form") {

            let existingFileIndex = await tx.fileIndex.findFirst({
                where: {
                    file_hash: revisionData.revision.file_hash
                }
            })

            if (!existingFileIndex) {
                throw Error(`File index not found for ${revisionData.revision.file_hash} this should exist are you are saving for another user.`)
            }
            await tx.fileIndex.update({
                where: {
                    file_hash: revisionData.revision.file_hash,
                },

                data: {
                    pubkey_hash: [...existingFileIndex.pubkey_hash, filePubKeyHash]
                }
            });

            let existingFileName = await tx.fileName.findFirst({

                where: {
                    pubkey_hash: {
                        contains: revisionData.revisionHash,
                        mode: 'insensitive'
                    }
                }
            })

            if (!existingFileName) {
                throw Error(`File name not found for hash ${revisionData.revisionHash} this should exist are you are saving for another user.`)
            }

            await tx.fileName.upsert({
                where: {
                    pubkey_hash: filePubKeyHash,
                },
                create: {

                    pubkey_hash: filePubKeyHash,
                    file_name: existingFileName.file_name,

                },
                update: {
                    pubkey_hash: filePubKeyHash,
                    file_name: existingFileName.file_name
                }
            })
        }
    });

}
async function recusivelySaveLinkedAquaTrees(aquaTree: AquaTree, url: string, userAddressToHaveNewRevision: string, originAddress: string) {
    console.log(`🔥🔥 Recursively checking linked aqua trees for user ${userAddressToHaveNewRevision}...`);
    const allRevisions = Object.values(aquaTree.revisions);
    for (let revision of allRevisions) {
        console.log(` Checking revision of type ${revision.revision_type}... ${JSON.stringify(revision, null, 2)}`);
        if (revision.revision_type === "link") {
            console.log(`Found link revision, processing linked hashes...`);
            const linkVerificationHashes = revision.link_verification_hashes || [];
            for (let linkedHash of linkVerificationHashes) {
                // Check if this linked hash already exists for the user
                let existingLatest = await prisma.latest.findFirst({
                    where: {
                        hash: {
                            contains: `${originAddress}_${linkedHash}`,
                            mode: 'insensitive'
                        }
                    }
                })

                if (!existingLatest) {

                    Logger.info(` ⚠️⚠️ Linked aqua tree with hash ${originAddress}_${linkedHash} already exists for user ${originAddress}, skipping save.`);
                } else {

                    Logger.info(`🪿🪿 Recursively saving linked aqua tree with hash ${linkedHash} for user ${userAddressToHaveNewRevision}... from origin ${originAddress}`);
                    const [linkedAquaTree, linkedFileObjects] = await createAquaTreeFromRevisions(`${originAddress}_${linkedHash}`, url);
                    console.log(`🪿🪿 Fetched linked aqua tree: ${JSON.stringify(linkedAquaTree, null, 2)}`);
                    console.log(`🪿🪿 Fetched linked aqua tree fileobjects : ${JSON.stringify(linkedFileObjects, null, 2)}`);
                    await transferRevisionChainData(
                        userAddressToHaveNewRevision,
                        {
                            aquaTree: linkedAquaTree,
                            fileObject: linkedFileObjects
                        },
                        null,
                        true // Mark linked trees as workflow if the parent link revision is a workflow, this will hide the linked tree from user view and only show the parent link revision in the UI
                    );

                    // Recursively check for further linked aqua trees
                    recusivelySaveLinkedAquaTrees(linkedAquaTree, url, userAddressToHaveNewRevision, originAddress);
                }

            }
        }
    }
}

interface FileProcessingResult {
    fileExists: boolean;
    fileData?: any;
    fileIndexData?: any;
}

/**
 * Processes file data and ensures file exists in database
 */
export async function processFileData(
    fileHash: string,
    userAddress: string,
    revisionHash: string,
    fileAsset?: JSZip.JSZipObject,
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

        // Logger.info(`creating file and hash `)
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

        // Logger.info(`updating  file and hash - ${fileHash} `)
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
    revisionData: AquaTreeRevision,
    pubKeyHash: string,
    userAddress: string,
    aquaTree: AquaTree,
    tx: any = prisma
) {
    const { revision_type } = revisionData;

    switch (revision_type) {
        case "form":
            await processFormRevision(revisionData, pubKeyHash, tx);
            break;

        case "signature":
            await processSignatureRevision(revisionData, pubKeyHash, tx);
            break;

        case "witness":
            await processWitnessRevision(revisionData, pubKeyHash, tx);
            break;

        case "file":
            await processFileRevision(revisionData, pubKeyHash, userAddress, tx);
            break;

        case "link":
            await processLinkRevision(revisionData, pubKeyHash, tx);
            break;
    }

    // Handle genesis revision file setup
    if (!revisionData.previous_verification_hash) {
        await processGenesisRevision(revisionData, userAddress, aquaTree, tx);
    }
}

async function processFormRevision(revisionData: any, pubKeyHash: string, tx: any = prisma) {
    const formKeys = Object.keys(revisionData).filter(key => key.startsWith("forms_"));
    if (formKeys.length === 0) return;

    await tx.aquaForms.createMany({
        data: formKeys.map(formKey => ({
            hash: pubKeyHash,
            key: formKey,
            value: revisionData[formKey],
            type: typeof revisionData[formKey]
        })),
        skipDuplicates: true
    });
}

async function processSignatureRevision(revisionData: AquaTreeRevision, pubKeyHash: string, tx: any = prisma) {
    const signature = typeof revisionData.signature === "string"
        ? revisionData.signature
        : JSON.stringify(revisionData.signature);

    await tx.signature.upsert({
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

async function processWitnessRevision(revisionData: AquaTreeRevision, pubKeyHash: string, tx: any = prisma) {

    // First, create or update the WitnessEvent (the referenced table)
    await tx.witnessEvent.upsert({
        where: { Witness_merkle_root: revisionData.witness_merkle_root },
        update: {
            Witness_timestamp: revisionData.witness_timestamp?.toString(),
            Witness_network: revisionData.witness_network,
            Witness_smart_contract_address: revisionData.witness_smart_contract_address,
            Witness_transaction_hash: revisionData.witness_transaction_hash,
            Witness_sender_account_address: revisionData.witness_sender_account_address
        },
        create: {
            Witness_merkle_root: revisionData.witness_merkle_root ?? "",
            Witness_timestamp: revisionData.witness_timestamp?.toString(),
            Witness_network: revisionData.witness_network,
            Witness_smart_contract_address: revisionData.witness_smart_contract_address,
            Witness_transaction_hash: revisionData.witness_transaction_hash,
            Witness_sender_account_address: revisionData.witness_sender_account_address
        }
    });

    // Then, create or update the Witness record
    await tx.witness.upsert({
        where: { hash: pubKeyHash },
        update: { reference_count: { increment: 1 } },
        create: {
            hash: pubKeyHash,
            Witness_merkle_root: revisionData.witness_merkle_root,
            reference_count: 1
        }
    });
}

async function processFileRevision(revisionData: AquaTreeRevision, pubKeyHash: string, userAddress: string, tx: any = prisma) {
    if (!revisionData.file_hash) {
        throw new Error(`AquaTreeRevision is detected to be a file but file_hash is missing`);
    }

    let fileResult = await tx.file.findFirst({
        where: {
            file_hash: { contains: revisionData.file_hash, mode: 'insensitive' }
        }
    });

    if (!fileResult) {
        throw new Error(`File data should be in database but is not found. [file hash ${revisionData.file_hash}]`);
    }

    // Update file index
    const existingFileIndex = await tx.fileIndex.findFirst({
        where: { file_hash: fileResult.file_hash }
    });

    if (existingFileIndex) {
        if (!existingFileIndex.pubkey_hash.includes(pubKeyHash)) {
            existingFileIndex.pubkey_hash.push(pubKeyHash);
        }

        await tx.fileIndex.update({
            data: { pubkey_hash: existingFileIndex.pubkey_hash },
            where: { file_hash: existingFileIndex.file_hash }
        });

        // Increment usage (uses own prisma instance, not part of transaction)
        await usageService.incrementFiles(userAddress, 1);
        if (fileResult.file_size) {
            await usageService.incrementStorage(userAddress, fileResult.file_size);
        }
    } else {
        throw new Error(`File index data should be in database but is not found.`);
    }
}

async function processLinkRevision(revisionData: any, pubKeyHash: string, tx: any = prisma) {
    await tx.link.upsert({
        where: { hash: pubKeyHash },
        update: {},
        create: {
            hash: pubKeyHash,
            link_type: "aqua",
            link_require_indepth_verification: false,
            link_verification_hashes: revisionData.link_verification_hashes,
            link_file_hashes: revisionData.link_file_hashes,
            reference_count: 0
        }
    });
}

async function processGenesisRevision(revisionData: any, userAddress: string, aquaTree: AquaTree, tx: any = prisma) {
    const fileHash = revisionData.file_hash;
    if (!fileHash) {
        throw new Error(`Genesis revision detected but file hash is null.`);
    }

    const existingFileIndex = await tx.fileIndex.findFirst({
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

        await tx.fileIndex.update({
            data: { pubkey_hash: existingFileIndex.pubkey_hash },
            where: { file_hash: existingFileIndex.file_hash }
        });
    }
}


async function createSubscriptionFromAquafierLicence(aquaTree: AquaTree, userAddress: string){

    const genesisHash  = getGenesisHash(aquaTree)
    if (!genesisHash) {
        Logger.warn('No genesis hash found for aquafier licence aqua tree')
        return
    }

    const genesisRevision = aquaTree.revisions[genesisHash]
    if (!genesisRevision) {
        Logger.warn(`Genesis revision not found for hash ${genesisHash}`)
        return
    }

    const licenceUserLimit = Number(genesisRevision.forms_users_subscription_limit) || 0 // if 0 its limitless
    const packageId = genesisRevision.forms_package_id
    const durationDays = Number(genesisRevision.forms_duration_days) || 30

    // 1. Check if the package_id is valid - if null/undefined, do nothing
    if (!packageId) {
        Logger.info(`Licence has no package_id, skipping subscription creation for user ${userAddress}`)
        return
    }

    // 2. Query the subscription plan by package_id
    const incomingPlan = await prisma.subscriptionPlan.findUnique({
        where: { id: String(packageId) }
    })

    if (!incomingPlan) {
        Logger.warn(`Subscription plan not found for package_id ${packageId}`)
        return
    }

    // 3. Skip the licence sender - they don't get a subscription from their own licence
    if (genesisRevision.forms_sender === userAddress) {
        return
    }

    // 4. Prior checks: receivers list vs user limit
    const receivers = (genesisRevision.forms_receiver ?? '').toString().trim()

    if (receivers.length > 0) {
        // Receivers are specified - only allow users in the comma-separated list
        const receiverList = receivers.split(',').map((r: string) => r.trim().toLowerCase())
        if (!receiverList.includes(userAddress.toLowerCase())) {
            Logger.info(`User ${userAddress} is not in the licence receiver list, skipping subscription`)
            return
        }
    } else {
        // No specific receivers - use the user limit to control access
        const currentSubscriptionCountUsingThisLicense = await prisma.subscription.count({
            where: {
                licence_genesis_hash: genesisHash
            }
        })

        if (licenceUserLimit !== 0 && currentSubscriptionCountUsingThisLicense >= licenceUserLimit) {
            Logger.info(`Licence user limit reached (${currentSubscriptionCountUsingThisLicense}/${licenceUserLimit}) for licence ${genesisHash}`)
            await createNotificationAndSendWebSocketNotification(
                'system',
                userAddress,
                `The Aquafier licence you received has reached its user limit (${licenceUserLimit}). Please contact the licence issuer for assistance.`
            )
            return
        }
    }

    // 5. Check if user already has a subscription from this same licence
    const existingLicenceSubscription = await prisma.subscription.findFirst({
        where: {
            user_address: userAddress,
            licence_genesis_hash: genesisHash
        }
    })

    if (existingLicenceSubscription) {
        Logger.info(`User ${userAddress} already has a subscription from licence ${genesisHash}`)
        return
    }

    // 6. Fetch the user's current active subscription to compare plans
    const currentActiveSubscription = await prisma.subscription.findFirst({
        where: {
            user_address: userAddress,
            status: 'ACTIVE'
        },
        include: {
            Plan: true
        },
        orderBy: { createdAt: 'desc' }
    })

    // 7. If user already has an active subscription, check if the incoming plan is better
    if (currentActiveSubscription && currentActiveSubscription.Plan) {
        const currentPlan = currentActiveSubscription.Plan
        // Compare using sort_order (higher = better), storage, files, contracts, templates
        const incomingIsBetter =
            incomingPlan.sort_order > currentPlan.sort_order ||
            incomingPlan.max_storage_gb > currentPlan.max_storage_gb ||
            incomingPlan.max_files > currentPlan.max_files ||
            incomingPlan.max_contracts > currentPlan.max_contracts ||
            incomingPlan.max_templates > currentPlan.max_templates

        if (!incomingIsBetter) {
            Logger.info(`User ${userAddress} already has an equal or better plan (${currentPlan.name}), skipping licence subscription`)
            return
        }

        // Cancel the current active subscription since the incoming one is better
        await prisma.subscription.updateMany({
            where: {
                user_address: userAddress,
                status: 'ACTIVE'
            },
            data: {
                status: 'CANCELED',
            }
        })

        Logger.info(`Canceled existing subscription for user ${userAddress} in favor of better licence plan ${incomingPlan.name}`)
    }

    // 8. Create the new subscription from the aquafier licence
    const now = new Date()
    const periodEnd = new Date(now.getTime() + durationDays * 24 * 60 * 60 * 1000)

    await prisma.subscription.create({
        data: {
            user_address: userAddress,
            plan_id: incomingPlan.id,
            status: 'ACTIVE',
            payment_method: 'AQUAFIER',
            billing_period: 'MONTHLY',
            licence_genesis_hash: genesisHash,
            current_period_start: now,
            current_period_end: periodEnd,
        }
    })

    Logger.info(`Subscription created from aquafier licence for user ${userAddress}, plan ${incomingPlan.name}, expires ${periodEnd.toISOString()}`)

    // 9. Generate and save invoice for the user
    try {
        const paymentsCount = await prisma.payment.count()
        const invoiceNumber = `INV-${paymentsCount + 1}`

        const invoiceData: InvoiceData = {
            invoiceNumber,
            date: new Date(),
            status: 'PAID',
            billingTo: {
                name: userAddress,
                address: 'Aquafier Instance',
            },
            billingFrom: {
                name: 'Inblock.io GmbH Assets',
                address: '456 Business Rd\nTech City',
                email: 'billing@inblockio.com',
                website: 'www.inblockio.com'
            },
            items: [
                { description: `${incomingPlan.display_name} (Aquafier Licence)`, quantity: 1, unitPrice: parseFloat(incomingPlan.price_monthly_usd?.toString() ?? "0.00"), amount: parseFloat(incomingPlan.price_monthly_usd?.toString() ?? "0.00") },
            ],
            subtotal: parseFloat(incomingPlan.price_monthly_usd?.toString() ?? "0.00"),
            total: parseFloat(incomingPlan.price_monthly_usd?.toString() ?? "0.00"),
            currency: 'USD',
            notes: 'Subscription activated via Aquafier Licence.'
        }

        const protocol = process.env.BACKEND_URL?.startsWith('https') ? 'https' : 'http'
        const url = `${protocol}://${getHost()}:${getPort()}`

        await InvoiceUtils.createAndSaveInvoice(
            invoiceData,
            userAddress,
            url,
            protocol,
            true
        )

        Logger.info(`Invoice ${invoiceNumber} generated for aquafier licence subscription for user ${userAddress}`)
    } catch (error: any) {
        Logger.error("Error generating invoice for aquafier licence subscription: ", error)
    }
}

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

    // check if aquafier_licence, then create a SUBSCRIPTION for the user
    const workFlow = isWorkFlowData(aquaTree, systemTemplateHashes)

    if(workFlow.isWorkFlow && workFlow.workFlow === "aquafier_licence.json"){
        await createSubscriptionFromAquafierLicence(aquaTree, userAddress)
    }

    // The last hash in the sorted array is the latest
    const latestHash = allHash[allHash.length - 1];
    const lastPubKeyHash = `${userAddress}_${latestHash}`;

    // All DB writes in one transaction
    await prisma.$transaction(async (tx) => {
        // Register the latest hash for the user
        await tx.latest.upsert({
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
                //is_workflow: isWorkFlow // todo confirm
            }
        });

        // Process each revision
        for (let i = 0; i < allHash.length; i++) {
            const revisionHash = allHash[i];
            const revisionData = aquaTreeWithOrderdRevision.revisions[revisionHash];
            const pubKeyHash = `${userAddress}_${revisionHash}`;
            const pubKeyPrevious = revisionData.previous_verification_hash.length > 0
                ? `${userAddress}_${revisionData.previous_verification_hash}`
                : "";

            const revisionChildren = []

            for (let a = i + 1; a < allHash.length; a++) {
                const childHash = allHash[a];
                const childData = aquaTreeWithOrderdRevision.revisions[childHash];
                if (childData.previous_verification_hash.includes(revisionHash)) {
                    const childPubKeyHash = `${userAddress}_${childHash}`;
                    revisionChildren.push(childPubKeyHash);
                }
            }

            // Insert/update revision in the database
            await tx.revision.upsert({
                where: { pubkey_hash: pubKeyHash },
                create: {
                    pubkey_hash: pubKeyHash,
                    file_hash: revisionData.file_hash,
                    nonce: revisionData.file_nonce ?? "",
                    shared: [],
                    previous: pubKeyPrevious,
                    children: revisionChildren,
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
                    children: {
                        push: revisionChildren
                    },
                    local_timestamp: revisionData.local_timestamp,
                    revision_type: revisionData.revision_type,
                    verification_leaves: revisionData.leaves ?? [],
                },
            });

            // Process revision based on type
            await processRevisionByType(revisionData, pubKeyHash, userAddress, aquaTreeWithOrderdRevision, tx);
        }
    });
}
