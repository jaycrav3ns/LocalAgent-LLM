import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useMutation, useQueryClient, useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

interface ModelSelectorModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentModel: string;
}

export default function ModelSelectorModal({ isOpen, onClose, currentModel }: ModelSelectorModalProps) {
  const [selectedModel, setSelectedModel] = useState(currentModel);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: modelsResult } = useQuery({
    queryKey: ["/api/models"],
    enabled: isOpen,
  });

  const availableModels = modelsResult?.success 
    ? JSON.parse(modelsResult.output).map((model: string) => ({
        name: model,
        displayName: model.replace(':latest', '').replace('-', ' ').toUpperCase(),
        description: getModelDescription(model)
      }))
    : [];

  function getModelDescription(model: string): string {
    if (model.includes('deepseek')) return 'Reasoning model for complex problems';
    if (model.includes('llama')) return 'General purpose conversational AI';
    if (model.includes('codellama')) return 'Specialized for code generation';
    if (model.includes('gemma')) return 'Google\'s efficient language model';
    return 'AI language model';
  }

  const updateModelMutation = useMutation({
    mutationFn: async (model: string) => {
      const response = await apiRequest("PATCH", "/api/user/preferences", { currentModel: model });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
      toast({
        title: "Success",
        description: "Model updated successfully",
      });
      onClose();
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update model",
        variant: "destructive",
      });
    },
  });

  const handleSubmit = () => {
    if (selectedModel !== currentModel) {
      updateModelMutation.mutate(selectedModel);
    }
  };

  const handleClose = () => {
    setSelectedModel(currentModel);
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="bg-[var(--primary-dark)] border-gray-600 max-w-lg max-h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="text-[var(--text-primary)]">Select AI Model</DialogTitle>
        </DialogHeader>
        
        <div className="flex-1 overflow-y-auto space-y-3 pr-2">
          {availableModels.map((model) => (
            <div
              key={model.name}
              className={`bg-[var(--bg-main)] rounded-lg p-4 border cursor-pointer hover:bg-gray-700 transition-colors ${
                selectedModel === model.name ? 'border-primary' : 'border-gray-600'
              }`}
              onClick={() => setSelectedModel(model.name)}
            >
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-medium text-[var(--text-primary)]">{model.displayName}</h4>
                  <p className="text-sm text-[var(--text-muted)]">{model.description}</p>
                </div>
                {selectedModel === model.name && (
                  <i className="fas fa-check text-primary"></i>
                )}
              </div>
            </div>
          ))}
        </div>
        
        <div className="flex space-x-3 pt-6 border-t border-gray-600 mt-4">
          <Button 
            className="flex-1 bg-primary hover:bg-primary/80"
            onClick={handleSubmit}
            disabled={selectedModel === currentModel || updateModelMutation.isPending}
          >
            {updateModelMutation.isPending ? (
              <>
                <div className="loading-spinner w-4 h-4 border-2 border-white border-t-transparent rounded-full mr-2"></div>
                Updating...
              </>
            ) : (
              "Select Model"
            )}
          </Button>
          <Button 
            variant="outline"
            onClick={handleClose}
            className="border-gray-600 hover:bg-gray-600"
            disabled={updateModelMutation.isPending}
          >
            Cancel
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
