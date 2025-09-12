import Aquafier, {AquaTree, CredentialsData} from "aqua-js-sdk";
import {ethers,} from "ethers";
import {ServerWalletInformation} from "../models/types";
import {getFileUploadDirectory} from "./file_utils";
import fs from 'fs';
import path from 'path';
import {prisma} from "../database/db";
import {randomUUID} from "crypto";
import {isWorkFlowData, saveAquaTree} from "./revisions_utils";
import {serverAttestation} from "./server_attest";
import {systemTemplateHashes} from "../models/constants";
import {getGenesisHash} from "./aqua_tree_utils";
import Logger from "./Logger";


// Basic random number function
export function getRandomNumber(min: number, max: number): number | null {
    // Ensure min and max are numbers
    min = Number(min)
    max = Number(max)

    // Validate inputs
    if (isNaN(min) || isNaN(max)) {
        Logger.warn('Please provide valid numbers')
        return null
    }

    // Swap if min is greater than max
    if (min > max) {
        ;[min, max] = [max, min]
    }

    // Generate random number between min and max (inclusive)
    return Math.floor(Math.random() * (max - min + 1)) + min
}


export async function saveAttestationFileAndAquaTree(aquaTree: AquaTree, genesisHashOfFile: string, walletAddress: string) {


    // Logic to check and attest an aquatree if its a phone number claim or email_claim
    let workflowDataResponse = isWorkFlowData(aquaTree, systemTemplateHashes)
    // throw new Error(`workflowDataResponse ${JSON.stringify(workflowDataResponse)}`)
    if (workflowDataResponse.isWorkFlow && (workflowDataResponse.workFlow.includes("phone_number_claim") || workflowDataResponse.workFlow.includes("email_claim"))) {
        let serverAttestationInfo = await serverAttestation(genesisHashOfFile)

        if (serverAttestationInfo) {
            const attestedData = serverAttestationInfo

            let aquafier = new Aquafier()

            let genesisHash = getGenesisHash(attestedData.aquaTree)

            if (genesisHash == null) {
                throw Error(`genesis hash of attested aqua tree casnnot be null`)
            }

            // let filepubkeyhash = `${session.address}_${genesisHash}`
            let filepubkeyhash = `${walletAddress}_${genesisHash}`


            let fileData = JSON.stringify(attestedData.attestationJSONfileData)
            let fileHash = aquafier.getFileHash(fileData)

            let genRevision = attestedData.aquaTree.revisions[genesisHash]
            if (!genRevision) {
                throw Error(`genesis revision of attested aqua tree casnnot be null`)
            }
            let aquaTreeFilehash = genRevision[`file_hash`]
            if (fileHash != aquaTreeFilehash) {
                throw Error(`file hash doo not match aquaTreeFilehash ${aquaTreeFilehash} == generated ${fileHash}`)
            }

            let existingFileIndex = await prisma.fileIndex.findFirst({
                where: {file_hash: fileHash},
            });

            // Create unique filename
            let fileName = serverAttestationInfo.attestationJSONfileName;
            await prisma.fileName.upsert({
                where: {
                    pubkey_hash: filepubkeyhash,
                },
                create: {
                    pubkey_hash: filepubkeyhash,
                    file_name: fileName,
                },
                update: {
                    file_name: fileName,
                }
            })

            if (existingFileIndex != null) {
                Logger.info(`Update file index counter`)

                await prisma.fileIndex.update({
                    where: {file_hash: existingFileIndex.file_hash},
                    data: {
                        pubkey_hash: [...existingFileIndex.pubkey_hash, filepubkeyhash]//`${session.address}_${genesisHash}`]
                    }
                });


            } else {
                const UPLOAD_DIR = getFileUploadDirectory();


                let aquaTreeName = await aquafier.getFileByHash(aquaTree, genesisHash);
                if (aquaTreeName.isOk()) {
                    fileName = aquaTreeName.data
                }
                const filename = `${randomUUID()}-${fileName}`;
                const filePath = path.join(UPLOAD_DIR, filename);

                // Save the file
                // await pump(data.file, fs.createWriteStream(filePath))
                await fs.promises.writeFile(filePath, fileData);


                await prisma.file.create({
                    data: {

                        file_hash: fileHash,
                        file_location: filePath,

                    }
                })

                await prisma.fileIndex.create({
                    data: {

                        pubkey_hash: [filepubkeyhash],
                        file_hash: fileHash,

                    }
                })


            }

            saveAquaTree(attestedData.aquaTree, walletAddress, null, false)


        }
    }
}

