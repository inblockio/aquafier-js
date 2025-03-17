import { useEffect, useState } from "react"
import {
    DrawerActionTrigger,
    DrawerBackdrop,
    DrawerBody,
    DrawerCloseTrigger,
    DrawerContent,
    DrawerFooter,
    DrawerHeader,
    DrawerRoot,
    DrawerTitle,

} from "../drawer"
import { Button } from "../button"
import { LuCheck, LuChevronDown, LuChevronUp, LuExternalLink, LuEye, LuX } from "react-icons/lu"
import { Box, Card, Collapsible, For, Group, Icon, IconButton, Link, Spacer, Span, Text, VStack } from "@chakra-ui/react"
import { TimelineConnector, TimelineContent, TimelineDescription, TimelineItem, TimelineRoot, TimelineTitle } from "../timeline"
import { displayTime, formatCryptoAddress } from "../../../utils/functions"
import { Alert } from "../alert"
import { ClipboardIconButton, ClipboardRoot } from "../clipboard"
import Aquafier, { AquaOperationData, AquaTree, FileObject, LogData, Result, Revision } from "aqua-js-sdk";
import ReactLoading from "react-loading"
import { WITNESS_NETWORK_MAP } from "../../../utils/constants"
import { DownloadAquaChain, WitnessAquaChain, SignAquaChain, DeleteAquaChain } from "../../aqua_chain_actions"
import { ApiFileInfo } from "../../../models/FileInfo"
import FilePreview from "../../FilePreview"
import { useStore } from "zustand"
import appStore from "../../../store"
import { Session } from "../../../types"


interface IItemDetail {
    label: string
    value: string
    displayValue: string
    showCopyIcon: boolean
}

const ItemDetail = ({ label, value, displayValue, showCopyIcon }: IItemDetail) => {

    return (
        <Group textAlign={'start'} w={'100%'}>
            <Text>{label}</Text>
            <Group>
                <Text fontFamily={"monospace"} textWrap={'wrap'} wordBreak={'break-word'}>{displayValue}</Text>
                <ClipboardRoot value={value} hidden={!showCopyIcon}>
                    <ClipboardIconButton size={'2xs'} />
                </ClipboardRoot>
            </Group>
        </Group>
    )
}

interface IRevisionDisplay {
    fileObjects: FileObject[]
    aquaTree: AquaTree
    revision: Revision
    revisionHash: string
    callBack: (res: boolean) => void
    // failedVerifications: string[]
    // verificationResult: AquaOperationData[]
}

