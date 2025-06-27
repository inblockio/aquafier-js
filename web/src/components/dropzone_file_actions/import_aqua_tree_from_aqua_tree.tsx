import { LuCheck, LuChevronRight, LuImport, LuMinus, LuX } from "react-icons/lu";
import { Button } from "../chakra-ui/button";
import axios from "axios";
import { useStore } from "zustand";
import appStore from "../../store";
import { useEffect, useState } from "react";
import { ApiFileInfo } from "../../models/FileInfo";
import { toaster } from "../chakra-ui/toaster";
import { formatCryptoAddress } from "../../utils/functions";
import { Container, DialogCloseTrigger, Group, List, Text } from "@chakra-ui/react";

import { Alert } from "../chakra-ui/alert";
import { useNavigate } from "react-router-dom";
import { analyzeAndMergeRevisions } from "../../utils/aqua_funcs";
import { DialogActionTrigger, DialogBody, DialogContent, DialogFooter, DialogHeader, DialogRoot, DialogTitle } from "../chakra-ui/dialog";
import { TimelineConnector, TimelineContent, TimelineDescription, TimelineItem, TimelineRoot, TimelineTitle } from "../chakra-ui/timeline";
import { RevisionsComparisonResult } from "../../models/revision_merge";
import { OrderRevisionInAquaTree, Revision } from "aqua-js-sdk";
import { BtnContent, ImportChainFromChainProps } from "../../types/types";



