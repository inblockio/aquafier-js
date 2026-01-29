import Aquafier, { AquaTree, cliGreenify, cliRedify, cliYellowfy } from "aqua-js-sdk"
import { prisma } from "../database/db"
import { SYSTEM_WALLET_ADDRESS, TEMPLATE_HASHES } from "../models/constants"
import { ethers, N } from "ethers"
import { createPublicClient, http, labelhash } from "viem"
import { mainnet } from "viem/chains"
import { saveAquaTree } from "./revisions_utils"
import { getAquaAssetDirectory, getFileUploadDirectory } from "./file_utils"
import { randomUUID } from 'crypto';
import { AquaTemplatesFields } from "../models/types"
import * as fs from "fs"
import path from 'path';
import { getGenesisHash } from "./aqua_tree_utils"
import Logger from "./logger";

const getHost = (): string => {
    return process.env.HOST || '0.0.0.0'
}


const getPort = (): number => {

    return Number(process.env.PORT) || 3000
}

const fetchEnsName = async (walletAddress: string, alchemyProjectKey: string): Promise<string> => {
    let ensName = "";

    // Normalize address
    let normalizedAddress = walletAddress.trim();
    if (!normalizedAddress.startsWith("0x")) {
        Logger.error(`Invalid address provided to fetchEnsName: ${walletAddress}`);
        return "";
    }

    try {
        // Attempt 1: Alchemy via Viem
        const sources = [];
        if (alchemyProjectKey) {
            sources.push({ url: `https://eth-mainnet.g.alchemy.com/v2/${alchemyProjectKey}`, name: "Alchemy" });
        }
        sources.push({ url: "https://ethereum-rpc.publicnode.com", name: "Public Node" });

        for (const source of sources) {
            try {
                console.log(`Attempting ENS lookup via ${source.name}...`);
                const client = createPublicClient({
                    chain: mainnet,
                    transport: http(source.url)
                });

                const res = await client.getEnsName({ address: normalizedAddress as `0x${string}` });
                if (res) {
                    ensName = res;
                    console.log(cliGreenify(`Successfully resolved ENS Name via ${source.name}: ${ensName}`));
                    break;
                }
            } catch (error) {
                Logger.warn(`ENS lookup failed via ${source.name}:`, error);
            }
        }

        if (!ensName) {
            console.log(cliYellowfy(`No primary ENS name found for ${normalizedAddress}`));
        }

    } catch (error: any) {
        console.log(cliRedify(`Error in fetchEnsName: ${error}`));
        Logger.error('Error fetching ENS name:', error);
    }

    return ensName
}

const fetchEnsExpiry = async (domainName: string, alchemyProjectKey: string): Promise<Date | null> => {
    // Only works for .eth names on mainnet
    if (!domainName.endsWith(".eth")) {
        return null;
    }

    const label = domainName.split(".")[0];
    const tokenId = BigInt(labelhash(label));

    // Correct registrar address: 0x57f18818A2B92251d52207707a215774a228318b
    const baseRegistrarAddress = "0x57f1887a8bf19b14fc0df6fd9b2acc9af147ea85";
    const abi = [{
        name: 'nameExpires',
        type: 'function',
        stateMutability: 'view',
        inputs: [{ name: 'id', type: 'uint256' }],
        outputs: [{ name: '', type: 'uint256' }],
    }] as const;

    const sources = [];
    if (alchemyProjectKey) {
        sources.push({ url: `https://eth-mainnet.g.alchemy.com/v2/${alchemyProjectKey}`, name: "Alchemy" });
    }
    sources.push({ url: "https://ethereum-rpc.publicnode.com", name: "Public Node" });

    for (const source of sources) {
        try {
            const client = createPublicClient({
                chain: mainnet,
                transport: http(source.url)
            });

            const expiry = await client.readContract({
                address: baseRegistrarAddress,
                abi,
                functionName: 'nameExpires',
                args: [tokenId],
            });

            if (expiry && expiry > 0n) {
                return new Date(Number(expiry) * 1000);
            }
        } catch (error) {
            Logger.warn(`ENS expiry lookup failed via ${source.name}:`, error);
        }
    }

    return null;
}


export function getAquaTreeFileName(aquaTree: AquaTree): string {

    let mainAquaHash = "";
    // fetch the genesis
    // let revisionHashes = Object.keys(aquaTree!.revisions!)
    // for (let revisionHash of revisionHashes) {
    //     let revisionData = aquaTree!.revisions![revisionHash];
    //     if (revisionData.previous_verification_hash == null || revisionData.previous_verification_hash == "") {
    //       mainAquaHash = revisionHash;
    //       break;
    //     }
    //     // if (!revisionData.previous_verification_hash) {
    //     //     let fileHash = revisionData.file_hash
    //     //     if (fileHash) {
    //     //         let fileName
    //     //     }
    //     // }
    // }

    let genesisHash = getGenesisHash(aquaTree);
    if (!genesisHash) {
        throw Error(`Genesis hash not found in aqua tree ${JSON.stringify(aquaTree)}`)
    }
    mainAquaHash = genesisHash!!;


    return aquaTree!.file_index[mainAquaHash] ?? "";

}


