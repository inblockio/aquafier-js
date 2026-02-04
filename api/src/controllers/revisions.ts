import { canDeleteRevision, deleteRevisionAndChildren } from '../utils/quick_revision_utils';
import { prisma } from '../database/db';
import { DeleteRevision, FetchAquaTreeRequest, SaveRevisionForUser } from '../models/request_models';
import { getAquaTreeFileName, getHost, getPort } from '../utils/api_utils';
import {
    buildEntireTreeFromGivenRevisionHash,
    deleteAquaTree,
    getSignatureAquaTrees,
    getUserApiFileInfo,
    isWorkFlowData,
    saveRevisionInAquaTree
} from '../utils/revisions_utils';
import { AquaTree, FileObject, OrderRevisionInAquaTree } from 'aqua-js-sdk';
import { FastifyInstance } from 'fastify';
import { sendToUserWebsockerAMessage } from './websocketController';
import WebSocketActions from '../constants/constants';
import { createAquaTreeFromRevisions, deleteChildrenFieldFromAquaTrees } from '../utils/revisions_operations_utils';
import Logger from "../utils/logger";
import { authenticate, AuthenticatedRequest } from '../middleware/auth_middleware';
import { systemTemplateHashes, TEMPLATE_HASHES } from '../models/constants';
import { ethers } from 'ethers';
import * as fs from 'fs';

