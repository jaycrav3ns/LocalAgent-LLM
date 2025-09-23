import React, { useState, useRef, useEffect } from 'react';
import useSpeechToText from 'react-hook-speech-to-text';
import { useToast } from "@/hooks/use-toast";

interface ReusableChatInputProps {
  onSubmit: (prompt: string) => void;
  isSubmitting: boolean;
  onNewChat?: () => void;
  onAddDocument?: () => void;
}

export const ReusableChatInput: React.FC<ReusableChatInputProps> = ({ 
  onSubmit, 
  isSubmitting, 
  onNewChat, 
  onAddDocument 
}) => {
  const { toast } = useToast();
  const [input, setInput] = useState("");
  const [showMenu, setShowMenu] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
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
    if (lastResult && typeof lastResult === 'object' && lastResult.transcript) {
      setInput(prevInput => prevInput.trim() ? prevInput + ' ' + lastResult.transcript.trim() : lastResult.transcript.trim());
    }
  }, [results]);

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

  const handleLocalSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isSubmitting) return;
    onSubmit(input.trim());
    setInput("");
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleLocalSubmit(e);
    }
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
    <div className="chat-input-container absolute bottom-0 left-0 right-0 bg-gray-900 border-t border-gray-700">
      <div className="chat-input-row">
        <div className="menu-wrap" ref={menuRef}>
          <ul className="menu">
            <li className="menu-item">
              <button className="menu-button text-[var(--text-primary)] font-medium hover:bg-[var(--primary-deep-dark)]" onClick={() => setShowMenu(!showMenu)}>
                <i className="fa-solid fa-chevron-up ml-3"></i>
              </button>
              <ul className="drop-menu" style={{ visibility: showMenu ? 'visible' : 'hidden', opacity: showMenu ? 1 : 0, transform: showMenu ? 'translateY(0)' : 'translateY(10px)' }}>
                {onNewChat && <li className="drop-menu-item"><a href="#" onClick={onNewChat}><i className="fa-solid fa-comment"></i>New Chat</a></li>}
                {onAddDocument && <li className="drop-menu-item"><a href="#" onClick={onAddDocument}><i className="fa-solid fa-paperclip"></i>Add File</a></li>}
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
          disabled={isSubmitting}
        ></textarea>

        <button
          className="send-button font-medium hover:bg-[var(--primary-deep-dark)]"
          onClick={handleLocalSubmit}
          disabled={!input.trim() || isSubmitting}
        >
          {isSubmitting ? (
            <div className="loading-spinner w-4 h-4 border-2 border-white border-t-transparent rounded-full"></div>
          ) : (
            <i className="fa-solid fa-paper-plane ml-2"></i>
          )}
        </button>
      </div>
    </div>
  );
};
