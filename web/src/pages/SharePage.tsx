import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { useStore } from 'zustand'
import appStore from '../store'
import axios from 'axios'
import { ApiFileInfo } from '../models/FileInfo'
import { toaster } from '../components/chakra-ui/toaster'
import Loading from 'react-loading'
import { Box, Card, Center, Collapsible, Container, GridItem, Group, SimpleGrid, VStack } from '@chakra-ui/react'
import { ChainDetailsView, RevisionDetailsSummary } from '../components/aquaTreeRevisionDetails'
import FilePreview from '../components/FilePreview'
import { ImportAquaChainFromChain } from '../components/dropzone_file_actions'
import { Alert } from '../components/chakra-ui/alert'
import { LuChevronUp, LuChevronDown } from 'react-icons/lu'
import Aquafier from "aqua-js-sdk"

const SharePage = () => {
    const { backend_url, metamaskAddress, session } = useStore(appStore)
    const [fileInfo, setFileInfo] = useState<ApiFileInfo | null>(null)
    // const [fetchFromUrl, setFetchFromUrl] = useState(false)
    const [loading, setLoading] = useState(false)
    const [hasError, setHasError] = useState<string | null>(null);
    // const [isVerificationSuccesful, setIsVerificationSuccessful] = useState<boolean | null >(null)
    const [verificationResults, setVerificationResults] = useState<Map<string, boolean>>(new Map())

    const [showMoreDetails, setShowMoreDetails] = useState(false)

    const params = useParams()

    const loadPageData = async () => {
        if (!session?.nonce || !params?.identifier) {
            return
        }
        if (!backend_url.includes('0.0.0.0')) {
            try {

                setLoading(true)
                const url = `${backend_url}/share_data/${params.identifier}`;
                //  console.log("url is ", url)
                const response = await axios.get(url, {
                    headers: {
                        'Content-Type': 'application/x-www-form-urlencoded',
                        'nonce': session?.nonce ?? ""
                    }
                });
                //  console.log(response)

                if (response.status === 200) {
                    setFileInfo(response.data[0])
                }
                setLoading(false)
            }
            catch (error: any) {
                if (error.response.status == 404) {
                    setHasError(`File could not be found (probably it was deleted)`);

                } else if (error.response.status == 412) {
                    setHasError(`File not found or no permission for access granted.`);
                } else {
                    setHasError(`Error : ${error}`);
                }
                console.error(error);



                toaster.create({
                    description: `Error fetching data`,
                    type: 'error'
                });
            }
        }
    }

    useEffect(() => {
        // if (fetchFromUrl == false) {
        //    //  console.log("Trigered ...")
        if (params.identifier) {
            loadPageData()
        }
        //     setFetchFromUrl(true);
        // }else{
        //    //  console.log("No.........Trigered ...") 
        // }
    }, [params, session])

    const isVerificationComplete = (fileInfo: ApiFileInfo): boolean => verificationResults.size < Object.keys(fileInfo.aquaTree!.revisions!).length


    function isVerificationSuccessful(): boolean {
        for (const value of verificationResults.values()) {
            if (!value) { // Equivalent to value === false
                return true;
            }
        }
        return false;
    }

    const showProperWidget = () => {
        if (hasError) {
            return <Center>
                <Alert status="error" title="An error occured">
                    {hasError}
                </Alert>
            </Center>
        }
        if (loading) {
            return <Center>
                <Loading type='spin' width={'80px'} />
            </Center>
        }
        return <div />
    }

    const verifyAquaTreeRevisions = async (fileInfo: ApiFileInfo) => {

        // verify all revision
        let aquafier = new Aquafier();
        let revisionHashes = Object.keys(fileInfo.aquaTree!.revisions!);
        for (let revisionHash of revisionHashes) {
            let revision = fileInfo.aquaTree!.revisions![revisionHash];
            let verificationResult = await aquafier.verifyAquaTreeRevision(fileInfo.aquaTree!, revision, revisionHash, [...fileInfo.fileObject, ...fileInfo.linkedFileObjects])

            let data = verificationResults;
            if (verificationResult.isOk()) {
                data.set(revisionHash, true)
            } else {
                data.set(revisionHash, false)
            }
            setVerificationResults(data)
        }
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

            verifyAquaTreeRevisions(fileInfo)
        }
    }, [fileInfo])

    return (
        <div id='replace-here'>
            <Container fluid py={"4"}>
                {
                    !session ? (
                        <Center>
                            <Alert title="Login Required">
                                You need to be logged in to view this file!
                            </Alert>
                        </Center>
                    ) : null
                }
                {
                    showProperWidget()
                }
                {
                    fileInfo ? (
                        <Container mt={'40px'} fluid>
                            <VStack gap={'10'}>
                                <Group justifyContent={'center'} w={'100%'}>
                                    {
                                        !metamaskAddress ? (

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

                                <Box>
                                    <SimpleGrid columns={{ base: 1, md: 5 }}>
                                        <GridItem colSpan={{ base: 1, md: 3 }}>
                                            <Card.Root border={'none'} shadow={'none'} borderRadius={'xl'}>
                                                <Card.Body>
                                                    <FilePreview fileInfo={fileInfo.fileObject[0]} />
                                                </Card.Body>
                                            </Card.Root>
                                        </GridItem>
                                        <GridItem colSpan={{ base: 1, md: 2 }}>
                                            <Card.Root borderRadius={'lg'} shadow={"none"}>
                                                <Card.Body>
                                                    <VStack gap={'4'}>
                                                        {/* <Alert status={displayColorBasedOnVerificationAlert()} title={displayBasedOnVerificationStatusText()} /> */}

                                                         <RevisionDetailsSummary isVerificationComplete={isVerificationComplete(fileInfo)} isVerificationSuccess={isVerificationSuccessful()} fileInfo={fileInfo} />
                                                                                                           
                                                        <Box w={'100%'}>
                                                            <Collapsible.Root open={showMoreDetails}>
                                                                <Collapsible.Trigger w="100%" py={'md'} onClick={() => setShowMoreDetails(open => !open)} cursor={'pointer'}>
                                                                    <Alert w={'100%'} status={"info"} textAlign={'start'} title={showMoreDetails ? `Show less Details` : `Show more Details`} icon={showMoreDetails ? <LuChevronUp /> : <LuChevronDown />} />
                                                                </Collapsible.Trigger>
                                                                <Collapsible.Content py={'4'}>
                                                                    {/* <ChainDetails session={session!!} fileInfo={fileInfo} /> */}
                                                                    <ChainDetailsView  fileInfo={fileInfo} isVerificationComplete={isVerificationComplete(fileInfo)}  verificationResults={verificationResults} />
                                                                </Collapsible.Content>
                                                            </Collapsible.Root>
                                                        </Box>
                                                    </VStack>
                                                </Card.Body>
                                            </Card.Root>
                                        </GridItem>
                                    </SimpleGrid>
                                </Box>

                            </VStack>
                        </Container>
                    ) : null
                }
            </Container>
        </div>
    )
}

export default SharePage