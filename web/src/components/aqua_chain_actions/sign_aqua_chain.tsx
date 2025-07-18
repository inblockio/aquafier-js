
import { LuSignature } from "react-icons/lu"
import { Button } from "../chakra-ui/button"
import { areArraysEqual, dummyCredential, ensureDomainUrlHasSSL, fetchFiles, getGenesisHash } from "../../utils/functions"
import { useStore } from "zustand"
import appStore from "../../store"
import axios from "axios"
import { ApiFileInfo } from "../../models/FileInfo"
import { toaster } from "../chakra-ui/toaster"
import { useState } from "react"
import Aquafier, { AquaTreeWrapper } from "aqua-js-sdk"
import { RevionOperation } from "../../models/RevisionOperation"



export const SignAquaChain = ({ apiFileInfo, backendUrl, nonce }: RevionOperation) => {
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
        <Button data-testid="sign-action-button" size={'xs'} colorPalette={'blue'} variant={'subtle'} w={'100px'} onClick={signFileHandler} loading={signing}>
            <LuSignature />
            Sign
        </Button>
    )


}