export const saveTemplateFileData = async (aquaTree: AquaTree, fileData: string, walletAddress: string = SYSTEM_WALLET_ADDRESS) => {


    let systemUUid = new Map()


    systemUUid.set("access_agreement.json", "a1b2c3d4-e5f6-4a7b-8c9d-0e1f2a3b4c5d");
    systemUUid.set("aqua_sign.json", "f47ac10b-58cc-4372-a567-0e02b2c3d4e5");
    systemUUid.set("cheque.json", "6ba7b810-9dad-11d1-80b4-00c04fd430c8");
    systemUUid.set("identity_attestation.json", "550e8400-e29b-41d4-a716-446655440000");
    systemUUid.set("identity_claim.json", "c9bf9e57-1685-4c89-badb-56781234abcd");
    systemUUid.set("user_signature.json", "d5a3e2f1-9c13-47a8-86ef-789012345678");
    systemUUid.set("domain_claim.json", "4a081551-5cfb-4e7f-9238-ed072c0e9ff5");

    let genesisHashData = getGenesisHash(aquaTree);
    if (!genesisHashData) {
        throw Error(`Genesis hash not found in aqua tree ${JSON.stringify(aquaTree)}`)
    }
    let genesisHash: string = genesisHashData!!;


    let aquafier = new Aquafier();
    let fileHash = aquafier.getFileHash(fileData);

    let filepubkeyhash = `${walletAddress}_${genesisHash}`

    const UPLOAD_DIR = getFileUploadDirectory();

    // Create unique filename
    let fileName = "";
    let aquaTreeName = await aquafier.getFileByHash(aquaTree, genesisHash);
    if (aquaTreeName.isOk()) {
        fileName = path.basename(aquaTreeName.data)
    }

    let newUUid = systemUUid.get(fileName) || randomUUID();

    const filename = `${newUUid}-${fileName}`;
    const filePath = path.join(UPLOAD_DIR, filename);

    // Save the file
    // await pump(data.file, fs.createWriteStream(filePath))
    try {
        await fs.promises.writeFile(filePath, fileData);
    } catch (error) {
        console.log("File save Error: ", error)
    }
    try {
        await prisma.file.upsert({
            where: {
                file_hash: fileHash,
            },
            create: {
                file_hash: fileHash,
                file_location: filePath,

            },
            update: {
                file_hash: fileHash,
                file_location: filePath,
            }
        })
    } catch (error) {
        console.log("File db save update error: ", error)
    }

    try {

        await prisma.fileIndex.upsert({
            where: {
                file_hash: fileHash,
            },
            create: {
                pubkey_hash: [filepubkeyhash],
                file_hash: fileHash,

            },
            update: {
                pubkey_hash: [filepubkeyhash],
                file_hash: fileHash,
            }
        })


    } catch (error) {
        console.log("File index error: ", error)
    }

    try {
        await prisma.fileName.upsert({
            where: {
                pubkey_hash: filepubkeyhash,
            },
            create: {
                pubkey_hash: filepubkeyhash,
                file_name: fileName,

            },
            update: {
                pubkey_hash: filepubkeyhash,
                file_name: fileName,
            }
        })
    } catch (error) {
        console.log("Filename save error: ", error)
    }

}


// Method 2: Using fs.promises.access (asynchronous)
export async function checkFolderExists(folderPath: string) {
    try {
        await fs.promises.access(folderPath, fs.constants.F_OK);
        const stats = await fs.promises.lstat(folderPath);
        return stats.isDirectory();
    } catch (error: any) {
        return false;
    }
}

