import { LuGlasses } from "react-icons/lu"
import { Button } from "../../../../components/chakra-ui/button"
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

            <Button data-testid="witness-action-button" size={'xs'} w={'100px'} onClick={witnessFileHandler} loading={witnessing}>
                <LuGlasses />
                Witness
            </Button>
        </>
    )
}
