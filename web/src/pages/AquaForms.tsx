import { useState } from 'react';
import {
  Container,
  Box,
  Heading,
  Button,
  useDisclosure,
  DialogBackdrop,
  DialogHeader,
  DialogBody,
  DialogPositioner
} from '@chakra-ui/react';

import FormTemplateEditor from '../components/aqua_forms/FormTemplateEditor';
import { FormTemplate } from '../components/aqua_forms/types';
import FormTemplateList from '../components/aqua_forms/FormTemplateList';
import { DialogCloseTrigger, DialogContent, DialogRoot } from '../components/chakra-ui/dialog';
import FormTemplateViewer from '../components/aqua_forms/FormTemplateViewer';

const AquaForms = () => {
  const [selectedTemplate, setSelectedTemplate] = useState<FormTemplate | null>(null);

  const {
    open: editorOpen,
    onOpen: editorOnOpen,
    onClose: editorOnClose
  } = useDisclosure();

  const {
    open: viewerOpen,
    onOpen: viewerOnOpen,
    onClose: viewerOnClose
  } = useDisclosure();

  const handleCreateTemplate = () => {
    setSelectedTemplate(null);
    editorOnOpen();
  };

  const handleEditTemplate = (template: FormTemplate) => {
    setSelectedTemplate(template);
    editorOnOpen();
  };

  const handleViewTemplate = (template: FormTemplate) => {
    setSelectedTemplate(template);
    viewerOnOpen();
  };

  const handleTemplateSaved = () => {
    editorOnClose();
  };



  return (
    <>

      <Container maxW="container.xl" py={10}>
        <Box mb={6}>
          <Box display="flex" justifyContent="space-between" alignItems="center">
            <Heading size="lg">AquaForms</Heading>
            <Button
              colorScheme="blue"
              onClick={handleCreateTemplate}
            >
              Create Form Template
            </Button>
          </Box>

          <Box mt={6}>
            <FormTemplateList
              onEdit={handleEditTemplate}
              onView={handleViewTemplate}
              // onRefresh={formTemplates}
              onRefresh={() => {}}
            />
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
              {selectedTemplate ? 'Edit Form Template' : 'Create Form Template'}
            </DialogHeader>
            <DialogBody>
              <FormTemplateEditor
                initialTemplate={selectedTemplate || undefined}
                onSave={handleTemplateSaved}
                updating={!!selectedTemplate}
              />
            </DialogBody>
          </DialogContent>
        </DialogPositioner>
      </DialogRoot>

      {/* Form Viewer Modal */}
      <DialogRoot
        open={viewerOpen}
        onOpenChange={viewerOnClose}
        size="xl"
      >
        <DialogBackdrop />
        <DialogPositioner>
          <DialogContent>
            <DialogCloseTrigger />
            <DialogHeader>
              {selectedTemplate?.title || 'Form Template'}
            </DialogHeader>
            <DialogBody>
              {selectedTemplate && (
                <FormTemplateViewer template={selectedTemplate} />
              )}
            </DialogBody>
          </DialogContent>
        </DialogPositioner>
      </DialogRoot>

    </>
  );
};

export default AquaForms;