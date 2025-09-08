import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { 
  Folder, 
  File, 
  Upload, 
  RefreshCw, 
  FolderPlus, 
  Grid3X3, 
  List, 
  Download, 
  Edit3, 
  Trash2, 
  Move,
  Home,
  ChevronRight,
  CloudUpload,
  FolderOpen
} from 'lucide-react';

// Import Uppy and plugins
// Note: These would need to be installed via npm
import Uppy from '@uppy/core';
import XHRUpload from '@uppy/xhr-upload';
import FileInput from '@uppy/file-input';
import ProgressBar from '@uppy/progress-bar';
import Informer from '@uppy/informer';





export interface FileItem {
  name: string;
  type: 'directory' | 'file';
  size?: number;
  lastModified?: string;
  path?: string;
}

interface FileManagerProps {
  title?: string;
  baseEndpoint: string; // e.g., "/api/user-files" or "/api/workspaces/:id/files"
  uploadEndpoint: string; // e.g., "/api/user-files/upload" or "/api/workspaces/:id/files/upload"
  initialPath?: string;
  onFileSelect?: (file: FileItem) => void;
  showActions?: boolean;
  className?: string;
}

type ViewMode = 'list' | 'grid';

interface ContextMenuState {
  show: boolean;
  x: number;
  y: number;
  file: FileItem | null;
}

interface ModalState {
  show: boolean;
  title: string;
  defaultValue: string;
  onConfirm?: (value: string) => void;
}

interface ConfirmModalState {
  show: boolean;
  message: string;
  onConfirm?: () => void;
}

