import React, { useState, useRef, useEffect } from "react";
import ReactMarkdown from 'react-markdown';
import { useAgent } from "@/hooks/useAgent";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { ReusableChatInput } from "./ReusableChatInput"; // Import the new reusable component

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
  onNewChat: () => void;
  onAddDocument: () => void;
}

export default function ChatInterface({
  messages,
  setMessages,
  currentSessionId,
  setCurrentSessionId,
  onNewChat,
  onAddDocument
}: ChatInterfaceProps) {
  const { user } = useAuth();
  const { chat } = useAgent();
  const { toast } = useToast();
  const [copiedMessageId, setCopiedMessageId] = useState<number | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const chatContainerRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      scrollToBottom();
    }, 100);
    return () => clearTimeout(timer);
  }, [messages]);

  const handleSubmit = async (input: string) => {
    if (!input.trim() || chat.isPending) return;

    const userMessage: Message = {
      role: 'user',
      content: input.trim(),
      timestamp: new Date().toISOString()
    };

    setMessages(prev => [...prev, userMessage]);

    try {
      const result = await chat.mutateAsync({
        message: input.trim(),
        model: (user as any)?.preferences?.currentModel,
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

  const formatTime = (timestamp: string) => {
    return new Date(timestamp).toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    });
  };

  const handleCopyCode = (codeContent: string, messageId: number) => {
    navigator.clipboard.writeText(codeContent);
    setCopiedMessageId(messageId);
    setTimeout(() => {
      setCopiedMessageId(null);
    }, 2000);
  };

  const handleDownloadCode = (codeContent: string, messageId: number) => {
    const blob = new Blob([codeContent], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `code-${messageId}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const InlineCode = ({ children }: any) => (
    <code className="px-1 py-0.5 rounded font-mono text-sm bg-gray-800 text-gray-200 border border-gray-600">
      {children}
    </code>
  );

  const CodeBlock = ({ children, className, ...props }: any) => {
    const messageId = props.messageId;
    const codeContent = String(children).replace(/\n$/, ''); // Extract and trim trailing newline
    return (
      <div className="relative group">
        <pre className={`code-block max-w-none mb-3 ${className}`}>
          <code>{children}</code>
          <div className="absolute top-2 right-4 p-1 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
            <button
              onClick={() => handleDownloadCode(codeContent, messageId)}
              className="text-gray-400 hover:text-white bg-gray-700/50 rounded-md p-1"
              title="Download Code"
            >
              <i className="fas fa-download"></i>
            </button>
            <button
              onClick={() => handleCopyCode(codeContent, messageId)}
              className="text-gray-400 hover:text-white bg-gray-700/50 rounded-md p-1"
              title="Copy Code"
            >
              {copiedMessageId === messageId ? (
                <i className="fas fa-check"></i>
              ) : (
                <i className="fas fa-copy"></i>
              )}
            </button>
          </div>
        </pre>
      </div>
    );
  };

  return (
    <div className="h-full flex flex-col relative">
      {/* Chat Messages Area */}
      <div ref={chatContainerRef} className="flex-1 overflow-y-auto p-6 space-y-4 scrollbar-thin pb-28">
        {messages.length === 0 && (
          <div className="text-center text-[var(--text-muted)] mt-20">
            <img src="/favicon.svg" alt="Chat Bot" className="w-16 h-16 mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">Welcome to LocalAgent LLM</h3>
            <p>Start a conversation with your AI assistant.</p>
            <p>You can ask questions, request code, or execute commands.</p>
          </div>
        )}

        {messages.map((msg, index) => (
          <div key={index} className="chat-message">
            {msg.role === 'user' && (
              <div className="flex justify-end">
                <div className="max-w-3xl bg-primary rounded-2xl px-4 py-3">
                  <div className="prose prose-invert max-w-none text-white">
                  <ReactMarkdown
                    components={{
                      pre: ({ children }) => children,
                      code: ({ node, className, children, ...props }) => {
                        if (className || String(children).includes('\n')) {
                          return <CodeBlock {...props} messageId={index} className="text-white">{children}</CodeBlock>;
                        }
                        const code = String(children).replace(/`/g, '');
                        return <InlineCode>{code}</InlineCode>;
                      }
                    }}
                  >
                    {msg.content}
                  </ReactMarkdown>
                </div>
                  <div className="text-xs text-blue-200 mt-2">{formatTime(msg.timestamp)}</div>
                </div>
              </div>
            )}

            {msg.role === 'assistant' && (
              <div className="flex">
                <div className="max-w-3xl bg-[#111] rounded-2xl px-4 py-3 border border-gray-700">
                  <div className="flex items-center mb-2">
                    <i className="fas fa-robot text-primary mr-2"></i>
                    <span className="text-sm font-medium">Agent</span>
                  </div>
                  <div className="prose max-w-none text-[var(--text-secondary)] mb-3">
                    <ReactMarkdown
                      components={{
                        pre: ({ children }) => children,
                        code: ({ node, className, children, ...props }) => {
                          if (className || String(children).includes('\n')) {
                            return <CodeBlock {...props} messageId={index} className="text-[var(--text-secondary)]">{children}</CodeBlock>;
                          }
                          const code = String(children).replace(/`/g, '');
                          return <InlineCode>{code}</InlineCode>;
                        }
                      }}
                    >
                      {msg.content}
                    </ReactMarkdown>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="text-xs text-[var(--text-muted)]">{formatTime(msg.timestamp)}</div>
                    <button
                      className="text-primary hover:text-white transition-colors text-xs"
                      onClick={() => handleCopyCode(msg.content, index)}
                    >
                      {copiedMessageId === index ? (
                        <><i className="fas fa-check mr-1"></i>Copied!</>
                      ) : (
                        <><i className="fas fa-copy mr-1"></i>Copy</>
                      )}
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
      <ReusableChatInput 
        onSubmit={handleSubmit}
        isSubmitting={chat.isPending}
        onNewChat={onNewChat}
        onAddDocument={onAddDocument}
      />
    </div>
  );
}