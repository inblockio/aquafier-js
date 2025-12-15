import CopyButton from '@/components/CopyButton'
import CustomCopyButton from '@/components/CustomCopyButton'
// import { ShareButton } from '@/components/aqua_chain_actions/share_aqua_chain' // Add this import
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { ApiFileInfo } from '@/models/FileInfo'
import appStore from '@/store'
import {
      ensureDomainUrlHasSSL,
      estimateFileSize,
      fetchFiles,
      formatCryptoAddress,
      generateAvatar,
      getAquaTreeFileObject,
      getGenesisHash,
      getRandomNumber,
      isWorkFlowData,
      loadSignatureImage,
      timeToHumanFriendly
} from '@/utils/functions'
import Aquafier, { AquaTree, AquaTreeWrapper, FileObject, OrderRevisionInAquaTree, reorderAquaTreeRevisionsProperties } from 'aqua-js-sdk'
import { ArrowRight, CheckCircle, LucideCheckCircle, Mail, Phone, Share2, Signature, SignatureIcon, User, X } from 'lucide-react'
import { Suspense, useEffect, useState } from 'react'
import { TbWorldWww } from 'react-icons/tb'
import { useNavigate } from 'react-router-dom'
import { ClipLoader } from 'react-spinners'
import { toast } from 'sonner'
import { useStore } from 'zustand'
import axios from 'axios'
import { getDNSStatusBadge, IDnsVerificationResult, verifyDNS } from '@/utils/verifiy_dns'
import { AquaSystemNamesService } from '@/storage/databases/aquaSystemNames'
import { RELOAD_KEYS, triggerWorkflowReload } from '@/utils/reloadDatabase'

interface ISignatureWalletAddressCard {
      index?: number
      signatureHash?: string
      walletAddress?: string
      timestamp?: string
      callBack?: () => void
      showAvatar?: boolean
      width?: string
      showShadow?: boolean
      hideOpenProfileButton?: boolean
      noBg?: boolean
      files?: ApiFileInfo[]
}

interface IClaim {
      claimType: string
      claimName?: string
      attestationsCount: number
      apiFileInfo: ApiFileInfo
}

