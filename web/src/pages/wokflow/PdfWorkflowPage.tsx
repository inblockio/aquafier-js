
import React, { useEffect, useState } from 'react';
import { FaCheck, FaQuestionCircle } from 'react-icons/fa';
import { Alert, AlertDescription } from "../../components/shadcn/ui/alert";
import appStore from '../../store';
import { useStore } from "zustand";
import { SummaryDetailsDisplayData, WorkFlowTimeLine } from '../../types/types';
import { convertTemplateNameToTitle, getAquaTreeFileName, getHighestFormIndex, isAquaTree, isWorkFlowData } from '../../utils/functions';
import { ContractDocumentView } from './ContractDocument/ContractDocument';
import { ContractSummaryView } from './ContractSummary/ContractSummary';
import { AquaTree, OrderRevisionInAquaTree, Revision } from 'aqua-js-sdk/web';
import { Button } from "../../components/shadcn/ui/button";
import { LuArrowLeft } from 'react-icons/lu';
import { useNavigate } from 'react-router-dom';
import { HiDocumentText } from 'react-icons/hi';
import { FaCircleInfo } from 'react-icons/fa6';
import { cn } from "../../lib/utils";


export default function PdfWorkflowPage() {

    const [activeStep, setActiveStep] = useState(1);
    const [timeLineTitle, setTimeLineTitle] = useState("");
    const [error, setError] = useState("");
    const [timeLineItems, setTimeLineItems] = useState<Array<WorkFlowTimeLine>>([]);
    const { selectedFileInfo, systemFileInfo, setSelectedFileInfo } = useStore(appStore);

    const navigate = useNavigate()



    const getSignatureRevionHashes = (hashesToLoopPar: Array<string>): Array<SummaryDetailsDisplayData> => {

        const signatureRevionHashes: Array<SummaryDetailsDisplayData> = []


        for (let i = 0; i < hashesToLoopPar.length; i += 3) {


            const batch = hashesToLoopPar.slice(i, i + 3);
            console.log(`Processing batch ${i / 3 + 1}:`, batch);


            let signaturePositionCount = 0
            let hashSigPosition = batch[0] ?? ""
            let hashSigRev = batch[1] ?? ""
            let hashSigMetamak = batch[2] ?? ""
            let walletAddress = "";

            if (hashSigPosition.length > 0) {
                let allAquaTrees = selectedFileInfo?.fileObject.filter((e) => isAquaTree(e.fileContent))

                let hashSigPositionHashString = selectedFileInfo!.aquaTree!.revisions[hashSigPosition].link_verification_hashes![0];

                if (allAquaTrees) {
                    for (let anAquaTree of allAquaTrees) {
                        let allHashes = Object.keys(anAquaTree)
                        if (allHashes.includes(hashSigPositionHashString)) {

                            let aquaTreeData = anAquaTree.fileContent as AquaTree
                            let revData = aquaTreeData.revisions[hashSigPositionHashString]
                            signaturePositionCount = getHighestFormIndex(revData)

                            break
                        }
                    }


                }

            }

            let metaMaskRevision = selectedFileInfo!.aquaTree!.revisions[hashSigMetamak];
            if (metaMaskRevision) {
                walletAddress = metaMaskRevision.signature_wallet_address ?? ""
            }
            let data: SummaryDetailsDisplayData = {
                revisionHashWithSignaturePositionCount: signaturePositionCount,
                revisionHashWithSignaturePosition: hashSigPosition,
                revisionHashWithSinatureRevision: hashSigRev,
                revisionHashMetamask: hashSigMetamak,
                walletAddress: walletAddress
            }

            signatureRevionHashes.push(data)

        }


        return signatureRevionHashes
    }

    function computeIsWorkflowCOmplete(): boolean {

        if (selectedFileInfo) {


            const orderedTree = OrderRevisionInAquaTree(selectedFileInfo!.aquaTree!)


            const revisions = orderedTree.revisions
            const revisionHashes = Object.keys(revisions)

            const firstHash: string = revisionHashes[0];
            const firstRevision: Revision = selectedFileInfo!.aquaTree!.revisions[firstHash]


            let signers: string[] = firstRevision?.forms_signers.split(",")

            let signatureRevionHashesData: Array<SummaryDetailsDisplayData> = [];
            let fourthItmeHashOnwards: string[] = [];
            let signatureRevionHashes: Array<SummaryDetailsDisplayData> = []

            if (revisionHashes.length > 4) {
                // remove the first 4 elements from the revision list 
                fourthItmeHashOnwards = revisionHashes.slice(4);
                // console.log(`revisionHashes  ${revisionHashes} --  ${typeof revisionHashes}`)
                // console.log(`fourthItmeHashOnwards  ${fourthItmeHashOnwards}`)
                signatureRevionHashes = getSignatureRevionHashes(fourthItmeHashOnwards)
                // console.log(`signatureRevionHashes  ${JSON.stringify(signatureRevionHashes, null, 4)}`)

                signatureRevionHashesData = signatureRevionHashes
            }


            let signatureRevionHashesDataAddress = signatureRevionHashesData.map((e) => e.walletAddress)
            let remainSigners = signers.filter((item) => !signatureRevionHashesDataAddress.includes(item))


            if (remainSigners.length > 0) {
                return false
            } else {

                return true
            }
        } else {
            return false
        }
    }

    function loadTimeline() {
        let items: Array<WorkFlowTimeLine> = []

        items.push({
            id: 1,
            completed: true,
            content: <ContractSummaryView setActiveStep={(index: number) => {
                setActiveStep(index)
            }} />,
            icon: FaCircleInfo,
            revisionHash: "",
            title: "Contract Information"
        })

        items.push({
            id: 2,
            completed: computeIsWorkflowCOmplete(),
            content: <ContractDocumentView setActiveStep={(index: number) => {
                setActiveStep(index)
            }} />,
            icon: HiDocumentText,
            revisionHash: "",
            title: "Contract Document"
        })

        setTimeLineItems(items)

    }


    const loadData = () => {
        if (selectedFileInfo) {

            const someData = systemFileInfo.map((e) => {
                try {
                    return getAquaTreeFileName(e.aquaTree!!);
                } catch (e) {
                    console.log("Error processing system file");
                    return "";
                }
            });

            // const templateNames = formTemplates.map((e) => e.name)
            let { isWorkFlow, workFlow } = isWorkFlowData(selectedFileInfo.aquaTree!, someData)

            if (!isWorkFlow) {
                setError("The selected Aqua - Tree is not workflow")
                return
            }

            setTimeLineTitle(convertTemplateNameToTitle(workFlow));

            computeIsWorkflowCOmplete();

            loadTimeline();

        }
    }

    useEffect(() => {
        loadData()
    }, [])

    useEffect(() => {
        loadData()
    }, [JSON.stringify(selectedFileInfo), selectedFileInfo])

    // Find the currently active content
    const activeContent = () => timeLineItems.find(item => item.id === activeStep)?.content;


    const aquaTreeTimeLine = () => {
        return (
            <div className="container mx-auto py-4 px-1 md:px-4">
                <div className="flex flex-col gap-10">
                    <div className="container">
                        <div className="flex items-center justify-between">
                            <div></div>
                            <h1 className="text-center text-2xl font-bold">{timeLineTitle}</h1>
                            <Button variant="outline" onClick={() => {
                                setSelectedFileInfo(null)
                                navigate("/", {replace: true})
                            }} className='cursor-pointer'>
                                <LuArrowLeft className="mr-2 h-4 w-4" /> Go Home
                            </Button>
                        </div>
                    </div>

                    {/* Horizontal Timeline */}
                    <div className="container w-full overflow-x-auto">
                        <div className="flex min-w-max">
                            {timeLineItems.map((item, index) => (
                                <React.Fragment key={item.id}>
                                    {/* Timeline Item */}
                                    <div
                                        className="flex flex-col items-center mx-4 cursor-pointer"
                                        onClick={() => setActiveStep(item.id)}
                                    >
                                        <div
                                            className={cn(
                                                "flex h-10 w-10 items-center justify-center rounded-full",
                                                activeStep === item.id
                                                    ? "bg-blue-500 text-white"
                                                    : item.completed
                                                        ? "bg-green-100 text-green-500"
                                                        : "bg-gray-100 text-gray-400"
                                            )}
                                        >
                                            <item.icon className="h-4 w-4" />
                                        </div>

                                        {/* Status indicator */}
                                        <div
                                            className={cn(
                                                "flex h-5 w-5 items-center justify-center rounded-full mt-2",
                                                item.completed
                                                    ? "bg-green-500 text-white"
                                                    : "bg-gray-200 text-gray-500"
                                            )}
                                        >
                                            {item.completed ? (
                                                <FaCheck className="h-3 w-3" />
                                            ) : (
                                                <FaQuestionCircle className="h-3 w-3" />
                                            )}
                                        </div>

                                        <span
                                            className={cn(
                                                "mt-2 text-sm",
                                                activeStep === item.id
                                                    ? "text-blue-500 font-medium"
                                                    : "text-gray-600 font-normal"
                                            )}
                                        >
                                            {item.title}
                                        </span>
                                    </div>

                                    {/* Connector line between timeline items */}
                                    {index < timeLineItems.length - 1 && (
                                        <div className="flex items-center flex-1">
                                            <div
                                                className={cn(
                                                    "h-0.5 w-full",
                                                    index < activeStep - 1 || (index === activeStep - 1 && timeLineItems[activeStep - 1].completed)
                                                        ? "bg-green-500"
                                                        : "bg-gray-200"
                                                )}
                                            />
                                        </div>
                                    )}
                                </React.Fragment>
                            ))}
                        </div>
                    </div>

                    {/* Content Area */}
                    <div className="p-0 md:p-4">
                        {activeContent()}
                    </div>
                </div>
            </div>
        )
    }

    const workFlowPageData = () => {

        if (error.length > 0) {
            return (
                <Alert variant="destructive">
                    <AlertDescription>{error}</AlertDescription>
                </Alert>
            );
        }
        if (selectedFileInfo == null) {
            return (
                <Alert variant="destructive">
                    <AlertDescription>Selected file not found</AlertDescription>
                </Alert>
            );
        }

        return aquaTreeTimeLine();
    }


    return (
        <div className="w-full">
            {workFlowPageData()}
        </div>
    );
}

