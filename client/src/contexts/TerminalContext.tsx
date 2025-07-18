import React, { createContext, useContext, useState } from 'react';

interface TerminalContextType {
  output: string[];
  addOutput: (line: string) => void;
  clearOutput: () => void;
}

const TerminalContext = createContext<TerminalContextType | undefined>(undefined);

export function TerminalProvider({ children }: { children: React.ReactNode }) {
  const [output, setOutput] = useState<string[]>([]);

  const addOutput = (line: string) => {
    setOutput(prev => [...prev, line]);
  };

  const clearOutput = () => {
    setOutput([]);
  };

  return (
    <TerminalContext.Provider value={{ output, addOutput, clearOutput }}>
      {children}
    </TerminalContext.Provider>
  );
}

export function useTerminal() {
  const context = useContext(TerminalContext);
  if (context === undefined) {
    throw new Error('useTerminal must be used within a TerminalProvider');
  }
  return context;
}