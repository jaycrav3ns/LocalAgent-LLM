import React, { useState, useRef, useEffect } from 'react';
import AceEditor from 'react-ace';
import ace from 'ace-builds/src-noconflict/ace';
import { ReusableChatInput } from '@/components/chat/ReusableChatInput';
import { useAgent } from "@/hooks/useAgent"; // Import useAgent hook
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast"; // Import useToast hook

// --- Ace Editor Setup ---
ace.config.setModuleUrl('ace/mode/html_worker', '/ace-workers/worker-html.js');

// Import ACE editor modes, themes, and extensions
import 'ace-builds/src-noconflict/mode-html';
import 'ace-builds/src-noconflict/mode-css';
import 'ace-builds/src-noconflict/mode-javascript';
import 'ace-builds/src-noconflict/mode-php';
import 'ace-builds/src-noconflict/mode-json';

import 'ace-builds/src-noconflict/theme-vibrant_ink';
import 'ace-builds/src-noconflict/theme-cloud9_night';
import 'ace-builds/src-noconflict/theme-cloud_editor_dark';
import 'ace-builds/src-noconflict/theme-clouds_midnight';
import 'ace-builds/src-noconflict/theme-dracula';
import 'ace-builds/src-noconflict/theme-github_dark';
import 'ace-builds/src-noconflict/theme-tomorrow_night';

import 'ace-builds/src-noconflict/ext-language_tools';

// --- Helper Function ---
function trimCodeFences(content: string): string {
    if (!content) return '';
    const lines = content.split('\n');
    
    // Check for start fence
    if (lines.length > 0 && lines[0].trim().startsWith('```')) {
        lines.shift();
    }

    // Check for end fence
    if (lines.length > 0 && lines[lines.length - 1].trim() === '```') {
        lines.pop();
    }

    return lines.join('\n');
}

interface EditorPageProps {
  editorContent: string;
  setEditorContent: (content: string) => void;
}

