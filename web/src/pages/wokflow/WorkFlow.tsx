
import React, { useEffect, useState } from 'react';
import {
    Box,
    Flex,
    Text,
    Circle,
    Icon,
    VStack,
    // HStack,
    Container,
    Heading
} from '@chakra-ui/react';
// import { Card } from '@chakra-ui/react';
// import { FaCheck, FaQuestionCircle, FaBriefcase, FaBook, FaCoffee, FaAward, FaUser } from 'react-icons/fa';
import { FaCheck, FaQuestionCircle, FaUser } from 'react-icons/fa';
import { Alert } from "../../components/chakra-ui/alert"
import appStore from '../../store';
import { useStore } from "zustand"
import { WorkFlowTimeLine } from '../../types/types';
import { convertTemplateNameToTitle, isWorkFlowData } from '../../utils/functions';
import { ContractDocumentView } from './components/ContractDocument';
import { ContractInformationView } from './components/ContractInformation';


export default function WorkFlowPage() {

    const [activeStep, setActiveStep] = useState(1);
    const [timeLineTitle, setTimeLineTitle] = useState("");

    const [error, setError] = useState("");
    const [timeLineItems, setTimeLineItems] = useState<Array<WorkFlowTimeLine>>([]);
    const [isWorkflowCompleteAndValid, setIsWorkflowCompleteAndValid] = useState(false);
    const { selectedFileInfo, formTemplates } = useStore(appStore);


    function loadTimeline() {
        let items: Array<WorkFlowTimeLine> = []

        items.push({
            id: 1,
            completed: true,
            content: <ContractInformationView setActiveStep={(index) => {
                setActiveStep(index)
            }} updateDocumentIconInWorkflowTabs={(isWorkFlowOk) => {
                console.log("=====################# updateDocumentIconInWorkflowTabs", isWorkFlowOk)
                setIsWorkflowCompleteAndValid(isWorkFlowOk)
            }} />,
            icon: FaUser,
            revisionHash: "",
            title: "Contract Information"
        })

        items.push({
            id: 2,
            completed: isWorkflowCompleteAndValid,
            content: <ContractDocumentView setActiveStep={(index) => {
                setActiveStep(index)
            }} updateDocumentIconInWorkflowTabs={(isWorkFlowOk) => {
          console.log("################# updateDocumentIconInWorkflowTabs", isWorkFlowOk)
                setIsWorkflowCompleteAndValid(isWorkFlowOk)
            }} />,
            icon: FaUser,
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
        return <Container py={8} px={4} mx="auto">
            <Heading textAlign="center" mb={10}>{timeLineTitle}</Heading>

            {/* Horizontal Timeline */}
            <Box w="full" mb={12} overflowX="auto">
                <Flex minW="max-content" px={4}>
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
            </Box>

            {/* Content Area */}
            <Box mt={8} p={4}>
                {activeContent()}
            </Box>
        </Container>
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

