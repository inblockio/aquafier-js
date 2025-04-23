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
  DialogPositioner
} from '@chakra-ui/react';

import FormTemplateEditor from '../components/aqua_forms/FormTemplateEditor';
import { FormTemplate, getFormTemplates } from '../components/aqua_forms';
import FormTemplateList from '../components/aqua_forms/FormTemplateList';
import { DialogCloseTrigger, DialogContent, DialogRoot } from '../components/chakra-ui/dialog';
import FormTemplateViewer from '../components/aqua_forms/FormTemplateViewer';

const AquaForms = () => {
  const [_templates, setTemplates] = useState<FormTemplate[]>([]);
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

  const loadTemplates = () => {
    const loadedTemplates = getFormTemplates();
    setTemplates(loadedTemplates);
  };

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
    loadTemplates();
  };
  
  useEffect(() => {
    loadTemplates();
  }, []);

  console.log("Templates: ", JSON.stringify(_templates, null, 4))

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
              onRefresh={loadTemplates}
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