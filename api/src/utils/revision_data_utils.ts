import {
    AquaTree,
    FileObject,
    Revision as AquaRevision} from 'aqua-js-sdk';

import {prisma} from '../database/db';
// For specific model types
import {AquaForms, Link, Prisma, Revision, Signature, WitnessEvent} from '@prisma/client';
import path from 'path';
import {AquaTreeFileData} from '../models/types';
import {getFileSize} from "./file_utils";
import Logger from "./logger";

// Define a union type for all possible return types
export type RevisionInfo =
    | Prisma.SignatureGetPayload<{}>
    | Prisma.WitnessEventGetPayload<{}>
    | Prisma.LinkGetPayload<{}>
    | Prisma.AquaFormsGetPayload<{}>[]
    | null;

export async function FetchRevisionInfo(hash: string, revision: Revision): Promise<RevisionInfo> {
    // Logger.info(`⚠️⚠️ hash ${hash} `)
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
        // Logger.info("Witness: ", res);
        if (res == null) {
            // throw new Error(`witness is null ${revision.revision_type}`);
            Logger.info(`☢️☢️ witness is null with hash ${hash}`);
            return null;
        }
        return await prisma.witnessEvent.findFirst({
            where: {
                Witness_merkle_root: res.Witness_merkle_root!
            }
        });
    } else if (revision.revision_type == "form") {
        // Logger.info(`form where hash is ${hash}`)
        return await prisma.aquaForms.findMany({
            where: {
                hash: hash
            }
        });
    } else if (revision.revision_type == "link") {
        return await prisma.link.findFirst({
            where: {
                hash: hash
            }
        });
    } else {
        // Logger.info(`type ${revision.revision_type} with hash ${hash}`);
        return null;
    }
}

// Option 1: Batch version of FetchRevisionInfo
export async function FetchRevisionInfoBatch(revisions: Revision[]): Promise<Map<string, RevisionInfo>> {
    const revisionInfoMap = new Map<string, RevisionInfo>();

    // Group revisions by type for batch queries
    const signatureHashes: string[] = [];
    const witnessHashes: string[] = [];
    const formHashes: string[] = [];
    const linkHashes: string[] = [];

    for (const revision of revisions) {
        switch (revision.revision_type) {
            case "signature":
                signatureHashes.push(revision.pubkey_hash);
                break;
            case "witness":
                witnessHashes.push(revision.pubkey_hash);
                break;
            case "form":
                formHashes.push(revision.pubkey_hash);
                break;
            case "link":
                linkHashes.push(revision.pubkey_hash);
                break;
        }
    }

    // Execute batch queries in parallel
    const [signatures, witnesses, forms, links] = await Promise.all([
        signatureHashes.length > 0 ? prisma.signature.findMany({
            where: { hash: { in: signatureHashes } }
        }) : Promise.resolve([]),

        witnessHashes.length > 0 ? prisma.witness.findMany({
            where: { hash: { in: witnessHashes } }
        }) : Promise.resolve([]),

        formHashes.length > 0 ? prisma.aquaForms.findMany({
            where: { hash: { in: formHashes } }
        }) : Promise.resolve([]),

        linkHashes.length > 0 ? prisma.link.findMany({
            where: { hash: { in: linkHashes } }
        }) : Promise.resolve([])
    ]);

    // Map results back to revision hashes
    signatures.forEach(sig => revisionInfoMap.set(sig.hash, sig));
    witnesses.forEach(wit => revisionInfoMap.set(wit.hash, wit as unknown as RevisionInfo));
    links.forEach(link => revisionInfoMap.set(link.hash, link));

    // Group forms by hash (since findMany can return multiple forms per hash)
    const formsByHash = new Map<string, any[]>();
    forms.forEach(form => {
        if (!formsByHash.has(form.hash)) {
            formsByHash.set(form.hash, []);
        }
        formsByHash.get(form.hash)!.push(form);
    });
    formsByHash.forEach((formArray, hash) => {
        revisionInfoMap.set(hash, formArray);
    });

    // Handle witness events for witnesses
    if (witnesses.length > 0) {
        const witnessRoots = witnesses
            .map(w => w.Witness_merkle_root)
            .filter((root): root is string => root !== null && root !== undefined);
        if (witnessRoots.length > 0) {
            const witnessEvents = await prisma.witnessEvent.findMany({
                where: { Witness_merkle_root: { in: witnessRoots } }
            });

            // Map witness events back to original hashes
            witnesses.forEach(witness => {
                if (witness.Witness_merkle_root) {
                    const event = witnessEvents.find(e => e.Witness_merkle_root === witness.Witness_merkle_root);
                    if (event) {
                        revisionInfoMap.set(witness.hash, event);
                    }
                }
            });
        }
    }

    return revisionInfoMap;
}

