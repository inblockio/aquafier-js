import {
    AquaTree,
    FileObject,
    OrderRevisionInAquaTree,
    reorderAquaTreeRevisionsProperties,
    Revision as AquaTreeRevision,
} from 'aqua-js-sdk';
import { prisma } from '../database/db';
import { AquaForms, Link, Revision as DBRevision, Signature, WitnessEvent } from '@prisma/client';
import { createAquaTreeFromRevisions, deleteChildrenFieldFromAquaTrees } from './revisions_operations_utils';
import { getAquaTreeFileName } from './api_utils';
import Logger from './logger';

export async function getSignatureAquaTrees(userAddress: string, url: string): Promise<Array<{
    aquaTree: AquaTree,
    fileObject: FileObject[]
}>> {

    let latest = await prisma.latest.findMany({
        where: {
            user: userAddress
        }
    });

    let signatureAquaTrees: Array<{
        aquaTree: AquaTree,
        fileObject: FileObject[]
    }> = []
    if (latest.length != 0) {
        let systemAquaTrees = await fetchAquatreeFoUser(url, latest);
        for (let item of systemAquaTrees) {


            //get the second revision
            // check if it a link to signature
            let aquaTreeRevisionsOrderd = OrderRevisionInAquaTree(item.aquaTree)
            let allHashes = Object.keys(aquaTreeRevisionsOrderd.revisions)

            if (allHashes.length >= 1) {
                let secondRevision = aquaTreeRevisionsOrderd.revisions[allHashes[1]]

                if (secondRevision != undefined && secondRevision.revision_type == 'link') {
                    let secondRevision = aquaTreeRevisionsOrderd.revisions[allHashes[1]]

                    if (secondRevision.link_verification_hashes != undefined) {
                        let revisionHash = secondRevision.link_verification_hashes[0]
                        let name = aquaTreeRevisionsOrderd.file_index[revisionHash]

                        if (name == "user_signature.json") {
                            signatureAquaTrees.push(item)
                        }

                    }
                }
            }


        }
    }

    return signatureAquaTrees
}

export async function getUserApiWorkflowFileInfo(
    url: string,
    address: string,
): Promise<{
    data: Array<{
        aquaTree: AquaTree,
        fileObject: FileObject[]
    }>
}> {
    // First, get the total count
    const totalItems = await prisma.latest.count({
        where: {
            AND: {
                user: address,
                template_id: null,
                is_workflow: false
            }
        }
    });

    if (totalItems === 0) {
        return {
            data: [],

        }
    }


    // Fetch only the items needed for this page with sorting
    let latest = await prisma.latest.findMany({
        where: {
            AND: {
                user: address,
                template_id: null,
                is_workflow: false
            }
        },

        orderBy: {
            createdAt: 'desc' // Adjust this based on your sorting preference
        }
    });

    const displayData = await fetchAquatreeFoUser(url, latest)



    return {
        data: displayData,

    };
}

export async function getUserApiFileInfo(
    url: string,
    address: string,
    page: number = 1,
    limit: number = 10
): Promise<{
    data: Array<{
        aquaTree: AquaTree,
        fileObject: FileObject[]
    }>,
    pagination: {
        currentPage: number,
        totalPages: number,
        totalItems: number,
        itemsPerPage: number,
        hasNextPage: boolean,
        hasPreviousPage: boolean,
        startIndex: number,  // Add this
        endIndex: number     // Add this
    }
}> {
    // First, get the total count
    const totalItems = await prisma.latest.count({
        where: {
            AND: {
                user: address,
                template_id: null,
                is_workflow: false
            }
        }
    });


    if (totalItems === 0) {
        return {
            data: [],
            pagination: {
                currentPage: page,
                totalPages: 0,
                totalItems: 0,
                itemsPerPage: limit,
                hasNextPage: false,
                hasPreviousPage: false,
                startIndex: 0,
                endIndex: 0

            }
        }
    }

    // Calculate pagination values
    const totalPages = Math.ceil(totalItems / limit);
    const skip = (page - 1) * limit;

    // Fetch only the items needed for this page with sorting
    let latest = await prisma.latest.findMany({
        where: {
            AND: {
                user: address,
                template_id: null,
                is_workflow: false
            }
        },
        skip: skip,
        take: limit,
        orderBy: {
            createdAt: 'desc'
        }
    });

    const displayData = await fetchAquatreeFoUser(url, latest)

    const startIndex = skip + 1;
    const endIndex = Math.min(skip + limit, totalItems);

    return {
        data: deleteChildrenFieldFromAquaTrees(displayData),
        pagination: {
            currentPage: page,
            totalPages: totalPages,
            totalItems: totalItems,
            itemsPerPage: limit,
            hasNextPage: page < totalPages,
            hasPreviousPage: page > 1,
            startIndex: startIndex,    // Add this
            endIndex: endIndex
        }
    };
}

