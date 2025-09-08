import { Router, Request, Response, NextFunction } from 'express';
import { db } from '../storage';
import { workspaces } from '../../shared/schema';
import { eq, and } from 'drizzle-orm';
import { WorkspaceFileSystem } from '../utils/fileSystem';
import { FileManager } from '../utils/FileManager'; // Import the new FileManager
import path from 'path';

const router = Router();

// Middleware to get workspace and initialize FileManager
const getWorkspaceAndManager = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const workspaceId = req.params.id;
    const [workspace] = await db
      .select()
      .from(workspaces)
      .where(and(eq(workspaces.id, workspaceId), eq(workspaces.userId, (req.user as any).id)));

    if (!workspace) {
      return res.status(404).json({ error: 'Workspace not found' });
    }

    req.workspace = workspace;
    req.fileManager = new FileManager(workspace.directory);
    next();
  } catch (error) {
    console.error('Error in getWorkspaceAndManager middleware:', error);
    res.status(500).json({ error: 'Failed to process workspace' });
  }
};

// Get all workspaces for user
router.get('/', async (req: Request, res) => {
  try {
    const userWorkspaces = await db
      .select()
      .from(workspaces)
      .where(eq(workspaces.userId, (req.user as any).id));
    
    res.json(userWorkspaces);
  } catch (error) {
    console.error('Error fetching workspaces:', error);
    res.status(500).json({ error: 'Failed to fetch workspaces' });
  }
});

// Create new workspace
router.post('/', async (req: Request, res) => {
  try {
    const { name, description } = req.body;
    
    if (!name) {
      return res.status(400).json({ error: 'Name is required' });
    }

    const directory = await WorkspaceFileSystem.createWorkspaceForUser(
      (req.user as any).email || (req.user as any).username, 
      name
    );
    
    const [workspace] = await db
      .insert(workspaces)
      .values({
        userId: (req.user as any).id,
        name,
        description,
        directory,
      })
      .returning();

    res.json(workspace);
  } catch (error) {
    console.error('Error creating workspace:', error);
    res.status(500).json({ error: 'Failed to create workspace' });
  }
});

// Get single workspace
router.get('/:id', getWorkspaceAndManager, async (req: any, res) => {
  res.json(req.workspace);
});

// Get workspace files
router.get('/:id/files', getWorkspaceAndManager, async (req: any, res) => {
  try {
    const dirPath = req.query.path || '/';
    const files = await req.fileManager.listDirectory(dirPath as string);
    res.json({ files, currentDirectory: dirPath });
  } catch (error) {
    console.error('Error listing files:', error);
    res.status(500).json({ error: 'Failed to list files' });
  }
});

// Download a file
router.get('/:id/files/download', getWorkspaceAndManager, async (req: any, res) => {
    try {
        const { name, path: filePath } = req.query;
        const downloadPath = req.fileManager.getDownloadPath(name as string, filePath as string);
        res.download(downloadPath, name as string);
    } catch (error) {
        console.error('File download error:', error);
        res.status(500).json({ success: false, error: 'Failed to download file' });
    }
});

// Upload file
const upload = new FileManager(process.cwd()).getMulterUpload(); // Temp for initialization
router.post('/:id/files/upload', getWorkspaceAndManager, upload.single('file'), async (req: any, res) => {
    try {
        const { file } = req;
        const { path: destPath } = req.body;
        const result = await req.fileManager.handleUpload(file, destPath);
        res.json(result);
    } catch (error) {
        console.error('File upload error:', error);
        res.status(500).json({ success: false, error: 'Failed to upload file' });
    }
});

// Create a new folder
router.post('/:id/files/folder', getWorkspaceAndManager, async (req: any, res) => {
    try {
        const { name, path: basePath } = req.body;
        const result = await req.fileManager.createFolder(name, basePath);
        res.json(result);
    } catch (error) {
        console.error('Create folder error:', error);
        res.status(500).json({ success: false, error: 'Failed to create folder' });
    }
});

// Rename a file or folder
router.put('/:id/files/rename', getWorkspaceAndManager, async (req: any, res) => {
    try {
        const { oldName, newName, path: basePath } = req.body;
        const result = await req.fileManager.renameItem(oldName, newName, basePath);
        res.json(result);
    } catch (error) {
        console.error('Rename item error:', error);
        res.status(500).json({ success: false, error: 'Failed to rename item' });
    }
});

// Delete a file or folder
router.delete('/:id/files/item', getWorkspaceAndManager, async (req: any, res) => {
    try {
        const { name, path: basePath } = req.body;
        const result = await req.fileManager.deleteItem(name, basePath);
        res.json(result);
    } catch (error) {
        console.error('Delete item error:', error);
        res.status(500).json({ success: false, error: 'Failed to delete item' });
    }
});

// Delete workspace
router.delete('/:id', getWorkspaceAndManager, async (req: any, res) => {
  try {
    await db
      .delete(workspaces)
      .where(eq(workspaces.id, req.workspace.id));

    // The directory is not deleted by default, which is safer.
    // Add fs.rm if you want to delete the directory from the filesystem.

    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting workspace:', error);
    res.status(500).json({ error: 'Failed to delete workspace' });
  }
});

export default router;

