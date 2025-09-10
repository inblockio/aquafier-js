import {FastifyInstance, FastifyReply, FastifyRequest} from 'fastify';
// import { SiweMessage } from 'siwe';
import {prisma} from '../database/db';
// import { Settings } from '@prisma/client';
import {SettingsRequest, UserAttestationAddressesRequest} from '../models/request_models';
// import { verifySiweMessage } from '../utils/auth_utils';
import {fetchEnsName} from '../utils/api_utils';
import {authenticate, AuthenticatedRequest} from '../middleware/auth_middleware';
import {Prisma, PrismaClient, UserAttestationAddresses} from '@prisma/client';
import {DefaultArgs} from '@prisma/client/runtime/library';
import Logger from 'src/utils/Logger';

export default async function userController(fastify: FastifyInstance) {

    fastify.put('/user_ens/:address', async (request, reply) => {

        const { address } = request.params as { address: string };

        // Add authorization
        const nonce = request.headers['nonce'];
        if (!nonce || typeof nonce !== 'string' || nonce.trim() === '') {
            return reply.code(401).send({ error: 'Unauthorized: Missing or empty nonce header' });
        }
        const session = await prisma.siweSession.findUnique({
            where: { nonce: nonce }
        });
        if (session == null) {
            return reply.code(403).send({ success: false, message: "Nounce  is invalid" });
        }

        const addr = request.body as { name: string };


        await prisma.users.update({
            where: {
                address: address,
            },
            data: {
                ens_name: addr.name
            }
        });

        return reply.code(200).send({ success: true, message: "ok" });


    })
    // fetch ens name if it exist 
    fastify.get('/user_ens/:address', async (request, reply) => {
        const { address } = request.params as { address: string };

        // Add authorization
        const nonce = request.headers['nonce'];
        if (!nonce || typeof nonce !== 'string' || nonce.trim() === '') {
            return reply.code(401).send({ error: 'Unauthorized: Missing or empty nonce header' });
        }
        const session = await prisma.siweSession.findUnique({
            where: { nonce: nonce }
        });
        if (session == null) {
            return reply.code(403).send({ success: false, message: "Nounce  is invalid" });
        }

        // check in out db first 
        // check if user exist in users
        const userData = await prisma.users.findFirst({
            where: {
                address: {
                    equals: address,
                    mode: 'insensitive'
                }
            }
        });

        Logger.info(`=> address ${address} \n Data ${JSON.stringify(userData)}`)
        if (userData) {
            if (userData.ens_name) {
                return reply.code(200).send({
                    success: true,
                    ens: userData.ens_name
                });
            }
        }

        // Check if we should attempt ENS lookup
        const infuraProjectId = process.env.VITE_INFURA_PROJECT_ID;

        let ensName = null
        if (infuraProjectId) {
            ensName = await fetchEnsName(address, infuraProjectId)
        }
        if (ensName) {
            await prisma.users.upsert({
                where: {
                    address: address,
                },
                update: {

                },
                create: {
                    ens_name: ensName,
                    address: address,
                    email: ''
                }
            });

            return reply.code(200).send({
                success: true,
                ens: ensName
            });
        }


        return reply.code(200).send({
            message: `ens not in system and ${infuraProjectId ? 'fetch ens failed ' : 'infura key not found in system'}`,
            success: false,
            ens: address
        });
    });

    fastify.get('/attestation_address', async (request: FastifyRequest, reply: FastifyReply) => {

        // Authenticate the user
        if (!(await authenticate(request, reply))) {
            return; // The authenticate function already sent the appropriate error response
        }

        const user = (request as AuthenticatedRequest).user;

        try {
            let data = prisma.userAttestationAddresses.findMany({
                where: {
                    owner: user?.address!!
                }
            })
            return reply.code(200).send({ success: true, message: "ok", data });

        } catch (e: any) {
            return reply.code(500).send({ success: true, message: `error : ${e}`, });

        }


    })

    fastify.post('/attestation_address', async (request, reply) => {
        // Authenticate the user
        if (!(await authenticate(request, reply))) {
            return; // The authenticate function already sent the appropriate error response
        }

        const user = (request as AuthenticatedRequest).user;

        const userAttestationAddressesRequest = request.body as UserAttestationAddressesRequest;

        if (
            userAttestationAddressesRequest.address == null ||
            userAttestationAddressesRequest.address == undefined ||
            userAttestationAddressesRequest.address == "" ||
            userAttestationAddressesRequest.trust_level == null ||
            userAttestationAddressesRequest.trust_level == null ||
            typeof userAttestationAddressesRequest.trust_level != "number" ||
            typeof userAttestationAddressesRequest.address != "string"
        ) {
            let errMssg = ""
            if (typeof userAttestationAddressesRequest.trust_level != "number") {
                errMssg = "trust_level shuld be an integer."
            }
            if (typeof userAttestationAddressesRequest.address != "string") {
                errMssg = "address shuld be a string."
            }
            return reply.code(412).send({ success: true, message: `error  address and trust level are required ${errMssg}`, });

        }
        try {

            prisma.userAttestationAddresses.create({
                data: {
                    address: userAttestationAddressesRequest.address,
                    trust_level: userAttestationAddressesRequest.trust_level,
                    owner: user?.address!!,
                    id: undefined
                }
            })
        } catch (e: any) {
            return reply.code(500).send({ success: true, message: `error : ${e}`, });

        }


    })

    fastify.put('/attestation_address', async (request, reply) => {
        // Authenticate the user
        if (!(await authenticate(request, reply))) {
            return; // The authenticate function already sent the appropriate error response
        }

        const user = (request as AuthenticatedRequest).user;

        const userAttestationAddresses = request.body as UserAttestationAddresses;

        try {

            prisma.userAttestationAddresses.update({
                where: {
                    id: userAttestationAddresses.id
                },
                data: {
                    address: userAttestationAddresses.address,
                    trust_level: userAttestationAddresses.trust_level,
                }
            })
        } catch (e: any) {
            return reply.code(500).send({ success: true, message: `error : ${e}`, });

        }

    })

    fastify.delete('/attestation_address', async (request, reply) => {
        // Authenticate the user
        if (!(await authenticate(request, reply))) {
            return; // The authenticate function already sent the appropriate error response
        }

        const user = (request as AuthenticatedRequest).user;

        const userAttestationAddresses = request.body as UserAttestationAddresses;

        try {

            prisma.userAttestationAddresses.delete({
                where: {
                    id: userAttestationAddresses.id
                },
            })
        } catch (e: any) {
            return reply.code(500).send({ success: true, message: `error : ${e}`, });

        }



    })


    // get current session
    fastify.get('/explorer_fetch_user_settings', async (request, reply) => {
        const nonce = request.headers['nonce'];

        if (!nonce || typeof nonce !== 'string' || nonce.trim() === '') {
            return reply.code(401).send({ error: 'Unauthorized: Missing or empty nonce header' });
        }

        try {


            const session = await prisma.siweSession.findUnique({
                where: { nonce }
            });

            if (!session) {
                return reply.code(404).send({ success: false, message: "Session not found" });
            }

            // Check if session is expired
            if (new Date(session.expirationTime!!) < new Date()) {
                return reply.code(401).send({ success: false, message: "Session expired" });
            }

            let settingsData = await prisma.settings.findFirst({
                where: {
                    user_pub_key: session.address
                }
            })

            if (settingsData == null) {
                let defaultData = {
                    user_pub_key: session.address,
                    ens_name: "",
                    cli_pub_key: "",
                    cli_priv_key: "",
                    witness_network: "sepolia",
                    theme: "light",
                    witness_contract_address: '0x45f59310ADD88E6d23ca58A0Fa7A55BEE6d2a611',
                }
                await prisma.settings.create({
                    data: defaultData
                })
                return {
                    success: true,
                    data: defaultData
                };

            } else {
                let ensName = ""
                // get ens from user 
                const userData = await prisma.users.findFirst({
                    where: {
                        address: session.address,
                    }
                })
                if (userData) {
                    ensName = userData.ens_name ?? ""
                }
                return {
                    success: true,
                    data: {
                        ...settingsData,
                        ens_name: ensName
                    }
                }
            }
        } catch (error: any) {
            Logger.error("Error fetching session:", error);
            return reply.code(500).send({ success: false, message: "Internal server error" });
        }

    });

    fastify.post('/explorer_update_user_settings', async (request, reply) => {

        const nonce = request.headers['nonce'];

        if (!nonce || typeof nonce !== 'string' || nonce.trim() === '') {
            return reply.code(401).send({ error: 'Unauthorized: Missing or empty nonce header' });
        }

        try {
            const settingsPar = request.body as SettingsRequest;

            const { ens_name, ...settings } = settingsPar;

            const session = await prisma.siweSession.findUnique({
                where: { nonce }
            });

            if (!session) {
                return reply.code(404).send({ success: false, message: "Session not found" });
            }

            // Check if session is expired
            if (new Date(session.expirationTime!!) < new Date()) {
                return reply.code(401).send({ success: false, message: "Session expired" });
            }

            await prisma.settings.update({
                where: {
                    user_pub_key: session.address
                },
                data: {
                    ...settings,
                    user_pub_key: session.address
                }
            })

            // update ens 
            await prisma.users.update({
                where: {
                    address: session.address
                },
                data: {
                    ens_name: ens_name
                }
            })

        } catch (error: any) {
            Logger.error("Error fetching session:", error);
            return reply.code(500).send({ success: false, message: "Internal server error" });
        }
    });


    // Clear all user data
    fastify.delete('/user_data', async (request, reply) => {
        const nonce = request.headers['nonce'];

        if (!nonce || typeof nonce !== 'string' || nonce.trim() === '') {
            return reply.code(401).send({ success: false, message: 'Unauthorized: Missing or empty nonce header' });
        }

        try {
            // Verify session exists and is valid
            const session = await prisma.siweSession.findUnique({
                where: { nonce }
            });

            if (!session) {
                return reply.code(404).send({ success: false, message: 'Session not found' });
            }

            // Check if session is expired
            if (new Date(session.expirationTime!!) < new Date()) {
                return reply.code(401).send({ success: false, message: 'Session expired' });
            }

            const userAddress = session.address;

            // Start a transaction to ensure all operations succeed or fail together
            await prisma.$transaction(async (tx) => {
                Logger.info('Starting user data deletion transaction for user:', userAddress);

                const deletedNotifications = await tx.notifications.deleteMany({
                    where: { receiver: userAddress }
                });
                Logger.info(`Deleted deletedNotifications ${deletedNotifications.count}  records`);

                // Step 1: Delete all Latest records associated with user address
                const deletedLatest = await tx.latest.deleteMany({
                    where: { user: userAddress }
                });
                Logger.info(`Deleted ${deletedLatest.count} latest records`);

                // const deletedContracts = await tx.contract.deleteMany({
                //     where: {
                //         receiver: {
                //             contains: userAddress,
                //             mode: 'insensitive'
                //         },
                //     }
                // });
                // console.log(`Deleted ${deletedContracts.count} contracts records`);



                // contracts
                // start witth recipients
                // Updated soft delete logic - adds user address to receiver_has_deleted array
                // instead of hard deleting contracts

                // First, find all contracts where the user is a recipient
                const contractsToSoftDelete = await tx.contract.findMany({
                    where: {
                        recipients: {
                            has: userAddress
                        }
                    }
                });

                console.log(`Found ${contractsToSoftDelete.length} contracts where user is a recipient`);

                // Filter out contracts where the user has already soft-deleted (to avoid duplicates)
                const contractsNeedingSoftDelete = contractsToSoftDelete.filter(contract =>
                    !contract.receiver_has_deleted?.includes(userAddress)
                );

                console.log(`${contractsNeedingSoftDelete.length} contracts need soft delete for user ${userAddress}`);

                // Add the user's address to the receiver_has_deleted array for each contract
                let updatedContractsCount = 0;

                for (const contract of contractsNeedingSoftDelete) {
                    await tx.contract.update({
                        where: {
                            hash: contract.hash
                        },
                        data: {
                            receiver_has_deleted: {
                                push: userAddress
                            }
                        }
                    });
                    updatedContractsCount++;
                }

                console.log(`Soft deleted ${updatedContractsCount} contracts for user ${userAddress}`);


                // also delete contracts where user is the sender
                const deletedSenderContracts = await tx.contract.deleteMany({
                    where: {
                        sender: {
                            equals: userAddress,
                            mode: 'insensitive'
                        }
                    }
                });
                Logger.info(`Hard deleted ${deletedSenderContracts.count} contracts where user was sender`);

                // End of contracts

                // Step 2: Get all revisions associated with this user
                const userRevisions = await tx.revision.findMany({
                    where: {
                        pubkey_hash: {
                            contains: userAddress,
                            mode: 'insensitive'
                        }
                    },
                    select: {
                        pubkey_hash: true
                    }
                });

                const revisionHashes = userRevisions.map(rev => rev.pubkey_hash);
                Logger.info(`Found ${revisionHashes.length} revisions to process`);

                if (revisionHashes.length > 0) {
                    // Step 3: Delete dependent records in order

                    // 3a. Delete Link records
                    const deletedLinks = await tx.link.deleteMany({
                        where: {
                            hash: {
                                in: revisionHashes
                            }
                        }
                    });
                    Logger.info(`Deleted ${deletedLinks.count} link records`);

                    // 3b. Delete Signature records
                    const deletedSignatures = await tx.signature.deleteMany({
                        where: {
                            hash: {
                                in: revisionHashes
                            }
                        }
                    });
                    Logger.info(`Deleted ${deletedSignatures.count} signature records`);

                    // 3c. Delete Witness records and associated WitnessEvent records
                    const witnessRecords = await tx.witness.findMany({
                        where: {
                            hash: {
                                in: revisionHashes
                            }
                        },
                        select: {
                            hash: true,
                            Witness_merkle_root: true
                        }
                    });

                    if (witnessRecords.length > 0) {

                        for (const merkelItem of witnessRecords) {
                            Logger.info(`Witness Record - Hash: ${merkelItem.hash}, Merkle Root: ${merkelItem.Witness_merkle_root}`);


                            if (merkelItem.Witness_merkle_root == null) {
                                Logger.info(`Skipping WitnessEvent deletion for hash ${merkelItem.hash} due to null Merkle root`);
                                continue;
                            }
                            const allWithMerkleRoot = await prisma.witness.findMany({
                                where: {
                                    Witness_merkle_root: {
                                        not: null,
                                        equals: merkelItem.Witness_merkle_root
                                    }
                                }
                            });

                            if (allWithMerkleRoot.length <= 1) {
                                // delete all witness event 
                                const deletedWitnessEvents = await tx.witnessEvent.deleteMany({
                                    where: {
                                        Witness_merkle_root: {
                                            equals: merkelItem.Witness_merkle_root
                                        }
                                    }
                                });
                                Logger.info(`Deleted ${deletedWitnessEvents.count} witness event records for merkle root ${merkelItem.Witness_merkle_root}`);

                            }

                        }


                        // Delete Witness records
                        const deletedWitness = await tx.witness.deleteMany({
                            where: {
                                hash: {
                                    in: revisionHashes
                                }
                            }
                        });
                        Logger.info(`Deleted ${deletedWitness.count} witness records`);


                    }

                    // 3d. Delete AquaForms records
                    const deletedAquaForms = await tx.aquaForms.deleteMany({
                        where: {
                            hash: {
                                in: revisionHashes
                            }
                        }
                    });
                    Logger.info(`Deleted ${deletedAquaForms.count} aqua forms records`);

                    // Step 4: Handle Files and FileIndex records
                    for (const hash of revisionHashes) {
                        // Use deleteMany instead of delete to avoid errors when records don't exist
                        await prisma.fileName.deleteMany({
                            where: {
                                pubkey_hash: hash
                            }
                        });

                        Logger.info(`Processing files for revision hash: ${hash}`);
                        await handleFilesDeletion(tx, hash);
                    }

                    // Step 5: Finally delete Revision records
                    const deletedRevisions = await tx.revision.deleteMany({
                        where: {
                            pubkey_hash: {
                                in: revisionHashes
                            }
                        }
                    });
                    Logger.info(`Deleted ${deletedRevisions.count} revision records`);
                }

                Logger.info('User data deletion completed successfully');
            });

            // Step 6: Delete user templates (outside transaction for better error handling)
            await deleteUserTemplates(userAddress);

            // Step 7: Delete the session
            await prisma.siweSession.delete({
                where: { nonce }
            });

            return reply.code(200).send({
                success: true,
                message: 'All user data has been cleared successfully'
            });

        } catch (error: any) {
            Logger.error('Error clearing user data:', error);
            return reply.code(500).send({
                success: false,
                message: 'Internal server error while clearing user data',
                error: error instanceof Error ? error.message : String(error)
            });
        }
    });



    // Helper function to handle files deletion
    async function handleFilesDeletion(
        tx: Omit<PrismaClient<Prisma.PrismaClientOptions, never, DefaultArgs>, "$connect" | "$disconnect" | "$on" | "$transaction" | "$use" | "$extends">,
        pubKey: string) {
        Logger.info('Starting files deletion process');

        // Find FileIndex records associated with this user
        let filesToDelete = await tx.fileIndex.findMany({
            where: {
                pubkey_hash: {
                    hasSome: [pubKey]
                }
            },
            select: {
                file_hash: true,
                pubkey_hash: true,
            }
        });

        // If no exact matches, try partial matching
        if (filesToDelete.length === 0) {
            Logger.info('No exact matches found, trying partial matching');
            const rawQuery = await tx.$queryRaw`
            SELECT file_hash, pubkey_hash FROM file_index 
            WHERE EXISTS (
                SELECT 1 FROM unnest(pubkey_hash) AS h 
                WHERE LOWER(h) LIKE LOWER('%' || ${pubKey} || '%')
            )
        `;
            filesToDelete = rawQuery as { file_hash: string; pubkey_hash: string[]; }[];
            Logger.info(`Found ${filesToDelete.length} matches with partial matching`);
        }

        if (filesToDelete.length > 0) {
            // Group files by reference count for processing
            const fileHashesToRemoveUser = new Set<string>();
            const fileHashesToDeleteCompletely = new Set<string>();

            for (const fileIndex of filesToDelete) {
                const refCount = fileIndex.pubkey_hash.length;
                fileHashesToRemoveUser.add(fileIndex.file_hash);

                if (refCount <= 1) {
                    // If this is the only reference, mark for complete deletion
                    fileHashesToDeleteCompletely.add(fileIndex.file_hash);
                }
            }

            // First, remove the user from pubkey_hash arrays for files with multiple references
            for (const fileHash of fileHashesToRemoveUser) {
                if (!fileHashesToDeleteCompletely.has(fileHash)) {
                    // Update the pubkey_hash array to remove the user
                    const currentFileIndex = await tx.fileIndex.findUnique({
                        where: { file_hash: fileHash },
                        select: { pubkey_hash: true }
                    });

                    if (currentFileIndex) {
                        const updatedPubkeyHash = currentFileIndex.pubkey_hash.filter(
                            hash => hash !== pubKey
                        );

                        if (updatedPubkeyHash.length === 0) {
                            // If no references left after removal, mark for complete deletion
                            fileHashesToDeleteCompletely.add(fileHash);
                        } else {
                            // Update with filtered array
                            await tx.fileIndex.update({
                                where: { file_hash: fileHash },
                                data: { pubkey_hash: updatedPubkeyHash }
                            });
                        }
                    }
                }
            }

            // Delete FileIndex records that have no remaining references
            if (fileHashesToDeleteCompletely.size > 0) {
                const deletedFileIndexes = await tx.fileIndex.deleteMany({
                    where: {
                        file_hash: {
                            in: Array.from(fileHashesToDeleteCompletely)
                        }
                    }
                });
                Logger.info(`Deleted ${deletedFileIndexes.count} file index records`);

                // Now delete corresponding File records
                const deletedFiles = await tx.file.deleteMany({
                    where: {
                        file_hash: {
                            in: Array.from(fileHashesToDeleteCompletely)
                        }
                    }
                });
                Logger.info(`Deleted ${deletedFiles.count} file records`);
            }

            Logger.info(`Processed ${filesToDelete.length} file associations for user ${pubKey}`);
        } else {
            Logger.info(`No files found for user ${pubKey}`);
        }
    }

    // Helper function to delete user templates
    async function deleteUserTemplates(userAddress: string) {
        Logger.info('Starting template deletion process');

        const userTemplates = await prisma.aquaTemplate.findMany({
            where: {
                owner: userAddress
            },
            select: {
                id: true
            }
        });

        for (const template of userTemplates) {
            // Delete template fields first
            await prisma.aquaTemplateFields.deleteMany({
                where: {
                    aqua_form_id: template.id
                }
            });

            // Delete template
            await prisma.aquaTemplate.delete({
                where: {
                    id: template.id
                }
            });
        }

        Logger.info(`Deleted ${userTemplates.length} user templates`);
    }

}