const setUpSystemTemplates = async () => {

    await prisma.users.upsert({
        where: {
            address: SYSTEM_WALLET_ADDRESS
        },
        create: {
            address: SYSTEM_WALLET_ADDRESS
        },
        update: {
            address: SYSTEM_WALLET_ADDRESS
        }
    });


    let today = new Date();


    let assetsPath = getAquaAssetDirectory()

    let assetPathExist = await checkFolderExists(assetsPath)
    const assetFiles = [];
    if (assetPathExist) {

        const files = await fs.promises.readdir(assetsPath);

        // Filter only files (exclude directories)
        for (const file of files) {
            const filePath = path.join(assetsPath, file);
            const stats = await fs.promises.lstat(filePath);
            if (stats.isFile()) {
                Logger.info(`file ${file}`)
                assetFiles.push(filePath);
            }
        }
    } else {
        Logger.warn(`Assets path ${assetsPath} does not exist`)
    }


    // let templates = [
    //     "access_agreement",
    //     "aqua_sign",
    //     "dba_claim",
    //     "cheque",
    //     "identity_attestation",
    //     "identity_claim",
    //     "user_signature",
    //     "domain_claim",
    //     "email_claim",
    //     "phone_number_claim",
    //     "user_profile",
    //     "identity_card",
    //     "ens_claim",
    //     "aqua_certificate",
    // ]

    let templates = Object.keys(TEMPLATE_HASHES)
    for (let index = 0; index < templates.length; index++) {
        const templateItem = templates[index];
        let templateData = path.join(assetsPath, `${templateItem}.json`);
        let templateFieldsData = path.join(assetsPath, `${templateItem}_fields.json`);
        let templateAquaTreeData = path.join(assetsPath, `${templateItem}.json.aqua.json`);

        let subtitles: Map<string, string> = new Map();
        subtitles.set("access_agreement", "Create a new access agreement workflow");
        subtitles.set("aqua_sign", "Create new PDF signing workflow");
        subtitles.set("identity_card", "Create an Identity Card based on a subset of identity");

        // template - use template name as ID for stability
        await prisma.aquaTemplate.upsert({
            where: {
                id: templateItem,
            },
            create: {
                id: templateItem,
                name: templateItem,
                owner: SYSTEM_WALLET_ADDRESS,
                public: true,
                title: convertNameToLabel(templateItem),
                subtitle: subtitles.get(templateItem) || "",
                created_at: today.toDateString()
            },
            update: {
                name: templateItem,
                owner: SYSTEM_WALLET_ADDRESS,
                public: true,
                title: convertNameToLabel(templateItem),
                subtitle: subtitles.get(templateItem) || "",
            },
        })


        // template fields - use for...of to properly await async operations
        let fieldsFileData = fs.readFileSync(templateFieldsData, 'utf8')
        let documentContractFields: Array<AquaTemplatesFields> = JSON.parse(fieldsFileData)

        for (let fieldIndex = 0; fieldIndex < documentContractFields.length; fieldIndex++) {
            const fieldData = documentContractFields[fieldIndex];

            await prisma.aquaTemplateFields.upsert({
                where: {
                    id: `${templateItem}_${fieldIndex}`,
                },
                create: {
                    id: `${templateItem}_${fieldIndex}`,
                    aqua_form_id: templateItem,
                    name: fieldData.name,
                    label: fieldData.label,
                    type: fieldData.type,
                    required: fieldData.required,
                    is_array: fieldData.isArray,
                    is_hidden: fieldData.isHidden || false,
                    description: fieldData.description,
                    placeholder: fieldData.placeholder,
                    support_text: fieldData.supportText,
                    default_value: fieldData.defaultValue,
                    is_verifiable: fieldData.isVerifiable || false,
                    depend_on_field: fieldData.dependsOn?.field,
                    depend_on_value: fieldData.dependsOn?.value,

                    is_editable: fieldData.isEditable == null ? true : fieldData.isEditable,

                },
                update: {
                    aqua_form_id: templateItem,
                    name: fieldData.name,
                    label: fieldData.label,
                    type: fieldData.type,
                    required: fieldData.required,
                    is_array: fieldData.isArray,
                    is_hidden: fieldData.isHidden || false,
                    description: fieldData.description,
                    placeholder: fieldData.placeholder,
                    support_text: fieldData.supportText,
                    default_value: fieldData.defaultValue,
                    is_verifiable: fieldData.isVerifiable || false,
                    depend_on_field: fieldData.dependsOn?.field,
                    depend_on_value: fieldData.dependsOn?.value,

                    is_editable: fieldData.isEditable == null ? true : fieldData.isEditable,
                },
            })

            if (fieldData.type.trim() == 'options' && fieldData.options) {
                for (let optionIndex = 0; optionIndex < fieldData.options.length; optionIndex++) {
                    let optionValue = fieldData.options[optionIndex];
                    await prisma.aquaTemplateFieldOptions.upsert({
                        where: {
                            id: `${templateItem}_${fieldIndex}_${optionIndex}`,
                        },
                        create: {
                            id: `${templateItem}_${fieldIndex}_${optionIndex}`,
                            label: optionValue.label,
                            value: optionValue.value,
                            field_id: `${templateItem}_${fieldIndex}`,
                        },
                        update: {
                            label: optionValue.label,
                            value: optionValue.value,
                            field_id: `${templateItem}_${fieldIndex}`,
                        },
                    })
                }
            }
        }


        //save aqua tree
        let templateAquaTreeDataContent = fs.readFileSync(templateAquaTreeData, 'utf-8')
        let templateAquaTree: AquaTree = JSON.parse(templateAquaTreeDataContent)

        let templateDataContent = fs.readFileSync(templateData, 'utf-8')
        try {
            await saveTemplateFileData(templateAquaTree, templateDataContent, SYSTEM_WALLET_ADDRESS)
        } catch (error) {
            console.log("Save template global error: ", error)
        }
        try {
            await saveAquaTree(templateAquaTree, SYSTEM_WALLET_ADDRESS);
        } catch (error) {
            console.log("Save Aquatree template error: ", error)
        }
    }
}

