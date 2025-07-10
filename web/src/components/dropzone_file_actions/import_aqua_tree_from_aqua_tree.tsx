import { LuCheck, LuChevronRight, LuImport, LuMinus, LuX } from "react-icons/lu";
import axios from "axios";
import { useStore } from "zustand";
import appStore from "../../store";
import { useEffect, useState } from "react";
import { ApiFileInfo } from "../../models/FileInfo";
import { formatCryptoAddress } from "../../utils/functions";
import { useNavigate } from "react-router-dom";
import { analyzeAndMergeRevisions } from "../../utils/aqua_funcs";
import { RevisionsComparisonResult } from "../../models/revision_merge";
import { OrderRevisionInAquaTree, Revision } from "aqua-js-sdk";
import { BtnContent, ImportChainFromChainProps } from "../../types/types";
import { toast } from "sonner";

// Shadcn UI components
import { Button } from "@/components/shadcn/ui/button";
import { Alert, AlertTitle, AlertDescription } from "@/components/shadcn/ui/alert";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
    DialogClose,
} from "@/components/shadcn/ui/dialog";

// We'll create a simplified timeline component using Tailwind
import { cn } from "@/lib/utils";

// Custom Timeline components using Tailwind
const TimelineRoot = ({ children, className }: { children: React.ReactNode, className?: string }) => {
    return (
        <div className={cn("relative space-y-4 pl-6 before:absolute before:left-2 before:top-2 before:h-[calc(100%-16px)] before:w-0.5 before:bg-gray-200", className)}>
            {children}
        </div>
    );
};

type TimelineItemProps = {
    children: React.ReactNode;
    className?: string;
    colorPalette?: 'green' | 'red' | 'blue' | 'gray' | 'info';
};

const TimelineItem = ({ children, className, colorPalette = 'gray' }: TimelineItemProps) => {
    const colorMap = {
        green: "bg-green-100 text-green-700 border-green-200",
        red: "bg-red-100 text-red-700 border-red-200",
        blue: "bg-blue-100 text-blue-700 border-blue-200",
        gray: "bg-gray-100 text-gray-700 border-gray-200",
        info: "bg-blue-100 text-blue-700 border-blue-200",
    };

    return (
        <div className={cn("relative pl-6", className)}>
            {children}
        </div>
    );
};

const TimelineConnector = ({ children, className }: { children: React.ReactNode, className?: string }) => {
    return (
        <div className={cn("absolute -left-3 flex h-6 w-6 items-center justify-center rounded-full border bg-white", className)}>
            {children}
        </div>
    );
};

const TimelineContent = ({ children, className, colorPalette = 'gray' }: TimelineItemProps) => {
    return (
        <div className={cn("rounded-lg border p-3", className)}>
            {children}
        </div>
    );
};

const TimelineTitle = ({ children, className, textStyle }: { children: React.ReactNode, className?: string, textStyle?: string }) => {
    const textStyleClass = textStyle === "sm" ? "text-sm" : "text-base";
    return (
        <h4 className={cn("font-medium", textStyleClass, className)}>
            {children}
        </h4>
    );
};

