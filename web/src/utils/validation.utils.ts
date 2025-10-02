import { ApiFileInfo } from "@/models/FileInfo"
import { ApiFileInfoState } from "@/types/types"
import { getAquaTreeFileName, isWorkFlowData } from "./aqua.utils"
import Aquafier, { AquaTree, OrderRevisionInAquaTree, Revision } from "aqua-js-sdk"
import { readFileContent } from "./file.utils"

import {getAddress, isAddress} from 'ethers'

export function areArraysEqual(array1: Array<string>, array2: Array<string>) {
    //  (`areArraysEqual array1 ${array1} == array2 ${array2} `)
      // Check if arrays have the same length
      if (array1.length !== array2.length) {
            return false
      }

      // Create a copy of array2 to modify
      const array2Copy = [...array2]

      // Check each element in array1
      for (const item of array1) {
            const index = array2Copy.indexOf(item)

            // If element not found in array2Copy
            if (index === -1) {
                  return false
            }

            // Remove the found element from array2Copy
            array2Copy.splice(index, 1)
      }

      // If we've removed all elements from array2Copy, arrays are equal
      return array2Copy.length === 0
}

export const checkIfFileExistInUserFiles = async (file: File, files: ApiFileInfo[]): Promise<boolean> => {
      let fileExists = false
      // read the file and get the file hash
      const fileContent = await readFileContent(file)
      const aquafier = new Aquafier()
      const fileHash = aquafier.getFileHash(fileContent)
    //    (`type of ${typeof (fileContent)} file hash generated  ${fileHash} `)

      // loop through all the files the user has
      for (const fileItem of files) {
          //   (`looping ${JSON.stringify(fileItem.aquaTree)}`)
            const aquaTree: AquaTree = fileItem.aquaTree!
            //loop through the revisions
            // check if revsion type is file then compare the file hash if found exit loop
            const revisionsData: Array<Revision> = Object.values(aquaTree.revisions)
            for (const revision of revisionsData) {
                //      (`--> looping ${JSON.stringify(revision)}`)
                  if (revision.revision_type == 'file') {
                      //            (`$$$ FILE -->looping ${revision.file_hash}`)
                        if (revision.file_hash === fileHash) {
                              fileExists = true
                              break
                        }
                  }
            }
      }

      return fileExists
}


export function arraysEqualIgnoreOrder(a: string[], b: string[]): boolean {
  return a.length === b.length &&
         [...new Set(a)].every(val => b.includes(val));
}







export const fetchWalletAddressesAndNamesForInputRecommendation = (systemFileInfo: ApiFileInfo[], files: ApiFileInfoState,): Map<string, string> => {

      const recommended = new Map<string, string>()

      const someData = systemFileInfo.map(e => {
            try {
                  return getAquaTreeFileName(e.aquaTree!)
            } catch (e) {
                  //  console.log('Error processing system file') // More descriptive
                  return ''
            }
      })

      for (const file of files.fileData) {

            const workFlow = isWorkFlowData(file.aquaTree!, someData)

            if (workFlow && workFlow.isWorkFlow) {
                  //  console.log('Workflow found: ', workFlow.workFlow)
                  if (workFlow.workFlow === 'identity_claim') {
                        //  console.log('Identity claim found:')
                        const orederdRevisionAquaTree = OrderRevisionInAquaTree(file.aquaTree!)
                        let allHashes = Object.keys(orederdRevisionAquaTree.revisions)

                        // //  console.log('orederdRevisionAquaTree: ', JSON.stringify (orederdRevisionAquaTree.revisions ,null, 2))
                        // //  console.log('hashs: ', JSON.stringify (orederdRevisionAquaTree.revisions ,null, 2))
                        let genRevsion = orederdRevisionAquaTree.revisions[allHashes[0]]

                        // //  console.log('genRevsion: ', JSON.stringify (genRevsion,null, 2))
                        // //  console.log('name : ', genRevsion[`forms_name`])
                        // //  console.log('forms_wallet_address  : ', genRevsion[`forms_wallet_address`])
                        if (genRevsion && genRevsion[`forms_name`] && genRevsion[`forms_wallet_address`]) {
                              recommended.set(genRevsion[`forms_name`], genRevsion[`forms_wallet_address`])
                        }
                  }


            } else {
                  //  console.log('Not a workflow data: ', file.aquaTree)
            }

      }

      //  console.log('Recommended wallet addresses: ', JSON.stringify(recommended, null, 2))

      return recommended;
}


/**
 * Validates if a string is a valid Ethereum address using ethers.js v6
 * @param address The string to check
 * @returns Boolean indicating if the address is valid
 */
export function isValidEthereumAddress(address: string): boolean {
      try {
            return isAddress(address)
      } catch (error) {
            console.error('Error validating Ethereum address:', error)
            return false
      }
}

/**
 * Validates an address and returns the checksummed version if valid
 * @param address The address to check and format
 * @returns The checksummed address if valid, or null if invalid
 */
export function getValidChecksumAddress(address: string): string | null {
      try {
            if (!isAddress(address)) {
                  return null
            }

            // Convert to checksum address (properly capitalized)
            return getAddress(address)
      } catch (error) {
            console.error('Error processing Ethereum address:', error)
            return null
      }
}




/**
 * Checks if the file content is a valid JSON with a simple key-string/value-string structure
 * @param fileContent The content of the file to check
 * @returns boolean indicating if the content is a valid JSON with key-string/value-string structure
 */
// export const isJSONKeyValueStringContent = (fileContent: string): boolean => {
//     try {
//         // First check if it's valid JSON
//         const parsedContent = JSON.parse(fileContent);

//         // Check if it's an object (not an array or primitive)
//         if (typeof parsedContent !== 'object' || parsedContent === null || Array.isArray(parsedContent)) {
//             return false;
//         }
//         let isKeyValueString = true
//         let values = Object.values(parsedContent)
//         for (let item of values) {

//             if (typeof item == 'object' || item === null || Array.isArray(parsedContent)) {
//                 isKeyValueString = false
//             }
//         }

//         // Check if all keys map to string values
//         // return Object.entries(parsedContent).every(([_, value]) => typeof value === 'string');
//         return isKeyValueString
//     } catch (error) {
//         // If JSON.parse throws an error, it's not valid JSON
//         return false;
//     }
// };

// A simpler check if json parse succeeds we know its json
export const isJSONKeyValueStringContent = (fileContent: string): boolean => {
      try {
            // First check if it's valid JSON
            JSON.parse(fileContent)
            return true
      } catch (error) {
            // If JSON.parse throws an error, it's not valid JSON
            return false
      }
}

