import { Box, Center, Container, Group, Stack, Text, VStack, DialogPositioner, useDisclosure, Button, Input } from "@chakra-ui/react"
import { FileUploadDropzone, FileUploadList, FileUploadRoot } from "../components/chakra-ui/file-button"
import FilesTable from "../components/chakra-ui/table"
import { useStore } from "zustand"
import appStore from "../store"
import ConnectWallet from "../components/ConnectWallet"
import { useState } from "react"
import { estimateFileSize, dummyCredential } from "../utils/functions"
import { DialogBackdrop, DialogBody, DialogContent, DialogFooter, DialogHeader, DialogRoot } from '../components/chakra-ui/dialog';
import { FormTemplate } from "../components/aqua_forms"
import { Field } from '../components/chakra-ui/field';
import React from "react"
import Aquafier, { AquaTree, AquaTreeWrapper, FileObject } from "aqua-js-sdk"

import { toaster } from "../components/chakra-ui/toaster";
import axios from "axios"
const Home = () => {
    const { session, formTemplates, backend_url } = useStore(appStore)

    const [selectedTemplate, setSelectedTemplate] = useState<FormTemplate | null>(null);
    const [formData, setFormData] = useState<Record<string, string>>({})
    const { open, onOpen, onClose } = useDisclosure();

    const cancelRef = React.useRef<HTMLButtonElement>(null);

    const saveAquaTree = async (aquaTree: AquaTree, fileObject: FileObject) => {
        try {
            const url = `${backend_url}/explorer_aqua_file_upload`;
            
            // Create a FormData object to send multipart data
            let formData = new FormData();
            
            // Add the aquaTree as a JSON file
            const aquaTreeBlob = new Blob([JSON.stringify(aquaTree)], { type: 'application/json' });
            formData.append('file', aquaTreeBlob, fileObject.fileName);
            
            // Add the account from the session
            formData.append('account', session?.address || '');
            
            // Check if we have an actual file to upload as an asset
            if (fileObject.fileContent) {
                // Set has_asset to true
                formData.append('has_asset', 'true');
                
                // Create a blob from the file content and append it as the asset
                const fileBlob = new Blob([JSON.stringify(fileObject.fileContent as string)], { type: 'application/octet-stream' });
                formData.append('asset', fileBlob, fileObject.fileName);
            } else {
                formData.append('has_asset', 'false');
            }
            
            const response = await axios.post(url, formData, {
                headers: {
                    "nonce": session?.nonce,
                    // Don't set Content-Type header - axios will set it automatically with the correct boundary
                }
            });
    
            if (response.status === 200 || response.status === 201) {
                toaster.create({
                    description: `Aqua tree created successfully`,
                    type: "success"
                });
                onClose();
            }
    
        } catch (error) {
            toaster.create({
                title: 'Error uploading aqua tree',
                description: error instanceof Error ? error.message : 'Unknown error',
                type: 'error',
                duration: 5000,
            });
        }
    };
    const createFormAndSign = async () => {
        let aquafier = new Aquafier();
        let estimateize = estimateFileSize(JSON.stringify(formData));
        let fileObject: FileObject = {
            fileContent: JSON.stringify(formData),
            fileName: `${selectedTemplate?.name}.json` ?? "template.json",
            path: '',
            fileSize: estimateize
        }
        let res = await aquafier.createGenesisRevision(fileObject, true, true, false)

        if (res.isOk()) {

            const aquaTreeWrapper: AquaTreeWrapper = {
                aquaTree: res.data.aquaTree!!,
                revision: "",
                fileObject: fileObject
            }

            // sign the aqua chain 
            let signRes = await aquafier.signAquaTree(aquaTreeWrapper, "metamask", dummyCredential())
            if (signRes.isErr()) {
                toaster.create({
                    description: `Error signing failed`,
                    type: "error"
                })
            } else {

                await saveAquaTree(signRes.data.aquaTree!!, fileObject)

            }
        } else {
            toaster.create({
                title: 'Error creating Aqua tree from template',
                description: 'Error creating Aqua tree from template',
                type: 'error',
                duration: 5000,
            });
        }
    }
    return (
        <>
            {
                session ? (
                    <Container fluid maxWidth={{ base: 'vw', md: '10/12' }} py={'14'} px={{ base: 1, md: 10 }}>
                        <VStack alignItems={'start'} gap={'10'}>

                            <Stack>
                                <Text>Create Aqua tree from template</Text>
                                <Group>
                                    {formTemplates.map((template) =>
                                        <Box background="tomato" width="fit-content" padding="4" color="white" onClick={() => {
                                            setSelectedTemplate(template)
                                            onOpen()
                                        }}>
                                            {template.name}
                                        </Box>

                                    )}
                                </Group>
                            </Stack>
                            <FileUploadRoot borderRadius={'2xl'} alignItems="stretch" maxFiles={10} cursor={'pointer'}>
                                <FileUploadDropzone
                                    borderRadius={'2xl'}
                                    label="Drag and drop here to upload"
                                    description="Any file up to 200MB"
                                    _hover={{
                                        outline: "4px dashed",
                                        outlineOffset: '4px'
                                    }}
                                    maxHeight={{ base: "100px", md: "200px" }}
                                />
                                {/* 
                            I have set clearable to false since when selecting new files. 
                            If the index is already in uploaed files array, then it marks it as uploaded. 
                            We should be able to fix this to avoid such a scenario
                        */}
                                <FileUploadList clearable={false} showSize />
                            </FileUploadRoot>

                            <Box w={'100%'}>
                                {/* <Statistics /> */}
                            </Box>
                            <Box w={'100%'}>
                                <FilesTable />
                            </Box>
                        </VStack>
                    </Container>
                ) : (
                    <Container h={'calc(100vh - 70px)'}>
                        <Center h={'100%'}>
                            <Stack>
                                <Text>Connect wallet to upload files</Text>
                                <ConnectWallet />
                            </Stack>
                        </Center>
                    </Container>
                )
            }

            <DialogRoot
                open={open}
                onOpenChange={onClose}
            >
                <DialogBackdrop />
                <DialogPositioner>
                    <DialogContent>
                        <DialogHeader fontSize="lg" fontWeight="bold">
                            Create Aqua tree from template
                        </DialogHeader>

                        <DialogBody>
                            <Stack>
                                {selectedTemplate ? selectedTemplate.fields.map((field) => {
                                    return <Field label={field.title ?? field.label} errorText={''}>
                                        <Input
                                            borderRadius={"sm"}
                                            size={"xs"}
                                            value={formData[field.name]}
                                            onChange={(e) => {
                                                setFormData({
                                                    ...formData,
                                                    [field.name]: e.target.value
                                                })
                                            }}
                                        />
                                    </Field>
                                }) : null}
                            </Stack>
                        </DialogBody>


                        <DialogFooter>
                            <Button colorPalette={'green'} ref={cancelRef} onClick={createFormAndSign}>
                                Create
                            </Button>
                            <Button variant={'solid'} colorPalette="red" onClick={onClose} ml={3}>
                                close
                            </Button>
                        </DialogFooter>
                    </DialogContent>
                </DialogPositioner>
            </DialogRoot>
        </>
    )
}

export default Home