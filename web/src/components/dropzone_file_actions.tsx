import { LuCheck, LuChevronRight, LuImport, LuMinus, LuScan, LuUpload, LuX } from "react-icons/lu";
import { Button } from "./ui/button";
import axios from "axios";
import { useStore } from "zustand";
import appStore from "../store";
import { useEffect, useState } from "react";
import { ApiFileInfo } from "../models/FileInfo";
import { toaster } from "./ui/toaster";
import { encodeFileToBase64, formatCryptoAddress, readJsonFile } from "../utils/functions";
import { ChainDetailsBtn } from "./ui/navigation/CustomDrawer";
import { Container, DialogCloseTrigger, Group, List, Text } from "@chakra-ui/react";
import { Alert } from "./ui/alert";
import { useNavigate } from "react-router-dom";
import { analyzeAndMergeRevisions } from "../utils/aqua_funcs";
import { DialogActionTrigger, DialogBody, DialogContent, DialogFooter, DialogHeader, DialogRoot, DialogTitle } from "./ui/dialog";
import { TimelineConnector, TimelineContent, TimelineDescription, TimelineItem, TimelineRoot, TimelineTitle } from "./ui/timeline";
import { RevisionsComparisonResult } from "../models/revision_merge";
import { HashChain, Revision } from "aqua-verifier";


interface IDropzoneAction {
    file: File
    fileIndex: number
    uploadedIndexes: number[]
    updateUploadedIndex: (fileIndex: number) => void
}

export const UploadFile = ({ file, uploadedIndexes, fileIndex, updateUploadedIndex }: IDropzoneAction) => {

    const [uploading, setUploading] = useState(false)
    const [uploaded, setUploaded] = useState(false)

    const { metamaskAddress, setFiles, files, backend_url, session } = useStore(appStore)

    const uploadFile = async () => {

        const existingChainFile = files.find(_file => file.name === _file.name)

        if (existingChainFile) {
            toaster.create({
                description: "You already have the file. Delete before importing this",
                type: "info"
            })
            return
        }


        if (!file) {
            toaster.create({
                description: "No file selected!",
                type: "info"
            })
            return;
        }

        const formData = new FormData();
        formData.append('file', file);
        formData.append('account', `${metamaskAddress}`);

        setUploading(true)
        try {
            const url = `${backend_url}/explorer_files`
            console.log("url ", url)
            const response = await axios.post(url, formData, {
                headers: {
                    'Content-Type': 'multipart/form-data',
                    "nonce": session?.nonce
                },
            });

            const res = response.data

            const fileInfo : ApiFileInfo = {
                aquaTree: res.aquaTree,
                fileObject:  res.fileObject,
                linkedFileObjects: [],
                mode:"private",
                owner: metamaskAddress??""
            }
            // const base64Content = await encodeFileToBase64(file);
            // Assuming the API returns an array of FileInfo objects
            // const fileInfo: ApiFileInfo = {
            //     fileObject: {
            //         fileName: res.file.name,
            //         fileContent: base64Content,
            //         path: "aqua::",
            //     },
            //     // name: res.file.name,
            //     // extension: res.file.extension,
            //     // page_data: res.file.page_data,
            //     mode: res.file.mode,
            //     owner: res.file.owner,
            //     aquaTree: null,
            //     linkedFileObjects: []
            // };

            setFiles([...files, fileInfo])
            setUploaded(true)
            setUploading(false)
            toaster.create({
                description: "File uploaded successfuly",
                type: "success"
            })
            updateUploadedIndex(fileIndex)
            return;
        } catch (error) {
            setUploading(false)
            toaster.create({
                description: `Failed to upload file: ${error}`,
                type: "error"
            })
        }
    };

    return (
        <Button size={'xs'} colorPalette={'blackAlpha'} variant={'subtle'} w={'80px'} onClick={uploadFile} disabled={uploadedIndexes.includes(fileIndex) || uploaded} loading={uploading}>
            <LuUpload />
            Upload
        </Button>
    )
}


export const VerifyFile = ({ file }: IDropzoneAction) => {

    const [verifying, setVerifying] = useState(false)
    const [hashChainForVerification, setHashChain] = useState<ApiFileInfo>()
    const [_isVerificationSuccessful, setIsVerificationSuccessful] = useState(false)
    // const [uploaded, setUploaded] = useState(false)

    // const { metamaskAddress, setFiles, files } = useStore(appStore)

    const handleVerifyAquaJsonFile = () => {
        setVerifying(true)
        readJsonFile(file)
            .then((jsonData) => {
                const hashChain: ApiFileInfo = {
                    id: 0,
                    name: '',
                    extension: '',
                    page_data: JSON.stringify(jsonData),
                    mode: '',
                    owner: ''
                }
                setHashChain(hashChain)
                // const hashChainString = JSON.stringify(hashChain)
                // console.log("JSON data:", hashChain);
                // setAppState("selectedFileFromApi", hashChain);
                // navigate("/details");
                // Handle the JSON data here
            })
            .catch(() => {
                // Handle the error here
            });
        setVerifying(false)
    };

    useEffect(() => {
        handleVerifyAquaJsonFile()
    }, [])

    return (
        <>
            {
                hashChainForVerification ? (
                    <ChainDetailsBtn fileInfo={hashChainForVerification} callBack={(res) => setIsVerificationSuccessful(res)} />
                ) : (
                    <Button size={'xs'} colorPalette={'blackAlpha'} variant={'subtle'} w={'80px'} loading={verifying} disabled>
                        <LuScan />
                        Loading Chain
                    </Button>
                )
            }
        </>
    )
}


