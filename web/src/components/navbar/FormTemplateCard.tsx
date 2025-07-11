import { Box, Center, Flex, Text } from "@chakra-ui/react"
import { FormTemplate } from "../aqua_forms"
import { useColorMode } from "../chakra-ui/color-mode"
import { HiDocumentPlus } from "react-icons/hi2";


const FormTemplateCard = ({ template, selectTemplateCallBack }: { template: FormTemplate, selectTemplateCallBack: (template: FormTemplate) => void }) => {

    const { colorMode } = useColorMode()
    
    return (
        <Box
        id={template.name}
        data-testid={template.name}
            borderWidth="2px"
            borderStyle="dashed"
            borderColor={colorMode === "light" ? "gray.300" : "gray.600"}
            borderRadius="md"
            cursor={"pointer"}
            bg={colorMode === "light" ? "gray.50" : "blackAlpha.500"}
            css={{
                "&:hover": {
                    bg: colorMode === "light" ? "gray.200" : "blackAlpha.700"
                }
            }}
            h="120px"
            p={4}
            onClick={() => {
                selectTemplateCallBack(template)
            }}
        >
            <Flex direction="column" align="center" justify="center" h="100%">
                <Text textAlign="center" mb={2} ml={2} mr={2} fontWeight="bold">
                    {template.title}
                </Text>
                <Center
                    mt={2}
                    borderRadius="full"
                >
                    <HiDocumentPlus size={"32px"} />
                </Center>
            </Flex>
        </Box>
    )
}


export default FormTemplateCard
