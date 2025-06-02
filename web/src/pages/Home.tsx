import { Box, Center, Container, Stack, Text, VStack,   } from "@chakra-ui/react"
import { FileUploadDropzone, FileUploadList, FileUploadRoot } from "../components/chakra-ui/file-button"
import FilesTable from "../components/chakra-ui/table"
import { useStore } from "zustand"
import appStore from "../store"
import {ConnectWallet} from "../components/ConnectWallet"


const Home = () => {
    const { session } = useStore(appStore)

   

 
    return (
        <>
            {
                session ? (
                    <Container fluid maxWidth={{ base: 'vw', md: '10/12' }} py={'14'} px={{ base: 1, md: 10 }}>
                        <VStack alignItems={'start'} gap={'10'}>

                            <FileUploadRoot borderRadius={'2xl'} alignItems="stretch" maxFiles={10} cursor={'pointer'}>
                                <FileUploadDropzone
                                    borderRadius={'2xl'}
                                    label="Drag and drop here to upload"
                                    description="Any file up to 200MB"
                                    _hover={{
                                        outline: "4px dashed",
                                        outlineOffset: '4px'
                                    }}
                                    maxHeight={{ base: "100px", md: "200px" }}
                                />
                                {/* 
                            I have set clearable to false since when selecting new files. 
                            If the index is already in uploaed files array, then it marks it as uploaded. 
                            We should be able to fix this to avoid such a scenario
                        */}
                                <FileUploadList clearable={false} showSize />
                            </FileUploadRoot>

                            <Box w={'100%'}>
                                {/* <Statistics /> */}
                            </Box>
                            <Box w={'100%'}>
                                <FilesTable />
                            </Box>
                        </VStack>
                    </Container>
                ) : (
                    <Container h={'calc(100vh - 70px)'}>
                        <Center h={'100%'}>
                            <Stack>
                                <Text>Connect wallet to upload files</Text>
                                <ConnectWallet  disConnectWebsocket={()=>{console.log('ws need global storage')}}/>
                            </Stack>
                        </Center>
                    </Container>
                )
            }

          
        </>
    )
}

export default Home