import type React from 'react';
import type { Annotation, ProfileAnnotation } from "./types";
import { Trash2 } from 'lucide-react';
import { Card, FieldLabel, Image, Input, Stack, Box, HStack, Heading, IconButton } from '@chakra-ui/react';
import { Field } from '../../../../components/chakra-ui/field';
import { SignatureData } from '../../../../types/types';

interface AnnotationSidebarProps {
  annotations: Annotation[];
  onAnnotationUpdate: (annotation: Annotation) => void;
  onAnnotationDelete: (id: string) => void;
  selectedAnnotationId?: string | null;
  onAnnotationSelect: (id: string | null) => void;
}

const AnnotationSidebar: React.FC<AnnotationSidebarProps> = ({
  annotations,
  onAnnotationUpdate,
  onAnnotationDelete,
  selectedAnnotationId,
  onAnnotationSelect,
}) => {
  // const textAnnotations = annotations.filter(
  //   (anno) => anno.type === 'text'
  // ) as TextAnnotation[];
  // const imageAnnotations = annotations.filter(
  //   (anno) => anno.type === 'image'
  // ) as ImageAnnotation[];
  const profileAnnotations = annotations.filter(
    (anno) => anno.type === 'profile'
  ) as ProfileAnnotation[];
   const signatureAnnotations = annotations.filter(
    (anno) => anno.type === 'signature'
  ) as SignatureData[];
 
  // const renderTextAnnotationEditor = (anno: TextAnnotation) => (
  //   <Card.Root key={anno.id} className={`mb-4 ${selectedAnnotationId === anno.id ? 'border-primary' : ''}`} onClick={() => onAnnotationSelect(anno.id)}>
  //     <Card.Header className="p-4">
  //       <Card.Title className="text-base font-headline flex justify-between items-center">
  //         Text (Page {anno.page})
  //         <Button variant="ghost" size="md" onClick={(e) => { e.stopPropagation(); onAnnotationDelete(anno.id); }}>
  //           <Trash2 className="h-4 w-4" />
  //         </Button>
  //       </Card.Title>
  //     </Card.Header>
  //     <Card.Body className="p-4 space-y-3">
  //       <div>
  //         <label htmlFor={`text-${anno.id}`}>Content</label>
  //         <Input
  //           id={`text-${anno.id}`}
  //           type="text"
  //           value={anno.text}
  //           onChange={(e) => onAnnotationUpdate({ ...anno, text: e.target.value })}
  //           className="mt-1"
  //         />
  //       </div>
  //       <div className="grid grid-cols-2 gap-2">
  //         <div>
  //           <label htmlFor={`fontSize-${anno.id}`}>Font Size</label>
  //           <Input
  //             id={`fontSize-${anno.id}`}
  //             type="number"
  //             value={anno.fontSize}
  //             onChange={(e) => onAnnotationUpdate({ ...anno, fontSize: e.target.value || "12pt" })}
  //             className="mt-1"
  //           />
  //         </div>
  //         <div>
  //           <label htmlFor={`fontColor-${anno.id}`}>Color</label>
  //           <Input
  //             id={`fontColor-${anno.id}`}
  //             type="color"
  //             value={anno.color}
  //             onChange={(e) => onAnnotationUpdate({ ...anno, color: e.target.value })}
  //             className="mt-1 h-10"
  //           />
  //         </div>
  //       </div>
  //       <div className="grid grid-cols-1 gap-2"> {/* Changed to 1 column for width */}
  //         <div>
  //           <label htmlFor={`textWidth-${anno.id}`}>Width (%)</label>
  //           <Input
  //             id={`textWidth-${anno.id}`}
  //             type="number"
  //             value={anno.width}
  //             onChange={(e) => onAnnotationUpdate({ ...anno, width: parseFloat(e.target.value) || 20 })}
  //             className="mt-1"
  //           />
  //         </div>
  //         {/* Height input removed for text annotations */}
  //       </div>
  //     </Card.Body>
  //   </Card.Root>
  // );

  // const renderImageAnnotationEditor = (anno: ImageAnnotation) => (
  //   <Card.Root key={anno.id} className={`mb-4 ${selectedAnnotationId === anno.id ? 'border-primary' : ''}`} onClick={() => onAnnotationSelect(anno.id)}>
  //     <Card.Header className="p-4">
  //       <Card.Title className="text-base font-headline flex justify-between items-center">
  //         Image (Page {anno.page})
  //         <Button variant="ghost" size="md" onClick={(e) => { e.stopPropagation(); onAnnotationDelete(anno.id); }}>
  //           <Trash2 className="h-4 w-4" />
  //         </Button>
  //       </Card.Title>
  //     </Card.Header>
  //     <Card.Body className="p-4 space-y-3">
  //       <img src={anno.src} alt={anno.alt} style={{
  //         border: "1px solid blue"
  //       }} className="w-full h-auto rounded border" data-ai-hint="annotation preview" />
  //       <div>
  //         <label htmlFor={`imgAlt-${anno.id}`}>Alt Text</label>
  //         <Input
  //           id={`imgAlt-${anno.id}`}
  //           type="text"
  //           value={anno.alt}
  //           onChange={(e) => onAnnotationUpdate({ ...anno, alt: e.target.value })}
  //           className="mt-1"
  //         />
  //       </div>
  //       <div className="grid grid-cols-2 gap-2">
  //         <div>
  //           <label htmlFor={`imgWidth-${anno.id}`}>Width</label>
  //           <Input
  //             id={`imgWidth-${anno.id}`}
  //             type="text"
  //             value={anno.width}
  //             placeholder="e.g. 25% or 100px"
  //             onChange={(e) => onAnnotationUpdate({ ...anno, width: e.target.value || "25%" })}
  //             className="mt-1"
  //           />
  //         </div>
  //         <div>
  //           <label htmlFor={`imgHeight-${anno.id}`}>Height</label>
  //           <Input
  //             id={`imgHeight-${anno.id}`}
  //             type="text"
  //             value={anno.height}
  //             placeholder="e.g. 15% or 80px"
  //             onChange={(e) => onAnnotationUpdate({ ...anno, height: e.target.value || "15%" })}
  //             className="mt-1"
  //           />
  //         </div>
  //       </div>
  //     </Card.Body>
  //   </Card.Root>
  // );

  // const _renderProfileAnnotationEditor = (anno: ProfileAnnotation) => (
  //   <Card.Root key={anno.id} borderRadius={"lg"} borderColor={selectedAnnotationId === anno.id ? "blue.400" : "gray.200"} borderWidth={"2px"} onClick={() => onAnnotationSelect(anno.id)}>
  //     <Card.Header p={2}>
  //       <Card.Title className="text-base font-headline flex justify-between items-center">
  //         <HStack justify={"space-between"}>
  //           Signature (Page {anno.page})
  //           <IconButton variant="subtle" colorPalette={"red"} size="sm" borderRadius={"md"} onClick={(e) => { e.stopPropagation(); onAnnotationDelete(anno.id); }}>
  //             <Trash2 className="h-4 w-4" />
  //           </IconButton>
  //         </HStack>
  //       </Card.Title>
  //     </Card.Header>
  //     <Card.Body p={2}>
  //       <Stack>
  //         <Heading size="md">Image Settings</Heading>
  //         <Box bg={"gray.100"} borderRadius={"lg"}>
  //           <Image borderRadius={"lg"} src={anno.imageSrc} alt={anno.imageAlt} h={24} mx={"auto"} data-ai-hint="profile picture" />
  //         </Box>
  //         <Field>
  //           <FieldLabel>Image</FieldLabel>
  //           <Input disabled placeholder="Enter your image" defaultValue={anno.imageSrc} onChange={(e) => onAnnotationUpdate({ ...anno, imageSrc: e.target.value })} />
  //         </Field>

  //         {/* <Field>
  //           <FieldLabel>Image Alt Text</FieldLabel>
  //           <Input placeholder="Enter your image alt text" defaultValue={anno.imageAlt} onChange={(e) => onAnnotationUpdate({ ...anno, imageAlt: e.target.value })} />
  //         </Field> */}

  //         <HStack>
  //           <Field>
  //             <FieldLabel>Image Width</FieldLabel>
  //             <Input placeholder="Enter your image width" defaultValue={anno.imageWidth} onChange={(e) => onAnnotationUpdate({ ...anno, imageWidth: e.target.value })} />
  //           </Field>

  //           <Field>
  //             <FieldLabel>Image Height</FieldLabel>
  //             <Input placeholder="Enter your image height" defaultValue={anno.imageHeight} onChange={(e) => onAnnotationUpdate({ ...anno, imageHeight: e.target.value })} />
  //           </Field>
  //         </HStack>

  //         <Box
  //           h={"1px"}
  //           bg="gray.200"
  //           my={2}
  //         />

  //         <Heading size="md">Info</Heading>

  //         <Field>
  //           <FieldLabel>Name</FieldLabel>
  //           <Input disabled placeholder="Enter your name" defaultValue={anno.name} onChange={(e) => onAnnotationUpdate({ ...anno, name: e.target.value })} />
  //         </Field>

  //         <Field>
  //           <FieldLabel>Wallet Address</FieldLabel>
  //           <Input disabled placeholder="Enter your wallet address" defaultValue={anno.walletAddress} onChange={(e) => onAnnotationUpdate({ ...anno, walletAddress: e.target.value })} />
  //         </Field>

  //         {/* <HStack>
  //           <Field>
  //             <FieldLabel>Font Size</FieldLabel>
  //             <Input placeholder="Enter Font Size" defaultValue={anno.nameFontSize} onChange={(e) => onAnnotationUpdate({ ...anno, nameFontSize: e.target.value })} />
  //           </Field>
  //           <Field>
  //             <FieldLabel>Color</FieldLabel>
  //             <Input type='color' placeholder="Enter your name height" defaultValue={anno.nameColor} onChange={(e) => onAnnotationUpdate({ ...anno, nameColor: e.target.value })} />
  //           </Field>
  //         </HStack>

  //         <Box
  //           h={"1px"}
  //           bg="gray.200"
  //           my={2}
  //         />

  //         <Heading size="md">Wallet Address Settings</Heading>

  //         <Field>
  //           <FieldLabel>Wallet Address</FieldLabel>
  //           <Input placeholder="Enter your wallet address" defaultValue={anno.walletAddress} onChange={(e) => onAnnotationUpdate({ ...anno, walletAddress: e.target.value })} />
  //         </Field>
  //         <HStack>
  //           <Field>
  //             <FieldLabel>Font Size</FieldLabel>
  //             <Input placeholder="Enter Font Size" defaultValue={anno.walletAddressFontSize} onChange={(e) => onAnnotationUpdate({ ...anno, walletAddressFontSize: e.target.value })} />
  //           </Field>
  //           <Field>
  //             <FieldLabel>Color</FieldLabel>
  //             <Input type='color' placeholder="Enter your name height" defaultValue={anno.walletAddressColor} onChange={(e) => onAnnotationUpdate({ ...anno, walletAddressColor: e.target.value })} />
  //           </Field>
  //         </HStack> */}
  //       </Stack>
  //     </Card.Body>
  //   </Card.Root>
  // );

  const renderSignatureAnnotationEditor = (anno: SignatureData) => {
    console.log("anno: ", anno)
    return (
    <Card.Root key={anno.id} borderRadius={"lg"} borderColor={selectedAnnotationId === anno.id ? "blue.400" : "gray.200"} borderWidth={"2px"} onClick={() => onAnnotationSelect(anno.id)}>
      <Card.Header p={2}>
        <Card.Title className="text-base font-headline flex justify-between items-center">
          <HStack justify={"space-between"}>
            Signature (Page {anno.page})
            <IconButton variant="subtle" colorPalette={"red"} size="sm" borderRadius={"md"} onClick={(e) => { e.stopPropagation(); onAnnotationDelete(anno.id); }}>
              <Trash2 className="h-4 w-4" />
            </IconButton>
          </HStack>
        </Card.Title>
      </Card.Header>
      <Card.Body p={2}>
        <Stack>
          <Heading size="md">Image Settings</Heading>
          <Box bg={"gray.100"} borderRadius={"lg"}>
            <Image borderRadius={"lg"} src={anno.dataUrl} alt={anno.name} h={24} mx={"auto"} data-ai-hint="profile picture" />
          </Box>
          <Field>
            <FieldLabel>Image</FieldLabel>
            <Input disabled placeholder="Enter your image" defaultValue={anno.dataUrl} onChange={(e) => onAnnotationUpdate({ ...anno, dataUrl: e.target.value })} />
          </Field>

          {/* <Field>
            <FieldLabel>Image Alt Text</FieldLabel>
            <Input placeholder="Enter your image alt text" defaultValue={anno.imageAlt} onChange={(e) => onAnnotationUpdate({ ...anno, imageAlt: e.target.value })} />
          </Field> */}

          {/* <HStack>
            <Field>
              <FieldLabel>Image Width</FieldLabel>
              <Input placeholder="Enter your image width" defaultValue={anno.imageWidth} onChange={(e) => onAnnotationUpdate({ ...anno, imageWidth: e.target.value })} />
            </Field>

            <Field>
              <FieldLabel>Image Height</FieldLabel>
              <Input placeholder="Enter your image height" defaultValue={anno.imageHeight} onChange={(e) => onAnnotationUpdate({ ...anno, imageHeight: e.target.value })} />
            </Field>
          </HStack> */}

          <Box
            h={"1px"}
            bg="gray.200"
            my={2}
          />

          <Heading size="md">Info</Heading>

          <Field>
            <FieldLabel>Name</FieldLabel>
            <Input disabled placeholder="Enter your name" defaultValue={anno.name} onChange={(e) => onAnnotationUpdate({ ...anno, name: e.target.value })} />
          </Field>

          <Field>
            <FieldLabel>Wallet Address</FieldLabel>
            <Input disabled placeholder="Enter your wallet address" defaultValue={anno.walletAddress} onChange={(e) => onAnnotationUpdate({ ...anno, walletAddress: e.target.value })} />
          </Field>

          {/* <HStack>
            <Field>
              <FieldLabel>Font Size</FieldLabel>
              <Input placeholder="Enter Font Size" defaultValue={anno.nameFontSize} onChange={(e) => onAnnotationUpdate({ ...anno, nameFontSize: e.target.value })} />
            </Field>
            <Field>
              <FieldLabel>Color</FieldLabel>
              <Input type='color' placeholder="Enter your name height" defaultValue={anno.nameColor} onChange={(e) => onAnnotationUpdate({ ...anno, nameColor: e.target.value })} />
            </Field>
          </HStack>

          <Box
            h={"1px"}
            bg="gray.200"
            my={2}
          />

          <Heading size="md">Wallet Address Settings</Heading>

          <Field>
            <FieldLabel>Wallet Address</FieldLabel>
            <Input placeholder="Enter your wallet address" defaultValue={anno.walletAddress} onChange={(e) => onAnnotationUpdate({ ...anno, walletAddress: e.target.value })} />
          </Field>
          <HStack>
            <Field>
              <FieldLabel>Font Size</FieldLabel>
              <Input placeholder="Enter Font Size" defaultValue={anno.walletAddressFontSize} onChange={(e) => onAnnotationUpdate({ ...anno, walletAddressFontSize: e.target.value })} />
            </Field>
            <Field>
              <FieldLabel>Color</FieldLabel>
              <Input type='color' placeholder="Enter your name height" defaultValue={anno.walletAddressColor} onChange={(e) => onAnnotationUpdate({ ...anno, walletAddressColor: e.target.value })} />
            </Field>
          </HStack> */}
        </Stack>
      </Card.Body>
    </Card.Root>
  )};


  return (
    <Stack borderRadius={"xl"} className="w-96 bg-card border-l p-4 h-full flex flex-col">
      <Card.Root>
        <Card.Header>
          <Card.Title className="text-base font-headline flex justify-between items-center">
            Signatures
          </Card.Title>
        </Card.Header>
        <Card.Body>
          {profileAnnotations.length > 0 ? (
            signatureAnnotations.map(renderSignatureAnnotationEditor)
          ) : (
            <p className="text-muted-foreground text-sm text-center py-4">No signatures yet.</p>
          )}
          {/* <Tabs.Root defaultValue="text" className="flex-grow flex flex-col min-h-0">
        <Tabs.List className="grid w-full grid-cols-3">
          <Tabs.Trigger value="text">Text ({textAnnotations.length})</Tabs.Trigger>
          <Tabs.Trigger value="image">Images ({imageAnnotations.length})</Tabs.Trigger>
          <Tabs.Trigger value="profile">Profiles ({profileAnnotations.length})</Tabs.Trigger>
          <Tabs.Trigger value="json">JSON</Tabs.Trigger>
        </Tabs.List>
        <Tabs.Content value="text">
          {textAnnotations.length > 0 ? (
            textAnnotations.map(renderTextAnnotationEditor)
          ) : (
            <p className="text-muted-foreground text-sm text-center py-4">No text annotations yet.</p>
          )}
        </Tabs.Content>
        <Tabs.Content value="image">
          {imageAnnotations.length > 0 ? (
            imageAnnotations.map(renderImageAnnotationEditor)
          ) : (
            <p className="text-muted-foreground text-sm text-center py-4">No image annotations yet.</p>
          )}
        </Tabs.Content>
        <Tabs.Content value="profile">
          {profileAnnotations.length > 0 ? (
            profileAnnotations.map(renderProfileAnnotationEditor)
          ) : (
            <p className="text-muted-foreground text-sm text-center py-4">No profile annotations yet.</p>
          )}
        </Tabs.Content>
        <Tabs.Content value="json">
          {annotations.length > 0 ? (
            <pre className="text-xs whitespace-pre-wrap break-all p-2 border rounded bg-muted/20">
              {JSON.stringify(annotations, null, 4)}
            </pre>
          ) : (
            <p className="text-muted-foreground text-sm text-center py-4">No annotations to display.</p>
          )}
        </Tabs.Content>
      </Tabs.Root> */}
        </Card.Body>
      </Card.Root>
    </Stack>
  );
};

export default AnnotationSidebar;
