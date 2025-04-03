import { FastifyInstance, FastifyRequest } from 'fastify';
import { SiweMessage } from 'siwe';
import { prisma } from '../database/db';
import { Settings } from '@prisma/client';
import { SessionQuery, SiweRequest } from '../models/request_models';
import { verifySiweMessage } from '../utils/auth_utils';

export default async function userController(fastify: FastifyInstance) {
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
                    cli_pub_key: "",
                    cli_priv_key: "",
                    Witness_network: "sepolia",
                    theme: "light",
                    Witness_contract_address: '0x45f59310ADD88E6d23ca58A0Fa7A55BEE6d2a611',
                }
                await prisma.settings.create({
                    data: defaultData
                })
                return {
                    success: true,
                    data: defaultData
                };

            } else {
                return {
                    success: true,
                    data: settingsData
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

            const settings = request.body as Settings;


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
                // Delete settings
                // await tx.settings.delete({
                //     where: { user_pub_key: userAddress }
                // }).catch(() => {
                //     // Ignore if not found
                // });

                // Delete latest entries
                await tx.latest.deleteMany({
                    where: { user: userAddress }
                });

                await tx.aquaForms.deleteMany({
                    where: {
                        hash: {
                            contains: session.address,
                            mode: 'insensitive' // Case-insensitive matching
                        }
                    }
                })

                await tx.link.deleteMany({
                    where: {
                        hash: {
                            contains: session.address,
                            mode: 'insensitive' // Case-insensitive matching
                        }
                    }
                })

                await tx.signature.deleteMany({
                    where: {
                        hash: {
                            contains: session.address,
                            mode: 'insensitive' // Case-insensitive matching
                        }
                    }
                })

                // First, get the list of files to be deleted
                const filesToDelete = await tx.file.findMany({
                    where: {
                        hash: {
                            contains: session.address,
                            mode: 'insensitive' // Case-insensitive matching
                        }
                    },
                    select: {
                        hash: true
                    }
                });

                // Extract the file hashes
                const fileHashes = filesToDelete.map(file => file.hash);

                // Delete file indexes associated with the deleted files
                if (fileHashes.length > 0) {

                    let fileIndexesWithReferenceCountGreaterThan1 = await tx.fileIndex.findMany({
                        where: {
                            id: {
                                in: fileHashes
                            },
                            reference_count: {
                                gte: 2
                            }
                        },
                    });
                    let fileIndexesWithReferenceCountGreaterThan1Ids = fileIndexesWithReferenceCountGreaterThan1.map(fileIndex => fileIndex.id)
                    if (fileIndexesWithReferenceCountGreaterThan1.length > 0) {
                        await tx.fileIndex.updateMany({
                            where: {
                                id: {
                                    in: fileIndexesWithReferenceCountGreaterThan1Ids
                                },
                                // reference_count: {
                                //     gt: 1
                                // }
                            },
                            data: {
                                reference_count: {
                                    decrement: 1
                                }
                            }
                        });
                        // Update files linked to this file indexes reduce reference count by 1
                        let fileHashesToUpdate = fileIndexesWithReferenceCountGreaterThan1.map(fileIndex => fileIndex.file_hash)
                        await tx.file.updateMany({
                            where: {
                                file_hash: {
                                    in: fileHashesToUpdate,
                                },
                                // reference_count: {
                                //     gte: 2
                                // }
                            },
                            data: {
                                reference_count: {
                                    decrement: 1
                                }
                            }
                        });
                    }

                    let fileIndexesWithReferenceCountLessThan1 = await tx.fileIndex.findMany({
                        where: {
                            id: {
                                in: fileHashes
                            },
                            OR: [
                                { reference_count: { lte: 1 } },
                                { reference_count: null }
                            ]
                        }
                    });

                    let fileIndexesWithReferenceCountLessThan1Ids = fileIndexesWithReferenceCountLessThan1.map(fileIndex => fileIndex.id)
                    let realFileIndexesToDelete = fileIndexesWithReferenceCountLessThan1Ids.filter(
                        id => !fileIndexesWithReferenceCountGreaterThan1Ids.includes(id)
                    );

                    if (realFileIndexesToDelete.length > 0) {
                        console.log(`fileIndexesWithReferenceCountLessThan1 ${JSON.stringify(realFileIndexesToDelete, null, 4)}`)
                        // Lets obtain file_hashes to enable us delete the files
                        let fileHashes = realFileIndexesToDelete.map(fileId => {
                            let fileHash = fileIndexesWithReferenceCountLessThan1.find(fileIndex => fileIndex.id === fileId)?.file_hash
                            return fileHash
                        })
                        await tx.fileIndex.deleteMany({
                            where: {
                                id: {
                                    in: realFileIndexesToDelete
                                },
                                OR: [
                                    { reference_count: { lte: 1 } },
                                    // { reference_count: null }
                                ]
                            }
                        });

                        // Delete the files
                        await tx.file.deleteMany({
                            where: {
                                file_hash: {
                                    in: fileHashes.filter(Boolean) as string[]
                                }
                            }
                        });
                    }

                }

                await tx.revision.deleteMany({
                    where: {
                        pubkey_hash: {
                            contains: session.address,
                            mode: 'insensitive' // Case-insensitive matching
                        }
                    }
                })

                // Keep the user record but delete related data
                // This is to maintain the user's account while clearing their data
            });

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
