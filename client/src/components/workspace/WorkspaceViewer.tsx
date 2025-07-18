import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Folder, FolderOpen, File, ArrowUp, RefreshCw, X } from "lucide-react";

interface WorkspaceViewerProps {
  workspaceId: string;
  onClose: () => void;
}

interface FileItem {
  name: string;
  type: 'file' | 'directory';
  path: string;
}

export function WorkspaceViewer({ workspaceId, onClose }: WorkspaceViewerProps) {
  const [currentPath, setCurrentPath] = useState(".");
  const [selectedFile, setSelectedFile] = useState<string | null>(null);

  const { data: workspace } = useQuery({
    queryKey: ["workspace", workspaceId],
    queryFn: async () => {
      const response = await fetch(`/api/workspaces/${workspaceId}`);
      if (!response.ok) throw new Error("Failed to fetch workspace");
      return response.json();
    },
    enabled: !!workspaceId,
  });

  const { data: filesResult, isLoading: filesLoading, refetch } = useQuery({
    queryKey: ["workspace-files", workspaceId, currentPath],
    queryFn: async () => {
      const response = await fetch(`/api/workspaces/${workspaceId}/files?path=${encodeURIComponent(currentPath)}`);
      if (!response.ok) throw new Error("Failed to fetch files");
      return response.json();
    },
    enabled: !!workspaceId,
  });

  const { data: fileContent, isLoading: contentLoading } = useQuery({
    queryKey: ["workspace-file-content", workspaceId, selectedFile],
    queryFn: async () => {
      const response = await fetch(`/api/workspaces/${workspaceId}/files/content?path=${encodeURIComponent(selectedFile!)}`);
      if (!response.ok) throw new Error("Failed to fetch file content");
      return response.json();
    },
    enabled: !!workspaceId && !!selectedFile,
  });

  const files: FileItem[] = filesResult?.files || [];

  const handleFileClick = (file: FileItem) => {
    if (file.type === 'directory') {
      setCurrentPath(file.path);
      setSelectedFile(null);
    } else {
      setSelectedFile(file.path);
    }
  };

  const navigateUp = () => {
    if (currentPath !== '.') {
      const parentPath = currentPath.split('/').slice(0, -1).join('/') || '.';
      setCurrentPath(parentPath);
      setSelectedFile(null);
    }
  };

  const getFileIcon = (file: FileItem) => {
    if (file.type === 'directory') {
      return <Folder className="h-4 w-4 text-yellow-400" />;
    }
    return <File className="h-4 w-4 text-gray-400" />;
  };

  if (!workspace) {
    return (
      <div className="p-6 text-center">
        <p className="text-gray-500">No workspace selected</p>
      </div>
    );
  }

  return (
    <div className="p-6 h-full">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-semibold">{workspace.name}</h2>
          <p className="text-sm text-gray-500">{workspace.directory}</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => refetch()}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
          <Button variant="outline" size="sm">
            Export
          </Button>
          <Button variant="outline" size="sm" onClick={onClose}>
            <X className="h-4 w-4 mr-2" />
            Close
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-[calc(100%-8rem)]">
        {/* File Browser */}
        <div className="lg:col-span-2">
          <div className="neumorphic rounded-xl p-4 h-full">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold">Files</h3>
              <div className="text-sm text-gray-500">
                <span>{currentPath}</span>
              </div>
            </div>
            
            <div className="flex items-center space-x-2 mb-4">
              <Button
                variant="ghost"
                size="sm"
                onClick={navigateUp}
                disabled={currentPath === '.'}
              >
                <ArrowUp className="h-4 w-4 mr-1" />
                Up
              </Button>
              <Input
                value={currentPath}
                onChange={(e) => setCurrentPath(e.target.value)}
                className="bg-[var(--bg-main)] border-gray-600 text-sm"
                placeholder="Enter path..."
              />
            </div>
            
            {filesLoading ? (
              <div className="flex items-center justify-center h-32">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
              </div>
            ) : (
              <div className="space-y-1 max-h-96 overflow-y-auto">
                {files.length === 0 ? (
                  <div className="text-center text-gray-500 py-8">
                    <FolderOpen className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>No files found in this directory</p>
                  </div>
                ) : (
                  files.map((file, index) => (
                    <div
                      key={index}
                      className="flex items-center space-x-3 px-3 py-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 cursor-pointer transition-colors"
                      onClick={() => handleFileClick(file)}
                    >
                      {getFileIcon(file)}
                      <span className="flex-1">{file.name}</span>
                    </div>
                  ))
                )}
              </div>
            )}
          </div>
        </div>

        {/* File Preview */}
        <div className="lg:col-span-1">
          <div className="neumorphic rounded-xl p-4 h-full">
            <h3 className="font-semibold mb-4">File Preview</h3>
            
            {selectedFile ? (
              <div className="h-full flex flex-col">
                <div className="text-gray-500 mb-2 text-sm">{selectedFile}</div>
                
                {contentLoading ? (
                  <div className="flex items-center justify-center flex-1">
                    <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
                  </div>
                ) : fileContent?.success ? (
                  <div className="bg-[var(--bg-main)] rounded-lg p-4 text-sm flex-1 overflow-auto">
                    <pre className="whitespace-pre-wrap">
                      {fileContent.content}
                    </pre>
                  </div>
                ) : (
                  <div className="bg-[var(--bg-main)] rounded-lg p-4 flex-1 flex items-center justify-center">
                    <div className="text-center text-gray-500">
                      <p className="text-sm">Unable to preview file</p>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="h-full flex items-center justify-center">
                <div className="text-center text-gray-500">
                  <File className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>Select a file to preview</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}