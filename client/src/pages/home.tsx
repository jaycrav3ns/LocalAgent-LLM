import { useState, useEffect, useRef } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { isUnauthorizedError } from "@/lib/authUtils";
import { Circle, HelpCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";

import ChatInterface from "@/components/chat/chat-interface";
import FileBrowser from "@/components/workspace/file-browser";
import UsernameModal from "@/components/modals/username-modal";
import ModelSelectorModal from "@/components/modals/model-selector-modal";
import HelpModal from "@/components/modals/help-modal";
import ToolboxModal from "@/components/modals/tool-box-modal";
import ChatHistory from "@/components/chat/chat-history";
import { WorkspaceSelector } from "@/components/workspace-selector";
import { WorkspaceManager } from "@/components/workspace/WorkspaceManager";
import { WorkspaceViewer } from "@/components/workspace/WorkspaceViewer";
import { useQuery } from "@tanstack/react-query";
import CommandsPanel from "@/components/commands/CommandsPanel";
import ToolsPanel from "@/components/tools/tool-box";
import { TerminalProvider } from "@/contexts/TerminalContext";

type Tab = 'chat' | 'workspace' | 'tools' | 'history';

interface User {
  displayName?: string;
  username?: string;
  email?: string;
  preferences?: {
    currentModel?: string;
  };
}

interface ChatSession {
  id: number;
  title: string | null;
  messages: Array<{
    role: 'user' | 'assistant' | 'system';
    content: string;
    timestamp: string;
  }> | null;
  model: string;
}

export default function Home() {
  const { user, isLoading, logout, isLoggingOut } = useAuth();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState<'chat' | 'history' | 'workspace' | 'commands' | 'tools'>('chat');
  const [showUsernameModal, setShowUsernameModal] = useState(false);
  const [showModelModal, setShowModelModal] = useState(false);
  const [showHelpModal, setShowHelpModal] = useState(false);
  const [showNewChatModal, setShowNewChatModal] = useState(false);
  const [selectedWorkspace, setSelectedWorkspace] = useState<string>("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  

  // Chat state persistence
  const [chatMessages, setChatMessages] = useState<Array<{
    role: 'user' | 'assistant' | 'system';
    content: string;
    timestamp: string;
  }>>([]); 
  const [currentSessionId, setCurrentSessionId] = useState<number | null>(null);

  // Add connection status state
  const [connectionStatus, setConnectionStatus] = useState<'connecting' | 'connected' | 'error'>('connecting');

  const getDisplayName = () => {
    if (!user) return "User";
    const u = user as User;
    return u.displayName || u.username || u.email || "User";
  };

  const newChat = () => {
    if (chatMessages.length > 0) {
      setShowNewChatModal(true);
    } else {
      confirmNewChat();
    }
  };

  const confirmNewChat = () => {
    setChatMessages([]);
    setCurrentSessionId(null);
    setShowNewChatModal(false);
  };

  

  const downloadChat = (session: ChatSession) => {
    const chatData = {
      title: session.title || `Chat ${session.id}`,
      messages: session.messages,
      timestamp: new Date().toISOString(),
      model: session.model
    };
    
    const blob = new Blob([JSON.stringify(chatData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `chat-${session.id}-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const resumeChat = (session: ChatSession) => {
    setChatMessages(session.messages || []);
    setCurrentSessionId(session.id);
    setActiveTab('chat');
  };

  const handleAddDocument = () => {
    fileInputRef.current?.click();
  };

  const handleFileSelected = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        const content = e.target?.result as string;
        setChatMessages((prevMessages) => [
          ...prevMessages,
          {
            role: "system",
            content: `Document added to context: ${file.name}\n\n${content}`,
            timestamp: new Date().toISOString(),
          },
        ]);
        toast({ title: `Added document to context: ${file.name}` });
      };
      reader.readAsText(file);
    }
  };

  // Add connection check function
  const checkConnection = async () => {
    try {
      const response = await fetch('/api/health');
      if (response.ok) {
        setConnectionStatus('connected');
        return true;
      } else {
        setConnectionStatus('error');
        return false;
      }
    } catch (error) {
      setConnectionStatus('error');
      return false;
    }
  };

  // Add useEffect for connection monitoring
  useEffect(() => {
    checkConnection();
    const interval = setInterval(checkConnection, 300000); // Check every 5 minutes instead of 30 seconds
    return () => clearInterval(interval);
  }, []);

  // User authentication is handled by the Router in App.tsx

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[var(--bg-main)] flex items-center justify-center">
        <div className="text-center">
          <div className="loading-spinner w-8 h-8 border-2 border-primary border-t-transparent rounded-full mx-auto mb-4"></div>
          <p className="text-[var(--text-muted)]">Loading...</p>
        </div>
      </div>
    );
  }

  if (!user) return null;

  const { data: currentWorkspace } = useQuery({
    queryKey: ["workspace", selectedWorkspace],
    queryFn: async () => {
      const response = await fetch(`/api/workspaces/${selectedWorkspace}`);
      if (!response.ok) throw new Error("Failed to fetch workspace");
      return response.json();
    },
    enabled: !!selectedWorkspace,
  });

  return (
    <TerminalProvider>
      <div className="flex h-screen">
        {/* Main Content */}
        <div className="flex-1 flex flex-col min-w-0">
          {/* Tabbed Interface */}
          <div className="chat-main flex-1 flex flex-col h-full">
            {/* Username Bar */}
            <div className="username-bar">
              <div className="flex items-center gap-2">
                <span>Hello, <span className="username">{getDisplayName()}</span></span>
                <button 
                  className="change-username-btn" 
                  onClick={() => setShowUsernameModal(true)}
                  title="Change username"
                >
                  <i className="fa-solid fa-pencil"></i>
                </button>
              </div>
              <div className="flex items-center gap-3">
                {/* Workspace Info Display */}
                {selectedWorkspace && currentWorkspace ? (
                  <div className="workspace-info-display">
                    <i className="fas fa-folder text-yellow-400"></i>
                    <span className="workspace-name">{currentWorkspace.name}</span>
                  </div>
                ) : (
                  <div className="workspace-info-display inactive">
                    <i className="fas fa-folder-open text-gray-500"></i>
                    <span className="workspace-name">No Workspace</span>
                  </div>
                )}
              
                <button 
                  className="model-selector-btn" 
                  onClick={() => setShowModelModal(true)}
                  title={`Model: ${(user as User)?.preferences?.currentModel || "deepseek-r1:latest"}`}
                >
                  <div className="flex items-center gap-2">
                    <span className={`h-3 w-3 rounded-full ${ 
                      connectionStatus === 'connected' ? 'bg-green-500' : 
                      connectionStatus === 'connecting' ? 'bg-yellow-400' : 
                      'bg-red-500'
                    }`}></span>
                    <i className="fas fa-microchip"></i>
                    <span className="ml-1">{(user as User)?.preferences?.currentModel?.split(':')[0] || "deepseek-r1"}</span>
                  </div>
                </button>
                <button 
                  className="logout-btn-header" 
                  onClick={logout}
                  disabled={isLoggingOut}
                  title="Logout"
                >
                  {isLoggingOut ? (
                    <i className="fas fa-spinner fa-spin"></i>
                  ) : (
                    <i className="fas fa-sign-out-alt"></i>
                  )}
                </button>
              </div>
            </div>
          
            {/* Chat Tabs Bar - integrated into main container */}
            <div className="chat-tabs-bar">
              <button 
                className={`tab-btn ${activeTab === 'chat' ? 'active' : ''}`}
                onClick={() => setActiveTab('chat')}
              >
                Chat
              </button>
              <button 
                className={`tab-btn ${activeTab === 'history' ? 'active' : ''}`}
                onClick={() => setActiveTab('history')}
              >
                History
              </button>
              <button 
                className={`tab-btn ${activeTab === 'workspace' ? 'active' : ''}`}
                onClick={() => setActiveTab('workspace')}
              >
                Workspace
              </button>
              <button 
                className={`tab-btn ${activeTab === 'commands' ? 'active' : ''}`}
                onClick={() => setActiveTab('commands')}
              >
                Commands
              </button>
              <button 
                className={`tab-btn ${activeTab === 'tools' ? 'active' : ''}`}
                onClick={() => setActiveTab('tools')}
              >
                Toolbox
              </button>
              <span className="tab-spacer"></span>
              <button 
                className="tab-btn help-btn mb-1"
                onClick={() => setShowHelpModal(true)}
                title="Help"
              >
                <i className="fa-solid fa-circle-question"></i>
              </button>
            </div>

            {/* Tab Content */}
            <div className={`tab-content ${activeTab === 'chat' ? 'active' : ''} flex-1 overflow-y-auto`}>
              {activeTab === 'chat' && (
                <ChatInterface 
                  messages={chatMessages}
                  setMessages={setChatMessages}
                  currentSessionId={currentSessionId}
                  setCurrentSessionId={setCurrentSessionId}
                  onNewChat={newChat}
                  onAddDocument={handleAddDocument}
                />
              )}
            </div>
          
            <div className={`tab-content ${activeTab === 'workspace' ? 'active' : ''} flex-1 overflow-y-auto`}>
              {activeTab === 'workspace' && selectedWorkspace ? (
                <WorkspaceViewer 
                  workspaceId={selectedWorkspace} 
                  onClose={() => setSelectedWorkspace("")}
                />
              ) : activeTab === 'workspace' ? (
                <WorkspaceManager onWorkspaceSelect={(id) => {
                  setSelectedWorkspace(id);
                  // Ensure we stay on workspace tab
                  setActiveTab('workspace');
                }} />
              ) : null}
            </div>
          
            <div className={`tab-content ${activeTab === 'history' ? 'active' : ''} flex-1 overflow-y-auto`}>
              <ChatHistory onResumeChat={resumeChat} onDownloadChat={downloadChat} />
            </div>
            <div className={`tab-content ${activeTab === 'commands' ? 'active' : ''} flex-1 overflow-y-auto`}>
              {activeTab === 'commands' && <CommandsPanel />}
            </div>
            <div className={`tab-content ${activeTab === 'tools' ? 'active' : ''} flex-1 overflow-y-auto p-4`}>
              {activeTab === 'tools' && <ToolsPanel />}
            </div>
          </div>
        </div>

        {/* Modals */}
        <UsernameModal 
          isOpen={showUsernameModal}
          onClose={() => setShowUsernameModal(false)}
          currentUsername={(user as User)?.username || ""}
        />
        <ModelSelectorModal
          isOpen={showModelModal}
          onClose={() => setShowModelModal(false)}
          currentModel={(user as User)?.preferences?.currentModel || "deepseek-r1:latest"}
        />
        <HelpModal
          isOpen={showHelpModal}
          onClose={() => setShowHelpModal(false)}
        />
        
        <AlertDialog open={showNewChatModal} onOpenChange={setShowNewChatModal}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Are you sure?</AlertDialogTitle>
              <AlertDialogDescription>
                This will start a new chat session and clear all current messages.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={confirmNewChat}>Continue</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
        <input
          type="file"
          ref={fileInputRef}
          style={{ display: "none" }}
          onChange={handleFileSelected}
        />
      </div>
    </TerminalProvider>
  );
}
