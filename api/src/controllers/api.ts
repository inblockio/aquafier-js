

import { FastifyInstance } from "fastify";

export default async function indexController(fastify: FastifyInstance) {

    //Creates a new revision, validated against aqua-verifier-js-lib verifier.
    fastify.post('/trees', async (request, reply) => {

        return { message: 'creat a new revision' };
    });

    //Creates a new revision, validated against aqua-verifier-js-lib verifier.
    fastify.post('/verify', async (request, reply) => {

        return { message: 'verify a new revision' };
    });

    //Retrieves the branch from the specified hash back to the genesis hash (backward traversal only)
    fastify.get('/trees/:revisionHash/latest', async (request, reply) => {
        const { revisionHash } = request.params as { revisionHash: string };
        console.log(`Received revisionHash: ${revisionHash}`);
        return { message: 'Latest revision hash data', revisionHash: revisionHash };
    });


    //Retrieves details of a specific revision hash
    fastify.get('/trees/:revisionHash', async (request, reply) => {
        const { revisionHash } = request.params as { revisionHash: string };
        console.log(`Received revisionHash: ${revisionHash}`);
        return { message: 'Latest revision hash data', revisionHash: revisionHash };
    });


}