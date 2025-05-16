import { useState, useEffect, useCallback, useMemo } from "react";
import { LuCheck, LuExternalLink, LuTrash, LuX } from "react-icons/lu"
import { Box, Button, Card, Collapsible, For, Group, Icon, IconButton, Link, Span, Stack, Text } from "@chakra-ui/react"
import { TimelineConnector, TimelineContent, TimelineDescription, TimelineItem, TimelineRoot, TimelineTitle } from "./chakra-ui/timeline"
import { displayTime, formatCryptoAddress, fetchLinkedFileName, fetchFiles, getAquaTreeFileObject, isDeepLinkRevision, isAquaTree, getGenesisHash } from "../utils/functions"
import { Alert } from "./chakra-ui/alert"
import { AquaTree, FileObject, LogTypeEmojis, Revision } from "aqua-js-sdk";
import ReactLoading from "react-loading"
import { ERROR_TEXT, WITNESS_NETWORK_MAP } from "../utils/constants"
import { WalletEnsView } from "./chakra-ui/wallet_ens"
import { AquaTreeDetailsData, RevisionDetailsSummaryData } from "../models/AquaTreeDetails"

import { ItemDetail } from "./ItemDetails";
import appStore from "../store"
import { useStore } from "zustand"
import axios from "axios"
import { toaster } from "./chakra-ui/toaster";
import { ApiFileInfo } from "../models/FileInfo";

const viewLinkedFile = (aquaTree: AquaTree, revisionHash: string, revision: Revision, apiFileInfo: ApiFileInfo[], updateSelectedFile: (fileInfo: ApiFileInfo) => void): JSX.Element => {

    if (revision.revision_type == "link") {

        if (isDeepLinkRevision(aquaTree, revisionHash)) {
            return <></>
        }

        return <Button onClick={
            () => {
                let linkedFileName = fetchLinkedFileName(aquaTree!!, revision)

                if (linkedFileName != ERROR_TEXT) {
                    for (let fileInfo of apiFileInfo) {
                        let fileObject = getAquaTreeFileObject(fileInfo);
                        if (fileObject) {
                            if (linkedFileName == fileObject.fileName) {

                                updateSelectedFile(fileInfo)
                                break
                            }
                        }
                    }
                } else {
                    toaster.create({
                        title: "Link file not found , possibly a deep link ?",
                        type: 'info'
                    })
                }
            }
        }>View File </Button>

    } else {
        return <></>
    }
}


const revisionDataHeader = (aquaTree: AquaTree, revisionHash: string, fileObject: FileObject[]): JSX.Element => {

    const revision = aquaTree.revisions[revisionHash]

    if (revision.previous_verification_hash.length == 0) {

        <Span >
            Genesis Revision
        </Span>
    }
    if (revision.revision_type == "link") {
        let isDeepLink = isDeepLinkRevision(aquaTree, revisionHash)
        if (isDeepLink == null) {
            return <Span>{ERROR_TEXT}</Span>
        }
        if (isDeepLink) {
            // before returning deep link we traverse the current  aqua tree 
            const aquaTreeFiles = fileObject.filter(file => isAquaTree(file.fileContent));
            console.log(`👁️‍🗨️ aquaTreeFiles ${aquaTreeFiles.length} --  `)
            if (aquaTreeFiles.length > 0) {
                let aquaTreePick = aquaTreeFiles.find((e) => {
                    let tree: AquaTree = e.fileContent as AquaTree
                    let allHashes = Object.keys(tree.revisions);


                    console.log(`👁️‍🗨️ aquaTreeFiles ${allHashes.toString()} == ${revisionHash} `)
                    return allHashes.includes(revision.link_verification_hashes![0]!)
                })

                console.log(`👁️‍🗨️ aquaTreePick ${JSON.stringify(aquaTreePick, null, 4)} `)
                if (aquaTreePick) {
                    let tree: AquaTree = aquaTreePick.fileContent as AquaTree
                    let genesisHash = getGenesisHash(tree)

                    console.log(`👁️‍🗨️  genesisHash ${genesisHash}`)
                    if (genesisHash) {

                        let fileName = tree.file_index[genesisHash]
                        console.log(`👁️‍🗨️ fileName ${fileName}`)

                        if (fileName) {
                            return <Span fontSize={"md"}>
                                Linked to {fileName}
                            </Span>
                        }
                    }

                }
            }

            return <Span>
                Deep Link previous {revision.previous_verification_hash} revisionHash {revisionHash}
            </Span>
        } else {
            return <Span fontSize={"md"}>
                linked to {fetchLinkedFileName(aquaTree, revision)}
            </Span>
        }
    }

    return <Span>
        {revision.revision_type}
    </Span >
}

