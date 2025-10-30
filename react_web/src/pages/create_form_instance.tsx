import { FormTemplate } from '@/components/aqua_forms'
import CreateFormFromTemplate from '@/components/aqua_forms/CreateFormFromTemplate'

import appStore from '@/store'
import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { useStore } from 'zustand'

const CreateFormInstance = () => {
      const { formTemplates } = useStore(appStore)
      const [selectedTemplate, setSelectedTemplate] = useState<FormTemplate | null>(null)

      const { templateName } = useParams()

      useEffect(() => {
            if (formTemplates.length !== 0) {
                  if (templateName) {
                        const template = formTemplates.find(template => template.name === templateName)
                        if (template) {
                              setSelectedTemplate(template)
                        }
                  }
            }
      }, [templateName, formTemplates])

      return (
            <div className="container mx-auto max-w-5xl py-8">
                  <div className="bg-gray-100 p-4 rounded-lg">
                        {selectedTemplate && <CreateFormFromTemplate selectedTemplate={selectedTemplate} callBack={() => setSelectedTemplate(null)} openCreateTemplatePopUp={false} />}
                  </div>
            </div>
      )
}

export default CreateFormInstance