export async function fetchAquatreeFoUser(url: string, latest: Array<{
    hash: string;
    user: string;
}>): Promise<Array<{
    aquaTree: AquaTree,
    fileObject: FileObject[]
}>> {
    // This function fetches and processes aqua trees for a user
    // based on their latest revision hashes

    let displayData: Array<{
        aquaTree: AquaTree,
        fileObject: FileObject[]
    }> = [];

    // Process each latest revision entry
    for (let revisionLatestItem of latest) {
        // Retrieve the tree starting from the latest hash
        // let userAddress = revisionLatestItem.user
        let [anAquaTree, fileObject] = await createAquaTreeFromRevisions(revisionLatestItem.hash, url);
        // Ensure the tree is properly ordered
        let orderedRevisionProperties = reorderAquaTreeRevisionsProperties(anAquaTree);
        let aquaTreeWithOrderdRevision = OrderRevisionInAquaTree(orderedRevisionProperties);

        // Each latest hash represents a complete chain
        displayData.push({
            aquaTree: aquaTreeWithOrderdRevision,
            fileObject: fileObject
        });
    }

    //rearrange displayData based on filaname in aqua tree
    // Sort displayData based on filenames in the aqua tree
    displayData.sort((a, b) => {
        const filenameA = getAquaTreeFileName(a.aquaTree);
        const filenameB = getAquaTreeFileName(b.aquaTree);
        return filenameA.localeCompare(filenameB);
    });



    return displayData;
}

export async function fetchAquaTreeWithForwardRevisions(latestRevisionHash: string, url: string): Promise<[AquaTree, FileObject[]]> {
    // Fetch the revision chain starting from the latest hash
    const [anAquaTree, fileObject] = await createAquaTreeFromRevisions(latestRevisionHash, url);

    // Reorder the revisions to ensure proper sequence
    let orderRevisionPrpoerties = reorderAquaTreeRevisionsProperties(anAquaTree);
    let aquaTreeWithOrderdRevision = OrderRevisionInAquaTree(orderRevisionPrpoerties);

    // Now check if there are any forward revisions (newer revisions that point to our current latest)
    let revisionData = [];
    let queryHash = latestRevisionHash;

    while (true) {
        // Fetch revision that points to our current latest as its previous
        let forwardRevision = await prisma.revision.findFirst({
            where: {
                previous: queryHash,
            }
        });

        if (forwardRevision == null) {
            break;
        }

        revisionData.push(forwardRevision);
        queryHash = forwardRevision.pubkey_hash;
    }

    // If we found forward revisions, we need to reconstruct the tree with the new latest
    if (revisionData.length > 0) {
        // The last item in revisionData is the newest revision
        const newLatestHash = revisionData[revisionData.length - 1].pubkey_hash;
        Logger.info(`Found newer revisions. New latest hash: ${newLatestHash}`);

        // Reconstruct the tree from the new latest hash
        const [updatedAquaTree, updatedFileObject] = await createAquaTreeFromRevisions(newLatestHash, url);

        // Reorder the updated tree
        let updatedOrderedTree = reorderAquaTreeRevisionsProperties(updatedAquaTree);
        let updatedSortedTree = OrderRevisionInAquaTree(updatedOrderedTree);

        return [updatedSortedTree, updatedFileObject];
    }

    return [aquaTreeWithOrderdRevision, fileObject];
}