export const RevisionDisplay = ({ fileInfo, revision, revisionHash, isVerificationComplete, verificationResults, isDeletable, deleteRevision, index }: AquaTreeDetailsData) => {

    const { session, backend_url, files, setFiles, setSelectedFileInfo } = useStore(appStore)
    const [showRevisionDetails, setShowRevisionDetails] = useState(false)
    const [isRevisionVerificationSuccessful, setIsRevisionVerificationSuccessful] = useState<boolean | null>(null)
    const [isDeleting, setIsDeleting] = useState(false)

    const loaderSize = '40px'

    // Memoize background color calculation
    const returnBgColor = useMemo((): string => {
        if (!isVerificationComplete) {
            return "gray.400"
        }
        const revisionVerificationResult = verificationResults.find(item => item.hash === revisionHash)
        if (revisionVerificationResult === undefined) {
            return "yellow"
        }
        return revisionVerificationResult.isSuccessful ? "green" : "red"
    }, [isVerificationComplete, verificationResults, revisionHash])

    // Run verification check when necessary
    useEffect(() => {
        const checkVerification = () => isVerificationSuccessful();
        checkVerification();
    }, [isVerificationComplete, verificationResults]);

    // Memoize verification status calculation and update state only when needed
    const isVerificationSuccessful = useCallback((): boolean | null => {
        const currentRevisionResult = verificationResults.find(item => item.hash === revisionHash);

        let verificationStatus: boolean | null = null;

        if (!isVerificationComplete) {
            verificationStatus = null;
        } else if (currentRevisionResult === undefined) {
            verificationStatus = null;
        } else {
            verificationStatus = currentRevisionResult.isSuccessful ? true : false;
        }

        // Only update state if it's different to avoid unnecessary re-renders
        if (verificationStatus !== isRevisionVerificationSuccessful) {
            setIsRevisionVerificationSuccessful(verificationStatus);
        }

        return verificationStatus;
    }, [verificationResults, revisionHash, isVerificationComplete, isRevisionVerificationSuccessful])

    // Memoize status text to prevent recalculation
    const verificationStatusText = useMemo((): string => {
        if (isRevisionVerificationSuccessful === null) {
            return "loading";
        }
        return isRevisionVerificationSuccessful ? "Valid" : "Invalid";
    }, [isRevisionVerificationSuccessful]);

    // Memoize alert component to prevent recreation
    const displayAlert = useMemo((): JSX.Element => {
        let status: "info" | "warning" | "success" | "error" | "neutral" = "info";
        let title = "This revision is being verified";

        if (isRevisionVerificationSuccessful !== null) {
            if (isRevisionVerificationSuccessful) {
                status = "success";
                title = "This revision is valid";
            } else {
                status = "error";
                title = "This revision is invalid";
            }
        }

        return <Alert status={status} title={title} />;
    }, [isRevisionVerificationSuccessful]);

    // Memoize verification icon to prevent recreation
    const verificationStatusIcon = useMemo((): JSX.Element => {
        if (isRevisionVerificationSuccessful === null) {
            return <ReactLoading type={'spin'} color={'blue'} height={loaderSize} width={loaderSize} />;
        }

        return isRevisionVerificationSuccessful ?
            <Box><LuCheck /></Box> :
            <Box><LuX /></Box>;
    }, [isRevisionVerificationSuccessful, loaderSize]);

    // Memoize delete handler to prevent recreation on each render
    const handleDelete = useCallback(async () => {
        if (isDeleting) return; // Prevent multiple clicks

        console.log("Deleting revision: ", revisionHash, index);
        setIsDeleting(true);

        try {
            const url = `${backend_url}/tree/revisions/${revisionHash}`;

            const response = await axios.delete(url, {
                headers: {
                    'metamask_address': session?.address,
                    'nonce': session?.nonce
                }
            });

            if (response.status === 200) {
                toaster.create({
                    title: "Revision deleted",
                    description: "The revision has been deleted",
                    type: "success",
                    duration: 3000,
                    // placement: "bottom-end"
                });

                // Reload files for the current user
                if (index === 0) {
                    window.location.reload();
                } else {
                    const url2 = `${backend_url}/explorer_files`;
                    const files = await fetchFiles(`${session?.address}`, url2, `${session?.nonce}`);
                    setFiles(files);

                    // we need to update the side drawer for reverification to start
                    const selectedFileData = files.find((e) => {
                        Object.keys(e.aquaTree!.revisions!)[0] == Object.keys(selectedFileData!.aquaTree!.revisions)[0]
                    })
                    if (selectedFileData) {
                        setSelectedFileInfo(selectedFileData)
                    }


                    // Remove the revision from the list of revisions
                    deleteRevision(revisionHash);
                }
            } else {
                toaster.create({
                    title: "Revision not deleted",
                    description: "The revision has not been deleted",
                    type: "error",
                    duration: 3000,
                    // placement: "bottom-end"
                });
            }
        } catch (error) {
            toaster.create({
                title: "Revision not deleted",
                description: "The revision has not been deleted",
                type: "error",
                duration: 3000,
                // placement: "bottom-end"
            });
        } finally {
            setIsDeleting(false);
        }
    }, [backend_url, revisionHash, session?.address, session?.nonce, index, deleteRevision, isDeleting, setFiles]);

    const displayDeleteButton = (): JSX.Element => {
        if (isDeletable) {
            return (
                <IconButton size={'xs'} borderRadius={"full"} onClick={handleDelete} disabled={isDeleting} colorPalette={"red"}>
                    <LuTrash />
                </IconButton>
            )
        }
        return <></>
    }


    // Keep the original function
    const revisionTypeEmoji = LogTypeEmojis[revision.revision_type]

    return (
        <div>
            <TimelineItem>
                <TimelineConnector
                    bg={returnBgColor}
                    color={"white"}

                >
                    <Icon fontSize="xs" color={'white'} border={'none'}>
                        {
                            verificationStatusIcon
                        }
                    </Icon>
                </TimelineConnector>
                <TimelineContent gap="4">

                    <TimelineTitle onClick={() => setShowRevisionDetails(prev => !prev)} cursor={"pointer"}>
                        <Group justifyContent={"space-between"} wrap={"nowrap"}>
                            <Group>
                                <Span textTransform={"capitalize"} w={"200px"}>{`${revisionTypeEmoji ? revisionTypeEmoji : ''} ${revision?.revision_type} Revision`}</Span>
                                <Span color="fg.muted" fontFamily={'monospace'} wordBreak={"break-all"}>{revisionHash}</Span>
                            </Group>
                            <Group>
                                {displayDeleteButton()}
                            </Group>
                        </Group>
                    </TimelineTitle>
                    <Collapsible.Root open={showRevisionDetails}>
                        <Collapsible.Content>
                            <Card.Root size="sm">
                                <Card.Body textStyle="sm" lineHeight="tall">
                                    <TimelineRoot size="lg" variant="subtle" maxW="md">
                                        {
                                            revision.revision_type == "file" || revision.revision_type == "form" || revision.revision_type == "link" ?
                                                <>
                                                    <TimelineItem>
                                                        <TimelineConnector
                                                            bg={
                                                                returnBgColor
                                                            }
                                                        >
                                                            <Icon fontSize="xs" color={'white'}>
                                                                {
                                                                    verificationStatusIcon

                                                                }
                                                            </Icon>
                                                        </TimelineConnector>

                                                        <TimelineContent gap="2">
                                                            <TimelineTitle>
                                                                {revisionDataHeader(fileInfo!.aquaTree!, revisionHash, fileInfo.fileObject)}

                                                            </TimelineTitle>
                                                            <TimelineDescription>{displayTime(revision.local_timestamp)}&nbsp;(UTC)</TimelineDescription>
                                                            {
                                                                revision.revision_type === "file" ? (
                                                                    <ItemDetail label="File Hash:"
                                                                        // displayValue={formatCryptoAddress(revision.signature.signature_wallet_address, 4, 6)}
                                                                        displayValue={formatCryptoAddress(revision.file_hash!, 10, 15)}
                                                                        value={revision.file_hash!} showCopyIcon={true}
                                                                    />
                                                                ) : null
                                                            }
                                                            {viewLinkedFile(fileInfo!.aquaTree!, revisionHash, revision, files, setSelectedFileInfo)}
                                                        </TimelineContent>

                                                    </TimelineItem>
                                                </> : null
                                        }

                                        {
                                            revision.revision_type == "signature" ? (
                                                <TimelineItem>
                                                    <TimelineConnector
                                                        bg={
                                                            returnBgColor
                                                            // verificationResult?.signature_verification.successful ? "green" : "red"
                                                        }
                                                    >
                                                        <Icon fontSize="xs" color={'white'}>
                                                            {
                                                                verificationStatusIcon
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
                                                                    verificationStatusText
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
                                                        <WalletEnsView walletAddress={revision.signature_wallet_address!} />

                                                        {/* <ItemDetail label="Wallet Address:"
                                                            // displayValue={formatCryptoAddress(revision.signature.signature_wallet_address, 4, 6)}
                                                            displayValue={revision.signature_wallet_address!}
                                                            value={revision.signature_wallet_address!} showCopyIcon={true}
                                                        /> */}
                                                        <ItemDetail label="Public Key:"
                                                            displayValue={formatCryptoAddress(revision.signature_public_key, 4, 6)}
                                                            value={revision.signature_public_key!} showCopyIcon={true}
                                                        />
                                                    </TimelineContent>
                                                </TimelineItem>
                                            ) : null
                                        }

                                        {
                                            revision.revision_type == "witness" ? (
                                                <TimelineItem>
                                                    <TimelineConnector
                                                        bg={
                                                            returnBgColor
                                                            // verificationResult?.witness_verification.successful ? "green" : "red"
                                                        }
                                                    >
                                                        <Icon fontSize="xs" color={'white'}>
                                                            {
                                                                verificationStatusIcon
                                                                // verificationResult?.witness_verification.successful ? <LuCheck /> :
                                                                //     <LuX />
                                                            }
                                                        </Icon>
                                                    </TimelineConnector>
                                                    <TimelineContent gap="2">
                                                        <TimelineTitle>
                                                            <Span>
                                                                Revision witness is &nbsp;
                                                                {
                                                                    verificationStatusText
                                                                    // verificationResult?.witness_verification.successful ? ' valid' : ' invalid'
                                                                }
                                                            </Span>
                                                        </TimelineTitle>

                                                        <ItemDetail label="Network:"
                                                            displayValue={formatCryptoAddress(revision.witness_network, 4, 6)}
                                                            value={revision.witness_network!!} showCopyIcon={false}
                                                        />
                                                        <ItemDetail label="Witness Account:"
                                                            displayValue={formatCryptoAddress(revision.witness_sender_account_address, 4, 6)}
                                                            value={revision.witness_sender_account_address!} showCopyIcon={true}
                                                        />
                                                        <Group>
                                                            <ItemDetail label="Transaction Hash:"
                                                                displayValue={formatCryptoAddress(revision.witness_transaction_hash!.startsWith('0x') ? revision.witness_transaction_hash : `0x${revision.witness_transaction_hash}`, 4, 6)}
                                                                value={`0x${revision.witness_transaction_hash}`} showCopyIcon={true}
                                                            />
                                                            <Link outline={'none'} href={`${WITNESS_NETWORK_MAP[revision.witness_network!!]}/${revision.witness_transaction_hash}`} target="_blank">
                                                                <Icon size={'lg'} color={'blue.500'}>
                                                                    <Box>
                                                                        <LuExternalLink />
                                                                    </Box>
                                                                </Icon>
                                                            </Link>
                                                        </Group>
                                                        <ItemDetail label="Contract address:"
                                                            displayValue={formatCryptoAddress(revision.witness_smart_contract_address, 4, 6)}
                                                            value={revision.witness_smart_contract_address!} showCopyIcon={true}
                                                        />
                                                    </TimelineContent>
                                                </TimelineItem>
                                            ) : null
                                        }
                                    </TimelineRoot>
                                </Card.Body>
                                <Card.Footer>
                                    {displayAlert}
                                </Card.Footer>
                            </Card.Root>
                        </Collapsible.Content>
                    </Collapsible.Root>
                </TimelineContent>
            </TimelineItem>
        </div>
    )
}



export const RevisionDetailsSummary = ({ fileInfo }: RevisionDetailsSummaryData) => {

    const { files, setSelectedFileInfo } = useStore(appStore)
    // const pageData: PageData = JSON.parse(fileInfo.page_data);
    // const revisionHashes = Object.keys(pageData.pages[0].revisions)
    const revisionHashes = Object.keys(fileInfo!.aquaTree!.revisions)

    //  
    const revisionsWithSignatures: Array<Revision> = [];
    const revisionsWithWitness: Array<Revision> = [];
    const revisionHashesWithLinks: Array<string> = [];

    for (let i = 0; i < revisionHashes.length; i++) {
        const currentRevision: string = revisionHashes[i];
        const revision: Revision = fileInfo.aquaTree!.revisions[currentRevision]; //pageData.pages[0].revisions[currentRevision];

        if (revision.revision_type == "signature") {
            revisionsWithSignatures.push(revision)
        }

        if (revision.revision_type == "witness") {
            revisionsWithWitness.push(revision)
        }
        if (revision.revision_type == "link") {
            revisionHashesWithLinks.push(currentRevision)
        }
    }


    return (<Stack textAlign="start" w={"100%"}>


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
                            {/* <Text style={{ whiteSpace: "pre-wrap" }}>{JSON.stringify(revision, null, 4)}</Text> */}

                            {/* <Text>{index}. {revision.signature?.signature} </Text> */}
                            <ItemDetail label="Signature Hash:"
                                displayValue={formatCryptoAddress(revision.signature, 4, 6)}
                                value={revision.signature ?? ""} showCopyIcon={true}
                            />
                            <WalletEnsView walletAddress={revision.signature_wallet_address!}></WalletEnsView>
                            <ItemDetail label="Timestamp (UTC) : "
                                // displayValue={formatCryptoAddress(revision.signature.signature_wallet_address, 4, 6)}
                                displayValue={displayTime(revision.local_timestamp)}
                                value={revision.local_timestamp ?? ""} showCopyIcon={false}
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
                                displayValue={formatCryptoAddress(revision.witness_network ?? "", 4, 6)}
                                value={revision.witness_network ?? " "} showCopyIcon={false}
                            />
                            <br />
                            <ItemDetail label="Timestamp (UTC) : "
                                displayValue={displayTime(revision.witness_timestamp?.toString() ?? "")}
                                value={revision.witness_timestamp?.toString() ?? ""} showCopyIcon={false}
                            />
                            <br />

                            <Group>
                                <ItemDetail label="Transaction Hash:"
                                    displayValue={formatCryptoAddress(revision.witness_transaction_hash?.startsWith('0x') ? revision.witness_transaction_hash ?? "" : `0x${revision.witness_transaction_hash ?? ""}`, 4, 6)}
                                    value={`0x${revision.witness_transaction_hash ?? ""}`} showCopyIcon={true}
                                />
                                <Link outline={'none'} href={`${WITNESS_NETWORK_MAP[revision.witness_network ?? ""]}/${revision.witness_transaction_hash}`} target="_blank">
                                    <Icon size={'sm'} color={'blue.500'}>
                                        <Box>
                                            <LuExternalLink />
                                        </Box>
                                    </Icon>
                                </Link>
                            </Group>
                        </Box>
                    </Group>
                )}
            </For>
        </Box>

        <Box w={'100%'} bg={'gray.100'} _dark={{
            bg: "blackAlpha.900"
        }} borderRadius={'lg'} p={{ base: '4', md: 'lg' }}>
            <Text mb={'2'} fontWeight={600} fontSize={'lg'}>Links ({revisionHashesWithLinks.length})</Text>
            <For
                each={revisionHashesWithLinks}
            >
                {(revisionHash, index) => {
                    const revision = fileInfo!.aquaTree?.revisions[revisionHash]
                    return (
                        <Group key={`witness_${index}`} pb={'2'} mb={'4'} borderBottom={'1px solid'} borderColor={'gray.200'} _dark={{
                            borderColor: "gray.50"
                        }} w={'100%'}>
                            <IconButton size={'xs'}>
                                {index + 1}
                            </IconButton>
                            {/* <Text>{index}. {revision.signature?.signature} </Text> */}
                            <Stack flex={1}>
                                {/* <ItemDetail label="F:"
                                displayValue={formatCryptoAddress(revision.witness_network ?? "", 4, 6)}
                                value={revision.witness_network ?? " "} showCopyIcon={false}
                            /> */}
                                {revisionDataHeader(fileInfo!.aquaTree!, revisionHash, fileInfo!.fileObject)}
                                <Box />
                                {viewLinkedFile(fileInfo!.aquaTree!, revisionHash, revision!!, files, setSelectedFileInfo)}
                                {/* <br />
                            <ItemDetail label="Timestamp (UTC) : "
                                displayValue={displayTime(revision.witness_timestamp?.toString() ?? "")}
                                value={revision.witness_timestamp?.toString() ?? ""} showCopyIcon={false}
                            />
                            <br />

                            <Group>
                                <ItemDetail label="Transaction Hash:"
                                    displayValue={formatCryptoAddress(revision.witness_transaction_hash?.startsWith('0x') ? revision.witness_transaction_hash ?? "" : `0x${revision.witness_transaction_hash ?? ""}`, 4, 6)}
                                    value={`0x${revision.witness_transaction_hash ?? ""}`} showCopyIcon={true}
                                />
                                <Link outline={'none'} href={`${WITNESS_NETWORK_MAP[revision.witness_network ?? ""]}/${revision.witness_transaction_hash}`} target="_blank">
                                    <Icon size={'sm'} color={'blue.500'}>
                                        <Box>
                                            <LuExternalLink />
                                        </Box>
                                    </Icon>
                                </Link>
                            </Group> */}
                            </Stack>
                        </Group>
                    )
                }}
            </For>
        </Box>

    </Stack>
    )
}


