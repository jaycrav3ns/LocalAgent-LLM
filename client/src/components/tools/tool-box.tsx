import React, { useState } from 'react';
import axios from 'axios';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from "@/hooks/use-toast";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import {
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter
} from '@/components/ui/dialog';
import { ToolRegistryTable, ToolEntry } from '@/components/ToolRegistryTable';

interface ToolForm {
  schema: string; // Store as JSON string
}

const schemaExample = JSON.stringify({
  name: "run_ocr",
  description: "Runs Tesseract OCR on a local image file to extract text. The output is saved to a new file with the same name but a .txt extension.",
  input_schema: {
    type: "object",
    properties: {
      input_file: {
        type: "string",
        description: "The absolute path to the image file to process with OCR."
      }
    },
    required: ["input_file"]
  },
  output_schema: {
    type: "string",
    description: "Returns a confirmation message with the path to the newly created text file."
  }
}, null, 2);

const ToolsPanel = () => {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const { toast } = useToast();
  const [newTool, setNewTool] = useState<ToolForm>({ schema: '' });

  const handleCreateTool = async () => {
    try {
      const parsedSchema = JSON.parse(newTool.schema);

      const toolPayload = {
        name: parsedSchema.name,
        description: parsedSchema.description,
        input_schema: parsedSchema.input_schema,
        output_schema: parsedSchema.output_schema,
      };

      if (!toolPayload.name || !toolPayload.description || !toolPayload.input_schema) {
        toast({
          variant: "destructive",
          title: "Invalid Schema",
          description: "The JSON schema must contain 'name', 'description', and 'input_schema' properties.",
        });
        return;
      }

      await axios.post('/api/tools', toolPayload);
      // Refresh the tool list after creating a new tool
      // ... (fetch tools again)
      setIsDialogOpen(false);
      setNewTool({ schema: '' }); // Reset form
    } catch (error) {
      console.error("Error creating tool:", error);
      toast({
        variant: "destructive",
        title: "Error Creating Tool",
        description: error instanceof Error ? error.message : "An unknown error occurred.",
      });
    }
  };

  return (
    <div>
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogTrigger asChild>
          <Button>Add Tool</Button>
        </DialogTrigger>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Create New Tool</DialogTitle>
            <DialogDescription>Define a new tool using a single JSON schema.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-start gap-4">
              <div className="flex items-center gap-2 pt-2">
                 <label htmlFor="schema">JSON Schema</label>
                 <TooltipProvider>
                    <Tooltip>
                        <TooltipTrigger asChild>
                            <i className="fa-regular fa-circle-question cursor-pointer"></i>
                        </TooltipTrigger>
                        <TooltipContent className="max-w-md">
                            <p className="mb-2 font-bold">Example Schema:</p>
                            <pre className="text-xs bg-gray-900 p-2 rounded">{schemaExample}</pre>
                        </TooltipContent>
                    </Tooltip>
                 </TooltipProvider>
              </div>
              <Textarea id="schema" value={newTool.schema} onChange={e => setNewTool({ schema: e.target.value })} className="col-span-3 font-mono text-xs" rows={20} />
            </div>
          </div>
          <DialogFooter>
            <Button type="button" onClick={handleCreateTool}>Create</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* Tool Registry Table */}
      <div className="mt-8">
        <h3 className="text-lg font-semibold mb-4">Registered Tools</h3>
        <ToolRegistryTable
          onEdit={(tool: ToolEntry) => console.log("Edit tool:", tool)}
          onDelete={(tool: ToolEntry) => console.log("Delete tool:", tool)}
        />
      </div>
    </div>
  );
};

export default ToolsPanel;
