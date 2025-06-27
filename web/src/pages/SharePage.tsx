import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { useStore } from 'zustand'
import appStore from '../store'
import axios from 'axios'
import { ApiFileInfo } from '../models/FileInfo'
import { toaster } from '../components/chakra-ui/toaster'
// import Loading from 'react-loading'
import { ClipLoader } from "react-spinners";
import { Box, Center, Container, Group, VStack } from '@chakra-ui/react'
import { Alert } from '../components/chakra-ui/alert'
import { IDrawerStatus } from '../models/AquaTreeDetails'
import { CompleteChainView } from '../components/CustomDrawer'
import { ImportAquaChainFromChain } from '../components/dropzone_file_actions/import_aqua_tree_from_aqua_tree'

const SharePage = () => {
    const { backend_url, metamaskAddress, session } = useStore(appStore)
    const [fileInfo, setFileInfo] = useState<ApiFileInfo | null>(null)
    const [contractData, setContractData] = useState<any | null>(null)
    const [loading, setLoading] = useState(false)
    const [hasError, setHasError] = useState<string | null>(null);
    const [drawerStatus, setDrawerStatus] = useState<IDrawerStatus | null>(null)

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
                    // console.log("Response: ", response.data)
                    setFileInfo(response.data.data.displayData[0])
                    setContractData(response.data.data.contractData)
                }
                setLoading(false)
            }
            catch (error: any) {
                // console.log("Error: ", error)
                if (error.response.status == 401) {
                } else if (error.response.status == 404) {
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
        if (params.identifier) {
            loadPageData()
        }
        setHasError(null)
    }, [params, session])

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
                <ClipLoader
                    color={"blue"}
                    loading={loading}
                    size={150}
                    aria-label="Loading Spinner"
                    data-testid="loader"
                />
            </Center>
        }
        return <div />
    }


    const updateDrawerStatus = (_drawerStatus: IDrawerStatus) => {
        setDrawerStatus(_drawerStatus)
    }

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
                                            drawerStatus ?
                                                <ImportAquaChainFromChain fileInfo={fileInfo} contractData={contractData} isVerificationSuccessful={drawerStatus ? drawerStatus?.isVerificationSuccessful : false} />
                                                : <Box>
                                                    <Alert status="info">Waiting for Aqua tree verification to complete</Alert>
                                                </Box>
                                        )
                                    }
                                </Group>
                                <Box w={"100%"}>
                                    <CompleteChainView callBack={updateDrawerStatus} selectedFileInfo={fileInfo} />
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