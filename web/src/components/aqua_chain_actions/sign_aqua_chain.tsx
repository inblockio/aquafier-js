import { LuSignature } from 'react-icons/lu'
import { areArraysEqual, dummyCredential, ensureDomainUrlHasSSL, fetchFiles, getGenesisHash, getLastRevisionVerificationHash, stringToHex } from '../../utils/functions'
import { useStore } from 'zustand'
import appStore from '../../store'
import axios from 'axios'
import { ApiFileInfo } from '../../models/FileInfo'
import { useState } from 'react'
import Aquafier, { AquaTreeWrapper, OrderRevisionInAquaTree } from 'aqua-js-sdk'
import { RevionOperation } from '../../models/RevisionOperation'
import { toast } from 'sonner'
import { useAppKit } from '@reown/appkit/react'
import { getAppKitProvider } from '@/utils/appkit-wallet-utils'
import { RELOAD_KEYS, triggerWorkflowReload } from '@/utils/reloadDatabase'



export const SignAquaChain = ({ apiFileInfo, backendUrl, nonce, index }: RevionOperation) => {
      const { files, setFiles, setSelectedFileInfo, selectedFileInfo, user_profile, session, backend_url, webConfig } = useStore(appStore)
      const [signing, setSigning] = useState(false)
      const { } = useAppKit()

      const signFileHandler = async () => {
            setSigning(true)


            if (webConfig.AUTH_PROVIDER == "metamask") {
                  if (window.ethereum) {

                        try {
                              const aquafier = new Aquafier()

                              const aquaTreeWrapper: AquaTreeWrapper = {
                                    aquaTree: apiFileInfo.aquaTree!,
                                    revision: '',
                                    fileObject: undefined,
                              }

                              const xCredentials = dummyCredential()
                              xCredentials.witness_eth_network = user_profile?.witness_network ?? 'sepolia'

                              let orderedAquaTree = OrderRevisionInAquaTree(apiFileInfo.aquaTree!)
                              let revisionsHashes = Object.keys(orderedAquaTree.revisions)
                              let lastRevisionHash = revisionsHashes[revisionsHashes.length - 1]
                              let lastRevision = orderedAquaTree.revisions[lastRevisionHash]


                              if (lastRevision.revision_type === "signature") {
                                    toast.error(`File already signed`)
                                    setSigning(false)
                                    return
                              }

                              const result = await aquafier.signAquaTree(aquaTreeWrapper, 'metamask', xCredentials)
                              if (result.isErr()) {
                                    toast.error(`Error signing failed`)
                              } else {
                                    const revisionHashes = result.data.aquaTree?.revisions ? Object.keys(result.data.aquaTree.revisions) : []

                                    if (revisionHashes.length == 0) {
                                          toast.error(`Error signing failed (aqua tree structure)`)
                                          return
                                    }
                                    const lastHash = revisionHashes[revisionHashes.length - 1]
                                    const lastRevision = result.data.aquaTree?.revisions[lastHash]
                                    // send to server
                                    const url = ensureDomainUrlHasSSL(`${backendUrl}/tree`)

                                    const response = await axios.post(
                                          url,
                                          {
                                                revision: lastRevision,
                                                revisionHash: lastHash,
                                                orginAddress: session?.address,
                                          },
                                          {
                                                headers: {
                                                      nonce: nonce,
                                                },
                                          }
                                    )

                                    if (response.status === 200 || response.status === 201) {
                                          if (response.data.data) {
                                                const newFiles: ApiFileInfo[] = response.data.data
                                                try {
                                                      const url = ensureDomainUrlHasSSL(`${backend_url}/explorer_files`)
                                                      const filesApi = await fetchFiles(session!.address, url, session!.nonce)
                                                      setFiles({ fileData: filesApi.files, pagination: filesApi.pagination, status: 'loaded' })


                                                      if (selectedFileInfo) {
                                                            const genesisHash = getGenesisHash(selectedFileInfo.aquaTree!)
                                                            for (let i = 0; i < newFiles.length; i++) {
                                                                  const newFile = newFiles[i]
                                                                  const newGenesisHash = getGenesisHash(newFile.aquaTree!)
                                                                  if (newGenesisHash == genesisHash) {
                                                                        setSelectedFileInfo(newFile)
                                                                  }
                                                            }
                                                      }
                                                } catch (e) {
                                                      toast.error('Error updating files')
                                                      // document.location.reload()
                                                }
                                          } else {
                                                const newFiles: ApiFileInfo[] = []
                                                const keysPar = Object.keys(apiFileInfo.aquaTree!.revisions!)
                                                files.fileData.forEach(item => {
                                                      const keys = Object.keys(item.aquaTree!.revisions!)
                                                      if (areArraysEqual(keys, keysPar)) {
                                                            newFiles.push({
                                                                  ...apiFileInfo,
                                                                  aquaTree: result.data.aquaTree!,
                                                            })
                                                      } else {
                                                            newFiles.push(item)
                                                      }
                                                })
                                                const _selectFileInfo = selectedFileInfo!
                                                _selectFileInfo.aquaTree = result.data.aquaTree!
                                                setSelectedFileInfo(_selectFileInfo)
                                                setFiles({ fileData: newFiles, status: 'loaded' })
                                          }
                                    }

                                    toast.success(`Signing successfull`)
                              }

                              setSigning(false)
                        } catch (error) {
                              console.error('An Error', error)
                              setSigning(false)
                              toast.error(`Error during signing`)
                        }

                  } else {
                        setSigning(false)
                        toast.info(`MetaMask is not installed`)
                  }



            } else {


                  try {
                        const aquafier = new Aquafier()

                        const aquaTreeWrapper: AquaTreeWrapper = {
                              aquaTree: apiFileInfo.aquaTree!,
                              revision: '',
                              fileObject: undefined,
                        }

                        const xCredentials = dummyCredential()
                        xCredentials.witness_eth_network = user_profile?.witness_network ?? 'sepolia'

                        const targetRevisionHash = getLastRevisionVerificationHash(apiFileInfo.aquaTree!)

                        // let orderedAquaTree = OrderRevisionInAquaTree(apiFileInfo.aquaTree!)
                        // let revisionsHashes = Object.keys(orderedAquaTree.revisions)
                        // let lastRevisionHash = revisionsHashes[revisionsHashes.length - 1]
                        let lastRevision = apiFileInfo.aquaTree!.revisions[targetRevisionHash]


                        if (lastRevision.revision_type === "signature") {
                              toast.error(`File already signed`)
                              setSigning(false)
                              return
                        }

                        // Sign using WalletConnect via ethers adapter
                        const messageToSign = `I sign this revision: [${targetRevisionHash}]`
                        const provider = await getAppKitProvider()

                        // Convert message to hex format for Core Wallet compatibility
                        const messageHex = stringToHex(messageToSign)

                        // Try with hex format first (for Core Wallet), fallback to plain text
                        let signature: string
                        try {
                              signature = await provider.request({
                                    method: 'personal_sign',
                                    params: [messageHex, session?.address!]
                              })
                        } catch (hexError) {
                              // Fallback to plain text for wallets that don't accept hex
                              signature = await provider.request({
                                    method: 'personal_sign',
                                    params: [messageToSign, session?.address!]
                              })
                        }

                        const result = await aquafier.signAquaTree(aquaTreeWrapper, 'inline', xCredentials, true, undefined, {
                              signature: signature,
                              walletAddress: session?.address!,
                        })

                        if (result.isErr()) {
                              toast.error(`Error signing failed`)
                        } else {
                              const revisionHashes = result.data.aquaTree?.revisions ? Object.keys(result.data.aquaTree.revisions) : []

                              if (revisionHashes.length == 0) {
                                    toast.error(`Error signing failed (aqua tree structure)`)
                                    return
                              }
                              const lastHash = revisionHashes[revisionHashes.length - 1]
                              const lastRevision = result.data.aquaTree?.revisions[lastHash]
                              // send to server
                              const url = ensureDomainUrlHasSSL(`${backendUrl}/tree`)

                              const response = await axios.post(
                                    url,
                                    {
                                          revision: lastRevision,
                                          revisionHash: lastHash,
                                          orginAddress: session?.address,
                                    },
                                    {
                                          headers: {
                                                nonce: nonce,
                                          },
                                    }
                              )

                              if (response.status === 200 || response.status === 201) {
                                    if (response.data.data) {
                                          const newFiles: ApiFileInfo[] = response.data.data

                                          try {
                                                const url = ensureDomainUrlHasSSL(`${backend_url}/explorer_files`)
                                                

                                                const filesApi = await fetchFiles(session!.address, url, session!.nonce)
                                                setFiles({ fileData: filesApi.files, pagination: filesApi.pagination, status: 'loaded' })


                                                if (selectedFileInfo) {
                                                      const genesisHash = getGenesisHash(selectedFileInfo.aquaTree!)
                                                      for (let i = 0; i < newFiles.length; i++) {
                                                            const newFile = newFiles[i]
                                                            const newGenesisHash = getGenesisHash(newFile.aquaTree!)
                                                            if (newGenesisHash == genesisHash) {
                                                                  setSelectedFileInfo(newFile)
                                                            }
                                                      }
                                                }
                                          } catch (e) {
                                                toast.error('Error updating files')
                                          }
                                    } else {
                                          const newFiles: ApiFileInfo[] = []
                                          const keysPar = Object.keys(apiFileInfo.aquaTree!.revisions!)
                                          files.fileData.forEach(item => {
                                                const keys = Object.keys(item.aquaTree!.revisions!)
                                                if (areArraysEqual(keys, keysPar)) {
                                                      newFiles.push({
                                                            ...apiFileInfo,
                                                            aquaTree: result.data.aquaTree!,
                                                      })
                                                } else {
                                                      newFiles.push(item)
                                                }
                                          })
                                          const _selectFileInfo = selectedFileInfo!
                                          _selectFileInfo.aquaTree = result.data.aquaTree!
                                          setSelectedFileInfo(_selectFileInfo)
                                          setFiles({ fileData: newFiles, status: 'loaded' })
                                    }
                              }

                              toast.success(`Signing successfull`)
                        }

                        setSigning(false)
                  } catch (error) {
                        console.error('An Error', error)
                        setSigning(false)
                        toast.error(`Error during signing`)
                  }

            }

            // Trigger actions
            await triggerWorkflowReload(RELOAD_KEYS.aqua_files, true)
            await triggerWorkflowReload(RELOAD_KEYS.all_files, true)

      }

      return (
            <>
                  {/* Sign Button */}
                  <button
                        data-testid={'sign-action-button-' + index}
                        onClick={() => {
                              if (!signing) {
                                    signFileHandler()
                              } else {
                                    toast.info('Signing is already in progress')
                              }
                        }}
                        className={`w-full flex items-center justify-center space-x-1 bg-blue-100 text-blue-700 px-3 py-2 rounded transition-colors text-xs ${signing ? 'opacity-60 cursor-not-allowed' : 'hover:bg-blue-200'}`}
                        disabled={signing}
                  >
                        {signing ? (
                              <>
                                    <svg className="animate-spin h-3 w-3 mr-1 text-blue-700" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"></path>
                                    </svg>
                                    <span>Signing...</span>
                              </>
                        ) : (
                              <>
                                    <LuSignature className="w-4 h-4" />
                                    <span>Sign</span>
                              </>
                        )}
                  </button>
            </>
      )
}