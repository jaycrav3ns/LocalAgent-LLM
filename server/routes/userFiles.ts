import { Router, Request, Response, NextFunction } from 'express';
import { storage } from '../storage';
import { FileManager } from '../utils/FileManager';
import path from 'path';
import { promises as fs } from 'fs';

const router = Router();

// Middleware to get user and initialize FileManager for their home directory
const getUserAndManager = async (req: Request, res: Response, next: NextFunction) => {
  if (!req.user) {
    return res.status(401).json({ message: 'Unauthorized' });
  }
  try {
    const userId = (req.user as any).id;
    let userRecord = await storage.getUser(userId);

    if (!userRecord) {
      return res.status(404).json({ message: 'User not found.' });
    }

    let userHomeDir;
    if (!userRecord.directory) {
      console.log(`User ${userId} does not have a directory. Creating one.`);
      const newDirectory = userRecord.email; // Use email for the directory name
      if (!newDirectory) {
        return res.status(500).json({ message: 'User email is not available to create a directory.' });
      }
      const userBaseDir = path.join(process.cwd(), '.local-agent-workspaces', newDirectory);
      userHomeDir = path.join(userBaseDir, 'home');
      
      try {
        const workspacesDir = path.join(userBaseDir, 'workspaces');
        await fs.mkdir(userHomeDir, { recursive: true });
        await fs.mkdir(workspacesDir, { recursive: true });
        await storage.updateUserPreferences(userId, { directory: newDirectory });
      } catch (error) {
        console.error("Error creating user directory:", error);
        return res.status(500).json({ error: "Failed to create user directory." });
      }
    } else {
      userHomeDir = path.join(process.cwd(), '.local-agent-workspaces', userRecord.directory, 'home');
    }

    req.fileManager = new FileManager(userHomeDir);
    next();
  } catch (error) {
    console.error('Error in getUserAndManager middleware:', error);
    res.status(500).json({ error: 'Failed to process user files request' });
  }
};

router.use(getUserAndManager);

// Get user files
router.get('/', async (req: any, res) => {
  try {
    const dirPath = req.query.path || '/';
    const files = await req.fileManager.listDirectory(dirPath as string);
    res.json({ files, currentDirectory: dirPath });
  } catch (error) {
    console.error('Error listing user files:', error);
    res.status(500).json({ error: 'Failed to list user files' });
  }
});

// Download a file
router.get('/download', async (req: any, res) => {
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
router.post('/upload', upload.single('file'), async (req: any, res) => {
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
router.post('/folder', async (req: any, res) => {
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
router.put('/rename', async (req: any, res) => {
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
router.delete('/item', async (req: any, res) => {
    try {
        const { name, path: basePath } = req.body;
        const result = await req.fileManager.deleteItem(name, basePath);
        res.json(result);
    } catch (error) {
        console.error('Delete item error:', error);
        res.status(500).json({ success: false, error: 'Failed to delete item' });
    }
});

export default router;
