import Aquafier, { AquaTree, FileObject } from "aqua-js-sdk"
import { prisma } from "../database/db"
import { SYSTEM_WALLET_ADDRESS } from "../models/constants"
import { ethers } from "ethers"
import { fetchAquatreeFoUser, saveAquaTree } from "./revisions_utils"
import { getFileUploadDirectory } from "./file_utils"
import { randomUUID } from 'crypto';
import * as fs from "fs"
import path from 'path';

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
    const provider = new ethers.providers.JsonRpcProvider(
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
    if (revisionData.previous_verification_hash == null || revisionData.previous_verification_hash == "") {
      mainAquaHash = revisionHash;
      break;
    }
  }


  return aquaTree!.file_index[mainAquaHash] ?? "";

}

export function getGenesisHash(aquaTree: AquaTree): string | null {
  let aquaTreeGenesisHash: string | null = null;
  let allAquuaTreeHashes = Object.keys(aquaTree!.revisions);

  for (let hash of allAquuaTreeHashes) {
    let revisionItem = aquaTree!.revisions[hash];
    if (revisionItem.previous_verification_hash == "" || revisionItem.previous_verification_hash == null || revisionItem.previous_verification_hash == undefined) {

      aquaTreeGenesisHash = hash //revisionItem.previous_verification_hash
      break;

    }
  }

  return aquaTreeGenesisHash
}


export const saveTemplateFileData = async (aquaTree: AquaTree, fileData: string) => {

  let genesisHashData = getGenesisHash(aquaTree);
  if (!genesisHashData) {
    throw Error(`Genesis hash not found in aqua tree ${JSON.stringify(aquaTree)}`)
  }
  let genesisHash: string = genesisHashData!!;


  let aquafier = new Aquafier();
  let fileHash = aquafier.getFileHash(fileData);

  console.log(`\n ## fileHash ${fileHash} for data ${fileData}`)

  let filepubkeyhash = `${SYSTEM_WALLET_ADDRESS}_${genesisHash}`

  console.log(`\n ## filepubkeyhash ${filepubkeyhash}`)
  const UPLOAD_DIR = getFileUploadDirectory();

  // Create unique filename
  let fileName = "";
  let aquaTreeName = await aquafier.getFileByHash(aquaTree, genesisHash);
  if (aquaTreeName.isOk()) {
    fileName = aquaTreeName.data
  }
  const filename = `${randomUUID()}-${fileName}`;
  const filePath = path.join(UPLOAD_DIR, filename);

  // Save the file
  // await pump(data.file, fs.createWriteStream(filePath))
  await fs.promises.writeFile(filePath, fileData);
  let fileCreation = await prisma.file.create({
    data: {
      hash: filepubkeyhash,
      file_hash: fileHash,
      content: filePath,
      reference_count: 0, // we use 0 because  saveAquaTree increases file  by 1
    }
  })
  console.log('File record created:', fileCreation);

  console.log('About to create fileIndex record');

  await prisma.fileIndex.create({
    data: {
      id: fileCreation.hash,
      hash: [filepubkeyhash],
      file_hash: fileHash,
      uri: fileName,
      reference_count: 0 // we use 0 because  saveAquaTree increases file  undex  by 1
    }
  })

  console.log('FileIndex record created');

}

