// import { FormTemplate } from './types/types';

// const STORAGE_KEY = 'aqua_form_templates';

// export const getFormTemplates = (): FormTemplate[] => {
//   const templates = localStorage.getItem(STORAGE_KEY);
//   return templates ? JSON.parse(templates) : [];
// };

// export const saveFormTemplate = (template: FormTemplate): void => {
//   const templates = getFormTemplates();
//   const existingIndex = templates.findIndex(t => t.id === template.id);

//   if (existingIndex >= 0) {
//     // Update existing template
//     templates[existingIndex] = template;
//   } else {
//     // Add new template
//     templates.push(template);
//   }

//   localStorage.setItem(STORAGE_KEY, JSON.stringify(templates));
// };

// export const deleteFormTemplate = (id: string): void => {
//   const templates = getFormTemplates();
//   const filteredTemplates = templates.filter(t => t.id !== id);
//   localStorage.setItem(STORAGE_KEY, JSON.stringify(filteredTemplates));
// };

// export const getFormTemplateById = (id: string): FormTemplate | undefined => {
//   const templates = getFormTemplates();
//   return templates.find(t => t.id === id);
// };
