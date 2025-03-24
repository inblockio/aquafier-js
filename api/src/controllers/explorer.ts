import Aquafier, { AquaTree, FileObject, getHashSum, LogData, LogType, OrderRevisionInAquaTree, Revision } from 'aqua-js-sdk';
import { FastifyInstance } from 'fastify';
import { prisma } from '../database/db';
import { BusboyFileStream } from '@fastify/busboy';
import { getFileUploadDirectory, isTextFile, isTextFileProbability, streamToBuffer } from '../utils/file_utils';
import path from 'path';
import JSZip from "jszip";
import { randomUUID } from 'crypto';
import util from 'util';
import { pipeline } from 'stream';
import * as fs from "fs"
import { error } from 'console';
import { createAquaTreeFromRevisions, fetchAquatreeFoUser, FetchRevisionInfo, findAquaTreeRevision, saveAquaTree } from '@/utils/revisions_utils';
import { fileURLToPath } from 'url';
import { AquaForms, FileIndex, Signature, Witness, WitnessEvent } from '@prisma/client';
import { getHost, getPort } from '@/utils/api_utils';
import { AquaJsonInZip, DeleteRevision, SaveAquaTree } from '@/models/request_models';
import getStream from 'get-stream';
// Promisify pipeline
const pump = util.promisify(pipeline);

