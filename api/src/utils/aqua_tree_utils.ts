import Aquafier, { AquaTree, OrderRevisionInAquaTree } from 'aqua-js-sdk';
// For specific model types
import { FileIndex } from '@prisma/client';
import Logger from "./logger";
import { prisma } from '../database/db';
import fs from 'fs';
import { randomUUID } from 'crypto';
import path from 'path';
import { getFileUploadDirectory } from './file_utils';

export const getLastRevisionVerificationHash = (aquaTree: AquaTree) => {
    const orderedRevisions = OrderRevisionInAquaTree(aquaTree)
    const revisonHashes = Object.keys(orderedRevisions.revisions)
    const hash = revisonHashes[revisonHashes.length - 1]
    return hash
}


export function removeFilePathFromFileIndex(aquaTree: AquaTree): AquaTree {


    // Create a new file_index object
    const processedFileIndex: FileIndex | any = {};

    // Loop through each entry in the file_index
    for (const [hash, value] of Object.entries(aquaTree.file_index)) {
        // Check if the value looks like a path (contains / or \)
        if (typeof value === 'string' && (value.includes('/') || value.includes('\\'))) {
            // Extract just the base filename without path
            const baseName = value.split(/[\/\\]/).pop() || value;
            processedFileIndex[hash] = baseName;
        } else {
            // Keep the original value if it's not a path
            processedFileIndex[hash] = value;
        }
    }

    // Return a new AquaTree with the processed file_index
    return {
        ...aquaTree,
        file_index: processedFileIndex
    };
}


export function getGenesisHash(aquaTree: AquaTree): string | null {
    let aquaTreeGenesisHash: string | null = null;
    let allAquuaTreeHashes = Object.keys(aquaTree!.revisions);

    for (let hash of allAquuaTreeHashes) {
        let revisionItem = aquaTree!.revisions[hash];
        if (revisionItem.previous_verification_hash == "" || revisionItem.previous_verification_hash == null || revisionItem.previous_verification_hash == undefined) {

            aquaTreeGenesisHash = hash //revisionItem.previous_verification_hash
            break;

        }
    }

    return aquaTreeGenesisHash
}

/**
 * Validates an AquaTree object to ensure all required properties exist and are valid
 * @param tree The AquaTree object to validate
 * @returns boolean indicating whether the tree is valid
 */
export function validateAquaTree(tree: AquaTree): [boolean, string] {
    // Check if tree is null or undefined
    if (!tree) {
        return [false, "aqua tree is null"];
    }

    // Check if required top-level properties exist
    if (!tree.revisions || !tree.file_index) {
        return [false, "revsions and file index must exist in an aqua tree"];
    }

    // Check if revisions is a valid object
    if (typeof tree.revisions !== 'object' || Array.isArray(tree.revisions)) {
        return [false, "revision does not contain revisions"];
    }

    // Check if file_index is a valid object
    if (typeof tree.file_index !== 'object' || Array.isArray(tree.file_index)) {
        return [false, "file index does not contain values "];
    }

    // Validate each revision
    for (const hash in tree.revisions) {
        const revision = tree.revisions[hash];

        // Logger.info(`Revision --  ${JSON.stringify(revision)}`)
        // Check required fields for all revisions
        if (revision.previous_verification_hash === undefined || revision.previous_verification_hash === null) {
            return [false, "A revision must contain previous_verification_hash"];
        }
        if (revision.local_timestamp === undefined || revision.local_timestamp === null) {
            return [false, "A revision must contain local_timestamp "];
        }
        if (!revision.revision_type === undefined || revision.local_timestamp === null) {
            return [false, "A revision must contain  revision_type"];
        }

        // Validate revision_type is one of the allowed values
        const validRevisionTypes = ['file', 'witness', 'signature', 'form', 'link'];
        if (!validRevisionTypes.includes(revision.revision_type)) {
            return [false, `unknown revision type ${revision.revision_type}`];
        }

        // Check type-specific required fields
        // Check type-specific required fields
        switch (revision.revision_type) {
            case 'file':
                if (revision.file_hash === undefined || revision.file_hash === null) {
                    return [false, "file revision must contain file_hash"];
                }
                if (revision.file_nonce === undefined || revision.file_nonce === null) {
                    return [false, "file revision must contain file_nonce"];
                }
                break;
            case 'witness':
                if (revision.witness_merkle_root === undefined || revision.witness_merkle_root === null) {
                    return [false, "witness revision must contain witness_merkle_root"];
                }
                if (revision.witness_timestamp === undefined || revision.witness_timestamp === null) {
                    return [false, "witness revision must contain witness_timestamp"];
                }
                if (revision.witness_network === undefined || revision.witness_network === null) {
                    return [false, "witness revision must contain witness_network"];
                }
                if (revision.witness_smart_contract_address === undefined || revision.witness_smart_contract_address === null) {
                    return [false, "witness revision must contain witness_smart_contract_address"];
                }
                if (revision.witness_transaction_hash === undefined || revision.witness_transaction_hash === null) {
                    return [false, "witness revision must contain witness_transaction_hash"];
                }
                if (revision.witness_sender_account_address === undefined || revision.witness_sender_account_address === null) {
                    return [false, "witness revision must contain witness_sender_account_address"];
                }
                break;
            case 'signature':
                if (revision.signature === undefined || revision.signature === null) {
                    return [false, "signature revision must contain signature"];
                }
                if (revision.signature_public_key === undefined || revision.signature_public_key === null) {
                    return [false, "signature revision must contain signature_public_key"];
                }
                if (revision.signature_type === undefined || revision.signature_type === null) {
                    return [false, "signature revision must contain signature_type"];
                }
                break;
            case 'link':
                if (revision.link_type === undefined || revision.link_type === null) {
                    return [false, "link revision must contain link_type"];
                }
                if (revision.link_verification_hashes === undefined || revision.link_verification_hashes === null) {
                    return [false, "link revision must contain link_verification_hashes"];
                }
                if (!Array.isArray(revision.link_verification_hashes)) {
                    return [false, "link revision's link_verification_hashes must be an array"];
                }
                if (revision.link_verification_hashes.length === 0) {
                    return [false, "link revision's link_verification_hashes must not be empty"];
                }
                break;
        }
    }

    // Check if the file_index contains at least one entry
    if (Object.keys(tree.file_index).length === 0) {
        return [false, "file_index is empty"];
    }

    // If all checks pass, return true
    return [true, "valid aqua tree"];
}


