import { promises as fs } from 'fs';
import path from 'path';

export class WorkspaceFileSystem {
  constructor(private workspaceRoot: string) {
    this.workspaceRoot = path.resolve(workspaceRoot);
  }

  private validatePath(filePath: string): string {
    const absolutePath = path.resolve(this.workspaceRoot, filePath);
    const relativePath = path.relative(this.workspaceRoot, absolutePath);

    // Security check: ensure path stays within workspace
    if (relativePath.startsWith('..') || path.isAbsolute(relativePath)) {
      throw new Error(`Access denied: Path '${filePath}' is outside workspace`);
    }

    return absolutePath;
  }

  async readFile(filePath: string): Promise<string> {
    const safePath = this.validatePath(filePath);
    await fs.access(safePath, fs.constants.R_OK);
    return fs.readFile(safePath, 'utf8');
  }

  async writeFile(filePath: string, content: string): Promise<void> {
    const safePath = this.validatePath(filePath);
    await fs.mkdir(path.dirname(safePath), { recursive: true });
    return fs.writeFile(safePath, content, 'utf8');
  }

  async listDirectory(dirPath: string = '.'): Promise<Array<{
    name: string;
    type: 'file' | 'directory';
    path: string;
  }>> {
    const safePath = this.validatePath(dirPath);
    const entries = await fs.readdir(safePath, { withFileTypes: true });
    
    return entries.map(entry => ({
      name: entry.name,
      type: entry.isDirectory() ? 'directory' : 'file',
      path: path.join(dirPath, entry.name)
    }));
  }

  async exists(filePath: string): Promise<boolean> {
    try {
      const safePath = this.validatePath(filePath);
      await fs.access(safePath);
      return true;
    } catch {
      return false;
    }
  }

  async createDirectory(dirPath: string): Promise<void> {
    const safePath = this.validatePath(dirPath);
    return fs.mkdir(safePath, { recursive: true });
  }

  getWorkspaceRoot(): string {
    return this.workspaceRoot;
  }
}