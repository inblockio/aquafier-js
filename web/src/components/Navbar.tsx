import { Box, Group, HStack, Image, Text, Menu, Button, Portal, MenuOpenChangeDetails, Stack, Input, Flex, Center, SimpleGrid } from "@chakra-ui/react"
import Settings from "./chakra-ui/settings"
import ConnectWallet from "./ConnectWallet"
import { useColorMode } from "./chakra-ui/color-mode"
import appStore from "../store"
import { useStore } from "zustand"
import VersionAndDisclaimer from "./VersionAndDisclaimer"
import { Link, NavLink, useNavigate } from "react-router-dom"
import AccountContracts from "./AccountContracts"
import { Alert } from "../components/chakra-ui/alert"
import { LuChevronDown, LuChevronUp, LuSquareChartGantt } from "react-icons/lu"
import { HiDocumentPlus } from "react-icons/hi2";
import React, { useEffect, useState } from "react"
import { estimateFileSize, dummyCredential, getAquaTreeFileName, getAquaTreeFileObject, getRandomNumber, fetchSystemFiles, isValidEthereumAddress } from "../utils/functions"
import { FormTemplate } from "../components/aqua_forms"
import { Field } from '../components/chakra-ui/field';
import Aquafier, { AquaTree, AquaTreeWrapper, FileObject } from "aqua-js-sdk"

import { toaster } from "../components/chakra-ui/toaster";
import axios from "axios"
import { DialogBody, DialogCloseTrigger, DialogContent, DialogFooter, DialogHeader, DialogRoot } from "./chakra-ui/dialog";
import SmallScreenSidebarDrawer from "./SmallScreenSidebarDrawer"


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

    const [isDropDownOpen, setIsDropDownOpen] = useState(false);
    const [modalFormErorMessae, setModalFormErorMessae] = useState("");
    // const { open, onOpen, onClose } = useDisclosure();
    const [open, setOpen] = useState(false)
    const { session, formTemplates, backend_url, systemFileInfo, setFormTemplate, setFiles, setSystemFileInfo } = useStore(appStore)
    const [formData, setFormData] = useState<Record<string, string | File | number>>({})
    const [selectedTemplate, setSelectedTemplate] = useState<FormTemplate | null>(null);
    let navigate = useNavigate();


    const cancelRef = React.useRef<HTMLButtonElement>(null);

    const saveAquaTree = async (aquaTree: AquaTree, fileObject: FileObject, isFinal: boolean = false) => {
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
                if (isFinal) {
                    setFiles(response.data.files);
                    toaster.create({
                        description: `Aqua tree created successfully`,
                        type: "success"
                    });
                    // onClose();
                    setOpen(false)
                    setModalFormErorMessae("")
                }
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



    const createFormAndSign = async (e: React.FormEvent) => {
        e.preventDefault();



        for (let fieldItem of selectedTemplate!.fields) {
            let valueInput = formData[fieldItem.name]
            console.log(`fieldItem ${JSON.stringify(fieldItem)} \n formData ${JSON.stringify(formData)} valueInput ${valueInput} `)
            if (fieldItem.required && valueInput == undefined) {
                setModalFormErorMessae(`${fieldItem.name} is mandatory`)
                return
            }

            if (fieldItem.type === 'wallet_address') {
                if (typeof valueInput === 'string') {
                    let isValidWalletAddress = isValidEthereumAddress(valueInput)
                    if (!isValidWalletAddress) {
                        setModalFormErorMessae(`${valueInput} is not a valid wallet adress`)
                        return
                    }
                } else {
                    setModalFormErorMessae(`${valueInput} provided at ${fieldItem.name} is not a string`)
                    return
                }
            }

        }


        if (systemFileInfo.length == 0) {
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
            toaster.create({
                description: `Aqua tree for ${selectedTemplate?.name} not found`,
                type: "error"
            })
            return
        }

        let aquafier = new Aquafier();
        const filteredData: Record<string, string | number> = {};

        Object.entries(formData).forEach(([key, value]) => {
            // Only include values that are not File objects
            if (!(value instanceof File)) {
                filteredData[key] = value;
            }
        });


        let estimateize = estimateFileSize(JSON.stringify(formData));

        const jsonString = JSON.stringify(formData, null, 4);

        const randomNumber = getRandomNumber(100, 1000);
        const fileObject: FileObject = {
            fileContent: jsonString,
            fileName: `${selectedTemplate?.name ?? "template"}-${randomNumber}.json`,
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
                toaster.create({
                    description: `Error linking aqua tree`,
                    type: "error"
                })
                return
            }

            let aquaTreeData = linkedAquaTreeResponse.data.aquaTree!!

            let containsFileData = selectedTemplate?.fields.filter((e) => e.type == "file")
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

                            toaster.create({
                                title: 'Error  linking aqua',
                                description: 'Error  linking aqua',
                                type: 'error',
                                duration: 5000,
                            });
                            return
                        }
                        // upload the single aqua tree 
                        await saveAquaTree(aquaTreeResponse.data.aquaTree!!, fileObject, false)

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
                toaster.create({
                    description: `Error signing failed`,
                    type: "error"
                })
                return
            } else {
                console.log("signRes.data", signRes.data)
                fileObject.fileContent = formData
                await saveAquaTree(signRes.data.aquaTree!!, fileObject, true)

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
            if (item.name == "wallet_address") {
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
                    <NavLink to="/pdf-signer">
                        <Button variant="solid" size="sm" bg="blue.500">
                            PDF Signer
                        </Button>
                    </NavLink>
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
            //  onOpenChange={e => {
            //     if (!e.open) {
            //         closeDialog()
            //     } else {
            //         setOpen(e.open)
            //     }
            // }}
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
                                <form onSubmit={createFormAndSign} id="create-aqua-tree-form">
                                    {modalFormErorMessae.length > 0 ?
                                        <Alert title="No Data">
                                            {modalFormErorMessae}
                                        </Alert>
                                        : <></>
                                    }
                                    <Stack marginBottom={10}>
                                        {selectedTemplate ? selectedTemplate.fields.map((field) => {
                                            // For file inputs, we don't want to set the value prop
                                            const isFileInput = field.type === 'file';
                                            return <Field label={field.label} errorText={''}>
                                                <Input
                                                    borderRadius={"md"}
                                                    size={"sm"}
                                                    // value={formData[field.name]}
                                                    // Only set value for non-file inputs
                                                    {...(!isFileInput ? { value: formData[field.name] as string | number } : {})}
                                                    type={field.type}
                                                    onChange={(e) => {
                                                        // setFormData({
                                                        //     ...formData,
                                                        //     [field.name]: e.target.value
                                                        // })

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
                                    <Button type="submit" ml={3} mr={3} colorPalette={'green'} ref={cancelRef} onClick={createFormAndSign} form="create-aqua-tree-form">
                                        Create
                                    </Button>
                                    : null
                                }
                                {/* <DialogActionTrigger asChild> */}
                                <Button variant="outline" onClick={closeDialog}>Cancel</Button>
                                {/* </DialogActionTrigger> */}
                            </HStack>
                        </HStack>
                    </DialogFooter>
                    <DialogCloseTrigger onClick={closeDialog} />
                </DialogContent>
            </DialogRoot>
        </>
    )
}

export default Navbar