const ClaimCard = ({ claim }: { claim: IClaim }) => {

      const [signatureImage, setSignatureImage] = useState<string | null | Uint8Array>(null)
      const [dnsVerificationResult, setDnsVerificationResult] = useState<IDnsVerificationResult | null>(null)

      const { session, backend_url } = useStore(appStore)

      const ICON_SIZE = 18

      const getTextContent = () => {
            let textContent = claim.claimName || claim.claimType
            if (claim.claimType === "domain_claim") {
                  textContent = textContent.replace("aqua._wallet.", "")
            }
            return textContent
      }

      const getClaimTitle = () => {
            if (claim.claimType === 'identity_claim') {
                  return 'Identity'
            }
            else if (claim.claimType === 'domain_claim') {
                  return 'Domain'
            }
            else if (claim.claimType === 'phone_number_claim') {
                  return 'Phone'
            }
            else if (claim.claimType === 'email_claim') {
                  return 'Email'
            }
            else if (claim.claimType === 'user_signature') {
                  return 'Signature'
            }
            else {
                  return 'Unknown'
            }
      }

      const getClaimIcon = () => {
            if (claim.claimType === 'identity_claim') {
                  let extraClasses = ""
                  if (claim.attestationsCount > 0) {
                        extraClasses = "text-green-500"
                  }
                  return (
                        <div className={`h-[34px] w-[34px] flex items-center justify-center ${extraClasses}`}>
                              <User size={ICON_SIZE} className={"text-orange-500"} />
                        </div>
                  )
            } else if (claim.claimType === 'domain_claim') {
                  return (
                        <div className="h-[34px] w-[34px] flex items-center justify-center">
                              <TbWorldWww size={ICON_SIZE} className='text-purple-500' />
                        </div>
                  )
            }
            else if (claim.claimType === 'phone_number_claim') {
                  let extraClasses = ""
                  if (claim.attestationsCount > 0) {
                        extraClasses = "text-green-500"
                  }
                  return (
                        <div className={`h-[34px] w-[34px] flex items-center justify-center ${extraClasses}`}>
                              <Phone size={ICON_SIZE} className='text-green-500' />
                        </div>
                  )
            }
            else if (claim.claimType === 'email_claim') {
                  let extraClasses = ""
                  if (claim.attestationsCount > 0) {
                        extraClasses = "text-green-500"
                  }
                  return (
                        <div className={`h-[34px] w-[34px] flex items-center justify-center ${extraClasses}`}>
                              <Mail size={ICON_SIZE} className='text-blue-500' />
                        </div>
                  )
            }
            else if (claim.claimType === 'user_signature') {
                  let extraClasses = ""
                  if (claim.attestationsCount > 0) {
                        extraClasses = "text-yellow-500"
                  }
                  return (
                        <div className={`h-[34px] w-[34px] flex items-center justify-center ${extraClasses}`}>
                              <Signature size={ICON_SIZE} className='text-yellow-500' />
                        </div>
                  )
            }
            else {
                  return (
                        <div className="h-[34px] w-[34px] flex items-center justify-center">
                              <LucideCheckCircle size={ICON_SIZE} className='text-green-500' />
                        </div>
                  )
            }
      }

      const getRightSectionContent = () => {

            if (claim.claimType === "user_signature") {
                  return (
                        <div className="flex gap-2 items-center">
                              <div className="p-1 rounded-md w-[120px] relative">
                                    {
                                          signatureImage ? (
                                                typeof signatureImage === 'string' ? (
                                                      <img src={signatureImage} alt={signatureImage} />
                                                ) : (
                                                      <img
                                                            src={`data:image/png;base64,${btoa(String.fromCharCode(...signatureImage))}`}
                                                            alt={'signatureImage'}
                                                      />
                                                )
                                          ) : (
                                                <img src={`${window.location.origin}/images/placeholder-img.png`} alt={claim.claimName} />
                                          )
                                    }
                                    {
                                          claim.attestationsCount > 0 ? (
                                                <div className="absolute bottom-0 right-0 w-[34px] h-[34px]">
                                                      <div className="h-[34px] w-[34px] flex items-center justify-center">
                                                            <LucideCheckCircle size={ICON_SIZE} className='text-green-500' />
                                                      </div>
                                                </div>
                                          ) : null
                                    }
                              </div>
                        </div>
                  )
            }
            else if (claim.claimType === "domain_claim") {
                  if (!dnsVerificationResult) {
                        return (
                              <div className="flex gap-2 items-center">
                                    <div className="animate-spin h-2 w-2 border border-blue-500 border-t-transparent rounded-full" />
                                    <p className="text-xs font-medium text-gray-900">Loading</p>
                              </div>
                        )
                  }
                  const verificationBadge = getDNSStatusBadge(dnsVerificationResult?.dnsStatus!, dnsVerificationResult?.message!)
                  return (
                        <div className="flex gap-2 items-center" onClick={() => {
                              verifyDomainClaim(true)
                        }}>

                              {verificationBadge}
                        </div>
                  )
            }
            else {
                  if (claim.attestationsCount > 0) {
                        return (
                              <div className="flex gap-2 items-center flex-wrap">
                                    <CheckCircle size={ICON_SIZE - 2} className="text-green-500" />
                                    <p className="text-xs font-medium text-gray-900">Verified</p>
                              </div>
                        )
                  }
                  return (
                        <>
                              <X size={ICON_SIZE - 2} className="text-red-500" />
                              <p className="text-xs font-medium text-gray-900">Not Attested</p>
                        </>
                  )
            }
      }

      const verifyDomainClaim = async (triggerReload: boolean) => {
            try {

                  const aquaTree = claim.apiFileInfo.aquaTree!
                  const reorderedAquaTree = reorderAquaTreeRevisionsProperties(aquaTree)
                  const hashes = Object.keys(reorderedAquaTree.revisions)
                  const genesisHash = hashes[0]
                  const genesisRevision = reorderedAquaTree.revisions[genesisHash]
                  const result = await verifyDNS(backend_url, claim.claimName!, genesisRevision["forms_wallet_address"], triggerReload)

                  setDnsVerificationResult(result)
            } catch (error) {
                  console.error(error)
            }

      }

      const loadImage = async () => {
            let signatureImage = await loadSignatureImage(claim.apiFileInfo.aquaTree!, claim.apiFileInfo.fileObject, session?.nonce!)
            setSignatureImage(signatureImage)
      }

      useEffect(() => {
            const timeoutId = setTimeout(() => {
                  if (claim.claimType === 'user_signature') {
                        loadImage()
                  } else if (claim.claimType === 'domain_claim') {
                        verifyDomainClaim(false)
                  }
            }, 0)

            return () => clearTimeout(timeoutId)
      }, [])

      return (
            <div className="flex gap-2 p-2 bg-gray-50 rounded-lg justify-between items-center">
                  <div className="flex gap-2 max-w-[60%]">
                        <div className="w-[34px] h-[34px] flex items-center justify-center text-gray-500 rounded-full bg-gray-100">{getClaimIcon()}</div>
                        <div className="flex flex-col gap-1">
                              <p className="text-xs">{getClaimTitle()}</p>
                              <p className="text-xs font-medium text-gray-900 break-all">{getTextContent()}</p>
                        </div>
                  </div>
                  <div className="flex gap-1">
                        {getRightSectionContent()}
                  </div>
            </div>
      )
}

