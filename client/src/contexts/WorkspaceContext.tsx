import { createContext, useState, useContext, ReactNode } from 'react';

interface Workspace {
    id: string;
    name: string;
    directory: string;
    description?: string;
    createdAt: string;
    updatedAt: string;
    userId: string;
    meta?: any;
}

interface WorkspaceContextType {
    currentWorkspace: Workspace | null;
    setCurrentWorkspace: (workspace: Workspace | null) => void;
}

const WorkspaceContext = createContext<WorkspaceContextType | undefined>(undefined);

export const WorkspaceProvider = ({ children }: { children: ReactNode }) => {
    const [currentWorkspace, setCurrentWorkspace] = useState<Workspace | null>(null);

    return (
        <WorkspaceContext.Provider value={{ currentWorkspace, setCurrentWorkspace }}>
            {children}
        </WorkspaceContext.Provider>
    );
};

export const useWorkspace = () => {
    const context = useContext(WorkspaceContext);
    if (context === undefined) {
        throw new Error('useWorkspace must be used within a WorkspaceProvider');
    }
    return context;
};
