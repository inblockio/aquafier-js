export interface FormFieldArrayItems {
      name: string
      data: string
}
export interface FormFieldArray {
      name: string
      items: Array<FormFieldArrayItems>
}
export interface FormField {
      id: string
      label: string
      name: string
      type: 'text' | 'number' | 'date' | 'file' | 'image' | 'document' | 'domain' | 'wallet_address' | 'signature' | 'email'  | 'scratchpad' | 'options'
      required: boolean
      is_array: boolean
      is_hidden?: boolean
      is_editable?: boolean
      is_verifiable?: boolean
      description?: string
      support_text?: string
      default_value?: string
      // dependsOn?: {
      //       field: string
      //       value: string
      // }
      depend_on_field?: string
      depend_on_value?: string
    options?: Array<{ value: string, label: string }> // For 'options' type fields
}

export interface FormTemplate {
      id: string
      name: string
      title: string
      subtitle: string
      fields: FormField[]
      public?: boolean
}