const RevisionDisplay = ({ aquaTree, revision, revisionHash, fileObjects, callBack }: IRevisionDisplay) => {

    const [verificationResult, setVerificationResult] = useState<Result<AquaOperationData, LogData[]> | null>(null)

    const verifyAquaChain = async () => {

        const verifier = new Aquafier();
        if (aquaTree) {
            try {

                const res = await verifier.verifyAquaTreeRevision(aquaTree, revision, revisionHash, fileObjects);
                setVerificationResult(res)
                let isSuccess = true;
                if (res.isErr()) {
                    isSuccess = false
                }
                callBack(isSuccess)

            } catch (error: any) {
                console.error("Failed to verify aqua chain: ", error)
            }

        }
    }

    useEffect(() => {
        if (aquaTree) {
            verifyAquaChain()
        }
    }, [])

    const loaderSize = '40px'

    const returnBgColor = (): string => {
        if (verificationResult == null) {
            return "gray.400"
        } else if (verificationResult.isErr()) {
            return "red"
        } else {
            return "green"

        }
    }
    const isVerificationSuccessful = (): boolean | null => {

        if (verificationResult == null) {
            return null
        }


        if (verificationResult.isErr()) {
            return false
        }
        return true

    }

    const verificationStatusText = (): string => {
        const res = isVerificationSuccessful();

        if (res == null) {

            return "loading"
        }

        if (res) {
            return "Valid"
        } else {
            return "Invalid"
        }

    }
    const displayAlert = (): JSX.Element => {

        const res = isVerificationSuccessful();
        let status: "info" | "warning" | "success" | "error" | "neutral" = "info";
        let title = "This revision is being verified";
        if (res != null) {
            if (res) {
                status = "success"
                title = "This revision is valid"
            } else {
                status = "error"
                title = "This revision is invalid"
            }
        }
        return <Alert status={status} title={title} />

    }
    const verificationStatusIcon = (): JSX.Element => {
        const res = isVerificationSuccessful();

        if (res == null) {

            return <ReactLoading type={'spin'} color={'blue'} height={loaderSize} width={loaderSize} />
        }

        if (res) {
            return <LuCheck />
        } else {
            return <LuX />
        }

    }

    return (
        <div>
            <TimelineItem>
                <TimelineConnector
                    bg={returnBgColor()}
                    color={"white"}
                >


                    <Icon fontSize="xs" color={'white'} border={'none'}>
                        {
                            verificationStatusIcon()
                            /* {
                                !verificationResult ? (
                                    <ReactLoading type={'spin'} color={'blue'} height={loaderSize} width={loaderSize} />
                                ) : (
                                    verificationResult.successful ? <LuCheck /> : <LuX />
                                )
                            } */
                        }
                    </Icon>
                </TimelineConnector>
                <TimelineContent gap="4">

                    <TimelineTitle>
                        <Span>Revision: </Span>
                        <Span color="fg.muted" fontFamily={'monospace'}>{revisionHash}</Span>
                    </TimelineTitle>
                    <Card.Root size="sm">

                        <Card.Body textStyle="sm" lineHeight="tall">
                            <TimelineRoot size="lg" variant="subtle" maxW="md">

                                {/* <TimelineItem>
                                    <TimelineConnector
                                        bg={returnBgColor()}
                                    >
                                        
                                        <Icon fontSize="xs" color={'white'}>
                                            {
                                                verificationStatusIcon()
                                                
                                            }
                                        </Icon>
                                    </TimelineConnector>
                                    <TimelineContent gap="2">
                                        <TimelineTitle>
                                            <Span>
                                                Revision content is
                                                {
                                                    verificationStatusText()
                                                }
                                            </Span>
                                        </TimelineTitle>
                                    </TimelineContent>
                                </TimelineItem> */}

                                <TimelineItem>
                                    <TimelineConnector
                                        bg={
                                            returnBgColor()
                                            // verificationResult?.metadata_verification.successful ? "green" : "red"
                                        }
                                    >
                                        <Icon fontSize="xs" color={'white'}>
                                            {
                                                verificationStatusIcon()
                                                // verificationResult?.metadata_verification.successful ? <LuCheck /> :
                                                //     <LuX />
                                            }
                                        </Icon>
                                    </TimelineConnector>
                                    <TimelineContent gap="2">
                                        <TimelineTitle>
                                            <Span>
                                                Revision  is &nbsp;
                                                {
                                                    revision.previous_verification_hash.length == 0 ? "Genesis Revision" : revision.revision_type
                                                    // verificationResult?.metadata_verification.successful ? ' valid' : ' invalid'
                                                }
                                            </Span>
                                        </TimelineTitle>
                                        <TimelineDescription>{displayTime(revision.local_timestamp, true)}&nbsp;(UTC)</TimelineDescription>

                                        {/* <ItemDetail label="Metadata Hash:"
                                            displayValue={formatCryptoAddress(revision.metadata.metadata_hash, 4, 6)}
                                            value={revision.metadata.metadata_hash} showCopyIcon={true}
                                        /> */}
                                    </TimelineContent>
                                </TimelineItem>

                                {
                                    revision.revision_type == "signature" ? (
                                        <TimelineItem>
                                            <TimelineConnector
                                                bg={
                                                    returnBgColor()
                                                    // verificationResult?.signature_verification.successful ? "green" : "red"
                                                }
                                            >
                                                <Icon fontSize="xs" color={'white'}>
                                                    {
                                                        verificationStatusIcon()
                                                        // verificationResult?.signature_verification.successful ? <LuCheck /> :
                                                        //     <LuX />
                                                    }
                                                </Icon>
                                            </TimelineConnector>
                                            <TimelineContent gap="2">
                                                <TimelineTitle>
                                                    <Span>
                                                        Revision signature is
                                                        {
                                                            // verificationResult?.signature_verification.successful ? ' valid' : ' invalid'
                                                            verificationStatusText()
                                                        }
                                                    </Span>
                                                </TimelineTitle>
                                                <ItemDetail label="Signature:"
                                                    displayValue={formatCryptoAddress(revision.signature, 4, 6)}
                                                    value={revision.signature} showCopyIcon={true}
                                                />
                                                <ItemDetail label="Signature Type:"
                                                    displayValue={revision.signature_type!}
                                                    value={revision.signature_type!} showCopyIcon={true}
                                                />
                                                <ItemDetail label="Wallet Address:"
                                                    // displayValue={formatCryptoAddress(revision.signature.signature_wallet_address, 4, 6)}
                                                    displayValue={revision.signature_wallet_address!}
                                                    value={revision.signature_wallet_address!} showCopyIcon={true}
                                                />
                                                <ItemDetail label="Public Key:"
                                                    displayValue={formatCryptoAddress(revision.signature_public_key, 4, 6)}
                                                    value={revision.signature_public_key!} showCopyIcon={true}
                                                />
                                            </TimelineContent>
                                        </TimelineItem>
                                    ) : (

                                        <TimelineItem>
                                            <TimelineConnector
                                                bg={'gray.400'}
                                            >
                                                <Icon fontSize="xs" color={'white'}>
                                                    <LuX />
                                                </Icon>
                                            </TimelineConnector>
                                            <TimelineContent gap="2">
                                                <TimelineTitle>
                                                    <Span>Revision has no signature</Span>
                                                </TimelineTitle>
                                            </TimelineContent>
                                        </TimelineItem>

                                    )
                                }

                                {
                                    revision.revision_type == "witness" ? (
                                        <TimelineItem>
                                            <TimelineConnector
                                                bg={
                                                    returnBgColor()
                                                    // verificationResult?.witness_verification.successful ? "green" : "red"
                                                }
                                            >
                                                <Icon fontSize="xs" color={'white'}>
                                                    {
                                                        verificationStatusIcon()
                                                        // verificationResult?.witness_verification.successful ? <LuCheck /> :
                                                        //     <LuX />
                                                    }
                                                </Icon>
                                            </TimelineConnector>
                                            <TimelineContent gap="2">
                                                <TimelineTitle>
                                                    <Span>
                                                        Revision witness is
                                                        {
                                                            verificationStatusText()
                                                            // verificationResult?.witness_verification.successful ? ' valid' : ' invalid'
                                                        }
                                                    </Span>
                                                </TimelineTitle>
                                                <ItemDetail label="Domain snapshot Hash:"
                                                    displayValue={formatCryptoAddress(revision.witness.domain_snapshot_genesis_hash, 4, 6)}
                                                    value={revision.witness.domain_snapshot_genesis_hash} showCopyIcon={true}
                                                />
                                                <ItemDetail label="Network:"
                                                    displayValue={formatCryptoAddress(revision.witness.witness_network, 4, 6)}
                                                    value={revision.witness.witness_network} showCopyIcon={false}
                                                />
                                                <ItemDetail label="Witness Hash:"
                                                    displayValue={formatCryptoAddress(revision.witness.witness_hash, 4, 6)}
                                                    value={revision.witness.witness_hash} showCopyIcon={true}
                                                />
                                                <Group>
                                                    <ItemDetail label="Transaction Hash:"
                                                        displayValue={formatCryptoAddress(revision.witness.witness_event_transaction_hash.startsWith('0x') ? revision.witness.witness_event_transaction_hash : `0x${revision.witness.witness_event_transaction_hash}`, 4, 6)}
                                                        value={`0x${revision.witness.witness_event_transaction_hash}`} showCopyIcon={true}
                                                    />
                                                    <Link outline={'none'} href={`${WITNESS_NETWORK_MAP[revision.witness.witness_network]}/${revision.witness.witness_event_transaction_hash}`} target="_blank">
                                                        <Icon size={'lg'} color={'blue.500'}>
                                                            <LuExternalLink />
                                                        </Icon>
                                                    </Link>
                                                </Group>
                                                <ItemDetail label="Verification Hash:"
                                                    displayValue={formatCryptoAddress(revision.witness.witness_event_verification_hash, 4, 6)}
                                                    value={revision.witness.witness_event_verification_hash} showCopyIcon={true}
                                                />
                                            </TimelineContent>
                                        </TimelineItem>
                                    ) : (

                                        <TimelineItem>
                                            <TimelineConnector
                                                bg={'gray.400'}
                                            >
                                                <Icon fontSize="xs" color={'white'}>
                                                    <LuX />
                                                </Icon>
                                            </TimelineConnector>
                                            <TimelineContent gap="2">
                                                <TimelineTitle>
                                                    <Span>Revision has no witness</Span>
                                                </TimelineTitle>
                                            </TimelineContent>
                                        </TimelineItem>

                                    )
                                }

                            </TimelineRoot>

                        </Card.Body>
                        <Card.Footer>
                            {displayAlert()}
                        </Card.Footer>
                    </Card.Root>
                </TimelineContent>
            </TimelineItem>
        </div>
    )
}
interface IRevisionDetailsSummary {
    fileInfo: ApiFileInfo,
    callBack?: (res: boolean) => void
}

