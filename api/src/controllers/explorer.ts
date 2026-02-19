import Aquafier, { AquaTree, AquaTreeWrapper, cliRedify, FileObject, LogData, LogType, OrderRevisionInAquaTree, Revision } from 'aqua-js-sdk';
import { FastifyInstance } from 'fastify';
import { prisma } from '../database/db';
import { getFileUploadDirectory, persistFile, streamToBuffer } from '../utils/file_utils';
import path from 'path';
import JSZip from "jszip";
import { randomUUID } from 'crypto';
import * as fs from "fs"
import {
    deleteAquaTreeFromSystem,
    fetchAquatreeFoUser,
    getAquaFiles,
    getUserApiFileInfo,
    isWorkFlowData,
    processAllAquaFiles, 
    processAquaFiles,
    processAquaMetadata,
    processRegularFiles,
    saveAquaTree,
    transferRevisionChainData
} from '../utils/revisions_utils';
import { getAquaTreeFileName, getHost, getPort } from '../utils/api_utils';
import { extractAquaDataFromPdf } from '../utils/pdf_utils';
import { DeleteRevision } from '../models/request_models';
import { usageService } from '../services/usageService';
import { getGenesisHash, removeFilePathFromFileIndex, saveFileAndCreateOrUpdateFileIndex, validateAquaTree } from '../utils/aqua_tree_utils';
// import { systemTemplateHashes } from '../models/constants';
import { dummyCredential, getServerWalletInformation, saveAttestationFileAndAquaTree } from '../utils/server_utils';
import Logger from "../utils/logger";
import { createAquaTreeFromRevisions } from '../utils/revisions_operations_utils';
import { getAddress } from 'ethers';
import { sendNotificationReloadToWallet } from './websocketController2';
import { createNotificationAndSendWebSocketNotification } from '../utils/notification_utils';
import { systemTemplateHashes } from '../models/constants';
import { authenticate, AuthenticatedRequest } from '../middleware/auth_middleware';
// import { saveAquaFile } from '../utils/server_utils';
// import getStream from 'get-stream';
// Promisify pipeline
// const pump = util.promisify(pipeline);

/**
 * Registers Explorer-related HTTP routes on the provided Fastify instance.
 * 
 * This controller attaches endpoints for importing, uploading, listing, deleting,
 * transferring, and merging AquaTree revisions and their associated files. Routes
 * include nonce-based authentication, multipart handling, ZIP and file processing,
 * interaction with the Prisma database, filesystem persistence, Aquafier operations,
 * and optional WebSocket notifications when cross-user events occur.
 *
 * Side effects:
 * - Persists records to the database (revisions, files, indices, names, etc.).
 * - Writes uploaded files to disk.
 * - May send WebSocket messages to notify other users.
 * - Calls external utilities to validate/process AquaTree data and fetch remote chains.
 *
 * HTTP behavior highlights:
 * - Returns 401/403 for missing or invalid nonce headers.
 * - Validates multipart/form-data and enforces file size limits (20MB or 200MB depending on endpoint).
 * - Uses appropriate HTTP status codes for validation, success, and error conditions.
 */
