import { LuGlasses } from "react-icons/lu"
import { dummyCredential, getGenesisHash } from "../../../../utils/functions"
import { useStore } from "zustand"
import appStore from "../../../../store"
import axios from "axios"
import { ApiFileInfo } from "../../../../models/FileInfo"
import { toaster } from "../../../../components/chakra-ui/toaster"
import { useState } from "react"
import Aquafier, { AquaTreeWrapper, WitnessNetwork } from "aqua-js-sdk"
import { RevionOperation } from "../../../../models/RevisionOperation"



export const WitnessAquaChain = ({ apiFileInfo, backendUrl, nonce }: RevionOperation) => {
    const { setFiles, metamaskAddress, selectedFileInfo, setSelectedFileInfo, user_profile, session } = useStore(appStore)
    const [witnessing, setWitnessing] = useState(false)


    const witnessFileHandler = async () => {
        if (window.ethereum) {
            setWitnessing(true)
            try {
                const walletAddress = metamaskAddress;

                if (!walletAddress) {
                    setWitnessing(false)
                    toaster.create({
                        description: `Please connect your wallet to continue`,
                        type: "info"
                    })
                    return;
                }

                const aquafier = new Aquafier();

                const aquaTreeWrapper: AquaTreeWrapper = {
                    aquaTree: apiFileInfo.aquaTree!,
                    revision: "",
                    fileObject: undefined
                }
                let xCredentials = dummyCredential()
                xCredentials.alchemy_key = user_profile?.alchemy_key ?? ""
                xCredentials.witness_eth_network = user_profile?.witness_network ?? "sepolia"
                const result = await aquafier.witnessAquaTree(aquaTreeWrapper, "eth", xCredentials.witness_eth_network as WitnessNetwork, "metamask", xCredentials)
                if (result.isErr()) {
                    toaster.create({
                        description: `Error witnessing failed`,
                        type: "error"
                    })
                } else {

                    const revisionHashes = result.data.aquaTree?.revisions ? Object.keys(result.data.aquaTree.revisions) : [];

                    if (revisionHashes.length == 0) {
                        toaster.create({
                            description: `Error witnessing failed (aqua tree structure)`,
                            type: "error"
                        })
                    }
                    const lastHash = revisionHashes[revisionHashes.length - 1]
                    const lastRevision = result.data.aquaTree?.revisions[lastHash]
                    // send to server
                    const url = `${backendUrl}/tree`;

                    const response = await axios.post(url, {
                        "revision": lastRevision,
                        "revisionHash": lastHash,
                        "orginAddress": session?.address
                    }, {
                        headers: {
                            "nonce": nonce
                        }
                    });

                    if (response.status === 200 || response.status === 201) {
                        let newFiles: ApiFileInfo[] = response.data.data
                        setFiles(newFiles)

                        if (selectedFileInfo) {
                            let genesisHash = getGenesisHash(selectedFileInfo.aquaTree!)
                            for (let i = 0; i < newFiles.length; i++) {
                                const newFile = newFiles[i];
                                let newGenesisHash = getGenesisHash(newFile.aquaTree!)
                                if (newGenesisHash == genesisHash) {
                                    setSelectedFileInfo(newFile)
                                }
                            }
                        }

                    }

                    toaster.create({
                        description: `Witnessing successfull`,
                        type: "success"
                    })
                }

                setWitnessing(false)

            } catch (error) {
                console.log("Error  ", error)
                setWitnessing(false)
                toaster.create({
                    description: `Error during witnessing`,
                    type: "error"
                })
            }
        } else {
            setWitnessing(false)
            toaster.create({
                description: `MetaMask is not installed`,
                type: "info"
            })
        }
    };


    return (
        <>
            {/* Sign Button */}
            <button
                data-testid="witness-action-button"
                onClick={() => {
                    if (!witnessing) {
                        witnessFileHandler();
                    } else {
                        toaster.create({
                            description: "Signing is already in progress",
                            type: "info"
                        })
                    }
                }}
                className={`flex items-center space-x-1 bg-gray-800  text-white px-3 py-2 rounded-md transition-colors text-xs ${witnessing ? 'opacity-60 cursor-not-allowed' : 'hover:bg-gray-600'}`}
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
                        <LuGlasses className="w-3 h-3" />
                        <span>Witness</span>
                    </>
                )}
            </button>
        </>
    )
}
