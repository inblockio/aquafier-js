export interface FormFieldArrayItems {
  name: string;
  data: string

}
export interface FormFieldArray {
  name: string;
  items : Array<FormFieldArrayItems>
}
export interface FormField {
  id: string;
  label: string;
  name: string;
  type: 'text' | 'number' | 'date' | 'file'| 'image' | 'wallet_address';
  required: boolean;
  is_array :  boolean;
}

export interface FormTemplate {
  id: string;
  name: string;
  title: string;
  fields: FormField[];
  public?: boolean;
}


