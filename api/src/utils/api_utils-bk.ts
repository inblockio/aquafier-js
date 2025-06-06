/**
 * let aquafier = new Aquafier()

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

 */

  // function sample() {
    

    
//       //start of identity_claim  
//       await prisma.aquaTemplate.upsert({
//         where: {
//           id: "1",
//         },
//         create: {
//           id: "1",
//           name: "identity_claim",
//           owner: SYSTEM_WALLET_ADDRESS,
//           public: true,
//           title: "Identity Claim",
//           created_at: today.toDateString()
//         },
//         update: {
    
//         },
//       })
    
//       // "type": "identity_claim",
//       // "date_of_birth": "1995-10-15",
//       let identityObject = {
//         "name": "John",
//         "surname": "Doe",
//         "email": "john.doe@example.com",
//         "wallet_address": "0x568a94a8f0f3dc0b245b853bef572075c1df5c50"
//       }
    
//       Object.keys(identityObject).forEach(async (keyName, index) => {
//         await prisma.aquaTemplateFields.upsert({
//           where: {
//             id: `1${index}`,
//           },
//           create: {
//             id: `1${index}`,
//             aqua_form_id: "1",
//             name: keyName,
//             label: convertNameToLabel(keyName),
//             type: "string",
//             required: true
//           },
//           update: {
    
//           },
//         })
//       })
    
//       let ideintiAquNameExist = systemAquaTreesNames.find((item) => item == "identity_claim.json")
//       if (ideintiAquNameExist == undefined) {
//         // create aqua tree for identity template
//         let identityFileObject: FileObject = {
//           fileContent: JSON.stringify(identityObject),
//           fileName: "identity_claim.json",
//           path: "./"
//         }
    
//         let resIdentityAquaTree = await aquafier.createGenesisRevision(identityFileObject, true, false, false)
    
//         if (resIdentityAquaTree.isOk()) {
    
    
//           // await saveFileObject(identityFileObject)
//           await saveTemplateFileData(resIdentityAquaTree.data.aquaTree!!, JSON.stringify(identityObject), SYSTEM_WALLET_ADDRESS)
//           // save the aqua tree 
//           await saveAquaTree(resIdentityAquaTree.data.aquaTree!!, SYSTEM_WALLET_ADDRESS)
//           //safe json file 
//         }
    
    
//       }
//       //end of identity_claim
    
//       //start of identity_attestation
//       await prisma.aquaTemplate.upsert({
//         where: {
//           id: "2",
//         },
//         create: {
//           id: "2",
//           name: "identity_attestation",
//           owner: SYSTEM_WALLET_ADDRESS,
//           public: true,
//           title: "Identity attestation",
//           created_at: today.toDateString()
//         },
//         update: {
    
//         },
//       })
    
//       let identityAttestations = {
//         // "type": "identity_attestation",
//         "identity_claim_id": "0x5721891d757ee81ab3cd00442293f3808a99e676d2d1bda03cda26bae23daed1",
//         "name": "John",
//         "surname": "Doe",
//         "email": "john.doe@example.com",
//         // "date_of_birth": "1995-10-15",
//         "context": "I verified the attributes against a government issued ID. I hereby attest that the above information is true and correct to the best of my knowledge.",
//         "wallet_address": "0x6b2f22390c318107e95c58c90a66afaf7ef06853"
//       }
    
    
//       Object.keys(identityAttestations).forEach(async (keyName, index) => {
//         await prisma.aquaTemplateFields.upsert({
//           where: {
//             id: `2${index}`,
//           },
//           create: {
//             id: `2${index}`,
//             aqua_form_id: "2",
//             name: keyName,
//             label: convertNameToLabel(keyName),
//             type: "string",
//             required: true
//           },
//           update: {
    
//           },
//         })
//       })
    
    
//       let attestationAquNameExist = systemAquaTreesNames.find((item) => item == "identity_attestation.json")
//       if (attestationAquNameExist == undefined) {
//         // create aqua tree for identity template
//         let attestationFileObject: FileObject = {
//           fileContent: JSON.stringify(identityAttestations),
//           fileName: "identity_attestation.json",
//           path: "./"
//         }
    
//         let resAttestationAquaTree = await aquafier.createGenesisRevision(attestationFileObject, true, false, false)
    
//         if (resAttestationAquaTree.isOk()) {
    
//           // await saveFileObject(attestationFileObject)
//           await saveTemplateFileData(resAttestationAquaTree.data.aquaTree!!, JSON.stringify(identityAttestations), SYSTEM_WALLET_ADDRESS)
//           // save the aqua tree 
//           await saveAquaTree(resAttestationAquaTree.data.aquaTree!!, SYSTEM_WALLET_ADDRESS);
    
