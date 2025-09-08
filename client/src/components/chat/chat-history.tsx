import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { formatDistanceToNow } from "date-fns";

interface ChatSession {
  id: number;
  title: string | null;
  model: string;
  messages: Array<{
    role: 'user' | 'assistant' | 'system';
    content: string;
    timestamp: string;
  }> | null;
  createdAt: string;
  updatedAt: string;
}

interface ChatHistoryProps {
  onResumeChat: (session: ChatSession) => void;
  onDownloadChat: (session: ChatSession) => void;
}

export default function ChatHistory({ onResumeChat, onDownloadChat }: ChatHistoryProps) {
  const { user } = useAuth();
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      loadChatHistory();
    }
  }, [user]);

  const handleDeleteSession = async (sessionId: number) => {
    if (!window.confirm("Are you sure you want to delete this chat session?")) {
      return;
    }
    try {
      const response = await fetch(`/api/chat/sessions/${sessionId}`, {
        method: 'DELETE',
        credentials: 'include'
      });
      if (response.ok) {
        setSessions(prevSessions => prevSessions.filter(session => session.id !== sessionId));
        console.log(`Session ${sessionId} deleted successfully.`);
      } else {
        console.error(`Failed to delete session ${sessionId}:`, response.status);
      }
    } catch (error) {
      console.error(`Error deleting session ${sessionId}:`, error);
    }
  };

  const loadChatHistory = async () => {
    try {
      const response = await fetch('/api/chat/sessions', {
        credentials: 'include'
      });
      if (response.ok) {
        const data = await response.json();
        console.log('Loaded chat sessions:', data); // Debug log
        setSessions(data);
      } else {
        console.error('Failed to load sessions:', response.status);
      }
    } catch (error) {
      console.error('Failed to load chat history:', error);
    } finally {
      setLoading(false);
    }
  };

  const getMessageCount = (messages: ChatSession['messages']) => {
    return messages?.length || 0;
  };

  const getPreview = (messages: ChatSession['messages']) => {
    const firstUserMessage = messages?.find(m => m.role === 'user');
    return firstUserMessage?.content.substring(0, 100) + "..." || "No messages";
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="loading-spinner w-6 h-6 border-2 border-primary border-t-transparent rounded-full"></div>
      </div>
    );
  }

  if (sessions.length === 0) {
    return (
      <div className="text-center py-8">
        <i className="fas fa-comments text-4xl text-gray-500 mb-4"></i>
        <p className="text-[var(--text-muted)]">No chat history yet...</p>
        <p className="text-sm text-[var(--text-muted)] mt-2">Start a conversation to see your chat history here.</p>
      </div>
    );
  }

  return (
    <div className="chat-history">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-600">
              <th className="text-left py-3 px-2 text-[var(--text-muted)]">Title</th>
              <th className="text-left py-3 px-2 text-[var(--text-muted)]">Preview</th>
              <th className="text-left py-3 px-2 text-[var(--text-muted)]">Model</th>
              <th className="text-left py-3 px-2 text-[var(--text-muted)]">Messages</th>
              <th className="text-left py-3 px-2 text-[var(--text-muted)]">Created</th>
              <th className="text-left py-3 px-2 text-[var(--text-muted)]">Actions</th>
            </tr>
          </thead>
          <tbody>
            {sessions.map((session) => (
              <tr key={session.id} className="border-b border-gray-700 hover:bg-gray-800/50">
                <td className="py-3 px-2">
                  <div className="font-medium text-[var(--text-primary)]">
                    {session.title || `Chat ${session.id}`}
                  </div>
                </td>
                <td className="py-3 px-2">
                  <div className="text-[var(--text-muted)] max-w-xs truncate">
                    {getPreview(session.messages)}
                  </div>
                </td>
                <td className="py-3 px-2">
                  <span className="bg-primary/20 text-primary px-2 py-1 rounded text-xs">
                    {session.model}
                  </span>
                </td>
                <td className="py-3 px-2 text-[var(--text-muted)]">
                  {getMessageCount(session.messages)}
                </td>
                <td className="py-3 px-2 text-[var(--text-muted)]">
                  {formatDistanceToNow(new Date(session.createdAt), { addSuffix: true })}
                </td>
                <td className="py-3 px-2">
                  <div className="flex gap-2">
                    <button 
                      className="text-primary hover:text-primary/80"
                      title="Resume Chat"
                      onClick={() => onResumeChat(session)}
                    >
                      <i className="fas fa-play"></i>
                    </button>
                    <button 
                      className="text-yellow-500 hover:text-yellow-400"
                      title="Download"
                      onClick={() => onDownloadChat(session)}
                    >
                      <i className="fas fa-download"></i>
                    </button>
                    <button 
                      className="text-red-500 hover:text-red-400"
                      title="Delete"
                      onClick={() => handleDeleteSession(session.id)}
                    >
                      <i className="fas fa-trash"></i>
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
