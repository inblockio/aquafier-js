

import { AquaTree, FileObject, Revision as AquaRevision } from 'aqua-js-sdk';
import { prisma } from '../database/db';
// For specific model types
import { User, Latest, Signature, Revision, Witness, AquaForms, WitnessEvent, FileIndex } from '@prisma/client';
import * as fs from "fs"
import path from 'path';

export async function saveAquaTree(aquaTree: AquaTree, userAddress: string) {

    let allHash = Object.keys(aquaTree.revisions)
    let latestHash = allHash[allHash.length - 1]
    let lastPubKeyHash = `${userAddress}_${latestHash}`

    await prisma.latest.upsert({
        where:{
            hash:lastPubKeyHash
        },
        create: {
            hash: lastPubKeyHash,
            user: userAddress,
        },
        update: {
            hash: lastPubKeyHash,
            user: userAddress,
        }
    });

    // insert the revisions
    for (const revisinHash of latestHash) {
        let revisionData = aquaTree.revisions[revisinHash];
        let pubKeyHash = `${userAddress}_${revisinHash}`

        console.log("%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%")
        console.log(`revisinHash ${revisinHash} --- \n Revision item ${JSON.stringify(revisionData)} `)
        // Insert new revision into the database
        await prisma.revision.create({
            data: {
                pubkey_hash: pubKeyHash,
                // user: session.address, // Replace with actual user identifier (e.g., request.user.id)
                nonce: revisionData.file_nonce || "",
                shared: [],
                previous: revisionData.previous_verification_hash || "",
                local_timestamp: revisionData.local_timestamp,
                revision_type: revisionData.revision_type,
                verification_leaves: revisionData.leaves || [],

            },
        });


        if (revisionData.revision_type == "form") {
            let revisioValue = Object.keys(revisionData);
            for (let formItem in revisioValue) {
                if (formItem.startsWith("form_")) {
                    await prisma.aquaForms.create({
                        data: {
                            hash: pubKeyHash,
                            key: formItem,
                            value: revisioValue[formItem],
                            type: typeof revisioValue[formItem]
                        }
                    });
                }
            }
        }

        if (revisionData.revision.revision_type == "signature") {
            let signature = "";
            if (typeof revisionData.revision.signature == "string") {
                signature = revisionData.revision.signature
            } else {
                signature = JSON.stringify(revisionData.revision.signature)
            }


            //todo consult dalmas if signature_public_key needs tobe stored
            await prisma.signature.upsert({
                where: {
                    hash: pubKeyHash
                },
                update: {
                    reference_count: {
                        increment: 1
                    }
                },
                create: {
                    hash: pubKeyHash,
                    signature_digest: signature,
                    signature_wallet_address: revisionData.revision.signature.wallet_address,
                    signature_type: revisionData.revision.signature_type,
                    signature_public_key: revisionData.revision.signature_public_key,
                    reference_count: 1
                }
            });

        }


        if (revisionData.revision.revision_type == "witness") {

            await prisma.witness.upsert({
                where: {
                    hash: pubKeyHash
                },
                update: {
                    reference_count: {
                        increment: 1
                    }
                },
                create: {
                    hash: pubKeyHash,
                    Witness_merkle_root: revisionData.revision.witness_merkle_root,
                    reference_count: 1  // Starting with 1 since this is the first reference
                }
            });

            const witnessTimestamp = new Date(revisionData.revision.witness_timestamp!);
            await prisma.witnessEvent.create({
                data: {
                    Witness_merkle_root: revisionData.revision.witness_merkle_root!,
                    Witness_timestamp: witnessTimestamp,
                    Witness_network: revisionData.revision.witness_network,
                    Witness_smart_contract_address: revisionData.revision.witness_smart_contract_address,
                    Witness_transaction_hash: revisionData.revision.witness_transaction_hash,
                    Witness_sender_account_address: revisionData.revision.witness_sender_account_address

                }
            });
        }



        if (revisionData.revision.revision_type == "link" || revisionData.revision.revision_type == "file") {

            throw Error(`revision with hash ${revisinHash} is detected to be ${revisionData.revision.revision_type} which is not supported .`)
        
        }






        if (revisionData.previous_verification_hash == null || revisionData.previous_verification_hash == "") {

            let fileHash = revisionData.file_hash;
            
            if (fileHash == null){
                throw Error(`revision with hash ${revisinHash} is detected to be a genesis but the file hash is null.`)
            }
            // file and file indexes
            // Check if file already exists in the database
            let existingFile = await prisma.file.findFirst({ //todo
                where: { file_hash: fileHash },
            });

            let existingFileIndex = await prisma.fileIndex.findFirst({
                where: { file_hash: fileHash },
            });

            if (existingFileIndex) {
                existingFileIndex.hash = [...existingFileIndex.hash, allHash[0]]
                await prisma.fileIndex.update({
                    data: existingFileIndex,
                    where: {
                        id: existingFileIndex.id
                    }
                })
            }
        }



    }
}

