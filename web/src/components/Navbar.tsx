import { Box, Group, HStack, Image, Text, Menu, Button, Portal, MenuOpenChangeDetails, Stack, Input, Flex, Center, SimpleGrid, Spinner, IconButton } from "@chakra-ui/react"
import Settings from "./chakra-ui/settings"
import ConnectWallet from "./ConnectWallet"
import { useColorMode } from "./chakra-ui/color-mode"
import appStore from "../store"
import { useStore } from "zustand"
import VersionAndDisclaimer from "./VersionAndDisclaimer"
import { Link, useNavigate } from "react-router-dom"
import AccountContracts from "./AccountContracts"
import { Alert } from "../components/chakra-ui/alert"
import { LuChevronDown, LuChevronUp, LuPlus, LuSquareChartGantt, LuTrash } from "react-icons/lu"
import { HiDocumentPlus } from "react-icons/hi2";
import React, { useEffect, useState } from "react"
import { estimateFileSize, dummyCredential, getAquaTreeFileName, getAquaTreeFileObject, getRandomNumber, fetchSystemFiles, isValidEthereumAddress } from "../utils/functions"
import { FormTemplate } from "../components/aqua_forms/types"
import { Field } from '../components/chakra-ui/field';
import Aquafier, { AquaTree, AquaTreeWrapper, FileObject } from "aqua-js-sdk"

import { toaster } from "../components/chakra-ui/toaster";
import axios from "axios"
import { DialogBody, DialogCloseTrigger, DialogContent, DialogFooter, DialogHeader, DialogRoot } from "./chakra-ui/dialog";
import SmallScreenSidebarDrawer from "./SmallScreenSidebarDrawer"


import { generateNonce } from "siwe"

const FormTemplateCard = ({ template, selectTemplateCallBack }: { template: FormTemplate, selectTemplateCallBack: (template: FormTemplate) => void }) => {

    const { colorMode } = useColorMode()

    return (
        <Box
            borderWidth="2px"
            borderStyle="dashed"
            borderColor={colorMode === "light" ? "gray.300" : "gray.600"}
            borderRadius="md"
            cursor={"pointer"}
            bg={colorMode === "light" ? "gray.50" : "blackAlpha.500"}
            css={{
                "&:hover": {
                    bg: colorMode === "light" ? "gray.200" : "blackAlpha.700"
                }
            }}
            h="120px"
            p={4}
            onClick={() => {
                selectTemplateCallBack(template)
            }}
        >
            <Flex direction="column" align="center" justify="center" h="100%">
                <Text textAlign="center" mb={2} ml={2} mr={2} fontWeight="bold">
                    {template.title}
                </Text>
                <Center
                    mt={2}
                    borderRadius="full"
                >
                    <HiDocumentPlus size={"32px"} />
                </Center>
            </Flex>
        </Box>
    )
}