export const ImportAquaChainFromChain = ({ fileInfo, isVerificationSuccessful, contractData }: ImportChainFromChainProps) => {

    const [uploading, setUploading] = useState(false)
    const [_uploaded, setUploaded] = useState(false)
    const [dbFiles, setDbFiles] = useState<ApiFileInfo[]>([])
    const [comparisonResult, setComparisonResult] = useState<RevisionsComparisonResult | null>(null)
    const [modalOpen, setModalOpen] = useState(false)

    // const [_existingFileId, _setExistingFileId] = useState<number | null>(null)
    const [_lastIdenticalRevisionHash, setLastIdenticalRevisionHash] = useState<string | null>(null)
    const [_revisionsToImport, setRevisionsToImport] = useState<Revision[]>([])
    const [updateMessage, setUpdateMessage] = useState<string | null>(null)
    const [btnText, setBtnText] = useState<BtnContent>({
        text: "Submit chain",
        color: "blue"
    })

    //  console.log(revisionsToImport)

    const { files, backend_url, session } = useStore(appStore)

    let navigate = useNavigate();

    //  console.log("Chain to import: ", fileInfo)
    //  console.log("My db files: ", dbFiles)

    const importAquaChain = async () => {
        // Early check to prevent recursion if already processing
        if (uploading) return;

        const existingChainFile = dbFiles.find(file => Object.keys(file?.aquaTree?.revisions ?? {})[0] === Object.keys(fileInfo?.aquaTree?.revisions ?? {})[0])

        // 1. update local chain with new revisions. (importing chain is bigger)
        // 2. delete revsiion in local chain if the locl one has more revision than the importing one (ie remote has less and theyare the same revision)
        // 3. if the  importing chain has  same length or bigger/smmal but divergent revision

        if (existingChainFile) {
            const existingFileRevisions = Object.keys(existingChainFile?.aquaTree?.revisions ?? {})
            const fileToImportRevisions = Object.keys(fileInfo?.aquaTree?.revisions ?? {})

            ////  console.log(existingFileRevisions, fileToImportRevisions)
            const mergeResult = analyzeAndMergeRevisions(existingFileRevisions, fileToImportRevisions)
            let _revisionsToImport: Revision[] = []

            if (mergeResult.existingRevisionsLength < mergeResult.upcomingRevisionsLength) {
                setUpdateMessage("Importing chain is longer than existing chain, this will add new revisions to your local chain")
                setBtnText({
                    text: "Update Local Chain",
                    color: "green",
                })
            }

            if (mergeResult.existingRevisionsLength > mergeResult.upcomingRevisionsLength) {
                setUpdateMessage("Existing chain is longer than importing chain, this will delete some revisions in your local chain")
                setBtnText({
                    text: "Rebase Local Chain",
                    color: "yellow"
                })
            }

            if (mergeResult.existingRevisionsLength === mergeResult.upcomingRevisionsLength && mergeResult.divergences.length > 0) {
                setUpdateMessage("Chains are different, this will merge the chains, your local revisions will be deleted up to where the chains diverge")
                setBtnText({
                    text: "Merge Chains",
                    color: "red"
                })
            }

            if (mergeResult.divergences.length > 0) {
                for (let i = 0; i < mergeResult.divergences.length; i++) {
                    const div = mergeResult.divergences[i];
                    if (div.upcomingRevisionHash) {
                        _revisionsToImport.push(fileInfo?.aquaTree?.revisions[div.upcomingRevisionHash]!!)
                    }
                }
            }

            setComparisonResult(mergeResult)
            setLastIdenticalRevisionHash(mergeResult.lastIdenticalRevisionHash)
            setRevisionsToImport(_revisionsToImport)
            setModalOpen(true)
            return
        }

        setUploading(true)

        try {
            const url = `${backend_url}/transfer_chain`
            const reorderedRevisions = OrderRevisionInAquaTree(fileInfo.aquaTree!!)
            const revisions = reorderedRevisions.revisions
            const revisionHashes = Object.keys(revisions)
            const latestRevisionHash = revisionHashes[revisionHashes.length - 1]
            console.log("Latest revision hash: ", latestRevisionHash)

            const res = await axios.post(url, {
                latestRevisionHash: latestRevisionHash,
                userAddress: contractData.sender
            }, {
                headers: {
                    "nonce": session?.nonce
                }
            })

            console.log("Transfer chain res: ", res)
            if (res.status === 200) {
                toaster.create({
                    description: "Aqua Chain imported successfully",
                    type: "success"
                })

                // Use setTimeout to ensure state is updated before navigation
                setTimeout(() => {
                    navigate("/loading?reload=true");
                }, 500);
            } else {
                toaster.create({
                    description: "Failed to import chain",
                    type: "error"
                })
            }

            setUploading(false)
            setUploaded(true)
            return;
        } catch (error) {
            setUploading(false)
            toaster.create({
                description: `Failed to import chain: ${error}`,
                type: "error"
            })
        }
    };

    const handleMergeRevisions = async () => {


        try {
            const url = `${backend_url}/merge_chain`
            const reorderedRevisions = OrderRevisionInAquaTree(fileInfo.aquaTree!!)
            const revisions = reorderedRevisions.revisions
            const revisionHashes = Object.keys(revisions)
            const latestRevisionHash = revisionHashes[revisionHashes.length - 1]
            // console.log("Latest revision hash: ", latestRevisionHash)

            const res = await axios.post(url, {
                latestRevisionHash: latestRevisionHash,
                userAddress: contractData.sender,
                mergeStrategy: "fork"
            }, {
                headers: {
                    "nonce": session?.nonce
                }
            })

            // console.log("Transfer chain res: ", res)
            if (res.status === 200) {
                toaster.create({
                    description: "Aqua Chain imported successfully",
                    type: "success"
                })

                // Use setTimeout to ensure state is updated before navigation
                setTimeout(() => {
                    navigate("/loading?reload=true");
                }, 500);
            } else {
                toaster.create({
                    description: "Failed to import chain",
                    type: "error"
                })
            }

            setUploading(false)
            setUploaded(true)
            return;
        } catch (error) {
            setUploading(false)
            toaster.create({
                description: `Failed to import chain: ${error}`,
                type: "error"
            })
        }
    }

    //  console.log(comparisonResult)

    useEffect(() => {
        // Only update dbFiles if files have actually changed
        // This prevents unnecessary re-renders and potential recursion
        if (JSON.stringify(files) !== JSON.stringify(dbFiles)) {
            setDbFiles(files);
        }
    }, [files]);

    return (
        <Container maxW={'xl'}>
            <Alert title="Import Aqua Chain" icon={<LuImport />}>
                <Group gap={"10"}>
                    <Text>
                        Do you want to import this Aqua Chain?
                    </Text>
                    <Button data-testid="import-aqua-chain-1-button" size={'lg'} colorPalette={'blue'} variant={'solid'} onClick={importAquaChain}
                   
                    >
                        <LuImport />
                        Import
                    </Button>
                </Group>
            </Alert>
           
            <DialogRoot open={modalOpen} onOpenChange={e => setModalOpen(e.open)}>
               
                <DialogContent borderRadius={'lg'}>
                    <DialogHeader>
                        <DialogTitle>Aqua Chain Import</DialogTitle>
                    </DialogHeader>
                    <DialogBody>
                        <TimelineRoot>
                            <TimelineItem colorPalette={isVerificationSuccessful ? 'green' : 'red'}>
                                <TimelineConnector>
                                    <LuCheck />
                                </TimelineConnector>
                                <TimelineContent colorPalette={'gray'}>
                                    <TimelineTitle>Verification status</TimelineTitle>
                                    <TimelineDescription>Verification successful</TimelineDescription>
                                </TimelineContent>
                            </TimelineItem>

                            {
                                comparisonResult?.identical ? (
                                    <>
                                        <TimelineItem colorPalette={'green'}>
                                            <TimelineConnector>
                                                <LuCheck />
                                            </TimelineConnector>
                                            <TimelineContent>
                                                <TimelineTitle textStyle="sm">Chains Identical</TimelineTitle>
                                                <TimelineDescription>Chains are identical</TimelineDescription>
                                            </TimelineContent>
                                        </TimelineItem>
                                    </>
                                ) : null
                            }

                            {
                                (comparisonResult?.existingRevisionsLength ?? 0) > (comparisonResult?.upcomingRevisionsLength ?? 0) ? (
                                    <>
                                        <TimelineItem colorPalette={'green'}>
                                            <TimelineConnector>
                                                <LuCheck />
                                            </TimelineConnector>
                                            <TimelineContent>
                                                <TimelineTitle textStyle="sm">Chain Difference</TimelineTitle>
                                                <TimelineDescription>Existing Chain is Longer than Upcoming Chain</TimelineDescription>
                                            </TimelineContent>
                                        </TimelineItem>
                                    </>
                                ) : null
                            }

                            {
                                comparisonResult?.sameLength ? (
                                    <>
                                        <TimelineItem colorPalette={'green'}>
                                            <TimelineConnector>
                                                <LuCheck />
                                            </TimelineConnector>
                                            <TimelineContent>
                                                <TimelineTitle textStyle="sm">Chains Length</TimelineTitle>
                                                <TimelineDescription>Chains are of same Length</TimelineDescription>
                                            </TimelineContent>
                                        </TimelineItem>
                                    </>
                                ) : null
                            }


                            {
                                (
                                    (comparisonResult?.divergences?.length ?? 0) > 0
                                    && (comparisonResult?.existingRevisionsLength ?? 0) <= (comparisonResult?.upcomingRevisionsLength ?? 0)
                                    // && isVerificationSuccessful // We won't reach here since by then the import button will be disabled
                                ) ? (
                                    <>
                                        <TimelineItem colorPalette={'gray'}>
                                            <TimelineConnector>
                                                <LuX />
                                            </TimelineConnector>
                                            <TimelineContent>
                                                <TimelineTitle textStyle="sm">Chains are Different</TimelineTitle>
                                                {/* <TimelineDescription>Chains have divergencies</TimelineDescription> */}
                                                <List.Root>
                                                    {
                                                        comparisonResult?.divergences.map((diff, i: number) => (
                                                            <List.Item key={`diff_${i}`} fontSize={'sm'}>
                                                                {
                                                                    diff.existingRevisionHash ? (
                                                                        <Group>
                                                                            <Text textDecoration={'line-through'} style={{ textDecorationColor: 'red', color: "red" }}>
                                                                                {formatCryptoAddress(diff.existingRevisionHash ?? "", 15, 4)}
                                                                            </Text>
                                                                            <LuChevronRight />
                                                                            <Text>
                                                                                {formatCryptoAddress(diff.upcomingRevisionHash ?? "", 15, 4)}
                                                                            </Text>
                                                                        </Group>
                                                                    ) : (
                                                                        <>
                                                                            {formatCryptoAddress(diff.upcomingRevisionHash ?? "", 20, 4)}
                                                                        </>
                                                                    )
                                                                }
                                                            </List.Item>
                                                        ))
                                                    }
                                                </List.Root>
                                            </TimelineContent>
                                        </TimelineItem>

                                        <TimelineItem colorPalette={'info'}>
                                            <TimelineConnector>
                                                <LuCheck />
                                            </TimelineConnector>
                                            <TimelineContent>
                                                <TimelineTitle textStyle="sm">Action</TimelineTitle>
                                                <TimelineDescription>{btnText.text}</TimelineDescription>
                                                <Alert title="Action Not reversible!" status={'warning'}>
                                                    {/* This action will delete some revision(s) in your local Aqua Chain */}
                                                    {updateMessage}
                                                </Alert>
                                                <Group>
                                                    <Button  data-testid="action-32-button" size={'xs'} borderRadius={'md'} colorPalette={btnText.color} onClick={handleMergeRevisions} loading={uploading}>{btnText.text}</Button>
                                                </Group>
                                            </TimelineContent>
                                        </TimelineItem>
                                    </>
                                ) : null
                            }

                            {
                                (
                                    (comparisonResult?.divergences?.length ?? 0) > 0
                                    && (comparisonResult?.existingRevisionsLength ?? 0) > (comparisonResult?.upcomingRevisionsLength ?? 0)
                                    // && isVerificationSuccessful // We won't reach here since by then the import button will be disabled
                                ) ? (
                                    <>
                                        <TimelineItem colorPalette={'gray'}>
                                            <TimelineConnector>
                                                <LuX />
                                            </TimelineConnector>
                                            <TimelineContent>
                                                <TimelineTitle textStyle="sm">Chains are Different</TimelineTitle>
                                                {/* <TimelineDescription>Chains have divergencies</TimelineDescription> */}
                                                <List.Root>
                                                    {
                                                        comparisonResult?.divergences.map((diff, i: number) => (
                                                            <List.Item key={`diff_${i}`} fontSize={'sm'}>
                                                                {
                                                                    diff.existingRevisionHash ? (
                                                                        <Group>
                                                                            <Text textDecoration={'line-through'} style={{ textDecorationColor: 'red', color: "red" }}>
                                                                                {formatCryptoAddress(diff.existingRevisionHash ?? "", 15, 4)}
                                                                            </Text>
                                                                            <LuChevronRight />
                                                                            <Text>
                                                                                {formatCryptoAddress(diff.upcomingRevisionHash ?? "", 15, 4, "Revision will be deleted")}
                                                                            </Text>
                                                                        </Group>
                                                                    ) : (
                                                                        <>
                                                                            {formatCryptoAddress(diff.upcomingRevisionHash ?? "", 20, 4)}
                                                                        </>
                                                                    )
                                                                }
                                                            </List.Item>
                                                        ))
                                                    }
                                                </List.Root>
                                            </TimelineContent>
                                        </TimelineItem>

                                        <TimelineItem colorPalette={'info'}>
                                            <TimelineConnector>
                                                <LuCheck />
                                            </TimelineConnector>
                                            <TimelineContent>
                                                <TimelineTitle textStyle="sm">Action</TimelineTitle>
                                                <TimelineDescription>{btnText.text}</TimelineDescription>
                                                <Alert title="Action Not reversible!" status={'warning'}>
                                                    {/* This action will delete some revision(s) in your local Aqua Chain */}
                                                    {updateMessage}
                                                </Alert>
                                                <Group>
                                                    <Button  data-testid="action-67-button" size={'xs'} borderRadius={'md'} colorPalette={btnText.color} onClick={handleMergeRevisions} loading={uploading}>{btnText.text}</Button>
                                                </Group>
                                            </TimelineContent>
                                        </TimelineItem>
                                    </>
                                ) : null
                            }

                            {
                                (
                                    (comparisonResult?.identical && (comparisonResult?.sameLength && comparisonResult?.divergences.length === 0))
                                    // || !isVerificationSuccessful // Import button will be disabled, no reaching this point
                                ) ? (
                                    <TimelineItem colorPalette={'blue'}>
                                        <TimelineConnector>
                                            <LuMinus />
                                        </TimelineConnector>
                                        <TimelineContent>
                                            <TimelineTitle textStyle="sm">Action</TimelineTitle>
                                            <TimelineDescription>No Action</TimelineDescription>
                                        </TimelineContent>
                                    </TimelineItem>
                                ) : null
                            }

                        </TimelineRoot>
                    </DialogBody>
                    <DialogFooter>
                        <DialogActionTrigger asChild>
                            <Button data-testid="action-cancel-button" variant="outline" borderRadius={'md'}>Cancel</Button>
                        </DialogActionTrigger>
                        
                    </DialogFooter>
                    <DialogCloseTrigger />
                </DialogContent>
            </DialogRoot>

        </Container >
    )
}