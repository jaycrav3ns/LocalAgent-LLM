import React, { useState, useRef, useEffect } from "react";
import ReactMarkdown from 'react-markdown';
import useSpeechToText from 'react-hook-speech-to-text';
import { useAgent } from "@/hooks/useAgent";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";

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
  const [input, setInput] = useState("");
  const [showMenu, setShowMenu] = useState(false);
  const [copiedMessageId, setCopiedMessageId] = useState<number | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const chatContainerRef = useRef<HTMLDivElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  const {
    error,
    interimResult,
    isRecording,
    results,
    startSpeechToText,
    stopSpeechToText,
  } = useSpeechToText({
    continuous: true,
    useLegacyResults: false,
    crossBrowser: true,
    speechRecognitionProperties: {
      interimResults: true,
    },
    googleApiKey: import.meta.env.VITE_GOOGLE_API_KEY,
  });

  useEffect(() => {
    if (error) {
      toast({
        variant: "destructive",
        title: "Voice Input Error",
        description: error,
      });
    }
  }, [error, toast]);

  useEffect(() => {
    const lastResult = results[results.length - 1];
    if (lastResult?.transcript) {
      setInput(prevInput => prevInput.trim() ? prevInput + ' ' + lastResult.transcript.trim() : lastResult.transcript.trim());
    }
  }, [results]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setShowMenu(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      scrollToBottom();
    }, 100);
    return () => clearTimeout(timer);
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

  const CodeBlock = ({ children, ...props }: any) => {
    const messageId = props.messageId;
    const codeContent = String(children).replace(/\n$/, ''); // Extract and trim trailing newline
    return (
      <div className="relative group">
        <pre className="code-block max-w-none text-[var(--text-secondary)] mb-3">
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

  const toggleListening = (e: React.MouseEvent) => {
    e.preventDefault();
    setShowMenu(false);
    if (isRecording) {
      stopSpeechToText();
    } else {
      setInput('');
      startSpeechToText();
    }
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
                  <p className="text-white whitespace-pre-wrap">{msg.content}</p>
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
                            return <CodeBlock {...props} messageId={index}>{children}</CodeBlock>;
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
      <div className="chat-input-container absolute bottom-0 left-0 right-0 bg-gray-900 border-t border-gray-700">
        <div className="chat-input-row">
          <div className="menu-wrap" ref={menuRef}>
            <ul className="menu">
              <li className="menu-item">
                <button className="menu-button text-[var(--text-primary)] font-medium hover:bg-[var(--input-dark)]" onClick={() => setShowMenu(!showMenu)}>
                  <i className="fa-solid fa-chevron-up ml-3"></i>
                </button>
                <ul className="drop-menu" style={{ visibility: showMenu ? 'visible' : 'hidden', opacity: showMenu ? 1 : 0, transform: showMenu ? 'translateY(0)' : 'translateY(10px)' }}>
                  <li className="drop-menu-item">
                    <a href="#" onClick={onNewChat}><i className="fa-solid fa-comment"></i>New Chat</a>
                  </li>
                  <li className="drop-menu-item">
                    <a href="#" onClick={onAddDocument}><i className="fa-solid fa-paperclip"></i>Add File</a>
                  </li>
                  <li className="drop-menu-item">
                    <a href="#" onClick={toggleListening} title={error ? "Speech recognition not supported" : (isRecording ? "Stop listening" : "Start voice input")}>
                      {isRecording ? (
                        <><i className="fa-solid fa-microphone-slash text-red-500"></i><span className="ml-2">Stop Listening</span></>
                      ) : (
                        <><i className={`fa-solid fa-microphone ${error ? 'text-gray-500' : ''}`}></i><span className="ml-2">Voice Input</span></>
                      )}
                    </a>
                  </li>
                </ul>
              </li>
            </ul>
          </div>

					<textarea
			          ref={textareaRef}
			          className="chat-textarea scrollbar-thin"
			          placeholder={interimResult || "Type a prompt..."}
			          rows={1}
			          value={input}
			          onChange={(e) => setInput(e.target.value)}
			          onKeyDown={handleKeyDown}
			          disabled={chat.isPending}
			        ></textarea>

			        <button
			          className="send-button font-medium hover:bg-[var(--input-dark)]"
			          onClick={handleSubmit}
			          disabled={!input.trim() || chat.isPending}
			        >
			          {chat.isPending ? (
			            <div className="loading-spinner w-4 h-4 border-2 border-white border-t-transparent rounded-full"></div>
			          ) : (
			            <i className="fa-solid fa-paper-plane ml-2"></i>
			          )}
			        </button>
        </div>
      </div>
    </div>
  );

}
