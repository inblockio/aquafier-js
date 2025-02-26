import { Box, Container, VStack } from "@chakra-ui/react"
import { FileUploadDropzone, FileUploadList, FileUploadRoot } from "../components/ui/file-button"
import Statistics from "../components/Stats"
import FilesTable from "../components/ui/table"

const Home = () => {


    return (
        <>
            <Container fluid maxWidth={{ base: 'vw', md: '10/12' }} py={'14'} px={{ base: 1, md: 10 }}>
                <VStack alignItems={'start'} gap={'10'}>
                    <FileUploadRoot borderRadius={'2xl'} alignItems="stretch" maxFiles={10} cursor={'pointer'} >
                        <FileUploadDropzone
                            borderRadius={'2xl'}
                            label="Drag and drop here to upload"
                            description=".png, .jpg up to 20MB"
                            _hover={{
                                outline: "4px dashed",
                                outlineOffset: '4px'
                            }}
                        />
                        {/* 
                            I have set clearable to false since when selecting new files. 
                            If the index is already in uploaed files array, then it marks it as uploaded. 
                            We should be able to fix this to avoid such a scenario
                        */}
                        <FileUploadList clearable={false} showSize />
                    </FileUploadRoot>
                
                    <Box w={'100%'}>
                        <Statistics />
                    </Box>
                    <Box w={'100%'}>
                        <FilesTable />
                    </Box>
                </VStack>
            </Container>
        </>
    )
}

export default Home