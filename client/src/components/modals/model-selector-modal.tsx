import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useMutation, useQueryClient, useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";

interface ModelSelectorModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentModel: string;
}

interface ApiResponse {
  success: boolean;
  output?: any;
  error?: string;
}

export default function ModelSelectorModal({ isOpen, onClose, currentModel }: ModelSelectorModalProps) {
  const [selectedModel, setSelectedModel] = useState(currentModel);
  const [geminiApiKey, setGeminiApiKey] = useState("");
  
  const [newOpenRouterModel, setNewOpenRouterModel] = useState("");
  const [newOpenRouterApiKey, setNewOpenRouterApiKey] = useState("");
  const [selectedOpenRouterModel, setSelectedOpenRouterModel] = useState(
    currentModel.startsWith("openrouter/") ? currentModel : ""
  );

  const [activeTab, setActiveTab] = useState("local");
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: user } = useQuery({
    queryKey: ["/api/auth/user"],
    queryFn: async () => {
      const res = await apiRequest('GET', '/api/auth/user');
      if (!res.ok) {
        throw new Error('Failed to fetch user data');
      }
      return res.json();
    },
    enabled: isOpen,
  });

  const savedOpenRouterModels = user?.preferences?.openRouterApiKeys || {};

  const { data: modelsResult } = useQuery<ApiResponse>({
    queryKey: ["/api/models", geminiApiKey, JSON.stringify(savedOpenRouterModels)],
    queryFn: async () => {
      try {
        const res = await apiRequest('GET', '/api/models');
        const data = await res.json();
        return data;
      } catch (err) {
        console.error('Models fetch error:', err);
        toast({ title: 'Error', description: 'Failed to load models', variant: 'destructive' });
        return { success: false, error: 'Failed to load models' };
      }
    },
    enabled: isOpen,
  });

  const modelsData = modelsResult?.success
    ? JSON.parse(modelsResult.output)
    : { local: [], gemini: [] };

  const localModels = modelsData.local?.map((model: string) => ({
    name: model,
    displayName: model.replace(':latest', '').replace('-', ' ').toUpperCase(),
    description: getModelDescription(model)
  })) || [];

  const geminiModels = modelsData.gemini?.map((model: string) => ({
    name: model,
    displayName: model.replace('-', ' ').toUpperCase(),
    description: getModelDescription(model)
  })) || [];

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

  const saveApiKeyMutation = useMutation({
    mutationFn: async (apiKey: string) => {
      const response = await apiRequest("PATCH", "/api/user/preferences", { geminiApiKey: apiKey });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
      queryClient.invalidateQueries({ queryKey: ["/api/models"] });
      toast({
        title: "Success",
        description: "API Key saved successfully",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to save API Key",
        variant: "destructive",
      });
    },
  });

  const addOpenRouterModelMutation = useMutation({
    mutationFn: async ({ apiKey, model }: { apiKey: string; model: string }) => {
      const userRes = await apiRequest("GET", "/api/auth/user");
      const user = await userRes.json();
      const currentApiKeys = user.preferences?.openRouterApiKeys || {};

      const updatedPreferences = {
        ...user.preferences,
        openRouterApiKeys: {
          ...currentApiKeys,
          [model]: apiKey
        }
      };

      const response = await apiRequest("PATCH", "/api/user/preferences", updatedPreferences);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
      queryClient.invalidateQueries({ queryKey: ["/api/models"] });
      toast({
        title: "Success",
        description: "OpenRouter model saved successfully",
      });
      setNewOpenRouterModel("");
      setNewOpenRouterApiKey("");
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to save OpenRouter model",
        variant: "destructive",
      });
    },
  });

  const deleteOpenRouterModelMutation = useMutation({
    mutationFn: async (model: string) => {
      const userRes = await apiRequest("GET", "/api/auth/user");
      const user = await userRes.json();
      const currentApiKeys = user.preferences?.openRouterApiKeys || {};
      delete currentApiKeys[model];

      const updatedPreferences = {
        ...user.preferences,
        openRouterApiKeys: currentApiKeys
      };

      const response = await apiRequest("PATCH", "/api/user/preferences", updatedPreferences);
      return response.json();
    },
    onSuccess: (data, model) => {
      queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
      queryClient.invalidateQueries({ queryKey: ["/api/models"] });
      if (selectedOpenRouterModel === model) {
        setSelectedOpenRouterModel("");
      }
      toast({
        title: "Success",
        description: "OpenRouter model removed successfully",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to remove OpenRouter model",
        variant: "destructive",
      });
    },
  });

  const handleSubmit = () => {
    if (activeTab === 'openrouter') {
      if (selectedOpenRouterModel) {
        updateModelMutation.mutate(selectedOpenRouterModel);
      }
    } else {
      if (selectedModel !== currentModel) {
        updateModelMutation.mutate(selectedModel);
      }
    }
  };

  const handleSaveApiKey = () => {
    if (!geminiApiKey.trim()) {
      toast({ title: "Error", description: "Please enter a valid Gemini API key", variant: "destructive" });
      return;
    }
    saveApiKeyMutation.mutate(geminiApiKey);
  };

  const handleSaveOpenRouterApiKey = () => {
    if (!newOpenRouterApiKey.trim()) {
      toast({ title: "Error", description: "Please enter a valid OpenRouter API key", variant: "destructive" });
      return;
    }
    if (!newOpenRouterModel.trim()) {
      toast({ title: "Error", description: "Please enter a model name", variant: "destructive" });
      return;
    }
    addOpenRouterModelMutation.mutate({ apiKey: newOpenRouterApiKey, model: newOpenRouterModel });
  };

  const handleDeleteOpenRouterModel = (modelName: string) => {
    deleteOpenRouterModelMutation.mutate(modelName);
  };

  const handleClose = () => {
    setSelectedModel(currentModel);
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="bg-[var(--bg-card)] border-gray-600 max-w-lg max-h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="text-[var(--text-primary)]">Select AI Model</DialogTitle>
        </DialogHeader>
        
        <Tabs defaultValue="local" className="flex-1 flex flex-col overflow-y-auto" onValueChange={setActiveTab}>
          <TabsList className="bg-[var(--bg-main)] grid w-full grid-cols-3">
            <TabsTrigger value="local">Local Models</TabsTrigger>
            <TabsTrigger value="gemini">Gemini</TabsTrigger>
            <TabsTrigger value="openrouter">OpenRouter</TabsTrigger>
          </TabsList>
          <TabsContent value="local" className="flex-1 flex-col overflow-y-auto space-y-3 pr-2 mt-4 scrollbar-thin">
            {localModels.length > 0 ? localModels.map((model: any) => (
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
            )) : (
              <div className="text-center text-[var(--text-muted)] py-8">
                <p>No local models found. Make sure Ollama is running.</p>
              </div>
            )}
          </TabsContent>
          <TabsContent value="gemini" className="flex-1 overflow-y-auto space-y-3 pr-2 mt-4 scrollbar-thin">
            <div className="space-y-2">
              <label htmlFor="gemini-api-key" className="text-[var(--text-primary)]">Gemini API Key</label>
              <Input id="gemini-api-key" placeholder="Enter your Gemini API Key" className="bg-[var(--bg-main)] border-gray-600" value={geminiApiKey} onChange={(e) => setGeminiApiKey(e.target.value)} />
            </div>
            <Button className="w-full bg-primary hover:bg-primary/80" onClick={handleSaveApiKey} disabled={saveApiKeyMutation.isPending}>
              {saveApiKeyMutation.isPending ? 'Saving...' : 'Save Key'}
            </Button>

            {geminiModels.length > 0 && (
              <>
                <div className="border-t border-gray-600 pt-4 mt-4">
                  <h4 className="text-[var(--text-primary)] font-medium mb-3">Available Gemini Models</h4>
                  <div className="space-y-2">
                    {geminiModels.map((model: any) => (
                      <div
                        key={model.name}
                        className={`bg-[var(--bg-main)] rounded-lg p-3 border cursor-pointer hover:bg-gray-700 transition-colors ${
                          selectedModel === model.name ? 'border-primary' : 'border-gray-600'
                        }`}
                        onClick={() => setSelectedModel(model.name)}
                      >
                        <div className="flex items-center justify-between">
                          <div>
                            <h5 className="font-medium text-[var(--text-primary)]">{model.displayName}</h5>
                            <p className="text-xs text-[var(--text-muted)]">{model.description}</p>
                          </div>
                          {selectedModel === model.name && (
                            <i className="fas fa-check text-primary"></i>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </>
            )}
          </TabsContent>
          <TabsContent value="openrouter" className="flex-1 overflow-y-auto space-y-3 pr-2 mt-4 scrollbar-thin">
            <div className="space-y-2 p-1">
                <h4 className="text-[var(--text-primary)] font-medium">Add/Update Model</h4>
                <div className="space-y-2">
                    <label htmlFor="openrouter-model" className="text-[var(--text-primary)] text-sm">Model Name</label>
                    <Input id="openrouter-model" placeholder="e.g. deepseek/deepseek-chat-v3.1:free" className="bg-[var(--bg-main)] border-gray-600" value={newOpenRouterModel} onChange={(e) => setNewOpenRouterModel(e.target.value)} />
                </div>
                <div className="space-y-2">
                    <label htmlFor="openrouter-api-key" className="text-[var(--text-primary)] text-sm">API Key</label>
                    <Input id="openrouter-api-key" placeholder="Enter your OpenRouter API Key" className="bg-[var(--bg-main)] border-gray-600" value={newOpenRouterApiKey} onChange={(e) => setNewOpenRouterApiKey(e.target.value)} />
                </div>
            </div>
            <Button className="w-full bg-primary hover:bg-primary/80" onClick={handleSaveOpenRouterApiKey} disabled={addOpenRouterModelMutation.isPending}>
                {addOpenRouterModelMutation.isPending ? 'Saving...' : 'Save Model'}
            </Button>

            <div className="border-t border-gray-600 pt-4 mt-4">
                <h4 className="text-[var(--text-primary)] font-medium mb-3">Saved Models</h4>
                {Object.keys(savedOpenRouterModels).length > 0 ? (
                <div className="space-y-2">
                    {Object.keys(savedOpenRouterModels).map((modelName) => (
                    <div
                        key={modelName}
                        className={`bg-[var(--bg-main)] rounded-lg p-3 border cursor-pointer hover:bg-gray-700 transition-colors ${
                        selectedOpenRouterModel === modelName ? 'border-primary' : 'border-gray-600'
                        }`}
                        onClick={() => setSelectedOpenRouterModel(modelName)}
                    >
                        <div className="flex items-center justify-between">
                        <div>
                            <h5 className="font-medium text-[var(--text-primary)]">{modelName.split('/')[1]?.replace(/-/g, ' ').toUpperCase() || modelName}</h5>
                            <p className="text-xs text-[var(--text-muted)]">{modelName}</p>
                        </div>
                        <div className="flex items-center gap-2">
                            {selectedOpenRouterModel === modelName && (
                            <i className="fas fa-check text-primary"></i>
                            )}
                            <Button variant="ghost" size="sm" className="text-red-500 hover:bg-red-500/10" onClick={(e) => { e.stopPropagation(); handleDeleteOpenRouterModel(modelName); }}>
                                <i className="fas fa-trash"></i>
                            </Button>
                        </div>
                        </div>
                    </div>
                    ))}
                </div>
                ) : (
                <p className="text-sm text-[var(--text-muted)] text-center py-4">No OpenRouter models saved. Add one above.</p>
                )}
            </div>
          </TabsContent>
        </Tabs>
        
        <div className="flex space-x-3 pt-6 border-t border-gray-600 mt-4">
          <Button
            className="flex-1 bg-primary hover:bg-primary/80"
            onClick={handleSubmit}
            disabled={
              (activeTab === 'openrouter'
                ? !selectedOpenRouterModel || selectedOpenRouterModel === currentModel
                : selectedModel === currentModel) ||
              updateModelMutation.isPending
            }
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
