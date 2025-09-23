import { useRef, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { useAgent } from "@/hooks/useAgent";
import { useTerminal } from "@/contexts/TerminalContext";
import { useWorkspace } from "@/contexts/WorkspaceContext";

interface CommandTerminalProps {
  commandInput: string;
  setCommandInput: (value: string) => void;
}

export default function CommandTerminal({ commandInput, setCommandInput }: CommandTerminalProps) {
  const { executeBash, executePython, webSearch, userBaseDir } = useAgent();
  const { output, addOutput, clearOutput } = useTerminal();
  const { currentWorkspace } = useWorkspace();
  const [commandHistory, setCommandHistory] = useState<string[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const commandInputRef = useRef<HTMLTextAreaElement>(null);
  const outputContainerRef = useRef<HTMLDivElement>(null);

  const isLoading = executeBash.isPending || executePython.isPending || webSearch.isPending;

  useEffect(() => {
    if (outputContainerRef.current) {
      outputContainerRef.current.scrollTop = outputContainerRef.current.scrollHeight;
    }
  }, [output]);

  useEffect(() => {
    commandInputRef.current?.focus();
  }, [output]);

  const executeCommand = async (command: string) => {
    const cwd = currentWorkspace?.directory || userBaseDir;
    if (!cwd) {
      addOutput("Error: Directory not available. Please wait or select a workspace.");
      return;
    }

    const timestamp = new Date().toLocaleTimeString();
    addOutput(`[${timestamp}] > ${command}`);

    try {
      const result = await executeBash.mutateAsync({ command, cwd });
      if (result) {
        addOutput(result.success ? result.output : `Error: ${result.error}`);
      }
    } catch (error) {
      addOutput(`Error: ${error}`);
    }
  };

  const handleCommandKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      executeCommand(commandInput);
      setCommandHistory([commandInput, ...commandHistory]);
      setHistoryIndex(-1);
      setCommandInput("");
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (historyIndex < commandHistory.length - 1) {
        const newHistoryIndex = historyIndex + 1;
        setHistoryIndex(newHistoryIndex);
        setCommandInput(commandHistory[newHistoryIndex]);
      }
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (historyIndex > 0) {
        const newHistoryIndex = historyIndex - 1;
        setHistoryIndex(newHistoryIndex);
        setCommandInput(commandHistory[newHistoryIndex]);
      } else if (historyIndex === 0) {
        setHistoryIndex(-1);
        setCommandInput("");
      }
    }
  };

  return (
    <div className="flex flex-col h-full neumorphic p-6 min-h-0">
      <div ref={outputContainerRef} className="flex-1 overflow-y-auto bg-[var(--bg-main)] rounded-lg p-4 command-output text-sm scrollbar-thin border border-gray-600">
        {output.length === 0 ? (
          <div className="text-center text-[var(--text-muted)] py-8 mt-8">
            <i className="fas fa-terminal text-2xl mb-2"></i>
            <p>Terminal ready - execute commands below to see output</p>
            <p className="text-xs mt-1">Commands from the Schedule tab will also appear here</p>
          </div>
        ) : (
          <div className="space-y-1">
            {output.map((line, index) => (
              <pre 
                key={index} 
                className={`whitespace-pre-wrap font-mono text-sm ${
                  line.startsWith('>') ? 'text-green-400' : 
                  line.startsWith('Error:') ? 'text-red-400' :
                  'text-[var(--text-secondary)]'
                }`}
              >
                {line}
              </pre>
            ))}
            {isLoading && (
              <div className="flex items-center space-x-2 mt-2">
                <div className="loading-spinner w-4 h-4 border-2 border-primary border-t-transparent rounded-full"></div>
                <span className="text-yellow-400">Processing...</span>
              </div>
            )}
          </div>
        )}
      </div>
      <div className="mt-2 relative">
        <textarea
          ref={commandInputRef}
          value={commandInput}
          onChange={(e) => setCommandInput(e.target.value)}
          onKeyDown={handleCommandKeyDown}
          placeholder={userBaseDir ? "Enter command..." : "Loading user directory..."}
          className="w-full bg-gray-800 text-white border border-gray-600 rounded-lg px-4 py-2 pr-24 resize-none focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent command-input-textarea"
          rows={1}
          disabled={!userBaseDir || isLoading}
        />
        <div className="absolute right-2 top-1/2 -translate-y-1/2 mt-[-0.25rem] flex gap-2">
          <Button
            variant="ghost"
            size="icon"
            onClick={clearOutput}
            className="bg-[var(--input-light)] border border-[#777] rounded-full z-10 text-[var(--text-muted)] hover:bg-[var(--primary-dark)] scale-95 hover:scale-105 transition-all w-8 h-8"
            title="Clear Terminal"
          >
            <i className="fas fa-trash-alt"></i>
          </Button>
        </div>
      </div>
    </div>
  );
}
