import { LuSignature } from "react-icons/lu"
import { areArraysEqual, dummyCredential, ensureDomainUrlHasSSL, fetchFiles, getGenesisHash } from "../../utils/functions"
import { useStore } from "zustand"
import appStore from "../../store"
import axios from "axios"
import { ApiFileInfo } from "../../models/FileInfo"
import { useState } from "react"
import Aquafier, { AquaTreeWrapper } from "aqua-js-sdk"
import { RevionOperation } from "../../models/RevisionOperation"
import { toaster } from "@/components/ui/use-toast"



export const SignAquaChain = ({ apiFileInfo, backendUrl, nonce, index }: RevionOperation) => {
    const { files, setFiles, setSelectedFileInfo, selectedFileInfo, user_profile, session, backend_url } = useStore(appStore)
    const [signing, setSigning] = useState(false)

    const signFileHandler = async () => {
        setSigning(true)
        if (window.ethereum) {
            try {

                const aquafier = new Aquafier();

                const aquaTreeWrapper: AquaTreeWrapper = {
                    aquaTree: apiFileInfo.aquaTree!,
                    revision: "",
                    fileObject: undefined
                }

                let xCredentials = dummyCredential()
                xCredentials.witness_eth_network = user_profile?.witness_network ?? "sepolia"


                const result = await aquafier.signAquaTree(aquaTreeWrapper, "metamask", xCredentials)
                if (result.isErr()) {
                    toaster.create({
                        description: `Error signing failed`,
                        type: "error"
                    })
                } else {
                    const revisionHashes = result.data.aquaTree?.revisions ? Object.keys(result.data.aquaTree.revisions) : [];

                    if (revisionHashes.length == 0) {
                        toaster.create({
                            description: `Error signing failed (aqua tree structure)`,
                            type: "error"
                        })
                        return
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
                        if (response.data.data) {

                            let newFiles: ApiFileInfo[] = response.data.data

                            // let data = {
                            //     ...selectedFileInfo!!,
                            //     aquaTree: result.data.aquaTree!!
                            // }
                            // if (data) {
                            //     setSelectedFileInfo(data)
                            // }
                            // setFiles(newFiles)

                            try {
                                let url = ensureDomainUrlHasSSL(`${backend_url}/explorer_files`)
                                const files = await fetchFiles(session!.address!, url, session!.nonce);
                                setFiles(files);

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


                            } catch (e) {
                                //  console.log(`Error ${e}`)
                                toaster.create({
                                    description: "Error updating files",
                                    type: "error"
                                })
                                // document.location.reload()
                            }

                        } else {
                            //  console.log("update state ...")
                            const newFiles: ApiFileInfo[] = [];
                            const keysPar = Object.keys(apiFileInfo.aquaTree!.revisions!)
                            files.forEach((item) => {
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
                            let _selectFileInfo = selectedFileInfo!!
                            _selectFileInfo.aquaTree = result.data.aquaTree!
                            setSelectedFileInfo(_selectFileInfo)
                            setFiles(newFiles)
                        }
                    }

                    toaster.create({
                        description: `Signing successfull`,
                        type: "success"
                    })
                }

                setSigning(false)
            } catch (error) {
                console.error("An Error", error)
                setSigning(false)
                toaster.create({
                    description: `Error during signing`,
                    type: "error"
                })
            }
        } else {
            setSigning(false)
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
            data-testid={"sign-action-button-"+index}
            onClick={()=>{
                if (!signing) {
                    signFileHandler();
                }else{
                    toaster.create({
                        description: "Signing is already in progress",
                        type: "info"
                    })
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
 