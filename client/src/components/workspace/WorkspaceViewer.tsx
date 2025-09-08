import React from "react";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { X } from "lucide-react";
import FileManager from '@/components/ui/FileManager';

interface WorkspaceViewerProps {
  workspaceId: string;
  onClose: () => void;
}

const truncatePath = (path: string, maxLength: number = 50) => {
  if (path.length <= maxLength) return path;
  return '...' + path.slice(-(maxLength - 3));
};

export function WorkspaceViewer({ workspaceId, onClose }: WorkspaceViewerProps) {
  const { data: workspace, isLoading: workspaceLoading, error: workspaceError } = useQuery({
    queryKey: ["workspace", workspaceId],
    queryFn: async () => {
      const response = await fetch(`/api/workspaces/${workspaceId}`);
      if (!response.ok) throw new Error("Failed to fetch workspace");
      return response.json();
    },
    enabled: !!workspaceId,
  });

  if (workspaceLoading) {
    return (
      <div className="p-6 text-center">
        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary mx-auto mb-4"></div>
        <p className="text-gray-500">Loading workspace...</p>
      </div>
    );
  }

  if (workspaceError) {
    return (
      <div className="p-6 text-center">
        <p className="text-red-500">Error loading workspace: {workspaceError.message}</p>
      </div>
    );
  }

  if (!workspace) {
    return (
      <div className="p-6 text-center">
        <p className="text-gray-500">No workspace found</p>
      </div>
    );
  }

  return (
    <div className="h-full overflow-y-auto scrollbar-thin">
      <div className="flex items-center justify-between mb-6 px-6 pt-6">
        <div>
          <h2 className="text-2xl font-semibold">{workspace.name}</h2>
          <p className="text-sm text-gray-500 mb-2" title={workspace.directory}>
            {truncatePath(workspace.directory)}
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={onClose}>
          <X className="h-4 w-4 mr-2" />
          Close
        </Button>
      </div>

      <div className="px-6 pb-6 h-[calc(100%-8rem)]">
        <FileManager
          title={workspace.name}
          baseEndpoint={`/api/workspaces/${workspaceId}/files`}
          uploadEndpoint={`/api/workspaces/${workspaceId}/files/upload`}
          className="h-full"
        />
      </div>
    </div>
  );
}