// export const ChainDetails = ({ fileInfo }: AquaTreeDetails) => {

//     // const [aquaTree, setAquaTreeData] = useState<AquaTree | null>()

//     const [verificationResults, setVerificationResults] = useState<VerificationHashAndResult[]>([])

//     const isVerificationComplete = (): boolean => verificationResults.length < Object.keys(fileInfo.aquaTree!.revisions!).length




//     useEffect(() => {
//         const verifyAquaTreeRevisions = async () => {

//             // verify revision
//             let aquafier = new Aquafier();
//             let revisionHashes = Object.keys(fileInfo.aquaTree!.revisions!);
//             for (let revisionHash of revisionHashes) {
//                 let revision = fileInfo.aquaTree!.revisions![revisionHash];
//                 let verificationResult = await aquafier.verifyAquaTreeRevision(fileInfo.aquaTree!, revision, revisionHash, [...fileInfo.fileObject, ...fileInfo.linkedFileObjects])

//                 // Create a new Map reference for the state update
//                 setVerificationResults(prevResults => {
//                     const newResults = [...prevResults];
//                     let existingItem = prevResults.find(item => item.hash === revisionHash)
//                     if (!existingItem) {
//                         if (verificationResult.isOk()) {
//                             newResults.push({ hash: revisionHash, isSuccessful: true });
//                         } else {
//                             newResults.push({ hash: revisionHash, isSuccessful: false });
//                         }
//                     }
//                     return newResults;
//                 });

