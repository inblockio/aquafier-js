import { useState } from 'react'
import FormTemplateEditorShadcn from '@/components/aqua_forms/FormTemplateEditorShadcn'
import FormTemplateListShadcn from '@/components/aqua_forms/FormTemplateListShadcn'
import { FormTemplate } from '@/components/aqua_forms/types'
// import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Button } from '@/components/ui/button'
import { LuPlus } from 'react-icons/lu'
import { Dialog, DialogContent } from '../components/ui/dialog'
import { X } from 'lucide-react'
import { ScrollArea } from '@/components/ui/scroll-area'


const TemplatesPage = () => {
      // const [activeTab, setActiveTab] = useState<string>('list')
      const [openDialog, setOpenDialog] = useState<boolean>(false)
      const [selectedTemplate, setSelectedTemplate] = useState<FormTemplate | undefined>(undefined)
      const [isCreating, setIsCreating] = useState<boolean>(false)

      const handleEditTemplate = (template: FormTemplate) => {
            setSelectedTemplate(template)
            setIsCreating(false)
            setOpenDialog(true)
            // setActiveTab('editor')
      }

      const handleViewTemplate = (template: FormTemplate) => {
            setSelectedTemplate(template)
            // setActiveTab('editor')
            // Could implement a view-only mode here
      }

      const handleCreateNew = () => {
            setOpenDialog(true)
            setSelectedTemplate(undefined)
            setIsCreating(true)
            // setActiveTab('editor')
      }

      const handleSave = () => {
            // After saving, go back to the list view
            // setActiveTab('list')
             setOpenDialog(false)
            setIsCreating(false)
            setSelectedTemplate(undefined)
      }

      return (
            <div className="container mx-auto py-4">
                  <div className="flex justify-between items-center mb-6">
                        <h1 className="text-2xl font-bold">Form Templates</h1>
                        {/* {activeTab === 'list' && ( */}
                        <Button data-testid="action-create-template-button" onClick={handleCreateNew} className="flex items-center gap-2">
                              <LuPlus className="h-4 w-4" /> New Template
                        </Button>
                        {/* )} */}
                  </div>


                  <div className="mt-6">
                        <FormTemplateListShadcn onEdit={handleEditTemplate} onView={handleViewTemplate} onRefresh={() => { }} />
                  </div>

                  <Dialog
                        open={openDialog}
                        onOpenChange={openState => {
                              if (!openState) {
                                    setOpenDialog(false)
                              }
                        }}

                  >
                        <DialogContent

                              className="[&>button]:hidden !max-w-[65vw] !w-[65vw] h-[85vh] max-h-[85vh] sm:!max-w-[65vw] sm:!w-[65vw] sm:h-[85vh] sm:max-h-[85vh] flex flex-col" >
                              <div className="absolute top-4 right-4">
                                    <Button
                                          variant="ghost"
                                          size="icon"
                                          className="h-6 w-6 bg-red-500 text-white hover:bg-red-500 z-10 relative"
                                          onClick={() => {
                                                setOpenDialog(false)
                                                // setSelectedFileInfo(null)
                                          }}
                                    >
                                          <X className="h-4 w-4" />
                                    </Button>
                              </div>

                              <ScrollArea className="h-full">
                                    <FormTemplateEditorShadcn
                                          initialTemplate={selectedTemplate}
                                          onSave={handleSave}
                                          updating={!isCreating && (selectedTemplate !== undefined || selectedTemplate !== null)}
                                    />
                              </ScrollArea>


                        </DialogContent>
                  </Dialog>



                  {/* <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                        <TabsList className="grid w-full max-w-md grid-cols-2">
                              <TabsTrigger data-testid="templates-list-tab" value="list">
                                    Templates List
                              </TabsTrigger>
                              <TabsTrigger data-testid="templates-edito-tab" value="editor" disabled={!isCreating && !selectedTemplate}>
                                    Template Editor
                              </TabsTrigger>
                        </TabsList>

                        <TabsContent value="list" className="mt-6">
                              <FormTemplateListShadcn onEdit={handleEditTemplate} onView={handleViewTemplate} onRefresh={() => {}} />
                        </TabsContent>

                        <TabsContent value="editor" className="mt-6">
                              {(isCreating || selectedTemplate) && (
                                    <FormTemplateEditorShadcn
                                          initialTemplate={selectedTemplate || undefined}
                                          onSave={handleSave}
                                          updating={!isCreating && (selectedTemplate !== undefined || selectedTemplate !== null)}
                                    />
                              )} 
                        </TabsContent>
                  </Tabs> */}
            </div>
      )
}

export default TemplatesPage