export const RevisionDetailsSummary = ({ fileInfo }: IRevisionDetailsSummary) => {


    // const pageData: PageData = JSON.parse(fileInfo.page_data);
    // const revisionHashes = Object.keys(pageData.pages[0].revisions)
    const revisionHashes = Object.keys(fileInfo!.aquaTree!.revisions)

    // 
    const revisionsWithSignatures: Array<Revision> = [];
    const revisionsWithWitness: Array<Revision> = [];

    for (let i = 0; i < revisionHashes.length; i++) {
        const currentRevision: string = revisionHashes[i];
        const revision: Revision = fileInfo.aquaTree!.revisions[currentRevision]; //pageData.pages[0].revisions[currentRevision];

        if (revision.revision_type == "signature") {
            revisionsWithSignatures.push(revision)
        }

        if (revision.revision_type == "witness") {
            revisionsWithWitness.push(revision)
        }
    }


    return (<VStack textAlign="start">
        <Text>Revisions count : {revisionHashes.length}</Text>

        <Box w={'100%'} bg={'gray.100'} _dark={{
            bg: "blackAlpha.900"
        }} borderRadius={'lg'} p={{ base: '4', md: 'lg' }}>
            <Text mb={'2'} fontWeight={600} fontSize={'lg'}>Signatures ({revisionsWithSignatures.length})</Text>
            <For
                each={revisionsWithSignatures}
            >
                {(revision, index) => (
                    <Group key={`hash_${index}`} pb={'2'} mb={'4'} borderBottom={'1px solid'} borderColor={'gray.200'} _dark={{
                        borderColor: "gray.50"
                    }}>
                        <IconButton size={'xs'}>
                            {index + 1}
                        </IconButton>

                        <Box>

                            {/* <Text>{index}. {revision.signature?.signature} </Text> */}
                            <ItemDetail label="Signature Hash:"
                                displayValue={formatCryptoAddress(revision.signature, 4, 6)}
                                value={revision.signature ?? ""} showCopyIcon={true}
                            />
                            <ItemDetail label="Wallet Address:"
                                // displayValue={formatCryptoAddress(revision.signature.signature_wallet_address, 4, 6)}
                                displayValue={revision.signature_wallet_address ?? ""}
                                value={revision.signature_wallet_address ?? ""} showCopyIcon={true}
                            />
                            <ItemDetail label="Timestamp (UTC) : "
                                // displayValue={formatCryptoAddress(revision.signature.signature_wallet_address, 4, 6)}
                                displayValue={displayTime(revision.local_timestamp)}
                                value={revision.signature_wallet_address ?? ""} showCopyIcon={false}
                            />
                        </Box>
                    </Group>
                )}
            </For>
        </Box>

        <Box w={'100%'} bg={'gray.100'} _dark={{
            bg: "blackAlpha.900"
        }} borderRadius={'lg'} p={{ base: '4', md: 'lg' }}>
            <Text mb={'2'} fontWeight={600} fontSize={'lg'}>Witnesses ({revisionsWithWitness.length})</Text>
            <For
                each={revisionsWithWitness}
            >
                {(revision, index) => (
                    <Group key={`witness_${index}`} pb={'2'} mb={'4'} borderBottom={'1px solid'} borderColor={'gray.200'} _dark={{
                        borderColor: "gray.50"
                    }}>
                        <IconButton size={'xs'}>
                            {index + 1}
                        </IconButton>
                        {/* <Text>{index}. {revision.signature?.signature} </Text> */}
                        <Box>
                            <ItemDetail label="Network:"
                                displayValue={formatCryptoAddress(revision.witness?.witness_network ?? "", 4, 6)}
                                value={revision.witness?.witness_network ?? " "} showCopyIcon={false}
                            />
                            <br />
                            <ItemDetail label="Timestamp (UTC) : "
                                displayValue={displayTime(revision.local_timestamp)}
                                value={revision.signature?.signature_wallet_address ?? ""} showCopyIcon={false}
                            />
                            <br />
                            <ItemDetail label="Witness Hash:"
                                displayValue={formatCryptoAddress(revision.witness?.witness_hash ?? "", 4, 6)}
                                value={revision.witness?.witness_hash ?? ""} showCopyIcon={true}
                            />
                            <br />
                            <Group>
                                <ItemDetail label="Transaction Hash:"
                                    displayValue={formatCryptoAddress(revision.witness?.witness_event_transaction_hash.startsWith('0x') ? revision.witness?.witness_event_transaction_hash ?? "" : `0x${revision.witness?.witness_event_transaction_hash ?? ""}`, 4, 6)}
                                    value={`0x${revision.witness?.witness_event_transaction_hash ?? ""}`} showCopyIcon={true}
                                />
                                <Link outline={'none'} href={`${WITNESS_NETWORK_MAP[revision.witness?.witness_network ?? ""]}/${revision.witness?.witness_event_transaction_hash}`} target="_blank">
                                    <Icon size={'sm'} color={'blue.500'}>
                                        <LuExternalLink />
                                    </Icon>
                                </Link>
                            </Group>
                        </Box>
                    </Group>
                )}
            </For>
        </Box>
    </VStack>
    )
}

