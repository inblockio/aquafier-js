import {
    AquaTree,
    Revision as AquaTreeRevision,
} from 'aqua-js-sdk';
import { AquaJsonInZip, AquaNameWithHash } from '../models/request_models';
import { getGenesisHash } from './aqua_tree_utils';
import JSZip from 'jszip';
import { systemTemplateHashes } from '../models/constants';
import Logger from './logger';
import { isWorkFlowData, getAquatreeObject } from './revision_detection_utils';
import { saveAquaTree, processFileData } from './revision_save_utils';
import { deletLatestIfExistsForAquaTree } from './revision_delete_utils';

export async function streamToBuffer(stream: any): Promise<Buffer> {
    const chunks = [];
    for await (const chunk of stream) {
        chunks.push(chunk);
    }
    return Buffer.concat(chunks);
}

export async function processAquaMetadata(zipData: JSZip, userAddress: string) {
    let allFiles: string[] = Object.keys(zipData.files);
    // Helper function to decode filename if it's in ASCII format
    const decodeFileName = (fileName: string): string => {
        if (fileName.includes(',') && /^\d+,/.test(fileName)) {
            return fileName.split(',').map(code => String.fromCharCode(parseInt(code))).join('');
        }
        return fileName;
    };

    // Create a map of decoded filenames to original keys
    const fileMap: Map<string, string> = new Map();
    for (const originalKey in zipData.files) {
        const decodedKey = decodeFileName(originalKey);
        fileMap.set(decodedKey.trim(), originalKey.trim());
    }

    // throw new Error(`Manifets file not found ie aqua.json`);
    const aquaJsonOriginalKey = fileMap.get('aqua.json');
    if (!aquaJsonOriginalKey) {
        throw new Error(`Manifets file not found ie aqua.json`);
        // return
    };

    const aquaJsonFile = zipData.files[aquaJsonOriginalKey];
    const fileContent = await aquaJsonFile.async('text');
    const aquaData: AquaJsonInZip = JSON.parse(fileContent);

    for (const nameHash of aquaData.name_with_hash) {
        allFiles = allFiles.filter(item => item !== nameHash.name)
        await processAquaMetadataOperation(nameHash, fileMap, zipData, userAddress)
    }


    for (const remainingFile of allFiles) {
        const decodedFileName = decodeFileName(remainingFile);
        Logger.info(`Processing remaining file: ${decodedFileName}`);
        const nameHash: AquaNameWithHash = {
            name: decodedFileName,
            hash: '' // Hash is unknown for remaining files
        };
        await processAquaMetadataOperation(nameHash, fileMap, zipData, userAddress)
    }
}

export async function processAquaMetadataOperation(nameHash: AquaNameWithHash, fileMap: Map<string, string>, zipData: JSZip, userAddress: string) {
    let aquaFileName = "";
    if (nameHash.name.endsWith('.aqua.json')) {
        aquaFileName = nameHash.name;

        const aquaFileOriginalKey = fileMap.get(aquaFileName);

        if (!aquaFileOriginalKey) {
            throw new Error(`Expected to find ${aquaFileName} as defined in aqua.json but file not found`);
        }

        const aquaFile = zipData.files[aquaFileOriginalKey];
        const aquaFileDataText = await aquaFile.async('text');
        const aquaTreeData: AquaTree = getAquatreeObject(aquaFileDataText);
        // console.log(cliRedify(JSON.stringify(aquaTreeData, null, 4)))
        const genesisHash = getGenesisHash(aquaTreeData);
        if (!genesisHash) {
            throw new Error(`Genesis hash cannot be null`);
        }

        // const filePubKeyHash = `${userAddress}_${genesisHash}`;
        let nameNoAquaJsonExtsion = nameHash.name.replace('.aqua.json', '')
        const fileAssetOriginalKey = fileMap.get(nameNoAquaJsonExtsion);

        if (!fileAssetOriginalKey) {
            throw new Error(`Expected to find asset file ${nameNoAquaJsonExtsion} as defined in ${aquaFileName} but file not found`);
        }
        const fileAsset = zipData.files[fileAssetOriginalKey];

        const genRevision: AquaTreeRevision = aquaTreeData.revisions[genesisHash]
        const assetFileHash = genRevision.file_hash


        if (!assetFileHash) {
            throw new Error(`Asset hash not found in aqua tree check genesis of ${nameHash.name}  `);
        }
        if (!fileAsset) {
            throw new Error(`Asset not found ${nameNoAquaJsonExtsion}`);
        }


        // Logger.info(`processFileData assetFileHash ${assetFileHash}  nameNoAquaJsonExtsion ${nameNoAquaJsonExtsion} genesisHash ${genesisHash}`)

        await processFileData(
            assetFileHash, // nameHash.hash, should have been the asset hash not the file tree hash  nameHash.hashis the aqua tree hash
            userAddress,
            genesisHash,
            fileAsset,
            nameNoAquaJsonExtsion  //nameHash.name
        );

    } else {
        Logger.info(`skipping non aqua json file ${nameHash.name}`)
    }
}