//         }
    
//       }
    
//       //end of identity_attestation
    
    
    
    
    
//       //start  of  cheque
//       await prisma.aquaTemplate.upsert({
//         where: {
//           id: "3",
//         },
//         create: {
//           id: "3",
//           name: "cheque",
//           owner: SYSTEM_WALLET_ADDRESS,
//           public: true,
//           title: "Cheque template",
//           created_at: today.toDateString()
//         },
//         update: {
    
//         },
//       })
    
//       let cheque = {
//         "sender": "0x...",
//         "receiver": "0x...",
//         "amount": "John",
//         "currency": "Doe",
//         "note": "john.doe@example.com",
    
//       }
    
    
//       Object.keys(cheque).forEach(async (keyName, index) => {
//         await prisma.aquaTemplateFields.upsert({
//           where: {
//             id: `3${index}`,
//           },
//           create: {
//             id: `3${index}`,
//             aqua_form_id: "3",
//             name: keyName,
//             label: convertNameToLabel(keyName),
//             type: "string",
//             required: keyName == 'note' ? false : true
//           },
//           update: {
    
//           },
//         })
//       })
    
//       let chequeAquNameExist = systemAquaTreesNames.find((item) => item == "cheque.json")
//       if (chequeAquNameExist == undefined) {
//         // create aqua tree for identity template
//         let chequeFileObject: FileObject = {
//           fileContent: JSON.stringify(cheque),
//           fileName: "cheque.json",
//           path: "./"
//         }
    
//         let reschequeAquaTree = await aquafier.createGenesisRevision(chequeFileObject, true, false, false)
    
//         if (reschequeAquaTree.isOk()) {
    
//           // console.log(`@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@`)
//           // console.log(`cheque aqua tree ${JSON.stringify(reschequeAquaTree.data.aquaTree, null, 4)}`)
    
    
//           // await saveFileObject(chequeFileObject)
//           await saveTemplateFileData(reschequeAquaTree.data.aquaTree!!, JSON.stringify(cheque), SYSTEM_WALLET_ADDRESS)
//           // save the aqua tree 
//           await saveAquaTree(reschequeAquaTree.data.aquaTree!!, SYSTEM_WALLET_ADDRESS);
    
//         }
    
//       }
//       //end of cheque
    
    
//       //start  of  access agreement
//       await prisma.aquaTemplate.upsert({
//         where: {
//           id: "4",
//         },
//         create: {
//           id: "4",
//           name: "access_agreement",
//           owner: SYSTEM_WALLET_ADDRESS,
//           public: true,
//           title: "Access agreement",
//           created_at: today.toDateString()
//         },
//         update: {
    
//         },
//       })
    
//       let accessAgreement = {
//         "sender": "0x...",
//         "receiver": "0x...",
//         "resource": "John",
//         "option": "Doe",
//         "terms": "",
    
//       }
    
    
//       Object.keys(accessAgreement).forEach(async (keyName, index) => {
//         await prisma.aquaTemplateFields.upsert({
//           where: {
//             id: `4${index}`,
//           },
//           create: {
//             id: `4${index}`,
//             aqua_form_id: "4",
//             name: keyName,
//             label: convertNameToLabel(keyName),
//             type: "string",
//             required: keyName == 'note' ? false : true
//           },
//           update: {
    
//           },
//         })
//       })
    
    
//       let accessAquNameExist = systemAquaTreesNames.find((item) => item == "access_agreement.json")
//       if (accessAquNameExist == undefined) {
//         // create aqua tree for identity template
//         let accessFileObject: FileObject = {
//           fileContent: JSON.stringify(accessAgreement),
//           fileName: "access_agreement.json",
//           path: "./"
//         }
    
//         let resaccessAquaTree = await aquafier.createGenesisRevision(accessFileObject, true, false, false)
    
//         if (resaccessAquaTree.isOk()) {
    
    
//           // await saveFileObject(accessFileObject)
//           await saveTemplateFileData(resaccessAquaTree.data.aquaTree!!, JSON.stringify(accessAgreement), SYSTEM_WALLET_ADDRESS)
//           // save the aqua tree 
//           await saveAquaTree(resaccessAquaTree.data.aquaTree!!, SYSTEM_WALLET_ADDRESS)
    
    
//         }
    
//       }
//       //end of access agreement
    
    
    
    
    
//       //start  of  document contract
//       await prisma.aquaTemplate.upsert({
//         where: {
//           id: "5",
//         },
//         create: {
//           id: "5",
//           name: "aqua_sign",
//           owner: SYSTEM_WALLET_ADDRESS,
//           public: true,
//           title: "Aqua Sign",
//           created_at: today.toDateString()
//         },
//         update: {
    
