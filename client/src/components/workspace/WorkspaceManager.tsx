import React, { useState } from "react";
import { useWorkspaces, useCreateWorkspace } from "@/hooks/useWorkspaces";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Plus, Folder, FolderOpen, Edit3, Trash2, Download } from "lucide-react";

interface WorkspaceManagerProps {
  onWorkspaceSelect?: (workspaceId: string) => void;
}

export function WorkspaceManager({ onWorkspaceSelect }: WorkspaceManagerProps) {
  const { data: workspaces, isLoading } = useWorkspaces();
  const createWorkspace = useCreateWorkspace();
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editingWorkspace, setEditingWorkspace] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    directory: "",
  });

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || !formData.directory) return;
    
    try {
      const newWorkspace = await createWorkspace.mutateAsync(formData);
      setIsCreateOpen(false);
      setFormData({ name: "", description: "", directory: "" });
      
      // Auto-select the new workspace
      if (onWorkspaceSelect) {
        onWorkspaceSelect(newWorkspace.id);
      }
    } catch (error) {
      console.error("Failed to create workspace:", error);
    }
  };

  const handleRename = async (workspaceId: string) => {
    if (!editName.trim()) return;
    
    try {
      const response = await fetch(`/api/workspaces/${workspaceId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: editName.trim() })
      });
      
      if (response.ok) {
        setEditingWorkspace(null);
        setEditName("");
        // Refresh workspaces list
        window.location.reload(); // Simple refresh for now
      }
    } catch (error) {
      console.error('Failed to rename workspace:', error);
    }
  };

  const handleDelete = async (workspaceId: string, workspaceName: string) => {
    if (!confirm(`Are you sure you want to delete "${workspaceName}"? This action cannot be undone.`)) {
      return;
    }
    
    try {
      const response = await fetch(`/api/workspaces/${workspaceId}`, {
        method: 'DELETE'
      });
      
      if (response.ok) {
        // Refresh workspaces list
        window.location.reload(); // Simple refresh for now
      }
    } catch (error) {
      console.error('Failed to delete workspace:', error);
    }
  };

  const startRename = (workspace: any) => {
    setEditingWorkspace(workspace.id);
    setEditName(workspace.name);
  };

  const cancelRename = () => {
    setEditingWorkspace(null);
    setEditName("");
  };

  const selectFolder = async () => {
    try {
      const response = await fetch('/api/files');
      const result = await response.json();
      
      if (result.success) {
        const currentDir = result.currentPath || '/home/user/projects';
        setFormData({ ...formData, directory: currentDir });
      }
    } catch (error) {
      console.error('Failed to get directory:', error);
      setFormData({ ...formData, directory: '/home/user/projects' });
    }
  };

  const handleExport = async (workspaceId: string) => {
    try {
      const response = await fetch(`/api/workspaces/${workspaceId}/export`);
      if (response.ok) {
        const blob = await response.blob();
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `workspace-${workspaceId}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      }
    } catch (error) {
      console.error('Failed to export workspace:', error);
    }
  };

  if (isLoading) {
    return <div className="p-4">Loading workspaces...</div>;
  }

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-semibold">Workspace Manager</h2>
          <p className="text-sm text-gray-500">Manage your project workspaces</p>
        </div>
        <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
          <DialogTrigger asChild>
            <Button className="flex items-center gap-2">
              <Plus className="h-4 w-4" />
              Create New Workspace
            </Button>
          </DialogTrigger>
          <DialogContent className="bg-[var(--bg-card)] border-gray-600">
            <DialogHeader>
              <DialogTitle>Create New Workspace</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleCreate} className="space-y-4">
              <div>
                <Label htmlFor="name">Name</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="My Project"
                  className="bg-[var(--bg-main)] border-gray-600"
                  required
                />
              </div>
              <div>
                <Label htmlFor="directory">Directory</Label>
                <div className="flex gap-2">
                  <Input
                    id="directory"
                    value={formData.directory}
                    onChange={(e) => setFormData({ ...formData, directory: e.target.value })}
                    placeholder="/home/user/projects/my-project"
                    className="bg-[var(--bg-main)] border-gray-600 flex-1"
                    required
                  />
                  <Button
                    type="button"
                    variant="outline"
                    onClick={selectFolder}
                    className="px-3"
                  >
                    <FolderOpen className="h-4 w-4" />
                  </Button>
                </div>
              </div>
              <div>
                <Label htmlFor="description">Description (optional)</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Project description..."
                  className="bg-[var(--bg-main)] border-gray-600"
                />
              </div>
              <div className="flex justify-end gap-2">
                <Button type="button" variant="outline" onClick={() => setIsCreateOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={createWorkspace.isPending}>
                  {createWorkspace.isPending ? "Creating..." : "Create"}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="space-y-4">
        {workspaces?.length === 0 ? (
          <div className="text-center py-12 text-gray-500">
            <Folder className="h-16 w-16 mx-auto mb-4 opacity-50" />
            <h3 className="text-lg font-medium mb-2">No workspaces yet</h3>
            <p className="mb-4">Create your first workspace to get started!</p>
            <Button onClick={() => setIsCreateOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Create Workspace
            </Button>
          </div>
        ) : (
          workspaces?.map((ws) => (
            <div key={ws.id} className="neumorphic rounded-lg p-4 hover:shadow-lg transition-shadow">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <Folder className="h-5 w-5 text-yellow-400" />
                    {editingWorkspace === ws.id ? (
                      <div className="flex items-center gap-2 flex-1">
                        <Input
                          value={editName}
                          onChange={(e) => setEditName(e.target.value)}
                          className="bg-[var(--bg-main)] border-gray-600 text-lg font-semibold"
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') handleRename(ws.id);
                            if (e.key === 'Escape') cancelRename();
                          }}
                          autoFocus
                        />
                        <Button size="sm" onClick={() => handleRename(ws.id)}>
                          Save
                        </Button>
                        <Button size="sm" variant="outline" onClick={cancelRename}>
                          Cancel
                        </Button>
                      </div>
                    ) : (
                      <>
                        <h3 className="font-semibold text-lg">{ws.name}</h3>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => startRename(ws)}
                          className="p-1 h-6 w-6"
                        >
                          <Edit3 className="h-3 w-3" />
                        </Button>
                      </>
                    )}
                  </div>
                  <p className="text-sm text-gray-500 mb-2">{ws.directory}</p>
                  {ws.description && (
                    <p className="text-sm text-gray-600 mb-3">{ws.description}</p>
                  )}
                  <div className="text-xs text-gray-400">
                    Created: {new Date(ws.createdAt).toLocaleDateString()}
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => onWorkspaceSelect?.(ws.id)}
                  >
                    Open
                  </Button>
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => handleExport(ws.id)}
                  >
                    <Download className="h-4 w-4 mr-1" />
                    Export
                  </Button>
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => handleDelete(ws.id, ws.name)}
                    className="text-red-400 hover:text-red-300 hover:bg-red-900/20"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