export async function findAquaTreeRevision(revisionHash: string): Promise<Array<DBRevision>> {
    const revisions: Array<DBRevision> = [];
    let currentHash: string | null = revisionHash;

    while (currentHash) {
        const revision: DBRevision | null = await prisma.revision.findFirst({
            where: { pubkey_hash: currentHash }
        });

        if (!revision) {
            throw new Error(`Unable to get revision with hash ${currentHash}`);
        }

        revisions.push(revision);

        if (revision.previous) {
            const pubKey: string = currentHash.split("_")[0];
            currentHash = revision.previous.includes("_")
                ? revision.previous
                : `${pubKey}_${revision.previous}`;
        } else {
            currentHash = null;
        }
    }

    return revisions;
}


export async function FetchRevisionInfo(hash: string, revision: AquaTreeRevision): Promise<Signature | WitnessEvent | AquaForms[] | Link | null> {

    if (revision.revision_type == "signature") {
        return await prisma.signature.findFirst({
            where: {
                hash: hash
            }
        });



    } else if (revision.revision_type == "witness") {
        let res = await prisma.witness.findFirst({
            where: {
                hash: hash
            }
        });
        Logger.info("Witness: ", res)
        if (res == null) {
            throw new Error(`witness is null ${revision.revision_type}`);
        }
        return await prisma.witnessEvent.findFirst({
            where: {
                Witness_merkle_root: res.Witness_merkle_root!
            }
        });


    } else if (revision.revision_type == "form") {

        return await prisma.aquaForms.findMany({
            where: {
                hash: hash
            }
        })

    } else if (revision.revision_type == "link") {

        return await prisma.link.findFirst({
            where: {
                hash: hash
            }
        })
    } else {

        // Logger.info(`type ${revision.revision_type} with hash ${hash}`)
        return null
        // throw new Error(`implment for ${revision.revision_type}`);

    }
}


export async function buildEntireTreeFromGivenRevisionHash(revisionHash: string) {
    const visitedHashes = new Set<string>();
    const revisionTree: Array<{ revisionHash: string, children: Array<string>, data: any }> = [];

    // Helper function to traverse backwards through previous revisions
    // Also traverses children of each visited node to handle cases where
    // the initial node's children array might be incomplete
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

        // Also traverse children from this node to catch forward revisions
        // This handles cases where children arrays might be incomplete
        if (revisionData.children && revisionData.children.length > 0) {
            for (const childHash of revisionData.children) {
                await traverseForwards(childHash);
            }
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

    // Fallback: Find any revisions that reference our visited revisions as their previous
    // This handles cases where children arrays were not properly populated (legacy data)
    // Extract user address prefix from the revision hash
    const userAddressPrefix = revisionHash.split('_')[0];
    let foundNewRevisions = true;
    while (foundNewRevisions) {
        foundNewRevisions = false;
        const visitedHashesArray = Array.from(visitedHashes);

        // Query for revisions that have any of our visited hashes as their previous
        const forwardRevisions = await prisma.revision.findMany({
            select: {
                pubkey_hash: true,
                children: true,
                previous: true
            },
            where: {
                pubkey_hash: {
                    startsWith: userAddressPrefix
                },
                previous: {
                    in: visitedHashesArray
                },
                NOT: {
                    pubkey_hash: {
                        in: visitedHashesArray
                    }
                }
            }
        });

        // Add newly discovered revisions to the tree
        for (const revision of forwardRevisions) {
            if (!visitedHashes.has(revision.pubkey_hash)) {
                visitedHashes.add(revision.pubkey_hash);
                revisionTree.push({
                    revisionHash: revision.pubkey_hash,
                    children: revision.children,
                    data: revision
                });
                foundNewRevisions = true;
            }
        }
    }

    let orderedRevisions = orderRevisionsFromGenesisToLatest(revisionTree)

    return orderedRevisions;
}


export function orderRevisionsFromGenesisToLatest(revisionTree: Array<{ revisionHash: string, children: Array<string>, data: any }>) {
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
