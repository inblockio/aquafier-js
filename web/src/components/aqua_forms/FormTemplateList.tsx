import React, { useState, useEffect } from 'react';
import {
  Box,
  Button,
  Table,
  IconButton,
  Heading,
  HStack,
  useDisclosure,
  DialogPositioner,
} from '@chakra-ui/react';
import { FormTemplate } from './types';
import { getFormTemplates, deleteFormTemplate } from './formService';
import { toaster } from '../ui/toaster';
import { DialogBackdrop, DialogBody, DialogContent, DialogFooter, DialogHeader, DialogRoot } from '../ui/dialog';
import { LuDelete, LuEye, LuPen } from 'react-icons/lu';

interface FormTemplateListProps {
  onEdit: (template: FormTemplate) => void;
  onView: (template: FormTemplate) => void;
  onRefresh: () => void;
}

const FormTemplateList = ({ onEdit, onView, onRefresh }: FormTemplateListProps) => {
  const [templates, setTemplates] = useState<FormTemplate[]>([]);
  const [templateToDelete, setTemplateToDelete] = useState<FormTemplate | null>(null);
  const { open, onOpen, onClose } = useDisclosure();
  const cancelRef = React.useRef<HTMLButtonElement>(null);

  useEffect(() => {
    loadTemplates();
  }, []);

  const loadTemplates = () => {
    try {
      const loadedTemplates = getFormTemplates();
      setTemplates(loadedTemplates);
    } catch (error) {
      toaster.create({
        title: 'Error loading templates',
        description: error instanceof Error ? error.message : 'Unknown error',
        type: 'error',
        duration: 5000,
      });
    }
  };

  const handleDeleteClick = (template: FormTemplate) => {
    setTemplateToDelete(template);
    onOpen();
  };

  const confirmDelete = () => {
    if (templateToDelete) {
      try {
        deleteFormTemplate(templateToDelete.id);
        toaster.create({
          title: 'Template deleted',
          type: 'success',
          duration: 3000,
        });
        loadTemplates();
        onRefresh();
      } catch (error) {
        toaster.create({
          title: 'Error deleting template',
          description: error instanceof Error ? error.message : 'Unknown error',
          type: 'error',
          duration: 5000,
        });
      }
    }
    onClose();
  };

  return (
    <Box>
      <Heading size="md" mb={4}>Form Templates</Heading>

      {templates.length === 0 ? (
        <Box p={4} textAlign="center">
          No form templates found. Create your first template!
        </Box>
      ) : (
        <Table.Root variant="line">
          <Table.Header>
            <Table.Row>
              <Table.ColumnHeader>Name</Table.ColumnHeader>
              <Table.ColumnHeader>Title</Table.ColumnHeader>
              <Table.ColumnHeader>Fields</Table.ColumnHeader>
              <Table.ColumnHeader>Actions</Table.ColumnHeader>
            </Table.Row>
          </Table.Header>
          <Table.Body>
            {templates.map((template) => (
              <Table.Row key={template.id}>
                <Table.Cell>{template.name}</Table.Cell>
                <Table.Cell>{template.title}</Table.Cell>
                <Table.Cell>{template.fields.length}</Table.Cell>
                <Table.Cell>
                  <HStack gap={2}>
                    <IconButton
                      aria-label="View template"
                      size="sm"
                      onClick={() => onView(template)}
                    >
                      <LuEye />
                    </IconButton>
                    <IconButton
                      aria-label="Edit template"
                      size="sm"
                      onClick={() => onEdit(template)}
                    >
                      <LuPen />
                    </IconButton>
                    <IconButton
                      aria-label="Delete template"
                      size="sm"
                      onClick={() => handleDeleteClick(template)}
                    >
                      <LuDelete />
                    </IconButton>
                  </HStack>
                </Table.Cell>
              </Table.Row>
            ))}
          </Table.Body>
        </Table.Root>
      )}

      <DialogRoot
        open={open}
        onOpenChange={onClose}
      >
        <DialogBackdrop />
        <DialogPositioner>
          <DialogContent>
            <DialogHeader fontSize="lg" fontWeight="bold">
              Delete Form Template
            </DialogHeader>

            <DialogBody>
              Are you sure you want to delete the "{templateToDelete?.title}" template?
              This action cannot be undone.
            </DialogBody>

            <DialogFooter>
              <Button ref={cancelRef} onClick={onClose}>
                Cancel
              </Button>
              <Button colorScheme="red" onClick={confirmDelete} ml={3}>
                Delete
              </Button>
            </DialogFooter>
          </DialogContent>
        </DialogPositioner>
      </DialogRoot>
    </Box>
  );
};

export default FormTemplateList;