const WalletAddressProfile = ({ walletAddress, callBack, showAvatar, width, showShadow, hideOpenProfileButton, noBg, timestamp, files, signatureHash }: ISignatureWalletAddressCard) => {
      const { workflows, session, setFiles, backend_url, setOpenDialog, setSelectedFileInfo } = useStore(appStore)
      const [claims, setClaims] = useState<IClaim[]>([])
      const [loading, setLoading] = useState(true)
      const [isLoading, setIsLoading] = useState<boolean>(true)
      const navigate = useNavigate()

      const loadSystemAquaFileNames = async () => {
            const aquaSystemNamesService = AquaSystemNamesService.getInstance();
            const systemNames = await aquaSystemNamesService.getSystemNames();
            return systemNames;
      }

      const shadowClasses = showShadow ? 'shadow-lg hover:shadow-xl transition-shadow duration-300' : 'shadow-none'

      const requiredClaims = ['simple_claim', 'domain_claim', 'identity_claim', 'phone_number_claim', 'email_claim', 'user_signature']

      const lastFourLetterOfWalletAddress = walletAddress?.substring(walletAddress?.length - 4)

      const loadWorkflows = async () => {
            if (!walletAddress || !session?.nonce) return
            setIsLoading(true);
            try {
                  let _files: ApiFileInfo[] = []
                  let systemWorkflowNames: string[] = await loadSystemAquaFileNames()
                  // console.log(systemWorkflowNames)
                  // Load profile from db based on wallet address
                  if (files && files.length > 0) {
                        _files = files;
                  } else {
                        // Load contact profile from IndexedDB
                        const { ContactsService } = await import('@/storage/databases/contactsDb');
                        const contactsService = ContactsService.getInstance();
                        const contactProfile = await contactsService.getContactByAddress(walletAddress);
                        // console.log("contactProfile", contactProfile)
                        if (contactProfile && contactProfile.files) {
                              _files = contactProfile.files;
                        }
                  }
                  // console.log("files", files, _files, walletAddress)
                  processFilesToGetWorkflows(_files, systemWorkflowNames);
            } catch (error) {
                  console.error('Failed to load workflows:', error);
                  // Consider setting an error state here
            } finally {
                  setIsLoading(false);
            }
      };

      const processFilesToGetWorkflows = (files: ApiFileInfo[], systemWorkflowNames: string[]) => {

            setLoading(true)

            if (files && files.length > 0) {
                  let attestationFiles = files.filter(file => {
                        const fileInfo = isWorkFlowData(file.aquaTree!, systemWorkflowNames)
                        return fileInfo.isWorkFlow && fileInfo.workFlow === 'identity_attestation'
                  })

                  const localClaims: IClaim[] = []
                  // let _totalAttestations = 0
                  for (let i = 0; i < files.length; i++) {
                        const aquaTree = files[i].aquaTree
                        if (aquaTree) {
                              const { isWorkFlow, workFlow } = isWorkFlowData(aquaTree!, systemWorkflowNames)

                              if (isWorkFlow && requiredClaims.includes(workFlow)) {

                                    const orderedAquaTree = OrderRevisionInAquaTree(aquaTree)
                                    const revisionHashes = Object.keys(orderedAquaTree.revisions)
                                    const firstRevisionHash = revisionHashes[0]
                                    const firstRevision = orderedAquaTree.revisions[firstRevisionHash]
                                    const _wallet_address = firstRevision.forms_wallet_address
                                    if (walletAddress === _wallet_address) {
                                          // setSelectedFileInfo(files[i])
                                          // firstClaim = files[i]
                                          let attestationsCount = 0

                                          // Lets get all Attestation for this claim
                                          for (let a = 0; a < attestationFiles.length; a++) {
                                                let attestationFile = attestationFiles[a]
                                                let attestationAquaTree = attestationFile?.aquaTree!
                                                let attestationFileGenesisHash = getGenesisHash(attestationAquaTree)!
                                                let genesisRevision = attestationAquaTree.revisions[attestationFileGenesisHash]
                                                // TODO: Do we have to countercheck the wallet addresses too!
                                                // if (genesisRevision.forms_claim_wallet_address === _wallet_address
                                                //       && genesisRevision.forms_identity_claim_id === firstRevisionHash) {
                                                //       attestationsCount += 1
                                                // }
                                                if (genesisRevision.forms_identity_claim_id === firstRevisionHash) {
                                                      attestationsCount += 1
                                                }
                                          }

                                          // _totalAttestations += attestationsCount
                                          let claimName = ""
                                          if (workFlow === 'simple_claim' || workFlow === 'identity_claim' || workFlow === 'user_signature') {
                                                claimName = firstRevision.forms_name ?? firstRevision.forms_domain
                                          } else if (workFlow === 'domain_claim' || workFlow === 'dns_claim') {
                                                claimName = firstRevision.forms_domain
                                          } else if (workFlow === 'phone_number_claim') {
                                                claimName = firstRevision.forms_phone_number
                                          } else if (workFlow === 'email_claim') {
                                                claimName = firstRevision.forms_email
                                          }
                                          let claimInformation: IClaim = {
                                                claimType: workFlow,
                                                claimName: claimName,
                                                attestationsCount: attestationsCount,
                                                apiFileInfo: files[i],
                                          }
                                          localClaims.push(claimInformation)
                                    }
                              }
                        }
                  }

                  setClaims(localClaims)
                  // setTotalAttestations(_totalAttestations)
            }
            setLoading(false)
      }


      const saveAquaTree = async (aquaTree: AquaTree, fileObject: FileObject, isFinal: boolean = false, isWorkflow: boolean = false, account: string = session?.address || '') => {
            try {
                  const url = `${backend_url}/explorer_aqua_file_upload`

                  // Create a FormData object to send multipart data
                  const formData = new FormData()

                  // Add the aquaTree as a JSON file
                  const aquaTreeBlob = new Blob([JSON.stringify(aquaTree)], {
                        type: 'application/json',
                  })
                  formData.append('file', aquaTreeBlob, fileObject.fileName)

                  // Add the account from the session
                  // formData.append('account', session?.address || '')
                  formData.append('account', account)
                  formData.append('is_workflow', `${isWorkflow}`)
                  // Template name
                  // formData.append('template_name', selectedTemplate?.name || '')

                  // todo unocmment here
                  //workflow specifi
                  // if (selectedTemplate?.name == 'user_signature') {
                  //       formData.append('template_id', `${selectedTemplate.id}`)
                  // }

                  // Check if we have an actual file to upload as an asset
                  if (fileObject.fileContent) {
                        // Set has_asset to true
                        formData.append('has_asset', 'true')

                        // FIXED: Properly handle the file content as binary data
                        // If fileContent is already a Blob or File object, use it directly
                        if (fileObject.fileContent instanceof Blob || fileObject.fileContent instanceof File) {
                              formData.append('asset', fileObject.fileContent, fileObject.fileName)
                        }
                        // If it's an ArrayBuffer or similar binary data
                        else if (fileObject.fileContent instanceof ArrayBuffer || fileObject.fileContent instanceof Uint8Array) {
                              const fileBlob = new Blob([fileObject.fileContent as any], {
                                    type: 'application/octet-stream',
                              })
                              formData.append('asset', fileBlob, fileObject.fileName)
                        }
                        // If it's a base64 string (common for image data)
                        else if (typeof fileObject.fileContent === 'string' && fileObject.fileContent.startsWith('data:')) {
                              // Convert base64 to blob
                              const response = await fetch(fileObject.fileContent)
                              const blob = await response.blob()
                              formData.append('asset', blob, fileObject.fileName)
                        }
                        // Fallback for other string formats (not recommended for binary files)
                        else if (typeof fileObject.fileContent === 'string') {
                              const fileBlob = new Blob([fileObject.fileContent], {
                                    type: 'text/plain',
                              })
                              formData.append('asset', fileBlob, fileObject.fileName)
                        }
                        // If it's something else (like an object), stringify it (not recommended for files)
                        else {
                              console.warn('Warning: fileContent is not in an optimal format for file upload')
                              const fileBlob = new Blob([JSON.stringify(fileObject.fileContent)], {
                                    type: 'application/json',
                              })
                              formData.append('asset', fileBlob, fileObject.fileName)
                        }
                  } else {
                        formData.append('has_asset', 'false')
                  }

                  const response = await axios.post(url, formData, {
                        headers: {
                              nonce: session?.nonce,
                              // Don't set Content-Type header - axios will set it automatically with the correct boundary
                        },
                  })

                  if (response.status === 200 || response.status === 201) {
                        if (isFinal) {


                              const filesApi = await fetchFiles(session!.address, `${backend_url}/explorer_files`, session!.nonce)
                              setFiles({ fileData: filesApi.files, pagination: filesApi.pagination, status: 'loaded' })

                              toast.success('Profile Aqua tree created successfully')
                              callBack && callBack()


                              // trigger file reloads 
                               await triggerWorkflowReload(RELOAD_KEYS.aqua_files, true);
                                          await triggerWorkflowReload(RELOAD_KEYS.all_files, true);


                              // Create the profile item to share
                              const profileItem: ApiFileInfo = {
                                    aquaTree: aquaTree,
                                    fileObject: [fileObject], // ShareButton expects an array
                                    // Add other required properties based on your ApiFileInfo interface
                                    linkedFileObjects: [],
                                    mode: '',
                                    owner: ''
                              }

                              setSelectedFileInfo(profileItem)
                              setOpenDialog({
                                    dialogType: 'share_dialog',
                                    isOpen: true,
                                    onClose: () => setOpenDialog(null),
                                    onConfirm: () => {
                                          // Handle confirmation logic here
                                    }
                              })
                        }
                  }
            } catch (error) {
                  // setSubmittingTemplateData(false)
                  toast.error('Error uploading profile aqua tree')
            }
      }

      const handleShareProfile = async () => {
            try {

                  if (claims.length == 0) {
                        toast.error(`Please create a claim  first.`)
                        return
                  }

                  if (callBack) {
                        callBack();
                  }

                  toast.info(`Creating profile for sharing...`, { duration: 4000 })

                  let allFileObjects: Array<FileObject> = []
                  const randomNumber = getRandomNumber(100, 1000)
                  // let fileName = `user_profile_${timeToHumanFriendly(Date.now().toString())}_${randomNumber}.json`
                  let date = timeToHumanFriendly(new Date().toISOString(), true)
                  let dateFormatted = date
                        .replace(/,/g, '')    // Remove ALL commas
                        .replace(/:/g, '_')
                        .replace(/ /g, '_');  // Replace ALL spaces with underscores
                  // .replace(/[,: ]/g, '_');  // Replace ALL commas, colons, and spaces with underscores
                  let fileName = `user_profile_${dateFormatted}_${randomNumber}.json`

                  let completeFormData = {
                        "total_claims": claims.length,
                        "wallet_address": walletAddress,
                        "claims_included": claims.map((e) => e.claimType).toString()
                  }

                  const estimateSize = estimateFileSize(JSON.stringify(completeFormData))
                  const jsonString = JSON.stringify(completeFormData, null, 4)

                  const fileObject: FileObject = {
                        fileContent: jsonString,
                        fileName: fileName,
                        path: './',
                        fileSize: estimateSize,
                  }
                  allFileObjects.push(fileObject)
                  let aquafier = new Aquafier()
                  const genesisAquaTree = await aquafier.createGenesisRevision(fileObject, true, false, false)

                  if (genesisAquaTree.isErr()) {
                        toast.error(`Error creating user profile`)
                        throw new Error('Error creating genesis aqua tree')
                  }

                  let currentAquaTree = genesisAquaTree.data.aquaTree

                  // link profile aqua tree

                  try {
                        const url = ensureDomainUrlHasSSL(`${backend_url}/fetch_template_aqua_tree`)
                        const response = await axios.post(url, {
                              template_name: 'user_profile',
                              name: `User Profile Template`,
                        }, {
                              headers: {
                                    nonce: session?.nonce,
                              },
                        })

                        let jsonData
                        if (typeof response.data.templateData === 'string') {
                              let jsonDataString = response.data.templateData
                              jsonData = JSON.parse(jsonDataString)
                        } else {
                              jsonData = response.data.templateData
                        }
                        // Fix the wallet address in the template
                        jsonData.wallet_address = walletAddress

                        let templateAquaTree


                        if (typeof response.data.aquaTree === 'string') {
                              let aquaTreeString = response.data.aquaTree
                              templateAquaTree = JSON.parse(aquaTreeString) as AquaTree
                        } else {
                              templateAquaTree = response.data.aquaTree as AquaTree
                        }


                        const mainAquaTreeWrapper: AquaTreeWrapper = {
                              aquaTree: currentAquaTree!!,
                              revision: '',
                              fileObject: fileObject,
                        }

                        allFileObjects.push({
                              fileContent: JSON.stringify(templateAquaTree),
                              fileName: 'user_profile.json.aqua.json',
                              path: "./",
                              fileSize: 0,//estimateFileSize(JSON.stringify(templateAquaTree)),
                        })

                        const linkedToAquaTreeWrapper: AquaTreeWrapper = {
                              aquaTree: templateAquaTree!,
                              revision: '',
                              fileObject: {
                                    fileContent: JSON.stringify(jsonData),
                                    fileName: 'user_profile.json',
                                    path: "./",
                                    fileSize: 0, //estimateFileSize(JSON.stringify(jsonData)),
                              },
                        }

                        const linkedAquaTreeResponse = await aquafier.linkAquaTree(mainAquaTreeWrapper, linkedToAquaTreeWrapper)

                        if (linkedAquaTreeResponse.isErr()) {
                              throw new Error('Error linking aqua tree')
                        }

                        currentAquaTree = linkedAquaTreeResponse.data.aquaTree

                  } catch (error) {
                        console.error("Error fetching template aqua tree:", error)

                        toast.error("Error fetching template aqua tree (profile)")
                        return
                  }



                  // link 
                  for (let index = 0; index < claims.length; index++) {
                        const element = claims[index];


                        const mainAquaTreeWrapper: AquaTreeWrapper = {
                              aquaTree: currentAquaTree!!,
                              revision: '',
                              fileObject: fileObject,
                        }

                        const linkedAquaTreeFileObj = getAquaTreeFileObject(element.apiFileInfo)
                        if (!linkedAquaTreeFileObj) {
                              throw new Error('System Aqua tree has error')
                        }

                        allFileObjects.push(linkedAquaTreeFileObj)
                        const linkedToAquaTreeWrapper: AquaTreeWrapper = {
                              aquaTree: element.apiFileInfo.aquaTree!,
                              revision: '',
                              fileObject: linkedAquaTreeFileObj,
                        }

                        const linkedAquaTreeResponse = await aquafier.linkAquaTree(mainAquaTreeWrapper, linkedToAquaTreeWrapper)

                        if (linkedAquaTreeResponse.isErr()) {
                              throw new Error('Error linking aqua tree')
                        }

                        currentAquaTree = linkedAquaTreeResponse.data.aquaTree
                  }


                  // link user attestations
                  let allSimpleClaimFiles = workflows.fileData.filter((e) => {
                        let genesisRevisionHash = getGenesisHash(e.aquaTree!)
                        if (genesisRevisionHash) {

                              let genesisRevision = e.aquaTree?.revisions[genesisRevisionHash]

                              if (genesisRevision?.forms_claim_type == "simple_claim" && genesisRevision!.forms_attestion_type == "user") {
                                    return e
                              }
                        }
                        return null
                  })

                  for (let index = 0; index < allSimpleClaimFiles.length; index++) {
                        const element = allSimpleClaimFiles[index];


                        const mainAquaTreeWrapper: AquaTreeWrapper = {
                              aquaTree: currentAquaTree!!,
                              revision: '',
                              fileObject: fileObject,
                        }

                        const linkedAquaTreeFileObj = getAquaTreeFileObject(element)
                        if (!linkedAquaTreeFileObj) {
                              throw new Error('System Aqua tree has error')
                        }

                        allFileObjects.push(linkedAquaTreeFileObj)
                        const linkedToAquaTreeWrapper: AquaTreeWrapper = {
                              aquaTree: element.aquaTree!,
                              revision: '',
                              fileObject: linkedAquaTreeFileObj,
                        }

                        const linkedAquaTreeResponse = await aquafier.linkAquaTree(mainAquaTreeWrapper, linkedToAquaTreeWrapper)

                        if (linkedAquaTreeResponse.isErr()) {
                              throw new Error('Error linking aqua tree')
                        }

                        currentAquaTree = linkedAquaTreeResponse.data.aquaTree
                  }



                  // save it on the server
                  await saveAquaTree(currentAquaTree!, fileObject, true)
            } catch (error) {
                  console.error("Error creating profile:", error)
                  toast.error("Error creating profile for sharing")
            }
      }

      const getIdentityClaim = () => {
            if (claims.length === 0) {
                  return null
            }

            // First try to find identity_claim
            let identityClaim = claims.find((claim) => claim.claimType === 'identity_claim')

            // If not found, try user_signature
            if (!identityClaim) {
                  identityClaim = claims.find((claim) => claim.claimType === 'user_signature')
            }

            if (!identityClaim) {
                  return null
            }

            return {
                  name: identityClaim.claimName,
            }
      }

      useEffect(() => {
            if (walletAddress && session?.nonce) {
                  loadWorkflows()
            }
      }, [walletAddress, session?.nonce, files])

      // if (claims.length === 0 && !isLoading) {
      //       return (
      //             <div className={`${width ? width : 'w-full'} bg-transparent`}>
      //                   <div className={`flex p-2 flex-col ${noBg ? '' : 'bg-gradient-to-br from-white to-slate-200 border border-slate-200'} ${shadowClasses} rounded-xl gap-4 transition-shadow duration-300`}>
      //                         <p className="text-sm">No claims found</p>
      //                   </div> 
      //             </div>
      //       )
      // }



      return (
            <div className={`${width ? width : 'w-full'} bg-transparent max-h-[50vh] overflow-y-auto`}>
                  <div className={`flex p-2 flex-col ${noBg ? '' : 'bg-gradient-to-br from-white to-slate-200 border border-slate-200'} ${shadowClasses} rounded-xl gap-4 transition-shadow duration-300`}>
                        {
                              isLoading ? <div className="py-6 flex flex-col items-center justify-center h-full w-full">
                                    <ClipLoader color="#000" loading={isLoading} size={50} />
                                    <p className="text-sm">Loading...</p>
                              </div> : null
                        }

                        {(showAvatar && !loading && !isLoading) ? (
                              <div className="relative group">
                                    <Avatar className="size-20 border-2 border-primary/20 hover:border-primary/50 transition-all duration-300">
                                          <AvatarImage src={generateAvatar(walletAddress!)} alt="User Avatar" />
                                          <AvatarFallback className="bg-primary/10 text-primary font-semibold">
                                                {walletAddress ? walletAddress.substring(2, 4).toUpperCase() : 'UN'}
                                          </AvatarFallback>
                                    </Avatar>
                                    <div className="absolute -bottom-1 -right-1 bg-green-500 h-3 w-3 rounded-full border-2 border-background" title="Connected" />
                              </div>
                        ) : null}

                        {(showAvatar && !loading) ? (
                              <div className="flex flex-col items-center gap-2 w-full">
                                    <p className="font-mono text-sm bg-secondary/30 px-3 py-1 rounded-full">{formatCryptoAddress(walletAddress, 10, 10)}</p>
                                    <CustomCopyButton value={`${walletAddress}`} />
                              </div>
                        ) : null}

                        {
                              (claims.length === 0 && !loading && !isLoading) ? (
                                    <div className="flex flex-col gap-2 bg-slate-100 p-2 rounded-lg">
                                          <p className="text-xs font-medium">Wallet Address</p>
                                          {/* <div className="flex gap-2">
                                                <BsInfoCircle size={15} className="text-primary" />
                                                <p className="text-sm">Profile not Found!</p>
                                          </div> */}
                                          <div className="flex gap-2 items-center">
                                                <p className="text-sm font-mono break-all">
                                                      {walletAddress}
                                                </p>
                                                <CopyButton text={`${walletAddress}`} isIcon={true} />
                                          </div>
                                          {
                                                timestamp ? (
                                                      <p className="text-xs break-all">{timestamp}</p>
                                                ) : null
                                          }
                                          {
                                                signatureHash ? (
                                                      <div className="flex gap-2 ">
                                                            <div className='h-10 w-10 min-h-10 min-w-10 bg-primary/10 rounded-md flex items-center justify-center'>
                                                                  <SignatureIcon size={20} />
                                                            </div>
                                                            <p className="text-xs break-all">{signatureHash}</p>
                                                      </div>
                                                ) : null
                                          }
                                    </div>
                              ) : null
                        }
                        {
                              (claims.length > 0 && !isLoading && !loading) ? (
                                    <>
                                          <div className="flex items-center gap-2">
                                                <Avatar className='size-12'>
                                                      {/* <AvatarImage src={generateAvatar(walletAddress!)} alt="User Avatar" /> */}
                                                      <AvatarFallback className="bg-primary/10 text-primary font-semibold uppercase">
                                                            {getIdentityClaim() ? getIdentityClaim()!.name?.substring(0, 2).toUpperCase() : lastFourLetterOfWalletAddress}
                                                      </AvatarFallback>
                                                </Avatar>
                                                <div className="flex flex-col gap-1">
                                                      <p className="font-semibold text-gray-800 uppercase">{getIdentityClaim() ? getIdentityClaim()!.name : lastFourLetterOfWalletAddress}</p>
                                                      <div className="flex gap-2 items-center">
                                                            <p className="text-xs break-all">{walletAddress}</p>
                                                            <CopyButton text={`${walletAddress}`} isIcon={true} />
                                                      </div>
                                                </div>
                                          </div>
                                    </>
                              ) : null
                        }
                        {
                              claims.length > 0 ? (
                                    <div className="flex flex-col gap-[6px] rounded-lg">
                                          {
                                                claims.filter((claim) => claim.claimType === 'identity_claim').map((claim, index) => (
                                                      <Suspense key={`claim_${index}`} fallback={<div className="flex gap-2 p-2 bg-gray-50 rounded-lg justify-between items-center animate-pulse"><div className="h-8 bg-gray-200 rounded w-full"></div></div>}>
                                                            <ClaimCard claim={claim} />
                                                      </Suspense>
                                                ))
                                          }
                                          {
                                                claims.filter((claim) => claim.claimType !== 'identity_claim').map((claim, index) => (
                                                      <Suspense key={`claim_${index}`} fallback={<div className="flex gap-2 p-2 bg-gray-50 rounded-lg justify-between items-center animate-pulse"><div className="h-8 bg-gray-200 rounded w-full"></div></div>}>
                                                            <ClaimCard claim={claim} />
                                                      </Suspense>
                                                ))
                                          }
                                    </div>
                              ) : null
                        }
                        {
                              (!hideOpenProfileButton && claims.length > 0) ? (
                                    <div className="flex justify-end">
                                          <div className="flex gap-1 flex-1 flex-wrap">
                                                <Button
                                                      className={`flex-1 bg-orange-50 hover:bg-orange-200 text-orange-700 hover:text-orange-800 px-3 py-1.5 rounded-md flex items-center gap-1.5 text-sm font-medium transition-colors duration-200 border border-orange-200 hover:border-orange-300 cursor-pointer ${claims.length === 0 ? 'hidden' : ''}`}
                                                      onClick={handleShareProfile}
                                                >
                                                      Share
                                                      <Share2 className="w-4 h-4" />
                                                </Button>

                                                <Button
                                                      className="flex-1 bg-blue-50 hover:bg-blue-100 text-blue-600 hover:text-blue-700 px-3 py-1.5 rounded-md flex items-center gap-1.5 text-sm font-medium transition-colors duration-200 border border-blue-200 hover:border-blue-300 cursor-pointer"
                                                      onClick={() => {
                                                            if (callBack) {
                                                                  callBack();
                                                            }
                                                            navigate(`/app/claims/workflow/${walletAddress}`);
                                                      }}
                                                >
                                                      Open Profile
                                                      <ArrowRight className="w-4 h-4" />
                                                </Button>
                                          </div>
                                    </div>
                              ) : null
                        }

                  </div>

                  {/* ShareButton component with autoOpenShareDialog */}
                  {/* {sharedProfileItem  && showShareDialog && ( */}
                  {/* {sharedProfileItem  && (
                        <ShareButton
                              item={sharedProfileItem}
                              nonce={session?.nonce!}
                              index={0}
                              autoOpenShareDialog={true}
                        />
                  )} */}
            </div>
      )
}

export default WalletAddressProfile