export function deleteChildrenFieldFromAquaTrees(aquaTrees: Array<{ aquaTree: AquaTree, fileObject: FileObject[] }>) {
    return aquaTrees.map(item => {
        const cleanedRevisions: any = {};
        Object.keys(item.aquaTree.revisions).forEach(key => {
            const itemRevision = item.aquaTree.revisions[key];
            const { children, verification_leaves, ...revisionWithoutChildren } = itemRevision;
            cleanedRevisions[key] = {
                ...revisionWithoutChildren,
                leaves: verification_leaves || itemRevision.leaves
            };
        });

        return {
            aquaTree: {
                ...item.aquaTree,
                revisions: cleanedRevisions
            },
            fileObject: item.fileObject
        };
    });
}

// Option 2: Helper functions for merging results
export function mergeAquaTrees(aquaTrees: AquaTree[]): AquaTree {
    const mergedTree: AquaTree = {
        revisions: {},
        file_index: {}
    };

    for (const tree of aquaTrees) {
        // Merge revisions
        Object.assign(mergedTree.revisions, tree.revisions);

        // Merge file_index
        Object.assign(mergedTree.file_index, tree.file_index);
    }

    return mergedTree;
}

export function mergeFileObjects(fileObjectArrays: FileObject[][]): FileObject[] {
    const mergedObjects: FileObject[] = [];
    const seenFileNames = new Set<string>();

    for (const fileArray of fileObjectArrays) {
        for (const fileObj of fileArray) {
            // Avoid duplicates based on fileName
            if (!seenFileNames.has(fileObj.fileName)) {
                seenFileNames.add(fileObj.fileName);
                mergedObjects.push(fileObj);
            }
        }
    }

    return mergedObjects;
}

// Utility functions
export function extractHashOnly(pubkeyHash: string): string {
    if (!pubkeyHash) return "";
    const parts = pubkeyHash.split("_");
    return parts.length > 1 ? parts[1] : pubkeyHash;
}

export function estimateStringFileSize(str: string): number {
    if (!str) return 0;

    return str.split('').reduce((acc, char) => {
        const code = char.charCodeAt(0);
        // UTF-8 encoding rules:
        // 1 byte for ASCII (0-127)
        // 2 bytes for extended ASCII (128-2047)
        // 3 bytes for most other characters (2048-65535)
        // 4 bytes for remaining Unicode (65536+)
        if (code < 128) return acc + 1;
        if (code < 2048) return acc + 2;
        if (code < 65536) return acc + 3;
        return acc + 4;
    }, 0);
}