// read zip file and create AquaTree from revisions
export async function processAquaFiles(
    zipData: JSZip,
    userAddress: string,
    templateId: string | null = null,

) {
    const aquaConfig = await getAquaConfiguration(zipData);
    // Logger.info(`config Aqua Tree: ${JSON.stringify(aquaConfig, null, 2)}`);
    const mainAquaTree = await getMainAquaTree(zipData, aquaConfig);
    // Logger.info(`Main Aqua Tree: ${JSON.stringify(mainAquaTree, null, 2)}`);



    let isWorkFlow: {
        isWorkFlow: boolean;
        workFlow: string;
    } = {
        isWorkFlow: false,
        workFlow: ''
    }

    if (mainAquaTree) {

        isWorkFlow = isWorkFlowData(mainAquaTree, systemTemplateHashes)
    }
    // Logger.info(`actualIsWorkFlow: ${JSON.stringify(isWorkFlow)}`);
    try {


        await processAllAquaFiles(zipData, userAddress, templateId, aquaConfig, mainAquaTree, isWorkFlow.isWorkFlow);
    } catch (error: any) {
        Logger.error('Error processing aqua files:', error);

        const aquaFiles = getAquaFiles(zipData);
        await processRegularFiles(aquaFiles, userAddress, templateId);
    }
}

async function getAquaConfiguration(zipData: JSZip): Promise<AquaJsonInZip | null> {
    const aquaJson = zipData.files['aqua.json'];
    if (!aquaJson) return null;

    const fileContent = await aquaJson.async('text');
    const aquaData: AquaJsonInZip = JSON.parse(fileContent);
    Logger.info(`Processing aqua files with genesis: ${aquaData.genesis}`);
    return aquaData;
}

async function getMainAquaTree(zipData: JSZip, aquaConfig: AquaJsonInZip | null): Promise<AquaTree | null> {
    if (!aquaConfig) return null;

    const mainAquaFile = zipData.files[`${aquaConfig.genesis}.aqua.json`];
    if (!mainAquaFile) return null;

    const aquaTreeContent = await mainAquaFile.async('text');

    if (!aquaTreeContent) return null;

    return JSON.parse(aquaTreeContent);
}

export async function processAllAquaFiles(
    zipData: JSZip,
    userAddress: string,
    templateId: string | null,
    aquaConfig: AquaJsonInZip | null,
    mainAquaTree: AquaTree | null,
    isWorkFlow: boolean
) {
    const aquaFiles = getAquaFiles(zipData);


    if (isWorkFlow && mainAquaTree && aquaConfig) {

        // Process workflow: save non-main files first, then main file
        await processWorkflowFiles(aquaFiles, aquaConfig.genesis, userAddress, templateId, true);
        await deletLatestIfExistsForAquaTree(mainAquaTree, userAddress)
        await saveAquaTree(mainAquaTree, userAddress, templateId, false);
    } else {


        // Process regular files
        await processRegularFiles(aquaFiles, userAddress, templateId, false);
    }
}

export async function processWorkflowFiles(
    aquaFiles: Array<{ fileName: string; file: JSZip.JSZipObject }>,
    genesisFileName: string,
    userAddress: string,
    templateId: string | null,
    isWorkFlow: boolean
) {
    const nonMainFiles = aquaFiles.filter(({ fileName }) => fileName !== genesisFileName);

    for (const { file } of nonMainFiles) {
        const aquaTree = await parseAquaFile(file);
        await deletLatestIfExistsForAquaTree(aquaTree, userAddress)
        let genhash = getGenesisHash(aquaTree);
        if (!genhash) {
            throw new Error(`Genesis hash cannot be null`);
        }

        // let isSystem = systemTemplateHashes.includes(genhash.trim())
        await saveAquaTree(aquaTree, userAddress, templateId, isWorkFlow);
    }
}

export async function processRegularFiles(
    aquaFiles: Array<{ fileName: string; file: JSZip.JSZipObject }>,
    userAddress: string,
    templateId: string | null,
    isWorkFlow: boolean = false
) {
    for (const { file } of aquaFiles) {
        const aquaTree = await parseAquaFile(file);
        let genhash = getGenesisHash(aquaTree);
        if (!genhash) {
            throw new Error(`Genesis hash cannot be null`);
        }

        // let isSystem = systemTemplateHashes.includes(genhash.trim())


        await deletLatestIfExistsForAquaTree(aquaTree, userAddress)
        await saveAquaTree(aquaTree, userAddress, templateId, isWorkFlow);
    }
}



export function getAquaFiles(zipData: JSZip): Array<{ fileName: string; file: JSZip.JSZipObject }> {
    return Object.entries(zipData.files)
        .filter(([fileName]) => fileName.endsWith(".aqua.json") && fileName !== 'aqua.json')
        .map(([fileName, file]) => ({ fileName, file }));
}

export async function parseAquaFile(file: JSZip.JSZipObject): Promise<AquaTree> {
    const fileContent = await file.async('text');
    return JSON.parse(fileContent);
}
