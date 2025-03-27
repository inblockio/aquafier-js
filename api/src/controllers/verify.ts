

import { streamToBuffer } from "../utils/file_utils";
import Aquafier, { AquaTree, FileObject, LogData, LogType, Revision } from "aqua-js-sdk";
import { FastifyInstance } from "fastify";

export default async function verifyController(fastify: FastifyInstance) {

    //Creates a new revision, validated against aqua-verifier-js-lib verifier.
    fastify.post('/verify', async (request, reply) => {

        try {
            const data: any = request.body

            // Type assertion and validation
            const aquaTree = data.aquaTree as AquaTree;
            const revision = data.revision as Revision;
            const revisionHash = data.revision_hash as string;
            let fileObjects: Array<FileObject> = []

            if (data.fileObjects) {
                fileObjects = data.fileObjects as Array<FileObject>
            }

            const aquafier = new Aquafier();

            let res = await aquafier.verifyAquaTreeRevision(aquaTree, revision, revisionHash, fileObjects)

            if (res.isOk()) {
                return reply.code(200).send({
                    data: res.data
                });

            } else {

                return reply.code(417).send({
                    data: res.data
                });
            }


        } catch (error) {
            request.log.error(error);
            return reply.code(500).send({
                error: 'Error processing AquaTree',
                details: error instanceof Error ? error.message : 'Unknown error'
            });
        }


    });

    fastify.post('/verify/file', async (request, reply) => {
        let aquafier = new Aquafier();

        try {
            const parts = request.parts();
            let aquaFileContent = null;
            let files = [];

            for await (const part of parts) {
                if (part.type === 'file') {
                    const buffer = await streamToBuffer(part.file);

                    if (part.fieldname === 'aqua_file') {
                        aquaFileContent = buffer.toString('utf-8');
                    } else {
                        // Store other files
                        files.push({
                            fieldname: part.fieldname,
                            filename: part.filename,
                            buffer: buffer
                        });
                    }
                }
            }

            if (!aquaFileContent) {
                return reply.code(400).send({ error: 'No Aqua Json file uploaded' });
            }

            if (files.length === 0) {
                return reply.code(400).send({ error: 'No files uploaded, please upload file next to aqua file' });
            }

            const aquaFileObjects: FileObject[] = files.map(file => ({
                fileContent: file.buffer.toString('utf-8'),
                fileName: file.filename,
                path: "./"
            }))

            const aquaTree = JSON.parse(aquaFileContent);

            let verificationResults = await aquafier.verifyAquaTree(aquaTree, aquaFileObjects)

            if (verificationResults.isOk()) {
                return reply.code(200).send({
                    results: verificationResults.data,
                    fileCount: files.length
                });
            } else {
                return reply.code(417).send({
                    results: verificationResults.data,
                    fileCount: files.length
                });
            }
        } catch (error: any) {
            request.log.error(error);
            return reply.code(500).send({ error: 'File upload failed', details: error.message });
        }
    });



    //Creates a new revision, validated against aqua-verifier-js-lib verifier.
    fastify.post('/verify/tree', async (request, reply) => {

        try {
            const data: any = request.body
            // Type assertion and validation
            const aquaTree = data.aquaTree as AquaTree;

            let fileObjects: Array<FileObject> = []

            if (data.fileObjects) {
                fileObjects = data.fileObjects as Array<FileObject>
            }
            // Validate mandatory fields
            if (!aquaTree) {
                return reply.code(400).send({
                    error: 'Invalid AquaTree: Missing aquaTree object'
                });
            }

            // Check mandatory nested fields
            if (!aquaTree.revisions || Object.keys(aquaTree.revisions).length === 0) {
                return reply.code(400).send({
                    error: 'Invalid AquaTree: Missing or empty revisions'
                });
            }

            if (!aquaTree.file_index) {
                return reply.code(400).send({
                    error: 'Invalid AquaTree: Missing file_index'
                });
            }

            if (!aquaTree.tree || !aquaTree.tree.hash) {
                return reply.code(400).send({
                    error: 'Invalid AquaTree: Missing tree or tree hash'
                });
            }

            if (!aquaTree.treeMapping) {
                return reply.code(400).send({
                    error: 'Invalid AquaTree: Missing treeMapping'
                });
            }

            // Process the AquaTree
            // const revisionHashes = Object.keys(aquaTree.revisions);
            // const firstRevisionHash = revisionHashes[0];
            // const firstRevision = aquaTree.revisions[firstRevisionHash];

            const aquafier = new Aquafier();

            ////  console.log(`fileObjects ${JSON.stringify(fileObjects, null, 4)}`)
            ////  console.log(`aquaTree ${JSON.stringify(aquaTree, null, 4)}`)
            let res = await aquafier.verifyAquaTree(aquaTree, fileObjects)

            if (res.isOk()) {
                return reply.code(200).send({
                    data: res.data
                });

            } else {

                return reply.code(417).send({
                    data: res.data
                });
            }

        } catch (error) {
            request.log.error(error);
            return reply.code(500).send({
                error: 'Error processing AquaTree',
                details: error instanceof Error ? error.message : 'Unknown error'
            });
        }
    });
}