interface IPageDataDetails {
    fileInfo: ApiFileInfo
    session: Session
    callBack: (res: Array<boolean>, revisionCount: number) => void
}

const ChainDetails = ({ fileInfo, callBack }: IPageDataDetails) => {

    const [aquaTree, setAquaTreeData] = useState<AquaTree | null>()
   
    let revisionValidationSuccess: Array<boolean> = [];



    useEffect(() => {
        // const _pageData: AquaTree = JSON.parse(fileInfo.aquaTree)
        setAquaTreeData(fileInfo.aquaTree)
    }, [fileInfo])

    return (
        <>
            {
                aquaTree ? (
                    <TimelineRoot size="lg" variant="subtle" maxW="xl">
                        <For
                            each={Object.keys(aquaTree.revisions)}
                        >
                            {(revisionHash, index) => (
                                <RevisionDisplay key={`revision_${index}`} revision={aquaTree.revisions[revisionHash]} revisionHash={revisionHash} aquaTree={aquaTree} fileObjects={[...fileInfo.fileObject]} callBack={(res) => {
                                    const newData = [...revisionValidationSuccess, res]
                                    revisionValidationSuccess = newData
                                    callBack(newData, Object.keys(aquaTree!.revisions).length)
                                }} />

                            )}
                        </For>
                    </TimelineRoot>
                ) : null
            }
        </>
    )
}

