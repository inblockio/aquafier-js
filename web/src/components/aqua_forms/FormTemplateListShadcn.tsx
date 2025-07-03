import React, { useEffect, useState } from 'react';
import { FormTemplate } from './types';
import { useStore } from "zustand";
import appStore from "../../store";
import { toast } from "sonner";
import { LuEye, LuPen, LuTrash } from 'react-icons/lu';
import axios from 'axios';

// shadcn/ui components
import { Button } from "@/components/shadcn/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/shadcn/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/shadcn/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/shadcn/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/shadcn/ui/alert-dialog";

interface FormTemplateListShadcnProps {
  onEdit: (template: FormTemplate) => void;
  onView: (template: FormTemplate) => void;
  onRefresh: () => void;
}

const FormTemplateListShadcn = ({ onEdit, onView }: FormTemplateListShadcnProps) => {
  const { formTemplates, backend_url, setFormTemplate, session } = useStore(appStore);
  
  const [templateToDelete, setTemplateToDelete] = useState<FormTemplate | null>(null);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const handleDeleteClick = (template: FormTemplate) => {
    setTemplateToDelete(template);
    setIsDeleteDialogOpen(true);
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

  const loadTemplates = async () => {
    setIsLoading(true);
    
    try {
      const url = `${backend_url}/templates`;
      const response = await axios.get(url, {
        headers: {
          "nonce": session?.nonce
        }
      });

      if (response.status === 200 || response.status === 201) {
        const loadedTemplates: FormTemplate[] = response.data.data;
        setFormTemplate(loadedTemplates);
      }
    } catch (error) {
      toast.error(
        'Error loading templates', 
        { description: error instanceof Error ? error.message : 'Unknown error' }
      );
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadTemplates();
  }, []);


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
                {formTemplates.map((template) => (
                  <TableRow key={template.id}>
                    <TableCell>{template.title}</TableCell>
                    <TableCell>{template.name}</TableCell>
                    <TableCell>{template.fields.length}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => onView(template)}
                          title="View template"
                        >
                          <LuEye className="h-4 w-4" />
                        </Button>
                        
                        {!template.public && (
                          <>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => onEdit(template)}
                              title="Edit template"
                            >
                              <LuPen className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="text-red-500 hover:text-red-700 hover:bg-red-50"
                              onClick={() => handleDeleteClick(template)}
                              title="Delete template"
                            >
                              <LuTrash className="h-4 w-4" />
                            </Button>
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
