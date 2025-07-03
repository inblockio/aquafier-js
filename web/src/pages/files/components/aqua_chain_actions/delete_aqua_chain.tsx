import { LuDelete, LuTrash } from "react-icons/lu"
import { Button } from "../../../../components/chakra-ui/button"
import { fetchFiles, getFileName, getGenesisHash, isWorkFlowData, getAquaTreeFileName } from "../../../../utils/functions"
import { useStore } from "zustand"
import appStore from "../../../../store"
import axios from "axios"
import { ApiFileInfo } from "../../../../models/FileInfo"
import { toaster } from "../../../../components/chakra-ui/toaster"
import { useState } from "react"
import { HStack, Text, Portal, Dialog, List } from "@chakra-ui/react"
import { RevionOperation } from "../../../../models/RevisionOperation"

export const DeleteAquaChain = ({ apiFileInfo, backendUrl, nonce }: RevionOperation) => {
    const { files, setFiles, session, backend_url, systemFileInfo } = useStore(appStore)
    const [deleting, setDeleting] = useState(false)
    const [open, setOpen] = useState(false)
    const [isLoading, setIsloading] = useState(false)
    const [aquaTreesAffected, setAquaTreesAffected] = useState<ApiFileInfo[]>([])

    const deleteFileApi = async () => {
        if (isLoading) {
            toaster.create({
                description: "File deletion in progress",
                type: "info"
            })
            return
        }
        setIsloading(true)
        setDeleting(true)
        try {
            const allRevisionHashes = Object.keys(apiFileInfo.aquaTree!.revisions!);
            const lastRevisionHash = allRevisionHashes[allRevisionHashes.length - 1]
            const url = `${backendUrl}/explorer_delete_file`
            const response = await axios.post(url, {
                "revisionHash": lastRevisionHash
            }, {
                headers: {
                    'nonce': nonce
                }
            });

            if (response.status === 200) {
                // Close the dialog explicitly
                setOpen(false)
                setIsloading(false)
                toaster.create({
                    description: "File deleted successfully",
                    type: "success"
                })
                await refetchAllUserFiles()
            }
        } catch (e) {
            //  console.log(`Error ${e}`)
            toaster.create({
                description: "File deletion error",
                type: "error"
            })
            setIsloading(false) // Add this to ensure loading state is cleared on error
        }

        setDeleting(false)
    }

    const refetchAllUserFiles = async () => {
        // refetch all the files to ensure the front end state is the same as the backend 
        try {
            const files = await fetchFiles(session!.address!, `${backend_url}/explorer_files`, session!.nonce);
            setFiles(files);
        } catch (e) {
            //  console.log(`Error ${e}`)
            toaster.create({
                description: "Error updating files",
                type: "error"
            })
            document.location.reload()
        }
    }

    const deleteFileAction = async () => {
        let allFilesAffected: ApiFileInfo[] = []
        let genesisOfFileBeingDeleted = getGenesisHash(apiFileInfo.aquaTree!)
        let fileNameBeingDeleted = getFileName(apiFileInfo.aquaTree!)

        //check if the file is linked to any aqua chain by using the file index of an aqua tree
        for (let anAquaTree of files) {
            // skip the current file being deleted
            let genesisHash = getGenesisHash(anAquaTree.aquaTree!)
            if (genesisHash == genesisOfFileBeingDeleted) {
                console.log(`skipping ${fileNameBeingDeleted} the file is being deleted`)
            } else {
                let { isWorkFlow } = isWorkFlowData(anAquaTree.aquaTree!, systemFileInfo.map((e) => {
                    try {
                        return getAquaTreeFileName(e.aquaTree!!)
                    } catch (e) {
                        console.log("Error")
                        return ""
                    }
                }));

                if (!isWorkFlow) {
                    let indexValues = Object.values(anAquaTree.aquaTree!.file_index)
                    for (let fileName of indexValues) {
                        if (fileNameBeingDeleted == fileName) {
                            allFilesAffected.push(anAquaTree)
                        }
                    }
                }
            }
        }

        if (allFilesAffected.length == 0) {
            await deleteFileApi()
        } else {
            setAquaTreesAffected(allFilesAffected)
            setOpen(true)
        }
    }

    return (
        <>
            <Button data-testid="delete-file-action-button" size={'xs'} colorPalette={'red'} variant={'subtle'} w={'100px'} onClick={() => {
                deleteFileAction()
            }} loading={deleting}>
                <LuDelete />
                Delete
            </Button>

            <Dialog.Root lazyMount open={open} onOpenChange={(e) => {
                setOpen(e.open)
            }}>
                <Portal>
                    <Dialog.Backdrop />
                    <Dialog.Positioner>
                        <Dialog.Content>
                            <Dialog.Header>
                                <Dialog.Title>This action will corrupt some file(s)</Dialog.Title>
                            </Dialog.Header>
                            <Dialog.Body>
                                <Text>The following aqua trees will become corrupt, as they reference the file you are about to delete</Text>
                                <List.Root as="ol" ml={5} mt={5} alignItems={'start'}>
                                    {aquaTreesAffected.map((apiFileInfoItem, index) => {
                                        return <List.Item key={index}>
                                            {getFileName(apiFileInfoItem.aquaTree!) ?? "--error--"}
                                        </List.Item>
                                    })}
                                </List.Root>
                            </Dialog.Body>
                            <Dialog.Footer>
                                <HStack>
                                    <Button data-testid="cancel-delete-file-action-button" variant="outline" size="sm" onClick={() => {
                                        setOpen(false)
                                    }}>
                                        Cancel
                                    </Button>
                                    <Button
                                        data-testid="proceed-delete-file-action-button"
                                        onClick={() => {
                                            deleteFileApi()
                                        }}
                                        size="sm"
                                        colorPalette={'red'}
                                    >
                                        Proceed to delete &nbsp;<LuTrash />
                                    </Button>
                                </HStack>
                            </Dialog.Footer>
                        </Dialog.Content>
                    </Dialog.Positioner>
                </Portal>
            </Dialog.Root>
        </>
    )
}