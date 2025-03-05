

import Aquafier, { AquaTree, FileObject, LogData, LogType, Revision } from "aquafier-js-sdk";
import { FastifyInstance } from "fastify";

export default async function verifyController(fastify: FastifyInstance) {

    //Creates a new revision, validated against aqua-verifier-js-lib verifier.
    fastify.post('/verify', async (request, reply) => {

        return { message: 'creat a new revision' };
    });
    //Creates a new revision, validated against aqua-verifier-js-lib verifier.
    fastify.post('/verify/tree', async (request, reply) => {

        try {
            const data: any = request.body
            // Type assertion and validation
            const body = data.aquaTree as AquaTree;

            let fileObjects: Array<FileObject> = []

            if (data.fileObjects) {
                fileObjects = data.fileObjects as Array<FileObject>
            }
            // Validate mandatory fields
            if (!body) {
                return reply.code(400).send({
                    error: 'Invalid AquaTree: Missing aquaTree object'
                });
            }

            // Check mandatory nested fields
            if (!body.revisions || Object.keys(body.revisions).length === 0) {
                return reply.code(400).send({
                    error: 'Invalid AquaTree: Missing or empty revisions'
                });
            }

            if (!body.file_index) {
                return reply.code(400).send({
                    error: 'Invalid AquaTree: Missing file_index'
                });
            }

            if (!body.tree || !body.tree.hash) {
                return reply.code(400).send({
                    error: 'Invalid AquaTree: Missing tree or tree hash'
                });
            }

            if (!body.treeMapping) {
                return reply.code(400).send({
                    error: 'Invalid AquaTree: Missing treeMapping'
                });
            }

            // Process the AquaTree
            const revisionHashes = Object.keys(body.revisions);
            const firstRevisionHash = revisionHashes[0];
            const firstRevision = body.revisions[firstRevisionHash];

            const aquafier = new Aquafier();

            let res = await aquafier.verifyAquaTree(body, fileObjects)

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