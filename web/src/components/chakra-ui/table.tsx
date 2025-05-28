"use client"

import { Box, Card, CardBody, Drawer, FormatByte, Group, Kbd, Portal, Table, Text, VStack } from "@chakra-ui/react"
import {
    ActionBarContent,
    ActionBarRoot,
    ActionBarSelectionTrigger,
    ActionBarSeparator,
} from "./action-bar"
import { Button } from "./button"
import { Checkbox } from "./checkbox"
import { SetStateAction, useEffect, useState } from "react"
import { useStore } from "zustand"
import appStore from "../../store"
import { displayTime, getAquaTreeFileObject, getFileCategory, getFileExtension, getAquaTreeFileName, isWorkFlowData } from "../../utils/functions"

import { DeleteAquaChain, LinkButton, DownloadAquaChain, SignAquaChain, WitnessAquaChain } from "../aqua_chain_actions"
import { ChainDetailsBtn, CompleteChainView } from "../CustomDrawer"
import { Alert } from "./alert"
import { ApiFileInfo } from "../../models/FileInfo"
import ShareButtonAction from "../actions/ShareButtonAction"
import { DrawerActionTrigger, DrawerBackdrop, DrawerBody, DrawerContent, DrawerFooter, DrawerRoot, DrawerTitle } from "./drawer"
import { LuX } from "react-icons/lu"
import { IDrawerStatus } from "../../models/AquaTreeDetails"
import { FileObject } from "aqua-js-sdk"
import { useNavigate } from "react-router-dom"
import { FaFileExport } from "react-icons/fa6"


