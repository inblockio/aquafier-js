import { Box, Group, HStack, Image, Text, Menu, Button, Portal, MenuOpenChangeDetails, Stack, Input, useDisclosure, Flex, Center } from "@chakra-ui/react"
// import { Wrap, WrapItem } from "@chakra-ui/react"
import { LuPlus } from 'react-icons/lu';
import Settings from "./chakra-ui/settings"
import ConnectWallet from "./ConnectWallet"
import { useColorMode } from "./chakra-ui/color-mode"
import appStore from "../store"
import { useStore } from "zustand"
import VersionAndDisclaimer from "./VersionAndDisclaimer"
import { Link, useNavigate } from "react-router-dom"
import AccountContracts from "./AccountContracts"
import { Alert } from "../components/chakra-ui/alert"
import { LuChevronDown, LuChevronUp, LuSquareChartGantt } from "react-icons/lu"
import {
    Modal,
    ModalBody,
    ModalCloseButton,
    ModalContent,
    ModalFooter,
    ModalHeader,
    ModalOverlay,
} from '@chakra-ui/modal'
import React, { useEffect, useState } from "react"
import { estimateFileSize, dummyCredential } from "../utils/functions"
// import { DialogBackdrop, DialogBody, DialogContent, DialogFooter, DialogHeader, DialogRoot } from '../components/chakra-ui/dialog';
import { FormTemplate } from "../components/aqua_forms"
import { Field } from '../components/chakra-ui/field';
import Aquafier, { AquaTree, AquaTreeWrapper, FileObject } from "aqua-js-sdk"

import { toaster } from "../components/chakra-ui/toaster";
import axios from "axios"
// interface INavlinkItem {
//     label: string
//     to: string
//     icon?: ReactNode
// }

// const navlinks: INavlinkItem[] = [
//     {
//         label: "Forms",
//         to: "/aqua-forms"
//     },
// {
//     label: "Form Generator",
//     to: "/form-generator"
// }
// ]
/**
 *  {
                                        navlinks.map((item, i: number) => (
                                            <CustomNavlinkItem key={`navitem_${i}`} {...item} />
                                        ))
                                    }


 */

// const CustomNavlinkItem = ({ label, to }: INavlinkItem) => {


//     return (
// <Link to={to}>
//     <LinkBox bg="blue.500" p={2} borderRadius="md">
//         <Group>
//             <Text>{label}</Text>
//             <LuSquareChartGantt />
//         </Group>
//     </LinkBox>
// </Link>
//     )
// }




