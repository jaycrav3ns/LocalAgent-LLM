import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import ToolsPanel from "@/components/tools/tool-box";


interface ToolboxModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function ToolboxModal({ isOpen, onClose }: ToolboxModalProps) {
  console.log("ToolboxModal rendered, isOpen:", isOpen);
  
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[80vh]">
        <DialogHeader>
          <DialogTitle>Tool Registry</DialogTitle>
        </DialogHeader>
        <ToolsPanel />
      </DialogContent>
    </Dialog>
  );
}
