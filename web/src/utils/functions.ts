// import { ethers } from "ethers";
import { ethers, getAddress, isAddress } from 'ethers'

import { ApiFileInfo, ClaimInformation } from '../models/FileInfo'
import { documentTypes, ERROR_TEXT, ERROR_UKNOWN, imageTypes, musicTypes, videoTypes } from './constants'
import Aquafier, { AquaTree, CredentialsData, FileObject, OrderRevisionInAquaTree, Revision } from 'aqua-js-sdk'
import jdenticon from 'jdenticon/standalone'
import { IContractInformation } from '@/types/contract_workflow'
import { ApiFileInfoState, ApiFilePaginationData, DNSProof, IIdentityClaimDetails, SummaryDetailsDisplayData } from '@/types/types'
import { AquaSystemNamesService } from '@/storage/databases/aquaSystemNames'

export function formatDate(date: Date) {
      const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
      const day = date.getDate().toString().padStart(2, '0')
      const month = months[date.getMonth()]
      const year = date.getFullYear()
      return `${day}-${month}-${year}`
}

export const copyToClipboardModern = async (text: string) => {
      try {
            await navigator.clipboard.writeText(text)
            return true
      } catch (err) {
            console.error('Failed to copy text: ', err)
            return false
      }
}

export const fetchFileData = async (url: string, nonce: string): Promise<string | ArrayBuffer | null> => {
      try {
            const actualUrlToFetch = ensureDomainUrlHasSSL(url)

            const response = await fetch(actualUrlToFetch, {
                  headers: {
                        nonce: nonce,
                  },
            })
            if (!response.ok) throw new Error('Failed to fetch file')

            // Get MIME type from headers
            const contentType = response.headers.get('Content-Type') || ''

            // Process based on content type
            if (contentType.startsWith('text/') || contentType === 'application/json' || contentType === 'application/xml' || contentType === 'application/javascript') {
                  return await response.text()
            } else {
                  return await response.arrayBuffer()
            }
      } catch (e) {
            console.error('Error fetching file:', e)
            return null
      }
}

export const convertTemplateNameToTitle = (str: string) => {
      return str
            .split('_')
            .map(word => word.charAt(0).toUpperCase() + word.slice(1))
            .join(' ')
}

export function generateProofFromSignature(domain: string, walletAddress: string, timestamp: string, expiration: string, signature: string): DNSProof {
      return {
            walletAddress,
            domainName: domain,
            timestamp,
            expiration,
            signature
      };
}

export function formatTxtRecord(proof: DNSProof): string {
      return `wallet=${proof.walletAddress}&timestamp=${proof.timestamp}&expiration=${proof.expiration}&sig=${proof.signature}`;
}

// ============================================
// NEW PRIVACY-PRESERVING DNS CLAIM FUNCTIONS
// ============================================

export interface AquaTreeClaim {
      forms_unique_id: string;
      forms_claim_secret: string;
      forms_txt_name: string;
      forms_txt_record: string;
      forms_wallet_address: string;
      forms_domain: string;
      forms_type: string;
      signature_type: string;
      itime: string;
      etime: string;
      sig: string;
      public_association: boolean;
}

// Generate random 8-char hex ID using crypto for security
export function generateUniqueId(): string {
      const array = new Uint8Array(4);
      crypto.getRandomValues(array);
      return Array.from(array)
            .map(byte => byte.toString(16).padStart(2, '0'))
            .join('');
}

// Generate random 16-char hex secret (for private mode)
export function generateClaimSecret(): string {
      const array = new Uint8Array(8);
      crypto.getRandomValues(array);
      return Array.from(array)
            .map(byte => byte.toString(16).padStart(2, '0'))
            .join('');
}

// Format TXT record based on mode (private or public)
export function formatClaimTxtRecord(
      uniqueId: string,
      itime: number,
      etime: number,
      signature: string,
      walletAddress?: string
): string {
      if (walletAddress) {
            // Public mode: include wallet address in record
            return `id=${uniqueId}&wallet=${walletAddress}&itime=${itime}&etime=${etime}&sig=${signature}`;
      }
      // Private mode: no wallet in record
      return `id=${uniqueId}&itime=${itime}&etime=${etime}&sig=${signature}`;
}

// Main DNS claim generation function
export async function generateDNSClaim(
      domain: string,
      walletAddress: string,
      signMessageFunction: (message: string) => Promise<string>,
      expirationDays: number = 90,
      publicAssociation: boolean = false
): Promise<AquaTreeClaim> {
      const uniqueId = generateUniqueId();
      const claimSecret = publicAssociation ? '' : generateClaimSecret();
      const messagePrefix = publicAssociation ? walletAddress : claimSecret;

      const itime = Math.floor(Date.now() / 1000);
      const etime = itime + expirationDays * 86400;

      // Message format: {prefix}&{itime}&{domain}&{etime}
      // Private mode: {secret}&{itime}&{domain}&{etime}
      // Public mode: {wallet}&{itime}&{domain}&{etime}
      const message = `${messagePrefix}&${itime}&${domain}&${etime}`;
      const signature = await signMessageFunction(message);

      const txtName = `_aw.${domain}`;

      return {
            forms_unique_id: uniqueId,
            forms_claim_secret: claimSecret,
            forms_txt_name: txtName,
            forms_txt_record: formatClaimTxtRecord(
                  uniqueId,
                  itime,
                  etime,
                  signature,
                  publicAssociation ? walletAddress : undefined
            ),
            forms_wallet_address: walletAddress,
            forms_domain: domain,
            forms_type: 'dns_claim',
            signature_type: 'ethereum:eip-191',
            itime: itime.toString(),
            etime: etime.toString(),
            sig: signature,
            public_association: publicAssociation
      };
}

// Helper function to convert string to hex with 0x prefix
export const stringToHex = (str: string): string => {
      const hex = Array.from(str)
            .map(char => char.charCodeAt(0).toString(16).padStart(2, '0'))
            .join('')
      return `0x${hex}`
}

export const isWorkFlowData = (aquaTree: AquaTree, systemAndUserWorkFlow: string[]): { isWorkFlow: boolean; workFlow: string } => {
      const falseResponse = {
            isWorkFlow: false,
            workFlow: '',
      }
      // console.log("System workflows: ", systemAndUserWorkFlow)

      //order revision in aqua tree
      const aquaTreeRevisionsOrderd = OrderRevisionInAquaTree(aquaTree)
      const allHashes = Object.keys(aquaTreeRevisionsOrderd.revisions)
      if (allHashes.length <= 1) {
            // (`Aqua tree has one revision`)
            return falseResponse
      }
      const secondRevision = aquaTreeRevisionsOrderd.revisions[allHashes[1]]
      if (!secondRevision) {
            // (`Aqua tree has second revision not found`)
            return falseResponse
      }
      if (secondRevision.revision_type == 'link') {
            //get the  system aqua tree name
            const secondRevision = aquaTreeRevisionsOrderd.revisions[allHashes[1]]
            // (` second hash used ${allHashes[1]}  second revision ${JSON.stringify(secondRevision, null, 4)} tree ${JSON.stringify(aquaTreeRevisionsOrderd, null, 4)}`)

            if (secondRevision.link_verification_hashes == undefined) {
                  // (`link verification hash is undefined`)
                  return falseResponse
            }
            const revisionHash = secondRevision.link_verification_hashes[0]
            const name = aquaTreeRevisionsOrderd.file_index[revisionHash]
            // (`--  name ${name}  all hashes ${revisionHash}  second revision ${JSON.stringify(secondRevision, null, 4)} tree ${JSON.stringify(aquaTreeRevisionsOrderd, null, 4)}`)

            // if (systemAndUserWorkFlow.map((e)=>e.replace(".json", "")).includes(name)) {

            let nameWithoutJson = '--error--'
            if (name) {
                  nameWithoutJson = name.replace('.json', '')
                  if (systemAndUserWorkFlow.map(e => e.replace('.json', '')).includes(nameWithoutJson)) {
                        return {
                              isWorkFlow: true,
                              workFlow: nameWithoutJson,
                        }
                  }
            }
            return {
                  isWorkFlow: false,
                  workFlow: '',
            }
      }
      // (`Aqua tree has second revision is of type ${secondRevision.revision_type}`)

      return falseResponse
}

export function allLinkRevisionHashes(aquaTree: AquaTree): Array<string> {
      const hashesWithLinkRevisions: Array<string> = []
      const allHashes = Object.keys(aquaTree.revisions)
      for (const hashItem of allHashes) {
            const revision = aquaTree.revisions[hashItem]
            if (revision.revision_type == 'link') {
                  hashesWithLinkRevisions.push(hashItem)
            }
      }

      return hashesWithLinkRevisions
}
export function isAquaTree(content: any): boolean {
      let json = null
      let isJsonAlready = true
      if (typeof content === 'string') {
            isJsonAlready = false
      }
      if (isJsonAlready) {
            json = content
      } else {
            try {
                  json = JSON.parse(content)
            } catch (e) {
                  return false
            }
      }
      // Check if content has the properties of an AquaTree
      return json && typeof json === 'object' && 'revisions' in json && 'file_index' in json
}

export function parseAquaTreeContent(content: any): any {
      // If content is already an object with revisions, return it
      if (content && typeof content === 'object' && 'revisions' in content) {
            return content
      }
      // If content is a string, try to parse it
      if (typeof content === 'string') {
            try {
                  return JSON.parse(content)
            } catch (e) {
                  console.error('Failed to parse AquaTree content:', e)
                  return null
            }
      }
      return content
}
export function formatCryptoAddress(address?: string, start: number = 10, end: number = 4, message?: string): string {
      if (!address) return message ?? 'NO ADDRESS'
      if (address?.length < start + end) {
            // throw new Error(`Address must be at least ${start + end} characters long.`);
            return address
      }

      const firstPart = address?.slice(0, start)
      const lastPart = address?.slice(-end)
      return `${firstPart}...${lastPart}`
}

export function formatAddressForFilename(address?: string): string {
      if (!address || address.length < 8) return ''
      return `_${address.slice(0, 4)}_${address.slice(-4)}`
}

export function remove0xPrefix(input: string): string {
      // Check if the input string starts with '0x'
      if (input.startsWith('0x')) {
            // Remove the prefix and return the remaining string
            return input.slice(2)
      }
      // Return the original string if it doesn't start with '0x'
      return input
}
export function capitalizeWords(str: string): string {
      return str.replace(/\b\w+/g, word => word.charAt(0).toUpperCase() + word.slice(1))
}
export function getCookie(name: string) {
      const value = `; ${document.cookie}`
      const parts: any = value.split(`; ${name}=`)
      if (parts.length === 2) return parts.pop().split(';').shift()
      return null
}

export function setCookie(name: string, value: string, expirationTime: Date) {
      const expirationDate = new Date(expirationTime)
      // For UTC cookie settings
      // document.cookie = `${name}=${value}; expires=${expirationDate.toUTCString()}; path=/; Secure; SameSite=Strict`;
      document.cookie = `${name}=${value}; expires=${expirationDate}; path=/; Secure; SameSite=Strict`
}

export function getAquaTreeFileName(aquaTree: AquaTree): string {

      let mainAquaHash = ''
      const revisionHashes = Object.keys(aquaTree!.revisions!)
      for (const revisionHash of revisionHashes) {
            const revisionData = aquaTree!.revisions![revisionHash]
            if (revisionData.previous_verification_hash == null || revisionData.previous_verification_hash == '') {
                  mainAquaHash = revisionHash
                  break
            }
      }

      return aquaTree!.file_index[mainAquaHash] ?? ''
}


export function getAquatreeObject(content: any): AquaTree {
      if (typeof content === 'string') {
            return JSON.parse(content)
      }
      return content
}


export function getAquaTreeFileObject(fileInfo: ApiFileInfo): FileObject | undefined {
      let mainAquaFileName = ''
      let mainAquaHash = ''
      // fetch the genesis
      const revisionHashes = Object.keys(fileInfo.aquaTree!.revisions!)
      for (const revisionHash of revisionHashes) {
            const revisionData = fileInfo.aquaTree!.revisions![revisionHash]
            if (revisionData.previous_verification_hash == null || revisionData.previous_verification_hash == '') {
                  mainAquaHash = revisionHash
                  break
            }
      }
      mainAquaFileName = fileInfo.aquaTree!.file_index[mainAquaHash]

      return fileInfo.fileObject.find(e => e.fileName == mainAquaFileName) || fileInfo?.linkedFileObjects?.find(e => e.fileName === mainAquaFileName)
}

