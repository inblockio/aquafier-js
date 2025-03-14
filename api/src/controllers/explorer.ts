import Aquafier, { AquaTree, FileObject, getHashSum, LogData, LogType, OrderRevisionInAquaTree, Revision } from 'aqua-js-sdk';
import { FastifyInstance } from 'fastify';
import { prisma } from '../database/db';
import { BusboyFileStream } from '@fastify/busboy';
import { getFileUploadDirectory, isTextFile, isTextFileProbability, streamToBuffer } from '../utils/file_utils';
import path from 'path';

import { randomUUID } from 'crypto';
import util from 'util';
import { pipeline } from 'stream';
import * as fs from "fs"
import { error } from 'console';
import { FetchRevisionInfo, findAquaTreeRevision } from '@/utils/revisions_utils';
import { fileURLToPath } from 'url';
import { AquaForms, FileIndex, Signature, Witness, WitnessEvent } from '@prisma/client';
import { getHost, getPort } from '@/utils/api_utils';
import { DeleteRevision } from '@/models/request_models';
// Promisify pipeline
const pump = util.promisify(pipeline);

export default async function explorerController(fastify: FastifyInstance) {
    // get file using file hash
    fastify.get('/explorer_files', async (request, reply) => {
        // const { fileHash } = request.params as { fileHash: string };
        // console.log(`Received fileHash: ${fileHash}`);
        // file content from db
        // return as a blob

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


        // fetch all from latetst

        let latest = await prisma.latest.findMany({
            where: {
                user: session.address
            }
        });

        if (latest.length == 0) {
            return reply.code(200).send({ data: [] });
        }

        // traverse from the latest to the genesis of each 
        console.log(`data ${JSON.stringify(latest, null, 4)}`)


        let displayData: Array<{
            aquaTree: AquaTree,
            fileObject: FileObject[]
        }> = []

        for (let revisonLatetsItem of latest) {

            console.log(`Find ${JSON.stringify(revisonLatetsItem, null, 4)}.`)
            let revisionData = [];
            // fetch latest revision 
            let latestRevionData = await prisma.revision.findFirst({
                where: {
                    pubkey_hash: revisonLatetsItem.hash, //`${session.address}_${}`
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
                return reply.code(500).send({ success: false, message: `Error fetching a revision ${JSON.stringify(error, null, 4)}` });
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
                let revisionWithData: Revision = {
                    revision_type: revisionItem.revision_type!! as "link" | "file" | "witness" | "signature" | "form",
                    previous_verification_hash: revisionItem.previous == null ? "" : revisionItem.previous,
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
                if (revisionItem.previous == null || revisionItem.previous.length == 0) {
                    console.log("****************************************************************")
                    console.log(`fileIndexes ${JSON.stringify(fileIndexes)} -- hash ${revisionItem.pubkey_hash}`)
                    let name = fileIndexes.find((item) => {
                        // return item.hash.includes(revisionItem.pubkey_hash) || item.hash.map((item) => item.includes(hashOnly)).length > 0

                        // Check if the full pubkey_hash is in the array
                        if (item.hash.includes(revisionItem.pubkey_hash)) {
                            return true;
                        }

                        // Check if any hash in the array contains the hashOnly part
                        return item.hash.some(hashItem => hashItem.includes(hashOnly));
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

        }
        return reply.code(200).send({ data: displayData })
    });


    fastify.post('/explorer_files', async (request, reply) => {

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


        let aquafier = new Aquafier();



        // Check if the request is multipart
        const isMultipart = request.isMultipart();

        if (!isMultipart) {
            return reply.code(400).send({ error: 'Expected multipart form data' });
        }

        try {
            // Process the multipart data
            const data = await request.file();

            if (data == undefined || data.file === undefined) {
                return reply.code(400).send({ error: 'No file uploaded' });
            }
            // Verify file size (20MB = 20 * 1024 * 1024 bytes)
            const maxFileSize = 20 * 1024 * 1024;
            if (data.file.bytesRead > maxFileSize) {
                return reply.code(413).send({ error: 'File too large. Maximum file size is 20MB' });
            }

            // Extract form fields with default values
            // Properly handle the MultipartFields type
            let isForm = false;
            let enableContent = false;
            let enableScalar = true;

            if (data.fields.isForm) {
                // Handle form fields correctly based on the actual API
                const isFormField: any = data.fields.isForm;

                // If it's a single field
                isForm = isFormField.value === 'true';

            }

            // Same for enableContent
            if (data.fields.enableContent) {
                const enableContentField: any = data.fields.enableContent;

                enableContent = enableContentField.value === 'true';
            }

            // Same for enableContent
            if (data.fields.enableScalar) {
                const enableScalarField: any = data.fields.enableScalar;

                enableScalar = enableScalarField.value === 'true';
            }


            const fileBuffer = await streamToBuffer(data.file);
            let fileContent = fileBuffer.toString('utf-8');

            let fileObjectPar: FileObject = {
                fileContent: fileContent,
                fileName: data.filename,
                path: "./",
            }

            // Get the host from the request headers
            const host = request.headers.host || `${getHost()}:${getPort()}`;

            // Get the protocol (http or https)
            const protocol = request.protocol || 'https'


            let res = await aquafier.createGenesisRevision(
                fileObjectPar,
                isForm,
                enableContent,
                enableScalar
            )

            if (res.isErr()) {

                res.data.push({
                    log: `Error creating genesis revision`,
                    logType: LogType.ERROR
                })
                return reply.code(500).send({
                    logs: res.data
                })

            }


            // let fileHash = getHashSum(data.file)
            let resData: AquaTree = res.data.aquaTree!!;
            let allHash: string[] = Object.keys(resData.revisions);

            let revisionData: Revision = resData.revisions[allHash[0]];
            let fileHash = revisionData.file_hash; // Extract file hash


            if (!fileHash) {
                return reply.code(500).send({ error: "File hash missing from AquaTree response" });
            }

            const urlPath = `/files/${fileHash}`;
            // Construct the full URL
            const fullUrl = `${protocol}://${host}${urlPath}`;
            let fileObject: FileObject = {
                fileContent: fullUrl, // fileContent,
                fileName: data.filename,
                path: "./",
            }

            try {

                // Parse the timestamp string into a valid Date object
                const localTimestamp = new Date(
                    Date.UTC(
                        parseInt(revisionData.local_timestamp.slice(0, 4)),   // Year
                        parseInt(revisionData.local_timestamp.slice(4, 6)) - 1,  // Month (0-indexed)
                        parseInt(revisionData.local_timestamp.slice(6, 8)),   // Day
                        parseInt(revisionData.local_timestamp.slice(8, 10)),  // Hours
                        parseInt(revisionData.local_timestamp.slice(10, 12)), // Minutes
                        parseInt(revisionData.local_timestamp.slice(12, 14))  // Seconds
                    )
                );

                let filepubkeyhash = `${session.address}_${allHash[0]}`

                await prisma.latest.create({
                    data: {
                        hash: filepubkeyhash,
                        user: session.address,
                    }
                });

                // Insert new revision into the database
                await prisma.revision.create({
                    data: {
                        pubkey_hash: filepubkeyhash,
                        // user: session.address, // Replace with actual user identifier (e.g., request.user.id)
                        nonce: revisionData.file_nonce || "",
                        shared: [],
                        // contract: revisionData.witness_smart_contract_address
                        //     ? [{ address: revisionData.witness_smart_contract_address }]
                        //     : [],
                        previous: revisionData.previous_verification_hash || "",
                        // children: {},
                        local_timestamp: localTimestamp,
                        revision_type: revisionData.revision_type,
                        verification_leaves: revisionData.leaves || [],

                    },
                });

                // if is form add the form elements 
                if (isForm) {
                    let revisioValue = Object.keys(revisionData);
                    for (let formItem in revisioValue) {
                        if (formItem.startsWith("form_")) {
                            await prisma.aquaForms.create({
                                data: {
                                    hash: filepubkeyhash,
                                    key: formItem,
                                    value: revisioValue[formItem],
                                    type: typeof revisioValue[formItem]
                                }
                            });
                        }
                    }
                }


                // Check if file already exists in the database
                let existingFile = await prisma.file.findFirst({
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
                } else {


                    let firstRevisionHash = allHash[0]
                    const UPLOAD_DIR = getFileUploadDirectory();
                    // Create unique filename
                    const filename = `${randomUUID()}-${data.filename}`;
                    const filePath = path.join(UPLOAD_DIR, filename);

                    // Save the file
                    // await pump(data.file, fs.createWriteStream(filePath))
                    await fs.promises.writeFile(filePath, fileBuffer);

                    let fileCreation = await prisma.file.create({
                        data: {
                            hash: filepubkeyhash,
                            file_hash: fileHash,
                            content: filePath,
                            reference_count: 1,
                        }
                    })

                    console.log(JSON.stringify(fileCreation, null, 4))
                    console.error("====We are through here: ", fileCreation.hash)

                    await prisma.fileIndex.create({
                        data: {
                            id: fileCreation.hash,
                            hash: [filepubkeyhash],
                            file_hash: fileHash,
                            uri: data.filename,
                            reference_count: 1
                        }
                    })
                    console.log("Saved successfully")
                }

            } catch (error) {
                console.log("======================================")
                console.log(`error ${error}`)
                let logs: LogData[] = []
                logs.push({
                    log: `Error saving genesis revision`,
                    logType: LogType.ERROR
                })

                return reply.code(500).send({
                    data: res.data
                })

            }

            // Return success response
            return reply.code(200).send({
                aquaTree: resData,
                fileObject: fileObject
            });
        } catch (error) {
            request.log.error(error);
            return reply.code(500).send({ error: 'File upload failed' });
        }

    });


    fastify.post('/explorer_delete_file', async (request, reply) => {
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
            return reply.code(403).send({ success: false, message: "Nonce is invalid" });
        }

        const revisionDataPar = request.body as DeleteRevision;

        if (!revisionDataPar.revisionHash) {
            return reply.code(400).send({ success: false, message: "revision hash is required" });
        }

        let filepubkeyhash = `${session.address}_${revisionDataPar.revisionHash}`;

        //fetch all the revisions 
        let revisionData = [];
        // fetch latest revision 
        let latestRevionData = await prisma.revision.findFirst({
            where: {
                pubkey_hash: filepubkeyhash
            }
        });

        if (latestRevionData == null) {
            return reply.code(500).send({ success: false, message: `revision with hash ${revisionDataPar.revisionHash} not found in system` });
        }
        revisionData.push(latestRevionData);


        try {
            console.log(`previous ${latestRevionData?.previous}`);
            //if previous verification hash is not empty find the previous one
            if (latestRevionData?.previous !== null && latestRevionData?.previous?.length !== 0) {
                let aquaTreerevision = await findAquaTreeRevision(latestRevionData?.previous!!);
                revisionData.push(...aquaTreerevision);
            }
        } catch (e: any) {
            return reply.code(500).send({ success: false, message: `Error fetching a revision ${JSON.stringify(e, null, 4)}` });
        }

        try {
            // Use Prisma transaction to ensure all or nothing execution
            await prisma.$transaction(async (tx) => {
                // Step 1: Handle file references and file index first
                for (let item of revisionData) {
                    if (item.previous == "" || item.previous == null || item.previous.trim().length == 0) {
                        let filesData = await tx.file.findFirst({
                            where: {
                                hash: item.pubkey_hash
                            }
                        });

                        if (filesData != null) {
                            // Handle file index references first
                            const fileIndexData = await tx.fileIndex.findFirst({
                                where: {
                                    hash: {
                                        has: item.pubkey_hash
                                    }
                                }
                            });

                            if (fileIndexData != null) {
                                if (fileIndexData.reference_count ?? 0 <= 1) {
                                    await tx.fileIndex.delete({
                                        where: {
                                            id: fileIndexData.id
                                        }
                                    });
                                } else {
                                    await tx.fileIndex.update({
                                        where: {
                                            id: fileIndexData.id
                                        },
                                        data: {
                                            hash: fileIndexData.hash.filter((item2) => item2 != item.pubkey_hash),
                                            reference_count: fileIndexData.reference_count! - 1
                                        }
                                    });
                                }
                            }

                            // Update the file reference count
                            if (filesData.reference_count ?? 0 <= 0) {
                                if (filesData.content != null) {
                                    try {
                                        // Note: File system operations are outside the transaction
                                        // and will not be rolled back if transaction fails
                                        fs.unlinkSync(filesData.content);
                                    } catch (er) {
                                        console.log("Error deleting file from filesystem:", er);
                                        // Continue even if file deletion fails
                                    }
                                }

                                await tx.file.delete({
                                    where: {
                                        hash: item.pubkey_hash
                                    }
                                });
                            } else {
                                await tx.file.update({
                                    where: {
                                        hash: item.pubkey_hash
                                    },
                                    data: {
                                        reference_count: filesData.reference_count! - 1
                                    }
                                });
                            }
                        }
                    }
                }

                // Step 2: Find any references to these revisions in other tables and handle them
                // This is to fix the circular dependency between revision and latest

                // First, find any revisions that reference our revisions
                const revisionPubkeyHashes = revisionData.map(rev => rev.pubkey_hash);

                // Remove any references to our revisions from other tables
                // We need to update any tables that might have foreign keys to our revisions

                // For example, update other revisions that might reference these ones
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

                // Step 3: Delete the latest entry - we need to do this before deleting revisions
                try {
                    await tx.latest.deleteMany({
                        where: {
                            hash: {
                                in: revisionPubkeyHashes
                            }
                        }
                    });
                } catch (e) {
                    console.log("Warning: Error in deleting latest entries:", e);
                    // We'll continue, as the transaction will roll back if it fails
                }

                // Step 4: Now we can safely delete all revisions
                for (let item of revisionData) {
                    await tx.revision.delete({
                        where: {
                            pubkey_hash: item.pubkey_hash
                        }
                    });
                    console.log(`Deleted revision with pubkey_hash: ${item.pubkey_hash}`);
                }
            });

            return reply.code(200).send({ success: true, message: "File and revisions deleted successfully" });
        } catch (error: any) {
            console.error("Error in delete operation:", error);
            return reply.code(500).send({
                success: false,
                message: `Error deleting file: ${error.message}`,
                details: error
            });
        }
    });


    // fastify.post('/explorer_delete_file', async (request, reply) => {
    //     // Read `nonce` from headers
    //     const nonce = request.headers['nonce']; // Headers are case-insensitive

    //     // Check if `nonce` is missing or empty
    //     if (!nonce || typeof nonce !== 'string' || nonce.trim() === '') {
    //         return reply.code(401).send({ error: 'Unauthorized: Missing or empty nonce header' });
    //     }

    //     const session = await prisma.siweSession.findUnique({
    //         where: { nonce }
    //     });

    //     if (!session) {
    //         return reply.code(403).send({ success: false, message: "Nounce is invalid" });
    //     }

    //     const revisionDataPar = request.body as DeleteRevision;

    //     if (!revisionDataPar.revisionHash) {
    //         return reply.code(400).send({ success: false, message: "revision hash is required" });
    //     }

    //     let filepubkeyhash = `${session.address}_${revisionDataPar.revisionHash}`;

    //     //fetch all the revisions 
    //     let revisionData = [];
    //     // fetch latest revision 
    //     let latestRevionData = await prisma.revision.findFirst({
    //         where: {
    //             pubkey_hash: filepubkeyhash
    //         }
    //     });

    //     if (latestRevionData == null) {
    //         return reply.code(500).send({ success: false, message: `revision with hash ${revisionDataPar.revisionHash} not found in system` });
    //     }
    //     revisionData.push(latestRevionData);

    //     try {
    //         console.log(`previous ${latestRevionData?.previous}`);
    //         //if previous verification hash is not empty find the previous one
    //         if (latestRevionData?.previous !== null && latestRevionData?.previous?.length !== 0) {
    //             let aquaTreerevision = await findAquaTreeRevision(latestRevionData?.previous!!);
    //             revisionData.push(...aquaTreerevision);
    //         }
    //     } catch (e: any) {
    //         return reply.code(500).send({ success: false, message: `Error fetching a revision ${JSON.stringify(e, null, 4)}` });
    //     }

    //     try {
    //         // First, handle the file references and delete related file entries
    //         for (let item of revisionData) {
    //             if (item.previous == "" || item.previous == null || item.previous.trim().length == 0) {
    //                 let filesData = await prisma.file.findFirst({
    //                     where: {
    //                         hash: item.pubkey_hash
    //                     }
    //                 });

    //                 if (filesData != null) {
    //                     // Handle file index references first
    //                     const fileIndexData = await prisma.fileIndex.findFirst({
    //                         where: {
    //                             hash: {
    //                                 has: item.pubkey_hash
    //                             }
    //                         }
    //                     });

    //                     if (fileIndexData != null) {
    //                         if (fileIndexData.reference_count ?? 0  <= 1) {
    //                             await prisma.fileIndex.delete({
    //                                 where: {
    //                                     id: fileIndexData.id
    //                                 }
    //                             });
    //                         } else {
    //                             await prisma.fileIndex.update({
    //                                 where: {
    //                                     id: fileIndexData.id
    //                                 },
    //                                 data: {
    //                                     hash: fileIndexData.hash.filter((item2) => item2 != item.pubkey_hash),
    //                                     reference_count: fileIndexData.reference_count! - 1
    //                                 }
    //                             });
    //                         }
    //                     }

    //                     // Now handle the file
    //                     if (filesData.reference_count ?? 0 <= 0) {
    //                         if (filesData.content != null) {
    //                             try {
    //                                 // delete the file from filesystem
    //                                 fs.unlinkSync(filesData.content);
    //                             } catch (er) {
    //                                 console.log("##########################################");
    //                                 console.log(er);
    //                             }
    //                         }

    //                         await prisma.file.delete({
    //                             where: {
    //                                 hash: item.pubkey_hash
    //                             }
    //                         });
    //                     } else {
    //                         await prisma.file.update({
    //                             where: {
    //                                 hash: item.pubkey_hash
    //                             },
    //                             data: {
    //                                 reference_count: filesData.reference_count! - 1
    //                             }
    //                         });
    //                     }
    //                 }
    //             }
    //         }

    //         // Delete the "latest" entry before attempting to delete revisions
    //         try {
    //             await prisma.latest.delete({
    //                 where: {
    //                     hash: filepubkeyhash
    //                 }
    //             });
    //         } catch (e) {
    //             console.log("Error deleting latest entry:", e);
    //             // Continue with the process even if this fails
    //         }

    //         // Now that we've handled all the dependencies, delete the revisions
    //         for (let item of revisionData) {
    //             await prisma.revision.delete({
    //                 where: {
    //                     pubkey_hash: item.pubkey_hash
    //                 }
    //             });
    //             console.log(`Deleted revision with pubkey_hash: ${item.pubkey_hash}`);
    //         }

    //         return reply.code(200).send({ success: true, message: "File and revisions deleted successfully" });
    //     } catch (error: any) {
    //         console.error("Error in delete operation:", error);
    //         return reply.code(500).send({
    //             success: false,
    //             message: `Error deleting file: ${error.message}`,
    //             details: error
    //         });
    //     }
    // });

}

