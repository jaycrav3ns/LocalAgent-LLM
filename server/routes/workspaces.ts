import { Router } from 'express';
import { db } from '../storage';
import { workspaces } from '../../shared/schema';
import { eq, and } from 'drizzle-orm';
import { WorkspaceFileSystem } from '../utils/fileSystem';
import path from 'path';

const router = Router();

// Get all workspaces for user
router.get('/', async (req: any, res) => {
  try {
    const userWorkspaces = await db
      .select()
      .from(workspaces)
      .where(eq(workspaces.userId, req.user.id));
    
    res.json(userWorkspaces);
  } catch (error) {
    console.error('Error fetching workspaces:', error);
    res.status(500).json({ error: 'Failed to fetch workspaces' });
  }
});

// Create new workspace
router.post('/', async (req: any, res) => {
  try {
    const { name, description, directory } = req.body;
    
    if (!name || !directory) {
      return res.status(400).json({ error: 'Name and directory are required' });
    }

    // Validate directory exists and is accessible
    const workspaceFs = new WorkspaceFileSystem(directory);
    
    // Ensure the directory exists
    await workspaceFs.createDirectory('.');
    
    const [workspace] = await db
      .insert(workspaces)
      .values({
        userId: req.user.id,
        name,
        description,
        directory: workspaceFs.getWorkspaceRoot(), // Store absolute path
      })
      .returning();

    res.json(workspace);
  } catch (error) {
    console.error('Error creating workspace:', error);
    res.status(500).json({ error: 'Failed to create workspace' });
  }
});

// Get workspace files
router.get('/:id/files', async (req: any, res) => {
  try {
    const workspaceId = req.params.id;
    const dirPath = req.query.path || '.';
    
    const [workspace] = await db
      .select()
      .from(workspaces)
      .where(and(
        eq(workspaces.id, workspaceId),
        eq(workspaces.userId, req.user.id)
      ));

    if (!workspace) {
      return res.status(404).json({ error: 'Workspace not found' });
    }

    const workspaceFs = new WorkspaceFileSystem(workspace.directory);
    const files = await workspaceFs.listDirectory(dirPath as string);
    
    res.json({
      success: true,
      currentPath: dirPath,
      files
    });
  } catch (error) {
    console.error('Error listing files:', error);
    res.status(500).json({ error: 'Failed to list files' });
  }
});

// Read file content
router.get('/:id/files/content', async (req: any, res) => {
  try {
    const workspaceId = req.params.id;
    const filePath = req.query.path as string;
    
    if (!filePath) {
      return res.status(400).json({ error: 'File path is required' });
    }

    const [workspace] = await db
      .select()
      .from(workspaces)
      .where(and(
        eq(workspaces.id, workspaceId),
        eq(workspaces.userId, req.user.id)
      ));

    if (!workspace) {
      return res.status(404).json({ error: 'Workspace not found' });
    }

    const workspaceFs = new WorkspaceFileSystem(workspace.directory);
    const content = await workspaceFs.readFile(filePath);
    
    res.json({
      success: true,
      content,
      path: filePath
    });
  } catch (error) {
    console.error('Error reading file:', error);
    res.status(500).json({ error: 'Failed to read file' });
  }
});

export default router;