const FilesTable = () => {
    const [filesToDisplay, setFilesToDisplay] = useState<ApiFileInfo[]>([])
    const { files, backend_url, session, setSelectedFileInfo, selectedFileInfo, systemFileInfo } = useStore(appStore)
    const [selection, setSelection] = useState<string[]>([])

    const [disableDrawerAction, setDisableDrawerActions] = useState(false)
    const [isOpen, setIsOpen] = useState(false)
    // const [fileInfo, setFileInfo] = useState<ApiFileInfo | null>(null)
    const [drawerStatus, setDrawerStatus] = useState<IDrawerStatus | null>(null)

    let navigate = useNavigate();

    // const aquafier = new Aquafier();
    const hasSelection = selection.length > 0
    const indeterminate = hasSelection && selection.length < files.length

    const openChainDetailsView = (_fileInfo: ApiFileInfo) => {
        setSelectedFileInfo(_fileInfo)
        setIsOpen(true)
    }

    const updateDrawerStatus = (_drawerStatus: IDrawerStatus) => {
        setDrawerStatus(_drawerStatus)
    }



    const showActionButtons = (isWorkFlow: boolean, workFlow: string, item: ApiFileInfo) => {

        if (isWorkFlow) {
            if (workFlow == "aqua_sign.json" || workFlow == "aqua_sign") {
                return <>
                    <Button size={'xs'} colorPalette={'cyan'} variant={'subtle'} w={'208px'} onClick={(e) => {
                        e.preventDefault();
                        setSelectedFileInfo(item)
                        navigate("/workflow")
                    }} >
                        <FaFileExport />
                        Open Workflow
                    </Button>
                    <ShareButtonAction nonce={session?.nonce ?? ""} item={item} />
                    <ChainDetailsBtn callBack={() => {
                        setDisableDrawerActions(true)
                        openChainDetailsView(item)
                    }} />
                    <DeleteAquaChain apiFileInfo={item} backendUrl={backend_url} nonce={session?.nonce ?? ""} revision="" />
                    <DownloadAquaChain file={item} />
                </>
            }

            return <>{isWorkFlow ? "true" : "False"} {workFlow}</>
        }


        return <>
            <ChainDetailsBtn callBack={() => {
                setDisableDrawerActions(false)
                openChainDetailsView(item)
            }} />
            <SignAquaChain apiFileInfo={item} backendUrl={backend_url} nonce={session?.nonce ?? ""} revision="" />
            <WitnessAquaChain apiFileInfo={item} backendUrl={backend_url} nonce={session?.nonce ?? ""} revision="" />
            <LinkButton item={item} nonce={session?.nonce ?? ""} />

            {/* <ShareButton nonce={session?.nonce ?? ""} item={item} /> */}
            <ShareButtonAction nonce={session?.nonce ?? ""} item={item} />
            <DeleteAquaChain apiFileInfo={item} backendUrl={backend_url} nonce={session?.nonce ?? ""} revision="" />
            <DownloadAquaChain file={item} />
        </>


    }


    console.log("System file info: ", JSON.stringify(systemFileInfo, null, 4))
    const tableItem = (fileObject: FileObject, item: ApiFileInfo, index: number) => {
        console.log("Item: ", item.aquaTree)
        let { isWorkFlow, workFlow } = isWorkFlowData(item.aquaTree!!, systemFileInfo.map((e) => {
            try {
                return getAquaTreeFileName(e.aquaTree!!)
            } catch (e) {
                console.log("Error")
                return ""
            }
        }));

        // { isWorkFlow : false  , workFlow: ''}
        // let isWorkFlow = true;
        // let workFlow = "aqua_sign";


        return <Table.Row
            key={index}
        // data-selected={selection.includes(item.fileObject[0].fileName)?? "--" ? "" : undefined}
        >
            <Table.Cell>
                <Checkbox
                    top="1"
                    aria-label="Select File"
                    checked={selection.includes(index.toString())}
                    onCheckedChange={(changes) => {
                        setSelection((prev) =>
                            changes.checked
                                ? [...prev, index.toString()]
                                : selection.filter((id) => id !== index.toString()),
                        )
                    }}
                />
            </Table.Cell>
            <Table.Cell minW={'180px'} maxW={'180px'} textWrap={'wrap'}>{fileObject.fileName}</Table.Cell>
            <Table.Cell minW={'120px'} maxW={'120px'} textWrap={'wrap'}>{getFileCategory(getFileExtension(fileObject.fileName))}</Table.Cell>

            <Table.Cell minW={'140px'} maxW={'140px'} textWrap={'wrap'}>
                {
                    displayTime(Object.values(item.aquaTree?.revisions! ?? {})[0].local_timestamp)
                }
            </Table.Cell>
            <Table.Cell minW={'100px'} maxW={'100px'} textWrap={'wrap'}>
                <FormatByte value={
                    fileObject.fileSize ?? 0
                } />
            </Table.Cell>
            <Table.Cell minW={'220px'} maxW={'220px'} textWrap={'wrap'}>
                <Group alignItems={'space-between'} flexWrap={'wrap'} position={"relative"}>

                    {showActionButtons(isWorkFlow, workFlow, item)}

                </Group>
            </Table.Cell>
        </Table.Row>
    }

    const tableItems = () => {
        return files?.sort((a, b) => {
            const filenameA = getAquaTreeFileName(a.aquaTree!!);
            const filenameB = getAquaTreeFileName(b.aquaTree!!);
            return filenameA.localeCompare(filenameB);
        }).map((item: ApiFileInfo, index: number) => {
            // console.log("Item: ", item.aquaTree)
            // return <Text>{JSON.stringify(item, null, 4)}</Text>

            let fileObject = getAquaTreeFileObject(item)
            if (fileObject) {
                return tableItem(fileObject, item, index)
            } else {
                return <>Error</>
            }

        })
    }


    const smallTableItem = (fileObject: FileObject, item: ApiFileInfo, _index: number, isWorkFlow: boolean, workFlow: string) => {

        return <Box key={`sm_${Object.keys(item.aquaTree?.revisions! ?? {})[0]}`} bg={'gray.100'} _dark={{
            bg: 'blackAlpha.950'
        }} p={2} borderRadius={'10px'}>
            <VStack textAlign={'start'}>
                <Text textAlign={'start'} w={'100%'}>{fileObject.fileName}</Text>
                <Group alignItems={'start'} flexWrap={'wrap'}>

                    {showActionButtons(isWorkFlow, workFlow, item)}
                    {/* <ChainDetailsBtn callBack={() => openChainDetailsView(item)} />
                    <SignAquaChain apiFileInfo={item} backendUrl={backend_url} nonce={session?.nonce ?? ""} revision="" />
                    <WitnessAquaChain apiFileInfo={item} backendUrl={backend_url} nonce={session?.nonce ?? ""} revision="" />
                    <LinkButton item={item} nonce={session?.nonce ?? ""} />
                  
                    <ShareButtonAction item={item} nonce={session?.nonce ?? ""} />
                    <DeleteAquaChain apiFileInfo={item} backendUrl={backend_url} nonce={session?.nonce ?? ""} revision="" />
                    <DownloadAquaChain file={item} /> */}
                </Group>
            </VStack>
        </Box>
    }

    const smallTableItems = () => {
        return files?.map((item: ApiFileInfo, index: number) => {
            // console.log("Item: ", item.aquaTree)
            // return <Text>{JSON.stringify(item, null, 4)}</Text>

            let fileObject = getAquaTreeFileObject(item)

            // console.log(`Daata ${JSON.stringify(item.aquaTree, null, 4)}`)
            // TODO: Fix this; type overloads here, `someData` can't be used in `isWorkflow` function. Type mismatch
            let someData = systemFileInfo.map((e) => {
                try {
                    return getAquaTreeFileName(e.aquaTree!!)
                } catch (e) {
                    console.log("Error")
                    return ""
                }
            })
            let { isWorkFlow, workFlow } = isWorkFlowData(item.aquaTree!!, someData);


            if (fileObject) {
                return smallTableItem(fileObject, item, index, isWorkFlow, workFlow)
            } else {
                return <></>
            }

        })

    }

    useEffect(() => {
        if (files) {
            setFilesToDisplay(files)
        }
    }, [files])

    useEffect(() => {
        if (files) {
            const processFiles = (chunkSize = 1) => {
                let currentIndex = 0;
                const chunkedFiles: SetStateAction<ApiFileInfo[]> = [];

                const processChunk = () => {
                    const chunk = files.slice(currentIndex, currentIndex + chunkSize);
                    chunkedFiles.push(...chunk);
                    currentIndex += chunkSize;

                    if (currentIndex < files.length) {
                        setTimeout(processChunk, 0); // Process the next chunk
                    } else {
                        setFilesToDisplay(chunkedFiles); // Update state after all chunks are processed
                    }
                };

                processChunk();
            };

            processFiles();
        }
    }, [files]);


    return (
        <Card.Root px={1} borderRadius={'2xl'}>
            <Card.Header>
                <Text fontWeight={500} fontSize={'2xl'}>Files</Text>
            </Card.Header>
            <CardBody px={0}>
                <Box hideFrom={'md'}>
                    <VStack gap={4}>
                        {smallTableItems()}
                    </VStack>
                </Box>
                <Table.ScrollArea hideBelow={'md'}>
                    <Table.Root borderRadius={'2xl'} borderCollapse={'collapse'} borderSpacing={'4'}>
                        <Table.Header>
                            <Table.Row>
                                <Table.ColumnHeader w="6">
                                    <Checkbox
                                        top="1"
                                        aria-label="Select all rows"
                                        checked={indeterminate ? "indeterminate" : selection.length > 0}
                                        onCheckedChange={(_changes) => {
                                            //todo fix me
                                            // let genesis =  Object.values(files.)
                                            // let fileHash =   getFileHashFromUrl()
                                            // setSelection(
                                            //     changes.checked ? files.map((item: ApiFileInfo) => item.id.toString()) : [],
                                            // )
                                        }}
                                    />
                                </Table.ColumnHeader>
                                <Table.ColumnHeader fontWeight={600} fontSize={{ base: 'sm', md: 'md' }}>File Name</Table.ColumnHeader>
                                <Table.ColumnHeader fontWeight={600} fontSize={{ base: 'sm', md: 'md' }}>Type</Table.ColumnHeader>
                                <Table.ColumnHeader fontWeight={600} fontSize={{ base: 'sm', md: 'md' }}>Uploaded At</Table.ColumnHeader>
                                <Table.ColumnHeader fontWeight={600} fontSize={{ base: 'sm', md: 'md' }}>File Size</Table.ColumnHeader>
                                <Table.ColumnHeader fontWeight={600} fontSize={{ base: 'sm', md: 'md' }}>Action</Table.ColumnHeader>
                            </Table.Row>
                        </Table.Header>
                        <Table.Body>
                            {tableItems()}
                            {filesToDisplay.length === 0 ?
                                <Table.Row>
                                    <Table.Cell colSpan={6}>
                                        <Alert title="No Data">
                                            Please upload some files or import an Aqua Chain
                                        </Alert>
                                    </Table.Cell>
                                </Table.Row>
                                :
                                <>


                                </>
                            }
                        </Table.Body>
                    </Table.Root>
                </Table.ScrollArea>

                <ActionBarRoot open={hasSelection}>
                    <ActionBarContent>
                        <ActionBarSelectionTrigger>
                            {selection.length} selected
                        </ActionBarSelectionTrigger>
                        <ActionBarSeparator />
                        <Button variant="outline" size="sm">
                            Delete <Kbd>⌫</Kbd>
                        </Button>
                        <Button variant="outline" size="sm">
                            Share <Kbd>T</Kbd>
                        </Button>
                    </ActionBarContent>
                </ActionBarRoot>

                <DrawerRoot open={isOpen} size={{ base: 'full', mdToXl: "xl" }} id="aqua-chain-details-modal"
                    onOpenChange={(e) => setIsOpen(e.open)} closeOnEscape={true} >

                    <Portal>
                        <DrawerBackdrop />
                        <Drawer.Positioner>
                            <DrawerContent borderLeftRadius={'xl'} overflow={'hidden'}>
                                <Drawer.Header bg={{ base: drawerStatus?.colorLight, _dark: drawerStatus?.colorDark }}>
                                    <DrawerTitle flex="1">{drawerStatus?.fileName}</DrawerTitle>
                                    <Button
                                        position="absolute"
                                        right="8px"
                                        top="8px"
                                        colorPalette="whitesmoke"
                                        variant="solid"
                                        size="md"
                                        onClick={() => setIsOpen(false)}
                                        aria-label="Close drawer"
                                    >
                                        <LuX />
                                    </Button>
                                </Drawer.Header>
                                <DrawerBody py={'lg'} px={1}>

                                    <CompleteChainView callBack={updateDrawerStatus} selectedFileInfo={selectedFileInfo} />

                                </DrawerBody>
                                <DrawerFooter flexWrap={'wrap'}>
                                    <DrawerActionTrigger asChild>
                                        <Button variant="outline" size={'sm'}>Close</Button>
                                    </DrawerActionTrigger>
                                    {
                                        selectedFileInfo ? (

                                            <>
                                                {disableDrawerAction ? <></> : <>
                                                    <ShareButtonAction nonce={session?.nonce ?? ""} item={selectedFileInfo} />
                                                    <WitnessAquaChain apiFileInfo={selectedFileInfo} backendUrl={backend_url} nonce={session?.nonce ?? ""} revision="" />
                                                    <SignAquaChain apiFileInfo={selectedFileInfo} backendUrl={backend_url} nonce={session?.nonce ?? ""} revision="" />
                                                    <DeleteAquaChain apiFileInfo={selectedFileInfo} backendUrl={backend_url} nonce={session?.nonce ?? ""} revision="" />
                                                </>
                                                }
                                            </>
                                        ) : null
                                    }
                                </DrawerFooter>

                            </DrawerContent>
                        </Drawer.Positioner>
                    </Portal>

                </DrawerRoot>

            </CardBody>
        </Card.Root>
    )
}



export default FilesTable