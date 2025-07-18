
import React, { useEffect, useState } from 'react';
import {
    Box,
    Flex,
    Text,
    Circle,
    Icon,
    VStack,
    Container,
    Heading,
    HStack,
    Stack} from '@chakra-ui/react';
import { FaCheck, FaQuestionCircle } from 'react-icons/fa';
import { Alert } from "../../components/chakra-ui/alert"
import appStore from '../../store';
import { useStore } from "zustand"
import { SummaryDetailsDisplayData, WorkFlowTimeLine } from '../../types/types';
import { convertTemplateNameToTitle, getHighestFormIndex, isAquaTree, isWorkFlowData } from '../../utils/functions';
import { ContractDocumentView } from './ContractDocument/ContractDocument';
import { ContractSummaryView } from './ContractSummary/ContractSummary';
import { AquaTree, OrderRevisionInAquaTree, Revision } from 'aqua-js-sdk/web';
import { Button } from '../../components/chakra-ui/button';
import { LuArrowLeft } from 'react-icons/lu';
import { useNavigate } from 'react-router-dom';
import { HiDocumentText } from 'react-icons/hi';
import { FaCircleInfo } from 'react-icons/fa6';


export default function WorkFlowPage() {

    const [activeStep, setActiveStep] = useState(1);
    const [timeLineTitle, setTimeLineTitle] = useState("");
    const [error, setError] = useState("");
    const [timeLineItems, setTimeLineItems] = useState<Array<WorkFlowTimeLine>>([]);
    const { selectedFileInfo, formTemplates } = useStore(appStore);

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
            content: <ContractSummaryView setActiveStep={(index) => {
                setActiveStep(index)
            }} />,
            icon: FaCircleInfo,
            revisionHash: "",
            title: "Contract Information"
        })

        items.push({
            id: 2,
            completed: computeIsWorkflowCOmplete(),
            content: <ContractDocumentView setActiveStep={(index) => {
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

            const templateNames = formTemplates.map((e) => e.name)
            let { isWorkFlow, workFlow } = isWorkFlowData(selectedFileInfo.aquaTree!, templateNames)

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
            <>
                <Container fluid py={4} px={{ base: 1, md: 4 }} mx="auto">
                    <Stack gap={"10"}> 
                        <Container>
                            <HStack alignItems="center" justifyContent="space-between">
                                <Box />
                                <Heading textAlign="center">{timeLineTitle}</Heading>
                                <Button borderRadius={"lg"} onClick={() => navigate("/")}> <LuArrowLeft /> Go Home</Button>
                            </HStack>
                        </Container>

                        {/* Horizontal Timeline */}
                        <Container w="full" overflowX="auto">
                            <Flex minW="max-content">
                                {timeLineItems.map((item, index) => (
                                    <React.Fragment key={item.id}>
                                        {/* Timeline Item */}
                                        <VStack
                                            cursor="pointer"
                                            mx={4}
                                            onClick={() => setActiveStep(item.id)}
                                        >
                                            <Circle
                                                size="40px"
                                                bg={
                                                    activeStep === item.id
                                                        ? 'blue.500'
                                                        : item.completed
                                                            ? 'green.100'
                                                            : 'gray.100'
                                                }
                                                color={
                                                    activeStep === item.id
                                                        ? 'white'
                                                        : item.completed
                                                            ? 'green.500'
                                                            : 'gray.400'
                                                }
                                            >
                                                <Icon as={item.icon} boxSize={4} />
                                            </Circle>

                                            {/* Status indicator */}
                                            <Circle
                                                size="20px"
                                                bg={item.completed ? 'green.500' : 'gray.200'}
                                                color={item.completed ? 'white' : 'gray.500'}
                                                mt={2}
                                            >
                                                <Icon as={item.completed ? FaCheck : FaQuestionCircle} boxSize={3} />
                                            </Circle>

                                            <Text
                                                color={activeStep === item.id ? 'blue.500' : 'gray.600'}
                                                fontWeight={activeStep === item.id ? 'medium' : 'normal'}
                                                fontSize="sm"
                                                mt={2}
                                            >
                                                {item.title}
                                            </Text>
                                        </VStack>

                                        {/* Connector line between timeline items */}
                                        {index < timeLineItems.length - 1 && (
                                            <Flex alignItems="center" flex="1">
                                                <hr
                                                    style={{
                                                        width: '100%',
                                                        height: '2px',
                                                        border: 'none',
                                                        backgroundColor: index < activeStep - 1 || (index === activeStep - 1 && timeLineItems[activeStep - 1].completed)
                                                            ? '#48BB78' // green.500 equivalent
                                                            : '#E2E8F0' // gray.200 equivalent
                                                    }}
                                                />
                                            </Flex>
                                        )}
                                    </React.Fragment>
                                ))}
                            </Flex>
                        </Container>

                        {/* Content Area */}
                        <Box p={{ base: 0, md: 4 }}>
                            {activeContent()}
                        </Box>
                    </Stack>
                </Container>
            </>
        )
    }

    const workFlowPageData = () => {

        if (error.length > 0) {
            return <Alert status="error" title="" variant="solid"   >
                {error}
            </Alert>
        }
        if (selectedFileInfo == null) {
            return <Alert status="error" title="" variant="solid"   >
                Selected file not found
            </Alert>
        }


        return aquaTreeTimeLine()
    }


    return (
        <>
            {workFlowPageData()}
        </>
    );
}

