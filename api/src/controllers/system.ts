
import { FastifyInstance, FastifyRequest } from 'fastify';
import { SiweMessage } from 'siwe';
import { prisma } from '../database/db';
import { Settings } from '@prisma/client';
import { SessionQuery, ShareRequest, SiweRequest } from '../models/request_models';
// import { verifySiweMessage } from '../utils/auth_utils';
import { AquaTree, FileObject, OrderRevisionInAquaTree, reorderAquaTreeRevisionsProperties } from 'aqua-js-sdk';
import { getHost, getPort } from '../utils/api_utils';
import { createAquaTreeFromRevisions, fetchAquatreeFoUser, fetchAquaTreeWithForwardRevisions, saveAquaTree } from '../utils/revisions_utils';
import { SYSTEM_WALLET_ADDRESS } from '../models/constants';

export default async function systemController(fastify: FastifyInstance) {
    // get current session
    // Can session be used as a middleware?

    fastify.get('/system/aqua_tree', async (request, reply) => {


        // fetch all from latetst

        let latest = await prisma.latest.findMany({
            where: {
                user: SYSTEM_WALLET_ADDRESS
            }
        });

        let latestTemplateTree  = await prisma.latest.findMany({
            where: {
                AND :{
                    user: SYSTEM_WALLET_ADDRESS
                }
            }
        });

        if (latest.length == 0) {
            return reply.code(200).send({ data: [] });
        }


        // Get the host from the request headers
        const host = request.headers.host || `${getHost()}:${getPort()}`;

        // Get the protocol (http or https)
        const protocol = request.protocol || 'https'

        // Construct the full URL
        const url = `${protocol}://${host}`;

        let displayData = await fetchAquatreeFoUser(url, latest)



        return reply.code(200).send({ data: displayData })
    });


}