import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

export interface Workspace {
  id: string;
  userId: string;
  name: string;
  description?: string;
  directory: string;
  createdAt: string;
  updatedAt: string;
  meta?: any;
}

export function useWorkspaces() {
  return useQuery({
    queryKey: ["workspaces"],
    queryFn: async (): Promise<Workspace[]> => {
      const response = await fetch("/api/workspaces");
      if (!response.ok) throw new Error("Failed to fetch workspaces");
      return response.json();
    },
  });
}

export function useCreateWorkspace() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: { name: string; description?: string }) => {
      const response = await fetch("/api/workspaces", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!response.ok) throw new Error("Failed to create workspace");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["workspaces"] });
    },
  });
}

export function useDeleteWorkspace() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (workspaceId: string) => {
      const response = await fetch(`/api/workspaces/${workspaceId}`, {
        method: "DELETE",
      });
      if (!response.ok) throw new Error("Failed to delete workspace");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["workspaces"] });
    },
  });
}


