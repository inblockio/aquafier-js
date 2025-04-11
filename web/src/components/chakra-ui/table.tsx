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
import { displayTime, getFileCategory, getFileExtension } from "../../utils/functions"

import { DeleteAquaChain, LinkButton, DownloadAquaChain, SignAquaChain, WitnessAquaChain } from "../aqua_chain_actions"
import { ChainDetailsBtn, CompleteChainView } from "../CustomDrawer"
import { Alert } from "./alert"
import { ApiFileInfo } from "../../models/FileInfo"
import ShareButtonAction from "../actions/ShareButtonAction"
import { DrawerActionTrigger, DrawerBackdrop, DrawerBody, DrawerContent, DrawerFooter, DrawerRoot, DrawerTitle } from "./drawer"
import { LuX } from "react-icons/lu"
import { IDrawerStatus } from "../../models/AquaTreeDetails"


const FilesTable = () => {
    const [filesToDisplay, setFilesToDisplay] = useState<ApiFileInfo[]>([])
    const { files, backend_url, session } = useStore(appStore)
    const [selection, setSelection] = useState<string[]>([])

    const [isOpen, setIsOpen] = useState(false)
    const [fileInfo, setFileInfo] = useState<ApiFileInfo | null>(null)
    const [drawerStatus, setDrawerStatus] = useState<IDrawerStatus | null>(null)


    const hasSelection = selection.length > 0
    const indeterminate = hasSelection && selection.length < files.length

    const openChainDetailsView = (_fileInfo: ApiFileInfo) => {
        setFileInfo(_fileInfo)
        setIsOpen(true)
    }

    const updateDrawerStatus = (_drawerStatus: IDrawerStatus) => {
        setDrawerStatus(_drawerStatus)
    }


    const rows = files?.map((item: ApiFileInfo, index: number) => {



        // return <Text>{JSON.stringify(item, null, 4)}</Text>
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
            <Table.Cell minW={'180px'} maxW={'180px'} textWrap={'wrap'}>{item.fileObject[0].fileName}</Table.Cell>
            <Table.Cell minW={'120px'} maxW={'120px'} textWrap={'wrap'}>{getFileCategory(getFileExtension(item.fileObject[0].fileName))}</Table.Cell>

            <Table.Cell minW={'140px'} maxW={'140px'} textWrap={'wrap'}>
                {
                    displayTime(Object.values(item.aquaTree!.revisions!)[0].local_timestamp)
                }
            </Table.Cell>
            <Table.Cell minW={'100px'} maxW={'100px'} textWrap={'wrap'}>
                <FormatByte value={
                    item.fileObject[0].fileSize ?? 0
                } />
            </Table.Cell>
            <Table.Cell minW={'220px'} maxW={'220px'} textWrap={'wrap'}>
                <Group alignItems={'space-between'} flexWrap={'wrap'} position={"relative"}>

                    <ChainDetailsBtn callBack={() => openChainDetailsView(item)}  />
                    <SignAquaChain apiFileInfo={item} backendUrl={backend_url} nonce={session?.nonce ?? ""} revision="" />
                    <WitnessAquaChain apiFileInfo={item} backendUrl={backend_url} nonce={session?.nonce ?? ""} revision="" />
                    <LinkButton item={item} nonce={session?.nonce ?? ""} />

                    {/* <ShareButton nonce={session?.nonce ?? ""} item={item} /> */}
                    <ShareButtonAction nonce={session?.nonce ?? ""} item={item} />
                    <DeleteAquaChain apiFileInfo={item} backendUrl={backend_url} nonce={session?.nonce ?? ""} revision="" />
                    <DownloadAquaChain file={item} />

                </Group>
            </Table.Cell>
        </Table.Row>
    })

    const smallScreenView = files?.map((item: ApiFileInfo) => (
        <Box key={`sm_${Object.keys(item.aquaTree!.revisions!)[0]}`} bg={'gray.100'} _dark={{
            bg: 'blackAlpha.950'
        }} p={2} borderRadius={'10px'}>
            <VStack textAlign={'start'}>
                <Text textAlign={'start'} w={'100%'}>{item.fileObject[0].fileName}</Text>
                <Group alignItems={'start'} flexWrap={'wrap'}>
                <ChainDetailsBtn callBack={() => openChainDetailsView(item)}  />
                    <SignAquaChain apiFileInfo={item} backendUrl={backend_url} nonce={session?.nonce ?? ""} revision="" />
                    <WitnessAquaChain apiFileInfo={item} backendUrl={backend_url} nonce={session?.nonce ?? ""} revision="" />
                    <LinkButton item={item} nonce={session?.nonce ?? ""} />
                    {/* <ShareButton nonce={session?.nonce ?? ""} item={item} /> */}
                    <ShareButtonAction item={item} nonce={session?.nonce ?? ""} />
                    <DeleteAquaChain apiFileInfo={item} backendUrl={backend_url} nonce={session?.nonce ?? ""} revision="" />
                    <DownloadAquaChain file={item} />
                </Group>
            </VStack>
        </Box>
    ))

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
                        {smallScreenView}
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
                            {rows}
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
                                    {
                                        fileInfo ? (
                                            <CompleteChainView fileInfo={fileInfo} callBack={updateDrawerStatus}  />
                                        ) : null
                                    }
                                </DrawerBody>
                                <DrawerFooter flexWrap={'wrap'}>
                                    <DrawerActionTrigger asChild>
                                        <Button variant="outline" size={'sm'}>Close</Button>
                                    </DrawerActionTrigger>
                                    {
                                        fileInfo ? (
                                            <>
                                                <ShareButtonAction nonce={session?.nonce ?? ""} item={fileInfo} />
                                                <WitnessAquaChain apiFileInfo={fileInfo} backendUrl={backend_url} nonce={session?.nonce ?? ""} revision="" />
                                                <SignAquaChain apiFileInfo={fileInfo} backendUrl={backend_url} nonce={session?.nonce ?? ""} revision="" />
                                                <DeleteAquaChain apiFileInfo={fileInfo} backendUrl={backend_url} nonce={session?.nonce ?? ""} revision="" />
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