// --- Component Definition ---
const EditorPage: React.FC<EditorPageProps> = ({ editorContent, setEditorContent }) => {
  // State for editor settings
  const [mode, setMode] = useState('html');
  const [theme, setTheme] = useState('vibrant_ink');
  const [fontSize, setFontSize] = useState(16);
  const [wrapEnabled, setWrapEnabled] = useState(false);
  const [copyMessage, setCopyMessage] = useState('');
  const [showPreview, setShowPreview] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { chat } = useAgent(); // Initialize useAgent hook
  const { user } = useAuth();
  const { toast } = useToast(); // Initialize useToast hook

  // --- Handlers ---
  function onChange(newValue: string) {
    setEditorContent(newValue);
  }

  function onEditorLoad(editor: any) {
    setTimeout(() => editor.resize(), 100);
  }

  const handleCopy = () => {
    navigator.clipboard.writeText(editorContent).then(() => {
      setCopyMessage('✔');
      setTimeout(() => setCopyMessage(''), 2000);
    });
  };

  const handleExport = () => {
    const blob = new Blob([editorContent], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'export.html';
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleImportClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      const content = e.target?.result as string;
      setEditorContent(content);
    };
    reader.readAsText(file);
  };

  const handleGenerateCode = async (prompt: string) => {
    if (!prompt.trim()) return;

    const fullPrompt = `
    You are a code generation assistant. You will be given a prompt and you should only reply with the generated code. Do not include any explanations, introductions, or any other text that is not code.

    The user\'s prompt is:
    ${prompt}
    `;

    try {
      // Send the prompt to the LLM via the chat agent
      const result = await chat.mutateAsync({
        message: fullPrompt.trim(),
        model: (user as any)?.preferences?.currentModel,
      });

      if (result.success && result.message?.content) {
        const processedContent = trimCodeFences(result.message.content);
        setEditorContent(processedContent);
        toast({
          title: "Code Generated",
          description: "LLM successfully generated code.",
        });
      } else {
        toast({
          variant: "destructive",
          title: "Generation Failed",
          description: result.message?.content || "LLM did not return valid code.",
        });
      }
    } catch (error) {
      console.error("LLM Generation Error:", error);
      toast({
        variant: "destructive",
        title: "LLM Request Failed",
        description: "Could not connect to LLM or an unexpected error occurred.",
      });
    }
  };

  return (
    <div className="flex flex-col h-full">
      {/* Controls Bar */}
      <div className="flex items-center p-2 bg-[#222] border-b-2 border-gray-700 space-x-4">
        {/* Left side controls */}
        <select value={mode} onChange={(e) => setMode(e.target.value)} className="bg-[#111] text-gray-300 border border-gray-600 rounded px-2 py-1 text-sm rounded-md">
          <option value="html">HTML</option>
          <option value="css">CSS</option>
          <option value="javascript">JavaScript</option>
          <option value="php">PHP</option>
          <option value="json">JSON</option>
        </select>
        <select value={fontSize} onChange={(e) => setFontSize(parseInt(e.target.value, 10))} className="bg-[#111] text-gray-300 border border-gray-600 rounded px-2 py-1 text-sm rounded-md">
          <option value={12}>12px</option>
          <option value={14}>14px</option>
          <option value={16}>16px</option>
          <option value={18}>18px</option>
          <option value={20}>20px</option>
        </select>
        <select value={theme} onChange={(e) => setTheme(e.target.value)} className="bg-[#111] text-gray-300 border border-gray-600 rounded px-2 py-1 text-sm rounded-md">
          <option value="vibrant_ink">Vibrant Ink</option>
          <option value="cloud9_night">Cloud9 Night</option>
          <option value="cloud_editor_dark">CE Dark</option>
          <option value="clouds_midnight">Clouds Midnight</option>
          <option value="dracula">Dracula</option>
          <option value="github_dark">Github Dark</option>
          <option value="tomorrow_night">Tomorrow Night</option>
        </select>
        <label className="flex items-center space-x-2 text-sm text-gray-300">
          <input type="checkbox" checked={wrapEnabled} onChange={(e) => setWrapEnabled(e.target.checked)} className="form-checkbox h-4 w-4 text-blue-600 bg-gray-700 border-gray-600 rounded-md" />
          <span>Wrap</span>
        </label>
        <button onClick={() => setEditorContent('')} title="Clear Code" className="text-gray-300 hover:text-red-500 ml-4">
           <i className="fas fa-trash-alt ml-4"></i>
        </button>

        {/* Spacer */}
        <div className="flex-grow"></div>

        {/* Right side controls */}
        <input type="file" ref={fileInputRef} onChange={handleFileChange} style={{ display: 'none' }} />
        <button onClick={handleImportClick} title="Import" className="text-gray-300 hover:text-blue-500">
          <svg width="20" height="20" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" strokeLinejoin="round" strokeLinecap="square" strokeWidth="2.5" stroke="currentColor" fill="none"><g><title>Layer 1</title><path id="svg_1" d="m10.83333,22.16667l-7,0a2,2 0 0 1 -2,-2l0,-14c0,-1.1 0.9,-2 2,-2l5,0l2,3l9,0a2,2 0 0 1 2,2l0,2m-3,5l0,6m-3,-3l6,0"/></g></svg>
        </button>
        <button onClick={handleExport} title="Export" className="text-gray-300 hover:text-blue-500">
          <svg width="20" height="20" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" strokeLinejoin="round" strokeLinecap="square" strokeWidth="2.5" stroke="currentColor" fill="none"><g><title>Layer 1</title><path id="svg_1" d="m3,16.12501l0,4c0,1.1 0.9,2 2,2l14,0a2,2 0 0 0 2,-2l0,-4m-4,-6l-5,5l-5,-5m5,3.8l0,-10.3"/></g></svg>
        </button>
        <button onClick={handleCopy} title="Copy Text" className="text-gray-300 hover:text-blue-500">
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="square" strokeLinejoin="round"><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"></path><rect x="8" y="2" width="8" height="4" rx="1" ry="1"></rect></svg>
        </button>
        <span className="text-green-500 w-6">{copyMessage}</span>

        {/* Show Preview Checkbox */}
        <label className="flex items-center space-x-2 text-sm text-gray-300 ml-4">
          <input 
            type="checkbox" 
            checked={showPreview}
            onChange={(e) => setShowPreview(e.target.checked)}
            className="form-checkbox h-4 w-4 text-blue-600 bg-gray-700 border-gray-600 rounded-md"
          />
          <span>Show Preview</span>
        </label>
      </div>

      {/* Editor and Optional Preview Area */}
      <div className="flex-grow flex" style={{ minHeight: 0 }}>
        <div className={showPreview ? "w-1/2" : "w-full"}>
            <AceEditor
                mode={mode}
                theme={theme}
                onChange={onChange}
                onLoad={onEditorLoad}
                name="UNIQUE_ID_OF_DIV"
                editorProps={{ $blockScrolling: true }}
                value={editorContent}
                width="100%"
                height="100%"
                fontSize={fontSize}
                wrapEnabled={wrapEnabled}
                setOptions={{
                    enableBasicAutocompletion: true,
                    enableLiveAutocompletion: true,
                    enableSnippets: true,
                }}
            />
        </div>

        {showPreview && (
          <div className="w-1/2 border-l-2 border-gray-700">
            <iframe
              srcDoc={editorContent}
              title="Live Preview"
              className="w-full h-full bg-gray"
              style={{ border: 'none' }}
            ></iframe>
          </div>
        )}
      </div>

      {/* LLM Prompt Area */}
      <ReusableChatInput 
          onSubmit={handleGenerateCode}
          isSubmitting={chat.isPending} // Pass isPending state
          // onNewChat and onAddDocument are not directly applicable here yet
      />
    </div>
  );
};

export default EditorPage;
