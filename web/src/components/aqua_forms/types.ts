export interface FormField {
  id: string;
  label: string;
  name: string;
  type: 'text' | 'number' | 'date' | 'file' | 'wallet_address';
  required: boolean;
}

export interface FormTemplate {
  id: string;
  name: string;
  title: string;
  fields: FormField[];
  public?: boolean;
}


