import { isTextFile, isTextFileProbability, streamToBuffer } from '@/utils/file_utils.js';
import Aquafier, { AquaTree, FileObject, LogType } from 'aqua-js-sdk';
import { FastifyInstance } from 'fastify';
import path from 'path';

export default async function filesController(fastify: FastifyInstance) {
    // get file using file hash
    fastify.get('/files/:fileHash', async (request, reply) => {
        const { fileHash } = request.params as { fileHash: string };
        console.log(`Received fileHash: ${fileHash}`);
        // file content from db
        // return as a blob

        return { success: true };
    });

    fastify.post('/file/object', async (request, reply) => {
        let aquafier = new Aquafier();

        try {
            const data: any = request.body


            console.log(`--- data ${JSON.stringify(data, null, 4)}`)
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



        return { success: true };
    });


    fastify.post('/file/upload', async (request, reply) => {

        console.log("Request body", request.body);
        console.log("Request files", request.files);

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

            console.log("Data fields", data.fields);
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

            console.log("All data: ", data)

            // Convert file stream to base64 string
            const fileBuffer = await streamToBuffer(data.file);
            // const base64Content = fileBuffer.toString('base64');
            // const utf8Content = fileBuffer.toString('utf-8');

            let fileContent = ""
            // Check if the file has an extension and if it's a text file
            if (path.extname(data.filename) && isTextFile(data.filename)) {
                // For text files, use UTF-8
                fileContent = fileBuffer.toString('utf-8');
                console.log(`UTF-8 content (first 100 chars): ${fileContent.substring(0, 100)}`);
            } else {
                let isFIleProbable = await isTextFileProbability(fileBuffer, data.filename);

                if (isFIleProbable) {
                    fileContent = fileBuffer.toString('utf-8');
                    console.log(`Without file extension UTF-8 content (first 100 chars): ${fileContent.substring(0, 100)}`);
                }

                // For binary files or files without extensions, use base64
                fileContent = fileBuffer.toString('base64');

                console.log(`Base64 encoded content (file size: ${fileBuffer.length} bytes)`);
            }

            console.log(`utf8Content ${fileContent}`)
            console.log(`data.filename ${data.filename}`)
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