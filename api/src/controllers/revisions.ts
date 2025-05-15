import { canDeleteRevision, deleteRevisionAndChildren } from '../utils/quick_revision_utils';
import { prisma } from '../database/db';
import { DeleteRevision, FetchAquaTreeRequest, SaveRevision } from '../models/request_models';
import { getHost, getPort } from '../utils/api_utils';
import { createAquaTreeFromRevisions, deleteAquaTree, fetchAquatreeFoUser, FetchRevisionInfo, findAquaTreeRevision, getSignatureAquaTrees, getUserApiFileInfo, removeFilePathFromFileIndex, saveAquaTree, saveARevisionInAquaTree, validateAquaTree } from '../utils/revisions_utils';
// import { formatTimestamp } from '../utils/time_utils';
// import { AquaForms, FileIndex, Signature, WitnessEvent, Revision as RevisonDB } from 'prisma/client';
import Aquafier, { AquaTree, FileObject, getAquaTreeFileName, getGenesisHash, OrderRevisionInAquaTree, Revision } from 'aqua-js-sdk';
import { FastifyInstance } from 'fastify';
import * as fs from "fs"
import path from 'path';
import { SYSTEM_WALLET_ADDRESS } from 'src/models/constants';
import { getFileUploadDirectory, streamToBuffer } from 'src/utils/file_utils';
import { randomUUID } from 'crypto';