export async function fetchAquaTreeWithForwardRevisions(latestRevisionHash: string, url: string): Promise<[AquaTree, FileObject[]]> {

    const [anAquaTree, fileObject] = await createAquaTreeFromRevisions(latestRevisionHash, url)

    //now fetch forwad revision

    // todo 
    return [anAquaTree, fileObject];

}
export async function createAquaTreeFromRevisions(latestRevisionHash: string, url: string): Promise<[AquaTree, FileObject[]]> {

    // construct the return data
    let anAquaTree: AquaTree = {
        revisions: {},
        file_index: {}
    };


    // console.log(`Find ${JSON.stringify(revisonLatetsItem, null, 4)}.`)
    let revisionData = [];
    // fetch latest revision 
    let latestRevionData = await prisma.revision.findFirst({
        where: {
            pubkey_hash: latestRevisionHash, //`${session.address}_${}`
        }
    });

    if (latestRevionData == null) {
        // return reply.code(500).send({ success: false, message: `` });
        throw Error(`revision with hash ${latestRevionData} not found in system`);
    }
    revisionData.push(latestRevionData);

    try {
        console.log(`previous ${latestRevionData?.previous}`)
        //if previosu verification hash is not empty find the previous one
        if (latestRevionData?.previous !== null && latestRevionData?.previous?.length !== 0) {
            let aquaTreerevision = await findAquaTreeRevision(latestRevionData?.previous!!);
            revisionData.push(...aquaTreerevision)
        }
    } catch (e: any) {
        throw Error(`Error fetching a revision ${JSON.stringify(e, null, 4)}`);
    }

    // file object 
    let lastRevision = revisionData[revisionData.length - 1];
    let lastRevisionHash = lastRevision.pubkey_hash.split("_")[1];

    // files 

    let files = await prisma.file.findMany({
        where: {
            hash: lastRevision.pubkey_hash
        }
    })


    let fileObject: FileObject[] = [];
    let fileIndexes: FileIndex[] = [];
    if (files != null) {
        console.log("#### file is not null ")

        for (let fileItem of files) {
            console.log("=================================================")
            console.log(`reading ${JSON.stringify(fileItem, null, 4)}`)
            // let fileContent = fs.readFileSync(fileItem.content!!);

            const stats = fs.statSync(fileItem.content!!);
            const fileSizeInBytes = stats.size;
            console.log(`File size: ${fileSizeInBytes} bytes`);

            // Extract just the original filename (without the UUID prefix)
            const fullFilename = path.basename(fileItem.content!!) // Gets filename.ext from full path
            const originalFilename = fullFilename.substring(fullFilename.indexOf('-') + 1) // Removes UUID-
            console.log(`Original filename: ${originalFilename}`)



            let fileIndex = await prisma.fileIndex.findFirst({
                where: {
                    file_hash: fileItem.file_hash!!
                }
            })

            console.log("File index: ", fileIndex)


            if (fileIndex == null) {
                throw Error(`Error file  ${originalFilename} not found in index`)
            }


            fileIndexes.push(fileIndex)


            if (!fs.existsSync(fileItem.content!!)) {
                // return reply.code(500).send({ success: false, message: `Error file  ${originalFilename} not found` });

            }



            // Path you want to add
            const urlPath = `/files/${fileItem.file_hash}`;

            // Construct the full URL
            const fullUrl = `${url}${urlPath}`;
            fileObject.push({
                fileContent: fullUrl,//fileContent.toString(),
                fileName: fileIndex.uri!!,
                path: "",
                fileSize: fileSizeInBytes
            })

        }
    }

    console.log(`File indexes for hash: ${lastRevisionHash}\n${JSON.stringify(fileIndexes, null, 4)}`)


    for (let revisionItem of revisionData) {
        let hashOnly = revisionItem.pubkey_hash.split("_")[1]
        let previousHashOnly = revisionItem.previous === null ? "" : revisionItem.previous.split("_")[1]
        let revisionWithData: AquaRevision = {
            revision_type: revisionItem.revision_type!! as "link" | "file" | "witness" | "signature" | "form",
            previous_verification_hash: previousHashOnly,
            local_timestamp: revisionItem.local_timestamp!.toDateString(),
            file_nonce: revisionItem.nonce ?? "--error--",
            "version": "https://aqua-protocol.org/docs/v3/schema_2 | SHA256 | Method: scalar",
        }

        if (revisionItem.has_content) {
            let fileItem = files.find((e) => e.hash == revisionItem.pubkey_hash)
            let fileContent = fs.readFileSync(fileItem?.content ?? "--error--", 'utf8');
            revisionWithData["content"] = fileContent
        }

        if (revisionItem.revision_type != "file") {

            let revisionInfoData = await FetchRevisionInfo(revisionItem.pubkey_hash, revisionItem)

            if (revisionInfoData == null) {
                throw Error("Revision info not found")
            }

            if (revisionItem.revision_type == "form") {

                let fileFormData = revisionInfoData as AquaForms[];
                for (let formItem of fileFormData) {
                    revisionWithData[formItem.key!!] = formItem.value
                }

            } else if (revisionItem.revision_type == "witness") {
                let witnessData = revisionInfoData as WitnessEvent;
                revisionWithData.witness_merkle_root = witnessData.Witness_merkle_root;
                revisionWithData.witness_timestamp = witnessData.Witness_timestamp!.getTime();
                revisionWithData.witness_network = witnessData.Witness_network!;
                revisionWithData.witness_smart_contract_address = witnessData.Witness_smart_contract_address!;
                revisionWithData.witness_transaction_hash = witnessData.Witness_transaction_hash!;
                revisionWithData.witness_sender_account_address = witnessData.Witness_sender_account_address!;
                revisionWithData.witness_merkle_proof = [];// todo fix me from db 


            } else if (revisionItem.revision_type == "signature") {
                let signatureData = revisionInfoData as Signature;
                let sig: string | Object = signatureData.signature_digest!
                try {
                    if (signatureData.signature_type?.includes("did")) {
                        sig = JSON.parse(signatureData.signature_digest!)
                    }
                } catch (error) {
                    console.log("======================================")
                    console.log(`Error fix me ${error} `)
                }
                revisionWithData.signature = sig;

                revisionWithData.signature_public_key = signatureData.signature_public_key!;
                revisionWithData.signature_wallet_address = signatureData.signature_wallet_address!;
                revisionWithData.signature_type = signatureData.signature_type!;

            } else {
                throw Error(`Revision of type ${revisionItem.revision_type} is unknown`)
            }
        }

        // update file index for genesis revision 
        if (previousHashOnly == null || previousHashOnly.length == 0) {
            console.log("****************************************************************")
            console.log(`fileIndexes ${JSON.stringify(fileIndexes)} -- hash ${revisionItem.pubkey_hash}`)
            let name = fileIndexes.find((item) => {
                // return item.hash.includes(revisionItem.pubkey_hash) || item.hash.map((item) => item.includes(hashOnly)).length > 0

                // Check if the full pubkey_hash is in the array
                if (item.hash.includes(revisionItem.pubkey_hash)) {
                    return true;
                }

                // Check if any hash in the array contains the hashOnly part
                return item.hash.some((hashItem: string) => hashItem.includes(hashOnly));
            })
            console.log(`----------  name ${JSON.stringify(name, null, 4)}`)
            anAquaTree.file_index[hashOnly] = name?.uri ?? "--error--."
            revisionWithData["file_hash"] = name?.file_hash ?? "--error--"

        }
        anAquaTree.revisions[hashOnly] = revisionWithData;
    }

    return [anAquaTree, fileObject]
}

