import { FormTemplate } from '../aqua_forms'
import { HiDocumentPlus } from 'react-icons/hi2'

const FormTemplateCard = ({
    template,
    selectTemplateCallBack,
}: {
    template: FormTemplate
    selectTemplateCallBack: (template: FormTemplate) => void
}) => {
    return (
        <div
            id={template.name}
            data-testid={template.name}
            className="h-[120px] p-4 cursor-pointer border-2 border-dashed rounded-md flex flex-col items-center justify-center transition-colors duration-200 border-gray-300 bg-gray-50 hover:bg-gray-200 dark:border-gray-600 dark:bg-black/50 dark:hover:bg-black/70"
            onClick={() => {
                selectTemplateCallBack(template)
            }}
        >
            <div className="flex flex-col items-center justify-center h-full">
                <h3 className="text-center mb-2 mx-2 font-bold">
                    {template.title}
                </h3>
                <div className="mt-2 rounded-full flex items-center justify-center">
                    <HiDocumentPlus size={'32px'} />
                </div>
            </div>
        </div>
    )
}

export default FormTemplateCard

// import { Box, Center, Flex, Text } from "@chakra-ui/react"
// import { FormTemplate } from "../aqua_forms"
// import { HiDocumentPlus } from "react-icons/hi2";
// import { useColorMode } from "../ui/color-mode";

// const FormTemplateCard = ({ template, selectTemplateCallBack }: { template: FormTemplate, selectTemplateCallBack: (template: FormTemplate) => void }) => {

//     const { colorMode } = useColorMode()

//     return (
//         <Box
//         id={template.name}
//         data-testid={template.name}
//             borderWidth="2px"
//             borderStyle="dashed"
//             borderColor={colorMode === "light" ? "gray.300" : "gray.600"}
//             borderRadius="md"
//             cursor={"pointer"}
//             bg={colorMode === "light" ? "gray.50" : "blackAlpha.500"}
//             css={{
//                 "&:hover": {
//                     bg: colorMode === "light" ? "gray.200" : "blackAlpha.700"
//                 }
//             }}
//             h="120px"
//             p={4}
//             onClick={() => {
//                 selectTemplateCallBack(template)
//             }}
//         >
//             <Flex direction="column" align="center" justify="center" h="100%">
//                 <Text textAlign="center" mb={2} ml={2} mr={2} fontWeight="bold">
//                     {template.title}
//                 </Text>
//                 <Center
//                     mt={2}
//                     borderRadius="full"
//                 >
//                     <HiDocumentPlus size={"32px"} />
//                 </Center>
//             </Flex>
//         </Box>
//     )
// }

// export default FormTemplateCard
