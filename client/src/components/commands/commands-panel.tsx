import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { useAgent } from "@/hooks/useAgent";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import AddCommandModal from "@/components/modals/add-command-modal";
import { Play, PlayCircle, Clock, Plus, Trash2, Edit3 } from "lucide-react";
import { useTerminal } from "@/contexts/TerminalContext";

export default function CommandsPanel() {
  const { 
    executeBash, 
    executePython, 
    webSearch, 
    quickCommands, 
    commandsLoading 
  } = useAgent();
  
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [showAddCommandModal, setShowAddCommandModal] = useState(false);
  const [selectedCommands, setSelectedCommands] = useState<Set<number>>(new Set());
  const [searchQuery, setSearchQuery] = useState("");
  const [isRunning, setIsRunning] = useState(false);
  const [scheduledTime, setScheduledTime] = useState("");
  const { addOutput } = useTerminal();

  const deleteCommandMutation = useMutation({
    mutationFn: async (commandId: number) => {
      const response = await apiRequest("DELETE", `/api/commands/${commandId}`);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/commands"] });
      toast({
        title: "Command Deleted",
        description: "Quick command has been removed.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const executeCommand = async (command: any) => {
    const timestamp = new Date().toLocaleTimeString();
    addOutput(`[${timestamp}] > ${command.name}: ${command.command}`);

    try {
      let result;
      if (command.type === 'bash') {
        result = await executeBash.mutateAsync(command.command);
      } else if (command.type === 'python') {
        result = await executePython.mutateAsync(command.command);
      } else if (command.type === 'web') {
        result = await webSearch.mutateAsync(command.command);
      }

      if (result) {
        addOutput(result.success ? result.output : `Error: ${result.error}`);
      }
    } catch (error) {
      addOutput(`Error: ${error}`);
    }
  };

  const runSelectedCommands = async () => {
    if (selectedCommands.size === 0) {
      toast({
        title: "No Commands Selected",
        description: "Please select commands to run.",
        variant: "destructive",
      });
      return;
    }

    setIsRunning(true);
    const commandsToRun = quickCommands?.filter(cmd => selectedCommands.has(cmd.id)) || [];
    
    for (const command of commandsToRun) {
      await executeCommand(command);
    }
    
    setIsRunning(false);
  };

  const runAllCommands = async () => {
    if (!quickCommands || quickCommands.length === 0) {
      toast({
        title: "No Commands Available",
        description: "Add some commands first.",
        variant: "destructive",
      });
      return;
    }

    setIsRunning(true);
    for (const command of quickCommands) {
      await executeCommand(command);
    }
    setIsRunning(false);
  };

  const scheduleCommands = () => {
    if (!scheduledTime) {
      toast({
        title: "No Time Set",
        description: "Please set a time to schedule commands.",
        variant: "destructive",
      });
      return;
    }

    const targetTime = new Date();
    const [hours, minutes] = scheduledTime.split(':');
    targetTime.setHours(parseInt(hours), parseInt(minutes), 0, 0);
    
    if (targetTime <= new Date()) {
      targetTime.setDate(targetTime.getDate() + 1); // Next day if time has passed
    }

    const delay = targetTime.getTime() - new Date().getTime();
    
    setTimeout(() => {
      runSelectedCommands();
      toast({
        title: "Scheduled Commands Executed",
        description: "Your scheduled commands have been run.",
      });
    }, delay);

    toast({
      title: "Commands Scheduled",
      description: `Commands will run at ${scheduledTime}`,
    });
  };

  const toggleCommandSelection = (commandId: number) => {
    const newSelected = new Set(selectedCommands);
    if (newSelected.has(commandId)) {
      newSelected.delete(commandId);
    } else {
      newSelected.add(commandId);
    }
    setSelectedCommands(newSelected);
  };

  const selectAllCommands = () => {
    if (selectedCommands.size === quickCommands?.length) {
      setSelectedCommands(new Set());
    } else {
      setSelectedCommands(new Set(quickCommands?.map(cmd => cmd.id) || []));
    }
  };

  const filteredCommands = quickCommands?.filter(cmd => 
    cmd.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    cmd.command.toLowerCase().includes(searchQuery.toLowerCase())
  ) || [];

  const handleDeleteCommand = (commandId: number, commandName: string) => {
    if (window.confirm(`Are you sure you want to delete "${commandName}"?`)) {
      deleteCommandMutation.mutate(commandId);
      setSelectedCommands(prev => {
        const newSet = new Set(prev);
        newSet.delete(commandId);
        return newSet;
      });
    }
  };

  return (
    <div className="p-6 space-y-6 h-full overflow-y-auto scrollbar-thin">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-semibold flex items-center">
            <i className="fas fa-bolt text-yellow-400 mr-3"></i>
            Command Center
          </h2>
          <p className="text-sm text-gray-500">Manage and execute your quick commands</p>
        </div>
        <Button 
          className="bg-primary hover:bg-primary/80"
          onClick={() => setShowAddCommandModal(true)}
        >
          <Plus className="h-4 w-4 mr-2" />
          Add Command
        </Button>
      </div>

      {/* Control Panel */}
      <div className="neumorphic rounded-xl p-6">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Search and Selection */}
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium mb-2 block">Search Commands</label>
              <Input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search by name or command..."
                className="bg-[var(--bg-main)] border-gray-600"
              />
            </div>
            
            <div className="flex items-center gap-4">
              <Button
                variant="outline"
                size="sm"
                onClick={selectAllCommands}
                className="border-gray-600"
              >
                {selectedCommands.size === quickCommands?.length ? "Deselect All" : "Select All"}
              </Button>
              <span className="text-sm text-gray-500">
                {selectedCommands.size} of {quickCommands?.length || 0} selected
              </span>
            </div>
          </div>

          {/* Execution Controls */}
          <div className="space-y-4">
            <div className="flex gap-2">
              <Button
                onClick={runSelectedCommands}
                disabled={isRunning || selectedCommands.size === 0}
                className="bg-blue-600 hover:bg-blue-700"
              >
                <Play className="h-4 w-4 mr-2" />
                Run Selected
              </Button>
              <Button
                onClick={runAllCommands}
                disabled={isRunning || !quickCommands?.length}
                className="bg-green-600 hover:bg-green-700"
              >
                <PlayCircle className="h-4 w-4 mr-2" />
                Run All
              </Button>
            </div>

            <div className="flex gap-2 items-center">
              <Input
                type="time"
                value={scheduledTime}
                onChange={(e) => setScheduledTime(e.target.value)}
                className="bg-[var(--bg-main)] border-gray-600 w-32"
              />
              <Button
                onClick={scheduleCommands}
                disabled={isRunning || selectedCommands.size === 0}
                variant="outline"
                className="border-gray-600"
              >
                <Clock className="h-4 w-4 mr-2" />
                Schedule
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Commands List */}
      <div className="neumorphic rounded-xl p-6">
        <h3 className="text-lg font-semibold mb-4">Commands</h3>
        
        {commandsLoading ? (
          <div className="flex items-center justify-center py-8">
            <div className="loading-spinner w-6 h-6 border-2 border-primary border-t-transparent rounded-full"></div>
          </div>
        ) : filteredCommands.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <i className="fas fa-bolt text-4xl mb-4 opacity-50"></i>
            <p>No commands found</p>
            <p className="text-sm">
              {searchQuery ? "Try a different search term" : "Use the + button to add your first command"}
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {filteredCommands.map((command: any) => (
              <div 
                key={command.id}
                className={`bg-[var(--bg-main)] rounded-lg p-4 border transition-colors ${
                  selectedCommands.has(command.id) 
                    ? 'border-primary bg-primary/5' 
                    : 'border-gray-600 hover:border-gray-500'
                }`}
              >
                <div className="flex items-center gap-4">
                  <Checkbox
                    checked={selectedCommands.has(command.id)}
                    onCheckedChange={() => toggleCommandSelection(command.id)}
                  />
                  
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <i className={`fas ${
                        command.type === 'bash' ? 'fa-terminal text-primary' :
                        command.type === 'python' ? 'fa-python text-green-400' :
                        'fa-search text-blue-400'
                      }`}></i>
                      <h4 className="font-medium">{command.name}</h4>
                    </div>
                    <p className="text-sm text-gray-500 mb-1">{command.command}</p>
                    {command.description && (
                      <p className="text-xs text-gray-400">{command.description}</p>
                    )}
                  </div>

                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      onClick={() => executeCommand(command)}
                      disabled={isRunning}
                      className="bg-primary/20 hover:bg-primary/30"
                    >
                      <Play className="h-3 w-3" />
                    </Button>
                    {!command.isDefault && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleDeleteCommand(command.id, command.name)}
                        className="text-red-400 hover:text-red-300 border-gray-600"
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <AddCommandModal 
        isOpen={showAddCommandModal}
        onClose={() => setShowAddCommandModal(false)}
      />
    </div>
  );
}
