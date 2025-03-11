import Aquafier, { AquaTree, FileObject, getHashSum, LogData, LogType, Revision } from 'aqua-js-sdk';
import { FastifyInstance } from 'fastify';
import { prisma } from '../database/db';
import { BusboyFileStream } from '@fastify/busboy';
import { isTextFile, isTextFileProbability, streamToBuffer } from '../utils/file_utils';
import path from 'path';
import { randomUUID } from 'crypto';
import util from 'util';
import { pipeline } from 'stream';
import * as fs from "fs"
import { error } from 'console';
import { findAquaTreeRevision } from '@/utils/revisions_utils';
import { fileURLToPath } from 'url';
import { FileIndex } from '@prisma/client';
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
                if (latestRevionData?.previous != null && latestRevionData?.previous?.length != 0) {
                    let aquaTreerevision = await findAquaTreeRevision(latestRevionData?.previous!!);
                    revisionData.push(...aquaTreerevision)
                }
            } catch (e: any) {
                return reply.code(500).send({ success: false, message: `Error fetching a revision ${JSON.stringify(error, null, 4)}` });
            }

            // file object 
            let lastRevision = revisionData[revisionData.length - 1];
            // let lastRevisionHash = lastRevision.pubkey_hash.split("_")[1];

            // files 

            let file = await prisma.file.findMany({
                where: {
                    hash: lastRevision.pubkey_hash
                }
            })


            let fileObject: FileObject[] = [];
            let fileIndexes: FileIndex[] = [];
            if (file != null) {
                console.log("#### file is not null ")

                for (let fileItem of file) {
                    console.log("=================================================")
                    console.log(`reading ${fileItem.content}`)
                    let fileContent = fs.readFileSync(fileItem.content!!);
                    // Extract just the original filename (without the UUID prefix)
                    const fullFilename = path.basename(fileItem.content!!) // Gets filename.ext from full path
                    const originalFilename = fullFilename.substring(fullFilename.indexOf('-') + 1) // Removes UUID-


                    console.log(`Original filename: ${originalFilename}`)



                    let fileIndex = await prisma.fileIndex.findFirst({
                        where: {
                            file_hash: fileItem.file_hash!!
                        }
                    })


                    if (fileIndex == null) {
                        return reply.code(500).send({ success: false, message: `Error file  ${originalFilename} not found in index` });
                    }

                    fileIndexes.push(fileIndex)

                    fileObject.push({
                        fileContent: fileContent.toString(),
                        fileName: fileIndex.uri!!,
                        path: ""
                    })

                }
            }



            // construct the return data
            let anAquaTree: AquaTree = {
                revisions: {},
                file_index: {}
            };

            for (let revisionItem of revisionData) {
                let hash = revisionItem.pubkey_hash.split("_")[1]
                let revisionWithData: Revision = {
                    revision_type: revisionItem.revision_type!! as "link" | "file" | "witness" | "signature" | "form",
                    previous_verification_hash: revisionItem.previous!!,
                    local_timestamp: revisionItem.local_timestamp!.toDateString(),
                    "version": "https://aqua-protocol.org/docs/v3/schema_2 | SHA256 | Method: scalar",
                }

                if (revisionItem.has_content) {
                    let fileItem = file.find((e) => e.hash == hash)
                    let fileContent = fs.readFileSync(fileItem?.content ?? "--error--");
                    revisionWithData["content"] = fileContent
                }


                // forms
                let fileFormData = await prisma.aquaForms.findMany({
                    where: {
                        hash: hash
                    }
                })

                if (fileFormData != null) {
                    for (let formItem of fileFormData) {
                        revisionWithData[formItem.key!!] = formItem.value
                    }
                }

                anAquaTree.revisions[hash] = revisionWithData;

                if (revisionItem.previous!!.length == 0) {
                    let name = fileIndexes.find((item) => item.hash.includes(hash))
                    anAquaTree.file_index[hash] = name?.uri ?? "--error--"
                }
            }


            displayData.push({

                aquaTree: anAquaTree,
                fileObject: fileObject
            })

        }
        return reply.code(200).send(displayData)
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


            // Convert file stream to base64 string
            // const fileBuffer = await streamToBuffer(data.file);
            // const base64Content = fileBuffer.toString('base64');

            // Convert file stream to base64 string
            const fileBuffer = await streamToBuffer(data.file);
            // const base64Content = fileBuffer.toString('base64');
            // const utf8Content = fileBuffer.toString('utf-8');

            let fileContent = fileBuffer.toString('utf-8');


            let fileObject: FileObject = {
                fileContent: fileContent,
                fileName: data.filename,
                path: "./",
            }
            let res = await aquafier.createGenesisRevision(
                fileObject,
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
                        previous: revisionData.previous_verification_hash || null,
                        // children: {},
                        local_timestamp: localTimestamp,
                        revision_type: revisionData.revision_type,
                        verification_leaves: revisionData.witness_merkle_proof || [],

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
                    // Get the equivalent of __dirname in ES modules
                    const __filename = fileURLToPath(import.meta.url);
                    const __dirname = path.dirname(__filename);

                    let firstRevisionHash = allHash[0]
                    const UPLOAD_DIR = process.env.UPLOAD_DIR || path.join(__dirname, '../media');
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


}

