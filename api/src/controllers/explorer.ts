import Aquafier, { AquaTree, FileObject, LogData, LogType, Revision } from 'aqua-js-sdk';
import { FastifyInstance } from 'fastify';
import { prisma } from '../database/db';
import { getFileUploadDirectory, streamToBuffer } from '../utils/file_utils';
import path from 'path';
import JSZip from "jszip";
import { randomUUID } from 'crypto';
import util from 'util';
import { pipeline } from 'stream';
import * as fs from "fs"
import { deleteAquaTreeFromSystem, fetchAquatreeFoUser, getUserApiFileInfo, processAquaFiles, processAquaMetadata, saveAquaTree, transferRevisionChainData } from '../utils/revisions_utils';
import { getHost, getPort } from '../utils/api_utils';
import { DeleteRevision } from '../models/request_models';
import { fetchCompleteRevisionChain } from '../utils/quick_utils';
import { transferRevisionChain, mergeRevisionChain } from '../utils/quick_revision_utils';
import { getGenesisHash, removeFilePathFromFileIndex, validateAquaTree } from '../utils/aqua_tree_utils';
// import getStream from 'get-stream';
// Promisify pipeline
const pump = util.promisify(pipeline);

export default async function explorerController(fastify: FastifyInstance) {

    fastify.post('/explorer_aqua_zip', async (request: any, reply: any) => {
        try {
            // Authentication
            const nonce = request.headers['nonce'];
            if (!nonce || typeof nonce !== 'string' || nonce.trim() === '') {
                return reply.code(401).send({ error: 'Unauthorized: Missing or empty nonce header' });
            }

            const session = await prisma.siweSession.findUnique({ where: { nonce } });
            if (!session) {
                return reply.code(403).send({ success: false, message: "Nonce is invalid" });
            }

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

            // Process aqua.json metadata first
            await processAquaMetadata(zipData, session.address);

            // Process individual .aqua.json files
            await processAquaFiles(zipData, session.address);

            // Return response with file info
            const host = request.headers.host || `${getHost()}:${getPort()}`;
            const protocol = request.protocol || 'https';
            const url = `${protocol}://${host}`;
            const displayData = await getUserApiFileInfo(url, session.address);

            return reply.code(200).send({
                success: true,
                message: 'Aqua tree saved successfully',
                files: displayData
            });

        } catch (error) {
            request.log.error(error);
            return reply.code(500).send({
                error: error instanceof Error ? error.message : 'File upload failed'
            });
        }
    });



    fastify.post('/explorer_aqua_file_upload', async (request, reply) => {

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

                    // console.log(`name ${part.fieldname}  value ${part.value}  `)
                    if (part.fieldname === 'has_asset') {
                        hasAsset = part.value === 'true';
                    } else if (part.fieldname === 'account') {
                        // Store account if needed for further processing
                        const account = part.value;
                        // Verify account matches session address
                        if (account !== session.address) {
                            return reply.code(403).send({ error: 'Account mismatch with authenticated session' });
                        }
                    } else if (part.fieldname === 'is_workflow') {
                        isWorkFlow = part.value === 'true';
                    } else if (part.fieldname === 'template_id') {
                        templateId = part.value as string;
                    }
                }
            }



            if (!fileBuffer) {
                return reply.code(400).send({ error: 'No file uploaded' });
            }

            let fileContent = fileBuffer.toString('utf-8');
            let aquaTreeFromFile: AquaTree = JSON.parse(fileContent);

            let aquaTree = removeFilePathFromFileIndex(aquaTreeFromFile);

            let [isValidAquaTree, failureReason] = validateAquaTree(aquaTree)
            // console.log(`is aqua tree valid ${isValidAquaTree} `);
            if (!isValidAquaTree) {
                // console.log(`failure reason ${failureReason}`)
                return reply.code(412).send({ error: failureReason });
            }



            // console.log(`\n has asset save file ${hasAsset}  `)
            // Handle the asset if it exists
            if (hasAsset && assetBuffer) {
                // console.log(`---------------------------------------------------------------`)
                // console.log(`\n has asset save file \n `)
                // Process the asset - this depends on your requirements
                // For example, you might want to store it separately or attach it to the aqua tree
                // aquaTreeWithFileObject.assetData = assetBuffer.toString('base64');
                // Or handle the asset in some other way based on your application's needs

                let aquafier = new Aquafier()

                const uint8Array = new Uint8Array(assetBuffer);
                let fileHash = aquafier.getFileHash(uint8Array);


                let genesisHash = getGenesisHash(aquaTree);
                if (genesisHash == null || genesisHash == "") {
                    return reply.code(500).send({ error: 'Genesis hash not found in aqua tree' });
                }

                let filepubkeyhash = `${session.address}_${genesisHash}`

                let existingFileIndex = await prisma.fileIndex.findFirst({
                    where: { file_hash: fileHash },
                });

                // Create unique filename
                let fileName = assetFilename;
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
                    console.log(`Update file index counter`)

                    await prisma.fileIndex.update({
                        where: { file_hash: existingFileIndex.file_hash },
                        data: {
                            pubkey_hash: [...existingFileIndex.pubkey_hash, `${session.address}_${genesisHash}`]
                        }
                    });



                } else {
                    // console.log(`\n ## filepubkeyhash ${filepubkeyhash}`)
                    const UPLOAD_DIR = getFileUploadDirectory();


                    let aquaTreeName = await aquafier.getFileByHash(aquaTree, genesisHash);
                    if (aquaTreeName.isOk()) {
                        fileName = aquaTreeName.data
                    }
                    const filename = `${randomUUID()}-${fileName}`;
                    const filePath = path.join(UPLOAD_DIR, filename);

                    // Save the file
                    // await pump(data.file, fs.createWriteStream(filePath))
                    await fs.promises.writeFile(filePath, assetBuffer);


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


                    // console.log('FileIndex record created');
                }


            } else {
                // console.log(`failure reason ${failureReason}`)
                return reply.code(500).send({ error: `Asset is required` });
            }
            // console.log("Aquatree to save: ", aquaTree)
            // Save the aqua tree
            await saveAquaTree(aquaTree, session.address, templateId.length == 0 ? null : templateId, isWorkFlow);



            console.log(`Aquatree to db ${JSON.stringify(aquaTree, null, 4)}`)

            // throw Error("check hash above")

            // Get the host from the request headers
            const host = request.headers.host || `${getHost()}:${getPort()}`;

            // Get the protocol (http or https)
            const protocol = request.protocol || 'https'

            // Construct the full URL
            const url = `${protocol}://${host}`;

            const displayData = await getUserApiFileInfo(url, session.address)
            return reply.code(200).send({
                success: true,
                message: 'Aqua tree saved successfully',
                files: displayData
            });
        } catch (error) {
            console.error('\n\n Specific error in file/fileIndex creation:', error);
            request.log.error(error);
            return reply.code(500).send({ error: `Error ${error}` });
        }



    });

    // get file using file hash
    fastify.get('/explorer_files', async (request, reply) => {
        // const { fileHash } = request.params as { fileHash: string };
        ////  // console.log(`Received fileHash: ${fileHash}`);
        // file content from db
        // return as a blob

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


        // Get the host from the request headers
        const host = request.headers.host || `${getHost()}:${getPort()}`;

        // Get the protocol (http or https)
        const protocol = request.protocol || 'https'

        // Construct the full URL
        const url = `${protocol}://${host}`;

        const displayData = await getUserApiFileInfo(url, session.address)
        return reply.code(200).send({
            success: true,
            message: 'Aqua tree saved successfully',
            data: displayData
        });

    });

    fastify.post('/explorer_files', async (request, reply) => {

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
            const maxFileSize = 20 * 1024 * 1024;
            if (data.file.bytesRead > maxFileSize) {
                return reply.code(413).send({ error: 'File too large. Maximum file size is 20MB' });
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
            //  // console.log(`File size: ${fileSizeInBytes} bytes`);


            let fileObjectPar: FileObject = {
                fileContent: uint8Array,
                fileName: data.filename,
                path: "./",
                fileSize: fileSizeInBytes
            }

            // Get the host from the request headers
            const host = request.headers.host || `${getHost()}:${getPort()}`;

            // Get the protocol (http or https)
            const protocol = request.protocol || 'https'


            let res = await aquafier.createGenesisRevision(
                fileObjectPar,
                isForm,
                enableContent,
                enableScalar
            )

            if (res.isErr()) {

                console.log("^&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&")
                console.log(`error`)
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
                console.log("^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^")
                console.log(`error`)
                return reply.code(500).send({ error: 'Genesis revision cannot be found' });
            }


            let revisionData: Revision = resData.revisions[genesisHash];
            let fileHash = revisionData.file_hash; // Extract file hash


            if (!fileHash) {
                console.log("^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^")
                console.log(`error`)
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

                // Parse the timestamp string into a valid Date object
                // const localTimestamp = new Date(
                //     Date.UTC(
                //         parseInt(revisionData.local_timestamp.slice(0, 4)),   // Year
                //         parseInt(revisionData.local_timestamp.slice(4, 6)) - 1,  // Month (0-indexed)
                //         parseInt(revisionData.local_timestamp.slice(6, 8)),   // Day
                //         parseInt(revisionData.local_timestamp.slice(8, 10)),  // Hours
                //         parseInt(revisionData.local_timestamp.slice(10, 12)), // Minutes
                //         parseInt(revisionData.local_timestamp.slice(12, 14))  // Seconds
                //     )
                // );

                let filepubkeyhash = `${session.address}_${genesisHash}`

                await prisma.latest.create({
                    data: {
                        hash: filepubkeyhash,
                        user: session.address,
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

                // if is form add the form elements 
                if (isForm) {
                    let revisioValue = Object.keys(revisionData);
                    for (let formItem in revisioValue) {
                        if (formItem.startsWith("form_")) {
                            await prisma.aquaForms.create({
                                data: {
                                    hash: filepubkeyhash,
                                    key: formItem,
                                    value: revisioValue[formItem],
                                    type: typeof revisioValue[formItem]
                                }
                            });
                        }
                    }
                }


                let existingFileIndex = await prisma.fileIndex.findFirst({
                    where: { file_hash: fileHash },
                });

                if (existingFileIndex) {
                    // existingFileIndex.reference_count = existingFileIndex.reference_count! + 1;
                    existingFileIndex.pubkey_hash = [...existingFileIndex.pubkey_hash, `${session.address}_${genesisHash}`]
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
                    const filePath = path.join(UPLOAD_DIR, filename);

                    // Save the file
                    // await pump(data.file, fs.createWriteStream(filePath))
                    await fs.promises.writeFile(filePath, fileBuffer);

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
                    })

                    await prisma.fileIndex.create({
                        data: {
                            pubkey_hash: [filepubkeyhash],
                            file_hash: fileHash,
                        }
                    })

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

                }

            } catch (error) {
                console.log("======================================")
                console.log(`error ${error}`)
                let logs: LogData[] = []
                logs.push({
                    log: `Error saving genesis revision`,
                    logType: LogType.ERROR
                })

                return reply.code(500).send({
                    data: res.data
                })

            }

            // Return success response
            return reply.code(200).send({
                aquaTree: resData,
                fileObject: fileObject
            });
        } catch (error) {
            console.log("++++++++++++++++++++++++++++++++++++++=")
            console.log(`error ${error}`)
            request.log.error(error);
            return reply.code(500).send({ error: 'File upload failed' });
        }

    });

    fastify.post('/explorer_delete_file', async (request, reply) => {
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

        let response = await deleteAquaTreeFromSystem(session.address, revisionDataPar.revisionHash)

        return reply.code(response[0]).send({ success: response[0] == 200 ? true : false, message: response[1] });
    });

    fastify.post('/transfer_chain', async (request, reply) => {

        try {
            const { latestRevisionHash, userAddress } = request.body as { latestRevisionHash: string, userAddress: string };

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
                where: { address: session.address }
            });

            if (!targetUser) {
                await prisma.users.create({
                    data: { address: session.address }
                });
            }
           
            if (entireChain.length === 0) {
                return reply.code(404).send({   success: false, message: "No revisions found for the provided hash" });

            }
            if (entireChain.length > 1) {
                return reply.code(400).send({ success: false, message: "Multiple revisions found for the provided hash. Please provide a unique revision hash." });     
            }

            

            // Transfer the chain to the target user (session.address)
            const transferResult = await transferRevisionChainData(
                session.address,
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
                message: '',//`Chain transferred successfully: ${transferResult.transferredRevisions} revisions and ${transferResult.linkedChainsTransferred} linked chains`,
                latestHashes:'' // transferResult.latestHashes
            });
        } catch (error: any) {
            console.error("Error in transfer_chain operation:", error);
            return reply.code(500).send({
                success: false,
                message: `Error transferring chain: ${error.message}`,
                details: error
            });
        }
    })

    fastify.post('/merge_chain', async (request, reply) => {
        try {
            const { latestRevisionHash, userAddress, mergeStrategy } = request.body as {
                latestRevisionHash: string,
                userAddress: string,
                mergeStrategy?: "replace" | "fork"  // Optional merge strategy
            };

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

            const host = request.headers.host || 'localhost:3000'; // Provide a default host
            const protocol = request.protocol || 'http';
            const url = `${protocol}://${host}`;

            // Fetch the entire chain from the source user
            const entireChain = await fetchCompleteRevisionChain(latestRevisionHash, userAddress, url);

            // Check if the user exists (create if not)
            const targetUser = await prisma.users.findUnique({
                where: { address: session.address }
            });

            if (!targetUser) {
                await prisma.users.create({
                    data: { address: session.address }
                });
            }

            // Merge the chain to the target user (session.address)
            const mergeResult = await mergeRevisionChain(
                entireChain,
                session.address,
                userAddress,
                mergeStrategy || "fork" // Use the provided strategy or default to "fork"
            );

            if (!mergeResult.success) {
                return reply.code(500).send({
                    success: false,
                    message: mergeResult.message
                });
            }

            return reply.code(200).send({
                success: true,
                message: `Chain merged successfully using "${mergeResult.strategy}" strategy: ${mergeResult.transferredRevisions} revisions and ${mergeResult.linkedChainsTransferred} linked chains`,
                latestHashes: mergeResult.latestHashes,
                mergePoint: mergeResult.mergePoint,
                strategy: mergeResult.strategy
            });
        } catch (error: any) {
            console.error("Error in merge_chain operation:", error);
            return reply.code(500).send({
                success: false,
                message: `Error merging chain: ${error.message}`,
                details: error
            });
        }
    })

}

