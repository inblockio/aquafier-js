import { prisma } from '@/database/db';
import { FetchAquaTreeRequest, SaveRevision } from '@/models/request_models';
import { getHost, getPort } from '@/utils/api_utils';
import { FetchRevisionInfo, findAquaTreeRevision } from '@/utils/revisions_utils';
import { formatTimestamp } from '@/utils/time_utils';
import { AquaForms, FileIndex ,Signature, WitnessEvent } from '@prisma/client';
import { AquaTree,  FileObject, OrderRevisionInAquaTree, Revision } from 'aqua-js-sdk';
import { FastifyInstance } from 'fastify';
import * as fs from "fs"
import path from 'path';

export default async function revisionsController(fastify: FastifyInstance) {
    fastify.post('/tree', async (request, reply) => {

        const { latestRevisionHash } = request.body as FetchAquaTreeRequest;
        // fetch all from latetst

        let latestHashInDb = await prisma.latest.findFirst({
            where: {
                hash: latestRevisionHash
                // user: session.address
            }
        });

        if (latestHashInDb == null) {
            return reply.code(403).send({ message: "hash does not exist in latet revision", data: [] });
        }

        // traverse from the latest to the genesis of each 
        console.log(`data ${JSON.stringify(latestRevisionHash, null, 4)}`)


        let displayData: Array<{
            aquaTree: AquaTree,
            fileObject: FileObject[]
        }> = []

        // for (let revisonLatetsItem of latest) {

        // console.log(`Find ${JSON.stringify(revisonLatetsItem, null, 4)}.`)
        let revisionData = [];
        // fetch latest revision 
        let latestRevionData = await prisma.revision.findFirst({
            where: {
                pubkey_hash: latestRevisionHash, //`${session.address}_${}`
            }
        });

        if (latestRevionData == null) {
            return reply.code(500).send({ success: false, message: `revision with hash ${latestRevionData} not found in system` });
        }
        revisionData.push(latestRevionData);

        try {
            console.log(`previous ${latestRevionData?.previous}`)
            //if previosu verification hash is not empty find the previous one
            if (latestRevionData?.previous !== null && latestRevionData?.previous?.length !== 0) {
                let aquaTreerevision = await findAquaTreeRevision(latestRevionData?.previous!!);
                revisionData.push(...aquaTreerevision)
            }
        } catch (e: any) {
            return reply.code(500).send({ success: false, message: `Error fetching a revision ${JSON.stringify(e, null, 4)}` });
        }

        // file object 
        let lastRevision = revisionData[revisionData.length - 1];
        let lastRevisionHash = lastRevision.pubkey_hash.split("_")[1];

        // files 

        let files = await prisma.file.findMany({
            where: {
                hash: lastRevision.pubkey_hash
            }
        })


        let fileObject: FileObject[] = [];
        let fileIndexes: FileIndex[] = [];
        if (files != null) {
            console.log("#### file is not null ")

            for (let fileItem of files) {
                console.log("=================================================")
                console.log(`reading ${JSON.stringify(fileItem, null, 4)}`)
                // let fileContent = fs.readFileSync(fileItem.content!!);

                const stats = fs.statSync(fileItem.content!!);
                const fileSizeInBytes = stats.size;
                console.log(`File size: ${fileSizeInBytes} bytes`);

                // Extract just the original filename (without the UUID prefix)
                const fullFilename = path.basename(fileItem.content!!) // Gets filename.ext from full path
                const originalFilename = fullFilename.substring(fullFilename.indexOf('-') + 1) // Removes UUID-
                console.log(`Original filename: ${originalFilename}`)



                let fileIndex = await prisma.fileIndex.findFirst({
                    where: {
                        file_hash: fileItem.file_hash!!
                    }
                })

                console.log("File index: ", fileIndex)


                if (fileIndex == null) {
                    return reply.code(500).send({ success: false, message: `Error file  ${originalFilename} not found in index` });
                }

                // Convert hash from string[] to string if needed
                // const convertedFileIndex: FileIndex = {
                //     ...fileIndex,
                //     "uri" : fileIndex.uri?.toString() ?? "",
                //     "reference_count" : fileIndex.reference_count?.toString() ?? "0",
                //     hash: Array.isArray(fileIndex.hash) ? fileIndex.hash.join(',') : fileIndex.hash
                // };


                fileIndexes.push(fileIndex)


                if (!fs.existsSync(fileItem.content!!)) {
                    return reply.code(500).send({ success: false, message: `Error file  ${originalFilename} not found` });

                }

                // Get the host from the request headers
                const host = request.headers.host || `${getHost()}:${getPort()}`;

                // Get the protocol (http or https)
                const protocol = request.protocol || 'https'

                // Path you want to add
                const urlPath = `/files/${fileItem.file_hash}`;

                // Construct the full URL
                const fullUrl = `${protocol}://${host}${urlPath}`;
                fileObject.push({
                    fileContent: fullUrl,//fileContent.toString(),
                    fileName: fileIndex.uri!!,
                    path: "",
                    fileSize: fileSizeInBytes
                })

            }
        }

        console.log(`File indexes for hash: ${lastRevisionHash}\n${JSON.stringify(fileIndexes, null, 4)}`)



        // construct the return data
        let anAquaTree: AquaTree = {
            revisions: {},
            file_index: {}
        };

        for (let revisionItem of revisionData) {
            let hashOnly = revisionItem.pubkey_hash.split("_")[1]
            let previousHashOnly = revisionItem.previous === null ? "" : revisionItem.previous.split("_")[1]
            let revisionWithData: Revision = {
                revision_type: revisionItem.revision_type!! as "link" | "file" | "witness" | "signature" | "form",
                previous_verification_hash: previousHashOnly,
                local_timestamp: revisionItem.local_timestamp!.toDateString(),
                file_nonce: revisionItem.nonce ?? "--error--",
                "version": "https://aqua-protocol.org/docs/v3/schema_2 | SHA256 | Method: scalar",
            }

            if (revisionItem.has_content) {
                let fileItem = files.find((e) => e.hash == revisionItem.pubkey_hash)
                let fileContent = fs.readFileSync(fileItem?.content ?? "--error--", 'utf8');
                revisionWithData["content"] = fileContent
            }

            if (revisionItem.revision_type != "file") {

                let revisionInfoData = await FetchRevisionInfo(revisionItem.pubkey_hash, revisionItem)

                if (revisionInfoData == null) {
                    return reply.code(500).send({ success: false, message: `Error revision not found` });

                }

                if (revisionItem.revision_type == "form") {

                    let fileFormData = revisionInfoData as AquaForms[];
                    for (let formItem of fileFormData) {
                        revisionWithData[formItem.key!!] = formItem.value
                    }

                } else if (revisionItem.revision_type == "witness") {
                    let witnessData = revisionInfoData as WitnessEvent;
                    revisionWithData.witness_merkle_root = witnessData.Witness_merkle_root;
                    revisionWithData.witness_timestamp = witnessData.Witness_timestamp!.getTime();
                    revisionWithData.witness_network = witnessData.Witness_network!;
                    revisionWithData.witness_smart_contract_address = witnessData.Witness_smart_contract_address!;
                    revisionWithData.witness_transaction_hash = witnessData.Witness_transaction_hash!;
                    revisionWithData.witness_sender_account_address = witnessData.Witness_sender_account_address!;
                    revisionWithData.witness_merkle_proof = [];// todo fix me from db 


                } else if (revisionItem.revision_type == "signature") {
                    let signatureData = revisionInfoData as Signature;
                    let sig: string | Object = signatureData.signature_digest!
                    try {
                        if (signatureData.signature_type?.includes("did")) {
                            sig = JSON.parse(signatureData.signature_digest!)
                        }
                    } catch (error) {
                        console.log(`Error fix me ${error} `)
                    }
                    revisionWithData.signature = sig;

                    revisionWithData.signature_public_key = signatureData.signature_public_key!;
                    revisionWithData.signature_wallet_address = signatureData.signature_wallet_address!;
                    revisionWithData.signature_type = signatureData.signature_type!;

                } else {
                    return reply.code(500).send({ success: false, message: `implment for revisionItem.revision_type  ` });
                }
            }

            // update file index for genesis revision 
            if (previousHashOnly == null || previousHashOnly.length == 0) {
                console.log("****************************************************************")
                console.log(`fileIndexes ${JSON.stringify(fileIndexes)} -- hash ${revisionItem.pubkey_hash}`)
                let name = fileIndexes.find((item) => {
                    // return item.hash.includes(revisionItem.pubkey_hash) || item.hash.map((item) => item.includes(hashOnly)).length > 0

                    // Check if the full pubkey_hash is in the array
                    if (item.hash.includes(revisionItem.pubkey_hash)) {
                        return true;
                    }

                    // Check if any hash in the array contains the hashOnly part
                    return item.hash.some((hashItem: string) => hashItem.includes(hashOnly));
                })
                console.log(`----------  name ${JSON.stringify(name, null, 4)}`)
                anAquaTree.file_index[hashOnly] = name?.uri ?? "--error--."
                revisionWithData["file_hash"] = name?.file_hash ?? "--error--"


            }


            anAquaTree.revisions[hashOnly] = revisionWithData;
        }



        console.log(`----> ${JSON.stringify(anAquaTree, null, 4)}`)
        let sortedAquaTree = OrderRevisionInAquaTree(anAquaTree)
        displayData.push({

            aquaTree: sortedAquaTree,
            fileObject: fileObject
        })

        // }
        return reply.code(200).send({ data: displayData })

    });
    fastify.post('/tree', async (request, reply) => {
        try {
            // Read `nonce` from headers
            const nonce = request.headers['nonce']; // Headers are case-insensitive

            // Check if `nonce` is missing or empty
            if (!nonce || typeof nonce !== 'string' || nonce.trim() === '') {
                return reply.code(401).send({ error: 'Unauthorized: Missing or empty nonce header' });
            }

            const session = await prisma.siweSession.findUnique({
                where: { nonce }
            });

            if (!session) {
                return reply.code(403).send({ success: false, message: "Nounce  is invalid" });
            }



            const revisionData = request.body as SaveRevision

            if (!revisionData.revision) {
                return reply.code(400).send({ success: false, message: "revision Data is required" });
            }
            if (!revisionData.revisionHash) {
                return reply.code(400).send({ success: false, message: "revision hash is required" });
            }

            if (!revisionData.revision.revision_type) {
                return reply.code(400).send({ success: false, message: "revision type is required" });
            }

            if (!revisionData.revision.local_timestamp) {
                return reply.code(400).send({ success: false, message: "revision timestamp is required" });
            }

            if (!revisionData.revision.previous_verification_hash) {
                return reply.code(400).send({ success: false, message: "previous revision hash  is required" });
            }



            let oldFilePubKeyHash = `${session.address}_${revisionData.revision.previous_verification_hash}`


            let existData = await prisma.latest.findFirst({
                where: {
                    hash: oldFilePubKeyHash
                }
            });

            if (existData == null) {
                return reply.code(401).send({ success: false, message: "previous  hash  not found" });

            }

            let filePubKeyHash = `${session.address}_${revisionData.revisionHash}`


            await prisma.latest.update({
                where: {
                    hash: oldFilePubKeyHash
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
                return reply.code(409).send({ success: false, message: "Revision with this hash already exists" });
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
                    previous: `${session.address}_${revisionData.revision.previous_verification_hash}`,
                    // children: {},
                    local_timestamp: formatTimestamp(revisionData.revision.local_timestamp), // revisionData.revision.local_timestamp,
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


                //todo consult dalmas if signature_public_key needs tobe stored
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
                        signature_wallet_address: revisionData.revision.signature.wallet_address,
                        signature_type: revisionData.revision.signature_type,
                        signature_public_key: revisionData.revision.signature_public_key,
                        reference_count: 1
                    }
                });

            }


            if (revisionData.revision.revision_type == "witness") {

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

                const witnessTimestamp = new Date(revisionData.revision.witness_timestamp!);
                await prisma.witnessEvent.create({
                    data: {
                        Witness_merkle_root: revisionData.revision.witness_merkle_root!,
                        Witness_timestamp: witnessTimestamp,
                        Witness_network: revisionData.revision.witness_network,
                        Witness_smart_contract_address: revisionData.revision.witness_smart_contract_address,
                        Witness_transaction_hash: revisionData.revision.witness_transaction_hash,
                        Witness_sender_account_address: revisionData.revision.witness_sender_account_address

                    }
                });
            }



            if (revisionData.revision.revision_type == "link" || revisionData.revision.revision_type == "file") {

                return reply.code(500).send({
                    message: "not implemented",
                });
            }

            return reply.code(200).send({
                success: true,
                message: "Revisions stored successfully",

            });

        } catch (error) {
            request.log.error(error);
            return reply.code(500).send({ error: "Failed to process revisions" });
        }
    });
}