const TimelineDescription = ({ children, className }: { children: React.ReactNode, className?: string }) => {
    return (
        <p className={cn("text-sm text-gray-600", className)}>
            {children}
        </p>
    );
};

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

    const { files, backend_url, session } = useStore(appStore)

    let navigate = useNavigate();

    const importAquaChain = async () => {
        // Early check to prevent recursion if already processing
        if (uploading) return;

        const existingChainFile = files.find(file => Object.keys(file?.aquaTree?.revisions ?? {})[0] === Object.keys(fileInfo?.aquaTree?.revisions ?? {})[0])

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
                toast.success("Aqua Chain imported successfully")

                // Use setTimeout to ensure state is updated before navigation
                setTimeout(() => {
                    navigate("/loading?reload=true");
                }, 500);
            } else {
                toast.error("Failed to import chain")
            }

            setUploading(false)
            setUploaded(true)
            return;
        } catch (error) {
            setUploading(false)
            toast.error(`Failed to import chain: ${error}`)
        }
    };

    const handleMergeRevisions = async () => {
        try {
            setUploading(true)
            // setDrawerStatus(false)
            
            const url = `${backend_url}/merge_chain`
            const reorderedRevisions = OrderRevisionInAquaTree(fileInfo.aquaTree!!)
            const revisions = reorderedRevisions.revisions
            const revisionHashes = Object.keys(revisions)
            const latestRevisionHash = revisionHashes[revisionHashes.length - 1]
            
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
                toast.success("Aqua Chain imported successfully")

                // Use setTimeout to ensure state is updated before navigation
                setTimeout(() => {
                    navigate("/loading?reload=true");
                }, 500);
            } else {
                toast.error("Failed to import chain")
            }

            setUploading(false)
            setUploaded(true)
            return;
        } catch (error) {
            setUploading(false)
            toast.error(`Failed to import chain: ${error}`)
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
        <div className="container max-w-xl mx-auto bg-gray-100">
            <Alert className="flex flex-col space-y-4">
                <div className="flex items-center space-x-2">
                    <LuImport className="h-5 w-5" />
                    <AlertTitle>Import Aqua Chain</AlertTitle>
                </div>
                <div className="flex items-center justify-between w-full">
                    <AlertDescription>
                        Do you want to import this Aqua Chain?
                    </AlertDescription>
                    <Button 
                        data-testid="import-aqua-chain-1-button" 
                        size="lg" 
                        variant="default" 
                        className="bg-blue-600 hover:bg-blue-700 text-white" 
                        onClick={importAquaChain}
                    >
                        <LuImport className="mr-2 h-4 w-4" />
                        Import
                    </Button>
                </div>
            </Alert>
           
            <Dialog open={modalOpen} onOpenChange={(open) => setModalOpen(open)}>
                <DialogContent className="rounded-lg max-w-md">
                    <DialogHeader>
                        <DialogTitle>Aqua Chain Import</DialogTitle>
                    </DialogHeader>
                    <div className="py-4">
                        <TimelineRoot>
                            <TimelineItem colorPalette={isVerificationSuccessful ? 'green' : 'red'}>
                                <TimelineConnector className={isVerificationSuccessful ? "border-green-200 text-green-600" : "border-red-200 text-red-600"}>
                                    <LuCheck className="h-4 w-4" />
                                </TimelineConnector>
                                <TimelineContent className="border-gray-200">
                                    <TimelineTitle>Verification status</TimelineTitle>
                                    <TimelineDescription>Verification successful</TimelineDescription>
                                </TimelineContent>
                            </TimelineItem>

                            {
                                comparisonResult?.identical ? (
                                    <>
                                        <TimelineItem>
                                            <TimelineConnector className="border-green-200 text-green-600">
                                                <LuCheck className="h-4 w-4" />
                                            </TimelineConnector>
                                            <TimelineContent className="border-green-200">
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
                                        <TimelineItem>
                                            <TimelineConnector className="border-green-200 text-green-600">
                                                <LuCheck className="h-4 w-4" />
                                            </TimelineConnector>
                                            <TimelineContent className="border-green-200">
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
                                        <TimelineItem>
                                            <TimelineConnector className="border-green-200 text-green-600">
                                                <LuCheck className="h-4 w-4" />
                                            </TimelineConnector>
                                            <TimelineContent className="border-green-200">
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
                                        <TimelineItem>
                                            <TimelineConnector className="border-gray-200 text-gray-600">
                                                <LuX className="h-4 w-4" />
                                            </TimelineConnector>
                                            <TimelineContent className="border-gray-200">
                                                <TimelineTitle textStyle="sm">Chains are Different</TimelineTitle>
                                                <ul className="space-y-2 mt-2">
                                                    {
                                                        comparisonResult?.divergences.map((diff, i: number) => (
                                                            <li key={`diff_${i}`} className="text-sm">
                                                                {
                                                                    diff.existingRevisionHash ? (
                                                                        <div className="flex items-center space-x-2">
                                                                            <span className="line-through text-red-500">
                                                                                {formatCryptoAddress(diff.existingRevisionHash ?? "", 15, 4)}
                                                                            </span>
                                                                            <LuChevronRight className="h-4 w-4" />
                                                                            <span>
                                                                                {formatCryptoAddress(diff.upcomingRevisionHash ?? "", 15, 4)}
                                                                            </span>
                                                                        </div>
                                                                    ) : (
                                                                        <>
                                                                            {formatCryptoAddress(diff.upcomingRevisionHash ?? "", 20, 4)}
                                                                        </>
                                                                    )
                                                                }
                                                            </li>
                                                        ))
                                                    }
                                                </ul>
                                            </TimelineContent>
                                        </TimelineItem>

                                        <TimelineItem>
                                            <TimelineConnector className="border-blue-200 text-blue-600">
                                                <LuCheck className="h-4 w-4" />
                                            </TimelineConnector>
                                            <TimelineContent className="border-blue-200">
                                                <TimelineTitle textStyle="sm">Action</TimelineTitle>
                                                <TimelineDescription>{btnText.text}</TimelineDescription>
                                                <Alert className="mt-2 bg-yellow-50 border-yellow-200">
                                                    <AlertTitle>Action Not reversible!</AlertTitle>
                                                    <AlertDescription>
                                                        {updateMessage}
                                                    </AlertDescription>
                                                </Alert>
                                                <div className="mt-3">
                                                    <Button 
                                                        data-testid="action-32-button" 
                                                        size="sm" 
                                                        className={`rounded-md ${btnText.color === 'blue' ? 'bg-blue-600 hover:bg-blue-700' : 'bg-yellow-600 hover:bg-yellow-700'} text-white`}
                                                        onClick={handleMergeRevisions}
                                                        disabled={uploading}
                                                    >
                                                        {uploading && <span className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent"></span>}
                                                        {btnText.text}
                                                    </Button>
                                                </div>
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
                                        <TimelineItem>
                                            <TimelineConnector className="border-gray-200 text-gray-600">
                                                <LuX className="h-4 w-4" />
                                            </TimelineConnector>
                                            <TimelineContent className="border-gray-200">
                                                <TimelineTitle textStyle="sm">Chains are Different</TimelineTitle>
                                                <ul className="space-y-2 mt-2">
                                                    {
                                                        comparisonResult?.divergences.map((diff, i: number) => (
                                                            <li key={`diff_${i}`} className="text-sm">
                                                                {
                                                                    diff.existingRevisionHash ? (
                                                                        <div className="flex items-center space-x-2">
                                                                            <span className="line-through text-red-500">
                                                                                {formatCryptoAddress(diff.existingRevisionHash ?? "", 15, 4)}
                                                                            </span>
                                                                            <LuChevronRight className="h-4 w-4" />
                                                                            <span>
                                                                                {formatCryptoAddress(diff.upcomingRevisionHash ?? "", 15, 4, "Revision will be deleted")}
                                                                            </span>
                                                                        </div>
                                                                    ) : (
                                                                        <>
                                                                            {formatCryptoAddress(diff.upcomingRevisionHash ?? "", 20, 4)}
                                                                        </>
                                                                    )
                                                                }
                                                            </li>
                                                        ))
                                                    }
                                                </ul>
                                            </TimelineContent>
                                        </TimelineItem>

                                        <TimelineItem>
                                            <TimelineConnector className="border-blue-200 text-blue-600">
                                                <LuCheck className="h-4 w-4" />
                                            </TimelineConnector>
                                            <TimelineContent className="border-blue-200">
                                                <TimelineTitle textStyle="sm">Action</TimelineTitle>
                                                <TimelineDescription>{btnText.text}</TimelineDescription>
                                                <Alert className="mt-2 bg-yellow-50 border-yellow-200">
                                                    <AlertTitle>Action Not reversible!</AlertTitle>
                                                    <AlertDescription>
                                                        {updateMessage}
                                                    </AlertDescription>
                                                </Alert>
                                                <div className="mt-3">
                                                    <Button 
                                                        data-testid="action-67-button" 
                                                        size="sm" 
                                                        className={`rounded-md ${btnText.color === 'blue' ? 'bg-blue-600 hover:bg-blue-700' : 'bg-yellow-600 hover:bg-yellow-700'} text-white`}
                                                        onClick={handleMergeRevisions}
                                                        disabled={uploading}
                                                    >
                                                        {uploading && <span className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent"></span>}
                                                        {btnText.text}
                                                    </Button>
                                                </div>
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
                                    <TimelineItem>
                                        <TimelineConnector className="border-blue-200 text-blue-600">
                                            <LuMinus className="h-4 w-4" />
                                        </TimelineConnector>
                                        <TimelineContent className="border-blue-200">
                                            <TimelineTitle textStyle="sm">Action</TimelineTitle>
                                            <TimelineDescription>No Action</TimelineDescription>
                                        </TimelineContent>
                                    </TimelineItem>
                                ) : null
                            }

                        </TimelineRoot>
                    </div>
                    <DialogFooter>
                        <DialogClose asChild>
                            <Button data-testid="action-cancel-button" variant="outline" className="rounded-md">Cancel</Button>
                        </DialogClose>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    )
}