export async function fetchAquaTreeFileData(pubKeyHashes: string[]): Promise<AquaTreeFileData[]> {
    if (pubKeyHashes.length === 0) return [];

    // Collect all hashOnly values
    const hashOnlyValues = pubKeyHashes.map(h => extractHashOnly(h));

    // Batch query 1: FileIndex (pubkey_hash is String[] — use hasSome)
    const allFileIndexes = await prisma.fileIndex.findMany({
        where: {
            OR: [
                { pubkey_hash: { hasSome: pubKeyHashes } },
                { pubkey_hash: { hasSome: hashOnlyValues } }
            ]
        }
    });

    // Batch query 2: FileName (pubkey_hash is String scalar — use in for exact matches)
    const allFileNames = await prisma.fileName.findMany({
        where: {
            OR: [
                { pubkey_hash: { in: pubKeyHashes } },
                { pubkey_hash: { in: hashOnlyValues } }
            ]
        }
    });

    // Batch query 3: File (by unique file_hashes from fileIndex results)
    const uniqueFileHashes = [...new Set(allFileIndexes.map(fi => fi.file_hash))];
    const allFiles = uniqueFileHashes.length > 0
        ? await prisma.file.findMany({ where: { file_hash: { in: uniqueFileHashes } } })
        : [];

    // Build lookup maps
    const fileMap = new Map(allFiles.map(f => [f.file_hash, f]));
    const fileNameMap = new Map(allFileNames.map(fn => [fn.pubkey_hash, fn]));

    const allData: AquaTreeFileData[] = [];

    for (const pubKeyHash of pubKeyHashes) {
        const hashOnly = extractHashOnly(pubKeyHash);

        // Find matching fileIndex (check if any pubkey_hash entry matches)
        const fileIndex = allFileIndexes.find(fi =>
            fi.pubkey_hash.includes(pubKeyHash) || fi.pubkey_hash.includes(hashOnly)
        );

        if (fileIndex) {
            // Look up fileName: try exact match first, then hashOnly match
            let fileNameData = fileNameMap.get(pubKeyHash) ?? fileNameMap.get(hashOnly);

            // Fallback: case-insensitive contains match for hashOnly
            if (!fileNameData) {
                const hashOnlyLower = hashOnly.toLowerCase();
                fileNameData = allFileNames.find(fn =>
                    fn.pubkey_hash.toLowerCase().includes(hashOnlyLower)
                );

                // Last resort: individual query with case-insensitive DB match
                if (!fileNameData) {
                    fileNameData = await prisma.fileName.findFirst({
                        where: {
                            pubkey_hash: {
                                contains: hashOnly,
                                mode: 'insensitive'
                            }
                        }
                    }) ?? undefined;
                }
            }

            const fileData = fileMap.get(fileIndex.file_hash);

            allData.push({
                name: fileNameData?.file_name ?? "File name not found",
                fileHash: fileIndex.file_hash,
                referenceCount: fileIndex.pubkey_hash.length,
                fileLocation: fileData?.file_location ?? "File location not found",
                pubKeyHash: pubKeyHash
            });
        } else {
            Logger.error(`File index not found ..pubKeyHash ${pubKeyHash} --  ${hashOnly}`);
        }
    }

    return allData;
}

export async function createFileObjects(aquaTreesFileData: AquaTreeFileData[], url: string): Promise<FileObject[]> {
    const fileObjects: FileObject[] = [];
    for (const item of aquaTreesFileData) {
        try {
            const fileStats = await getFileStats(item.fileLocation);
            if (!fileStats) continue;
            const fullUrl = `${url}/files/${item.fileHash}`;

            fileObjects.push({
                fileContent: fullUrl,
                fileName: item.name, // No uri in schema, use file_hash
                path: "",//item.fileLocation,
                fileSize: fileStats.fileSizeInBytes
            });
        } catch (error : any) {
            Logger.error(`Error processing file with hash ${item.fileHash} pub key hash ${item.pubKeyHash} :`, error);
        }
    }
    return fileObjects;
}

export async function getFileStats(filePath: string): Promise<{ fileSizeInBytes: number; originalFilename: string; } | null> {
    try {
        const fullFilename = path.basename(filePath);
        const originalFilename = fullFilename.substring(fullFilename.indexOf('-') + 1);

        let size = await getFileSize(filePath);
        if (!size) {
            size = -1
        }
        return {
            fileSizeInBytes: size,
            originalFilename
        };
    } catch (error : any) {
        Logger.error(`Error getting file stats for ${filePath}:`, error);
        return null;
    }
}
