import { Box, GridItem, Group, Image, SimpleGrid, StatHelpText, StatLabel, StatRoot, Text, VStack } from "@chakra-ui/react";
// import { StatHelpText, StatLabel } from "./stat";
import { LuDot } from "react-icons/lu";
import { UiFileTypes } from "../models/UiFileTypes";
import { ApiFileInfo } from "../models/FileInfo";
import { filterFilesByType, humanReadableFileSize } from "../utils/functions";
import { useStore } from "zustand";
import appStore from "../store";

interface IStatistic {
    title: string
    tagline: string
    size: string
    image: string
    files: string
}

const Statistic = (props: IStatistic) => {

    // <StatRoot shadow={'sm'} borderRadius={'xl'} px={'4'} py="6" h={'100%'}>
    //     <Group>
    //         <Box>
    //             <Image  src={props.image} w={'60px'} h={'60px'} />
    //         </Box>
    //         <VStack gap={0} alignItems={'start'}>
    //             <Text fontWeight={500} fontSize={'xl'}>{props.title}</Text>
    //             <StatLabel fontWeight={400} fontSize={'small'}>{props.tagline}</StatLabel>
    //         </VStack>
    //     </Group>
    //     <StatHelpText mt={'2'} fontWeight={400} fontSize={'medium'} display={'inline-flex'}>
    //         {props.size}
    //         <LuDot />
    //         {`${props.files} Files`}
    //     </StatHelpText>
    // </StatRoot>
    return (
        <StatRoot
            shadow={'sm'}
            borderRadius={'xl'}
            px={'4'}
            py="6"
            h={'100%'}
        >
            <Group align="center" gap="md">
                <Box
                    display="flex"
                    alignItems="center"
                    justifyContent="center"
                    w={{ base: '40px', md: '60px' }}
                    h={{ base: '40px', md: '60px' }}
                    overflow={"hidden"}
                    borderRadius="md"
                >
                    <Image
                        src={props.image}
                        alt={`${props.title} icon`}
                        objectFit="contain"
                        w={'100%'}
                        h={'100%'}
                        maxWidth={'60px'}
                        maxHeight={'60px'}
                    />
                </Box>
                <VStack gap={0} alignItems={'start'} flex={1}>
                    <Text fontWeight={500} fontSize={'xl'}>{props.title}</Text>
                    <StatLabel fontWeight={400} fontSize={'small'}>{props.tagline}</StatLabel>
                </VStack>
            </Group>
            <StatHelpText
                mt={'2'}
                fontWeight={400}
                fontSize={'medium'}
                display={'inline-flex'}
                alignItems="center"
            >
                {props.size}
                <LuDot />
                {`${props.files} Files`}
            </StatHelpText>
        </StatRoot>

    )
}

// const calculateTotalFilesSize = (_files: ApiFileInfo[]) => {
//     const size = -1;
    // for (const element of files) {
    //     const pageData: PageData = JSON.parse(element.page_data);
    //     // Debug the structure
    //     // debugPageDataStructure(pageData);

    //     const currentSize = sumFileContentSize(pageData)
    //     size += currentSize
    // }
//     return size
// }

const getFileTypeProportions = (files: ApiFileInfo[]) => {
    const fileTypes = ["image", "document", "music", "video"];

    const filesUiState: Record<string, UiFileTypes> = {}

    const totalFilesSize =  -1 //calculateTotalFilesSize(files)

    for (const element of fileTypes) {
        const fileItemData = filterFilesByType(files, element)

        const size = 0;
        // for (const element of fileItemData) {
        //     // const pageData: PageData = JSON.parse(element.page_data);
        //     const currentSize = //sumFileContentSize(pageData)
        //     size += currentSize
        // }

        // Handle potential division by zero or NaN scenarios
        const percentage = totalFilesSize > 0
            ? (size / totalFilesSize * 100)
            : 0;

        const usingText = `Using ${isNaN(percentage)
                ? "0.00"
                : percentage.toFixed(2)
            }% of storage`

        const hSize = humanReadableFileSize(size)

        const item: UiFileTypes = {
            name: element,
            usingText: usingText,
            size: hSize,
            totalFiles: `${fileItemData.length}`
        }

        filesUiState[element] = item
    }
    return filesUiState
}


export default function Statistics() {
    const { files } = useStore(appStore)
    const storageUsage = getFileTypeProportions(files)

    return (
        <SimpleGrid columns={{ base: 2, md: 2, lg: 4 }} gapX={'4'} gapY={'4'}>
            <GridItem>
                <Statistic title="Documents" image="/images/stats/doc.png" files={storageUsage?.document?.totalFiles ?? "-"} size={storageUsage?.document?.size ?? "-"} tagline={storageUsage?.document?.usingText ?? "-"} />
            </GridItem>
            <GridItem>
                <Statistic title="Images" image="/images/stats/image.png" files={storageUsage?.image?.totalFiles ?? "-"} size={storageUsage?.image?.size ?? "-"} tagline={storageUsage?.image?.usingText ?? "-"} />
            </GridItem>
            <GridItem>
                <Statistic title="Music" image="/images/stats/music.png" files={storageUsage?.music?.totalFiles ?? "-"} size={storageUsage?.music?.size ?? "-"} tagline={storageUsage?.music?.usingText ?? "-"} />
            </GridItem>
            <GridItem>
                <Statistic title="Videos" image="/images/stats/video.png" files={storageUsage?.video?.totalFiles ?? "-"} size={storageUsage?.video?.size ?? "-"} tagline={storageUsage?.video?.usingText ?? "-"} />
            </GridItem>
            {/* <GridItem>
                <Statistic title="Others" image="/images/stats/folder.png" files={storageUsage?.document?.totalFiles ?? "-"} size={storageUsage?.document?.size ?? "-"} tagline={storageUsage?.document?.usingText ?? "-"} />
            </GridItem> */}
        </SimpleGrid>
    )
}