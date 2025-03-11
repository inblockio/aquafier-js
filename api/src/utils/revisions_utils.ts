

import { prisma } from '../database/db';
// For specific model types
import { User, Latest, Revision } from '@prisma/client';

export async function findAquaTreeRevision(revisionHash: string): Promise<Array<Revision>> {
    let revisions: Array<Revision> = [];

    // fetch latest revision 
    let latestRevionData = await prisma.revision.findFirst({
        where: {
            pubkey_hash: revisionHash
        }
    });

    if (latestRevionData == null){
        throw new Error(`Unable to get revision with hash ${latestRevionData}`);
        
    }

    revisions.push(latestRevionData);

    if (latestRevionData?.previous?.length != 0) {
        let aquaTreerevision =await findAquaTreeRevision(latestRevionData?.previous!!);
        revisions.push(...aquaTreerevision)
    }

    return revisions;
}