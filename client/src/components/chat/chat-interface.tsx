import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useAgent } from "@/hooks/useAgent";
import { useAuth } from "@/hooks/useAuth";

interface Message {
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: string;
}

interface ChatInterfaceProps {
  messages: Message[];
  setMessages: React.Dispatch<React.SetStateAction<Message[]>>;
  currentSessionId: number | null;
  setCurrentSessionId: React.Dispatch<React.SetStateAction<number | null>>;
}

export default function ChatInterface({ 
  messages, 
  setMessages, 
  currentSessionId, 
  setCurrentSessionId 
}: ChatInterfaceProps) {
  const { user } = useAuth();
  const { chat } = useAgent();
  const [input, setInput] = useState("");
  const [showNewChatModal, setShowNewChatModal] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || chat.isPending) return;

    const userMessage: Message = {
      role: 'user',
      content: input.trim(),
      timestamp: new Date().toISOString()
    };

    setMessages(prev => [...prev, userMessage]);
    setInput("");

    try {
      const result = await chat.mutateAsync({
        message: input.trim(),
        model: user?.preferences?.currentModel,
        sessionId: currentSessionId || undefined
      });

      if (result.sessionId && !currentSessionId) {
        setCurrentSessionId(result.sessionId);
      }

      const assistantMessage: Message = {
        role: 'assistant',
        content: result.message.content,
        timestamp: result.message.timestamp
      };

      setMessages(prev => [...prev, assistantMessage]);

      if (!result.success) {
        const errorMessage: Message = {
          role: 'system',
          content: `Error: ${result.message.content}`,
          timestamp: new Date().toISOString()
        };
        setMessages(prev => [...prev, errorMessage]);
      }
    } catch (error) {
      console.error("Chat error:", error);
      const errorMessage: Message = {
        role: 'system',
        content: "Failed to send message. Please try again.",
        timestamp: new Date().toISOString()
      };
      setMessages(prev => [...prev, errorMessage]);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  const formatTime = (timestamp: string) => {
    return new Date(timestamp).toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    });
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  const newChat = () => {
    if (messages.length > 0) {
      setShowNewChatModal(true);
    } else {
      confirmNewChat();
    }
  };

  const confirmNewChat = () => {
    setMessages([]);
    setCurrentSessionId(null);
    setShowNewChatModal(false);
  };

  return (
    <div className="h-full flex flex-col overflow-hidden">
      {/* Chat Messages Area */}
      <div className="flex-1 overflow-y-auto p-6 space-y-4 scrollbar-thin">
        {messages.length === 0 && (
          <div className="text-center text-[var(--text-muted)] mt-20">
            <div className="w-16 h-16 bg-primary rounded-full flex items-center justify-center mx-auto mb-4">
              <i className="fas fa-robot text-2xl text-white"></i>
            </div>
            <h3 className="text-lg font-semibold mb-2">Welcome to LocalAgent LLM</h3>
            <p>Start a conversation with your AI assistant. You can ask questions, request code, or execute commands.</p>
          </div>
        )}

        {messages.map((msg, index) => (
          <div key={index} className="chat-message">
            {msg.role === 'user' && (
              <div className="flex justify-end">
                <div className="max-w-3xl bg-primary rounded-2xl px-4 py-3">
                  <p className="text-white whitespace-pre-wrap">{msg.content}</p>
                  <div className="text-xs text-blue-200 mt-2">{formatTime(msg.timestamp)}</div>
                </div>
              </div>
            )}

            {msg.role === 'assistant' && (
              <div className="flex justify-start">
                <div className="max-w-3xl bg-[var(--bg-card)] rounded-2xl px-4 py-3 border border-gray-700">
                  <div className="flex items-center mb-2">
                    <i className="fas fa-robot text-primary mr-2"></i>
                    <span className="text-sm font-medium">Agent</span>
                  </div>
                  <div className="text-[var(--text-secondary)] mb-3 whitespace-pre-wrap">{msg.content}</div>
                  <div className="flex items-center justify-between">
                    <div className="text-xs text-[var(--text-muted)]">{formatTime(msg.timestamp)}</div>
                    <button 
                      className="text-primary hover:text-white transition-colors text-xs"
                      onClick={() => copyToClipboard(msg.content)}
                    >
                      <i className="fas fa-copy mr-1"></i>Copy
                    </button>
                  </div>
                </div>
              </div>
            )}

            {msg.role === 'system' && (
              <div className="flex justify-center">
                <div className="bg-yellow-900 bg-opacity-30 border border-yellow-600 rounded-lg px-4 py-2 text-yellow-200 text-sm">
                  <i className="fas fa-info-circle mr-2"></i>
                  {msg.content}
                </div>
              </div>
            )}
          </div>
        ))}

        {chat.isPending && (
          <div className="flex justify-start">
            <div className="max-w-3xl bg-[var(--bg-card)] rounded-2xl px-4 py-3 border border-gray-700">
              <div className="flex items-center mb-2">
                <i className="fas fa-robot text-primary mr-2"></i>
                <span className="text-sm font-medium">Agent</span>
              </div>
              <div className="flex items-center space-x-2">
                <div className="loading-spinner w-4 h-4 border-2 border-primary border-t-transparent rounded-full"></div>
                <span className="text-[var(--text-muted)] text-sm">Thinking...</span>
              </div>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Chat Input */}
      <div className="border-t border-gray-700 p-4">
        <form onSubmit={handleSubmit} className="space-y-3">
          <div className="flex space-x-2">
            <textarea
              ref={textareaRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Enter your message..."
              className="flex-1 bg-[var(--bg-main)] border border-gray-600 rounded-lg px-4 py-3 text-[var(--text-primary)] placeholder-[var(--text-muted)] resize-none focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
              rows={1}
              disabled={chat.isPending}
            />
            <Button
              type="submit"
              disabled={!input.trim() || chat.isPending}
              className="bg-primary hover:bg-primary/80 px-6"
            >
              {chat.isPending ? (
                <div className="loading-spinner w-4 h-4 border-2 border-white border-t-transparent rounded-full"></div>
              ) : (
                <i className="fas fa-paper-plane"></i>
              )}
            </Button>
          </div>
        </form>
      </div>

      {/* New Chat Confirmation Modal */}
      {showNewChatModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-[var(--bg-card)] rounded-lg p-6 max-w-sm mx-4 border border-gray-600">
            <div className="flex items-center gap-3 mb-4">
              <i className="fas fa-exclamation-triangle text-yellow-500 text-xl"></i>
              <h3 className="text-lg font-semibold">Start New Chat?</h3>
            </div>
            <p className="text-[var(--text-muted)] mb-6">This will clear your current conversation. Are you sure?</p>
            <div className="flex gap-3 justify-end">
              <Button
                variant="ghost"
                onClick={() => setShowNewChatModal(false)}
                className="hover:bg-gray-700"
              >
                Cancel
              </Button>
              <Button
                onClick={confirmNewChat}
                className="bg-primary hover:bg-primary/80"
              >
                <i className="fas fa-plus mr-2"></i>
                Start New Chat
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
