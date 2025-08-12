import { FormTemplate } from '../aqua_forms'
import { HiDocumentPlus } from 'react-icons/hi2'

const FormTemplateCard = ({ template, selectTemplateCallBack }: { template: FormTemplate; selectTemplateCallBack: (template: FormTemplate) => void }) => {
      return (
            <div
                  id={template.name}
                  data-testid={template.name}
                  className="h-[120px] p-4 cursor-pointer border-2 border-dashed rounded-md flex flex-col items-center justify-center transition-colors duration-200 border-gray-300 bg-gray-50 hover:bg-gray-200 dark:border-gray-600 dark:bg-black/50 dark:hover:bg-black/70"
                  onClick={() => {
                        selectTemplateCallBack(template)
                  }}
            >
                  <div className="flex flex-col items-center justify-center h-full">
                        <h3 className="text-center mb-2 mx-2 font-bold">{template.title}</h3>
                        <div className="mt-2 rounded-full flex items-center justify-center">
                              <HiDocumentPlus size={'32px'} />
                        </div>
                  </div>
            </div>
      )
}

export default FormTemplateCard