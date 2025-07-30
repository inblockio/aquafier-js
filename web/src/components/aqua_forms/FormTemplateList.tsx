// import React, { useEffect, useState } from 'react';
// import {
//   Box,
//   Button,
//   Table,
//   IconButton,
//   Heading,
//   HStack,
//   useDisclosure,
//   DialogPositioner,
// } from '@chakra-ui/react';
// import { FormTemplate } from './types';
// import { useStore } from "zustand";
// import appStore from "../../store";
// // import { toaster } from '../chakra-ui/toaster';
// // import { DialogBackdrop, DialogBody, DialogContent, DialogFooter, DialogHeader, DialogRoot } from '../chakra-ui/dialog';
// import { LuEye, LuPen, LuTrash } from 'react-icons/lu';
// import axios from 'axios';

// interface FormTemplateListProps {
//   onEdit: (template: FormTemplate) => void;
//   onView: (template: FormTemplate) => void;
//   onRefresh: () => void;
// }

// const FormTemplateList = ({ onEdit, onView }: FormTemplateListProps) => {

//   const { formTemplates, backend_url, setFormTemplate, session } = useStore(appStore);

//   const [templateToDelete, setTemplateToDelete] = useState<FormTemplate | null>(null);
//   const { open, onOpen, onClose } = useDisclosure();
//   const cancelRef = React.useRef<HTMLButtonElement>(null);

//   const handleDeleteClick = (template: FormTemplate) => {
//     setTemplateToDelete(template);
//     onOpen();
//   };

//   const confirmDelete = async () => {
//     if (templateToDelete) {

//       if (templateToDelete.public) {
//         toaster.create({
//           title: 'Public Template, cannot be deleted',
//           type: 'info',
//           duration: 3000,
//         });
//         return;
//       }

//       try {

//         let res = await axios.delete(`${backend_url}/templates/${templateToDelete.id}`);

//         if (res.status === 200 || res.status === 201) {
//           toaster.create({
//             title: 'Template deleted',
//             type: 'success',
//             duration: 3000,
//           });
//         }
//       } catch (error) {
//         toaster.create({
//           title: 'Error deleting template',
//           description: error instanceof Error ? error.message : 'Unknown error',
//           type: 'error',
//           duration: 5000,
//         });
//       }
//     }
//     onClose();
//   };

//   const loadTemplates = async () => {

//     const url = `${backend_url}/templates`;

//     const response = await axios.get(url, {
//       headers: {
//         "nonce": session?.nonce
//       }
//     });

//     if (response.status === 200 || response.status === 201) {
//       //  console.log("update state ...")
//       let loadedTemplates: FormTemplate[] = response.data.data;
//       setFormTemplate(loadedTemplates);
//     }

//   }

//   useEffect(() => {
//     loadTemplates()
//   }, []);

//   return (
//     <Box>
//       <Heading size="md" mb={4}>Form Templates</Heading>

//       {formTemplates.length === 0 ? (
//         <Box p={4} textAlign="center">
//           No form templates found. Create your first template!
//         </Box>
//       ) : (
//         <Table.Root variant="line">
//           <Table.Header>
//             <Table.Row>
//               <Table.ColumnHeader>Title</Table.ColumnHeader>
//               <Table.ColumnHeader>Name</Table.ColumnHeader>
//               <Table.ColumnHeader>Fields</Table.ColumnHeader>
//               <Table.ColumnHeader>Actions</Table.ColumnHeader>
//             </Table.Row>
//           </Table.Header>
//           <Table.Body>
//             {formTemplates.map((template) => (
//               <Table.Row key={template.id}>
//                 <Table.Cell>{template.title}</Table.Cell>
//                 <Table.Cell>{template.name}</Table.Cell>
//                 <Table.Cell>{template.fields.length}</Table.Cell>
//                 <Table.Cell>
//                   <HStack gap={2}>
//                     <IconButton
//                       aria-label="View template"
//                       size="sm"
//                       onClick={() => onView(template)}
//                     >
//                       <LuEye />
//                     </IconButton>

//                     {
//                       !template.public ? (
//                         <>
//                           <IconButton
//                             aria-label="Edit template"
//                             size="sm"
//                             onClick={() => onEdit(template)}
//                           >
//                             <LuPen />
//                           </IconButton>
//                           <IconButton
//                             aria-label="Delete template"
//                             size="sm"
//                             onClick={() => handleDeleteClick(template)}
//                           >
//                             <LuTrash />
//                           </IconButton>
//                         </>
//                       ) : null
//                     }
//                   </HStack>
//                 </Table.Cell>
//               </Table.Row>
//             ))}
//           </Table.Body>
//         </Table.Root>
//       )}

//       <DialogRoot
//         open={open}
//         onOpenChange={onClose}
//       >
//         <DialogBackdrop />
//         <DialogPositioner>
//           <DialogContent>
//             <DialogHeader fontSize="lg" fontWeight="bold">
//               Delete Form Template
//             </DialogHeader>

//             <DialogBody>
//               Are you sure you want to delete the "{templateToDelete?.title}" template?
//               This action cannot be undone.
//             </DialogBody>

//             <DialogFooter>
//               <Button   data-testid="cancel-delete-form-action-button" ref={cancelRef} onClick={onClose}>
//                 Cancel
//               </Button>
//               <Button  data-testid="delete-form-action-button"  variant={'solid'} colorPalette="red" onClick={confirmDelete} ml={3}>
//                 Delete
//               </Button>
//             </DialogFooter>
//           </DialogContent>
//         </DialogPositioner>
//       </DialogRoot>
//     </Box>
//   );
// };

// export default FormTemplateList;
