import { v4 as uuidv4 } from 'uuid';
import {
  Box,
  createListCollection,
  Group,
  Heading,
  Portal,
  Select,
  SimpleGrid,
  Stack
} from '@chakra-ui/react';
import { FormField, FormTemplate } from './types';
// import { saveFormTemplate } from './formService';
import { useForm } from 'react-hook-form'

import {
  Input,
  Button,
} from '@chakra-ui/react'
import { Field } from '../chakra-ui/field';
import { useRef, useState } from 'react';
import { Switch } from '../chakra-ui/switch';
import { Alert } from "../chakra-ui/alert";
import axios from "axios";
import { useStore } from "zustand";
import appStore from "../../store";
import { toaster } from "../chakra-ui/toaster";
import { LuCross } from 'react-icons/lu';
import { Text } from "@chakra-ui/react"

const fieldTypes = createListCollection({
  items: [
    { label: "Text", value: "text" },
    { label: "Number", value: "number" },
  ],
})

interface ICustomSelect {
  label: string
  onChange: any
  value: string
}

const CustomSelect = ({ label, onChange, value }: ICustomSelect) => {
  const contentRef = useRef<HTMLDivElement>(null)
  return (
    <Box ref={contentRef} w={"100%"}>
      <Select.Root size={"xs"} collection={fieldTypes} w={"100%"}
        defaultValue={[value]}
        value={[value]}
        onValueChange={e => onChange(e.value[0])}
        multiple={false}>
        <Select.HiddenSelect />
        {/* <Select.Label> {label}</Select.Label> */}
        <Select.Control>
          <Select.Trigger>
            <Select.ValueText placeholder={label} />
          </Select.Trigger>
          <Select.IndicatorGroup>
            <Select.Indicator />
          </Select.IndicatorGroup>
        </Select.Control>
        <Portal container={contentRef}>
          <Select.Positioner>
            <Select.Content w={"100%"}>
              {fieldTypes.items.map((fieldType) => (
                <Select.Item item={fieldType} key={fieldType.value}>
                  {fieldType.label}
                  <Select.ItemIndicator />
                </Select.Item>
              ))}
            </Select.Content>
          </Select.Positioner>
        </Portal>
      </Select.Root>
    </Box>
  )
}

interface FormTemplateEditorProps {
  initialTemplate?: FormTemplate;
  onSave: () => void;
}

const templateFormFields = [
  {
    label: 'Form Title',
    name: 'title',
    type: 'text',
    placeholder: 'Identity Claim',
    required: true
  },
  {
    label: 'Form Name',
    name: 'name',
    type: 'text',
    placeholder: 'identity_claim',
    required: true,
    minLength: 4
  }
];

const FormTemplateEditor = ({ initialTemplate, onSave }: FormTemplateEditorProps) => {
  // Using alert instead of toast since useToast is not available in this version

  const { session, backend_url } = useStore(appStore);

  const [formFields, setFormFields] = useState<FormField[]>(initialTemplate?.fields || []);
  const [apiError, setApiError] = useState<string | null>(null);

  const defaultTemplate: FormTemplate = {
    id: '',
    name: '',
    title: '',
    fields: []
  };

  const initialValues = initialTemplate || {
    ...defaultTemplate,
    id: uuidv4()
  };

  const {
    handleSubmit,
    register,
    getValues,
    formState: { errors },
  } = useForm({
    defaultValues: initialValues
  })

  const handleFormSubmit = async () => {
    try {
      const formValues = getValues()
      formValues.fields = formFields
      // saveFormTemplate(formValues);
      // showToast('Form template saved', 'success');

      // send to server
      const url = `${backend_url}/templates`;

      const response = await axios.post(url, formValues, {
        headers: {
          "nonce": session?.nonce
        }
      });

      if (response.status === 200 || response.status === 201) {
        //  console.log("update state ...")


        toaster.create({
          description: `Form created successfully`,
          type: "success"
        })

        onSave();
      }





    } catch (error: any) {

      // Check if error is from axios with response data
      if (error.response && error.response.data) {
        // Check if there's a message property in the response data
        if (error.response.data.message) {
          let errorMessage = error.response.data.message;
          setApiError(errorMessage)
        }
      }


      toaster.create({
        description: `Form creation failure`,
        type: "error"
      })
    }
  };

  const addFormField = () => {
    const field: FormField = {
      id: uuidv4(),
      label: '',
      name: '',
      type: 'text',
      required: false
    };
    setFormFields(prev => [...prev, field]);
  };

  const updateFields = (index: number, fieldName: string, value: any) => {
    // Create a copy of the formFields array
    const updatedFields: any = [...formFields];

    // Create a copy of the field object at the specified index
    const updatedField = { ...updatedFields[index] };

    // Update the specified property
    updatedField[fieldName] = value;

    // Replace the old field with the updated one
    updatedFields[index] = updatedField;

    // Update the state with the new array
    setFormFields(updatedFields);
  };

  return (
    <Box borderRadius="lg">
      <Heading size="md" mb={4}>
        {initialTemplate ? 'Edit Form Template' : 'Create Form Template'}
      </Heading>
      {
        apiError ?
          <Alert title="An error occured" icon={<LuCross />}>
            <Group gap={"10"}>
              <Text>
                {apiError}
              </Text>
            </Group>
          </Alert> : <></>
      }
      <form onSubmit={handleSubmit(handleFormSubmit)}>
        <Stack>
          {templateFormFields.map((field) => (
            <Field key={field.name} label={field.label} errorText={errors[field.name as keyof FormTemplate]?.message}>
              <Input
                placeholder={field.placeholder}
                {...register(field.name as keyof FormTemplate, {
                  required: `${field.label} is required`,
                  minLength: field.minLength ? { value: field.minLength, message: `Minimum length should be ${field.minLength}` } : undefined,
                })}
              />
            </Field>
          ))}
          <Stack>
            <Heading size="md">Form Fields</Heading>
            {formFields.map((field, index) => (
              <Box key={index}>
                <SimpleGrid columns={{ base: 1, md: 4 }} gap={4}>
                  <Field label={`Label`} errorText={errors.fields?.[index]?.message}>
                    <Input
                      borderRadius={"sm"}
                      size={"xs"}
                      placeholder={"First Name"}
                      value={field.label}
                      onChange={(e) => updateFields(index, 'label', e.target.value)}
                    />
                  </Field>
                  <Field label={`Name`} errorText={errors.fields?.[index]?.message}>
                    <Input
                      borderRadius={"sm"}
                      size={"xs"}
                      placeholder={"first_name"}
                      value={field.name}
                      onChange={(e) => updateFields(index, 'name', e.target.value)}
                    />
                  </Field>
                  <Field label={`Type`} errorText={errors.fields?.[index]?.message}>
                    <CustomSelect
                      label="Type"
                      value={field.type}
                      onChange={(newVal: string) => updateFields(index, 'type', newVal)}
                    />
                  </Field>
                  <Field label={`Required`} errorText={errors.fields?.[index]?.message}>
                    <Switch
                      borderRadius={"sm"}
                      size={"md"}
                      label='Required'
                      checked={field.required}
                      onCheckedChange={(e) => updateFields(index, 'required', e.checked)}
                    />
                  </Field>
                  
                </SimpleGrid>
              </Box>
            ))}
          </Stack>
          <Group>
            <Button
              onClick={addFormField}
              colorPalette="blue"
              size={"sm"}
            >
              Add Form Field
            </Button>
            <Button
              type="submit"
              colorPalette="green"
            >
              Save
            </Button>
          </Group>
        </Stack>
      </form>
    </Box>
  )
}
export default FormTemplateEditor;
