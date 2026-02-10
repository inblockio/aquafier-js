import {v4 as uuidv4} from 'uuid'
import {FormField, FormTemplate} from './types'
import {useForm} from 'react-hook-form'
import {useEffect, useState} from 'react'
import apiClient from '@/api/axiosInstance'
import {useStore} from 'zustand'
import appStore from '../../store'
import {toast} from 'sonner'
import {LuPlus, LuTrash} from 'react-icons/lu'
import {ApiFileInfo} from '../../models/FileInfo'

// /components//ui components
import {Input} from '@/components/ui/input'
import {Button} from '@/components/ui/button'
import {Label} from '@/components/ui/label'
import {Switch} from '@/components/ui/switch'
import {Alert, AlertDescription, AlertTitle} from '@/components/ui/alert'
import {Select, SelectContent, SelectItem, SelectTrigger, SelectValue} from '@/components/ui/select'
import {AlertCircle} from 'lucide-react'
import { ensureDomainUrlHasSSL } from '@/utils/functions'

const fieldTypes = [
      { label: 'Text', value: 'text' },
      { label: 'Number', value: 'number' },
      { label: 'File', value: 'file' },
      { label: 'Date', value: 'date' },
      { label: 'Wallet Address', value: 'wallet_address' },
]

interface ICustomSelect {
      id: string
      label: string
      onChange: (value: string) => void
      value: string
}

const CustomSelect = ({ id, label, onChange, value }: ICustomSelect) => {
      return (
            <div className="w-full">
                  <Select data-testid={id} value={value} onValueChange={onChange}>
                        <SelectTrigger className="w-full">
                              <SelectValue placeholder={label} />
                        </SelectTrigger>
                        <SelectContent>
                              {fieldTypes.map(fieldType => (
                                    <SelectItem key={fieldType.value} value={fieldType.value}>
                                          {fieldType.label}
                                    </SelectItem>
                              ))}
                        </SelectContent>
                  </Select>
            </div>
      )
}

interface FormTemplateEditorShadcnProps {
      initialTemplate?: FormTemplate
      onSave: () => void
      updating?: boolean
}

const templateFormFields = [
      {
            label: 'Form Title',
            name: 'title',
            type: 'text',
            placeholder: 'Identity Claim',
            required: true,
      },
      {
            label: 'Form Name',
            name: 'name',
            type: 'text',
            placeholder: 'identity_claim',
            required: true,
            minLength: 4,
      },
]
 
