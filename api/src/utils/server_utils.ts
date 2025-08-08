import Aquafier, { AquaTree, CredentialsData, getEntropy } from "aqua-js-sdk";
import { Mnemonic, Wallet, } from "ethers";
import { ServerWalletInformation } from "../models/types";

import { ethers } from 'ethers';
import { getFileUploadDirectory } from "./file_utils";
import fs from 'fs';
import path from 'path';
import { prisma } from "../database/db";
import { randomUUID } from "crypto";

export async function createEthAccount() {
    try {
        // Generate a random mnemonic phrase (12 words)
        const wallet = ethers.Wallet.createRandom();
        const mnemonic = wallet.mnemonic?.phrase;

        // Extract wallet details
        const walletAddress = wallet.address;
        const publicKey = wallet.publicKey;
        const privateKey = wallet.privateKey;

        console.log("Mnemonic", mnemonic)
        console.log("Wallet Address", walletAddress)
        console.log("Public Key", publicKey)
        console.log("Private Key", privateKey)

        return {
            mnemonic,
            walletAddress,
            publicKey,
            privateKey
        };
    } catch (error) {
        console.error('Error creating Ethereum account:', error);
        throw new Error('Failed to create Ethereum account');
    }
}

export async function getServerWalletInformation(): Promise<ServerWalletInformation | null> {
    try {
        // Get mnemonic from environment variables
        const mnemonic = process.env.SERVER_MNEMONIC!;
        console.log("Mnemonic", mnemonic)

        if (!mnemonic) {
            console.error('SERVER_MNEMONIC environment variable is not set');
            return null;
        }

        // Validate mnemonic format
        const words = mnemonic.trim().split(/\s+/);
        const validLengths = [12, 15, 18, 21, 24];

        if (!validLengths.includes(words.length)) {
            console.error(`Invalid mnemonic length: ${words.length} words. Must be 12, 15, 18, 21, or 24 words.`);
            return null;
        }

        // Validate mnemonic using ethers
        if (!ethers.Mnemonic.isValidMnemonic(mnemonic)) {
            console.error('Invalid mnemonic phrase - contains invalid words or checksum');
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
        console.error('Error getting server wallet information:', error);
        console.error('Error details:', error.message);
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