export function getGenesisHash(aquaTree: AquaTree): string | null {
      let aquaTreeGenesisHash: string | null = null
      const allAquuaTreeHashes = Object.keys(aquaTree!.revisions)

      for (const hash of allAquuaTreeHashes) {
            const revisionItem = aquaTree!.revisions[hash]
            if (revisionItem.previous_verification_hash == '' || revisionItem.previous_verification_hash == null || revisionItem.previous_verification_hash == undefined) {
                  aquaTreeGenesisHash = hash //revisionItem.previous_verification_hash
                  break
            }
      }

      return aquaTreeGenesisHash
}

export async function getCurrentNetwork() {
      if (typeof window.ethereum !== 'undefined') {
            try {
                  const chainId = await (window.ethereum as any).request({
                        method: 'eth_chainId',
                  })
                  //  ("Current chain ID:", chainId);
                  return chainId
            } catch (error) {
                  console.error('Error fetching chain ID:', error)
            }
      } else {
            console.error('MetaMask is not installed.')
      }
}

export async function switchNetwork(chainId: string) {
      // const chainId = '0x89'; // Example: Polygon Mainnet chain ID
      if (typeof window.ethereum !== 'undefined') {
            try {
                  // Check if the network is already set
                  await (window.ethereum as any).request({
                        method: 'wallet_switchEthereumChain',
                        params: [{ chainId }],
                  })
                  //  ("Network switched successfully");
            } catch (error) {
                  // If the network is not added, request MetaMask to add it
            }
      } else {
            console.error('MetaMask is not installed.')
      }
}

