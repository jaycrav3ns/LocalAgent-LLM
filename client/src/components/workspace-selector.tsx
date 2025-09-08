import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Plus, Folder } from "lucide-react";
import { useWorkspaces, useCreateWorkspace } from "@/hooks/useWorkspaces";

interface WorkspaceSelectorProps {
  selectedWorkspace?: string;
  onWorkspaceChange: (workspaceId: string) => void;
}

export function WorkspaceSelector({ selectedWorkspace, onWorkspaceChange }: WorkspaceSelectorProps) {
  const { data: workspaces, isLoading } = useWorkspaces();
  const createWorkspace = useCreateWorkspace();
  const [isCreateOpen, setIsCreateOpen] = useState(false);
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
      onWorkspaceChange(newWorkspace.id);
      setIsCreateOpen(false);
      setFormData({ name: "", description: "", directory: "" });
    } catch (error) {
      console.error("Failed to create workspace:", error);
    }
  };

  if (isLoading) return <div className="w-32 h-8 bg-gray-700 rounded animate-pulse" />;

  return (
    <div className="flex items-center gap-2">
      <Select value={selectedWorkspace} onValueChange={onWorkspaceChange}>
        <SelectTrigger className="w-40 h-8 text-sm bg-[var(--bg-card)] border-gray-600">
          <div className="flex items-center gap-2">
            <Folder className="h-3 w-3" />
            <SelectValue placeholder="Workspace" />
          </div>
        </SelectTrigger>
        <SelectContent>
          {workspaces?.map((workspace) => (
            <SelectItem key={workspace.id} value={workspace.id}>
              <div className="flex flex-col">
                <span className="font-medium text-sm">{workspace.name}</span>
                <span className="text-xs text-gray-500">{workspace.directory}</span>
              </div>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
        <DialogTrigger asChild>
          <Button variant="outline" size="sm" className="h-8 w-8 p-0 border-gray-600">
            <Plus className="h-3 w-3" />
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
              <Input
                id="directory"
                value={formData.directory}
                onChange={(e) => setFormData({ ...formData, directory: e.target.value })}
                placeholder="/home/user/projects/my-project"
                className="bg-[var(--bg-main)] border-gray-600"
                required
              />
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
  );
}
