import { FastifyInstance } from 'fastify';
import fastifyRateLimit from '@fastify/rate-limit';
import { prisma } from '../database/db';
import { checkFolderExists, getAquaTreeFileName, getHost, getPort } from '../utils/api_utils';
import { fetchAquatreeFoUser, transferRevisionChainData } from '../utils/revisions_utils';
import { SYSTEM_WALLET_ADDRESS, TEMPLATE_HASHES } from '../models/constants';
import path from 'path';
import * as fs from "fs"
import { getAquaAssetDirectory } from '../utils/file_utils';
import { getTemplateInformation } from '../utils/server_attest';
import { getServerWalletInformation } from '../utils/server_utils';
import Logger from "../utils/logger";
import { deleteChildrenFieldFromAquaTrees } from '../utils/revisions_operations_utils';
import { authenticate, AuthenticatedRequest } from '../middleware/auth_middleware';
import { fetchCompleteRevisionChain } from '../utils/quick_utils';
import { getGenesisHash, getLatestVH } from 'aqua-js-sdk';
import { generateNonce } from 'siwe';

export default async function systemController(fastify: FastifyInstance) {

    // Register rate limiter plugin
    await fastify.register(fastifyRateLimit, {
        max: 1000, // Maximum 1000 requests
        timeWindow: '5m' // Per 5 minutes
    });

    fastify.get('/system/templates', { config: { rateLimit: { max: 1000, timeWindow: '5m' } } }, async (request, reply) => {

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
            "user_profile",
            "ens_claim"
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
                AND: [
                    { user: SYSTEM_WALLET_ADDRESS },
                    {
                        hash: {
                            in: Object.values(TEMPLATE_HASHES).map(it => `${SYSTEM_WALLET_ADDRESS}_${it}`)
                        }
                    }
                ],
            }
        });

        // Get the host from the request headers
        const host = request.headers.host || `${getHost()}:${getPort()}`;

        // Get the protocol (http or https)
        const protocol = request.protocol || 'https'

        // Construct the full URL
        const url = `${protocol}://${host}`;

        const metamaskAddress = request.headers['metamask_address'];
        const hasValidAddress = metamaskAddress && typeof metamaskAddress === 'string' && metamaskAddress.trim() !== '';

        // If user provided a wallet address, also fetch their workflow trees (with template_id)
        if (hasValidAddress) {
            const userWorkflowTrees = await prisma.latest.findMany({
                where: {
                    user: {
                        contains: metamaskAddress,
                        mode: 'insensitive'
                    },
                    template_id: {
                        not: null
                    }
                }
            });

            if (userWorkflowTrees.length > 0) {
                trees.push(...userWorkflowTrees)
            }
        }

        // Return empty if no trees found
        if (trees.length === 0) {
            return reply.code(200).send({ data: [] });
        }

        // Fetch and format the aqua trees
        const displayData = await fetchAquatreeFoUser(url, trees)

        // Only filter children field when user address is provided
        if (hasValidAddress) {
            return reply.code(200).send({ data: deleteChildrenFieldFromAquaTrees(displayData) })
        }

        return reply.code(200).send({ data: displayData })
    });

    fastify.get('/system/aqua_tree/names', async (request, reply) => {

        // fetch all from latetst
        //     let trees: {
        //         hash: string;
        //         user: string;
        //         template_id: string | null;
        //     }[] = await prisma.latest.findMany({
        //         where: {
        //             user: SYSTEM_WALLET_ADDRESS
        //         }
        //     });

        //        // Get the host from the request headers
        //     const host = request.headers.host || `${getHost()}:${getPort()}`;

        //      // Get the protocol (http or https)
        //     const protocol = request.protocol || 'https'

        //     // Construct the full URL
        //     const url = `${protocol}://${host}`;

        //     const metamaskAddress = request.headers['metamask_address'];
        //     if (!metamaskAddress || typeof metamaskAddress !== 'string' || metamaskAddress.trim() === '') {

        //          // throw Error(`Fetching AquaTree for user ${metamaskAddress} with url ${url}  -- ${JSON.stringify(trees, null, 4)}`)
        //     let displayData = await fetchAquatreeFoUser(url, trees)
        //         return reply.code(200).send({ data: displayData });

        //     } else {

        //         // throw Error(`Metamask address is not provided or is invalid ${metamaskAddress}`);
        //         let data = await prisma.latest.findMany({
        //             where: {
        //                 AND: {
        //                     user: {
        //                         contains: metamaskAddress,
        //                         mode: 'insensitive'
        //                     },
        //                     template_id: {
        //                         not: null
        //                     }
        //                 }
        //             }
        //         });

        //         if (data.length > 0) {
        //             trees.push(...data)
        //         }
        //     }

        //     if (trees.length == 0) {
        //         return reply.code(200).send({ data: [] });
        //     }

        //     // throw Error(`Fetching AquaTree for user ${metamaskAddress} with url ${url}  -- ${JSON.stringify(trees, null, 4)}`)
        //     let displayData = await fetchAquatreeFoUser(url, trees)

        //     const systemAquaTreeFileNames = displayData.map(e => {
        //         try {
        //               return getAquaTreeFileName(e.aquaTree!)
        //         } catch (e) {
        //               return ''
        //         }
        //   })

        // const systemAquaTreeFileNames = [
        //     "access_agreement.json",
        //     "aqua_sign.json",
        //     "cheque.json",
        //     "dba_claim.json",
        //     "domain_claim.json",
        //     "email_claim.json",
        //     "identity_attestation.json",
        //     "identity_claim.json",
        //     "phone_number_claim.json",
        //     "user_profile.json",
        //     "user_signature.json",
        //     "identity_card.json",
        //     "ens_claim.json",
        //     "aqua_certificate.json"
        // ]

        let templates = Object.keys(TEMPLATE_HASHES);
        const systemAquaTreeFileNames = templates.map(templateName => `${templateName}.json`);


        return reply.code(200).send({ data: systemAquaTreeFileNames })
    });

    fastify.get('/system/server-identity', async (request, reply) => {
        const serverWalletInformation = await getServerWalletInformation();

        if (!serverWalletInformation) {
            return reply.code(500).send({ error: "Server wallet information is not configured" });
        }

        return reply.code(200).send({ data: { walletAddress: serverWalletInformation.walletAddress } });
    });

    // Handle backing up an aqua tree to the server
    fastify.post('/server/backup-aqua-sign', { preHandler: authenticate }, async (request: AuthenticatedRequest, reply) => {

        const user = request.user;

        const userAddress = user?.address

        if (!userAddress) {
            return reply.code(400).send({ error: "You are not logged in!" })
        }

        // Get body params
        const params = request.body as { latestRevisionHash: string };

        // Fetch complete aquaTree

        const host = request.headers.host || 'localhost:3000'; // Provide a default host
        const protocol = request.protocol || 'http';
        const url = `${protocol}://${host}`;

        // Fetch the entire chain from the source user
        // const entireChain = await fetchCompleteRevisionChain(latestRevisionHash, userAddress, url);
        let latest: Array<{
            hash: string;
            user: string;
        }> = [
                {
                    hash: `${userAddress}_${params.latestRevisionHash}`,
                    user: userAddress
                }
            ]

        Logger.debug(JSON.stringify(latest, null, 4))
        const entireChain = await fetchAquatreeFoUser(url, latest)//(latestRevisionHash, userAddress, url);

        if (entireChain.length === 0) {
            return reply.code(404).send({ success: false, message: "No revisions found for the provided hash" });

        }
        if (entireChain.length > 1) {
            return reply.code(400).send({
                success: false,
                message: "Multiple revisions found for the provided hash. Please provide a unique revision hash."
            });
        }

        // Transfer the chain to the target user (session.address)
        const transferResult = await transferRevisionChainData(
            SYSTEM_WALLET_ADDRESS,
            entireChain[0],
        );

        if (transferResult.success) {
            // We create a public contract URL here
            let contractIdentifier = `${Date.now()}_${generateNonce()}`
            try {
                await prisma.contract.create({
                    data: {
                        hash: contractIdentifier,
                        genesis_hash: getGenesisHash(entireChain[0].aquaTree),
                        latest: getLatestVH(entireChain[0].aquaTree),
                        recipients: [SYSTEM_WALLET_ADDRESS].map(item => item.trim().toLowerCase()),
                        sender: SYSTEM_WALLET_ADDRESS,
                        option: "latest",
                        file_name: getAquaTreeFileName(entireChain[0].aquaTree)
                    }
                })
                return reply.code(200).send({
                    success: true,
                    backupId: contractIdentifier
                });
            } catch (error) {
                return reply.code(200).send({
                    success: false,
                    backupId: null
                });
            }
        }

        return reply.code(200).send({
            success: false,
            backupId: null
        });



    });
}

