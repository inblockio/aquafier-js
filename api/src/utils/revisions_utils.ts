import { AquaTree, FileObject, Revision as AquaRevision, OrderRevisionInAquaTree } from 'aqua-js-sdk';
import { prisma } from '../database/db';
// For specific model types
import { User, Latest, Signature, Revision, Witness, AquaForms, WitnessEvent, FileIndex, Link } from '@prisma/client';
import * as fs from "fs"
import path from 'path';

export async function fetchAquatreeFoUser(url: string, latest: Array<{
    hash: string;
    user: string;
}>): Promise<Array<{
    aquaTree: AquaTree,
    fileObject: FileObject[]
}>> {
    // traverse from the latest to the genesis of each 
    //  console.log(`data ${JSON.stringify(latest, null, 4)}`)


    let displayData: Array<{
        aquaTree: AquaTree,
        fileObject: FileObject[]
    }> = []



    for (let revisonLatetsItem of latest) {

        let [anAquaTree, fileObject] = await createAquaTreeFromRevisions(revisonLatetsItem.hash, url)

        //  console.log(`----> ${JSON.stringify(anAquaTree, null, 4)}`)
        let sortedAquaTree = OrderRevisionInAquaTree(anAquaTree)
        displayData.push({

            aquaTree: sortedAquaTree,
            fileObject: fileObject
        })


    }

    return displayData

}
export async function saveAquaTree(aquaTree: AquaTree, userAddress: string,) {

    let allHash = Object.keys(aquaTree.revisions)
    let latestHash = allHash[allHash.length - 1]
    let lastPubKeyHash = `${userAddress}_${latestHash}`

    await prisma.latest.upsert({
        where: {
            hash: lastPubKeyHash
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
    for (const revisinHash of allHash) {
        let revisionData = aquaTree.revisions[revisinHash];
        let pubKeyHash = `${userAddress}_${revisinHash}`
        let pubKeyPrevious = ""
        if (revisionData.previous_verification_hash.length > 0) {
            pubKeyPrevious = `${userAddress}_${revisionData.previous_verification_hash}`
        }
        console.log("%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%")
        console.log(`revisinHash ${revisinHash} \n pubKeyPrevious ${pubKeyPrevious} --- \n Revision item ${JSON.stringify(revisionData)} `)
        // Insert new revision into the database
        await prisma.revision.upsert({
            where: {
                pubkey_hash: pubKeyHash
            },
            create: {
                pubkey_hash: pubKeyHash,
                // user: session.address, // Replace with actual user identifier (e.g., request.user.id)
                nonce: revisionData.file_nonce ?? "",
                shared: [],
                previous: pubKeyPrevious,
                local_timestamp: revisionData.local_timestamp,
                revision_type: revisionData.revision_type,
                verification_leaves: revisionData.leaves ?? [],

            },
            update: {
                pubkey_hash: pubKeyHash,
                // user: session.address, // Replace with actual user identifier (e.g., request.user.id)
                nonce: revisionData.file_nonce ?? "",
                shared: [],
                previous: pubKeyPrevious,
                local_timestamp: revisionData.local_timestamp,
                revision_type: revisionData.revision_type,
                verification_leaves: revisionData.leaves ?? [],

            },
        });


        if (revisionData.revision_type == "form") {
            let revisioValue = Object.keys(revisionData);
            for (let formItem in revisioValue) {
                if (formItem.startsWith("form_")) {
                    await prisma.aquaForms.upsert({
                        where: {
                            hash: pubKeyHash
                        },
                        create: {
                            hash: pubKeyHash,
                            key: formItem,
                            value: revisioValue[formItem],
                            type: typeof revisioValue[formItem]
                        },
                        update: {
                            hash: pubKeyHash,
                            key: formItem,
                            value: revisioValue[formItem],
                            type: typeof revisioValue[formItem]
                        }
                    });
                }
            }
        }

        if (revisionData.revision_type == "signature") {
            let signature = "";
            if (typeof revisionData.signature == "string") {
                signature = revisionData.signature
            } else {
                signature = JSON.stringify(revisionData.signature)
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
                    signature_wallet_address: revisionData.signature.wallet_address,
                    signature_type: revisionData.signature_type,
                    signature_public_key: revisionData.signature_public_key,
                    reference_count: 1
                }
            });

        }


        if (revisionData.revision_type == "witness") {

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
                    Witness_merkle_root: revisionData.witness_merkle_root,
                    reference_count: 1  // Starting with 1 since this is the first reference
                }
            });

            // const witnessTimestamp = new Date(!);
            await prisma.witnessEvent.upsert({
                where: {
                    Witness_merkle_root: revisionData.witness_merkle_root!,
                },
                update: {
                    Witness_merkle_root: revisionData.witness_merkle_root!,
                    Witness_timestamp: revisionData.witness_timestamp?.toString(),
                    Witness_network: revisionData.witness_network,
                    Witness_smart_contract_address: revisionData.witness_smart_contract_address,
                    Witness_transaction_hash: revisionData.witness_transaction_hash,
                    Witness_sender_account_address: revisionData.witness_sender_account_address

                },
                create: {
                    Witness_merkle_root: revisionData.witness_merkle_root!,
                    Witness_timestamp: revisionData.witness_timestamp?.toString(),
                    Witness_network: revisionData.witness_network,
                    Witness_smart_contract_address: revisionData.witness_smart_contract_address,
                    Witness_transaction_hash: revisionData.witness_transaction_hash,
                    Witness_sender_account_address: revisionData.witness_sender_account_address

                }
            });
        }



        if (revisionData.revision_type == "file") {
            if (revisionData.file_hash == null || revisionData.file_hash == undefined) {
                throw Error(`revision with hash ${revisinHash} is detected to be a file but file_hash is mising`);
            }

            let fileResult = await prisma.file.findFirst({
                where: {
                    hash: {
                        contains: revisinHash,
                        mode: 'insensitive' // Case-insensitive matching
                    }
                }
            })

            if (fileResult == null) {
                throw Error(`file data should be in database but is not found.`);
            }

            await prisma.file.updateMany({
                where: {

                    OR: [
                        { hash: fileResult.hash },
                        { hash: { contains: fileResult.hash, mode: 'insensitive' } }
                    ]

                },
                data: {
                    reference_count: fileResult.reference_count! + 1
                }
            })


            // update  file index

            let existingFileIndex = await prisma.fileIndex.findFirst({
                where: { id: fileResult.hash },
            });

            if (existingFileIndex) {
                existingFileIndex.hash = [...existingFileIndex.hash, pubKeyHash]
                await prisma.fileIndex.update({
                    data: existingFileIndex,
                    where: {
                        id: existingFileIndex.id
                    }
                })
            } else {
                throw Error(`file index data should be in database but is not found.`);
            }
        }

        if (revisionData.revision_type == "link") {

            //  console.log(`Revsion data ${JSON.stringify()}`)
            await prisma.link.create({
                data: {
                    hash: pubKeyHash,
                    link_type: "aqua",
                    link_require_indepth_verification: false,
                    link_verification_hashes: revisionData.link_verification_hashes,
                    link_file_hashes: revisionData.link_file_hashes,
                    reference_count: 0
                }
            })
        }




        if (revisionData.previous_verification_hash == null || revisionData.previous_verification_hash == "") {

            let fileHash = revisionData.file_hash;

            if (fileHash == null) {
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

/**
 * Estimates the size in bytes that a string would occupy if saved to a file
 * Uses UTF-8 encoding rules where ASCII chars take 1 byte and others take 2-4 bytes
 * @param str Input string to estimate size for
 * @returns Estimated size in bytes
 */
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

export async function createAquaTreeFromRevisions(latestRevisionHash: string, url: string): Promise<[AquaTree, FileObject[]]> {

    // construct the return data
    let anAquaTree: AquaTree = {
        revisions: {},
        file_index: {}
    };


    ////  console.log(`Find ${JSON.stringify(revisonLatetsItem, null, 4)}.`)
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
        console.log(`%%%%%%%%%%%%%%%%%%%%%%%%%%% previous ${latestRevionData?.previous} \n ${JSON.stringify(latestRevionData, null, 4)}`)
        let pubKey = latestRevisionHash.split("_")[0];
        let previousWithPubKey = latestRevionData?.previous!!;


        console.log(`$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$  previous ${previousWithPubKey} `)
        //if previosu verification hash is not empty find the previous one
        if (latestRevionData?.previous !== null && latestRevionData?.previous?.length !== 0) {
            let aquaTreerevision = await findAquaTreeRevision(previousWithPubKey);
            revisionData.push(...aquaTreerevision)
        }
    } catch (e: any) {
        throw Error(`Error fetching a revision ${JSON.stringify(e, null, 4)}`);
    }

    // file object 
    let lastRevision = revisionData[revisionData.length - 1];
    let lastRevisionHash = lastRevision.pubkey_hash.split("_")[1];

    // files 

    // let  = await prisma.file.findMany({
    //     where: {
    //         hash: lastRevision.pubkey_hash
    //     }
    // })

    let files = await prisma.file.findMany({
        where: {
            hash: {
                contains: lastRevisionHash,
                mode: 'insensitive' // Case-insensitive matching
            }
        }

    })

    let fileObject: FileObject[] = [];
    let fileIndexes: FileIndex[] = [];
    if (files != null) {
        //  console.log("#### file is not null ")

        for (let fileItem of files) {
            //  console.log("=================================================")
            //  console.log(`reading ${JSON.stringify(fileItem, null, 4)}`)
            // let fileContent = fs.readFileSync(fileItem.content!!);

            const stats = fs.statSync(fileItem.content!!);
            const fileSizeInBytes = stats.size;
            //  console.log(`File size: ${fileSizeInBytes} bytes`);

            // Extract just the original filename (without the UUID prefix)
            const fullFilename = path.basename(fileItem.content!!) // Gets filename.ext from full path
            const originalFilename = fullFilename.substring(fullFilename.indexOf('-') + 1) // Removes UUID-
            //  console.log(`Original filename: ${originalFilename}`)



            let fileIndex = await prisma.fileIndex.findFirst({
                where: {
                    file_hash: fileItem.file_hash!!
                }
            })

            //  console.log("File index: ", fileIndex)


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

    //  console.log(`File indexes for hash: ${lastRevisionHash}\n${JSON.stringify(fileIndexes, null, 4)}`)


    for (let revisionItem of revisionData) {
        let hashOnly = revisionItem.pubkey_hash.split("_")[1]
        let previousHashOnly = revisionItem.previous == null || revisionItem.previous == undefined || revisionItem.previous == "" ? "" : revisionItem.previous.split("_")[1]

        //  console.log(`previousHashOnly == > ${previousHashOnly} RAW ${revisionItem.previous}`)
        let revisionWithData: AquaRevision = {
            revision_type: revisionItem.revision_type!! as "link" | "file" | "witness" | "signature" | "form",
            previous_verification_hash: previousHashOnly,
            local_timestamp: revisionItem.local_timestamp?.toString() ?? "",
            "version": "https://aqua-protocol.org/docs/v3/schema_2 | SHA256 | Method: scalar",
        }

        if (revisionItem.has_content) {
            let fileItem = files.find((e) => e.hash == revisionItem.pubkey_hash)
            let fileContent = fs.readFileSync(fileItem?.content ?? "--error--", 'utf8');
            revisionWithData["content"] = fileContent
        }

        if (revisionItem.revision_type == "file") {
            let fileResult = await prisma.file.findFirst({
                where: {
                    hash: {
                        contains: hashOnly,
                        mode: 'insensitive' // Case-insensitive matching
                    }
                }

            })
            if (fileResult == null) {
                throw Error("Revision file data  not found")
            }
            revisionWithData["file_nonce"] = revisionItem.nonce ?? "--error--"
            revisionWithData["file_hash"] = fileResult.file_hash ?? "--error--"
        } else {
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
                revisionWithData.witness_timestamp = Number.parseInt(witnessData.Witness_timestamp!);
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
                    //  console.log("======================================")
                    //  console.log(`Error fix me ${error} `)
                }
                revisionWithData.signature = sig;

                revisionWithData.signature_public_key = signatureData.signature_public_key!;
                revisionWithData.signature_wallet_address = signatureData.signature_wallet_address!;
                revisionWithData.signature_type = signatureData.signature_type!;

            } else if (revisionItem.revision_type == "link") {
                //  console.log("link revision goes here ")
                let linkData = revisionInfoData as Link;

                revisionWithData.link_type = linkData.link_type ?? ""
                revisionWithData.link_verification_hashes = linkData.link_verification_hashes
                revisionWithData.link_file_hashes = linkData.link_file_hashes


                let hashSearchText = linkData.link_verification_hashes[0]
                //  console.log(`link ....search for ${hashSearchText} --> `)
                let filesData = await prisma.fileIndex.findFirst({
                    where: {
                        id: {
                            contains: hashSearchText,
                            mode: 'insensitive' // Case-insensitive matching
                        }
                    }
                })

                if (filesData == null) {
                    throw Error(`File index with hash ${hashSearchText} not found `)
                }
                anAquaTree.file_index[hashSearchText] = filesData?.uri ?? "--error--."


                let [aquaTreeLinked, fileObjectLinked] = await createAquaTreeFromRevisions(filesData.id, url);

                let name = Object.values(aquaTreeLinked.file_index)[0] ?? "--error--"
                fileObject.push({
                    fileContent: aquaTreeLinked,
                    fileName: `${name}.aqua.json`,
                    path: "",
                    fileSize: estimateStringFileSize(JSON.stringify(aquaTreeLinked, null, 4))
                })


                fileObject.push(...fileObjectLinked)
            } else {
                throw Error(`Revision of type ${revisionItem.revision_type} is unknown`)
            }
        }


        // update file index for genesis revision 
        if (previousHashOnly == null || previousHashOnly.length == 0) {
            //  console.log("****************************************************************")
            //  console.log(`fileIndexes ${JSON.stringify(fileIndexes)} -- hash ${revisionItem.pubkey_hash}`)
            let name = fileIndexes.find((item) => {
                // return item.hash.includes(revisionItem.pubkey_hash) || item.hash.map((item) => item.includes(hashOnly)).length > 0

                // Check if the full pubkey_hash is in the array
                if (item.hash.includes(revisionItem.pubkey_hash)) {
                    return true;
                }

                // Check if any hash in the array contains the hashOnly part
                return item.hash.some((hashItem: string) => hashItem.includes(hashOnly));
            })
            //  console.log(`----------  name ${JSON.stringify(name, null, 4)}`)
            anAquaTree.file_index[hashOnly] = name?.uri ?? "--error--."
            revisionWithData["file_hash"] = name?.file_hash ?? "--error--"

        }
        anAquaTree.revisions[hashOnly] = revisionWithData;
    }


    //  console.log(`YOU should see me ${JSON.stringify(anAquaTree, null, 4)}`)

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

        let pubKey = revisionHash.split("_")[0];
        let previousWithPubKey = latestRevionData?.previous!!;

        if (!latestRevionData?.previous!!.includes("_")) {
            previousWithPubKey = `${pubKey}_${latestRevionData?.previous!!}`
        }
        let aquaTreerevision = await findAquaTreeRevision(previousWithPubKey);
        revisions.push(...aquaTreerevision)
    }


    return revisions;
}


export async function FetchRevisionInfo(hash: string, revision: Revision): Promise<Signature | WitnessEvent | AquaForms[] | Link | null> {

    if (revision.revision_type == "signature") {
        //  console.log(`signature with hash ${hash}`)
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

    } else if (revision.revision_type == "link") {

        return await prisma.link.findFirst({
            where: {
                hash: hash
            }
        })
    } else {

        //  console.log(`type ${revision.revision_type} with hash ${hash}`)
        return null
        // throw new Error(`implment for ${revision.revision_type}`);

    }
}
