import { prisma } from "../database/db";
import { TEMPLATE_HASHES } from "../models/constants";
import logger from "./logger";
import fs from "fs/promises"


export const calculateStorageUsage = async (userAddress: string) => {

    // Step 1: Fetch latest records (1 query)
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
        orderBy: {
            createdAt: 'desc'
        }
    });

    const formTypesToTrack: Record<string, number> = {}
    for (const formType of Object.keys(TEMPLATE_HASHES)) {
        formTypesToTrack[formType] = 0
    }

    if (latestRecords.length === 0) {
        return { totalFiles: 0, formTypesToTrack, storageUsage: 0 }
    }

    // Step 2: Batch-load ALL user revisions into memory (1 query instead of N*chain_depth)
    const allRevisionsList = await prisma.revision.findMany({
        where: { pubkey_hash: { startsWith: userAddress } }
    });
    const revisionMap = new Map(allRevisionsList.map(r => [r.pubkey_hash, r]));

    // Build reverse index: normalized previous -> child revisions
    const childrenOf = new Map<string, typeof allRevisionsList>();
    for (const r of allRevisionsList) {
        if (!r.previous || r.previous === "") continue;
        let normalizedPrev = r.previous;
        if (!normalizedPrev.includes("_")) {
            const pubKey = r.pubkey_hash.split("_")[0];
            normalizedPrev = `${pubKey}_${normalizedPrev}`;
        }
        if (!childrenOf.has(normalizedPrev)) childrenOf.set(normalizedPrev, []);
        childrenOf.get(normalizedPrev)!.push(r);
    }

    // Walk chain in memory to find genesis revision
    function findGenesis(startHash: string): typeof allRevisionsList[0] | null {
        let current = revisionMap.get(startHash);
        if (!current) return null;
        const visited = new Set<string>();
        while (current && current.previous && current.previous !== "") {
            if (visited.has(current.pubkey_hash)) break;
            visited.add(current.pubkey_hash);
            let prevKey = current.previous;
            if (!prevKey.includes("_")) {
                const pubKey = current.pubkey_hash.split("_")[0];
                prevKey = `${pubKey}_${prevKey}`;
            }
            const prev = revisionMap.get(prevKey);
            if (!prev) break;
            current = prev;
        }
        return (current?.previous == null || current?.previous === "") ? current : null;
    }

    // Step 3: Find genesis for each latest record (in-memory, 0 queries)
    const genesisHashes: string[] = [];
    const genesisRevisions: typeof allRevisionsList = [];
    for (const record of latestRecords) {
        if (!revisionMap.has(record.hash)) continue;
        const genesis = findGenesis(record.hash);
        if (genesis) {
            genesisHashes.push(genesis.pubkey_hash);
            genesisRevisions.push(genesis);
        }
    }

    // Step 4: Batch-fetch all aquaForms for genesis revisions (1 query instead of N)
    const allAquaForms = genesisHashes.length > 0
        ? await prisma.aquaForms.findMany({ where: { hash: { in: genesisHashes } } })
        : [];
    const aquaFormsByHash = new Map<string, typeof allAquaForms>();
    for (const form of allAquaForms) {
        if (!aquaFormsByHash.has(form.hash)) aquaFormsByHash.set(form.hash, []);
        aquaFormsByHash.get(form.hash)!.push(form);
    }

    // Build allUserRevisions array
    type UserRevision = {
        pubkey_hash: string;
        previous: string | null;
        AquaForms: { key: string | null }[];
        isAquaSign: boolean;
    };
    const allUserRevisions: UserRevision[] = [];
    for (const genesis of genesisRevisions) {
        const forms = aquaFormsByHash.get(genesis.pubkey_hash) || [];
        const hasFormsSigners = forms.some(f => f.key === "forms_signers");
        allUserRevisions.push({
            pubkey_hash: genesis.pubkey_hash,
            previous: genesis.previous,
            AquaForms: forms,
            isAquaSign: hasFormsSigners
        });
    }

    // Step 5: Batch file size calculation
    // 5a: Batch-fetch fileIndex records for all genesis hashes (1 query instead of N)
    const allFileIndexRecords = genesisHashes.length > 0
        ? await prisma.fileIndex.findMany({ where: { pubkey_hash: { hasSome: genesisHashes } } })
        : [];
    const fileIndexByPubkeyHash = new Map<string, typeof allFileIndexRecords[0]>();
    for (const fi of allFileIndexRecords) {
        for (const pkh of fi.pubkey_hash) {
            fileIndexByPubkeyHash.set(pkh, fi);
        }
    }

    // 5b: For aquaSign revisions, walk chain in memory and collect link hashes
    const aquaSignThirdHashes: string[] = [];
    const aquaSignThirdMap = new Map<string, string>(); // genesisHash -> thirdRevisionHash
    for (const rev of allUserRevisions) {
        if (!rev.isAquaSign) continue;
        const secondRevs = childrenOf.get(rev.pubkey_hash);
        const secondRev = secondRevs?.[0];
        if (!secondRev) continue;
        const thirdRevs = childrenOf.get(secondRev.pubkey_hash);
        const thirdRev = thirdRevs?.[0];
        if (!thirdRev) continue;
        aquaSignThirdHashes.push(thirdRev.pubkey_hash);
        aquaSignThirdMap.set(rev.pubkey_hash, thirdRev.pubkey_hash);
    }

    // Batch-fetch links for aquaSign third revisions (1 query instead of N)
    const allLinks = aquaSignThirdHashes.length > 0
        ? await prisma.link.findMany({ where: { hash: { in: aquaSignThirdHashes } } })
        : [];
    const linkByHash = new Map(allLinks.map(l => [l.hash, l]));

    // Collect all file hashes needed
    const fileHashSet = new Set<string>();
    for (const fi of allFileIndexRecords) fileHashSet.add(fi.file_hash);
    for (const link of allLinks) {
        if (link.link_file_hashes[0]) fileHashSet.add(link.link_file_hashes[0]);
    }

    // Batch-fetch ALL file records (1 query instead of N)
    const allFileHashArray = Array.from(fileHashSet);
    const allFiles = allFileHashArray.length > 0
        ? await prisma.file.findMany({ where: { file_hash: { in: allFileHashArray } } })
        : [];
    const fileByHash = new Map(allFiles.map(f => [f.file_hash, f]));

    // Calculate file sizes (async stat calls)
    let allFilesSizes = 0;
    for (const rev of allUserRevisions) {
        // Main file size
        const fi = fileIndexByPubkeyHash.get(rev.pubkey_hash);
        if (fi) {
            const file = fileByHash.get(fi.file_hash);
            if (file) {
                try {
                    const stats = await fs.stat(file.file_location!);
                    allFilesSizes += stats.size;
                } catch (err) {
                    logger.error(`Error getting file size for ${file.file_location}: ${err}`);
                }
            }
        }

        // AquaSign additional file
        if (rev.isAquaSign) {
            const thirdHash = aquaSignThirdMap.get(rev.pubkey_hash);
            if (!thirdHash) continue;
            const link = linkByHash.get(thirdHash);
            const linkFileHash = link?.link_file_hashes[0];
            if (!linkFileHash) continue;
            const file = fileByHash.get(linkFileHash);
            if (file) {
                try {
                    const stats = await fs.stat(file.file_location!);
                    allFilesSizes += stats.size;
                } catch (err) {
                    logger.error(`Error getting file size for ${file.file_location}: ${err}`);
                }
            }
        }
    }

    // Step 6: Link revisions and form type counting (already batched in original)
    const allRevisionHashes = allUserRevisions.map(revision => revision.pubkey_hash)

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
        where: {
            previous: {
                in: allRevisionHashes
            },
            revision_type: {
                equals: "link"
            }
        }
    })

    const formTypesToTrackKeys = Object.keys(formTypesToTrack)

    for (const linkRevision of linkRevisions) {
        for (const link of linkRevision.Link) {
            for (const verificationHash of link.link_verification_hashes) {
                for (const formType of formTypesToTrackKeys) {
                    const templateHash = TEMPLATE_HASHES[formType as keyof typeof TEMPLATE_HASHES]
                    if (verificationHash === templateHash) {
                        formTypesToTrack[formType]++
                        break
                    }
                }
            }
        }
    }

    const totalFiles = latestRecords.length;

    return {
        totalFiles,
        formTypesToTrack,
        storageUsage: allFilesSizes
    }
}
