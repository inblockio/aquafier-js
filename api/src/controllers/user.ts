import { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
// import { SiweMessage } from 'siwe';
import { prisma } from '../database/db';
// import { Settings } from '@prisma/client';
import { SettingsRequest, UserAttestationAddressesRequest } from '../models/request_models';
// import { verifySiweMessage } from '../utils/auth_utils';
import { fetchEnsName } from '../utils/api_utils';
import { authenticate, AuthenticatedRequest } from '../middleware/auth_middleware';
import { UserAttestationAddresses } from '@prisma/client';

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

        console.log(`=> address ${address} \n Data ${JSON.stringify(userData)}`)
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
        } catch (error) {
            console.error("Error fetching session:", error);
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

        } catch (error) {
            console.error("Error fetching session:", error);
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
                console.log('Starting user data deletion transaction');

                // First, identify all revisions associated with this user
                const userRevisions = await tx.revision.findMany({
                    where: {
                        pubkey_hash: {
                            contains: session.address,
                            mode: 'insensitive'
                        }
                    },
                    select: {
                        pubkey_hash: true
                    }
                });

                const revisionHashes = userRevisions.map(rev => rev.pubkey_hash);
                console.log(`Found ${revisionHashes.length} revisions to process`);

                // Step 1: Delete dependent records in the correct order to respect foreign key constraints

                // 1a. Delete latest entries (no foreign key dependencies)
                await tx.latest.deleteMany({
                    where: { user: userAddress }
                });
                console.log('Deleted latest entries');

                // 1b. Delete AquaForms (depends on Revision)
                if (revisionHashes.length > 0) {
                    await tx.aquaForms.deleteMany({
                        where: {
                            hash: {
                                in: revisionHashes
                            }
                        }
                    });
                    console.log('Deleted aqua forms');
                }

                // 1c. Delete Witness records (depends on Revision)
                // We need to handle this first because Witness has a foreign key to Revision
                if (revisionHashes.length > 0) {

                    let res = await tx.witness.findMany({
                        where: {
                            hash: {
                                in: revisionHashes
                            }
                        }
                    })
                    if (res) {

                        let roots = res.map((e) => e.Witness_merkle_root ?? "")
                        await tx.witnessEvent.deleteMany({
                            where: {
                                Witness_merkle_root: {
                                    in: roots,
                                    mode: 'insensitive'
                                }
                            }
                        });

                    }
                    await tx.witness.deleteMany({
                        where: {
                            hash: {
                                in: revisionHashes
                            }
                        }
                    });
                    console.log('Deleted witness records');
                }

                // 1d. Delete Link records (depends on Revision)
                if (revisionHashes.length > 0) {
                    await tx.link.deleteMany({
                        where: {
                            hash: {
                                in: revisionHashes
                            }
                        }
                    });
                    console.log('Deleted link records');
                }

                // 1e. Delete Signature records (depends on Revision)
                if (revisionHashes.length > 0) {
                    await tx.signature.deleteMany({
                        where: {
                            hash: {
                                in: revisionHashes
                            }
                        }
                    });
                    console.log('Deleted signature records');
                }

                // First, get the list of files to be deleted
                // This works only if the file is uploaded by the user
                // const filesToDelete = await tx.file.findMany({
                //     where: {
                //         hash: {
                //             contains: session.address,
                //             mode: 'insensitive' // Case-insensitive matching
                //         }
                //     },
                //     select: {
                //         hash: true
                //     }
                // });

                // Start from file index to find files associated with this user
                // The hash array in FileIndex contains strings that might include the user's address
                const filesToDelete = await tx.fileIndex.findMany({
                    where: {
                        hash: {
                            hasSome: [session.address] // Look for exact match of address in the array
                        }
                    },
                    select: {
                        id: true
                    }
                });

                // If no exact matches, try a more flexible search with case-insensitive partial matching
                if (filesToDelete.length === 0) {
                    console.log('No exact matches found, trying partial matching');
                    // This is a more complex query to find any FileIndex where any element in the hash array
                    // contains the user's address as a substring
                    const rawQuery = await prisma.$queryRaw`
                        SELECT id FROM file_index 
                        WHERE EXISTS (
                            SELECT 1 FROM unnest(hash) AS h 
                            WHERE LOWER(h) LIKE LOWER('%' || ${session.address} || '%')
                        )
                    `;

                    // Convert raw query results to the same format as our previous query
                    const rawResults = rawQuery as { id: string }[];
                    filesToDelete.push(...rawResults);
                    console.log(`Found ${rawResults.length} matches with partial matching`);
                }

                // Extract the file hashes
                const fileHashes = filesToDelete.map(file => file.id);

                // Delete file indexes associated with the deleted files
                if (fileHashes.length > 0) {

                    // First, get all file indexes that need to be processed
                    const allFileIndexes = await tx.fileIndex.findMany({
                        where: {
                            id: {
                                in: fileHashes
                            }
                        },
                        select: {
                            id: true,
                            file_hash: true,
                            reference_count: true
                        }
                    });

                    console.log(`All file indexes to process: ${JSON.stringify(allFileIndexes, null, 4)}`);

                    // Track which file indexes to delete and which to update
                    const fileIndexesToDelete = [];
                    const fileIndexesToUpdate = [];
                    const fileHashesToUpdate = new Set();
                    const fileHashesToDelete = new Set();

                    // Process each file index based on its reference count
                    for (const fileIndex of allFileIndexes) {
                        const refCount = fileIndex.reference_count;

                        if (refCount === null || refCount <= 1) {
                            // If reference count is null or ≤ 1, mark for deletion
                            fileIndexesToDelete.push(fileIndex.id);
                            if (fileIndex.file_hash) {
                                fileHashesToDelete.add(fileIndex.file_hash);
                            }
                        } else if (refCount >= 2) {
                            // If reference count is exactly 2, it will become 1 after decrementing
                            // So we'll mark it for both update AND deletion
                            fileIndexesToUpdate.push(fileIndex.id);
                            // fileIndexesToDelete.push(fileIndex.id); // Will be deleted after update
                            if (fileIndex.file_hash) {
                                fileHashesToUpdate.add(fileIndex.file_hash);
                                // fileHashesToDelete.add(fileIndex.file_hash);
                            }
                        }
                        // else if (refCount > 2) {
                        //     // If reference count > 2, just decrement it
                        //     fileIndexesToUpdate.push(fileIndex.id);
                        //     if (fileIndex.file_hash) {
                        //         fileHashesToUpdate.add(fileIndex.file_hash);
                        //     }
                        // }
                    }

                    console.log(`File indexes to update: ${JSON.stringify(fileIndexesToUpdate, null, 4)}`);
                    console.log(`File indexes to delete: ${JSON.stringify(fileIndexesToDelete, null, 4)}`);

                    // Step 1: Update reference counts for files that need updating
                    if (fileIndexesToUpdate.length > 0) {
                        // Decrement reference count for file indexes
                        await tx.fileIndex.updateMany({
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

                        // Update files linked to these file indexes
                        if (fileHashesToUpdate.size > 0) {
                            await tx.file.updateMany({
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
                        }
                    }

                    
                    // Step 2: Delete file indexes with reference count <= 1 (including those we just decremented from 2 to 1)
                    if (fileIndexesToDelete.length > 0) {
                        console.log(`File indexes to delete after processing: ${JSON.stringify(fileIndexesToDelete, null, 4)}`);

                        // FIRST: Delete the file indexes (they reference File records)
                        // await tx.fileIndex.deleteMany({
                        //     where: {
                        //         id: {
                        //             in: fileIndexesToDelete
                        //         }
                        //     }
                        // });
                        console.log('Deleted file indexes');

                        // SECOND: Delete the files (now that nothing references them)
                        if (fileHashesToDelete.size > 0) {
                            const uniqueFileHashes = Array.from(fileHashesToDelete).filter(Boolean);
                            console.log(`File hashes to delete: ${JSON.stringify(uniqueFileHashes, null, 4)}`);

                            // await tx.file.deleteMany({
                            //     where: {
                            //         file_hash: {
                            //             in: uniqueFileHashes as string[]
                            //         }
                            //     }
                            // });
                            console.log('Deleted files');
                        }
                    }

                }
                // 1f. Now that all dependent records are deleted, we can delete the Revision records
                if (revisionHashes.length > 0) {
                    await tx.revision.deleteMany({
                        where: {
                            pubkey_hash: {
                                in: revisionHashes
                            }
                        }
                    });
                    console.log('Deleted revision records');
                }

                // Keep the user record but delete related data
                // This is to maintain the user's account while clearing their data
                console.log('User data deletion completed successfully');
            });


            // get all user tmplates
            let allTemplates = await prisma.aquaTemplate.findMany({
                where: {
                    owner: userAddress
                }
            })
            for (let templateItem of allTemplates) {
                await prisma.aquaTemplateFields.deleteMany({
                    where: {
                        aqua_form_id: templateItem.id
                    }
                })
                await prisma.aquaTemplate.delete({
                    where: {
                        id: templateItem.id
                    }
                })

            }
            // Delete the session as well (similar to logout)
            await prisma.siweSession.delete({
                where: { nonce }
            });

            return reply.code(200).send({
                success: true,
                message: 'All user data has been cleared successfully'
            });
        } catch (error) {
            console.error('Error clearing user data:', error);
            return reply.code(500).send({
                success: false,
                message: 'Internal server error while clearing user data',
                error: error instanceof Error ? error.message : String(error)
            });
        }
    });
}