export const ImportAquaChainFromFile = ({ file, uploadedIndexes, fileIndex, updateUploadedIndex }: IDropzoneAction) => {

    const [uploading, setUploading] = useState(false)
    const [uploaded, setUploaded] = useState(false)

    const { metamaskAddress, setFiles, files, user_profile, backend_url } = useStore(appStore)

    const importAquaChain = async () => {

        if (!file) {
            toaster.create({
                description: "No file selected!",
                type: "error"
            })
            return;
        }

        const formData = new FormData();
        formData.append('file', file);
        formData.append('account', "example");
        setUploading(true)
        try {
            const url = `${backend_url}/explorer_aqua_file_upload`;
            console.log("importAquaChain url ", url)
            const response = await axios.post(url, formData, {
                headers: {
                    'Content-Type': 'multipart/form-data',
                    "metamask_address": metamaskAddress
                },
            });

            const res = response.data

            // let logs: Array<string> = res.logs
            // logs.forEach((item) => {
            //     console.log("**>" + item + "\n.")
            // })

            // console.log("Upload res: ", res)

            // Assuming the API returns an array of FileInfo objects
            const file: ApiFileInfo = {
                id: res.file.id,
                name: res.file.name,
                extension: res.file.extension,
                page_data: res.file.page_data,
                mode: user_profile.fileMode ?? "",
                owner: metamaskAddress ?? "",
            };
            setFiles([...files, file])
            // setUploadedFilesIndexes(value => [...value, fileIndex])
            toaster.create({
                description: "Aqua Chain imported successfully",
                type: "success"
            })
            setUploading(false)
            setUploaded(true)
            updateUploadedIndex(fileIndex)
            return;
        } catch (error) {
            setUploading(false)
            toaster.create({
                description: `Failed to import chain: ${error}`,
                type: "error"
            })
        }
    };

    return (
        <Button size={'xs'} colorPalette={'blackAlpha'} variant={'subtle'} w={'80px'} onClick={importAquaChain} disabled={uploadedIndexes.includes(fileIndex) || uploaded} loading={uploading}>
            <LuImport />
            Import
        </Button>
    )
}

interface ImportChainFromChainProps { fileInfo: ApiFileInfo, isVerificationSuccessful: boolean }

interface BtnContent {
    text: string
    color: string
}