const setUpSystemTemplates = async () => {
  //create user system 
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


  // end of create user system

  let today = new Date();
  let aquafier = new Aquafier()

  let systemAquaTreesNames: Array<string> = []
  let latest = await prisma.latest.findMany({
    where: {
      user: SYSTEM_WALLET_ADDRESS
    }
  });
  // Get the host from the request headers
  const host = `${getHost()}:${getPort()}`;

  // Get the protocol (http or https)
  const protocol = 'https'

  // Construct the full URL
  const url = `${protocol}://${host}`;

  if (latest.length != 0) {
    let systemAquaTrees = await fetchAquatreeFoUser(url, latest);
    for (let item of systemAquaTrees) {
      let aquaName = getAquaTreeFileName(item.aquaTree);
      systemAquaTreesNames.push(aquaName)
    }
  }


  //start of identity_claim  
  await prisma.aquaTemplate.upsert({
    where: {
      id: "1",
    },
    create: {
      id: "1",
      name: "identity_claim",
      owner: SYSTEM_WALLET_ADDRESS,
      public: true,
      title: "Identity Claim",
      created_at: today.toDateString()
    },
    update: {

    },
  })

  // "type": "identity_claim",
  // "date_of_birth": "1995-10-15",
  let identityObject = {
    "name": "John",
    "surname": "Doe",
    "email": "john.doe@example.com",
    "wallet_address": "0x568a94a8f0f3dc0b245b853bef572075c1df5c50"
  }

  Object.keys(identityObject).forEach(async (keyName, index) => {
    await prisma.aquaTemplateFields.upsert({
      where: {
        id: `1${index}`,
      },
      create: {
        id: `1${index}`,
        aqua_form_id: "1",
        name: keyName,
        label: convertNameToLabel(keyName),
        type: "string",
        required: true
      },
      update: {

      },
    })
  })

  let ideintiAquNameExist = systemAquaTreesNames.find((item) => item == "identity_claim.json")
  if (ideintiAquNameExist == undefined) {
    // create aqua tree for identity template
    let identityFileObject: FileObject = {
      fileContent: JSON.stringify(identityObject),
      fileName: "identity_claim.json",
      path: "./"
    }

    let resIdentityAquaTree = await aquafier.createGenesisRevision(identityFileObject, true, false, false )

    if (resIdentityAquaTree.isOk()) {

      // save the aqua tree 
      await saveAquaTree(resIdentityAquaTree.data.aquaTree!!, SYSTEM_WALLET_ADDRESS)
      //safe json file 
      await saveTemplateFileData(resIdentityAquaTree.data.aquaTree!!, JSON.stringify(identityObject))
    }


  }
  //end of identity_claim

  //start of identity_attestation
  await prisma.aquaTemplate.upsert({
    where: {
      id: "2",
    },
    create: {
      id: "2",
      name: "identity_attestation",
      owner: SYSTEM_WALLET_ADDRESS,
      public: true,
      title: "Identity attestation",
      created_at: today.toDateString()
    },
    update: {

    },
  })

  let identityAttestations = {
    // "type": "identity_attestation",
    "identity_claim_id": "0x5721891d757ee81ab3cd00442293f3808a99e676d2d1bda03cda26bae23daed1",
    "name": "John",
    "surname": "Doe",
    "email": "john.doe@example.com",
    // "date_of_birth": "1995-10-15",
    "context": "I verified the attributes against a government issued ID. I hereby attest that the above information is true and correct to the best of my knowledge.",
    "wallet_address": "0x6b2f22390c318107e95c58c90a66afaf7ef06853"
  }


  Object.keys(identityAttestations).forEach(async (keyName, index) => {
    await prisma.aquaTemplateFields.upsert({
      where: {
        id: `2${index}`,
      },
      create: {
        id: `2${index}`,
        aqua_form_id: "2",
        name: keyName,
        label: convertNameToLabel(keyName),
        type: "string",
        required: true
      },
      update: {

      },
    })
  })


  let attestationAquNameExist = systemAquaTreesNames.find((item) => item == "identity_attestation.json")
  if (attestationAquNameExist == undefined) {
    // create aqua tree for identity template
    let attestationFileObject: FileObject = {
      fileContent: JSON.stringify(identityAttestations),
      fileName: "identity_attestation.json",
      path: "./"
    }

    let resAttestationAquaTree = await aquafier.createGenesisRevision(attestationFileObject,true, false, false )

    if (resAttestationAquaTree.isOk()) {

      // save the aqua tree 
      await saveAquaTree(resAttestationAquaTree.data.aquaTree!!, SYSTEM_WALLET_ADDRESS);

      await saveTemplateFileData(resAttestationAquaTree.data.aquaTree!!, JSON.stringify(identityAttestations))
    }

  }

  //end of identity_attestation





  //start  of  cheque
  await prisma.aquaTemplate.upsert({
    where: {
      id: "3",
    },
    create: {
      id: "3",
      name: "cheque",
      owner: SYSTEM_WALLET_ADDRESS,
      public: true,
      title: "Cheque template",
      created_at: today.toDateString()
    },
    update: {

    },
  })

  let cheque = {
    "sender": "0x...",
    "receiver": "0x...",
    "amount": "John",
    "currency": "Doe",
    "note": "john.doe@example.com",

  }


  Object.keys(cheque).forEach(async (keyName, index) => {
    await prisma.aquaTemplateFields.upsert({
      where: {
        id: `3${index}`,
      },
      create: {
        id: `3${index}`,
        aqua_form_id: "3",
        name: keyName,
        label: convertNameToLabel(keyName),
        type: "string",
        required: keyName == 'note' ? false : true
      },
      update: {

      },
    })
  })

  let chequeAquNameExist = systemAquaTreesNames.find((item) => item == "cheque.json")
  if (chequeAquNameExist == undefined) {
    // create aqua tree for identity template
    let chequeFileObject: FileObject = {
      fileContent: JSON.stringify(cheque),
      fileName: "cheque.json",
      path: "./"
    }

    let reschequeAquaTree = await aquafier.createGenesisRevision(chequeFileObject, true, false, false )

    if (reschequeAquaTree.isOk()) {

      // console.log(`@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@`)
      // console.log(`cheque aqua tree ${JSON.stringify(reschequeAquaTree.data.aquaTree, null, 4)}`)

      // save the aqua tree 
      await saveAquaTree(reschequeAquaTree.data.aquaTree!!, SYSTEM_WALLET_ADDRESS);

      await saveTemplateFileData(reschequeAquaTree.data.aquaTree!!, JSON.stringify(cheque))
    }

  }
  //end of cheque


  //start  of  access contract
  await prisma.aquaTemplate.upsert({
    where: {
      id: "4",
    },
    create: {
      id: "4",
      name: "access_contract",
      owner: SYSTEM_WALLET_ADDRESS,
      public: true,
      title: "Access Contract",
      created_at: today.toDateString()
    },
    update: {

    },
  })

  let accessContract = {
    "sender": "0x...",
    "receiver": "0x...",
    "resource": "John",
    "option": "Doe",
    "terms": "",

  }


  Object.keys(accessContract).forEach(async (keyName, index) => {
    await prisma.aquaTemplateFields.upsert({
      where: {
        id: `4${index}`,
      },
      create: {
        id: `4${index}`,
        aqua_form_id: "4",
        name: keyName,
        label: convertNameToLabel(keyName),
        type: keyName == "terms" ? "boolean" : "string",
        required: keyName == 'note' ? false : true
      },
      update: {

      },
    })
  })


  let accessAquNameExist = systemAquaTreesNames.find((item) => item == "access_contract.json")
  if (accessAquNameExist == undefined) {
    // create aqua tree for identity template
    let accessFileObject: FileObject = {
      fileContent: JSON.stringify(accessContract),
      fileName: "access_contract.json",
      path: "./"
    }

    let resaccessAquaTree = await aquafier.createGenesisRevision(accessFileObject, true, false, false )

    if (resaccessAquaTree.isOk()) {

      // save the aqua tree 
      await saveAquaTree(resaccessAquaTree.data.aquaTree!!, SYSTEM_WALLET_ADDRESS)


      await saveTemplateFileData(resaccessAquaTree.data.aquaTree!!, JSON.stringify(accessContract))
    }

  }
  //end of access

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