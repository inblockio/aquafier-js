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
import { FaCheck, FaQuestionCircle } from 'react-icons/fa';
import { Alert } from "../../components/chakra-ui/alert"
import appStore from '../../store';
import { useStore } from "zustand"
import { WorkFlowTimeLine } from '../../types';

// Timeline data
// const timelineItems = [
//   { 
//     id: 1, 
//     title: 'Personal Info', 
//     icon: FaUser, 
//     completed: true,
//     content: (
//       <Card.Root>
//         <Card.Body>
//           <Heading size="md" mb={4}>Personal Information</Heading>
//           <Text>This section contains all your personal details and profile information.</Text>
//           <Text mt={4}>Make sure to keep your contact information up to date for important notifications.</Text>
//         </Card.Body>
//       </Card.Root>
//     )
//   },
//   { 
//     id: 2, 
//     title: 'Education', 
//     icon: FaBook, 
//     completed: true,
//     content: (
//       <Card.Root>
//         <Card.Body>
//           <Heading size="md" mb={4}>Education History</Heading>
//           <Text>Your education background and academic achievements.</Text>
//           <Text mt={4}>You can add degrees, certifications, and relevant coursework.</Text>
//         </Card.Body>
//       </Card.Root>
//     )
//   },
//   { 
//     id: 3, 
//     title: 'Experience', 
//     icon: FaBriefcase, 
//     completed: true,
//     content: (
//       <Card.Root>
//         <Card.Body>
//           <Heading size="md" mb={4}>Work Experience</Heading>
//           <Text>Your professional history and career milestones.</Text>
//           <Text mt={4}>Include relevant job positions, responsibilities, and accomplishments.</Text>
//         </Card.Body>
//       </Card.Root>
//     )
//   },
//   { 
//     id: 4, 
//     title: 'Skills', 
//     icon: FaCoffee, 
//     completed: false,
//     content: (
//       <Card.Root>
//         <Card.Body>
//           <Heading size="md" mb={4}>Skills & Expertise</Heading>
//           <Text>Highlight your technical and soft skills.</Text>
//           <Text mt={4}>This section needs to be completed. Add your core competencies and expertise areas.</Text>
//         </Card.Body>
//       </Card.Root>
//     )
//   },
//   { 
//     id: 5, 
//     title: 'Achievements', 
//     icon: FaAward, 
//     completed: false,
//     content: (
//       <Card.Root>
//         <Card.Body>
//           <Heading size="md" mb={4}>Achievements & Awards</Heading>
//           <Text>Your notable accomplishments and recognitions.</Text>
//           <Text mt={4}>This section needs to be completed. Add your awards, certificates, and significant achievements.</Text>
//         </Card.Body>
//       </Card.Root>
//     )
//   }
// ];

export default function WorkFlowPage() {
    const [activeStep, setActiveStep] = useState(1);
    const [timeLineTitle, setTimeLineTitle] = useState("");

    const { selectedFileInfo } = useStore(appStore)
    let timelineItems: Array<WorkFlowTimeLine> = [];
 

    useEffect(() => {
        setTimeLineTitle("todo")
//todo 
        //   first

        //   return () => {
        //     second
        //   }
    }, [])


    // Find the currently active content
    const activeContent = timelineItems.find(item => item.id === activeStep)?.content;


    const aquaTreeTimeLine = () => {
        return <Container py={8} px={4} maxW="4xl" mx="auto">
            <Heading textAlign="center" mb={10}>{timeLineTitle}</Heading>

            {/* Horizontal Timeline */}
            <Box w="full" mb={12} overflowX="auto">
                <Flex minW="max-content" px={4}>
                    {timelineItems.map((item, index) => (
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
                            {index < timelineItems.length - 1 && (
                                <Flex alignItems="center" flex="1">
                                    <hr
                                        style={{
                                            width: '100%',
                                            height: '2px',
                                            border: 'none',
                                            backgroundColor: index < activeStep - 1 || (index === activeStep - 1 && timelineItems[activeStep - 1].completed)
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
                {activeContent}
            </Box>
        </Container>
    }

    const workFlowPageData = () => {
        if (selectedFileInfo == null) {
            return <Alert status="error" title="" variant="solid"   >
                Selected file not found
            </Alert>
        }

        if (timelineItems.length == 0) {
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