const convertNameToLabel = (name: string) => {

    if (!name) return '';

    // Split the string by underscore
    return name
        .split('_')
        // Capitalize the first letter of each word
        .map(word => word.charAt(0).toUpperCase() + word.slice(1))
        // Join with spaces
        .join(' ');
}


async function setupPaymentPlans() {
    console.log('Starting database seed...');

    // Create subscription plans
    const freePlan = await prisma.subscriptionPlan.upsert({
        where: { name: 'free' },
        update: {},
        create: {
            id: "dd60e70d-2f85-4512-8d29-87e4c69ac8df",
            name: 'free',
            display_name: 'Free Plan',
            description: 'Perfect for getting started with basic features',
            price_monthly_usd: 0,
            price_yearly_usd: 0,
            crypto_monthly_price_usd: 0,
            crypto_yearly_price_usd: 0,
            max_storage_gb: 1,
            max_files: 50,
            max_contracts: 10,
            max_templates: 3,
            features: {
                cloud_storage: true,
                file_versioning: false,
                advanced_templates: false,
                priority_support: false,
                custom_branding: false,
                api_access: false,
                team_collaboration: false,
                analytics_dashboard: false,
            },
            sort_order: 1,
            is_active: true,
            is_public: true,
        },
    });

    const proPlan = await prisma.subscriptionPlan.upsert({
        where: { name: 'pro' },
        update: {},
        create: {
            id: "6a262c61-7506-4b63-baa2-eabe65c6384c",
            name: 'pro',
            display_name: 'Professional Plan',
            description: 'Advanced features for professionals and small teams',
            price_monthly_usd: 29.99,
            price_yearly_usd: 299.99, // ~16% discount
            crypto_monthly_price_usd: 29.99,
            crypto_yearly_price_usd: 299.99,
            stripe_monthly_price_id: process.env.STRIPE_PRO_MONTHLY_PRICE_ID || null,
            stripe_yearly_price_id: process.env.STRIPE_PRO_YEARLY_PRICE_ID || null,
            max_storage_gb: 50,
            max_files: 1000,
            max_contracts: 100,
            max_templates: 25,
            features: {
                cloud_storage: true,
                file_versioning: true,
                advanced_templates: true,
                priority_support: true,
                custom_branding: false,
                api_access: true,
                team_collaboration: false,
                analytics_dashboard: true,
            },
            sort_order: 2,
            is_active: true,
            is_public: true,
        },
    });

    const enterprisePlan = await prisma.subscriptionPlan.upsert({
        where: { name: 'enterprise' },
        update: {},
        create: {
            id: "67a8539d-f95b-4058-98a8-17400d2a0db6",
            name: 'enterprise',
            display_name: 'Enterprise Plan',
            description: 'Full-featured solution for large teams and organizations',
            price_monthly_usd: 99.99,
            price_yearly_usd: 999.99, // ~17% discount
            crypto_monthly_price_usd: 99.99,
            crypto_yearly_price_usd: 999.99,
            stripe_monthly_price_id: process.env.STRIPE_ENTERPRISE_MONTHLY_PRICE_ID || null,
            stripe_yearly_price_id: process.env.STRIPE_ENTERPRISE_YEARLY_PRICE_ID || null,
            max_storage_gb: 500,
            max_files: 10000,
            max_contracts: 1000,
            max_templates: 100,
            features: {
                cloud_storage: true,
                file_versioning: true,
                advanced_templates: true,
                priority_support: true,
                custom_branding: true,
                api_access: true,
                team_collaboration: true,
                analytics_dashboard: true,
            },
            sort_order: 3,
            is_active: true,
            is_public: true,
        },
    });

    console.log('Subscription plans created:', {
        free: freePlan.id,
        pro: proPlan.id,
        enterprise: enterprisePlan.id,
    });

    // Save the free plan ID to .env file (for reference)
    console.log('\n⚠️  IMPORTANT: Add the following to your .env file:');
    console.log(`DEFAULT_FREE_PLAN_ID=${freePlan.id}`);
    console.log('\n✅ Database seeding completed successfully!');
}

export { getHost, getPort, fetchEnsName, fetchEnsExpiry, setUpSystemTemplates, setupPaymentPlans }