export const ChainDetailsBtn = ({ fileInfo, session }: IPageDataDetails) => {

   
    const [showMoreDetails, setShowMoreDetails] = useState(false)

    const { backend_url } = useStore(appStore)
    const [isOpen, setIsOpen] = useState(false)
    // const pageData: PageData = JSON.parse(fileInfo.page_data)
    const [isVerificationSuccessful, setIsVerificationSuccessful] = useState<boolean | null>(null)
    // const [lastVerificationHash, setLastVerificationHash] = useState<string | null>(null)
    const [fileName, setFileName] = useState<string>("")


    const updateVerificationStatus = (revisionResults: Array<boolean>, revisionCount: number) => {
        console.log(`revisionResults   ${revisionResults}   revisionCount ${revisionCount}`)
        if (revisionResults.length >= revisionCount) {
            const containsFailure = revisionResults.filter((e) => e == false);
            if (containsFailure.length > 0) {
                setIsVerificationSuccessful(false)
            } else {
                setIsVerificationSuccessful(true)
            }
        }

    }



    useEffect(() => {
        const revisonHashes = Object.keys(fileInfo?.aquaTree!.revisions)
        // const hash = revisonHashes[revisonHashes.length - 1]
        // setLastVerificationHash(hash)
        const name = fileInfo?.aquaTree?.file_index[revisonHashes[0]]
        setFileName(`${name}`)
    }, [fileInfo])

    useEffect(() => {
        if (isOpen) {
            const modalElement = document.getElementById('aqua-chain-details-modal');
            const customEvent = new CustomEvent('REPLACE_ADDRESSES', {
                detail: {
                    element: modalElement,
                },
            });
            window.dispatchEvent(customEvent);
        }
    }, [isOpen])

    const displayColorBasedOnVerificationStatusLight = () => {
        if (isVerificationSuccessful == null) {
            return "grey"
        }

        return isVerificationSuccessful ? 'green.100' : 'red.100'
    }
    const displayColorBasedOnVerificationStatusDark = () => {
        if (isVerificationSuccessful == null) {
            return "whitesmoke"
        }

        return isVerificationSuccessful ? 'green.900' : 'red.900'
    }
    const displayBasedOnVerificationStatusText = () => {
        if (isVerificationSuccessful == null) {
            return "Verifying Aqua tree"
        }
        return isVerificationSuccessful ? "This aqua tree  is valid" : "This aqua tree is invalid"
    }
    const displayColorBasedOnVerificationAlert = () => {
        if (isVerificationSuccessful == null) {
            return "info"
        }

        return isVerificationSuccessful ? 'success' : 'error'
    }
    return (
        <>
            <Button size={'xs'} colorPalette={'green'} variant={'subtle'} w={'80px'} onClick={() => setIsOpen(true)}>
                <LuEye />
                Details
            </Button>

            <DrawerRoot open={isOpen} size={{ base: 'full', md: 'lg' }} id="aqua-chain-details-modal" onOpenChange={(e) => setIsOpen(e.open)}>
                <DrawerBackdrop />
                {/* <DrawerTrigger asChild>
                    <Button size={'xs'} colorPalette={'green'} variant={'subtle'} w={'80px'}>
                        <LuEye />
                        Details
                    </Button>
                </DrawerTrigger> */}
                <DrawerContent borderLeftRadius={'xl'} overflow={'hidden'}>
                    <DrawerHeader bg={{ base: displayColorBasedOnVerificationStatusLight(), _dark: displayColorBasedOnVerificationStatusDark() }}>
                        <DrawerTitle>{fileName}</DrawerTitle>
                    </DrawerHeader>
                    <DrawerBody py={'lg'} px={1}>
                        <Card.Root border={'none'} shadow={'md'} borderRadius={'xl'}>
                            <Card.Body>
                                <FilePreview fileInfo={fileInfo.fileObject[0]} />
                            </Card.Body>
                        </Card.Root>
                        <Spacer height={'20px'} />

                        <Card.Root borderRadius={'lg'}>
                            <Card.Body>
                                <VStack gap={'4'}>
                                    <Alert status={displayColorBasedOnVerificationAlert()} title={displayBasedOnVerificationStatusText()} />

                                    <RevisionDetailsSummary fileInfo={fileInfo} />
                                    <Box w={'100%'}>
                                        <Collapsible.Root open={showMoreDetails}>
                                            <Collapsible.Trigger w="100%" py={'md'} onClick={() => setShowMoreDetails(open => !open)} cursor={'pointer'}>
                                                <Alert w={'100%'} status={"info"} textAlign={'start'} title={showMoreDetails ? `Show less Details` : `Show more Details`} icon={showMoreDetails ? <LuChevronUp /> : <LuChevronDown />} />
                                            </Collapsible.Trigger>
                                            <Collapsible.Content py={'4'}>
                                                <ChainDetails session={session} fileInfo={fileInfo} callBack={updateVerificationStatus} />
                                            </Collapsible.Content>
                                        </Collapsible.Root>
                                    </Box>
                                    <Box minH={'400px'} />
                                </VStack>
                            </Card.Body>
                        </Card.Root>

                    </DrawerBody>
                    <DrawerFooter flexWrap={'wrap'}>
                        <DrawerActionTrigger asChild>
                            <Button variant="outline" size={'sm'}>Close</Button>
                        </DrawerActionTrigger>
                        <DownloadAquaChain file={fileInfo} />
                        <WitnessAquaChain apiFileInfo={fileInfo} backendUrl={backend_url} nonce={session?.nonce ?? ""} revision="" />
                        <SignAquaChain apiFileInfo={fileInfo} backendUrl={backend_url} nonce={session?.nonce ?? ""} revision="" />
                        <DeleteAquaChain apiFileInfo={fileInfo} backendUrl={backend_url} nonce={session?.nonce ?? ""} revision="" />

                        {/* <WitnessAquaChain backend_url={backend_url} file_id={fileInfo.id} filename={fileName} lastRevisionVerificationHash={lastVerificationHash ?? ""} />
                        <SignAquaChain backend_url={backend_url} file_id={fileInfo.id} filename={fileName} lastRevisionVerificationHash={lastVerificationHash ?? ""} />
                        <DeleteAquaChain backend_url={backend_url} file_id={fileInfo.id} filename={fileName} /> */}
                    </DrawerFooter>
                    <DrawerCloseTrigger />
                </DrawerContent>
            </DrawerRoot>

        </>
    )
}

export default ChainDetails