//         },
//       })
    
//       let documentContract = {
//         "document": "",
//         "sender": "0x...",
//         "signers": "0x...",
    
//       }
    
//       const documentContractFields = [
//         {
//           name: "document",
//           label: "Document",
//           type: "file",
//           required: true,
//           isArray: false
//         },
//         {
//           name: "sender",
//           label: "Sender",
//           type: "wallet_address",
//           required: true,
//           isArray: false,
//         },
//         {
//           name: "signers",
//           label: "Signers",
//           type: "wallet_address",
//           required: true,
//           isArray: true
//         }
//       ]
    
//       documentContractFields.forEach(async (fieldData, index) => {
//         await prisma.aquaTemplateFields.upsert({
//           where: {
//             id: `5${index}`,
//           },
//           create: {
//             id: `5${index}`,
//             aqua_form_id: "5",
//             name: fieldData.name,
//             label: fieldData.label,
//             type: fieldData.type,
//             required: fieldData.required,
    
//             is_array: fieldData.isArray
//           },
//           update: {
    
//           },
//         })
//       })
    
    
//       let documentContractFieldsData = systemAquaTreesNames.find((item) => item == "aqua_sign.json")
//       if (documentContractFieldsData == undefined) {
//         // create aqua tree for identity template
//         let documentContractObject: FileObject = {
//           fileContent: JSON.stringify(documentContract),
//           fileName: "aqua_sign.json",
//           path: "./"
//         }
    
//         let responseDocumentContractAquaTree = await aquafier.createGenesisRevision(documentContractObject, true, false, false)
    
//         if (responseDocumentContractAquaTree.isOk()) {
    
    
//           // await saveFileObject(documentContractObject)
    
//           await saveTemplateFileData(responseDocumentContractAquaTree.data.aquaTree!!, JSON.stringify(documentContractObject), SYSTEM_WALLET_ADDRESS)
//           // save the aqua tree 
//           await saveAquaTree(responseDocumentContractAquaTree.data.aquaTree!!, SYSTEM_WALLET_ADDRESS)
    
    
//         } else {
//           throw Error("Failed to create document contract")
//         }
    
//       }
//       //end of document agreement
    
    
    
    
    
    
    
    
    
//       //start  of  document contract
//       await prisma.aquaTemplate.upsert({
//         where: {
//           id: "6",
//         },
//         create: {
//           id: "6",
//           name: "user_signature",
//           owner: SYSTEM_WALLET_ADDRESS,
//           public: true,
//           title: "User Signature",
//           created_at: today.toDateString()
//         },
//         update: {
    
//         },
//       })
    
//       let userSignature = {
//         "image": "",
//         "name": "0x...",
//         "wallet_address": "0x...",
    
//       }
    
    
//       const userSignatureFields = [
//         {
//           name: "image",
//           label: "Signature Image",
//           type: "image",
//           required: true
//         },
//         {
//           name: "name",
//           label: "Names",
//           type: "string",
//           required: true,
//         },
//         {
//           name: "wallet_address",
//           label: "Wallet Address",
//           type: "wallet_address",
//           required: true,
//           multiple: true
//         }
//       ]
    
//       userSignatureFields.forEach(async (fieldData, index) => {
//         await prisma.aquaTemplateFields.upsert({
//           where: {
//             id: `6${index}`,
//           },
//           create: {
//             id: `6${index}`,
//             aqua_form_id: "6",
//             name: fieldData.name,
//             label: fieldData.label,
//             type: fieldData.type,
//             required: fieldData.required
//           },
//           update: {
    
//           },
//         })
//       })
    
    
//       let userSignatureFieldsData = systemAquaTreesNames.find((item) => item == "user_signature.json")
//       if (userSignatureFieldsData == undefined) {
//         // create aqua tree for identity template
//         let userSignatureObject: FileObject = {
//           fileContent: JSON.stringify(userSignature),
//           fileName: "user_signature.json",
//           path: "./"
//         }
    
//         let responseuserSignatureAquaTree = await aquafier.createGenesisRevision(userSignatureObject, true, false, false)
    
//         if (responseuserSignatureAquaTree.isOk()) {
    
//           // await saveFileObject(userSignatureObject)
    
//           await saveTemplateFileData(responseuserSignatureAquaTree.data.aquaTree!!, JSON.stringify(userSignatureObject), SYSTEM_WALLET_ADDRESS)
//           // save the aqua tree 
//           await saveAquaTree(responseuserSignatureAquaTree.data.aquaTree!!, SYSTEM_WALLET_ADDRESS)
    
    
//         } else {
//           throw Error("Failed to create document contract")
//         }
    
//       }
//       //end of document agreement
    
// }