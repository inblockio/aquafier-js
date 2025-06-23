
import { FastifyInstance, FastifyRequest } from 'fastify';
import { SiweMessage } from 'siwe';
import { prisma } from '../database/db';
import { Settings } from '@prisma/client';
import { SessionQuery, ShareRequest, SiweRequest } from '../models/request_models';
import { AquaTree, FileObject, OrderRevisionInAquaTree, reorderAquaTreeRevisionsProperties } from 'aqua-js-sdk';
import { checkFolderExists, getHost, getPort } from '../utils/api_utils';
import { fetchAquatreeFoUser, fetchAquaTreeWithForwardRevisions, saveAquaTree } from '../utils/revisions_utils';
import { SYSTEM_WALLET_ADDRESS } from '../models/constants';
import path from 'path';
import * as fs from "fs"
import { getGenesisHash } from 'src/utils/aqua_tree_utils';
import { getAquaAssetDirectory } from 'src/utils/file_utils';

export default async function systemController(fastify: FastifyInstance) {

    fastify.get('/system/templates', async (request, reply) => {

        let assetsPath = getAquaAssetDirectory()
        console.log(`Assets path ${assetsPath}`)

        let assetPathExist = await checkFolderExists(assetsPath)
        const assetFiles = [];
        if (assetPathExist) {

            const files = await fs.promises.readdir(assetsPath);

            // Filter only files (exclude directories)
            for (const file of files) {
                const filePath = path.join(assetsPath, file);
                const stats = await fs.promises.lstat(filePath);
                if (stats.isFile()) {
                    console.log(`file ${file}`)
                    assetFiles.push(filePath);
                }
            }
        } else {
            console.warn(`Assets path ${assetsPath} does not exist`)
                return reply.code(200).send({ data: [] });
        }

        let dataMap: Map<string, string> = new Map();
        let templates = [
            "access_agreement",
            "aqua_sign",
            "cheque",
            "identity_attestation",
            "identity_claim",
            "user_signature"
        ]

        for (let index = 0; index < templates.length; index++) {
            const templateItem = templates[index];
            let templateAquaTreeData = path.join(assetsPath, `${templateItem}.json.aqua.json`);


            let templateAquaTreeDataContent = fs.readFileSync(templateAquaTreeData, 'utf8')
            let templateAquaTree: AquaTree = JSON.parse(templateAquaTreeDataContent)
            let genHash = getGenesisHash(templateAquaTree);
            console.log(`Template ${templateItem} with genesis hash ${genHash}`)

            if (!genHash) {
                throw new Error(`Genesis hash for template ${templateItem} is not defined`);
            }
            // save to map
            dataMap.set(templateItem, genHash);

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

        const metamaskAddress = request.headers['metamask_address'];
        if (!metamaskAddress || typeof metamaskAddress !== 'string' || metamaskAddress.trim() === '') {
            return reply.code(500).send({ data: [] });

        } else {

            // throw Error(`Metamask address is not provided or is invalid ${metamaskAddress}`);
            let data = await prisma.latest.findMany({
                where: {
                    AND: {
                        user: {
                            contains: SYSTEM_WALLET_ADDRESS,
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


        // Get the host from the request headers
        const host = request.headers.host || `${getHost()}:${getPort()}`;

        // Get the protocol (http or https)
        const protocol = request.protocol || 'https'

        // Construct the full URL
        const url = `${protocol}://${host}`;


        // throw Error(`Fetching AquaTree for user ${metamaskAddress} with url ${url}  -- ${JSON.stringify(trees, null, 4)}`)
        let displayData = await fetchAquatreeFoUser(url, trees)



        return reply.code(200).send({ data: displayData })
    });

}

