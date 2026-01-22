import { prisma } from "../database/db";
import { TEMPLATE_HASHES } from "../models/constants";
import logger from "./logger";
import { findAquaTreeRevision } from "./revisions_operations_utils";
import fs from "fs"



export const calculateStorageUsage = async (userAddress: string) => {

    let allUserRevisions: {
            pubkey_hash: string;
            previous: string | null;
            AquaForms: {
                key: string | null;
            }[],
            isAquaSign: boolean
        }[] = [];



        const latestRecords = await prisma.latest.findMany({
            where: {
                AND: {
                    user: userAddress,
                    template_id: null,
                    is_workflow: false
                }
            },
            select: {
                hash: true
            },

            orderBy: {
                createdAt: 'desc'
            }
        });

        for (let index = 0; index < latestRecords.length; index++) {
            const element = latestRecords[index];

            let revision = await prisma.revision.findFirst({
                where: {
                    pubkey_hash: element.hash
                },
            });

            // get genesis 
            if (revision) {
                let aquaTreeRevisions = await findAquaTreeRevision(revision?.pubkey_hash)

                let genesisRevision = aquaTreeRevisions.find((e) => e.previous == null || e.previous == "")

                if (genesisRevision) {

                    let aquaForms = await prisma.aquaForms.findMany({
                        where: {
                            hash: genesisRevision.pubkey_hash
                        },
                    });

                    let hasFormsSigners = aquaForms.some((formFieldEntry) => formFieldEntry.key === "forms_signers")

                    allUserRevisions.push({
                        pubkey_hash: genesisRevision.pubkey_hash,
                        previous: genesisRevision.previous,
                        AquaForms: aquaForms,
                        isAquaSign: hasFormsSigners
                    });
                }
            }
        }





        let allFilesSizes = 0
        // loop through all genesis revisions,
        //  find the file hash from file index table
        // use file has to find file path
        // calculate the file size and sum it up
        for (let i = 0; i < allUserRevisions.length; i++) {
            const revision = allUserRevisions[i];
            
            const fileIndex = await prisma.fileIndex.findFirst({
                where: {
                    pubkey_hash: {
                        has: revision.pubkey_hash
                    }
                }
            });
            // Identify the type of revision and aquatree
            if (fileIndex) {
                let fileResult = await prisma.file.findFirst({
                    where: {
                        file_hash: fileIndex.file_hash
                    }
                });
                if (fileResult) {
                    try {
                        const stats = fs.statSync(fileResult.file_location!!);
                        allFilesSizes += stats.size;
                    } catch (err) {
                        logger.error(`Error getting file size for ${fileResult.file_location}: ${err}`);
                    }
                }
            }

            if (revision.isAquaSign) {
                let secondRevision = await prisma.revision.findFirst({
                    where: {
                        previous: revision.pubkey_hash
                    }
                })

                if (!secondRevision) {
                    continue;
                }

                let thirdRevision = await prisma.revision.findFirst({
                    where: {
                        previous: secondRevision.pubkey_hash
                    }
                })
                
                if (!thirdRevision) {
                    continue;
                }

                let linkRevisionEntry = await prisma.link.findFirst({
                    where: {
                        hash: thirdRevision.pubkey_hash
                    }
                })

                let fileHash = linkRevisionEntry?.link_file_hashes[0]

                if(!fileHash){
                    continue;
                }

                const fileIndex = await prisma.fileIndex.findFirst({
                    where: {
                        file_hash: {
                            equals: fileHash
                        }
                    }
                });
               
                if (fileIndex) {
                    let fileResult = await prisma.file.findFirst({
                        where: {
                            file_hash: fileIndex.file_hash

                        }
                    });
                    if (fileResult) {
                        try {
                            const stats = fs.statSync(fileResult.file_location!!);
                            allFilesSizes += stats.size;
                        } catch (err) {
                            logger.error(`Error getting file size for ${fileResult.file_location}: ${err}`);
                        }
                    }
                }
            }
        }
        // const queryEnd = performance.now()
        // console.log(cliGreenify(`Genesis revisions query took ${(queryEnd - queryStart).toFixed(2)}ms`))

        // Filter out revisions that contain aqua_sign fields (forms_signers)
        // const filteredUserRevisions = allUserRevisions.filter(revision => {
        // Check if any AquaForms has the key "forms_signers"
        // const hasFormsSigners = revision.AquaForms.some(form => form.key === "forms_signers")
        // return !hasFormsSigners // Return true if it doesn't have forms_signers (keep it)
        // })

        const allRevisionHashes = allUserRevisions.map(revision => revision.pubkey_hash)

        // const linkQueryStart = performance.now()
        const linkRevisions = await prisma.revision.findMany({
            select: {
                pubkey_hash: true,
                revision_type: true,
                previous: true,
                Link: {
                    select: {
                        link_verification_hashes: true
                    }
                }
            },
            where: {
                previous: {
                    in: allRevisionHashes
                },
                revision_type: {
                    equals: "link"
                }
            }
        })
        // const linkQueryEnd = performance.now()
        // console.log(cliGreenify(`Link revisions query took ${(linkQueryEnd - linkQueryStart).toFixed(2)}ms`))

        // const linkRevisionHashes = linkRevisions.map(revision => revision.pubkey_hash)
        // const aquaFilesRevisionHashes = filteredUserRevisions.filter(revision => !linkRevisionHashes.includes(revision.pubkey_hash))

        // We create an object of the items we want to track differently and or separately
        const formTypesToTrack: Record<string, number> = {}
        for (let i = 0; i < Object.keys(TEMPLATE_HASHES).length; i++) {
            const formType = Object.keys(TEMPLATE_HASHES)[i]
            formTypesToTrack[formType] = 0
        }

        const formTypesToTrackKeys = Object.keys(formTypesToTrack)

        // Loop through each link revision
        for (let j = 0; j < linkRevisions.length; j++) {
            const linkRevision = linkRevisions[j]

            // Loop through each Link in the revision (it's an array)
            for (let k = 0; k < linkRevision.Link.length; k++) {
                const link = linkRevision.Link[k]

                // Loop through each verification hash in the link
                for (let l = 0; l < link.link_verification_hashes.length; l++) {
                    const verificationHash = link.link_verification_hashes[l]

                    // Check which template this hash matches
                    for (let i = 0; i < formTypesToTrackKeys.length; i++) {
                        const formType = formTypesToTrackKeys[i]
                        const templateHash = TEMPLATE_HASHES[formType as keyof typeof TEMPLATE_HASHES]

                        if (verificationHash === templateHash) {
                            formTypesToTrack[formType]++
                            break; // Found match, no need to check other templates
                        }
                    }
                }
            }
        }

        const totalFiles = latestRecords.length;//allUserRevisions.length

    return {
        totalFiles,
        formTypesToTrack,
        storageUsage: allFilesSizes
    }
}