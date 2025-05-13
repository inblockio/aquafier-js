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
    Heading,
} from '@chakra-ui/react';
// import { Card } from '@chakra-ui/react';
// import { FaCheck, FaQuestionCircle, FaBriefcase, FaBook, FaCoffee, FaAward, FaUser } from 'react-icons/fa';
import { FaCheck, FaQuestionCircle, FaUser } from 'react-icons/fa';
import { Alert } from "../../components/chakra-ui/alert"
import appStore from '../../store';
import { useStore } from "zustand"
import { WorkFlowTimeLine } from '../../types/types';
import { RevisionVerificationStatus } from '../../types/types';
import Aquafier from 'aqua-js-sdk';
import { isWorkFlowData } from '../../utils/functions';

// Timeline data
// const timelineItems = [
//     {
//         id: 1,
//         title: 'Personal Info',
//         icon: FaUser,
//         completed: true,
//         revisionHash: '',
//         content: (
//             <Card.Root>
//                 <Card.Body>
//                     <Heading size="md" mb={4}>Personal Information</Heading>
//                     <Text>This section contains all your personal details and profile information.</Text>
//                     <Text mt={4}>Make sure to keep your contact information up to date for important notifications.</Text>
//                 </Card.Body>
//             </Card.Root>
//         )
//     },
//     {
//         id: 2,
//         title: 'Education',
//         icon: FaBook,
//         completed: true,

//         revisionHash: '',
//         content: (
//             <Card.Root>
//                 <Card.Body>
//                     <Heading size="md" mb={4}>Education History</Heading>
//                     <Text>Your education background and academic achievements.</Text>
//                     <Text mt={4}>You can add degrees, certifications, and relevant coursework.</Text>
//                 </Card.Body>
//             </Card.Root>
//         )
//     },
//     {
//         id: 3,
//         title: 'Experience',
//         icon: FaBriefcase,
//         completed: true,

//         revisionHash: '',
//         content: (
//             <Card.Root>
//                 <Card.Body>
//                     <Heading size="md" mb={4}>Work Experience</Heading>
//                     <Text>Your professional history and career milestones.</Text>
//                     <Text mt={4}>Include relevant job positions, responsibilities, and accomplishments.</Text>
//                 </Card.Body>
//             </Card.Root>
//         )
//     },
//     {
//         id: 4,
//         title: 'Skills',
//         icon: FaCoffee,
//         completed: false,

//         revisionHash: '',
//         content: (
//             <Card.Root>
//                 <Card.Body>
//                     <Heading size="md" mb={4}>Skills & Expertise</Heading>
//                     <Text>Highlight your technical and soft skills.</Text>
//                     <Text mt={4}>This section needs to be completed. Add your core competencies and expertise areas.</Text>
//                 </Card.Body>
//             </Card.Root>
//         )
//     },
//     {
//         id: 5,
//         title: 'Achievements',
//         icon: FaAward,
//         completed: false,

//         revisionHash: '',
//         content: (
//             <Card.Root>
//                 <Card.Body>
//                     <Heading size="md" mb={4}>Achievements & Awards</Heading>
//                     <Text>Your notable accomplishments and recognitions.</Text>
//                     <Text mt={4}>This section needs to be completed. Add your awards, certificates, and significant achievements.</Text>
//                 </Card.Body>
//             </Card.Root>
//         )
//     }
// ];

