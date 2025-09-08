import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

interface UsernameModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUsername: string;
}

export default function UsernameModal({ isOpen, onClose, currentUsername }: UsernameModalProps) {
  const [newUsername, setNewUsername] = useState(currentUsername);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const updateUsernameMutation = useMutation({
    mutationFn: async (username: string) => {
      const response = await apiRequest("PATCH", "/api/user/preferences", { username });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
      toast({
        title: "Success",
        description: "Username updated successfully",
      });
      onClose();
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update username",
        variant: "destructive",
      });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (newUsername.trim() && newUsername !== currentUsername) {
      updateUsernameMutation.mutate(newUsername.trim());
    }
  };

  const handleClose = () => {
    setNewUsername(currentUsername);
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="bg-[var(--primary-dark)] border-gray-600">
        <DialogHeader>
          <DialogTitle className="text-[var(--text-primary)]">Change Username</DialogTitle>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="username" className="text-[var(--text-primary)]">
              New Username
            </Label>
            <Input
              id="username"
              value={newUsername}
              onChange={(e) => setNewUsername(e.target.value)}
              className="bg-[var(--bg-main)] border-gray-600 focus:border-primary mt-2"
              placeholder="Enter new username..."
              disabled={updateUsernameMutation.isPending}
            />
          </div>
          
          <div className="flex space-x-3 pt-4">
            <Button 
              type="submit"
              className="flex-1 bg-primary hover:bg-primary/80"
              disabled={!newUsername.trim() || newUsername === currentUsername || updateUsernameMutation.isPending}
            >
              {updateUsernameMutation.isPending ? (
                <>
                  <div className="loading-spinner w-4 h-4 border-2 border-white border-t-transparent rounded-full mr-2"></div>
                  Updating...
                </>
              ) : (
                "Update Username"
              )}
            </Button>
            <Button 
              type="button"
              variant="outline"
              onClick={handleClose}
              className="border-gray-600 hover:bg-gray-600"
              disabled={updateUsernameMutation.isPending}
            >
              Cancel
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