export async function findAquaTreeRevision(revisionHash: string): Promise<Array<Revision>> {
    let revisions: Array<Revision> = [];

    // fetch latest revision 
    let latestRevionData = await prisma.revision.findFirst({
        where: {
            pubkey_hash: revisionHash
        }
    });



    if (latestRevionData == null) {
        throw new Error(`Unable to get revision with hash ${revisionHash}`);

    }

    revisions.push(latestRevionData);

    if (latestRevionData?.previous) {
        let aquaTreerevision = await findAquaTreeRevision(latestRevionData?.previous!!);
        revisions.push(...aquaTreerevision)
    }


    return revisions;
}


export async function FetchRevisionInfo(hash: string, revision: Revision): Promise<Signature | WitnessEvent | AquaForms[] | null> {

    if (revision.revision_type == "signature") {
        console.log(`signature with hash ${hash}`)
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

        if (res == null) {
            throw new Error(`witness is null ${revision.revision_type}`);
        }
        return await prisma.witnessEvent.findFirst({
            where: {
                Witness_merkle_root: res.Witness_merkle_root!
            }
        });


    } else if (revision.revision_type == "form") {

        return await prisma.aquaForms.findMany({
            where: {
                hash: hash
            }
        })

    } else {

        console.log(`type ${revision.revision_type} with hash ${hash}`)
        return null
        // throw new Error(`implment for ${revision.revision_type}`);

    }
}




