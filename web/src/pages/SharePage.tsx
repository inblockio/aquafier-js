import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { useStore } from 'zustand'
import appStore from '../store'
import axios from 'axios'
import { ApiFileInfo } from '../models/FileInfo'
import { toaster } from '../components/ui/toaster'
import Loading from 'react-loading'
import { Box, Card, Center, Collapsible, Container, GridItem, Group, SimpleGrid, VStack } from '@chakra-ui/react'
import ChainDetails, { RevisionDetailsSummary } from '../components/ui/navigation/CustomDrawer'
import FilePreview from '../components/FilePreview'
import { ImportAquaChainFromChain } from '../components/dropzone_file_actions'
import { Alert } from '../components/ui/alert'
import { LuChevronUp, LuChevronDown } from 'react-icons/lu'
import { getAquaTreeFileObject } from '../utils/functions'

const SharePage = () => {
    const { backend_url, metamaskAddress, session } = useStore(appStore)
    const [fileInfo, setFileInfo] = useState<ApiFileInfo | null>(null)
    // const [fetchFromUrl, setFetchFromUrl] = useState(false)
    const [loading, setLoading] = useState(false)
    const [hasError, setHasError] = useState<string | null>(null);
    const [isVerificationSuccesful, setIsVerificationSuccessful] = useState(false)
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

    // useEffect(() => {
    //     loadPageData()
    // }, [])

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

    const updateVerificationStatus = (revisionResults: Array<boolean>, revisionCount: number) => {
        //  console.log(`revisionResults   ${revisionResults}   revisionCount ${revisionCount}`)
        if (revisionResults.length >= revisionCount) {
            const containsFailure = revisionResults.filter((e) => e == false);
            if (containsFailure.length > 0) {
                setIsVerificationSuccessful(false)
            } else {
                setIsVerificationSuccessful(true)
            }
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
                                            // <ConnectWallet />
                                            <Box />
                                        ) : (
                                            <ImportAquaChainFromChain fileInfo={fileInfo} isVerificationSuccessful={isVerificationSuccesful} />
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

                                                        <RevisionDetailsSummary fileInfo={fileInfo} />
                                                        <Box w={'100%'}>
                                                            <Collapsible.Root open={showMoreDetails}>
                                                                <Collapsible.Trigger w="100%" py={'md'} onClick={() => setShowMoreDetails(open => !open)} cursor={'pointer'}>
                                                                    <Alert w={'100%'} status={"info"} textAlign={'start'} title={showMoreDetails ? `Show less Details` : `Show more Details`} icon={showMoreDetails ? <LuChevronUp /> : <LuChevronDown />} />
                                                                </Collapsible.Trigger>
                                                                <Collapsible.Content py={'4'}>
                                                                    <ChainDetails session={session!!} fileInfo={fileInfo} callBack={updateVerificationStatus} />
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