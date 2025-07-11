import {
  Box,
  Flex,
  Text,
  Button,
  VStack,
  HStack,
  Icon,
  Heading,
  Stack,
  TimelineSeparator,
  Span,
  Card,
  Badge,
} from "@chakra-ui/react";
import { FiAlertCircle, FiCalendar, FiCheck, FiCheckCircle, FiCheckSquare, FiCopy, FiFileText, FiInfo } from "react-icons/fi";
import { BsCheckCircleFill } from "react-icons/bs";
import { IContractWorkFlowFirstPage } from "../../../types/contract_workflow";
import { TimelineConnector, TimelineContent, TimelineIndicator, TimelineItem, TimelineRoot, TimelineTitle } from "../../../components/chakra-ui/timeline";
// import { WalletEnsView } from "../../../components/chakra-ui/wallet_ens";
// import { formatCryptoAddress } from "../../../utils/functions";

const DisplayWalletAddress = ({ walletAddress, }: { walletAddress: string, enableNameResolution: boolean }) => {

  return (
    <>
    {/* If we enable name resolution, we can easily do it here without any chaos */}
      {/* {
        enableNameResolution ?
          <WalletEnsView walletAddress={walletAddress} inline={true} />
          : formatCryptoAddress(walletAddress, 10, 4)
      } */}
      {walletAddress}
    </>
  )
}

