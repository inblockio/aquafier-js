import { useState, useEffect, FormEvent, useRef } from 'react';
import {
  Container,
  Box,
  Heading,
  Text,
  Button,
  Stack,
  Group,
  Input,
  createListCollection,
  Portal,
  Select
} from '@chakra-ui/react';
import { Field } from '../components/ui/field';
import { FormTemplate, getFormTemplates, getFormTemplateById } from '../components/aqua_forms';
import { NumberInputField, NumberInputLabel, NumberInputRoot } from '../components/ui/number-input';

// Template Select Component
interface TemplateSelectProps {
  templates: Array<FormTemplate>;
  value: string;
  onChange: (value: string) => void;
}

const TemplateSelect = ({ templates, value, onChange }: TemplateSelectProps) => {
  const contentRef = useRef<HTMLDivElement>(null);

  // Create collection for template options
  const templateOptions = createListCollection({
    items: templates.map(template => ({
      label: template.title,
      value: template.id
    }))
  });

  return (
    <Box ref={contentRef} w={"100%"}>
      <Select.Root collection={templateOptions} w={"100%"}
        defaultValue={value ? [value] : []}
        value={value ? [value] : []}
        onValueChange={e => onChange(e.value[0])}
        multiple={false}>
        <Select.HiddenSelect />
        <Select.Control>
          <Select.Trigger>
            <Select.ValueText placeholder="Choose a template" />
          </Select.Trigger>
          <Select.IndicatorGroup>
            <Select.Indicator />
          </Select.IndicatorGroup>
        </Select.Control>
        <Portal container={contentRef}>
          <Select.Positioner>
            <Select.Content w={"100%"}>
              {templateOptions.items.map((template) => (
                <Select.Item item={template} key={template.value}>
                  {template.label}
                  <Select.ItemIndicator />
                </Select.Item>
              ))}
            </Select.Content>
          </Select.Positioner>
        </Portal>
      </Select.Root>
    </Box>
  );
};

interface FormValues {
  [key: string]: string | number;
}

const FormGenerator = () => {
  const [templates, setTemplates] = useState<FormTemplate[]>([]);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>('');
  const [selectedTemplate, setSelectedTemplate] = useState<FormTemplate | null>(null);
  const [formValues, setFormValues] = useState<FormValues>({});
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitted, setIsSubmitted] = useState(false);

  // No toast in this project, we'll use console.log instead

  // Load templates on component mount
  useEffect(() => {
    const loadedTemplates = getFormTemplates();
    setTemplates(loadedTemplates);
  }, []);

  // Handle template selection
  const handleTemplateChange = (templateId: string) => {
    setSelectedTemplateId(templateId);
    setIsSubmitted(false);

    if (templateId) {
      const template = getFormTemplateById(templateId);
      setSelectedTemplate(template || null);

      // Reset form values and errors when template changes
      setFormValues({});
      setErrors({});
    } else {
      setSelectedTemplate(null);
    }
  };

  // Handle form input changes
  const handleInputChange = (fieldName: string, value: string | number) => {
    setFormValues(prev => ({
      ...prev,
      [fieldName]: value
    }));

    // Clear error for this field if it exists
    if (errors[fieldName]) {
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[fieldName];
        return newErrors;
      });
    }
  };

  // Validate form
  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};
    let isValid = true;

    if (!selectedTemplate) return false;

    selectedTemplate.fields.forEach(field => {
      const value = formValues[field.name];

      if (field.required && (!value || value === '')) {
        newErrors[field.name] = 'This field is required';
        isValid = false;
      }

      if (field.type === 'number' && value && isNaN(Number(value))) {
        newErrors[field.name] = 'Please enter a valid number';
        isValid = false;
      }
    });

    setErrors(newErrors);
    return isValid;
  };

  // Handle form submission
  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();

    if (validateForm()) {
      // In a real application, you would submit this data to your backend
      console.log('Form submitted with values:', formValues);

      setIsSubmitted(true);

      console.log('Form submitted successfully');
    } else {
      console.log('Please fix the errors in the form');
    }
  };

  // Reset the form
  const handleReset = () => {
    setFormValues({});
    setErrors({});
    setIsSubmitted(false);
  };

  return (
    <Container maxW="container.md" py={10}>
      <Box mb={8}>
        <Heading size="lg" mb={6}>Form Generator</Heading>

        <Field label="Select a Form Template" mb={6}>
          <TemplateSelect
            templates={templates}
            value={selectedTemplateId}
            onChange={handleTemplateChange}
          />
          <Text fontSize="sm" color="gray.500" mt={1}>
            Select a template to generate a form
          </Text>
        </Field>

        <NumberInputRoot>
          {/* <NumberInputLabel></NumberInputLabel> */}
          <NumberInputField
            name={"test"}
            min={0}
            value={formValues["test"] || 0}
            onChange={(e) => handleInputChange("test", e.target.value)}
            disabled={isSubmitted}
          />
        </NumberInputRoot>

        {selectedTemplate && (
          <Box borderWidth="1px" borderRadius="lg" p={4} mt={6}>
            <Box mb={4}>
              <Heading size="md">{selectedTemplate.title}</Heading>
              <Text color="gray.500" fontSize="sm">
                Complete the form below
              </Text>
            </Box>
            <form onSubmit={handleSubmit}>
              <Stack gap={4}>
                {selectedTemplate.fields.map(field => (
                  <Field
                    key={field.id}
                    label={field.label}
                    required={field.required}
                  >
                    {field.type === 'text' ? (
                      <Input
                        name={field.name}
                        value={formValues[field.name] || ''}
                        onChange={(e) => handleInputChange(field.name, e.target.value)}
                        disabled={isSubmitted}
                      />
                    ) : (
                      <NumberInputRoot>
                        {/* <NumberInputLabel></NumberInputLabel> */}
                        <NumberInputField
                          name={field.name}
                          min={0}
                          defaultValue={0}
                          value={formValues[field.name] || 0}
                          onChange={(e) => handleInputChange(field.name, e.target.value)}
                          disabled={isSubmitted}
                        />
                      </NumberInputRoot>
                    )}

                    {errors[field.name] && (
                      <Text color="red.500" fontSize="sm" mt={1}>{errors[field.name]}</Text>
                    )}
                  </Field>
                ))}

                <Group mt={6} justifyContent="space-between">
                  <Button
                    colorScheme="gray"
                    onClick={handleReset}
                    disabled={isSubmitted}
                  >
                    Reset
                  </Button>
                  <Button
                    colorScheme="blue"
                    type="submit"
                    disabled={isSubmitted}
                  >
                    Submit
                  </Button>
                </Group>
              </Stack>
            </form>

            {isSubmitted && (
              <Box mt={8} p={4} bg="green.50" borderRadius="md">
                <Heading size="sm" mb={2}>Form Submitted Successfully</Heading>
                <Text>Thank you for your submission!</Text>
                <Button
                  mt={4}
                  size="sm"
                  colorScheme="blue"
                  onClick={handleReset}
                >
                  Create Another
                </Button>
              </Box>
            )}
          </Box>
        )}
        <Box>
          <Text whiteSpace={"pre-line"}>
            {JSON.stringify(formValues, null, 4)}
          </Text>
          <Text whiteSpace={"pre-line"}>
            {JSON.stringify(selectedTemplate, null, 4)}
          </Text>
        </Box>
        {!selectedTemplate && selectedTemplateId && (
          <Box p={4} bg="yellow.50" borderRadius="md">
            <Text>Template not found. Please select a different template.</Text>
          </Box>
        )}
      </Box>
    </Container>
  );
};

export default FormGenerator;
