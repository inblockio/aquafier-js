import React from 'react';
import { FormTemplate } from './types';
import { Card, CardContent, CardHeader } from "@/components/shadcn/ui/card";
import { Badge } from "@/components/shadcn/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/shadcn/ui/table";

interface FormTemplateViewerProps {
  template: FormTemplate;
}

const FormTemplateViewer: React.FC<FormTemplateViewerProps> = ({ template }) => {
  return (
    <Card className="shadow-sm">
      <CardHeader className="pb-2">
        <div>
          <h3 className="text-lg font-medium">{template.title}</h3>
          <p className="text-sm text-muted-foreground">Name: {template.name}</p>
        </div>
      </CardHeader>
      
      <CardContent>
        <div className="space-y-4">
          <div>
            <h4 className="text-sm font-medium mb-2">Fields ({template.fields.length})</h4>
            
            {template.fields.length === 0 ? (
              <p className="text-muted-foreground">No fields defined for this template.</p>
            ) : (
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Label</TableHead>
                      <TableHead>Name</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Required</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {template.fields.map((field) => (
                      <TableRow key={field.id}>
                        <TableCell>{field.label}</TableCell>
                        <TableCell>{field.name}</TableCell>
                        <TableCell>
                          <Badge variant="outline" className={field.type === 'text' ? 'bg-blue-50 text-blue-600 hover:bg-blue-50' : 'bg-purple-50 text-purple-600 hover:bg-purple-50'}>
                            {field.type}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {field.required ? (
                            <Badge variant="outline" className="bg-green-50 text-green-600 hover:bg-green-50">
                              Yes
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="bg-gray-50 text-gray-600 hover:bg-gray-50">
                              No
                            </Badge>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default FormTemplateViewer;