//             }
//         }

//         verifyAquaTreeRevisions()
//     }, [fileInfo])

//     return (
//         <>
//             {
//                 fileInfo.aquaTree ? (
//                     <TimelineRoot size="lg" variant="subtle" maxW="xl">
//                         <For
//                             each={Object.keys(fileInfo.aquaTree.revisions)}
//                         >
//                             {(revisionHash, index) => (
//                                 <RevisionDisplay key={`revision_${index}`}
//                                     fileInfo={fileInfo}
//                                     revision={fileInfo.aquaTree!.revisions[revisionHash]}
//                                     revisionHash={revisionHash}
//                                     isVerificationComplete={isVerificationComplete()}
//                                     verificationResults={verificationResults}
//                                     isDeletable={index === Object.keys(fileInfo.aquaTree!.revisions!).length - 1}
//                                 />

//                             )}
//                         </For>
//                     </TimelineRoot>
//                 ) : null
//             }
//         </>
//     )
// }


// export const ChainDetailsView = ({ fileInfo, isVerificationComplete, verificationResults }: AquaTreeDetailsViewData) => {

//     return (
//         <>
//             {
//                 fileInfo.aquaTree ? (
//                     <TimelineRoot size="lg" variant="subtle" maxW="xl">
//                         <For
//                             each={Object.keys(fileInfo.aquaTree.revisions)}
//                         >
//                             {(revisionHash, index) => (
//                                 <RevisionDisplay key={`revision_${index}`}
//                                     fileInfo={fileInfo}
//                                     revision={fileInfo!.aquaTree!.revisions[revisionHash]}
//                                     revisionHash={revisionHash}
//                                     isVerificationComplete={isVerificationComplete}
//                                     verificationResults={verificationResults}
//                                     isDeletable={index === Object.keys(fileInfo.aquaTree!.revisions!).length - 1}
//                                 />

//                             )}
//                         </For>
//                     </TimelineRoot>
//                 ) : null
//             }
//         </>
//     )
// }