export default async function revisionsController(fastify: FastifyInstance) {
    // fetch aqua tree from a revision hash
    fastify.post('/tree/data', async (request, reply) => {

        const { latestRevisionHash } = request.body as FetchAquaTreeRequest;
        // fetch all from latetst

        let latestHashInDb = await prisma.latest.findFirst({
            where: {
                hash: latestRevisionHash
                // user: session.address
            }
        });

        if (latestHashInDb == null) {
            return reply.code(403).send({ message: "hash does not exist in latet revision", data: [] });
        }

        // traverse from the latest to the genesis of each 

        let displayData: Array<{
            aquaTree: AquaTree,
            fileObject: FileObject[]
        }> = []


        // Get the host from the request headers
        const host = request.headers.host || `${getHost()}:${getPort()}`;

        // Get the protocol (http or https)
        const protocol = request.protocol || 'https'
        // if(backendurl)
        // Construct the full URL
        const url = `${protocol}://${host}`;



        try {

            const [anAquaTree, fileObject] = await createAquaTreeFromRevisions(latestRevisionHash, url)

            let sortedAquaTree = OrderRevisionInAquaTree(anAquaTree)

            displayData.push({
                aquaTree: sortedAquaTree,
                fileObject: fileObject
            })
        } catch (e) {
            return reply.code(500).send({ success: false, message: `Error ${e}` });

        }

        return reply.code(200).send({ data: deleteChildrenFieldFromAquaTrees(displayData) })

    });

    //save revision for other user 
    fastify.post('/tree/user', async (request, reply) => {
        try {
            // Read `nonce` from headers
            const nonce = request.headers['nonce']; // Headers are case-insensitive

            // Check if `nonce` is missing or empty
            if (!nonce || typeof nonce !== 'string' || nonce.trim() === '') {
                return reply.code(401).send({ error: 'Unauthorized: Missing or empty nonce header' });
            }

            const session = await prisma.siweSession.findUnique({
                where: { nonce }
            });

            if (!session) {
                return reply.code(403).send({ success: false, message: "Nounce  is invalid" });
            }

            const revisionData = request.body as SaveRevisionForUser

            if (!revisionData.revision) {
                return reply.code(400).send({ success: false, message: "revision Data is required" });
            }
            if (!revisionData.revisionHash) {
                return reply.code(400).send({ success: false, message: "revision hash is required" });
            }

            if (!revisionData.revision.revision_type) {
                return reply.code(400).send({ success: false, message: "revision type is required" });
            }

            if (!revisionData.revision.local_timestamp) {
                return reply.code(400).send({ success: false, message: "revision timestamp is required" });
            }

            if (!revisionData.revision.previous_verification_hash) {
                return reply.code(400).send({ success: false, message: "previous revision hash  is required" });
            }

            if (revisionData.address === session.address) {
                return reply.code(202).send({ success: false, message: "use /tree to save revision for a specific user /tree/user is for different address" });
            }

            if (!revisionData.originAddress) {
                return reply.code(400).send({ success: false, message: "origin address not defined" });
            }

            //  if(revisionData.originAddress == revisionData.address    ){
            //      return reply.code(400).send({ success: false, message: "origin address cannot be the same as address " });
            // }

            //   if(revisionData.originAddress == session.address    ){
            //      return reply.code(400).send({ success: false, message: "origin address cannot be the same as session address " });
            // }



            // Get the host from the request headers
            const host = request.headers.host || `${getHost()}:${getPort()}`;

            // Get the protocol (http or https)
            const protocol = request.protocol || 'https'

            // Construct the full URL
            const url = `${protocol}://${host}`;

            const [_httpCode, _message] = await saveRevisionInAquaTree(revisionData, revisionData.address, url);

          


            //trigger the other party to refetch explorer files
            sendToUserWebsockerAMessage(revisionData.address, WebSocketActions.REFETCH_FILES)


            return reply.code(200).send({
                success: true,
            });

        } catch (error: any) {
            request.log.error(error);
            return reply.code(500).send({ error: `Failed to process revisions other user ${error}` });
        }
    });

    // save revision for the user in the session
    fastify.post('/tree', async (request, reply) => {
        try {
            // Read `nonce` from headers
            const nonce = request.headers['nonce']; // Headers are case-insensitive

            // Check if `nonce` is missing or empty
            if (!nonce || typeof nonce !== 'string' || nonce.trim() === '') {
                return reply.code(401).send({ error: 'Unauthorized: Missing or empty nonce header' });
            }

            const session = await prisma.siweSession.findUnique({
                where: { nonce }
            });

            if (!session) {
                return reply.code(403).send({ success: false, message: "Nounce  is invalid" });
            }

            const revisionData = request.body as SaveRevisionForUser

            if (!revisionData.revision) {
                return reply.code(400).send({ success: false, message: "revision Data is required" });
            }
            if (!revisionData.revisionHash) {
                return reply.code(400).send({ success: false, message: "revision hash is required" });
            }

            if (!revisionData.revision.revision_type) {
                return reply.code(400).send({ success: false, message: "revision type is required" });
            }

            if (!revisionData.revision.local_timestamp) {
                return reply.code(400).send({ success: false, message: "revision timestamp is required" });
            }

            if (!revisionData.revision.previous_verification_hash) {
                return reply.code(400).send({ success: false, message: "previous revision hash  is required" });
            }


            if (!revisionData.originAddress) {
                return reply.code(400).send({ success: false, message: "origin address not defined.." });
            }

            // Get the host from the request headers
            const host = request.headers.host || `${getHost()}:${getPort()}`;

            // Get the protocol (http or https)
            const protocol = request.protocol || 'https'

            // Construct the full URL
            const url = `${protocol}://${host}`;

            const [httpCode, message] = await saveRevisionInAquaTree(revisionData, session.address, url);

            if (httpCode != 200) {
                return reply.code(httpCode).send({ success: false, message: message });
            }


            // fetch all from latetst

            // let latest = await prisma.latest.findMany({
            //     where: {
            //         user: session.address
            //     }
            // });

            // if (latest.length == 0) {
            //     return reply.code(200).send({ data: [] });
            // }



            // let displayData = await fetchAquatreeFoUser(url, latest)

            let displayData = await getUserApiFileInfo(url, session.address)

            return reply.code(200).send({
                success: true,
                message: "Revisions stored successfully",
                data: displayData

            });

        } catch (error: any) {
            request.log.error(error);
            return reply.code(500).send({ error: `Failed to process revisions ${error}` });
        }
    });

    fastify.delete('/tree', async (request, reply) => {
        // Read `nonce` from headers
        const nonce = request.headers['nonce']; // Headers are case-insensitive

        // Check if `nonce` is missing or empty
        if (!nonce || typeof nonce !== 'string' || nonce.trim() === '') {
            return reply.code(401).send({ error: 'Unauthorized: Missing or empty nonce header' });
        }

        const session = await prisma.siweSession.findUnique({
            where: { nonce }
        });

        if (!session) {
            return reply.code(403).send({ success: false, message: "Nonce is invalid" });
        }

        const revisionDataPar = request.body as DeleteRevision;

        if (!revisionDataPar.revisionHash) {
            return reply.code(400).send({ success: false, message: "revision hash is required" });
        }


        const host = request.headers.host || `${getHost()}:${getPort()}`;

        // Get the protocol (http or https)
        const protocol = request.protocol || 'https'

        // Construct the full URL
        const url = `${protocol}://${host}`;


        const revisionHashestoDelete: Array<string> = revisionDataPar.revisionHash.split(",")

        for (let i = 0; i < revisionHashestoDelete.length; i++) {

            let currentHash = revisionHashestoDelete[i]
            let [code, reason] = await deleteAquaTree(currentHash, session.address, url)
            if (code != 200) {

                return reply.code(code).send({ message: reason });
            }
        }

        return reply.code(200).send({ message: "revision hash is required" });

    });

    fastify.delete('/tree/revisions/:hash', async (request, reply) => {
        try {
            const nonce = request.headers['nonce']; // Headers are case-insensitive
            const { hash } = request.params as { hash: string };

            // Check if `nonce` is missing or empty
            if (!nonce || typeof nonce !== 'string' || nonce.trim() === '') {
                return reply.code(401).send({ error: 'Unauthorized: Missing or empty nonce header' });
            }

            // Retrieve session from nonce
            const session = await prisma.siweSession.findUnique({
                where: { nonce }
            });

            if (!session) {
                return reply.code(401).send({ error: 'Unauthorized: Invalid session' });
            }


            // Check if the user is allowed to delete this revision
            const canDelete = await canDeleteRevision(hash, session.address);
            if (!canDelete) {
                return reply.code(403).send({
                    success: false,
                    message: 'Forbidden: You do not have permission to delete this revision'
                });
            }

            // Perform the deletion
            const result = await deleteRevisionAndChildren(hash, session.address);

            if (result.success) {
                return reply.code(200).send({
                    success: true,
                    message: `Successfully deleted revision and its dependencies`,
                    deleted: result.deleted,
                    details: result.details
                });
            } else {
                return reply.code(500).send({
                    success: false,
                    message: 'Error occurred during deletion',
                    deleted: result.deleted,
                    details: result.details
                });
            }

        } catch (error: any) {
            Logger.error("Error fetching user signatures:", error);
            return reply.code(500).send({
                success: false,
                message: `Error deleting revision: ${error.message}`,
                details: error
            });
        }
    });


    fastify.get('/tree/user_signatures', async (request, reply) => {

        try {

            const nonce = request.headers['nonce']; // Headers are case-insensitive

            // Check if `nonce` is missing or empty
            if (!nonce || typeof nonce !== 'string' || nonce.trim() === '') {
                return reply.code(401).send({ error: 'Unauthorized: Missing or empty nonce header' });
            }

            const session = await prisma.siweSession.findUnique({
                where: { nonce }
            });

            if (!session) {
                return reply.code(403).send({ success: false, message: "Nounce  is invalid" });
            }

            ;

            // Get the host from the request headers
            const host = request.headers.host || `${getHost()}:${getPort()}`;

            // Get the protocol (http or https)
            const protocol = request.protocol || 'https'

            // Construct the full URL
            const url = `${protocol}://${host}`;



            let signatureAquaTrees: Array<{
                aquaTree: AquaTree,
                fileObject: FileObject[]
            }> = await getSignatureAquaTrees(session.address, url)

            // Remove children field from all revisions in each aquaTree
            const cleanedSignatureAquaTrees = deleteChildrenFieldFromAquaTrees(signatureAquaTrees);

            return reply.code(200).send({
                success: true,
                data: cleanedSignatureAquaTrees
            });

        } catch (error: any) {
            Logger.error("Error in delete operation:", error);
            return reply.code(500).send({
                success: false,
                message: `Error deleting revision: ${error.message}`,
                details: error
            });
        }
    });

    function confirmThatAllClaimTypesAreValid(claimTypes: string[]) {
        const invalidClaimTypes: Array<{ claim_type: string, message: string }> = [];
        for (let i = 0; i < claimTypes.length; i++) {
            // jUST USE TEMPLATE_HASHES, if any return null or undefined break and return an error of invalid claim type
            const claimType = claimTypes[i];
            const templateHash = TEMPLATE_HASHES[claimType as keyof typeof TEMPLATE_HASHES];
            if (!templateHash) {
                invalidClaimTypes.push({
                    claim_type: claimType,
                    message: "Invalid claim type"
                });
            }
        }
        return invalidClaimTypes;
    }

   
    function getBaseUrl(request: AuthenticatedRequest) {
        const host = request.headers.host || `${getHost()}:${getPort()}`;

        // Get the protocol (http or https)
        const protocol = request.protocol || 'https'
        // if(backendurl)
        // Construct the full URL
        const url = `${protocol}://${host}`;
        return url
    }


    // Get user files based on a given claim type
    fastify.get('/tree/per_type', {
        preHandler: authenticate
    }, async (request: AuthenticatedRequest, reply) => {
        const userAddress = request.user?.address;

        const { claim_types, wallet_address, use_wallet, orderBy = 'date' } = request.query as { claim_types: string, wallet_address?: string, use_wallet?: string, orderBy?: string };

        const claimTypes = JSON.parse(claim_types)

        const invalidClaimTypes = confirmThatAllClaimTypesAreValid(claimTypes)
        let cleanedWalletAddress = wallet_address
        if (wallet_address) {
            cleanedWalletAddress = ethers.getAddress(wallet_address)
        }

        let baseAddress = userAddress
        if (use_wallet) {
            baseAddress = use_wallet
        }

        if (invalidClaimTypes.length > 0) {
            return reply.code(400).send({ error: 'Invalid claim types', invalidClaimTypes });
        }

        if (!userAddress) {
            return reply.code(401).send({ error: 'Unauthorized' });
        }

        // const queryStart = performance.now()
        const templateHashesToTrack = []
        // We create an object of the items we want to track differently and or separately
        const formTypesToTrack: Record<string, number> = {}
        for (let i = 0; i < claimTypes.length; i++) {
            const formType = claimTypes[i]
            formTypesToTrack[formType] = 0
            templateHashesToTrack.push(TEMPLATE_HASHES[formType as keyof typeof TEMPLATE_HASHES])
        }

        const formTypesToTrackKeys = Object.keys(formTypesToTrack)
        const allLinkRevisionsForTrackedClaimTypes: string[] = []

        // Create lookup map only once, outside the loop
        const templateHashToFormType = new Map<string, string>();
        for (const formType of formTypesToTrackKeys) {
            const templateHash = TEMPLATE_HASHES[formType as keyof typeof TEMPLATE_HASHES];
            templateHashToFormType.set(templateHash, formType);
        }

        // Get pagination parameters from query
        const { page = 1, limit = 100 } = request.query as { page?: string | number, limit?: string | number };
        const pageNum = typeof page === 'string' ? parseInt(page, 10) : page;
        const limitNum = typeof limit === 'string' ? parseInt(limit, 10) : limit;
        const skip = (pageNum - 1) * limitNum;

        // First, find genesis form revisions that contain the wallet address
        let genesisFormHashes: string[] = []
        if (cleanedWalletAddress) {
            // Optimization 1: Use Prisma with optimized query structure
            // Optimization 2: Add take limit to prevent excessive results
            const genesisFormRevisions = await prisma.revision.findMany({
                select: {
                    pubkey_hash: true
                },
                where: {
                    pubkey_hash: {
                        startsWith: baseAddress
                    },
                    revision_type: "form",
                    OR: [
                        { previous: null },
                        { previous: "" }
                    ],
                    AquaForms: {
                        some: {
                            value: {
                                string_contains: cleanedWalletAddress
                            }
                        }
                    }
                },
                // take: 1000, // Limit results
                orderBy: {
                    pubkey_hash: 'asc'
                }
            });

            genesisFormHashes = genesisFormRevisions.map(rev => rev.pubkey_hash);

            // Optimization 3: Early exit if no matching forms found
            if (genesisFormHashes.length === 0) {
                return reply.code(200).send({
                    aquaTrees: [],
                    linkRevisionsForTrackedClaimTypes: [],
                    claimTypeCounts: formTypesToTrack,
                    pagination: {
                        currentPage: pageNum,
                        totalPages: 0,
                        totalCount: 0,
                        limit: limitNum,
                        hasNextPage: false,
                        hasPrevPage: false
                    }
                });
            }
        }

        // Build the where clause for link revisions
        let linkWhereClause: any = {
            pubkey_hash: {
                startsWith: baseAddress
            },
            revision_type: {
                equals: "link"
            },
            Link: {
                some: {
                    link_verification_hashes: {
                        hasSome: templateHashesToTrack
                    }
                }
            }
        }

        // If we have genesis form hashes, filter links that reference them
        if (genesisFormHashes.length > 0) {
            linkWhereClause.previous = {
                in: genesisFormHashes
            }
        }

        // Get total count for pagination metadata
        const totalCount = await prisma.revision.count({
            where: linkWhereClause
        });

        const linkRevisions = await prisma.revision.findMany({
            select: {
                pubkey_hash: true,
                revision_type: true,
                previous: true,
                Link: {
                    select: {
                        link_verification_hashes: true
                    }
                }
            },
            where: linkWhereClause,
            skip: skip,
            take: limitNum,
            orderBy: {
                createdAt: 'desc' // Most recent first
            }
        })

        // Process revisions with early exit optimization
        for (let j = 0; j < linkRevisions.length; j++) {
            const linkRevision = linkRevisions[j];
            let revisionMatched = false;

            // Early exit if revision already matched
            linkLoop: for (let k = 0; k < linkRevision.Link.length; k++) {
                const link = linkRevision.Link[k];
                for (let l = 0; l < link.link_verification_hashes.length; l++) {
                    const verificationHash = link.link_verification_hashes[l];
                    const formType = templateHashToFormType.get(verificationHash);

                    if (formType) {
                        formTypesToTrack[formType]++;
                        if (!revisionMatched) {
                            allLinkRevisionsForTrackedClaimTypes.push(linkRevision.pubkey_hash);
                            revisionMatched = true;
                        }
                        break linkLoop; // Exit both loops once we find a match
                    }
                }
            }
        }

        let displayData: Array<{
            aquaTree: AquaTree,
            fileObject: FileObject[]
        }> = []

        const url = getBaseUrl(request)

        // Process all revisions in parallel for better performance
        const displayDataPromises = allLinkRevisionsForTrackedClaimTypes.map(async (revisionHash) => {
            try {
                const aquaTreeJustRevisions = await buildEntireTreeFromGivenRevisionHash(revisionHash);
                const latestRevisionHash = aquaTreeJustRevisions[aquaTreeJustRevisions.length - 1].revisionHash;
                const [anAquaTree, fileObject] = await createAquaTreeFromRevisions(latestRevisionHash, url);
                const sortedAquaTree = OrderRevisionInAquaTree(anAquaTree);
                return {
                    aquaTree: sortedAquaTree,
                    fileObject: fileObject
                };
            } catch (e) {
                throw new Error(`Error processing revision ${revisionHash}: ${e}`);
            }
        });

        try {
            displayData = await Promise.all(displayDataPromises);
        } catch (e) {
            return reply.code(500).send({ success: false, message: `Error ${e}` });
        }

        // Apply sorting based on orderBy parameter
        if (orderBy === 'size') {
            // Sort by file size (largest first)
            displayData.sort((a, b) => {
                const sizeA = a.fileObject[0]?.fileSize || 0;
                const sizeB = b.fileObject[0]?.fileSize || 0;
                return sizeB - sizeA;
            });
        } else if (orderBy === 'name') {
            // Sort by file name (alphabetical)
            displayData.sort((a, b) => {
                const nameA = getAquaTreeFileName(a.aquaTree);
                const nameB = getAquaTreeFileName(b.aquaTree);
                return nameA.localeCompare(nameB);
            });
        }
        // For 'date', the data is already sorted by createdAt in the query

        // const queryEnd = performance.now()
        // const queryDuration = (queryEnd - queryStart) / 1000
        // Logger.info(`Query duration: ${queryDuration} seconds`)
        // console.log(cliGreenify(`Query duration: ${queryDuration} seconds`))

        const totalPages = Math.ceil(totalCount / limitNum);
        const hasNextPage = pageNum < totalPages;
        const hasPrevPage = pageNum > 1;

        return reply.code(200).send({
            aquaTrees: deleteChildrenFieldFromAquaTrees(displayData),
            linkRevisionsForTrackedClaimTypes: allLinkRevisionsForTrackedClaimTypes,
            claimTypeCounts: formTypesToTrack,
            pagination: {
                currentPage: pageNum,
                totalPages,
                totalCount,
                limit: limitNum,
                hasNextPage,
                hasPrevPage
            }
        })
    });


    // This method should help fetch an aqua tree from ordered revision hashes
    fastify.post('/tree/revision_hash', {
        preHandler: authenticate
    }, async (request: AuthenticatedRequest, reply) => {
        const userAddress = request.user?.address;

        const { revisionHashes } = request.body as { revisionHashes: string[] };

        if (!userAddress) {
            return reply.code(401).send({ error: 'Unauthorized' });
        }

        if (!revisionHashes || !Array.isArray(revisionHashes) || revisionHashes.length === 0) {
            return reply.code(400).send({ error: 'revisionHashes array is required' });
        }

        const url = getBaseUrl(request)

        // Loop through revision hashes in reverse order (latest to genesis)
        // to find the latest revision that exists for this user
        let foundRevisionHash: string | null = null;
        const hashestoIterate = revisionHashes.reverse()
        for (let i = hashestoIterate.length - 1; i >= 0; i--) {
            const revisionHash = hashestoIterate[i];
            const completeRevisionHash = `${userAddress}_${revisionHash}`;

            // Check if the user owns this revision
            const revision = await prisma.revision.findUnique({
                select: {
                    pubkey_hash: true
                },
                where: {
                    pubkey_hash: completeRevisionHash
                }
            });

            if (revision) {
                foundRevisionHash = completeRevisionHash;
                break; // Found the latest revision that exists for this user
            }
        }

        if (!foundRevisionHash) {
            return reply.code(404).send({ error: 'No matching tree found for user' });
        }

        const aquaTreeJustRevisions = await buildEntireTreeFromGivenRevisionHash(foundRevisionHash);
        const latestRevisionHash = aquaTreeJustRevisions[aquaTreeJustRevisions.length - 1].revisionHash;
        const [anAquaTree, fileObject] = await createAquaTreeFromRevisions(latestRevisionHash, url);
        const sortedAquaTree = OrderRevisionInAquaTree(anAquaTree);

        return reply.code(200).send({
            data: {
                aquaTree: sortedAquaTree,
                fileObject: fileObject
            }
        });
    });

    // Get all user files
    fastify.get('/tree/all_files', {
        preHandler: authenticate
    }, async (request: AuthenticatedRequest, reply) => {
        const userAddress = request.user?.address;

        if (!userAddress) {
            return reply.code(401).send({ error: 'Unauthorized' });
        }

        const queryStart = performance.now()

        // Get pagination parameters from query
        const { page = 1, limit = 100, orderBy = 'date' } = request.query as { page?: string | number, limit?: string | number, orderBy?: string };
        const pageNum = typeof page === 'string' ? parseInt(page, 10) : page;
        const limitNum = typeof limit === 'string' ? parseInt(limit, 10) : limit;
        const skip = (pageNum - 1) * limitNum;

        const url = getBaseUrl(request)

        // Get total count for pagination metadata
        const totalCount = await prisma.latest.count({
            where: {
                AND: {
                    user: userAddress,
                    template_id: null,
                    is_workflow: false
                }
            }
        });

        // Get paginated latest records
        const latestRecords = await prisma.latest.findMany({
            where: {
                AND: {
                    user: userAddress,
                    template_id: null,
                    is_workflow: false
                }
            },
            select: {
                hash: true
            },
            skip: skip,
            take: limitNum,
            orderBy: {
                createdAt: orderBy === 'date' ? 'desc' : 'asc'
            }
        });

        let displayData: Array<{
            aquaTree: AquaTree,
            fileObject: FileObject[]
        }> = []

        // Process all revision hashes in parallel for better performance
        const displayDataPromises = latestRecords.map(async (record) => {
            try {
                const revisionHash = record.hash;
                const aquaTreeJustRevisions = await buildEntireTreeFromGivenRevisionHash(revisionHash);
                const latestRevisionHash = aquaTreeJustRevisions[aquaTreeJustRevisions.length - 1].revisionHash;
                const [anAquaTree, fileObject] = await createAquaTreeFromRevisions(latestRevisionHash, url);
                const sortedAquaTree = OrderRevisionInAquaTree(anAquaTree);
                return {
                    aquaTree: sortedAquaTree,
                    fileObject: fileObject
                };
            } catch (e) {
                throw new Error(`Error processing revision ${record.hash}: ${e}`);
            }
        });

        try {
            displayData = await Promise.all(displayDataPromises);
        } catch (e) {
            return reply.code(500).send({ success: false, message: `Error ${e}` });
        }

        // Apply sorting based on orderBy parameter
        if (orderBy === 'size') {
            // Sort by file size (largest first)
            displayData.sort((a, b) => {
                const sizeA = a.fileObject[0]?.fileSize || 0;
                const sizeB = b.fileObject[0]?.fileSize || 0;
                return sizeB - sizeA;
            });
        } else if (orderBy === 'name') {
            // Sort by file name (alphabetical)
            displayData.sort((a, b) => {
                const nameA = getAquaTreeFileName(a.aquaTree);
                const nameB = getAquaTreeFileName(b.aquaTree);
                return nameA.localeCompare(nameB);
            });
        }
        // For 'date', the data is already sorted by createdAt in the query

        const queryEnd = performance.now()
        const queryDuration = (queryEnd - queryStart) / 1000
        // Logger.info(`Query duration: ${queryDuration} seconds`)
        // console.log(cliGreenify(`Query duration: ${queryDuration} seconds`))

        const totalPages = Math.ceil(totalCount / limitNum);
        const hasNextPage = pageNum < totalPages;
        const hasPrevPage = pageNum > 1;

        return reply.code(200).send({
            aquaTrees: deleteChildrenFieldFromAquaTrees(displayData),
            linkRevisionsForTrackedClaimTypes: [],
            claimTypeCounts: {},
            pagination: {
                currentPage: pageNum,
                totalPages,
                totalCount,
                limit: limitNum,
                hasNextPage,
                hasPrevPage
            }
        })
    })


    // Get aqua files only, files that are not part of any workflow
    fastify.get('/tree/user_files', {
        preHandler: authenticate
    }, async (request: AuthenticatedRequest, reply) => {
        const userAddress = request.user?.address;

        if (!userAddress) {
            return reply.code(401).send({ error: 'Unauthorized' });
        }

        // const queryStart = performance.now()

        // Get pagination parameters from query
        const { page = 1, limit = 100, orderBy = 'date' } = request.query as { page?: string | number, limit?: string | number, orderBy?: string };
        const pageNum = typeof page === 'string' ? parseInt(page, 10) : page;
        const limitNum = typeof limit === 'string' ? parseInt(limit, 10) : limit;
        const skip = (pageNum - 1) * limitNum;

        const url = getBaseUrl(request)

        // Query genesis revisions of type 'file' for the user
        // const whereClause = {
        //     pubkey_hash: {
        //         startsWith: userAddress
        //     },
        //     revision_type: "file",
        //     OR: [
        //         { previous: null },
        //         { previous: "" }
        //     ]
        // };




        // @Dalmas since you are using  revision and not latest,And we were asked to filter out workflow files, 
        // will fetch workflow hashes from latest table and exclude them from this query

        const whereClause: any = {
            revision_type: "file",
            OR: [
                { previous: null },
                { previous: "" }
            ]
        };

        let workflowRevisionsToExclude: string[] = []

        const workflowLatestRecords = await prisma.latest.findMany({

            where: {
                AND: {
                    user: userAddress,
                    is_workflow: true
                }
            },
            select: {
                hash: true
            }
        });
        workflowRevisionsToExclude = workflowLatestRecords.map(record => record.hash);

        if (workflowRevisionsToExclude.length > 0) {


            whereClause['AND'] = [
                {
                    pubkey_hash: {
                        startsWith: userAddress
                    }
                },
                {
                    pubkey_hash: {
                        notIn: workflowRevisionsToExclude
                    }
                }
            ];
        } else {
            whereClause['pubkey_hash'] = {
                startsWith: userAddress
            };
        }

        // end of workflow exclusion code



        // Get total count for pagination metadata
        const totalCount = await prisma.revision.count({
            where: whereClause
        });



        // Get paginated genesis file revisions
        const genesisFileRevisions = await prisma.revision.findMany({
            where: whereClause,
            select: {
                pubkey_hash: true
            },
            skip: skip,
            take: limitNum,
            orderBy: {
                local_timestamp: orderBy === 'date' ? 'desc' : 'asc'
            }
        });

        let displayData: Array<{
            aquaTree: AquaTree,
            fileObject: FileObject[]
        }> = []

        // Process all revision hashes in parallel for better performance
        const displayDataPromises = genesisFileRevisions.map(async (revision) => {
            try {
                const revisionHash = revision.pubkey_hash;
                const aquaTreeJustRevisions = await buildEntireTreeFromGivenRevisionHash(revisionHash);
                const latestRevisionHash = aquaTreeJustRevisions[aquaTreeJustRevisions.length - 1].revisionHash;
                const [anAquaTree, fileObject] = await createAquaTreeFromRevisions(latestRevisionHash, url);
                const sortedAquaTree = OrderRevisionInAquaTree(anAquaTree);
                return {
                    aquaTree: sortedAquaTree,
                    fileObject: fileObject
                };
            } catch (e) {
                throw new Error(`Error processing revision ${revision.pubkey_hash}: ${e}`);
            }
        });

        try {
            displayData = await Promise.all(displayDataPromises);
        } catch (e) {
            return reply.code(500).send({ success: false, message: `Error ${e}` });
        }

        // Apply sorting based on orderBy parameter
        if (orderBy === 'size') {
            // Sort by file size (largest first)
            displayData.sort((a, b) => {
                const sizeA = a.fileObject[0]?.fileSize || 0;
                const sizeB = b.fileObject[0]?.fileSize || 0;
                return sizeB - sizeA;
            });
        } else if (orderBy === 'name') {
            // Sort by file name (alphabetical)
            displayData.sort((a, b) => {
                const nameA = getAquaTreeFileName(a.aquaTree);
                const nameB = getAquaTreeFileName(b.aquaTree);
                return nameA.localeCompare(nameB);
            });
        }
        // For 'date', the data is already sorted by local_timestamp in the query

        // const queryEnd = performance.now()
        // const queryDuration = (queryEnd - queryStart) / 1000
        // Logger.info(`Query duration: ${queryDuration} seconds`)

        const totalPages = Math.ceil(totalCount / limitNum);
        const hasNextPage = pageNum < totalPages;
        const hasPrevPage = pageNum > 1;

        return reply.code(200).send({
            aquaTrees: deleteChildrenFieldFromAquaTrees(displayData),
            linkRevisionsForTrackedClaimTypes: [],
            claimTypeCounts: {},
            pagination: {
                currentPage: pageNum,
                totalPages,
                totalCount,
                limit: limitNum,
                hasNextPage,
                hasPrevPage
            }
        })
    })

    // New efficient endpoint with database-level sorting
    fastify.get('/tree/sorted_files', {
        preHandler: authenticate
    }, async (request: AuthenticatedRequest, reply) => {
        const userAddress = request.user?.address;

        if (!userAddress) {
            return reply.code(401).send({ error: 'Unauthorized' });
        }

        const queryStart = performance.now()

        // Get pagination and sorting parameters from query
        const { page = 1, limit = 100, orderBy = 'date', fileType = 'all' } = request.query as {
            page?: string | number,
            limit?: string | number,
            orderBy?: string,
            fileType?: string
        };
        const pageNum = typeof page === 'string' ? parseInt(page, 10) : page;
        const limitNum = typeof limit === 'string' ? parseInt(limit, 10) : limit;
        const skip = (pageNum - 1) * limitNum;

        const url = getBaseUrl(request)

        let revisionHashes: string[] = [];
        let totalCount = 0;

        try {
            if (orderBy === 'name') {
                // Start from FileName table for filename-based sorting
                const fileNameRecords = await prisma.fileName.findMany({
                    where: {
                        pubkey_hash: {
                            startsWith: userAddress
                        }
                    },
                    select: {
                        pubkey_hash: true,
                        file_name: true
                    },
                    orderBy: {
                        file_name: 'asc'
                    }
                });

                // Check if these are file-type revisions
                const fileRevisions = await prisma.revision.findMany({
                    where: {
                        pubkey_hash: {
                            in: fileNameRecords.map(fn => fn.pubkey_hash)
                        },
                        revision_type: 'file',
                        OR: [
                            { previous: null },
                            { previous: "" }
                        ]
                    },
                    select: {
                        pubkey_hash: true
                    }
                });

                const fileRevisionHashes = new Set(fileRevisions.map(fr => fr.pubkey_hash));
                const filteredFileNames = fileNameRecords.filter(fn => fileRevisionHashes.has(fn.pubkey_hash));

                // Filter out workflow files if needed
                if (fileType === 'user_files') {
                    const workflowLatestRecords = await prisma.latest.findMany({
                        where: {
                            AND: {
                                user: userAddress,
                                is_workflow: true
                            }
                        },
                        select: {
                            hash: true
                        }
                    });
                    const workflowHashes = new Set(workflowLatestRecords.map(r => r.hash));
                    const nonWorkflowFileNames = filteredFileNames.filter(fn => !workflowHashes.has(fn.pubkey_hash));
                    totalCount = nonWorkflowFileNames.length;
                    const paginatedFileNames = nonWorkflowFileNames.slice(skip, skip + limitNum);
                    revisionHashes = paginatedFileNames.map(fn => fn.pubkey_hash);
                } else {
                    totalCount = filteredFileNames.length;
                    const paginatedFileNames = filteredFileNames.slice(skip, skip + limitNum);
                    revisionHashes = paginatedFileNames.map(fn => fn.pubkey_hash);
                }

            } else if (orderBy === 'size') {
                // Start from Revision table to get user's file-type revisions
                const fileRevisions = await prisma.revision.findMany({
                    where: {
                        pubkey_hash: {
                            startsWith: userAddress
                        },
                        revision_type: 'file',
                        OR: [
                            { previous: null },
                            { previous: "" }
                        ]
                    },
                    select: {
                        pubkey_hash: true
                    }
                });

                const userFileHashes = fileRevisions.map(fr => fr.pubkey_hash);

                // Get FileIndex records for these revisions
                const fileIndexRecords = await prisma.fileIndex.findMany({
                    where: {
                        pubkey_hash: {
                            hasSome: userFileHashes
                        }
                    },
                    select: {
                        pubkey_hash: true,
                        file_hash: true
                    }
                });

                // Map file index to individual pubkey_hashes
                const pubkeyToFileHash = new Map<string, string>();
                for (const fileIndex of fileIndexRecords) {
                    for (const pubkeyHash of fileIndex.pubkey_hash) {
                        if (pubkeyHash.startsWith(userAddress)) {
                            pubkeyToFileHash.set(pubkeyHash, fileIndex.file_hash);
                        }
                    }
                }

                // Get file sizes from File table
                const allFileHashes = [...new Set(Array.from(pubkeyToFileHash.values()))];
                const fileRecords = await prisma.file.findMany({
                    where: {
                        file_hash: {
                            in: allFileHashes
                        }
                    },
                    select: {
                        file_hash: true,
                        file_location: true
                    }
                });

                // Calculate file sizes
                const fileSizeMap = new Map<string, number>();
                for (const fileRecord of fileRecords) {
                    try {
                        const stats = fs.statSync(fileRecord.file_location);
                        fileSizeMap.set(fileRecord.file_hash, stats.size);
                    } catch (error) {
                        fileSizeMap.set(fileRecord.file_hash, 0);
                    }
                }

                // Map pubkey_hash to size
                const pubkeyWithSize = Array.from(pubkeyToFileHash.entries()).map(([pubkey_hash, fileHash]) => ({
                    pubkey_hash,
                    size: fileSizeMap.get(fileHash) || 0
                }));

                // Filter out workflow files if needed
                if (fileType === 'user_files') {
                    const workflowLatestRecords = await prisma.latest.findMany({
                        where: {
                            AND: {
                                user: userAddress,
                                is_workflow: true
                            }
                        },
                        select: {
                            hash: true
                        }
                    });
                    const workflowHashes = new Set(workflowLatestRecords.map(r => r.hash));
                    const filtered = pubkeyWithSize.filter(p => !workflowHashes.has(p.pubkey_hash));
                    totalCount = filtered.length;

                    // Sort by size (largest first) and paginate
                    const sorted = filtered.sort((a, b) => b.size - a.size);
                    revisionHashes = sorted.slice(skip, skip + limitNum).map(p => p.pubkey_hash);
                } else {
                    totalCount = pubkeyWithSize.length;

                    // Sort by size (largest first) and paginate
                    const sorted = pubkeyWithSize.sort((a, b) => b.size - a.size);
                    revisionHashes = sorted.slice(skip, skip + limitNum).map(p => p.pubkey_hash);
                }

            } else {
                // Default: date-based sorting from Latest table

                if (fileType === 'user_files') {
                    // For user_files, we need to exclude actual workflows at the database level
                    // First, find all Latest hashes that belong to workflow chains

                    // Step 1: Find all link revisions that point to system workflow templates
                    const workflowLinkRevisions = await prisma.link.findMany({
                        where: {
                            hash: {
                                startsWith: userAddress
                            },
                            link_verification_hashes: {
                                hasSome: systemTemplateHashes
                            }
                        },
                        select: {
                            hash: true
                        }
                    });

                    // Step 2: For each workflow link, find the Latest record for that chain
                    const workflowLatestHashes = new Set<string>();

                    // First, add all records explicitly marked as workflows
                    const explicitWorkflows = await prisma.latest.findMany({
                        where: {
                            user: userAddress,
                            is_workflow: true
                        },
                        select: { hash: true }
                    });
                    explicitWorkflows.forEach(w => workflowLatestHashes.add(w.hash));

                    // Then, for each workflow link, trace to find its Latest record
                    for (const linkRev of workflowLinkRevisions) {
                        // Find the latest revision in this chain by following children
                        let currentHash = linkRev.hash;
                        let maxIterations = 100; // Safety limit

                        while (maxIterations > 0) {
                            const revision = await prisma.revision.findUnique({
                                where: { pubkey_hash: currentHash },
                                select: { children: true }
                            });

                            if (!revision || !revision.children || revision.children.length === 0) {
                                break;
                            }

                            // Follow the first child (linear chain assumption)
                            currentHash = revision.children[0];
                            maxIterations--;
                        }

                        // currentHash is now the latest revision in this chain
                        // Check if there's a Latest record for it
                        const latestRecord = await prisma.latest.findFirst({
                            where: {
                                user: userAddress,
                                hash: currentHash
                            },
                            select: { hash: true }
                        });

                        if (latestRecord) {
                            workflowLatestHashes.add(latestRecord.hash);
                        }
                    }

                    // Step 3: Query Latest table excluding workflow hashes
                    const whereClause: any = {
                        user: userAddress,
                        template_id: null,
                        is_workflow: false,
                        ...(workflowLatestHashes.size > 0 ? {
                            hash: {
                                notIn: Array.from(workflowLatestHashes)
                            }
                        } : {})
                    };

                    totalCount = await prisma.latest.count({ where: whereClause });

                    const latestRecords = await prisma.latest.findMany({
                        where: whereClause,
                        select: {
                            hash: true
                        },
                        skip: skip,
                        take: limitNum,
                        orderBy: {
                            createdAt: 'desc'
                        }
                    });

                    revisionHashes = latestRecords.map(r => r.hash);

                } else {
                    // For 'all' fileType, use the original approach
                    const whereClause: any = {
                        AND: {
                            user: userAddress,
                            template_id: null
                        }
                    };

                    totalCount = await prisma.latest.count({ where: whereClause });

                    const latestRecords = await prisma.latest.findMany({
                        where: whereClause,
                        select: {
                            hash: true
                        },
                        skip: skip,
                        take: limitNum,
                        orderBy: {
                            createdAt: 'desc'
                        }
                    });

                    revisionHashes = latestRecords.map(r => r.hash);
                }
            }

            // Build aqua trees for the revision hashes
            let displayData: Array<{
                aquaTree: AquaTree,
                fileObject: FileObject[]
            }> = []

            const displayDataPromises = revisionHashes.map(async (revisionHash) => {
                try {
                    const aquaTreeJustRevisions = await buildEntireTreeFromGivenRevisionHash(revisionHash);
                    const latestRevisionHash = aquaTreeJustRevisions[aquaTreeJustRevisions.length - 1].revisionHash;
                    const [anAquaTree, fileObject] = await createAquaTreeFromRevisions(latestRevisionHash, url);
                    const sortedAquaTree = OrderRevisionInAquaTree(anAquaTree);
                    return {
                        aquaTree: sortedAquaTree,
                        fileObject: fileObject
                    };
                } catch (e) {
                    throw new Error(`Error processing revision ${revisionHash}: ${e}`);
                }
            });

            displayData = await Promise.all(displayDataPromises);

            if (fileType === 'user_files') {
                // Filter out any workflow files that might have slipped through
                // Note: This is a safety net for records where is_workflow flag doesn't match actual content
                let filteredDisplayData: Array<{
                    aquaTree: AquaTree,
                    fileObject: FileObject[]
                }> = []

                for (const dataItem of displayData) {
                    let isWorkflow = isWorkFlowData(dataItem.aquaTree, systemTemplateHashes);
                    if (!isWorkflow || isWorkflow.isWorkFlow === false) {
                        filteredDisplayData.push(dataItem);
                    }

                }
                displayData = filteredDisplayData;
                // Note: We intentionally do NOT update totalCount here.
                // totalCount reflects the database count. If items are filtered out here,
                // it indicates a data consistency issue where is_workflow flag doesn't match
                // the actual aqua tree content. This should be fixed at the data layer.
            }

            const queryEnd = performance.now()
            const queryDuration = (queryEnd - queryStart) / 1000
            Logger.info(`Query duration: ${queryDuration} seconds`)

            const totalPages = Math.ceil(totalCount / limitNum);
            const hasNextPage = pageNum < totalPages;
            const hasPrevPage = pageNum > 1;

            return reply.code(200).send({
                aquaTrees: deleteChildrenFieldFromAquaTrees(displayData),
                linkRevisionsForTrackedClaimTypes: [],
                claimTypeCounts: {},
                pagination: {
                    currentPage: pageNum,
                    totalPages,
                    totalCount,
                    limit: limitNum,
                    hasNextPage,
                    hasPrevPage
                }
            })

        } catch (error: any) {
            Logger.error("Error in sorted_files endpoint:", error);
            return reply.code(500).send({
                success: false,
                message: `Error fetching sorted files: ${error.message}`
            });
        }
    });

    // Get all link revisions that contain a specific genesis hash in their link_verification_hashes
    fastify.get('/tree/by_genesis_hash', {
        preHandler: authenticate
    }, async (request: AuthenticatedRequest, reply) => {
        const userAddress = request.user?.address;
        const { genesis_hash } = request.query as { genesis_hash: string };

        if (!genesis_hash) {
            return reply.code(400).send({ error: 'genesis_hash query parameter is required' });
        }

        if (!userAddress) {
            return reply.code(401).send({ error: 'Unauthorized' });
        }

        const url = getBaseUrl(request);

        // Find all link revisions that have this genesis_hash in their link_verification_hashes
        // Using Prisma relation to perform inner join between Revision and Link tables
        const linkRevisions = await prisma.revision.findMany({
            select: {
                pubkey_hash: true,
            },
            where: {
                pubkey_hash: {
                    startsWith: userAddress
                },
                revision_type: 'link',
                Link: {
                    some: {
                        link_verification_hashes: {
                            has: genesis_hash
                        }
                    }
                }
            },
            orderBy: {
                createdAt: 'desc'
            }
        });

        if (linkRevisions.length === 0) {
            return reply.code(200).send({
                fileNames: [],
                linkRevisionHashes: []
            });
        }

        const linkRevisionHashes = linkRevisions.map(rev => rev.pubkey_hash);

        let displayData: Array<{
            aquaTree: AquaTree,
            fileObject: FileObject[]
        }> = [];

        // Build entire trees from each link revision
        const displayDataPromises = linkRevisionHashes.map(async (revisionHash) => {
            try {
                const aquaTreeJustRevisions = await buildEntireTreeFromGivenRevisionHash(revisionHash);
                const latestRevisionHash = aquaTreeJustRevisions[aquaTreeJustRevisions.length - 1].revisionHash;
                const [anAquaTree, fileObject] = await createAquaTreeFromRevisions(latestRevisionHash, url);
                const sortedAquaTree = OrderRevisionInAquaTree(anAquaTree);
                return {
                    aquaTree: sortedAquaTree,
                    fileObject: fileObject
                };
            } catch (e) {
                throw new Error(`Error processing revision ${revisionHash}: ${e}`);
            }
        });

        try {
            displayData = await Promise.all(displayDataPromises);
        } catch (e) {
            return reply.code(500).send({ success: false, message: `Error ${e}` });
        }

        const apiFileInfos = deleteChildrenFieldFromAquaTrees(displayData)
        const fileNames = apiFileInfos.map(apiFileInfo => getAquaTreeFileName(apiFileInfo.aquaTree))

        return reply.code(200).send({
            // apiFileInfos: apiFileInfos,
            linkRevisionHashes: linkRevisionHashes,
            fileNames: fileNames
        });
    });

}
