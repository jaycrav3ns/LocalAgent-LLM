import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { useAgent } from "@/hooks/useAgent";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import AddCommandModal from "@/components/modals/add-command-modal";
import { useTerminal } from "@/contexts/TerminalContext";

type CommandType = 'bash' | 'python';

export default function ToolsPanel() {
  const { 
    executeBash, 
    executePython, 
    webSearch, 
    clearMemory,
    memory, 
    memoryLoading 
  } = useAgent();
  
  const { toast } = useToast();
  const [commandType, setCommandType] = useState<CommandType>('bash');
  const [commandInput, setCommandInput] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [memorySearchQuery, setMemorySearchQuery] = useState("");
  const { output, addOutput, clearOutput } = useTerminal();

  const executeCommand = async () => {
    if (!commandInput.trim()) return;

    const timestamp = new Date().toLocaleTimeString();
    addOutput(`[${timestamp}] > ${commandInput}`);

    try {
      let result;
      if (commandType === 'bash') {
        result = await executeBash.mutateAsync(commandInput);
      } else {
        result = await executePython.mutateAsync(commandInput);
      }

      addOutput(result.success ? result.output : `Error: ${result.error}`);
    } catch (error) {
      addOutput(`Error: ${error}`);
    }

    setCommandInput("");
  };

  const performWebSearch = async () => {
    if (!searchQuery.trim()) return;

    const timestamp = new Date().toLocaleTimeString();
    addOutput(`[${timestamp}] > web search: ${searchQuery}`);

    try {
      const result = await webSearch.mutateAsync(searchQuery);
      addOutput(result.success ? result.output : `Error: ${result.error}`);
    } catch (error) {
      addOutput(`Error: ${error}`);
    }

    setSearchQuery("");
  };

  const handleClearMemory = async () => {
    if (window.confirm("Are you sure you want to clear all agent memory? This action cannot be undone.")) {
      await clearMemory.mutateAsync();
    }
  };

  const isLoading = executeBash.isPending || executePython.isPending || webSearch.isPending || clearMemory.isPending;

  return (
    <div className="p-6 space-y-6 h-full overflow-y-auto scrollbar-thin">
      {/* Live Output - Now at the top like a real terminal */}
      <div className="neumorphic rounded-xl p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold flex items-center text-[var(--text-primary)]">
            <i className="fas fa-terminal text-green-400 mr-3"></i>
            Terminal Output
          </h3>
          <Button
            variant="outline"
            size="sm"
            onClick={clearOutput}
            className="border-gray-600 hover:bg-gray-600"
          >
            <i className="fas fa-broom mr-1"></i>Clear
          </Button>
        </div>
        
        <div className="bg-[var(--bg-main)] rounded-lg p-4 command-output text-sm min-h-64 max-h-80 overflow-y-auto scrollbar-thin border border-gray-600">
          {output.length === 0 ? (
            <div className="text-center text-[var(--text-muted)] py-8">
              <i className="fas fa-terminal text-2xl mb-2"></i>
              <p>Terminal ready - execute commands below to see output</p>
              <p className="text-xs mt-1">Commands from the Commands tab will also appear here</p>
            </div>
          ) : (
            <div className="space-y-1">
              {output.map((line, index) => (
                <div 
                  key={index} 
                  className={`${
                    line.startsWith('>') ? 'text-green-400' : 
                    line.startsWith('Error:') ? 'text-red-400' :
                    'text-[var(--text-secondary)]'
                  }`}
                >
                  {line}
                </div>
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
      </div>

      {/* Command Execution and Memory Management */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Terminal Interface */}
        <div className="neumorphic rounded-xl p-6">
          <h3 className="text-lg font-semibold mb-4 flex items-center text-[var(--text-primary)]">
            <i className="fas fa-code text-blue-400 mr-3"></i>
            Command Interface
          </h3>
          
          <div className="space-y-4">
            <div className="flex space-x-2">
              <Button
                variant={commandType === 'bash' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setCommandType('bash')}
                className={commandType === 'bash' ? 'bg-primary' : 'border-gray-600'}
              >
                <i className="fas fa-terminal mr-1"></i>Bash
              </Button>
              <Button
                variant={commandType === 'python' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setCommandType('python')}
                className={commandType === 'python' ? 'bg-primary' : 'border-gray-600'}
              >
                <i className="fab fa-python mr-1"></i>Python
              </Button>
            </div>
            
            <div className="relative">
              <Textarea
                value={commandInput}
                onChange={(e) => setCommandInput(e.target.value)}
                rows={4}
                className="bg-[var(--bg-main)] border-gray-600 command-output resize-none focus:border-primary"
                placeholder="Enter command..."
                disabled={isLoading}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
                    e.preventDefault();
                    executeCommand();
                  }
                }}
              />
              <Button
                className="absolute bottom-3 right-3 bg-primary hover:bg-primary/80"
                onClick={executeCommand}
                disabled={!commandInput.trim() || isLoading}
              >
                <i className="fas fa-play mr-2"></i>Execute
              </Button>
            </div>

            {/* Web Search */}
            <div className="border-t border-gray-600 pt-4">
              <h4 className="text-sm font-medium mb-2 text-[var(--text-primary)]">Web Search</h4>
              <div className="flex space-x-2">
                <Input
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search query..."
                  className="bg-[var(--bg-main)] border-gray-600 focus:border-primary"
                  disabled={isLoading}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      performWebSearch();
                    }
                  }}
                />
                <Button
                  onClick={performWebSearch}
                  disabled={!searchQuery.trim() || isLoading}
                  className="bg-primary hover:bg-primary/80"
                >
                  <i className="fas fa-search"></i>
                </Button>
              </div>
            </div>
          </div>
        </div>

        {/* Memory Management */}
        <div className="neumorphic rounded-xl p-6">
          <h3 className="text-lg font-semibold mb-4 flex items-center text-[var(--text-primary)]">
            <i className="fas fa-memory text-purple-400 mr-3"></i>
            Memory & History
          </h3>
          
          <div className="space-y-4">
            <div className="flex space-x-2">
              <Input
                value={memorySearchQuery}
                onChange={(e) => setMemorySearchQuery(e.target.value)}
                placeholder="Search memory..."
                className="bg-[var(--bg-main)] border-gray-600 focus:border-primary"
              />
              <Button className="bg-primary hover:bg-primary/80">
                <i className="fas fa-search"></i>
              </Button>
            </div>
            
            {memoryLoading ? (
              <div className="flex items-center justify-center py-8">
                <div className="loading-spinner w-6 h-6 border-2 border-primary border-t-transparent rounded-full"></div>
              </div>
            ) : (
              <div className="bg-[var(--bg-main)] rounded-lg p-4 max-h-48 overflow-y-auto scrollbar-thin">
                {memory && memory.length > 0 ? (
                  <div className="space-y-2 text-sm">
                    {memory.slice(0, 10).map((item: any, index: number) => (
                      <div key={index} className="border-b border-gray-600 pb-2">
                        <div className="text-[var(--text-muted)] text-xs">
                          {new Date(item.createdAt).toLocaleTimeString()} - {item.operation}: {item.input.substring(0, 50)}...
                        </div>
                        <div className={`${
                          item.operation === 'bash' ? 'text-primary' :
                          item.operation === 'python' ? 'text-green-400' :
                          'text-blue-400'
                        }`}>
                          {item.output.substring(0, 100)}...
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center text-[var(--text-muted)] py-4">
                    <i className="fas fa-history text-2xl mb-2"></i>
                    <p>No memory history yet</p>
                  </div>
                )}
              </div>
            )}
            
            <div className="flex space-x-2">
              <Button
                size="sm"
                variant="destructive"
                className="bg-red-600 hover:bg-red-700"
                onClick={handleClearMemory}
                disabled={isLoading}
              >
                <i className="fas fa-trash mr-1"></i>Clear
              </Button>
              <Button
                size="sm"
                className="bg-blue-600 hover:bg-blue-700"
              >
                <i className="fas fa-save mr-1"></i>Save
              </Button>
              <Button
                size="sm"
                className="bg-green-600 hover:bg-green-700"
              >
                <i className="fas fa-download mr-1"></i>Export
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