export const getWalletClaims = (aquaTemplateNames: string[], files: ApiFileInfo[], walletAddress: string, _setSelectedFileInfo: (file: ApiFileInfo | null) => void): IIdentityClaimDetails | null => {
      const aquaTemplates: string[] = aquaTemplateNames

      if (files && files.length > 0) {
            let firstClaim: ApiFileInfo | null = null
            for (let i = 0; i < files.length; i++) {
                  const aquaTree = files[i].aquaTree
                  if (aquaTree) {
                        const { isWorkFlow, workFlow } = isWorkFlowData(aquaTree!, aquaTemplates)
                        if (isWorkFlow && (workFlow === 'simple_claim' || workFlow === 'identity_claim' || workFlow === "user_signature" || workFlow === "email_claim")) {
                              const orderedAquaTree = OrderRevisionInAquaTree(aquaTree)
                              const revisionHashes = Object.keys(orderedAquaTree.revisions)
                              const firstRevisionHash = revisionHashes[0]
                              const firstRevision = orderedAquaTree.revisions[firstRevisionHash]
                              const _wallet_address = firstRevision.forms_wallet_address
                              if (walletAddress === _wallet_address) {
                                    firstClaim = files[i]
                                    break
                              }
                        }
                  }
            }
            if (firstClaim) {
                  const genesisHash = getGenesisHash(firstClaim.aquaTree!)
                  const firstRevision = firstClaim.aquaTree!.revisions[genesisHash!]
                  let nameOrEmail = ""
                  if (firstRevision.forms_name) {
                        nameOrEmail = firstRevision.forms_name
                  } else if (firstRevision.forms_email) {
                        nameOrEmail = firstRevision.forms_email
                  }

                  return {
                        name: nameOrEmail
                  }
            }
      }
      return null
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

export async function fetchSystemFiles(url: string, metamaskAddress: string = ''): Promise<Array<ApiFileInfo>> {
      try {
            const query = await fetch(url, {
                  method: 'GET',
                  headers: {
                        metamask_address: metamaskAddress,
                  },
            })
            const response = await query.json()

            if (!query.ok) {
                  throw new Error(`HTTP error! status: ${query.status}`)
            }

            return response.data
      } catch (error) {
            console.error('Error fetching files:', error)
            return []
      }
}

export async function fetchFiles(publicMetaMaskAddress: string, url: string, nonce: string): Promise<{
      files: Array<ApiFileInfo>,
      pagination: ApiFilePaginationData
}> {
      try {
            const query = await fetch(url, {
                  method: 'GET',
                  headers: {
                        metamask_address: publicMetaMaskAddress,
                        nonce: nonce,
                  },
            })
            const response = await query.json()

            if (!query.ok) {
                  throw new Error(`HTTP error! status: ${query.status}`)
            }

            return {
                  files: response.data,
                  pagination: response.pagination
            }
      } catch (error) {
            console.error('Error fetching files:', error)
            return {
                  files: [],
                  pagination: {
                        currentPage: 1,
                        totalPages: 0,
                        totalItems: 0,
                        itemsPerPage: 10,
                        hasNextPage: false,
                        hasPreviousPage: false,
                        endIndex: 0,
                        startIndex: 0,
                  }
            }
      }
}




/**
 * Validates an AquaTree object to ensure all required properties exist and are valid
 * @param tree The AquaTree object to validate
 * @returns boolean indicating whether the tree is valid
 */
export function validateAquaTree(tree: AquaTree): [boolean, string] {
      // Check if tree is null or undefined
      if (!tree) {
            return [false, 'aqua tree is null']
      }

      // Check if required top-level properties exist
      if (!tree.revisions || !tree.file_index) {
            return [false, 'revsions and file index must exist in an aqua tree']
      }

      // Check if revisions is a valid object
      if (typeof tree.revisions !== 'object' || Array.isArray(tree.revisions)) {
            return [false, 'revision does not contain revisions']
      }

      // Check if file_index is a valid object
      if (typeof tree.file_index !== 'object' || Array.isArray(tree.file_index)) {
            return [false, 'file index does not contain values ']
      }

      // Validate each revision
      for (const hash in tree.revisions) {
            const revision = tree.revisions[hash]

            // (`Revision --  ${JSON.stringify(revision)}`)
            // Check required fields for all revisions
            if (revision.previous_verification_hash === undefined || revision.previous_verification_hash === null) {
                  return [false, 'A revision must contain previous_verification_hash']
            }
            if (revision.local_timestamp === undefined || revision.local_timestamp === null) {
                  return [false, 'A revision must contain local_timestamp ']
            }
            if (!revision.revision_type === undefined || revision.local_timestamp === null) {
                  return [false, 'A revision must contain  revision_type']
            }

            // Validate revision_type is one of the allowed values
            const validRevisionTypes = ['file', 'witness', 'signature', 'form', 'link']
            if (!validRevisionTypes.includes(revision.revision_type)) {
                  return [false, `unknown revision type ${revision.revision_type}`]
            }

            // Check type-specific required fields
            // Check type-specific required fields
            switch (revision.revision_type) {
                  case 'file':
                        if (revision.file_hash === undefined || revision.file_hash === null) {
                              return [false, 'file revision must contain file_hash']
                        }
                        if (revision.file_nonce === undefined || revision.file_nonce === null) {
                              return [false, 'file revision must contain file_nonce']
                        }
                        break
                  case 'witness':
                        if (revision.witness_merkle_root === undefined || revision.witness_merkle_root === null) {
                              return [false, 'witness revision must contain witness_merkle_root']
                        }
                        if (revision.witness_timestamp === undefined || revision.witness_timestamp === null) {
                              return [false, 'witness revision must contain witness_timestamp']
                        }
                        if (revision.witness_network === undefined || revision.witness_network === null) {
                              return [false, 'witness revision must contain witness_network']
                        }
                        if (revision.witness_smart_contract_address === undefined || revision.witness_smart_contract_address === null) {
                              return [false, 'witness revision must contain witness_smart_contract_address']
                        }
                        if (revision.witness_transaction_hash === undefined || revision.witness_transaction_hash === null) {
                              return [false, 'witness revision must contain witness_transaction_hash']
                        }
                        if (revision.witness_sender_account_address === undefined || revision.witness_sender_account_address === null) {
                              return [false, 'witness revision must contain witness_sender_account_address']
                        }
                        break
                  case 'signature':
                        if (revision.signature === undefined || revision.signature === null) {
                              return [false, 'signature revision must contain signature']
                        }
                        if (revision.signature_public_key === undefined || revision.signature_public_key === null) {
                              return [false, 'signature revision must contain signature_public_key']
                        }
                        if (revision.signature_type === undefined || revision.signature_type === null) {
                              return [false, 'signature revision must contain signature_type']
                        }
                        break
                  case 'link':
                        if (revision.link_type === undefined || revision.link_type === null) {
                              return [false, 'link revision must contain link_type']
                        }
                        if (revision.link_verification_hashes === undefined || revision.link_verification_hashes === null) {
                              return [false, 'link revision must contain link_verification_hashes']
                        }
                        if (!Array.isArray(revision.link_verification_hashes)) {
                              return [false, "link revision's link_verification_hashes must be an array"]
                        }
                        if (revision.link_verification_hashes.length === 0) {
                              return [false, "link revision's link_verification_hashes must not be empty"]
                        }
                        break
            }
      }

      // Check if the file_index contains at least one entry
      if (Object.keys(tree.file_index).length === 0) {
            return [false, 'file_index is empty']
      }

      // If all checks pass, return true
      return [true, 'valid aqua tree']
}

/**
 * Reads a File object as text
 * @param file The File object to read
 * @returns Promise that resolves with the file contents as string
 */
export function readFileAsText(file: File): Promise<string> {
      return new Promise((resolve, reject) => {
            const reader = new FileReader()

            reader.onload = event => {
                  if (event.target?.result) {
                        resolve(event.target.result as string)
                  } else {
                        reject(new Error('Failed to read file content'))
                  }
            }

            reader.onerror = error => {
                  reject(error)
            }

            reader.readAsText(file, 'utf-8')
      })
}

/**
 * Reads a File object as ArrayBuffer
 * @param file The File object to read
 * @returns Promise that resolves with the file contents as ArrayBuffer
 */
export function readFileAsArrayBuffer(file: File): Promise<ArrayBuffer> {
      return new Promise((resolve, reject) => {
            const reader = new FileReader()

            reader.onload = event => {
                  if (event.target?.result) {
                        resolve(event.target.result as ArrayBuffer)
                  } else {
                        reject(new Error('Failed to read file content'))
                  }
            }

            reader.onerror = error => {
                  reject(error)
            }

            reader.readAsArrayBuffer(file)
      })
}

/**
 * Reads a File object as Data URL
 * @param file The File object to read
 * @returns Promise that resolves with the file contents as Data URL string
 */
export function readFileAsDataURL(file: File): Promise<string> {
      return new Promise((resolve, reject) => {
            const reader = new FileReader()

            reader.onload = event => {
                  if (event.target?.result) {
                        resolve(event.target.result as string)
                  } else {
                        reject(new Error('Failed to read file content'))
                  }
            }

            reader.onerror = error => {
                  reject(error)
            }

            reader.readAsDataURL(file)
      })
}

export function getFileCategory(extension: string): string | null {
      // Remove the leading dot if present (e.g., ".png" becomes "png")
      // const ext = extension.startsWith('.') ? extension.slice(1).toLowerCase() : extension.toLowerCase();
      const extParts = extension.split('/')
      const ext = extParts[extParts.length - 1]

      // Map of file categories with extensions
      const fileCategories: Record<string, string> = {
            // Image
            jpg: 'Image',
            jpeg: 'Image',
            png: 'Image',
            gif: 'Image',
            svg: 'Image',
            webp: 'Image',
            bmp: 'Image',
            ico: 'Image',
            // Audio
            mp3: 'Audio',
            wav: 'Audio',
            ogg: 'Audio',
            mp4: 'Video',
            webm: 'Video',
            // Documents
            pdf: 'Document',
            doc: 'Document',
            docx: 'Document',
            xls: 'Document',
            xlsx: 'Document',
            ppt: 'Document',
            pptx: 'Document',
            txt: 'Document',
            html: 'Document',
            css: 'Document',
            js: 'Document',
            json: 'Document',
            xml: 'Document',
            zip: 'Archive',
            rar: 'Archive',
            '7z': 'Archive',
      }

      // Loop through each category and look for the extension

      // Return null if not found
      return fileCategories[ext]
}

export function calculateContentSize(content: string | Buffer | Blob): number {
      if (typeof content === 'string') {
            // For a string, return the number of bytes by encoding it into UTF-8
            return new TextEncoder().encode(content).length
      } else if (Buffer.isBuffer(content)) {
            // For a Buffer, return its length directly (in bytes)
            return content.length
      } else if (content instanceof Blob) {
            // For a Blob (File), return the size property (in bytes)
            return content.size
      }

      throw new Error('Unsupported content type')
}

//sumFileContentSize
export function estimateFileSize(fileContent: string | AquaTree): number {
      let fileSize = 0

      if (typeof fileContent === 'string') {
            if (isBase64(fileContent)) {
                  fileSize = calculateBase64Size(fileContent)
            } else {
                  fileSize = new TextEncoder().encode(fileContent).length // UTF-8 size
            }
      } else if (typeof fileContent === 'object') {
            const jsonString = JSON.stringify(fileContent)
            fileSize = new TextEncoder().encode(jsonString).length
      } else {
            throw new Error('Unsupported fileContent type')
      }

      return fileSize
}

export function arraysEqualIgnoreOrder(a: string[], b: string[]): boolean {
      return a.length === b.length &&
            [...new Set(a)].every(val => b.includes(val));
}
// Function to check if a string is Base64 encoded
function isBase64(str: string) {
      if (typeof str !== 'string') return false
      return /^([A-Za-z0-9+/]{4})*([A-Za-z0-9+/]{3}=|[A-Za-z0-9+/]{2}==)?$/.test(str)
}

// Function to calculate decoded file size from base64
function calculateBase64Size(base64String: string) {
      const padding = base64String.endsWith('==') ? 2 : base64String.endsWith('=') ? 1 : 0
      return (base64String.length * 3) / 4 - padding
}

/**
 * Converts a Blob (typically from an HTTP response) to a base64 string
 *
 * @param blob - The Blob object returned from fetch or XMLHttpRequest
 * @returns Promise that resolves with the base64 string (without the data URL prefix)
 */
export function blobToBase64(blob: Blob): Promise<string> {
      return new Promise((resolve, reject) => {
            const reader = new FileReader()

            reader.onload = () => {
                  if (typeof reader.result === 'string') {
                        // Extract just the base64 part by removing the data URL prefix
                        // (e.g., "data:application/octet-stream;base64,")
                        const base64String = reader.result.split(',')[1]
                        resolve(base64String)
                  } else {
                        reject(new Error('FileReader did not return a string'))
                  }
            }

            reader.onerror = error => {
                  reject(new Error(`FileReader error: ${error}`))
            }

            // Read the blob as a data URL which gives us a base64 representation
            reader.readAsDataURL(blob)
      })
}

// Basic random number function
export function getRandomNumber(min: number, max: number): number | null {
      // Ensure min and max are numbers
      min = Number(min)
      max = Number(max)

      // Validate inputs
      if (isNaN(min) || isNaN(max)) {
            ('Please provide valid numbers')
            return null
      }

      // Swap if min is greater than max
      if (min > max) {
            ;[min, max] = [max, min]
      }

      // Generate random number between min and max (inclusive)
      return Math.floor(Math.random() * (max - min + 1)) + min
}

// Function to convert file to base64
export async function fileToBase64(file: File): Promise<string> {
      return new Promise((resolve, reject) => {
            const reader = new FileReader()
            reader.readAsDataURL(file)
            reader.onload = () => {
                  if (typeof reader.result === 'string') {
                        // Remove the data URL prefix (e.g., "data:application/pdf;base64,")
                        const base64String = reader.result.split(',')[1]
                        resolve(base64String)
                  } else {
                        reject(new Error('Failed to convert file to base64'))
                  }
            }
            reader.onerror = error => reject(error)
      })
}
export const isArrayBufferText = (buffer: ArrayBuffer): boolean => {
      // Convert the ArrayBuffer to a Uint8Array
      const uint8Array = new Uint8Array(buffer)

      // If buffer is too small, it's likely not a valid file
      if (uint8Array.length < 4) {
            // Default to text for very small buffers
            return true
      }

      // Check for common binary file signatures (magic numbers)

      // Check for PDF signature: %PDF-
      if (uint8Array.length >= 5 && uint8Array[0] === 37 && uint8Array[1] === 80 && uint8Array[2] === 68 && uint8Array[3] === 70 && uint8Array[4] === 45) {
            return false
      }

      // Check for JPEG signature: FF D8 FF
      if (uint8Array.length >= 3 && uint8Array[0] === 0xff && uint8Array[1] === 0xd8 && uint8Array[2] === 0xff) {
            return false
      }

      // Check for PNG signature: 89 50 4E 47 0D 0A 1A 0A
      if (
            uint8Array.length >= 8 &&
            uint8Array[0] === 0x89 &&
            uint8Array[1] === 0x50 &&
            uint8Array[2] === 0x4e &&
            uint8Array[3] === 0x47 &&
            uint8Array[4] === 0x0d &&
            uint8Array[5] === 0x0a &&
            uint8Array[6] === 0x1a &&
            uint8Array[7] === 0x0a
      ) {
            return false
      }

      // Check for GIF signatures: GIF87a or GIF89a
      if (
            uint8Array.length >= 6 &&
            uint8Array[0] === 0x47 &&
            uint8Array[1] === 0x49 &&
            uint8Array[2] === 0x46 &&
            uint8Array[3] === 0x38 &&
            (uint8Array[4] === 0x37 || uint8Array[4] === 0x39) &&
            uint8Array[5] === 0x61
      ) {
            return false
      }

      // Check for BMP signature: BM
      if (uint8Array.length >= 2 && uint8Array[0] === 0x42 && uint8Array[1] === 0x4d) {
            return false
      }

      // Check for WEBP signature: RIFF....WEBP
      if (
            uint8Array.length >= 12 &&
            uint8Array[0] === 0x52 &&
            uint8Array[1] === 0x49 &&
            uint8Array[2] === 0x46 &&
            uint8Array[3] === 0x46 &&
            uint8Array[8] === 0x57 &&
            uint8Array[9] === 0x45 &&
            uint8Array[10] === 0x42 &&
            uint8Array[11] === 0x50
      ) {
            return false
      }

      // Check for SVG signature: typically starts with <?xml or <svg
      // SVG is actually text-based (XML), but we might want to treat it as a binary format
      // depending on your application's needs
      if (uint8Array.length >= 5) {
            // Check for <?xml
            const possibleXml = uint8Array[0] === 0x3c && uint8Array[1] === 0x3f && uint8Array[2] === 0x78 && uint8Array[3] === 0x6d && uint8Array[4] === 0x6c

            // Check for <svg
            const possibleSvg = uint8Array.length >= 4 && uint8Array[0] === 0x3c && uint8Array[1] === 0x73 && uint8Array[2] === 0x76 && uint8Array[3] === 0x67

            // If SVG should be treated as binary, uncomment:
            if (possibleXml || possibleSvg) return false
      }

      // Check for TIFF signature: 49 49 2A 00 (little endian) or 4D 4D 00 2A (big endian)
      if (
            uint8Array.length >= 4 &&
            ((uint8Array[0] === 0x49 && uint8Array[1] === 0x49 && uint8Array[2] === 0x2a && uint8Array[3] === 0x00) ||
                  (uint8Array[0] === 0x4d && uint8Array[1] === 0x4d && uint8Array[2] === 0x00 && uint8Array[3] === 0x2a))
      ) {
            return false
      }

      // Check if the byte sequence looks like text
      // 1. Check for null bytes (usually not in text files)
      // 2. Check for high ratio of printable ASCII characters
      // 3. Check for high ratio of control characters

      // Check first 1000 bytes or the whole buffer, whichever is smaller
      const bytesToCheck = Math.min(1000, uint8Array.length)
      let textCharCount = 0
      let nullByteCount = 0
      let controlCharCount = 0

      for (let i = 0; i < bytesToCheck; i++) {
            const byte = uint8Array[i]

            // Count null bytes
            if (byte === 0) {
                  nullByteCount++
            }

            // Count control characters (0-8, 14-31, 127)
            // Exclude common whitespace (9-13: tab, LF, VT, FF, CR)
            if ((byte >= 0 && byte <= 8) || (byte >= 14 && byte <= 31) || byte === 127) {
                  controlCharCount++
            }

            // Count printable ASCII characters (32-126) plus common whitespace (9-13)
            if ((byte >= 32 && byte <= 126) || (byte >= 9 && byte <= 13)) {
                  textCharCount++
            }
      }

      // If more than 3% are null bytes, probably not text
      if (nullByteCount > bytesToCheck * 0.03) {
            return false
      }

      // If more than 10% are control characters (excluding whitespace), probably not text
      if (controlCharCount > bytesToCheck * 0.1) {
            return false
      }

      // If more than 85% are printable characters, probably text
      return textCharCount > bytesToCheck * 0.85
}

// More comprehensive function to check if a file is text-based
export const isTextFile = (file: File): boolean => {
      // Check by MIME type first (most reliable when available)
      if (file.type) {
            // Common text MIME types
            if (file.type.startsWith('text/')) return true

            // Text-based formats with application/ prefix
            if (/^application\/(json|xml|javascript|x-javascript|ecmascript|x-ecmascript|typescript|x-typescript|ld\+json|graphql|yaml|x-yaml|x-www-form-urlencoded)/.test(file.type)) {
                  return true
            }

            // Some markdown types
            if (/^text\/(markdown|x-markdown|md)/.test(file.type)) {
                  return true
            }
      }

      // Check by file extension as fallback
      const textExtensions = [
            // Programming languages
            '.txt',
            '.csv',
            '.json',
            '.xml',
            '.html',
            '.htm',
            '.css',
            '.js',
            '.jsx',
            '.ts',
            '.tsx',
            '.md',
            '.markdown',
            '.rs',
            '.py',
            '.rb',
            '.c',
            '.cpp',
            '.h',
            '.hpp',
            '.cs',
            '.java',
            '.kt',
            '.kts',
            '.swift',
            '.php',
            '.go',
            '.pl',
            '.pm',
            '.lua',
            '.sh',
            '.bash',
            '.zsh',
            '.sql',
            '.r',
            '.dart',
            '.scala',
            '.groovy',
            '.m',
            '.mm',

            // Config files
            '.yml',
            '.yaml',
            '.toml',
            '.ini',
            '.cfg',
            '.conf',
            '.config',
            '.properties',
            '.env',
            '.gitignore',
            '.gitattributes',
            '.editorconfig',
            '.babelrc',
            '.eslintrc',
            '.prettierrc',
            '.stylelintrc',
            '.npmrc',
            '.yarnrc',

            // Documentation
            '.rst',
            '.adoc',
            '.tex',
            '.latex',
            '.rtf',
            '.log',
            '.svg',

            // Data formats
            '.csv',
            '.tsv',
            '.plist',
            '.graphql',
            '.gql',
      ]

      return textExtensions.some(ext => file.name.toLowerCase().endsWith(ext))
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
export const readFileContent = async (file: File): Promise<string | Uint8Array> => {
      if (isTextFile(file)) {
            // If it's a text file, read as text
            return await readFileAsText(file)
      } else {
            //   ("binary data....")
            // Otherwise for binary files, read as ArrayBuffer
            const res = await readFileAsArrayBuffer(file)
            return new Uint8Array(res)
      }
}

// Helper function to convert Blob to Data URL
export const blobToDataURL = (blob: Blob): Promise<string> => {
      return new Promise((resolve, reject) => {
            const reader = new FileReader()
            reader.onload = () => {
                  resolve(reader.result as string)
            }
            reader.onerror = reject
            reader.readAsDataURL(blob)
      })
}
export function timeStampToDateObject(timestamp: string): Date | null {
      try {
            // Extract parts using substring
            const year = parseInt(timestamp.substring(0, 4))
            const month = parseInt(timestamp.substring(4, 6)) - 1 // Month is 0-indexed (0=Jan)
            const day = parseInt(timestamp.substring(6, 8))
            const hour = parseInt(timestamp.substring(8, 10))
            const minute = parseInt(timestamp.substring(10, 12))
            const second = parseInt(timestamp.substring(12, 14))

            // Create Date object
            const dateObj = new Date(year, month, day, hour, minute, second)
            return dateObj
      } catch (e) {
            (`💣💣 Error occured parsing timestamp to date`)
            return null
      }
}

// Function to convert data URL to File object
export const dataURLToFile = (dataUrl: string, filename: string): File => {
      // Split the data URL to get the MIME type and base64 data
      const arr = dataUrl.split(',')
      const mime = arr[0].match(/:(.*?);/)?.[1] || 'image/png'
      const bstr = atob(arr[1])

      // Convert base64 to binary
      let n = bstr.length
      const u8arr = new Uint8Array(n)

      while (n--) {
            u8arr[n] = bstr.charCodeAt(n)
      }

      // Create and return File object
      return new File([u8arr], filename, { type: mime })
}

// Function to convert data URL to Uint8Array
export const dataURLToUint8Array = (dataUrl: string): Uint8Array => {
      // Extract the base64 data
      const base64Data = dataUrl.split(',')[1]
      // Convert base64 to binary string
      const binaryString = atob(base64Data)

      // Create Uint8Array from binary string
      const bytes = new Uint8Array(binaryString.length)
      for (let i = 0; i < binaryString.length; i++) {
            bytes[i] = binaryString.charCodeAt(i)
      }

      return bytes
}

export function formatUnixTimestamp(timestamp: number) {
      // Convert seconds to milliseconds (JavaScript Date expects ms)
      const date = new Date(timestamp * 1000);

      // Use toLocaleString with options for desired format
      return date.toLocaleString('en-US', {
            month: 'long',
            day: 'numeric',
            year: 'numeric',
            hour: 'numeric',
            minute: '2-digit',
            second: '2-digit',
            hour12: true
      }).replace(',', ' at');
}

export function timeToHumanFriendly(timestamp: string | undefined, showFull: boolean = false, timezone?: string): string {
      if (!timestamp) {
            return '-'
      }

      let date: Date

      // Check if timestamp is in ISO 8601 format (contains 'T' and 'Z' or timezone info)
      if (timestamp.includes('T') || timestamp.includes('Z') || timestamp.includes('+') || timestamp.includes('-')) {
            // Handle ISO 8601 format (e.g., "2025-07-16T11:54:15.216Z")
            date = new Date(timestamp)

            // Check if the date is valid
            if (isNaN(date.getTime())) {
                  return 'Invalid Date'
            }
      } else {
            // Handle custom timestamp format (e.g., "20250716115415")
            if (timestamp.length < 14) {
                  return 'Invalid Date'
            }

            // Extract the date components
            const year = timestamp.substring(0, 4)
            const month = Number(timestamp.substring(4, 6)) - 1 // Months are zero-indexed in JS
            const day = timestamp.substring(6, 8)
            const hours = timestamp.substring(8, 10)
            const minutes = timestamp.substring(10, 12)
            const seconds = timestamp.substring(12, 14)

            // Create a new Date object in UTC
            date = new Date(Date.UTC(Number(year), month, Number(day), Number(hours), Number(minutes), Number(seconds)))

            // Check if the date is valid
            if (isNaN(date.getTime())) {
                  return 'Invalid Date'
            }
      }

      // Auto-detect user's local timezone if none provided
      const defaultTimezone = timezone || Intl.DateTimeFormat().resolvedOptions().timeZone

      // Timezone mapping for common East African timezones
      const timezoneMap: { [key: string]: string } = {
            // African timezones
            EAT: 'Africa/Nairobi', // East Africa Time (UTC+3)
            CAT: 'Africa/Harare', // Central Africa Time (UTC+2)
            WAT: 'Africa/Lagos', // West Africa Time (UTC+1)

            // European timezones
            CET: 'Europe/Berlin', // Central European Time (UTC+1)
            CEST: 'Europe/Berlin', // Central European Summer Time (UTC+2)
            GMT: 'GMT', // Greenwich Mean Time (UTC+0)
            BST: 'Europe/London', // British Summer Time (UTC+1)
            EET: 'Europe/Athens', // Eastern European Time (UTC+2)

            // North American timezones
            PST: 'America/Los_Angeles', // Pacific Standard Time (UTC-8)
            PDT: 'America/Los_Angeles', // Pacific Daylight Time (UTC-7)
            MST: 'America/Denver', // Mountain Standard Time (UTC-7)
            MDT: 'America/Denver', // Mountain Daylight Time (UTC-6)
            CST: 'America/Chicago', // Central Standard Time (UTC-6)
            CDT: 'America/Chicago', // Central Daylight Time (UTC-5)
            EST: 'America/New_York', // Eastern Standard Time (UTC-5)
            EDT: 'America/New_York', // Eastern Daylight Time (UTC-4)

            // Asian timezones
            JST: 'Asia/Tokyo', // Japan Standard Time (UTC+9)
            KST: 'Asia/Seoul', // Korea Standard Time (UTC+9)
            CST_CHINA: 'Asia/Shanghai', // China Standard Time (UTC+8)
            IST: 'Asia/Kolkata', // India Standard Time (UTC+5:30)
            GST: 'Asia/Dubai', // Gulf Standard Time (UTC+4)

            // Australian timezones
            AEST: 'Australia/Sydney', // Australian Eastern Standard Time (UTC+10)
            AWST: 'Australia/Perth', // Australian Western Standard Time (UTC+8)

            // Other common
            UTC: 'UTC',
            NZST: 'Pacific/Auckland', // New Zealand Standard Time (UTC+12)
            // Add more mappings as needed
      }

      // Use the mapped timezone or the provided timezone directly
      const resolvedTimezone = timezoneMap[defaultTimezone.toUpperCase()] || defaultTimezone

      // Format options
      const dateOptions: Intl.DateTimeFormatOptions = {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            timeZone: resolvedTimezone,
      }

      const fullOptions: Intl.DateTimeFormatOptions = {
            ...dateOptions,
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit',
            hour12: false,
            timeZone: resolvedTimezone,
      }

      try {
            // Return formatted string based on showFull
            return date.toLocaleDateString('en-US', showFull ? fullOptions : dateOptions)
      } catch (error) {
            // Fallback to user's local timezone if specified timezone is invalid
            console.warn(`Invalid timezone: ${defaultTimezone}, falling back to local timezone`)
            const userTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone
            const fallbackOptions = showFull ? { ...fullOptions, timeZone: userTimezone } : { ...dateOptions, timeZone: userTimezone }
            return date.toLocaleDateString('en-US', fallbackOptions)
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

export function getFileNameWithDeepLinking(aquaTree: AquaTree, revisionHash: string, fileObject: FileObject[]): string {
      const revision = aquaTree.revisions[revisionHash]

      if (revision.previous_verification_hash.length == 0) {
            return aquaTree.file_index[revisionHash]
      }
      if (revision.revision_type == 'link') {
            const isDeepLink = isDeepLinkRevision(aquaTree, revisionHash)
            if (isDeepLink == null) {
                  return ERROR_UKNOWN
            }
            if (isDeepLink) {
                  // before returning deep link we traverse the current  aqua tree
                  const aquaTreeFiles = fileObject.filter(file => isAquaTree(file.fileContent))
                  if (aquaTreeFiles.length > 0) {
                        const aquaTreePick = aquaTreeFiles.find(e => {
                              const tree: AquaTree = e.fileContent as AquaTree
                              const allHashes = Object.keys(tree.revisions)
                              return allHashes.includes(revision.link_verification_hashes![0]!)
                        })
                        if (aquaTreePick) {
                              const tree: AquaTree = aquaTreePick.fileContent as AquaTree
                              const genesisHash = getGenesisHash(tree)
                              if (genesisHash) {
                                    const fileName = tree.file_index[genesisHash]
                                    if (fileName) {
                                          return fileName
                                    }
                              }
                        }
                  }

                  return ERROR_TEXT
            } else {
                  return fetchLinkedFileName(aquaTree, revision)
            }
      }

      return ERROR_TEXT
}
export function isDeepLinkRevision(aquaTree: AquaTree, revisionHash: string): boolean | null {
      const revisionData = aquaTree.revisions[revisionHash]

      if (revisionData) {
            const indexData = aquaTree.file_index[revisionData.link_verification_hashes![0]]
            if (indexData) {
                  return false
            }
            return true
      }
      return null
}

export function fetchLinkedFileName(aquaTree: AquaTree, revision: Revision): string {
      if (revision.link_verification_hashes == undefined) {
            return ERROR_TEXT
      }
      const lonkedHash = revision.link_verification_hashes![0]
      // (`fetchLinkedFileName ${lonkedHash}`)
      if (lonkedHash == undefined) {
            // (`fetchLinkedFileName ${lonkedHash} not found in link_verification_hashes`)
            return ERROR_TEXT
      }
      const name = aquaTree.file_index[lonkedHash]
      if (name == undefined) {
            // (`fetchLinkedFileName ${lonkedHash} not found in file_index`)
            return ERROR_TEXT
      }
      return name
}

export function displayTime(input: number | string): string {
      // Handle number input
      if (typeof input === 'number') {
            // Convert to string for consistent processing
            input = input.toString()
      }

      // Handle string input
      if (typeof input === 'string') {
            // Check if string contains only numbers
            if (/^\d+$/.test(input)) {
                  // If it's a 14-digit number (YYYYMMDDhhmmss format)
                  if (input.length === 14) {
                        const year = input.substring(0, 4)
                        const month = parseInt(input.substring(4, 6)) - 1 // JS months are 0-indexed
                        const day = input.substring(6, 8)
                        const hour = input.substring(8, 10)
                        const minute = input.substring(10, 12)
                        const second = input.substring(12, 14)

                        const date = new Date(parseInt(year), month, parseInt(day), parseInt(hour), parseInt(minute), parseInt(second))

                        return date.toLocaleString() // Returns format like "Thu Mar 20 2025"
                  }
                  // Regular Unix timestamp (seconds since epoch)
                  else {
                        const date = new Date(parseInt(input, 10) * 1000) // Convert seconds to milliseconds
                        return date.toLocaleString()
                  }
            } else {
                  // String contains non-numeric characters, just display it
                  return input
            }
      }

      // Handle invalid input
      return 'Invalid input'
}

// export function getFileHashFromUrl(url: string): string {
//     // Split the URL by '/' and get the last non-empty element
//     const parts = url.split('/').filter(part => part.length > 0);
//     return parts[parts.length - 1];
//   }
export const getFileHashFromUrl = (url: string) => {
      // Using a regular expression to match the file ID
      const regex = /\/files\/([a-f0-9]+)/
      const match = url.match(regex)

      // Return the captured group if found, otherwise empty string
      return match ? match[1] : ''
}

export const getFileName = (aquaTree: AquaTree) => {
      const hashes = Object.keys(aquaTree!.revisions)
      let fileIndexhash = ''
      for (const item of hashes) {
            const revision = aquaTree!.revisions[item]
            if (revision.previous_verification_hash == null || revision.previous_verification_hash == '') {
                  fileIndexhash = item
                  break
            }
      }

      const name = aquaTree!.file_index[fileIndexhash]
      //  (`getFileName ${name} from hash ${fileIndexhash}`)
      return name
}

export function extractFileHash(url: string): string | undefined {
      try {
            const urlObj = new URL(url)
            const parts = urlObj.pathname.split('/')
            return parts.pop() // Get the last part of the URL path
      } catch (error) {
            console.error('Invalid URL:', error)
            return undefined
      }
}

/**
 * Estimates the size in bytes that a string would occupy if saved to a file
 * Uses UTF-8 encoding rules where ASCII chars take 1 byte and others take 2-4 bytes
 * @param str Input string to estimate size for
 * @returns Estimated size in bytes
 */
export function estimateStringFileSize(str: string): number {
      if (!str) return 0

      return str.split('').reduce((acc, char) => {
            const code = char.charCodeAt(0)
            // UTF-8 encoding rules:
            // 1 byte for ASCII (0-127)
            // 2 bytes for extended ASCII (128-2047)
            // 3 bytes for most other characters (2048-65535)
            // 4 bytes for remaining Unicode (65536+)
            if (code < 128) return acc + 1
            if (code < 2048) return acc + 2
            if (code < 65536) return acc + 3
            return acc + 4
      }, 0)
}

export const getLastRevisionVerificationHash = (aquaTree: AquaTree) => {
      const orderedRevisions = OrderRevisionInAquaTree(aquaTree)
      const revisonHashes = Object.keys(orderedRevisions.revisions)
      const hash = revisonHashes[revisonHashes.length - 1]
      return hash
}

export function filterFilesByType(files: ApiFileInfo[], fileType: string): ApiFileInfo[] {
      // "image" | "document" | "music" | "video"

      switch (fileType) {
            case 'image':
                  return files.filter(file => {
                        return imageTypes.includes(getFileExtension(file.fileObject[0].fileName).replace(/\s+/g, ''))
                  })
            case 'document':
                  return files.filter(file => documentTypes.includes(getFileExtension(file.fileObject[0].fileName).replace(/\s+/g, '')))
            case 'music':
                  return files.filter(file => musicTypes.includes(getFileExtension(file.fileObject[0].fileName).replace(/\s+/g, '')))
            case 'video':
                  return files.filter(file => videoTypes.includes(getFileExtension(file.fileObject[0].fileName).replace(/\s+/g, '')))
            default:
                  return []
      }
}

export function humanReadableFileSize(size: number): string {
      const units = ['Bytes', 'KB', 'MB', 'GB', 'TB', 'PB']
      let index = 0

      // Convert size in bytes to the appropriate unit
      while (size >= 1024 && index < units.length - 1) {
            size /= 1024
            index++
      }

      // Return the size formatted with 2 decimal places, along with the appropriate unit
      return `${size.toFixed(2)} ${units[index]}`
}

export function readJsonFile(file: File): Promise<any> {
      return new Promise((resolve, reject) => {
            if (file.type !== 'application/json') {
                  reject(new Error('The file is not a JSON file.'))
                  return
            }

            const reader = new FileReader()
            reader.onload = () => {
                  try {
                        const json = JSON.parse(reader.result as string)
                        resolve(json)
                  } catch (error) {
                        reject(new Error('Error parsing JSON content.'))
                  }
            }

            reader.onerror = () => {
                  reject(new Error('Error reading the file.'))
            }

            reader.readAsText(file)
      })
}

export const isJSONFile = (fileName: string) => {
      return fileName.trim().toLowerCase().endsWith('.json')
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

export const isZipFile = (fileName: string) => {
      return fileName.trim().toLowerCase().endsWith('.zip')
}
// export function generateAvatar(_address: string) {
//     const address = ethers.getAddress(_address)
//     const generator = new AvatarGenerator()
//     return generator.generateRandomAvatar(address)
// }

// Utility function to determine file type and potentially rename

export const determineFileType = async (file: File): Promise<File> => {
      // If file already has an extension, return as is
      if (file.name.includes('.')) return file

      try {
            // Attempt to read the file contents
            const arrayBuffer = await file.arrayBuffer()
            const uint8Array = new Uint8Array(arrayBuffer)

            // Advanced MIME type detection using file signatures
            let extension = ''
            let detectedMimeType = ''

            // Helper function to check bytes at specific positions
            const checkBytes = (positions: number[], values: number[]): boolean => {
                  return values.every((value, index) => uint8Array[positions[index]] === value)
            }

            // Helper function to check string at position
            const checkString = (position: number, str: string): boolean => {
                  const bytes = new TextEncoder().encode(str)
                  return bytes.every((byte, index) => uint8Array[position + index] === byte)
            }

            // PDF signature
            if (checkBytes([0, 1, 2, 3], [0x25, 0x50, 0x44, 0x46])) {
                  extension = '.pdf'
                  detectedMimeType = 'application/pdf'
            }
            // PNG signature
            else if (checkBytes([0, 1, 2, 3], [0x89, 0x50, 0x4e, 0x47])) {
                  extension = '.png'
                  detectedMimeType = 'image/png'
            }
            // JPEG signature
            else if (checkBytes([0, 1, 2], [0xff, 0xd8, 0xff])) {
                  extension = '.jpg'
                  detectedMimeType = 'image/jpeg'
            }
            // HEIC/HEIF signatures
            else if (uint8Array.length >= 12 &&
                  checkBytes([0, 1, 2, 3], [0x00, 0x00, 0x00, 0x18]) &&
                  checkString(4, 'ftyp') &&
                  (checkString(8, 'heic') || checkString(8, 'heix'))) {
                  extension = '.heic'
                  detectedMimeType = 'image/heic'
            }
            // Alternative HEIC signature
            else if (uint8Array.length >= 12 &&
                  checkString(4, 'ftyp') &&
                  (checkString(8, 'heic') || checkString(8, 'heix') || checkString(8, 'heim') || checkString(8, 'heis'))) {
                  extension = '.heic'
                  detectedMimeType = 'image/heic'
            }
            // HEIF signature
            else if (uint8Array.length >= 12 &&
                  checkString(4, 'ftyp') &&
                  (checkString(8, 'mif1') || checkString(8, 'heif'))) {
                  extension = '.heif'
                  detectedMimeType = 'image/heif'
            }
            // GIF signatures
            else if ((checkString(0, 'GIF87a') || checkString(0, 'GIF89a'))) {
                  extension = '.gif'
                  detectedMimeType = 'image/gif'
            }
            // WebP signature
            else if (checkString(0, 'RIFF') && uint8Array.length >= 12 && checkString(8, 'WEBP')) {
                  extension = '.webp'
                  detectedMimeType = 'image/webp'
            }
            // BMP signature
            else if (checkBytes([0, 1], [0x42, 0x4d])) {
                  extension = '.bmp'
                  detectedMimeType = 'image/bmp'
            }
            // TIFF signatures
            else if ((checkBytes([0, 1, 2, 3], [0x49, 0x49, 0x2a, 0x00]) ||
                  checkBytes([0, 1, 2, 3], [0x4d, 0x4d, 0x00, 0x2a]))) {
                  extension = '.tiff'
                  detectedMimeType = 'image/tiff'
            }
            // ICO signature
            else if (checkBytes([0, 1, 2, 3], [0x00, 0x00, 0x01, 0x00])) {
                  extension = '.ico'
                  detectedMimeType = 'image/x-icon'
            }
            // SVG signature (XML-based)
            else if (checkString(0, '<?xml') || checkString(0, '<svg')) {
                  try {
                        const text = new TextDecoder().decode(uint8Array)
                        if (text.includes('<svg') || text.includes('xmlns="http://www.w3.org/2000/svg"')) {
                              extension = '.svg'
                              detectedMimeType = 'image/svg+xml'
                        }
                  } catch {
                        // Not SVG
                  }
            }
            // MP4 signatures
            else if (uint8Array.length >= 12 &&
                  checkString(4, 'ftyp') &&
                  (checkString(8, 'mp41') || checkString(8, 'mp42') || checkString(8, 'isom') ||
                        checkString(8, 'M4V ') || checkString(8, 'M4A '))) {
                  extension = '.mp4'
                  detectedMimeType = 'video/mp4'
            }
            // AVI signature
            else if (checkString(0, 'RIFF') && uint8Array.length >= 12 && checkString(8, 'AVI ')) {
                  extension = '.avi'
                  detectedMimeType = 'video/x-msvideo'
            }
            // MOV signature (QuickTime)
            else if (uint8Array.length >= 12 &&
                  checkString(4, 'ftyp') &&
                  checkString(8, 'qt  ')) {
                  extension = '.mov'
                  detectedMimeType = 'video/quicktime'
            }
            // MP3 signature
            else if (checkBytes([0, 1], [0xff, 0xfb]) || checkString(0, 'ID3')) {
                  extension = '.mp3'
                  detectedMimeType = 'audio/mpeg'
            }
            // WAV signature
            else if (checkString(0, 'RIFF') && uint8Array.length >= 12 && checkString(8, 'WAVE')) {
                  extension = '.wav'
                  detectedMimeType = 'audio/wav'
            }
            // OGG signature
            else if (checkString(0, 'OggS')) {
                  extension = '.ogg'
                  detectedMimeType = 'audio/ogg'
            }
            // ZIP signature (also covers XLSX, DOCX, etc.)
            else if (checkBytes([0, 1, 2, 3], [0x50, 0x4b, 0x03, 0x04]) ||
                  checkBytes([0, 1, 2, 3], [0x50, 0x4b, 0x05, 0x06]) ||
                  checkBytes([0, 1, 2, 3], [0x50, 0x4b, 0x07, 0x08])) {
                  // Need to check if it's a specific Office format
                  try {
                        const text = new TextDecoder().decode(uint8Array.slice(0, 1024))
                        if (text.includes('word/')) {
                              extension = '.docx'
                              detectedMimeType = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
                        } else if (text.includes('xl/')) {
                              extension = '.xlsx'
                              detectedMimeType = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
                        } else if (text.includes('ppt/')) {
                              extension = '.pptx'
                              detectedMimeType = 'application/vnd.openxmlformats-officedocument.presentationml.presentation'
                        } else {
                              extension = '.zip'
                              detectedMimeType = 'application/zip'
                        }
                  } catch {
                        extension = '.zip'
                        detectedMimeType = 'application/zip'
                  }
            }
            // RAR signature
            else if (checkString(0, 'Rar!')) {
                  extension = '.rar'
                  detectedMimeType = 'application/vnd.rar'
            }
            // 7z signature
            else if (checkBytes([0, 1, 2, 3, 4, 5], [0x37, 0x7a, 0xbc, 0xaf, 0x27, 0x1c])) {
                  extension = '.7z'
                  detectedMimeType = 'application/x-7z-compressed'
            }
            // TAR signature
            else if (uint8Array.length >= 262 &&
                  checkString(257, 'ustar')) {
                  extension = '.tar'
                  detectedMimeType = 'application/x-tar'
            }
            // GZIP signature
            else if (checkBytes([0, 1, 2], [0x1f, 0x8b, 0x08])) {
                  extension = '.gz'
                  detectedMimeType = 'application/gzip'
            }
            // MS Office legacy formats
            else if (checkBytes([0, 1, 2, 3, 4, 5, 6, 7], [0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1])) {
                  // Could be DOC, XLS, or PPT - default to DOC
                  extension = '.doc'
                  detectedMimeType = 'application/msword'
            }
            // RTF signature
            else if (checkString(0, '{\\rtf1')) {
                  extension = '.rtf'
                  detectedMimeType = 'application/rtf'
            }
            // XML signature
            else if (checkString(0, '<?xml')) {
                  extension = '.xml'
                  detectedMimeType = 'application/xml'
            }
            // HTML signature
            else if (checkString(0, '<!DOCTYPE html') || checkString(0, '<html') || checkString(0, '<!doctype html')) {
                  extension = '.html'
                  detectedMimeType = 'text/html'
            }
            // JSON signature (looks like a JSON object or array start)
            else if (uint8Array[0] === 0x7b || uint8Array[0] === 0x5b) {
                  try {
                        // Attempt to parse as JSON
                        const jsonTest = new TextDecoder().decode(uint8Array)
                        JSON.parse(jsonTest)
                        extension = '.json'
                        detectedMimeType = 'application/json'
                  } catch {
                        // Not a valid JSON
                  }
            }
            // CSS signature
            else if (uint8Array.length > 0) {
                  try {
                        const text = new TextDecoder().decode(uint8Array.slice(0, 1024))
                        if (/^[\s]*[.#@]/.test(text) || text.includes('{') && text.includes('}') && text.includes(':')) {
                              extension = '.css'
                              detectedMimeType = 'text/css'
                        }
                  } catch {
                        // Not CSS
                  }
            }
            // JavaScript signature
            else if (uint8Array.length > 0) {
                  try {
                        const text = new TextDecoder().decode(uint8Array.slice(0, 1024))
                        if (text.includes('function') || text.includes('var ') || text.includes('const ') ||
                              text.includes('let ') || text.includes('=>') || text.includes('')) {
                              extension = '.js'
                              detectedMimeType = 'application/javascript'
                        }
                  } catch {
                        // Not JavaScript
                  }
            }

            // If still no extension detected, try text-based detection
            if (!extension) {
                  try {
                        const text = new TextDecoder().decode(uint8Array)
                        // Check if content looks like CSV (contains commas or semicolons)
                        if (/[,;]/.test(text) && text.split('\n').length > 1) {
                              extension = '.csv'
                              detectedMimeType = 'text/csv'
                        }
                        // Check if it's a tab-separated file
                        else if (/\t/.test(text) && text.split('\n').length > 1) {
                              extension = '.tsv'
                              detectedMimeType = 'text/tab-separated-values'
                        }
                        // Check if it looks like code
                        else if (text.includes('#include') || text.includes('import ') || text.includes('from ')) {
                              extension = '.txt'
                              detectedMimeType = 'text/plain'
                        }
                        // Default to text
                        else {
                              extension = '.txt'
                              detectedMimeType = 'text/plain'
                        }
                  } catch {
                        extension = '.bin'
                        detectedMimeType = 'application/octet-stream'
                  }
            }

            // If no extension was detected, fall back to original file type or generic
            if (!extension) {
                  extension = file.type ? `.${file.type.split('/').pop()}` : '.bin'
                  detectedMimeType = file.type || 'application/octet-stream'
            }

            // Create a new file with the determined extension
            const renamedFile = new File([uint8Array], `${file.name}${extension}`, {
                  type: detectedMimeType,
                  lastModified: file.lastModified,
            })

            return renamedFile
      } catch (error) {
            console.error('Error determining file type:', error)

            // Fallback: use file type or add a generic extension
            const fallbackExtension = file.type ? `.${file.type.split('/').pop()}` : file.name.includes('.') ? '' : '.bin'

            const fallbackFile = new File([await file.arrayBuffer()], `${file.name}${fallbackExtension}`, {
                  type: file.type || 'application/octet-stream',
                  lastModified: file.lastModified,
            })

            return fallbackFile
      }
}
// export const determineFileType = async (file: File): Promise<File> => {
//       // If file already has an extension, return as is
//       if (file.name.includes('.')) return file

//       try {
//             // Attempt to read the file contents
//             const arrayBuffer = await file.arrayBuffer()
//             const uint8Array = new Uint8Array(arrayBuffer)

//             // Advanced MIME type detection using file signatures
//             let extension = ''
//             let detectedMimeType = ''

//             // PDF signature
//             if (uint8Array[0] === 0x25 && uint8Array[1] === 0x50 && uint8Array[2] === 0x44 && uint8Array[3] === 0x46) {
//                   extension = '.pdf'
//                   detectedMimeType = 'application/pdf'
//             }
//             // PNG signature
//             else if (uint8Array[0] === 0x89 && uint8Array[1] === 0x50 && uint8Array[2] === 0x4e && uint8Array[3] === 0x47) {
//                   extension = '.png'
//                   detectedMimeType = 'image/png'
//             }
//             // JPEG signature
//             else if (uint8Array[0] === 0xff && uint8Array[1] === 0xd8 && uint8Array[2] === 0xff) {
//                   extension = '.jpg'
//                   detectedMimeType = 'image/jpeg'
//             }
//             // JSON signature (looks like a JSON object or array start)
//             else if (uint8Array[0] === 0x7b || uint8Array[0] === 0x5b) {
//                   try {
//                         // Attempt to parse as JSON
//                         const jsonTest = new TextDecoder().decode(uint8Array)
//                         JSON.parse(jsonTest)
//                         extension = '.json'
//                         detectedMimeType = 'application/json'
//                   } catch {
//                         // Not a valid JSON
//                   }
//             }
//             // Excel XLSX signature
//             else if (uint8Array[0] === 0x50 && uint8Array[1] === 0x4b && uint8Array[2] === 0x03 && uint8Array[3] === 0x04) {
//                   extension = '.xlsx'
//                   detectedMimeType = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
//             }
//             // CSV/Text detection (try to parse as CSV or check for text-like content)
//             else {
//                   try {
//                         const text = new TextDecoder().decode(uint8Array)
//                         // Check if content looks like CSV (contains commas or semicolons)
//                         if (/[,;]/.test(text)) {
//                               extension = '.csv'
//                               detectedMimeType = 'text/csv'
//                         } else {
//                               extension = '.txt'
//                               detectedMimeType = 'text/plain'
//                         }
//                   } catch {
//                         extension = '.bin'
//                         detectedMimeType = 'application/octet-stream'
//                   }
//             }

//             // If no extension was detected, fall back to original file type or generic
//             if (!extension) {
//                   extension = file.type ? `.${file.type.split('/').pop()}` : '.bin'
//                   detectedMimeType = file.type || 'application/octet-stream'
//             }

//             // Create a new file with the determined extension
//             const renamedFile = new File([uint8Array], `${file.name}${extension}`, {
//                   type: detectedMimeType,
//                   lastModified: file.lastModified,
//             })

//             return renamedFile
//       } catch (error) {
//             console.error('Error determining file type:', error)

//             // Fallback: use file type or add a generic extension
//             const fallbackExtension = file.type ? `.${file.type.split('/').pop()}` : file.name.includes('.') ? '' : '.bin'

//             const fallbackFile = new File([await file.arrayBuffer()], `${file.name}${fallbackExtension}`, {
//                   type: file.type || 'application/octet-stream',
//                   lastModified: file.lastModified,
//             })

//             return fallbackFile
//       }
// }

export function getFileExtension(fileName: string): string {
      // If the file name contains a dot, extract the extension

      const extMatch = fileName.match(/\.([0-9a-z]+)$/i)
      if (extMatch) {
            return extMatch[1]
      }

      //todo fix me
      //  _fileContent :  string | ArrayBuffer | null
      // if (fileContent instanceof File || fileContent instanceof Blob) {
      //     return new Promise((resolve, reject) => {
      //         const reader = new FileReader();
      //         reader.onloadend = function(event) {
      //             const uint = new Uint8Array(event.target.result);
      //             const hex = uint.slice(0, 4).reduce((acc, byte) => acc + byte.toString(16).padStart(2, '0'), '');
      //             resolve(getExtensionFromBytes(hex) || getExtensionFromMime(file.type));
      //         };
      //         reader.onerror = reject;
      //         reader.readAsArrayBuffer(fileContent.slice(0, 4));
      //     });
      // }

      return ''
}

// function getExtensionFromMime(mimeType: string | number) {
//     const mimeToExt = {
//         'image/jpeg': 'jpg',
//         'image/png': 'png',
//         'image/gif': 'gif',
//         'application/pdf': 'pdf',
//         'text/plain': 'txt',
//         'application/zip': 'zip'
//     };
//     return mimeToExt[mimeType] || null;
// }

// function getExtensionFromBytes(hex: string) {
//     const magicNumbers = {
//         'ffd8ff': 'jpg',
//         '89504e47': 'png',
//         '47494638': 'gif',
//         '25504446': 'pdf',
//         '504b0304': 'zip'
//     };
//     for (const [magic, ext] of Object.entries(magicNumbers)) {
//         if (hex.startsWith(magic)) {
//             return ext;
//         }
//     }
//     return null;
// }

// const b64toBlob = (b64Data: string, contentType = "", sliceSize = 512) => {
//     const byteCharacters = atob(b64Data);
//     const byteArrays = [];

//     for (let offset = 0; offset < byteCharacters.length; offset += sliceSize) {
//         const slice = byteCharacters.slice(offset, offset + sliceSize);

//         const byteNumbers = new Array(slice.length);
//         for (let i = 0; i < slice.length; i++) {
//             byteNumbers[i] = slice.charCodeAt(i);
//         }

//         const byteArray = new Uint8Array(byteNumbers);
//         byteArrays.push(byteArray);
//     }

//     const blob = new Blob(byteArrays, { type: contentType });
//     return blob;
// };

export function fileType(fileName: string): string {
      const extension = getFileExtension(fileName)
      if (imageTypes.includes(extension.replace(/\s+/g, ''))) {
            return 'Image'
      } else if (documentTypes.includes(extension.replace(/\s+/g, ''))) {
            return 'Document'
      } else if (musicTypes.includes(extension.replace(/\s+/g, ''))) {
            return 'Music'
      } else if (videoTypes.includes(extension.replace(/\s+/g, ''))) {
            return 'Video'
      } else {
            return 'unknown'
      }
}

// function detectExtension(extensionId: string) {
//     return new Promise((resolve) => {
//       // Try to access the extension's global object
//       if (window[`chrome_${extensionId}`] ||
//           (window.chrome && window.chrome.runtime && window.chrome.runtime.id === extensionId)) {
//         resolve(true);
//       }

//       // Alternative method using runtime messaging
//       try {
//         chrome.runtime.sendMessage(extensionId, { type: 'ping' }, (response: any) => {
//           resolve(!!response);
//         });
//       } catch (error) {
//         resolve(false);
//       }
//     });
//   }

export function encodeFileToBase64(file: File): Promise<string> {
      return new Promise((resolve, reject) => {
            const reader = new FileReader()
            reader.readAsDataURL(file)
            reader.onload = () => resolve(reader.result as string)
            reader.onerror = error => reject(error)
      })
}

export function generateAvatar(seed: string, size = 200) {
      const svg = jdenticon.toSvg(seed, size)
      return `data:image/svg+xml;base64,${btoa(svg)}`
}

// export function ensureDomainUrlHasSSL(actualUrlToFetch: string): string {
//     let url = actualUrlToFetch
//     // check if the file hash exist
//     // (`==URL Data before ${actualUrlToFetch}`)
// if (actualUrlToFetch.includes("inblock.io")) {
//     if (!actualUrlToFetch.includes("https")) {
//         url = actualUrlToFetch.replace("http", "https")
//     }
// }

//     if(actualUrlToFetch.includes("https://0.0.0.0:0")){
//         url = actualUrlToFetch.replace("https://0.0.0.0:0", "http://localhost:3000")
//     }

//     // (`==URL Data after ${actualUrlToFetch}`)
//     return url
// }

export function convertToWebsocketUrl(actualUrlToFetch: string): string {
      // Step 1: Ensure SSL if needed
      const validHttpAndDomain = ensureDomainUrlHasSSL(actualUrlToFetch)

      // Step 2: Convert protocol from http(s) to ws(s)
      if (validHttpAndDomain.startsWith('https://')) {
            return validHttpAndDomain.replace('https://', 'wss://')
      } else if (validHttpAndDomain.startsWith('http://')) {
            return validHttpAndDomain.replace('http://', 'ws://')
      }

      // If no recognizable protocol is found, assume secure websocket as fallback
      return 'wss://' + validHttpAndDomain
}

export function ensureDomainUrlHasSSL(url: string): string {
      const windowHost = typeof window !== 'undefined' ? window.location.origin : '';
      const isWindowLocalhost = windowHost.includes('localhost') || windowHost.includes('127.0.0.1');
      const isUrlLocalhost = url.includes('localhost') || url.includes('0.0.0.0') || url.includes('127.0.0.1');

      // If we're on a production domain but the URL points to localhost/0.0.0.0,
      // transform the URL to use the production API
      if (isUrlLocalhost && !isWindowLocalhost && windowHost) {
            let apiHost = '';

            // Determine the API host based on the current window host
            if (windowHost === 'https://dev.inblock.io') {
                  apiHost = 'https://dev-api.inblock.io';
            } else if (windowHost === 'https://aquafier.inblock.io') {
                  apiHost = 'https://aquafier-api.inblock.io';
            } else {
                  // Extract subdomain and create API host (e.g., https://foo.inblock.io -> https://foo-api.inblock.io)
                  const match = windowHost.match(/https?:\/\/([^.]+)\.(.*)/);
                  if (match) {
                        const subdomain = match[1];
                        const domain = match[2];
                        apiHost = `https://${subdomain}-api.${domain}`;
                  }
            }

            if (apiHost) {
                  // Extract the path from the original URL (exclude "/" as it's the default)
                  let path = '';
                  try {
                        const urlObj = new URL(url);
                        // Only include path if it's not just "/"
                        if (urlObj.pathname !== '/') {
                              path = urlObj.pathname;
                        }
                        path += urlObj.search;
                  } catch {
                        // Fallback: extract path manually
                        const pathMatch = url.match(/https?:\/\/[^\/]+(\/.*)?$/);
                        if (pathMatch && pathMatch[1] && pathMatch[1] !== '/') {
                              path = pathMatch[1];
                        }
                  }

                  return apiHost + path;
            }
      }

      // For non-localhost URLs, ensure HTTPS for inblock.io domains
      if (url.includes('inblock.io') && url.startsWith('http://')) {
            url = url.replace('http://', 'https://');
      }

      // For local development, normalize 0.0.0.0 to localhost
      if (isWindowLocalhost && url.includes('0.0.0.0')) {
            url = url.replace('0.0.0.0', 'localhost');
      }

      return url;
}



export function isValidUrl(str: string): boolean {
      try {
            new URL(str)
            return true
      } catch {
            return false
      }
}

export function isHttpUrl(str: string): boolean {
      // quick reject if contains newline or tab
      if (/\s/.test(str)) return false

      try {
            const url = new URL(str)
            return url.protocol === "http:" || url.protocol === "https:"
      } catch {
            return false
      }
}

// export function ensureDomainUrlHasSSL(actualUrlToFetch: string): string {
//       let url = actualUrlToFetch

//       if (actualUrlToFetch.includes('inblock.io')) {
//             if (!actualUrlToFetch.includes('https')) {
//                   url = actualUrlToFetch.replace('http', 'https')
//             }
//       }

//       // Alternatively, if the domain is "inblock.io" but lacks protocol

//       if (url.startsWith('inblock.io')) {
//             url = 'https://' + url
//       }

//       // Replace unsafe localhost URL (HTTPS on 0.0.0.0:0 → HTTP on localhost:3000)
//       if (url.startsWith('https://0.0.0.0') || url.startsWith('http://0.0.0.0') || url.startsWith('https://localhost') || url.startsWith('https://localhost')) {
//             url = url.replace('https://0.0.0.0', 'http://localhost')
//             url = url.replace('http://0.0.0.0', 'http://localhost')
//             url = url.replace('https://localhost', 'http://localhost')
//             url = url.replace('https://localhost', 'http://localhost')
//       }

//       // Check if we're on inblock.io domain but URL contains localhost IP addresses
//       const currentDomain = typeof window !== 'undefined' ? window.location.hostname : ''
//       // (`ensureDomainUrlHasSSL currentDomain ${currentDomain}`)
//       if (currentDomain === 'inblock.io' || currentDomain === 'dev.inblock.io' || currentDomain == 'aquafier.inblock.io' || currentDomain.includes('inblock.io')) {
//             if (url.includes('localhost') || url.includes('0.0.0.0') || url.includes('localhost')) {
//                   let domainData = ''
//                   if (currentDomain === 'aquafier.inblock.io') {
//                         domainData = 'https://aquafier-api.inblock.io'
//                   } else {
//                         domainData = 'https://dev-api.inblock.io'
//                   }

//                   url = url.replace('http://localhost', domainData)
//                   url = url.replace('https://localhost', domainData)

//                   // Handle 0.0.0.0 with or without port
//                   url = url.replace('http://0.0.0.0', domainData)
//                   url = url.replace('https://0.0.0.0', domainData)

//                   // Handle localhost with or without port
//                   url = url.replace('http://localhost', domainData)
//                   url = url.replace('https://localhost', domainData)

//                   // Remove any port numbers that might remain
//                   url = url.replace(/:\d+/g, '')
//             }
//       }

//       return url
// }

export function makeProperReadableWord(wordWithUnderScores: string) {
      if (!wordWithUnderScores) {
            return wordWithUnderScores
      }
      const words = wordWithUnderScores.split('_')
      return words.map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ')
}

export const getHighestCount = (strArray: Array<string>): number => {
      let highestCounter = 0

      // Loop through each string in the array
      for (const str of strArray) {
            // Use regex to extract the number after the underscore
            const match = str.match(/_(\d+)$/)

            if (match) {
                  // Convert the extracted number to integer
                  const counter = parseInt(match[1], 10)

                  // Update highest counter if this one is greater
                  if (!isNaN(counter) && counter > highestCounter) {
                        highestCounter = counter
                  }
            }
      }
      return highestCounter
}

/**
 * Extracts the highest form index from an object with keys following the pattern "forms_*_N"
 * where N is the index number we want to find the maximum of.
 */
export const getHighestFormIndex = (obj: Record<string, any>): number => {
      let highestIndex = -1

      // Loop through all object keys
      for (const key of Object.keys(obj)) {
            // Check if key matches the expected pattern (forms_*_N)
            const match = key.match(/^forms_[^_]+_(\d+)$/)

            if (match) {
                  // Extract the index number and convert to integer
                  const index = parseInt(match[1], 10)

                  // Update highest index if this one is greater
                  if (!isNaN(index) && index > highestIndex) {
                        highestIndex = index
                  }
            }
      }

      return highestIndex
}

export function getLatestApiFileInfObject(jsonArray: ApiFileInfo[]): ApiFileInfo | null {
      if (!Array.isArray(jsonArray) || jsonArray.length === 0) {
            return null
      }

      let latestObject: ApiFileInfo | null = null
      let latestTimestamp = ''

      jsonArray.forEach(obj => {
            // Navigate through the nested structure to find revisions
            const aquaTree = obj.aquaTree
            if (aquaTree && aquaTree.revisions) {
                  // Get all revision keys and check their timestamps
                  Object.keys(aquaTree.revisions).forEach(revisionKey => {
                        const revision = aquaTree.revisions[revisionKey]
                        const timestamp = revision.local_timestamp

                        // Compare timestamps (they're in YYYYMMDDHHMMSS format, so string comparison works)
                        if (timestamp > latestTimestamp) {
                              latestTimestamp = timestamp
                              latestObject = obj
                        }
                  })
            }
      })

      return latestObject
}

export async function handleLoadFromUrl(pdfUrlInput: string, fileName: string, toaster: any) {
      if (!pdfUrlInput.trim()) {
            toaster.error('Invalid URL', {
                  description: 'Please enter a valid PDF URL.',
                  type: 'error',
            })
            return {
                  file: null,
                  error: 'Invalid URL',
            }
      }
      try {
            const response = await fetch(pdfUrlInput)
            if (!response.ok) {
                  // throw new Error(`Failed to fetch PDF: ${response.status} ${response.statusText}`);
                  return {
                        file: null,
                        error: `Failed to fetch PDF: ${response.status} ${response.statusText}`,
                  }
            }
            const contentType = response.headers.get('content-type')
            if (!contentType || !contentType.includes('application/pdf')) {
                  console.warn(`Content-Type is not application/pdf: ${contentType}. Attempting to load anyway.`)
                  // Potentially toast a warning here, but proceed for now
            }

            const arrayBuffer = await response.arrayBuffer()
            const filename = fileName
            const blob = new Blob([arrayBuffer], { type: 'application/pdf' })
            const newFile = new File([blob], filename, { type: 'application/pdf' })

            //   resetPdfStateAndLoad(newFile);
            //   if (fileInputRef.current) { // Clear file input if URL is loaded
            //     fileInputRef.current.value = "";
            //   }

            return {
                  file: newFile,
                  error: null,
            }
      } catch (error) {
            console.error('Error loading PDF from URL:', error)
            const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred.'
            //   toast({ title: "Load from URL Failed", description: `Could not load PDF from URL. ${errorMessage}`, variant: "destructive" });
            return {
                  file: null,
                  error: errorMessage,
            }
      }
}

/**
 * Converts bytes to human readable file size
 * @param {number} bytes - The number of bytes
 * @param {number} decimals - Number of decimal places to show (default: 2)
 * @param {boolean} binary - Use binary (1024) or decimal (1000) units (default: false for decimal)
 * @returns {string} Human readable file size
 */
export function formatBytes(bytes: number, decimals = 2, binary = false) {
      // Handle edge cases
      if (bytes === 0) return '0 Bytes'
      if (bytes < 0) return 'Invalid size'
      if (typeof bytes !== 'number' || !isFinite(bytes)) return 'Invalid input'

      const k = binary ? 1024 : 1000
      const dm = decimals < 0 ? 0 : decimals

      // Units for decimal (SI) and binary systems
      // const sizes = binary ? ['Bytes', 'KiB', 'MiB', 'GiB', 'TiB', 'PiB', 'EiB', 'ZiB', 'YiB'] : ['Bytes', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB']
      const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB']

      const i = Math.floor(Math.log(bytes) / Math.log(k))
      const size = parseFloat((bytes / Math.pow(k, i)).toFixed(dm))

      return `${size} ${sizes[i]}`
}

const getSignatureRevionHashes = (hashesToLoopPar: Array<string>, selectedFileInfo: ApiFileInfo): Array<SummaryDetailsDisplayData> => {
      const signatureRevionHashes: Array<SummaryDetailsDisplayData> = []

      for (let i = 0; i < hashesToLoopPar.length; i += 3) {
            const batch = hashesToLoopPar.slice(i, i + 3)
            // (`Processing batch ${i / 3 + 1}:`, batch);

            let signaturePositionCount = 0
            const hashSigPosition = batch[0] ?? ''
            const hashSigRev = batch[1] ?? ''
            const hashSigMetamak = batch[2] ?? ''
            let walletAddress = ''

            if (hashSigPosition.length > 0) {
                  const allAquaTrees = selectedFileInfo?.fileObject.filter(e => isAquaTree(e.fileContent))

                  const hashSigPositionHashString = selectedFileInfo!.aquaTree!.revisions[hashSigPosition].link_verification_hashes![0]
                  if (allAquaTrees) {
                        for (const anAquaTreeFileObject of allAquaTrees) {
                              const anAquaTree: AquaTree = parseAquaTreeContent(anAquaTreeFileObject.fileContent) as AquaTree
                              if (!anAquaTree || !anAquaTree.revisions) {
                                    console.error("Error parsing AquaTree from file object.")
                                    continue
                              }
                              const allHashes = Object.keys(anAquaTree.revisions)
                              if (allHashes.includes(hashSigPositionHashString)) {
                                    const revData = anAquaTree.revisions[hashSigPositionHashString]
                                    signaturePositionCount = getHighestFormIndex(revData) + 1 // sinature count is 0 base

                                    break
                              } else {
                                    // (`allHashes ${allHashes} does not incude ${hashSigPositionHashString} `)
                              }
                        }
                  }
            }

            const metaMaskRevision = selectedFileInfo!.aquaTree!.revisions[hashSigMetamak]
            if (metaMaskRevision) {
                  walletAddress = metaMaskRevision.signature_wallet_address ?? ''
            }
            const data: SummaryDetailsDisplayData = {
                  revisionHashWithSignaturePositionCount: signaturePositionCount,
                  revisionHashWithSignaturePosition: hashSigPosition,
                  revisionHashWithSinatureRevision: hashSigRev,
                  revisionHashMetamask: hashSigMetamak,
                  walletAddress: walletAddress,
            }

            signatureRevionHashes.push(data)
      }

      return signatureRevionHashes
}

export const processContractInformation = (selectedFileInfo: ApiFileInfo): IContractInformation => {
      if (!selectedFileInfo) {
            // Return default values if no file info is provided
            return {
                  firstRevisionData: {} as Revision,
                  fileNameData: '',
                  creatorEthereumSignatureRevisionData: undefined,
                  contractCreatorAddress: '--error--',
                  isWorkFlowComplete: [],
                  signatureRevisionHashes: [],
            }
      }

      const orderedTree = OrderRevisionInAquaTree(selectedFileInfo.aquaTree!)
      const revisions = orderedTree.revisions
      const revisionHashes = Object.keys(revisions)

      const firstHash: string = revisionHashes[0]
      const firstRevision: Revision = selectedFileInfo.aquaTree!.revisions[firstHash]

      const pdfHash = revisionHashes[2]
      const thirdRevision: Revision = selectedFileInfo.aquaTree!.revisions[pdfHash]
      const hashOfLinkedDocument = thirdRevision.link_verification_hashes![0]!
      const fileName = selectedFileInfo.aquaTree!.file_index[hashOfLinkedDocument]

      const creatorSignatureHash = revisionHashes[3]
      const signatureRevision: Revision | undefined = selectedFileInfo.aquaTree!.revisions[creatorSignatureHash]
      const contractCreatorAddress = signatureRevision?.revision_type === 'signature' ? (signatureRevision.signature_wallet_address ?? '--error--') : '--error--'

      let fourthItemHashOnwards: string[] = []
      let signatureRevisionHashes: SummaryDetailsDisplayData[] = []
      const signers: string[] = firstRevision.forms_signers.split(',').map((e: string) => e.trim())

      if (revisionHashes.length > 4) {
            fourthItemHashOnwards = revisionHashes.slice(4)
            signatureRevisionHashes = getSignatureRevionHashes(fourthItemHashOnwards, selectedFileInfo)

            const signatureRevisionHashesDataAddress = signatureRevisionHashes.map(e => e.walletAddress)
            const remainingSigners = signers.filter(item => !signatureRevisionHashesDataAddress.includes(item))

            // verifyAquaTreeRevisions(selectedFileInfo);

            return {
                  firstRevisionData: firstRevision,
                  fileNameData: fileName,
                  creatorEthereumSignatureRevisionData: signatureRevision,
                  contractCreatorAddress,
                  isWorkFlowComplete: remainingSigners,
                  signatureRevisionHashes,
            }
      }

      // verifyAquaTreeRevisions(selectedFileInfo);

      return {
            firstRevisionData: firstRevision,
            fileNameData: fileName,
            creatorEthereumSignatureRevisionData: signatureRevision,
            contractCreatorAddress,
            isWorkFlowComplete: signers,
            signatureRevisionHashes,
      }
}

export const processSimpleWorkflowClaim = (selectedFileInfo: ApiFileInfo): ClaimInformation => {
      const _aquaTree = selectedFileInfo.aquaTree!
      const aquaTree = OrderRevisionInAquaTree(_aquaTree)
      const revisionHashes = Object.keys(aquaTree.revisions)
      const claimInformation: Record<string, string> = {}
      const firstRevisionHash = revisionHashes[0]
      const lastRevisionHash = revisionHashes[revisionHashes.length - 1]
      const firstRevision = aquaTree.revisions[firstRevisionHash]
      const firstRevisionKeys = Object.keys(firstRevision)

      const mustContainkeys = [
            'forms_type',
            // 'forms_wallet_address',
            // 'forms_claim_context',
      ]
      const isClaimValid = mustContainkeys.every(key => firstRevisionKeys.includes(key)) || firstRevisionKeys.includes("forms_ens_name")

      if (!isClaimValid) {
            return {
                  isClaimValid,
                  claimInformation,
                  walletAddress: null,
                  latestRevisionHash: null,
                  genesisHash: null,
            }
      }

      firstRevisionKeys.map(key => {
            if (key.startsWith('forms_')) {
                  // const processedKey = key.split('_').slice(1).join(' ')
                  claimInformation[key] = firstRevision[key]
            }
      })

      // Order the claimInformation keys in ascending order
      const orderedClaimInformation = Object.keys(claimInformation)
            .sort()
            .reduce((obj: Record<string, string>, key) => {
                  obj[key] = claimInformation[key]
                  return obj
            }, {})
      return {
            claimInformation: orderedClaimInformation,
            isClaimValid,
            walletAddress: firstRevision['forms_wallet_address'],
            latestRevisionHash: lastRevisionHash,
            genesisHash: firstRevisionHash,
      }
}

export async function digTxtRecords(domain: string): Promise<string[]> {
      try {
            // Using Google's DNS-over-HTTPS API
            const response = await fetch(`https://dns.google/resolve?name=${encodeURIComponent(domain)}&type=TXT`)
            const data = await response.json()

            if (!data.Answer) {
                  return []
            }

            // Extract TXT records from the response
            return data.Answer
      } catch (error) {
            console.error('Error fetching DNS TXT records:', error)
            return []
      }
}

export async function digTxtRecordsGoogle(domain: string): Promise<string[]> {
      try {
            const response = await fetch(`https://dns.google/resolve?name=${encodeURIComponent(domain)}&type=TXT`, {
                  headers: {
                        Accept: 'application/json',
                  },
            })

            if (!response.ok) {
                  throw new Error(`DNS query failed: ${response.statusText}`)
            }

            const data = await response.json()

            if (data.Status !== 0) {
                  throw new Error(`DNS query failed with status: ${data.Status}`)
            }

            const txtRecords: string[] = []
            if (data.Answer) {
                  for (const record of data.Answer) {
                        if (record.type === 16) {
                              // TXT record type
                              // Remove quotes from the TXT record data
                              const cleanData = record.data.replace(/^"|"$/g, '')
                              txtRecords.push(cleanData)
                        }
                  }
            }

            return txtRecords
      } catch (error: any) {
            throw new Error(`Failed to lookup TXT records for ${domain}: ${error.message}`)
      }
}

export const extractDNSClaimInfo = (
      record: string
): {
      walletAddress: string
      timestamp: number
      expiration: number
      signature: string
} => {
      const [walletAddress, timestamp, expiration, signature] = record.split('&').map(e => e.split('=')[1])
      return {
            walletAddress,
            timestamp: Number(timestamp),
            expiration: Number(expiration),
            signature,
      }
}


export const fetchImage = async (fileUrl: string, nonce: string) => {
      try {
            (`fetchImage fileUrl ${fileUrl}`)
            const actualUrlToFetch = ensureDomainUrlHasSSL(fileUrl)
            const response = await fetch(actualUrlToFetch, {
                  headers: {
                        nonce: `${nonce}`,
                  },
            })

            if (!response.ok) {
                  console.error('FFFailed to fetch file:', response.status, response.statusText)
                  return null
            }

            // Get content type from headers
            let contentType = response.headers.get('Content-Type') || ''

            // If content type is missing or generic, try to detect from URL
            if (contentType === 'application/octet-stream' || contentType === '') {
                  contentType = 'image/png'
            }

            if (contentType.startsWith('image')) {
                  const arrayBuffer = await response.arrayBuffer()
                  // Ensure we use the PDF content type
                  const blob = new Blob([arrayBuffer], { type: contentType })
                  return URL.createObjectURL(blob)
            }

            return null
      } catch (error) {
            console.error('Error fetching file:', error)
            return null
      }
}



export const fetchWalletAddressesAndNamesForInputRecommendation = async (_systemFileInfo: ApiFileInfo[], files: ApiFileInfoState,): Promise<Map<string, string>> => {

      const recommended = new Map<string, string>()

      // const someData = systemFileInfo.map(e => {
      //       try {
      //             return getAquaTreeFileName(e.aquaTree!)
      //       } catch (e) {
      //             //  console.log('Error processing system file') // More descriptive
      //             return ''
      //       }
      // })

      const workflows = await AquaSystemNamesService.getInstance().getSystemNames()

      for (const file of files.fileData) {

            const workFlow = isWorkFlowData(file.aquaTree!, workflows)

            if (workFlow && workFlow.isWorkFlow) {
                  // console.log('Workflow found: ', workFlow.workFlow)
                  const orederdRevisionAquaTree = OrderRevisionInAquaTree(file.aquaTree!)
                  let allHashes = Object.keys(orederdRevisionAquaTree.revisions)
                  let genRevsion = orederdRevisionAquaTree.revisions[allHashes[0]]

                  if (workFlow.workFlow === 'identity_claim') {

                        if (genRevsion && genRevsion[`forms_name`] && genRevsion[`forms_wallet_address`]) {
                              recommended.set(genRevsion[`forms_name`], genRevsion[`forms_wallet_address`])
                        }
                  }

                  if (workFlow.workFlow === 'identity_attestation') {
                        if (genRevsion && genRevsion[`forms_context`] && genRevsion[`forms_claim_wallet_address`]) {

                              if (genRevsion['forms_attestion_type'] == "user") {

                                    recommended.set(genRevsion[`forms_context`], genRevsion[`forms_claim_wallet_address`])
                              }
                        }
                  }

                  if (workFlow.workFlow === 'phone_number_claim') {

                        if (genRevsion && genRevsion[`forms_phone_number`] && genRevsion[`forms_wallet_address`]) {
                              recommended.set(genRevsion[`forms_phone_number`], genRevsion[`forms_wallet_address`])
                        }
                  }


                  if (workFlow.workFlow === 'domain_claim') {

                        if (genRevsion && genRevsion[`forms_domain`] && genRevsion[`forms_wallet_address`]) {
                              recommended.set(genRevsion[`forms_domain`], genRevsion[`forms_wallet_address`])
                        }
                  }


                  if (workFlow.workFlow === 'email_claim') {

                        if (genRevsion && genRevsion[`forms_email`] && genRevsion[`forms_wallet_address`]) {
                              recommended.set(genRevsion[`forms_email`], genRevsion[`forms_wallet_address`])
                        }
                  }



            } else {
                  //  console.log('Not a workflow data: ', file.aquaTree)
            }

      }

      //  console.log('Recommended wallet addresses: ', JSON.stringify(recommended, null, 2))

      return recommended;
}



export async function loadSignatureImage(aquaTree: AquaTree, fileObject: FileObject[], nonce: string): Promise<string | null | Uint8Array> {
      try {
            const signatureAquaTree = OrderRevisionInAquaTree(aquaTree)
            const fileobjects = fileObject

            const allHashes = Object.keys(signatureAquaTree!.revisions!)

            const thirdRevision = signatureAquaTree?.revisions[allHashes[2]]

            if (!thirdRevision) {
                  return null
            }

            if (!thirdRevision.link_verification_hashes) {
                  return null
            }

            const signatureHash = thirdRevision.link_verification_hashes[0]
            const signatureImageName = signatureAquaTree?.file_index[signatureHash]

            const signatureImageObject = fileobjects.find(e => e.fileName == signatureImageName)

            const fileContentUrl = signatureImageObject?.fileContent

            if (typeof fileContentUrl === 'string' && fileContentUrl.startsWith('http')) {
                  let url = ensureDomainUrlHasSSL(fileContentUrl)
                  let dataUrl = await fetchImage(url, `${nonce}`)

                  if (!dataUrl) {
                        dataUrl = `${window.location.origin}/images/placeholder-img.png`
                  }

                  return dataUrl
            } else if (fileContentUrl instanceof Uint8Array) {

                  return fileContentUrl
            }
      }
      catch (error) {
            return `${window.location.origin}/images/placeholder-img.png`
      }
      return null
}


export const cleanEthAddress = (address?: string) => {
      // console.log('cleanEthAddress', address)
      if (!address) {
            return false
      }
      try {
            ethers.getAddress(address)
            return true
      } catch (e) {
            return false
      }
}


export const reorderRevisionsInAquaTree = (aquaTree: AquaTree): string[] => {
      if (!aquaTree.revisions || Object.keys(aquaTree.revisions).length === 0) {
            return []
      }

      const revisions = aquaTree.revisions
      const orderedHashes: string[] = []

      // Find genesis revision (one with empty previous_hash)
      let genesisHash: string | null = null
      for (const [hash, revision] of Object.entries(revisions)) {
            if (!revision.previous_hash || revision.previous_hash === '') {
                  genesisHash = hash
                  break
            }
      }

      if (!genesisHash) {
            // If no genesis found, return all hashes in original order
            return Object.keys(revisions)
      }

      // Build ordered chain starting from genesis
      let currentHash: string | null = genesisHash
      const processedHashes = new Set<string>()

      while (currentHash && !processedHashes.has(currentHash)) {
            const currentRevision = revisions[currentHash]
            if (!currentRevision) break

            // Add current hash to ordered list
            orderedHashes.push(currentHash)
            processedHashes.add(currentHash)

            // Find next revision that has this hash as previous_hash
            let nextHash: string | null = null
            for (const [hash, revision] of Object.entries(revisions)) {
                  if (revision.previous_hash === currentHash && !processedHashes.has(hash)) {
                        nextHash = hash
                        break
                  }
            }
            currentHash = nextHash
      }

      // Add any remaining hashes that weren't part of the main chain
      for (const hash of Object.keys(revisions)) {
            if (!processedHashes.has(hash)) {
                  orderedHashes.push(hash)
            }
      }

      // Return array of ordered hashes
      return orderedHashes
}