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
        // console.log("%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%")
        // console.log(`revisinHash ${revisinHash} \n pubKeyPrevious ${pubKeyPrevious} --- \n Revision item ${JSON.stringify(revisionData)} `)
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
                    signature_wallet_address: revisionData.signature_wallet_address,
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
                // existingFileIndex.hash = [...existingFileIndex.hash, pubKeyHash]
                await prisma.fileIndex.update({
                    data: {
                        hash: [...existingFileIndex.hash, pubKeyHash],
                        reference_count: existingFileIndex.reference_count! + 1
                    },
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
            await prisma.link.upsert({
                where: {
                    hash: pubKeyHash,
                },
                update: {
                    hash: pubKeyHash,
                    link_type: "aqua",
                    link_require_indepth_verification: false,
                    link_verification_hashes: revisionData.link_verification_hashes,
                    link_file_hashes: revisionData.link_file_hashes,
                    reference_count: 0
                },
                create: {
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

    // now fetch forwad revision
    let revisionData = [];
    let queryHash = latestRevisionHash
    while (true) {
        // fetch latest revision 
        let latestRevionData = await prisma.revision.findFirst({
            where: {
                previous: queryHash,
            }
        });

        if (latestRevionData == null) {
            break
        }

        revisionData.push(latestRevionData)
        queryHash = latestRevionData.pubkey_hash
    }

    let createAquaTreeFrom = latestRevisionHash;
    if (revisionData.length > 0) {
        //find latest hash 
        createAquaTreeFrom = revisionData[revisionData.length - 1].pubkey_hash
    }else{
        console.log(`The aqua tree has no new revision  from ${latestRevisionHash} `)
    }

    const [anAquaTree, fileObject] = await createAquaTreeFromRevisions(createAquaTreeFrom, url)

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
        // let pubKey = latestRevisionHash.split("_")[0];
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
                console.log(`Revision data ${JSON.stringify(revisionItem, null, 4)}`)
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


export const readFileContent = async (file: File): Promise<string | Uint8Array> => {
    if (isTextFile(file)) {
        // If it's a text file, read as text
        return await readFileAsText(file);
    } else {
        console.log("binary data....")
        // Otherwise for binary files, read as ArrayBuffer
        const res = await readFileAsArrayBuffer(file)
        return new Uint8Array(res);

    }
};


// More comprehensive function to check if a file is text-based
export const isTextFile = (file: File): boolean => {
    // Check by MIME type first (most reliable when available)
    if (file.type) {
        // Common text MIME types
        if (file.type.startsWith('text/')) return true;

        // Text-based formats with application/ prefix
        if (/^application\/(json|xml|javascript|x-javascript|ecmascript|x-ecmascript|typescript|x-typescript|ld\+json|graphql|yaml|x-yaml|x-www-form-urlencoded)/.test(file.type)) {
            return true;
        }

        // Some markdown types
        if (/^text\/(markdown|x-markdown|md)/.test(file.type)) {
            return true;
        }
    }

    // Check by file extension as fallback
    const textExtensions = [
        // Programming languages
        '.txt', '.csv', '.json', '.xml', '.html', '.htm', '.css', '.js', '.jsx', '.ts', '.tsx',
        '.md', '.markdown', '.rs', '.py', '.rb', '.c', '.cpp', '.h', '.hpp', '.cs', '.java',
        '.kt', '.kts', '.swift', '.php', '.go', '.pl', '.pm', '.lua', '.sh', '.bash', '.zsh',
        '.sql', '.r', '.dart', '.scala', '.groovy', '.m', '.mm',

        // Config files
        '.yml', '.yaml', '.toml', '.ini', '.cfg', '.conf', '.config', '.properties',
        '.env', '.gitignore', '.gitattributes', '.editorconfig', '.babelrc', '.eslintrc',
        '.prettierrc', '.stylelintrc', '.npmrc', '.yarnrc',

        // Documentation
        '.rst', '.adoc', '.tex', '.latex', '.rtf', '.log', '.svg',

        // Data formats
        '.csv', '.tsv', '.plist', '.graphql', '.gql'
    ];

    return textExtensions.some(ext => file.name.toLowerCase().endsWith(ext));
};


export function getGenesisHash(aquaTree: AquaTree) :  string | null{
    let aquaTreeGenesisHash: string | null = null;
    let allAquuaTreeHashes = Object.keys(aquaTree!.revisions);

    for (let hash of allAquuaTreeHashes) {
        let revisionItem = aquaTree!.revisions[hash];
        if (revisionItem.previous_verification_hash == "" || revisionItem.previous_verification_hash == null || revisionItem.previous_verification_hash == undefined) {

            aquaTreeGenesisHash = revisionItem.previous_verification_hash
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

        console.log(`Revision --  ${JSON.stringify(revision)}`)
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

/**
 * Reads a File object as text
 * @param file The File object to read
 * @returns Promise that resolves with the file contents as string
 */
export function readFileAsText(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();

        reader.onload = (event) => {
            if (event.target?.result) {
                resolve(event.target.result as string);
            } else {
                reject(new Error("Failed to read file content"));
            }
        };

        reader.onerror = (error) => {
            reject(error);
        };

        reader.readAsText(file);
    });
}

/**
 * Reads a File object as ArrayBuffer
 * @param file The File object to read
 * @returns Promise that resolves with the file contents as ArrayBuffer
 */
export function readFileAsArrayBuffer(file: File): Promise<ArrayBuffer> {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();

        reader.onload = (event) => {
            if (event.target?.result) {
                resolve(event.target.result as ArrayBuffer);
            } else {
                reject(new Error("Failed to read file content"));
            }
        };

        reader.onerror = (error) => {
            reject(error);
        };

        reader.readAsArrayBuffer(file);
    });
}