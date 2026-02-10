import { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
// import { SiweMessage } from 'siwe';
import { prisma } from '../database/db';
// import { Settings } from '@prisma/client';
import { SettingsRequest, UserAttestationAddressesRequest } from '../models/request_models';
// import { verifySiweMessage } from '../utils/auth_utils';
import { fetchEnsExpiry, fetchEnsName } from '../utils/api_utils';
import { getAddressGivenEnsName, isEnsNameOrAddrss } from '../utils/server_utils';
import { authenticate, AuthenticatedRequest } from '../middleware/auth_middleware';
import { Prisma, PrismaClient, UserAttestationAddresses } from '@prisma/client';
import { DefaultArgs } from '@prisma/client/runtime/library';
import Logger from '../utils/logger';
import { TEMPLATE_HASHES } from '../models/constants';
import fs from 'fs';
import { findAquaTreeRevision } from '../utils/revisions_operations_utils';
import { generateENSClaim } from '../utils/server_attest';
import { saveAquaTree } from '../utils/revisions_utils';
import { saveFileAndCreateOrUpdateFileIndex } from '../utils/aqua_tree_utils';
import Aquafier, { cliRedify } from 'aqua-js-sdk';
import { calculateStorageUsage } from '../utils/stats';
import { usageService } from '../services/usageService';

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
                ens_name: addr.name,
                ens_name_type: 'ALIAS'
            }
        });

        return reply.code(200).send({ success: true, message: "ok" });
    });

    // Unified ENS/Address resolver - handles both ENS->Address and Address->ENS
    fastify.get('/resolve/:identifier', async (request, reply) => {
        const { identifier } = request.params as { identifier: string };
        const { useEns } = request.query as { useEns?: string };

        // Add authorization
        const nonce = request.headers['nonce'];
        if (!nonce || typeof nonce !== 'string' || nonce.trim() === '') {
            return reply.code(401).send({ error: 'Unauthorized: Missing or empty nonce header' });
        }
        const session = await prisma.siweSession.findUnique({
            where: { nonce: nonce }
        });
        if (session == null) {
            return reply.code(403).send({ success: false, message: "Nonce is invalid" });
        }

        try {
            // Determine if identifier is an ENS name or address
            const identifierType = isEnsNameOrAddrss(identifier);

            if (identifierType === "address") {
                // Input is an address, resolve to ENS name
                return await resolveAddressToEns(identifier, useEns, reply);
            } else if (identifierType === "ens") {
                // Input is an ENS name, resolve to address
                return await resolveEnsToAddress(identifier, reply);
            } else {
                return reply.code(400).send({
                    success: false,
                    message: "Invalid identifier format. Must be a valid Ethereum address or ENS name."
                });
            }
        } catch (error: any) {
            Logger.error('Error in resolve endpoint:', error);
            return reply.code(500).send({
                success: false,
                message: "Internal server error during resolution"
            });
        }
    });

    // Helper function to resolve address to ENS name
    async function resolveAddressToEns(address: string, useEns: string | undefined, reply: FastifyReply) {
        // Check database first
        const dbResult = useEns === 'true'
            ? await prisma.eNSName.findFirst({
                where: { wallet_address: { equals: address, mode: 'insensitive' } }
            })
            : await prisma.users.findFirst({
                where: { address: { equals: address, mode: 'insensitive' } }
            });

        if (dbResult && dbResult.ens_name) {
            return reply.code(200).send({
                success: true,
                type: 'ens_name',
                result: dbResult.ens_name,
                source: 'database'
            });
        }

        // Fetch from blockchain
        const alchemyProjectKey = process.env.ALCHEMY_API_KEY;
        if (!alchemyProjectKey) {
            return reply.code(404).send({
                success: false,
                message: "ENS resolution unavailable: API key not configured"
            });
        }

        const ensName = await fetchEnsName(address, alchemyProjectKey);
        console.log(cliRedify(`Found ENS NAME: ${ensName}`))
        if (ensName) {
            // Save to database
            await saveEnsToDatabase(address, ensName, useEns);

            return reply.code(200).send({
                success: true,
                type: 'ens_name',
                result: ensName,
                source: 'blockchain'
            });
        }

        return reply.code(404).send({
            success: false,
            message: "No ENS name found for this address"
        });
    }

    // Helper function to resolve ENS name to address
    async function resolveEnsToAddress(ensName: string, reply: FastifyReply) {
        // Check database first
        const dbResult = await prisma.eNSName.findFirst({
            where: { ens_name: { equals: ensName, mode: 'insensitive' } }
        });

        if (dbResult && dbResult.wallet_address) {
            return reply.code(200).send({
                success: true,
                type: 'address',
                result: dbResult.wallet_address,
                source: 'database'
            });
        }

        // Fetch from blockchain
        const address = await getAddressGivenEnsName(ensName);
        if (address) {
            // Save to database - handle case-insensitive ENS names
            const existingEnsRecord = await prisma.eNSName.findFirst({
                where: {
                    ens_name: {
                        equals: ensName,
                        mode: 'insensitive'
                    }
                }
            });

            if (existingEnsRecord) {
                await prisma.eNSName.update({
                    where: { id: existingEnsRecord.id },
                    data: { wallet_address: address, ens_name: ensName }
                });
            } else {
                await prisma.eNSName.create({
                    data: { ens_name: ensName, wallet_address: address }
                });
            }

            return reply.code(200).send({
                success: true,
                type: 'address',
                result: address,
                source: 'blockchain'
            });
        }

        return reply.code(404).send({
            success: false,
            message: "No address found for this ENS name"
        });
    }

    // Helper function to save ENS data to database
    async function saveEnsToDatabase(address: string, ensName: string, useEns: string | undefined) {
        const alchemyProjectKey = process.env.ALCHEMY_API_KEY || "";
        const ensExpiry = ensName ? await fetchEnsExpiry(ensName, alchemyProjectKey) : null;

        if (useEns === 'true') {
            // First, try to find existing record with case-insensitive search
            const existingEnsRecord = await prisma.eNSName.findFirst({
                where: {
                    wallet_address: {
                        equals: address,
                        mode: 'insensitive'
                    }
                }
            });

            if (existingEnsRecord) {
                // Update existing record using its ID
                await prisma.eNSName.update({
                    where: { id: existingEnsRecord.id },
                    data: { ens_name: ensName, wallet_address: address, ens_expiry: ensExpiry }
                });
            } else {
                // Create new record
                await prisma.eNSName.create({
                    data: { wallet_address: address, ens_name: ensName, ens_expiry: ensExpiry }
                });
            }
        }

        await prisma.users.upsert({
            where: { address: address },
            update: { ens_name: ensName },
            create: { address: address, ens_name: ensName, email: '' }
        });
    }

    fastify.get('/ens', async (request, reply) => {
        // const { address } = request.query as { address: string };

        try {
            let data = await prisma.eNSName.findMany()
            return reply.code(200).send({ success: true, message: "ok", data });

        } catch (e: any) {
            return reply.code(500).send({ success: false, message: `error : ${e}`, });

        }
    })

    fastify.post('/user/create_ens_claim', { preHandler: authenticate }, async (request: AuthenticatedRequest, reply) => {

        const user = request.user;

        const userAddress = user?.address

        console.log("User address: ", userAddress)

        if (!userAddress) {
            return reply.code(400).send({ error: "You are not logged in!" })
        }

        const ensEntry = await prisma.eNSName.findFirst({
            where: {
                wallet_address: {
                    equals: userAddress,
                    mode: "insensitive"
                }
            }
        })

        if (!ensEntry) {
            return reply.code(400).send({ error: "Please logout and login in again!" })
        }

        const userEns = ensEntry.ens_name

        if (!userEns) {
            return reply.code(400).send({ error: "You don't have an ENS name!" })
        }

        try {

            let ensAquaClaim = await generateENSClaim(userEns, ensEntry.ens_expiry?.toDateString() ?? new Date().toString(), userAddress)
            let ensClaimAquaTree = ensAquaClaim?.aquaTree
            let ensFiledata = ensAquaClaim?.ensJSONfileData
            let ensFileName = ensAquaClaim?.ensJSONfileName

            if (ensClaimAquaTree && ensFiledata && ensFileName) {
                let ensFileBuffer = Buffer.from(JSON.stringify(ensFiledata))

                let res = await saveAquaTree(ensClaimAquaTree, userAddress)


                let res2 = await saveFileAndCreateOrUpdateFileIndex(userAddress, ensClaimAquaTree, ensFileName, ensFileBuffer)

                return reply.code(200).send({ success: true, message: "Claim created successfully", aquaTree: ensClaimAquaTree })
            }

        } catch (e: any) {
            return reply.code(500).send({ success: true, message: `error : ${e}`, });

        }

    })

    fastify.get('/attestation_address', {
        preHandler: authenticate
    }, async (request: AuthenticatedRequest, reply) => {

        const user = request.user;

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

    fastify.post('/attestation_address', {
        preHandler: authenticate
    }, async (request: AuthenticatedRequest, reply) => {

        const user = request.user;

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

    fastify.put('/attestation_address', { preHandler: authenticate }, async (request: AuthenticatedRequest, reply) => {

        const user = request.user;

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

    fastify.delete('/attestation_address', { preHandler: authenticate }, async (request: AuthenticatedRequest, reply) => {

        const user = request.user;

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

            let enableDBAClaim = process.env.ENABLE_DBA_CLAIM ?? "false"

            if (settingsData == null) {
                let defaultData = {
                    user_pub_key: session.address,
                    ens_name: "",
                    cli_pub_key: "",
                    cli_priv_key: "",
                    witness_network: "sepolia",
                    theme: "light",
                    enable_dba_claim: enableDBAClaim == "true" ? true : false,
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

                // console.log(`Found ${contractsToSoftDelete.length} contracts where user is a recipient`);

                // Filter out contracts where the user has already soft-deleted (to avoid duplicates)
                const contractsNeedingSoftDelete = contractsToSoftDelete.filter(contract =>
                    !contract.receiver_has_deleted?.includes(userAddress)
                );

                // console.log(`${contractsNeedingSoftDelete.length} contracts need soft delete for user ${userAddress}`);

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

                // console.log(`Soft deleted ${updatedContractsCount} contracts for user ${userAddress}`);


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

            // Step 8: Delete user settings
            await prisma.settings.deleteMany({
                where: {
                    user_pub_key: userAddress
                }
            });

            // Step 9: Recalculate usage stats after bulk deletion
            usageService.recalculateUserUsage(userAddress).catch(err =>
                Logger.error('Failed to recalculate usage after user data deletion:', err)
            );

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

    // Get user data stats 
    // fastify.get('/user_data_stats', {
    //     preHandler: authenticate
    // }, async (request: AuthenticatedRequest, reply) => {
    //     const userAddress = request.user?.address;

    //     if (!userAddress) {
    //         return reply.code(401).send({ error: 'User not authenticated' });
    //     }

    // let stats = await calculateStorageUsage(userAddress)

    // return reply.code(200).send({
    //     filesCount: stats.totalFiles,
    //     storageUsed: stats.storageUsage,
    //     // totalRevisions: allUserRevisions.length,
    //     // linkRevisionsCount: linkRevisions.length,
    //     claimTypeCounts: {
    //         ...stats.formTypesToTrack,
    //         user_files: aquaFiles
    //     }
    // })

    // });

    // Get user data stats
    fastify.get('/user_data_stats', {
        preHandler: authenticate
    }, async (request: AuthenticatedRequest, reply) => {
        const userAddress = request.user?.address;

        if (!userAddress) {
            return reply.code(401).send({ error: 'User not authenticated' });
        }

        /**
         * We query through Revisions and count the user's revisions since genesis in one way or the other has the user address
         * And besides that we can filter through the pubkey_hash field to sort of map out the all information regarding to the user from revisions 
         * before building the user stats object
         * 1. Query all genesis revision
         * 2. Get link revisions with genesis as previous
         * 3. Do a counter on them based on type (form type)
         * 
         */
        // 1. All user revisions
        // const queryStart = performance.now()

        // TODO do not delete
        // const revisionsInDB = await prisma.revision.findMany({
        //     select: {
        //         pubkey_hash: true,
        //         // revision_type: true,
        //         previous: true,
        //         // Link: {
        //         //     select: {
        //         //         link_verification_hashes: true
        //         //     }
        //         // }
        //         AquaForms: {
        //             select: {
        //                 key: true
        //             }
        //         }
        //     },
        //     where: {
        //         pubkey_hash: {
        //             startsWith: userAddress
        //         },
        //         previous: {
        //             equals: ""
        //         },
        //     }
        // });


        let allUserRevisions: {
            pubkey_hash: string;
            previous: string | null;
            AquaForms: {
                key: string | null;
            }[]
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
                    allUserRevisions.push({
                        pubkey_hash: genesisRevision.pubkey_hash,
                        previous: genesisRevision.previous,
                        AquaForms: aquaForms
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
                        Logger.error(`Error getting file size for ${fileResult.file_location}: ${err}`);
                    }


                }


            }
        }
        // const queryEnd = performance.now()
        // console.log(cliGreenify(`Genesis revisions query took ${(queryEnd - queryStart).toFixed(2)}ms`))

        // Filter out revisions that contain aqua_sign fields (forms_signers)
        const filteredUserRevisions = allUserRevisions.filter(revision => {
            // Check if any AquaForms has the key "forms_signers"
            const hasFormsSigners = revision.AquaForms.some(form => form.key === "forms_signers")
            return !hasFormsSigners // Return true if it doesn't have forms_signers (keep it)
        })

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

        const totalFiles = latestRecords.length
        const aquaFiles = totalFiles - Object.values(formTypesToTrack).reduce((a, b) => a + b, 0)


        let stats = await calculateStorageUsage(userAddress)

        return reply.code(200).send({
            filesCount: totalFiles,
            storageUsed: allFilesSizes,
            // totalRevisions: allUserRevisions.length,
            // linkRevisionsCount: linkRevisions.length,
            claimTypeCounts: {
                ...stats.formTypesToTrack,
                user_files: aquaFiles
            }
        })

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
