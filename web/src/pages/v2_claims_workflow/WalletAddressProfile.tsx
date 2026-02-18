import CopyButton from '@/components/shared/CopyButton'
import CustomCopyButton from '@/components/shared/CustomCopyButton'
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
      timeToHumanFriendly
} from '@/utils/functions'
import Aquafier, { AquaTree, AquaTreeWrapper, FileObject } from 'aqua-js-sdk'
import { ArrowRight, Share2, SignatureIcon } from 'lucide-react'
import { Suspense } from 'react'
import { useNavigate } from 'react-router-dom'
import { ClipLoader } from 'react-spinners'
import { toast } from 'sonner'
import { useStore } from 'zustand'
import apiClient from '@/api/axiosInstance'
import { RELOAD_KEYS } from '@/utils/reloadDatabase'
import { API_ENDPOINTS } from '@/utils/constants'
import { saveAquaTree } from '@/utils/aquaTreeUpload'
import ClaimCard from './ClaimCard'
import { useProfileClaims } from '@/hooks/useProfileClaims'

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

const WalletAddressProfile = ({ walletAddress, callBack, showAvatar, width, showShadow, hideOpenProfileButton, noBg, timestamp, files, signatureHash }: ISignatureWalletAddressCard) => {
      const { workflows, session, setFiles, backend_url, setOpenDialog, setSelectedFileInfo } = useStore(appStore)
      const navigate = useNavigate()

      const { claims, loading, isLoading, ensName } = useProfileClaims({ walletAddress, files })

      const shadowClasses = showShadow ? 'shadow-lg hover:shadow-xl transition-shadow duration-300' : 'shadow-none'

      const lastFourLetterOfWalletAddress = walletAddress?.substring(walletAddress?.length - 4)

      const saveAndFinalizeAquaTree = async (aquaTree: AquaTree, fileObject: FileObject, isFinal: boolean = false, isWorkflow: boolean = false, account: string = session?.address || '') => {
            try {
                  const success = await saveAquaTree({
                        aquaTree,
                        fileObject,
                        backendUrl: backend_url,
                        nonce: session?.nonce,
                        account,
                        isWorkflow,
                  })

                  if (success && isFinal) {
                        const urlPath = `${backend_url}/explorer_files`
                        const url2 = ensureDomainUrlHasSSL(urlPath)
                        const filesApi = await fetchFiles(session!.address, url2, session!.nonce)
                        setFiles({ fileData: filesApi.files, pagination: filesApi.pagination, status: 'loaded' })

                        toast.success('Profile Aqua tree created successfully')
                        callBack && callBack()

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
                        const response = await apiClient.post(url, {
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
                  await saveAndFinalizeAquaTree(currentAquaTree!, fileObject, true)
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

      const handleCreateEnsClaim = async () => {

            if (!backend_url || !session) {
                  toast.warning("It seems you are not logged in!")
                  return
            }
            //`${backend_url}/${API_ENDPOINTS.CREATE_ENS_CLAIM}`
            const createENSClaimUrl = ensureDomainUrlHasSSL(`${backend_url}/${API_ENDPOINTS.CREATE_ENS_CLAIM}`)
            const res = await apiClient.post(createENSClaimUrl, {}, {
                  headers: {
                        metamask_address: session.address,
                        nonce: `${session.nonce}`
                  },
                  reloadKeys: [RELOAD_KEYS.user_files, RELOAD_KEYS.all_files, RELOAD_KEYS.ens_claim, RELOAD_KEYS.contacts],
            })

            if (res.status === 200 || res.status === 201) {
                  toast.success("You have successfully created your ENS Claim")
            } else {
                  toast.error(`An error occured ${res.status}`)
            }
      }

      const hasEnsClaim = () => {
            if (claims && claims.length > 0) {
                  let ens_claim = claims.find(claim => claim.claimType === "ens_claim")
                  if (ens_claim) {
                        return true
                  }
            }
            return false
      }

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
                              (walletAddress === session?.address && ensName && claims.length > 0 && !isLoading && !loading && !hasEnsClaim()) ? (
                                    <div className="p-4 bg-green-50 border border-green-200 rounded-lg flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                                          <div className="flex flex-col gap-1">
                                                <p className="text-sm font-medium text-green-800">You have an ENS name</p>
                                                <p className="text-sm text-green-700">Would you like to create your claim?</p>
                                                <p className="text-sm font-semibold text-green-900 bg-green-100 px-2 py-1 rounded w-fit">{ensName}</p>
                                          </div>
                                          <Button className="bg-green-600 hover:bg-green-700 text-white" onClick={handleCreateEnsClaim}>Create</Button>
                                    </div>
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