export async function createEthAccount() {
    try {
        // Generate a random mnemonic phrase (12 words)
        const wallet = ethers.Wallet.createRandom();
        const mnemonic = wallet.mnemonic?.phrase;

        // Extract wallet details
        const walletAddress = wallet.address;
        const publicKey = wallet.publicKey;
        const privateKey = wallet.privateKey;

        Logger.info("Created ephemeral Ethereum wallet")

        return {
            mnemonic,
            walletAddress,
            publicKey,
            privateKey
        };
    } catch (error: any) {
        Logger.error('Error creating Ethereum account:', error);
        throw new Error('Failed to create Ethereum account');
    }
}

export async function getServerWalletInformation(): Promise<ServerWalletInformation | null> {
    try {
        // Get mnemonic from environment variables
        const mnemonic = process.env.SERVER_MNEMONIC!;

        if (!mnemonic) {
            Logger.error('SERVER_MNEMONIC environment variable is not set');
            return null;
        }

        // Validate mnemonic format
        const words = mnemonic.trim().split(/\s+/);
        const validLengths = [12, 15, 18, 21, 24];

        if (!validLengths.includes(words.length)) {
            Logger.error(`Invalid mnemonic length: ${words.length} words. Must be 12, 15, 18, 21, or 24 words.`);
            return null;
        }

        // Validate mnemonic using ethers
        if (!ethers.Mnemonic.isValidMnemonic(mnemonic)) {
            Logger.error('Invalid mnemonic phrase - contains invalid words or checksum');
            return null;
        }

        // Create wallet from mnemonic
        const wallet = ethers.Wallet.fromPhrase(mnemonic);

        // Extract wallet details
        const walletAddress = wallet.address;
        const publicKey = wallet.publicKey;
        const privateKey = wallet.privateKey;

        return {
            mnemonic,
            walletAddress,
            privateKey,
            publicKey
        };
    } catch (error: any) {
        Logger.error('Error getting server wallet information', {err: error})
        return null;
    }
}


export function dummyCredential(): CredentialsData {
    return {
        mnemonic: '',
        nostr_sk: '',
        did_key: '',
        alchemy_key: '',
        witness_eth_network: 'sepolia',
        witness_method: 'metamask',
    }
}


export async function saveAquaFile(aquaTree: AquaTree, assetBuffer: Buffer, genesisHash: string,
                                   fileHash: string, fileName: string, filepubkeyhash: string) {
    const UPLOAD_DIR = getFileUploadDirectory();

    const aquafier = new Aquafier();
    let aquaTreeName = await aquafier.getFileByHash(aquaTree, genesisHash);
    if (aquaTreeName.isOk()) {
        fileName = aquaTreeName.data
    }
    const filename = `${randomUUID()}-${fileName}`;
    const filePath = path.join(UPLOAD_DIR, filename);

    // Save the file
    // await pump(data.file, fs.createWriteStream(filePath))
    await fs.promises.writeFile(filePath, assetBuffer);


    await prisma.file.create({
        data: {

            file_hash: fileHash,
            file_location: filePath,

        }
    })

    await prisma.fileIndex.create({
        data: {

            pubkey_hash: [filepubkeyhash],
            file_hash: fileHash,

        }
    })
}

export function ensureDomainViewForCors(domain?: string): string[] {
    const domains: string[] = []

    if (!domain) {
        return domains
    }
    if (domain.startsWith("http")) {
        domains.push(domain)
    } else {
        domains.push(`https://${domain}`)
        domains.push(`http://${domain}`)
    }

    return domains
}