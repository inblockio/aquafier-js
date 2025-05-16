import { Box, HStack, Stack, Text } from '@chakra-ui/react';

interface ISignatureItem {
    signature: any
}

const SignatureItem: React.FC<ISignatureItem> = ({ signature }) => {
    return (
        <div>
            <Box
                key={signature.id}
                p={2}
                cursor="pointer"
                bg="blue.50"
                _hover={{ bg: "gray.50" }}
            >
                <HStack>
                    <Box
                        width="60px"
                        height="40px"
                        backgroundImage={`url(${signature.image})`}
                        backgroundSize="contain"
                        backgroundRepeat="no-repeat"
                        backgroundPosition="center"
                        border="1px solid"
                        borderColor="gray.200"
                        borderRadius="sm"
                    />
                    <Stack gap={0}>
                        <Text fontSize="sm" fontWeight="medium">{signature.name}</Text>
                        <Text fontSize="xs" color="gray.600">
                            {signature.walletAddress.length > 10
                                ? `${signature.walletAddress.substring(0, 6)}...${signature.walletAddress.substring(signature.walletAddress.length - 4)}`
                                : signature.walletAddress
                            }
                        </Text>
                    </Stack>
                </HStack>
            </Box>
        </div>
    )
}

export default SignatureItem