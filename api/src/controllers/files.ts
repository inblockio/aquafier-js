import { prisma } from '../database/db';
import { getFileUploadDirectory, isTextFile, isTextFileProbability, streamToBuffer } from '../utils/file_utils.js';
import Aquafier, { AquaTree, FileObject, LogType } from 'aqua-js-sdk';
import { FastifyInstance } from 'fastify';
import path from 'path';

import * as fs from "fs"
// import { getHost, getPort } from 'src/utils/api_utils';
// import { randomUUID } from 'crypto';

export default async function filesController(fastify: FastifyInstance) {
    // get file using file hash
    fastify.get('/files/:fileHash', async (request, reply) => {
        const { fileHash } = request.params as { fileHash: string };
        //  console.log(`Received fileHash: ${fileHash}`);
        // file content from db
        // return as a blob
        if (!fileHash || fileHash.trim() === '') {
            return reply.code(401).send({ error: ' Missing or empty file hash' });
        }

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

        let file = await prisma.file.findFirst({
            where: {
                file_hash: fileHash
            }
        })

        if (file == null) {
            return reply.code(500).send({ success: false, message: `Error file  not found ` });
        }

        let fileIndex = await prisma.fileIndex.findFirst({
            where: {
                file_hash: fileHash
            }
        })

        if (fileIndex == null) {
            return reply.code(500).send({ success: false, message: `Error file uri  not found ` });
        }


        // check ownership of the file 
        let revision = prisma.revision.findFirst({
            where: {
                OR: [
                    { pubkey_hash: file.file_hash }, // Check if the file's pubkey_hash matches the session's pubkey_hash
                    {
                        // Check if any of the fileIndex hashes are in the revision's pubkey_hash
                        pubkey_hash: {
                            in: fileIndex.pubkey_hash
                        }
                    }
                ]
            }
        })

        // If no matching revision is found, deny access
        if (!revision) {
            return reply.code(403).send({ success: false, message: "Access denied: You don't have permission to access this file" });
        }

        try {
            // Read the file
            let fileContent = fs.readFileSync(file.file_location!!);

            // Set appropriate headers based on file type
            const fileExt = path.extname(file.file_location ?? "").toLowerCase();
            if (fileExt === '.pdf') {
                reply.header('Content-Type', 'application/pdf');
            } else {
                reply.header('Content-Type', 'application/octet-stream');
            }

            // Encode the filename for Content-Disposition header
            const encodedFilename = encodeURIComponent(file.file_location ?? "")
                .replace(/['()]/g, escape) // handle special cases
                .replace(/\*/g, '%2A');

            // Set the Content-Disposition header with both encoded and UTF-8 filenames
            reply.header(
                'Content-Disposition',
                `attachment; filename="${encodedFilename}"; filename*=UTF-8''${encodedFilename}`
            );

            // Send the file content as a response
            return reply.send(fileContent);
        } catch (error) {
            console.error('Error reading file:', error);
            return reply.code(500).send({ success: false, message: 'Error reading file content' });
        }
    });

 

    fastify.post('/file/object', async (request, reply) => {
        let aquafier = new Aquafier();

        try {
            const data: any = request.body


            //  console.log(`--- data ${JSON.stringify(data, null, 4)}`)
            // Type assertion and validation
            const fileObject = data.fileObject as FileObject;

            if (fileObject == undefined) {
                return reply.code(400).send({ error: 'No file uploaded' });
            }
            if (fileObject.fileName == undefined || fileObject.fileContent == undefined) {
                return reply.code(400).send({ error: 'File name and content are required in file object' });
            }

            let isForm = true;
            if (data.isForm) {
                isForm = data.isForm as boolean;

            }
            let enableContent = false;
            if (data.enableContent) {
                enableContent = data.enableContent as boolean;

            }
            let enableScalar = false;
            if (data.enableScalar) {
                enableScalar = data.enableScalar as boolean;

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

            let resData: AquaTree = res.data.aquaTree!!;

            // Return success response
            return reply.code(200).send({
                aquaTree: resData,
            });
        } catch (error) {
            request.log.error(error);
            return reply.code(500).send({ error: 'File upload failed' });
        }

    });


    fastify.post('/file/upload', async (request, reply) => {

        //  console.log("Request body", request.body);
        //  console.log("Request files", request.files);

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
            let enableScalar = false;

            //  console.log("Data fields", data.fields);
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

            //  console.log("All data: ", data)

            // Convert file stream to base64 string
            const fileBuffer = await streamToBuffer(data.file);
            // const base64Content = fileBuffer.toString('base64');
            // const utf8Content = fileBuffer.toString('utf-8');

            let fileContent = fileBuffer.toString('utf-8');

            //  console.log(`utf8Content ${fileContent}`)
            //  console.log(`data.filename ${data.filename}`)
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

            let resData: AquaTree = res.data.aquaTree!!;

            // Return success response
            return reply.code(200).send({
                aquaTree: resData,
            });
        } catch (error) {
            request.log.error(error);
            return reply.code(500).send({ error: 'File upload failed' });
        }


    });
}