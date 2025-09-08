import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

interface AddCommandModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function AddCommandModal({ isOpen, onClose }: AddCommandModalProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [formData, setFormData] = useState({
    name: "",
    command: "",
    type: "bash" as "bash" | "python" | "web",
    description: "",
  });

  const createCommandMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      const response = await apiRequest("POST", "/api/commands", data);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/commands"] });
      toast({
        title: "Command Added",
        description: "Quick command has been successfully created.",
      });
      handleClose();
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim() || !formData.command.trim()) {
      toast({
        title: "Validation Error",
        description: "Command name and command string are required.",
        variant: "destructive",
      });
      return;
    }
    createCommandMutation.mutate(formData);
  };

  const handleClose = () => {
    setFormData({
      name: "",
      command: "",
      type: "bash",
      description: "",
    });
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="bg-[var(--bg-card)] border-gray-600">
        <DialogHeader>
          <DialogTitle>Add Quick Command</DialogTitle>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="name">Command Name</Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="List Files"
              className="bg-[var(--bg-main)] border-gray-600"
              required
            />
          </div>

          <div>
            <Label htmlFor="type">Command Type</Label>
            <Select value={formData.type} onValueChange={(value: "bash" | "python" | "web") => setFormData({ ...formData, type: value })}>
              <SelectTrigger className="bg-[var(--bg-main)] border-gray-600">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-[var(--bg-card)] border-gray-600">
                <SelectItem value="bash">
                  <div className="flex items-center gap-2">
                    <i className="fas fa-terminal text-primary"></i>
                    Bash
                  </div>
                </SelectItem>
                <SelectItem value="python">
                  <div className="flex items-center gap-2">
                    <i className="fab fa-python text-green-400"></i>
                    Python
                  </div>
                </SelectItem>
                <SelectItem value="web">
                  <div className="flex items-center gap-2">
                    <i className="fas fa-search text-blue-400"></i>
                    Web Search
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label htmlFor="command">Command String</Label>
            <Textarea
              id="command"
              value={formData.command}
              onChange={(e) => setFormData({ ...formData, command: e.target.value })}
              placeholder={
                formData.type === 'bash' ? 'ls -la' :
                formData.type === 'python' ? 'import sys; print(sys.version)' :
                'latest news about AI'
              }
              className="bg-[var(--bg-main)] border-gray-600"
              rows={3}
              required
            />
          </div>

          <div>
            <Label htmlFor="description">Description (optional)</Label>
            <Input
              id="description"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="List directory contents"
              className="bg-[var(--bg-main)] border-gray-600"
            />
          </div>

          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={handleClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={createCommandMutation.isPending}>
              {createCommandMutation.isPending ? "Adding..." : "Add Command"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}