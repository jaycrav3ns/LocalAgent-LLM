import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useQuery } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';

interface FileItem {
  name: string;
  type: 'file' | 'directory';
  size?: number;
  modified: string;
}

interface User {
  directory?: string;
}

interface ApiResponse {
  success: boolean;
  output?: any;
  error?: string;
}

export default function FileBrowser() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [currentPath, setCurrentPath] = useState('.');
  const [selectedFile, setSelectedFile] = useState<string | null>(null);

  const { data: filesResult, isLoading: filesLoading, refetch } = useQuery<ApiResponse>({
    queryKey: ['/api/files', currentPath, (user as User)?.directory],
    queryFn: async () => {
      try {
        const res = await apiRequest('GET', `/api/files?path=${encodeURIComponent(currentPath)}&directory=${encodeURIComponent((user as User)?.directory || '')}`);
        const data = await res.json();
        console.log('Files response:', data);
        return data;
      } catch (err) {
        console.error('Files fetch error:', err);
        toast({ title: 'Error', description: 'Failed to load files', variant: 'destructive' });
        return { success: false, error: 'Failed to load files' };
      }
    },
    retry: 2,
    staleTime: 1000 * 60 * 5,
    enabled: !!user,
  });

  const { data: fileContent, isLoading: contentLoading } = useQuery<ApiResponse>({
    queryKey: ["/api/files/read", selectedFile],
    queryFn: async () => {
      try {
        const res = await apiRequest('GET', `/api/files/read?path=${encodeURIComponent(selectedFile || '')}&directory=${encodeURIComponent((user as User)?.directory || '')}`);
        const data = await res.json();
        console.log('File content response:', data);
        return data;
      } catch (err) {
        console.error('File content fetch error:', err);
        toast({ title: 'Error', description: 'Failed to load file content', variant: 'destructive' });
        return { success: false, error: 'Failed to load file content' };
      }
    },
    enabled: !!selectedFile,
    retry: false,
  });

  const files: FileItem[] = filesResult?.success ? JSON.parse(filesResult.output) : [];

  const handleFileClick = (file: FileItem) => {
    if (file.type === 'directory') {
      const newPath = currentPath === '.' ? file.name : `${currentPath}/${file.name}`;
      setCurrentPath(newPath);
      setSelectedFile(null);
    } else {
      const filePath = currentPath === '.' ? file.name : `${currentPath}/${file.name}`;
      setSelectedFile(filePath);
    }
  };

  const navigateUp = () => {
    if (currentPath !== '.') {
      const parentPath = currentPath.split('/').slice(0, -1).join('/') || '.';
      setCurrentPath(parentPath);
      setSelectedFile(null);
    }
  };

  const refreshFiles = () => {
    refetch();
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const formData = new FormData();
    formData.append('file', file);
    formData.append('path', currentPath);
    if ((user as User)?.directory) {
      formData.append('directory', (user as User).directory!);
    }

    try {
      const res = await apiRequest('POST', '/api/files/upload', formData);
      if (res.ok) {
        toast({ title: 'Success', description: 'File uploaded successfully' });
        refreshFiles();
      } else {
        const errorData = await res.json();
        toast({ title: 'Error', description: errorData.error || 'Failed to upload file', variant: 'destructive' });
      }
    } catch (err) {
      console.error('File upload error:', err);
      toast({ title: 'Error', description: 'Failed to upload file', variant: 'destructive' });
    }
  };

  const getFileIcon = (file: FileItem) => {
    if (file.type === 'directory') {
      return <i className="fas fa-folder text-yellow-400"></i>;
    }
    
    const ext = file.name.split('.').pop()?.toLowerCase();
    switch (ext) {
      case 'js':
      case 'ts':
      case 'jsx':
      case 'tsx':
        return <i className="fas fa-file-code text-blue-400"></i>;
      case 'py':
        return <i className="fas fa-file-code text-green-400"></i>;
      case 'html':
      case 'css':
        return <i className="fas fa-file-code text-orange-400"></i>;
      case 'json':
        return <i className="fas fa-file-alt text-yellow-400"></i>;
      case 'md':
        return <i className="fas fa-file text-gray-400"></i>;
      default:
        return <i className="fas fa-file text-gray-400"></i>;
    }
  };

  const formatFileSize = (size?: number) => {
    if (!size) return '';
    if (size < 1024) return `${size} B`;
    if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`;
    return `${(size / (1024 * 1024)).toFixed(1)} MB`;
  };

  return (
    <div className="p-6 h-full">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-semibold text-[var(--text-primary)]">File Workspace</h2>
        <div className="flex space-x-3">
          <Button 
            className="bg-primary hover:bg-primary/80"
            onClick={() => {/* TODO: Implement folder selection */}}
          >
            <i className="fas fa-folder-open mr-2"></i>Select Folder
          </Button>
          <Button 
            variant="outline"
            className="border-gray-600 hover:bg-gray-600"
            onClick={refreshFiles}
            disabled={filesLoading}
          >
            <i className="fas fa-refresh mr-2"></i>Refresh
          </Button>
          <Button 
            variant="outline"
            className="border-gray-600 hover:bg-gray-600"
            onClick={() => document.getElementById('file-upload')?.click()}
          >
            <i className="fas fa-plus mr-2"></i>Add File
          </Button>
          <input 
            type="file" 
            id="file-upload" 
            className="hidden" 
            onChange={handleFileUpload} 
          />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-[calc(100%-8rem)]">
        {/* File Browser */}
        <div className="lg:col-span-2">
          <div className="neumorphic rounded-[10px] p-4 h-full">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-[var(--text-primary)]">Directory Structure</h3>
              <div className="text-sm text-[var(--text-muted)]">
                <span>{currentPath}</span>
              </div>
            </div>
            
            <div className="flex items-center space-x-2 mb-4">
              <Button
                variant="ghost"
                size="sm"
                onClick={navigateUp}
                disabled={currentPath === '.'}
                className="text-[var(--text-muted)] hover:text-primary"
              >
                <i className="fas fa-arrow-up mr-1"></i>Up
              </Button>
              <Input
                value={currentPath}
                onChange={(e) => setCurrentPath(e.target.value)}
                className="bg-[var(--bg-main)] border-gray-600 text-sm"
                placeholder="Enter path..."
              />
            </div>
            
            {filesLoading ? (
              <div className="flex items-center justify-center h-32">
                <div className="loading-spinner w-6 h-6 border-2 border-primary border-t-transparent rounded-full"></div>
              </div>
            ) : (
              <div className="space-y-1 max-h-96 overflow-y-auto scrollbar-thin">
                {files.length === 0 ? (
                  <div className="text-center text-[var(--text-muted)] py-8">
                    <i className="fas fa-folder-open text-4xl mb-4"></i>
                    <p>No files found in this directory</p>
                  </div>
                ) : (
                  files.map((file, index) => (
                    <div
                      key={index}
                      className="flex items-center space-x-3 px-3 py-2 rounded-lg hover:bg-primary hover:bg-opacity-10 cursor-pointer transition-colors"
                      onClick={() => handleFileClick(file)}
                    >
                      {getFileIcon(file)}
                      <span className="flex-1 text-[var(--text-primary)]">{file.name}</span>
                      {file.size && (
                        <span className="text-xs text-[var(--text-muted)]">
                          {formatFileSize(file.size)}
                        </span>
                      )}
                    </div>
                  ))
                )}
              </div>
            )}
          </div>
        </div>

        {/* File Preview/Editor */}
        <div className="lg:col-span-1">
          <div className="neumorphic rounded-[10px] p-4 h-full">
            <h3 className="font-semibold mb-4 text-[var(--text-primary)]">File Preview</h3>
            
            {selectedFile ? (
              <div className="h-full flex flex-col">
                <div className="text-[var(--text-muted)] mb-2 text-sm">{selectedFile}</div>
                
                {contentLoading ? (
                  <div className="flex items-center justify-center flex-1">
                    <div className="loading-spinner w-6 h-6 border-2 border-primary border-t-transparent rounded-full"></div>
                  </div>
                ) : fileContent?.success ? (
                  <div className="bg-[var(--bg-main)] rounded-lg p-4 command-output text-sm flex-1 overflow-auto scrollbar-thin">
                    <pre className="text-[var(--text-secondary)] whitespace-pre-wrap">
                      {fileContent.output}
                    </pre>
                  </div>
                ) : (
                  <div className="bg-[var(--bg-main)] rounded-lg p-4 flex-1 flex items-center justify-center">
                    <div className="text-center text-[var(--text-muted)]">
                      <i className="fas fa-exclamation-triangle text-2xl mb-2"></i>
                      <p className="text-sm">
                        {fileContent?.error || "Unable to preview file"}
                      </p>
                    </div>
                  </div>
                )}
                
                <div className="flex space-x-2 mt-4">
                  <Button
                    size="sm"
                    className="bg-primary hover:bg-primary/80"
                  >
                    <i className="fas fa-edit mr-1"></i>Edit
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="border-gray-600 hover:bg-gray-600"
                    onClick={() => fileContent?.success && navigator.clipboard.writeText(fileContent.output)}
                  >
                    <i className="fas fa-copy mr-1"></i>Copy
                  </Button>
                </div>
              </div>
            ) : (
              <div className="h-full flex items-center justify-center">
                <div className="text-center text-[var(--text-muted)]">
                  <i className="fas fa-file text-4xl mb-4"></i>
                  <p>Select a file to preview</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
