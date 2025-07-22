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
    type:
        | 'text'
        | 'number'
        | 'date'
        | 'file'
        | 'image'
        | 'document'
        | 'wallet_address'
    required: boolean
    is_array: boolean
    is_hidden?: boolean
    is_editable?: boolean
    description?: string
    support_text?: string
}

export interface FormTemplate {
    id: string
    name: string
    title: string
    fields: FormField[]
    public?: boolean
}
