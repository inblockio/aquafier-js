import { useState, useEffect } from 'react';
import {
    Container,
    Box,
    Heading,
    Button,
    useDisclosure,
    DialogBackdrop,
    DialogHeader,
    DialogBody,
    DialogPositioner,
    Table
} from '@chakra-ui/react';

import { toaster } from "../components/ui/toaster"
import { ensureDomainUrlHasSSL } from "../utils/functions"
import appStore from "../store"
import { useStore } from "zustand"
import { DialogCloseTrigger, DialogContent, DialogRoot } from '../components/ui/dialog';
import { AttestationAddressData } from '../models/Attestation';

const AttestationAddresses = () => {

    const [attestationAddressData, setAttestationAddressData] = useState<AttestationAddressData[]>([]);

    const [isLoading, setIsLoading] = useState(false)
    const { session, backend_url } = useStore(appStore)
    const {
        open: editorOpen,
        onOpen: editorOnOpen,
        onClose: editorOnClose
    } = useDisclosure();



    const handleCreateAttestationAddresses = () => {

        editorOnOpen();
    };

    useEffect(() => {
        const fetchAttestationAddressData = async () => {
            let actualUrlToFetch = ensureDomainUrlHasSSL(`${backend_url}/attestation_address`)

            setIsLoading(true)

            // Fetch the file from the URL
            const response = await fetch(actualUrlToFetch, {
                method: 'GET',
                headers: {
                    'Nonce': session?.nonce ?? "--error--" // Add the nonce directly as a custom header if needed
                }
            });

            setIsLoading(false)
            if (response.status == 200) {
                // Parse the response body as JSON
                const data = await response.json();

                if (data.success) {
                    setAttestationAddressData(data.data);
                } else {
                    toaster.create({
                        description: `Error  with attestation address data `,
                        type: "error"
                    })
                }
            } else {
                toaster.create({
                    description: `Error fetching attestation addresses`,
                    type: "error"
                })
            }

        }
        fetchAttestationAddressData();
    })
    return (
        <>

            <Container maxW="container.xl" py={10}>
                <Box mb={6}>
                    <Box display="flex" justifyContent="space-between" alignItems="center">
                        <Heading size="lg">AquaForms</Heading>
                        <Button
                            colorScheme="blue"
                            onClick={handleCreateAttestationAddresses}
                        >
                            Create Attestation address
                        </Button>
                    </Box>

                    <Box mt={6}>
                        {isLoading ?  <>
                        Loading data
                        </> : 
                        
                        <Table.ScrollArea borderWidth="1px" rounded="md" height="160px">
                            <Table.Root size="sm" stickyHeader>
                                <Table.Header>
                                    <Table.Row bg="bg.subtle">
                                        <Table.ColumnHeader>#</Table.ColumnHeader>
                                        <Table.ColumnHeader>Address</Table.ColumnHeader>
                                        <Table.ColumnHeader textAlign="center">Trust level</Table.ColumnHeader>
                                        <Table.ColumnHeader>Action</Table.ColumnHeader>
                                    </Table.Row>
                                </Table.Header>

                                <Table.Body>
                                    {attestationAddressData.map((item, index) => (
                                        <Table.Row key={item.id}>
                                            <Table.Cell>{index + 1}</Table.Cell>
                                            <Table.Cell>{item.address}</Table.Cell>
                                            <Table.Cell textAlign="center">{item.trust_level}</Table.Cell>
                                            <Table.Cell textAlign="end">Delete</Table.Cell>
                                        </Table.Row>
                                    ))}
                                </Table.Body>
                            </Table.Root>
                        </Table.ScrollArea>
                        }
                    </Box>
                </Box>
            </Container>

            {/* Form Editor Modal */}
            <DialogRoot
                open={editorOpen}
                onOpenChange={editorOnClose}
                size="xl"
            >
                <DialogBackdrop />
                <DialogPositioner>
                    <DialogContent>
                        <DialogCloseTrigger />
                        <DialogHeader>
                            Create Atttestation Address
                        </DialogHeader>
                        <DialogBody>
                            
                        </DialogBody>
                    </DialogContent>
                </DialogPositioner>
            </DialogRoot>



        </>
    );
};

export default AttestationAddresses;