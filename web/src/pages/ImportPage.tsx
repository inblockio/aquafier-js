import { useEffect, useState } from 'react'
import { useStore } from 'zustand'
import appStore from '../store'
import { ApiFileInfo } from '../models/FileInfo'
import { Box, Card, Collapsible, Container, Group, VStack } from '@chakra-ui/react'
import ChainDetails, { RevisionDetailsSummary } from '../components/ui/navigation/CustomDrawer'
import { ImportAquaChainFromChain } from '../components/dropzone_file_actions'
import { Alert } from '../components/ui/alert'
import { LuChevronUp, LuChevronDown } from 'react-icons/lu'

interface IImportPage {
    // existingFileInfo: ApiFileInfo
    incomingFileInfo: ApiFileInfo
}

const ImportPage = ({ incomingFileInfo }: IImportPage) => {
    const { metamaskAddress, session } = useStore(appStore)
    const [isVerificationSuccesful, setIsVerificationSuccessful] = useState(false)
    const [showMoreDetails, setShowMoreDetails] = useState(false)
    const fileInfo = incomingFileInfo


    useEffect(() => {
        if (fileInfo) {
            const elementToReplace = document.getElementById('replace-here');
            const customEvent = new CustomEvent('REPLACE_ADDRESSES', {
                detail: {
                    element: elementToReplace,
                },
            });
            window.dispatchEvent(customEvent);
        }
    }, [fileInfo])

    return (
        <div id='replace-here'>
            {
                fileInfo ? (
                    <Container mt={'40px'}>
                        <VStack gap={'10'}>
                            <Group justifyContent={'center'} w={'100%'}>
                                {
                                    !metamaskAddress ? (
                                        // <ConnectWallet />
                                        <Box />
                                    ) : (
                                        <ImportAquaChainFromChain fileInfo={fileInfo} isVerificationSuccessful={isVerificationSuccesful} />
                                    )
                                }
                            </Group>
                            {/* <Box w={'100%'}>
                                <Card.Root border={'none'} shadow={'md'} borderRadius={'xl'}>
                                    <Card.Body>
                                        <FilePreview fileInfo={fileInfo} />
                                    </Card.Body>
                                </Card.Root>
                            </Box> */}
                            <Box w={'100%'}>
                                <RevisionDetailsSummary isVerificationSuccess={isVerificationSuccesful} fileInfo={fileInfo} />
                                {/* <ChainDetails fileInfo={fileInfo} callBack={(res) => setIsVerificationSuccessful(res)} /> */}
                                <Card.Root borderRadius={'lg'}>
                                    <Card.Body>
                                        <VStack gap={'4'}>
                                            <Alert status={isVerificationSuccesful ? 'success' : 'error'} title={isVerificationSuccesful ? "This chain is valid" : "This chain is invalid"} />
                                            <Box w={'100%'}>
                                                <Collapsible.Root open={showMoreDetails}>
                                                    <Collapsible.Trigger w="100%" py={'md'} onClick={() => setShowMoreDetails(open => !open)} cursor={'pointer'}>
                                                        <Alert w={'100%'} status={"info"} textAlign={'start'} title={`Show more Details`} icon={showMoreDetails ? <LuChevronUp /> : <LuChevronDown />} />
                                                    </Collapsible.Trigger>
                                                    <Collapsible.Content py={'4'}>
                                                        <ChainDetails session={session!} fileInfo={fileInfo} callBack={(res) => {
                                                            console.log(`============ Verification is success=========  ${res}`)
                                                            console.log(`FIX ME......................`)
                                                            setIsVerificationSuccessful(res[0])
                                                        }} />
                                                    </Collapsible.Content>
                                                </Collapsible.Root>
                                            </Box>
                                            <Box minH={'400px'} />
                                        </VStack>
                                    </Card.Body>
                                </Card.Root>
                            </Box>
                        </VStack>
                    </Container>
                ) : null
            }
        </div>
    )
}

export default ImportPage