export default async function revisionsController(fastify: FastifyInstance) {
    // fetch aqua tree from a revision hash
    fastify.post('/tree/data', async (request, reply) => {

        const { latestRevisionHash } = request.body as FetchAquaTreeRequest;
        // fetch all from latetst

        let latestHashInDb = await prisma.latest.findFirst({
            where: {
                hash: latestRevisionHash
                // user: session.address
            }
        });

        if (latestHashInDb == null) {
            return reply.code(403).send({ message: "hash does not exist in latet revision", data: [] });
        }

        // traverse from the latest to the genesis of each 
        //  console.log(`data ${JSON.stringify(latestRevisionHash, null, 4)}`)


        let displayData: Array<{
            aquaTree: AquaTree,
            fileObject: FileObject[]
        }> = []


        // Get the host from the request headers
        const host = request.headers.host || `${getHost()}:${getPort()}`;

        // Get the protocol (http or https)
        const protocol = request.protocol || 'https'
        // if(backendurl)
        // Construct the full URL
        const url = `${protocol}://${host}`;

        // // Get the host from the request headers, with more robust fallback
        // const host = request.headers.host ||
        //     request.headers['x-forwarded-host'] ||
        //     `${getHost()}:${getPort()}`;

        // // Get the protocol with more robust detection
        // const protocol = Array.isArray(request.headers['x-forwarded-proto']) 
        //     ? request.headers['x-forwarded-proto'][0] 
        //     : (request.headers['x-forwarded-proto'] as string | undefined) ||
        //       request.protocol ||
        //       'https';  // Default to https

        // // Construct the full URL
        // const url = `${protocol}://${host}`;

        try {

            const [anAquaTree, fileObject] = await createAquaTreeFromRevisions(latestRevisionHash, url)

            ////  console.log(`----> ${JSON.stringify(anAquaTree, null, 4)}`)
            let sortedAquaTree = OrderRevisionInAquaTree(anAquaTree)
            displayData.push({
                aquaTree: sortedAquaTree,
                fileObject: fileObject
            })
        } catch (e) {
            return reply.code(500).send({ success: false, message: `Error ${e}` });

        }

        return reply.code(200).send({ data: displayData })

    });

    // save revision 
    fastify.post('/tree', async (request, reply) => {
        try {
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

            const revisionData = request.body as SaveRevision

            if (!revisionData.revision) {
                return reply.code(400).send({ success: false, message: "revision Data is required" });
            }
            if (!revisionData.revisionHash) {
                return reply.code(400).send({ success: false, message: "revision hash is required" });
            }

            if (!revisionData.revision.revision_type) {
                return reply.code(400).send({ success: false, message: "revision type is required" });
            }

            if (!revisionData.revision.local_timestamp) {
                return reply.code(400).send({ success: false, message: "revision timestamp is required" });
            }

            if (!revisionData.revision.previous_verification_hash) {
                return reply.code(400).send({ success: false, message: "previous revision hash  is required" });
            }



            const [httpCode, message] = await saveARevisionInAquaTree(revisionData, session.address);

            if (httpCode != 200) {
                return reply.code(httpCode).send({ success: false, message: message });
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

            return reply.code(200).send({
                success: true,
                message: "Revisions stored successfully",
                data: displayData

            });

        } catch (error) {
            request.log.error(error);
            return reply.code(500).send({ error: "Failed to process revisions" });
        }
    });

    fastify.delete('/tree', async (request, reply) => {
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




        // Get the host from the request headers
        const host = `${getHost()}:${getPort()}`;

        // Get the protocol (http or https)
        const protocol = 'https'

        // Construct the full URL
        const url = `${protocol}://${host}`;

        const revisionHashestoDelete: Array<string> = revisionDataPar.revisionHash.split(",")

        for (let i = 0; i < revisionHashestoDelete.length; i++) {

            let currentHash = revisionHashestoDelete[i]
            let [code, reason] = await deleteAquaTree(currentHash, session.address, url)
            if (code != 200) {

                return reply.code(code).send({ message: reason });
            }
        }

        return reply.code(200).send({ message: "revision hash is required" });

    });

    fastify.delete('/tree/revisions/:hash', async (request, reply) => {
        try {
            const nonce = request.headers['nonce']; // Headers are case-insensitive
            const { hash } = request.params as { hash: string };

            // Check if `nonce` is missing or empty
            if (!nonce || typeof nonce !== 'string' || nonce.trim() === '') {
                return reply.code(401).send({ error: 'Unauthorized: Missing or empty nonce header' });
            }

            // Retrieve session from nonce
            const session = await prisma.siweSession.findUnique({
                where: { nonce }
            });

            if (!session) {
                return reply.code(401).send({ error: 'Unauthorized: Invalid session' });
            }


            // Check if the user is allowed to delete this revision
            const canDelete = await canDeleteRevision(hash, session.address);
            if (!canDelete) {
                return reply.code(403).send({
                    success: false,
                    message: 'Forbidden: You do not have permission to delete this revision'
                });
            }

            // Perform the deletion
            const result = await deleteRevisionAndChildren(hash, session.address);

            if (result.success) {
                return reply.code(200).send({
                    success: true,
                    message: `Successfully deleted revision and its dependencies`,
                    deleted: result.deleted,
                    details: result.details
                });
            } else {
                return reply.code(500).send({
                    success: false,
                    message: 'Error occurred during deletion',
                    deleted: result.deleted,
                    details: result.details
                });
            }

        } catch (error: any) {
            console.error("Error in delete operation:", error);
            return reply.code(500).send({
                success: false,
                message: `Error deleting revision: ${error.message}`,
                details: error
            });
        }
    });


    // fastify.post('/tree/user_signatures', async (request, reply) => {

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
    //         return reply.code(403).send({ success: false, message: "Nounce  is invalid" });
    //     }


    //     // Get the host from the request headers
    //     const host = `${getHost()}:${getPort()}`;

    //     // Get the protocol (http or https)
    //     const protocol = 'https'

    //     // Construct the full URL
    //     const url = `${protocol}://${host}`;



    //     // let signatureAquaTreesBeforeInsertion: Array<{
    //     //     aquaTree: AquaTree,
    //     //     fileObject: FileObject[]
    //     // }> = await getSignatureAquaTrees(session.address, url)


    //     // for (let item of signatureAquaTreesBeforeInsertion) {
        //     let allHashes = Object.keys(item.aquaTree.revisions)
        //     let lastHash = allHashes[allHashes.length-1]
    //     //     //delet the old signature
    //     //    let [code, reason] =await deleteAquaTree(lastHash,session?.address,url)

    //     //    if(code!=200){
    //     //     return reply.code(code).send({
    //     //         message: reason,
    //     //         reason:'fail during deletion'
    //     //     });
    //     //    }
    //     // }

    //     // let aquafier = new Aquafier();


    //     // Check if the request is multipart
    //     const isMultipart = request.isMultipart();

    //     if (!isMultipart) {
    //         return reply.code(400).send({ error: 'Expected multipart form data' });
    //     }

    //     try {
    //         // Process the multipart form data
    //         const parts = request.parts();

    //         let fileBuffer;
    //         let assetBuffer = null;
    //         let hasAsset = false;
    //         let assetFilename = "";
    //         let isWorkFlow = false
    //         let templateId = ""

    //         // Process each part of the multipart form
    //         for await (const part of parts) {
    //             if (part.type === 'file') {
    //                 if (part.fieldname === 'file') {
    //                     // Verify file size (200MB = 200 * 1024 * 1024 bytes)
    //                     const maxFileSize = 200 * 1024 * 1024;
    //                     if (part.file.bytesRead > maxFileSize) {
    //                         return reply.code(413).send({ error: 'File too large. Maximum file size is 200MB' });
    //                     }
    //                     fileBuffer = await streamToBuffer(part.file);
    //                 } else if (part.fieldname === 'asset') {
    //                     assetBuffer = await streamToBuffer(part.file);
    //                     // Extract filename from the asset file
    //                     assetFilename = part.filename;
    //                 }
    //             } else if (part.type === 'field') {

    //                 console.log(`name ${part.fieldname}  value ${part.value}  `)
    //                 if (part.fieldname === 'has_asset') {
    //                     hasAsset = part.value === 'true';
    //                 } else if (part.fieldname === 'account') {
    //                     // Store account if needed for further processing
    //                     const account = part.value;
    //                     // Verify account matches session address
    //                     if (account !== session.address) {
    //                         return reply.code(403).send({ error: 'Account mismatch with authenticated session' });
    //                     }
    //                 } else if (part.fieldname === 'is_workflow') {
    //                     isWorkFlow = part.value === 'true';
    //                 } else if (part.fieldname === 'template_id') {
    //                     templateId = part.value as string;
    //                 }
    //             }
    //         }



    //         if (!fileBuffer) {
    //             return reply.code(400).send({ error: 'No file uploaded' });
    //         }

    //         let fileContent = fileBuffer.toString('utf-8');
    //         let aquaTreeFromFile: AquaTree = JSON.parse(fileContent);

    //         let aquaTree = removeFilePathFromFileIndex(aquaTreeFromFile);

    //         let [isValidAquaTree, failureReason] = validateAquaTree(aquaTree)
    //         console.log(`is aqua tree valid ${isValidAquaTree} `);
    //         if (!isValidAquaTree) {
    //             console.log(`failure reason ${failureReason}`)
    //             return reply.code(412).send({ error: failureReason });
    //         }



    //         console.log(`\n has asset save file ${hasAsset}  `)
    //         // Handle the asset if it exists
    //         if (hasAsset && assetBuffer) {
    //             console.log(`---------------------------------------------------------------`)
    //             console.log(`\n has asset save file \n `)
    //             // Process the asset - this depends on your requirements
    //             // For example, you might want to store it separately or attach it to the aqua tree
    //             // aquaTreeWithFileObject.assetData = assetBuffer.toString('base64');
    //             // Or handle the asset in some other way based on your application's needs

    //             let aquafier = new Aquafier()

    //             const uint8Array = new Uint8Array(assetBuffer);
    //             let fileHash = aquafier.getFileHash(uint8Array);

    //             let genesisHash = getGenesisHash(aquaTree);
    //             if (genesisHash == null || genesisHash == "") {
    //                 return reply.code(500).send({ error: 'Genesis hash not found in aqua tree' });
    //             }
    //             let filepubkeyhash = `${session.address}_${genesisHash}`

    //             console.log(`\n ## filepubkeyhash ${filepubkeyhash}`)
    //             const UPLOAD_DIR = getFileUploadDirectory();

    //             // Create unique filename
    //             let fileName = assetFilename;
    //             let aquaTreeName = await aquafier.getFileByHash(aquaTree, genesisHash);
    //             if (aquaTreeName.isOk()) {
    //                 fileName = aquaTreeName.data
    //             }
    //             const filename = `${randomUUID()}-${fileName}`;
    //             const filePath = path.join(UPLOAD_DIR, filename);

    //             // Save the file
    //             // await pump(data.file, fs.createWriteStream(filePath))
    //             await fs.promises.writeFile(filePath, assetBuffer);
    //             let fileCreation = await prisma.file.create({
    //                 data: {
    //                     hash: filepubkeyhash,
    //                     file_hash: fileHash,
    //                     content: filePath,
    //                     reference_count: 0, // we use 0 because  saveAquaTree increases file  by 1
    //                 }
    //             })
    //             console.log('File record created:', fileCreation);

    //             console.log('About to create fileIndex record');

    //             await prisma.fileIndex.create({
    //                 data: {
    //                     id: fileCreation.hash,
    //                     hash: [filepubkeyhash],
    //                     file_hash: fileHash,
    //                     uri: fileName,
    //                     reference_count: 0 // we use 0 because  saveAquaTree increases file  undex  by 1
    //                 }
    //             })

    //             console.log('FileIndex record created');

    //         }
    //         console.log("Aquatree to save: ", aquaTree)
    //         // Save the aqua tree
    //         await saveAquaTree(aquaTree, session.address, templateId.length == 0 ? null : templateId, isWorkFlow);


          

    //         // // Get the host from the request headers
    //         // const host = request.headers.host || `${getHost()}:${getPort()}`;

    //         // // Get the protocol (http or https)
    //         // const protocol = request.protocol || 'https'

    //         // // Construct the full URL
    //         // const url = `${protocol}://${host}`;

    //         const displayData = await getSignatureAquaTrees(url, session.address)


    //         return reply.code(200).send({
    //             success: true,
    //             message: 'Aqua tree saved successfully',
    //             files: displayData
    //         });
    //     } catch (error) {
    //         console.error('\n\n Specific error in file/fileIndex creation:', error);
    //         request.log.error(error);
    //         return reply.code(500).send({ error: `Error ${error}` });
    //     }




    // });

    fastify.get('/tree/user_signatures', async (request, reply) => {

        try {

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
            const host = `${getHost()}:${getPort()}`;

            // Get the protocol (http or https)
            const protocol = 'https'

            // Construct the full URL
            const url = `${protocol}://${host}`;



            let signatureAquaTrees: Array<{
                aquaTree: AquaTree,
                fileObject: FileObject[]
            }> = await getSignatureAquaTrees(session.address, url)

            return reply.code(200).send({
                success: true,
                data: signatureAquaTrees
            });

        } catch (error: any) {
            console.error("Error in delete operation:", error);
            return reply.code(500).send({
                success: false,
                message: `Error deleting revision: ${error.message}`,
                details: error
            });
        }
    });
}
