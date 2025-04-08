export interface FormField {
  id: string;
  label: string;
  name: string;
  type: 'text' | 'number';
  required: boolean;
}

export interface FormTemplate {
  id: string;
  name: string;
  title: string;
  fields: FormField[];
}