export const ImportAquaChainFromChain = ({ fileInfo, isVerificationSuccessful }: ImportChainFromChainProps) => {

    const [uploading, setUploading] = useState(false)
    const [_uploaded, setUploaded] = useState(false)
    const [dbFiles, setDbFiles] = useState<ApiFileInfo[]>([])
    const [comparisonResult, setComparisonResult] = useState<RevisionsComparisonResult | null>(null)
    const [modalOpen, setModalOpen] = useState(false)

    const [existingFileId, setExistingFileId] = useState<number | null>(null)
    const [lastIdenticalRevisionHash, setLastIdenticalRevisionHash] = useState<string | null>(null)
    const [revisionsToImport, setRevisionsToImport] = useState<Revision[]>([])
    const [updateMessage, setUpdateMessage] = useState<string | null>(null)
    const [btnText, setBtnText] = useState<BtnContent>({
        text: "Submit chain",
        color: "blue"
    })

    console.log(revisionsToImport)

    const { metamaskAddress, setFiles, files, user_profile, backend_url } = useStore(appStore)

    let navigate = useNavigate();

    const importAquaChain = async () => {

        // const existingChainFile = dbFiles.find(file => file.name === fileInfo.name)
        const chainToImport: HashChain = JSON.parse(fileInfo.page_data).pages[0]
        const existingChainFile = dbFiles.find(file => JSON.parse(file.page_data).pages[0].genesis_hash === chainToImport.genesis_hash)

        // 1. update local chain with new revisions. (importing chain is bigger)
        // 2. delete revsiion in local chain if the locl one has more revision than the importing one (ie remote has less and theyare the same revision)
        // 3. if the  importing chain has  same length or bigger/smmal but divergent revision

        if (existingChainFile) {

            const existingFileRevisions = Object.keys(JSON.parse(existingChainFile.page_data).pages[0].revisions)
            const fileToImportRevisions = Object.keys(chainToImport.revisions)

            // console.log(existingFileRevisions, fileToImportRevisions)
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
                        _revisionsToImport.push(chainToImport.revisions[div.upcomingRevisionHash])
                    }
                }
            }

            // console.log(mergeResult)
            setComparisonResult(mergeResult)
            setLastIdenticalRevisionHash(mergeResult.lastIdenticalRevisionHash)
            setRevisionsToImport(_revisionsToImport)
            setModalOpen(true)
            setExistingFileId(existingChainFile.id)


            // toaster.create({
            //     description: `You already have the file called "${fileInfo.name}". Delete before importing this `,
            //     type: "error"
            // })
            return
        }

        // Create a JSON file from the page_data object
        const fileData = fileInfo.page_data // JSON.stringify(fileInfo.page_data, null, 2); // Convert to JSON string
        const file = new File([fileData], fileInfo.name, {
            type: "application/json",
        });

        if (!file) {
            toaster.create({
                description: "No file selected!",
                type: "error"
            })
            return;
        }

        const formData = new FormData();
        formData.append('file', file);
        formData.append('account', `${metamaskAddress}`);

        setUploading(true)

        try {
            const url = `${backend_url}/explorer_aqua_file_upload`
            console.log("importAquaChain url ", url)
            const response = await axios.post(url, formData, {
                headers: {
                    'Content-Type': 'multipart/form-data',
                    "metamask_address": metamaskAddress
                },
            });

            const res = response.data

            // let logs: Array<string> = res.logs
            // logs.forEach((item) => {
            //     console.log("**>" + item + "\n.")
            // })

            // console.log("Upload res: ", res)

            // Assuming the API returns an array of FileInfo objects
            const file: ApiFileInfo = {
                id: res.file.id,
                name: res.file.name,
                extension: res.file.extension,
                page_data: res.file.page_data,
                mode: user_profile.fileMode ?? "",
                owner: metamaskAddress ?? "",
            };
            setFiles([...files, file])
            // setUploadedFilesIndexes(value => [...value, fileIndex])
            toaster.create({
                description: "Aqua Chain imported successfully",
                type: "success"
            })
            setUploading(false)
            setUploaded(true)
            // This navigate doesn't go to fsa page why?
            navigate("/loading?reload=true");
            // window.location.reload()
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
            setUploading(true)
            const response = await axios.post(`${backend_url}/explorer_merge_chain`, {
                file_id: existingFileId,
                last_identical_revision_hash: lastIdenticalRevisionHash,
                revisions_to_import: revisionsToImport
            })
            if (response.status === 200) {
                toaster.create({
                    title: "Aqua chain import",
                    description: "Chain merged successfully",
                    type: "success"
                })
                setUploading(false)
                setUploaded(true)

                const res: ApiFileInfo = response.data
                console.log(res)

                const newFiles: ApiFileInfo[] = [];
                setFiles(newFiles)

                for (let index = 0; index < files.length; index++) {
                    const file = files[index];
                    if (file.id === res.id) {
                        newFiles.push(res)
                    } else {
                        newFiles.push(file)
                    }
                }

                navigate("/loading?reload=true");
            }
        } catch (e: any) {
            setUploading(false)
            if (e.message) {
                toaster.create({
                    title: "Error occured",
                    description: e.message,
                    type: "error"
                })
            }
        }
    }

    console.log(comparisonResult)

    useEffect(() => {
        setDbFiles(files)
    }, [files])

    return (
        <Container maxW={'xl'}>
            <Alert title="Import Aqua Chain" icon={<LuImport />}>
                <Group gap={"10"}>
                    <Text>
                        Do you want to import this Aqua Chain?
                    </Text>
                    <Button size={'lg'} colorPalette={'blue'} variant={'solid'} onClick={importAquaChain} disabled={!isVerificationSuccessful} loading={uploading}>
                        <LuImport />
                        Import
                    </Button>
                </Group>
            </Alert>
            {/* <Alert.Root colorPalette={'orange'}>
                Would you like to import the file?
                <Button size={'lg'} colorPalette={'blue'} variant={'subtle'} onClick={importAquaChain} disabled={!isVerificationSuccessful} loading={uploading}>
                    <LuImport />
                    Import
                </Button>
            </Alert.Root> */}

            <DialogRoot open={modalOpen} onOpenChange={e => setModalOpen(e.open)}>
                {/* <DialogTrigger asChild>
                    <Button variant="outline" size="sm">
                        Open Dialog
                    </Button>
                </DialogTrigger> */}
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
                                                    <Button size={'xs'} borderRadius={'md'} colorPalette={btnText.color} onClick={handleMergeRevisions} loading={uploading}>{btnText.text}</Button>
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
                                                    <Button size={'xs'} borderRadius={'md'} colorPalette={btnText.color} onClick={handleMergeRevisions} loading={uploading}>{btnText.text}</Button>
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
                            <Button variant="outline" borderRadius={'md'}>Cancel</Button>
                        </DialogActionTrigger>
                        {/* <Button>Save</Button> */}
                    </DialogFooter>
                    <DialogCloseTrigger />
                </DialogContent>
            </DialogRoot>

        </Container >
    )
}
function streamToBuffer(file: any) {
    throw new Error("Function not implemented.");
}