const FormTemplateEditorShadcn = ({ initialTemplate, onSave, updating }: FormTemplateEditorShadcnProps) => {
      const { session, backend_url, setFormTemplate, formTemplates, setSystemFileInfo, systemFileInfo } = useStore(appStore)

      const [formFields, setFormFields] = useState<FormField[]>(initialTemplate?.fields || [])
      const [apiError, setApiError] = useState<string | null>(null)
      const [isSubmitting, setIsSubmitting] = useState(false)

      const defaultTemplate: FormTemplate = {
            id: '',
            name: '',
            title: '',
            subtitle: '',
            fields: [],
      }

      const initialValues = initialTemplate || {
            ...defaultTemplate,
            id: uuidv4(),
      }

      const form = useForm({
            defaultValues: initialValues,
      })

      const {
            handleSubmit,
            register,
            getValues,
            formState: { errors },
            watch,
            setValue,
      } = form

      const handleFormSubmit = async () => {
            try {
                  setIsSubmitting(true)

                  // Check if form has validation errors
                  const formErrors = Object.keys(errors)
                  if (formErrors.length > 0) {
                        toast.error('Please fix the form errors before submitting')
                        return
                  }

                  const formValues = getValues()
                  formValues.fields = formFields

                  if (formFields.length === 0) {
                        toast.error('Form must have at least one field')
                        return
                  }

                  // send to server
                  let url = ensureDomainUrlHasSSL(`${backend_url}/templates`)
                  let method = 'post'
                  if (updating || initialTemplate) {
                        url += `/${initialTemplate?.id}`
                        method = 'put'
                  }

                  const response = await apiClient.request({
                        method,
                        url,
                        data: formValues,
                        headers: {
                              nonce: session?.nonce,
                        },
                  })

                  if (response.status === 200 || response.status === 201) {
                        if (updating) {
                              setFormTemplate(formTemplates.map(template => (template.id === initialTemplate?.id ? formValues : template)))
                        } else {
                              setFormTemplate([...formTemplates, formValues])
                        }

                        if (response.data.data) {
                              const templateTree: ApiFileInfo = response.data.data
                              setSystemFileInfo([...systemFileInfo, templateTree])
                        }
                        if (updating) {
                              toast.success('Form template updated successfully')
                        } else {
                              toast.success('Form template created successfully')
                        }
                        onSave()
                  }
            } catch (error: any) {
                  // Check if error is from axios with response data
                  if (error.response && error.response.data) {
                        // Check if there's a message property in the response data
                        if (error.response.data.message) {
                              const errorMessage = error.response.data.message
                              setApiError(errorMessage)
                        }
                  }

                  toast.error('Failed to ' + (updating ? 'update' : 'create') + ' form template')
            } finally {
                  setIsSubmitting(false)
            }
      }

      const addFormField = () => {
            const field: FormField = {
                  id: uuidv4(),
                  label: '',
                  name: '',
                  type: 'text',
                  required: false,
                  is_array: false,
            }
            setFormFields(prev => [...prev, field])
      }

      const updateFields = (index: number, fieldName: string, value: any) => {
            // Create a copy of the formFields array
            const updatedFields: any = [...formFields]

            // Create a copy of the field object at the specified index
            const updatedField = { ...updatedFields[index] }

            // Update the specified property
            updatedField[fieldName] = value

            if (fieldName === 'label') {
                  updatedField.name = value.toLowerCase().replace(/\s+/g, '_')
            }

            // Replace the old field with the updated one
            updatedFields[index] = updatedField

            // Update the state with the new array
            setFormFields(updatedFields)
      }

      const deleteField = (index: number) => {
            const updatedFields = [...formFields]
            updatedFields.splice(index, 1)
            setFormFields(updatedFields)
      }

      useEffect(() => {
            const title = getValues('title')
            const name = title.toLowerCase().replace(/\s+/g, '_')
            setValue('name', name)
      }, [watch('title'), setValue, getValues])

      return (
            <div>
                  <div className="text-lg mb-5">{initialTemplate ? 'Edit Form Template' : 'Create Form Template'}</div>
                  {apiError && (
                        <Alert variant="destructive" className="mb-6">
                              <AlertCircle className="h-4 w-4" />
                              <AlertTitle>Error</AlertTitle>
                              <AlertDescription>{apiError}</AlertDescription>
                        </Alert>
                  )}

                  {/* <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-6"> */}
                  <form
                        onSubmit={handleSubmit(handleFormSubmit, errors => {
                              console.error('Form validation errors:', errors)
                              // This function runs when validation fails
                              toast.error('Please fix the form errors before submitting (more thatn 3 characters  and atleast one form field is required)')
                        })}
                        className="space-y-6"
                  >
                        {/* Template Form Fields */}
                        <div className="space-y-4">
                              {templateFormFields.map(field => (
                                    <div key={field.name} className={field.name === 'name' ? 'hidden' : ''}>
                                          <div className="space-y-2">
                                                <Label htmlFor={field.name}>{field.label}</Label>
                                                <Input
                                                      id={field.name}
                                                      placeholder={field.placeholder}
                                                      {...register(field.name as keyof FormTemplate, {
                                                            required: `${field.label} is required`,
                                                            minLength: field.minLength
                                                                  ? {
                                                                          value: field.minLength,
                                                                          message: `Minimum length should be ${field.minLength}`,
                                                                    }
                                                                  : undefined,
                                                      })}
                                                      disabled={field.name === 'name'}
                                                      className="w-full"
                                                />
                                                {errors[field.name as keyof FormTemplate] && <p className="text-sm text-red-500">{errors[field.name as keyof FormTemplate]?.message as string}</p>}
                                          </div>
                                    </div>
                              ))}
                        </div>

                        {/* Form Fields Section */}
                        <div className="space-y-4">
                              <h3 className="text-lg font-medium">Form Fields</h3>

                              {formFields.map((field, index) => (
                                    <div key={index} className="border border-gray-200 rounded-lg p-4 relative">
                                          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                                {/* Label Field */}
                                                <div className="space-y-2">
                                                      <Label htmlFor={`field-label-${index}`}>Label</Label>
                                                      <Input
                                                            data-testid={'field-label-' + index}
                                                            id={`field-label-${index}`}
                                                            placeholder="Document | Name | Email | Wallet Address | etc."
                                                            value={field.label}
                                                            onChange={e => updateFields(index, 'label', e.target.value)}
                                                            className="w-full"
                                                      />
                                                </div>

                                                {/* Type Field */}
                                                <div className="space-y-2">
                                                      <Label htmlFor={`field-type-for-${index}`}>Type</Label>
                                                      <CustomSelect id={`field-type-${index}`} label="Select type" value={field.type} onChange={newVal => updateFields(index, 'type', newVal)} />
                                                </div>

                                                {/* Required Field */}
                                                <div className="flex items-center space-x-2 h-full pt-8">
                                                      <Switch id={`field-required-${index}`} checked={field.required} onCheckedChange={checked => updateFields(index, 'required', checked)} />
                                                      <Label htmlFor={`field-required-${index}`}>Required</Label>
                                                </div>
                                          </div>

                                          {/* Delete Button */}
                                          <Button type="button" data-testid={'delete-form-template' + index} id={"delete-form-template-id-"+index} variant="ghost" size="icon" className="absolute top-2 right-2 text-red-500 hover:text-red-700 hover:bg-red-50" onClick={() => deleteField(index)}>
                                                <LuTrash className="h-4 w-4" />
                                          </Button>
                                    </div>
                              ))}
                        </div>

                        {/* Action Buttons */}
                        <div className="flex justify-between pt-4">
                              <Button type="button" variant="outline" onClick={addFormField} className="flex items-center gap-2" data-testid="add-form-action-button">
                                    <LuPlus className="h-4 w-4" />
                                    Add Form Field
                              </Button>

                              <Button type="submit" disabled={isSubmitting} className="bg-primary hover:bg-primary/90" data-testid="save-form-action-button">
                                    {isSubmitting ? 'Saving...' : 'Save'}
                              </Button>
                        </div>
                  </form>
            </div>
            //   </CardContent>
            // </Card>
      )
}

export default FormTemplateEditorShadcn
