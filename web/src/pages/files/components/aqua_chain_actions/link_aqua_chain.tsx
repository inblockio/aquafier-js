import { LuLink2 } from "react-icons/lu"
import { Button } from "../../../../components/chakra-ui/button"
import { areArraysEqual, fetchFiles, getAquaTreeFileObject, getFileName, isWorkFlowData } from "../../../../utils/functions"
import { useStore } from "zustand"
import appStore from "../../../../store"
import axios from "axios"
import { ApiFileInfo } from "../../../../models/FileInfo"
import { toaster } from "../../../../components/chakra-ui/toaster"
import { useState } from "react"
import { Alert } from "../../../../components/chakra-ui/alert"
import { DialogActionTrigger, DialogBody, DialogCloseTrigger, DialogContent, DialogFooter, DialogHeader, DialogRoot, DialogTitle } from "../../../../components/chakra-ui/dialog"
import { Checkbox } from "../../../../components/chakra-ui/checkbox"
import { Box, Center, Text, VStack, Loader, Stack, Group } from "@chakra-ui/react"
import Aquafier, { AquaTreeWrapper } from "aqua-js-sdk"
import  {IShareButton} from "../../../../types/types"

export const LinkButton = ({ item, nonce }: IShareButton) => {
    const { backend_url, setFiles, files, session, systemFileInfo } = useStore(appStore)
    const [isOpen, setIsOpen] = useState(false)
    const [linking, setLinking] = useState(false)
    const [linkItem, setLinkItem] = useState<ApiFileInfo | null>(null)

    const cancelClick = () => {
        setLinkItem(null)
        setIsOpen(false)
    }
    const handleLink = async () => {
        if (linkItem == null) {
            toaster.create({
                description: `Please select an AquaTree to link`,
                type: "error"
            });
            return;
        }
        try {
            let aquafier = new Aquafier();
            setLinking(true)
            let aquaTreeWrapper: AquaTreeWrapper = {
                aquaTree: item.aquaTree!,
                revision: "",
                fileObject: item.fileObject[0]
            };
            let linkAquaTreeWrapper: AquaTreeWrapper = {
                aquaTree: linkItem!.aquaTree!,
                revision: "",
                fileObject: linkItem!.fileObject[0]
            };
            let result = await aquafier.linkAquaTree(aquaTreeWrapper, linkAquaTreeWrapper)

            if (result.isErr()) {
                toaster.create({
                    description: `An error occurred when linking`,
                    type: "error"
                });
                return;
            }

            let newAquaTree = result.data.aquaTree!
            let revisionHashes = Object.keys(newAquaTree.revisions)
            const lastHash = revisionHashes[revisionHashes.length - 1]
            const lastRevision = result.data.aquaTree?.revisions[lastHash]
            // send to server
            const url = `${backend_url}/tree`;

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


                await refetchAllUserFiles();

            }

            toaster.create({
                description: `Linking successfull`,
                type: "success"
            })
            setLinkItem(null)
            setIsOpen(false)

        } catch (error) {
            toaster.create({
                description: `An error occurred`,
                type: "error"
            });
        }
        setLinking(false)
    }


    const refetchAllUserFiles = async () => {

        // refetch all the files to enure the front end  state is the same as the backend 
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
    return (
        <>
            <Button  data-testid="link-action-button" size={'xs'} colorPalette={'yellow'} variant={'subtle'} w={'100px'} onClick={() => setIsOpen(true)}>
                <LuLink2 />
                Link
            </Button>

            <DialogRoot open={isOpen} onOpenChange={e => setIsOpen(e.open)}>
               
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>{`Link ${item.fileObject[0].fileName} To another file (Aquatree)`}</DialogTitle>
                    </DialogHeader>
                    <DialogBody>

                        {files?.length <= 1 ? <VStack>
                            <Alert status="warning" title={"For linking to work you need multiple files, curently you only have " + files?.length} />
                        </VStack> :
                            <Stack textAlign={'start'}>
                                <Text>
                                    {`You are about to link ${item.fileObject[0].fileName}. Once a file is linked, don't delete it otherwise it will be broken if one tries to use the Aqua tree.`}
                                </Text>
                                <Text>
                                    Select the file you want to link to.
                                </Text>



                                {/* Custom Divider */}
                                <Box
                                    width="100%"
                                    height="1px"
                                    bg="gray.200"
                                    my={3}
                                />


                                {
                                    files?.map((itemLoop: ApiFileInfo, index: number) => {
                                        const keys = Object.keys(itemLoop.aquaTree!.revisions!)
                                        const keysPar = Object.keys(item.aquaTree!.revisions!)
                                        const res = areArraysEqual(keys, keysPar)
                                        const { isWorkFlow, workFlow } = isWorkFlowData(itemLoop.aquaTree!, systemFileInfo.map((e) => getFileName(e.aquaTree!!)))
                                        //  console.log(`res ${res} ${JSON.stringify(itemLoop.fileObject)}`)
                                        if (res) {
                                            return <div key={index}> </div>
                                        }
                                        if (isWorkFlow  && workFlow=="aqua_sign") {
                                            let fileName = getFileName(itemLoop.aquaTree!!)
                                            return <div key={index}>
                                                <Text>
                                                    {index }. {`${fileName} - This is a workflow file (${workFlow}). You can't link to it. `}
                                                </Text>
                                            </div>
                                        }

                                        let fileObject = getAquaTreeFileObject(itemLoop)

                                        if (fileObject) {

                                            return <Group key={index}>
                                                <Text>{index }.</Text>
                                                <Checkbox
                                                    aria-label="Select File"
                                                    checked={linkItem == null ? false :
                                                        Object.keys(linkItem?.aquaTree?.revisions!)[0] === Object.keys(itemLoop.aquaTree?.revisions!)[0]}
                                                    onCheckedChange={(changes) => {
                                                        if (changes.checked) {
                                                            setLinkItem(itemLoop)
                                                        } else {
                                                            setLinkItem(null)
                                                        }

                                                    }}
                                                    value={index.toString()}
                                                >
                                                    {itemLoop.fileObject[0].fileName} {isWorkFlow ? `- This is a workflow file (${workFlow}).` : ""}
                                                </Checkbox>
                                            </Group>
                                        } else {
                                            return <Text>Error</Text>
                                        }
                                    })
                                }

                                {
                                    linking ?
                                        <Center>
                                            <Loader />
                                        </Center>
                                        : null
                                }

                            </Stack>
                        }
                    </DialogBody>
                    <DialogFooter>
                        <DialogActionTrigger asChild>
                            <Button data-testid="link-cancel-action-button"  variant="outline" onClick={cancelClick} borderRadius={'md'}>Cancel</Button>
                        </DialogActionTrigger>


                        {files?.length <= 1 ? <></>
                            : <>
                                <Button data-testid="link-modal-action-button" onClick={handleLink} borderRadius={'md'}>Link</Button>

                            </>}
                    </DialogFooter>
                    <DialogCloseTrigger />
                </DialogContent>
            </DialogRoot>

        </>
    )
}
