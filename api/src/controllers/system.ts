import {FastifyInstance} from 'fastify';
import fastifyRateLimit from '@fastify/rate-limit';
import {prisma} from '../database/db';
import {checkFolderExists, getAquaTreeFileName, getHost, getPort} from '../utils/api_utils';
import {fetchAquatreeFoUser} from '../utils/revisions_utils';
import {SYSTEM_WALLET_ADDRESS} from '../models/constants';
import path from 'path';
import * as fs from "fs"
import {getAquaAssetDirectory} from '../utils/file_utils';
import {getTemplateInformation} from '../utils/server_attest';
import Logger from "../utils/logger";
import { deleteChildrenFieldFromAquaTrees } from '../utils/revisions_operations_utils';

export default async function systemController(fastify: FastifyInstance) {

    // Register rate limiter plugin
    await fastify.register(fastifyRateLimit, {
        max: 100, // Maximum 100 requests
        timeWindow: '15m' // Per 15 minutes
    });

    fastify.get('/system/templates', { config: { rateLimit: { max: 100, timeWindow: '15m' } } }, async (request, reply) => {

        let assetsPath = getAquaAssetDirectory()
        Logger.info(`Assets path ${assetsPath}`)

        let assetPathExist = await checkFolderExists(assetsPath)
        const assetFiles = [];
        if (assetPathExist) {

            const files = await fs.promises.readdir(assetsPath);

            // Filter only files (exclude directories)
            for (const file of files) {
                const filePath = path.join(assetsPath, file);
                const stats = await fs.promises.lstat(filePath);
                if (stats.isFile()) {
                    Logger.info(`file ${file}`)
                    assetFiles.push(filePath);
                }
            }
        } else {
            Logger.warn(`Assets path ${assetsPath} does not exist`)
            return reply.code(200).send({ data: [] });
        }

        let dataMap: Map<string, string> = new Map();
        let templates = [
            "access_agreement",
            "aqua_sign",
            "domain_claim",
            "dba_claim",
            "cheque",
            "identity_attestation",
            "identity_claim",
            "user_signature",
            "email_claim",
            "phone_number_claim",
            "user_profile"
        ]

        for (let index = 0; index < templates.length; index++) {
            const templateItem = templates[index];
            const templateInformation = getTemplateInformation(templateItem)
            // save to map
            dataMap.set(templateItem, templateInformation.genHash);

        }

        // Convert Map to Object for JSON serialization
        const dataObject = Object.fromEntries(dataMap);
        return reply.code(200).send({ data: dataObject })

    });

    fastify.get('/system/aqua_tree', async (request, reply) => {

        // fetch all from latetst
        let trees: {
            hash: string;
            user: string;
            template_id: string | null;
        }[] = await prisma.latest.findMany({
            where: {
                user: SYSTEM_WALLET_ADDRESS
            }
        });

           // Get the host from the request headers
        const host = request.headers.host || `${getHost()}:${getPort()}`;

         // Get the protocol (http or https)
        const protocol = request.protocol || 'https'

        // Construct the full URL
        const url = `${protocol}://${host}`;

        const metamaskAddress = request.headers['metamask_address'];
        if (!metamaskAddress || typeof metamaskAddress !== 'string' || metamaskAddress.trim() === '') {

             // throw Error(`Fetching AquaTree for user ${metamaskAddress} with url ${url}  -- ${JSON.stringify(trees, null, 4)}`)
        let displayData = await fetchAquatreeFoUser(url, trees)
            return reply.code(200).send({ data: displayData });

        } else {

            // throw Error(`Metamask address is not provided or is invalid ${metamaskAddress}`);
            let data = await prisma.latest.findMany({
                where: {
                    AND: {
                        user: {
                            contains: metamaskAddress,
                            mode: 'insensitive'
                        },
                        template_id: {
                            not: null
                        }
                    }
                }
            });

            if (data.length > 0) {
                trees.push(...data)
            }
        }

        if (trees.length == 0) {
            return reply.code(200).send({ data: [] });
        }

        // throw Error(`Fetching AquaTree for user ${metamaskAddress} with url ${url}  -- ${JSON.stringify(trees, null, 4)}`)
        let displayData = await fetchAquatreeFoUser(url, trees)

        return reply.code(200).send({ data: deleteChildrenFieldFromAquaTrees(displayData) })
    });

    fastify.get('/system/aqua_tree/names', async (request, reply) => {

        // fetch all from latetst
        let trees: {
            hash: string;
            user: string;
            template_id: string | null;
        }[] = await prisma.latest.findMany({
            where: {
                user: SYSTEM_WALLET_ADDRESS
            }
        });

           // Get the host from the request headers
        const host = request.headers.host || `${getHost()}:${getPort()}`;

         // Get the protocol (http or https)
        const protocol = request.protocol || 'https'

        // Construct the full URL
        const url = `${protocol}://${host}`;

        const metamaskAddress = request.headers['metamask_address'];
        if (!metamaskAddress || typeof metamaskAddress !== 'string' || metamaskAddress.trim() === '') {

             // throw Error(`Fetching AquaTree for user ${metamaskAddress} with url ${url}  -- ${JSON.stringify(trees, null, 4)}`)
        let displayData = await fetchAquatreeFoUser(url, trees)
            return reply.code(200).send({ data: displayData });

        } else {

            // throw Error(`Metamask address is not provided or is invalid ${metamaskAddress}`);
            let data = await prisma.latest.findMany({
                where: {
                    AND: {
                        user: {
                            contains: metamaskAddress,
                            mode: 'insensitive'
                        },
                        template_id: {
                            not: null
                        }
                    }
                }
            });

            if (data.length > 0) {
                trees.push(...data)
            }
        }

        if (trees.length == 0) {
            return reply.code(200).send({ data: [] });
        }

        // throw Error(`Fetching AquaTree for user ${metamaskAddress} with url ${url}  -- ${JSON.stringify(trees, null, 4)}`)
        let displayData = await fetchAquatreeFoUser(url, trees)

        const systemAquaTreeFileNames = displayData.map(e => {
            try {
                  return getAquaTreeFileName(e.aquaTree!)
            } catch (e) {
                  return ''
            }
      })


        return reply.code(200).send({ data: systemAquaTreeFileNames })
    });

}

