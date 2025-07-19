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
    const { name, description } = req.body;
    
    if (!name) {
      return res.status(400).json({ error: 'Name is required' });
    }

    // Create workspace directory under user's folder
    const directory = await WorkspaceFileSystem.createWorkspaceForUser(
      req.user.email || req.user.username, 
      name
    );
    
    const [workspace] = await db
      .insert(workspaces)
      .values({
        userId: req.user.id,
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

// Delete workspace
router.delete('/:id', async (req: any, res) => {
  try {
    const workspaceId = req.params.id;
    
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

    // Delete from database
    await db
      .delete(workspaces)
      .where(and(
        eq(workspaces.id, workspaceId),
        eq(workspaces.userId, req.user.id)
      ));

    // Optionally delete the directory (be careful with this)
    // const fs = await import('fs/promises');
    // try {
    //   await fs.rmdir(workspace.directory, { recursive: true });
    // } catch (error) {
    //   console.warn('Failed to delete workspace directory:', error);
    // }

    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting workspace:', error);
    res.status(500).json({ error: 'Failed to delete workspace' });
  }
});

export default router;
