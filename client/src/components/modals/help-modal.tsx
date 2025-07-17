import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Circle } from "lucide-react";

interface HelpModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function HelpModal({ isOpen, onClose }: HelpModalProps) {
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="bg-[var(--primary-dark)] border-gray-600 max-w-2xl max-h-[80vh] overflow-y-auto scrollbar-thin">
        <DialogHeader>
          <DialogTitle className="text-xl text-[var(--text-primary)]">LocalAgent LLM Help</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-6">
          <div>
            <h4 className="font-semibold mb-3 text-[var(--accent-gold)]">Getting Started</h4>
            <ul className="space-y-2 text-sm text-[var(--text-secondary)]">
              <li className="flex items-start space-x-2">
                <Circle className="w-2 h-2 text-primary mt-2 fill-current" />
                <span>Use the chat interface to interact with your local AI agent</span>
              </li>
              <li className="flex items-start space-x-2">
                <Circle className="w-2 h-2 text-primary mt-2 fill-current" />
                <span>Browse and manage files in the Workspace tab</span>
              </li>
              <li className="flex items-start space-x-2">
                <Circle className="w-2 h-2 text-primary mt-2 fill-current" />
                <span>Execute commands and manage tools in the Tools tab</span>
              </li>
            </ul>
          </div>
          
          <div>
            <h4 className="font-semibold mb-3 text-[var(--accent-gold)]">Command Prefixes</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
              <div className="bg-[var(--bg-main)] rounded-lg p-3">
                <code className="text-green-400">bash:</code>
                <p className="text-[var(--text-muted)] mt-1">Execute shell commands</p>
              </div>
              <div className="bg-[var(--bg-main)] rounded-lg p-3">
                <code className="text-green-400">python:</code>
                <p className="text-[var(--text-muted)] mt-1">Run Python code</p>
              </div>
              <div className="bg-[var(--bg-main)] rounded-lg p-3">
                <code className="text-green-400">web:</code>
                <p className="text-[var(--text-muted)] mt-1">Perform web searches</p>
              </div>
              <div className="bg-[var(--bg-main)] rounded-lg p-3">
                <code className="text-green-400">file:</code>
                <p className="text-[var(--text-muted)] mt-1">Browse file system</p>
              </div>
            </div>
          </div>
          
          <div>
            <h4 className="font-semibold mb-3 text-[var(--accent-gold)]">Keyboard Shortcuts</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm">
              <div className="flex justify-between py-1">
                <span>Send message</span>
                <kbd className="bg-[var(--bg-main)] px-2 py-1 rounded text-xs">Enter</kbd>
              </div>
              <div className="flex justify-between py-1">
                <span>New line</span>
                <kbd className="bg-[var(--bg-main)] px-2 py-1 rounded text-xs">Shift + Enter</kbd>
              </div>
              <div className="flex justify-between py-1">
                <span>Clear chat</span>
                <kbd className="bg-[var(--bg-main)] px-2 py-1 rounded text-xs">Ctrl + L</kbd>
              </div>
              <div className="flex justify-between py-1">
                <span>Focus input</span>
                <kbd className="bg-[var(--bg-main)] px-2 py-1 rounded text-xs">Ctrl + /</kbd>
              </div>
            </div>
          </div>

          <div>
            <h4 className="font-semibold mb-3 text-[var(--accent-gold)]">Features</h4>
            <ul className="space-y-2 text-sm text-[var(--text-secondary)]">
              <li className="flex items-start space-x-2">
                <i className="fas fa-check text-green-400 text-xs mt-2"></i>
                <span>Local AI model integration with Ollama</span>
              </li>
              <li className="flex items-start space-x-2">
                <i className="fas fa-check text-green-400 text-xs mt-2"></i>
                <span>Persistent conversation memory</span>
              </li>
              <li className="flex items-start space-x-2">
                <i className="fas fa-check text-green-400 text-xs mt-2"></i>
                <span>File system browsing and management</span>
              </li>
              <li className="flex items-start space-x-2">
                <i className="fas fa-check text-green-400 text-xs mt-2"></i>
                <span>Command execution (bash, python)</span>
              </li>
              <li className="flex items-start space-x-2">
                <i className="fas fa-check text-green-400 text-xs mt-2"></i>
                <span>Web search capabilities</span>
              </li>
              <li className="flex items-start space-x-2">
                <i className="fas fa-check text-green-400 text-xs mt-2"></i>
                <span>Quick commands for common tasks</span>
              </li>
            </ul>
          </div>
        </div>
        
        <div className="pt-6 border-t border-gray-600 mt-6">
          <Button 
            className="w-full bg-primary hover:bg-primary/80"
            onClick={onClose}
          >
            Got it!
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
