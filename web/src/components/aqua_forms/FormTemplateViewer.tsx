import React from 'react';
import {
  Box,
  Heading,
  Text,
  VStack,
  Badge,
  Table,
} from '@chakra-ui/react';
import { FormTemplate } from './types/types';

interface FormTemplateViewerProps {
  template: FormTemplate;
}

const FormTemplateViewer: React.FC<FormTemplateViewerProps> = ({ template }) => {
  return (
    <Box p={4} borderWidth="1px" borderRadius="lg">
      <VStack gap={4} align="stretch">
        <Box>
          <Heading size="md">{template.title}</Heading>
          <Text color="gray.500">Name: {template.name}</Text>
        </Box>
        
        <Box>
          <Heading size="sm" mb={2}>Fields ({template.fields.length})</Heading>
          
          {template.fields.length === 0 ? (
            <Text>No fields defined for this template.</Text>
          ) : (
            <Table.Root variant="line">
              <Table.Header>
                <Table.Row>
                  <Table.ColumnHeader>Label</Table.ColumnHeader>
                  <Table.ColumnHeader>Name</Table.ColumnHeader>
                  <Table.ColumnHeader>Type</Table.ColumnHeader>
                  <Table.ColumnHeader>Required</Table.ColumnHeader>
                </Table.Row>
              </Table.Header>
              <Table.Body>
                {template.fields.map((field) => (
                  <Table.Row key={field.id}>
                    <Table.Cell>{field.label}</Table.Cell>
                    <Table.Cell>{field.name}</Table.Cell>
                    <Table.Cell>
                      <Badge colorScheme={field.type === 'text' ? 'blue' : 'purple'}>
                        {field.type}
                      </Badge>
                    </Table.Cell>
                    <Table.Cell>
                      {field.required ? (
                        <Badge colorScheme="green">Yes</Badge>
                      ) : (
                        <Badge colorScheme="gray">No</Badge>
                      )}
                    </Table.Cell>
                  </Table.Row>
                ))}
              </Table.Body>
            </Table.Root>
          )}
        </Box>
      </VStack>
    </Box>
  );
};

export default FormTemplateViewer;
