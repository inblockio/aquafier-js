import { useState } from 'react';
import FormTemplateEditorShadcn from "@/components/aqua_forms/FormTemplateEditorShadcn";
import FormTemplateListShadcn from "@/components/aqua_forms/FormTemplateListShadcn";
import { FormTemplate } from "@/components/aqua_forms/types";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/shadcn/ui/tabs";
import { Button } from "@/components/shadcn/ui/button";
import { LuPlus } from 'react-icons/lu';

const TemplatesPage = () => {
  const [activeTab, setActiveTab] = useState<string>("list");
  const [selectedTemplate, setSelectedTemplate] = useState<FormTemplate | undefined>(undefined);
  const [isCreating, setIsCreating] = useState<boolean>(false);

  const handleEditTemplate = (template: FormTemplate) => {
    setSelectedTemplate(template);
    setIsCreating(false);
    setActiveTab("editor");
  };

  const handleViewTemplate = (template: FormTemplate) => {
    setSelectedTemplate(template);
    setActiveTab("editor");
    // Could implement a view-only mode here
  };

  const handleCreateNew = () => {
    setSelectedTemplate(undefined);
    setIsCreating(true);
    setActiveTab("editor");
  };

  const handleSave = () => {
    // After saving, go back to the list view
    setActiveTab("list");
    setIsCreating(false);
    setSelectedTemplate(undefined);
  };

  return (
    <div className="container mx-auto py-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Form Templates</h1>
        {activeTab === "list" && (
          <Button 
            onClick={handleCreateNew}
            className="flex items-center gap-2"
          >
            <LuPlus className="h-4 w-4" /> Create New Template
          </Button>
        )}
      </div>
      
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full max-w-md grid-cols-2">
          <TabsTrigger value="list">Templates List</TabsTrigger>
          <TabsTrigger value="editor" disabled={!isCreating && !selectedTemplate}>Template Editor</TabsTrigger>
        </TabsList>
        
        <TabsContent value="list" className="mt-6">
          <FormTemplateListShadcn 
            onEdit={handleEditTemplate} 
            onView={handleViewTemplate}
            onRefresh={() => {}} 
          />
        </TabsContent>
        
        <TabsContent value="editor" className="mt-6">
          {(isCreating || selectedTemplate) && (
            <FormTemplateEditorShadcn 
              initialTemplate={selectedTemplate || undefined} 
              onSave={handleSave} 
              updating={!isCreating && selectedTemplate !== undefined || selectedTemplate !== null}
            />
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default TemplatesPage;