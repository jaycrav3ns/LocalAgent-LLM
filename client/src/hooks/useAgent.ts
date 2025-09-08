import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { isUnauthorizedError } from "@/lib/authUtils";

interface AgentMemory {
  id: number;
  userId: number;
  operation: string;
  input: string;
  output: string;
  model?: string;
  createdAt: string;
}

interface QuickCommand {
  id: number;
  userId: number;
  name: string;
  command: string;
  type: 'bash' | 'python' | 'web';
  description?: string;
  isDefault: boolean;
}

export function useAgent() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const handleError = (error: Error) => {
    if (isUnauthorizedError(error)) {
      toast({
        title: "Unauthorized",
        description: "You are logged out. Logging in again...",
        variant: "destructive",
      });
      setTimeout(() => {
        window.location.href = "/api/login";
      }, 500);
      return;
    }
    console.error("Agent error:", error);
  };

  const chatMutation = useMutation({
    mutationFn: async ({ message, model, sessionId }: { message: string; model?: string; sessionId?: number }) => {
      const response = await apiRequest("POST", "/api/chat", { message, model, sessionId });
      return response.json();
    },
    onError: handleError,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/chat/sessions"] });
      queryClient.invalidateQueries({ queryKey: ["/api/memory"] });
    },
  });

  const executeBashMutation = useMutation({
    mutationFn: async ({ command, cwd }: { command: string; cwd?: string }) => {
      const response = await apiRequest("POST", "/api/execute/bash", { command, cwd });
      return response.json();
    },
    onError: handleError,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/memory"] });
    },
  });

  const clearMemoryMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("DELETE", "/api/memory");
      return response.json();
    },
    onError: handleError,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/memory"] });
      toast({
        title: "Memory Cleared",
        description: "Agent memory has been successfully cleared.",
      });
    },
  });

  const executePythonMutation = useMutation({
    mutationFn: async (code: string) => {
      const response = await apiRequest("POST", "/api/execute/python", { code });
      return response.json();
    },
    onError: handleError,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/memory"] });
    },
  });

  const webSearchMutation = useMutation({
    mutationFn: async (query: string) => {
      const response = await apiRequest("POST", "/api/execute/search", { query });
      return response.json();
    },
    onError: handleError,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/memory"] });
    },
  });

  const { data: chatSessions, isLoading: sessionsLoading } = useQuery<any[]>({
    queryKey: ["/api/chat/sessions"],
    retry: false,
  });

  const { data: memory, isLoading: memoryLoading } = useQuery<AgentMemory[]>({
    queryKey: ["/api/memory"],
    retry: false,
  });

  const { data: quickCommands, isLoading: commandsLoading } = useQuery<QuickCommand[]>({
    queryKey: ["/api/commands"],
    retry: false,
  });

  const { data: models, isLoading: modelsLoading } = useQuery({
    queryKey: ["/api/models"],
    retry: false,
  });

  const { data: files, isLoading: filesLoading } = useQuery({
    queryKey: ["/api/files"],
    queryFn: async () => {
      const response = await apiRequest("GET", "/api/user-files");
      const data = await response.json();
      return data;
    },
    retry: false,
  });

  return {
    // Mutations
    chat: chatMutation,
    executeBash: executeBashMutation,
    executePython: executePythonMutation,
    webSearch: webSearchMutation,
    clearMemory: clearMemoryMutation,
    
    // Queries
    chatSessions,
    memory,
    quickCommands,
    models,
    files: files?.files,
    userBaseDir: files?.currentDirectory,
    
    // Loading states
    isLoading: chatMutation.isPending || executeBashMutation.isPending || executePythonMutation.isPending || webSearchMutation.isPending || clearMemoryMutation.isPending,
    sessionsLoading,
    memoryLoading,
    commandsLoading,
    modelsLoading,
    filesLoading,
  };
}
