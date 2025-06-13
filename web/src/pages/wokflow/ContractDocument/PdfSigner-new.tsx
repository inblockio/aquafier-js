// import { SignatureData } from "../../../types/types";



// interface PdfSignerProps {

//     file: File | null;
//     setActiveStep: (page: number) => void;
//     documentSignatures?: SignatureData[]
// }

// const PdfSignerNew: React.FC<PdfSignerProps> = ({ file, setActiveStep, documentSignatures }) => {

//  return (
//         <Container fluid h={"calc(100vh - 70px)"} overflow={{ base: "scroll", md: "hidden" }}>
//             <Box h="60px" display={"flex"} alignItems={"center"}>
//                 <Heading>PDF Signer</Heading>
//             </Box>

//         {/* Signature drawing modal */}
//                 <DialogRoot open={isOpen}
//                     onOpenChange={e => setIsOpen(e.open)}
//                     size="md">
//                     <DialogContent borderRadius={{ base: 0, md: 'xl' }}>
//                         <DialogHeader py={"3"} px={"5"}>
//                             <Text>Draw Signature</Text>
//                         </DialogHeader>
//                         <DialogBody>
//                             <Stack gap={4}>
//                                 <Field>
//                                     <FieldLabel>Signer Name</FieldLabel>
//                                     <Input
//                                         value={signerName}
//                                         onChange={(e) => setSignerName(e.target.value)}
//                                         placeholder="Enter your name"
//                                         borderRadius={"lg"}
//                                     />
//                                 </Field>
    
//                                 <Text>Wallet Address: {session?.address ?
//                                     `${session?.address.substring(0, 6)}...${session?.address.substring(session?.address.length - 4)}` :
//                                     'Not connected'
//                                 }</Text>
    
//                                 <Box
//                                     border="1px solid"
//                                     borderColor="gray.200"
//                                     width="100%"
//                                     height="200px"
//                                     bg="white"
//                                 >
//                                     <SignatureCanvas
//                                         ref={signatureRef}
//                                         canvasProps={{
//                                             style: {
//                                                 maxWidth: "100%"
//                                             },
//                                             width: 500,
//                                             height: 200,
//                                             className: 'signature-canvas',
//                                         }}
//                                         backgroundColor="transparent"
//                                     />
//                                 </Box>
    
//                                 <HStack>
//                                     <IconButton
//                                         aria-label="Clear signature"
//                                         onClick={clearSignature}
//                                     >
//                                         <FaUndo />
//                                     </IconButton>
//                                     <Button disabled={creatingUserSignature} colorScheme="blue" onClick={saveSignature}>
    
    
//                                         {creatingUserSignature ? <>
//                                             <Spinner size="inherit" color="inherit" />
//                                             loading
//                                         </> : <span>Save Signature</span>}
//                                     </Button>
//                                 </HStack>
//                             </Stack>
//                         </DialogBody>
//                     </DialogContent>
//                 </DialogRoot>
//             </Container>
// };
// // Add PDF.js types to window object
// declare global {
//     interface Window {
//         pdfjsLib: any;
//     }
// }

// export default PdfSignerNew