export default function WorkFlowPage() {
    const [activeStep, setActiveStep] = useState(1);
    const [timeLineTitle, setTimeLineTitle] = useState("");
    const [error, setError] = useState("");
    const [aquaTreeVerificationWithStatuses, setAquaTreeVerificationWithStatuses] = useState<Array<RevisionVerificationStatus>>([]);
    const [timeLineItems, _setTimeLineItems] = useState<Array<WorkFlowTimeLine>>([]);
    const { selectedFileInfo, formTemplates } = useStore(appStore);


    useEffect(() => {

        let items: Array<WorkFlowTimeLine> = []
        // Get the first two elements
        // const firstTwo = aquaTreeVerificationWithStatuses.slice(0, 2);
        // console.log("First two elements:", firstTwo); // [1, 2]

        items.push({
            id: 1,
            completed: true,
            content: genesisContent(),
            icon: FaUser,
            revisionHash: "",
            title: "Contract Creation"
        })


        // Get the rest of the elements (from index 2 onward)
        // const rest = aquaTreeVerificationWithStatuses.slice(2);


        // for (const [index, item] of aquaTreeVerificationWithStatuses.entries()) {
        //     console.log(`Index: ${index}, Item:`, item);


        // Now you have both the numeric index and the actual item
        // setTimeLineItems((items) => {

        //     let existingData = items.find((e) => e.revisionHash == item.revisionHash)

        //      let titleData = getTitleToDisplay(index, item.revisionHash)
        //         let iconData = getIconToDisplay(index, item.revisionHash)
        //         let contentData = getContentToDisplay(index, item.revisionHash)
        //     if (existingData) {
        //         items.filter((e)=>e.revisionHash != item.revisionHash)
        // items.push({
        //     id: index,
        //     completed: true,
        //     content: contentData,
        //     icon : iconData,
        //     revisionHash : item.revisionHash,
        //     title: titleData
        // })
        //     } else {

        //         items.push({
        //             id: index,
        //             completed: true,
        //             content: contentData,
        //             icon : iconData,
        //             revisionHash : item.revisionHash,
        //             title: titleData
        //         })
        //     }

        //     return items
        // })


        // }



    }, [aquaTreeVerificationWithStatuses])



    useEffect(() => {
        if (selectedFileInfo) {


            const templateNames = formTemplates.map((e) => e.name)
            let { isWorkFlow, workFlow } = isWorkFlowData(selectedFileInfo.aquaTree!, templateNames)

            if (!isWorkFlow) {

                setError("The selected Aqua - Tree is not workflow")
                return

            }
            setTimeLineTitle(workFlow.replace("_", " "))

            for (const [hash, revision] of Object.entries(selectedFileInfo!.aquaTree!.revisions!!)) {
                console.log(`Hash ${hash} Revision ${JSON.stringify(revision)}`)

                setAquaTreeVerificationWithStatuses((oldState) => {
                    oldState.push({
                        isVerified: false,
                        revision: revision,
                        revisionHash: hash,
                        verficationStatus: null,
                        logData: []
                    })
                    return oldState
                })
            }


            let aquafier = new Aquafier();

            // loop verifying each revision
            for (const [hash, revision] of Object.entries(selectedFileInfo!.aquaTree!.revisions!!)) {
                //self invoking function that is async
                (async () => {

                    let verificationData = await aquafier.verifyAquaTreeRevision(selectedFileInfo!.aquaTree!, revision, hash, selectedFileInfo.fileObject);
                    // Update the item with matching hash in a functional manner
                    setAquaTreeVerificationWithStatuses(prevStatuses => {
                        return prevStatuses.map(status => {
                            if (status.revisionHash === hash) {
                                return {
                                    ...status,
                                    verficationStatus: verificationData.isOk() ? true : false, // assuming verificationData is boolean
                                    isVerified: true,
                                    logData: verificationData.isErr() ? verificationData.data : []
                                };
                            }
                            return status;
                        });
                    });
                })()
            }






        }



    }, [])

    // TODO: Implement this
    // const getTitleToDisplay = (index: number, hash: string) => {

    //     if (index == 0) {

    //     }
    //     return ""
    // }
    // const getIconToDisplay = (index: number, hash: string) => {

    //     return FaBook
    // }
    // const getContentToDisplay = (index: number, hash: string) => {

    //     if (index == 0) {
    //         return <>
    //             <h2>Form Template</h2>
    //         </>
    //     }


    //     return <>..</>

    // }

    const genesisContent = () => {
        return <>
            <h6>Contract creation</h6>
        </>
    }

    // Find the currently active content
    const activeContent = () => timeLineItems.find(item => item.id === activeStep)?.content;


    const aquaTreeTimeLine = () => {
        return <Container py={8} px={4} maxW="4xl" mx="auto">
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

        if (timeLineItems.length == 0) {
            return <Alert status="info" title="" variant="solid"   >
                Aqua Tree time line data not found
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