const ContractSummaryDetails = ({ data, goToSecondPage, enableNameResolution = false, isValidTree }: IContractWorkFlowFirstPage) => {

  const mockContractData = data

  const formatDateTime = (dateString: string) => {
    // return format(new Date(dateString), "MMM d, yyyy, HH:mm:ss a");
    return dateString
  };

  const getInformation = (activityType: "created" | "signed" | "completed") => {
    switch (activityType) {
      case "created":
        return ({
          title: "Workflow Created",
          icon: FiFileText,
          color: "blue",
        })
      case "signed":
        return ({
          title: "Signature Detected",
          icon: FiCheckCircle,
          color: "green"
        })
      case "completed":
        return ({
          title: "Workflow Completed",
          icon: FiCheckSquare,
          color: "green"
        })
      default:
        return ({
          title: "Default",
          icon: FiInfo,
          color: "gray"
        })
    }
  }

  const CustomDivider = ({ mb, mt }: { mb: string | number, mt: string | number }) => {

    return (
      <Box bg={"gray.200"} style={{
        width: "100%",
        height: "1px",
      }} _dark={{
        background: "gray.800"
      }} mt={mt} mb={mb} />
    )
  }

  const getBgColorBasedOnVerificationStatus = () => {
    if(isValidTree === "pending"){
      return "gray.50"
    }
    else if(isValidTree === "successful"){
      return "green.50"
    }
    else if(isValidTree === "failed"){
      return "red.50"
    }
  }

  return (
    <Stack borderRadius="lg" shadow="md" pt={8} overflow={"hidden"}>

      <Flex px={{ base: 2, md: 8 }} justify="space-between" align="center">
        <HStack>
          <Heading size="xl" fontWeight={600}>{mockContractData.name}</Heading>
          <Badge colorPalette={mockContractData.status === "pending" ? "yellow" : "green"} variant="subtle" borderRadius={"full"} fontSize="sm">
            {
              mockContractData.status === "pending" ?
                <Icon as={FiInfo} />
                :
                null
            }
            {
              mockContractData.status === "completed" ?
                <Icon as={FiCheck} />
                :
                null
            }
            {mockContractData.status}
          </Badge>
        </HStack>
        <Button data-testid="action-contract-summary-button"   variant="outline" colorPalette="blue">
          Contract
        </Button>
      </Flex>

      <HStack align={"center"} px={{ base: 2, md: 8 }}>
        <Icon as={FiCalendar} color={'gray.500'} />
        <Text color="gray.500" fontSize={"sm"}>
          Created on {mockContractData.creationDate}
        </Text>
      </HStack>

      <HStack px={{ base: 2, md: 8 }}>
        <Text color="gray.600" _dark={{ color: "gray.300" }} fontSize={"sm"} wordBreak={"break-word"} style={{
          translate: "all 0.5s linear"
        }}>
          Wallet address: <DisplayWalletAddress walletAddress={mockContractData.creatorAddress} enableNameResolution={enableNameResolution} />
        </Text>
        <Icon as={FiCopy} cursor="pointer" />
      </HStack>

      {/* <Divider my={6} /> */}
      <CustomDivider mt={2} mb={2} />

      <Stack mb={8} px={{ base: 2, md: 8 }}>
        <Heading size="xl" fontWeight={"600"}>
          All signers
        </Heading>
        <VStack align="stretch" gap={3}>
          {mockContractData.signers.map((signer, index) => {
            return (
              <Flex
                key={index}
                justify="space-between"
                align="center"
                bg={signer.status === "pending" ? "yellow.50" : "green.50"}
                p={3}
                borderRadius="md"
                borderColor={signer.status === "pending" ? "yellow.200" : "green.200"}
                // border={`1px solid`}
                borderWidth={"1px"}
                borderStyle={"solid"}
                gap={4}
              >
                <HStack>
                  <Icon size={"md"} as={signer.status === "pending" ? FiAlertCircle : FiCheckCircle} color={signer.status === "pending" ? "yellow.500" : "green.500"} />
                  <Text color={"blackAlpha.900"} fontFamily={"monospace"} fontSize={"sm"} wordBreak={"break-all"}>
                    <DisplayWalletAddress walletAddress={signer.address} enableNameResolution={enableNameResolution} />
                    </Text>
                </HStack>
                <Text fontSize={"xs"} color={signer.status === "pending" ? "yellow.600" : "green.600"} fontWeight="medium">
                  {signer.status === "pending" ? "Pending" : "Signed"}
                </Text>
              </Flex>
            )
          })}
        </VStack>
      </Stack>

      {/* Divider */}
      <CustomDivider mt={2} mb={2} />

      <Stack px={{ base: 2, md: 8 }}>
        <Heading size="xl" fontWeight={"600"}>
          Workflow activity timeline
        </Heading>

        <TimelineRoot w={"100%"}>

          {mockContractData.activities.map((activity, index) => {
            let info = getInformation(activity.type as any)
            return (
              <TimelineItem key={`activity_item_${index}`}>
                <TimelineConnector bg={"blue.200"}>
                  <TimelineSeparator />
                  <TimelineIndicator boxSize={"26px"} bg={`${info.color}.100`} color={`${info.color}.600`}>
                    <Icon as={info.icon} size={"sm"} />
                  </TimelineIndicator>
                </TimelineConnector>
                <TimelineContent textStyle="xs" >
                  <TimelineTitle fontWeight={500}>
                    {info.title}
                  </TimelineTitle>
                  {
                    activity.type === "signed" ?
                      <Text opacity={"0.8"} fontSize={"sm"} wordBreak={"break-all"}>
                        User with address {" "}
                        <Span fontWeight={600} fontFamily={"monospace"}>
                          <DisplayWalletAddress walletAddress={activity.address ?? ""} enableNameResolution={enableNameResolution} />
                        </Span> {" "}
                        signed the document at {" "}
                        <Span fontWeight={600}>
                          {formatDateTime(activity.timestamp)}
                        </Span>
                      </Text> :
                      null
                  }
                  {
                    activity.type === "created" ? (
                      <Card.Root size="sm" bg={"gray.50"} borderColor={"gray.100"}>
                        <Card.Body textStyle="sm" lineHeight="tall">
                          <Text opacity={"0.9"} fontSize={"sm"} color={"blackAlpha.900"} wordBreak={"break-all"}>
                            User with address {" "}
                            <Span fontWeight={600} fontFamily={"monospace"}>
                              <DisplayWalletAddress walletAddress={activity.address ?? ""} enableNameResolution={enableNameResolution} />
                            </Span> {" "}
                            Created the contract workflow at {" "}
                            <Span fontWeight={600}>
                              {formatDateTime(activity.timestamp)}
                            </Span>
                          </Text>
                          <Text opacity={"0.9"} fontSize={"sm"} color={"blackAlpha.900"}>
                            {activity.details}
                          </Text>
                        </Card.Body>
                      </Card.Root>
                    ) : null
                  }
                  {
                    activity.type === "completed" ? (
                      <Card.Root size="sm" bg={"green.50"} borderColor={"green.200"}>
                        <Card.Body textStyle="sm" lineHeight="tall">
                          <Text opacity={"0.9"} fontSize={"sm"} color={"blackAlpha.900"}>
                            <Icon as={FiCheck} color={"green.600"} /> {" "}
                            Workflow completed and validated
                          </Text>
                          <Text opacity={"0.9"} fontSize={"sm"} color={"blackAlpha.900"}>
                            {activity.details}
                          </Text>
                        </Card.Body>
                      </Card.Root>
                    ) : null
                  }
                </TimelineContent>
              </TimelineItem>
            )
          }
          )}
        </TimelineRoot>
      </Stack>

      <Box>
        {/* <Divider my={6} /> */}
        <CustomDivider mt={2} mb={0} />

        <Box bg={getBgColorBasedOnVerificationStatus()} _dark={{ bg: "blackAlpha.800" }} pt={8} pb={8}>
          <Flex px={{ base: 2, md: 8 }} justify="space-between" align="center">
            {
              mockContractData.status === "completed" ? (
                <HStack>
                  <Icon as={BsCheckCircleFill} color="green.500" />
                  <Text>All signatures have been collected</Text>
                </HStack>
              ) : null
            }
            {
              mockContractData.status === "pending" ? (
                <Text fontSize={"sm"} opacity={0.9}>{mockContractData?.footerMsg}</Text>
              ) : null
            }
            <Button data-testid="action-view-contract-button" colorPalette={mockContractData?.status === "pending" ? "blue" : "blackAlpha"} borderRadius={"lg"} onClick={goToSecondPage}>
              <Icon as={FiFileText} />
              View Contract Document
            </Button>
          </Flex>
        </Box>
      </Box>
    </Stack>
  );
};

export default ContractSummaryDetails;