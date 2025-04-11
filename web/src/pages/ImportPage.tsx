import { useEffect, useState } from 'react'
import { useStore } from 'zustand'
import appStore from '../store'
import { ApiFileInfo } from '../models/FileInfo'
import { Box, Card, Collapsible, Container, Group, VStack } from '@chakra-ui/react'
import { ChainDetailsView, RevisionDetailsSummary } from '../components/aquaTreeRevisionDetails'
import { ImportAquaChainFromChain } from '../components/dropzone_file_actions'
import { Alert } from '../components/chakra-ui/alert'
import { LuChevronUp, LuChevronDown } from 'react-icons/lu'
import Aquafier from 'aqua-js-sdk'

interface IImportPage {
    // existingFileInfo: ApiFileInfo
    incomingFileInfo: ApiFileInfo
}

const ImportPage = ({ incomingFileInfo }: IImportPage) => {
    const { metamaskAddress } = useStore(appStore)
    // const [isVerificationSuccesful, setIsVerificationSuccessful] = useState(false)
    const [verificationResults, setVerificationResults] = useState<Map<string, boolean>>(new Map())
    const [showMoreDetails, setShowMoreDetails] = useState(false)
    const fileInfo = incomingFileInfo

    const verifyAquaTreeRevisions = async (fileInfo: ApiFileInfo) => {

        // verify all revision
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

    const isVerificationComplete = (fileInfo: ApiFileInfo): boolean => verificationResults.size < Object.keys(fileInfo.aquaTree!.revisions!).length


    function isVerificationSuccessful(): boolean {
        for (const value of verificationResults.values()) {
            if (!value) { // Equivalent to value === false
                return true;
            }
        }
        return false;
    }

    useEffect(() => {
        if (fileInfo) {
            const elementToReplace = document.getElementById('replace-here');
            const customEvent = new CustomEvent('REPLACE_ADDRESSES', {
                detail: {
                    element: elementToReplace,
                },
            });
            window.dispatchEvent(customEvent);

            verifyAquaTreeRevisions(fileInfo);
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
                                        isVerificationComplete(fileInfo) ?
                                            <ImportAquaChainFromChain fileInfo={fileInfo} isVerificationSuccessful={isVerificationSuccessful()} />
                                            : <Box>
                                                <Alert status="info" content="Waiting for Aqua tree verification to complete"></Alert>
                                            </Box>
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
                                {/* <RevisionDetailsSummary isVerificationComplete={ } isVerificationSuccess={isVerificationSuccesful} fileInfo={fileInfo} /> */}
                                <RevisionDetailsSummary isVerificationComplete={isVerificationComplete(fileInfo)} isVerificationSuccess={isVerificationSuccessful()} fileInfo={fileInfo} />

                                <Card.Root borderRadius={'lg'}>
                                    <Card.Body>
                                        <VStack gap={'4'}>
                                            {
                                                isVerificationComplete(fileInfo) ?
                                                    <Alert status={isVerificationSuccessful() ? 'success' : 'error'} title={isVerificationSuccessful() ? "This chain is valid" : "This chain is invalid"} />
                                                    : <></>
                                            }
                                            <Box w={'100%'}>
                                                <Collapsible.Root open={showMoreDetails}>
                                                    <Collapsible.Trigger w="100%" py={'md'} onClick={() => setShowMoreDetails(open => !open)} cursor={'pointer'}>
                                                        <Alert w={'100%'} status={"info"} textAlign={'start'} title={`Show more Details`} icon={showMoreDetails ? <LuChevronUp /> : <LuChevronDown />} />
                                                    </Collapsible.Trigger>
                                                    <Collapsible.Content py={'4'}>
                                                        <ChainDetailsView fileInfo={fileInfo} isVerificationComplete={isVerificationComplete(fileInfo)} verificationResults={verificationResults} />
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