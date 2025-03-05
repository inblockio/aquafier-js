import { streamToBuffer } from '@/utils/file_utils.js';
import Aquafier, { AquaTree, FileObject, LogType } from 'aquafier-js-sdk';
import { FastifyInstance } from 'fastify';

export default async function filesController(fastify: FastifyInstance) {
    // get file using file hash
    fastify.get('/files/:fileHash', async (request, reply) => {
        const { fileHash } = request.params as { fileHash: string };
        console.log(`Received fileHash: ${fileHash}`);
        // file content from db
        // return as a blob

        return { success: true };
    });

    fastify.get('/file', async (request, reply) => {
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
                console.log("Hi...")
                const enableScalarField: any = data.fields.enableScalar;

                enableScalar = enableScalarField.value === 'true';
            }

            console.log(`hi 2 ${enableScalar}`)


            // Convert file stream to base64 string
            const fileBuffer = await streamToBuffer(data.file);
            const base64Content = fileBuffer.toString('base64');
            const utf8Content = fileBuffer.toString('utf-8');


            let fileObject: FileObject = {
                fileContent: utf8Content,
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