export default async function explorerController(fastify: FastifyInstance) {



    fastify.post('/explorer_aqua_zip', async (request, reply) => {

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

            let genesis_name = "";
            // const zip = new JSZip();
            // **Convert the file stream to a Buffer**
            // const fileBuffer = await getStream.buffer(data.file);
            // const zipData = await zip.loadAsync(fileBuffer);
            // Convert the stream to a Buffer manually
            const chunks = [];
            for await (const chunk of data.file) {
                chunks.push(chunk);
            }
            const fileBuffer = Buffer.concat(chunks);

            // Load ZIP contents
            const zip = new JSZip();
            const zipData = await zip.loadAsync(fileBuffer);





            for (const fileName in zipData.files) {
                if (fileName == 'aqua.json') {
                    const file = zipData.files[fileName];

                    let fileContent = await file.async('text');
                   //  console.log(`aqua.json => File name: ${fileName}, Content: ${fileContent}`);

                    let aquaData: AquaJsonInZip = JSON.parse(fileContent)


                    for (let nameHash of aquaData.name_with_hash) {

                        let aquaFileName = `${nameHash.name}.aqua.json`;
                       //  console.log(`name ${aquaFileName} ............ `)
                        const aquaFile = zipData.files[aquaFileName];
                        if (aquaFile == null || aquaFile == undefined) {
                            return reply.code(500).send({ error: `Expected to find ${aquaFileName} as defined in aqua.json but file not found ` });
                        }

                        let aquaFileDataText = await aquaFile.async('text');

                        let aquaData: AquaTree = JSON.parse(aquaFileDataText)


                        let fileResult = await prisma.file.findFirst({
                            where: {
                                file_hash: nameHash.hash
                            }
                        })

                        let allHashes = Object.keys(aquaData.revisions);
                        let genesisHash = allHashes[0];
                        for (let hashItem of allHashes) {
                            let revision = aquaData.revisions[hashItem];
                            if (revision.previous_verification_hash == null || revision.previous_verification_hash == undefined || revision.previous_verification_hash == "") {
                                if (genesisHash != hashItem) {
                                    genesisHash = hashItem
                                }
                                break
                            }
                        }

                        let filepubkeyhash = `${session.address}_${genesisHash}`


                        const fileAsset = zipData.files[nameHash.name];

                        if (fileResult == null) {


                            // Save the asset to the file system
                            const fileContent = await fileAsset.async('nodebuffer'); // Correctly handle binary files

                            const UPLOAD_DIR = getFileUploadDirectory();
                            await fs.promises.mkdir(UPLOAD_DIR, { recursive: true }); // Ensure directory exists

                            const uniqueFileName = `${randomUUID()}-${path.basename(nameHash.name)}`;
                            const filePath = path.join(UPLOAD_DIR, uniqueFileName);

                            await fs.promises.writeFile(filePath, fileContent);
                           //  console.log(`------> Saved file: ${filePath}`);


                            let fileData = {

                                content: filePath,
                                file_hash: nameHash.hash,
                                hash: filepubkeyhash,
                                reference_count: 1,
                            }
                           //  console.log(`--> File Data ${JSON.stringify(fileData, null, 4)} `)
                            fileResult = await prisma.file.create({

                                data: fileData
                            })

                        } else {

                            await prisma.file.update({
                                where: {
                                    hash: fileResult.hash
                                },
                                data: {
                                    reference_count: fileResult.reference_count! + 1
                                }
                            })
                        }


                        if (fileResult == null) {
                            return reply.code(500).send({ success: false, message: `File index should not be null` });
                        }

                        // update  file index

                        let existingFileIndex = await prisma.fileIndex.findFirst({
                            where: { file_hash: nameHash.hash },
                        });

                        if (existingFileIndex) {
                            existingFileIndex.hash = [...existingFileIndex.hash, filepubkeyhash]
                            await prisma.fileIndex.update({
                                data: existingFileIndex,
                                where: {
                                    id: existingFileIndex.id
                                }
                            })
                        } else {
                            await prisma.fileIndex.create({

                                data: {
                                    id: fileResult.hash,
                                    hash: [filepubkeyhash],
                                    file_hash: nameHash.hash,
                                    uri: nameHash.name,
                                    reference_count: 1

                                }
                            })

                        }
                    }
                    break;
                }

            }

            for (const fileName in zipData.files) {
               //  console.log(`=> file name ${fileName}`)
                const file = zipData.files[fileName];

                try {
                    if (fileName.endsWith(".aqua.json")) {
                        let fileContent = await file.async('text');
                       //  console.log(`=> File name: ${fileName}, Content: ${fileContent}`);

                        let aquaTree: AquaTree = JSON.parse(fileContent);

                        // save the aqua tree 
                        await saveAquaTree(aquaTree, session.address)



                    } else if (fileName == 'aqua.json') {
                        //ignored for now
                       //  console.log(`ignore aqua.json in second loop`)
                    } else {
                       //  console.log(`ignore the asset  ${fileName}`)

                    }
                } catch (e) {
                    return reply.code(500).send({ error: `An error occured ${e}` });
                }
            }

            // fetch all explorer files belonging to this user.


            // fetch all from latetst

            let latest = await prisma.latest.findMany({
                where: {
                    user: session.address
                }
            });

            if (latest.length == 0) {
                return reply.code(200).send({ data: [] });
            }


            // Get the host from the request headers
            const host = request.headers.host || `${getHost()}:${getPort()}`;

            // Get the protocol (http or https)
            const protocol = request.protocol || 'https'

            // Construct the full URL
            const url = `${protocol}://${host}`;

            let displayData = await fetchAquatreeFoUser(url, latest)

            return reply.code(200).send({ data: displayData });
        } catch (error) {
            request.log.error(error);
            return reply.code(500).send({ error: 'File upload failed' });
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

            const fileBuffer = await streamToBuffer(data.file);
            let fileContent = fileBuffer.toString('utf-8');

            let aquaTreeWithFileObject: AquaTree = JSON.parse(fileContent)

            // save the aqua tree 
            await saveAquaTree(aquaTreeWithFileObject, session.address)

            return reply.code(200).send({ error: 'aqua tree saved successfully' });
        } catch (error) {
            request.log.error(error);
            return reply.code(500).send({ error: 'File upload failed' });
        }



    });

    // get file using file hash
    fastify.get('/explorer_files', async (request, reply) => {
        // const { fileHash } = request.params as { fileHash: string };
        ////  console.log(`Received fileHash: ${fileHash}`);
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


        // fetch all from latetst

        let latest = await prisma.latest.findMany({
            where: {
                user: session.address
            }
        });

        if (latest.length == 0) {
            return reply.code(200).send({ data: [] });
        }


        // Get the host from the request headers
        const host = request.headers.host || `${getHost()}:${getPort()}`;

        // Get the protocol (http or https)
        const protocol = request.protocol || 'https'

        // Construct the full URL
        const url = `${protocol}://${host}`;

        let displayData = await fetchAquatreeFoUser(url, latest)


        return reply.code(200).send({ data: displayData })
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



            const fileBuffer = await streamToBuffer(data.file);
            let fileContent = fileBuffer.toString('utf-8');
            const fileSizeInBytes = fileBuffer.length;
           //  console.log(`File size: ${fileSizeInBytes} bytes`);


            let fileObjectPar: FileObject = {
                fileContent: fileContent,
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
            let allHashes: string[] = Object.keys(resData.revisions);

            let genesisHash = allHashes[0];
            for (let hashItem of allHashes) {
                let revision = resData.revisions[hashItem];
                if (revision.previous_verification_hash == null || revision.previous_verification_hash == undefined || revision.previous_verification_hash == "") {
                    if (genesisHash != hashItem) {
                        genesisHash = hashItem
                    }
                    break
                }
            }


            let revisionData: Revision = resData.revisions[genesisHash];
            let fileHash = revisionData.file_hash; // Extract file hash


            if (!fileHash) {
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
                        // user: session.address, // Replace with actual user identifier (e.g., request.user.id)
                        nonce: revisionData.file_nonce || "",
                        shared: [],
                        // contract: revisionData.witness_smart_contract_address
                        //     ? [{ address: revisionData.witness_smart_contract_address }]
                        //     : [],
                        previous: revisionData.previous_verification_hash || "",
                        // children: {},
                        local_timestamp: revisionData.local_timestamp,
                        revision_type: revisionData.revision_type,
                        verification_leaves: revisionData.leaves || [],

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


                // Check if file already exists in the database
                let existingFile = await prisma.file.findFirst({
                    where: { file_hash: fileHash },
                });



                let existingFileIndex = await prisma.fileIndex.findFirst({
                    where: { file_hash: fileHash },
                });

                if (existingFileIndex) {
                    existingFileIndex.reference_count = existingFileIndex.reference_count! + 1;
                    existingFileIndex.hash = [...existingFileIndex.hash, genesisHash]
                    await prisma.fileIndex.update({
                        data: existingFileIndex,
                        where: {
                            id: existingFileIndex.id
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

                    let fileCreation = await prisma.file.create({
                        data: {
                            hash: filepubkeyhash,
                            file_hash: fileHash,
                            content: filePath,
                            reference_count: 1,
                        }
                    })

                   //  console.log(JSON.stringify(fileCreation, null, 4))
                    console.error("====We are through here: ", fileCreation.hash)

                    await prisma.fileIndex.create({
                        data: {
                            id: fileCreation.hash,
                            hash: [filepubkeyhash],
                            file_hash: fileHash,
                            uri: data.filename,
                            reference_count: 1
                        }
                    })
                   //  console.log("Saved successfully")
                }

            } catch (error) {
               //  console.log("======================================")
               //  console.log(`error ${error}`)
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

        let filepubkeyhash = `${session.address}_${revisionDataPar.revisionHash}`;

        //fetch all the revisions 
        let revisionData = [];
        // fetch latest revision 
        let latestRevionData = await prisma.revision.findFirst({
            where: {
                pubkey_hash: filepubkeyhash
            }
        });

        if (latestRevionData == null) {
            return reply.code(500).send({ success: false, message: `revision with hash ${revisionDataPar.revisionHash} not found in system` });
        }
        revisionData.push(latestRevionData);

        try {
           //  console.log(`previous ${latestRevionData?.previous}`);
            //if previous verification hash is not empty find the previous one
            if (latestRevionData?.previous !== null && latestRevionData?.previous?.length !== 0) {
                let aquaTreerevision = await findAquaTreeRevision(latestRevionData?.previous!!);
                revisionData.push(...aquaTreerevision);
            }
        } catch (e: any) {
            return reply.code(500).send({ success: false, message: `Error fetching a revision ${JSON.stringify(e, null, 4)}` });
        }

        try {
            // Use Prisma transaction to ensure all or nothing execution
            await prisma.$transaction(async (tx) => {
                const revisionPubkeyHashes = revisionData.map(rev => rev.pubkey_hash);

                // Step 1: First delete all entries in related tables that reference our revisions
                // We need to delete child records before parent records to avoid foreign key constraints

                // Delete AquaForms entries
                await tx.aquaForms.deleteMany({
                    where: {
                        hash: {
                            in: revisionPubkeyHashes
                        }
                    }
                });

                // Delete Signature entries
                await tx.signature.deleteMany({
                    where: {
                        hash: {
                            in: revisionPubkeyHashes
                        }
                    }
                });

                // Delete Witness entries (note: we need to handle WitnessEvent separately)
                const witnesses = await tx.witness.findMany({
                    where: {
                        hash: {
                            in: revisionPubkeyHashes
                        }
                    }
                });

                const witnessRoots = witnesses.map(w => w.Witness_merkle_root).filter(Boolean);

                await tx.witness.deleteMany({
                    where: {
                        hash: {
                            in: revisionPubkeyHashes
                        }
                    }
                });

                // Check if any WitnessEvents are no longer referenced
                for (const root of witnessRoots) {
                    const remainingWitnesses = await tx.witness.count({
                        where: {
                            Witness_merkle_root: root
                        }
                    });

                    if (remainingWitnesses === 0 && root) {
                        await tx.witnessEvent.delete({
                            where: {
                                Witness_merkle_root: root
                            }
                        });
                    }
                }

                // Delete Link entries
                await tx.link.deleteMany({
                    where: {
                        hash: {
                            in: revisionPubkeyHashes
                        }
                    }
                });

                // Handle File entries
                // First, find all files related to our revisions
                const files = await tx.file.findMany({
                    where: {
                        hash: {
                            in: revisionPubkeyHashes
                        }
                    }
                });

                // Handle FileIndex entries first (as they reference files)
                for (const file of files) {
                    // Find FileIndex entries that reference this file
                    const fileIndexEntries = await tx.fileIndex.findMany({
                        where: {
                            hash: {
                                has: file.hash
                            }
                        }
                    });

                    for (const fileIndex of fileIndexEntries) {
                        if ((fileIndex.reference_count || 0) <= 1) {
                            // If this is the last reference, delete the FileIndex entry
                            await tx.fileIndex.delete({
                                where: {
                                    id: fileIndex.id
                                }
                            });
                        } else {
                            // Otherwise, remove the reference and decrement the count
                            await tx.fileIndex.update({
                                where: {
                                    id: fileIndex.id
                                },
                                data: {
                                    hash: fileIndex.hash.filter(h => h !== file.hash),
                                    reference_count: (fileIndex.reference_count || 0) - 1
                                }
                            });
                        }
                    }

                    // Now we can safely handle the file itself
                    if ((file.reference_count || 0) <= 1) {
                        // If this is the last reference, delete the file
                        if (file.content) {
                            try {
                                fs.unlinkSync(file.content);
                            } catch (er) {
                               //  console.log("Error deleting file from filesystem:", er);
                                // Continue even if file deletion fails
                            }
                        }

                        await tx.file.delete({
                            where: {
                                hash: file.hash
                            }
                        });
                    } else {
                        // Otherwise, decrement the reference count
                        await tx.file.update({
                            where: {
                                hash: file.hash
                            },
                            data: {
                                reference_count: (file.reference_count || 0) - 1
                            }
                        });
                    }
                }

                // Step 2: Remove any references to our revisions from other revisions
                await tx.revision.updateMany({
                    where: {
                        previous: {
                            in: revisionPubkeyHashes
                        }
                    },
                    data: {
                        previous: null
                    }
                });

                // Step 3: Delete the latest entry - we need to do this before deleting revisions
                await tx.latest.deleteMany({
                    where: {
                        hash: {
                            in: revisionPubkeyHashes
                        }
                    }
                });

                // Step 4: Finally, delete all revisions
                for (let item of revisionData) {
                    await tx.revision.delete({
                        where: {
                            pubkey_hash: item.pubkey_hash
                        }
                    });
                   //  console.log(`Deleted revision with pubkey_hash: ${item.pubkey_hash}`);
                }
            });

            return reply.code(200).send({ success: true, message: "File and revisions deleted successfully" });
        } catch (error: any) {
            console.error("Error in delete operation:", error);
            return reply.code(500).send({
                success: false,
                message: `Error deleting file: ${error.message}`,
                details: error
            });
        }
    });

    // fastify.post('/explorer_delete_file', async (request, reply) => {
    //     // Read `nonce` from headers
    //     const nonce = request.headers['nonce']; // Headers are case-insensitive

    //     // Check if `nonce` is missing or empty
    //     if (!nonce || typeof nonce !== 'string' || nonce.trim() === '') {
    //         return reply.code(401).send({ error: 'Unauthorized: Missing or empty nonce header' });
    //     }

    //     const session = await prisma.siweSession.findUnique({
    //         where: { nonce }
    //     });

    //     if (!session) {
    //         return reply.code(403).send({ success: false, message: "Nonce is invalid" });
    //     }

    //     const revisionDataPar = request.body as DeleteRevision;

    //     if (!revisionDataPar.revisionHash) {
    //         return reply.code(400).send({ success: false, message: "revision hash is required" });
    //     }

    //     let filepubkeyhash = `${session.address}_${revisionDataPar.revisionHash}`;

    //     //fetch all the revisions 
    //     let revisionData = [];
    //     // fetch latest revision 
    //     let latestRevionData = await prisma.revision.findFirst({
    //         where: {
    //             pubkey_hash: filepubkeyhash
    //         }
    //     });

    //     if (latestRevionData == null) {
    //         return reply.code(500).send({ success: false, message: `revision with hash ${revisionDataPar.revisionHash} not found in system` });
    //     }
    //     revisionData.push(latestRevionData);


    //     try {
    //        //  console.log(`previous ${latestRevionData?.previous}`);
    //         //if previous verification hash is not empty find the previous one
    //         if (latestRevionData?.previous !== null && latestRevionData?.previous?.length !== 0) {
    //             let aquaTreerevision = await findAquaTreeRevision(latestRevionData?.previous!!);
    //             revisionData.push(...aquaTreerevision);
    //         }
    //     } catch (e: any) {
    //         return reply.code(500).send({ success: false, message: `Error fetching a revision ${JSON.stringify(e, null, 4)}` });
    //     }

    //     try {
    //         // Use Prisma transaction to ensure all or nothing execution
    //         await prisma.$transaction(async (tx) => {
    //             // Step 1: Handle file references and file index first
    //             for (let item of revisionData) {
    //                 if (item.previous == "" || item.previous == null || item.previous.trim().length == 0) {
    //                     let filesData = await tx.file.findFirst({
    //                         where: {
    //                             hash: item.pubkey_hash
    //                         }
    //                     });

    //                     if (filesData != null) {
    //                         // Handle file index references first
    //                         const fileIndexData = await tx.fileIndex.findFirst({
    //                             where: {
    //                                 hash: {
    //                                     has: item.pubkey_hash
    //                                 }
    //                             }
    //                         });

    //                         if (fileIndexData != null) {
    //                             if (fileIndexData.reference_count ?? 0 <= 1) {
    //                                 await tx.fileIndex.delete({
    //                                     where: {
    //                                         id: fileIndexData.id
    //                                     }
    //                                 });
    //                             } else {
    //                                 await tx.fileIndex.update({
    //                                     where: {
    //                                         id: fileIndexData.id
    //                                     },
    //                                     data: {
    //                                         hash: fileIndexData.hash.filter((item2) => item2 != item.pubkey_hash),
    //                                         reference_count: fileIndexData.reference_count! - 1
    //                                     }
    //                                 });
    //                             }
    //                         }

    //                         // Update the file reference count
    //                         if (filesData.reference_count ?? 0 <= 0) {
    //                             if (filesData.content != null) {
    //                                 try {
    //                                     // Note: File system operations are outside the transaction
    //                                     // and will not be rolled back if transaction fails
    //                                     fs.unlinkSync(filesData.content);
    //                                 } catch (er) {
    //                                    //  console.log("Error deleting file from filesystem:", er);
    //                                     // Continue even if file deletion fails
    //                                 }
    //                             }

    //                             await tx.file.delete({
    //                                 where: {
    //                                     hash: item.pubkey_hash
    //                                 }
    //                             });
    //                         } else {
    //                             await tx.file.update({
    //                                 where: {
    //                                     hash: item.pubkey_hash
    //                                 },
    //                                 data: {
    //                                     reference_count: filesData.reference_count! - 1
    //                                 }
    //                             });
    //                         }
    //                     }
    //                 }
    //             }

    //             // Step 2: Find any references to these revisions in other tables and handle them
    //             // This is to fix the circular dependency between revision and latest

    //             // First, find any revisions that reference our revisions
    //             const revisionPubkeyHashes = revisionData.map(rev => rev.pubkey_hash);

    //             // Remove any references to our revisions from other tables
    //             // We need to update any tables that might have foreign keys to our revisions

    //             // For example, update other revisions that might reference these ones
    //             await tx.revision.updateMany({
    //                 where: {
    //                     previous: {
    //                         in: revisionPubkeyHashes
    //                     }
    //                 },
    //                 data: {
    //                     previous: null
    //                 }
    //             });



    //             // Step 3: Delete the latest entry - we need to do this before deleting revisions
    //             try {
    //                 await tx.latest.deleteMany({
    //                     where: {
    //                         hash: {
    //                             in: revisionPubkeyHashes
    //                         }
    //                     }
    //                 });
    //             } catch (e) {
    //                //  console.log("Warning: Error in deleting latest entries:", e);
    //                 // We'll continue, as the transaction will roll back if it fails
    //             }

    //             // Step 3: Delete the latest entry - we need to do this before deleting revisions
    //             try {
    //                 await tx.link.deleteMany({
    //                     where: {
    //                         hash: {
    //                             in: revisionPubkeyHashes
    //                         }
    //                     }
    //                 });
    //             } catch (e) {
    //                //  console.log("Warning: Error in deleting link  entries:", e);
    //                 // We'll continue, as the transaction will roll back if it fails
    //             }

    //             // Step 4: Now we can safely delete all revisions
    //             for (let item of revisionData) {
    //                 await tx.revision.delete({
    //                     where: {
    //                         pubkey_hash: item.pubkey_hash
    //                     }
    //                 });
    //                //  console.log(`Deleted revision with pubkey_hash: ${item.pubkey_hash}`);
    //             }
    //         });

    //         return reply.code(200).send({ success: true, message: "File and revisions deleted successfully" });
    //     } catch (error: any) {
    //         console.error("Error in delete operation:", error);
    //         return reply.code(500).send({
    //             success: false,
    //             message: `Error deleting file: ${error.message}`,
    //             details: error
    //         });
    //     }
    // });



}