const FileManager: React.FC<FileManagerProps> = ({
  title = "File Manager",
  baseEndpoint,
  uploadEndpoint,
  initialPath = "/",
  onFileSelect,
  showActions = true,
  className = ""
}) => {
  const [currentPath, setCurrentPath] = useState(initialPath);
  const [viewMode, setViewMode] = useState<ViewMode>('list');
  const [selectedFile, setSelectedFile] = useState<FileItem | null>(null);
  const [showUploadArea, setShowUploadArea] = useState(false);
  const [contextMenu, setContextMenu] = useState<ContextMenuState>({ show: false, x: 0, y: 0, file: null });
  const [modal, setModal] = useState<ModalState>({ show: false, title: '', defaultValue: '' });
  const [confirmModal, setConfirmModal] = useState<ConfirmModalState>({ show: false, message: '' });
  const [dragOver, setDragOver] = useState(false);

  const uppyRef = useRef<Uppy | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch files query
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: [baseEndpoint, currentPath],
    queryFn: async () => {
      const params = currentPath !== '/' ? `?path=${encodeURIComponent(currentPath)}` : '';
      const response = await apiRequest("GET", `${baseEndpoint}${params}`);
      return response.json();
    },
  });

  // Initialize Uppy
  useEffect(() => {
    uppyRef.current = new Uppy({
      autoProceed: false,
      restrictions: {
        maxFileSize: 100 * 1024 * 1024, // 100MB
      }
    });

    uppyRef.current.use(XHRUpload, {
      endpoint: uploadEndpoint,
      formData: true,
      fieldName: 'file',
      headers: {
        // Add any required headers here
      }
    });

    uppyRef.current.use(FileInput, {
      target: '#uppy-file-input',
      pretty: true,
      inputName: 'file'
    });

    uppyRef.current.use(ProgressBar, {
      target: '#uppy-progress',
      hideAfterFinish: false
    });

    uppyRef.current.use(Informer, {
      target: '#uppy-informer'
    });

    uppyRef.current.on('upload-success', (file, response) => {
      if (!file) return;
      toast({
        title: "Upload successful",
        description: `${file.name} has been uploaded successfully.`,
      });
      refetch();
      setShowUploadArea(false);
    });

    uppyRef.current.on('upload-error', (file, error) => {
      if (!file) return;
      toast({
        title: "Upload failed",
        description: `Failed to upload ${file.name}: ${error.message}`,
        variant: "destructive",
      });
    });

    return () => {
      uppyRef.current?.destroy();
    };
  }, [uploadEndpoint, refetch, toast]);

  // File operations mutations
  const createFolderMutation = useMutation({
    mutationFn: async (name: string) => {
      const response = await apiRequest("POST", `${baseEndpoint}/folder`, {
        name,
        path: currentPath
      });
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Folder created",
        description: "Folder has been created successfully.",
      });
      refetch();
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: "Failed to create folder.",
        variant: "destructive",
      });
    }
  });

  const deleteMutation = useMutation({
    mutationFn: async (file: FileItem) => {
      const response = await apiRequest("DELETE", `${baseEndpoint}/item`, {
        name: file.name,
        path: currentPath
      });
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Item deleted",
        description: "Item has been deleted successfully.",
      });
      refetch();
      setSelectedFile(null);
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: "Failed to delete item.",
        variant: "destructive",
      });
    }
  });

  const renameMutation = useMutation({
    mutationFn: async ({ file, newName }: { file: FileItem; newName: string }) => {
      const response = await apiRequest("PUT", `${baseEndpoint}/rename`, {
        oldName: file.name,
        newName,
        path: currentPath
      });
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Item renamed",
        description: "Item has been renamed successfully.",
      });
      refetch();
      setSelectedFile(null);
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: "Failed to rename item.",
        variant: "destructive",
      });
    }
  });

  // Event handlers
  const handleFileClick = (file: FileItem) => {
    setSelectedFile(file);
    if (onFileSelect) {
      onFileSelect(file);
    }
    if (file.type === 'directory') {
      const newPath = currentPath === '/' ? `/${file.name}` : `${currentPath}/${file.name}`;
      setCurrentPath(newPath);
    }
  };

  const handleFileDoubleClick = (file: FileItem) => {
    if (file.type === 'file') {
      downloadFile(file);
    }
  };

  const handleContextMenu = (e: React.MouseEvent, file: FileItem) => {
    e.preventDefault();
    setContextMenu({
      show: true,
      x: e.clientX,
      y: e.clientY,
      file
    });
    setSelectedFile(file);
  };

  const hideContextMenu = () => {
    setContextMenu({ show: false, x: 0, y: 0, file: null });
  };

  const downloadFile = (file: FileItem) => {
    const a = document.createElement('a');
    a.href = `${baseEndpoint}/download?name=${encodeURIComponent(file.name)}&path=${encodeURIComponent(currentPath)}`;
    a.download = file.name;
    a.click();
  };

  const showRenameModal = (file: FileItem) => {
    setModal({
      show: true,
      title: 'Rename',
      defaultValue: file.name,
      onConfirm: (newName: string) => {
        renameMutation.mutate({ file, newName });
      }
    });
    hideContextMenu();
  };

  const showDeleteConfirm = (file: FileItem) => {
    setConfirmModal({
      show: true,
      message: `Are you sure you want to delete "${file.name}"?`,
      onConfirm: () => {
        deleteMutation.mutate(file);
      }
    });
    hideContextMenu();
  };

  const showCreateFolderModal = () => {
    setModal({
      show: true,
      title: 'Create New Folder',
      defaultValue: '',
      onConfirm: (name: string) => {
        createFolderMutation.mutate(name);
      }
    });
  };

  // Breadcrumb navigation
  const getBreadcrumbs = () => {
    const parts = currentPath.split('/').filter(part => part);
    const breadcrumbs = [{ name: 'Root', path: '/' }];
    
    let currentPathBuilder = '';
    parts.forEach(part => {
      currentPathBuilder += `/${part}`;
      breadcrumbs.push({ name: part, path: currentPathBuilder });
    });
    
    return breadcrumbs;
  };

  // Drag and drop handlers
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(true);
    if (!showUploadArea) {
      setShowUploadArea(true);
    }
  };

  const handleDragLeave = (e: React.DragEvent) => {
    if (!e.currentTarget.contains(e.relatedTarget as Node)) {
      setDragOver(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const files = Array.from(e.dataTransfer.files);
    files.forEach(file => {
      uppyRef.current?.addFile({
        name: file.name,
        type: file.type,
        data: file
      });
    });
    setShowUploadArea(true);
  };

  // File icon helper
  const getFileIcon = (file: FileItem) => {
    if (file.type === 'directory') {
      return <Folder className="text-yellow-400" size={20} />;
    }
    
    // You can extend this with more specific file type icons
    return <File className="text-gray-400" size={20} />;
  };

  // Format file size
  const formatFileSize = (bytes?: number) => {
    if (!bytes) return '—';
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

  // Format date
  const formatDate = (dateString?: string) => {
    if (!dateString) return '—';
    return new Intl.DateTimeFormat('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    }).format(new Date(dateString));
  };

  const files = data?.files || [];

  return (
    <div 
      className={`${className}`}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      onClick={hideContextMenu}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center space-x-3">
          <Folder className="text-yellow-400" size={24} />
          <h2 className="text-2xl font-semibold text-[var(--text-primary)]">{title}</h2>
        </div>
        {showActions && (
          <div className="flex items-center space-x-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setViewMode(viewMode === 'list' ? 'grid' : 'list')}
              className="border-gray-600 hover:bg-gray-700"
            >
              {viewMode === 'list' ? <Grid3X3 size={16} /> : <List size={16} />}
              <span className="ml-2">{viewMode === 'list' ? 'Grid' : 'List'}</span>
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => refetch()}
              disabled={isLoading}
              className="border-gray-600 hover:bg-gray-700"
            >
              <RefreshCw size={16} className={isLoading ? 'animate-spin' : ''} />
              <span className="ml-2">Refresh</span>
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={showCreateFolderModal}
              className="border-gray-600 hover:bg-gray-700"
            >
              <FolderPlus size={16} />
              <span className="ml-2">New Folder</span>
            </Button>
            <Button
              variant="default"
              size="sm"
              onClick={() => setShowUploadArea(!showUploadArea)}
              className="bg-blue-600 hover:bg-blue-700"
            >
              <Upload size={16} />
              <span className="ml-2">Upload</span>
            </Button>
          </div>
        )}
      </div>

      {/* Breadcrumb */}
      <div className="flex items-center space-x-2 mb-4 text-sm">
        <Home className="text-gray-400" size={16} />
        <nav className="flex items-center space-x-2">
          {getBreadcrumbs().map((crumb, index) => (
            <React.Fragment key={crumb.path}>
              {index > 0 && <ChevronRight className="text-gray-500" size={12} />}
              <button
                onClick={() => setCurrentPath(crumb.path)}
                className="text-blue-400 hover:text-blue-300 transition-colors"
              >
                {crumb.name}
              </button>
            </React.Fragment>
          ))}
        </nav>
      </div>

      {/* Upload Area */}
      <div className={`border-2 border-dashed rounded-lg p-8 mb-6 text-center transition-all ${ 
        showUploadArea ? '' : 'hidden'
      } ${
        dragOver ? 'border-blue-500 bg-blue-500/10' : 'border-gray-600'
      }`}>
        <CloudUpload className="mx-auto text-gray-400 mb-4" size={48} />
        <p className="text-lg mb-2">Drop files here or click to browse</p>
        <p className="text-sm text-gray-400 mb-4">Maximum file size: 100MB</p>
        <div id="uppy-file-input"></div>
        <div id="uppy-progress" className="mt-4"></div>
        <div id="uppy-informer" className="mt-2"></div>
      </div>

      {/* File List */}
      <div className="min-h-96">
        {isLoading ? (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto mb-4"></div>
            <p className="text-gray-400">Loading files...</p>
          </div>
        ) : error ? (
          <div className="text-center py-12">
            <p className="text-red-400">Error loading files</p>
          </div>
        ) : files.length === 0 ? (
          <div className="text-center py-12">
            <FolderOpen className="mx-auto text-gray-500 mb-4" size={64} />
            <h3 className="text-xl font-medium text-gray-300 mb-2">This folder is empty</h3>
            <p className="text-gray-500">Upload files or create a new folder to get started</p>
          </div>
        ) : (
          <>
            {viewMode === 'list' ? (
              <div className="space-y-2">
                <div className="grid grid-cols-12 gap-4 px-4 py-2 text-sm font-medium text-gray-400 border-b border-gray-600">
                  <div className="col-span-6">Name</div>
                  <div className="col-span-2">Size</div>
                  <div className="col-span-2">Type</div>
                  <div className="col-span-2">Modified</div>
                </div>
                {files.map((file: FileItem, index: number) => (
                  <div
                    key={`${file.name}-${index}`}
                    className={`grid grid-cols-12 gap-4 px-4 py-3 rounded-lg border border-transparent cursor-pointer transition-all hover:bg-blue-500/10 hover:border-blue-500/30 ${
                      selectedFile?.name === file.name ? 'bg-blue-500/20 border-blue-500' : ''
                    }`}
                    onClick={() => handleFileClick(file)}
                    onDoubleClick={() => handleFileDoubleClick(file)}
                    onContextMenu={(e) => handleContextMenu(e, file)}
                  >
                    <div className="col-span-6 flex items-center space-x-3">
                      {getFileIcon(file)}
                      <span className="truncate">{file.name}</span>
                    </div>
                    <div className="col-span-2 text-sm text-gray-400">{formatFileSize(file.size)}</div>
                    <div className="col-span-2 text-sm text-gray-400">
                      {file.type === 'directory' ? 'Folder' : 'File'}
                    </div>
                    <div className="col-span-2 text-sm text-gray-400">{formatDate(file.lastModified)}</div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
                {files.map((file: FileItem, index: number) => (
                  <div
                    key={`${file.name}-${index}`}
                    className={`p-4 rounded-lg border border-transparent cursor-pointer text-center transition-all hover:bg-blue-500/10 hover:border-blue-500/30 ${
                      selectedFile?.name === file.name ? 'bg-blue-500/20 border-blue-500' : ''
                    }`}
                    onClick={() => handleFileClick(file)}
                    onDoubleClick={() => handleFileDoubleClick(file)}
                    onContextMenu={(e) => handleContextMenu(e, file)}
                  >
                    <div className="flex justify-center mb-3">
                      {getFileIcon(file)}
                    </div>
                    <p className="text-sm truncate mb-1">{file.name}</p>
                    <p className="text-xs text-gray-400">
                      {file.type === 'directory' ? 'Folder' : formatFileSize(file.size)}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </div>

      {/* Context Menu */}
      {contextMenu.show && contextMenu.file && (
        <div
          className="fixed z-50 bg-[var(--bg-card)] border border-gray-600 rounded-lg shadow-xl min-w-40"
          style={{ left: contextMenu.x, top: contextMenu.y }}
        >
          <div className="py-1">
            <button
              className="w-full px-3 py-2 text-left hover:bg-blue-500/10 flex items-center space-x-2"
              onClick={() => {
                downloadFile(contextMenu.file!);
                hideContextMenu();
              }}
            >
              <Download size={16} />
              <span>Download</span>
            </button>
            <button
              className="w-full px-3 py-2 text-left hover:bg-blue-500/10 flex items-center space-x-2"
              onClick={() => showRenameModal(contextMenu.file!)}
            >
              <Edit3 size={16} />
              <span>Rename</span>
            </button>
            <button
              className="w-full px-3 py-2 text-left hover:bg-blue-500/10 flex items-center space-x-2"
              onClick={() => {
                // Implement move functionality
                hideContextMenu();
              }}
            >
              <Move size={16} />
              <span>Move</span>
            </button>
            <button
              className="w-full px-3 py-2 text-left hover:bg-red-500/10 text-red-400 flex items-center space-x-2"
              onClick={() => showDeleteConfirm(contextMenu.file!)}
            >
              <Trash2 size={16} />
              <span>Delete</span>
            </button>
          </div>
        </div>
      )}

      {/* Rename/Create Folder Modal */}
      {modal.show && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-[var(--bg-card)] border border-gray-600 rounded-lg p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-semibold mb-4">{modal.title}</h3>
            <Input
              type="text"
              defaultValue={modal.defaultValue}
              className="mb-6 text-base"
              onKeyPress={(e) => {
                if (e.key === 'Enter') {
                  const target = e.target as HTMLInputElement;
                  if (target.value.trim() && modal.onConfirm) {
                    modal.onConfirm(target.value.trim());
                  }
                  setModal({ show: false, title: '', defaultValue: '' });
                }
              }}
              autoFocus
            />
            <div className="flex justify-end space-x-3">
              <Button
                variant="outline"
                onClick={() => setModal({ show: false, title: '', defaultValue: '' })}
              >
                Cancel
              </Button>
              <Button
                onClick={() => {
                  const input = document.querySelector('input[type="text"]') as HTMLInputElement;
                  if (input?.value.trim() && modal.onConfirm) {
                    modal.onConfirm(input.value.trim());
                  }
                  setModal({ show: false, title: '', defaultValue: '' });
                }}
              >
                Confirm
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {confirmModal.show && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-[var(--bg-card)] border border-gray-600 rounded-lg p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-semibold mb-4">Confirm Action</h3>
            <p className="text-gray-300 mb-6">{confirmModal.message}</p>
            <div className="flex justify-end space-x-3">
              <Button
                variant="outline"
                onClick={() => setConfirmModal({ show: false, message: '' })}
              >
                Cancel
              </Button>
              <Button
                variant="destructive"
                onClick={() => {
                  if (confirmModal.onConfirm) {
                    confirmModal.onConfirm();
                  }
                  setConfirmModal({ show: false, message: '' });
                }}
              >
                Delete
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default FileManager;