export async function saveFileAndCreateOrUpdateFileIndex(walletAddress: string, aquaTree: AquaTree, fileName: string, aquaFileData: Buffer) {
    // let filepubkeyhash = `${session.address}_${genesisHash}`
    let genesisHash = getGenesisHash(aquaTree)
    if (genesisHash == null) {
        throw Error(`genesis hash cannot be null`)
    }

    let filepubkeyhash = `${walletAddress}_${genesisHash}`

    let aquafier = new Aquafier()

    let fileHash = aquafier.getFileHash(aquaFileData)

    let genRevision = aquaTree.revisions[genesisHash]
    if (!genRevision) {
        throw Error(`genesis revision of attested aqua tree canno be null`)
    }
    let aquaTreeFilehash = genRevision[`file_hash`]
    if (fileHash != aquaTreeFilehash) {
        throw Error(`file hash doo not match aquaTreeFilehash ${aquaTreeFilehash} == generated ${fileHash}`)
    }

    let existingFileIndex = await prisma.fileIndex.findFirst({
        where: { file_hash: fileHash },
    });

    // Create unique filename
    await prisma.fileName.upsert({
        where: {
            pubkey_hash: filepubkeyhash,
        },
        create: {
            pubkey_hash: filepubkeyhash,
            file_name: fileName,
        },
        update: {
            file_name: fileName,
        }
    })

    if (existingFileIndex != null) {
        Logger.info(`Update file index counter`)

        await prisma.fileIndex.update({
            where: { file_hash: existingFileIndex.file_hash },
            data: {
                pubkey_hash: [...existingFileIndex.pubkey_hash, filepubkeyhash]//`${session.address}_${genesisHash}`]
            }
        });


    } else {
        const UPLOAD_DIR = getFileUploadDirectory();


        let aquaTreeName = await aquafier.getFileByHash(aquaTree, genesisHash);
        if (aquaTreeName.isOk()) {
            fileName = aquaTreeName.data
        }
        const filename = `${randomUUID()}-${fileName}`;
        const filePath = path.join(UPLOAD_DIR, filename);

        // Save the file
        // await pump(data.file, fs.createWriteStream(filePath))
        await fs.promises.writeFile(filePath, aquaFileData);


        await prisma.file.create({
            data: {

                file_hash: fileHash,
                file_location: filePath,

            }
        })

        await prisma.fileIndex.create({
            data: {

                pubkey_hash: [filepubkeyhash],
                file_hash: fileHash,

            }
        })


    }
}