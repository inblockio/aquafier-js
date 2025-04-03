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
import { createAquaTreeFromRevisions, fetchAquatreeFoUser, FetchRevisionInfo, findAquaTreeRevision, saveAquaTree } from '../utils/revisions_utils';
import { fileURLToPath } from 'url';
import { AquaForms, FileIndex, Signature, Witness, WitnessEvent } from '@prisma/client';
import { getHost, getPort } from '../utils/api_utils';
import { AquaJsonInZip, DeleteRevision, SaveAquaTree } from '../models/request_models';
// import getStream from 'get-stream';
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
            // Verify file size (200MB = 200 * 1024 * 1024 bytes)
            const maxFileSize = 200 * 1024 * 1024;
            if (data.file.bytesRead > maxFileSize) {
                return reply.code(413).send({ error: 'File too large. Maximum file size is 200MB' });
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
            // Verify file size (200MB = 200 * 1024 * 1024 bytes)
            const maxFileSize = 200 * 1024 * 1024;
            if (data.file.bytesRead > maxFileSize) {
                return reply.code(413).send({ error: 'File too large. Maximum file size is 200MB' });
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
            console.log(`Processing revision chain starting with: ${filepubkeyhash}`);
            //if previous verification hash is not empty find the previous one
            if (latestRevionData?.previous !== null && latestRevionData?.previous?.length !== 0) {
                let aquaTreerevision = await findAquaTreeRevision(latestRevionData?.previous!!);
                revisionData.push(...aquaTreerevision);
            }
            console.log(`Found ${revisionData.length} revisions in the chain`);
        } catch (e: any) {
            return reply.code(500).send({ success: false, message: `Error fetching a revision ${JSON.stringify(e, null, 4)}` });
        }

        try {
            // Use Prisma transaction to ensure all or nothing execution
            await prisma.$transaction(async (tx) => {
                console.log('Starting revision chain deletion transaction');
                const revisionPubkeyHashes = revisionData.map(rev => rev.pubkey_hash);
                console.log(`Revisions to delete: ${revisionPubkeyHashes.join(', ')}`);

                // Step 1: First delete all entries in related tables that reference our revisions
                // We need to delete child records before parent records to avoid foreign key constraints

                // 1a. Delete AquaForms entries
                const deletedAquaForms = await tx.aquaForms.deleteMany({
                    where: {
                        hash: {
                            in: revisionPubkeyHashes
                        }
                    }
                });
                console.log(`Deleted ${deletedAquaForms.count} AquaForms entries`);

                // 1b. Delete Witness entries (note: we need to handle WitnessEvent separately)
                // We need to handle this first because Witness has a foreign key to Revision
                const witnesses = await tx.witness.findMany({
                    where: {
                        hash: {
                            in: revisionPubkeyHashes
                        }
                    }
                });

                const witnessRoots = witnesses.map(w => w.Witness_merkle_root).filter(Boolean) as string[];
                console.log(`Found ${witnesses.length} Witness entries with ${witnessRoots.length} unique merkle roots`);

                const deletedWitnesses = await tx.witness.deleteMany({
                    where: {
                        hash: {
                            in: revisionPubkeyHashes
                        }
                    }
                });
                console.log(`Deleted ${deletedWitnesses.count} Witness entries`);

                // Check if any WitnessEvents are no longer referenced
                let deletedWitnessEvents = 0;
                for (const root of witnessRoots) {
                    const remainingWitnesses = await tx.witness.count({
                        where: {
                            Witness_merkle_root: root
                        }
                    });

                    if (remainingWitnesses === 0) {
                        await tx.witnessEvent.delete({
                            where: {
                                Witness_merkle_root: root
                            }
                        });
                        deletedWitnessEvents++;
                    }
                }
                console.log(`Deleted ${deletedWitnessEvents} WitnessEvent entries`);

                // 1c. Delete Link entries
                const deletedLinks = await tx.link.deleteMany({
                    where: {
                        hash: {
                            in: revisionPubkeyHashes
                        }
                    }
                });
                console.log(`Deleted ${deletedLinks.count} Link entries`);

                // 1d. Delete Signature entries
                const deletedSignatures = await tx.signature.deleteMany({
                    where: {
                        hash: {
                            in: revisionPubkeyHashes
                        }
                    }
                });
                console.log(`Deleted ${deletedSignatures.count} Signature entries`);

                // Step 2: Handle File and FileIndex entries
                // First, find all fileIndexes that reference our revisions
                console.log('Finding FileIndex entries that reference the revisions to delete');
                
                // Start with exact matches using hasSome
                const fileIndexesToProcess = await tx.fileIndex.findMany({
                    where: {
                        hash: {
                            hasSome: revisionPubkeyHashes
                        }
                    },
                    select: {
                        id: true,
                        file_hash: true,
                        reference_count: true,
                        hash: true
                    }
                });
                
                // If few or no matches, try a more flexible search with case-insensitive partial matching
                if (fileIndexesToProcess.length < revisionPubkeyHashes.length) {
                    console.log(`Found only ${fileIndexesToProcess.length} exact matches, trying partial matching`);
                    
                    // For each revision hash, try to find partial matches
                    for (const revHash of revisionPubkeyHashes) {
                        // This is a complex query to find any FileIndex where any element in the hash array
                        // contains the revision hash as a substring
                        // Build the SQL query differently based on whether we have existing IDs
                        let rawQuery;
                        if (fileIndexesToProcess.length > 0) {
                            // If we have existing IDs, exclude them from the query
                            const existingIdsFormatted = fileIndexesToProcess.map(fi => `'${fi.id}'`).join(',');
                            rawQuery = await tx.$queryRaw`
                                SELECT id, file_hash, reference_count, hash 
                                FROM file_index 
                                WHERE EXISTS (
                                    SELECT 1 FROM unnest(hash) AS h 
                                    WHERE LOWER(h) LIKE LOWER('%' || ${revHash} || '%')
                                )
                                AND id NOT IN (${existingIdsFormatted})
                            `;
                        } else {
                            // If no existing IDs, just run the query without the NOT IN clause
                            rawQuery = await tx.$queryRaw`
                                SELECT id, file_hash, reference_count, hash 
                                FROM file_index 
                                WHERE EXISTS (
                                    SELECT 1 FROM unnest(hash) AS h 
                                    WHERE LOWER(h) LIKE LOWER('%' || ${revHash} || '%')
                                )
                            `;
                        }
                        
                        // Convert raw query results and add to our list
                        const rawResults = rawQuery as { id: string, file_hash: string, reference_count: number | null, hash: string[] }[];
                        if (rawResults.length > 0) {
                            console.log(`Found ${rawResults.length} additional matches with partial matching for ${revHash}`);
                            fileIndexesToProcess.push(...rawResults);
                        }
                    }
                }
                
                console.log(`Found total of ${fileIndexesToProcess.length} FileIndex entries to process`);
                
                // Track which file indexes to delete and which to update
                const fileIndexesToDelete = [];
                const fileIndexesToUpdate = [];
                const fileHashesToUpdate = new Set<string>();
                const fileHashesToDelete = new Set<string>();
                
                // Process each file index based on its reference count
                for (const fileIndex of fileIndexesToProcess) {
                    const refCount = fileIndex.reference_count;
                    
                    if (refCount === null || refCount <= 1) {
                        // If reference count is null or ≤ 1, mark for deletion
                        fileIndexesToDelete.push(fileIndex.id);
                        if (fileIndex.file_hash) {
                            fileHashesToDelete.add(fileIndex.file_hash);
                        }
                    } else if (refCount >= 2) {
                        // If reference count is >= 2, mark for update
                        fileIndexesToUpdate.push(fileIndex.id);
                        if (fileIndex.file_hash) {
                            fileHashesToUpdate.add(fileIndex.file_hash);
                        }
                        
                        // If it's exactly 2, it will become 1 after decrementing, so mark for deletion too
                        // if (refCount === 2) {
                        //     fileIndexesToDelete.push(fileIndex.id);
                        //     if (fileIndex.file_hash) {
                        //         fileHashesToDelete.add(fileIndex.file_hash);
                        //     }
                        // }
                    }
                }
                
                console.log(`FileIndex operations planned: ${fileIndexesToUpdate.length} to update, ${fileIndexesToDelete.length} to delete`);
                console.log(`File operations planned: ${fileHashesToUpdate.size} to update, ${fileHashesToDelete.size} to delete`);
                
                // Step 2a: Update reference counts for file indexes that need updating
                if (fileIndexesToUpdate.length > 0) {
                    // Decrement reference count for file indexes
                    const updatedFileIndexes = await tx.fileIndex.updateMany({
                        where: {
                            id: {
                                in: fileIndexesToUpdate
                            }
                        },
                        data: {
                            reference_count: {
                                decrement: 1
                            }
                        }
                    });
                    console.log(`Updated ${updatedFileIndexes.count} FileIndex entries`);
                    
                    // Update files linked to these file indexes
                    if (fileHashesToUpdate.size > 0) {
                        const updatedFiles = await tx.file.updateMany({
                            where: {
                                file_hash: {
                                    in: Array.from(fileHashesToUpdate) as string[]
                                }
                            },
                            data: {
                                reference_count: {
                                    decrement: 1
                                }
                            }
                        });
                        console.log(`Updated ${updatedFiles.count} File entries`);
                    }
                }
                
                // Step 2b: Delete file indexes with reference count <= 1
                if (fileIndexesToDelete.length > 0) {
                    const deletedFileIndexes = await tx.fileIndex.deleteMany({
                        where: {
                            id: {
                                in: fileIndexesToDelete
                            }
                        }
                    });
                    console.log(`Deleted ${deletedFileIndexes.count} FileIndex entries`);
                    
                    // Delete the files if they exist
                    if (fileHashesToDelete.size > 0) {
                        const uniqueFileHashes = Array.from(fileHashesToDelete).filter(Boolean) as string[];
                        console.log(`File hashes to delete: ${uniqueFileHashes.length}`);
                        
                        // First get the files to delete so we can handle filesystem files
                        const filesToDelete = await tx.file.findMany({
                            where: {
                                file_hash: {
                                    in: uniqueFileHashes
                                }
                            }
                        });
                        
                        // Delete any filesystem files
                        for (const file of filesToDelete) {
                            if (file.content) {
                                try {
                                    fs.unlinkSync(file.content);
                                    console.log(`Deleted file from filesystem: ${file.content}`);
                                } catch (er) {
                                    console.log(`Error deleting file from filesystem: ${file.content}`, er);
                                    // Continue even if file deletion fails
                                }
                            }
                        }
                        
                        // Delete the database records
                        const deletedFiles = await tx.file.deleteMany({
                            where: {
                                file_hash: {
                                    in: uniqueFileHashes
                                }
                            }
                        });
                        console.log(`Deleted ${deletedFiles.count} File entries`);
                    }
                }

                // Step 3: Remove any references to our revisions from other revisions
                const updatedRevisions = await tx.revision.updateMany({
                    where: {
                        previous: {
                            in: revisionPubkeyHashes
                        }
                    },
                    data: {
                        previous: null
                    }
                });
                console.log(`Updated ${updatedRevisions.count} revisions that referenced the deleted revisions`);

                // Step 4: Delete the latest entry - we need to do this before deleting revisions
                const deletedLatest = await tx.latest.deleteMany({
                    where: {
                        hash: {
                            in: revisionPubkeyHashes
                        }
                    }
                });
                console.log(`Deleted ${deletedLatest.count} Latest entries`);

                // Step 5: Finally, delete all revisions
                let deletedRevisionCount = 0;
                for (let item of revisionData) {
                    await tx.revision.delete({
                        where: {
                            pubkey_hash: item.pubkey_hash
                        }
                    });
                    deletedRevisionCount++;
                }
                console.log(`Deleted ${deletedRevisionCount} Revision entries`);
                console.log('Revision chain deletion completed successfully');
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

}

