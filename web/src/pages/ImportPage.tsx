import { useState } from 'react'
import { useStore } from 'zustand'
import appStore from '../store'
import { ApiFileInfo } from '../models/FileInfo'
import { Box, Container, Group, VStack } from '@chakra-ui/react'
import { Alert } from '../components/chakra-ui/alert'
import { IDrawerStatus } from '../models/AquaTreeDetails'
import { CompleteChainView } from '../components/CustomDrawer'
import { ImportAquaChainFromChain } from '../components/dropzone_file_actions/dropzone_file_actions'

interface IImportPage {
    incomingFileInfo: ApiFileInfo
}

const ImportPage = ({ incomingFileInfo }: IImportPage) => {
    const [drawerStatus, setDrawerStatus] = useState<IDrawerStatus | null>(null)
    const {metamaskAddress} = useStore(appStore)
    const fileInfo = incomingFileInfo

    const updateDrawerStatus = (_drawerStatus: IDrawerStatus) => {
        setDrawerStatus(_drawerStatus)
    }

    return (
        <div id='replace-here'>
            {
                fileInfo ? (
                    <Container mt={'40px'}>
                        <CompleteChainView callBack={updateDrawerStatus} selectedFileInfo={fileInfo} />
                        <VStack gap={'10'}>
                            <Group justifyContent={'center'} w={'100%'}>
                                {
                                    !metamaskAddress ? (
                                        // <ConnectWallet />
                                        <Box />
                                    ) : (
                                        drawerStatus ?
                                            <ImportAquaChainFromChain fileInfo={fileInfo} isVerificationSuccessful={drawerStatus?.isVerificationSuccessful} />
                                            : <Box>
                                                <Alert status="info">Waiting for Aqua tree verification to complete</Alert>
                                            </Box>
                                    )
                                }
                            </Group>
                        </VStack>
                    </Container>
                ) : null
            }
        </div>
    )
}

export default ImportPage