const Navbar = () => {
    const { colorMode } = useColorMode()

    const [isDropDownOpen, setIsDropDownOpen] = useState(false);
    const [modalFormErorMessae, setModalFormErorMessae] = useState("");
    const { open, onOpen, onClose } = useDisclosure();
    const { session, formTemplates, backend_url, setFormTemplate, setFiles } = useStore(appStore)
    const [formData, setFormData] = useState<Record<string, string>>({})
    const [selectedTemplate, setSelectedTemplate] = useState<FormTemplate | null>(null);
    let navigate = useNavigate();


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
                setFiles(response.data.files);
                toaster.create({
                    description: `Aqua tree created successfully`,
                    type: "success"
                });
                onClose();
                setModalFormErorMessae("")
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
        }

        let aquafier = new Aquafier();
        let estimateize = estimateFileSize(JSON.stringify(formData));

        const jsonString = JSON.stringify(formData, null, 4);

        let fileObject: FileObject = {
            fileContent: jsonString,
            fileName: `${selectedTemplate?.name ?? "template"}.json`,
            path: './',
            fileSize: estimateize
        }
        let res = await aquafier.createGenesisRevision(fileObject, true, false, false)

        if (res.isOk()) {

            const aquaTreeWrapper: AquaTreeWrapper = {
                aquaTree: res.data.aquaTree!!,
                revision: "",
                fileObject: fileObject
            }

            // sign the aqua chain
            let signRes = await aquafier.signAquaTree(aquaTreeWrapper, "metamask", dummyCredential())
            console.log("aqua tree after", res.data.aquaTree)
            if (signRes.isErr()) {
                toaster.create({
                    description: `Error signing failed`,
                    type: "error"
                })
            } else {
                console.log("signRes.data", signRes.data)
                fileObject.fileContent = formData
                await saveAquaTree(signRes.data.aquaTree!!, fileObject)

            }
        } else {
            console.log(res.data)
            toaster.create({
                title: 'Error creating Aqua tree from template',
                description: 'Error creating Aqua tree from template',
                type: 'error',
                duration: 5000,
            });
        }
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

    // Array of Chakra UI colors for random assignment
    const colorOptions = [
        "red.100", "green.100", "blue.100", "purple.100",
        "yellow.100", "orange.100", "teal.100", "cyan.100",
        "pink.100"
    ];

    // Function to get a random color from the options
    const getRandomColor = () => {
        const randomIndex = Math.floor(Math.random() * colorOptions.length);
        return colorOptions[randomIndex];
    };


    useEffect(() => {
        if (session != null && session.nonce != undefined && backend_url != "http://0.0.0.0:0") {
            loadTemplates();
        }
    }, [backend_url, session]);


    return (
        <div>
            <Box bg={{ base: 'rgb(188 220 255 / 22%)', _dark: 'rgba(0, 0, 0, 0.3)' }} h={'70px'}>
                <HStack h={'100%'} px={"4"} justifyContent={'space-between'}>
                    <Link to={'/'} style={{ height: "100%", display: "flex", alignItems: "center" }}>
                        <Image src={colorMode === 'light' ? "/images/logo.png" : "/images/logo-dark.png"} maxH={'60%'} />
                    </Link>
                    <HStack h={'100%'} gap={"4"} justifyContent={'space-between'}>
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
                                                        <LuChevronUp className="w-5 h-5" />
                                                    ) : (
                                                        <LuChevronDown className="w-5 h-5" />
                                                    )}
                                                </Group>
                                            </Button>

                                        </Menu.Trigger>
                                        <Portal>
                                            <Menu.Positioner>
                                                <Menu.Content>
                                                    <Menu.Item value="new-txt" onClick={() => {
                                                        navigate("/aqua-forms")
                                                    }}>Manage templates</Menu.Item>
                                                    <Menu.Item value="new-file" onClick={() => {
                                                        onOpen()
                                                    }}>Create Aqua Tree from template</Menu.Item>

                                                </Menu.Content>
                                            </Menu.Positioner>
                                        </Portal>
                                    </Menu.Root>

                                    {/* {FormDropdown()} */}

                                </Group>
                            </>
                            ) : null
                        }
                        <VersionAndDisclaimer />
                        <ConnectWallet />
                        {
                            session ? (<>
                                <AccountContracts />
                                <Settings />
                            </>
                            ) : null
                        }
                    </HStack>
                </HStack>
            </Box>


            <Modal isOpen={open} onClose={() => {
                // setUploading(false)
                setSelectedTemplate(null)
                setModalFormErorMessae("")
                onClose()
            }} isCentered>
                <ModalOverlay
                    backgroundColor="rgba(0, 0, 0, 0.5)"
                    backdropFilter="blur(2px)"
                />
                <ModalContent
                    maxW="650px"
                    w="90%"
                    mx="auto"
                    mt="50px"
                    borderRadius="16px"
                    boxShadow="0 5px 15px rgba(0, 0, 0, 0.5)"
                    bg="white"
                    border="1px solid rgba(0, 0, 0, 0.2)"
                    p={25}
                    overflow="hidden"
                >
                    <ModalHeader
                        borderBottom="1px solid #e9ecef"
                        py={3}
                        px={4}
                        fontSize="16px"
                        fontWeight="500"
                    >
                        {selectedTemplate ?
                            <Text>Create {selectedTemplate.title} Aqua Tree</Text> :
                            <Text>Create Aqua tree from template</Text>}
                    </ModalHeader>
                    <ModalCloseButton
                        position="absolute"
                        right="10px"
                        top="10px"
                        size="sm"
                        borderRadius="50%"
                        bg="transparent"
                        border="none"
                        _hover={{ bg: "gray.100" }}
                    />
                    <ModalBody py={4} px={4} overflowY="auto" overflowX="hidden">

                        {selectedTemplate == null ?
                            <Stack direction="row"
                                flexWrap="wrap"
                                height="100%"
                                align="flex-start"
                                justifyContent="flex-start"
                                p={4}>


                                {formTemplates.map((template) =>

                                    <Box
                                        borderWidth="1px"
                                        borderStyle="dotted"
                                        borderColor="gray.300"
                                        borderRadius="md"
                                        w="150px"
                                        bg={getRandomColor()}
                                        h="120px"
                                        p={4}
                                        onClick={() => {

                                            setSelectedTemplate(template)
                                            template.fields.forEach((item) => {
                                                if (item.name == "wallet_address") {
                                                    setFormData((formData) =>  {
                                                        formData[item.name] = session!.address ?? "--"
                                                        return formData
                                                    })
                                                }
                                            })
                                            onOpen()
                                        }}
                                    >
                                        <Flex direction="column" align="center" justify="center" h="100%">
                                            <Text textAlign="center" mb={2} ml={2} mr={2} fontWeight="medium">
                                                {template.title}
                                            </Text>
                                            <Center
                                                mt={2}
                                                borderRadius="full"
                                                bg="blue.100"
                                                w="28px"
                                                h="28px"
                                            >
                                                <LuPlus color="blue" size={16} />
                                            </Center>
                                        </Flex>
                                    </Box>
                                )}


                            </Stack>
                            :
                            <form onSubmit={createFormAndSign} id="create-aqua-tree-form">
                                {modalFormErorMessae.length > 0 ?
                                    <Alert title="No Data">
                                        {modalFormErorMessae}
                                    </Alert>
                                    : <></>
                                }
                                <Stack marginBottom={10}>
                                    {selectedTemplate ? selectedTemplate.fields.map((field) => {

                                        return <Field label={field.label} errorText={''}>
                                            <Input
                                                borderRadius={"sm"}
                                                size={"xs"}
                                                value={formData[field.name]}
                                                type={field.type}
                                                onChange={(e) => {
                                                    setFormData({
                                                        ...formData,
                                                        [field.name]: e.target.value
                                                    })
                                                }}
                                                required={field.required}
                                            />
                                        </Field>
                                    }) : null}
                                </Stack>
                            </form>
                        }
                    </ModalBody>

                    <ModalFooter
                        borderTop="1px solid #e9ecef"
                        py={3}
                        px={4}
                        justifyContent="flex-end"
                    >

                        {selectedTemplate ?
                            <Button type="submit" ml={3} mr={3} colorPalette={'green'} ref={cancelRef} onClick={createFormAndSign} form="create-aqua-tree-form">
                                Create
                            </Button>
                            : <></>
                        }
                        <Button
                            bg="black"
                            color="white"
                            mr={3}
                            onClick={() => {
                                // setUploading(false)
                                setSelectedTemplate(null)
                                setModalFormErorMessae("")
                                onClose()
                            }}
                            size="sm"
                            borderRadius="sm"
                            _hover={{ bg: "gray.800" }}
                        >
                            Cancel
                        </Button>
                        {/* <Button
                                        bg="gray.500"
                                        color="white"
                                        onClick={handleContinue}
                                        disabled={!selectedFile}
                                        size="sm"
                                        _hover={{ bg: "gray.600" }}
                                        borderRadius="sm"
                                    >
                                        Continue
                                    </Button> */}
                    </ModalFooter>
                </ModalContent>
            </Modal>
        </div>
    )
}

export default Navbar