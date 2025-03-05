import Aquafier, { AquaTree, FileObject, getHashSum, LogData, LogType, Revision } from 'aquafier-js-sdk';
import { FastifyInstance } from 'fastify';
import { prisma } from '../database/db';
import { BusboyFileStream } from '@fastify/busboy';
import { streamToBuffer } from '../utils/file_utils';

export default async function explorerController(fastify: FastifyInstance) {
    // get file using file hash
    fastify.get('/explorer_files', async (request, reply) => {
        const { fileHash } = request.params as { fileHash: string };
        console.log(`Received fileHash: ${fileHash}`);
        // file content from db
        // return as a blob

        return { success: true };
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
            const fileBuffer = await streamToBuffer(data.file);
            const base64Content = fileBuffer.toString('base64');


            // fetch wallet address using nonce provided on sign in 


            let fileObject: FileObject = {
                fileContent: base64Content,
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

                // Insert new revision into the database
                const revisionResult = await prisma.revision.create({
                    data: {
                        hash: allHash[0],
                        user: session.address, // Replace with actual user identifier (e.g., request.user.id)
                        nonce: revisionData.file_nonce || "",
                        shared: [],
                        contract: revisionData.witness_smart_contract_address
                            ? [{ address: revisionData.witness_smart_contract_address }]
                            : [],
                        previous: revisionData.previous_verification_hash || null,
                        children: {},
                        localTimestamp: localTimestamp,
                        revisionType: revisionData.revision_type,
                        verificationLeaves: revisionData.witness_merkle_proof || [],
                        Latest: {
                            create: {
                                hash: allHash[0],
                                user: session.address,

                            }
                        },

                    },
                });

                // Check if file already exists in the database
                let existingFile = await prisma.file.findFirst({
                    where: { fileHash: fileHash },
                });

                let fileId: number = 0;

                if (existingFile) {
                    // File exists: Increase reference count
                    await prisma.file.update({
                        where: { hash: existingFile.hash },
                        data: { referenceCount: existingFile.referenceCount + 1 },
                    });
                    fileId = existingFile.id
                } else {
                    // File does not exist: Insert a new file record
                    let createResult = await prisma.file.create({
                        data: {
                            hash: allHash[0],
                            content: base64Content,
                            fileHash: fileHash,
                            referenceCount: 1, // First reference
                            // revisionRef: { connect: { hash: allHash[0] } },
                        },
                    });
                    fileId = createResult.id
                }

                let createResult = await prisma.fileNames.create({
                    data: {
                        name: data.filename,
                        fileId: fileId,
                    },
                });


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

