import { LuGlasses } from 'react-icons/lu'
import { dummyCredential, fetchFiles, getGenesisHash, getLastRevisionVerificationHash } from '../../utils/functions'
import { useStore } from 'zustand'
import appStore from '../../store'
import axios from 'axios'
import { ApiFileInfo } from '../../models/FileInfo'
import { useState } from 'react'
import Aquafier, { AquaTreeWrapper, WitnessNetwork } from 'aqua-js-sdk'
import { RevionOperation } from '../../models/RevisionOperation'
import { toast } from 'sonner'
import { ETH_CHAINID_MAP } from '@/utils/constants'
import { getAppKitProvider, switchNetworkWalletConnect } from '@/utils/appkit-wallet-utils'
import { triggerWorkflowReload, RELOAD_KEYS } from '@/utils/reloadDatabase'

export const WitnessAquaChain = ({ apiFileInfo, backendUrl, nonce }: RevionOperation) => {
      const { setFiles, metamaskAddress, selectedFileInfo, setSelectedFileInfo, user_profile, backend_url, session, webConfig } = useStore(appStore)
      const [witnessing, setWitnessing] = useState(false)

      const witnessFileHandler = async () => {
            setWitnessing(true)
            if (webConfig.AUTH_PROVIDER == "metamask") {
                  if (window.ethereum) {

                        try {
                              const walletAddress = metamaskAddress ?? session?.address

                              if (!walletAddress) {
                                    setWitnessing(false)
                                    toast.info(`Please connect your wallet to continue`)
                                    return
                              }

                              const aquafier = new Aquafier()

                              const aquaTreeWrapper: AquaTreeWrapper = {
                                    aquaTree: apiFileInfo.aquaTree!,
                                    revision: '',
                                    fileObject: undefined,
                              }
                              const xCredentials = dummyCredential()
                              xCredentials.alchemy_key = user_profile?.alchemy_key ?? ''
                              xCredentials.witness_eth_network = user_profile?.witness_network ?? 'sepolia'
                              const result = await aquafier.witnessAquaTree(aquaTreeWrapper, 'eth', xCredentials.witness_eth_network as WitnessNetwork, 'metamask', xCredentials)
                              if (result.isErr()) {
                                    toast.error(`Error witnessing failed`)
                              } else {
                                    const revisionHashes = result.data.aquaTree?.revisions ? Object.keys(result.data.aquaTree.revisions) : []

                                    if (revisionHashes.length == 0) {
                                          toast.error(`Error witnessing failed (aqua tree structure)`)
                                    }
                                    const lastHash = revisionHashes[revisionHashes.length - 1]
                                    const lastRevision = result.data.aquaTree?.revisions[lastHash]
                                    // send to server
                                    const url = `${backendUrl}/tree`

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
                                          // const newFiles: ApiFileInfo[] = response.data.data
                                          // setFiles({ fileData: newFiles, status: 'loaded' })

                                          // const files = await fetchFiles(session!.address!, `${backend_url}/explorer_files`, session!.nonce)
                                          // setFiles({
                                          //       fileData: files, status: 'loaded'
                                          // })


                                          const filesApi = await fetchFiles(session!.address, `${backend_url}/explorer_files`, session!.nonce)
                                          setFiles({ fileData: filesApi.files, pagination: filesApi.pagination, status: 'loaded' })



                                          const newFiles: ApiFileInfo[] = filesApi.files

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
                                    }

                                    toast.success(`Witnessing successfull`)
                              }

                              setWitnessing(false)
                        } catch (error) {
                              setWitnessing(false)
                              toast.error(`Error during witnessing`)
                        }

                  } else {
                        setWitnessing(false)
                        toast.info(`MetaMask is not installed`)
                  }
            } else {

                  try {
                        const walletAddress = metamaskAddress

                        if (!walletAddress) {
                              setWitnessing(false)
                              toast.info(`Please connect your wallet to continue`)
                              return
                        }

                        const aquafier = new Aquafier()

                        const aquaTreeWrapper: AquaTreeWrapper = {
                              aquaTree: apiFileInfo.aquaTree!,
                              revision: '',
                              fileObject: undefined,
                        }

                        const xCredentials = dummyCredential()
                        xCredentials.alchemy_key = user_profile?.alchemy_key ?? ''
                        xCredentials.witness_eth_network = user_profile?.witness_network ?? 'sepolia'
                        xCredentials.witness_method = ""

                        const targetRevisionHash = getLastRevisionVerificationHash(apiFileInfo.aquaTree!)

                        const provider = await getAppKitProvider()
                        await switchNetworkWalletConnect(ETH_CHAINID_MAP[user_profile?.witness_network as string])

                        // EventWriter.write(bytes32[2]) requires TWO bytes32 values
                        // We send the targetRevisionHash twice to form the array
                        const hash1 = targetRevisionHash.slice(2) // Remove 0x prefix
                        const hash2 = hash1 // Use same hash for second element
                        const txHash = await provider.request({
                              method: 'eth_sendTransaction',
                              params: [{
                                    from: walletAddress,
                                    to: user_profile?.witness_contract_address,
                                    //    data: `0x9cef4ea1${targetRevisionHash.slice(2)}` // Function selector + bytes32 --old
                                    data: `0x9cef4ea1${hash1}${hash2}` // Function selector + bytes32[2]
                              }]
                        });

                        

                        // const transaction_hash = ""

                        const result = await aquafier.witnessAquaTree(aquaTreeWrapper, 'eth', xCredentials.witness_eth_network as WitnessNetwork, 'inline', xCredentials, true, {
                              wallet_address: walletAddress,
                              transaction_hash: txHash
                        })

                        if (result.isErr()) {
                              toast.error(`Error witnessing failed`)
                        } else {
                              const revisionHashes = result.data.aquaTree?.revisions ? Object.keys(result.data.aquaTree.revisions) : []

                              if (revisionHashes.length == 0) {
                                    toast.error(`Error witnessing failed (aqua tree structure)`)
                              }
                              const lastHash = revisionHashes[revisionHashes.length - 1]
                              const lastRevision = result.data.aquaTree?.revisions[lastHash]
                              // send to server
                              const url = `${backendUrl}/tree`

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
                                    // const newFiles: ApiFileInfo[] = response.data.data
                                    // setFiles({ fileData: newFiles, status: 'loaded' })

                                    // const files = await fetchFiles(session!.address!, `${backend_url}/explorer_files`, session!.nonce)
                                    // setFiles({
                                    //       fileData: files, status: 'loaded'
                                    // })


                                    const filesApi = await fetchFiles(session!.address, `${backend_url}/explorer_files`, session!.nonce)
                                    setFiles({ fileData: filesApi.files, pagination: filesApi.pagination, status: 'loaded' })


                                    const newFiles: ApiFileInfo[] = filesApi.files

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
                              }

                              toast.success(`Witnessing successfull`)
                        }

                        setWitnessing(false)
                  } catch (error) {
                        setWitnessing(false)
                        toast.error(`Error during witnessing`)
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
                        data-testid="witness-action-button"
                        onClick={() => {
                              if (!witnessing) {
                                    witnessFileHandler()
                              } else {
                                    toast.info('Witnessing is already in progress')
                              }
                        }}
                        className={`w-full flex items-center justify-center space-x-1 bg-gray-800  text-white px-3 py-2 rounded-md transition-colors text-xs ${witnessing ? 'opacity-60 cursor-not-allowed' : 'hover:bg-gray-600'}`}
                        disabled={witnessing}
                  >
                        {witnessing ? (
                              <>
                                    <svg className="animate-spin h-3 w-3 mr-1 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"></path>
                                    </svg>
                                    <span>Witnessing...</span>
                              </>
                        ) : (
                              <>
                                    <LuGlasses className="w-4 h-4" />
                                    <span>Witness</span>
                              </>
                        )}
                  </button>
            </>
      )
}
