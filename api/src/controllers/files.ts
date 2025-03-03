import { FastifyInstance } from 'fastify';
import { SiweMessage } from 'siwe';
import fastifyMultipart, { Multipart } from '@fastify/multipart';

export default async function filesController(fastify: FastifyInstance) {
    // get file using file hash
    fastify.get('/files/:fileHash', async (request, reply) => {
        const { fileHash } = request.params as { fileHash: string };
        console.log(`Received fileHash: ${fileHash}`);
        return { success: true };
    });

    fastify.get('/file', async (request, reply) => {
        return { success: true };
    });


    fastify.post('/file/upload', async (request, reply) => {

        console.log("Request body", request.body);
        console.log("Request files", request.files);

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

            // Process file
            // ... your file processing logic here ...

            // Return success response
            return reply.code(200).send({
                success: true,
                filename: data.filename,
                mimetype: data.mimetype,
                isForm,
                enableContent,
                fileSize: data.file.bytesRead
            });
        } catch (error) {
            request.log.error(error);
            return reply.code(500).send({ error: 'File upload failed' });
        }


    });
}