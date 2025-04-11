import { useState, useEffect } from "react";
import { LuCheck, LuExternalLink, LuX } from "react-icons/lu"
import { Box, Card, Collapsible, For, Group, Icon, IconButton, Link, Span, Text, VStack } from "@chakra-ui/react"
import { TimelineConnector, TimelineContent, TimelineDescription, TimelineItem, TimelineRoot, TimelineTitle } from "./chakra-ui/timeline"
import { displayTime, formatCryptoAddress, fetchLinkedFileName } from "../utils/functions"
import { Alert } from "./chakra-ui/alert"
import Aquafier, { LogTypeEmojis, Revision } from "aqua-js-sdk";
import ReactLoading from "react-loading"
import { WITNESS_NETWORK_MAP } from "../utils/constants"
import { WalletEnsView } from "./chakra-ui/wallet_ens"
import { AquaTreeDetails, AquaTreeDetailsData, AquaTreeDetailsViewData, RevisionDetailsSummaryData } from "../models/AquaTreeDetails"

import { ItemDetail } from "./ItemDetails";


export const RevisionDisplay = ({ fileInfo, revision, revisionHash, isVerificationComplete, verificationResults }: AquaTreeDetailsData) => {

    const [showRevisionDetails, setShowRevisionDetails] = useState(false)


    const loaderSize = '40px'

    const returnBgColor = (): string => {
        if (!isVerificationComplete) {
            return "gray.400"
        }
        if (!verificationResults.has(revisionHash)) {
            return "yellow"
        }
        if (verificationResults.get(revisionHash)) {
            return "green"
        } else {
            return "red"

        }
    }

    const isVerificationSuccessful = (): boolean | null => {

        console.log(`isVerificationComplete ${isVerificationComplete} mapcontains ${verificationResults.has(revisionHash)}  verificationResults size  --- ${verificationResults.size}  `)
        console.table(verificationResults)
        if (!isVerificationComplete) {
            return null
        }

        if (!verificationResults.has(revisionHash)) {
            console.log(`💣💣 Hash not found ${revisionHash}`)
            return null
        }

        if (verificationResults.get(revisionHash)) {
            return true
        }
        return false

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

    const revisionTypeEmoji = LogTypeEmojis[revision.revision_type]

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

                    <TimelineTitle onClick={() => setShowRevisionDetails(prev => !prev)} cursor={"pointer"}>
                        <Span textTransform={"capitalize"}>{`${revisionTypeEmoji ? revisionTypeEmoji : ''} ${revision?.revision_type} Revision`}</Span>
                        <Span color="fg.muted" fontFamily={'monospace'}>{revisionHash}</Span>
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
                                                                        revision.previous_verification_hash.length == 0 ? "Genesis Revision" : revision.revision_type == "link" ? <>{`linked to ${fetchLinkedFileName(fileInfo.aquaTree!!, revision)}`}</> : revision.revision_type
                                                                    }
                                                                </Span>
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

                                                        </TimelineContent>

                                                    </TimelineItem>
                                                </> : null
                                        }

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
                                                                Revision witness is &nbsp;
                                                                {
                                                                    verificationStatusText()
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
                                                                    <LuExternalLink />
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
                                    {displayAlert()}
                                </Card.Footer>
                            </Card.Root>
                        </Collapsible.Content>
                    </Collapsible.Root>
                </TimelineContent>
            </TimelineItem>
        </div>
    )
}



export const RevisionDetailsSummary = ({ fileInfo, isVerificationComplete, isVerificationSuccess }: RevisionDetailsSummaryData) => {


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


export const ChainDetails = ({ fileInfo }: AquaTreeDetails) => {

    // const [aquaTree, setAquaTreeData] = useState<AquaTree | null>()

    const [verificationResults, setVerificationResults] = useState<Map<string, boolean>>(new Map())

    const isVerificationComplete = (): boolean => verificationResults.size < Object.keys(fileInfo.aquaTree!.revisions!).length




    useEffect(() => {
        const verifyAquaTreeRevisions = async () => {

            // verify revision
            let aquafier = new Aquafier();
            let revisionHashes = Object.keys(fileInfo.aquaTree!.revisions!);
            for (let revisionHash of revisionHashes) {
                let revision = fileInfo.aquaTree!.revisions![revisionHash];
                let verificationResult = await aquafier.verifyAquaTreeRevision(fileInfo.aquaTree!, revision, revisionHash, [...fileInfo.fileObject, ...fileInfo.linkedFileObjects])

                // Create a new Map reference for the state update
                setVerificationResults(prevResults => {
                    const newResults = new Map(prevResults);
                    if (verificationResult.isOk()) {
                        newResults.set(revisionHash, true);
                    } else {
                        newResults.set(revisionHash, false);
                    }
                    return newResults;
                });
            }
        }

        verifyAquaTreeRevisions()
    }, [fileInfo])

    return (
        <>
            {
                fileInfo.aquaTree ? (
                    <TimelineRoot size="lg" variant="subtle" maxW="xl">
                        <For
                            each={Object.keys(fileInfo.aquaTree.revisions)}
                        >
                            {(revisionHash, index) => (
                                <RevisionDisplay key={`revision_${index}`}
                                    fileInfo={fileInfo}
                                    revision={fileInfo.aquaTree!.revisions[revisionHash]}
                                    revisionHash={revisionHash}
                                    isVerificationComplete={isVerificationComplete()}
                                    verificationResults={verificationResults}

                                />

                            )}
                        </For>
                    </TimelineRoot>
                ) : null
            }
        </>
    )
}


export const ChainDetailsView = ({ fileInfo, isVerificationComplete, verificationResults }: AquaTreeDetailsViewData) => {

    return (
        <>
            {
                fileInfo.aquaTree ? (
                    <TimelineRoot size="lg" variant="subtle" maxW="xl">
                        <For
                            each={Object.keys(fileInfo.aquaTree.revisions)}
                        >
                            {(revisionHash, index) => (
                                <RevisionDisplay key={`revision_${index}`}
                                    fileInfo={fileInfo}
                                    revision={fileInfo!.aquaTree!.revisions[revisionHash]}
                                    revisionHash={revisionHash}
                                    isVerificationComplete={isVerificationComplete}
                                    verificationResults={verificationResults}

                                />

                            )}
                        </For>
                    </TimelineRoot>
                ) : null
            }
        </>
    )
}
