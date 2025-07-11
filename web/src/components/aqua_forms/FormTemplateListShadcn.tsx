import {  useState } from 'react';
import { FormTemplate } from './types';
import { useStore } from "zustand";
import appStore from "../../store";
import { toast } from "sonner";
import { LuEye, LuPen, LuTrash } from 'react-icons/lu';
import axios from 'axios';

// /components//ui components
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogClose } from "@/components/ui/dialog";
import FormTemplateViewer from './FormTemplateViewer';
import CreateFormFromTemplate from './CreateFormFromTemplate';
import { MdFormatListBulletedAdd } from "react-icons/md";
import CustomTooltip from '../ui/CustomTooltip';

interface FormTemplateListShadcnProps {
  onEdit: (template: FormTemplate) => void;
  onView: (template: FormTemplate) => void;
  onRefresh: () => void;
}

const FormTemplateListShadcn = ({ onEdit }: FormTemplateListShadcnProps) => {
  const { formTemplates, backend_url, setFormTemplate, session } = useStore(appStore);

  const [templateToDelete, setTemplateToDelete] = useState<FormTemplate | null>(null);
  const [templateToView, setTemplateToView] = useState<FormTemplate | null>(null);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false);
  const [viewType, setViewType] = useState<'template_view' | 'create_instance'>("template_view");
  const [isLoading, setIsLoading] = useState(false);

  const handleDeleteClick = (template: FormTemplate) => {
    setTemplateToDelete(template);
    setIsDeleteDialogOpen(true);
  };

  const handleViewClick = (template: FormTemplate, viewType: 'template_view' | 'create_instance') => {
    setTemplateToView(template);
    setViewType(viewType);
    setIsViewDialogOpen(true);
  };

  const confirmDelete = async () => {
    if (!templateToDelete) return;

    if (templateToDelete.public) {
      toast.info('Public template cannot be deleted');
      setIsDeleteDialogOpen(false);
      return;
    }

    setIsLoading(true);

    try {
      const res = await axios.delete(`${backend_url}/templates/${templateToDelete.id}`, {
        headers: {
          "nonce": session?.nonce
        }
      });

      if (res.status === 200 || res.status === 201) {
        toast.success('Template deleted successfully');
        // Update the templates list by filtering out the deleted one
        setFormTemplate(formTemplates.filter(t => t.id !== templateToDelete.id));
      }
    } catch (error) {
      toast.error(
        'Error deleting template',
        { description: error instanceof Error ? error.message : 'Unknown error' }
      );
    } finally {
      setIsLoading(false);
      setIsDeleteDialogOpen(false);
    }
  };


  return (
    <Card className="w-full shadow-sm">
      <CardHeader>
        <CardTitle>Form Templates</CardTitle>
      </CardHeader>
      <CardContent>
        {formTemplates.length === 0 ? (
          <div className="p-8 text-center text-muted-foreground">
            No form templates found. Create your first template!
          </div>
        ) : (
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Title</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>Fields</TableHead>
                  <TableHead className="w-[100px]">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {formTemplates.sort((a, b) => a.title.localeCompare(b.title)).map((template) => (
                  <TableRow key={template.id}>
                    <TableCell>{template.title}</TableCell>
                    <TableCell>{template.name}</TableCell>
                    <TableCell>{template.fields.length}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <CustomTooltip content="Create form instance">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleViewClick(template, "create_instance")}
                            // title="View template"
                            className="cursor-pointer"
                          >
                            <MdFormatListBulletedAdd className="h-4 w-4" />
                          </Button>
                        </CustomTooltip>
                        <CustomTooltip content="View template">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleViewClick(template, "template_view")}
                            // title="View template"
                            className="cursor-pointer"
                          >
                            <LuEye className="h-4 w-4" />
                          </Button>
                        </CustomTooltip>
                        {!template.public && (
                          <>
                            <CustomTooltip content="Edit template">
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => onEdit(template)}
                                // title="Edit template"
                                className="cursor-pointer"
                              >
                                <LuPen className="h-4 w-4" />
                              </Button>
                            </CustomTooltip>
                            <CustomTooltip content="Delete template">
                              <Button
                                variant="ghost"
                                size="icon"
                                className="text-red-500 hover:text-red-700 hover:bg-red-50 cursor-pointer"
                                onClick={() => handleDeleteClick(template)}
                              // title="Delete template"
                              >
                                <LuTrash className="h-4 w-4" />
                              </Button>
                            </CustomTooltip>
                          </>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}

        <Dialog open={isViewDialogOpen} onOpenChange={setIsViewDialogOpen}>
          <DialogContent className="sm:max-w-[700px] max-h-[90vh] flex flex-col">
            <DialogHeader className="flex-shrink-0">
              <DialogTitle>
                {viewType === "template_view" ? "Template Details" : "Create Form Instance"}
              </DialogTitle>
            </DialogHeader>

            <div className="flex-grow overflow-y-auto py-4">
              {viewType === "template_view" && templateToView && <FormTemplateViewer template={templateToView} />}

              {viewType === "create_instance" && templateToView && <CreateFormFromTemplate selectedTemplate={templateToView} callBack={() => {
                setIsViewDialogOpen(false)
              }} openCreateTemplatePopUp={true} />}
            </div>

            <DialogFooter className="flex-shrink-0 mt-2">
              <DialogClose asChild>
                <Button variant="outline">Close</Button>
              </DialogClose>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete Form Template</AlertDialogTitle>
              <AlertDialogDescription>
                Are you sure you want to delete the "{templateToDelete?.title}" template?
                This action cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel
                data-testid="cancel-delete-form-action-button"
                disabled={isLoading}
              >
                Cancel
              </AlertDialogCancel>
              <AlertDialogAction
                data-testid="delete-form-action-button"
                onClick={confirmDelete}
                className="bg-red-500 hover:bg-red-600 focus:ring-red-500"
                disabled={isLoading}
              >
                {isLoading ? "Deleting..." : "Delete"}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </CardContent>
    </Card>
  );
};

export default FormTemplateListShadcn;
