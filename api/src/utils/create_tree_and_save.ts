import Aquafier, { AquaOperationData, AquaTree, AquaTreeWrapper, FileObject, LogData, Result, Revision } from 'aqua-js-sdk';
import { prisma } from '../database/db';
import { getFileUploadDirectory, persistFile } from './file_utils';
import { randomUUID } from 'crypto';
import { getGenesisHash } from './aqua_tree_utils';
import { dummyCredential, getServerWalletInformation } from './server_utils';
import Logger from './logger';
import { saveAquaTree } from './revisions_utils';

export interface CreateTreeAndSaveParams {
    walletAddress: string;
    fileBuffer: Buffer | Uint8Array;
    filename: string;
    isForm: boolean;
    enableContent: boolean;
    enableScalar: boolean;
    host: string;
    protocol: string;
    serverAutoSign?: boolean;
}

export interface CreateTreeAndSaveResult {
    aquaTree: AquaTree;
    fileObject: FileObject;
}

export async function createTreeAndSave(params: CreateTreeAndSaveParams): Promise<CreateTreeAndSaveResult> {
    const {
        walletAddress,
        fileBuffer,
        filename,
        isForm,
        enableContent,
        enableScalar,
        host,
        protocol
    } = params;

    const aquafier = new Aquafier();

    // Prepare file content for Aquafier
    let fileContentForObject: string | Uint8Array;
    let fileSizeInBytes: number;

    if (fileBuffer instanceof Buffer) {
        fileSizeInBytes = fileBuffer.length;
        if (isForm) {
            fileContentForObject = fileBuffer.toString('utf-8');
            Logger.info(`fileBuffer as string: ${fileContentForObject}`);
        } else {
            fileContentForObject = new Uint8Array(fileBuffer);
        }
    } else {
        // Assuming Uint8Array
        fileSizeInBytes = fileBuffer.byteLength;
        fileContentForObject = fileBuffer;
    }

    let fileObjectPar: FileObject = {
        fileContent: fileContentForObject,
        fileName: filename,
        path: "./",
        fileSize: fileSizeInBytes
    };

    let res = await aquafier.createGenesisRevision(
        fileObjectPar,
        isForm,
        enableContent,
        isForm ? false : enableScalar
    );

    if (res.isErr()) {
        const errorMsg = `Error creating genesis revision: ${JSON.stringify(res.data)}`;
        Logger.error(errorMsg);
        throw new Error(errorMsg);
    }

    let signedRes: Result<AquaOperationData, LogData[]> | null = null;

    if (params.serverAutoSign) {
        const serverWalletInformation = await getServerWalletInformation();
        if (serverWalletInformation) {
            const creds = dummyCredential();
            creds.mnemonic = serverWalletInformation.mnemonic;
            const aquaTree = res.data.aquaTree!!;
            const aquaTreeWrapper: AquaTreeWrapper = {
                aquaTree: aquaTree,
                fileObject: fileObjectPar,
                revision: ""
            };
            signedRes = await aquafier.signAquaTree(aquaTreeWrapper, "cli", creds);
        } else {
            Logger.error("Server wallet information not found, skipping server signing");
        }
    }

    if (signedRes && signedRes.isErr()) {
        const errorMsg = `Error creating genesis revision: ${JSON.stringify(res.data)}`;
        Logger.error(errorMsg);
        throw new Error(errorMsg);
    }

    let resData: AquaTree = signedRes!.data.aquaTree!!;

    let genesisHash = getGenesisHash(resData);

    if (!genesisHash) {
        Logger.error(`Genesis-Hash is empty!`);
        throw new Error('Genesis revision cannot be found');
    }

    let revisionData: Revision = resData.revisions[genesisHash];
    let fileHash = revisionData.file_hash;

    if (!fileHash) {
        Logger.error(`File hash missing from AquaTree response`);
        throw new Error("File hash missing from AquaTree response");
    }

    const urlPath = `/files/${fileHash}`;
    const fullUrl = `${protocol}://${host}${urlPath}`;

    let fileObject: FileObject = {
        fileContent: fullUrl,
        fileName: filename,
        path: "./",
        fileSize: fileSizeInBytes
    };

    try {
        let filepubkeyhash = `${walletAddress}_${genesisHash}`;

        let existingFileIndex = await prisma.fileIndex.findFirst({
            where: { file_hash: fileHash },
        });

        if (existingFileIndex) {
            existingFileIndex.pubkey_hash = [...existingFileIndex.pubkey_hash, `${walletAddress}_${genesisHash}`];
            await prisma.fileIndex.update({
                data: existingFileIndex,
                where: {
                    file_hash: existingFileIndex.file_hash
                }
            });
        } else {
            const UPLOAD_DIR = getFileUploadDirectory();
            // Create unique filename
            const uniqueFilename = `${randomUUID()}-${filename}`;
            const filePath = await persistFile(UPLOAD_DIR, uniqueFilename, fileBuffer instanceof Uint8Array ? Buffer.from(fileBuffer) : fileBuffer);

            await prisma.file.upsert({
                where: {
                    file_hash: fileHash,
                },
                create: {
                    file_hash: fileHash,
                    file_location: filePath,
                },
                update: {
                    file_hash: fileHash,
                    file_location: filePath,
                }
            });

            await prisma.fileIndex.create({
                data: {
                    pubkey_hash: [filepubkeyhash],
                    file_hash: fileHash,
                }
            });
        }
        await prisma.fileName.upsert({
            where: {
                pubkey_hash: filepubkeyhash,
            },
            create: {
                pubkey_hash: filepubkeyhash,
                file_name: filename,
            },
            update: {
                pubkey_hash: filepubkeyhash,
                file_name: filename,
            }
        });

        // Finally, we save the aquaTree
        await saveAquaTree(resData, walletAddress, null, false)

    } catch (error: any) {
        Logger.error(`error saving tree ${error}`);
        throw new Error(`Error saving genesis revision: ${error.message}`);
    }

    return {
        aquaTree: resData,
        fileObject: fileObject
    };
}
