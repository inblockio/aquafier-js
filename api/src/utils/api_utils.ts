import { prisma } from "../database/db"
import { SYSTEM_WALLET_ADDRESS } from "../models/constants"
import { ethers } from "ethers"



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


const setUpSystemTemplates = async () => {
  //insert system templates 

  let today = new Date();

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

  let identityObject = {
    // "type": "identity_claim",
    "name": "John",
    "surname": "Doe",
    "email": "john.doe@example.com",
    // "date_of_birth": "1995-10-15",
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


  Object.keys(cheque).forEach(async (keyName, index) => {
    await prisma.aquaTemplateFields.upsert({
      where: {
        id: `4${index}`,
      },
      create: {
        id: `4${index}`,
        aqua_form_id: "4",
        name: keyName,
        label: convertNameToLabel(keyName),
        type: keyName == "terms"? "boolean": "string",
        required: keyName == 'note' ? false : true
      },
      update: {

      },
    })
  })

  //end of cheque

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