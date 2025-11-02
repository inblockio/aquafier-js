import { canDeleteRevision, deleteRevisionAndChildren } from '../utils/quick_revision_utils';
import { prisma } from '../database/db';
import { DeleteRevision, FetchAquaTreeRequest, SaveRevisionForUser } from '../models/request_models';
import { getHost, getPort } from '../utils/api_utils';
import {
    deleteAquaTree,
    getSignatureAquaTrees,
    getUserApiFileInfo,
    saveARevisionInAquaTree
} from '../utils/revisions_utils';
import { AquaTree, cliGreenify, cliRedify, FileObject, OrderRevisionInAquaTree } from 'aqua-js-sdk';
import { FastifyInstance } from 'fastify';
import { sendToUserWebsockerAMessage } from './websocketController';
import WebSocketActions from '../constants/constants';
import { createAquaTreeFromRevisions, deleteChildrenFieldFromAquaTrees } from '../utils/revisions_operations_utils';
import Logger from "../utils/logger";
import { authenticate, AuthenticatedRequest } from '../middleware/auth_middleware';
import { TEMPLATE_HASHES } from '../models/constants';
import { ethers } from 'ethers';

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

            if (!revisionData.orginAddress) {
                return reply.code(400).send({ success: false, message: "origin address not defined" });
            }

            //  if(revisionData.orginAddress == revisionData.address    ){
            //      return reply.code(400).send({ success: false, message: "origin address cannot be the same as address " });
            // }

            //   if(revisionData.orginAddress == session.address    ){
            //      return reply.code(400).send({ success: false, message: "origin address cannot be the same as session address " });
            // }



            // Get the host from the request headers
            const host = request.headers.host || `${getHost()}:${getPort()}`;

            // Get the protocol (http or https)
            const protocol = request.protocol || 'https'

            // Construct the full URL
            const url = `${protocol}://${host}`;

            const [_httpCode, _message] = await saveARevisionInAquaTree(revisionData, revisionData.address, url);

            // if (httpCode != 200 && httpCode !== 407) {
            //     return reply.code(httpCode).send({ success: false, message: message });
            // }


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


            if (!revisionData.orginAddress) {
                return reply.code(400).send({ success: false, message: "origin address not defined.." });
            }

            // Get the host from the request headers
            const host = request.headers.host || `${getHost()}:${getPort()}`;

            // Get the protocol (http or https)
            const protocol = request.protocol || 'https'

            // Construct the full URL
            const url = `${protocol}://${host}`;

            const [httpCode, message] = await saveARevisionInAquaTree(revisionData, session.address, url);

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

    function orderRevisionsFromGenesisToLatest(revisionTree: Array<{ revisionHash: string, children: Array<string>, data: any }>) {
        if (!revisionTree || revisionTree.length === 0) {
            return [];
        }

        // Create a map for quick lookup by revision hash
        const revisionMap = new Map<string, { revisionHash: string, children: Array<string>, data: any }>();
        revisionTree.forEach(revision => {
            revisionMap.set(revision.revisionHash, revision);
        });

        // Find the genesis revision (where previous is null, undefined, or empty string)
        const genesisRevision = revisionTree.find(revision =>
            !revision.data.previous || revision.data.previous === ""
        );

        if (!genesisRevision) {
            // If no genesis found, return the original array (shouldn't happen in a well-formed tree)
            return revisionTree;
        }

        // Build ordered array starting from genesis
        const orderedRevisions: Array<{ revisionHash: string, children: Array<string>, data: any }> = [];
        let currentRevision: any = genesisRevision;

        // Follow the chain from genesis to latest
        while (currentRevision) {
            orderedRevisions.push(currentRevision);

            // Find the next revision in the chain
            // Look for a revision that has the current revision as its previous
            const nextRevision = revisionTree.find(revision =>
                revision.data.previous === currentRevision.revisionHash
            );

            currentRevision = nextRevision || null;
        }

        return orderedRevisions;
    }

    async function buildEntireTreeFromGivenRevisionHash(revisionHash: string) {
        const visitedHashes = new Set<string>();
        const revisionTree: Array<{ revisionHash: string, children: Array<string>, data: any }> = [];

        // Helper function to traverse backwards through previous revisions
        async function traverseBackwards(hash: string): Promise<void> {
            if (visitedHashes.has(hash)) return;

            const revisionData = await prisma.revision.findUnique({
                select: {
                    children: true,
                    previous: true
                },
                where: {
                    pubkey_hash: hash
                }
            });

            if (!revisionData) return;

            visitedHashes.add(hash);
            revisionTree.push({
                revisionHash: hash,
                children: revisionData.children,
                data: revisionData
            });

            // If there's a previous revision, traverse backwards
            if (revisionData.previous) {
                await traverseBackwards(revisionData.previous);
            }
        }

        // Helper function to traverse forwards through children revisions
        async function traverseForwards(hash: string): Promise<void> {
            if (visitedHashes.has(hash)) return;

            const revisionData = await prisma.revision.findUnique({
                select: {
                    children: true,
                    previous: true
                },
                where: {
                    pubkey_hash: hash
                }
            });

            if (!revisionData) return;

            visitedHashes.add(hash);
            revisionTree.push({
                revisionHash: hash,
                children: revisionData.children,
                data: revisionData
            });

            // If there are children, traverse each child recursively
            if (revisionData.children && revisionData.children.length > 0) {
                for (const childHash of revisionData.children) {
                    await traverseForwards(childHash);
                }
            }
        }

        // Start by getting the initial revision
        const initialRevision = await prisma.revision.findUnique({
            select: {
                children: true,
                previous: true
            },
            where: {
                pubkey_hash: revisionHash
            }
        });

        if (!initialRevision) {
            return revisionTree; // Return empty array if revision not found
        }

        // Add the starting revision to visited set and tree
        visitedHashes.add(revisionHash);
        revisionTree.push({
            revisionHash: revisionHash,
            children: initialRevision.children,
            data: initialRevision
        });

        // Traverse backwards through previous revisions
        if (initialRevision.previous) {
            await traverseBackwards(initialRevision.previous);
        }

        // Traverse forwards through all children recursively
        if (initialRevision.children && initialRevision.children.length > 0) {
            for (const childHash of initialRevision.children) {
                await traverseForwards(childHash);
            }
        }

        let orderedRevisions = orderRevisionsFromGenesisToLatest(revisionTree)

        return orderedRevisions;
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

    // Get user data stats
    fastify.get('/tree/per_type', {
        preHandler: authenticate
    }, async (request: AuthenticatedRequest, reply) => {
        const userAddress = request.user?.address;

        const { claim_types, wallet_address } = request.query as { claim_types: string, wallet_address?: string };

        const claimTypes = JSON.parse(claim_types)

        const invalidClaimTypes = confirmThatAllClaimTypesAreValid(claimTypes)
        let cleanedWalletAddress = wallet_address
        if(wallet_address){
            cleanedWalletAddress = ethers.getAddress(wallet_address)
        }

        if (invalidClaimTypes.length > 0) {
            return reply.code(400).send({ error: 'Invalid claim types', invalidClaimTypes });
        }

        if (!userAddress) {
            return reply.code(401).send({ error: 'Unauthorized' });
        }

        const queryStart = performance.now()
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
        if(cleanedWalletAddress){
            const genesisFormRevisions = await prisma.revision.findMany({
                select: {
                    pubkey_hash: true
                },
                where: {
                    pubkey_hash: {
                        startsWith: userAddress
                    },
                    revision_type: {
                        equals: "form"
                    },
                    previous: "", // Genesis revisions have no previous
                    AquaForms: {
                        some: {
                            value: {
                                string_contains: cleanedWalletAddress
                            }
                        }
                    }
                }
            });
            
            genesisFormHashes = genesisFormRevisions.map(rev => rev.pubkey_hash);
            console.log(cliGreenify(`Found ${genesisFormHashes.length} genesis form revisions containing wallet address`));
        }

        // Build the where clause for link revisions
        let linkWhereClause: any = {
            pubkey_hash: {
                startsWith: userAddress
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

        console.log(cliRedify(JSON.stringify(genesisFormHashes, null, 2)))

        // If we have genesis form hashes, filter links that reference them
        if(genesisFormHashes.length > 0){
            linkWhereClause.previous = {
                in: genesisFormHashes
            }
        }

        console.log(cliRedify(JSON.stringify(linkWhereClause, null, 2)))

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

        const queryEnd = performance.now()
        const queryDuration = (queryEnd - queryStart) / 1000
        Logger.info(`Query duration: ${queryDuration} seconds`)
        console.log(cliGreenify(`Query duration: ${queryDuration} seconds`))

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

}