const Navbar = () => {
    const { colorMode } = useColorMode()

    const [contractsOpen, setContractsOpen] = useState(false)
    const [settingsOpen, setSettingsOpen] = useState(false)
    const [versionOpen, setVersionOpen] = useState(false)
    const [submittingTemplateData, setSubmittingTemplateData] = useState(false)

    const [isDropDownOpen, setIsDropDownOpen] = useState(false);
    const [modalFormErorMessae, setModalFormErorMessae] = useState("");
    // const { open, onOpen, onClose } = useDisclosure();
    const [open, setOpen] = useState(false)
    const { session, formTemplates, backend_url, systemFileInfo, setFormTemplate, setFiles, setSystemFileInfo } = useStore(appStore)
    const [formData, setFormData] = useState<Record<string, string | File | number>>({});
    const [selectedTemplate, setSelectedTemplate] = useState<FormTemplate | null>(null);

    const [multipleAddresses, setMultipleAddresses] = useState<string[]>([])

    let navigate = useNavigate();

    const addAddress = () => {
        if (multipleAddresses.length === 0 && session?.address) {
            setMultipleAddresses([...multipleAddresses, session.address, ""])
        } else {
            setMultipleAddresses([...multipleAddresses, ""])
        }
    }

    const removeAddress = (index: number) => {
        setMultipleAddresses(multipleAddresses.filter((_, i) => i !== index))
    }


    const cancelRef = React.useRef<HTMLButtonElement>(null);

    const shareAquaTree = async (aquaTree: AquaTree, recipientWalletAddress: string) => {


        try {
            let recipients: string[] = []
            if (recipientWalletAddress.includes(",")) {
                recipients = recipientWalletAddress.split(",")
                    .map((address) => address.trim())
                    .filter((address) => address !== session?.address.trim())
            } else {
                // Only add the recipient if it's not the logged-in user
                if (recipientWalletAddress.trim() !== session?.address.trim()) {
                    recipients = [recipientWalletAddress.trim()]
                } else {
                    recipients = []
                }
            }

            for (let recipient of recipients) {
                const unique_identifier = `${Date.now()}_${generateNonce()}`
                // let genesisHash = getGenesisHash(aquaTree)

                let allHashes = Object.keys(aquaTree.revisions);
                let genesisHash = allHashes[0];
                let latestHash = allHashes[allHashes.length - 1]

                let url = `${backend_url}/share_data`;
                let method = "POST"
                let data = {
                    "latest": latestHash,
                    "genesis_hash": genesisHash,
                    "hash": unique_identifier,
                    "recipient": recipient,
                    "option": "latest"
                }



                const response = await axios({
                    method,
                    url,
                    data,
                    headers: {
                        'nonce': session?.nonce
                    }
                });

                console.log(`Response from share request  ${response.status}`)
            }
        } catch (e) {

            toaster.create({
                title: 'Error sharing workflow',
                description: `Error ${e}`,
                type: 'error',
                duration: 5000,
            });
        }
    }
    const saveAquaTree = async (aquaTree: AquaTree, fileObject: FileObject, isFinal: boolean = false, isWorkflow: boolean = false) => {
        try {
            const url = `${backend_url}/explorer_aqua_file_upload`;

            // Create a FormData object to send multipart data
            let formData = new FormData();

            // Add the aquaTree as a JSON file
            const aquaTreeBlob = new Blob([JSON.stringify(aquaTree)], { type: 'application/json' });
            formData.append('file', aquaTreeBlob, fileObject.fileName);

            // Add the account from the session
            formData.append('account', session?.address || '');
            formData.append('is_workflow', `${isWorkflow}`);


            //workflow specifi
            if (selectedTemplate?.name == 'user_signature') {
                formData.append('template_id', `${selectedTemplate.id}`);
            }

            // Check if we have an actual file to upload as an asset
            if (fileObject.fileContent) {
                // Set has_asset to true
                formData.append('has_asset', 'true');

                // FIXED: Properly handle the file content as binary data
                // If fileContent is already a Blob or File object, use it directly
                if (fileObject.fileContent instanceof Blob || fileObject.fileContent instanceof File) {
                    formData.append('asset', fileObject.fileContent, fileObject.fileName);
                }
                // If it's an ArrayBuffer or similar binary data
                else if (fileObject.fileContent instanceof ArrayBuffer ||
                    fileObject.fileContent instanceof Uint8Array) {
                    const fileBlob = new Blob([fileObject.fileContent], { type: 'application/octet-stream' });
                    formData.append('asset', fileBlob, fileObject.fileName);
                }
                // If it's a base64 string (common for image data)
                else if (typeof fileObject.fileContent === 'string' && fileObject.fileContent.startsWith('data:')) {
                    // Convert base64 to blob
                    const response = await fetch(fileObject.fileContent);
                    const blob = await response.blob();
                    formData.append('asset', blob, fileObject.fileName);
                }
                // Fallback for other string formats (not recommended for binary files)
                else if (typeof fileObject.fileContent === 'string') {
                    const fileBlob = new Blob([fileObject.fileContent], { type: 'text/plain' });
                    formData.append('asset', fileBlob, fileObject.fileName);
                }
                // If it's something else (like an object), stringify it (not recommended for files)
                else {
                    console.warn('Warning: fileContent is not in an optimal format for file upload');
                    const fileBlob = new Blob([JSON.stringify(fileObject.fileContent)], { type: 'application/json' });
                    formData.append('asset', fileBlob, fileObject.fileName);
                }

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
                if (isFinal) {
                    setFiles(response.data.files);
                    toaster.create({
                        description: `Aqua tree created successfully`,
                        type: "success"
                    });
                    // onClose();
                    setOpen(false)
                    setModalFormErorMessae("")
                    setSelectedTemplate(null)
                    setFormData({})
                    setSubmittingTemplateData(false);
                }
            }

        } catch (error) {
            setSubmittingTemplateData(false);
            toaster.create({
                title: 'Error uploading aqua tree',
                description: error instanceof Error ? error.message : 'Unknown error',
                type: 'error',
                duration: 5000,
            });
        }
    };


    // function formatDate(date: Date) {
    //     const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
    //         'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    //     const day = date.getDate().toString().padStart(2, '0');
    //     const month = months[date.getMonth()];
    //     const year = date.getFullYear();
    //     return `${day}-${month}-${year}`;
    // }

    const createWorkflowFromTemplate = async (e: React.FormEvent) => {
        e.preventDefault();

        try {


            if (submittingTemplateData) {
                toaster.create({
                    description: `Data submission not completed, try again after some time.`,
                    type: "info"
                })
                return
            }
            setSubmittingTemplateData(true);
            for (let fieldItem of selectedTemplate!.fields) {
                let valueInput = formData[fieldItem.name]
                console.log(`fieldItem ${JSON.stringify(fieldItem)} \n formData ${JSON.stringify(formData)} valueInput ${valueInput} `)
                if (fieldItem.required && valueInput == undefined) {
                    setSubmittingTemplateData(false);
                    setModalFormErorMessae(`${fieldItem.name} is mandatory`)
                    return
                }

                if (fieldItem.type === 'wallet_address') {
                    if (typeof valueInput === 'string') {
                        if (valueInput.includes(",")) {
                            let walletAddresses = valueInput.split(",");
                            let seenWalletAddresses = new Set<string>();
                            for (let walletAddress of walletAddresses) {
                                let isValidWalletAddress = isValidEthereumAddress(walletAddress.trim())
                                if (!isValidWalletAddress) {
                                    setModalFormErorMessae(`${walletAddress.trim()} is not a valid wallet adress`)

                                    setSubmittingTemplateData(false);
                                    return
                                }
                                if (seenWalletAddresses.has(walletAddress.trim())) {
                                    setModalFormErorMessae(`${walletAddress.trim()} is a duplicate wallet adress`)

                                    setSubmittingTemplateData(false);
                                    return
                                }
                                seenWalletAddresses.add(walletAddress.trim())
                            }
                        } else {
                            let isValidWalletAddress = isValidEthereumAddress(valueInput.trim())
                            if (!isValidWalletAddress) {

                                setSubmittingTemplateData(false);
                                setModalFormErorMessae(`${valueInput} is not a valid wallet adress`)
                                return
                            }
                        }
                    } else {

                        setSubmittingTemplateData(false);
                        setModalFormErorMessae(`${valueInput} provided at ${fieldItem.name} is not a string`)
                        return
                    }
                }

            }


            if (systemFileInfo.length == 0) {

                setSubmittingTemplateData(false);
                toaster.create({
                    description: `Aqua tree for templates not found`,
                    type: "error"
                })
                return
            }


            let templateApiFileInfo = systemFileInfo.find((e) => {
                let nameExtract = getAquaTreeFileName(e!.aquaTree!);
                let selectedName = `${selectedTemplate?.name}.json`
                console.log(`nameExtract ${nameExtract} == selectedName ${selectedName}`)
                return nameExtract == selectedName
            })
            if (!templateApiFileInfo) {

                setSubmittingTemplateData(false);
                toaster.create({
                    description: `Aqua tree for ${selectedTemplate?.name} not found`,
                    type: "error"
                })
                return
            }

            let aquafier = new Aquafier();
            const filteredData: Record<string, string | number> = {};

            const jsonString = JSON.stringify(formData, null, 4);
            const randomNumber = getRandomNumber(100, 1000);


            let fileName = `${selectedTemplate?.name ?? "template"}-${randomNumber}.json`;

            // if (selectedTemplate?.name == "aqua_sign") {
            //     const theFile = formData['document'] as File

            //     // Get filename without extension and the extension separately
            //     const fileNameWithoutExt = theFile.name.substring(0, theFile.name.lastIndexOf('.'));
            //     const fileExtension = theFile.name.substring(theFile.name.lastIndexOf('.'));

            //     fileName = fileNameWithoutExt + '-' + formatDate(new Date()) + '-' + randomNumber + fileExtension;
            // }


            const epochTimeInSeconds = Math.floor(Date.now() / 1000);
            // console.log(epochTimeInSeconds);
            Object.entries(formData).forEach(([key, value]) => {
                // Only include values that are not File objects
                if (!(value instanceof File)) {
                    filteredData[key] = value;
                } else {
                    filteredData[key] = value.name;
                }
            });

            //for uniquness of the form
            formData['created_at'] = epochTimeInSeconds;

            let estimateize = estimateFileSize(JSON.stringify(formData));



            const fileObject: FileObject = {
                fileContent: jsonString,
                fileName: fileName,
                path: './',
                fileSize: estimateize
            }
            let genesisAquaTree = await aquafier.createGenesisRevision(fileObject, true, false, false)

            if (genesisAquaTree.isOk()) {

                // create a link revision with the systems aqua tree 
                let mainAquaTreeWrapper: AquaTreeWrapper = {
                    aquaTree: genesisAquaTree.data.aquaTree!!,
                    revision: "",
                    fileObject: fileObject
                }
                let linkedAquaTreeFileObj = getAquaTreeFileObject(templateApiFileInfo);

                if (!linkedAquaTreeFileObj) {

                    setSubmittingTemplateData(false);
                    toaster.create({
                        description: `system Aqua tee has error`,
                        type: "error"
                    })
                    return
                }
                let linkedToAquaTreeWrapper: AquaTreeWrapper = {
                    aquaTree: templateApiFileInfo.aquaTree!!,
                    revision: "",
                    fileObject: linkedAquaTreeFileObj
                }
                let linkedAquaTreeResponse = await aquafier.linkAquaTree(mainAquaTreeWrapper, linkedToAquaTreeWrapper)

                if (linkedAquaTreeResponse.isErr()) {

                    setSubmittingTemplateData(false);
                    toaster.create({
                        description: `Error linking aqua tree`,
                        type: "error"
                    })
                    return
                }

                let aquaTreeData = linkedAquaTreeResponse.data.aquaTree!!

                let containsFileData = selectedTemplate?.fields.filter((e) => e.type == "file" || e.type == "image")
                if (containsFileData && containsFileData.length > 0) {

                    // for (let index = 0; index < containsFileData.length; index++) {
                    //     const element = containsFileData[index];
                    //     const file: File = formData[element['name']] as File

                    // Create an array to store all file processing promises
                    const fileProcessingPromises = containsFileData.map(async (element) => {
                        const file: File = formData[element.name] as File;

                        // Check if file exists
                        if (!file) {
                            console.warn(`No file found for field: ${element.name}`);
                            return null;
                        }

                        try {
                            // Convert File to Uint8Array
                            const arrayBuffer = await file.arrayBuffer();
                            const uint8Array = new Uint8Array(arrayBuffer);

                            // Create the FileObject with properties from the File object
                            const fileObjectPar: FileObject = {
                                fileContent: uint8Array,
                                fileName: file.name,
                                path: "./",
                                fileSize: file.size
                            };

                            return fileObjectPar;
                            // After this you can use fileObjectPar with aquafier.createGenesisRevision() or other operations
                        } catch (error) {
                            console.error(`Error processing file ${file.name}:`, error);

                            toaster.create({
                                description: `Error processing file ${file.name}`,
                                type: "error"
                            })
                            setSubmittingTemplateData(false);
                            return null;
                        }
                    });

                    // Wait for all file processing to complete
                    try {
                        const fileObjects = await Promise.all(fileProcessingPromises);
                        // Filter out null results (from errors)
                        const validFileObjects = fileObjects.filter(obj => obj !== null) as FileObject[];

                        // Now you can use validFileObjects
                        console.log(`Processed ${validFileObjects.length} files successfully`);

                        // Example usage with each file object:
                        for (let item of validFileObjects) {
                            let aquaTreeResponse = await aquafier.createGenesisRevision(item)

                            if (aquaTreeResponse.isErr()) {
                                console.error("Error linking aqua tree:", aquaTreeResponse.data.toString());

                                setSubmittingTemplateData(false);
                                toaster.create({
                                    title: 'Error  linking aqua',
                                    description: 'Error  linking aqua',
                                    type: 'error',
                                    duration: 5000,
                                });
                                return
                            }
                            // upload the single aqua tree 
                            await saveAquaTree(aquaTreeResponse.data.aquaTree!!, item, false, true)

                            // linke it to main aqua tree
                            const aquaTreeWrapper: AquaTreeWrapper = {
                                aquaTree: aquaTreeData,
                                revision: "",
                                fileObject: fileObject
                            }

                            const aquaTreeWrapper2: AquaTreeWrapper = {
                                aquaTree: aquaTreeResponse.data.aquaTree!!,
                                revision: "",
                                fileObject: item
                            }

                            let res = await aquafier.linkAquaTree(aquaTreeWrapper, aquaTreeWrapper2)
                            if (res.isErr()) {
                                console.error("Error linking aqua tree:", aquaTreeResponse.data.toString());

                                setSubmittingTemplateData(false);
                                toaster.create({
                                    title: 'Error  linking aqua',
                                    description: 'Error  linking aqua',
                                    type: 'error',
                                    duration: 5000,
                                });
                                return
                            }
                            aquaTreeData = res.data.aquaTree!!

                        }

                    } catch (error) {
                        console.error("Error processing files:", error);

                        setSubmittingTemplateData(false);
                        toaster.create({
                            title: 'Error proceessing files',
                            description: 'Error proceessing files',
                            type: 'error',
                            duration: 5000,
                        });
                        return
                    }

                }
                const aquaTreeWrapper: AquaTreeWrapper = {
                    aquaTree: aquaTreeData,
                    revision: "",
                    fileObject: fileObject
                }

                // sign the aqua chain
                let signRes = await aquafier.signAquaTree(aquaTreeWrapper, "metamask", dummyCredential())

                if (signRes.isErr()) {
                    setSubmittingTemplateData(false);
                    toaster.create({
                        description: `Error signing failed`,
                        type: "error"
                    })
                    return
                } else {
                    console.log("signRes.data", signRes.data)
                    fileObject.fileContent = formData
                    await saveAquaTree(signRes.data.aquaTree!!, fileObject, true)


                    // 
                    if (formData['signers'] != session?.address) {

                        await shareAquaTree(signRes.data.aquaTree!!, formData['signers'] as string)

                    }

                }

            } else {
                setSubmittingTemplateData(false);

                toaster.create({
                    title: 'Error creating Aqua tree from template',
                    description: 'Error creating Aqua tree from template',
                    type: 'error',
                    duration: 5000,
                });
            }
        }
        catch (error: any) {

            setSubmittingTemplateData(false);
            toaster.create({
                title: 'Error creating Aqua tree from template',
                description: error?.message ?? 'Unknown error',
                type: 'error',
                duration: 5000,
            });
        }
    }

    const loadTemplatesAquaTrees = async () => {
        const url3 = `${backend_url}/system/aqua_tree`;
        const systemFiles = await fetchSystemFiles(url3, session?.address ?? "")
        setSystemFileInfo(systemFiles)
    }

    const loadTemplates = async () => {
        try {
            // const loadedTemplates = getFormTemplates();
            //
            const url = `${backend_url}/templates`;

            const response = await axios.get(url, {
                headers: {
                    "nonce": session?.nonce
                }
            });

            if (response.status === 200 || response.status === 201) {
                //  console.log("update state ...")
                let loadedTemplates: FormTemplate[] = response.data.data;
                setFormTemplate(loadedTemplates);
                // toaster.create({
                //   description: `Form created successfully`,
                //   type: "success"
                // })
            }

        } catch (error) {
            toaster.create({
                title: 'Error loading templates',
                description: error instanceof Error ? error.message : 'Unknown error',
                type: 'error',
                duration: 5000,
            });
        }
    };

    const selectTemplateCallBack = (template: FormTemplate) => {
        setSelectedTemplate(template)
        template.fields.forEach((item) => {
            if (item.name == "wallet_address" || item.name == "sender") {
                setFormData((formData) => {
                    formData[item.name] = session!.address ?? "--"
                    return formData
                })
            }
        })
    }

    const closeDialog = () => {
        if (selectedTemplate) {
            setSelectedTemplate(null)
            setModalFormErorMessae("")
            setFormData({})
        } else {
            setOpen(false)
        }
    }


    useEffect(() => {
        if (session != null && session.nonce != undefined && backend_url != "http://0.0.0.0:0") {
            loadTemplates();
            loadTemplatesAquaTrees();
        }
    }, [backend_url, session]);

    useEffect(() => {
        if (selectedTemplate && selectedTemplate.name === "aqua_sign" && session?.address) {
            setMultipleAddresses([session.address])
        }
    }, [selectedTemplate])

    useEffect(() => {
        if (selectedTemplate && selectedTemplate.name === "aqua_sign" && multipleAddresses.length > 0) {
            setFormData((formData) => {
                formData["signers"] = multipleAddresses.join(",")
                return formData
            })
        }
    }, [multipleAddresses])


    return (
        <>
            <Box bg={{ base: 'rgb(255, 255, 255)', _dark: 'rgba(0, 0, 0, 0.9)' }} h={'70px'} pos={'sticky'} top={0} left={0} right={0} zIndex={1000} borderBottom={"1px solid "} borderColor={colorMode === "dark" ? "gray.900" : "gray.200"}>
                <HStack h={'100%'} px={"4"} justifyContent={'space-between'}>
                    <Link to={'/'} style={{ height: "100%", display: "flex", alignItems: "center" }}>
                        <Image src={colorMode === 'light' ? "/images/logo.png" : "/images/logo-dark.png"} maxH={'60%'} />
                    </Link>
                    <HStack display={{ base: 'flex', md: 'none' }} gap={"2"}>
                        <ConnectWallet />
                        <SmallScreenSidebarDrawer openCreateForm={() => setOpen(true)} />
                    </HStack>

                    <HStack h={'100%'} gap={"4"} justifyContent={'space-between'} display={{ base: 'none', md: 'flex' }}>
                        {
                            session ? (<>
                                <Group gap={4}>
                                    <Menu.Root onOpenChange={(open: MenuOpenChangeDetails) => setIsDropDownOpen(open.open)}  >
                                        <Menu.Trigger asChild >

                                            <Button variant="solid" size="sm" bg="blue.500">
                                                <Group>
                                                    <Text>Form</Text>
                                                    <LuSquareChartGantt />

                                                    {isDropDownOpen ? (
                                                        <LuChevronUp />
                                                    ) : (
                                                        <LuChevronDown />
                                                    )}
                                                </Group>
                                            </Button>

                                        </Menu.Trigger>
                                        <Portal>
                                            <Menu.Positioner>
                                                <Menu.Content>
                                                    <Menu.Item value="new-txt" onClick={() => {
                                                        navigate("/aqua-forms")
                                                    }} cursor={"pointer"}>
                                                        Manage templates
                                                    </Menu.Item>
                                                    <Menu.Item value="new-file" onClick={() => {
                                                        setOpen(true)
                                                    }} cursor={"pointer"}>
                                                        Create Form from template
                                                    </Menu.Item>
                                                </Menu.Content>
                                            </Menu.Positioner>
                                        </Portal>
                                    </Menu.Root>

                                </Group>
                            </>
                            ) : null
                        }
                        <VersionAndDisclaimer inline={false} open={versionOpen} updateOpenStatus={(open) => setVersionOpen(open)} />
                        {
                            session ? (<>
                                <AccountContracts inline={false} open={contractsOpen} updateOpenStatus={(open) => setContractsOpen(open)} />
                                <Settings inline={false} open={settingsOpen} updateOpenStatus={(open) => {
                                    console.log(open)
                                    setSettingsOpen(open)
                                }} />
                            </>
                            ) : null
                        }
                        <ConnectWallet />
                    </HStack>
                </HStack>
            </Box>

            <DialogRoot size={{ md: 'lg', smDown: 'full' }} placement={'top'} open={open}
                onOpenChange={(e) => {
                    if (!e.open) {
                        setMultipleAddresses([])
                    }
                }}
            >
                <DialogContent borderRadius={{ base: 0, md: 'xl' }}>
                    <DialogHeader py={"3"} px={"5"}>
                        {selectedTemplate ?
                            <Text>Create {selectedTemplate.title} Aqua Tree</Text> :
                            <Text>Create Form from template</Text>}
                    </DialogHeader>
                    <DialogBody>
                        {selectedTemplate == null ? (

                            <SimpleGrid columns={{ base: 2, md: 3 }} gap={2}>
                                {formTemplates.map((template, i: number) => (
                                    <FormTemplateCard key={`template_${i}`} template={template} selectTemplateCallBack={selectTemplateCallBack} />
                                ))}
                            </SimpleGrid>)
                            : (
                                <form onSubmit={createWorkflowFromTemplate} id="create-aqua-tree-form">
                                    {modalFormErorMessae.length > 0 ?
                                        <Alert title="No Data">
                                            {modalFormErorMessae}
                                        </Alert>
                                        : <></>
                                    }
                                    <Stack marginBottom={10}>
                                        {selectedTemplate ? selectedTemplate.fields.map((field) => {

                                            const isFileInput = field.type === 'file' || field.type === 'image';

                                            if (field.is_array) {

                                                return <Stack >
                                                    <HStack alignItems={'flex-end'} justify={'space-between'}>
                                                        <Text fontSize={"lg"}>{field.label}</Text>
                                                        {/* Add a new address input */}
                                                        <IconButton aria-label="Add Address" size={"sm"} borderRadius={"lg"} onClick={addAddress}>
                                                            <LuPlus />
                                                        </IconButton>
                                                    </HStack>
                                                    {/* Display all addresses and ability to update them through input */}
                                                    {
                                                        multipleAddresses.map((address, index) => {
                                                            return <HStack alignItems={'flex-end'}>
                                                                <Field>
                                                                    <HStack w={"full"}>
                                                                        <Text fontSize={"lg"}>{index + 1}. </Text>
                                                                        <Box flex={1}>
                                                                            <Input
                                                                                // disabled={session?.address === address}
                                                                                borderRadius={"lg"} value={address} onChange={(ev) => {
                                                                                    let newData = multipleAddresses.map((e, i) => {
                                                                                        if (i == index) {
                                                                                            return ev.target.value
                                                                                        }
                                                                                        return e
                                                                                    })
                                                                                    setMultipleAddresses(newData)
                                                                                }} size={"sm"} />
                                                                        </Box>
                                                                    </HStack>
                                                                </Field>
                                                                {/* Remove address given index */}
                                                                <IconButton aria-label="Remove address" size={"sm"} borderRadius={"lg"} onClick={() => removeAddress(index)}>
                                                                    <LuTrash />
                                                                </IconButton>
                                                            </HStack>
                                                        })
                                                    }
                                                </Stack>

                                            }

                                            // For file inputs, we don't want to set the value prop
                                            return <Field label={field.label} errorText={''}>
                                                <Input
                                                    borderRadius={"md"}
                                                    size={"sm"}
                                                    // value={formData[field.name]}
                                                    // Only set value for non-file inputs
                                                    {...(!isFileInput ? { value: formData[field.name] as string | number } : {})}
                                                    type={field.type == 'image' ? 'file' : field.type}
                                                    onChange={(e) => {
                                                        // setFormData({
                                                        //     ...formData,
                                                        //     [field.name]: e.target.value
                                                        // })

                                                        if (field.type == 'image') {
                                                            const files: File | FileList | null = e?.target?.files;

                                                            if (!files || files.length === 0) {
                                                                return;
                                                            }

                                                            const file = files[0]
                                                            if (file && file.type.startsWith('image/')) {
                                                                // Valid image file
                                                                console.log("Valid ")
                                                            } else {
                                                                // Invalid file type
                                                                alert('Please select an image file');
                                                                e.target.value = ''; // Clear the input
                                                                return
                                                            }
                                                        }
                                                        const value = isFileInput && e.target.files
                                                            ? e.target.files[0] // Get the file object
                                                            : e.target.value;   // Get the input value

                                                        setFormData({
                                                            ...formData,
                                                            [field.name]: value
                                                        });
                                                    }}
                                                    required={field.required}
                                                />
                                            </Field>
                                        }) : null}
                                    </Stack>
                                </form>
                            )
                        }
                    </DialogBody>
                    <DialogFooter>
                        <HStack w={'100%'} justifyContent={'end'}>
                            <HStack>
                                {selectedTemplate ?
                                    <Button type="submit" ml={3} mr={3} colorPalette={'green'} ref={cancelRef} onClick={createWorkflowFromTemplate} form="create-aqua-tree-form">


                                        {submittingTemplateData ? <>
                                            <Spinner size="inherit" color="inherit" />
                                            loading
                                        </> : <span>Create</span>}

                                    </Button>
                                    : null
                                }
                                {/* <DialogActionTrigger asChild> */}
                                <Button variant="outline" onClick={() => {
                                    setSubmittingTemplateData(false)
                                    closeDialog()
                                }}>Cancel</Button>
                                {/* </DialogActionTrigger> */}
                            </HStack>
                        </HStack>
                    </DialogFooter>
                    <DialogCloseTrigger onClick={() => {
                        setSubmittingTemplateData(false)
                        closeDialog()
                    }} />
                </DialogContent>
            </DialogRoot>
        </>
    )
}

export default Navbar