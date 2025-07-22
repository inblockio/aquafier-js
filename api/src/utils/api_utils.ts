import Aquafier, { AquaTree, Err, FileObject } from "aqua-js-sdk"
import { prisma } from "../database/db"
import { SYSTEM_WALLET_ADDRESS } from "../models/constants"
import { ethers } from "ethers"
import { fetchAquatreeFoUser, saveAquaTree } from "./revisions_utils"
import { getAquaAssetDirectory, getFileUploadDirectory } from "./file_utils"
import { randomUUID } from 'crypto';
import { AquaTemplatesFields } from "../models/types"
import * as fs from "fs"
import path from 'path';
import { getGenesisHash } from "./aqua_tree_utils"

const getHost = (): string => {
  return process.env.HOST || '127.0.0.1'
}


const getPort = (): number => {

  return Number(process.env.PORT) || 3000
}

const fetchEnsName = async (walletAddress: string, infuraKey: string): Promise<string> => {
  let ensName = "";
  try {
    // Create an Ethereum provider
    const provider = new ethers.JsonRpcProvider(
      `https://mainnet.infura.io/v3/${infuraKey}`
    );

    // Look up ENS name for the address
    ensName = await provider.lookupAddress(walletAddress) ?? "";


  } catch (error) {
    console.error('Error fetching ENS name:', error);

    // Continue with creation without ENS name
  }

  return ensName
}


export function getAquaTreeFileName(aquaTree: AquaTree): string {

  let mainAquaHash = "";
  // fetch the genesis 
  let revisionHashes = Object.keys(aquaTree!.revisions!)
  for (let revisionHash of revisionHashes) {
    let revisionData = aquaTree!.revisions![revisionHash];
    // if (revisionData.previous_verification_hash == null || revisionData.previous_verification_hash == "") {
    //   mainAquaHash = revisionHash;
    //   break;
    // }
    if (!revisionData.previous_verification_hash) {
      let fileHash = revisionData.file_hash
      if (fileHash) {
        let fileName
      }
    }
  }


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

  let genesisHashData = getGenesisHash(aquaTree);
  if (!genesisHashData) {
    throw Error(`Genesis hash not found in aqua tree ${JSON.stringify(aquaTree)}`)
  }
  let genesisHash: string = genesisHashData!!;


  let aquafier = new Aquafier();
  let fileHash = aquafier.getFileHash(fileData);

  // console.log(`\n ## fileHash ${fileHash} for data ${fileData}`)

  let filepubkeyhash = `${walletAddress}_${genesisHash}`

  // console.log(`\n ## filepubkeyhash ${filepubkeyhash}`)
  const UPLOAD_DIR = getFileUploadDirectory();

  // Create unique filename
  let fileName = "";
  let aquaTreeName = await aquafier.getFileByHash(aquaTree, genesisHash);
  if (aquaTreeName.isOk()) {
    fileName = aquaTreeName.data
  }


  let newUUid = systemUUid.get(fileName) || randomUUID();
  // console.log(`\n ## newUUid ${newUUid} for fileName ${fileName}`)
  
  const filename = `${newUUid}-${fileName}`;
  const filePath = path.join(UPLOAD_DIR, filename);

  // Save the file
  // await pump(data.file, fs.createWriteStream(filePath))
  await fs.promises.writeFile(filePath, fileData);
   await prisma.file.upsert({
    where: {
      file_hash: fileHash,
    },
    create: {

      file_hash: fileHash,
      file_location: filePath,

    },
    update: {}
  })
  // console.log('File record created:', fileCreation);

  // console.log('About to create fileIndex record');

  await prisma.fileIndex.upsert({
    where: {
      file_hash: fileHash,
    },
    create: {

      pubkey_hash: [filepubkeyhash],
      file_hash: fileHash,

    },
    update: {}
  })

  // console.log('FileIndex record created');

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

}


// Method 2: Using fs.promises.access (asynchronous)
export async function checkFolderExists(folderPath: string) {
  try {
    await fs.promises.access(folderPath, fs.constants.F_OK);
    const stats = await fs.promises.lstat(folderPath);
    return stats.isDirectory();
  } catch (error) {
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
  console.log(`Assets path ${assetsPath}`)

  let assetPathExist = await checkFolderExists(assetsPath)
  const assetFiles = [];
  if (assetPathExist) {

    const files = await fs.promises.readdir(assetsPath);

    // Filter only files (exclude directories)
    for (const file of files) {
      const filePath = path.join(assetsPath, file);
      const stats = await fs.promises.lstat(filePath);
      if (stats.isFile()) {
        console.log(`file ${file}`)
        assetFiles.push(filePath);
      }
    }
  } else {
    console.warn(`Assets path ${assetsPath} does not exist`)
  }


  let templates = [
    "access_agreement",
    "aqua_sign",
    "cheque",
    "identity_attestation",
    "identity_claim",
    "user_signature"
  ]
  for (let index = 0; index < templates.length; index++) {
    const templateItem = templates[index];
    let templateData = path.join(assetsPath, `${templateItem}.json`);
    let templateFieldsData = path.join(assetsPath, `${templateItem}_fields.json`);
    let templateAquaTreeData = path.join(assetsPath, `${templateItem}.json.aqua.json`);


    // template
    await prisma.aquaTemplate.upsert({
      where: {
        id: `${index}`,
      },
      create: {
        id: `${index}`,
        name: templateItem,
        owner: SYSTEM_WALLET_ADDRESS,
        public: true,
        title: convertNameToLabel(templateItem),
        created_at: today.toDateString()
      },
      update: {

      },
    })


    // template fields
    let fieldsFileData = fs.readFileSync(templateFieldsData, 'utf8')
    let documentContractFields: Array<AquaTemplatesFields> = JSON.parse(fieldsFileData)
    documentContractFields.forEach(async (fieldData, fieldIndex) => {

      // console.log(`\n ##  templateItem ${templateItem} -- fieldData.isEditable ${fieldData.isEditable} --  fieldData ${JSON.stringify(fieldData)}`)
      await prisma.aquaTemplateFields.upsert({
        where: {
          id: `${index}${fieldIndex}`,
        },
        create: {
          id: `${index}${fieldIndex}`,
          aqua_form_id: `${index}`,
          name: fieldData.name,
          label: fieldData.label,
          type: fieldData.type,
          required: fieldData.required,
          is_array: fieldData.isArray,
          is_hidden: fieldData.isHidden || false,
          description: fieldData.description ,
          placeholder: fieldData.placeholder ,
          support_text: fieldData.supportText,

          is_editable: fieldData.isEditable == null ? true : fieldData.isEditable,
        },
        update: {

        },
      })
    })



    //save aqua tree
    let templateAquaTreeDataContent = fs.readFileSync(templateAquaTreeData, 'utf-8')
    let templateAquaTree: AquaTree = JSON.parse(templateAquaTreeDataContent)


    let templateDataContent = fs.readFileSync(templateData, 'utf-8')
    await saveTemplateFileData(templateAquaTree, templateDataContent, SYSTEM_WALLET_ADDRESS)
    await saveAquaTree(templateAquaTree, SYSTEM_WALLET_ADDRESS);


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




export { getHost, getPort, fetchEnsName, setUpSystemTemplates }