export default async function explorerController(fastify: FastifyInstance) {

    fastify.post('/explorer_aqua_zip', { preHandler: authenticate }, async (request: any, reply: any) => {
        try {
            const userAddress = (request as AuthenticatedRequest).user!.address;

            // Validate multipart request
            if (!request.isMultipart()) {
                return reply.code(400).send({ error: 'Expected multipart form data' });
            }

            // Process file upload
            const data = await request.file();
            if (!data?.file) {
                return reply.code(400).send({ error: 'No file uploaded' });
            }

            // Verify file size (200MB limit)
            const maxFileSize = 200 * 1024 * 1024;
            if (data.file.bytesRead > maxFileSize) {
                return reply.code(413).send({ error: 'File too large. Maximum file size is 200MB' });
            }

            // Process ZIP file
            const fileBuffer = await streamToBuffer(data.file);
            const zip = new JSZip();
            const zipData = await zip.loadAsync(fileBuffer);


            if (!zipData.files['aqua.json']) {

                return reply.code(400).send({ error: 'Invalid ZIP file: Missing aqua.json' });

            }

            let aquaJsonContent = await zipData.files['aqua.json'].async("string");

            if (!aquaJsonContent) {
                return reply.code(400).send({ error: 'Invalid aqua.json content' });
            }

            let aquaJson = JSON.parse(aquaJsonContent);
            if(!aquaJson.type){
                aquaJson.type = "aqua_file_backup"
            }

            if (aquaJson.type !== "aqua_workspace_backup" && aquaJson.type !== "aqua_file_backup") {
                return reply.code(400).send({ error: 'Invalid aqua.json type' });

            }

            if (aquaJson.type !== "aqua_file_backup") {
                return reply.code(400).send({ error: 'Invalid aqua.json type for workspace upload' });
            }
   
            // Process aqua.json metadata first
            await processAquaMetadata(zipData, userAddress);

            const isTemplateId = request.headers['is_template_id'];
            let templateId = null
            if (isTemplateId != undefined || isTemplateId != null || isTemplateId != "") {
                templateId = isTemplateId
            }


            // Process individual .aqua.json files
            await processAquaFiles(zipData, userAddress, templateId);

            // Return response with file info
            const host = request.headers.host || `${getHost()}:${getPort()}`;
            const protocol = request.protocol || 'https';
            const url = `${protocol}://${host}`;
            const displayData = await getUserApiFileInfo(url, userAddress);

            return reply.code(200).send({
                success: true,
                message: 'Aqua tree saved successfully',
                data: displayData
            });

        } catch (error: any) {
            request.log.error(error);
            return reply.code(500).send({
                error: error instanceof Error ? error.message : 'File upload failed'
            });
        }
    });


    fastify.post('/explorer_aqua_file_upload', { preHandler: authenticate }, async (request: AuthenticatedRequest, reply) => {

        const userAddress = request.user!.address;

        // Check if the request is multipart
        const isMultipart = request.isMultipart();

        if (!isMultipart) {
            return reply.code(400).send({ error: 'Expected multipart form data' });
        }

        try {
            // Process the multipart form data
            const parts = request.parts();

            let fileBuffer;
            let assetBuffer = null;
            let hasAsset = false;
            let assetFilename = "";
            let isWorkFlow = false
            let templateId = ""
            let templateName = ""
            let walletAddress = userAddress;
            // Process each part of the multipart form
            for await (const part of parts) {
                if (part.type === 'file') {
                    if (part.fieldname === 'file') {
                        // Verify file size (200MB = 200 * 1024 * 1024 bytes)
                        const maxFileSize = 200 * 1024 * 1024;
                        if (part.file.bytesRead > maxFileSize) {
                            return reply.code(413).send({ error: 'File too large. Maximum file size is 200MB' });
                        }
                        fileBuffer = await streamToBuffer(part.file);
                    } else if (part.fieldname === 'asset') {
                        assetBuffer = await streamToBuffer(part.file);
                        // Extract filename from the asset file
                        assetFilename = part.filename;
                    }
                } else if (part.type === 'field') {
                    if (part.fieldname === 'has_asset') {
                        hasAsset = part.value === 'true';
                    } else if (part.fieldname === 'account') {
                        // Store account if needed for further processing
                        const account = part.value;
                        if (!account || typeof account !== 'string' || account.trim() === '') {
                            return reply.code(400).send({ error: 'Account is required' });
                        }
                        // Verify account matches authenticated user address
                        if (account !== userAddress) {
                            walletAddress = account;
                            // return reply.code(403).send({ error: 'Account mismatch with authenticated session' });
                        }
                    } else if (part.fieldname === 'is_workflow') {
                        isWorkFlow = part.value === 'true';
                    } else if (part.fieldname === 'template_name') {
                        templateName = part.value as string;
                    } else if (part.fieldname === 'template_id') {
                        templateId = part.value as string;
                    }
                }
            }

            // Logger.info("Template name: ", templateName)
            // Logger.info("Template id: ", templateId)


            if (!fileBuffer) {
                return reply.code(400).send({ error: 'No file uploaded' });
            }

            let fileContent = fileBuffer.toString('utf-8');
            let aquaTreeFromFile: AquaTree = JSON.parse(fileContent);


            let aquaTree = removeFilePathFromFileIndex(aquaTreeFromFile);

            let [isValidAquaTree, failureReason] = validateAquaTree(aquaTree)
            if (!isValidAquaTree) {
                return reply.code(412).send({ error: failureReason });
            }

            // Handle the asset if it exists
            if (hasAsset) {
                if (assetBuffer) {
                    let aquafier = new Aquafier()

                    const uint8Array = new Uint8Array(assetBuffer);
                    let fileHash = aquafier.getFileHash(uint8Array);


                    let genesisHash = getGenesisHash(aquaTree);
                    if (genesisHash == null || genesisHash == "") {
                        return reply.code(500).send({ error: 'Genesis hash not found in aqua tree' });
                    }

                    Logger.info(`Asset file hash: ${fileHash}, genesisHash: ${genesisHash} , assetFilename : ${assetFilename} in explorer_aqua_file_upload ()`)
                    let serverAttestation = await saveAttestationFileAndAquaTree(aquaTree, genesisHash, walletAddress)

                    if (serverAttestation != null) {

                        let aquafier = new Aquafier()
                        let aquaTreeWrapparOne: AquaTreeWrapper = {
                            aquaTree: aquaTree,
                            revision: "",
                            fileObject: undefined
                        }

                        let aquaTreeWrapparTwo: AquaTreeWrapper = {
                            aquaTree: serverAttestation.aquaTree,
                            revision: "",
                            fileObject: {
                                fileContent: JSON.stringify(serverAttestation.attestationJSONfileData),
                                fileName: serverAttestation.attestationJSONfileName,
                                path: "",
                                fileSize: 0

                            }
                        }
                        const linkeRes = await aquafier.linkAquaTree(aquaTreeWrapparOne, aquaTreeWrapparTwo)
                        if (linkeRes.isErr()) {

                            Logger.error(`Error linking attestation aqua tree: ${linkeRes.data}`);
                            return reply.code(500).send({ error: `Error linking attestation aqua tree: ${linkeRes.data}` });
                        }

                        aquaTree = linkeRes.data.aquaTree!
                    }

                    // let filepubkeyhash = `${walletAddress}_${genesisHash}`

                    // let existingFileIndex = await prisma.fileIndex.findFirst({
                    //     where: { file_hash: fileHash },
                    // });

                    Logger.debug(cliRedify("This was called"))
                    let fileName = assetFilename;
                    await saveFileAndCreateOrUpdateFileIndex(
                        walletAddress,
                        aquaTree,
                        fileName,
                        assetBuffer
                    )

                    // Create unique filename
                    // await prisma.fileName.upsert({
                    //     where: {
                    //         pubkey_hash: filepubkeyhash,
                    //     },
                    //     create: {
                    //         pubkey_hash: filepubkeyhash,
                    //         file_name: fileName,
                    //     },
                    //     update: {
                    //         file_name: fileName,
                    //     }
                    // })

                    // if (existingFileIndex != null) {
                    //     Logger.info(`Update file index counter`)

                    //     await prisma.fileIndex.update({
                    //         where: { file_hash: existingFileIndex.file_hash },
                    //         data: {
                    //             pubkey_hash: [...existingFileIndex.pubkey_hash, filepubkeyhash]//`${session.address}_${genesisHash}`]
                    //         }
                    //     });


                    // } else {
                    //     const UPLOAD_DIR = getFileUploadDirectory();


                    //     let aquaTreeName = await aquafier.getFileByHash(aquaTree, genesisHash);
                    //     if (aquaTreeName.isOk()) {
                    //         fileName = aquaTreeName.data
                    //     }
                    //     const filename = `${randomUUID()}-${fileName}`;
                    //     const filePath = path.join(UPLOAD_DIR, filename);

                    //     // Save the file
                    //     await fs.promises.writeFile(filePath, assetBuffer);


                    //     await prisma.file.create({
                    //         data: {

                    //             file_hash: fileHash,
                    //             file_location: filePath,

                    //         }
                    //     })

                    //     await prisma.fileIndex.create({
                    //         data: {

                    //             pubkey_hash: [filepubkeyhash],
                    //             file_hash: fileHash,

                    //         }
                    //     })
                    // }
                }
                else {
                    let genhash = getGenesisHash(aquaTree)
                    if (genhash == null) {
                        throw Error(`--> genhash ${genhash}.`)
                    }
                    let genRev = aquaTree.revisions[genhash!]
                    let fileHash = genRev.file_hash
                    Logger.info(`Request does not have asset buffer.... ${fileHash}`)
                    let res = await prisma.file.findFirst({
                        where: {
                            file_hash: fileHash,
                        }
                    })

                    if (res == null) {
                        return reply.code(500).send({ error: `Asset is required , not found in system -- hasAsset ${hasAsset} -- assetBuffer ${assetBuffer}` });
                    }
                }
            }

            //Aqua sign workflow needs to be signed by the server
            let workflowDataResponse = isWorkFlowData(aquaTree, systemTemplateHashes)
            const workflowName = workflowDataResponse.workFlow.replace(".json", "")

            if (workflowDataResponse.isWorkFlow && workflowName === "aqua_sign") {
                const aquafier = new Aquafier()

                const serverWalletInformation = await getServerWalletInformation()

                if (!serverWalletInformation) {

                    Logger.error("Server wallet information is not defined");

                    return reply.code(500).send({ error: "Server wallet information is not defined, server cannot sign" });

                }

                // Link server identity claim before signing
                const serverWalletAddr = getAddress(serverWalletInformation.walletAddress)
                const serverUrl = `http://localhost:${getPort()}`

                const serverLatestEntries = await prisma.latest.findMany({
                    where: { user: serverWalletAddr }
                })

                let serverIdentityAquaTree: AquaTree | null = null
                let serverIdentityFileObjects: FileObject[] = []

                for (const entry of serverLatestEntries) {
                    try {
                        const [entryAquaTree, entryFileObjects] = await createAquaTreeFromRevisions(entry.hash, serverUrl)
                        const entryGenHash = getGenesisHash(entryAquaTree)
                        if (entryGenHash) {
                            const genRevision = entryAquaTree.revisions[entryGenHash]
                            if (genRevision && genRevision["forms_type"] === "simple_claim") {
                                serverIdentityAquaTree = entryAquaTree
                                serverIdentityFileObjects = entryFileObjects
                                break
                            }
                        }
                    } catch (error) {
                        Logger.error(`Error reconstructing aqua tree for latest entry ${entry.hash}: ${error}`)
                    }
                }

                if (serverIdentityAquaTree) {
                    let identityName = getAquaTreeFileName(serverIdentityAquaTree);
                    if (identityName.length === 0) {
                        identityName = "identity_claim.json"
                    }

                    const serverIdentityFileObject: FileObject = {
                        fileName: identityName,
                        fileContent: JSON.stringify(serverIdentityAquaTree),
                        path: ""
                    }

                    const serverIdentityWrapper: AquaTreeWrapper = {
                        aquaTree: serverIdentityAquaTree,
                        fileObject: serverIdentityFileObject,
                        revision: ""
                    }

                    const attestationWrapperForIdentityLink: AquaTreeWrapper = {
                        aquaTree: aquaTree,
                        fileObject: undefined,
                        revision: ""
                    }

                    const identityLinkedResult = await aquafier.linkAquaTree(attestationWrapperForIdentityLink, serverIdentityWrapper, false)

                    if (identityLinkedResult.isErr()) {
                        Logger.error(`Error linking server identity: ${identityLinkedResult.data}`)
                    } else {
                        aquaTree = identityLinkedResult.data.aquaTree!
                        Logger.info("Server identity linked into attestation successfully")
                    }

                    // Transfer server identity to user context
                    await prisma.users.upsert({
                        where: { address: walletAddress },
                        create: { address: walletAddress },
                        update: {}
                    });

                    const transferResult = await transferRevisionChainData(
                        walletAddress,
                        { aquaTree: serverIdentityAquaTree, fileObject: serverIdentityFileObjects },
                        null,
                        true
                    )

                    if (!transferResult.success) {
                        Logger.error(`Error transferring server identity to user: ${transferResult.message}`)
                    } else {
                        Logger.info(`Server identity transferred to user ${walletAddress}`)
                    }
                } else {
                    Logger.info("Server identity claim not found, proceeding without identity link")
                }

                const creds = dummyCredential()
                creds.mnemonic = serverWalletInformation.mnemonic
                const linkedAquaTree = aquaTree
                const aquaTreeWrapper: AquaTreeWrapper = {
                    aquaTree: linkedAquaTree!,
                    fileObject: undefined,// not needed for signing
                    revision: ""
                }
                const signAquaTreeResult = await aquafier.signAquaTree(aquaTreeWrapper, "cli", creds)

                if (signAquaTreeResult.isErr()) {
                    Logger.error(`Error signing aqua tree ${signAquaTreeResult.data}`)
                    return null;
                }

                if (signAquaTreeResult.data.aquaTree == null) {
                    Logger.error(`Signed aqua tree is null ${signAquaTreeResult.data}`)

                    return reply.code(500).send({ error: "Server wallet information is not defined, server cannot sign" });

                }
                aquaTree = signAquaTreeResult.data.aquaTree
                // const signedAttestation = signAquaTreeResult.data.aquaTree
            }
            // Save the aqua tree
            Logger.info(`  Save the aqua tree templateId :  ${templateId} , aquaTree : ${aquaTree} , isWorkFlow :  ${isWorkFlow + ""} in explorer_aqua_file_upload ()`)
            await saveAquaTree(aquaTree, walletAddress, templateId.length == 0 ? null : templateId, isWorkFlow);

            // Logger.info(`Aquatree to db ${JSON.stringify(aquaTree, null, 4)}`)
            // Get the host from the request headers
            const host = request.headers.host || `${getHost()}:${getPort()}`;

            // Get the protocol (http or https)
            const protocol = request.protocol || 'https'

            // DO NOT FETCH  API FILE INFO ASS THE WALLET ADDRES COULD BE OF ANOTHER USER 
            // REMEMBER CLAIM ATTESTATION SAVE FOR OTHER USERS 
            // THE FRON END  SHOULD USE FETCH API FILE INF0
            if (walletAddress !== userAddress) {
                try {
                    let sortedAquaTree = OrderRevisionInAquaTree(aquaTree)
                    const revisionHashes = Object.keys(sortedAquaTree.revisions)
                    const firstRevision = sortedAquaTree.revisions[revisionHashes[0]]
                    if (firstRevision.revision_type == "form" && firstRevision.forms_claim_wallet_address) {
                        const claimerWalletAddress = firstRevision.forms_claim_wallet_address
                        // Websocket message to the claimer
                        // sendToUserWebsockerAMessage(claimerWalletAddress, WebSocketActions.REFETCH_FILES)
                        sendNotificationReloadToWallet(walletAddress, {
                            target: "workflows"
                        })
                        sendNotificationReloadToWallet(userAddress, {
                            target: "workflows"
                        })
                        sendNotificationReloadToWallet(claimerWalletAddress, {
                            target: "workflows"
                        })
                        await createNotificationAndSendWebSocketNotification(userAddress, claimerWalletAddress, "You have a new attestation!")
                    }
                } catch (e) {
                    Logger.error(`Attestation Error ${e}`);
                }
            }

            usageService.recalculateUserUsage(walletAddress).catch(err =>
                Logger.error('Failed to recalculate usage after aqua file upload:', err)
            );

            return reply.code(200).send({
                success: true,
                message: 'Aqua tree saved successfully'
            });
        } catch (error: any) {
            Logger.error('Specific error in file/fileIndex creation:', error);
            request.log.error(error);
            return reply.code(500).send({ error: `Error ${error}` });
        }
    });

    // get file using file hash with pagination
    fastify.get('/explorer_files', { preHandler: authenticate }, async (request: AuthenticatedRequest, reply) => {
        // file content from db
        // return as a blob

        const userAddress = request.user!.address;

        // Get the host from the request headers
        const host = request.headers.host || `${getHost()}:${getPort()}`;

        // Get the protocol (http or https)
        const protocol = request.protocol || 'https'

        // Construct the full URL
        const url = `${protocol}://${host}`;


        // Extract pagination parameters from query string
        const query = request.query as Record<string, string | undefined>;
        const page = parseInt(query.page ?? '1', 10) || 1;
        const limit = parseInt(query.limit ?? '10', 10) || 10;

        const paginatedData = await getUserApiFileInfo(url, userAddress, page, limit)
        // console.log(JSON.stringify(paginatedData, null, 4))
        // throw new Error("test")
        return reply.code(200).send({
            success: true,
            message: 'Aqua tree saved successfully',
            ...paginatedData
        });

    });


    fastify.get('/explorer_workspace_download', { preHandler: authenticate }, async (request: AuthenticatedRequest, reply) => {
        const userAddress = request.user!.address;

        // Get the host from the request headers
        const host = request.headers.host || `${getHost()}:${getPort()}`;

        // Get the protocol (http or https)
        const protocol = request.protocol || 'https'

        // Construct the full URL
        const url = `${protocol}://${host}`;


        // Extract pagination parameters from query string
        const query = request.query as Record<string, string | undefined>;
        const page = 1; //parseInt(query.page ?? Number, 10) || 1;
        const limit = Number.MAX_SAFE_INTEGER; //parseInt(query.limit ?? '10', 10) || 10;

        const paginatedData = await getUserApiFileInfo(url, userAddress, page, limit)
        // console.log(JSON.stringify(paginatedData, null, 4))
        // throw new Error("test")
        return reply.code(200).send({
            success: true,
            message: 'Aqua tree saved successfully',
            ...paginatedData
        });

    });

    fastify.post('/explorer_workspace_upload', { preHandler: authenticate }, async (request: AuthenticatedRequest, reply) => {
        // Reuse logic from /explorer_aqua_zip
        try {
            const userAddress = request.user!.address;

            if (!request.isMultipart()) {
                return reply.code(400).send({ error: 'Expected multipart form data' });
            }

            const data = await request.file();
            if (!data?.file) {
                return reply.code(400).send({ error: 'No file uploaded' });
            }

            const maxFileSize = 200 * 1024 * 1024;
            if (data.file.bytesRead > maxFileSize) {
                return reply.code(413).send({ error: 'File too large. Maximum file size is 200MB' });
            }

            const fileBuffer = await streamToBuffer(data.file);
            const zip = new JSZip();
            const zipData = await zip.loadAsync(fileBuffer);


            if (!zipData.files['aqua.json']) {
                return reply.code(400).send({ error: 'Invalid ZIP file: Missing aqua.json' });
            }

            let aquaJsonContent = await zipData.files['aqua.json'].async("string");

            if (!aquaJsonContent) {
                return reply.code(400).send({ error: 'Invalid aqua.json content' });
            }

            let aquaJson = JSON.parse(aquaJsonContent);

            if (aquaJson.type !== "aqua_workspace_backup" && aquaJson.type !== "aqua_file_backup") {
                return reply.code(400).send({ error: 'Invalid aqua.json type' });

            }

            if (aquaJson.type !== "aqua_workspace_backup") {
                return reply.code(400).send({ error: 'Invalid aqua.json type for workspace upload' });
            }

            // Process aqua.json metadata first
            await processAquaMetadata(zipData, userAddress);

            try {


                await processAllAquaFiles(zipData, userAddress, null, null, null, true);
            } catch (error: any) {
                Logger.error('Error processing aqua files:', error);

                const aquaFiles = getAquaFiles(zipData);
                await processRegularFiles(aquaFiles, userAddress, null, true);
            }

            return reply.code(200).send({
                success: true,
                message: 'Workspace imported successfully'
            });

        } catch (error: any) {
            request.log.error(error);
            return reply.code(500).send({
                error: error instanceof Error ? error.message : 'File upload failed'
            });
        }
    });

    fastify.post('/explorer_files', { preHandler: authenticate }, async (request: AuthenticatedRequest, reply) => {

        const userAddress = request.user!.address;

        let aquafier = new Aquafier();

        // Check if the request is multipart
        const isMultipart = request.isMultipart();

        if (!isMultipart) {
            return reply.code(400).send({ error: 'Expected multipart form data' });
        }

        try {
            // Process the multipart data
            const data = await request.file();

            if (data == undefined || data.file === undefined) {
                return reply.code(400).send({ error: 'No file uploaded' });
            }
            // Verify file size (20MB = 20 * 1024 * 1024 bytes)
            const maxFileSize = 25 * 1024 * 1024;
            if (data.file.bytesRead > maxFileSize) {
                return reply.code(413).send({
                    error: 'File too large. Maximum file size is 20MB',
                    maxSize: '20MB',
                    receivedSize: `${Math.round(data.file.bytesRead / 1024 / 1024)}MB`
                });
            }

            // Extract form fields with default values
            // Properly handle the MultipartFields type
            let isForm = false;
            let enableContent = false;
            let enableScalar = true;

            if (data.fields.isForm) {
                // Handle form fields correctly based on the actual API
                const isFormField: any = data.fields.isForm;

                // If it's a single field
                isForm = isFormField.value === 'true';

            }

            // Same for enableContent
            if (data.fields.enableContent) {
                const enableContentField: any = data.fields.enableContent;
                enableContent = enableContentField.value === 'true';
            }

            // Same for enableContent
            if (data.fields.enableScalar) {
                const enableScalarField: any = data.fields.enableScalar;

                enableScalar = enableScalarField.value === 'true';
            }

            const fileBuffer: Buffer<ArrayBufferLike> = await streamToBuffer(data.file);
            // const buffer = Buffer.from([1, 2, 3, 4]);
            const uint8Array = new Uint8Array(fileBuffer);
            // let fileContent = fileBuffer.toString('utf-8');
            const fileSizeInBytes = fileBuffer.length;


            let fileObjectPar: FileObject = {
                fileContent: uint8Array,
                fileName: data.filename,
                path: "./",
                fileSize: fileSizeInBytes
            }

            if (isForm) {
                let d = fileBuffer.toString('utf-8')
                Logger.info(`fileBuffer as string: ${d}`)
                fileObjectPar.fileContent = d
            }

            // Get the host from the request headers
            const host = request.headers.host || `${getHost()}:${getPort()}`;

            // Get the protocol (http or https)
            const protocol = request.protocol || 'https'


            let res = await aquafier.createGenesisRevision(
                fileObjectPar,
                isForm,
                enableContent,
                isForm ? false : enableScalar
            )
            if (res.isErr()) {
                res.data.push({
                    log: `Error creating genesis revision`,
                    logType: LogType.ERROR
                })
                return reply.code(500).send({
                    logs: res.data
                })

            }


            // let fileHash = getHashSum(data.file)
            let resData: AquaTree = res.data.aquaTree!!;

            let genesisHash = getGenesisHash(resData);

            if (!genesisHash) {
                Logger.error(`Genisis-Hash is empty!`)
                return reply.code(500).send({ error: 'Genesis revision cannot be found' });
            }


            let revisionData: Revision = resData.revisions[genesisHash];
            let fileHash = revisionData.file_hash; // Extract file hash


            if (!fileHash) {
                Logger.error(`File hash missing from AquaTree response`)
                return reply.code(500).send({ error: "File hash missing from AquaTree response" });
            }

            const urlPath = `/files/${fileHash}`;
            // Construct the full URL
            const fullUrl = `${protocol}://${host}${urlPath}`;
            let fileObject: FileObject = {
                fileContent: fullUrl, // fileContent,
                fileName: data.filename,
                path: "./",
                fileSize: fileSizeInBytes
            }

            try {

                let filepubkeyhash = `${userAddress}_${genesisHash}`

                await prisma.latest.create({
                    data: {
                        hash: filepubkeyhash,
                        user: userAddress,
                    }
                });

                // Insert new revision into the database
                await prisma.revision.create({
                    data: {
                        pubkey_hash: filepubkeyhash,
                        nonce: revisionData.file_nonce || "",
                        shared: [],
                        previous: revisionData.previous_verification_hash || "",
                        local_timestamp: revisionData.local_timestamp,
                        revision_type: revisionData.revision_type,
                        verification_leaves: revisionData.leaves || [],
                        file_hash: fileHash,
                        has_content: enableContent,

                    },
                });

                // (`one`)
                // if is form add the form elements
                if (isForm) {
                    let revisioValue = Object.keys(revisionData);
                    for (let formItem of revisioValue) {
                        if (formItem.startsWith("forms_")) {
                            let res = await prisma.aquaForms.create({
                                data: {
                                    hash: filepubkeyhash,
                                    key: formItem,
                                    value: revisionData[formItem],
                                    type: typeof revisionData[formItem]
                                }
                            });
                            // Logger.info(`Res ${JSON.stringify(res, null, 2)}`)
                        }
                    }
                }

                let existingFileIndex = await prisma.fileIndex.findFirst({
                    where: { file_hash: fileHash },
                });

                if (existingFileIndex) {
                    // existingFileIndex.reference_count = existingFileIndex.reference_count! + 1;
                    existingFileIndex.pubkey_hash = [...existingFileIndex.pubkey_hash, `${userAddress}_${genesisHash}`]
                    await prisma.fileIndex.update({
                        data: existingFileIndex,
                        where: {
                            file_hash: existingFileIndex.file_hash
                        }
                    })
                } else {

                    const UPLOAD_DIR = getFileUploadDirectory();
                    // Create unique filename
                    const filename = `${randomUUID()}-${data.filename}`;
                    const filePath = await persistFile(UPLOAD_DIR, filename, fileBuffer)

                    await prisma.file.upsert({
                        where: {
                            file_hash: fileHash,
                        },
                        create: {
                            file_hash: fileHash,
                            file_location: filePath,
                            file_size: fileBuffer.length
                        },
                        update: {
                            file_hash: fileHash,
                            file_location: filePath,
                            file_size: fileBuffer.length
                        }
                    })

                    await prisma.fileIndex.create({
                        data: {
                            pubkey_hash: [filepubkeyhash],
                            file_hash: fileHash,
                        }
                    })


                }
                await prisma.fileName.upsert({
                    where: {
                        pubkey_hash: filepubkeyhash,
                    },
                    create: {
                        pubkey_hash: filepubkeyhash,
                        file_name: data.filename,

                    },
                    update: {
                        pubkey_hash: filepubkeyhash,
                        file_name: data.filename,

                    }
                })

            } catch (error: any) {
                Logger.error(`error ${error}`)
                let logs: LogData[] = []
                logs.push({
                    log: `Error saving genesis revision`,
                    logType: LogType.ERROR
                })

                return reply.code(500).send({
                    data: res.data
                })

            }

            usageService.recalculateUserUsage(userAddress).catch(err =>
                Logger.error('Failed to recalculate usage after file upload:', err)
            );

            // Return success response
            return reply.code(200).send({
                aquaTree: resData,
                fileObject: fileObject
            });
        } catch (error: any) {
            Logger.error(`error ${error}`)
            request.log.error(error);
            return reply.code(500).send({ error: 'File upload failed' });
        }

    });

    fastify.post('/explorer_delete_file', { preHandler: authenticate }, async (request: AuthenticatedRequest, reply) => {
        const userAddress = request.user!.address;

        const revisionDataPar = request.body as DeleteRevision;

        if (!revisionDataPar.revisionHash) {
            return reply.code(400).send({ success: false, message: "revision hash is required" });
        }

        let response = await deleteAquaTreeFromSystem(userAddress, revisionDataPar.revisionHash)

        if (response[0] === 200) {
            usageService.recalculateUserUsage(userAddress).catch(err =>
                Logger.error('Failed to recalculate usage after file deletion:', err)
            );
        }

        return reply.code(response[0]).send({ success: response[0] == 200 ? true : false, message: response[1] });
    });

    fastify.post('/transfer_chain', { preHandler: authenticate }, async (request: AuthenticatedRequest, reply) => {

        try {
            const authenticatedAddress = request.user!.address;
            const { latestRevisionHash, userAddress } = request.body as {
                latestRevisionHash: string,
                userAddress: string
            };

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
                        hash: `${userAddress}_${latestRevisionHash}`,
                        user: userAddress
                    }
                ]
            const entireChain = await fetchAquatreeFoUser(url, latest)//(latestRevisionHash, userAddress, url);


            // Check if the user exists (create if not)
            const targetUser = await prisma.users.findUnique({
                where: { address: authenticatedAddress }
            });

            if (!targetUser) {
                await prisma.users.create({
                    data: { address: authenticatedAddress }
                });
            }

            if (entireChain.length === 0) {
                return reply.code(404).send({ success: false, message: "No revisions found for the provided hash" });

            }
            if (entireChain.length > 1) {
                return reply.code(400).send({
                    success: false,
                    message: "Multiple revisions found for the provided hash. Please provide a unique revision hash."
                });
            }

            // Transfer the chain to the target user (authenticatedAddress)
            const transferResult = await transferRevisionChainData(
                authenticatedAddress,
                entireChain[0],null, false
            );

            if (!transferResult.success) {
                return reply.code(500).send({
                    success: false,
                    message: transferResult.message
                });
            }


            return reply.code(200).send({
                success: true,
                message: '',//`Chain transferred successfully: ${transferResult.transferredRevisions} revisions and ${transferResult.linkedChainsTransferred} linked chains`,
                latestHashes: '' // transferResult.latestHashes
            });
        } catch (error: any) {
            Logger.error("Error in transfer_chain operation:", error);
            return reply.code(500).send({
                success: false,
                message: `Error transferring chain: ${error.message}`,
                details: error
            });
        }
    })

    fastify.post('/merge_chain', { preHandler: authenticate }, async (request: AuthenticatedRequest, reply) => {
        try {
            const authenticatedAddress = request.user!.address;
            const { latestRevisionHash, userAddress, mergeStrategy, currentUserLatestRevisionHash, lastLocalRevisionHash } = request.body as {
                currentUserLatestRevisionHash: string,
                latestRevisionHash: string,
                userAddress: string,
                mergeStrategy?: "replace" | "fork"  // Optional merge strategy
                lastLocalRevisionHash: string
            };

            const host = request.headers.host || 'localhost:3000'; // Provide a default host
            const protocol = request.protocol || 'http';
            const url = `${protocol}://${host}`;

            // Fetch the entire chain from the source user
            // const entireChain = await fetchCompleteRevisionChain(latestRevisionHash, userAddress, url);
            // const existingChain = await fetchCompleteRevisionChain("0x11616437260e1dfd8da7cec1ff253034f704f9d55a1aff1f2800f4797c041617", authenticatedAddress, url)
            // fs.writeFileSync("existing.json", JSON.stringify(existingChain))
            // fs.writeFileSync("newchain.json", JSON.stringify(entireChain))


            // Merge the chain to the target user (authenticatedAddress)
            // const mergeResult = await mergeRevisionChain(
            //     entireChain,
            //     authenticatedAddress,
            //     userAddress,
            //     url,
            //     mergeStrategy || "replace", // Use the provided strategy or default to "replace",
            //     currentUserLatestRevisionHash
            // );

            // if (!mergeResult.success) {
            //     return reply.code(500).send({
            //         success: false,
            //         message: mergeResult.message
            //     });
            // }

            // let deletionResult = await deleteAquaTree(lastLocalRevisionHash, authenticatedAddress, url)
            let response = await deleteAquaTreeFromSystem(authenticatedAddress, lastLocalRevisionHash)

            let latest: Array<{
                hash: string;
                user: string;
            }> = [
                    {
                        hash: `${userAddress}_${latestRevisionHash}`,
                        user: userAddress
                    }
                ]
            const entireChain = await fetchAquatreeFoUser(url, latest)//(latestRevisionHash, userAddress, url);


            // Check if the user exists (create if not)
            const targetUser = await prisma.users.findUnique({
                where: { address: authenticatedAddress }
            });

            if (!targetUser) {
                await prisma.users.create({
                    data: { address: authenticatedAddress }
                });
            }

            if (entireChain.length === 0) {
                return reply.code(404).send({ success: false, message: "No revisions found for the provided hash" });

            }
            if (entireChain.length > 1) {
                return reply.code(400).send({
                    success: false,
                    message: "Multiple revisions found for the provided hash. Please provide a unique revision hash."
                });
            }

            // Transfer the chain to the target user (authenticatedAddress)
            const transferResult = await transferRevisionChainData(
                authenticatedAddress,
                entireChain[0],
            );

            if (!transferResult.success) {
                return reply.code(500).send({
                    success: false,
                    message: transferResult.message
                });
            }

            return reply.code(200).send({
                success: true,
                // message: `Chain merged successfully using "${mergeResult.strategy}" strategy: ${mergeResult.transferredRevisions} revisions and ${mergeResult.linkedChainsTransferred} linked chains`,
                // latestHashes: mergeResult.latestHashes,
                // mergePoint: mergeResult.mergePoint,
                // strategy: mergeResult.strategy
            });
        } catch (error: any) {
            Logger.error("Error in merge_chain operation:", error);
            return reply.code(500).send({
                success: false,
                message: `Error merging chain: ${error.message}`,
                details: error
            });
        }
    })

    fastify.post('/explorer_aqua_pdf', { preHandler: authenticate }, async (request: any, reply: any) => {
        try {
            const userAddress = (request as AuthenticatedRequest).user!.address;

            // Validate multipart request
            if (!request.isMultipart()) {
                return reply.code(400).send({ error: 'Expected multipart form data' });
            }

            // Process file upload
            const data = await request.file();
            if (!data?.file) {
                return reply.code(400).send({ error: 'No file uploaded' });
            }

            // Verify file size (200MB limit)
            const maxFileSize = 200 * 1024 * 1024;
            if (data.file.bytesRead > maxFileSize) {
                return reply.code(413).send({ error: 'File too large. Maximum file size is 200MB' });
            }

            // Read PDF buffer
            const pdfBuffer = await streamToBuffer(data.file);

            // Extract embedded aqua data from PDF
            const extractedData = await extractAquaDataFromPdf(pdfBuffer);

            if (!extractedData.aquaJson) {
                return reply.code(400).send({ error: 'No embedded aqua data found in PDF' });
            }

            const aquaJson = extractedData.aquaJson;
            if (!aquaJson.type) {
                aquaJson.type = "aqua_file_backup";
            }

            if (aquaJson.type !== "aqua_workspace_backup" && aquaJson.type !== "aqua_file_backup") {
                return reply.code(400).send({ error: 'Invalid aqua.json type' });
            }

            if (aquaJson.type !== "aqua_file_backup") {
                return reply.code(400).send({ error: 'Invalid aqua.json type for workspace upload' });
            }

            // Build a JSZip from extracted files so we can reuse existing processing
            const zip = new JSZip();
            zip.file('aqua.json', JSON.stringify(aquaJson));

            // Collect asset filenames for quick lookup
            const assetFileNames = new Set(extractedData.assetFiles.map(f => f.filename));

            for (const chainFile of extractedData.aquaChainFiles) {
                zip.file(chainFile.filename, chainFile.content);

                // During PDF signing, asset files whose content is an aqua tree get
                // embedded only under the .aqua.json name. We need to also add the
                // content under the original asset name so processAquaMetadata can find it.
                const assetName = chainFile.filename.replace(/\.aqua\.json$/, '');
                if (assetName !== chainFile.filename && !assetFileNames.has(assetName)) {
                    zip.file(assetName, chainFile.content);
                    assetFileNames.add(assetName);
                }
            }

            for (const assetFile of extractedData.assetFiles) {
                if (Buffer.isBuffer(assetFile.content)) {
                    zip.file(assetFile.filename, assetFile.content);
                } else {
                    zip.file(assetFile.filename, assetFile.content as string);
                }
            }

            // Process aqua.json metadata first
            await processAquaMetadata(zip, userAddress);

            const isTemplateId = request.headers['is_template_id'];
            let templateId = null;
            if (isTemplateId != undefined || isTemplateId != null || isTemplateId != "") {
                templateId = isTemplateId;
            }

            // Process individual .aqua.json files
            await processAquaFiles(zip, userAddress, templateId);

            // Return response with file info
            const host = request.headers.host || `${getHost()}:${getPort()}`;
            const protocol = request.protocol || 'https';
            const url = `${protocol}://${host}`;
            const displayData = await getUserApiFileInfo(url, userAddress);

            return reply.code(200).send({
                success: true,
                message: 'Aqua tree imported from PDF successfully',
                data: displayData
            });

        } catch (error: any) {
            request.log.error(error);
            return reply.code(500).send({
                error: error instanceof Error ? error.message : 'PDF import failed'
            });
        }
    });

}

